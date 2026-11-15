import { NextResponse } from "next/server";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/* ============================================================
   中控台取数中转（只读）

   为什么需要它
   ------------
   部分办公网/内网会拦截 *.supabase.co（TLS 握手即被切断），而 jinyoudata.com
   走 Cloudflare 是通的。这个接口让「能打开官网、连不上数据库」的机器也能拿到
   真实流量数据：中控台直连失败后自动改调这里。

   设计原则：本接口**只做搬运，不做聚合**。
   聚合口径只有一份（中控台 cloud.py），这里若再算一遍，两边数字迟早打架。
   因此参数与返回刻意模仿 PostgREST：
     GET /api/admin/traffic?table=page_views&created_at=gte.2026-10-17T00:00:00%2B08:00&limit=1000&offset=0
   返回：行数组（与 PostgREST 一致）

   安全
   ----
   - 必须带 x-admin-token 或 ?token=（与 /api/admin/leads 同一口令）
   - 只允许 page_views / leads / subscriptions 三张表白名单
   - 只读，不接受任何写操作
   ============================================================ */

const ALLOWED = new Set(["page_views", "leads", "subscriptions"]);
const MAX_LIMIT = 5000;

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) return false;
  const header = req.headers.get("x-admin-token") ?? "";
  const query = new URL(req.url).searchParams.get("token") ?? "";
  return header === secret || query === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "client init failed" }, { status: 503 });
  }

  const url = new URL(req.url);
  const table = url.searchParams.get("table") ?? "";
  if (!ALLOWED.has(table)) {
    return NextResponse.json(
      { ok: false, error: `table 不在白名单：${table}` },
      { status: 400 }
    );
  }

  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get("limit") ?? 1000) || 1000),
    MAX_LIMIT
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const select = url.searchParams.get("select") || "*";
  const sinceRaw = url.searchParams.get("created_at") ?? "";

  // created_at=gte.<iso> → gte + 时间戳；也兼容只有日期的情况
  let since: string | null = null;
  if (sinceRaw.startsWith("gte.")) {
    since = sinceRaw.slice(4);
  }

  let q = db.from(table).select(select, { count: "exact" }).order("created_at", {
    ascending: false,
  });
  if (since) q = q.gte("created_at", since);
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) {
    // 表不存在时给 404，中控台据此区分「缺表」与「网络问题」
    const missing = /does not exist|schema cache|Could not find the table/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: error.message, table },
      { status: missing ? 404 : 500 }
    );
  }

  return NextResponse.json(data ?? [], {
    headers: {
      "x-total-count": String(count ?? (data?.length ?? 0)),
      "cache-control": "no-store",
    },
  });
}
