# Phase 5.8.1.4 — Development Payment Schema Migration Draft

**State:** Schema design and preflight verification complete; migration has NOT been generated or applied.
**Target:** Development Supabase project `hznsbxvovjxvmnchzzqt` only.
**Production:** Strictly out of scope.

## Preflight evidence (2026-11-10)

The development database was queried read-only.

### `public.khelgrid_payments`
- Existing primary key `id uuid`, unique `order_id`, unique partial `idempotency_key`.
- Existing `amount numeric NOT NULL` and `currency text NOT NULL DEFAULT 'INR'`.
- Existing payment provider is `payment_gateway`; existing provider payment ID is `payment_id`.
- Existing statuses include legacy `pending`, `pending_verification`, `completed`, `failed`, `refunded`, `pay_at_venue`, `reconciliation_required`.
- Existing RLS allows authenticated owner SELECT and denies browser writes; service role has server access.
- Preflight row scan: 3 rows; 0 negative amounts; 0 non-positive amounts; 0 values with precision beyond 2 decimal places; 0 non-INR rows. All current records can be backfilled exactly to paise.

### `public.payment_webhook_events`
- Existing unique `event_id`, `event_type`, order/payment references, `status`, JSON payload and creation timestamp.
- Existing service-role-only RLS policy.
- No processing timestamps, retry counter, or last-error field.
- No webhook rows currently exist in the development table.

### Important compatibility discovery
The current `razorpay-webhook` source calls `claim_webhook_event` and `finalize_webhook_event`, but read-only inspection of the development database found neither function. The source files for webhook and payment verification exist in GitHub, but neither function is deployed in the development Edge Function inventory. This migration draft therefore includes the missing database event-claim/finalize procedures; it does not deploy or activate the webhook.

## Migration SQL draft

The following SQL is the reviewed migration body. It must be copied into a new migration created by `supabase migration new phase_5_8_1_4_payment_schema_compatibility` using the Supabase CLI. Do not manually invent a timestamped migration filename.

```sql
BEGIN;

-- 1. Add paise precision and provider-order mapping without replacing the ledger.
ALTER TABLE public.khelgrid_payments
  ADD COLUMN IF NOT EXISTS amount_paise bigint,
  ADD COLUMN IF NOT EXISTS provider_order_id text;

-- Backfill from the legacy numeric INR amount. Preflight confirmed exact 2dp values.
UPDATE public.khelgrid_payments
SET amount_paise = round(amount * 100)::bigint
WHERE amount_paise IS NULL;

ALTER TABLE public.khelgrid_payments
  ALTER COLUMN amount_paise SET NOT NULL;

ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_amount_paise_check;
ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_amount_paise_check
  CHECK (amount_paise > 0);

ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_provider_order_id_check;
ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_provider_order_id_check
  CHECK (provider_order_id IS NULL OR length(trim(provider_order_id)) BETWEEN 3 AND 128);

CREATE UNIQUE INDEX IF NOT EXISTS uq_khelgrid_payments_provider_order_id
  ON public.khelgrid_payments(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

-- Compatibility trigger: legacy writers may continue sending amount (INR);
-- new trusted server writers may send amount_paise. If both change, they must agree.
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

-- 2. Webhook processing/retry observability. Keep existing event IDs and payloads.
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
  DROP CONSTRAINT IF EXISTS payment_webhook_events_attempt_count_check;
ALTER TABLE public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_attempt_count_check
  CHECK (attempt_count >= 0);

ALTER TABLE public.payment_webhook_events
  DROP CONSTRAINT IF EXISTS payment_webhook_events_status_check;
ALTER TABLE public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_status_check
  CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed_retryable', 'failed_terminal'));

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_retry
  ON public.payment_webhook_events(status, updated_at)
  WHERE status IN ('received', 'failed_retryable');

-- 3. Atomic event claim procedure used by razorpay-webhook.
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

  IF v_event.status = 'ignored' OR v_event.status = 'failed_terminal' THEN
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

-- 4. Finalize a claimed event. Retryable failures remain eligible for a later claim.
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

REVOKE ALL ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) TO service_role;

COMMIT;
```

## Compatibility and safety decisions

1. `khelgrid_payments.amount` remains present for legacy frontend, RPC, and settlement readers. The trigger keeps it synchronized with integer `amount_paise`.
2. Existing legacy payment statuses are deliberately not renamed in this migration. Current settlement SQL writes `completed`; application lifecycle maps this to canonical `captured`. A later controlled migration can switch the stored vocabulary after all readers are migrated.
3. Provider order IDs are nullable until Razorpay order creation is implemented. A partial unique index enforces uniqueness when present.
4. Existing `payment_id` is not renamed or made unique in this phase. Settlement already checks duplicate provider payment IDs; a separate historical duplicate audit is required before a unique index.
5. Webhook event payload summaries are retained; do not store full sensitive provider payloads by default.
6. Only service_role can execute claim/finalize procedures. The public event table remains inaccessible to browser roles.
7. The webhook source currently treats a settlement RPC result with `status='error'` as a processed event with error metadata. That behavior requires a separate webhook logic correction and test before webhook deployment; this schema migration does not silently claim to fix it.
8. The migration is additive and transactional. It contains no DROP TABLE, TRUNCATE, data deletion, or production references.

## Required verification after the CLI-generated migration exists

- Apply the migration to an isolated PostgreSQL 17 CI fixture first.
- Verify all three existing payment rows backfill to 80000, 49900, and 20000 paise.
- Verify legacy insert/update by `amount` populates `amount_paise`.
- Verify paise-only insert/update populates legacy `amount`.
- Verify mismatched simultaneous writes fail.
- Verify provider_order_id uniqueness and null compatibility.
- Verify claim idempotency: first claim succeeds, duplicate returns `processing_in_flight`, finalized duplicate returns `already_processed`, stale/retryable claim can retry.
- Verify retry attempt count increments and error text is bounded.
- Verify PUBLIC/anon/authenticated cannot execute webhook procedures.
- Verify service_role can execute both procedures.
- Verify existing owner-read RLS and browser-write denial remain unchanged.
- Run Deno check, TypeScript, ESLint, Vitest, PostgreSQL tests and production build.
- Only after CI passes, apply the same migration to development project `hznsbxvovjxvmnchzzqt`, then re-query schema, constraints, indexes, RLS and function ACLs.

## Current blocker

The connected runtime does not have the Supabase CLI installed, and package download is unavailable. The Supabase skill requires generating the timestamped migration file with `supabase migration new`; inventing a timestamped migration filename or applying DDL without the source migration would create migration-history drift. Therefore this phase has **not** applied DDL or modified the development database. The reviewed SQL above is ready to move into the CLI-generated file when the repository environment has the CLI.
