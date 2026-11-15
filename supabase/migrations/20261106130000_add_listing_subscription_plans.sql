-- ==============================================================================
-- KhelGrid Listing Subscription Plans & Monetization Migration
-- Purpose:
-- 1. Extend public.khelgrid_payments to allow 'listing_plan' in item_type.
-- 2. Create public.listing_subscriptions table tracking active duration plans:
--    - '1_day' (Flash / single-day 24h pass, ₹99)
--    - '1_month' (Monthly batch pass, ₹499)
--    - '6_months' (Semi-annual pass, ₹2,499)
--    - '1_year' (Annual best value pass, ₹4,499)
--    - 'lifelong' (Permanent VIP lifetime pass, ₹9,999)
-- 3. Add listing_plan, plan_price, plan_expires_at, payment_id to:
--    - academies, venues, opportunities, pickup_games
-- 4. Enable Row Level Security (RLS) on listing_subscriptions.
-- 5. Install atomic SECURITY DEFINER RPC public.record_listing_subscription.
-- ==============================================================================

BEGIN;

-- 1. Update khelgrid_payments check constraint to allow 'listing_plan'
ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_item_type_check;

ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_item_type_check
  CHECK (item_type IN ('pickup_match', 'venue_booking', 'trial_registration', 'athlete_verification', 'listing_plan'));

-- 2. Create listing_subscriptions table
CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  payment_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('academy', 'venue', 'opportunity', 'pickup_game')),
  listing_id text,
  listing_name text NOT NULL CHECK (char_length(trim(listing_name)) >= 2),
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  plan_id text NOT NULL CHECK (plan_id IN ('1_day', '1_month', '6_months', '1_year', 'lifelong')),
  plan_name text NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  duration_days integer NOT NULL DEFAULT 30,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  customer_email text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pay_at_venue', 'pending', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_subs_order ON public.listing_subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_listing_subs_user ON public.listing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_subs_plan ON public.listing_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_listing_subs_active ON public.listing_subscriptions(is_active, expires_at);

-- 3. Add listing plan columns to core catalog tables
ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS listing_plan text DEFAULT '1_month',
  ADD COLUMN IF NOT EXISTS plan_price numeric(10, 2) DEFAULT 499,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS listing_plan text DEFAULT '1_month',
  ADD COLUMN IF NOT EXISTS plan_price numeric(10, 2) DEFAULT 499,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS listing_plan text DEFAULT '1_month',
  ADD COLUMN IF NOT EXISTS plan_price numeric(10, 2) DEFAULT 499,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

ALTER TABLE public.pickup_games
  ADD COLUMN IF NOT EXISTS listing_plan text DEFAULT '1_day',
  ADD COLUMN IF NOT EXISTS plan_price numeric(10, 2) DEFAULT 99,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.listing_subscriptions FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
CREATE POLICY "listing_subscriptions_read" ON public.listing_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- 5. Secure RPC: record_listing_subscription
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
  p_payment_status text DEFAULT 'paid',
  p_listing_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_clean_name text;
  v_clean_phone text;
  v_expires_at timestamptz;
  v_sub_row public.listing_subscriptions%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(p_customer_name);
  v_clean_phone := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');

  IF v_clean_name IS NULL OR char_length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Organizer full name is required.');
  END IF;

  IF v_clean_phone IS NULL OR char_length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid 10-digit mobile number is required.');
  END IF;

  IF p_plan_id = 'lifelong' OR p_duration_days = 0 THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  INSERT INTO public.listing_subscriptions (
    order_id,
    payment_id,
    user_id,
    listing_type,
    listing_id,
    listing_name,
    city,
    plan_id,
    plan_name,
    amount,
    duration_days,
    customer_name,
    customer_phone,
    customer_email,
    starts_at,
    expires_at,
    is_active,
    payment_status,
    metadata
  ) VALUES (
    p_order_id,
    p_payment_id,
    v_user_id,
    p_listing_type,
    p_listing_id,
    trim(p_listing_name),
    trim(p_city),
    p_plan_id,
    trim(p_plan_name),
    p_amount,
    p_duration_days,
    v_clean_name,
    v_clean_phone,
    p_customer_email,
    now(),
    v_expires_at,
    true,
    p_payment_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_sub_row;

  RETURN jsonb_build_object(
    'status', 'success',
    'subscription_id', v_sub_row.id,
    'plan_id', v_sub_row.plan_id,
    'plan_name', v_sub_row.plan_name,
    'expires_at', v_sub_row.expires_at,
    'amount', v_sub_row.amount,
    'created_at', v_sub_row.created_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error_code', 'DB_ERROR',
    'message', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb) TO anon, authenticated;

COMMIT;
