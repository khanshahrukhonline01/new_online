\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb LANGUAGE sql STABLE
AS $ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $;

-- Match the standard Supabase API role access to auth identity helpers.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon, authenticated, service_role;

-- Mirror the hosted development athlete_profiles column contract.
-- Keep the unsafe historical publication default so the migration must change it.
CREATE TABLE public.athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  sport text NOT NULL,
  playing_position text NOT NULL DEFAULT 'Athlete',
  city text NOT NULL DEFAULT 'India',
  state text,
  date_of_birth date,
  team_or_academy text,
  coach text,
  experience_years text,
  primary_foot_or_hand text,
  height_cm integer,
  weight_kg integer,
  summary text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_clips jsonb NOT NULL DEFAULT '[]'::jsonb,
  fitness_benchmarks jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_card_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_status text NOT NULL DEFAULT 'community' CHECK (verification_status IN ('community','verified','pro')),
  publication_status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  is_public_cv boolean DEFAULT false,
  consent_scout_sharing boolean DEFAULT false
);
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY athlete_profiles_public_insert ON public.athlete_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY athlete_profiles_self_update ON public.athlete_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY athlete_profiles_owner_insert ON public.athlete_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY athlete_profiles_owner_update ON public.athlete_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.listing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  payment_id text,
  user_id uuid,
  listing_type text NOT NULL DEFAULT 'academy',
  listing_id text,
  listing_name text NOT NULL DEFAULT 'Fixture Listing',
  city text NOT NULL DEFAULT 'Delhi',
  plan_id text NOT NULL DEFAULT '1_month',
  plan_name text NOT NULL DEFAULT '1-Month Listing',
  amount numeric(10,2) NOT NULL DEFAULT 499,
  duration_days integer NOT NULL DEFAULT 30,
  customer_name text NOT NULL DEFAULT 'Fixture Host',
  customer_phone text NOT NULL DEFAULT '9876543210',
  customer_email text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','pay_at_venue','pending','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_subscriptions_owner_select ON public.listing_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
GRANT SELECT ON public.listing_subscriptions TO PUBLIC;
CREATE TABLE public.khelgrid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  payment_id text,
  user_id uuid,
  customer_name text NOT NULL DEFAULT 'Fixture Customer',
  customer_phone text NOT NULL DEFAULT '9876543210',
  customer_email text,
  amount numeric(10,2) NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'INR',
  item_type text NOT NULL CHECK (item_type IN ('pickup_match','venue_booking','trial_registration','athlete_verification','listing_plan')),
  item_id text NOT NULL DEFAULT 'fixture-item',
  item_title text NOT NULL DEFAULT 'Fixture Item',
  payment_gateway text NOT NULL DEFAULT 'razorpay',
  payment_method text NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi','card','netbanking','wallet','cash_at_venue')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.khelgrid_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_user_read ON public.khelgrid_payments
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
GRANT SELECT ON public.khelgrid_payments TO PUBLIC;
GRANT ALL ON public.khelgrid_payments TO service_role;
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  sport text NOT NULL,
  government_facility boolean NOT NULL DEFAULT false,
  slot_hourly_fee numeric DEFAULT 800,
  payment_status text DEFAULT 'paid'
);
CREATE TABLE public.sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text NOT NULL,
  is_published boolean NOT NULL DEFAULT true
);
CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text,
  display_name text,
  city text,
  publication_status text NOT NULL DEFAULT 'published'
);
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text,
  title text,
  publication_status text NOT NULL DEFAULT 'published'
);
CREATE TABLE public.academies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, name text, payment_status text DEFAULT 'paid');
CREATE TABLE public.opportunities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, title text, payment_status text DEFAULT 'paid');
CREATE TABLE public.pickup_games (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, sport text, payment_status text DEFAULT 'paid');

CREATE TABLE public.venue_courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  name text NOT NULL,
  hourly_price_paise integer,
  is_bookable boolean NOT NULL DEFAULT false
);
CREATE TABLE public.venue_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  venue_id text NOT NULL,
  venue_name text NOT NULL,
  city text NOT NULL,
  sport text NOT NULL,
  slot_date text NOT NULL,
  slot_time text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  total_amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'paid',
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  voucher_token text,
  status text DEFAULT 'confirmed',
  court_number integer DEFAULT 1,
  expires_at timestamptz,
  cancellation_reason text,
  customer_email text,
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX uq_venue_slot_concurrency
  ON public.venue_bookings (venue_id, slot_date, slot_time, coalesce(court_number,1))
  WHERE status IN ('confirmed','pending');

CREATE TABLE public.pickup_game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  user_id text,
  status text NOT NULL DEFAULT 'confirmed'
);
CREATE TABLE public.pickup_game_rsvp_rate_limits (
  identifier text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_pickup_game_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$ SELECT false $function$;
REVOKE ALL ON FUNCTION public.is_pickup_game_admin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_service_role_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$ SELECT false $function$;

CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
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
) RETURNS jsonb LANGUAGE sql AS $function$ SELECT '{}'::jsonb $function$;

CREATE OR REPLACE FUNCTION public.create_venue_slot_booking(
  text,text,text,text,text,text,text,text,numeric,numeric,text,text
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

CREATE OR REPLACE FUNCTION public.reserve_venue_slot_atomic(
  text,text,text,integer,text,text,text
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE OR REPLACE FUNCTION public.reserve_venue_slot_atomic(
  p_venue_id text, p_slot_date text, p_slot_time text,
  p_court_number integer DEFAULT 1, p_customer_name text DEFAULT '',
  p_customer_phone text DEFAULT '', p_customer_email text DEFAULT NULL,
  p_payment_method text DEFAULT 'online', p_idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(text)
RETURNS SETOF public.listing_subscriptions LANGUAGE sql AS $$ SELECT * FROM public.listing_subscriptions WHERE false $$;

-- Hosted project has only the legacy two-text-argument TABLE overload.
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text, p_customer_phone text
) RETURNS TABLE (
  booking_ref text, venue_name text, city text, sport text, slot_date text,
  slot_time text, court_number integer, customer_name text, payment_status text,
  total_amount numeric, paid_amount numeric, status text, created_at timestamptz
) LANGUAGE sql AS $$ SELECT NULL::text,NULL::text,NULL::text,NULL::text,NULL::text,NULL::text,NULL::integer,NULL::text,NULL::text,NULL::numeric,NULL::numeric,NULL::text,NULL::timestamptz WHERE false $$;


-- Payment webhook ledger exists in the hosted development schema. Keep this
-- fixture aligned so Phase 5.8.1.4 can be applied in isolated PostgreSQL CI.
CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  order_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'processed',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_events_service_all ON public.payment_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON public.payment_webhook_events TO service_role;

INSERT INTO public.khelgrid_payments (
  order_id, customer_name, customer_phone, amount, currency,
  item_type, item_id, item_title, payment_gateway, payment_method, status, metadata
) VALUES
  ('KG_ORD_PHASE5814_BACKFILL_01', 'Legacy Fixture', '9999999999', 499.00, 'INR',
   'venue_booking', 'fixture-venue-1', 'Legacy completed payment', 'mock', 'upi', 'completed', '{}'::jsonb),
  ('KG_ORD_PHASE5814_BACKFILL_02', 'Legacy Fixture', '9999999998', 123.45, 'INR',
   'venue_booking', 'fixture-venue-2', 'Legacy pending payment', 'mock', 'upi', 'pending', '{}'::jsonb);
