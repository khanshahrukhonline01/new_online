-- KhelGrid: enforce private participant records.
-- Safe to re-run; preserves trusted service_role/postgres access and existing
-- non-SELECT privileges. This migration must never be applied to production
-- until the production database is explicitly brought into the same release plan.
BEGIN;

ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_participants_read"
  ON public.pickup_game_participants;

REVOKE SELECT
  ON TABLE public.pickup_game_participants
  FROM PUBLIC, anon, authenticated;

-- Remove any column-level SELECT grants for public API roles as defense in depth.
DO $$
DECLARE
  privilege_row record;
BEGIN
  FOR privilege_row IN
    SELECT DISTINCT grantee, column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'pickup_game_participants'
      AND privilege_type = 'SELECT'
      AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  LOOP
    IF privilege_row.grantee = 'PUBLIC' THEN
      EXECUTE format(
        'REVOKE SELECT (%I) ON TABLE public.pickup_game_participants FROM PUBLIC',
        privilege_row.column_name
      );
    ELSE
      EXECUTE format(
        'REVOKE SELECT (%I) ON TABLE public.pickup_game_participants FROM %I',
        privilege_row.column_name,
        privilege_row.grantee
      );
    END IF;
  END LOOP;
END
$$;

-- Fail closed if either public API role retains table- or column-level SELECT.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.pickup_game_participants', 'SELECT')
     OR has_any_column_privilege('anon', 'public.pickup_game_participants', 'SELECT')
     OR has_table_privilege('authenticated', 'public.pickup_game_participants', 'SELECT')
     OR has_any_column_privilege('authenticated', 'public.pickup_game_participants', 'SELECT')
  THEN
    RAISE EXCEPTION
      'Participant privacy check failed: anon/authenticated still has SELECT privilege';
  END IF;
END
$$;

COMMIT;
