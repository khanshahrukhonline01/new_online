-- ==============================================================================
-- KhelGrid Security Programme: Master Consolidated Database Deployment (Phases 2–8)
-- Target Database: Development Project hznsbxvovjxvmnchzzqt (Supabase SQL Editor)
--
-- Deployment Package Sequence:
--   1. Migration 20261108040000: Phase 2 RLS Post-Merge Remediation
--   2. Migration 20261108000000: Phase 3 Role-Based Access Control (RBAC)
--   3. Migration 20261108050000: Phase 4 Authentication & Session Security
--   4. Migration 20261108060000: Phase 5 API/RPC Security & Backend Hardening
--   5. Migration 20261108070000: Phase 5.1 Volatility & Caller Identity Remediation
--   6. Migration 20261108080000: Phase 6 Athlete Privacy & Minor Protection
--   7. Migration 20261108090000: Phase 7 & 8 Business Logic & Moderation Security
--
-- Execution Instructions:
--   1. Open the Supabase Dashboard for project hznsbxvovjxvmnchzzqt.
--   2. Navigate to SQL Editor -> New Query.
--   3. Paste this consolidated script and click Run.
--   4. Confirm successful execution without errors.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PART 1: PHASE 2 RLS REMEDIATION
-- ==============================================================================

ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_voucher_token ON public.venue_bookings(voucher_token);

ALTER TABLE public.listing_subscriptions
  ADD COLUMN IF NOT EXISTS access_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_listing_subs_access_token ON public.listing_subscriptions(access_token);

ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_read" ON public.listing_subscriptions;

CREATE POLICY "listing_subscriptions_owner_read"
  ON public.listing_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "listing_subscriptions_service_read"
  ON public.listing_subscriptions FOR SELECT TO service_role
  USING (true);

ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_read" ON public.venue_bookings;

CREATE POLICY "venue_bookings_owner_read"
  ON public.venue_bookings FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "venue_bookings_service_read"
  ON public.venue_bookings FOR SELECT TO service_role
  USING (true);

ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trial_reminders_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;

CREATE POLICY "trial_reminders_owner_read"
  ON public.trial_reminders FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "trial_reminders_service_read"
  ON public.trial_reminders FOR SELECT TO service_role
  USING (true);

CREATE POLICY "trial_reminders_owner_update"
  ON public.trial_reminders FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_deny_public" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "participants_service_all" ON public.pickup_game_participants;

CREATE POLICY "participants_deny_public"
  ON public.pickup_game_participants FOR ALL TO PUBLIC USING (false);

CREATE POLICY "participants_service_all"
  ON public.pickup_game_participants FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_deny_public" ON public.pickup_game_rsvp_rate_limits;
DROP POLICY IF EXISTS "rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;

CREATE POLICY "rate_limits_deny_public"
  ON public.pickup_game_rsvp_rate_limits FOR ALL TO PUBLIC USING (false);

CREATE POLICY "rate_limits_service_all"
  ON public.pickup_game_rsvp_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- PART 2: PHASE 3 ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('athlete', 'parent', 'coach', 'scout', 'academy', 'host', 'venue_owner', 'submitter', 'moderator', 'admin')),
  permission text NOT NULL CHECK (permission ~ '^[a-z_]+:[a-z_]+$'),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_role_permission UNIQUE (role, permission)
);

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

CREATE TABLE IF NOT EXISTS public.user_role_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  action text NOT NULL CHECK (action IN ('ASSIGN', 'REVOKE')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.role_permissions (role, permission, description) VALUES
  ('athlete', 'profile:view', 'View personal and public athlete profile'),
  ('athlete', 'profile:edit', 'Update own personal profile and bio'),
  ('athlete', 'trial:submit', 'Apply for selection trials with Sports CV'),
  ('athlete', 'venue:book', 'Reserve turf and court time slots'),
  ('coach', 'profile:view', 'View verified coach profile'),
  ('coach', 'profile:edit', 'Update coaching qualifications, bio, and fees'),
  ('moderator', 'listing:view_queue', 'Inspect pending community listing submissions'),
  ('moderator', 'listing:review', 'Approve or reject community listing submissions'),
  ('admin', 'admin:all', 'Super-administrator platform control'),
  ('admin', 'admin:roles', 'Assign and revoke user roles with audit logging')
ON CONFLICT (role, permission) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role AND is_active = true
  );
$$;

-- ==============================================================================
-- PART 3: PHASE 4 AUTHENTICATION & SECURITY EVENTS
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

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'BLOCKED')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_security_events FORCE ROW LEVEL SECURITY;

-- ==============================================================================
-- PART 4: PHASE 5 & 5.1 API/RPC SECURITY, CALLER AUTH & VOLATILITY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_key_window UNIQUE (rate_key, window_start)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_service_role_or_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_jwt_role text;
  v_uid uuid;
  v_is_admin boolean := false;
BEGIN
  BEGIN
    v_jwt_role := coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      auth.role(),
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;

  IF v_jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_uid AND role = 'admin' AND is_active = true
    ) INTO v_is_admin;

    IF v_is_admin THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_request_client_identity()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_headers json;
  v_ip text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    RETURN 'usr:' || v_uid::text;
  END IF;

  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    IF v_headers IS NOT NULL THEN
      v_ip := coalesce(
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-real-ip',
        split_part(v_headers->>'x-forwarded-for', ',', 1)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  v_ip := trim(coalesce(v_ip, ''));
  IF v_ip != '' THEN
    RETURN 'ip:' || v_ip;
  END IF;

  RETURN 'anon:default_client';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_rate_key text,
  p_max_requests int DEFAULT 10,
  p_window_seconds int DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
  v_clean_key text;
BEGIN
  v_clean_key := trim(coalesce(p_rate_key, ''));
  IF char_length(v_clean_key) < 2 THEN
    RETURN false;
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
  VALUES (v_clean_key, v_window_start, 1)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET request_count = public.api_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_sub record;
  v_is_authorized boolean := false;
  v_clean_order text;
  v_clean_token text;
  v_client_id text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_token := trim(coalesce(p_access_token, ''));
  v_client_id := public.get_request_client_identity();

  IF char_length(v_clean_order) < 3 THEN
    RETURN NULL;
  END IF;

  IF NOT public.check_and_increment_rate_limit('order_lookup:' || v_client_id, 20, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  IF NOT public.check_and_increment_rate_limit('order_lookup:target:' || v_clean_order, 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests for this order. Please try again later.');
  END IF;

  SELECT id, order_id, user_id, listing_name, listing_type, plan_tier, is_active, expires_at, payment_status, access_token, customer_name, customer_email
  INTO v_sub
  FROM public.listing_subscriptions
  WHERE order_id = v_clean_order
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 24 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token THEN
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

CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
  v_is_authorized boolean := false;
  v_clean_ref text;
  v_clean_token text;
  v_client_id text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_ref := trim(coalesce(p_booking_ref, ''));
  v_clean_token := trim(coalesce(p_voucher_token, ''));
  v_client_id := public.get_request_client_identity();

  IF char_length(v_clean_ref) < 3 THEN
    RETURN NULL;
  END IF;

  IF NOT public.check_and_increment_rate_limit('booking_lookup:' || v_client_id, 20, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  IF NOT public.check_and_increment_rate_limit('booking_lookup:target:' || v_clean_ref, 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests for this booking. Please try again later.');
  END IF;

  SELECT id, booking_ref, venue_id, venue_name, sport, slot_date, slot_time, court_number, status, user_id, voucher_token, customer_name
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = v_clean_ref
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 24 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token THEN
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

-- Profile RLS: Authenticated owner read only (No direct public phone/email scraping)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;

CREATE POLICY "profiles_owner_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Revoke anon EXECUTE on host/moderator procedures
DO $$
DECLARE
  r record;
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
  END LOOP;
END $$;

-- Enforce FORCE ROW LEVEL SECURITY across all sensitive tables
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_security_events FORCE ROW LEVEL SECURITY;

COMMIT;
