-- Atualiza os dois canais oficiais exibidos no site.
update public.config
set
  admin_whatsapp = '5515991906606',
  model_support_whatsapp = '5511996425680'
where id = 1;
