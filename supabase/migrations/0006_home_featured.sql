-- ============================================================
-- ALIANÇA — Destaques principais do hero
-- ============================================================

alter table public.config
  add column if not exists home_featured_slugs jsonb default '[]'::jsonb;
