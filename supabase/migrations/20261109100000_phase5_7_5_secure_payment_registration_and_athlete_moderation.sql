-- =============================================================================
-- Phase 5.7.5 — Secure Payment Registration, Subscription RPC Compatibility,
-- and Athlete Moderation
--
-- Development-first migration. Historical payment/subscription rows are retained.
-- New browser registrations can create pending intents only; settlement remains
-- exclusively in the server-side verified settlement procedure.
-- =============================================================================

BEGIN;

-- 1. Payment schema: make pending the only implicit state and align accepted
-- values with the current frontend contract. Preserve all historical rows.
ALTER TABLE public.khelgrid_payments
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.khelgrid_payments
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_status_check;
ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_status_check
  CHECK (status IN ('pending', 'pending_verification', 'completed', 'failed', 'refunded', 'pay_at_venue', 'reconciliation_required'));

ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_payment_method_check;
ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_payment_method_check
  CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cash_at_venue', 'pay_at_venue'));

ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_item_type_check;
ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_item_type_check
  CHECK (item_type IN ('pickup_match', 'venue_booking', 'trial_registration', 'athlete_verification', 'listing_plan', 'membership'));

-- Current browser-generated KG_ORD identifiers are unique. Exclude historical
-- fixtures/legacy order IDs that predate this format; do not rewrite old data.
CREATE UNIQUE INDEX IF NOT EXISTS uq_khelgrid_payments_new_order_id
  ON public.khelgrid_payments (order_id)
  WHERE order_id ~ '^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$';

-- The frontend's order ID is also the idempotency boundary. This index applies
-- only to new rows carrying an explicit idempotency key, preserving old duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_khelgrid_payments_idempotency_key
  ON public.khelgrid_payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- The old SECURITY DEFINER RPC accepts a caller-supplied payment status.
-- Keep it for trusted server compatibility only; browsers must use the Edge Function.
REVOKE EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb)
  TO service_role;

-- 2. Listing subscription schema drift: the hosted 16-argument function refers to
-- access_token, idempotency_key and updated_at, but those columns were absent.
ALTER TABLE public.listing_subscriptions
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.listing_subscriptions
  ALTER COLUMN is_active SET DEFAULT false,
  ALTER COLUMN payment_status SET DEFAULT 'pending';

ALTER TABLE public.listing_subscriptions
  DROP CONSTRAINT IF EXISTS listing_subscriptions_payment_status_check;
ALTER TABLE public.listing_subscriptions
  ADD CONSTRAINT listing_subscriptions_payment_status_check
  CHECK (payment_status IN ('pending', 'pay_at_venue', 'paid', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_subscriptions_new_order_id
  ON public.listing_subscriptions (order_id)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_subscriptions_idempotency_key
  ON public.listing_subscriptions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Legacy duplicates are retained. New order IDs must use the stronger generated
-- format and are protected by the partial unique index above.
-- Close the unsafe 15-argument overload, which can set is_active=true from client
-- supplied p_payment_status='paid'.
DO $legacy_subscription$
BEGIN
  IF to_regprocedure('public.record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb)
      FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb);
  END IF;
END;
$legacy_subscription$;

-- Public SELECT on listing_subscriptions exposes customer PII and access tokens.
DROP POLICY IF EXISTS listing_subscriptions_read ON public.listing_subscriptions;
DROP POLICY IF EXISTS listing_subscriptions_owner_read ON public.listing_subscriptions;
REVOKE SELECT ON public.listing_subscriptions FROM PUBLIC, anon;
GRANT SELECT ON public.listing_subscriptions TO authenticated;
CREATE POLICY listing_subscriptions_owner_read
  ON public.listing_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3. Server-only rate limiter. The key supplied by Edge Functions is a SHA-256
-- digest of network and customer identifiers; raw IP/phone values are not stored.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.payment_registration_rate_limits (
  identifier text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.payment_registration_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.payment_registration_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_payment_registration_rate_limit(
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF nullif(trim(coalesce(p_identifier, '')), '') IS NULL
     OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO private.payment_registration_rate_limits (
    identifier, window_started_at, request_count, updated_at
  ) VALUES (p_identifier, v_now, 1, v_now)
  ON CONFLICT (identifier) DO UPDATE
  SET request_count = CASE
        WHEN private.payment_registration_rate_limits.window_started_at
             <= v_now - make_interval(secs => p_window_seconds)
        THEN 1
        ELSE private.payment_registration_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN private.payment_registration_rate_limits.window_started_at
             <= v_now - make_interval(secs => p_window_seconds)
        THEN v_now
        ELSE private.payment_registration_rate_limits.window_started_at
      END,
      updated_at = v_now
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_payment_registration_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_payment_registration_rate_limit(text, integer, integer)
  TO service_role;

-- 4. Replace the safe 16-argument listing subscription overload. It accepts
-- pending intents only; it never activates a listing. Only settlement may do so.
CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  p_order_id text,
  p_payment_id text,
  p_listing_type text,
  p_listing_name text,
  p_city text,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_duration_days integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_payment_status text DEFAULT 'pending',
  p_listing_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order text := trim(coalesce(p_order_id, ''));
  v_idempotency text;
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(trim(coalesce(p_customer_phone, '')), '[^0-9]', '', 'g');
  v_plan_name text;
  v_expected_amount numeric(10,2);
  v_expected_days integer;
  v_status text;
  v_expires_at timestamptz;
  v_access_token text;
  v_existing public.listing_subscriptions%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF v_order !~ '^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$' THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_ORDER','message','A valid KhelGrid order ID is required.');
  END IF;
  IF length(v_name) < 2 OR length(v_phone) < 10 THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_CUSTOMER','message','Valid customer name and mobile number are required.');
  END IF;
  IF p_listing_type NOT IN ('academy','venue','opportunity','pickup_game') THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_LISTING_TYPE','message','Unsupported listing type.');
  END IF;

  CASE p_plan_id
    WHEN '1_day' THEN v_expected_amount := 99; v_expected_days := 1; v_plan_name := '1-Day Listing';
    WHEN '1_month' THEN v_expected_amount := 499; v_expected_days := 30; v_plan_name := '1-Month Listing';
    WHEN '6_months' THEN v_expected_amount := 2499; v_expected_days := 180; v_plan_name := '6-Month Listing';
    WHEN '1_year' THEN v_expected_amount := 4499; v_expected_days := 365; v_plan_name := '1-Year Listing';
    WHEN 'lifelong' THEN v_expected_amount := 9999; v_expected_days := 0; v_plan_name := 'Lifelong Listing';
    ELSE RETURN jsonb_build_object('status','error','error_code','INVALID_PLAN','message','Unsupported listing plan.');
  END CASE;

  IF p_amount IS DISTINCT FROM v_expected_amount OR p_duration_days IS DISTINCT FROM v_expected_days THEN
    RETURN jsonb_build_object('status','error','error_code','PLAN_PRICE_MISMATCH','message','The submitted amount or duration does not match the selected listing plan.');
  END IF;

  IF p_payment_status NOT IN ('pending','pay_at_venue') THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_PAYMENT_STATE','message','Client registrations can only create pending payment intents.');
  END IF;

  v_status := p_payment_status;
  v_idempotency := coalesce(nullif(trim(coalesce(p_idempotency_key,'')),''),v_order);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_order,0));

  SELECT * INTO v_existing
  FROM public.listing_subscriptions
  WHERE order_id = v_order OR idempotency_key = v_idempotency
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.customer_phone <> v_phone
       OR v_existing.plan_id <> p_plan_id
       OR v_existing.amount <> v_expected_amount
       OR v_existing.listing_type <> p_listing_type THEN
      RETURN jsonb_build_object('status','error','error_code','ORDER_CONFLICT','message','This order ID is already associated with a different registration.');
    END IF;
    RETURN jsonb_build_object(
      'status','pending_verification',
      'idempotent',true,
      'subscription_id',v_existing.id,
      'plan_id',v_existing.plan_id,
      'plan_name',v_existing.plan_name,
      'is_active',false,
      'payment_status',v_existing.payment_status,
      'expires_at',v_existing.expires_at,
      'access_token',v_existing.access_token,
      'message','Subscription remains pending until verified payment settlement.'
    );
  END IF;

  IF NOT public.consume_payment_registration_rate_limit(
    'listing-subscription:' || md5(v_phone), 5, 600
  ) THEN
    RETURN jsonb_build_object('status','error','error_code','RATE_LIMITED','message','Too many subscription attempts. Please try again later.');
  END IF;

  v_expires_at := CASE
    WHEN v_expected_days = 0 THEN NULL
    ELSE now() + make_interval(days => v_expected_days)
  END;
  v_access_token := encode(extensions.gen_random_bytes(24),'hex');

  INSERT INTO public.listing_subscriptions (
    order_id,payment_id,user_id,listing_type,listing_id,listing_name,city,
    plan_id,plan_name,amount,duration_days,customer_name,customer_phone,
    customer_email,starts_at,expires_at,is_active,payment_status,metadata,
    access_token,idempotency_key,updated_at
  ) VALUES (
    v_order,NULL,auth.uid(),p_listing_type,nullif(trim(coalesce(p_listing_id,'')),''),
    trim(p_listing_name),trim(p_city),p_plan_id,v_plan_name,v_expected_amount,
    v_expected_days,v_name,v_phone,nullif(lower(trim(coalesce(p_customer_email,''))),''),
    now(),v_expires_at,false,v_status,coalesce(p_metadata,'{}'::jsonb),
    v_access_token,v_idempotency,now()
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'status','pending_verification',
    'subscription_id',v_new_id,
    'plan_id',p_plan_id,
    'plan_name',v_plan_name,
    'is_active',false,
    'payment_status',v_status,
    'expires_at',v_expires_at,
    'access_token',v_access_token,
    'message','Subscription registered as pending. It will activate only after verified settlement.'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status','error','error_code','DUPLICATE_ORDER','message','This order or idempotency key has already been used.');
END;
$function$;

REVOKE ALL ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb, text)
  TO service_role;

-- Close the legacy one-argument lookup that returns full table rows (including PII).
DO $block$
BEGIN
  IF to_regprocedure('public.get_listing_subscription_by_order(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.get_listing_subscription_by_order(text);
  END IF;
END;
$block$;

-- 5. Athlete moderation: add explicit rejection state and immutable audit history.
ALTER TABLE public.athlete_profiles
  DROP CONSTRAINT IF EXISTS athlete_profiles_verification_status_check;
ALTER TABLE public.athlete_profiles
  ADD CONSTRAINT athlete_profiles_verification_status_check
  CHECK (verification_status IN ('community','verified','pro','rejected'));

CREATE TABLE IF NOT EXISTS public.athlete_profile_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_profile_id uuid NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  old_publication_status text NOT NULL,
  new_publication_status text NOT NULL,
  old_verification_status text NOT NULL,
  new_verification_status text NOT NULL,
  moderation_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_athlete_profile_moderation_audit_profile_created
  ON public.athlete_profile_moderation_audit (athlete_profile_id, created_at DESC);
ALTER TABLE public.athlete_profile_moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.athlete_profile_moderation_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.athlete_profile_moderation_audit TO service_role;

CREATE OR REPLACE FUNCTION public.moderate_athlete_profile(
  p_profile_id uuid,
  p_publication_status text,
  p_verification_status text,
  p_moderation_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_profile public.athlete_profiles%ROWTYPE;
  v_note text := nullif(trim(coalesce(p_moderation_note,'')),'');
BEGIN
  IF v_actor IS NULL OR NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status','error','error_code','UNAUTHORIZED','message','Athlete moderation requires an authenticated platform administrator.');
  END IF;
  IF p_publication_status NOT IN ('draft','published','archived') THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_PUBLICATION_STATUS');
  END IF;
  IF p_verification_status NOT IN ('community','verified','pro','rejected') THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_VERIFICATION_STATUS');
  END IF;
  IF v_note IS NOT NULL AND length(v_note) > 2000 THEN
    RETURN jsonb_build_object('status','error','error_code','NOTE_TOO_LONG');
  END IF;

  SELECT * INTO v_profile
  FROM public.athlete_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','error_code','PROFILE_NOT_FOUND');
  END IF;

  UPDATE public.athlete_profiles
  SET publication_status = p_publication_status,
      verification_status = p_verification_status,
      updated_at = now()
  WHERE id = p_profile_id;

  INSERT INTO public.athlete_profile_moderation_audit (
    athlete_profile_id,actor_user_id,old_publication_status,new_publication_status,
    old_verification_status,new_verification_status,moderation_note
  ) VALUES (
    p_profile_id,v_actor,v_profile.publication_status,p_publication_status,
    v_profile.verification_status,p_verification_status,v_note
  );

  RETURN jsonb_build_object(
    'status','success',
    'profile_id',p_profile_id,
    'publication_status',p_publication_status,
    'verification_status',p_verification_status,
    'moderated_at',now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.moderate_athlete_profile(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_athlete_profile(uuid, text, text, text)
  TO authenticated;

COMMIT;
