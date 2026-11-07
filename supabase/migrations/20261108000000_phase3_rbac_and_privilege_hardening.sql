-- ==============================================================================
-- KhelGrid — Phase 3: Role-Based Access Control (RBAC) & Privilege Hardening
-- Migration: 20261108000000_phase3_rbac_and_privilege_hardening.sql
--
-- Purpose:
-- 1. Create normalized, granular permission mapping tables:
--    - public.role_permissions (role -> granular action permission)
--    - public.user_roles (user -> one or more assigned roles)
-- 2. Pre-seed standard permissions across all 6 roles (athlete, host, coach, scout, academy, admin).
-- 3. Install atomic, administrative RPCs for safe role delegation:
--    - public.admin_assign_role (SEC-004 hardening: admin-only assignment)
--    - public.admin_revoke_role (with last-admin prevention)
-- 4. Install permission evaluation helper:
--    - public.has_permission(p_permission text)
--    - public.get_user_effective_permissions(p_user_id uuid)
-- 5. Revoke default public schema privileges and enforce least-privilege grants
--    across anon, authenticated, and service_role.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ROLE PERMISSIONS CATALOG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('athlete', 'host', 'coach', 'scout', 'academy', 'admin')),
  permission text NOT NULL CHECK (permission ~ '^[a-z_]+:[a-z_]+$'),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_role_permission UNIQUE (role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission);

-- -----------------------------------------------------------------------------
-- 2. USER ROLES DECOUPLED MAPPING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('athlete', 'host', 'coach', 'scout', 'academy', 'admin')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- -----------------------------------------------------------------------------
-- 3. PRE-SEED GRANULAR ROLE PERMISSIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.role_permissions (role, permission, description) VALUES
  -- Athlete permissions
  ('athlete', 'profile:view', 'View personal and public athlete profile'),
  ('athlete', 'profile:edit', 'Update own personal profile and bio'),
  ('athlete', 'trial:submit', 'Apply for selection trials with Sports CV'),
  ('athlete', 'venue:book', 'Reserve turf and court time slots'),
  ('athlete', 'coach:inquire', 'Submit training inquiries to verified coaches'),
  ('athlete', 'review:create', 'Submit reviews and ratings for facilities'),
  ('athlete', 'score:view', 'View live match scoreboards and event streams'),

  -- Host permissions
  ('host', 'profile:view', 'View own host profile'),
  ('host', 'profile:edit', 'Update host profile and venue details'),
  ('host', 'venue:manage', 'Manage turf slots, rates, and operating hours'),
  ('host', 'venue:view_payouts', 'Inspect own booking settlements and earnings'),
  ('host', 'payout:request', 'Request bank or UPI payouts for settled games'),
  ('host', 'match:create', 'Create live match scoreboards for hosted tournaments'),
  ('host', 'match:score', 'Update ball-by-ball or point-by-point live match scores'),

  -- Coach permissions
  ('coach', 'profile:view', 'View verified coach profile'),
  ('coach', 'profile:edit', 'Update coaching qualifications, bio, and fees'),
  ('coach', 'coach:manage_inquiries', 'Accept, schedule, or decline athlete inquiries'),
  ('coach', 'coach:view_dossier', 'Inspect prospective athlete combine benchmark percentiles'),
  ('coach', 'match:score', 'Score official match events'),

  -- Scout permissions
  ('scout', 'profile:view', 'View scout profile'),
  ('scout', 'scout:view_athletes', 'Access scout portal candidate database'),
  ('scout', 'scout:export_dossier', 'Export shortlisted athlete cards and test percentiles'),
  ('scout', 'scout:view_benchmarks', 'Inspect physical combine normative radar benchmarks'),

  -- Academy permissions
  ('academy', 'profile:view', 'View academy profile'),
  ('academy', 'profile:edit', 'Update batch fees, facilities, and contact details'),
  ('academy', 'academy:manage_enquiries', 'Review and process admission inquiries'),
  ('academy', 'academy:view_candidates', 'Inspect applicant verified Sports CVs'),
  ('academy', 'trial:publish', 'Publish and schedule grassroots selection trials'),

  -- Admin permissions (Superuser / Federation Directors)
  ('admin', 'admin:assign_role', 'Assign roles to platform users'),
  ('admin', 'admin:revoke_role', 'Revoke assigned roles from platform users'),
  ('admin', 'listing:moderate', 'Approve, verify, or reject directory listings'),
  ('admin', 'audit:view', 'Inspect security audit logs and financial transactions'),
  ('admin', 'system:config', 'Configure system parameters and platform fees')
ON CONFLICT (role, permission) DO UPDATE SET
  description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) ON RBAC TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- 4.1 role_permissions: Read-only catalog for public & authenticated
DROP POLICY IF EXISTS "Public can view role permissions" ON public.role_permissions;
CREATE POLICY "Public can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4.2 user_roles: Users view own roles, Admins view all roles
DROP POLICY IF EXISTS "Users can view own assigned roles" ON public.user_roles;
CREATE POLICY "Users can view own assigned roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Direct mutation of user_roles from client is strictly prohibited
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. ADMINISTRATIVE RPC FUNCTIONS (SEC-004 PRIVILEGE HARDENING)
-- -----------------------------------------------------------------------------

-- 5.1 Explicit Admin Role Assignment
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  p_target_user_id uuid,
  p_role text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_caller_role text;
BEGIN
  -- Verify caller authorization
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_caller_is_admin := (v_caller_role = 'service_role') OR public.is_admin();

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Access denied: Only system administrators can assign roles.';
  END IF;

  -- Validate role input
  IF p_role NOT IN ('athlete', 'host', 'coach', 'scout', 'academy', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: "%". Must be one of athlete, host, coach, scout, academy, admin.', p_role;
  END IF;

  -- Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- Insert role assignment
  INSERT INTO public.user_roles (
    user_id,
    role,
    assigned_by,
    notes,
    assigned_at
  ) VALUES (
    p_target_user_id,
    p_role,
    auth.uid(),
    trim(p_notes),
    now()
  )
  ON CONFLICT (user_id, role) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    notes = coalesce(EXCLUDED.notes, public.user_roles.notes),
    assigned_at = now();

  -- Synchronize public.profiles.role if target role has higher authority
  UPDATE public.profiles
  SET role = p_role, updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_target_user_id,
    'role', p_role,
    'assignedAt', now()
  );
END;
$$;

-- 5.2 Explicit Admin Role Revocation (with last-admin protection)
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_target_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_caller_role text;
  v_admin_count integer;
  v_fallback_role text;
BEGIN
  -- Verify caller authorization
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_caller_is_admin := (v_caller_role = 'service_role') OR public.is_admin();

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Access denied: Only system administrators can revoke roles.';
  END IF;

  -- Safety: Prevent revoking the last remaining administrator
  IF p_role = 'admin' THEN
    SELECT count(DISTINCT user_id) INTO v_admin_count
    FROM public.user_roles
    WHERE role = 'admin';

    IF v_admin_count <= 1 AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin') THEN
      RAISE EXCEPTION 'Operation blocked: Cannot revoke the last remaining system administrator.';
    END IF;
  END IF;

  -- Delete role assignment
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role = p_role;

  -- Find highest fallback role for public.profiles
  SELECT role INTO v_fallback_role
  FROM public.user_roles
  WHERE user_id = p_target_user_id
  ORDER BY CASE
    WHEN role = 'admin' THEN 1
    WHEN role = 'academy' THEN 2
    WHEN role = 'coach' THEN 3
    WHEN role = 'scout' THEN 4
    WHEN role = 'host' THEN 5
    ELSE 6
  END ASC
  LIMIT 1;

  UPDATE public.profiles
  SET role = coalesce(v_fallback_role, 'athlete'), updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_target_user_id,
    'revokedRole', p_role,
    'activeRole', coalesce(v_fallback_role, 'athlete')
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. PERMISSION EVALUATION HELPERS
-- -----------------------------------------------------------------------------

-- 6.1 Check if current caller has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT (
    -- Admins have all permissions implicitly
    public.is_admin()
    OR (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    -- Or user holds a role possessing this permission
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = auth.uid()
        AND rp.permission = p_permission
    )
  );
$$;

-- 6.2 Get all effective permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_is_admin boolean;
  v_permissions jsonb;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    SELECT jsonb_agg(DISTINCT permission) INTO v_permissions
    FROM public.role_permissions;
  ELSE
    SELECT coalesce(jsonb_agg(DISTINCT rp.permission), '[]'::jsonb) INTO v_permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = p_user_id;
  END IF;

  RETURN coalesce(v_permissions, '[]'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. REVISE handle_new_user() TO AUTOMATICALLY SEED user_roles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_full_name text;
  user_role text;
  user_city text;
  user_phone text;
BEGIN
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'athlete@khelgrid.com'), '@', 1)
  );

  user_role := coalesce(new.raw_user_meta_data->>'role', 'athlete');
  -- SEC-004 fix: Prevent self-assignment of 'admin' role via user metadata
  IF user_role NOT IN ('athlete', 'host', 'coach', 'scout', 'academy') THEN
    user_role := 'athlete';
  END IF;

  user_city := new.raw_user_meta_data->>'city';
  user_phone := coalesce(new.raw_user_meta_data->>'phone', new.phone);

  -- 1. Insert or update public.profiles
  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    role,
    city,
    phone,
    avatar_url,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_full_name,
    new.email,
    user_role,
    user_city,
    user_phone,
    new.raw_user_meta_data->>'avatar_url',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    email = coalesce(excluded.email, public.profiles.email),
    city = coalesce(excluded.city, public.profiles.city),
    phone = coalesce(excluded.phone, public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- 2. Insert into public.user_roles (enforcing initial role decoupling)
  INSERT INTO public.user_roles (
    user_id,
    role,
    notes,
    assigned_at
  ) VALUES (
    new.id,
    user_role,
    'Initial registration role',
    now()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. REVOKE DEFAULT PUBLIC SCHEMA PRIVILEGES (LEAST PRIVILEGE ENFORCEMENT)
-- -----------------------------------------------------------------------------

-- 8.1 Revoke schema creation privileges from PUBLIC and anon
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM anon;

-- Ensure roles have USAGE on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 8.2 Revoke default execution on functions from PUBLIC
REVOKE EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_effective_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(uuid) TO authenticated, service_role;

-- 8.3 Grants on RBAC tables
GRANT SELECT ON public.role_permissions TO anon, authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated, service_role;

COMMIT;
