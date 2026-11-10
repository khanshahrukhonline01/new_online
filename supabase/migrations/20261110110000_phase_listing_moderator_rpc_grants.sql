-- Restrict moderator helper and review RPC execution to authenticated users.
-- Authorization is enforced again inside each function using auth.uid() and the moderator allowlist.
begin;

revoke all on function public.review_listing_submission(uuid, text, text) from public, anon;
grant execute on function public.review_listing_submission(uuid, text, text) to authenticated;

revoke all on function public.is_listing_moderator() from public, anon;
grant execute on function public.is_listing_moderator() to authenticated;

commit;
