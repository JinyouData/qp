import { NextResponse } from "next/server";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Cloudflare Pages（next-on-pages）只支持 Edge Runtime
export const runtime = "edge";

/** 与 /api/admin/leads 同一口令（header x-admin-token 或 ?token=） */
function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) return false;
  const header = req.headers.get("x-admin-token") ?? "";
  const query = new URL(req.url).searchParams.get("token") ?? "";
  return header === secret || query === secret;
}

/** ISO 时间 → 北京时间日期键（YYYY-MM-DD） */
function dayKeyCN(iso: string): string {
  const t = new Date(iso).getTime() + 8 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function todayCN(): string {
  return dayKeyCN(new Date().toISOString());
}

interface ViewRow {
  id: number;
  path: string | null;
  referrer: string | null;
  utm_source: string | null;
  created_at: string;
}

/** 按字段分组计数 */
function groupBy(rows: ViewRow[], field: "path" | "referrer" | "utm_source", top = 20) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = (r[field] ?? "").trim() || "(未记录)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

/** 按天聚合；区间内没有数据的日期补 0 */
function dailySeries(rows: ViewRow[], start: string, end: string) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = dayKeyCN(r.created_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days: { day: string; pv: number }[] = [];
  for (let t = new Date(`${start}T00:00:00Z`).getTime(); ; t += 864e5) {
    const key = new Date(t).toISOString().slice(0, 10);
    days.push({ day: key, pv: counts.get(key) ?? 0 });
    if (key >= end || days.length > 400) break;
  }
  return days;
}

/**
 * 访客统计看板数据（读取 page_views）。
 * 只返回聚合结果 + 最近若干条明细，不含任何个人标识（表里本来也没有）。
 *
 *   GET /api/admin/pageviews?token=xxx&from=2026-11-01&to=2026-11-15
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, tableReady: false, demo: true, total: 0 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Supabase 客户端不可用" }, { status: 500 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? todayCN();
  const from =
    url.searchParams.get("from") ??
    new Date(new Date(`${to}T00:00:00Z`).getTime() - 29 * 864e5).toISOString().slice(0, 10);

  const { data, error } = await db
    .from("page_views")
    .select("id,path,referrer,utm_source,created_at")
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`)
    .order("created_at", { ascending: false })
    .limit(50000);

  // 表还没建（未执行 0010 迁移）：给出明确提示，而不是 500
  if (error) {
    const missing = /page_views|schema cache|does not exist/i.test(error.message);
    return NextResponse.json(
      { ok: false, tableReady: false, error: error.message, hint: missing ? "请先在 Supabase 执行 0010_page_views.sql" : undefined },
      { status: missing ? 200 : 500 }
    );
  }

  const rows = (data ?? []) as ViewRow[];
  const today = todayCN();

  return NextResponse.json({
    ok: true,
    tableReady: true,
    range: { from, to },
    total: rows.length,
    today: rows.filter((r) => dayKeyCN(r.created_at) === today).length,
    daily: dailySeries(rows, from, to),
    bySource: groupBy(rows, "utm_source"),
    byReferrer: groupBy(rows, "referrer"),
    topPages: groupBy(rows, "path", 30),
    recent: rows.slice(0, 20),
  });
}

/** 北京时间「今天」的半开区间 [00:00, 次日 00:00)，转成 UTC ISO 供 timestamptz 比较 */
function todayWindowCN(): { start: string; end: string; day: string } {
  const day = dayKeyCN(new Date().toISOString()); // YYYY-MM-DD（UTC+8）
  // 北京时间 day 00:00 == UTC (day 00:00 - 8h)
  const startMs = new Date(`${day}T00:00:00.000Z`).getTime() - 8 * 3600 * 1000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + 864e5).toISOString(),
    day,
  };
}

/**
 * 清理数据（按优先级匹配一种 scope）：
 * - ?scope=today          清空北京时间今天的全部 page_views（修好埋点后从 0 UV 重来）
 * - ?scope=today-no-vid   只清今天 visitor_id 为 null 的无效行
 * - ?ids=1,2,3            仅删除指定 id
 * - 不带参数              只删 path 以 /__ 开头的探针行（旧行为，保持兼容）
 * today 系列可加 &dry=1 只统计、不删除。
 */
export async function DELETE(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Supabase 客户端不可用" }, { status: 500 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "";
  const dry = url.searchParams.get("dry") === "1";

  if (scope === "today" || scope === "today-no-vid") {
    const win = todayWindowCN();
    const filtered = () => {
      let q = db
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .gte("created_at", win.start)
        .lt("created_at", win.end);
      if (scope === "today-no-vid") q = q.is("visitor_id", null);
      return q;
    };
    if (dry) {
      const probe = await filtered();
      if (probe.error) return NextResponse.json({ ok: false, error: probe.error.message }, { status: 500 });
      return NextResponse.json({ ok: true, dry: true, scope, window: win, would_delete: probe.count ?? 0 });
    }
    let del = db
      .from("page_views")
      .delete({ count: "exact" })
      .gte("created_at", win.start)
      .lt("created_at", win.end);
    if (scope === "today-no-vid") del = del.is("visitor_id", null);
    const res = await del;
    if (res.error) return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, scope, window: win, deleted: res.count ?? 0 });
  }

  const idsParam = url.searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids 参数不合法" }, { status: 400 });
    }
    const del = await db.from("page_views").delete({ count: "exact" }).in("id", ids);
    if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: del.count ?? 0 });
  }

  const { data, error } = await db
    .from("page_views")
    .select("id,path")
    .order("id", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const ids = (data ?? [])
    .filter((r) => (r as { path: string | null }).path?.startsWith("/__"))
    .map((r) => (r as { id: number }).id);

  if (ids.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

  const del = await db.from("page_views").delete({ count: "exact" }).in("id", ids);
  if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: del.count ?? ids.length });
}
