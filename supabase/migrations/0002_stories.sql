-- ============================================================
-- ALIANÇA — Stories (destaques estilo Instagram)
-- Tabela: stories  +  RLS  (reaproveita o bucket "perfis" p/ mídia)
-- ------------------------------------------------------------
-- Como aplicar: cole este arquivo INTEIRO no SQL Editor do
-- Supabase (Dashboard -> SQL Editor -> New query -> Run).
-- É seguro rodar mais de uma vez (idempotente).
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid references public.perfis(id) on delete set null, -- vínculo opcional a uma acompanhante
  titulo     text not null default '',          -- legenda exibida sob o avatar
  capa       text default '',                   -- URL do avatar (círculo). Vazio = usa foto do perfil/placeholder
  whatsapp   text default '',                   -- WhatsApp do CTA (vazio = usa o do perfil vinculado / central)
  midias     jsonb not null default '[]'::jsonb,-- [{ "url": "...", "tipo": "image"|"video", "dur": 5 }]
  ativo      boolean not null default true,     -- aparece no site?
  ordem      int not null default 0,            -- ordem na faixa de stories
  expira_em  timestamptz,                       -- null = não expira; senão some após esta data/hora
  created_at timestamptz default now()
);
create index if not exists stories_ordem_idx on public.stories(ordem);

-- ============================================================
-- RLS: leitura pública, escrita só autenticado (mesmo padrão das demais)
-- ============================================================
alter table public.stories enable row level security;

drop policy if exists "read_stories"  on public.stories;
drop policy if exists "write_stories" on public.stories;
create policy "read_stories"  on public.stories for select using (true);
create policy "write_stories" on public.stories for all to authenticated using (true) with check (true);

-- ============================================================
-- STORAGE: o bucket público "perfis" já existe (migration 0001) e
-- as policies de insert/update/delete para "authenticated" já cobrem
-- as mídias dos stories (vão para o prefixo "stories/").
-- ============================================================
