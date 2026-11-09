\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
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
AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

CREATE TABLE public.athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  sport text NOT NULL,
  city text NOT NULL DEFAULT 'India',
  publication_status text NOT NULL DEFAULT 'draft',
  verification_status text NOT NULL DEFAULT 'unverified'
);
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY athlete_profiles_public_insert ON public.athlete_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY athlete_profiles_self_update ON public.athlete_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY athlete_profiles_owner_insert ON public.athlete_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY athlete_profiles_owner_update ON public.athlete_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.listing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  payment_status text DEFAULT 'paid'
);
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
  user_id uuid,
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
AS $$ SELECT false $$;

CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb,text
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

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
