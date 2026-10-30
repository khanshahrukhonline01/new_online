-- KhelGrid: Setup & Seed Coaches
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql

begin;

-- 1. Table schema
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

-- Coach-Sport relationship mapping
create table if not exists public.coach_sports (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (coach_id, sport_id)
);

-- Coach-Academy relationship mapping
create table if not exists public.coach_academies (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  primary key (coach_id, academy_id)
);

-- 2. Indexes
create index if not exists coaches_publication_city_idx
  on public.coaches (publication_status, city);

-- 3. Row Level Security & Policies
alter table public.coaches enable row level security;
alter table public.coach_sports enable row level security;
alter table public.coach_academies enable row level security;

drop policy if exists "coaches_read_published" on public.coaches;
create policy "coaches_read_published" on public.coaches
  for select to anon, authenticated using (publication_status = 'published');

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

-- 4. Permissions
grant select on public.coaches, public.coach_sports, public.coach_academies to anon, authenticated;

-- 5. Updated At Trigger
drop trigger if exists coaches_set_updated_at on public.coaches;
create trigger coaches_set_updated_at before update on public.coaches
for each row execute function public.set_updated_at();

-- 6. Seed Dronacharya & Apex Coaches
insert into public.coaches (
  slug, display_name, bio, city, state, website_url, public_contact_url, verification_status, publication_status
)
values
(
  'pullela-gopichand',
  'Pullela Gopichand',
  'Chief National Coach of the Indian Badminton team, Dronacharya Awardee, and Padma Bhushan recipient. Mentor to multiple Olympic, World Championship, and All England medallists.',
  'Hyderabad',
  'Telangana',
  'https://gopichandbadmintonacademy.com',
  null,
  'verified',
  'published'
),
(
  'satpal-singh',
  'Mahabali Satpal Singh',
  'Dronacharya Awardee wrestling coach and Asian Games Gold Medallist. Chief coach at Guru Hanuman Akhara, New Delhi, training Olympic medallists Sushil Kumar and Yogeshwar Dutt.',
  'Delhi',
  'Delhi',
  null,
  null,
  'verified',
  'published'
),
(
  'p-t-usha',
  'P.T. Usha',
  'Legendary Indian sprinter (Payyoli Express), Dronacharya coach, and Indian Olympic Association President. Founder of the Usha School of Athletics in Kinaloor, Kerala.',
  'Kozhikode',
  'Kerala',
  'https://ushaschoolofathletics.com',
  null,
  'verified',
  'published'
),
(
  'balwan-singh',
  'Balwan Singh',
  'Dronacharya Awardee Kabaddi coach. Head coach for India National Kabaddi team guiding them to Asian Games Gold and Kabaddi World Cup victories.',
  'Sonipat',
  'Haryana',
  null,
  null,
  'verified',
  'published'
),
(
  'jaspal-rana',
  'Jaspal Rana',
  'Dronacharya Awardee shooting coach and multiple Asian Games Gold Medallist in pistol shooting. Personal coach to Olympic medallist Manu Bhaker and National Junior Pistol squad.',
  'Dehradun',
  'Uttarakhand',
  null,
  null,
  'verified',
  'published'
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  public_contact_url = excluded.public_contact_url,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

commit;
