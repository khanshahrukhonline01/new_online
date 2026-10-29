-- Harden the allowlisted moderation boundary after security-advisor review.
begin;

drop policy if exists listing_moderators_deny_api_access on public.listing_moderators;
create policy listing_moderators_deny_api_access
  on public.listing_moderators
  for all to anon, authenticated
  using (false)
  with check (false);

revoke all on function public.is_listing_moderator() from public, anon, authenticated;

revoke all on function public.get_listing_submissions() from public, anon, service_role;
grant execute on function public.get_listing_submissions() to authenticated;

revoke all on function public.review_listing_submission(uuid, text, text) from public, anon, service_role;
grant execute on function public.review_listing_submission(uuid, text, text) to authenticated;

commit;
