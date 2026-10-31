-- KhelGrid: Athlete Profiles, Video Clip Telemetry, and Trial Reminders
-- Enables public shareable athlete profiles, verified player cards, video links, and calendar/WhatsApp alert queues.
begin;

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(username) between 3 and 50),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  sport text not null check (char_length(trim(sport)) between 2 and 80),
  playing_position text not null default 'Athlete',
  city text not null default 'India',
  state text,
  date_of_birth date,
  team_or_academy text,
  coach text,
  experience_years text,
  primary_foot_or_hand text,
  height_cm integer check (height_cm is null or (height_cm between 100 and 250)),
  weight_kg integer check (weight_kg is null or (weight_kg between 25 and 200)),
  summary text check (summary is null or char_length(summary) <= 2000),
  achievements jsonb not null default '[]'::jsonb,
  video_clips jsonb not null default '[]'::jsonb,
  fitness_benchmarks jsonb not null default '{}'::jsonb,
  verification_status text not null default 'community'
    check (verification_status in ('community', 'verified', 'pro')),
  publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_reminders (
  id uuid primary key default gen_random_uuid(),
  trial_slug text not null,
  trial_title text not null,
  starts_at timestamptz,
  deadline_date timestamptz,
  city text,
  venue_name text,
  notification_type text not null default 'whatsapp'
    check (notification_type in ('whatsapp', 'google-calendar', 'ical')),
  athlete_phone text,
  athlete_email text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists athlete_profiles_username_idx on public.athlete_profiles (username);
create index if not exists athlete_profiles_sport_city_idx on public.athlete_profiles (sport, city);
create index if not exists trial_reminders_trial_slug_idx on public.trial_reminders (trial_slug);

-- RLS
alter table public.athlete_profiles enable row level security;
alter table public.trial_reminders enable row level security;

-- Public can view published athlete profiles
drop policy if exists "athlete_profiles_public_read" on public.athlete_profiles;
create policy "athlete_profiles_public_read" on public.athlete_profiles
  for select to anon, authenticated using (publication_status = 'published');

-- Public can insert/publish new profiles
drop policy if exists "athlete_profiles_public_insert" on public.athlete_profiles;
create policy "athlete_profiles_public_insert" on public.athlete_profiles
  for insert to anon, authenticated with check (true);

-- Reminders insert
drop policy if exists "trial_reminders_public_insert" on public.trial_reminders;
create policy "trial_reminders_public_insert" on public.trial_reminders
  for insert to anon, authenticated with check (true);

commit;
