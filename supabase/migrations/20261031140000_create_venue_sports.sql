-- Migration: 20261031140000_create_venue_sports.sql
-- Description: Create public.venue_sports junction table and link SAI NCOE venues to sports
begin;

-- 1. Table Schema
create table if not exists public.venue_sports (
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  primary key (venue_id, sport_id)
);

-- 2. Performance Indexes
create index if not exists venue_sports_venue_id_idx on public.venue_sports (venue_id);
create index if not exists venue_sports_sport_id_idx on public.venue_sports (sport_id);

-- 3. Row Level Security & Policies
alter table public.venue_sports enable row level security;

drop policy if exists "venue_sports_public_read" on public.venue_sports;
create policy "venue_sports_public_read" on public.venue_sports
  for select to anon, authenticated using (
    exists (select 1 from public.venues v where v.id = venue_id and v.publication_status = 'published')
    and exists (select 1 from public.sports s where s.id = sport_id and s.is_published)
  );

-- 4. Permissions
grant select on public.venue_sports to anon, authenticated;

-- 5. Helper Function for linking venues to sports by slug
create or replace function public.link_venue_sport(p_venue_slug text, p_sport_slug text)
returns void as $$
declare
  v_venue_id uuid;
  v_sport_id uuid;
begin
  select id into v_venue_id from public.venues where slug = p_venue_slug limit 1;
  select id into v_sport_id from public.sports where slug = p_sport_slug limit 1;
  
  if v_venue_id is not null and v_sport_id is not null then
    insert into public.venue_sports (venue_id, sport_id)
    values (v_venue_id, v_sport_id)
    on conflict (venue_id, sport_id) do nothing;
  end if;
end;
$$ language plpgsql security definer;

-- 6. Link Existing SAI NCOE Venues to their official sports
select public.link_venue_sport('sai-ncoe-itanagar', 'archery');
select public.link_venue_sport('sai-ncoe-itanagar', 'boxing');
select public.link_venue_sport('sai-ncoe-itanagar', 'weightlifting');

select public.link_venue_sport('sai-ncoe-guwahati', 'archery');
select public.link_venue_sport('sai-ncoe-guwahati', 'boxing');
select public.link_venue_sport('sai-ncoe-guwahati', 'cycling');
select public.link_venue_sport('sai-ncoe-guwahati', 'fencing');
select public.link_venue_sport('sai-ncoe-guwahati', 'football');
select public.link_venue_sport('sai-ncoe-guwahati', 'taekwondo');

select public.link_venue_sport('sai-ncoe-dr-kssr', 'shooting');
select public.link_venue_sport('sai-ncoe-dr-spm-swimming-pool', 'swimming');

select public.link_venue_sport('sai-ncoe-ig-stadium', 'cycling');
select public.link_venue_sport('sai-ncoe-ig-stadium', 'gymnastics');

select public.link_venue_sport('sai-ncoe-mdcn-stadium', 'hockey');

select public.link_venue_sport('sai-ncoe-gandhinagar', 'athletics');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'badminton');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'fencing');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'handball');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'kabaddi');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'swimming');
select public.link_venue_sport('sai-ncoe-gandhinagar', 'table-tennis');

select public.link_venue_sport('sai-ncoe-naranpura', 'basketball');
select public.link_venue_sport('sai-ncoe-naranpura', 'taekwondo');
select public.link_venue_sport('sai-ncoe-naranpura', 'volleyball');

select public.link_venue_sport('sai-ncoe-rohtak', 'boxing');

select public.link_venue_sport('sai-ncoe-sonepat', 'archery');
select public.link_venue_sport('sai-ncoe-sonepat', 'athletics');
select public.link_venue_sport('sai-ncoe-sonepat', 'hockey');
select public.link_venue_sport('sai-ncoe-sonepat', 'kabaddi');
select public.link_venue_sport('sai-ncoe-sonepat', 'wrestling');

select public.link_venue_sport('sai-ncoe-dharamshala', 'kabaddi');
select public.link_venue_sport('sai-ncoe-dharamshala', 'volleyball');

select public.link_venue_sport('sai-ncoe-hamirpur', 'athletics');
select public.link_venue_sport('sai-ncoe-hamirpur', 'badminton');
select public.link_venue_sport('sai-ncoe-hamirpur', 'boxing');
select public.link_venue_sport('sai-ncoe-hamirpur', 'hockey');
select public.link_venue_sport('sai-ncoe-hamirpur', 'judo');
select public.link_venue_sport('sai-ncoe-hamirpur', 'wrestling');

select public.link_venue_sport('sai-ncoe-bengaluru', 'athletics');
select public.link_venue_sport('sai-ncoe-bengaluru', 'hockey');
select public.link_venue_sport('sai-ncoe-bengaluru', 'volleyball');

select public.link_venue_sport('sai-ncoe-alleppey', 'rowing');

select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'athletics');
select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'cycling');
select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'fencing');
select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'football');
select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'taekwondo');
select public.link_venue_sport('sai-ncoe-thiruvananthapuram', 'volleyball');

select public.link_venue_sport('sai-ncoe-bhopal', 'athletics');
select public.link_venue_sport('sai-ncoe-bhopal', 'hockey');
select public.link_venue_sport('sai-ncoe-bhopal', 'judo');

select public.link_venue_sport('sai-ncoe-aurangabad', 'archery');
select public.link_venue_sport('sai-ncoe-aurangabad', 'boxing');
select public.link_venue_sport('sai-ncoe-aurangabad', 'fencing');
select public.link_venue_sport('sai-ncoe-aurangabad', 'gymnastics');
select public.link_venue_sport('sai-ncoe-aurangabad', 'hockey');
select public.link_venue_sport('sai-ncoe-aurangabad', 'weightlifting');

select public.link_venue_sport('sai-ncoe-kandivali', 'hockey');
select public.link_venue_sport('sai-ncoe-kandivali', 'wrestling');

select public.link_venue_sport('sai-ncoe-imphal', 'archery');
select public.link_venue_sport('sai-ncoe-imphal', 'cycling');
select public.link_venue_sport('sai-ncoe-imphal', 'fencing');
select public.link_venue_sport('sai-ncoe-imphal', 'football');
select public.link_venue_sport('sai-ncoe-imphal', 'hockey');
select public.link_venue_sport('sai-ncoe-imphal', 'judo');
select public.link_venue_sport('sai-ncoe-imphal', 'weightlifting');

select public.link_venue_sport('sai-ncoe-jagatpur', 'rowing');

select public.link_venue_sport('sai-ncoe-patiala', 'athletics');
select public.link_venue_sport('sai-ncoe-patiala', 'cycling');
select public.link_venue_sport('sai-ncoe-patiala', 'fencing');
select public.link_venue_sport('sai-ncoe-patiala', 'weightlifting');

select public.link_venue_sport('sai-ncoe-lucknow', 'athletics');
select public.link_venue_sport('sai-ncoe-lucknow', 'hockey');
select public.link_venue_sport('sai-ncoe-lucknow', 'taekwondo');
select public.link_venue_sport('sai-ncoe-lucknow', 'weightlifting');
select public.link_venue_sport('sai-ncoe-lucknow', 'wrestling');

select public.link_venue_sport('sai-ncoe-sigra', 'boxing');
select public.link_venue_sport('sai-ncoe-sigra', 'fencing');
select public.link_venue_sport('sai-ncoe-sigra', 'shooting');
select public.link_venue_sport('sai-ncoe-sigra', 'wrestling');

select public.link_venue_sport('sai-ncoe-kolkata', 'archery');
select public.link_venue_sport('sai-ncoe-kolkata', 'athletics');
select public.link_venue_sport('sai-ncoe-kolkata', 'gymnastics');
select public.link_venue_sport('sai-ncoe-kolkata', 'hockey');
select public.link_venue_sport('sai-ncoe-kolkata', 'table-tennis');

commit;
