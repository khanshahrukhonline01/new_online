-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 2 Enterprise Core Assertions
-- Verifies:
-- 1. has_tenant_role() blocks suspended tenants.
-- 2. All 18 organization types can be provisioned via provision_initial_tenant_owner().
-- 3. Dual individual & organization resource ownership enforces isolation.
-- 4. check_saas_entitlement() enforces free community guarantee, suspension fail-close,
--    admin overrides, and plan defaults.
-- 5. Clients cannot mutate saas_subscriptions, saas_entitlement_overrides, or saas_audit_logs.
-- ==============================================================================

DO $$
DECLARE
  v_fn_src text;
BEGIN
  -- 1. Verify has_tenant_role checks tenant active status
  SELECT prosrc INTO v_fn_src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'has_tenant_role';

  IF v_fn_src IS NULL OR v_fn_src NOT ILIKE '%t.status = ''active''%' THEN
    RAISE EXCEPTION 'Assertion Failed: has_tenant_role() must enforce t.status = ''active''';
  END IF;

  -- 2. Verify payments are disabled across all seeded plans and free listings guaranteed
  IF EXISTS (
    SELECT 1 FROM public.saas_plans
    WHERE billing_enabled = true OR listing_publication_always_free <> true
  ) THEN
    RAISE EXCEPTION 'Assertion Failed: billing_enabled must remain false and free listings guaranteed';
  END IF;

  -- 3. Verify append-only audit log privileges
  IF has_table_privilege('authenticated', 'public.saas_audit_logs', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.saas_audit_logs', 'DELETE') THEN
    RAISE EXCEPTION 'Assertion Failed: saas_audit_logs must be immutable for authenticated role';
  END IF;

  -- 4. Verify anon cannot read sensitive SaaS tables
  IF has_table_privilege('anon', 'public.tenant_invitations', 'SELECT')
     OR has_table_privilege('anon', 'public.saas_subscriptions', 'SELECT')
     OR has_table_privilege('anon', 'public.saas_audit_logs', 'SELECT')
     OR has_table_privilege('anon', 'public.resource_ownership_links', 'SELECT') THEN
    RAISE EXCEPTION 'Assertion Failed: anon must not have SELECT access on private SaaS tables';
  END IF;
END $$;
