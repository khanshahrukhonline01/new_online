-- Runtime category-specific publication validation for Phase 3.1.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000030')
on conflict (id) do nothing;

insert into public.listing_moderators (user_id, is_active, role)
values ('00000000-0000-4000-8000-000000000030', true, 'moderator')
on conflict (user_id) do update set is_active = true, role = 'moderator';

insert into public.listing_submissions (
  id, listing_type, title, city, source_url, details
) values
  ('00000000-0000-4000-8000-000000000101','venue','Phase 3.1 Venue Fixture','Delhi','https://example.org/venue','A venue fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000102','opportunity','Phase 3.1 Trial Fixture','Delhi','https://example.org/trial','A trial fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000103','academy','Phase 3.1 Academy Fixture','Delhi','https://example.org/academy','An academy fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000104','coach','Phase 3.1 Coach Fixture','Delhi','https://example.org/coach','A coach fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000105','event','Phase 3.1 Event Fixture','Delhi','https://example.org/event','An event fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000106','pickup_game','Phase 3.1 Pickup Fixture','Delhi','https://example.org/pickup','A pickup game fixture for category validation.'),
  ('00000000-0000-4000-8000-000000000107','sport','Phase 3.1 Sport Fixture','Delhi','https://example.org/sport','A sport fixture for category validation.')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;

do $category_publication_tests$
declare
  r record;
  v_evidence_id uuid;
  v_pub jsonb;
  v_target_id uuid;
  v_table text;
  v_expected_evidence text;
  v_good_data jsonb;
  v_expected_version integer;
begin
  for r in
    select * from (values
      ('00000000-0000-4000-8000-000000000101'::uuid, 'venue', 'venue_address',
       '{"address":"100 Stadium Road, New Delhi","sport":"Football"}'::jsonb, 'venues'),
      ('00000000-0000-4000-8000-000000000102'::uuid, 'opportunity', 'official_source',
       '{"organizer_name":"Delhi Sports Authority","venue_name":"Jawaharlal Nehru Stadium","opportunity_type":"trial"}'::jsonb, 'opportunities'),
      ('00000000-0000-4000-8000-000000000103'::uuid, 'academy', 'academy_identity',
       '{"state":"Delhi"}'::jsonb, 'academies'),
      ('00000000-0000-4000-8000-000000000104'::uuid, 'coach', 'coach_qualification',
       '{"state":"Delhi","qualifications":"National coaching certificate reviewed by KhelGrid."}'::jsonb, 'coaches'),
      ('00000000-0000-4000-8000-000000000105'::uuid, 'event', 'event_details',
       '{"organizer_name":"Delhi Sports Association","venue_name":"Jawaharlal Nehru Stadium","event_type":"tournament","starts_at":"2030-01-10T10:00:00+05:30","ends_at":"2030-01-10T17:00:00+05:30"}'::jsonb, 'events'),
      ('00000000-0000-4000-8000-000000000106'::uuid, 'pickup_game', 'venue_address',
       '{"sport":"Football","venue_name":"Jawaharlal Nehru Stadium, Delhi","host_name":"Verified Community Host","starts_at":"2030-01-10T18:00:00+05:30"}'::jsonb, 'pickup_games'),
      ('00000000-0000-4000-8000-000000000107'::uuid, 'sport', 'official_source',
       '{}'::jsonb, 'sports')
    ) as fixtures(id, listing_type, evidence_type, structured_data, target_table)
  loop
    perform public.start_listing_review(r.id, 1);
    perform public.approve_listing_submission(r.id, 'Editorial review completed.', 2);

    v_evidence_id := public.add_listing_submission_evidence(
      r.id, r.evidence_type, 'https://example.org/evidence/' || r.listing_type,
      'Official category evidence reviewed for this isolated CI fixture.'
    );
    perform public.review_listing_submission_evidence(
      v_evidence_id, 'supports', 'Evidence supports the category claim.'
    );
    perform public.verify_listing_submission(
      r.id, 'verified', 'Category evidence criteria satisfied.'
    );

    -- A verified submission must still fail publication when category fields are absent.
    perform public.save_listing_publication_details(r.id, '{}'::jsonb, 6);
    begin
      perform public.publish_listing_submission(r.id, null, null, 7);
      raise exception 'Incomplete % listing unexpectedly published', r.listing_type;
    exception when invalid_parameter_value then
      null;
    end;

    perform public.save_listing_publication_details(r.id, r.structured_data, 7);
    select public.publish_listing_submission(r.id, null, null, 8) into v_pub;
    v_target_id := (v_pub->>'published_record_id')::uuid;
    v_table := v_pub->>'published_table';

    if v_target_id is null or v_table is distinct from r.target_table then
      raise exception 'Unexpected publication target for %: %', r.listing_type, v_pub;
    end if;

    if r.listing_type = 'venue' and not exists (
      select 1 from public.venues where id = v_target_id
        and address = '100 Stadium Road, New Delhi' and verification_status = 'verified'
    ) then raise exception 'Venue address or verification state was not preserved'; end if;

    if r.listing_type = 'opportunity' and not exists (
      select 1 from public.opportunities where id = v_target_id
        and organizer_name = 'Delhi Sports Authority' and verification_status = 'verified'
    ) then raise exception 'Opportunity organizer or verification state was not preserved'; end if;

    if r.listing_type = 'academy' and not exists (
      select 1 from public.academies where id = v_target_id and verification_status = 'verified'
    ) then raise exception 'Academy verification state was not preserved'; end if;

    if r.listing_type = 'coach' and not exists (
      select 1 from public.coaches where id = v_target_id
        and qualifications = 'National coaching certificate reviewed by KhelGrid.'
        and verification_status = 'verified'
    ) then raise exception 'Coach qualification or verification state was not preserved'; end if;

    if r.listing_type = 'event' and not exists (
      select 1 from public.events where id = v_target_id
        and starts_at = '2030-01-10T10:00:00+05:30'::timestamptz
        and ends_at = '2030-01-10T17:00:00+05:30'::timestamptz
        and organizer_name = 'Delhi Sports Association'
    ) then raise exception 'Event dates or organizer were not preserved'; end if;

    if r.listing_type = 'pickup_game' and not exists (
      select 1 from public.pickup_games where id = v_target_id
        and host_name = 'Verified Community Host'
        and starts_at = '2030-01-10T18:00:00+05:30'::timestamptz
    ) then raise exception 'Pickup-game host or start time was not preserved'; end if;

    if r.listing_type = 'sport' and not exists (
      select 1 from public.sports where id = v_target_id and is_published
    ) then raise exception 'Sport was not published'; end if;
  end loop;
end;
$category_publication_tests$;

reset role;
rollback;
