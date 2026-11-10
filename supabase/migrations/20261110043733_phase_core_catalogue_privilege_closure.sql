-- Close residual table-level privileges on public catalogue tables.
-- Mirrors development migration version 20261110043733.
begin;
revoke all on public.academies, public.venues, public.opportunities, public.pickup_games,
  public.coaches, public.events, public.sports, public.academy_sports,
  public.coach_academies, public.coach_sports
  from public, anon, authenticated;
grant select on public.academies, public.venues, public.opportunities, public.pickup_games,
  public.coaches, public.events, public.sports to anon, authenticated;
commit;
