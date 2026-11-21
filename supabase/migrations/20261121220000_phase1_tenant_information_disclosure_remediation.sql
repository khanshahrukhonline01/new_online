-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Tenant Information Disclosure Remediation
-- Migration: 20261121220000_phase1_tenant_information_disclosure_remediation.sql
-- 
-- Remediation:
-- 1. Eliminates broad 'OR status = active' clause from public.tenants SELECT policy,
--    preventing unrelated authenticated users from viewing private tenant columns
--    (owner_id, contact_phone, contact_email, upi_vpa, metadata).
-- 2. Hardens public.is_tenant_member() to verify both active membership status
--    and active tenant status, ensuring suspended tenants' operational data is locked.
-- 3. Dependency-safe public.tenant_public_directory security barrier view update
--    (ZERO CASCADE). Uses CREATE OR REPLACE VIEW with an explicit column allowlist.
-- 4. Grants SELECT on public.tenant_public_directory to anon and authenticated.
-- 5. Ensures strict least-privilege permissions on public.tenants.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. HARDEN SERVER-SIDE MEMBERSHIP & TENANT STATUS VALIDATION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships m
    JOIN public.tenants t ON t.id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND t.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. REMEDIATE PUBLIC.TENANTS SELECT POLICY (PRIVATE TABLE PROTECTION)
-- -----------------------------------------------------------------------------
-- Drop previous policy that permitted any authenticated user to view active tenants
DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;

-- Create hardened policy: ONLY verified active members of active tenants,
-- or the tenant owner, can view private tenant rows.
CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(id) OR
    owner_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 3. DEPENDENCY-SAFE PUBLIC TENANT DIRECTORY PROJECTION (SECURITY BARRIER VIEW)
-- -----------------------------------------------------------------------------
-- Dependency-safe inspection: Fail closed if unexpected incompatible dependents exist
DO $$
DECLARE
  v_dep_count integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_public_directory'
  ) THEN
    SELECT count(*) INTO v_dep_count
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class c ON c.oid = r.ev_class
    WHERE d.refobjid = 'public.tenant_public_directory'::regclass
      AND c.relname != 'tenant_public_directory';

    IF v_dep_count > 0 THEN
      RAISE EXCEPTION 'Safety check failed: public.tenant_public_directory has % dependent objects. Aborting non-destructive migration.', v_dep_count;
    END IF;
  END IF;
END $$;

-- Safe in-place view update (ZERO CASCADE) with explicit column allowlist
CREATE OR REPLACE VIEW public.tenant_public_directory
WITH (security_barrier = true) AS
SELECT
  id,
  slug,
  name,
  tenant_type,
  sport,
  city,
  state,
  status,
  created_at
FROM public.tenants
WHERE status = 'active';

-- Explicit comments documenting security invariants
COMMENT ON VIEW public.tenant_public_directory IS 
'Public directory projection of active tenants. Exposes only safe public discovery metadata. Strictly excludes owner_id, contact_phone, contact_email, upi_vpa, and metadata.';

-- -----------------------------------------------------------------------------
-- 4. LEAST-PRIVILEGE ROLE GRANTS
-- -----------------------------------------------------------------------------
-- Ensure public.tenants table remains completely inaccessible to anon
REVOKE ALL ON public.tenants FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;

-- Configure public directory view access (Read-only for public discovery)
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERIES (RUN POST-MIGRATION):
-- 1. Verify view definition and security_barrier option:
--    SELECT relname, reloptions FROM pg_class WHERE relname = 'tenant_public_directory';
-- 2. Verify column exclusion:
--    SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_public_directory';
-- 3. Verify public.tenants RLS policies:
--    SELECT policyname, qual FROM pg_policies WHERE tablename = 'tenants';
-- ==============================================================================
-- ROLLBACK PLAN (IF REQUIRED):
-- BEGIN;
-- DROP VIEW IF EXISTS public.tenant_public_directory;
-- CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
-- RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
--   SELECT EXISTS (SELECT 1 FROM public.tenant_memberships WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND status = 'active');
-- $$;
-- DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;
-- CREATE POLICY "tenants_member_select" ON public.tenants FOR SELECT TO authenticated
--   USING (public.is_tenant_member(id) OR owner_id = auth.uid());
-- COMMIT;
-- ==============================================================================
