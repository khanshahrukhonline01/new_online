-- Migration: 20261031120000_create_athlete_profiles.sql
-- Description: Athlete identity, verified player cards, video telemetry, and biometrics
begin;

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (
    username ~ '^[a-z0-9]+(-[a-z0-9]+)*$' 
    and char_length(username) between 3 and 50
  ),
  full_name text not null check (
    char_length(trim(full_name)) between 2 and 120
  ),
  sport text not null check (
    char_length(trim(sport)) between 2 and 80
  ),
  playing_position text not null default 'Athlete',
  city text not null default 'India',
  state text,
  date_of_birth date,
  team_or_academy text,
  coach text,
  experience_years text,
  primary_foot_or_hand text,
  height_cm integer check (
    height_cm is null or (height_cm between 100 and 250)
  ),
  weight_kg integer check (
    weight_kg is null or (weight_kg between 25 and 200)
  ),
  summary text check (
    summary is null or char_length(summary) <= 2000
  ),
  achievements jsonb not null default '[]'::jsonb,
  video_clips jsonb not null default '[]'::jsonb,
  fitness_benchmarks jsonb not null default '{}'::jsonb,
  player_card_stats jsonb not null default '{}'::jsonb,
  verification_status text not null default 'community' check (
    verification_status in ('community', 'verified', 'pro')
  ),
  publication_status text not null default 'published' check (
    publication_status in ('draft', 'published', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists athlete_profiles_username_idx 
  on public.athlete_profiles (username);

create index if not exists athlete_profiles_sport_idx 
  on public.athlete_profiles (sport);

create index if not exists athlete_profiles_city_state_idx 
  on public.athlete_profiles (city, state);

create index if not exists athlete_profiles_verification_idx 
  on public.athlete_profiles (verification_status);

create index if not exists athlete_profiles_publication_idx 
  on public.athlete_profiles (publication_status);

-- Row Level Security
alter table public.athlete_profiles enable row level security;

drop policy if exists "athlete_profiles_public_read" on public.athlete_profiles;
create policy "athlete_profiles_public_read" on public.athlete_profiles
  for select to anon, authenticated 
  using (publication_status = 'published');

drop policy if exists "athlete_profiles_public_insert" on public.athlete_profiles;
create policy "athlete_profiles_public_insert" on public.athlete_profiles
  for insert to anon, authenticated 
  with check (true);

drop policy if exists "athlete_profiles_self_update" on public.athlete_profiles;
create policy "athlete_profiles_self_update" on public.athlete_profiles
  for update to authenticated 
  using (true)
  with check (true);

grant select, insert on public.athlete_profiles to anon, authenticated;
grant update on public.athlete_profiles to authenticated;

commit;
