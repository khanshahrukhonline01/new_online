BEGIN;

ALTER TABLE public.khelgrid_payments
  ADD COLUMN IF NOT EXISTS amount_paise bigint,
  ADD COLUMN IF NOT EXISTS provider_order_id text;

UPDATE public.khelgrid_payments
SET amount_paise = round(amount * 100)::bigint
WHERE amount_paise IS NULL;

ALTER TABLE public.khelgrid_payments
  ALTER COLUMN amount_paise SET NOT NULL;

ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_amount_paise_check CHECK (amount_paise > 0);

ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_provider_order_id_check
  CHECK (provider_order_id IS NULL OR length(trim(provider_order_id)) BETWEEN 3 AND 128);

CREATE UNIQUE INDEX uq_khelgrid_payments_provider_order_id
  ON public.khelgrid_payments(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_payment_amount_paise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.amount_paise IS NULL AND NEW.amount IS NOT NULL THEN
      NEW.amount_paise := round(NEW.amount * 100)::bigint;
    ELSIF NEW.amount_paise IS NOT NULL THEN
      IF NEW.amount IS NOT NULL AND round(NEW.amount * 100)::bigint <> NEW.amount_paise THEN
        RAISE EXCEPTION 'amount and amount_paise do not match';
      END IF;
      NEW.amount := NEW.amount_paise::numeric / 100;
    END IF;
  ELSE
    IF NEW.amount_paise IS DISTINCT FROM OLD.amount_paise
       AND NEW.amount IS NOT DISTINCT FROM OLD.amount THEN
      NEW.amount := NEW.amount_paise::numeric / 100;
    ELSIF NEW.amount IS DISTINCT FROM OLD.amount
       AND NEW.amount_paise IS NOT DISTINCT FROM OLD.amount_paise THEN
      NEW.amount_paise := round(NEW.amount * 100)::bigint;
    ELSIF NEW.amount_paise IS DISTINCT FROM OLD.amount_paise
       AND NEW.amount IS DISTINCT FROM OLD.amount
       AND round(NEW.amount * 100)::bigint <> NEW.amount_paise THEN
      RAISE EXCEPTION 'amount and amount_paise do not match';
    END IF;
  END IF;

  IF NEW.amount_paise IS NULL OR NEW.amount_paise <= 0 THEN
    RAISE EXCEPTION 'amount_paise must be a positive integer';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_payment_amount_paise() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_payment_amount_paise ON public.khelgrid_payments;
CREATE TRIGGER trg_sync_payment_amount_paise
BEFORE INSERT OR UPDATE OF amount, amount_paise
ON public.khelgrid_payments
FOR EACH ROW
EXECUTE FUNCTION private.sync_payment_amount_paise();

ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS settlement_data jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.payment_webhook_events
  ALTER COLUMN status SET DEFAULT 'received';

ALTER TABLE public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_attempt_count_check CHECK (attempt_count >= 0);

ALTER TABLE public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_status_check
  CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed_retryable', 'failed_terminal'));

CREATE INDEX idx_payment_webhook_events_retry
  ON public.payment_webhook_events(status, updated_at)
  WHERE status IN ('received', 'failed_retryable');

CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  p_event_id text,
  p_event_type text,
  p_order_id text,
  p_payment_id text,
  p_payload_summary jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_event public.payment_webhook_events%ROWTYPE;
BEGIN
  IF nullif(trim(coalesce(p_event_id, '')), '') IS NULL
     OR nullif(trim(coalesce(p_event_type, '')), '') IS NULL
     OR length(p_event_id) > 255 THEN
    RETURN jsonb_build_object('status', 'invalid_event');
  END IF;

  INSERT INTO public.payment_webhook_events (
    event_id, event_type, order_id, payment_id, status, payload,
    processing_started_at, attempt_count, updated_at
  ) VALUES (
    trim(p_event_id), trim(p_event_type), nullif(trim(coalesce(p_order_id, '')), ''),
    nullif(trim(coalesce(p_payment_id, '')), ''), 'processing',
    coalesce(p_payload_summary, '{}'::jsonb), now(), 1, now()
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed', 'event_id', trim(p_event_id));
  END IF;

  SELECT * INTO v_event
  FROM public.payment_webhook_events
  WHERE event_id = trim(p_event_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'claim_retry');
  END IF;

  IF v_event.status = 'processed' THEN
    RETURN jsonb_build_object('status', 'already_processed', 'event_id', v_event.event_id);
  END IF;

  IF v_event.status IN ('ignored', 'failed_terminal') THEN
    RETURN jsonb_build_object('status', 'ignored', 'event_id', v_event.event_id);
  END IF;

  IF v_event.status = 'processing'
     AND v_event.processing_started_at > now() - interval '5 minutes' THEN
    RETURN jsonb_build_object('status', 'processing_in_flight', 'event_id', v_event.event_id);
  END IF;

  UPDATE public.payment_webhook_events
  SET status = 'processing',
      event_type = trim(p_event_type),
      order_id = nullif(trim(coalesce(p_order_id, '')), ''),
      payment_id = nullif(trim(coalesce(p_payment_id, '')), ''),
      payload = coalesce(p_payload_summary, '{}'::jsonb),
      processing_started_at = now(),
      processed_at = NULL,
      attempt_count = attempt_count + 1,
      last_error = NULL,
      updated_at = now()
  WHERE id = v_event.id;

  RETURN jsonb_build_object('status', 'claimed', 'event_id', trim(p_event_id));
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_webhook_event(
  p_event_id text,
  p_status text,
  p_error_message text DEFAULT NULL,
  p_settlement_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated integer;
BEGIN
  IF p_status NOT IN ('processed', 'ignored', 'failed_retryable', 'failed_terminal') THEN
    RETURN jsonb_build_object('status', 'invalid_status');
  END IF;

  UPDATE public.payment_webhook_events
  SET status = p_status,
      processed_at = CASE WHEN p_status IN ('processed', 'ignored', 'failed_terminal') THEN now() ELSE NULL END,
      last_error = nullif(left(coalesce(p_error_message, ''), 2000), ''),
      settlement_data = p_settlement_data,
      updated_at = now()
  WHERE event_id = trim(coalesce(p_event_id, ''));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  RETURN jsonb_build_object('status', p_status, 'event_id', trim(p_event_id));
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) TO service_role;

COMMIT;
