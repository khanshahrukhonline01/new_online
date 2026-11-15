-- KhelGrid: Setup & Seed Events & Tournaments
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql

begin;

-- 1. Table schema
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

-- 2. Indexes
create index if not exists events_publication_start_idx
  on public.events (publication_status, starts_at);
create index if not exists events_sport_id_idx
  on public.events (sport_id);

-- 3. Row Level Security & Policies
alter table public.events enable row level security;

drop policy if exists "events_read_published" on public.events;
create policy "events_read_published" on public.events
  for select to anon, authenticated using (publication_status = 'published');

-- 4. Permissions
grant select on public.events to anon, authenticated;

-- 5. Updated At Trigger
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

-- 6. Seed Verified National Sports Events & Tournaments
insert into public.events (
  slug, title, sport_id, event_type, organizer_name, city, venue_name,
  starts_at, ends_at, source_url, source_name, verification_status, publication_status
)
values
(
  'khelo-india-youth-games-2026',
  'Khelo India Youth Games 2026',
  null,
  'tournament',
  'Sports Authority of India (SAI) & Ministry of Youth Affairs and Sports',
  'Bhopal',
  'TT Nagar Stadium & Regional SAI Venues, Bhopal',
  '2026-11-15 09:00:00+05:30',
  '2026-11-28 20:00:00+05:30',
  'https://kheloindia.gov.in',
  'Official Khelo India Portal',
  'verified',
  'published'
),
(
  'senior-national-badminton-championships-2026',
  '86th Senior National Badminton Championships 2026',
  (select id from public.sports where slug = 'badminton' limit 1),
  'tournament',
  'Badminton Association of India (BAI)',
  'Guwahati',
  'National Centre of Excellence Badminton Stadium, Guwahati',
  '2026-12-05 08:30:00+05:30',
  '2026-12-12 19:30:00+05:30',
  'https://badmintonindia.org',
  'Badminton Association of India',
  'verified',
  'published'
),
(
  'hero-santosh-trophy-national-football-championship-2026',
  '78th National Football Championship for the Santosh Trophy',
  (select id from public.sports where slug = 'football' limit 1),
  'tournament',
  'All India Football Federation (AIFF)',
  'Hyderabad',
  'GMC Balayogi Athletic Stadium, Gachibowli, Hyderabad',
  '2026-11-20 15:30:00+05:30',
  '2026-12-07 20:00:00+05:30',
  'https://the-aiff.com',
  'All India Football Federation',
  'verified',
  'published'
),
(
  'national-open-athletics-championships-2026',
  '64th National Open Athletics Championships 2026',
  (select id from public.sports where slug = 'athletics' limit 1),
  'tournament',
  'Athletics Federation of India (AFI)',
  'Bengaluru',
  'Sree Kanteerava Outdoor Stadium, Bengaluru',
  '2026-11-25 07:00:00+05:30',
  '2026-11-29 18:00:00+05:30',
  'https://athleticsfederation.in',
  'Athletics Federation of India',
  'verified',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  sport_id = excluded.sport_id,
  event_type = excluded.event_type,
  organizer_name = excluded.organizer_name,
  city = excluded.city,
  venue_name = excluded.venue_name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  source_url = excluded.source_url,
  source_name = excluded.source_name,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

commit;
