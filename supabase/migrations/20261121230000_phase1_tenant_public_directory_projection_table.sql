-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Tenant Public Directory Projection Table
-- Resolves Supabase Security Advisor "Security Definer View" Finding (0010)
-- 
-- Architecture:
-- Transitions public directory discovery from a security-barrier view to an
-- isolated, RLS-protected, synchronized projection table.
--
-- Security Guarantees:
-- 1. Zero Security Definer View finding (physical table, not a view).
-- 2. Sensitive private columns (owner_id, contact_phone, contact_email, upi_vpa,
--    metadata) are physically omitted from table schema (impossible to leak).
-- 3. Base table public.tenants remains 100% private (no anon grant, no broad RLS).
-- 4. Atomic synchronization trigger keeps public directory updated in real-time.
-- 5. Suspended, pending, or archived tenants are automatically purged from directory.
-- 6. Read-only for anon and authenticated; all client writes return 42501.
--
-- Safe Rollback Guidance:
-- To rollback: remove trigger, replace relation with legacy security_barrier view:
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_sync_tenant_public_directory ON public.tenants;
--   DROP FUNCTION IF EXISTS public.sync_tenant_public_directory();
--   revert projection table;
--   CREATE OR REPLACE VIEW public.tenant_public_directory WITH (security_barrier = true) AS
--     SELECT id, slug, name, tenant_type, sport, city, state, status, created_at
--     FROM public.tenants WHERE status = 'active';
--   ALTER VIEW public.tenant_public_directory OWNER TO postgres;
--   GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;
--   COMMIT;
-- ==============================================================================

BEGIN;

-- 1. Safely replace legacy view with physical projection table
DROP VIEW IF EXISTS public.tenant_public_directory;

CREATE TABLE IF NOT EXISTS public.tenant_public_directory (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tenant_type text NOT NULL,
  sport text,
  city text,
  state text,
  status text NOT NULL,
  created_at timestamptz NOT NULL
);

-- 2. Configure Row Level Security & Explicit Least-Privilege Grants
ALTER TABLE public.tenant_public_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

-- 3. RLS Policy: Allow public discovery of active organizations only
DROP POLICY IF EXISTS "tenant_public_directory_select" ON public.tenant_public_directory;
CREATE POLICY "tenant_public_directory_select" ON public.tenant_public_directory
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- 4. Atomic Synchronization Trigger Function
CREATE OR REPLACE FUNCTION public.sync_tenant_public_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.tenant_public_directory WHERE id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' THEN
      INSERT INTO public.tenant_public_directory (
        id, slug, name, tenant_type, sport, city, state, status, created_at
      ) VALUES (
        NEW.id, NEW.slug, NEW.name, NEW.tenant_type, NEW.sport, NEW.city, NEW.state, NEW.status, NEW.created_at
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        tenant_type = EXCLUDED.tenant_type,
        sport = EXCLUDED.sport,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at;
    ELSE
      -- Automatically purge if status changes away from active (suspended, pending, archived)
      DELETE FROM public.tenant_public_directory WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenant_public_directory ON public.tenants;
CREATE TRIGGER trg_sync_tenant_public_directory
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_public_directory();

-- 5. Seed existing active tenants idempotently
INSERT INTO public.tenant_public_directory (
  id, slug, name, tenant_type, sport, city, state, status, created_at
)
SELECT id, slug, name, tenant_type, sport, city, state, status, created_at
FROM public.tenants
WHERE status = 'active'
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  tenant_type = EXCLUDED.tenant_type,
  sport = EXCLUDED.sport,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;

-- 6. In-line Architectural Validation Assertions
DO $$
BEGIN
  -- Assert table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_public_directory' AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'Assertion Failed: tenant_public_directory physical table missing';
  END IF;

  -- Assert RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_public_directory' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Assertion Failed: RLS not enabled on tenant_public_directory';
  END IF;

  -- Assert private columns do not exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_public_directory'
      AND column_name IN ('owner_id', 'contact_phone', 'contact_email', 'upi_vpa', 'metadata')
  ) THEN
    RAISE EXCEPTION 'Assertion Failed: sensitive columns exist in public directory';
  END IF;

  -- Assert anon has SELECT but NO write privileges
  IF NOT has_table_privilege('anon', 'public.tenant_public_directory', 'SELECT')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'UPDATE')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'DELETE') THEN
    RAISE EXCEPTION 'Assertion Failed: anon has invalid privileges on tenant_public_directory';
  END IF;
END $$;

COMMIT;
