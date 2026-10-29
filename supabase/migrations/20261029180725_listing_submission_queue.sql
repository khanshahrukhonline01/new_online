-- KhelGrid: private listing submission queue.
-- Public users can submit suggestions but cannot read, update, approve, or publish them.
-- Moderation must occur through a trusted server/admin process; no service key belongs in the browser.

begin;

create table if not exists public.listing_submissions (
  id uuid primary key default gen_random_uuid(),
  listing_type text not null
    check (listing_type in ('opportunity', 'venue', 'coach', 'academy', 'event')),
  title text not null check (char_length(btrim(title)) between 2 and 150),
  city text check (city is null or char_length(btrim(city)) <= 100),
  source_url text not null
    check (char_length(source_url) <= 1000 and source_url ~* '^https://'),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  moderator_notes text check (moderator_notes is null or char_length(moderator_notes) <= 2000),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending_review' and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  )
);

create index if not exists listing_submissions_status_created_idx
  on public.listing_submissions (status, created_at);

alter table public.listing_submissions enable row level security;

-- Remove any accidental pre-existing policies before defining the intended access model.
drop policy if exists listing_submissions_public_insert_pending on public.listing_submissions;
drop policy if exists listing_submissions_moderator_read on public.listing_submissions;

create policy listing_submissions_public_insert_pending
  on public.listing_submissions
  for insert to anon, authenticated
  with check (
    status = 'pending_review'
    and reviewed_at is null
    and reviewed_by is null
    and moderator_notes is null
  );

-- No SELECT, UPDATE, or DELETE policy is granted to public or authenticated roles.
revoke all on public.listing_submissions from public, anon, authenticated;
grant insert (listing_type, title, city, source_url, details)
  on public.listing_submissions to anon, authenticated;

-- The trusted service role may process the queue; never expose its key to a browser.
grant select, insert, update on public.listing_submissions to service_role;

create or replace function public.set_listing_submission_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function public.set_listing_submission_updated_at() from public, anon, authenticated;
drop trigger if exists listing_submissions_set_updated_at on public.listing_submissions;
create trigger listing_submissions_set_updated_at
  before update on public.listing_submissions
  for each row execute function public.set_listing_submission_updated_at();

commit;
