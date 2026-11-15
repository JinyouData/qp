import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Cloudflare Pages（next-on-pages）只支持 Edge Runtime
export const runtime = "edge";

/* ============================================================
   两类埋点，同一个端点：
   1) 行为事件（form_submit / wechat_click …）→ events 表，供转化率看板
   2) 页面浏览（page_view）→ page_views 表，供渠道效果分析
   前端一律走本路由，浏览器不直连数据库。
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

    const { error } = await db.from("page_views").insert({
      path: clean(parsed.data.path, 300) ?? "/",
      referrer: clean(parsed.data.referrer, 200),
      utm_source: clean(parsed.data.utm_source, 100),
      created_at: parsed.data.ts ?? new Date().toISOString(),
    });

    if (error) return NextResponse.json({ ok: true, stored: false, error: error.message });
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
