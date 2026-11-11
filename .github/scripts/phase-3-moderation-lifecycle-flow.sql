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
insert into public.listing_moderators (user_id, is_active, role)
values
  ('00000000-0000-4000-8000-000000000010', true, 'super_admin'),
  ('00000000-0000-4000-8000-000000000030', true, 'moderator')
on conflict (user_id) do update set is_active = excluded.is_active, role = excluded.role;

-- Seed a deterministic lifecycle fixture using the privileged CI connection.
-- The public client is not permitted to insert directly into this private table.
insert into public.listing_submissions (
  id, listing_type, title, city, source_url, details
) values (
  '00000000-0000-4000-8000-000000000040',
  'venue', 'Grand Sports Arena', 'Bengaluru', 'https://example.org/arena', 'Multi-sport turf'
);

-- Separate fixture for the submitter self-review denial assertion; it never reaches notification paths.
insert into public.listing_submissions (
  id, listing_type, title, city, source_url, details, submitter_id
) values (
  '00000000-0000-4000-8000-000000000041',
  'venue', 'Self Review Denial Fixture', 'Bengaluru', 'https://example.org/self-review', 'Self-review denial fixture',
  '00000000-0000-4000-8000-000000000010'
);

-- Diagnose the exact RPC implementation installed in this CI database before invoking it.
-- Include every overload so stale or unexpected signatures are visible in the job log.
select
  p.oid::regprocedure as function_signature,
  pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  md5(p.prosrc) as function_body_md5,
  pg_get_functiondef(p.oid) as installed_function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'submit_listing_intake'
order by p.oid::regprocedure::text;

-- Capture and print the complete anonymous RPC response before asserting its shape.
-- A raised SQL error from inside the RPC is intentionally allowed to surface unchanged.
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set local role anon;
select public.submit_listing_intake(
  'venue', 'Public Intake RPC Test', 'Bengaluru',
  'https://example.org/public-intake-test',
  'Created through public intake RPC', null
) as phase3_intake_response
\gset

\echo 'Anonymous submit_listing_intake response: ' :phase3_intake_response

-- Validate status and each required identifier independently without masking the response.
select (
  (:'phase3_intake_response'::jsonb->>'status') = 'submitted'
  and nullif(:'phase3_intake_response'::jsonb->>'id', '') is not null
  and nullif(:'phase3_intake_response'::jsonb->>'reference_number', '') is not null
  and nullif(:'phase3_intake_response'::jsonb->>'tracking_key', '') is not null
) as phase3_intake_response_valid
\gset

\if :phase3_intake_response_valid
  \echo 'PASS: anonymous intake returned submitted status and all required identifiers.'
\else
  \echo 'FAIL: anonymous intake response has an unexpected status or is missing id/reference_number/tracking_key.'
  \quit 3
\endif
reset role;

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of Step 1:
do $verify_step1$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.id is null then
    raise exception 'Listing submission was not created';
  end if;
  if v_sub.reference_number is null or v_sub.tracking_key is null then
    raise exception 'Reference number and tracking key were not generated automatically';
  end if;
  if v_sub.status <> 'pending_review' then
    raise exception 'Initial status must be pending_review, got %', v_sub.status;
  end if;
end;
$verify_step1$;
RESET ROLE;

-- Step 2: Resolve the exact fixture credentials as the privileged test runner.
SET LOCAL ROLE postgres;
select reference_number as phase3_tracking_ref, tracking_key as phase3_tracking_key
from public.listing_submissions
where id = '00000000-0000-4000-8000-000000000040'
\gset
\echo 'Tracking fixture reference: ' :phase3_tracking_ref
RESET ROLE;

select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set local role anon;
-- The RPC must return exactly the seeded row for the valid reference/key pair.
select id::text as phase3_tracking_result_id,
       reference_number as phase3_tracking_result_reference,
       title as phase3_tracking_result_title,
       status as phase3_tracking_result_status
from public.get_submission_tracking_status(:'phase3_tracking_ref', :'phase3_tracking_key')
\gset

\if :{?phase3_tracking_result_id}
  \echo 'Tracking RPC returned ID: ' :phase3_tracking_result_id
  \echo 'Tracking RPC returned reference: ' :phase3_tracking_result_reference
  \echo 'Tracking RPC returned title: ' :phase3_tracking_result_title
  \echo 'Tracking RPC returned status: ' :phase3_tracking_result_status
\else
  \echo 'FAIL: valid tracking credentials returned no submission row.'
  \quit 3
\endif

select (
  :'phase3_tracking_result_id' = '00000000-0000-4000-8000-000000000040'
  and :'phase3_tracking_result_reference' = :'phase3_tracking_ref'
  and :'phase3_tracking_result_status' = 'pending_review'
) as phase3_valid_tracking_result
\gset

\if :phase3_valid_tracking_result
  \echo 'PASS: valid tracking credentials returned the exact seeded submission.'
\else
  \echo 'FAIL: valid tracking credentials returned a different submission.'
  \quit 3
\endif

select (
  count(*) = 0
) as phase3_wrong_key_rejected
from public.get_submission_tracking_status(:'phase3_tracking_ref', 'wrong-key')
\gset

\if :phase3_wrong_key_rejected
  \echo 'PASS: invalid tracking key returned zero rows as expected.'
\else
  \echo 'FAIL: invalid tracking key unexpectedly returned rows.'
  \quit 3
\endif
reset role;

-- Step 3: Non-moderator unauthorized attempts (tested under authenticated user 20)
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000020', true);
set local role authenticated;

do $non_mod_test$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
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

  -- 3E: Non-moderator cannot manage moderator accounts.
  begin
    perform public.list_listing_moderator_accounts();
    raise exception 'Non-moderator unexpectedly accessed moderator accounts';
  exception when insufficient_privilege then
    null;
  end;
end;
$non_mod_test$;

reset role;

-- Step 3F: Super-admin control plane can inspect access but cannot remove the last super-admin.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000010', true);
set local role authenticated;
do $super_admin_control$
declare
  v_count integer;
begin
  begin
    perform public.start_listing_review(
      '00000000-0000-4000-8000-000000000041', 1
    );
    raise exception 'A submitter who is a super-admin unexpectedly reviewed their own listing';
  exception when insufficient_privilege then
    null;
  end;
  select count(*) into v_count from public.list_listing_moderator_accounts();
  if v_count < 2 then
    raise exception 'Super-admin did not receive the authorized moderator account list';
  end if;
  begin
    perform public.set_listing_moderator_access(
      '00000000-0000-4000-8000-000000000010', 'moderator', true,
      'Must not remove the final active super-admin'
    );
    raise exception 'The last active super-admin was unexpectedly demoted';
  exception when check_violation then
    null;
  end;
  perform public.set_listing_moderator_access(
    '00000000-0000-4000-8000-000000000020', 'moderator', true,
    'CI fixture moderator grant'
  );
  select count(*) into v_count from public.get_listing_moderator_access_audit(50);
  if v_count < 1 then
    raise exception 'Super-admin access audit history did not record the moderator grant';
  end if;
end;
$super_admin_control$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000020', true);
set local role authenticated;
do $new_moderator_profile$
declare
  v_role text;
begin
  select role into v_role from public.get_moderation_access_profile();
  if v_role is distinct from 'moderator' then
    raise exception 'Newly granted moderator did not receive the expected access profile';
  end if;
end;
$new_moderator_profile$;
reset role;

-- Step 4A: Allowlisted moderator claims and starts review
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_start_review$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
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

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4A:
do $verify_start_review$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'under_review' or v_sub.assigned_moderator_id <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'start_listing_review did not set under_review or assigned moderator';
  end if;
  if v_sub.version <> 2 then
    raise exception 'start_listing_review expected version 2, found %', v_sub.version;
  end if;
end;
$verify_start_review$;
RESET ROLE;

-- Step 4B: Moderator requests corrections
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_request_corrections$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
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

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4B:
do $verify_corrections$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'changes_requested' or v_sub.correction_request is null then
    raise exception 'request_listing_corrections did not persist changes_requested state';
  end if;
  if v_sub.version <> 3 then
    raise exception 'request_listing_corrections expected version 3, found %', v_sub.version;
  end if;
end;
$verify_corrections$;
RESET ROLE;

-- Step 4C: Submitter resubmits through the public RPC under anon.
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set local role anon;
select (
  (public.resubmit_listing_submission(
    :'phase3_tracking_ref',
    :'phase3_tracking_key',
    'Grand Sports Arena Koramangala',
    'Bengaluru',
    'https://example.org/arena',
    '8 indoor badminton courts and 2 turf pitches at 80ft Road Koramangala'
  )->>'success')::boolean
) as phase3_resubmission_success
\gset

\if :phase3_resubmission_success
  \echo 'PASS: submitter resubmission succeeded.'
\else
  \echo 'FAIL: submitter resubmission failed.'
  \quit 3
\endif
reset role;

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4C:
do $verify_resubmit$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'resubmitted' or v_sub.version <> 4 then
    raise exception 'resubmission did not update status to resubmitted or increment version; status=%, version=%', v_sub.status, v_sub.version;
  end if;

  -- Verify version history was archived
  if not exists (
    select 1 from public.listing_submission_versions
    where submission_id = v_sub.id
      and title = 'Grand Sports Arena'
  ) then
    raise exception 'Previous submission version was not archived in listing_submission_versions';
  end if;
end;
$verify_resubmit$;
RESET ROLE;

-- Step 4D: Moderator approves resubmitted listing
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_approve$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
begin
  perform public.start_listing_review(v_sub_id, 4);
  perform public.approve_listing_submission(
    v_sub_id,
    'Editorial review completed after the submitter resubmitted corrections.',
    5
  );
end;
$mod_approve$;

reset role;

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4D:
do $verify_approve$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'approved' or v_sub.reviewed_by <> '00000000-0000-4000-8000-000000000030' then
    raise exception 'approve_listing_submission failed to update approved state';
  end if;
  if v_sub.version <> 6 then
    raise exception 'approve_listing_submission expected version 6, found %', v_sub.version;
  end if;

  -- CRITICAL INVARIANT: Approval must NEVER create or publish a catalogue record automatically
  if exists (
    select 1 from public.venues where name ilike '%Grand Sports Arena%'
  ) then
    raise exception 'CRITICAL: Approval must NOT automatically create a catalogue record!';
  end if;
end;
$verify_approve$;
RESET ROLE;

-- Step 4E: Approval alone must not permit publication before evidence verification.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $publication_requires_verification$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
begin
  begin
    perform public.publish_listing_submission(v_sub_id, null, null, 6);
    raise exception 'Publication unexpectedly succeeded without evidence verification';
  exception when check_violation then
    null;
  end;
end;
$publication_requires_verification$;

-- Add and review real HTTPS evidence in the test fixture, then make the separate verification decision.
select public.add_listing_submission_evidence(
  '00000000-0000-4000-8000-000000000040',
  'venue_address',
  'https://example.org/arena-verification',
  'Official venue source confirms the facility identity and submitted location.'
) as phase3_evidence_id
\gset

select public.review_listing_submission_evidence(
  :'phase3_evidence_id'::uuid,
  'supports',
  'Evidence supports the venue identity and submitted location.'
);
select public.verify_listing_submission(
  '00000000-0000-4000-8000-000000000040',
  'verified',
  'Independent evidence review completed.'
);
select public.save_listing_publication_details(
  '00000000-0000-4000-8000-000000000040',
  '{"address":"12 Stadium Road, Koramangala, Bengaluru","sport":"Multi-sport"}'::jsonb,
  9
) as phase3_details_version
\gset

-- 4F: Publish only after approval, evidence verification and complete category data.
do $mod_publish$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
  v_pub_res jsonb;
  v_target_id uuid;
begin
  select public.publish_listing_submission(v_sub_id, null, null, 10) into v_pub_res;
  v_target_id := (v_pub_res->>'published_record_id')::uuid;
  if v_target_id is null or (v_pub_res->>'published_table') <> 'venues' then
    raise exception 'publish_listing_submission failed: %', v_pub_res;
  end if;

  begin
    perform public.publish_listing_submission(v_sub_id, null, null, 11);
    raise exception 'Repeated publication unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;
end;
$mod_publish$;

reset role;

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4E:
do $verify_publish$
declare
  v_sub public.listing_submissions%rowtype;
  v_venue_count integer;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'published' or v_sub.published_record_id is null or v_sub.published_table <> 'venues' then
    raise exception 'submission state not marked published with published_record_id';
  end if;
  if v_sub.version <> 11 then
    raise exception 'publish_listing_submission expected version 11, found %', v_sub.version;
  end if;

  -- Verify public catalogue row exists and is published
  select count(*) into v_venue_count from public.venues
  where id = v_sub.published_record_id and publication_status = 'published';

  if v_venue_count <> 1 then
    raise exception 'Catalogue record not found or not published';
  end if;
end;
$verify_publish$;

-- Capture published venue ID for visibility assertions
select published_record_id as phase3_venue_id
from public.listing_submissions
where id = '00000000-0000-4000-8000-000000000040'
\gset

\echo 'Phase 3 published venue id: ' :phase3_venue_id
RESET ROLE;

-- Step 4G: Test anonymous public visibility of published record
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set local role anon;

select exists (
  select 1 from public.venues
  where id = :'phase3_venue_id'::uuid and publication_status = 'published'
) as phase3_published_venue_visible
\gset

\if :phase3_published_venue_visible
  \echo 'PASS: published venue is visible to anonymous users.'
\else
  \echo 'FAIL: published venue is not visible to anonymous users.'
  \quit 3
\endif

reset role;

-- Step 4H: Moderator unpublishes the listing
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_unpublish$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
begin
  perform public.unpublish_listing_submission(
    v_sub_id,
    'Facility temporarily closed for maintenance works',
    'Unpublished per venue notification',
    11
  );
end;
$mod_unpublish$;

reset role;

-- Run internal assertions with the CI database owner, never the simulated client role.
SET LOCAL ROLE postgres;

-- Privileged verification of 4H:
do $verify_unpublish$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub
  from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;

  if v_sub.status <> 'unpublished' or v_sub.unpublished_at is null or v_sub.unpublish_reason is null then
    raise exception 'unpublish_listing_submission did not set unpublished status or reason';
  end if;
  if v_sub.version <> 12 then
    raise exception 'unpublish_listing_submission expected version 12, found %', v_sub.version;
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
RESET ROLE;

-- Step 4I: Verify catalogue record is NOT visible to anonymous users after unpublishing
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set local role anon;

select not exists (
  select 1 from public.venues
  where id = :'phase3_venue_id'::uuid and publication_status = 'published'
) as phase3_unpublished_venue_hidden
\gset

\if :phase3_unpublished_venue_hidden
  \echo 'PASS: unpublished venue is hidden from anonymous users.'
\else
  \echo 'FAIL: unpublished venue is still visible to anonymous users.'
  \quit 3
\endif

reset role;

-- Step 4J: Re-approve and republish the same catalogue row without duplication.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;
do $republish_existing$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
  v_before uuid;
  v_after uuid;
  v_count integer;
begin
  select published_record_id into v_before from public.listing_submissions where id = v_sub_id;
  perform public.start_listing_review(v_sub_id, 12);
  perform public.approve_listing_submission(v_sub_id, 'Re-approved after maintenance confirmation', 13);
  select (public.publish_listing_submission(v_sub_id, null, null, 14)->>'published_record_id')::uuid into v_after;
  if v_after is distinct from v_before then
    raise exception 'Republishing created a different catalogue record instead of reusing the original';
  end if;
  select count(*) into v_count from public.venues where id = v_before;
  if v_count <> 1 then
    raise exception 'Republishing produced duplicate venue catalogue records';
  end if;
end;
$republish_existing$;
reset role;

SET LOCAL ROLE postgres;
do $verify_republished$
declare
  v_sub public.listing_submissions%rowtype;
begin
  select * into v_sub from public.listing_submissions
  where id = '00000000-0000-4000-8000-000000000040'::uuid;
  if v_sub.status <> 'published' or v_sub.version <> 15 then
    raise exception 'Republishing did not restore published state at expected version 15';
  end if;
end;
$verify_republished$;
RESET ROLE;

-- Step 4K: Audit trail verification via authorized moderator RPC
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
set local role authenticated;

do $mod_audit_check$
declare
  v_sub_id constant uuid := '00000000-0000-4000-8000-000000000040'::uuid;
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
