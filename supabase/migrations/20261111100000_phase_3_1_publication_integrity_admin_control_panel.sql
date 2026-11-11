-- KhelGrid Phase 3.1: Publication Integrity & Admin Control Panel
-- Additive, transaction-safe hardening. Apply only to the intended development project.
-- Approval, evidence verification and publication are separate decisions.
begin;

-- 1. Explicit moderator roles. The first super-admin must be bootstrapped by a trusted
-- database operator; no browser user can promote themselves or create the first super-admin.
alter table public.listing_moderators
  add column if not exists role text not null default 'moderator',
  add column if not exists notes text;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_moderators'::regclass
      and conname = 'listing_moderators_role_check'
  ) then
    alter table public.listing_moderators
      add constraint listing_moderators_role_check
      check (role in ('moderator', 'super_admin'));
  end if;
end;
$constraint$;

alter table public.listing_submissions
  add column if not exists structured_data jsonb not null default '{}'::jsonb,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_submissions'::regclass
      and conname = 'listing_submissions_verification_status_check'
  ) then
    alter table public.listing_submissions
      add constraint listing_submissions_verification_status_check
      check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listing_submissions'::regclass
      and conname = 'listing_submissions_structured_data_object_check'
  ) then
    alter table public.listing_submissions
      add constraint listing_submissions_structured_data_object_check
      check (jsonb_typeof(structured_data) = 'object' and octet_length(structured_data::text) <= 20000);
  end if;
end;
$constraint$;

-- Category-specific destination fields. Defaults that could fabricate facts are removed.
alter table public.venues
  add column if not exists verification_status text not null default 'unverified';
alter table public.academies
  add column if not exists verification_status text not null default 'unverified';
alter table public.coaches
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists qualifications text;
alter table public.events
  add column if not exists organizer_name text,
  add column if not exists venue_name text,
  add column if not exists ends_at timestamptz,
  add column if not exists verification_status text not null default 'unverified';
alter table public.pickup_games
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists verification_status text not null default 'unverified';

alter table public.events alter column starts_at drop default;
alter table public.pickup_games alter column city drop default;
alter table public.pickup_games alter column time_label drop default;
alter table public.pickup_games alter column host_name drop default;

-- 2. Evidence ledger: URLs and review outcomes are private and only accessible through RPCs.
create table if not exists public.listing_submission_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.listing_submissions(id) on delete cascade,
  evidence_type text not null check (evidence_type in (
    'official_source', 'organizer_identity', 'venue_address', 'event_details',
    'coach_qualification', 'academy_identity', 'other'
  )),
  evidence_url text not null check (evidence_url ~* '^https://'),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  outcome text not null default 'pending'
    check (outcome in ('pending', 'supports', 'contradicts', 'insufficient')),
  created_by uuid not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listing_submission_evidence_submission_idx
  on public.listing_submission_evidence(submission_id, created_at desc);
alter table public.listing_submission_evidence enable row level security;
revoke all on public.listing_submission_evidence from public, anon, authenticated;
grant all on public.listing_submission_evidence to service_role;

-- 3. Append-only access-control audit trail.
create table if not exists public.listing_moderator_access_audits (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('granted', 'role_changed', 'activated', 'deactivated')),
  old_role text,
  new_role text,
  old_is_active boolean,
  new_is_active boolean,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.listing_moderator_access_audits enable row level security;
revoke all on public.listing_moderator_access_audits from public, anon, authenticated;
grant all on public.listing_moderator_access_audits to service_role;

-- Extend the existing audit action vocabulary without deleting historical audit rows.
alter table public.listing_submission_audits
  drop constraint if exists listing_submission_audits_action_check;
alter table public.listing_submission_audits
  add constraint listing_submission_audits_action_check
  check (action in (
    'submitted', 'start_review', 'approved', 'rejected', 'changes_requested',
    'resubmitted', 'published', 'unpublished', 'moderator_assigned', 'notes_updated',
    'evidence_added', 'evidence_reviewed', 'verification_approved',
    'verification_rejected', 'publication_details_updated'
  ));

-- 4. Trusted role predicates. The super-admin predicate reads only the caller's own row.
create or replace function public.is_listing_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1 from public.listing_moderators m
    where m.user_id = auth.uid()
      and m.is_active = true
      and m.role = 'super_admin'
  );
$function$;
revoke all on function public.is_listing_super_admin() from public, anon;
grant execute on function public.is_listing_super_admin() to authenticated, service_role;

create or replace function public.get_moderation_access_profile()
returns table (user_id uuid, role text, is_active boolean)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return query
    select m.user_id, m.role, m.is_active
    from public.listing_moderators m
    where m.user_id = auth.uid() and m.is_active = true;
end;
$function$;
revoke all on function public.get_moderation_access_profile() from public, anon;
grant execute on function public.get_moderation_access_profile() to authenticated, service_role;

create or replace function public.list_listing_moderator_accounts()
returns table (
  user_id uuid, role text, is_active boolean, notes text,
  created_at timestamptz, created_by uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_super_admin() then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  return query
    select m.user_id, m.role, m.is_active, m.notes, m.created_at, m.created_by
    from public.listing_moderators m
    order by m.role desc, m.created_at asc;
end;
$function$;
revoke all on function public.list_listing_moderator_accounts() from public, anon;
grant execute on function public.list_listing_moderator_accounts() to authenticated, service_role;

create or replace function public.set_listing_moderator_access(
  p_user_id uuid,
  p_role text,
  p_is_active boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_old public.listing_moderators%rowtype;
  v_exists boolean;
  v_active_super_admins integer;
  v_action text;
begin
  if auth.uid() is null or not public.is_listing_super_admin() then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  if p_user_id is null or p_role is null or p_role not in ('moderator', 'super_admin') or p_is_active is null then
    raise exception 'A valid user, role and active state are required' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 1000 then
    raise exception 'Access notes must be 1000 characters or fewer' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'Target authentication user does not exist' using errcode = 'P0002';
  end if;

  select * into v_old from public.listing_moderators where user_id = p_user_id for update;
  v_exists := found;

  if v_exists and v_old.is_active and v_old.role = 'super_admin'
     and (not p_is_active or p_role <> 'super_admin') then
    select count(*) into v_active_super_admins
    from public.listing_moderators
    where is_active and role = 'super_admin' and user_id <> p_user_id;
    if v_active_super_admins = 0 then
      raise exception 'Cannot remove or demote the last active super-admin' using errcode = '23514';
    end if;
  end if;

  insert into public.listing_moderators (user_id, role, is_active, created_by, notes)
  values (p_user_id, p_role, p_is_active, auth.uid(), nullif(btrim(p_notes), ''))
  on conflict (user_id) do update
    set role = excluded.role,
        is_active = excluded.is_active,
        notes = excluded.notes;

  v_action := case
    when not v_exists then 'granted'
    when v_old.role is distinct from p_role then 'role_changed'
    when v_old.is_active is distinct from p_is_active and p_is_active then 'activated'
    when v_old.is_active is distinct from p_is_active and not p_is_active then 'deactivated'
    else 'role_changed'
  end;

  insert into public.listing_moderator_access_audits (
    target_user_id, actor_id, action, old_role, new_role,
    old_is_active, new_is_active, notes
  ) values (
    p_user_id, auth.uid(), v_action,
    case when v_exists then v_old.role end, p_role,
    case when v_exists then v_old.is_active end, p_is_active,
    nullif(btrim(p_notes), '')
  );
end;
$function$;
revoke all on function public.set_listing_moderator_access(uuid, text, boolean, text) from public, anon;
grant execute on function public.set_listing_moderator_access(uuid, text, boolean, text) to authenticated, service_role;

create or replace function public.get_listing_moderator_access_audit(p_limit integer default 100)
returns table (
  id uuid, target_user_id uuid, actor_id uuid, action text,
  old_role text, new_role text, old_is_active boolean, new_is_active boolean,
  notes text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_super_admin() then
    raise exception 'Super-admin access required' using errcode = '42501';
  end if;
  return query
    select a.id, a.target_user_id, a.actor_id, a.action,
           a.old_role, a.new_role, a.old_is_active, a.new_is_active,
           a.notes, a.created_at
    from public.listing_moderator_access_audits a
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$function$;
revoke all on function public.get_listing_moderator_access_audit(integer) from public, anon;
grant execute on function public.get_listing_moderator_access_audit(integer) to authenticated, service_role;

-- 5. Private evidence and verification RPCs.
create or replace function public.add_listing_submission_evidence(
  p_submission_id uuid,
  p_evidence_type text,
  p_evidence_url text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_evidence_type not in (
    'official_source', 'organizer_identity', 'venue_address', 'event_details',
    'coach_qualification', 'academy_identity', 'other'
  ) then
    raise exception 'Unsupported evidence type' using errcode = '22023';
  end if;
  if p_evidence_url is null or p_evidence_url !~* '^https://' then
    raise exception 'Evidence URL must use HTTPS' using errcode = '22023';
  end if;
  if p_description is null or char_length(btrim(p_description)) < 10
     or char_length(p_description) > 2000 then
    raise exception 'Evidence description must contain 10 to 2000 characters' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.listing_submissions s
    where s.id = p_submission_id and s.status in ('pending_review', 'under_review', 'approved', 'unpublished')
  ) then
    raise exception 'Submission not found or not eligible for evidence review' using errcode = 'P0002';
  end if;

  insert into public.listing_submission_evidence (
    submission_id, evidence_type, evidence_url, description, created_by
  ) values (
    p_submission_id, p_evidence_type, btrim(p_evidence_url), btrim(p_description), auth.uid()
  ) returning id into v_id;

  update public.listing_submissions
  set verification_status = 'unverified',
      verified_at = null,
      verified_by = null,
      version = version + 1,
      updated_at = clock_timestamp()
  where id = p_submission_id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, notes, metadata
  ) values (
    p_submission_id, 'evidence_added', auth.uid(), btrim(p_description),
    jsonb_build_object('evidence_id', v_id, 'evidence_type', p_evidence_type, 'evidence_url', p_evidence_url)
  );
  return v_id;
end;
$function$;
revoke all on function public.add_listing_submission_evidence(uuid, text, text, text) from public, anon;
grant execute on function public.add_listing_submission_evidence(uuid, text, text, text) to authenticated, service_role;

create or replace function public.review_listing_submission_evidence(
  p_evidence_id uuid,
  p_outcome text,
  p_reviewer_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_evidence public.listing_submission_evidence%rowtype;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_outcome not in ('supports', 'contradicts', 'insufficient') then
    raise exception 'Evidence outcome must be supports, contradicts, or insufficient' using errcode = '22023';
  end if;
  select * into v_evidence
  from public.listing_submission_evidence
  where id = p_evidence_id
  for update;
  if not found then
    raise exception 'Evidence record not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.listing_submissions s
    where s.id = v_evidence.submission_id and s.status = 'published'
  ) then
    raise exception 'Unpublish the listing before changing evidence on a published record' using errcode = '23514';
  end if;
  update public.listing_submission_evidence
  set outcome = p_outcome,
      reviewed_by = auth.uid(),
      reviewer_notes = nullif(btrim(p_reviewer_notes), ''),
      reviewed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_evidence_id;

  update public.listing_submissions
  set verification_status = 'unverified',
      verified_at = null,
      verified_by = null,
      version = version + 1,
      updated_at = clock_timestamp()
  where id = v_evidence.submission_id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, notes, metadata
  ) values (
    v_evidence.submission_id, 'evidence_reviewed', auth.uid(),
    nullif(btrim(p_reviewer_notes), ''),
    jsonb_build_object('evidence_id', p_evidence_id, 'outcome', p_outcome)
  );
end;
$function$;
revoke all on function public.review_listing_submission_evidence(uuid, text, text) from public, anon;
grant execute on function public.review_listing_submission_evidence(uuid, text, text) to authenticated, service_role;

create or replace function public.get_listing_submission_evidence(p_submission_id uuid)
returns table (
  id uuid, evidence_type text, evidence_url text, description text, outcome text,
  reviewer_notes text, reviewed_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  return query
    select e.id, e.evidence_type, e.evidence_url, e.description, e.outcome,
           e.reviewer_notes, e.reviewed_at, e.created_at
    from public.listing_submission_evidence e
    where e.submission_id = p_submission_id
    order by e.created_at desc;
end;
$function$;
revoke all on function public.get_listing_submission_evidence(uuid) from public, anon;
grant execute on function public.get_listing_submission_evidence(uuid) to authenticated, service_role;

create or replace function public.verify_listing_submission(
  p_submission_id uuid,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
  v_supporting integer;
  v_contradicting integer;
  v_pending integer;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_decision not in ('verified', 'rejected', 'unverified') then
    raise exception 'Verification decision is invalid' using errcode = '22023';
  end if;
  select * into v_sub from public.listing_submissions
  where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  select count(*) filter (where outcome = 'supports'),
         count(*) filter (where outcome = 'contradicts'),
         count(*) filter (where outcome = 'pending')
    into v_supporting, v_contradicting, v_pending
  from public.listing_submission_evidence
  where submission_id = p_submission_id;

  if v_sub.status = 'published' and p_decision <> 'verified' then
    raise exception 'Unpublish the catalogue record before changing a published listing verification decision' using errcode = '23514';
  end if;
  if p_decision = 'verified' and (v_supporting < 1 or v_contradicting > 0 or v_pending > 0) then
    raise exception 'Verification requires at least one supporting evidence item, no contradictory evidence, and no pending evidence reviews' using errcode = '23514';
  end if;
  if p_decision = 'verified' then
    if v_sub.listing_type = 'venue' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'venue_address' and outcome = 'supports'
    ) then raise exception 'Venue verification requires supporting venue-address evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'opportunity' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'official_source' and outcome = 'supports'
    ) then raise exception 'Opportunity verification requires a supporting official source' using errcode = '23514'; end if;
    if v_sub.listing_type = 'academy' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'academy_identity' and outcome = 'supports'
    ) then raise exception 'Academy verification requires supporting academy-identity evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'coach' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'coach_qualification' and outcome = 'supports'
    ) then raise exception 'Coach verification requires supporting qualification evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'event' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'event_details' and outcome = 'supports'
    ) then raise exception 'Event verification requires supporting event-details evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'pickup_game' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'venue_address' and outcome = 'supports'
    ) then raise exception 'Pickup-game verification requires supporting venue evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'pickup_game' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'organizer_identity' and outcome = 'supports'
    ) then raise exception 'Pickup-game verification requires supporting host-identity evidence' using errcode = '23514'; end if;
    if v_sub.listing_type = 'sport' and not exists (
      select 1 from public.listing_submission_evidence
      where submission_id = p_submission_id and evidence_type = 'official_source' and outcome = 'supports'
    ) then raise exception 'Sport verification requires a supporting official source' using errcode = '23514'; end if;
  end if;
  if p_decision = 'rejected' and v_contradicting < 1 then
    raise exception 'A rejected verification requires at least one reviewed contradictory evidence item' using errcode = '23514';
  end if;

  update public.listing_submissions
  set verification_status = p_decision,
      verification_notes = nullif(btrim(p_notes), ''),
      verified_at = case when p_decision = 'verified' then clock_timestamp() else null end,
      verified_by = case when p_decision = 'verified' then auth.uid() else null end,
      version = version + 1,
      updated_at = clock_timestamp()
  where id = p_submission_id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, notes, metadata
  ) values (
    p_submission_id,
    case when p_decision = 'verified' then 'verification_approved'
         when p_decision = 'rejected' then 'verification_rejected'
         else 'notes_updated' end,
    auth.uid(), nullif(btrim(p_notes), ''),
    jsonb_build_object('verification_status', p_decision, 'supporting_evidence', v_supporting, 'contradicting_evidence', v_contradicting)
  );
end;
$function$;
revoke all on function public.verify_listing_submission(uuid, text, text) from public, anon;
grant execute on function public.verify_listing_submission(uuid, text, text) to authenticated, service_role;

create or replace function public.save_listing_publication_details(
  p_submission_id uuid,
  p_structured_data jsonb,
  p_expected_version integer default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_structured_data is null or jsonb_typeof(p_structured_data) <> 'object'
     or octet_length(p_structured_data::text) > 20000 then
    raise exception 'Publication details must be a JSON object up to 20 KB' using errcode = '22023';
  end if;
  select * into v_sub from public.listing_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission version conflict' using errcode = '40001';
  end if;
  if v_sub.status not in ('under_review', 'approved', 'unpublished') then
    raise exception 'Publication details can only be edited while under review, approved, or unpublished' using errcode = '22023';
  end if;

  update public.listing_submissions
  set structured_data = p_structured_data,
      version = version + 1,
      updated_at = clock_timestamp()
  where id = p_submission_id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, notes, metadata
  ) values (
    p_submission_id, 'publication_details_updated', auth.uid(),
    'Category-specific publication details updated',
    jsonb_build_object('listing_type', v_sub.listing_type, 'keys', (select jsonb_agg(keys.key) from jsonb_object_keys(p_structured_data) as keys(key)))
  );
  return v_sub.version + 1;
end;
$function$;
revoke all on function public.save_listing_publication_details(uuid, jsonb, integer) from public, anon;
grant execute on function public.save_listing_publication_details(uuid, jsonb, integer) to authenticated, service_role;

-- 6. Read-only admin verification queue; no direct table grants.
create or replace function public.get_listing_verification_queue(
  p_status text default 'unverified',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, reference_number text, listing_type text, title text, city text,
  status text, verification_status text, version integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  return query
    select s.id, s.reference_number, s.listing_type, s.title, s.city,
           s.status, s.verification_status, s.version, s.created_at
    from public.listing_submissions s
    where (p_status is null or p_status = 'all' or s.verification_status = p_status)
    order by s.created_at asc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;
revoke all on function public.get_listing_verification_queue(text, integer, integer) from public, anon;
grant execute on function public.get_listing_verification_queue(text, integer, integer) to authenticated, service_role;

-- 6b. Require an explicit claimed review before editorial approval.
create or replace function public.start_listing_review(
  p_submission_id uuid,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  select * into v_sub from public.listing_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission version conflict' using errcode = '40001';
  end if;
  if v_sub.status not in ('pending_review', 'resubmitted', 'unpublished') then
    raise exception 'Only pending, resubmitted or unpublished submissions can be claimed for review' using errcode = '22023';
  end if;
  update public.listing_submissions
  set status = 'under_review',
      assigned_moderator_id = auth.uid(),
      review_started_at = clock_timestamp(),
      version = v_sub.version + 1,
      updated_at = clock_timestamp()
  where id = p_submission_id;
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes
  ) values (
    p_submission_id, 'start_review', auth.uid(), v_sub.status, 'under_review',
    'Moderator claimed submission for review'
  );
end;
$function$;
revoke all on function public.start_listing_review(uuid, integer) from public, anon;
grant execute on function public.start_listing_review(uuid, integer) to authenticated, service_role;

create or replace function public.approve_listing_submission(
  p_submission_id uuid,
  p_notes text default null,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  select * into v_sub from public.listing_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission version conflict' using errcode = '40001';
  end if;
  if v_sub.status <> 'under_review' then
    raise exception 'Only submissions actively under review can be approved' using errcode = '22023';
  end if;
  update public.listing_submissions
  set status = 'approved',
      reviewed_at = clock_timestamp(),
      reviewed_by = auth.uid(),
      moderator_notes = nullif(btrim(p_notes), ''),
      version = v_sub.version + 1,
      updated_at = clock_timestamp()
  where id = p_submission_id;
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes
  ) values (
    p_submission_id, 'approved', auth.uid(), 'under_review', 'approved',
    nullif(btrim(p_notes), '')
  );
  if v_sub.submitter_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      v_sub.submitter_id, 'moderation',
      'Listing Approved: ' || v_sub.title,
      'Your suggestion has been approved by our moderation desk. It is queued for publication.',
      '/track-submission?ref=' || v_sub.reference_number
    );
  end if;
end;
$function$;
revoke all on function public.approve_listing_submission(uuid, text, integer) from public, anon;
grant execute on function public.approve_listing_submission(uuid, text, integer) to authenticated, service_role;

create or replace function public.get_listing_submission_publication_details(p_submission_id uuid)
returns table (structured_data jsonb, version integer, verification_status text)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  return query
    select s.structured_data, s.version, s.verification_status
    from public.listing_submissions s
    where s.id = p_submission_id;
end;
$function$;
revoke all on function public.get_listing_submission_publication_details(uuid) from public, anon;
grant execute on function public.get_listing_submission_publication_details(uuid) to authenticated, service_role;

-- Retire the legacy one-step review RPC so clients cannot bypass claimed-review/versioned actions.
do $legacy_review_rpc$
begin
  if to_regprocedure('public.review_listing_submission(uuid,text,text)') is not null then
    revoke all on function public.review_listing_submission(uuid, text, text)
      from public, anon, authenticated;
    grant execute on function public.review_listing_submission(uuid, text, text)
      to service_role;
  end if;
end;
$legacy_review_rpc$;

-- 7. Publication function now refuses invented fallback data and only publishes after
-- a distinct evidence verification decision. Re-publication reuses the same catalogue row.
create or replace function public.publish_listing_submission(
  p_submission_id uuid,
  p_target_slug text default null,
  p_sport_id uuid default null,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
  v_data jsonb;
  v_slug text;
  v_target_id uuid;
  v_target_table text;
  v_collision_count integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_city text;
  v_address text;
  v_organizer text;
  v_venue text;
  v_host text;
  v_sport text;
  v_qualifications text;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  select * into v_sub from public.listing_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission version conflict' using errcode = '40001';
  end if;
  if v_sub.status <> 'approved' then
    raise exception 'Only approved submissions can be published' using errcode = '22023';
  end if;
  if v_sub.verification_status <> 'verified' then
    raise exception 'Evidence verification must be completed separately before publication' using errcode = '23514';
  end if;

  v_data := coalesce(v_sub.structured_data, '{}'::jsonb);
  v_city := nullif(btrim(coalesce(v_data->>'city', v_sub.city)), '');
  v_address := nullif(btrim(v_data->>'address'), '');
  v_organizer := nullif(btrim(v_data->>'organizer_name'), '');
  v_venue := nullif(btrim(v_data->>'venue_name'), '');
  v_host := nullif(btrim(v_data->>'host_name'), '');
  v_sport := nullif(btrim(v_data->>'sport'), '');
  v_qualifications := nullif(btrim(v_data->>'qualifications'), '');

  if v_city is null or lower(v_city) = 'india' then
    raise exception 'A real city is required; generic country placeholders are not publishable' using errcode = '22023';
  end if;

  if v_sub.listing_type = 'venue' then
    if v_address is null or lower(v_address) = lower(v_city) then
      raise exception 'Venue publication requires a genuine street/locality address distinct from the city' using errcode = '22023';
    end if;
    if v_sub.details is null or btrim(v_sub.details) = '' then
      raise exception 'Venue description is required' using errcode = '22023';
    end if;
  elsif v_sub.listing_type = 'opportunity' then
    if v_organizer is null then
      raise exception 'Opportunity publication requires the verified organizer name' using errcode = '22023';
    end if;
  elsif v_sub.listing_type = 'academy' then
    if v_sub.details is null or btrim(v_sub.details) = '' then
      raise exception 'Academy description is required' using errcode = '22023';
    end if;
  elsif v_sub.listing_type = 'coach' then
    if v_qualifications is null then
      raise exception 'Coach publication requires reviewed qualification details' using errcode = '22023';
    end if;
  elsif v_sub.listing_type = 'event' then
    if v_organizer is null or v_venue is null or nullif(v_data->>'starts_at', '') is null then
      raise exception 'Event publication requires organizer, venue and an actual start date/time' using errcode = '22023';
    end if;
    begin
      v_starts_at := (v_data->>'starts_at')::timestamptz;
      if nullif(v_data->>'ends_at', '') is not null then
        v_ends_at := (v_data->>'ends_at')::timestamptz;
      end if;
    exception when others then
      raise exception 'Event start/end values must be valid ISO-8601 timestamps' using errcode = '22023';
    end;
    if v_ends_at is not null and v_ends_at < v_starts_at then
      raise exception 'Event end must be after its start' using errcode = '22023';
    end if;
  elsif v_sub.listing_type = 'pickup_game' then
    if v_sport is null or v_venue is null or v_host is null or nullif(v_data->>'starts_at', '') is null then
      raise exception 'Pickup game publication requires sport, venue, host and an actual start date/time' using errcode = '22023';
    end if;
    begin
      v_starts_at := (v_data->>'starts_at')::timestamptz;
      if nullif(v_data->>'ends_at', '') is not null then
        v_ends_at := (v_data->>'ends_at')::timestamptz;
      end if;
    exception when others then
      raise exception 'Pickup game start/end values must be valid ISO-8601 timestamps' using errcode = '22023';
    end;
    if v_ends_at is not null and v_ends_at < v_starts_at then
      raise exception 'Pickup game end must be after its start' using errcode = '22023';
    end if;
  end if;

  v_slug := coalesce(nullif(btrim(p_target_slug), ''), public.generate_catalogue_slug(v_sub.title, v_sub.listing_type));

  if v_sub.published_record_id is not null and v_sub.published_table is not null then
    v_target_id := v_sub.published_record_id;
    v_target_table := v_sub.published_table;
    if v_target_table = 'opportunities' then
      update public.opportunities set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'venues' then
      update public.venues set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'academies' then
      update public.academies set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'coaches' then
      update public.coaches set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'events' then
      update public.events set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'pickup_games' then
      update public.pickup_games set publication_status = 'published', verification_status = 'verified' where id = v_target_id;
    elsif v_target_table = 'sports' then
      update public.sports set is_published = true where id = v_target_id;
    else
      raise exception 'Unsupported prior publication target' using errcode = '22023';
    end if;
  else
    if v_sub.listing_type = 'opportunity' then
      v_target_table := 'opportunities';
      v_slug := v_slug || case when exists(select 1 from public.opportunities where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.opportunities (
        slug, title, city, source_url, source_name, opportunity_type,
        sport_id, verification_status, publication_status, organizer_name, venue_name
      ) values (
        v_slug, v_sub.title, v_city, v_sub.source_url,
        nullif(btrim(v_data->>'source_name'), ''), coalesce(nullif(v_data->>'opportunity_type',''), 'trial'),
        p_sport_id, 'verified', 'published', v_organizer, v_venue
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'venue' then
      v_target_table := 'venues';
      v_slug := v_slug || case when exists(select 1 from public.venues where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.venues (
        slug, name, city, address, description, publication_status, verification_status, sport
      ) values (
        v_slug, v_sub.title, v_city, v_address, v_sub.details, 'published', 'verified',
        coalesce(nullif(v_data->>'sport',''), 'Multi-sport')
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'academy' then
      v_target_table := 'academies';
      v_slug := v_slug || case when exists(select 1 from public.academies where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.academies (
        slug, name, city, state, description, website_url, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, v_city, nullif(v_data->>'state',''), v_sub.details,
        v_sub.source_url, 'published', 'verified'
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'coach' then
      v_target_table := 'coaches';
      v_slug := v_slug || case when exists(select 1 from public.coaches where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.coaches (
        slug, display_name, city, state, bio, website_url, qualifications, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, v_city, nullif(v_data->>'state',''), v_sub.details,
        v_sub.source_url, v_qualifications, 'published', 'verified'
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'event' then
      v_target_table := 'events';
      v_slug := v_slug || case when exists(select 1 from public.events where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.events (
        slug, title, city, event_type, organizer_name, venue_name, starts_at, ends_at,
        source_url, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, v_city, coalesce(nullif(v_data->>'event_type',''), 'tournament'),
        v_organizer, v_venue, v_starts_at, v_ends_at,
        v_sub.source_url, 'published', 'verified'
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'pickup_game' then
      v_target_table := 'pickup_games';
      v_slug := v_slug || case when exists(select 1 from public.pickup_games where slug = v_slug) then '-' || substr(md5(v_sub.id::text),1,6) else '' end;
      insert into public.pickup_games (
        slug, sport, venue_name, city, time_label, host_name, starts_at, ends_at, publication_status, verification_status
      ) values (
        v_slug, v_sport, v_venue, v_city,
        to_char(v_starts_at at time zone 'Asia/Kolkata', 'Dy DD Mon HH24:MI'),
        v_host, v_starts_at, v_ends_at, 'published', 'verified'
      ) returning id into v_target_id;
    elsif v_sub.listing_type = 'sport' then
      v_target_table := 'sports';
      if exists(select 1 from public.sports where slug = v_slug) then
        raise exception 'Sport slug already exists; choose a unique slug' using errcode = '23505';
      end if;
      insert into public.sports (slug, name, is_published)
      values (v_slug, v_sub.title, true) returning id into v_target_id;
    else
      raise exception 'Unsupported listing type for publication: %', v_sub.listing_type using errcode = '22023';
    end if;
  end if;

  update public.listing_submissions
  set status = 'published',
      published_at = clock_timestamp(),
      published_by = auth.uid(),
      published_record_id = v_target_id,
      published_table = v_target_table,
      version = v_sub.version + 1,
      updated_at = clock_timestamp()
  where id = v_sub.id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'published', auth.uid(), v_sub.status, 'published',
    'Published after separate evidence verification',
    jsonb_build_object('target_table', v_target_table, 'target_id', v_target_id, 'slug', v_slug)
  );

  return jsonb_build_object(
    'success', true, 'published_record_id', v_target_id,
    'published_table', v_target_table, 'slug', v_slug,
    'verification_status', v_sub.verification_status
  );
end;
$function$;
revoke all on function public.publish_listing_submission(uuid, text, uuid, integer) from public, anon;
grant execute on function public.publish_listing_submission(uuid, text, uuid, integer) to authenticated, service_role;

commit;
