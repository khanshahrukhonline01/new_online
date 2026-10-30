-- KhelGrid: Setup & Seed Academies
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql

begin;

-- 1. Table schema
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

-- Academy-Sport relationship mapping
create table if not exists public.academy_sports (
  academy_id uuid not null references public.academies(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (academy_id, sport_id)
);

-- 2. Indexes
create index if not exists academies_publication_city_idx
  on public.academies (publication_status, city);

-- 3. Row Level Security & Policies
alter table public.academies enable row level security;
alter table public.academy_sports enable row level security;

drop policy if exists "academies_read_published" on public.academies;
create policy "academies_read_published" on public.academies
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "academy_sports_read_published_relationships" on public.academy_sports;
create policy "academy_sports_read_published_relationships" on public.academy_sports
  for select to anon, authenticated using (
    exists (select 1 from public.academies a where a.id = academy_id and a.publication_status = 'published')
    and exists (select 1 from public.sports s where s.id = sport_id and s.is_published)
  );

-- 4. Permissions
grant select on public.academies, public.academy_sports to anon, authenticated;

-- 5. Updated At Trigger
drop trigger if exists academies_set_updated_at on public.academies;
create trigger academies_set_updated_at before update on public.academies
for each row execute function public.set_updated_at();

-- 6. Seed Official Verified Academies
insert into public.academies (
  slug, name, description, city, state, website_url, public_contact_url, verification_status, publication_status
)
values
(
  'tata-archery-academy',
  'Tata Archery Academy',
  'Premier archery training academy founded by Tata Steel in Jamshedpur, Jharkhand in 1996. Has produced elite Indian international and Olympic archers including Deepika Kumari, Jayanta Talukdar, and Komalika Bari.',
  'Jamshedpur',
  'Jharkhand',
  'https://www.tatasteel.com/corporate/sustainability/sports/archery/',
  null,
  'verified',
  'published'
),
(
  'pullela-gopichand-badminton-academy',
  'Pullela Gopichand Badminton Academy',
  'World-class badminton high performance training facility in Gachibowli, Hyderabad, Telangana. Founded by Dronacharya awardee Pullela Gopichand, producing Olympic medallists Saina Nehwal and PV Sindhu.',
  'Hyderabad',
  'Telangana',
  'https://gopichandbadmintonacademy.com',
  null,
  'verified',
  'published'
),
(
  'prakash-padukone-badminton-academy',
  'Prakash Padukone Badminton Academy (PPBA)',
  'Premier private badminton academy founded in 1994 by Prakash Padukone, operating out of the Padukone-Dravid Centre for Sports Excellence in Bengaluru.',
  'Bengaluru',
  'Karnataka',
  'https://ppba.in',
  null,
  'verified',
  'published'
),
(
  'sai-netaji-subhas-national-institute-sports',
  'SAI Netaji Subhas National Institute of Sports (NIS Patiala)',
  'Premier sports institute in Asia and SAI National Centre of Excellence in Patiala, Punjab. National hub for Olympic discipline coaching, athletic conditioning, and sports science.',
  'Patiala',
  'Punjab',
  'https://nsnis.org',
  null,
  'verified',
  'published'
),
(
  'mary-kom-regional-boxing-academy',
  'Mary Kom Regional Boxing Academy',
  'Boxing academy in Imphal, Manipur, founded by Olympic medallist and 6-time World Champion MC Mary Kom to identify and train underprivileged youth boxing talent across Northeast India.',
  'Imphal',
  'Manipur',
  'https://marykomboxingfoundation.com',
  null,
  'verified',
  'published'
),
(
  'army-sports-institute-pune',
  'Army Sports Institute (ASI Pune)',
  'Apex Indian Army sports academy in Pune, Maharashtra, supporting training in Archery, Athletics, Boxing, Diving, Fencing, Weightlifting, and Wrestling under Mission Olympics.',
  'Pune',
  'Maharashtra',
  'https://armysportsinstitute.com',
  null,
  'verified',
  'published'
),
(
  'bhaichung-bhutia-football-schools-delhi',
  'Bhaichung Bhutia Football Schools (BBFS Delhi)',
  'AIFF 4-star accredited youth football development academy founded by Indian football legend Bhaichung Bhutia, delivering grassroots and elite pathway coaching across Delhi NCR.',
  'Delhi',
  'Delhi',
  'https://bbfootballschools.com',
  null,
  'verified',
  'published'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  public_contact_url = excluded.public_contact_url,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

commit;
