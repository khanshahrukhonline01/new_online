-- Runtime integration flow for Phase 3: Complete Listing Moderation & Publication System
-- Tests complete lifecycle: submission -> tracking -> review -> corrections -> resubmission -> approval -> publication -> unpublication -> audits.
-- Operates user-facing moderation actions under intended roles (anon, authenticated non-moderator, authenticated moderator).
-- Operates internal database state assertions under the privileged test runner connection.
\set ON_ERROR_STOP on
begin;

-- Create test auth users
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000030')
on conflict (id) do nothing;

-- User 3 is an allowlisted active moderator
insert into public.listing_moderators (user_id, is_active)
values ('00000000-0000-4000-8000-000000000030', true)
on conflict (user_id) do update set is_active = true;

-- Step 1: Anonymous submission intake
set local role anon;
insert into public.listing_submissions (
  id, listing_type, title, city, source_url, details
) values (
  '00000000-0000-4000-8000-000000000040',
  'venue', 'Grand Sports Arena', 'Bengaluru', 'https://example.org/arena', 'Multi-sport turf'
);
reset role;

-- Privileged verification of Step 1:
do $verify_step1$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.reference_number is null or v_sub.tracking_key is null then
    raise exception 'Reference number and tracking key were not generated automatically';
  end if;
  if v_sub.status <> 'pending_review' then
    raise exception 'Initial status must be pending_review, got %', v_sub.status;
  end if;
end;
$verify_step1$;

-- Step 2: Submitter tracking lookup (tested under anon role)
do $track_test$
declare
  v_ref text;
  v_key text;
  v_status text;
  v_title text;
begin
  -- Retrieve reference number and tracking key as privileged test runner
  select reference_number, tracking_key into v_ref, v_key
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040';

  -- Switch to anon to test public tracking RPC
  set local role anon;
  select status, title into v_status, v_title
  from public.get_submission_tracking_status(v_ref, v_key);

  if v_status <> 'pending_review' or v_title <> 'Grand Sports Arena' then
    raise exception 'Anonymous submitter tracking failed: status=%, title=%', v_status, v_title;
  end if;

  -- Invalid key should return no rows
  if exists (
    select 1 from public.get_submission_tracking_status(v_ref, 'wrong-key')
  ) then
    raise exception 'Invalid tracking key unexpectedly returned submission details';
  end if;

  reset role;
end;
$track_test$;

-- Step 3: Non-moderator unauthorized attempts (tested under authenticated user 20)
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000020', true);
set local role authenticated;

do $non_mod_test$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
begin
  -- 3A: Non-moderator cannot call start_listing_review
  begin
    perform public.start_listing_review(v_sub_id);
    raise exception 'Non-moderator unexpectedly started review';
  exception when insufficient_privilege then
    null;
  end;

  -- 3B: Non-moderator cannot call approve_listing_submission
  begin
    perform public.approve_listing_submission(v_sub_id);
    raise exception 'Non-moderator unexpectedly approved submission';
  exception when insufficient_privilege then
    null;
  end;

  -- 3C: Non-moderator cannot call publish_listing_submission
  begin
    perform public.publish_listing_submission(v_sub_id);
    raise exception 'Non-moderator unexpectedly published submission';
  exception when insufficient_privilege then
    null;
  end;

  -- 3D: Non-moderator cannot read moderation queue v2
  begin
    perform public.get_listing_submissions_v2('pending_review');
    raise exception 'Non-moderator unexpectedly accessed moderator queue v2';
  exception when insufficient_privilege then
    null;
  end;
end;
$non_mod_test$;

reset role;

-- Step 4A: Allowlisted moderator claims and starts review
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_start_review$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
  v_queue_count integer;
begin
  -- Check v2 queue returns pending submission to authorized moderator
  select count(*) into v_queue_count from public.get_listing_submissions_v2('pending_review');
  if v_queue_count < 1 then
    raise exception 'get_listing_submissions_v2 did not return the pending submission';
  end if;

  -- Claim review as moderator
  perform public.start_listing_review(v_sub_id, 1);
end;
$mod_start_review$;

reset role;

-- Privileged verification of 4A:
do $verify_start_review$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'under_review' or v_sub.assigned_moderator_id <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'start_listing_review did not set under_review or assigned moderator';
  end if;
  if v_sub.version <> 2 then
    raise exception 'start_listing_review expected version 2, found %', v_sub.version;
  end if;
end;
$verify_start_review$;

-- Step 4B: Moderator requests corrections
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_request_corrections$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
begin
  -- Must reject too-short message (< 10 characters)
  begin
    perform public.request_listing_corrections(v_sub_id, 'short', null, 2);
    raise exception 'request_listing_corrections unexpectedly accepted too-short message';
  exception when invalid_parameter_value then
    null;
  end;

  -- Valid correction request
  perform public.request_listing_corrections(
    v_sub_id,
    'Please provide the exact postal address and confirmed court count.',
    'Internal check note',
    2
  );
end;
$mod_request_corrections$;

reset role;

-- Privileged verification of 4B:
do $verify_corrections$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'changes_requested' or v_sub.correction_request is null then
    raise exception 'request_listing_corrections did not persist changes_requested state';
  end if;
  if v_sub.version <> 3 then
    raise exception 'request_listing_corrections expected version 3, found %', v_sub.version;
  end if;
end;
$verify_corrections$;

-- Step 4C: Submitter updates and resubmits
do $submitter_resubmit$
declare
  v_ref text;
  v_key text;
  v_res jsonb;
begin
  -- Read tracking credentials as privileged test runner
  select reference_number, tracking_key into v_ref, v_key
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040';

  -- Switch to anon to simulate submitter calling resubmit_listing_submission
  set local role anon;

  select public.resubmit_listing_submission(
    v_ref,
    v_key,
    'Grand Sports Arena Koramangala',
    'Bengaluru',
    'https://example.org/arena',
    '8 indoor badminton courts and 2 turf pitches at 80ft Road Koramangala'
  ) into v_res;

  if (v_res->>'success')::boolean is not true then
    raise exception 'resubmit_listing_submission failed: %', v_res;
  end if;

  reset role;
end;
$submitter_resubmit$;

-- Privileged verification of 4C:
do $verify_resubmit$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'resubmitted' or v_sub.version <> 4 then
    raise exception 'resubmission did not update status to resubmitted or increment version; status=%, version=%', v_sub.status, v_sub.version;
  end if;

  -- Verify version history was archived
  if not exists (
    select 1 from public.listing_submission_versions
    where submission_id = '00000000-0000-4000-8000-000000000040'
      and title = 'Grand Sports Arena'
  ) then
    raise exception 'Previous submission version was not archived in listing_submission_versions';
  end if;
end;
$verify_resubmit$;

-- Step 4D: Moderator approves resubmitted listing
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_approve$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
begin
  perform public.approve_listing_submission(
    v_sub_id,
    'Verified via official website and sports authority directory',
    4
  );
end;
$mod_approve$;

reset role;

-- Privileged verification of 4D:
do $verify_approve$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'approved' or v_sub.reviewed_by <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'approve_listing_submission failed to update approved state';
  end if;
  if v_sub.version <> 5 then
    raise exception 'approve_listing_submission expected version 5, found %', v_sub.version;
  end if;

  -- CRITICAL INVARIANT: Approval must NEVER create or publish a catalogue record automatically
  if exists (
    select 1 from public.venues where name ilike '%Grand Sports Arena%'
  ) then
    raise exception 'CRITICAL: Approval must NOT automatically create a catalogue record!';
  end if;
end;
$verify_approve$;

-- Step 4E: Moderator explicitly publishes the listing
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_publish$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
  v_pub_res jsonb;
  v_target_id uuid;
begin
  select public.publish_listing_submission(v_sub_id, null, null, 5) into v_pub_res;
  v_target_id := (v_pub_res->>'published_record_id')::uuid;

  if v_target_id is null or (v_pub_res->>'published_table') <> 'venues' then
    raise exception 'publish_listing_submission failed: %', v_pub_res;
  end if;

  -- 4F: Test idempotent repeated publication prevention (under authenticated moderator role)
  begin
    perform public.publish_listing_submission(v_sub_id, null, null, 6);
    raise exception 'Repeated publication unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;
end;
$mod_publish$;

reset role;

-- Privileged verification of 4E:
do $verify_publish$
declare
  v_sub public.listing_submissions%rowtype;
  v_venue_count integer;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'published' or v_sub.published_record_id is null or v_sub.published_table <> 'venues' then
    raise exception 'submission state not marked published with published_record_id';
  end if;
  if v_sub.version <> 6 then
    raise exception 'publish_listing_submission expected version 6, found %', v_sub.version;
  end if;

  -- Verify public catalogue row exists and is published
  select count(*) into v_venue_count from public.venues
  where id = v_sub.published_record_id and publication_status = 'published';

  if v_venue_count <> 1 then
    raise exception 'Catalogue record not found or not published';
  end if;
end;
$verify_publish$;

-- Step 4G: Test anonymous public visibility of published record
set local role anon;

do $anon_visibility_test$
begin
  if not exists (
    select 1 from public.venues
    where name ilike '%Grand Sports Arena%' and publication_status = 'published'
  ) then
    raise exception 'Published venue is not visible to anonymous users';
  end if;
end;
$anon_visibility_test$;

reset role;

-- Step 4H: Moderator unpublishes the listing
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_unpublish$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
begin
  perform public.unpublish_listing_submission(
    v_sub_id,
    'Facility temporarily closed for maintenance works',
    'Unpublished per venue notification',
    6
  );
end;
$mod_unpublish$;

reset role;

-- Privileged verification of 4H:
do $verify_unpublish$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions where id = '00000000-0000-4000-8000-000000000040';
  if v_sub.status <> 'unpublished' or v_sub.unpublished_at is null or v_sub.unpublish_reason is null then
    raise exception 'unpublish_listing_submission did not set unpublished status or reason';
  end if;
  if v_sub.version <> 7 then
    raise exception 'unpublish_listing_submission expected version 7, found %', v_sub.version;
  end if;

  -- Verify catalogue record is NO LONGER published
  if exists (
    select 1 from public.venues
    where id = v_sub.published_record_id and publication_status = 'published'
  ) then
    raise exception 'Unpublished venue is still published and visible!';
  end if;
end;
$verify_unpublish$;

-- Step 4I: Verify catalogue record is NOT visible to anonymous users after unpublishing
set local role anon;

do $anon_unpublish_visibility$
begin
  if exists (
    select 1 from public.venues
    where name ilike '%Grand Sports Arena%' and publication_status = 'published'
  ) then
    raise exception 'Unpublished venue is still published and visible to anon!';
  end if;
end;
$anon_unpublish_visibility$;

reset role;

-- Step 4J: Audit trail verification via authorized moderator RPC
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_audit_check$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040';
begin
  if not exists (
    select 1 from public.get_listing_submission_audit_trail(v_sub_id) where action = 'published'
  ) or not exists (
    select 1 from public.get_listing_submission_audit_trail(v_sub_id) where action = 'unpublished'
  ) then
    raise exception 'Audit trail did not capture published and unpublished events';
  end if;
end;
$mod_audit_check$;

reset role;

rollback;
