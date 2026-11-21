-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1 Multi-Tenant RLS & Architectural Assertions
-- Target: Real PostgreSQL Engine (CI / Isolated Environment)
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_bad text;
  v_count integer;
BEGIN
  -- 1. Ensure RLS is enabled on all 8 Phase 1 multi-tenant tables
  SELECT string_agg(c.relname, ', ')
    INTO v_bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'tenants', 'tenant_memberships', 'tenant_batches', 'tenant_students',
      'tenant_enquiries', 'tenant_fee_invoices', 'tenant_fee_transactions',
      'tenant_attendance_events'
    )
    AND NOT c.relrowsecurity;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 1 Gate A: RLS disabled on tenant tables: %', v_bad;
  END IF;

  -- 2. Verify all 8 tables are present
  SELECT count(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'tenants', 'tenant_memberships', 'tenant_batches', 'tenant_students',
      'tenant_enquiries', 'tenant_fee_invoices', 'tenant_fee_transactions',
      'tenant_attendance_events'
    );

  IF v_count != 8 THEN
    RAISE EXCEPTION 'Phase 1 Gate B: Expected 8 tenant tables, found %', v_count;
  END IF;

  -- 3. Verify anonymous cannot SELECT from private tenant tables
  IF has_table_privilege('anon', 'public.tenants', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_memberships', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_batches', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_students', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_enquiries', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_fee_invoices', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_fee_transactions', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_attendance_events', 'SELECT') THEN
    RAISE EXCEPTION 'Phase 1 Gate C: Anonymous role holds unauthorized SELECT privilege on tenant tables';
  END IF;

  -- 4. Verify anonymous cannot INSERT into private operational tables
  IF has_table_privilege('anon', 'public.tenant_memberships', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_batches', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_students', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_fee_invoices', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_fee_transactions', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_attendance_events', 'INSERT') THEN
    RAISE EXCEPTION 'Phase 1 Gate D: Anonymous role holds unauthorized INSERT privilege on private tables';
  END IF;

  -- 5. Verify function execution grants (least-privilege)
  IF has_function_privilege('anon', 'public.is_tenant_member(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.has_tenant_role(uuid, text[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 1 Gate E: Anonymous role holds EXECUTE on privileged tenant RPCs';
  END IF;

  IF NOT has_function_privilege('anon', 'public.is_active_tenant(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 1 Gate F: Anonymous role missing required EXECUTE on is_active_tenant';
  END IF;

  -- 6. Verify composite foreign keys enforce ON DELETE RESTRICT on batch deletion
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_student_tenant_batch'
      AND confdeltype = 'r'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate G: fk_student_tenant_batch is not configured with ON DELETE RESTRICT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_attendance_tenant_batch'
      AND confdeltype = 'r'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate H: fk_attendance_tenant_batch is not configured with ON DELETE RESTRICT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_invoice_tenant_student'
      AND confdeltype = 'r'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate I: fk_invoice_tenant_student is not configured with ON DELETE RESTRICT';
  END IF;

  -- 7. Verify composite unique constraints exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_batch')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_student')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_fee_invoice')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_attendance_session') THEN
    RAISE EXCEPTION 'Phase 1 Gate J: Missing composite unique constraints for tenant integrity';
  END IF;

  -- 8. Verify function search paths are immutable and locked
  SELECT string_agg(p.proname, ', ')
    INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('is_tenant_member', 'has_tenant_role', 'is_active_tenant', 'provision_initial_tenant_owner')
    AND (p.proconfig IS NULL OR NOT ARRAY['search_path=public, pg_temp']::text[] <@ p.proconfig);

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 1 Gate K: Functions without locked search_path: %', v_bad;
  END IF;

  -- 9. Verify tenant_public_directory exists with RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_public_directory'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate L: public.tenant_public_directory does not exist';
  END IF;

  -- 10. Verify tenant_public_directory does NOT expose private tenant columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenant_public_directory'
      AND column_name IN ('owner_id', 'contact_phone', 'contact_email', 'upi_vpa', 'metadata')
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate M: tenant_public_directory exposes sensitive private columns';
  END IF;

  -- 11. Verify tenants RLS policy does NOT contain the broad 'status = active' leak
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenants'
      AND policyname = 'tenants_member_select'
      AND qual ILIKE '%status = ''active''%'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate N: tenants_member_select still contains status = active leakage';
  END IF;

  -- 12. Verify tenants_member_select strictly checks membership or owner_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenants'
      AND policyname = 'tenants_member_select'
      AND qual ILIKE '%is_tenant_member%'
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate O: tenants_member_select does not enforce is_tenant_member()';
  END IF;


  -- 13. Verify projection trigger function is trigger-only and hardened.
  IF has_function_privilege('anon', 'public.sync_tenant_public_directory()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.sync_tenant_public_directory()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 1 Gate P: Client role can directly execute projection trigger function';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.sync_tenant_public_directory()'::regprocedure
      AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp']::text[]
  ) THEN
    RAISE EXCEPTION 'Phase 1 Gate Q: Projection trigger function search_path is not hardened';
  END IF;

  IF has_table_privilege('anon', 'public.tenant_public_directory', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'UPDATE')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'DELETE')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'INSERT')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'DELETE') THEN
    RAISE EXCEPTION 'Phase 1 Gate R: Client role has direct write access to public directory projection';
  END IF;

  RAISE NOTICE 'Phase 1 Multi-Tenant RLS & Architectural Assertions: ALL GATES PASSED.';
END $$;


-- 14. Exercise real trigger lifecycle in this isolated transaction.
DO $$
DECLARE
  v_test_id uuid := gen_random_uuid();
  v_slug text;
  v_name text;
BEGIN
  v_slug := 'phase1-trigger-' || replace(v_test_id::text, '-', '');

  INSERT INTO public.tenants (id, slug, name, tenant_type, status)
  VALUES (v_test_id, v_slug, 'Phase 1 Trigger Test', 'academy', 'pending_verification');

  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Projection trigger leaked a pending tenant';
  END IF;

  UPDATE public.tenants SET status = 'active' WHERE id = v_test_id;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id AND status = 'active') THEN
    RAISE EXCEPTION 'Projection trigger did not publish an active tenant';
  END IF;

  UPDATE public.tenants SET name = 'Phase 1 Trigger Updated' WHERE id = v_test_id;
  SELECT name INTO v_name FROM public.tenant_public_directory WHERE id = v_test_id;
  IF v_name IS DISTINCT FROM 'Phase 1 Trigger Updated' THEN
    RAISE EXCEPTION 'Projection trigger did not synchronize tenant updates';
  END IF;

  UPDATE public.tenants SET status = 'suspended' WHERE id = v_test_id;
  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Projection trigger retained a suspended tenant';
  END IF;

  UPDATE public.tenants SET status = 'active' WHERE id = v_test_id;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Projection trigger did not restore a reactivated tenant';
  END IF;

  DELETE FROM public.tenants WHERE id = v_test_id;
  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Projection trigger retained a deleted tenant';
  END IF;
END
$$;

COMMIT;
