-- ==============================================================================
-- KhelGrid Module: Seasonal Site Announcements & Featured Banners
-- Purpose: Creates public.site_announcements table with date range scheduling,
-- tone accents, and high-priority seasonal event notifications.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
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
  updated_at timestamptz not null default now()
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

grant select, insert on public.site_announcements to anon, authenticated;

create index if not exists idx_site_announcements_active_dates
  on public.site_announcements (is_active, starts_at, ends_at, priority desc);

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
    'winter-grassroots-camps-2026',
    'Grassroots Camps',
    'Winter National Sports Academies Open Admissions',
    'Verified multi-sport academies offering high-performance coaching across India.',
    'Find Academies',
    '/academies',
    'indigo',
    now() - interval '1 day',
    now() + interval '30 days',
    90,
    true
  )
on conflict (slug) do nothing;

commit;
