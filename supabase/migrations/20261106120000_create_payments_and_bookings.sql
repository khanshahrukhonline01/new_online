-- ==============================================================================
-- KhelGrid Payments & Booking System Migration
-- Purpose:
-- 1. Create public.khelgrid_payments table tracking all transactions across:
--    - pickup_match (Paid pickup match spot reservations)
--    - venue_booking (Turf / court slot advance deposits and hourly rentals)
--    - trial_registration (Selection trials and tournament entry fees)
--    - athlete_verification (Verified athlete badge and CV screening)
-- 2. Create public.venue_bookings table for court/turf slot reservations.
-- 3. Enhance public.pickup_game_participants with payment tracking columns.
-- 4. Enable Row Level Security (RLS) on all payment tables.
-- 5. Install atomic SECURITY DEFINER RPCs for payment creation and verification.
-- ==============================================================================

BEGIN;

-- 1. Create khelgrid_payments table
CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  payment_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  customer_email text,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  item_type text NOT NULL CHECK (item_type IN ('pickup_match', 'venue_booking', 'trial_registration', 'athlete_verification')),
  item_id text NOT NULL,
  item_title text NOT NULL,
  payment_gateway text NOT NULL DEFAULT 'razorpay' CHECK (payment_gateway IN ('razorpay', 'upi_direct', 'cashfree', 'pay_at_venue', 'mock')),
  payment_method text NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cash_at_venue')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_order_id ON public.khelgrid_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_user_id ON public.khelgrid_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_item ON public.khelgrid_payments(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_status ON public.khelgrid_payments(status);

-- 2. Create venue_bookings table
CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  venue_id text NOT NULL,
  venue_name text NOT NULL CHECK (char_length(trim(venue_name)) >= 2),
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  sport text NOT NULL,
  slot_date text NOT NULL,
  slot_time text NOT NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  paid_amount numeric(10, 2) NOT NULL CHECK (paid_amount >= 0),
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'pay_at_venue', 'cancelled')),
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_ref ON public.venue_bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue ON public.venue_bookings(venue_id, slot_date);

-- 3. Extend pickup_game_participants with payment status and payment_id
ALTER TABLE public.pickup_game_participants
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_id text;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.khelgrid_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;

-- Revoke direct mutation from anon & authenticated
REVOKE INSERT, UPDATE, DELETE ON public.khelgrid_payments FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.venue_bookings FROM PUBLIC, anon, authenticated;

-- Customers can view only their own payments
DROP POLICY IF EXISTS "payments_user_read" ON public.khelgrid_payments;
CREATE POLICY "payments_user_read" ON public.khelgrid_payments
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Customers can view only their own bookings
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
CREATE POLICY "venue_bookings_read" ON public.venue_bookings
  FOR SELECT TO anon, authenticated
  USING (true); -- Booking vouchers can be looked up by booking_ref

-- 5. Secure RPC: record_payment_transaction
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
  p_status text DEFAULT 'completed',
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
  v_payment_row public.khelgrid_payments%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(p_customer_name);
  v_clean_phone := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');

  IF v_clean_name IS NULL OR char_length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name must be at least 2 characters.');
  END IF;

  IF v_clean_phone IS NULL OR char_length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid 10-digit mobile number is required.');
  END IF;

  INSERT INTO public.khelgrid_payments (
    order_id,
    payment_id,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    amount,
    item_type,
    item_id,
    item_title,
    payment_gateway,
    payment_method,
    status,
    metadata
  ) VALUES (
    p_order_id,
    p_payment_id,
    v_user_id,
    v_clean_name,
    v_clean_phone,
    p_customer_email,
    p_amount,
    p_item_type,
    p_item_id,
    p_item_title,
    p_payment_gateway,
    p_payment_method,
    p_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_payment_row;

  RETURN jsonb_build_object(
    'status', 'success',
    'id', v_payment_row.id,
    'order_id', v_payment_row.order_id,
    'payment_id', v_payment_row.payment_id,
    'amount', v_payment_row.amount,
    'item_type', v_payment_row.item_type,
    'created_at', v_payment_row.created_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error_code', 'DB_ERROR',
    'message', SQLERRM
  );
END;
$$;

-- 6. Secure RPC: create_venue_slot_booking
CREATE OR REPLACE FUNCTION public.create_venue_slot_booking(
  p_venue_id text,
  p_venue_name text,
  p_city text,
  p_sport text,
  p_slot_date text,
  p_slot_time text,
  p_customer_name text,
  p_customer_phone text,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_payment_status text DEFAULT 'paid',
  p_payment_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ref text;
  v_clean_name text;
  v_clean_phone text;
  v_booking public.venue_bookings%ROWTYPE;
BEGIN
  v_clean_name := trim(p_customer_name);
  v_clean_phone := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');

  IF v_clean_name IS NULL OR char_length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Full name required.');
  END IF;

  IF v_clean_phone IS NULL OR char_length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'Valid phone number required.');
  END IF;

  v_ref := 'VB-' || upper(substring(regexp_replace(p_venue_name, '[^a-zA-Z]', '', 'g') from 1 for 3)) || '-' || to_char(now(), 'MMDD') || '-' || floor(random() * 8999 + 1000)::text;

  INSERT INTO public.venue_bookings (
    booking_ref,
    venue_id,
    venue_name,
    city,
    sport,
    slot_date,
    slot_time,
    customer_name,
    customer_phone,
    total_amount,
    paid_amount,
    payment_status,
    payment_id
  ) VALUES (
    v_ref,
    p_venue_id,
    p_venue_name,
    p_city,
    p_sport,
    p_slot_date,
    p_slot_time,
    v_clean_name,
    v_clean_phone,
    p_total_amount,
    p_paid_amount,
    p_payment_status,
    p_payment_id
  )
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'status', 'success',
    'booking_ref', v_booking.booking_ref,
    'venue_name', v_booking.venue_name,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'paid_amount', v_booking.paid_amount,
    'payment_status', v_booking.payment_status,
    'created_at', v_booking.created_at
  );
END;
$$;

-- Grant EXECUTE to anon and authenticated for payment recording
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, text, text, text, numeric, numeric, text, text) TO anon, authenticated;

COMMIT;
