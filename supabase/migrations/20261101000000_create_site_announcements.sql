-- ==============================================================================
-- Migration: 20261101000000_create_site_announcements.sql
-- Description: Create public.site_announcements table with RLS, date constraints,
-- tone accents, and verified seasonal seed announcements.
-- ==============================================================================

begin;

create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  badge text not null default 'Featured',
  title text not null check (char_length(trim(title)) between 2 and 200),
  subtitle text,
  cta_label text not null default 'Explore Now',
  cta_url text not null,
  tone text not null default 'emerald'
    check (tone in ('emerald', 'amber', 'indigo', 'rose', 'cyan')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

alter table public.site_announcements enable row level security;

drop policy if exists "announcements_read_active" on public.site_announcements;
create policy "announcements_read_active" on public.site_announcements
  for select to anon, authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "announcements_insert_community" on public.site_announcements;
create policy "announcements_insert_community" on public.site_announcements
  for insert to anon, authenticated
  with check (
    char_length(trim(title)) >= 2
    and char_length(trim(cta_url)) >= 1
  );

grant select, insert on public.site_announcements to anon, authenticated;

create index if not exists idx_site_announcements_active_dates
  on public.site_announcements (is_active, starts_at, ends_at, priority desc);

-- Seed baseline verified seasonal announcements
insert into public.site_announcements (
  slug, badge, title, subtitle, cta_label, cta_url, tone, starts_at, ends_at, priority, is_active
) values
  (
    'delhi-state-trials-open-2026',
    'State Trials Open',
    'Delhi State U-17 Football Trials Registration Open',
    'Official AIFF & DSA affiliated state trials commencing across Delhi NCR hubs.',
    'View Trials',
    '/opportunities?city=Delhi',
    'emerald',
    now() - interval '1 day',
    now() + interval '30 days',
    100,
    true
  ),
  (
    'isl-matchday-live-screenings',
    'Live Matchday',
    'ISL 2026 Live Match Center & Screening Lounges',
    'Real-time scores, verified match stats, and fan fan-zones across 16 metro cities.',
    'Go to Match Center',
    '/live',
    'indigo',
    now() - interval '1 day',
    now() + interval '60 days',
    90,
    true
  ),
  (
    'bengaluru-monsoon-pickleball-cup',
    'Championship Alert',
    'Bengaluru Community Pickleball & Box Cricket Open',
    'Join open doubles brackets and mixed pickup games at FerroHub and Kicks on Grass.',
    'Join a Game',
    '/play',
    'amber',
    now() - interval '1 day',
    now() + interval '45 days',
    80,
    true
  ),
  (
    'sai-national-scouting-camps',
    'SAI Scouting Alert',
    'National Sports Talent Scouting Camps Underway',
    'SAI NCOE academies scout junior athletes across 14 Olympic and national sports.',
    'Explore Camps',
    '/opportunities',
    'rose',
    now() - interval '1 day',
    now() + interval '90 days',
    70,
    true
  )
on conflict (slug) do update set
  badge = excluded.badge,
  title = excluded.title,
  subtitle = excluded.subtitle,
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  tone = excluded.tone,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  priority = excluded.priority,
  is_active = excluded.is_active;

commit;
