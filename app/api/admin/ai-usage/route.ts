import { NextResponse } from "next/server";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Cloudflare Pages（next-on-pages）只支持 Edge Runtime
export const runtime = "edge";

const USAGE_EVENT = "ai_chat_usage";
const NO_STORE = { "Cache-Control": "no-store" };

/** 与 /api/admin/pageviews 同一口令（header x-admin-token 或 ?token=） */
function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) return false;
  const header = req.headers.get("x-admin-token") ?? "";
  const query = new URL(req.url).searchParams.get("token") ?? "";
  return header === secret || query === secret;
}

interface UsageRow {
  visitor_id: string;
  used_count: number;
  ip_hash: string | null;
  updated_at: string;
}

/**
 * GET /api/admin/ai-usage?token=xxx
 * AI 核价助手试用额度总览。0013 迁移未执行时自动从 events 表统计降级账本。
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false }, { headers: NO_STORE });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ configured: false }, { headers: NO_STORE });

  const { data, error } = await db
    .from("ai_chat_usage")
    .select("visitor_id, used_count, ip_hash, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (!error && data) {
    const rows = data as UsageRow[];
    return NextResponse.json(
      {
        ledger: "ai_chat_usage",
        visitors: rows.length,
        total_calls: rows.reduce((s, r) => s + (r.used_count ?? 0), 0),
        exhausted: rows.filter((r) => (r.used_count ?? 0) >= 3).length,
        probe_rows: rows.filter((r) => r.visitor_id.startsWith("probe-")).length,
        recent: rows.slice(0, 20),
      },
      { headers: NO_STORE }
    );
  }

  // 0013 未执行：读降级层账本（events 表）
  const { data: ev, error: evError } = await db
    .from("events")
    .select("id, props, created_at")
    .eq("event", USAGE_EVENT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (evError) {
    return NextResponse.json(
      { ledger: "unknown", error: evError.message, hint: "请先执行 0013_ai_chat_usage.sql" },
      { headers: NO_STORE }
    );
  }

  const rows = (ev ?? []) as Array<{ id: number; props: Record<string, unknown> | null; created_at: string }>;
  const byVisitor = new Map<string, number>();
  for (const r of rows) {
    const v = String(r.props?.visitor_id ?? "");
    if (v) byVisitor.set(v, (byVisitor.get(v) ?? 0) + 1);
  }
  return NextResponse.json(
    {
      ledger: "events (降级层，建议执行 0013_ai_chat_usage.sql)",
      calls: rows.length,
      visitors: byVisitor.size,
      exhausted: Array.from(byVisitor.values()).filter((n) => n >= 3).length,
      probe_rows: Array.from(byVisitor.keys()).filter((v) => v.startsWith("probe-")).length,
    },
    { headers: NO_STORE }
  );
}

/**
 * DELETE /api/admin/ai-usage?token=xxx&prefix=probe-
 * 清理指定前缀的试用记录（默认只清 probe- 自检数据，避免误删真实访客）。
 * 同时清理主账本表与 events 降级账本，执行后该出口 IP 的额度一并归零。
 */
export async function DELETE(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const prefix = new URL(req.url).searchParams.get("prefix") ?? "probe-";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(prefix)) {
    return NextResponse.json(
      { error: "prefix 只能是 1-32 位字母数字/下划线/连字符，且不允许空串" },
      { status: 400, headers: NO_STORE }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ configured: false }, { headers: NO_STORE });

  const result: Record<string, unknown> = { prefix };

  const usage = await db
    .from("ai_chat_usage")
    .delete()
    .like("visitor_id", `${prefix}%`)
    .select("visitor_id");
  result.usage_table = usage.error
    ? { skipped: usage.error.message }
    : { deleted: usage.data?.length ?? 0 };

  // events 表按 jsonb 字段无法直接 like，先取 id 再按主键删
  const { data: evRows, error: evError } = await db
    .from("events")
    .select("id, props")
    .eq("event", USAGE_EVENT);
  if (evError) {
    result.events_table = { skipped: evError.message };
  } else {
    const ids = (evRows ?? [])
      .filter((r) => String((r.props as Record<string, unknown> | null)?.visitor_id ?? "").startsWith(prefix))
      .map((r) => r.id as number);
    if (ids.length) {
      const del = await db.from("events").delete().in("id", ids).select("id");
      result.events_table = del.error
        ? { skipped: del.error.message }
        : { deleted: del.data?.length ?? 0 };
    } else {
      result.events_table = { deleted: 0 };
    }
  }

  return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
}
