-- Permite mais de um vídeo por perfil. Mantém `video_url`/`tem_video`
-- intactos (nenhuma outra parte do schema depende de removê-los) e migra o
-- vídeo já cadastrado (se houver) para o primeiro item da nova lista, sem
-- duplicar nem perder o vínculo existente.
alter table public.perfis
  add column if not exists videos jsonb not null default '[]'::jsonb;

update public.perfis
set videos = jsonb_build_array(jsonb_build_object('url', video_url, 'titulo', null))
where video_url is not null
  and coalesce(jsonb_array_length(videos), 0) = 0;
