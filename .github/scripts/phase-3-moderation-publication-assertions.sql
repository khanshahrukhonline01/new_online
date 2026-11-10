-- Assertions for Phase 3: Complete Listing Moderation & Publication System
\set ON_ERROR_STOP on
begin;

do $assertions$
declare
  col_name text;
  func_name text;
begin
  -- 1. Check all required columns in listing_submissions
  foreach col_name in array array[
    'reference_number', 'tracking_key', 'submitter_id', 'submitter_email',
    'rejection_reason', 'correction_request', 'unpublish_reason',
    'assigned_moderator_id', 'review_started_at', 'published_at',
    'published_by', 'unpublished_at', 'unpublished_by',
    'published_record_id', 'published_table', 'version'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'listing_submissions' and column_name = col_name
    ) then
      raise exception 'Required column % is missing from public.listing_submissions', col_name;
    end if;
  end loop;

  -- 2. Check audit and version tables exist and have RLS
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'listing_submission_audits' and rowsecurity = true
  ) then
    raise exception 'public.listing_submission_audits table must exist with RLS enabled';
  end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'listing_submission_versions' and rowsecurity = true
  ) then
    raise exception 'public.listing_submission_versions table must exist with RLS enabled';
  end if;

  -- 3. Anonymous user must not read private queue or audit tables
  if has_table_privilege('anon', 'public.listing_submissions', 'SELECT') then
    raise exception 'anon must not have SELECT privilege on public.listing_submissions';
  end if;
  if has_table_privilege('anon', 'public.listing_submission_audits', 'SELECT') then
    raise exception 'anon must not have SELECT privilege on public.listing_submission_audits';
  end if;
  if has_table_privilege('anon', 'public.listing_submission_versions', 'SELECT') then
    raise exception 'anon must not have SELECT privilege on public.listing_submission_versions';
  end if;

  -- 4. Check moderator RPC execute grants
  foreach func_name in array array[
    'get_listing_submissions_v2(text,text,text,integer,integer,text,text)',
    'start_listing_review(uuid,integer)',
    'approve_listing_submission(uuid,text,integer)',
    'reject_listing_submission(uuid,text,text,integer)',
    'request_listing_corrections(uuid,text,text,integer)',
    'publish_listing_submission(uuid,text,uuid,integer)',
    'unpublish_listing_submission(uuid,text,text,integer)',
    'get_listing_submission_audit_trail(uuid)',
    'get_listing_submission_versions(uuid)'
  ] loop
    if has_function_privilege('anon', 'public.' || func_name, 'EXECUTE') then
      raise exception 'anon must not execute moderator function %', func_name;
    end if;
    if not has_function_privilege('authenticated', 'public.' || func_name, 'EXECUTE') then
      raise exception 'authenticated must have execute grant on moderator function %', func_name;
    end if;
  end loop;

  -- 5. Submitter public RPCs must be callable by anon and authenticated
  if not has_function_privilege('anon', 'public.get_submission_tracking_status(text,text)', 'EXECUTE') then
    raise exception 'anon must have execute privilege on get_submission_tracking_status';
  end if;
  if not has_function_privilege('anon', 'public.resubmit_listing_submission(text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'anon must have execute privilege on resubmit_listing_submission';
  end if;
  if not has_function_privilege('anon', 'public.submit_listing_intake(text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'anon must have execute privilege on submit_listing_intake';
  end if;

end;
$assertions$;

rollback;
