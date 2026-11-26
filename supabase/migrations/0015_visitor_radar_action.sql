-- ============================================================
-- 0015 · 高意向客户雷达：page_views 增加 action_detail
--
-- 背景：page_views 原本只记 path，无法知道访客「查了哪个 OE 号」。
-- 本迁移只加一列 JSONB，把深度动作挂在同一条 PV 上：
--   {"kind":"oe_search","detail":"ABC123","ts":"..."}
-- 这样 PV 数与动作数天然一致，不会把一次提问重复算成一次浏览。
--
-- AI 提问属于交互而非页面浏览，落 events 表的 ai_question 事件
-- （props 含 visitor_id / detail / tool_type），不写进 page_views。
--
-- 幂等：可重复执行，不删数据。未执行本迁移时 /api/track 会自动
-- 只裁剪 action_detail 这一列继续写入，雷达仍能从 events 兜底取明细。
-- ============================================================

alter table public.page_views add column if not exists action_detail jsonb;

comment on column public.page_views.action_detail is
  '匿名访客的深度动作（OE 搜索词等），kind/detail 两个键，不含个人信息';

-- GIN 索引便于按 kind 过滤；访客+时间索引支撑「今天某个人的完整轨迹」
create index if not exists page_views_action_detail_idx
  on public.page_views using gin (action_detail);
create index if not exists page_views_visitor_today_idx
  on public.page_views (visitor_id, created_at desc);
create index if not exists events_visitor_detail_idx
  on public.events using gin (props);

-- 加完列必须通知 PostgREST 刷新 schema cache，否则 /api/track 仍报「列不存在」
notify pgrst, 'reload schema';

-- 自检：
-- select path, action_detail from public.page_views
-- where action_detail is not null order by created_at desc limit 20;
