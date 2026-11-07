-- ==============================================================================
-- KhelGrid Security Programme: Phases 2–5 Consolidated Database Deployment
-- Target Database: Development Project hznsbxvovjxvmnchzzqt (Supabase SQL Editor)
--
-- Deployment Package Sequence:
--   1. Migration 20261108040000: Phase 2 RLS Post-Merge Remediation
--   2. Migration 20261108000000: Phase 3 Role-Based Access Control (RBAC)
--   3. Migration 20261108050000: Phase 4 Authentication & Session Security
--   4. Migration 20261108060000: Phase 5 API/RPC Security & Backend Hardening
--
-- Execution Instructions:
--   1. Open the Supabase Dashboard for project hznsbxvovjxvmnchzzqt.
--   2. Navigate to SQL Editor -> New Query.
--   3. Paste this consolidated script and click Run.
--   4. Confirm successful execution without errors.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PART 1: PHASE 2 RLS POST-MERGE REMEDIATION
-- ==============================================================================

-- 1.1 Schema Hardening: user_id & high-entropy voucher tokens
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_voucher_token ON public.venue_bookings(voucher_token);

ALTER TABLE public.listing_subscriptions
  ADD COLUMN IF NOT EXISTS access_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_listing_subs_access_token ON public.listing_subscriptions(access_token);

-- 1.2 Remediate Broad SELECT Policies
-- public.listing_subscriptions
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_read" ON public.listing_subscriptions;

CREATE POLICY "listing_subscriptions_owner_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "listing_subscriptions_service_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- public.venue_bookings
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_read" ON public.venue_bookings;

CREATE POLICY "venue_bookings_owner_read"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "venue_bookings_service_read"
  ON public.venue_bookings
  FOR SELECT
  TO service_role
  USING (true);

-- public.trial_reminders
ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trial_reminders_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;

CREATE POLICY "trial_reminders_owner_read"
  ON public.trial_reminders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "trial_reminders_service_read"
  ON public.trial_reminders
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "trial_reminders_owner_update"
  ON public.trial_reminders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- 1.3 Zero-PII Slot Availability RPC
CREATE OR REPLACE FUNCTION public.get_booked_slots_for_venue(p_venue_id text, p_slot_date text)
RETURNS TABLE (
  slot_time text,
  court_number int,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT slot_time, court_number, status
  FROM public.venue_bookings
  WHERE venue_id = trim(p_venue_id)
    AND slot_date = trim(p_slot_date)
    AND status IN ('confirmed', 'blocked', 'reserved');
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) TO anon, authenticated, service_role;

-- 1.4 Explicit RLS on zero-policy tables
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_deny_public" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "participants_host_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "participants_service_all" ON public.pickup_game_participants;

CREATE POLICY "participants_deny_public"
  ON public.pickup_game_participants
  FOR ALL
  TO PUBLIC
  USING (false);

CREATE POLICY "participants_service_all"
  ON public.pickup_game_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_deny_public" ON public.pickup_game_rsvp_rate_limits;
DROP POLICY IF EXISTS "rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;

CREATE POLICY "rate_limits_deny_public"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO PUBLIC
  USING (false);

CREATE POLICY "rate_limits_service_all"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- PART 2: PHASE 3 ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

-- 2.1 Role permissions catalog
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('athlete', 'parent', 'coach', 'scout', 'academy', 'host', 'venue_owner', 'submitter', 'moderator', 'admin')),
  permission text NOT NULL CHECK (permission ~ '^[a-z_]+:[a-z_]+$'),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_role_permission UNIQUE (role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission);

-- 2.2 User roles mapping
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('athlete', 'parent', 'coach', 'scout', 'academy', 'host', 'venue_owner', 'submitter', 'moderator', 'admin')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 2.3 User role audit logs
CREATE TABLE IF NOT EXISTS public.user_role_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  action text NOT NULL CHECK (action IN ('ASSIGN', 'REVOKE')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_role_audit_user ON public.user_role_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_audit_created ON public.user_role_audit_logs(created_at DESC);

-- 2.4 Pre-seed permissions
INSERT INTO public.role_permissions (role, permission, description) VALUES
  ('athlete', 'profile:view', 'View personal and public athlete profile'),
  ('athlete', 'profile:edit', 'Update own personal profile and bio'),
  ('athlete', 'trial:submit', 'Apply for selection trials with Sports CV'),
  ('athlete', 'venue:book', 'Reserve turf and court time slots'),
  ('athlete', 'coach:inquire', 'Submit training inquiries to verified coaches'),
  ('athlete', 'review:create', 'Submit reviews and ratings for facilities'),
  ('athlete', 'score:view', 'View live match scoreboards and event streams'),
  ('parent', 'profile:view', 'View personal and child profile'),
  ('parent', 'profile:edit', 'Update ward information'),
  ('parent', 'trial:submit', 'Apply for junior selection trials on behalf of athlete'),
  ('parent', 'academy:inquire', 'Submit junior academy admission inquiries'),
  ('parent', 'venue:book', 'Reserve family court slots'),
  ('coach', 'profile:view', 'View verified coach profile'),
  ('coach', 'profile:edit', 'Update coaching qualifications, bio, and fees'),
  ('coach', 'coach:manage_inquiries', 'Accept, schedule, or decline athlete inquiries'),
  ('coach', 'coach:view_dossier', 'Inspect prospective athlete combine benchmark percentiles'),
  ('coach', 'match:score', 'Score official match events'),
  ('scout', 'profile:view', 'View verified talent scout credentials'),
  ('scout', 'scout:search_cvs', 'Search indexed athlete CVs and combine results'),
  ('scout', 'scout:create_shortlist', 'Bookmark prospective talents for national camps'),
  ('academy', 'profile:view', 'View academy profile and listings'),
  ('academy', 'profile:edit', 'Update academy programs, coaches, and fees'),
  ('academy', 'academy:manage_enquiries', 'Review and process admissions inquiries'),
  ('host', 'profile:view', 'View host profile and reputation'),
  ('host', 'game:create', 'Create and publish community pickup games'),
  ('host', 'game:manage', 'Reschedule, cancel, or complete owned pickup games'),
  ('host', 'game:approve_invite', 'Approve guest WhatsApp group invitations'),
  ('host', 'game:payout_request', 'Submit withdrawal request for host settlement balances'),
  ('venue_owner', 'profile:view', 'View registered sports venue facilities'),
  ('venue_owner', 'venue:manage_slots', 'Configure court availability and hourly pricing'),
  ('venue_owner', 'venue:manage_bookings', 'Inspect and check-in athlete reservations'),
  ('submitter', 'listing:submit', 'Submit directory entries for community vetting'),
  ('moderator', 'listing:view_queue', 'Inspect pending community listing submissions'),
  ('moderator', 'listing:review', 'Approve or reject community listing submissions'),
  ('moderator', 'game:moderate', 'Moderate, lock, or remove flagged pickup matches'),
  ('moderator', 'review:moderate', 'Audit and redact abusive community ratings'),
  ('admin', 'admin:all', 'Super-administrator platform control'),
  ('admin', 'admin:roles', 'Assign and revoke user roles with audit logging'),
  ('admin', 'listing:review', 'Approve or reject directory listings'),
  ('admin', 'game:moderate', 'Administrative override on community games'),
  ('admin', 'payout:approve', 'Approve host payout disbursements'),
  ('admin', 'system:audit', 'Inspect system security event and role audit trails')
ON CONFLICT (role, permission) DO NOTHING;

-- 2.5 RBAC Helpers & Administrative RPCs
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = p_role
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (rp.permission = p_permission OR rp.role = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_role(
  p_target_user_id uuid,
  p_role text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF current_user != 'service_role' THEN
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Administrative privileges required to assign roles.');
    END IF;
  END IF;

  IF p_role NOT IN ('athlete', 'parent', 'coach', 'scout', 'academy', 'host', 'venue_owner', 'submitter', 'moderator', 'admin') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ROLE', 'message', 'Specified role is not valid.');
  END IF;

  INSERT INTO public.user_roles (user_id, role, assigned_by, notes, is_active)
  VALUES (p_target_user_id, p_role, v_admin_id, p_notes, true)
  ON CONFLICT (user_id, role)
  DO UPDATE SET is_active = true, assigned_at = now(), assigned_by = v_admin_id, notes = p_notes;

  INSERT INTO public.user_role_audit_logs (user_id, role, action, performed_by, reason)
  VALUES (p_target_user_id, p_role, 'ASSIGN', v_admin_id, p_notes);

  RETURN jsonb_build_object('status', 'success', 'user_id', p_target_user_id, 'role', p_role, 'message', 'Role assigned successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_target_user_id uuid,
  p_role text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_active_admins int;
BEGIN
  v_admin_id := auth.uid();

  IF current_user != 'service_role' THEN
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Administrative privileges required to revoke roles.');
    END IF;
  END IF;

  IF p_role = 'admin' THEN
    SELECT COUNT(*) INTO v_active_admins
    FROM public.user_roles
    WHERE role = 'admin' AND is_active = true;

    IF v_active_admins <= 1 THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'LAST_ADMIN_PROTECTION', 'message', 'Cannot revoke the final active platform administrator.');
    END IF;
  END IF;

  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = p_target_user_id AND role = p_role;

  INSERT INTO public.user_role_audit_logs (user_id, role, action, performed_by, reason)
  VALUES (p_target_user_id, p_role, 'REVOKE', v_admin_id, p_reason);

  RETURN jsonb_build_object('status', 'success', 'user_id', p_target_user_id, 'role', p_role, 'message', 'Role revoked successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;

-- ==============================================================================
-- PART 3: PHASE 4 AUTHENTICATION & SESSION SECURITY
-- ==============================================================================

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

CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    ) INTO v_is_admin;
  END IF;

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

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;

CREATE POLICY "profiles_public_read"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_owner_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "profiles_service_all"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.is_user_email_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public, pg_temp
STABLE
AS $$
  SELECT (email_confirmed_at IS NOT NULL)
  FROM auth.users
  WHERE id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_email_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_email_verified(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  city text,
  avatar_url text,
  preferred_sports text[],
  bio text,
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
    p.city,
    p.avatar_url,
    p.preferred_sports,
    p.bio,
    p.role,
    p.is_verified
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('LOGIN_ATTEMPT', 'SESSION_REFRESH', 'PASSWORD_RECOVERY_REQUEST', 'PASSWORD_RESET_SUCCESS', 'PRIVILEGE_ESCALATION_ATTEMPT', 'LOGOUT')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'BLOCKED')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_security_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_security_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_security_events TO service_role;

-- ==============================================================================
-- PART 4: PHASE 5 API/RPC SECURITY & BACKEND HARDENING
-- ==============================================================================

-- 4.1 Rate Limits Table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_key_window UNIQUE (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key ON public.api_rate_limits(rate_key);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON public.api_rate_limits(window_start DESC);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_rate_key text,
  p_max_requests int DEFAULT 10,
  p_window_seconds int DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
  VALUES (p_rate_key, v_window_start, 1)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET request_count = public.api_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) TO service_role;

-- 4.2 Payments Table & Hardened record_payment_transaction
CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  payment_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  item_type text NOT NULL,
  item_id text NOT NULL,
  item_title text NOT NULL,
  payment_gateway text NOT NULL DEFAULT 'razorpay',
  payment_method text DEFAULT 'upi',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_khelgrid_payments_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_user_id ON public.khelgrid_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_status ON public.khelgrid_payments(status);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_created ON public.khelgrid_payments(created_at DESC);

ALTER TABLE public.khelgrid_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_owner_read" ON public.khelgrid_payments;
DROP POLICY IF EXISTS "payments_service_all" ON public.khelgrid_payments;

CREATE POLICY "payments_owner_read"
  ON public.khelgrid_payments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "payments_service_all"
  ON public.khelgrid_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_amount numeric,
  p_item_type text,
  p_item_id text,
  p_item_title text,
  p_payment_gateway text DEFAULT 'razorpay',
  p_payment_method text DEFAULT 'upi',
  p_status text DEFAULT 'pending',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_clean_name text;
  v_clean_phone text;
  v_clean_email text;
  v_clean_order_id text;
  v_clean_payment_id text;
  v_clean_item_type text;
  v_clean_status text := 'pending';
  v_existing_id uuid;
  v_existing_status text;
  v_inserted_id uuid;
  v_is_trusted boolean := false;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_email := lower(trim(coalesce(p_customer_email, '')));
  v_clean_order_id := trim(coalesce(p_order_id, ''));
  v_clean_payment_id := trim(coalesce(p_payment_id, ''));
  v_clean_item_type := lower(trim(coalesce(p_item_type, '')));

  IF current_user = 'service_role' THEN
    v_is_trusted := true;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_user_id AND role = 'admin' AND is_active = true
    ) INTO v_is_trusted;
  END IF;

  IF v_is_trusted AND lower(trim(coalesce(p_status, ''))) = 'completed' THEN
    v_clean_status := 'completed';
  END IF;

  IF char_length(v_clean_order_id) < 3 OR char_length(v_clean_order_id) > 100 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ORDER_ID', 'message', 'Order ID must be between 3 and 100 characters.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_AMOUNT', 'message', 'Payment amount must be greater than zero.');
  END IF;

  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name must be between 2 and 120 characters.');
  END IF;

  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid mobile number is required (10 to 15 digits).');
  END IF;

  IF char_length(v_clean_email) > 0 AND v_clean_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_EMAIL', 'message', 'Invalid email address format.');
  END IF;

  IF v_clean_item_type NOT IN ('venue_booking', 'pickup_game', 'coaching', 'listing_subscription', 'tournament_entry', 'academy_admission') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ITEM_TYPE', 'message', 'Item type is not recognized.');
  END IF;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.khelgrid_payments
  WHERE order_id = v_clean_order_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'payment_id', v_existing_id,
      'order_id', v_clean_order_id,
      'payment_status', v_existing_status,
      'message', 'Transaction already recorded.'
    );
  END IF;

  INSERT INTO public.khelgrid_payments (
    order_id,
    payment_id,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    amount,
    currency,
    item_type,
    item_id,
    item_title,
    payment_gateway,
    payment_method,
    status,
    metadata
  ) VALUES (
    v_clean_order_id,
    nullif(v_clean_payment_id, ''),
    v_user_id,
    v_clean_name,
    v_clean_phone,
    nullif(v_clean_email, ''),
    p_amount,
    'INR',
    v_clean_item_type,
    trim(coalesce(p_item_id, '')),
    trim(coalesce(p_item_title, '')),
    lower(trim(coalesce(p_payment_gateway, 'razorpay'))),
    lower(trim(coalesce(p_payment_method, 'upi'))),
    v_clean_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_inserted_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'idempotent', false,
    'payment_id', v_inserted_id,
    'order_id', v_clean_order_id,
    'payment_status', v_clean_status,
    'message', 'Payment intent recorded as pending verification.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_payment_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_gateway_signature text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_is_admin boolean := false;
  v_updated int;
BEGIN
  IF current_user = 'service_role' THEN
    v_caller_is_admin := true;
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    ) INTO v_caller_is_admin;
  END IF;

  IF NOT v_caller_is_admin THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Payment verification requires administrative or service privileges.');
  END IF;

  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = coalesce(nullif(trim(p_payment_id), ''), payment_id),
      updated_at = now()
  WHERE order_id = trim(p_order_id)
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Pending payment record not found for the given order.');
  END IF;

  RETURN jsonb_build_object('status', 'success', 'order_id', trim(p_order_id), 'message', 'Payment verified successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text) TO service_role;

-- 4.3 Zero-PII Voucher & Receipt Access
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_caller_uid uuid;
  v_sub record;
  v_is_authorized boolean := false;
  v_clean_order text;
  v_clean_token text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_token := trim(coalesce(p_access_token, ''));

  IF char_length(v_clean_order) < 3 THEN
    RETURN NULL;
  END IF;

  IF NOT public.check_and_increment_rate_limit('order_lookup:' || v_clean_order, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  SELECT
    id,
    order_id,
    user_id,
    listing_name,
    listing_type,
    plan_tier,
    is_active,
    expires_at,
    payment_status,
    access_token,
    customer_name,
    customer_email
  INTO v_sub
  FROM public.listing_subscriptions
  WHERE order_id = v_clean_order
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 16 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_sub.order_id,
    'listing_name', v_sub.listing_name,
    'listing_type', v_sub.listing_type,
    'plan_tier', v_sub.plan_tier,
    'is_active', v_sub.is_active,
    'expires_at', v_sub.expires_at,
    'payment_status', v_sub.payment_status,
    'customer_display_name', CASE
      WHEN v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN v_sub.customer_name
      ELSE regexp_replace(v_sub.customer_name, '(?<=^.).+(?=.?$)', '***')
    END,
    'customer_masked_email', CASE
      WHEN v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN v_sub.customer_email
      WHEN v_sub.customer_email IS NOT NULL THEN regexp_replace(v_sub.customer_email, '(?<=^.).+(?=@)', '***')
      ELSE NULL
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
  v_is_authorized boolean := false;
  v_clean_ref text;
  v_clean_token text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_ref := trim(coalesce(p_booking_ref, ''));
  v_clean_token := trim(coalesce(p_voucher_token, ''));

  IF char_length(v_clean_ref) < 3 THEN
    RETURN NULL;
  END IF;

  IF NOT public.check_and_increment_rate_limit('booking_lookup:' || v_clean_ref, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  SELECT
    id,
    booking_ref,
    venue_id,
    venue_name,
    sport,
    slot_date,
    slot_time,
    court_number,
    status,
    user_id,
    voucher_token,
    customer_name
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = v_clean_ref
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 16 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'booking_ref', v_booking.booking_ref,
    'venue_id', v_booking.venue_id,
    'venue_name', v_booking.venue_name,
    'sport', v_booking.sport,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'court_number', v_booking.court_number,
    'status', v_booking.status,
    'customer_display_name', CASE
      WHEN v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN v_booking.customer_name
      ELSE regexp_replace(v_booking.customer_name, '(?<=^.).+(?=.?$)', '***')
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 4.4 Revoke Anonymous EXECUTE on Host and Admin Stored Procedures
DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT proname, oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN (
        'cancel_pickup_game_as_host',
        'complete_pickup_game_as_host',
        'reopen_pickup_game_as_host',
        'update_pickup_game_capacity',
        'update_pickup_game_details',
        'reschedule_pickup_game',
        'get_host_pickup_games',
        'approve_pickup_game_whatsapp_invite',
        'admin_moderate_pickup_game',
        'is_pickup_game_admin',
        'is_listing_moderator',
        'get_listing_submissions',
        'review_listing_submission'
      )
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_sig || ' TO authenticated, service_role;';
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Phase 5: Successfully revoked anon EXECUTE on % host/admin/moderator stored procedures.', v_count;
END $$;

-- 4.5 Enforce FORCE ROW LEVEL SECURITY across all sensitive application tables
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_security_events FORCE ROW LEVEL SECURITY;

COMMIT;
