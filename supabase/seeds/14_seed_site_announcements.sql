-- ==============================================================================
-- Seed: 14_seed_site_announcements.sql
-- Description: Standalone seed for seasonal banners and top-bar announcements
-- ==============================================================================

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
