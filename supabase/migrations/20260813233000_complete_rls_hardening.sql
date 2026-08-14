-- Complete least-privilege hardening for the Data API.
--
-- This migration intentionally preserves the public catalogue reads and every
-- admin CRUD flow. It removes privileges that RLS cannot protect (notably
-- TRUNCATE), closes default grants for future objects, and exposes only a
-- harmless authenticated admin-membership check to the browser.

begin;

create schema if not exists security;
revoke all on schema security from public, anon;
grant usage on schema security to authenticated;

-- Keep the allow-list private even if schema exposure changes in the future.
alter table security.admin_users enable row level security;
revoke all on table security.admin_users from public, anon, authenticated;
drop policy if exists admin_users_self_read on security.admin_users;
create policy admin_users_self_read
  on security.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function security.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from security.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function security.is_admin() from public, anon;
grant execute on function security.is_admin() to authenticated;

-- SECURITY INVOKER is deliberate: the browser can ask whether its own current
-- authenticated user is an admin without receiving access to the allow-list.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select security.is_admin();
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

-- Rebuild a small, auditable policy set and remove broad legacy grants.
do $$
declare
  target_table text;
  policy_row record;
  sequence_name text;
begin
  foreach target_table in array array['config', 'cidades', 'perfis', 'stories']
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

    -- REVOKE ALL is important: TRUNCATE is not governed by RLS.
    execute format('revoke all on table public.%I from public, anon, authenticated', target_table);
    execute format('grant select on table public.%I to anon, authenticated', target_table);
    execute format('grant insert, update, delete on table public.%I to authenticated', target_table);

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target_table and column_name = 'id'
    ) then
      sequence_name := pg_get_serial_sequence(format('public.%I', target_table), 'id');
      if sequence_name is not null then
        execute format('revoke all on sequence %s from public, anon, authenticated', sequence_name);
        execute format('grant usage, select on sequence %s to authenticated', sequence_name);
      end if;
    end if;
  end loop;
end $$;

-- Security logs are readable only by allow-listed admins. Access events accept
-- only the two input columns required by the guarded BEFORE INSERT trigger.
do $$
declare
  target_table text;
  policy_row record;
  sequence_name text;
begin
  foreach target_table in array array['audit_logs', 'access_logs']
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

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select security.is_admin()))',
      target_table || '_admin_read', target_table
    );

    execute format('revoke all on table public.%I from public, anon, authenticated', target_table);
    execute format('grant select on table public.%I to authenticated', target_table);

    if target_table = 'access_logs' then
      execute 'create policy access_logs_event_insert on public.access_logs for insert to anon, authenticated with check (
        (event_type in (''page_view'', ''admin_page_view'') and admin_user_id is null and admin_email is null)
        or
        (event_type = ''admin_login_success'' and admin_user_id = (select auth.uid()) and admin_user_id is not null)
      )';
      execute 'grant insert (event_type, path) on table public.access_logs to anon, authenticated';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target_table and column_name = 'id'
    ) then
      sequence_name := pg_get_serial_sequence(format('public.%I', target_table), 'id');
      if sequence_name is not null then
        execute format('revoke all on sequence %s from public, anon, authenticated', sequence_name);
        if target_table = 'access_logs' then
          execute format('grant usage, select on sequence %s to anon, authenticated', sequence_name);
        end if;
      end if;
    end if;
  end loop;
end $$;

-- Keep trigger execution private and use an empty search path in every
-- SECURITY DEFINER function.
create or replace function public.capture_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_row jsonb;
  row_id text;
  row_summary text;
  user_email text;
begin
  source_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_id := coalesce(source_row->>'id', source_row->>'slug', '1');
  row_summary := coalesce(source_row->>'nome', source_row->>'titulo', source_row->>'slug', tg_table_name);
  select email into user_email from auth.users where id = auth.uid();

  insert into public.audit_logs (
    actor_id, actor_email, action, entity, entity_id, summary, old_data, new_data
  ) values (
    auth.uid(), user_email, tg_op, tg_table_name, row_id, row_summary,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.capture_admin_audit_log() from public, anon, authenticated;

create index if not exists access_logs_ip_created_at_idx
  on public.access_logs (ip_address, created_at desc);

create or replace function security.prepare_access_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  safe_event text;
  safe_path text;
  raw_ip text;
  parsed_ip inet;
  current_user_id uuid := auth.uid();
  current_email text;
  unique_key text;
  safe_country text;
  recent_count bigint;
begin
  safe_path := left(
    case when coalesce(new.path, '') like '/%' then split_part(new.path, '?', 1) else '/' end,
    500
  );
  safe_event := case
    when new.event_type = 'admin_login_success' then 'admin_login_success'
    when safe_path like '/admin%' then 'admin_page_view'
    else 'page_view'
  end;

  if safe_event = 'admin_login_success' and not security.is_admin() then
    raise exception 'Admin authentication required' using errcode = '42501';
  end if;

  raw_ip := coalesce(
    request_headers->>'cf-connecting-ip',
    split_part(request_headers->>'x-forwarded-for', ',', 1)
  );
  begin
    parsed_ip := nullif(trim(raw_ip), '')::inet;
  exception when invalid_text_representation then
    parsed_ip := null;
  end;

  -- Bound the only anonymous write surface. Legitimate navigation is deduped
  -- as before; high-volume path variation can no longer fill the log table.
  if safe_event <> 'admin_login_success' then
    select count(*) into recent_count
    from public.access_logs
    where ip_address is not distinct from parsed_ip
      and created_at >= now() - interval '5 minutes';

    if recent_count >= (case when parsed_ip is null then 200 else 60 end) then
      return null;
    end if;
  end if;

  if safe_event = 'admin_login_success' then
    select email into current_email from auth.users where id = current_user_id;
  end if;

  safe_country := upper(left(coalesce(
    request_headers->>'cf-ipcountry',
    request_headers->>'x-country-code'
  ), 2));
  if safe_country !~ '^[A-Z]{2}$' then
    safe_country := null;
  end if;

  unique_key := md5(concat_ws(
    '|', safe_event, coalesce(parsed_ip::text, 'unknown'), safe_path,
    coalesce(current_user_id::text, ''), date_trunc('minute', now())::text
  ));

  new.created_at := now();
  new.event_type := safe_event;
  new.path := safe_path;
  new.ip_address := parsed_ip;
  new.user_agent := left(request_headers->>'user-agent', 1000);
  new.referrer := left(coalesce(request_headers->>'referer', request_headers->>'referrer'), 1000);
  new.country_code := safe_country;
  new.admin_user_id := case when safe_event = 'admin_login_success' then current_user_id end;
  new.admin_email := current_email;
  new.dedupe_key := unique_key;
  return new;
end;
$$;

revoke all on function security.prepare_access_log() from public, anon, authenticated;

drop trigger if exists prepare_access_log_insert on public.access_logs;
create trigger prepare_access_log_insert
  before insert on public.access_logs
  for each row execute function security.prepare_access_log();

-- The browser-facing RPC now runs with caller privileges. The private trigger
-- validates and derives every sensitive field before RLS is evaluated.
create or replace function public.record_access_event(p_event_type text, p_path text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  begin
    insert into public.access_logs (event_type, path)
    values (p_event_type, p_path);
  exception when unique_violation then
    null;
  end;
end;
$$;

revoke all on function public.record_access_event(text, text) from public;
grant execute on function public.record_access_event(text, text) to anon, authenticated;

create or replace function security.delete_expired_access_logs()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.access_logs where created_at < now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function security.delete_expired_access_logs() from public, anon, authenticated;

-- An event-trigger helper has no reason to live in the exposed public schema.
-- Moving it preserves the existing event trigger because PostgreSQL tracks its
-- function by OID.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'alter function public.rls_auto_enable() set schema security';
  end if;

  if to_regprocedure('security.rls_auto_enable()') is not null then
    execute 'revoke all on function security.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Do not let future public objects inherit broad Data API privileges. Each new
-- table, sequence, or function must opt in explicitly in its own migration.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

-- Rebuild only this application's Storage write policies. The bucket is public
-- and its direct asset URLs remain public without a SELECT policy; omitting that
-- policy prevents anonymous clients from listing every object in the bucket.
drop policy if exists storage_public_read on storage.objects;
drop policy if exists storage_admin_insert on storage.objects;
drop policy if exists storage_admin_update on storage.objects;
drop policy if exists storage_admin_delete on storage.objects;

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

commit;
