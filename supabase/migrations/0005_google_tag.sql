-- ============================================================
-- ALIANÇA — Google tag configurável pelo painel
-- ============================================================

alter table public.config
  add column if not exists google_tag_id text default '',
  add column if not exists google_tag_enabled boolean default false,
  add column if not exists google_ads_conversion_label text default '';
