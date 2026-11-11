-- Static schema, permission and publication-integrity assertions for Phase 3.1.
\\set ON_ERROR_STOP on
begin;

do $phase31_assertions$
declare
  v_publish_def text;
  v_col_default text;
  v_fn regprocedure;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listing_moderators'
      and column_name = 'role'
  ) then raise exception 'listing_moderators.role is missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_moderators'::regclass
      and conname = 'listing_moderators_role_check'
  ) then raise exception 'Moderator role constraint is missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listing_submissions'
      and column_name = 'structured_data'
  ) then raise exception 'Structured publication data is missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listing_submissions'
      and column_name = 'verification_status'
  ) then raise exception 'Independent verification status is missing'; end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'listing_submission_evidence'
      and rowsecurity
  ) then raise exception 'Evidence register must exist with RLS enabled'; end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'listing_moderator_access_audits'
      and rowsecurity
  ) then raise exception 'Moderator access audit table must exist with RLS enabled'; end if;

  if has_table_privilege('anon', 'public.listing_submission_evidence', 'SELECT')
     or has_table_privilege('authenticated', 'public.listing_submission_evidence', 'SELECT') then
    raise exception 'Evidence table must not be directly readable through API roles';
  end if;

  if has_table_privilege('anon', 'public.listing_moderator_access_audits', 'SELECT')
     or has_table_privilege('authenticated', 'public.listing_moderator_access_audits', 'SELECT') then
    raise exception 'Moderator access audit table must not be directly readable through API roles';
  end if;

  foreach v_fn in array array[
    'public.is_listing_super_admin()'::regprocedure,
    'public.get_moderation_access_profile()'::regprocedure,
    'public.list_listing_moderator_accounts()'::regprocedure,
    'public.set_listing_moderator_access(uuid,text,boolean,text)'::regprocedure,
    'public.add_listing_submission_evidence(uuid,text,text,text)'::regprocedure,
    'public.review_listing_submission_evidence(uuid,text,text)'::regprocedure,
    'public.get_listing_submission_evidence(uuid)'::regprocedure,
    'public.verify_listing_submission(uuid,text,text)'::regprocedure,
    'public.save_listing_publication_details(uuid,jsonb,integer)'::regprocedure,
    'public.get_listing_verification_queue(text,integer,integer)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_fn, 'EXECUTE') then
      raise exception 'Anonymous role must not execute privileged Phase 3.1 function %', v_fn;
    end if;
    if not has_function_privilege('authenticated', v_fn, 'EXECUTE') then
      raise exception 'Authenticated role is missing Phase 3.1 RPC grant for %', v_fn;
    end if;
  end loop;

  v_publish_def := pg_get_functiondef('public.publish_listing_submission(uuid,text,uuid,integer)'::regprocedure);
  if position('verification_status' in v_publish_def) = 0
     or position('verified' in v_publish_def) = 0 then
    raise exception 'Publication function does not enforce independent evidence verification';
  end if;
  if position('KhelGrid Host' in v_publish_def) > 0
     or position('Weekend Morning' in v_publish_def) > 0
     or position('now() + interval' in v_publish_def) > 0 then
    raise exception 'Publication function still contains fabricated fallback values';
  end if;
  if position('genuine street/locality address' in v_publish_def) = 0
     or position('actual start date/time' in v_publish_def) = 0
     or position('verified organizer name' in v_publish_def) = 0 then
    raise exception 'Publication function is missing category-specific completeness validation';
  end if;

  select column_default into v_col_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'events' and column_name = 'starts_at';
  if v_col_default is not null then
    raise exception 'events.starts_at must not have an invented date default';
  end if;

  select column_default into v_col_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'pickup_games' and column_name = 'host_name';
  if v_col_default is not null then
    raise exception 'pickup_games.host_name must not have a fabricated host default';
  end if;

  if not has_function_privilege('authenticated', 'public.set_listing_moderator_access(uuid,text,boolean,text)', 'EXECUTE') then
    raise exception 'Super-admin access management RPC must be callable by authenticated users and guard role inside the function';
  end if;
end;
$phase31_assertions$;

rollback;
