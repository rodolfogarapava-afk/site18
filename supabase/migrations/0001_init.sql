-- ============================================================
-- ALIANÇA — Schema inicial
-- Tabelas: config, cidades, perfis  +  RLS  +  bucket de fotos
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- CONFIG (linha única) ----------
create table if not exists public.config (
  id            int primary key default 1,
  admin_whatsapp text not null default '',
  constraint config_singleton check (id = 1)
);

-- ---------- CIDADES ----------
create table if not exists public.cidades (
  slug    text primary key,
  nome    text not null,
  uf      text not null,
  bairros jsonb not null default '[]'::jsonb,  -- [{slug,nome}, ...]
  ordem   int  not null default 0
);

-- ---------- PERFIS ----------
create table if not exists public.perfis (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nome         text not null,
  cidade       text references public.cidades(slug) on delete set null,
  bairro       text,
  whatsapp     text not null,
  idade        int,
  altura       text,
  manequim     text,
  medidas      text,
  valor_hora   text default 'Sob consulta',
  possui_local boolean default false,
  nova         boolean default false,
  exclusiva    boolean default false,
  tem_video    boolean default false,
  destaque     boolean default false,
  hue          int default 300,
  descricao    text default '',
  servicos     jsonb default '[]'::jsonb,
  atendimento  jsonb default '[]'::jsonb,
  idiomas      jsonb default '[]'::jsonb,
  horario      text default '',
  fotos        jsonb default '[]'::jsonb,        -- URLs do Storage
  ordem        int default 0,
  created_at   timestamptz default now()
);
create index if not exists perfis_cidade_idx on public.perfis(cidade);

-- ============================================================
-- RLS: leitura pública, escrita só autenticado
-- ============================================================
alter table public.config  enable row level security;
alter table public.cidades enable row level security;
alter table public.perfis  enable row level security;

drop policy if exists "read_config"  on public.config;
drop policy if exists "read_cidades" on public.cidades;
drop policy if exists "read_perfis"  on public.perfis;
create policy "read_config"  on public.config  for select using (true);
create policy "read_cidades" on public.cidades for select using (true);
create policy "read_perfis"  on public.perfis  for select using (true);

drop policy if exists "write_config"  on public.config;
drop policy if exists "write_cidades" on public.cidades;
drop policy if exists "write_perfis"  on public.perfis;
create policy "write_config"  on public.config  for all to authenticated using (true) with check (true);
create policy "write_cidades" on public.cidades for all to authenticated using (true) with check (true);
create policy "write_perfis"  on public.perfis  for all to authenticated using (true) with check (true);

-- ============================================================
-- STORAGE: bucket público de fotos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('perfis', 'perfis', true)
on conflict (id) do update set public = true;

drop policy if exists "perfis_read"   on storage.objects;
drop policy if exists "perfis_insert" on storage.objects;
drop policy if exists "perfis_update" on storage.objects;
drop policy if exists "perfis_delete" on storage.objects;
create policy "perfis_read"   on storage.objects for select using (bucket_id = 'perfis');
create policy "perfis_insert" on storage.objects for insert to authenticated with check (bucket_id = 'perfis');
create policy "perfis_update" on storage.objects for update to authenticated using (bucket_id = 'perfis');
create policy "perfis_delete" on storage.objects for delete to authenticated using (bucket_id = 'perfis');
