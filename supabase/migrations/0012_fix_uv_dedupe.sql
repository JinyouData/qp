-- ============================================================
-- 0012 · 修复 UV 去重失效（补齐 page_views.utm_medium + 统一 UTC+8 口径）
--
-- 【线上实测到的根因】
--   0011 迁移早期版本只加了 visitor_id / device / source / utm_campaign，
--   后来才补上 utm_medium。线上 SQL Editor 跑的是「早期版 0011」，于是：
--     page_views 有 visitor_id 列，但唯独没有 utm_medium 列。
--   /api/track 提交全字段时 PostgREST 报
--     column "utm_medium" of relation "page_views" does not exist
--   → 两段式写入一刀切退回 0010 的核心四列 → visitor_id 永远写不进去
--   → 表里全是 null → UV 退化成 PV（UV=29 / PV=29）。
--
-- 本文件做三件事（全部幂等，可重复执行）：
--   1. 补齐 utm_medium（以及其余可选列，防止以后再踩同一个坑）
--   2. NOTIFY 让 PostgREST 立刻刷新 schema cache，否则加完列仍报「列不存在」
--   3. 重建日聚合视图 + 新增「今日实时」视图，口径统一为
--        COUNT(DISTINCT visitor_id) + Asia/Shanghai（UTC+8）当日 00:00 边界
--
-- 执行方式：Supabase Dashboard → SQL Editor 整段粘贴运行
-- 注意：本文件不会删除任何数据。清空今日测试记录请用同目录
--       0012b_purge_today_test_traffic.sql
-- ============================================================

-- ---------- 1. 补齐列 ----------
create table if not exists public.page_views (
  id           bigserial primary key,
  path         text,
  referrer     text,
  utm_source   text,
  created_at   timestamptz not null default now()
);

alter table public.page_views add column if not exists visitor_id   text;
alter table public.page_views add column if not exists device       text;
alter table public.page_views add column if not exists source       text;
alter table public.page_views add column if not exists utm_medium   text;  -- ★ 线上缺的就是这一列
alter table public.page_views add column if not exists utm_campaign text;

comment on column public.page_views.visitor_id is
  '浏览器级匿名 ID（localStorage 的 jinyou_vid，UUID），UV 去重唯一依据；不含个人信息';

create index if not exists page_views_visitor_idx on public.page_views (visitor_id, created_at desc);
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

-- ---------- 2. 刷新 PostgREST schema cache ----------
-- 不加这一句，刚加完列后 /api/track 仍可能报「Could not find the column in schema cache」
notify pgrst, 'reload schema';

-- ---------- 3. 日聚合视图（UTC+8，不用 created_at::date） ----------
-- created_at::date 会按数据库默认时区（Supabase 是 UTC）截断，
-- 北京时间早上 8 点前的访问会被算到「昨天」。必须用 at time zone 显式转。
create or replace view public.v_traffic_daily as
select
  (created_at at time zone 'Asia/Shanghai')::date                as day,
  count(*)                                                       as pv,
  count(distinct visitor_id)                                      as uv,
  count(*) filter (where visitor_id is null)                      as pv_without_vid,
  count(distinct path)                                            as pages
from public.page_views
group by 1
order by 1 desc;

-- ---------- 4. 今日实时视图（UTC+8 00:00 ~ 次日 00:00 的半开区间） ----------
-- date_trunc('day', now() at time zone 'Asia/Shanghai') 得到北京时间今天 00:00 的
-- naive timestamp，再用 at time zone 转回 timestamptz，边界精确且不受服务器时区影响。
create or replace view public.v_traffic_today as
select
  count(*)                                  as pv,
  count(distinct visitor_id)                as uv,           -- null 自动不计入
  count(*) filter (where visitor_id is null) as pv_without_vid,
  count(distinct path)                      as pages,
  min(created_at)                           as first_event,
  max(created_at)                           as last_event
from public.page_views
where created_at >= (date_trunc('day', now() at time zone 'Asia/Shanghai')
                     at time zone 'Asia/Shanghai')
  and created_at <  ((date_trunc('day', now() at time zone 'Asia/Shanghai')
                     + interval '1 day') at time zone 'Asia/Shanghai');

-- ---------- 5. 跑完自检 ----------
-- select * from public.v_traffic_today;          -- 今日 pv / uv / 未带 ID 行数
-- select * from public.v_traffic_daily limit 7; -- 近 7 天，uv 必须 <= pv
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='page_views' order by ordinal_position;
