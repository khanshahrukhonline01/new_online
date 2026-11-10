-- Runtime integration flow for Phase 3: Complete Listing Moderation & Publication System
\set ON_ERROR_STOP on
begin;

-- Create temporary privileged verification functions for this test session
create or replace function pg_temp.get_submission(p_id uuid)
returns public.listing_submissions
language sql
security definer
as $$
  select * from public.listing_submissions where id = p_id;
$$;

create or replace function pg_temp.get_submission_by_title(p_title text)
returns public.listing_submissions
language sql
security definer
as $$
  select * from public.listing_submissions where title = p_title limit 1;
$$;

create or replace function pg_temp.version_exists(p_submission_id uuid, p_title text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.listing_submission_versions
    where submission_id = p_submission_id and title = p_title
  );
$$;

grant execute on function pg_temp.get_submission(uuid) to authenticated, anon;
grant execute on function pg_temp.get_submission_by_title(text) to authenticated, anon;
grant execute on function pg_temp.version_exists(uuid, text) to authenticated, anon;

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

-- Step 1: Anonymous submission
set local role anon;
insert into public.listing_submissions (listing_type, title, city, source_url, details)
values ('venue', 'Grand Sports Arena', 'Bengaluru', 'https://example.org/arena', 'Multi-sport turf');
reset role;

-- Step 2: Submitter tracking lookup
do $track_test$
declare
  v_ref text;
  v_key text;
  v_status text;
  v_title text;
begin
  select reference_number, tracking_key into v_ref, v_key
  from pg_temp.get_submission_by_title('Grand Sports Arena');

  if v_ref is null or v_key is null then
    raise exception 'Reference number and tracking key were not generated automatically';
  end if;

  -- Test as anonymous visitor
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

-- Step 3: Non-moderator unauthorized attempts
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000020', true);
set local role authenticated;
do $non_mod_test$
declare
  v_sub_id uuid;
begin
  select id into v_sub_id from pg_temp.get_submission_by_title('Grand Sports Arena');

  begin
    perform public.start_listing_review(v_sub_id);
    raise exception 'Non-moderator unexpectedly started review';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.approve_listing_submission(v_sub_id);
    raise exception 'Non-moderator unexpectedly approved submission';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.publish_listing_submission(v_sub_id);
    raise exception 'Non-moderator unexpectedly published submission';
  exception when insufficient_privilege then
    null;
  end;
end;
$non_mod_test$;
reset role;

-- Step 4: Moderator actions (Start Review, Request Corrections, Submitter Resubmission)
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_review_cycle$
declare
  v_sub public.listing_submissions%rowtype;
  v_queue_count integer;
  v_resubmit_res jsonb;
  v_pub_res jsonb;
  v_venue_id uuid;
  v_venue_count integer;
begin
  select * into v_sub from pg_temp.get_submission_by_title('Grand Sports Arena');

  -- Check v2 queue returns submission
  select count(*) into v_queue_count from public.get_listing_submissions_v2('pending_review');
  if v_queue_count < 1 then
    raise exception 'get_listing_submissions_v2 did not return the pending submission';
  end if;

  -- 4A: Start review
  perform public.start_listing_review(v_sub.id, v_sub.version);

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'under_review' or v_sub.assigned_moderator_id <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'start_listing_review did not set under_review or assigned moderator';
  end if;

  -- 4B: Request corrections (must reject empty / too-short message)
  begin
    perform public.request_listing_corrections(v_sub.id, 'short');
    raise exception 'request_listing_corrections unexpectedly accepted too-short message';
  exception when invalid_parameter_value then
    null;
  end;

  perform public.request_listing_corrections(v_sub.id, 'Please provide the exact postal address and confirmed court count.', 'Internal check note', v_sub.version);

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'changes_requested' or v_sub.correction_request is null then
    raise exception 'request_listing_corrections did not persist changes_requested state';
  end if;

  -- 4C: Submitter resubmits
  reset role;
  set local role anon;

  select public.resubmit_listing_submission(
    v_sub.reference_number,
    v_sub.tracking_key,
    'Grand Sports Arena Koramangala',
    'Bengaluru',
    'https://example.org/arena',
    '8 indoor badminton courts and 2 turf pitches at 80ft Road Koramangala'
  ) into v_resubmit_res;

  if (v_resubmit_res->>'success')::boolean is not true then
    raise exception 'resubmit_listing_submission failed: %', v_resubmit_res;
  end if;

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'resubmitted' or v_sub.version <= 1 then
    raise exception 'resubmission did not update status to resubmitted or increment version';
  end if;

  -- Verify version history was archived
  if not pg_temp.version_exists(v_sub.id, 'Grand Sports Arena') then
    raise exception 'Previous submission version was not archived in listing_submission_versions';
  end if;

  -- 4D: Moderator approves resubmitted listing
  select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
  set local role authenticated;

  perform public.approve_listing_submission(v_sub.id, 'Verified via official website and sports authority directory', v_sub.version);

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'approved' or v_sub.reviewed_by <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'approve_listing_submission failed to update approved state';
  end if;

  -- Critical Assertion: Approval MUST NOT create or publish a catalogue record yet!
  if exists (
    select 1 from public.venues where name ilike '%Grand Sports Arena%'
  ) then
    raise exception 'CRITICAL: Approval must NOT automatically create a catalogue record!';
  end if;

  -- 4E: Explicit Publication Action
  select public.publish_listing_submission(v_sub.id, null, null, v_sub.version) into v_pub_res;
  v_venue_id := (v_pub_res->>'published_record_id')::uuid;

  if v_venue_id is null or (v_pub_res->>'published_table') <> 'venues' then
    raise exception 'publish_listing_submission failed: %', v_pub_res;
  end if;

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'published' or v_sub.published_record_id <> v_venue_id then
    raise exception 'submission state not marked published with published_record_id';
  end if;

  -- Verify public record exists and is published
  select count(*) into v_venue_count from public.venues
  where id = v_venue_id and publication_status = 'published';

  if v_venue_count <> 1 then
    raise exception 'Catalogue record not found or not published';
  end if;

  -- 4F: Test Idempotent Repeated Publication Prevention
  begin
    perform public.publish_listing_submission(v_sub.id, null, null, v_sub.version);
    raise exception 'Repeated publication unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;

  -- 4G: Test Public Visibility
  reset role;
  set local role anon;
  if not exists (
    select 1 from public.venues where id = v_venue_id and publication_status = 'published'
  ) then
    raise exception 'Published venue is not visible to anonymous users';
  end if;

  -- 4H: Moderator Unpublishes Record
  select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
  set local role authenticated;

  perform public.unpublish_listing_submission(
    v_sub.id,
    'Facility temporarily closed for maintenance works',
    'Unpublished per venue notification',
    v_sub.version
  );

  select * into v_sub from pg_temp.get_submission(v_sub.id);
  if v_sub.status <> 'unpublished' or v_sub.unpublished_at is null then
    raise exception 'unpublish_listing_submission did not set unpublished status';
  end if;

  -- 4I: Verify Catalogue Record is NO LONGER Published
  reset role;
  set local role anon;
  if exists (
    select 1 from public.venues where id = v_venue_id and publication_status = 'published'
  ) then
    raise exception 'Unpublished venue is still published and visible!';
  end if;

  -- 4J: Audit Trail Verification
  select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
  set local role authenticated;
  if not exists (
    select 1 from public.get_listing_submission_audit_trail(v_sub.id) where action = 'published'
  ) or not exists (
    select 1 from public.get_listing_submission_audit_trail(v_sub.id) where action = 'unpublished'
  ) then
    raise exception 'Audit trail did not capture published and unpublished events';
  end if;

end;
$mod_review_cycle$;

rollback;
