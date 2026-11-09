BEGIN;

ALTER TABLE public.khelgrid_payments
  ADD COLUMN IF NOT EXISTS checkout_token_hash text,
  ADD COLUMN IF NOT EXISTS provider_order_status text NOT NULL DEFAULT 'not_created',
  ADD COLUMN IF NOT EXISTS provider_order_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_order_created_at timestamptz;

-- Razorpay is a payment method in the provider-neutral payment ledger.
-- Preserve every previously supported method while allowing Razorpay intents.
ALTER TABLE public.khelgrid_payments
  DROP CONSTRAINT IF EXISTS khelgrid_payments_payment_method_check;

ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_payment_method_check
  CHECK (payment_method IN ('upi','card','netbanking','wallet','cash_at_venue','pay_at_venue','razorpay'));

ALTER TABLE public.khelgrid_payments
  ADD CONSTRAINT khelgrid_payments_provider_order_status_check
  CHECK (provider_order_status IN ('not_created','creating','created','creation_unknown','failed'));

CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_provider_order_status
  ON public.khelgrid_payments (provider_order_status, updated_at)
  WHERE provider_order_status <> 'created';

COMMENT ON COLUMN public.khelgrid_payments.checkout_token_hash IS
  'SHA-256 hash of one-time checkout capability returned to the customer; never store raw capability.';
COMMENT ON COLUMN public.khelgrid_payments.provider_order_status IS
  'Razorpay order creation lifecycle; creation_unknown requires reconciliation before retry to prevent duplicate provider orders.';

COMMIT;
