-- Atendimento de casais (opcional, no mesmo molde do áudio/vídeo — ver
-- migrations 20260717150000 e 20260904010000). Nunca é assumido como
-- verdadeiro por padrão: cada modelo/admin decide explicitamente pelo
-- painel. O valor cobrado é livre e fica em branco até ser informado —
-- não inventamos preço nem duração.
alter table public.perfis
  add column if not exists atende_casais boolean not null default false,
  add column if not exists valor_casais text;
