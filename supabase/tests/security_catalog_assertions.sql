-- Read-only catalog assertions for the independent Khelgrid Platform project.
-- Run as a database owner in the intended non-production project.
-- These assertions verify configured grants/policies; they do not replace PostgREST JWT tests.

do $$
declare
  t text;
begin
  foreach t in array array['profiles','sports','opportunities','venues','venue_courts'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity
    ) then
      raise exception 'RLS must be enabled on public.%', t;
    end if;
  end loop;

  if has_table_privilege('anon','public.profiles','select') then
    raise exception 'anon must not be able to SELECT profiles';
  end if;
  if has_table_privilege('anon','public.sports','insert')
     or has_table_privilege('anon','public.opportunities','insert')
     or has_table_privilege('anon','public.venues','insert')
     or has_table_privilege('anon','public.venue_courts','insert') then
    raise exception 'anon must not have catalogue INSERT privileges';
  end if;
  if not has_table_privilege('anon','public.sports','select')
     or not has_table_privilege('anon','public.opportunities','select')
     or not has_table_privilege('anon','public.venues','select')
     or not has_table_privilege('anon','public.venue_courts','select') then
    raise exception 'anon must have SELECT grants for public catalogue tables';
  end if;
  if has_function_privilege('anon','public.rls_auto_enable()','execute')
     or has_function_privilege('authenticated','public.rls_auto_enable()','execute')
     or has_function_privilege('service_role','public.rls_auto_enable()','execute') then
    raise exception 'API roles must not execute rls_auto_enable directly';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own' and cmd='SELECT')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own' and cmd='UPDATE')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='sports' and policyname='sports_read_published' and cmd='SELECT')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='opportunities' and policyname='opportunities_read_published' and cmd='SELECT')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='venues' and policyname='venues_read_published' and cmd='SELECT')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='venue_courts' and policyname='courts_read_for_published_venues' and cmd='SELECT') then
    raise exception 'One or more required RLS policies are missing';
  end if;
end $$;
