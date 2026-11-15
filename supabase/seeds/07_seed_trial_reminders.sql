-- ============================================================================
-- KhelGrid Seeds: Step 07 - Selection Trial Alerts & Deadline Reminders
-- Runner: Run in Supabase SQL Editor
-- ============================================================================

begin;

-- 1. Selection Trial Reminders Table
create table if not exists public.trial_reminders (
  id uuid primary key default gen_random_uuid(),
  trial_slug text not null,
  trial_title text not null check (
    char_length(trim(trial_title)) between 2 and 200
  ),
  starts_at timestamptz,
  deadline_date timestamptz,
  city text,
  venue_name text,
  notification_type text not null default 'whatsapp' check (
    notification_type in ('whatsapp', 'google-calendar', 'ical')
  ),
  athlete_phone text check (
    athlete_phone is null or athlete_phone ~ '^[0-9+ -]{7,20}$'
  ),
  athlete_email text check (
    athlete_email is null or athlete_email ~ '^[^@]+@[^@]+\.[^@]+$'
  ),
  alert_window_hours integer not null default 48 check (
    alert_window_hours between 1 and 168
  ),
  status text not null default 'pending' check (
    status in ('pending', 'delivered', 'dismissed', 'failed')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists trial_reminders_trial_slug_idx 
  on public.trial_reminders (trial_slug);

create index if not exists trial_reminders_notification_type_idx 
  on public.trial_reminders (notification_type);

create index if not exists trial_reminders_status_idx 
  on public.trial_reminders (status);

create index if not exists trial_reminders_deadline_date_idx 
  on public.trial_reminders (deadline_date asc);

-- 3. Row Level Security
alter table public.trial_reminders enable row level security;

drop policy if exists "trial_reminders_public_insert" on public.trial_reminders;
create policy "trial_reminders_public_insert" on public.trial_reminders
  for insert to anon, authenticated 
  with check (true);

drop policy if exists "trial_reminders_public_read" on public.trial_reminders;
create policy "trial_reminders_public_read" on public.trial_reminders
  for select to anon, authenticated 
  using (true);

drop policy if exists "trial_reminders_authenticated_update" on public.trial_reminders;
create policy "trial_reminders_authenticated_update" on public.trial_reminders
  for update to authenticated 
  using (true)
  with check (true);

grant select, insert on public.trial_reminders to anon, authenticated;
grant update on public.trial_reminders to authenticated;

-- 4. Seed Subscriptions
insert into public.trial_reminders (
  trial_slug, trial_title, starts_at, deadline_date, city, venue_name,
  notification_type, athlete_phone, alert_window_hours, status, metadata
)
values
  (
    'delhi-state-cricket-selection-trials-u19',
    'Delhi State Cricket Association U-19 Selection Trials',
    '2026-11-15T08:30:00Z',
    '2026-11-12T18:00:00Z',
    'New Delhi',
    'Feroz Shah Kotla Ground / Karnail Singh Stadium',
    'whatsapp',
    '+91-98765-43210',
    48,
    'pending',
    '{"ageCategory": "Under-19", "kitRequired": "Whites & Spike Shoes", "reportingTime": "07:30 AM"}'::jsonb
  ),
  (
    'gopichand-badminton-academy-national-selection',
    'National Junior Badminton Selection Trials 2026',
    '2026-11-20T09:00:00Z',
    '2026-11-17T23:59:00Z',
    'Hyderabad',
    'Pullela Gopichand Badminton Academy, Gachibowli',
    'google-calendar',
    null,
    48,
    'pending',
    '{"ageCategory": "Sub-Junior / Junior", "discipline": "Singles & Doubles", "courtSurface": "Yonex Wooden Flooring"}'::jsonb
  ),
  (
    'sai-ncoe-athletics-combine-trials-punjab',
    'SAI NCOE Athletics Sprint & Jump Talent Identification Trials',
    '2026-11-25T07:00:00Z',
    '2026-11-22T20:00:00Z',
    'Jalandhar',
    'SAI National Centre of Excellence Synthetic Track',
    'ical',
    null,
    48,
    'pending',
    '{"ageCategory": "U-16 & U-18", "events": "100m, 200m, 400m, Long Jump", "equipment": "Synthetic Spikes Allowed"}'::jsonb
  )
on conflict do nothing;

commit;
