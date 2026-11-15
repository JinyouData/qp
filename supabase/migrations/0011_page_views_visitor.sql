-- ============================================================
-- 0011 · 访客统计表补齐「可去重」能力（UV / 渠道 / 设备）
--
-- 背景：0010 建的 page_views 只有 path / referrer / utm_source / created_at。
-- 这套字段只能算 PV，算不出 UV —— 没有 visitor_id，同一个人看三次会被
-- 当成三个访客，漏斗第一步就失真。
--
-- 本次改动（全部幂等，可重复执行）：
--   1. 建表（若 0010 没跑过）并补齐字段：
--        visitor_id   浏览器级稳定 ID（前端 localStorage 生成，不含个人信息）
--        device       移动端 / 桌面端
--        source       归类后的渠道（小红书 / 微信 / 百度 …），服务端写入
--        utm_medium   投放媒介
--        utm_campaign 笔记/活动级归因
--   2. 建索引：按天、按人、按页面
--   3. RLS：只有 service_role 能读写；anon 一行都读不到
--   4. 建一个看板用的日聚合视图，方便在 SQL Editor 里直接对数
--
-- 执行方式：Supabase Dashboard → SQL Editor 整段粘贴运行
-- ============================================================

-- ---------- 1. 表与字段 ----------
create table if not exists public.page_views (
  id           bigserial primary key,
  path         text,
  referrer     text,
  utm_source   text,
  created_at   timestamptz not null default now()
);

-- 已存在的老表补列（0010 只建了 4 个业务字段）
alter table public.page_views add column if not exists visitor_id   text;
alter table public.page_views add column if not exists device       text;
alter table public.page_views add column if not exists source       text;
alter table public.page_views add column if not exists utm_medium   text;
alter table public.page_views add column if not exists utm_campaign text;

comment on column public.page_views.visitor_id is
  '浏览器级匿名 ID（localStorage 生成 UUID），用于 UV 去重；不含任何个人信息';

-- ---------- 2. 索引 ----------
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_utm_source_idx on public.page_views (utm_source);
create index if not exists page_views_path_idx       on public.page_views (path);
create index if not exists page_views_visitor_idx    on public.page_views (visitor_id, created_at desc);
create index if not exists page_views_source_idx     on public.page_views (source);

-- ---------- 3. RLS ----------
alter table public.page_views enable row level security;

drop policy if exists "page_views_service_all" on public.page_views;
create policy "page_views_service_all" on public.page_views
  for all
  to service_role
  using (true)
  with check (true);

-- 明确不给 anon / authenticated 任何策略：前端一律走 /api/track

-- ---------- 4. 日聚合视图（对数用） ----------
create or replace view public.v_traffic_daily as
select
  (created_at at time zone 'Asia/Shanghai')::date as day,
  count(*)                                        as pv,
  count(distinct visitor_id)                      as uv,   -- null 自动不计入
  count(distinct path)                            as pages
from public.page_views
group by 1
order by 1 desc;

-- ---------- 5. 跑完自检 ----------
-- select count(*) as rows, count(distinct visitor_id) as visitors
-- from public.page_views;
--
-- select source, count(*) pv, count(distinct visitor_id) uv
-- from public.page_views
-- where created_at >= now() - interval '30 days'
-- group by 1 order by uv desc;
