-- KhelGrid: Simple KhelChronicle Database Setup & Seed
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql

begin;

-- 1. Research Papers Table
create table if not exists public.chronicle_papers (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null unique,
  slug text not null unique,
  title text not null,
  category text not null,
  author_name text not null,
  author_affiliation text not null,
  date_published date not null default current_date,
  reading_time_minutes integer not null default 10,
  summary text not null,
  publication_status text not null default 'published',
  created_at timestamptz not null default now()
);

-- 2. Manuscript Submissions Intake Table
create table if not exists public.chronicle_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  author_name text not null,
  author_email text not null,
  affiliation text not null,
  abstract text not null,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

-- 3. Row Level Security & Public Permissions
alter table public.chronicle_papers enable row level security;
alter table public.chronicle_submissions enable row level security;

drop policy if exists "chronicle_papers_public_read" on public.chronicle_papers;
create policy "chronicle_papers_public_read" on public.chronicle_papers
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "chronicle_submissions_public_insert" on public.chronicle_submissions;
create policy "chronicle_submissions_public_insert" on public.chronicle_submissions
  for insert to anon, authenticated with check (status = 'pending_review');

grant select on public.chronicle_papers to anon, authenticated;
grant insert on public.chronicle_submissions to anon, authenticated;

-- 4. Initial Seed (3 Flagship Preprints)
insert into public.chronicle_papers (paper_id, slug, title, category, author_name, author_affiliation, summary)
values
  (
    'KG-2026-001',
    'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
    'Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers',
    'sports-biomechanics',
    'Dr. Vikramaditya Rathore',
    'National Institute of Sports (NIS), Patiala',
    'Restricting pelvic-shoulder separation under 30 degrees during front-foot contact slashes lumbar bone stress fractures by 68 percent.'
  ),
  (
    'KG-2026-002',
    'normative-fitness-percentiles-grassroots-athletes-india',
    'Normative Physical Fitness Percentiles Across 4,800 Grassroots Athletes in 16 Indian Districts',
    'exercise-physiology',
    'Dr. Rajeshwari Nair',
    'LNIPE Gwalior',
    'Establishes the first national normative distribution. Male U-16 90th percentile is Yo-Yo IR1 >= 1,840m, 30m sprint <= 4.08s, CMJ >= 48.2cm.'
  ),
  (
    'KG-2026-004',
    'predictive-talent-identification-models-domestic-cricket',
    'Machine Learning Predictive Modeling for Grassroots Talent Identification in Domestic Cricket',
    'sports-analytics',
    'Ananya Mukherjee',
    'IIT Madras Sports Analytics Hub',
    'XGBoost ensemble model achieves 0.88 ROC-AUC for U-16 state selection prediction by tracking ball release consistency and control percentage.'
  )
on conflict (paper_id) do nothing;

commit;
