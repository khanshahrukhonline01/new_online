-- Correct Phase A's initial broad sequence USAGE grant.
-- All current public IDs use UUID defaults, so browser roles need no sequence access.
BEGIN;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
COMMIT;
