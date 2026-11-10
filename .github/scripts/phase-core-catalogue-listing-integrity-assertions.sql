-- Assertions for Phase: core catalogue and listing integrity.
-- This file is run in CI after migrations against a disposable PostgreSQL database.
begin;

do $assertions$
declare
  role_name text;
  table_name text;
begin
  if not has_column_privilege('anon', 'public.listing_submissions', 'listing_type', 'INSERT') then
    raise exception 'anon must be able to submit listing_type to the private queue';
  end if;
  if has_column_privilege('anon', 'public.listing_submissions', 'status', 'INSERT')
     or has_column_privilege('authenticated', 'public.listing_submissions', 'status', 'INSERT') then
    raise exception 'public roles must not control listing submission status';
  end if;
  if has_column_privilege('anon', 'public.listing_submissions', 'reviewed_by', 'INSERT') then
    raise exception 'anon must not control listing reviewer identity';
  end if;
  if has_table_privilege('anon', 'public.listing_submissions', 'SELECT') then
    raise exception 'anon must not read the private listing queue';
  end if;
  if has_table_privilege('anon', 'public.listing_submissions', 'UPDATE') then
    raise exception 'anon must not update the private listing queue';
  end if;

  foreach role_name in array array['anon', 'authenticated'] loop
    foreach table_name in array array['academies', 'venues', 'opportunities', 'pickup_games', 'coaches', 'events', 'sports', 'academy_sports', 'coach_academies', 'coach_sports'] loop
      if has_table_privilege(role_name, format('public.%I', table_name), 'INSERT') then
        raise exception 'Role % still has direct INSERT on catalogue table %', role_name, table_name;
      end if;
      if has_table_privilege(role_name, format('public.%I', table_name), 'UPDATE') then
        raise exception 'Role % still has direct UPDATE on catalogue table %', role_name, table_name;
      end if;
      if has_table_privilege(role_name, format('public.%I', table_name), 'DELETE') then
        raise exception 'Role % still has direct DELETE on catalogue table %', role_name, table_name;
      end if;
      if has_table_privilege(role_name, format('public.%I', table_name), 'TRUNCATE')
         or has_table_privilege(role_name, format('public.%I', table_name), 'REFERENCES')
         or has_table_privilege(role_name, format('public.%I', table_name), 'TRIGGER') then
        raise exception 'Role % retains non-DML table privileges on catalogue table %', role_name, table_name;
      end if;
    end loop;
  end loop;

  foreach table_name in array array['academies', 'venues', 'opportunities', 'pickup_games', 'coaches', 'events', 'sports'] loop
    if not has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') then
      raise exception 'Public catalogue SELECT must remain available on %', table_name;
    end if;
  end loop;

  foreach table_name in array array['academies', 'venues', 'opportunities', 'pickup_games'] loop
    if not has_table_privilege('service_role', format('public.%I', table_name), 'INSERT')
       or not has_table_privilege('service_role', format('public.%I', table_name), 'UPDATE')
       or not has_table_privilege('service_role', format('public.%I', table_name), 'DELETE') then
      raise exception 'service_role must retain trusted catalogue DML on %', table_name;
    end if;
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='listing_submissions'
      and policyname='listing_submissions_moderator_read'
      and cmd='SELECT' and roles @> array['authenticated']::name[]
  ) then
    raise exception 'The authenticated moderator-only queue read policy is missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='listing_submissions'
      and policyname='listing_submissions_moderator_update'
      and cmd='UPDATE' and roles @> array['authenticated']::name[]
  ) then
    raise exception 'The authenticated moderator-only queue update policy is missing';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='listing_submissions'
      and cmd='SELECT' and roles && array['anon']::name[]
  ) then
    raise exception 'anon must not have a queue read policy';
  end if;

  if has_function_privilege('anon', 'public.get_listing_submissions()', 'EXECUTE') then
    raise exception 'anon must not execute the protected queue RPC';
  end if;
  if has_function_privilege('anon', 'public.review_listing_submission(uuid,text,text)', 'EXECUTE') then
    raise exception 'anon must not execute the protected review RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.review_listing_submission(uuid,text,text)', 'EXECUTE') then
    raise exception 'authenticated role must be able to invoke the allowlist-protected review RPC';
  end if;

  if has_function_privilege('anon', 'public.is_listing_moderator()', 'EXECUTE') then
    raise exception 'anon must not execute the moderator helper';
  end if;
  if not has_function_privilege('authenticated', 'public.is_listing_moderator()', 'EXECUTE') then
    raise exception 'authenticated role must execute the moderator helper used by RLS';
  end if;

  if (select c.is_nullable from information_schema.columns as c
      where c.table_schema='public' and c.table_name='listing_submissions' and c.column_name='source_url') <> 'YES' then
    raise exception 'listing_submissions.source_url must be optional';
  end if;
end
$assertions$;

rollback;
