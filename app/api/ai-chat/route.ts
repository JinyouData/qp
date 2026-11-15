import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AI_CHAT_SYSTEM_PROMPT,
  TRIAL_LIMIT_MESSAGE,
  computeProfit,
  formatCalcForPrompt,
  mockReply,
  parseCalcInput,
} from "@/lib/ai-profit";
import { consumeTrial } from "@/lib/ai-chat-usage";
import { desensitizePlatforms } from "@/lib/desensitize";

// Cloudflare Pages（next-on-pages）只支持 Edge Runtime
export const runtime = "edge";

const BodySchema = z.object({
  message: z.string().min(1).max(1000),
  visitorId: z.string().min(4).max(64).regex(/^[A-Za-z0-9_-]+$/),
  /**
   * 前端 localStorage 里已用次数。只作为展示与即时拦截，
   * 以及数据库完全不可达时内存兜底的「只能报高、不能报低」上界；
   * 正常路径一律由服务端账本裁决，前端改这个字段无法给自己加次数。
   */
  used: z.number().int().min(0).max(999).default(0),
});

const NO_STORE = { "Cache-Control": "no-store" };

/** API Key 只在这里读取，永远不会下发到浏览器；未配置则走本地演示模式 */
function providerConfig() {
  const provider = (process.env.AI_CHAT_PROVIDER ?? "deepseek").toLowerCase();

  if (provider === "moonshot") {
    return {
      name: "moonshot",
      url: "https://api.moonshot.cn/v1/chat/completions",
      model: process.env.MOONSHOT_MODEL ?? "moonshot-v1-8k",
      key: process.env.MOONSHOT_API_KEY ?? process.env.AI_CHAT_API_KEY ?? "",
    };
  }
  if (provider === "custom") {
    return {
      name: "custom",
      url: `${(process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      key: process.env.AI_CHAT_API_KEY ?? process.env.AI_API_KEY ?? "",
    };
  }
  return {
    name: "deepseek",
    url: "https://api.deepseek.com/chat/completions",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    key: process.env.DEEPSEEK_API_KEY ?? process.env.AI_CHAT_API_KEY ?? "",
  };
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json", reply: "请求格式错误。" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_input", reply: "消息格式不正确（或缺少匿名访客标识）。" },
      { status: 422 }
    );
  }

  const { visitorId, used } = parsed.data;
  // 访客原话先脱敏：用户自己打了具体渠道名，也不让测算、模型与回复跟着复述
  const message = desensitizePlatforms(parsed.data.message);

  // ---- 1) 试用门槛：服务端账本判定 + 原子扣次数 ----
  // Supabase 持久化（ai_chat_usage RPC → events 表 → 内存兜底），
  // Edge 多实例共享同一份额度；清浏览器缓存换 visitor_id 仍按出口 IP 拦截。
  const verdict = await consumeTrial({ req, visitorId, clientUsed: used });
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        error: "trial_limit",
        remaining: 0,
        message: TRIAL_LIMIT_MESSAGE,
        usage_source: verdict.source,
      },
      { status: 429, headers: NO_STORE }
    );
  }

  // ---- 2) 数字由代码算，模型只负责解释与风险提醒 ----
  const input = parseCalcInput(message);
  const calc = computeProfit(input);
  const detail = formatCalcForPrompt(message, calc, input);
  const cfg = providerConfig();

  let reply = "";
  let mode: "live" | "mock" | "fallback" = "mock";

  if (cfg.key) {
    try {
      const ctrl = new AbortController();
      const timeout = Number(process.env.AI_CHAT_TIMEOUT_MS ?? 20000);
      const timer = setTimeout(() => ctrl.abort(), Number.isFinite(timeout) ? timeout : 20000);
      let res: Response;
      try {
        res = await fetch(cfg.url, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.key}`,
          },
          body: JSON.stringify({
            model: cfg.model,
            temperature: 0.3,
            max_tokens: 500,
            messages: [
              { role: "system", content: AI_CHAT_SYSTEM_PROMPT },
              {
                role: "user",
                content: `${detail}\n\n【用户原话】${message}\n（若原话与测算明细冲突，以测算明细为准，并在回答里说明。）`,
              },
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("empty completion");
      reply = text;
      mode = "live";
    } catch (err) {
      // 上游超时/欠费/限流都不让体验中断，降级为同一口径的本地回复
      console.error("[ai-chat] 上游失败，降级演示回复：", err);
      reply = mockReply(message, calc, input);
      mode = "fallback";
    }
  } else {
    // 没配 Key：本地演示模式，界面 / 测算 / 限流全部可测
    reply = mockReply(message, calc, input);
  }

  // 出口兜底：即便模型自由生成时带了具体渠道名，也一律改成区域口径
  reply = desensitizePlatforms(reply);

  // 额度已在 consumeTrial 里扣过；这里只把服务端权威的剩余次数回给前端
  return NextResponse.json(
    {
      reply,
      mode,
      provider: cfg.name,
      calc,
      remaining: verdict.remaining,
      limitReached: verdict.remaining <= 0,
      usage_source: verdict.source,
      degraded: verdict.degraded,
    },
    { headers: NO_STORE }
  );
}
