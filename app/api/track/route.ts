import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Cloudflare Pages（next-on-pages）只支持 Edge Runtime
export const runtime = "edge";

/* ============================================================
   两类埋点，同一个端点：
   1) 行为事件（form_submit / wechat_click …）→ events 表，供转化率看板
   2) 页面浏览（page_view）→ page_views 表，供渠道效果与漏斗分析

   前端一律走本路由，浏览器不直连数据库（service key 不出服务端）。

   page_views 写入是「全字段优先、核心字段兜底」两段式：
   0011 迁移没跑时 visitor_id 等列不存在，PostgREST 会报列不存在，
   此时退回 0010 的核心四列继续写 —— PV 不丢，只是 UV 暂时算不出来。
   ============================================================ */

const EVENTS = [
  "form_submit",
  "wechat_click",
  "third_party_click",
  "asset_download",
  "consult_click",
  "ai_chat_open",
  "ladder_click",
] as const;

const EventSchema = z.object({
  event: z.enum(EVENTS),
  props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  path: z.string().max(300).optional(),
  channel: z.string().max(30).optional(),
  referrer: z.string().max(500).optional(),
  ts: z.string().max(40).optional(),
});

const PageViewSchema = z.object({
  type: z.literal("page_view"),
  path: z.string().min(1).max(300),
  // 前端无来源/无渠道时传 null，用 nullish 允许 null（自然访问是最常见的情况）
  referrer: z.string().max(200).nullish(),
  utm_source: z.string().max(100).nullish(),
  utm_medium: z.string().max(60).nullish(),
  utm_campaign: z.string().max(80).nullish(),
  visitor_id: z.string().max(64).nullish(),
  device: z.string().max(20).nullish(),
  ts: z.string().max(40).nullish(),
});

/** 极简清洗：去掉控制字符、截到上限，防止脏数据撑表 */
function clean(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return s ? s.slice(0, max) : null;
}

function isPageView(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { type?: unknown }).type === "page_view"
  );
}

/* 服务端归类渠道：与中控台 cloud.py 的 SOURCE_RULES 同一套关键词。
   前端只传原始 referrer / utm_source，归类口径收在服务端，改口径不用重发前端。 */
const SOURCE_RULES: [string, RegExp][] = [
  ["小红书", /xiaohongshu|xhscdn|xhs\.cn|xhs/i],
  ["微信", /weixin|wechat|mp\.weixin|weixin110|channels/i],
  ["抖音", /douyin|bytedance|iesdouyin/i],
  ["百度", /baidu|bd/i],
  ["知乎", /zhihu/i],
  ["B站", /bilibili|b23\.tv/i],
  ["微博", /weibo/i],
  ["Google", /google\./i],
];

function classify(referrer: string | null, utmSource: string | null): string {
  const r = (referrer ?? "").toLowerCase();
  const u = (utmSource ?? "").toLowerCase();
  if (r === "direct") return "直接访问";
  if (r === "internal") return "站内跳转";
  for (const [name, re] of SOURCE_RULES) if (re.test(u)) return name;
  for (const [name, re] of SOURCE_RULES) if (re.test(r)) return name;
  if (!r && !u) return "直接访问";
  return "其他";
}

/**
 * 埋点端点。
 * - 未接 Supabase 时返回 ok:true 但不落库，前端无感（本地开发不报错）。
 * - 表不存在（未执行迁移）时同样返回 ok，不让浏览器控制台冒红。
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "非法请求体" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, stored: false, demo: true });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  /* ---------- A. 页面浏览 → page_views ---------- */
  if (isPageView(json)) {
    const parsed = PageViewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "页面埋点格式不正确" }, { status: 422 });
    }

    const d = parsed.data;
    const referrer = clean(d.referrer, 200);
    const utmSource = clean(d.utm_source, 100);

    const full = {
      path: clean(d.path, 300) ?? "/",
      referrer,
      utm_source: utmSource,
      utm_medium: clean(d.utm_medium, 60),
      utm_campaign: clean(d.utm_campaign, 80),
      visitor_id: clean(d.visitor_id, 64),
      device: clean(d.device, 20),
      source: classify(referrer, utmSource),
      created_at: d.ts ?? new Date().toISOString(),
    };

    // 第一段：全字段
    const first = await db.from("page_views").insert(full);

    // 第二段：0011 未执行 → 退到 0010 的四列，保证 PV 一定落库
    if (first.error) {
      const core = {
        path: full.path,
        referrer: full.referrer,
        utm_source: full.utm_source,
        created_at: full.created_at,
      };
      const retry = await db.from("page_views").insert(core);
      if (!retry.error) {
        return NextResponse.json({ ok: true, stored: true, degraded: "core-columns" });
      }
      return NextResponse.json({
        ok: true,
        stored: false,
        error: retry.error.message,
        hint: "page_views 表不存在时请先执行 supabase/migrations/0011_page_views_visitor.sql",
      });
    }

    return NextResponse.json({ ok: true, stored: true });
  }

  /* ---------- B. 行为事件 → events ---------- */
  const parsed = EventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "事件格式不正确" }, { status: 422 });
  }

  const { error } = await db.from("events").insert({
    event: parsed.data.event,
    props: parsed.data.props ?? {},
    path: parsed.data.path ?? null,
    channel: parsed.data.channel ?? null,
    referrer: parsed.data.referrer ?? null,
    created_at: parsed.data.ts ?? new Date().toISOString(),
  });

  // 表不存在（未执行 0004 迁移）时不要让浏览器报错
  if (error) return NextResponse.json({ ok: true, stored: false, error: error.message });

  return NextResponse.json({ ok: true, stored: true });
}
