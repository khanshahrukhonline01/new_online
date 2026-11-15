-- Restrict review RPC execution to authenticated users.
-- Mirrors development migration version 20261110043804.
begin;
revoke all on function public.review_listing_submission(uuid, text, text) from public, anon;
grant execute on function public.review_listing_submission(uuid, text, text) to authenticated;
commit;
