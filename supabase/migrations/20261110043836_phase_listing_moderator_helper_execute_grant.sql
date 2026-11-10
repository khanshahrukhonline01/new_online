-- Restrict moderator helper execution to authenticated users.
-- Mirrors development migration version 20261110043836.
begin;
revoke all on function public.is_listing_moderator() from public, anon;
grant execute on function public.is_listing_moderator() to authenticated;
commit;
