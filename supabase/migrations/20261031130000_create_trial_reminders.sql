-- Migration: 20261031130000_create_trial_reminders.sql
-- Description: Selection trial deadline notifications, WhatsApp & calendar alert queues
begin;

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

-- Performance Indexes
create index if not exists trial_reminders_trial_slug_idx 
  on public.trial_reminders (trial_slug);

create index if not exists trial_reminders_notification_type_idx 
  on public.trial_reminders (notification_type);

create index if not exists trial_reminders_status_idx 
  on public.trial_reminders (status);

create index if not exists trial_reminders_deadline_date_idx 
  on public.trial_reminders (deadline_date asc);

-- Row Level Security
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

commit;
