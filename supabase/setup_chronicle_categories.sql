-- ==============================================================================
-- KhelGrid Module: KhelChronicle Research Taxonomy Categories
-- Purpose: Creates public.chronicle_categories table with the 6 core Indian
-- sports science disciplines (Biomechanics, Physiology, Nutrition, Psychology, Medicine, Analytics).
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

create table if not exists public.chronicle_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'award',
  color text not null default '#059669',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.chronicle_categories enable row level security;

drop policy if exists "chronicle_categories_read_all" on public.chronicle_categories;
create policy "chronicle_categories_read_all" on public.chronicle_categories
  for select to anon, authenticated
  using (is_active = true);

grant select on public.chronicle_categories to anon, authenticated;

insert into public.chronicle_categories (id, slug, name, description, icon, color, sort_order, is_active)
values
  ('cat-biomechanics', 'sports-biomechanics', 'Sports Biomechanics', 'Kinematics, inverse dynamics, ground reaction forces, and joint kinetics in Indian sports.', 'activity', '#0284c7', 1, true),
  ('cat-physiology', 'exercise-physiology', 'Exercise Physiology', 'Cardiovascular conditioning, aerobic endurance, VO2 max kinetics, and heat acclimatization.', 'zap', '#059669', 2, true),
  ('cat-nutrition', 'sports-nutrition', 'Sports Nutrition', 'Energy balance, hydration strategies, macro/micronutrient profiling, and dietary periodization.', 'heart', '#d97706', 3, true),
  ('cat-psychology', 'sports-psychology', 'Sports Psychology', 'Competitive anxiety, mental resilience, attentional focus, and athletic cognitive performance.', 'smile', '#7c3aed', 4, true),
  ('cat-medicine', 'sports-medicine', 'Sports Medicine', 'Injury epidemiology, musculoskeletal rehabilitation, return-to-play protocols.', 'shield', '#dc2626', 5, true),
  ('cat-analytics', 'sports-analytics', 'Sports Analytics', 'Predictive talent modeling, tracking data science, and performance probability matrices.', 'bar-chart', '#0d9488', 6, true)
on conflict (slug) do nothing;

commit;
