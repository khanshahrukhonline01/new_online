-- Khelgrid Platform: initial core schema
-- This migration is designed for a NEW, independent Supabase project.
-- Apply only after confirming the target project ID. Never run against legacy production.
-- Data API access is intentionally narrow; writes for editorial tables are server/admin-only.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  avatar_url text,
  city text check (city is null or char_length(city) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  sport_id uuid references public.sports(id) on delete restrict,
  opportunity_type text not null check (opportunity_type in ('trial', 'combine', 'scholarship', 'camp', 'job', 'other')),
  organizer_name text,
  city text,
  venue_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  application_deadline timestamptz,
  source_url text,
  source_name text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 180),
  description text,
  city text not null check (char_length(city) between 1 and 120),
  address text,
  timezone text not null default 'Asia/Kolkata',
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venue_courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  sport_id uuid references public.sports(id) on delete restrict,
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  hourly_price_paise integer check (hourly_price_paise is null or hourly_price_paise >= 0),
  is_bookable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, name)
);

create index if not exists opportunities_publication_starts_idx
  on public.opportunities (publication_status, starts_at);
create index if not exists opportunities_sport_id_idx
  on public.opportunities (sport_id);
create index if not exists venues_publication_city_idx
  on public.venues (publication_status, city);
create index if not exists venue_courts_venue_id_idx
  on public.venue_courts (venue_id);

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.opportunities enable row level security;
alter table public.venues enable row level security;
alter table public.venue_courts enable row level security;

-- Profiles: users can only read and edit their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Published catalogue content is publicly readable; client-side writes are not granted.
drop policy if exists "sports_read_published" on public.sports;
create policy "sports_read_published" on public.sports
  for select to anon, authenticated using (is_published);

drop policy if exists "opportunities_read_published" on public.opportunities;
create policy "opportunities_read_published" on public.opportunities
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "venues_read_published" on public.venues;
create policy "venues_read_published" on public.venues
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "courts_read_for_published_venues" on public.venue_courts;
create policy "courts_read_for_published_venues" on public.venue_courts
  for select to anon, authenticated using (
    exists (
      select 1 from public.venues v
      where v.id = venue_courts.venue_id
        and v.publication_status = 'published'
    )
  );

revoke all on public.profiles, public.sports, public.opportunities, public.venues, public.venue_courts from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.sports, public.opportunities, public.venues, public.venue_courts to anon, authenticated;

commit;
