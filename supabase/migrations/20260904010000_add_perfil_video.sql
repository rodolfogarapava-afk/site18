-- O vídeo do perfil é opcional, no mesmo molde do áudio (migration
-- 20260717150000). Idempotente e alinha o schema remoto com o campo já
-- usado pelo painel e pelo site público.
alter table public.perfis
  add column if not exists video_url text;
