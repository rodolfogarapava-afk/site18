-- Harden the public API so authentication alone never grants admin access.
-- Existing Auth users are preserved as administrators; future users must be
-- explicitly inserted into security.admin_users by a database owner.

create schema if not exists security;
revoke all on schema security from public, anon;
grant usage on schema security to authenticated;

create table if not exists security.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on security.admin_users from public, anon, authenticated;

insert into security.admin_users (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

create or replace function security.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, security
as $$
  select exists (
    select 1
    from security.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function security.is_admin() from public, anon;
grant execute on function security.is_admin() to authenticated;

-- Remove every legacy policy from the application tables before rebuilding a
-- small, auditable policy set.
do $$
declare
  target_table text;
  policy_row record;
begin
  foreach target_table in array array['config', 'cidades', 'perfis', 'stories', 'audit_logs']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);

    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, target_table);
    end loop;
  end loop;
end $$;

-- The catalogue is intentionally public. Mutations require an explicit admin.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['config', 'cidades', 'perfis', 'stories']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      target_table || '_public_read', target_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select security.is_admin()))',
      target_table || '_admin_insert', target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select security.is_admin())) with check ((select security.is_admin()))',
      target_table || '_admin_update', target_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select security.is_admin()))',
      target_table || '_admin_delete', target_table
    );

    execute format('revoke insert, update, delete on public.%I from anon', target_table);
    execute format('grant select on public.%I to anon, authenticated', target_table);
    execute format('grant insert, update, delete on public.%I to authenticated', target_table);
  end loop;
end $$;

-- Audit history is admin-only and can only be written by the audit trigger.
revoke all on public.audit_logs from anon;
revoke insert, update, delete, truncate on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

create policy audit_logs_admin_read
  on public.audit_logs
  for select
  to authenticated
  using ((select security.is_admin()));

-- Public media remains readable, but only explicit admins can upload, replace,
-- or delete files in the application bucket.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', policy_row.policyname);
  end loop;
end $$;

create policy storage_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'perfis');

create policy storage_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'perfis' and (select security.is_admin()));

create policy storage_admin_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'perfis' and (select security.is_admin()))
  with check (bucket_id = 'perfis' and (select security.is_admin()));

create policy storage_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'perfis' and (select security.is_admin()));

-- Prevent callers from invoking the trigger function directly.
revoke all on function public.capture_admin_audit_log() from public, anon, authenticated;
