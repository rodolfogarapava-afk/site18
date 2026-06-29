-- ============================================================
-- ALIANÇA — Áudio real por perfil
-- ============================================================

alter table public.perfis
  add column if not exists audio_url text default '';
