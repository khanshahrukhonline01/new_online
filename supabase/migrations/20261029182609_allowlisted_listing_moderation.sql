-- KhelGrid: authenticated, allowlisted listing moderation RPCs.
-- Auth remains paused for public users; no moderator can act until an existing auth.users
-- account is explicitly allowlisted by a trusted database operator.
begin;

create table if not exists public.listing_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.listing_moderators enable row level security;
revoke all on public.listing_moderators from public, anon, authenticated;
grant select, insert, update, delete on public.listing_moderators to service_role;

create or replace function public.is_listing_moderator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.listing_moderators m
    where m.user_id = auth.uid()
      and m.is_active = true
  );
$function$;

revoke all on function public.is_listing_moderator() from public, anon;
grant execute on function public.is_listing_moderator() to authenticated, service_role;

create or replace function public.get_listing_submissions()
returns table (
  id uuid,
  listing_type text,
  title text,
  city text,
  source_url text,
  details text,
  status text,
  moderator_notes text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  return query
    select s.id, s.listing_type, s.title, s.city, s.source_url, s.details,
           s.status, s.moderator_notes, s.created_at, s.reviewed_at, s.reviewed_by
    from public.listing_submissions s
    order by (s.status = 'pending_review') desc, s.created_at asc;
end;
$function$;

revoke all on function public.get_listing_submissions() from public, anon;
grant execute on function public.get_listing_submissions() to authenticated, service_role;

create or replace function public.review_listing_submission(
  p_submission_id uuid,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'Moderator notes must be 2000 characters or fewer' using errcode = '22023';
  end if;

  update public.listing_submissions
     set status = p_decision,
         moderator_notes = nullif(btrim(p_notes), ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_submission_id
     and status = 'pending_review';

  if not found then
    raise exception 'Pending submission not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.review_listing_submission(uuid, text, text) from public, anon;
grant execute on function public.review_listing_submission(uuid, text, text) to authenticated, service_role;

commit;
