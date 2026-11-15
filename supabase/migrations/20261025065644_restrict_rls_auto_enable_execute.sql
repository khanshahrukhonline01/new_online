-- Khelgrid Platform: restrict direct API execution of the automatic RLS event-trigger function.
-- Applied to the independent Supabase project hznsbxvovjxvmnchzzqt as migration
-- 20261025065644. PostgreSQL invokes the function through its registered event trigger;
-- anon, authenticated, and service_role do not need direct EXECUTE permission.

begin;

revoke all privileges on function public.rls_auto_enable() from public;
revoke all privileges on function public.rls_auto_enable() from anon;
revoke all privileges on function public.rls_auto_enable() from authenticated;
revoke all privileges on function public.rls_auto_enable() from service_role;

commit;
