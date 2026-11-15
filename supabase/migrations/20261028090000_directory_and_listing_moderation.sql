-- KhelGrid: additive directory and listing moderation foundation.
-- Apply only to the intended independent Supabase project after backup/review.
-- Does not alter existing catalogue tables or enable public writes.

begin;

create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text check (description is null or char_length(description) <= 5000),
  city text not null check (char_length(trim(city)) between 1 and 120),
  state text check (state is null or char_length(state) <= 120),
  website_url text check (website_url is null or website_url ~ '^https?://'),
  public_contact_url text check (public_contact_url is null or public_contact_url ~ '^https?://'),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 140),
  bio text check (bio is null or char_length(bio) <= 5000),
  city text not null check (char_length(trim(city)) between 1 and 120),
  state text check (state is null or char_length(state) <= 120),
  website_url text check (website_url is null or website_url ~ '^https?://'),
  public_contact_url text check (public_contact_url is null or public_contact_url ~ '^https?://'),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 2 and 200),
  sport_id uuid references public.sports(id) on delete restrict,
  event_type text not null default 'tournament'
    check (event_type in ('tournament', 'camp', 'league', 'workshop', 'meetup', 'other')),
  organizer_name text,
  city text,
  venue_id uuid references public.venues(id) on delete set null,
  venue_name text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  source_name text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.academy_sports (
  academy_id uuid not null references public.academies(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (academy_id, sport_id)
);

create table if not exists public.coach_sports (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (coach_id, sport_id)
);

create table if not exists public.coach_academies (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  primary key (coach_id, academy_id)
);

create table if not exists public.venue_sports (
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (venue_id, sport_id)
);

-- Intake records are private moderation queue entries. No anonymous inserts,
-- public reads, or client-side moderation updates are granted by this migration.
create table if not exists public.listing_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references auth.users(id) on delete restrict,
  listing_type text not null
    check (listing_type in ('venue', 'trial', 'academy', 'coach', 'event', 'sport', 'other')),
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 20000),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected', 'needs_changes')),
  moderator_note text check (moderator_note is null or char_length(moderator_note) <= 2000),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academies_publication_city_idx
  on public.academies (publication_status, city);
create index if not exists coaches_publication_city_idx
  on public.coaches (publication_status, city);
create index if not exists events_publication_start_idx
  on public.events (publication_status, starts_at);
create index if not exists events_sport_id_idx
  on public.events (sport_id);
create index if not exists listing_submissions_status_created_idx
  on public.listing_submissions (status, created_at desc);
create index if not exists listing_submissions_submitter_idx
  on public.listing_submissions (submitter_id, created_at desc);

alter table public.academies enable row level security;
alter table public.coaches enable row level security;
alter table public.events enable row level security;
alter table public.academy_sports enable row level security;
alter table public.coach_sports enable row level security;
alter table public.coach_academies enable row level security;
alter table public.venue_sports enable row level security;
alter table public.listing_submissions enable row level security;

drop policy if exists "academies_read_published" on public.academies;
create policy "academies_read_published" on public.academies
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "coaches_read_published" on public.coaches;
create policy "coaches_read_published" on public.coaches
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "events_read_published" on public.events;
create policy "events_read_published" on public.events
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "academy_sports_read_published_relationships" on public.academy_sports;
create policy "academy_sports_read_published_relationships" on public.academy_sports
  for select to anon, authenticated using (
    exists (select 1 from public.academies a where a.id = academy_id and a.publication_status = 'published')
    and exists (select 1 from public.sports s where s.id = sport_id and s.is_published)
  );

drop policy if exists "coach_sports_read_published_relationships" on public.coach_sports;
create policy "coach_sports_read_published_relationships" on public.coach_sports
  for select to anon, authenticated using (
    exists (select 1 from public.coaches c where c.id = coach_id and c.publication_status = 'published')
    and exists (select 1 from public.sports s where s.id = sport_id and s.is_published)
  );

drop policy if exists "coach_academies_read_published_relationships" on public.coach_academies;
create policy "coach_academies_read_published_relationships" on public.coach_academies
  for select to anon, authenticated using (
    exists (select 1 from public.coaches c where c.id = coach_id and c.publication_status = 'published')
    and exists (select 1 from public.academies a where a.id = academy_id and a.publication_status = 'published')
  );

drop policy if exists "venue_sports_read_published_relationships" on public.venue_sports;
create policy "venue_sports_read_published_relationships" on public.venue_sports
  for select to anon, authenticated using (
    exists (select 1 from public.venues v where v.id = venue_id and v.publication_status = 'published')
    and exists (select 1 from public.sports s where s.id = sport_id and s.is_published)
  );

drop policy if exists "listing_submissions_insert_own" on public.listing_submissions;
create policy "listing_submissions_insert_own" on public.listing_submissions
  for insert to authenticated with check (
    submitter_id = (select auth.uid())
    and status = 'pending'
    and moderator_note is null
    and reviewed_at is null
    and reviewed_by is null
  );

revoke all on public.academies, public.coaches, public.events, public.academy_sports,
  public.coach_sports, public.coach_academies, public.venue_sports, public.listing_submissions
  from anon, authenticated;
grant select on public.academies, public.coaches, public.events, public.academy_sports,
  public.coach_sports, public.coach_academies, public.venue_sports to anon, authenticated;
grant insert (submitter_id, listing_type, payload, source_url) on public.listing_submissions to authenticated;

-- Updated-at triggers reuse the hardened helper from the initial core migration.
drop trigger if exists academies_set_updated_at on public.academies;
create trigger academies_set_updated_at before update on public.academies
for each row execute function public.set_updated_at();
drop trigger if exists coaches_set_updated_at on public.coaches;
create trigger coaches_set_updated_at before update on public.coaches
for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
drop trigger if exists listing_submissions_set_updated_at on public.listing_submissions;
create trigger listing_submissions_set_updated_at before update on public.listing_submissions
for each row execute function public.set_updated_at();

commit;
