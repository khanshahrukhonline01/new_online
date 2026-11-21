-- KhelGrid Phase 1: restrict projection synchronization to its database trigger.
-- Safe to apply only after 20261121230000_phase1_tenant_public_directory_projection_table.
BEGIN;

ALTER FUNCTION public.sync_tenant_public_directory()
  SET search_path = pg_catalog, pg_temp;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.sync_tenant_public_directory()
  FROM PUBLIC, anon, authenticated;

-- service_role is not present in the isolated PostgreSQL CI fixture.
-- Revoke its direct grant conditionally when it exists (Supabase).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON FUNCTION public.sync_tenant_public_directory() FROM service_role';
  END IF;
END
$$;

DO $$
DECLARE
  v_config text[];
BEGIN
  SELECT p.proconfig INTO v_config
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.sync_tenant_public_directory()'::regprocedure;

  IF v_config IS NULL OR NOT ('search_path=pg_catalog, pg_temp' = ANY(v_config)) THEN
    RAISE EXCEPTION 'Projection trigger function search_path is not hardened';
  END IF;

  IF has_function_privilege('anon', 'public.sync_tenant_public_directory()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.sync_tenant_public_directory()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Client roles must not execute projection trigger function directly';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role')
     AND has_function_privilege('service_role', 'public.sync_tenant_public_directory()', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must not execute projection trigger function directly';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid = 'public.tenants'::regclass
      AND t.tgname = 'trg_sync_tenant_public_directory'
      AND NOT t.tgisinternal
      AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Expected enabled tenant projection synchronization trigger';
  END IF;
END
$$;

COMMIT;
