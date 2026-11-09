\set ON_ERROR_STOP on
DO $$
DECLARE
  v_result jsonb;
  v_retry jsonb;
  v_voucher jsonb;
  v_booking_ref text;
  v_token text;
  v_status text;
  v_amount numeric;
  v_new_venue_id uuid;
BEGIN
  IF public.verify_security_schema_migrations()->>'status' <> 'fully_reconciled' THEN
    RAISE EXCEPTION 'verification helper did not report fully_reconciled: %', public.verify_security_schema_migrations();
  END IF;

  IF to_regprocedure('public.reserve_venue_slot_atomic(text,text,text,integer,text,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy seven-argument reserve RPC remains';
  END IF;
  IF to_regprocedure('public.create_venue_slot_booking(text,text,text,text,text,text,text,text,numeric,numeric,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy create_venue_slot_booking remains';
  END IF;
  IF to_regprocedure('public.record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy 15-argument subscription RPC remains';
  END IF;
  IF to_regprocedure('public.get_listing_subscription_by_order(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy one-argument subscription lookup remains';
  END IF;

  IF (SELECT proargnames[8] FROM pg_proc WHERE oid='public.reserve_venue_slot_atomic(text,text,text,integer,text,text,text,text,text)'::regprocedure) <> 'p_payment_method' THEN
    RAISE EXCEPTION 'reserve RPC payment argument name mismatch';
  END IF;
  IF (SELECT proargnames[2] FROM pg_proc WHERE oid='public.get_venue_booking_voucher(text,text)'::regprocedure) <> 'p_voucher_token' THEN
    RAISE EXCEPTION 'voucher RPC token argument name mismatch';
  END IF;
  IF (SELECT prorettype::regtype::text FROM pg_proc WHERE oid='public.get_venue_booking_voucher(text,text)'::regprocedure) <> 'jsonb' THEN
    RAISE EXCEPTION 'voucher RPC return type mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='athlete_profiles'
      AND policyname IN ('athlete_profiles_public_insert','athlete_profiles_self_update')
  ) THEN RAISE EXCEPTION 'permissive athlete profile policies remain'; END IF;

  IF has_column_privilege('authenticated','public.athlete_profiles','publication_status','INSERT')
     OR has_column_privilege('authenticated','public.athlete_profiles','publication_status','UPDATE')
     OR has_column_privilege('authenticated','public.athlete_profiles','verification_status','INSERT')
     OR has_column_privilege('authenticated','public.athlete_profiles','verification_status','UPDATE')
     OR has_column_privilege('authenticated','public.athlete_profiles','user_id','UPDATE') THEN
    RAISE EXCEPTION 'authenticated users retain direct privileges on moderation/ownership columns';
  END IF;
  IF NOT has_column_privilege('authenticated','public.athlete_profiles','full_name','INSERT')
     OR NOT has_column_privilege('authenticated','public.athlete_profiles','summary','UPDATE') THEN
    RAISE EXCEPTION 'athlete profile owner field privileges were not granted';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='athlete_profiles' AND column_name='publication_status') NOT LIKE '%draft%' THEN
    RAISE EXCEPTION 'new athlete profiles do not default to draft';
  END IF;

  IF has_function_privilege('anon','public.record_payment_transaction(text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'anon can still execute record_payment_transaction';
  END IF;
  IF has_function_privilege('anon','public.check_and_increment_rate_limit(text,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon can directly execute the private rate limiter';
  END IF;

  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='venue_bookings' AND column_name='payment_status') NOT LIKE '%pending%' THEN
    RAISE EXCEPTION 'venue booking payment default is not pending';
  END IF;
  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='venues' AND column_name='slot_hourly_fee') IS NOT NULL THEN
    RAISE EXCEPTION 'fabricated default venue tariff remains';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='venue_bookings' AND indexname='uq_venue_bookings_idempotency') THEN
    RAISE EXCEPTION 'idempotency unique index missing';
  END IF;

  INSERT INTO public.venues (slug,name,city,sport,slot_hourly_fee,fee_provenance,pricing_status)
  VALUES ('verified-fixture','Fixture Arena','Delhi','Football',550,'verified','verified');
  INSERT INTO public.venue_courts (venue_id,name,hourly_price_paise,is_bookable)
  SELECT id,'Court 1',30000,true FROM public.venues WHERE slug='verified-fixture';

  v_result := public.reserve_venue_slot_atomic(
    'verified-fixture','2026-12-01','10:00',1,'Test Athlete','9876543210',NULL,'online','fixture-idem-001'
  );
  IF coalesce((v_result->>'success')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'valid booking failed: %', v_result;
  END IF;
  IF v_result->>'status' <> 'pending' OR v_result->>'payment_status' <> 'pending' THEN
    RAISE EXCEPTION 'online booking not held as pending: %', v_result;
  END IF;
  IF (v_result->>'total_amount')::numeric <> 300 THEN
    RAISE EXCEPTION 'exact court tariff not used: %', v_result;
  END IF;
  v_booking_ref := v_result->>'booking_ref';
  v_token := v_result->>'voucher_token';

  v_retry := public.reserve_venue_slot_atomic(
    'verified-fixture','2026-12-01','10:00',1,'Test Athlete','9876543210',NULL,'online','fixture-idem-001'
  );
  IF v_retry->>'booking_ref' <> v_booking_ref OR coalesce((v_retry->>'idempotent')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'idempotent retry failed: %', v_retry;
  END IF;

  v_voucher := public.get_venue_booking_voucher(v_booking_ref,v_token);
  IF coalesce((v_voucher->>'success')::boolean,false) IS NOT TRUE
     OR v_voucher->>'customer_display_name' <> 'T***' THEN
    RAISE EXCEPTION 'guest voucher token/masking failed: %', v_voucher;
  END IF;
  v_voucher := public.get_venue_booking_voucher(v_booking_ref,NULL);
  IF v_voucher->>'error' <> 'ACCESS_DENIED' THEN
    RAISE EXCEPTION 'voucher lookup without token was not denied: %', v_voucher;
  END IF;

  INSERT INTO public.venues (slug,name,city,sport,slot_hourly_fee)
  VALUES ('unverified-fixture','Unverified Arena','Delhi','Tennis',600);
  v_result := public.reserve_venue_slot_atomic(
    'unverified-fixture','2026-12-02','11:00',1,'Test Athlete','9876543210',NULL,'online','fixture-idem-002'
  );
  IF v_result->>'error' <> 'PRICE_UNRESOLVED' THEN
    RAISE EXCEPTION 'unverified tariff was not rejected: %', v_result;
  END IF;

  INSERT INTO public.venues (slug,name,city,sport,slot_hourly_fee,fee_provenance,pricing_status)
  VALUES ('pay-at-venue-fixture','Pay at Venue Arena','Delhi','Tennis',700,'verified','verified');
  v_result := public.reserve_venue_slot_atomic(
    'pay-at-venue-fixture','2026-12-03','12:00',1,'Test Athlete','9876543210',NULL,'pay_at_venue','fixture-idem-003'
  );
  IF v_result->>'status' <> 'confirmed' OR v_result->>'payment_status' <> 'pay_at_venue' THEN
    RAISE EXCEPTION 'pay-at-venue booking lifecycle failed: %', v_result;
  END IF;
END;
$$;

SELECT 'Phase 5.7.1 PostgreSQL migration integration assertions passed' AS result;
