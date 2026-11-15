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

   page_views 写入是「按缺失列渐进裁剪」：
   线上曾出现「表有 visitor_id、唯独缺 utm_medium」的半迁移状态，
   旧版两段式一遇到报错就整包退回 0010 的核心四列，把 visitor_id 一起砍掉，
   结果 29 行全是 null、UV 退化成 PV。现在改为：报错里点名哪一列就只删哪一列，
   visitor_id 排到最后才放弃 —— 只要表里能写，UV 就一定算得出来。
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

/* ---------- 页面浏览写入：按缺失列渐进裁剪 ---------- */

/** PostgREST / supabase-js 报「列不存在」的两种常见文案 */
const MISSING_COL_RE =
  /(?:column\s+"?([a-z_][a-z0-9_]*)"?\s+of\s+relation|Could not find the '([a-z_][a-z0-9_]*)' column)/i;

/** 裁剪优先级：与 UV 无关的先砍，visitor_id 最后才放弃（它是 UV 的唯一依据） */
const DROP_ORDER = ["utm_medium", "utm_campaign", "device", "source", "visitor_id"] as const;
/** 0010 时代就有的四列，任何情况下都不再裁掉 */
const CORE_KEYS: ReadonlySet<string> = new Set(["path", "referrer", "utm_source", "created_at"]);

type PVRow = Record<string, string | null>;

function missingColumn(message: string): string | null {
  const m = MISSING_COL_RE.exec(message);
  return m?.[1] ?? m?.[2] ?? null;
}

/**
 * 一次成功则立即返回；失败时只移除报错点名的那一列再试。
 * 最坏情况逐列退到核心四列，但绝不会因为「少一个 utm_medium」就把
 * visitor_id 一起丢掉 —— 这正是上一版 UV 恒等于 PV 的根因。
 */
async function insertPageView(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  full: PVRow
): Promise<{ stored: boolean; dropped: string[]; error: string | null }> {
  const row: PVRow = { ...full };
  const dropped: string[] = [];
  let lastError = "";

  for (let i = 0; i <= DROP_ORDER.length; i += 1) {
    const { error } = await db.from("page_views").insert(row);
    if (!error) return { stored: true, dropped, error: null };

    lastError = error.message ?? "unknown error";
    const named = missingColumn(lastError);
    // 优先精确裁剪报错列；错误信息里没列名时按优先级砍一个
    const victim =
      named && named in row && !CORE_KEYS.has(named)
        ? named
        : DROP_ORDER.find((k) => k in row) ?? "";
    if (!victim) break;
    dropped.push(victim);
    delete row[victim];
  }
  return { stored: false, dropped, error: lastError };
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

    // created_at 一律用服务端时钟：前端 ts 会被浏览器时区或手工探针带偏，
    // 而「今日」是 UTC+8 半开区间，时间来源必须统一可信。
    const full: PVRow = {
      path: clean(d.path, 300) ?? "/",
      referrer,
      utm_source: utmSource,
      utm_medium: clean(d.utm_medium, 60),
      utm_campaign: clean(d.utm_campaign, 80),
      visitor_id: clean(d.visitor_id, 64),
      device: clean(d.device, 20),
      source: classify(referrer, utmSource),
      created_at: new Date().toISOString(),
    };

    const result = await insertPageView(db, full);
    // 前端没带 ID，或 ID 那一列被裁掉 → 明确报告「这次写入算不出 UV」
    const uvCapable = !result.dropped.includes("visitor_id") && Boolean(full.visitor_id);
    return NextResponse.json({
      ok: true,
      stored: result.stored,
      uv_capable: result.stored ? uvCapable : false,
      dropped_columns: result.dropped,
      ...(result.dropped.length ? { degraded: "partial-columns" } : {}),
      ...(result.error
        ? {
            error: result.error,
            hint: "请先执行 supabase/migrations/0012_fix_uv_dedupe.sql 补齐列并刷新 schema",
          }
        : {}),
    });
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
