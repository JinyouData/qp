-- ============================================================
-- 0012b · 清空「今日」测试流量，从真实的 0 UV / 0 PV 重新开始
--
-- 背景：0012 之前 /api/track 一直退化成核心四列，今天产生的 page_views
--       visitor_id 全是 null。这批行既不能去重，也会让 PV 有 29 的脏基数。
--       修好写入链路后必须先清掉，否则看板上「今日浏览量」永远带着旧数。
--
-- 【执行顺序很重要】
--   ① 先跑 0012_fix_uv_dedupe.sql（补 utm_medium + 刷新 schema）
--   ② 官网前端新版本部署完成（埋点开始带 jinyou_vid）
--   ③ 最后跑本文件。清完再刷新手机，UV 应从 1 开始、PV 随刷新递增。
--
-- 时间窗口：Asia/Shanghai（UTC+8）今天 00:00:00 ~ 明天 00:00:00 半开区间。
-- 不用 created_at::date —— 那会按 UTC 截断，把北京时间 00:00~08:00 算到昨天。
-- ============================================================

-- 先看一眼将要删掉多少行（可先只跑这一段核对）
-- select count(*) as will_delete,
--        count(*) filter (where visitor_id is null) as no_vid,
--        count(distinct visitor_id) as distinct_visitors
-- from public.page_views
-- where created_at >= (date_trunc('day', now() at time zone 'Asia/Shanghai')
--                      at time zone 'Asia/Shanghai')
--   and created_at <  ((date_trunc('day', now() at time zone 'Asia/Shanghai')
--                      + interval '1 day') at time zone 'Asia/Shanghai');

-- ---------- 默认：清空今日全部测试流量 ----------
delete from public.page_views
where created_at >= (date_trunc('day', now() at time zone 'Asia/Shanghai')
                     at time zone 'Asia/Shanghai')
  and created_at <  ((date_trunc('day', now() at time zone 'Asia/Shanghai')
                     + interval '1 day') at time zone 'Asia/Shanghai');

-- ---------- 可选：若只想删「没带 visitor_id」的脏行，保留今天已带 ID 的真实行 ----------
-- 用这一句替代上面的 delete（二选一，不要两条都跑）：
-- delete from public.page_views
-- where visitor_id is null
--   and created_at >= (date_trunc('day', now() at time zone 'Asia/Shanghai')
--                      at time zone 'Asia/Shanghai')
--   and created_at <  ((date_trunc('day', now() at time zone 'Asia/Shanghai')
--                      + interval '1 day') at time zone 'Asia/Shanghai');

-- ---------- 清完核对 ----------
-- select * from public.v_traffic_today;   -- pv=0, uv=0 即清零成功
-- 如果立刻又出现新行，说明手机/浏览器还在刷新页面（属预期，那条是新的真实 PV）
