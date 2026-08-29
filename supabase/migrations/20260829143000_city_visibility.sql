-- A cidade controla diretamente se aparece nas áreas públicas do site.
-- Mantemos somente o Rio de Janeiro publicado na primeira aplicação para
-- preservar o estado atual; novas cidades começam ativas por padrão.
alter table public.cidades
  add column if not exists ativa boolean;

update public.cidades
set ativa = case
  when ordem >= 10000 then mod(ordem - 10000, 2) = 0
  else slug = 'rio-de-janeiro'
end
where ativa is null;

-- Remove a codificação temporária usada pelas versões compatíveis com o
-- esquema antigo, sem alterar a ordenação escolhida no painel.
update public.cidades
set ordem = case
  when ordem >= 10000 then (ordem - 10000) / 2
  else ordem
end;

alter table public.cidades
  alter column ativa set default true;

alter table public.cidades
  alter column ativa set not null;
