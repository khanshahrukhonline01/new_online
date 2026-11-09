BEGIN;

ALTER TABLE public.khelgrid_payments
  ADD COLUMN IF NOT EXISTS checkout_token_hash text,
  ADD COLUMN IF NOT EXISTS provider_order_status text NOT NULL DEFAULT 'not_created',
  ADD COLUMN IF NOT EXISTS provider_order_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_order_created_at timestamptz;

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
