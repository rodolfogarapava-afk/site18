-- Corrige redação de item de serviço que sinaliza como mais explícito do
-- que o serviço real prestado (jantar, eventos, viagens, companhia).
-- Idempotente: só afeta linhas que ainda contêm o termo antigo.
update public.perfis
set servicos = array_replace(servicos, 'Encontros íntimos', 'Companhia exclusiva')
where 'Encontros íntimos' = any(servicos);
