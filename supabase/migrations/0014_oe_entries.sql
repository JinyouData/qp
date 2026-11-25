-- ============================================================
-- 0014：OE 号词条表（ISR 动态渲染的数据源）
--
-- 背景：12.3 万条 OE 索引原本只在本地 public/data/oe-index.json，
--       Edge 运行时无法读 node:fs；ISR 未预渲染页面需要按 oe_code 实时查库。
--
-- 执行：Supabase SQL Editor 粘贴运行，或 supabase db push
-- 数据导入：python3 scripts/import-oe-to-supabase.py
-- ============================================================

create table if not exists public.oe_entries (
  oe_code       text primary key,
  part_name     text not null default '',
  category      text not null default '',
  fitment_list  jsonb not null default '[]'::jsonb,
  price_range   jsonb not null default '{}'::jsonb,
  margin_band   text not null default '',
  updated_at    timestamptz not null default now()
);

-- 常见筛选：按品类、毛利带聚合（为后续 /oe 索引筛选留口）
create index if not exists oe_entries_part_name_idx on public.oe_entries (part_name);
create index if not exists oe_entries_margin_band_idx on public.oe_entries (margin_band);
create index if not exists oe_entries_updated_at_idx on public.oe_entries (updated_at desc);

alter table public.oe_entries enable row level security;

-- 只允许 service_role 读写；前端不直接连库，统一走服务端
drop policy if exists "oe_entries_service_all" on public.oe_entries;
create policy "oe_entries_service_all" on public.oe_entries
  for all
  to service_role
  using (true)
  with check (true);

-- 常用查询示例：
-- select * from public.oe_entries where oe_code = '95760-J9000';
-- select count(*) from public.oe_entries;  -- 预期 123400
