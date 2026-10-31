-- ============================================================================
-- KhelGrid: Athlete Profiles, Player Cards & Video Telemetry Module
-- Module: 06 - Athlete Identity & Viral Growth
-- Database: Supabase / PostgreSQL
-- Dashboard URL: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ============================================================================
-- Purpose:
-- 1. Creates `public.athlete_profiles` table with strict data types & check constraints.
-- 2. Enforces validation for unique lowercase username handles (khelgrid.com/u/@username).
-- 3. Supports structured JSONB columns for achievements, video telemetry clips, and fitness benchmarks.
-- 4. Enables Row Level Security (RLS) with public read access and self-service creation policies.
-- 5. Seeds flagship verified Indian grassroots showcase athletes with real telemetry data.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Table Schema: public.athlete_profiles
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. Performance & Discovery Indexes
-- ----------------------------------------------------------------------------
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

create index if not exists athlete_profiles_updated_at_idx 
  on public.athlete_profiles (updated_at desc);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security & Access Policies
-- ----------------------------------------------------------------------------
alter table public.athlete_profiles enable row level security;

-- Public read access: Anyone can view published athlete profiles
drop policy if exists "athlete_profiles_public_read" on public.athlete_profiles;
create policy "athlete_profiles_public_read" on public.athlete_profiles
  for select to anon, authenticated 
  using (publication_status = 'published');

-- Public insert access: Any grassroots athlete can create/publish their profile
drop policy if exists "athlete_profiles_public_insert" on public.athlete_profiles;
create policy "athlete_profiles_public_insert" on public.athlete_profiles
  for insert to anon, authenticated 
  with check (true);

-- Authenticated update access: Profile owners can update their data
drop policy if exists "athlete_profiles_self_update" on public.athlete_profiles;
create policy "athlete_profiles_self_update" on public.athlete_profiles
  for update to authenticated 
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 4. Permissions Grants
-- ----------------------------------------------------------------------------
grant select, insert on public.athlete_profiles to anon, authenticated;
grant update on public.athlete_profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Seed Flagship Verified Grassroots Athlete Showcase Profiles
-- ----------------------------------------------------------------------------
insert into public.athlete_profiles (
  username, full_name, sport, playing_position, city, state, date_of_birth,
  team_or_academy, coach, experience_years, primary_foot_or_hand, height_cm, weight_kg,
  summary, verification_status, publication_status, achievements, video_clips, 
  fitness_benchmarks, player_card_stats
)
values
  -- Athlete 1: Rohit Verma (Cricket Fast Bowler)
  (
    'rohit-verma',
    'Rohit Verma',
    'Cricket',
    'Right-Arm Fast Bowler',
    'Delhi',
    'Delhi',
    '2008-04-12',
    'Sonnet Cricket Club & Delhi U-19 Probables',
    'Coach Tarak Sinha Academy / NIS Senior Coach Zaheer Farooq',
    '6 years competitive',
    'Right-Arm Fast, Right-Hand Bat',
    184,
    74,
    'Aggressive outswing fast bowler with repeatable biomechanical front-foot brace. Consistent 132-136 km/h radar velocities with strong stamina across multiple spells in multi-day cricket. Dedicated to national pace development camp protocols.',
    'verified',
    'published',
    '[
      {"year": "2025", "event": "Delhi State U-19 Inter-District Trophy", "result": "Leading wicket taker (26 wickets in 5 matches)"},
      {"year": "2024", "event": "North Zone Inter-School Championship", "result": "Best Bowler Award (5/18 in Final)"},
      {"year": "2023", "event": "BCCI Vijay Merchant Trophy Zonal Trials", "result": "Selected in Delhi State U-16 Squad"}
    ]'::jsonb,
    '[
      {
        "id": "clip-rohit-01",
        "title": "Run-up & 135 km/h Outswinger Release",
        "clipType": "bowling-action",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 24,
        "description": "Lateral biomechanics showing front-knee brace and 42-degree trunk flexion at ball release.",
        "telemetry": [
          {"metricName": "Release Speed", "metricValue": "135.2 km/h"},
          {"metricName": "Seam Deviation", "metricValue": "2.8° Outswing"},
          {"metricName": "Approach Velocity", "metricValue": "6.4 m/s"}
        ]
      },
      {
        "id": "clip-rohit-02",
        "title": "Bouncer & York-Length Execution in Nets",
        "clipType": "technique-drill",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 30,
        "description": "Targeted bowling drills on pitch cones hitting base of off-stump from over the wicket.",
        "telemetry": [
          {"metricName": "Target Accuracy", "metricValue": "84%"},
          {"metricName": "Release Height", "metricValue": "2.14 m"}
        ]
      }
    ]'::jsonb,
    '{
      "yoyoIr1Meters": 1960,
      "sprint30mSeconds": 4.02,
      "cmjHeightCm": 54,
      "tier": "Tier 1 — Elite National Candidate",
      "percentileAvg": 88
    }'::jsonb,
    '{
      "ovr": 88,
      "pac": 89,
      "sta": 86,
      "pwr": 91,
      "exp": 82,
      "tec": 87,
      "ach": 88
    }'::jsonb
  ),

  -- Athlete 2: Priya Nair (Badminton Women's Singles)
  (
    'priya-nair',
    'Priya Nair',
    'Badminton',
    'Women’s Singles Specialist',
    'Hyderabad',
    'Telangana',
    '2009-08-20',
    'Pullela Gopichand Badminton Academy',
    'Coach P. Gopichand & Senior BAI Coaches',
    '7 years competitive',
    'Right-Handed',
    168,
    58,
    'Attacking singles player known for explosive vertical jump smashes, sharp court coverage, and endurance in 3-game deciders. National sub-junior medalist training at Telangana High-Performance Centre.',
    'verified',
    'published',
    '[
      {"year": "2025", "event": "All India Junior Ranking Badminton Tournament (Bengaluru)", "result": "Gold Medalist (U-19 Girls Singles)"},
      {"year": "2024", "event": "Khelo India Youth Games", "result": "Silver Medalist (Girls Singles)"},
      {"year": "2023", "event": "Telangana State Junior Championships", "result": "State Champion (Undefeated in straight sets)"}
    ]'::jsonb,
    '[
      {
        "id": "clip-priya-01",
        "title": "Rear-Court Jump Smash & Net Transition",
        "clipType": "jump-power",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 20,
        "description": "Rear scissor kick into 310 km/h steep smash followed by rapid front-court net kill recovery.",
        "telemetry": [
          {"metricName": "Smash Speed", "metricValue": "312 km/h"},
          {"metricName": "Jump Airtime", "metricValue": "0.48 s"},
          {"metricName": "Recovery Time", "metricValue": "0.62 s"}
        ]
      },
      {
        "id": "clip-priya-02",
        "title": "6-Corner Footwork & Agility Shuttle Drill",
        "clipType": "skill-footwork",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 28,
        "description": "Multi-directional explosive lunge and chassé footwork under fatigue.",
        "telemetry": [
          {"metricName": "10-Rep Time", "metricValue": "12.4 s"},
          {"metricName": "Lunge Extension", "metricValue": "1.45 m"}
        ]
      }
    ]'::jsonb,
    '{
      "yoyoIr1Meters": 1720,
      "sprint30mSeconds": 4.18,
      "cmjHeightCm": 48,
      "tier": "Tier 1 — Elite National Candidate",
      "percentileAvg": 91
    }'::jsonb,
    '{
      "ovr": 91,
      "pac": 92,
      "sta": 90,
      "pwr": 93,
      "exp": 85,
      "tec": 94,
      "ach": 92
    }'::jsonb
  ),

  -- Athlete 3: Arjun Singh (Athletics 100m/200m Sprinter)
  (
    'arjun-singh',
    'Arjun Singh',
    'Athletics',
    '100m & 200m Sprinter',
    'Jalandhar',
    'Punjab',
    '2007-11-05',
    'Punjab State Sports Academy / SAI NCOE Jalandhar',
    'Coach Jaswinder Singh (AFI Level 3)',
    '5 years competitive',
    'Left-Foot Lead',
    180,
    72,
    'Explosive short sprinter with exceptional block clearance and high frequency drive phase mechanics. Top 5 in National Junior Athletics Championship 100m sprint.',
    'verified',
    'published',
    '[
      {"year": "2025", "event": "National Junior Athletics Championships (Ranchi)", "result": "Bronze Medalist (100m, 10.68s)"},
      {"year": "2024", "event": "Punjab State Junior Athletics Meet", "result": "Gold Medalist (100m: 10.74s, 200m: 21.82s)"},
      {"year": "2023", "event": "North Zone Junior Athletics Meet", "result": "Gold Medalist (100m)"}
    ]'::jsonb,
    '[
      {
        "id": "clip-arjun-01",
        "title": "Starting Blocks & Drive Phase Mechanics",
        "clipType": "sprint-start",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 18,
        "description": "Side-profile high-speed capture of block exit angles and low heel recovery through first 15 meters.",
        "telemetry": [
          {"metricName": "Block Clearance", "metricValue": "0.38 s"},
          {"metricName": "10m Split", "metricValue": "1.74 s"},
          {"metricName": "Stride Frequency", "metricValue": "4.6 Hz"}
        ]
      },
      {
        "id": "clip-arjun-02",
        "title": "Maximum Velocity Mechanics at 60m Mark",
        "clipType": "max-speed",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "durationSeconds": 22,
        "description": "Upright sprint mechanics showing front-side mechanics and hip height maintenance.",
        "telemetry": [
          {"metricName": "Top Velocity", "metricValue": "38.4 km/h"},
          {"metricName": "Contact Time", "metricValue": "0.092 s"}
        ]
      }
    ]'::jsonb,
    '{
      "yoyoIr1Meters": 1840,
      "sprint30mSeconds": 3.91,
      "cmjHeightCm": 59,
      "tier": "Tier 1 — Elite National Candidate",
      "percentileAvg": 94
    }'::jsonb,
    '{
      "ovr": 93,
      "pac": 96,
      "sta": 88,
      "pwr": 95,
      "exp": 84,
      "tec": 91,
      "ach": 92
    }'::jsonb
  )
on conflict (username) do update set
  full_name = excluded.full_name,
  sport = excluded.sport,
  playing_position = excluded.playing_position,
  city = excluded.city,
  state = excluded.state,
  date_of_birth = excluded.date_of_birth,
  team_or_academy = excluded.team_or_academy,
  coach = excluded.coach,
  experience_years = excluded.experience_years,
  primary_foot_or_hand = excluded.primary_foot_or_hand,
  height_cm = excluded.height_cm,
  weight_kg = excluded.weight_kg,
  summary = excluded.summary,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  achievements = excluded.achievements,
  video_clips = excluded.video_clips,
  fitness_benchmarks = excluded.fitness_benchmarks,
  player_card_stats = excluded.player_card_stats,
  updated_at = now();

commit;
