-- =============================================================================
-- Phase 3 prerequisite: user-scoped notifications for listing moderation
-- Creates/normalizes the notification inbox before Phase 3 RPCs reference it.
-- =============================================================================
begin;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null check (char_length(btrim(title)) between 2 and 200),
  message text not null check (char_length(btrim(message)) >= 2),
  action_url text check (action_url is null or action_url ~ '^(/|https?://)'),
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Older catalogue setup allowed only the original inbox categories.
-- Replace that check so moderation notifications emitted by Phase 3 are valid.
alter table public.user_notifications
  drop constraint if exists user_notifications_category_check;

alter table public.user_notifications
  add constraint user_notifications_category_check
  check (category in (
    'system', 'opportunity', 'pickup_game', 'booking',
    'verification', 'message', 'moderation'
  ));

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_read_own on public.user_notifications;
create policy user_notifications_read_own
  on public.user_notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
  on public.user_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Clients may read/update only their own inbox rows. Inserts are reserved for
-- trusted SECURITY DEFINER moderation RPCs; no direct client insert is granted.
revoke all on public.user_notifications from public, anon;
revoke insert, delete on public.user_notifications from authenticated;
grant select, update on public.user_notifications to authenticated;

commit;
