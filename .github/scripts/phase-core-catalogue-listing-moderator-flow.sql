\set ON_ERROR_STOP on
-- Runtime role tests for the listing submission and moderation boundary.
-- All rows and auth fixtures are rolled back at the end.
begin;

insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.listing_moderators(user_id, is_active)
values ('00000000-0000-4000-8000-000000000002', true)
on conflict (user_id) do update set is_active = true;

insert into public.listing_submissions(
  id, listing_type, title, city, source_url, details
) values (
  '00000000-0000-4000-8000-000000000003',
  'venue', 'Moderator flow fixture', 'Test City', null, 'Temporary CI fixture'
);

-- Anonymous users can submit only user-owned fields; database defaults keep it pending.
set local role anon;
insert into public.listing_submissions(listing_type, title, city, source_url, details)
values ('pickup_game', 'Anonymous pickup suggestion', 'Test City', null, 'Temporary CI fixture');
reset role;

-- Authenticated users without moderator membership cannot read or review the queue.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $non_moderator$
declare visible_count integer;
begin
  select count(*) into visible_count from public.get_listing_submissions();
  if visible_count <> 0 then
    raise exception 'Non-moderator account can read private submissions';
  end if;

  begin
    perform public.review_listing_submission(
      '00000000-0000-4000-8000-000000000003',
      'approved',
      'Must not be allowed'
    );
    raise exception 'Non-moderator unexpectedly reviewed a submission';
  exception when insufficient_privilege then
    null;
  end;
end
$non_moderator$;
reset role;

-- An allowlisted moderator can read and review through the protected RPC.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $moderator$
declare visible_count integer;
begin
  select count(*) into visible_count from public.get_listing_submissions();
  if visible_count <> 2 then
    raise exception 'Moderator should see both test submissions; found %', visible_count;
  end if;

  perform public.review_listing_submission(
    '00000000-0000-4000-8000-000000000003',
    'approved',
    'CI moderator approval'
  );
end
$moderator$;
reset role;

do $verify$
begin
  if not exists (
    select 1 from public.listing_submissions
    where id='00000000-0000-4000-8000-000000000003'
      and status='approved'
      and reviewed_by='00000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Moderator RPC did not persist the approved decision and reviewer identity';
  end if;
  if not exists (
    select 1 from public.listing_submissions
    where listing_type='pickup_game'
      and title='Anonymous pickup suggestion'
      and status='pending_review'
      and reviewed_at is null
      and reviewed_by is null
  ) then
    raise exception 'Anonymous submission did not remain pending and unpublished';
  end if;
end
$verify$;

rollback;
