/* ============================================================
   工具库四个 AI 助手 · 试用额度（服务端权威 / 持久化 / 防绕过 / 按天重置）

   取代 MVP 版的进程内 Map：Edge 多 isolate 之间内存不共享，
   换节点、重启、扩缩容都会把 3 次额度洗回 0，等于没有门槛。

   三层账本，按可靠性依次降级：
   L1  supabase-rpc     ai_chat_usage 表 + ai_chat_consume() 原子事务（见 0013 迁移）
                        —— 行级锁保证并发只扣一次，最严格
   L2  supabase-events  现有 events 表，event='ai_chat_usage' 计数
                        —— 无需执行任何 SQL，部署上线即刻持久化生效
   L3  memory           进程内 Map（仅在数据库完全不可达时兜底）

   额度口径：每个匿名访客每天 3 次，按北京时间（UTC+8）日界重置；
   四个工具共用一份账本。实现上把业务日期拼进账本 key，
   因此 0013 迁移的原始累计型 RPC 无需改 SQL 也能按天工作。

   两个维度：
   - visitor_id：浏览器 localStorage 里的匿名 ID，主维度
   - ip_hash   ：出口 IP 的 SHA-256 摘要（只存哈希，不存明文）
                 清浏览器缓存会换 visitor_id，但换不了 IP，
                 同 IP 下累计次数共享额度，因此清缓存也无法重领 3 次。
                 可用 AI_CHAT_IP_GUARD=false 关闭（防共享出口 IP 误伤）。

   铁律：前端上报的 used 只在 L3 兜底时作为「只能报高、不能报低」的
   补充，L1/L2 一律以数据库为准 —— 前端不再能决定自己还剩几次。
   ============================================================ */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { todayKey, TRIAL_LIMIT } from "@/lib/ai-tools";

export type UsageSource = "supabase-rpc" | "supabase-events" | "memory";

export interface UsageVerdict {
  allowed: boolean;
  /** 判定并扣减后的等效已用次数 */
  used: number;
  remaining: number;
  /** 本次由哪一层账本裁决，便于线上验证与监控 */
  source: UsageSource;
  /** true = 走了降级层（数据库不可用），此时防护强度下降 */
  degraded: boolean;
}

const USAGE_EVENT = "ai_chat_usage";
const DB_TIMEOUT_MS = 8000;

/** 给数据库调用加超时，避免上游挂起时 Edge 请求长时间卡住 */
function withTimeout<T>(p: Promise<T>, ms = DB_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`supabase timeout ${ms}ms`)), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * 取客户端出口 IP 并做不可逆摘要。
 * Cloudflare Pages 会注入 cf-connecting-ip（可信）；本地/其它反代退回 x-forwarded-for。
 * 取不到 IP 时返回 null —— 此时只按 visitor_id 计数，不阻断体验。
 */
export async function clientIpHash(req: Request): Promise<string | null> {
  const h = req.headers;
  const raw =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  if (!raw) return null;

  const salt = process.env.AI_CHAT_IP_SALT ?? "jinyoudata-ai-trial-v1";
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${salt}:${raw}`)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  } catch {
    return null;
  }
}

/* ---------- L1：原子 RPC ---------- */

async function consumeViaRpc(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  visitorId: string,
  ipHash: string | null,
  limit: number,
  ipGuard: boolean,
  day: string
): Promise<UsageVerdict | null> {
  // 把业务日期拼进主键：无需改 0013 迁移，累计型 RPC 也能天然变成「按天」额度。
  // 用 @day 后缀而不是前缀，保持 probe- 前缀可被管理端点清理。
  const { data, error } = await db.rpc("ai_chat_consume", {
    p_visitor_id: `${visitorId}@${day}`,
    p_ip_hash: ipHash ? `${ipHash}@${day}` : "",
    p_limit: limit,
    p_ip_guard: ipGuard,
  });

  // 函数不存在（未执行 0013）/ 权限异常 → 交给 L2
  if (error || !data) return null;

  const d = data as { allowed?: unknown; used?: unknown; remaining?: unknown };
  if (typeof d.allowed !== "boolean") return null;

  const used = Number(d.used ?? 0);
  const remaining = Number(d.remaining ?? 0);
  return {
    allowed: d.allowed,
    used: Number.isFinite(used) ? used : limit,
    remaining: Number.isFinite(remaining) ? Math.max(remaining, 0) : 0,
    source: "supabase-rpc",
    degraded: false,
  };
}

/* ---------- L2：现有 events 表（零配置降级） ---------- */

async function consumeViaEvents(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  visitorId: string,
  ipHash: string | null,
  limit: number,
  ipGuard: boolean,
  day: string
): Promise<UsageVerdict | null> {
  // 只统计「今天」的记录：北京时间 00:00 后额度自动重置。
  // 历史行没有 day 字段，天然不计入今天。
  const byVisitor = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event", USAGE_EVENT)
    .eq("props->>visitor_id", visitorId)
    .eq("props->>day", day);
  if (byVisitor.error) return null;

  let effective = byVisitor.count ?? 0;

  // 按同 IP 维度计数：清缓存换 ID 也挡得住
  if (ipGuard && ipHash) {
    const byIp = await db
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event", USAGE_EVENT)
      .eq("props->>ip_hash", ipHash)
      .eq("props->>day", day);
    if (byIp.error) return null;
    effective = Math.max(effective, byIp.count ?? 0);
  }

  const allowed = effective < limit;

  // 无论放行还是拦截都落一行：
  // 放行 = 记一次有效回答；拦截 = 让这个新 ID 立刻达到阈值，避免反复放大查询
  const { error: insertError } = await db.from("events").insert({
    event: USAGE_EVENT,
    props: {
      visitor_id: visitorId,
      ip_hash: ipHash,
      day,
      allowed,
    },
    path: "/api/ai-chat",
    created_at: new Date().toISOString(),
  });
  if (insertError) return null;

  const used = allowed ? effective + 1 : Math.max(effective, limit);
  return {
    allowed,
    used,
    remaining: Math.max(limit - used, 0),
    source: "supabase-events",
    degraded: false,
  };
}

/* ---------- L3：进程内兜底（数据库完全不可达） ---------- */

const memVisitor = new Map<string, number>();
const memIp = new Map<string, number>();

function consumeViaMemory(
  visitorId: string,
  ipHash: string | null,
  limit: number,
  ipGuard: boolean,
  clientUsed: number,
  day: string
): UsageVerdict {
  // 前端上报只在这里参与，且只能把次数报高（报低无效）
  const reported = Number.isFinite(clientUsed)
    ? Math.min(Math.max(clientUsed, 0), limit)
    : 0;
  const vKey = `${visitorId}@${day}`;
  const ipKey = ipHash ? `${ipHash}@${day}` : "";
  const prevVisitor = Math.max(memVisitor.get(vKey) ?? 0, reported);
  const prevIp = ipGuard && ipKey ? memIp.get(ipKey) ?? 0 : 0;
  const effective = Math.max(prevVisitor, prevIp);

  const allowed = effective < limit;
  const used = allowed ? effective + 1 : Math.max(effective, limit);

  memVisitor.set(vKey, used);
  if (ipGuard && ipKey) {
    memIp.set(ipKey, Math.max(memIp.get(ipKey) ?? 0, used));
  }

  return {
    allowed,
    used,
    remaining: Math.max(limit - used, 0),
    source: "memory",
    degraded: true,
  };
}

/* ---------- 对外统一入口 ---------- */

export async function consumeTrial(opts: {
  req: Request;
  visitorId: string;
  /** 前端 localStorage 里的已用次数：只在 L3 兜底时作为上界保护 */
  clientUsed: number;
  limit?: number;
}): Promise<UsageVerdict> {
  const limit = opts.limit ?? TRIAL_LIMIT;
  const day = todayKey(); // 北京时间，服务端与前端 localStorage 用同一个日界
  const ipGuard = (process.env.AI_CHAT_IP_GUARD ?? "true").toLowerCase() !== "false";
  const ipHash = await clientIpHash(opts.req);
  const db = isSupabaseConfigured() ? getSupabaseAdmin() : null;

  if (db) {
    try {
      const rpc = await withTimeout(
        consumeViaRpc(db, opts.visitorId, ipHash, limit, ipGuard, day)
      );
      if (rpc) return rpc;
    } catch (e) {
      console.error("[ai-chat-usage] RPC 不可用，降级 events 计数：", e);
    }

    try {
      const events = await withTimeout(
        consumeViaEvents(db, opts.visitorId, ipHash, limit, ipGuard, day)
      );
      if (events) return events;
    } catch (e) {
      console.error("[ai-chat-usage] events 计数不可用，降级内存兜底：", e);
    }
  }

  return consumeViaMemory(opts.visitorId, ipHash, limit, ipGuard, opts.clientUsed, day);
}
