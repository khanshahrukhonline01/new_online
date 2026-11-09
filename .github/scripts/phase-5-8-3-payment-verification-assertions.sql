\set ON_ERROR_STOP on
BEGIN;
DO $phase583$
DECLARE v_def text;
BEGIN
  IF to_regprocedure('public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)') IS NULL THEN RAISE EXCEPTION 'strict Razorpay settlement adapter missing'; END IF;
  IF NOT has_function_privilege('service_role','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE') THEN RAISE EXCEPTION 'strict settlement adapter grants are unsafe'; END IF;
  SELECT pg_get_functiondef('public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)'::regprocedure) INTO v_def;
  IF position('p_expected_amount_paisa <= 0' in v_def)=0 OR position('PROVIDER_ORDER_MISMATCH' in v_def)=0
     OR position('SETTLED_WITH_DIFFERENT_PAYMENT' in v_def)=0 OR position('amount_paise' in v_def)=0 THEN
    RAISE EXCEPTION 'strict settlement adapter is missing required guards';
  END IF;
END;
$phase583$;
ROLLBACK;
