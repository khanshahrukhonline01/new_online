-- Replace guarded SECURITY DEFINER RPCs with invoker functions and RLS-backed authorization.
begin;

drop policy if exists listing_moderators_deny_api_access on public.listing_moderators;
drop policy if exists listing_moderators_read_own_membership on public.listing_moderators;
create policy listing_moderators_read_own_membership
  on public.listing_moderators for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.listing_moderators to authenticated;
revoke insert, update, delete on public.listing_moderators from anon, authenticated;

create or replace function public.is_listing_moderator()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $function$
  select exists (
    select 1 from public.listing_moderators m
    where m.user_id = (select auth.uid()) and m.is_active = true
  );
$function$;
revoke all on function public.is_listing_moderator() from public, anon;
grant execute on function public.is_listing_moderator() to authenticated;

drop policy if exists listing_submissions_moderator_read on public.listing_submissions;
create policy listing_submissions_moderator_read
  on public.listing_submissions for select to authenticated
  using ((select public.is_listing_moderator()));

drop policy if exists listing_submissions_moderator_update on public.listing_submissions;
create policy listing_submissions_moderator_update
  on public.listing_submissions for update to authenticated
  using ((select public.is_listing_moderator()) and status = 'pending_review')
  with check (
    (select public.is_listing_moderator())
    and status in ('approved', 'rejected')
    and reviewed_at is not null
    and reviewed_by = (select auth.uid())
  );

grant select on public.listing_submissions to authenticated;
grant update (status, moderator_notes, reviewed_at, reviewed_by)
  on public.listing_submissions to authenticated;

create or replace function public.enforce_listing_moderation_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if auth.uid() is null or not public.is_listing_moderator() then
    raise exception 'Not authorized to moderate listings' using errcode = '42501';
  end if;
  if old.status <> 'pending_review' or new.status not in ('approved', 'rejected') then
    raise exception 'Only pending submissions may be approved or rejected' using errcode = '22023';
  end if;
  if new.reviewed_by is distinct from auth.uid() or new.reviewed_at is null then
    raise exception 'Review metadata must identify the authenticated moderator' using errcode = '22023';
  end if;
  if new.moderator_notes is not null and char_length(new.moderator_notes) > 2000 then
    raise exception 'Moderator notes must be 2000 characters or fewer' using errcode = '22023';
  end if;
  if new.id is distinct from old.id
    or new.listing_type is distinct from old.listing_type
    or new.title is distinct from old.title
    or new.city is distinct from old.city
    or new.source_url is distinct from old.source_url
    or new.details is distinct from old.details
    or new.created_at is distinct from old.created_at then
    raise exception 'Moderation cannot change submitted listing details' using errcode = '22023';
  end if;
  return new;
end;
$function$;
revoke all on function public.enforce_listing_moderation_transition() from public, anon, authenticated;
drop trigger if exists listing_submissions_enforce_moderation_transition on public.listing_submissions;
create trigger listing_submissions_enforce_moderation_transition
  before update on public.listing_submissions
  for each row execute function public.enforce_listing_moderation_transition();

create or replace function public.get_listing_submissions()
returns table (
  id uuid, listing_type text, title text, city text, source_url text,
  details text, status text, moderator_notes text, created_at timestamptz,
  reviewed_at timestamptz, reviewed_by uuid
)
language sql
stable
security invoker
set search_path = pg_catalog
as $function$
  select s.id, s.listing_type, s.title, s.city, s.source_url, s.details,
         s.status, s.moderator_notes, s.created_at, s.reviewed_at, s.reviewed_by
  from public.listing_submissions s
  order by (s.status = 'pending_review') desc, s.created_at asc;
$function$;
revoke all on function public.get_listing_submissions() from public, anon, service_role;
grant execute on function public.get_listing_submissions() to authenticated;

create or replace function public.review_listing_submission(
  p_submission_id uuid, p_decision text, p_notes text default null
)
returns void
language plpgsql
security invoker
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
   where id = p_submission_id and status = 'pending_review';
  if not found then
    raise exception 'Pending submission not found' using errcode = 'P0002';
  end if;
end;
$function$;
revoke all on function public.review_listing_submission(uuid, text, text) from public, anon, service_role;
grant execute on function public.review_listing_submission(uuid, text, text) to authenticated;

commit;
