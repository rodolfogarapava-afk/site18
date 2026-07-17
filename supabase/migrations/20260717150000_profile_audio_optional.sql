-- O áudio do perfil é opcional. Esta migration é idempotente e alinha o
-- schema remoto com o campo já usado pelo painel e pelo site público.
alter table public.perfis
  add column if not exists audio_url text;
