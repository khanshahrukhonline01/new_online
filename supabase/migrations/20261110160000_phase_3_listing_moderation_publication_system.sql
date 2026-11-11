-- KhelGrid Phase 3: Complete Listing Moderation & Publication System v1.0
-- Implements robust listing lifecycle:
-- pending_review -> under_review -> approved / rejected / changes_requested
-- changes_requested -> resubmitted -> under_review
-- approved -> published (separate explicit authorized action)
-- published -> unpublished (with recorded reason)
-- Submitter tracking, audit trail, concurrency protection, and zero-PII leakage.

begin;

-- 1. Helper function for safe, clean slugs
create or replace function public.generate_catalogue_slug(p_title text, p_prefix text default null)
returns text
language plpgsql
immutable
as $function$
declare
  v_clean text;
begin
  v_clean := lower(regexp_replace(coalesce(p_title, ''), '[^a-zA-Z0-9\s-]', '', 'g'));
  v_clean := trim(both '-' from regexp_replace(v_clean, '[\s_-]+', '-', 'g'));
  if v_clean is null or char_length(v_clean) = 0 then
    v_clean := coalesce(p_prefix, 'item') || '-' || substr(md5(gen_random_uuid()::text), 1, 8);
  end if;
  return v_clean;
end;
$function$;
revoke all on function public.generate_catalogue_slug(text, text) from public, anon;
grant execute on function public.generate_catalogue_slug(text, text) to authenticated, service_role;

-- 2. Extend listing_submissions table columns and constraints
alter table public.listing_submissions
  add column if not exists reference_number text,
  add column if not exists tracking_key text,
  add column if not exists submitter_id uuid references auth.users(id) on delete set null,
  add column if not exists submitter_email text,
  add column if not exists rejection_reason text,
  add column if not exists correction_request text,
  add column if not exists unpublish_reason text,
  add column if not exists assigned_moderator_id uuid references auth.users(id) on delete set null,
  add column if not exists review_started_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists unpublished_at timestamptz,
  add column if not exists unpublished_by uuid references auth.users(id) on delete set null,
  add column if not exists published_record_id uuid,
  add column if not exists published_table text,
  add column if not exists version integer not null default 1;

-- 2b. Ensure destination catalogue tables support moderation publication lifecycle
alter table public.venues
  add column if not exists address text,
  add column if not exists description text,
  add column if not exists publication_status text not null default 'draft';

alter table public.venues alter column sport drop not null;
alter table public.venues alter column sport set default 'Multi-sport';

alter table public.venues enable row level security;
drop policy if exists venues_read_published on public.venues;
create policy venues_read_published on public.venues
  for select to anon, authenticated using (publication_status = 'published');

alter table public.opportunities
  add column if not exists city text,
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists opportunity_type text default 'trial',
  add column if not exists sport_id uuid,
  add column if not exists verification_status text default 'unverified',
  add column if not exists publication_status text not null default 'draft',
  add column if not exists organizer_name text,
  add column if not exists venue_name text;

alter table public.opportunities enable row level security;
drop policy if exists opportunities_read_published on public.opportunities;
create policy opportunities_read_published on public.opportunities
  for select to anon, authenticated using (publication_status = 'published');

alter table public.academies
  add column if not exists city text default 'India',
  add column if not exists state text,
  add column if not exists description text,
  add column if not exists website_url text,
  add column if not exists publication_status text not null default 'draft',
  add column if not exists verification_status text not null default 'unverified';

alter table public.academies enable row level security;
drop policy if exists academies_read_published on public.academies;
create policy academies_read_published on public.academies
  for select to anon, authenticated using (publication_status = 'published');

alter table public.coaches
  add column if not exists state text,
  add column if not exists bio text,
  add column if not exists website_url text,
  add column if not exists verification_status text not null default 'unverified';

alter table public.events
  add column if not exists city text,
  add column if not exists event_type text default 'tournament',
  add column if not exists starts_at timestamptz default (now() + interval '14 days'),
  add column if not exists source_url text,
  add column if not exists verification_status text not null default 'unverified';

alter table public.pickup_games
  add column if not exists venue_name text,
  add column if not exists city text default 'India',
  add column if not exists time_label text default 'Weekend Morning',
  add column if not exists host_name text default 'KhelGrid Host',
  add column if not exists publication_status text not null default 'draft';

-- Backfill reference numbers and tracking keys for any existing rows
update public.listing_submissions
set reference_number = coalesce(reference_number, 'KHL-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(md5(id::text), 1, 6))),
    tracking_key = coalesce(tracking_key, md5(id::text || created_at::text))
where reference_number is null or tracking_key is null;

alter table public.listing_submissions
  alter column reference_number set not null,
  alter column tracking_key set not null;

-- Ensure unique constraints
alter table public.listing_submissions
  drop constraint if exists listing_submissions_reference_number_key,
  add constraint listing_submissions_reference_number_key unique (reference_number);

alter table public.listing_submissions
  drop constraint if exists listing_submissions_tracking_key_key,
  add constraint listing_submissions_tracking_key_key unique (tracking_key);

-- Drop previous status check and review constraints to enable full lifecycle
alter table public.listing_submissions
  drop constraint if exists listing_submissions_status_check,
  drop constraint if exists listing_submissions_check;

alter table public.listing_submissions
  add constraint listing_submissions_status_check
  check (status in ('pending_review', 'under_review', 'approved', 'rejected', 'changes_requested', 'resubmitted', 'published', 'unpublished'));

alter table public.listing_submissions
  add constraint listing_submissions_published_table_check
  check (published_table is null or published_table in ('opportunities', 'venues', 'academies', 'coaches', 'events', 'pickup_games', 'sports'));

-- Automatic assignment of defaults on INSERT
create or replace function public.assign_listing_submission_defaults()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.reference_number is null or btrim(new.reference_number) = '' then
    new.reference_number := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  end if;
  if new.tracking_key is null or btrim(new.tracking_key) = '' then
    new.tracking_key := md5(gen_random_uuid()::text || clock_timestamp()::text);
  end if;
  if new.version is null or new.version < 1 then
    new.version := 1;
  end if;
  if new.status is null then
    new.status := 'pending_review';
  end if;
  return new;
end;
$function$;

drop trigger if exists listing_submissions_assign_defaults on public.listing_submissions;
create trigger listing_submissions_assign_defaults
  before insert on public.listing_submissions
  for each row execute function public.assign_listing_submission_defaults();

-- 3. Audit table for complete moderator actions and submission history
create table if not exists public.listing_submission_audits (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.listing_submissions(id) on delete cascade,
  action text not null check (action in ('submitted', 'start_review', 'approved', 'rejected', 'changes_requested', 'resubmitted', 'published', 'unpublished', 'moderator_assigned', 'notes_updated')),
  actor_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text,
  notes text check (notes is null or char_length(notes) <= 2000),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_submission_audits_sub
  on public.listing_submission_audits(submission_id, created_at desc);

alter table public.listing_submission_audits enable row level security;
revoke all on public.listing_submission_audits from public, anon, authenticated;
grant select on public.listing_submission_audits to authenticated;
grant all on public.listing_submission_audits to service_role;

drop policy if exists listing_submission_audits_moderator_read on public.listing_submission_audits;
create policy listing_submission_audits_moderator_read
  on public.listing_submission_audits for select to authenticated
  using ((select public.is_listing_moderator()));

-- 4. Version history table for resubmissions
create table if not exists public.listing_submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.listing_submissions(id) on delete cascade,
  version integer not null,
  listing_type text not null,
  title text not null,
  city text,
  source_url text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_submission_versions_sub
  on public.listing_submission_versions(submission_id, version desc);

alter table public.listing_submission_versions enable row level security;
revoke all on public.listing_submission_versions from public, anon, authenticated;
grant select on public.listing_submission_versions to authenticated;
grant all on public.listing_submission_versions to service_role;

drop policy if exists listing_submission_versions_moderator_read on public.listing_submission_versions;
create policy listing_submission_versions_moderator_read
  on public.listing_submission_versions for select to authenticated
  using ((select public.is_listing_moderator()));

-- 5. Extend user_notifications category if needed
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_notifications'
  ) then
    alter table public.user_notifications
      drop constraint if exists user_notifications_category_check;
    alter table public.user_notifications
      add constraint user_notifications_category_check
      check (category in ('system', 'opportunity', 'pickup_game', 'booking', 'verification', 'message', 'moderation'));
  end if;
end;
$$;

-- 6. Trigger to log initial submission creation
create or replace function public.log_listing_submission_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    new.id, 'submitted', new.submitter_id, null, new.status, 'Initial submission created',
    jsonb_build_object(
      'reference_number', new.reference_number,
      'listing_type', new.listing_type,
      'title', new.title
    )
  );
  return new;
end;
$function$;

drop trigger if exists listing_submissions_log_created on public.listing_submissions;
create trigger listing_submissions_log_created
  after insert on public.listing_submissions
  for each row execute function public.log_listing_submission_created();

-- 7. Hardened transition enforcement trigger
create or replace function public.enforce_listing_moderation_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  -- If status is changing, enforce valid state transitions
  if old.status <> new.status then
    -- Allowed transitions:
    -- pending_review -> under_review, approved, rejected, changes_requested
    -- under_review -> pending_review, approved, rejected, changes_requested
    -- changes_requested -> resubmitted
    -- resubmitted -> under_review, approved, rejected, changes_requested
    -- approved -> published, rejected
    -- published -> unpublished
    -- unpublished -> under_review, approved, published
    if old.status = 'pending_review' and new.status not in ('under_review', 'approved', 'rejected', 'changes_requested') then
      raise exception 'Invalid transition from pending_review to %', new.status using errcode = '22023';
    elsif old.status = 'under_review' and new.status not in ('pending_review', 'approved', 'rejected', 'changes_requested') then
      raise exception 'Invalid transition from under_review to %', new.status using errcode = '22023';
    elsif old.status = 'changes_requested' and new.status not in ('resubmitted') then
      raise exception 'Invalid transition from changes_requested to %', new.status using errcode = '22023';
    elsif old.status = 'resubmitted' and new.status not in ('under_review', 'approved', 'rejected', 'changes_requested') then
      raise exception 'Invalid transition from resubmitted to %', new.status using errcode = '22023';
    elsif old.status = 'approved' and new.status not in ('published', 'rejected') then
      raise exception 'Invalid transition from approved to %', new.status using errcode = '22023';
    elsif old.status = 'published' and new.status not in ('unpublished') then
      raise exception 'Invalid transition from published to %', new.status using errcode = '22023';
    elsif old.status = 'unpublished' and new.status not in ('under_review', 'approved', 'published') then
      raise exception 'Invalid transition from unpublished to %', new.status using errcode = '22023';
    end if;

    -- Mandatory review metadata checks:
    if new.status in ('approved', 'rejected', 'changes_requested') then
      if new.reviewed_at is null then
        new.reviewed_at := now();
      end if;
      if new.reviewed_by is null and auth.uid() is not null then
        new.reviewed_by := auth.uid();
      end if;
    end if;

    if new.status = 'rejected' and coalesce(btrim(new.rejection_reason), btrim(new.moderator_notes)) is null then
      raise exception 'Rejection requires an explanation' using errcode = '22023';
    end if;

    if new.status = 'changes_requested' and (new.correction_request is null or char_length(btrim(new.correction_request)) < 10) then
      raise exception 'Requesting corrections requires a clear message (at least 10 characters)' using errcode = '22023';
    end if;

    if new.status = 'unpublished' and coalesce(btrim(new.unpublish_reason), btrim(new.moderator_notes)) is null then
      raise exception 'Unpublishing requires a reason' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists listing_submissions_enforce_moderation_transition on public.listing_submissions;
create trigger listing_submissions_enforce_moderation_transition
  before update on public.listing_submissions
  for each row execute function public.enforce_listing_moderation_transition();

-- 8. RLS and Grants on listing_submissions
drop policy if exists listing_submissions_moderator_update on public.listing_submissions;
create policy listing_submissions_moderator_update
  on public.listing_submissions for update to authenticated
  using ((select public.is_listing_moderator()))
  with check ((select public.is_listing_moderator()));

grant update (
  status, moderator_notes, reviewed_at, reviewed_by,
  rejection_reason, correction_request, unpublish_reason,
  assigned_moderator_id, review_started_at,
  published_at, published_by, unpublished_at, unpublished_by,
  published_record_id, published_table, version
) on public.listing_submissions to authenticated;

-- 9. Submitter Status Tracking RPC (Public Safe)
create or replace function public.get_submission_tracking_status(
  p_reference_number text,
  p_tracking_key text default null
)
returns table (
  id uuid,
  reference_number text,
  listing_type text,
  title text,
  city text,
  source_url text,
  details text,
  status text,
  rejection_reason text,
  correction_request text,
  created_at timestamptz,
  updated_at timestamptz,
  version integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_reference_number is null or btrim(p_reference_number) = '' then
    raise exception 'Reference number is required' using errcode = '22023';
  end if;

  return query
    select s.id, s.reference_number, s.listing_type, s.title, s.city, s.source_url, s.details,
           s.status, s.rejection_reason, s.correction_request, s.created_at, s.updated_at, s.version
    from public.listing_submissions s
    where s.reference_number = btrim(p_reference_number)
      and (
        (p_tracking_key is not null and btrim(p_tracking_key) <> '' and s.tracking_key = btrim(p_tracking_key))
        or (
          (p_tracking_key is null or btrim(p_tracking_key) = '')
          and auth.uid() is not null
          and (s.submitter_id = auth.uid() or public.is_listing_moderator())
        )
      );
end;
$function$;
revoke all on function public.get_submission_tracking_status(text, text) from public;
grant execute on function public.get_submission_tracking_status(text, text) to anon, authenticated, service_role;

-- 10. Submitter Resubmission RPC (Public Safe)
create or replace function public.resubmit_listing_submission(
  p_reference_number text,
  p_tracking_key text,
  p_title text,
  p_city text default null,
  p_source_url text default null,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sub public.listing_submissions%rowtype;
begin
  if p_reference_number is null or p_tracking_key is null then
    raise exception 'Reference number and tracking key are required' using errcode = '22023';
  end if;
  if p_title is null or char_length(btrim(p_title)) < 2 then
    raise exception 'Listing title must be at least 2 characters' using errcode = '22023';
  end if;
  if p_source_url is not null and p_source_url !~* '^https://' then
    raise exception 'Source URL must start with https://' using errcode = '22023';
  end if;

  select * into v_sub
  from public.listing_submissions
  where reference_number = btrim(p_reference_number)
    and tracking_key = btrim(p_tracking_key)
  for update;

  if not found then
    raise exception 'Submission not found or invalid tracking credentials' using errcode = 'P0002';
  end if;

  if v_sub.status <> 'changes_requested' then
    raise exception 'Only submissions with requested corrections can be resubmitted' using errcode = '22023';
  end if;

  -- 1. Archive current version
  insert into public.listing_submission_versions (
    submission_id, version, listing_type, title, city, source_url, details
  ) values (
    v_sub.id, v_sub.version, v_sub.listing_type, v_sub.title, v_sub.city, v_sub.source_url, v_sub.details
  );

  -- 2. Update to resubmitted
  update public.listing_submissions
  set title = btrim(p_title),
      city = nullif(btrim(p_city), ''),
      source_url = nullif(btrim(p_source_url), ''),
      details = nullif(btrim(p_details), ''),
      status = 'resubmitted',
      version = v_sub.version + 1,
      reviewed_at = null,
      reviewed_by = null,
      correction_request = null,
      updated_at = now()
  where id = v_sub.id;

  -- 3. Audit trail
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'resubmitted', v_sub.submitter_id, 'changes_requested', 'resubmitted',
    'Submitter updated requested fields and resubmitted',
    jsonb_build_object('new_version', v_sub.version + 1)
  );

  return jsonb_build_object(
    'success', true,
    'reference_number', v_sub.reference_number,
    'version', v_sub.version + 1,
    'status', 'resubmitted'
  );
end;
$function$;
revoke all on function public.resubmit_listing_submission(text, text, text, text, text, text) from public;
grant execute on function public.resubmit_listing_submission(text, text, text, text, text, text) to anon, authenticated, service_role;

-- 11. Enhanced Moderator Queue Fetch RPC
create or replace function public.get_listing_submissions_v2(
  p_status text default null,
  p_listing_type text default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0,
  p_sort_by text default 'created_at',
  p_sort_dir text default 'desc'
)
returns table (
  id uuid,
  reference_number text,
  listing_type text,
  title text,
  city text,
  source_url text,
  details text,
  status text,
  rejection_reason text,
  correction_request text,
  unpublish_reason text,
  moderator_notes text,
  assigned_moderator_id uuid,
  review_started_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  published_at timestamptz,
  published_by uuid,
  unpublished_at timestamptz,
  unpublished_by uuid,
  published_record_id uuid,
  published_table text,
  version integer,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_count bigint;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.listing_submissions s
  where (p_status is null or p_status = 'all' or s.status = p_status)
    and (p_listing_type is null or p_listing_type = 'all' or s.listing_type = p_listing_type)
    and (
      p_search is null or btrim(p_search) = ''
      or s.title ilike '%' || btrim(p_search) || '%'
      or s.city ilike '%' || btrim(p_search) || '%'
      or s.reference_number ilike '%' || btrim(p_search) || '%'
    );

  return query
    select s.id, s.reference_number, s.listing_type, s.title, s.city, s.source_url, s.details,
           s.status, s.rejection_reason, s.correction_request, s.unpublish_reason, s.moderator_notes,
           s.assigned_moderator_id, s.review_started_at, s.reviewed_at, s.reviewed_by,
           s.published_at, s.published_by, s.unpublished_at, s.unpublished_by,
           s.published_record_id, s.published_table, s.version, s.created_at, s.updated_at,
           v_count as total_count
    from public.listing_submissions s
    where (p_status is null or p_status = 'all' or s.status = p_status)
      and (p_listing_type is null or p_listing_type = 'all' or s.listing_type = p_listing_type)
      and (
        p_search is null or btrim(p_search) = ''
        or s.title ilike '%' || btrim(p_search) || '%'
        or s.city ilike '%' || btrim(p_search) || '%'
        or s.reference_number ilike '%' || btrim(p_search) || '%'
      )
    order by
      case when p_sort_by = 'created_at' and p_sort_dir = 'asc' then s.created_at end asc,
      case when p_sort_by = 'created_at' and p_sort_dir = 'desc' then s.created_at end desc,
      case when p_sort_by = 'updated_at' and p_sort_dir = 'asc' then s.updated_at end asc,
      case when p_sort_by = 'updated_at' and p_sort_dir = 'desc' then s.updated_at end desc,
      s.created_at desc
    limit coalesce(nullif(p_limit, 0), 50)
    offset coalesce(p_offset, 0);
end;
$function$;
revoke all on function public.get_listing_submissions_v2(text, text, text, integer, integer, text, text) from public, anon;
grant execute on function public.get_listing_submissions_v2(text, text, text, integer, integer, text, text) to authenticated, service_role;

-- 12. Moderator Action: Start Review
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
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status not in ('pending_review', 'resubmitted') then
    raise exception 'Review can only be started on pending or resubmitted items' using errcode = '22023';
  end if;

  update public.listing_submissions
  set status = 'under_review',
      assigned_moderator_id = auth.uid(),
      review_started_at = now(),
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes
  ) values (
    v_sub.id, 'start_review', auth.uid(), v_sub.status, 'under_review', 'Moderator started review'
  );
end;
$function$;
revoke all on function public.start_listing_review(uuid, integer) from public, anon;
grant execute on function public.start_listing_review(uuid, integer) to authenticated, service_role;

-- 13. Moderator Action: Approve (Editorial Decision, NOT Publication)
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
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status not in ('pending_review', 'under_review', 'resubmitted', 'unpublished') then
    raise exception 'Only pending, under review, resubmitted, or unpublished items may be approved' using errcode = '22023';
  end if;

  update public.listing_submissions
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      moderator_notes = nullif(btrim(p_notes), ''),
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes
  ) values (
    v_sub.id, 'approved', auth.uid(), v_sub.status, 'approved', nullif(btrim(p_notes), '')
  );

  -- Send notification if submitter is registered user
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

-- 14. Moderator Action: Reject
create or replace function public.reject_listing_submission(
  p_submission_id uuid,
  p_reason text,
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
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Rejection reason must be at least 3 characters' using errcode = '22023';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status in ('published') then
    raise exception 'Published listings must be unpublished before rejection' using errcode = '22023';
  end if;

  update public.listing_submissions
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = btrim(p_reason),
      moderator_notes = nullif(btrim(p_notes), ''),
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'rejected', auth.uid(), v_sub.status, 'rejected', nullif(btrim(p_notes), ''),
    jsonb_build_object('reason', btrim(p_reason))
  );

  if v_sub.submitter_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      v_sub.submitter_id, 'moderation',
      'Listing Update: ' || v_sub.title,
      'Your suggestion could not be accepted. Reason: ' || btrim(p_reason),
      '/track-submission?ref=' || v_sub.reference_number
    );
  end if;
end;
$function$;
revoke all on function public.reject_listing_submission(uuid, text, text, integer) from public, anon;
grant execute on function public.reject_listing_submission(uuid, text, text, integer) to authenticated, service_role;

-- 15. Moderator Action: Request Corrections
create or replace function public.request_listing_corrections(
  p_submission_id uuid,
  p_message text,
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
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  if p_message is null or char_length(btrim(p_message)) < 10 then
    raise exception 'Correction message must be at least 10 characters' using errcode = '22023';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status not in ('pending_review', 'under_review', 'resubmitted') then
    raise exception 'Corrections can only be requested on pending, under review, or resubmitted items' using errcode = '22023';
  end if;

  update public.listing_submissions
  set status = 'changes_requested',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      correction_request = btrim(p_message),
      moderator_notes = nullif(btrim(p_notes), ''),
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'changes_requested', auth.uid(), v_sub.status, 'changes_requested', nullif(btrim(p_notes), ''),
    jsonb_build_object('correction_request', btrim(p_message))
  );

  if v_sub.submitter_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      v_sub.submitter_id, 'moderation',
      'Action Required on Listing: ' || v_sub.title,
      'A moderator requested corrections: ' || btrim(p_message),
      '/track-submission?ref=' || v_sub.reference_number
    );
  end if;
end;
$function$;
revoke all on function public.request_listing_corrections(uuid, text, text, integer) from public, anon;
grant execute on function public.request_listing_corrections(uuid, text, text, integer) to authenticated, service_role;

-- 16. Moderator Action: Explicit Publication to Public Catalogue
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
  v_slug text;
  v_target_id uuid;
  v_target_table text;
  v_collision_count integer;
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status = 'published' then
    raise exception 'Submission is already published' using errcode = '22023';
  end if;

  if v_sub.status <> 'approved' then
    raise exception 'Only approved submissions can be published to the public catalogue' using errcode = '22023';
  end if;

  -- Generate clean slug
  v_slug := coalesce(nullif(btrim(p_target_slug), ''), public.generate_catalogue_slug(v_sub.title, v_sub.listing_type));

  -- If previous publication record exists (e.g. re-publishing after unpublishing)
  if v_sub.published_record_id is not null and v_sub.published_table is not null then
    v_target_id := v_sub.published_record_id;
    v_target_table := v_sub.published_table;

    -- Reactivate published status on existing row
    if v_target_table = 'opportunities' then
      update public.opportunities set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'venues' then
      update public.venues set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'academies' then
      update public.academies set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'coaches' then
      update public.coaches set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'events' then
      update public.events set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'pickup_games' then
      update public.pickup_games set publication_status = 'published' where id = v_target_id;
    elsif v_target_table = 'sports' then
      update public.sports set is_published = true where id = v_target_id;
    end if;

  else
    -- Category-specific destination insert with verified publication status
    if v_sub.listing_type = 'opportunity' then
      v_target_table := 'opportunities';
      select count(*) into v_collision_count from public.opportunities where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.opportunities (
        slug, title, city, source_url, source_name, opportunity_type,
        sport_id, verification_status, publication_status, organizer_name, venue_name
      ) values (
        v_slug, v_sub.title, v_sub.city, v_sub.source_url, 'Community Submission', 'trial',
        p_sport_id, 'verified', 'published', coalesce(v_sub.city, 'KhelGrid Community'), v_sub.title
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'venue' then
      v_target_table := 'venues';
      select count(*) into v_collision_count from public.venues where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.venues (
        slug, name, city, address, description, publication_status, sport
      ) values (
        v_slug, v_sub.title, coalesce(v_sub.city, 'India'), coalesce(v_sub.city, 'India'), coalesce(v_sub.details, v_sub.title), 'published', 'Multi-sport'
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'academy' then
      v_target_table := 'academies';
      select count(*) into v_collision_count from public.academies where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.academies (
        slug, name, city, state, description, website_url, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, coalesce(v_sub.city, 'India'), null, coalesce(v_sub.details, v_sub.title), v_sub.source_url, 'published', 'verified'
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'coach' then
      v_target_table := 'coaches';
      select count(*) into v_collision_count from public.coaches where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.coaches (
        slug, display_name, city, state, bio, website_url, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, coalesce(v_sub.city, 'India'), null, coalesce(v_sub.details, v_sub.title), v_sub.source_url, 'published', 'verified'
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'event' then
      v_target_table := 'events';
      select count(*) into v_collision_count from public.events where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.events (
        slug, title, city, event_type, starts_at, source_url, publication_status, verification_status
      ) values (
        v_slug, v_sub.title, v_sub.city, 'tournament', now() + interval '14 days', v_sub.source_url, 'published', 'verified'
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'pickup_game' then
      v_target_table := 'pickup_games';
      select count(*) into v_collision_count from public.pickup_games where slug = v_slug;
      if v_collision_count > 0 then
        v_slug := v_slug || '-' || substr(md5(v_sub.id::text), 1, 4);
      end if;

      insert into public.pickup_games (
        slug, sport, venue_name, city, time_label, host_name, publication_status
      ) values (
        v_slug, 'Sports', v_sub.title, coalesce(v_sub.city, 'India'), 'Weekend Morning', 'KhelGrid Host', 'published'
      ) returning id into v_target_id;

    elsif v_sub.listing_type = 'sport' then
      v_target_table := 'sports';
      insert into public.sports (
        slug, name, is_published
      ) values (
        v_slug, v_sub.title, true
      ) on conflict (slug) do update set is_published = true
      returning id into v_target_id;

    else
      raise exception 'Unsupported listing type for publication: %', v_sub.listing_type using errcode = '22023';
    end if;
  end if;

  -- Update submission status to published
  update public.listing_submissions
  set status = 'published',
      published_at = now(),
      published_by = auth.uid(),
      published_record_id = v_target_id,
      published_table = v_target_table,
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  -- Record audit event
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'published', auth.uid(), v_sub.status, 'published', 'Published to live catalogue',
    jsonb_build_object(
      'target_table', v_target_table,
      'target_id', v_target_id,
      'slug', v_slug
    )
  );

  if v_sub.submitter_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      v_sub.submitter_id, 'moderation',
      'Listing Published! ' || v_sub.title,
      'Your sports listing is now published and live on KhelGrid.',
      '/' || v_target_table || '/' || v_slug
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'published_record_id', v_target_id,
    'published_table', v_target_table,
    'slug', v_slug
  );
end;
$function$;
revoke all on function public.publish_listing_submission(uuid, text, uuid, integer) from public, anon;
grant execute on function public.publish_listing_submission(uuid, text, uuid, integer) to authenticated, service_role;

-- 17. Moderator Action: Unpublish
create or replace function public.unpublish_listing_submission(
  p_submission_id uuid,
  p_reason text,
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
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Unpublishing requires a reason (min 3 characters)' using errcode = '22023';
  end if;

  select * into v_sub
  from public.listing_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if p_expected_version is not null and v_sub.version <> p_expected_version then
    raise exception 'Submission modified by another moderator (expected v%, found v%)', p_expected_version, v_sub.version using errcode = '40001';
  end if;

  if v_sub.status <> 'published' then
    raise exception 'Only published submissions can be unpublished' using errcode = '22023';
  end if;

  -- Take the record out of the public catalogue
  if v_sub.published_record_id is not null and v_sub.published_table is not null then
    if v_sub.published_table = 'opportunities' then
      update public.opportunities set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'venues' then
      update public.venues set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'academies' then
      update public.academies set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'coaches' then
      update public.coaches set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'events' then
      update public.events set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'pickup_games' then
      update public.pickup_games set publication_status = 'draft' where id = v_sub.published_record_id;
    elsif v_sub.published_table = 'sports' then
      update public.sports set is_published = false where id = v_sub.published_record_id;
    end if;
  end if;

  -- Update submission
  update public.listing_submissions
  set status = 'unpublished',
      unpublished_at = now(),
      unpublished_by = auth.uid(),
      unpublish_reason = btrim(p_reason),
      moderator_notes = nullif(btrim(p_notes), ''),
      version = v_sub.version + 1,
      updated_at = now()
  where id = v_sub.id;

  -- Audit event
  insert into public.listing_submission_audits (
    submission_id, action, actor_id, from_status, to_status, notes, metadata
  ) values (
    v_sub.id, 'unpublished', auth.uid(), 'published', 'unpublished', nullif(btrim(p_notes), ''),
    jsonb_build_object('reason', btrim(p_reason))
  );

  if v_sub.submitter_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      v_sub.submitter_id, 'moderation',
      'Listing Unpublished: ' || v_sub.title,
      'Your sports listing was unpublished. Reason: ' || btrim(p_reason),
      '/track-submission?ref=' || v_sub.reference_number
    );
  end if;
end;
$function$;
revoke all on function public.unpublish_listing_submission(uuid, text, text, integer) from public, anon;
grant execute on function public.unpublish_listing_submission(uuid, text, text, integer) to authenticated, service_role;

-- 18. Audit Trail Retrieval RPC (Moderators only)
create or replace function public.get_listing_submission_audit_trail(p_submission_id uuid)
returns table (
  id uuid,
  action text,
  actor_id uuid,
  from_status text,
  to_status text,
  notes text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  return query
    select a.id, a.action, a.actor_id, a.from_status, a.to_status, a.notes, a.metadata, a.created_at
    from public.listing_submission_audits a
    where a.submission_id = p_submission_id
    order by a.created_at desc;
end;
$function$;
revoke all on function public.get_listing_submission_audit_trail(uuid) from public, anon;
grant execute on function public.get_listing_submission_audit_trail(uuid) to authenticated, service_role;

-- 19. Version History Retrieval RPC (Moderators only)
create or replace function public.get_listing_submission_versions(p_submission_id uuid)
returns table (
  id uuid,
  version integer,
  listing_type text,
  title text,
  city text,
  source_url text,
  details text,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  return query
    select v.id, v.version, v.listing_type, v.title, v.city, v.source_url, v.details, v.created_at
    from public.listing_submission_versions v
    where v.submission_id = p_submission_id
    order by v.version desc;
end;
$function$;
revoke all on function public.get_listing_submission_versions(uuid) from public, anon;
grant execute on function public.get_listing_submission_versions(uuid) to authenticated, service_role;

-- 20. Submitter Public Intake RPC (returns reference number and tracking key)
create or replace function public.submit_listing_intake(
  p_listing_type text,
  p_title text,
  p_city text default null,
  p_source_url text default null,
  p_details text default null,
  p_submitter_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_ref text;
  v_key text;
  v_id uuid;
begin
  if p_title is null or char_length(btrim(p_title)) < 2 then
    raise exception 'Listing title must contain at least 2 characters' using errcode = '22023';
  end if;
  if p_listing_type not in ('opportunity', 'venue', 'coach', 'academy', 'event', 'pickup_game', 'sport') then
    raise exception 'Unsupported listing type: %', p_listing_type using errcode = '22023';
  end if;
  if p_source_url is not null and btrim(p_source_url) <> '' and p_source_url !~* '^https://' then
    raise exception 'Source URL must start with https://' using errcode = '22023';
  end if;

  v_ref := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  v_key := md5(gen_random_uuid()::text || clock_timestamp()::text);

  insert into public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email, status
  ) values (
    p_listing_type, btrim(p_title), nullif(btrim(p_city), ''), nullif(btrim(p_source_url), ''),
    nullif(btrim(p_details), ''), v_ref, v_key, auth.uid(), nullif(btrim(p_submitter_email), ''),
    'pending_review'
  ) returning id into v_id;

  return jsonb_build_object(
    'status', 'submitted',
    'id', v_id,
    'reference_number', v_ref,
    'tracking_key', v_key
  );
end;
$function$;
revoke all on function public.submit_listing_intake(text, text, text, text, text, text) from public;
grant execute on function public.submit_listing_intake(text, text, text, text, text, text) to anon, authenticated, service_role;

-- Public clients must use the validated SECURITY DEFINER intake RPC.
-- The earlier catalogue foundation granted column-level INSERT for a temporary
-- intake path; revoke both table-level and column-level INSERT after Phase 3.
revoke insert on public.listing_submissions from public, anon, authenticated;
revoke insert (listing_type, title, city, source_url, details)
  on public.listing_submissions from public, anon, authenticated;

commit;
