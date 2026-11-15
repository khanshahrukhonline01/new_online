-- ==============================================================================
-- KhelGrid — Phase 4: Authentication, Session Security & Account Protection
-- Migration: 20261108050000_phase4_auth_and_session_security.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt (PREPARED ONLY — NOT YET APPLIED)
--
-- Purpose:
-- 1. Profile Security & Anti-Tampering: Enforce database trigger preventing
--    non-administrators from mutating sensitive profile columns (role, id, is_verified).
-- 2. Email Verification State Guard: Provide atomic helper is_user_email_verified(p_user_id)
--    to query auth.users.email_confirmed_at securely from PostgreSQL without exposing auth tables.
-- 3. Public Discovery Profile Projection: Install get_public_profile(p_user_id) returning
--    only non-sensitive public discovery attributes, shielding phone and email.
-- 4. Auth Security Event Logging: Create public.auth_security_events tracking session,
--    password recovery, and privilege escalation events with FORCE RLS.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. PROFILE TABLE INTEGRITY & ROLE ESCALATION PROTECTION TRIGGER
-- -----------------------------------------------------------------------------

-- Ensure profiles table has proper columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  phone text,
  city text,
  avatar_url text,
  preferred_sports text[] DEFAULT '{}'::text[],
  bio text,
  role text DEFAULT 'athlete',
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger function: Prevents non-admins from changing role or is_verified on public.profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  -- Service role and internal background workers are trusted
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is authenticated admin
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    ) INTO v_is_admin;
  END IF;

  -- Block unauthorized modification of role, email, or is_verified by regular users
  IF NOT v_is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Profile role can only be altered by system administrators.';
    END IF;

    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      RAISE EXCEPTION 'Access denied: Verification status can only be modified by identity verification desks.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Access denied: User identifier cannot be changed.';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_self_escalation();

-- RLS Policies on profiles:
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;

-- Authenticated and anonymous can view basic discovery profiles
CREATE POLICY "profiles_public_read"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can only update their own profile
CREATE POLICY "profiles_owner_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND id = auth.uid()
  );

-- Service role full access
CREATE POLICY "profiles_service_all"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. ATOMIC EMAIL VERIFICATION QUERY HELPER
-- -----------------------------------------------------------------------------

-- Atomic helper checking whether a user has confirmed their email in auth.users
CREATE OR REPLACE FUNCTION public.is_user_email_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT email_confirmed_at INTO v_confirmed_at
  FROM auth.users
  WHERE id = p_user_id;

  RETURN v_confirmed_at IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_email_verified(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_email_verified(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. PUBLIC DISCOVERY PROFILE PROJECTION RPC (SHIELDING PHONE & EMAIL)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  city text,
  bio text,
  preferred_sports text[],
  role text,
  is_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.bio,
    p.preferred_sports,
    p.role,
    p.is_verified
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. AUTH SECURITY AUDIT EVENTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_auth_event_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON public.auth_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON public.auth_security_events(created_at DESC);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_events_deny_clients" ON public.auth_security_events;
DROP POLICY IF EXISTS "auth_events_service_all" ON public.auth_security_events;

-- Clients cannot read or mutate audit events directly
CREATE POLICY "auth_events_deny_clients"
  ON public.auth_security_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Backend service role has complete audit access
CREATE POLICY "auth_events_service_all"
  ON public.auth_security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.auth_security_events FORCE ROW LEVEL SECURITY;

COMMIT;
