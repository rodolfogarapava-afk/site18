-- Meta title/description customizáveis por perfil (opcionais).
-- Quando vazios, o site deriva automaticamente do nome/cidade/descrição
-- (ver public/app.js -> viewPerfil).
alter table public.perfis
  add column if not exists meta_titulo text,
  add column if not exists meta_descricao text;
