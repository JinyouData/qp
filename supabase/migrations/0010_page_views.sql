-- ============================================================
-- 0010 · 访客统计表 page_views（轻量 PV 埋点）
--
-- 用途：追踪营销渠道效果。每次前端路由切换写一行。
-- 只记路径 / 来源域名 / utm_source，不存 IP、不存 UA、不存 cookie，
-- 属于无个人标识的访问计数，与《隐私政策》口径一致。
--
-- 执行：Supabase SQL Editor 粘贴运行，或 supabase db push（幂等，可重复跑）
-- ============================================================

create table if not exists public.page_views (
  id          bigserial primary key,
  path        text,                       -- 页面路径，含查询串（去掉 utm_* 后）
  referrer    text,                       -- 来源域名：xiaohongshu.com / direct / internal
  utm_source  text,                       -- 渠道参数 utm_source（小红书发帖用不同链接区分）
  created_at  timestamptz not null default now()
);

-- 常用查询索引：按天看趋势 / 按渠道看量 / 按页面看热力
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_utm_source_idx on public.page_views (utm_source);
create index if not exists page_views_path_idx       on public.page_views (path);

alter table public.page_views enable row level security;

-- 只允许 service_role 写入（前端一律走 /api/track，不直连数据库）
drop policy if exists "page_views_service_all" on public.page_views;
create policy "page_views_service_all" on public.page_views
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- 看板查询（SQL Editor 直接跑）
-- ============================================================
-- 1) 今天 PV / 独立页面数
-- select count(*) as pv, count(distinct path) as pages
-- from public.page_views where created_at >= current_date;

-- 2) 近 30 天按渠道拆
-- select coalesce(utm_source, '(无参数)') as channel, count(*) as pv
-- from public.page_views
-- where created_at >= now() - interval '30 days'
-- group by 1 order by pv desc;

-- 3) 近 30 天热门页面
-- select path, count(*) as pv from public.page_views
-- where created_at >= now() - interval '30 days'
-- group by 1 order by pv desc limit 30;

-- 4) 来源域名分布（小红书 / 抖音 / 搜索引擎 / 直接访问）
-- select referrer, count(*) as pv from public.page_views
-- where created_at >= now() - interval '30 days'
-- group by 1 order by pv desc limit 20;

-- 5) 小红书每篇笔记的效果对比（发帖时带 utm_source=xhs_笔记名）
-- select utm_source, count(*) as pv, count(distinct path) as pages
-- from public.page_views where utm_source like 'xhs%'
-- group by 1 order by pv desc;
