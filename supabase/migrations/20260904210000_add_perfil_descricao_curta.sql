-- Frase de destaque do card (opcional), separada da descrição completa
-- usada na página do perfil. Quando vazia, o site cai de volta pro corte
-- automático dos primeiros 115 caracteres da descrição (ver
-- public/app.js -> cardResumo).
alter table public.perfis
  add column if not exists descricao_curta text;
