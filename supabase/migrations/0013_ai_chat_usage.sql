-- ============================================================
-- 0013 · AI 核价助手试用额度（持久化 / 服务端权威 / 原子递增）
--
-- 背景：MVP 版把次数放在 Edge 进程内 Map，多 isolate 之间不共享，
--       换节点或重启就等于额度重置；前端 localStorage 清掉也能重来。
--       本迁移把额度收进数据库，所有 Edge 实例读写同一份账本。
--
-- 执行：Supabase SQL Editor 粘贴运行，或 supabase db push（幂等，可重复跑）
--
-- 重要：即使本文件尚未执行，/api/ai-chat 也会自动降级用现有 public.events
--       表计数（同样持久化，只是并发原子性略弱）。执行本文件后自动切到
--       下面的原子 RPC，无需改代码、无需重新部署。
-- ============================================================

create table if not exists public.ai_chat_usage (
  visitor_id    text primary key,
  used_count    integer not null default 0 check (used_count >= 0),
  ip_hash       text,                       -- 只存 SHA-256 摘要前 32 位，不存明文 IP
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 幂等补列：老库重跑也不会报错
alter table public.ai_chat_usage add column if not exists ip_hash text;
alter table public.ai_chat_usage add column if not exists created_at timestamptz not null default now();
alter table public.ai_chat_usage add column if not exists updated_at timestamptz not null default now();

create index if not exists ai_chat_usage_ip_hash_idx on public.ai_chat_usage (ip_hash);

alter table public.ai_chat_usage enable row level security;

-- 只允许 service_role 读写：浏览器一律走 /api/ai-chat，不直连数据库
drop policy if exists "ai_chat_usage_service_all" on public.ai_chat_usage;
create policy "ai_chat_usage_service_all" on public.ai_chat_usage
  for all
  to service_role
  using (true)
  with check (true);

-- ------------------------------------------------------------
-- 原子「判定 + 扣次数」：一次事务内完成。
-- insert ... on conflict do update 会拿到行级锁，串行化同一 visitor 的并发请求；
-- 因此两个 Edge 实例同时问第 3 次，也只会有一个拿到放行，不会各扣一次变 4 次。
--
-- ip_guard：同一出口 IP 下所有 visitor_id 的累计次数共享额度。
-- 清浏览器缓存会换新 visitor_id，但换不了 IP，于是仍被拦住。
-- 若担心公司/校园共享出口 IP 误伤，可在 Cloudflare 环境变量里设
-- AI_CHAT_IP_GUARD=false 关掉这一层（visitor_id 维度依旧严格）。
-- ------------------------------------------------------------
create or replace function public.ai_chat_consume(
  p_visitor_id text,
  p_ip_hash    text,
  p_limit      integer default 3,
  p_ip_guard   boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit    integer := greatest(p_limit, 1);
  v_used     integer;
  v_ip_used  integer;
  v_eff      integer;
  v_allowed  boolean;
begin
  -- 1) 锁住（或创建）当前访客行；不改动 used_count，returning 拿到的是旧值
  insert into public.ai_chat_usage (visitor_id, used_count, ip_hash)
  values (p_visitor_id, 0, nullif(p_ip_hash, ''))
  on conflict (visitor_id) do update
    set ip_hash    = coalesce(public.ai_chat_usage.ip_hash, excluded.ip_hash),
        updated_at = now()
  returning used_count into v_used;

  -- 2) 同 IP 累计（含当前这行，因此天然把"清缓存换 ID"算进来）
  if p_ip_guard and nullif(p_ip_hash, '') is not null then
    select coalesce(sum(used_count), 0)::integer into v_ip_used
      from public.ai_chat_usage
     where ip_hash = p_ip_hash;
  else
    v_ip_used := 0;
  end if;

  v_eff     := greatest(v_used, v_ip_used);
  v_allowed := v_eff < v_limit;

  if v_allowed then
    update public.ai_chat_usage
       set used_count = used_count + 1,
           updated_at = now()
     where visitor_id = p_visitor_id;
    v_eff := v_eff + 1;
  else
    -- 被拦的新访客也直接标记为已用完，避免反复查询放大数据库压力
    update public.ai_chat_usage
       set used_count = greatest(used_count, v_limit),
           updated_at = now()
     where visitor_id = p_visitor_id;
    v_eff := greatest(v_eff, v_limit);
  end if;

  return jsonb_build_object(
    'allowed',   v_allowed,
    'used',      v_eff,
    'remaining', greatest(v_limit - v_eff, 0)
  );
end;
$$;

-- 函数默认 grant execute to public；收回后只给 service_role，
-- 匿名访客无法绕过 /api/ai-chat 直接调用数据库函数。
revoke all on function public.ai_chat_consume(text, text, integer, boolean) from public;
grant execute on function public.ai_chat_consume(text, text, integer, boolean) to service_role;

-- ------------------------------------------------------------
-- 降级层用得到的索引：未执行 RPC 时接口会写 events(event='ai_chat_usage')，
-- 按 props->>visitor_id / props->>ip_hash 计数，加部分索引避免全表扫。
-- ------------------------------------------------------------
create index if not exists events_ai_usage_visitor_idx
  on public.events ((props ->> 'visitor_id'))
  where event = 'ai_chat_usage';
create index if not exists events_ai_usage_ip_idx
  on public.events ((props ->> 'ip_hash'))
  where event = 'ai_chat_usage';

-- ============================================================
-- 看板查询（SQL Editor 直接跑）
-- ============================================================
-- 1) 额度消耗总览
-- select count(*) as visitors,
--        sum(used_count) as total_calls,
--        count(*) filter (where used_count >= 3) as exhausted
-- from public.ai_chat_usage;
--
-- 2) 最近 20 个试用访客
-- select visitor_id, used_count, ip_hash, updated_at
-- from public.ai_chat_usage order by updated_at desc limit 20;
--
-- 3) 清空某个测试访客的额度（本地/线上验证用）
-- delete from public.ai_chat_usage where visitor_id = 'probe-xxxx';
-- ============================================================
