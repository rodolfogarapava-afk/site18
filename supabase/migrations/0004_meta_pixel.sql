-- ============================================================
-- ALIANÇA — Meta Pixel configurável pelo painel
-- ============================================================

alter table public.config
  add column if not exists meta_pixel_id text default '',
  add column if not exists meta_pixel_enabled boolean default false;
