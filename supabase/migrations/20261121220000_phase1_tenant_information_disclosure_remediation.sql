-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Tenant Information Disclosure Remediation
-- Migration: 20261121220000_phase1_tenant_information_disclosure_remediation.sql
-- 
-- Remediation:
-- 1. Eliminates broad 'OR status = active' clause from public.tenants SELECT policy,
--    preventing unrelated authenticated users from viewing private tenant columns
--    (owner_id, contact_phone, contact_email, upi_vpa, metadata).
-- 2. Introduces public.tenant_public_directory security barrier view exposing ONLY
--    an explicit allowlist of non-sensitive columns for active tenants.
-- 3. Grants SELECT on public.tenant_public_directory to anon and authenticated.
-- 4. Ensures strict least-privilege permissions on public.tenants.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. REMEDIATE PUBLIC.TENANTS SELECT POLICY
-- -----------------------------------------------------------------------------
-- Drop previous policy that permitted any authenticated user to view active tenants
DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;

-- Create hardened policy: ONLY verified active members or the tenant owner can view private tenant rows
CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(id) OR
    owner_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 2. CREATE PUBLIC TENANT DIRECTORY PROJECTION (SECURITY BARRIER VIEW)
-- -----------------------------------------------------------------------------
-- Drop view if exists
DROP VIEW IF EXISTS public.tenant_public_directory CASCADE;

-- Create security barrier view with an explicit allowlist of non-sensitive fields
CREATE VIEW public.tenant_public_directory
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
-- 3. LEAST-PRIVILEGE ROLE GRANTS
-- -----------------------------------------------------------------------------
-- Ensure public.tenants table remains completely inaccessible to anon
REVOKE ALL ON public.tenants FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;

-- Configure public directory view access
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

COMMIT;
