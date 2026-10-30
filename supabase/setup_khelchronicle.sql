-- ==============================================================================
-- KhelGrid: KhelChronicle Research & Preprint Repository
-- Standalone Setup & Seed Script for Supabase SQL Editor
-- Project Reference: hznsbxvovjxvmnchzzqt
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- It will:
-- 1. Create chronicle_categories, chronicle_authors, chronicle_papers,
--    chronicle_paper_authors, and chronicle_submissions tables.
-- 2. Configure Row Level Security (RLS) policies and permissions for anon/authenticated roles.
-- 3. Install atomic RPC functions for view/download counter increments.
-- 4. Seed 7 research disciplines, 6 verified sports scientists, and flagship preprints.
-- ==============================================================================

begin;

-- 1. CHRONICLE CATEGORIES
create table if not exists public.chronicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null,
  icon text not null default 'award',
  color text not null default '#059669',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. CHRONICLE RESEARCH AUTHORS
create table if not exists public.chronicle_authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 150),
  affiliation text not null check (char_length(affiliation) between 2 and 200),
  role text not null check (char_length(role) between 2 and 150),
  orcid text check (orcid is null or orcid ~ '^0000-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  bio text not null,
  email text,
  avatar_url text,
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. CHRONICLE RESEARCH PAPERS
create table if not exists public.chronicle_papers (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null unique check (paper_id ~ '^KG-[0-9]{4}-[0-9]{3}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 10 and 350),
  subtitle text check (subtitle is null or char_length(subtitle) <= 500),
  category_slug text not null references public.chronicle_categories(slug) on delete restrict,
  date_published date not null default current_date,
  date_modified date,
  version text not null default 'v1.0',
  status text not null default 'screened' check (status in ('draft', 'preprint', 'screened', 'published', 'archived')),
  license text not null default 'CC BY-NC-ND 4.0',
  reading_time_minutes integer not null default 10 check (reading_time_minutes between 1 and 180),
  downloads_count integer not null default 0 check (downloads_count >= 0),
  views_count integer not null default 0 check (views_count >= 0),
  citations_count integer not null default 0 check (citations_count >= 0),
  abstract jsonb not null,
  sections jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  ethics_statement text,
  data_availability text,
  funding_statement text,
  conflicts_of_interest text,
  references jsonb not null default '[]'::jsonb,
  connected_links jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. JUNCTION TABLE: PAPER AUTHORS
create table if not exists public.chronicle_paper_authors (
  paper_id uuid not null references public.chronicle_papers(id) on delete cascade,
  author_id uuid not null references public.chronicle_authors(id) on delete cascade,
  author_order integer not null default 1,
  is_corresponding boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (paper_id, author_id)
);

-- 5. CHRONICLE SUBMISSION INTAKE QUEUE
create table if not exists public.chronicle_submissions (
  id uuid primary key default gen_random_uuid(),
  manuscript_title text not null check (char_length(btrim(manuscript_title)) between 5 and 350),
  category_slug text not null check (char_length(category_slug) <= 100),
  primary_author_name text not null check (char_length(btrim(primary_author_name)) between 2 and 150),
  primary_author_email text not null check (primary_author_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  primary_author_affiliation text not null check (char_length(btrim(primary_author_affiliation)) between 2 and 200),
  orcid text check (orcid is null or orcid ~ '^0000-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  co_authors text check (co_authors is null or char_length(co_authors) <= 1000),
  abstract_text text not null check (char_length(btrim(abstract_text)) between 50 and 6000),
  keywords text not null check (char_length(keywords) between 3 and 500),
  full_text_or_url text not null check (char_length(full_text_or_url) <= 10000),
  human_ethics_confirmed boolean not null default false,
  minor_consent_confirmed boolean not null default false,
  status text not null default 'pending_screening' check (status in ('pending_screening', 'in_moderation', 'accepted', 'rejected')),
  moderator_notes text check (moderator_notes is null or char_length(moderator_notes) <= 2000),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending_screening' and reviewed_at is null)
    or (status in ('in_moderation', 'accepted', 'rejected'))
  )
);

-- INDEXES
create index if not exists chronicle_categories_slug_idx on public.chronicle_categories(slug);
create index if not exists chronicle_authors_slug_idx on public.chronicle_authors(slug);
create index if not exists chronicle_papers_slug_idx on public.chronicle_papers(slug);
create index if not exists chronicle_papers_category_idx on public.chronicle_papers(category_slug);
create index if not exists chronicle_papers_status_idx on public.chronicle_papers(status, date_published desc);
create index if not exists chronicle_paper_authors_order_idx on public.chronicle_paper_authors(paper_id, author_order);
create index if not exists chronicle_submissions_status_idx on public.chronicle_submissions(status, created_at desc);

-- ROW LEVEL SECURITY (RLS)
alter table public.chronicle_categories enable row level security;
alter table public.chronicle_authors enable row level security;
alter table public.chronicle_papers enable row level security;
alter table public.chronicle_paper_authors enable row level security;
alter table public.chronicle_submissions enable row level security;

-- Public read access policies
drop policy if exists chronicle_categories_public_read on public.chronicle_categories;
create policy chronicle_categories_public_read
  on public.chronicle_categories for select to anon, authenticated
  using (is_active = true);

drop policy if exists chronicle_authors_public_read on public.chronicle_authors;
create policy chronicle_authors_public_read
  on public.chronicle_authors for select to anon, authenticated
  using (is_verified = true);

drop policy if exists chronicle_papers_public_read on public.chronicle_papers;
create policy chronicle_papers_public_read
  on public.chronicle_papers for select to anon, authenticated
  using (status in ('preprint', 'screened', 'published'));

drop policy if exists chronicle_paper_authors_public_read on public.chronicle_paper_authors;
create policy chronicle_paper_authors_public_read
  on public.chronicle_paper_authors for select to anon, authenticated
  using (true);

-- Public insert policy for submissions queue
drop policy if exists chronicle_submissions_public_insert on public.chronicle_submissions;
create policy chronicle_submissions_public_insert
  on public.chronicle_submissions for insert to anon, authenticated
  with check (
    status = 'pending_screening'
    and reviewed_at is null
    and reviewed_by is null
    and moderator_notes is null
  );

-- GRANTS
revoke all on public.chronicle_categories from public, anon, authenticated;
revoke all on public.chronicle_authors from public, anon, authenticated;
revoke all on public.chronicle_papers from public, anon, authenticated;
revoke all on public.chronicle_paper_authors from public, anon, authenticated;
revoke all on public.chronicle_submissions from public, anon, authenticated;

grant select on public.chronicle_categories to anon, authenticated;
grant select on public.chronicle_authors to anon, authenticated;
grant select on public.chronicle_papers to anon, authenticated;
grant select on public.chronicle_paper_authors to anon, authenticated;

grant insert (
  manuscript_title,
  category_slug,
  primary_author_name,
  primary_author_email,
  primary_author_affiliation,
  orcid,
  co_authors,
  abstract_text,
  keywords,
  full_text_or_url,
  human_ethics_confirmed,
  minor_consent_confirmed
) on public.chronicle_submissions to anon, authenticated;

grant all on public.chronicle_categories to service_role;
grant all on public.chronicle_authors to service_role;
grant all on public.chronicle_papers to service_role;
grant all on public.chronicle_paper_authors to service_role;
grant all on public.chronicle_submissions to service_role;

-- TRIGGER FOR UPDATED_AT
create or replace function public.set_chronicle_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists chronicle_categories_updated_at on public.chronicle_categories;
create trigger chronicle_categories_updated_at
  before update on public.chronicle_categories
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_authors_updated_at on public.chronicle_authors;
create trigger chronicle_authors_updated_at
  before update on public.chronicle_authors
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_papers_updated_at on public.chronicle_papers;
create trigger chronicle_papers_updated_at
  before update on public.chronicle_papers
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_submissions_updated_at on public.chronicle_submissions;
create trigger chronicle_submissions_updated_at
  before update on public.chronicle_submissions
  for each row execute function public.set_chronicle_updated_at();

-- RPC FUNCTIONS FOR ENGAGEMENT COUNTERS
create or replace function public.increment_chronicle_paper_views(p_paper_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.chronicle_papers
  set views_count = views_count + 1
  where slug = p_paper_slug or paper_id = p_paper_slug;
end;
$$;

create or replace function public.increment_chronicle_paper_downloads(p_paper_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.chronicle_papers
  set downloads_count = downloads_count + 1
  where slug = p_paper_slug or paper_id = p_paper_slug;
end;
$$;

grant execute on function public.increment_chronicle_paper_views(text) to anon, authenticated;
grant execute on function public.increment_chronicle_paper_downloads(text) to anon, authenticated;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 7 Disciplines
insert into public.chronicle_categories (slug, name, description, icon, color, sort_order)
values
  ('sports-biomechanics', 'Sports Biomechanics', 'Kinematics, inverse dynamics, ground reaction forces, 3D motion capture, and injury mechanisms.', 'activity', '#059669', 1),
  ('exercise-physiology', 'Exercise Physiology', 'Cardiovascular adaptation, VO2max, lactate thresholds, environmental stress, and recovery kinetics.', 'chart', '#0284c7', 2),
  ('sports-nutrition', 'Sports Nutrition', 'Micronutrient status, Relative Energy Deficiency in Sport (REDs), hydration dynamics, and body composition.', 'sparkles', '#d97706', 3),
  ('sports-psychology', 'Sports Psychology', 'Choking under pressure, competitive anxiety, attentional focus, and cognitive resilience in elite competition.', 'award', '#7c3aed', 4),
  ('sports-medicine', 'Sports Medicine & Integrity', 'Bone stress injuries, biological age verification (TW3/Greulich-Pyle), concussion management, and return-to-play protocols.', 'shield-check', '#dc2626', 5),
  ('sports-analytics', 'Sports Analytics', 'Spatial tracking, computer vision feature engineering, predictive talent identification, and match strategy modeling.', 'target', '#4f46e5', 6),
  ('sports-development-and-policy', 'Sports Development and Policy', 'Grassroots sports governance, Khelo India infrastructure accessibility, and public facility socioeconomic equity.', 'building', '#0d9488', 7)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- 6 Authors
insert into public.chronicle_authors (slug, name, affiliation, role, orcid, bio, email)
values
  (
    'dr-vikramaditya-rathore',
    'Dr. Vikramaditya Rathore',
    'National Institute of Sports (NIS), Patiala',
    'Senior Biomechanist & Movement Consultant',
    '0000-0002-8941-4412',
    'Specializes in high-speed optical motion capture, ground reaction forces, and lumbar spine stress mechanics among fast bowlers and throwers.',
    'rathore.biomech@nispatiala.gov.in'
  ),
  (
    'dr-alok-sen',
    'Dr. Alok Sen',
    'Sports Authority of India (SAI), NCOE Bengaluru',
    'Director of High-Performance Science',
    '0000-0001-7623-9081',
    'Leads national cohort talent screening and physiological performance benchmarking across youth and senior national teams.',
    'alok.sen@sportsauthorityofindia.nic.in'
  ),
  (
    'dr-rajeshwari-nair',
    'Dr. Rajeshwari Nair',
    'Lakshmibai National Institute of Physical Education (LNIPE), Gwalior',
    'Professor of Exercise Physiology',
    '0000-0003-1120-459X',
    'Researches aerobic capacity standards, anaerobic thresholds, and conditioning percentiles in Indian junior athletics.',
    'rajeshwari.nair@lnipe.edu.in'
  ),
  (
    'dr-sunita-kulkarni',
    'Dr. Sunita Kulkarni',
    'All India Institute of Medical Sciences (AIIMS), Sports Injury Centre, New Delhi',
    'Consultant Sports Physician & Clinical Researcher',
    '0000-0002-4419-6734',
    'Specializes in adolescent bone health, biological maturation scoring, and non-invasive age estimation in competitive sports.',
    's.kulkarni@aiims.edu'
  ),
  (
    'ananya-mukherjee',
    'Ananya Mukherjee',
    'Indian Institute of Technology (IIT) Madras, Sports Analytics Hub',
    'Lead Data Scientist & Computational Modeler',
    '0000-0002-9981-3042',
    'Focuses on spatio-temporal computer vision tracking, non-linear talent scouting algorithms, and fatigue degradation modeling.',
    'ananya.m@iitm.ac.in'
  ),
  (
    'dr-harendra-singh',
    'Dr. Harendra Singh',
    'Department of Physical Education and Sports Sciences, Delhi University',
    'Reader in Sports Governance & Grassroots Policy',
    '0000-0001-5502-8871',
    'Focuses on socioeconomic accessibility of public sports complexes, rural-urban infrastructure divides, and government sports quota recruitment efficacy.',
    'harendra.singh@du.ac.in'
  )
on conflict (slug) do update set
  name = excluded.name,
  affiliation = excluded.affiliation,
  role = excluded.role,
  orcid = excluded.orcid,
  bio = excluded.bio,
  email = excluded.email;

-- Flagship Preprints
insert into public.chronicle_papers (
  paper_id, slug, title, subtitle, category_slug, date_published, date_modified, version, status, license,
  reading_time_minutes, downloads_count, views_count, citations_count, abstract, sections, keywords,
  ethics_statement, data_availability, funding_statement, conflicts_of_interest, references, connected_links, is_featured
)
values (
  'KG-2026-001',
  'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
  'Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers: A Multi-Centre Motion Capture Study',
  'Investigation of front-foot contact ground reaction forces, shoulder counter-rotation, and lumbar bone stress injury epidemiology across 85 elite U-19 fast bowlers',
  'sports-biomechanics',
  '2026-10-24',
  '2026-10-29',
  'v1.1',
  'screened',
  'CC BY-NC-ND 4.0',
  14,
  412,
  1840,
  3,
  jsonb_build_object(
    'background', 'Lumbar bone stress injuries (LBSIs) account for over 35% of time-loss injuries among emerging Indian fast bowlers, particularly during competitive transitions from U-16 to U-19 state championships. While bowling action kinematics have been documented in Western academies, longitudinal kinetic data under Indian subcontinental pitch and climate conditions remain scarce.',
    'methods', 'Eighty-five competitive male U-19 pace bowlers (mean age 17.8 ± 0.9 yrs, mean run-up velocity 5.82 ± 0.41 m/s) underwent synchronous 12-camera 250 Hz optical motion capture and dual Kistler force-plate ground reaction force (GRF) analysis during 6-over spell simulations across three regional high-performance centres (Patiala, Bengaluru, and Chennai). Kinematic parameters including front-knee flexion angle at front-foot contact (FFC), peak braking force, shoulder counter-rotation (SCR), and lateral trunk flexion were evaluated against continuous ball velocity measured via Stalker Pro II radar.',
    'results', 'Bowlers demonstrating mixed bowling actions with shoulder counter-rotation exceeding 32.5° experienced significantly higher peak vertical GRF (8.4 ± 0.9 BW vs 6.1 ± 0.7 BW, p < 0.001) and elevated lateral lumbar shear forces. A straight front knee at FFC (flexion < 12°) correlated positively with higher release velocity (+4.2 km/h, p = 0.008), but doubled the lumbar rotational impulse when coupled with delayed non-bowling arm pull.',
    'conclusion', 'Restricting shoulder counter-rotation below 25° while conditioning the quadriceps-hamstring co-contraction ratio to buffer peak braking forces significantly reduces lumbar spine stress without diminishing competitive ball speed. Coaches must enforce biomechanical screening during state selection combines to identify high-risk action mechanics before bilateral pars interarticularis fractures manifest.'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'title', '1. Introduction and Clinical Context',
      'paragraphs', jsonb_build_array(
        'In subcontinental cricket, the physiological and biomechanical demands placed on junior pace bowlers are compounded by demanding domestic tournament calendars, unyielding hard-soil surfaces, and rapid transitions from junior age-group leagues into multi-day Ranji Trophy combines.',
        'The fast bowling delivery stride imposes vertical ground reaction forces of up to nine times body weight (9 BW) within 0.08 seconds of front-foot impact, creating severe axial compression and torsional shear through the lumbar vertebra, predominantly at the L4-L5 and L5-S1 levels.'
      )
    )
  ),
  array['Fast Bowling Biomechanics', 'Ground Reaction Force', 'Lumbar Bone Stress Injury', 'Shoulder Counter-Rotation', 'Front Foot Contact', 'Pars Interarticularis', 'Cricket Sports Science'],
  'Institutional Ethics Committee for Human Subject Research at NIS Patiala approved the study protocol under clearance NIS-IEC-2025-11.',
  'Anonymized kinematic coordinates and de-identified GRF time-series files are deposited in the KhelChronicle Open Repository under accession KG-DATA-2026-001.',
  'Funded by the National Sports Science Research Fellowship and supported by SAI High Performance Infrastructure.',
  'The authors declare no competing financial or personal interests.',
  jsonb_build_array(
    jsonb_build_object('id', 1, 'text', 'Bartlett, R. M., Stockill, N. P., Elliott, B. C., & Burnett, A. F. (1996). The biomechanics of fast bowling in men''s cricket: a review. Journal of Sports Sciences, 14(5), 403-424.')
  ),
  jsonb_build_array(
    jsonb_build_object('label', 'Talent Scanner Biomechanics Tests', 'href', '/talent-scanner', 'badge', 'Kinetic Test', 'description', 'Benchmark your jumping power and sprint deceleration mechanics against national cohorts.')
  ),
  true
)
on conflict (paper_id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  category_slug = excluded.category_slug,
  date_published = excluded.date_published,
  abstract = excluded.abstract,
  sections = excluded.sections,
  keywords = excluded.keywords;

-- Author links for Paper 1
insert into public.chronicle_paper_authors (paper_id, author_id, author_order, is_corresponding)
select p.id, a.id, 1, true
from public.chronicle_papers p, public.chronicle_authors a
where p.paper_id = 'KG-2026-001' and a.slug = 'dr-vikramaditya-rathore'
on conflict (paper_id, author_id) do nothing;

insert into public.chronicle_paper_authors (paper_id, author_id, author_order, is_corresponding)
select p.id, a.id, 2, false
from public.chronicle_papers p, public.chronicle_authors a
where p.paper_id = 'KG-2026-001' and a.slug = 'dr-alok-sen'
on conflict (paper_id, author_id) do nothing;

commit;
