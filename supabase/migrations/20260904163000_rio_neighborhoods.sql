-- Mantém os filtros do Rio de Janeiro com bairros individuais.
update public.cidades
set bairros = '[
  {"slug":"leblon","nome":"Leblon"},
  {"slug":"ipanema","nome":"Ipanema"},
  {"slug":"copacabana","nome":"Copacabana"},
  {"slug":"barra-da-tijuca","nome":"Barra da Tijuca"},
  {"slug":"recreio","nome":"Recreio"}
]'::jsonb
where slug = 'rio-de-janeiro';

-- O agrupamento antigo Barra e Recreio começa em Barra da Tijuca para não
-- retirar perfis do filtro; eles podem ser movidos individualmente no admin.
-- Zona Sul fica sem bairro até a classificação individual no admin.
update public.perfis
set bairro = case bairro
  when 'barra-e-recreio' then 'barra-da-tijuca'
  when 'leblon-ipanema' then 'leblon'
  when 'zona-sul' then null
  else bairro
end
where cidade = 'rio-de-janeiro'
  and bairro in ('barra-e-recreio', 'leblon-ipanema', 'zona-sul');
