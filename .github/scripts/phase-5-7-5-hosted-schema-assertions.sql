\set ON_ERROR_STOP on
DO $$
DECLARE
  v_result jsonb;
  v_retry jsonb;
  v_subscription public.listing_subscriptions%ROWTYPE;
  v_payment_constraint text;
BEGIN
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='khelgrid_payments' AND column_name='status') NOT LIKE '%pending%' THEN
    RAISE EXCEPTION 'new payment rows do not default to pending';
  END IF;
  IF NOT has_column_privilege('service_role','public.khelgrid_payments','target_type','INSERT')
     OR NOT has_column_privilege('service_role','public.khelgrid_payments','target_id','INSERT') THEN
    RAISE EXCEPTION 'payment target columns are not available to service_role';
  END IF;
  IF has_function_privilege('anon','public.record_payment_transaction(text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.record_payment_transaction(text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can still execute legacy payment transaction RPC';
  END IF;
  IF NOT has_function_privilege('service_role','public.record_payment_transaction(text,text,text,text,text,numeric,text,text,text,text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'service_role lost legacy transaction compatibility';
  END IF;
  IF has_function_privilege('anon','public.record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb,text)','EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can still execute subscription SECURITY DEFINER RPC';
  END IF;
  IF NOT has_function_privilege('service_role','public.record_listing_subscription(text,text,text,text,text,text,text,numeric,integer,text,text,text,text,text,jsonb,text)','EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute subscription compatibility RPC';
  END IF;
  IF has_function_privilege('anon','public.consume_payment_registration_rate_limit(text,integer,integer)','EXECUTE')
     OR has_function_privilege('authenticated','public.consume_payment_registration_rate_limit(text,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can execute private payment rate limiter';
  END IF;
  IF has_function_privilege('anon','public.moderate_athlete_profile(uuid,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'anonymous users can execute athlete moderation';
  END IF;
  IF NOT has_function_privilege('authenticated','public.moderate_athlete_profile(uuid,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated role cannot call guarded athlete moderation RPC';
  END IF;
  IF has_function_privilege('anon','public.admin_verify_manual_payment(text,text,bigint,text)','EXECUTE') THEN
    RAISE EXCEPTION 'anonymous users can invoke manual payment settlement';
  END IF;
  IF NOT has_function_privilege('authenticated','public.admin_verify_manual_payment(text,text,bigint,text)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated role cannot call admin-guarded manual settlement RPC';
  END IF;
  IF has_table_privilege('anon','public.payment_manual_verification_audit','SELECT')
     OR has_table_privilege('authenticated','public.payment_manual_verification_audit','SELECT') THEN
    RAISE EXCEPTION 'payment manual verification audit is exposed to browser roles';
  END IF;
  IF has_table_privilege('anon','public.listing_subscriptions','SELECT') THEN
    RAISE EXCEPTION 'anonymous users can read subscription PII';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='listing_subscriptions' AND column_name='is_active') NOT LIKE '%false%' THEN
    RAISE EXCEPTION 'new subscriptions default active';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='listing_subscriptions' AND column_name='payment_status') NOT LIKE '%pending%' THEN
    RAISE EXCEPTION 'new subscriptions do not default pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='khelgrid_payments' AND indexname='uq_khelgrid_payments_idempotency_key') THEN
    RAISE EXCEPTION 'payment idempotency index missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='listing_subscriptions' AND indexname='uq_listing_subscriptions_idempotency_key') THEN
    RAISE EXCEPTION 'subscription idempotency index missing';
  END IF;

  v_result := public.moderate_athlete_profile(
    '00000000-0000-0000-0000-000000000001'::uuid, 'published', 'verified', 'Fixture moderation attempt'
  );
  IF v_result->>'error_code' <> 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'non-admin athlete moderation was not denied: %', v_result;
  END IF;
  v_result := public.admin_verify_manual_payment(
    'KG_ORD_FIXTURE_MANUAL_12345678', 'UTR1234567890', 49900, 'Fixture unauthorized settlement test'
  );
  IF v_result->>'error_code' <> 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'non-admin manual payment settlement was not denied: %', v_result;
  END IF;

  -- An untrusted "paid" request must be rejected. The function is service-role
  -- only; direct privilege assertions above prove browser clients cannot invoke it.
  v_result := public.record_listing_subscription(
    'KG_ORD_FIXTURE_PAID_12345678', NULL, 'academy', 'Fixture Academy', 'Delhi',
    '1_month', '1-Month Listing', 499, 30, 'Test Host', '9876543210',
    NULL, 'paid', NULL, '{}'::jsonb, 'fixture-paid-idem'
  );
  IF v_result->>'error_code' <> 'INVALID_PAYMENT_STATE' THEN
    RAISE EXCEPTION 'client-declared paid subscription was not rejected: %', v_result;
  END IF;

  v_result := public.record_listing_subscription(
    'KG_ORD_FIXTURE_PENDING_12345678', NULL, 'academy', 'Fixture Academy', 'Delhi',
    '1_month', '1-Month Listing', 499, 30, 'Test Host', '9876543210',
    NULL, 'pending', NULL, '{}'::jsonb, 'fixture-pending-idem'
  );
  IF v_result->>'status' <> 'pending_verification' OR (v_result->>'is_active')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'valid subscription did not remain pending: %', v_result;
  END IF;
  SELECT * INTO v_subscription FROM public.listing_subscriptions WHERE order_id='KG_ORD_FIXTURE_PENDING_12345678';
  IF v_subscription.is_active IS DISTINCT FROM false OR v_subscription.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'database subscription row was prematurely activated';
  END IF;

  v_retry := public.record_listing_subscription(
    'KG_ORD_FIXTURE_PENDING_12345678', NULL, 'academy', 'Fixture Academy', 'Delhi',
    '1_month', '1-Month Listing', 499, 30, 'Test Host', '9876543210',
    NULL, 'pending', NULL, '{}'::jsonb, 'fixture-pending-idem'
  );
  IF coalesce((v_retry->>'idempotent')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'subscription retry was not idempotent: %', v_retry;
  END IF;

  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='khelgrid_payments' AND column_name='status') NOT LIKE '%pending%' THEN
    RAISE EXCEPTION 'payment default regressed';
  END IF;
END;
$$;

SELECT 'Phase 5.7.5 payment and athlete moderation assertions passed' AS result;
