# Phase 5.8.1.3 — Canonical Payment Order Lifecycle Contract

**Status:** Contract and frontend lifecycle guard implemented; database migration and provider adapter remain pending.
**Scope:** Development repository only. No live collection, production deployment, or production database changes.

## 1. Existing ledger decision

The development database already has `public.khelgrid_payments` with a unique internal `order_id`, unique optional `idempotency_key`, provider name, payment ID, currency, target references, status, metadata, and timestamps. Phase 5.8.1.3 retains this as the canonical payment ledger. Do not create a second competing payment-order table.

The next additive migration should extend this table with explicit provider order mapping and integer paise amount, while preserving historical `amount numeric` and all legacy rows. A dual-read/dual-write compatibility window is required until every consumer has migrated.

## 2. Canonical order identity

- Existing `khelgrid_payments.id` remains the internal UUID.
- Existing `order_id` remains the unique KhelGrid order number.
- Add `provider_order_id` as a nullable provider-generated identifier with a unique partial index.
- Keep `payment_id` as the provider payment identifier during the compatibility period; optionally rename only after all consumers are audited.
- The provider order ID must never be used as the KhelGrid order number.
- Idempotency remains server-generated or validated server-side and backed by a unique constraint.

## 3. Canonical money contract

- `amount_paise bigint` is the authoritative integer amount for online payments.
- `amount numeric` remains a compatibility/display field for historical readers.
- INR only until another currency is explicitly supported.
- New online payment intents must write both columns from the same validated paise integer.
- Provider request/response comparisons use paise and currency, never floating-point rupees.
- Venue advance deposit is the amount collected online; the full slot value and balance payable at venue remain separately recorded as metadata and booking totals.
- Pay-at-venue is not an online captured state.

## 4. State machine

Implemented in `src/shared/payments/paymentLifecycle.ts`:

`created → pending → authorized → captured`

Failure/cancellation and refund paths are explicit:
- `failed`, `cancelled`
- `refund_pending → partially_refunded → refunded`
- `reconciliation_required` is a quarantine state; only an admin reconciliation action may leave it.

The frontend helper is a contract/test utility, not an authorization boundary. Database procedures and Edge Functions must enforce the same transition rules server-side. Browser callbacks cannot set a captured state.

Legacy status mapping:
- `completed → captured`
- `pending` and `pending_verification → pending`
- `failed → failed`
- `refunded → refunded`
- `reconciliation_required → reconciliation_required`
- `pay_at_venue` deliberately maps to no online payment state.

## 5. Provider adapter contract

Razorpay remains the first provider, but the internal lifecycle is provider-neutral. The adapter contract must expose:
- create provider order
- fetch provider payment
- verify checkout signature
- verify raw webhook HMAC
- request refund
- fetch settlement/reconciliation status

No provider secret or service-role key may enter browser code. All provider operations run in Edge Functions with secrets stored in Supabase secrets. Webhook routes authenticate via provider HMAC and are idempotent.

## 6. Development database audit

Checked project `hznsbxvovjxvmnchzzqt`:
- `khelgrid_payments` already has unique internal order ID and partial unique idempotency key.
- `payment_webhook_events` currently has unique event ID but lacks dedicated retry/processing fields.
- `venue_bookings` records full booking total and paid amount separately.
- `listing_subscriptions` retains legacy subscription activation fields.
- Only `register-payment-intent` is currently deployed in the development Edge Function inventory; Razorpay verification/webhook source files are not evidence of deployed functions.
- The existing database contains a `set_listing_subscription_activation_window()` SECURITY DEFINER function executable by PUBLIC/anon/authenticated. Its trigger dependencies must be audited before any privilege change; do not revoke blindly.

## 7. Migration plan — not yet applied

The next additive migration should:
1. Add nullable `amount_paise bigint` and `provider_order_id text` to `khelgrid_payments`.
2. Backfill `amount_paise` from `round(amount * 100)` for legacy rows, with a validation report before making it NOT NULL for new rows.
3. Add a unique partial index for non-null `provider_order_id`.
4. Add/adjust a CHECK constraint for the canonical status vocabulary without rewriting historical pay-at-venue records into online payment states.
5. Extend `payment_webhook_events` with `processing_started_at`, `processed_at`, `attempt_count`, `last_error`, and a safe status vocabulary; preserve unique event IDs.
6. Add constraints/indexes and service-role-only write access after auditing all existing Edge Function/RPC dependencies.
7. Preserve existing columns and RPC signatures during the compatibility period.
8. Include migration rollback/recovery notes; do not delete historical payment rows.

No migration was applied during this phase. The connected Supabase interface does not expose the Supabase CLI command required by the installed Supabase workflow to create a migration file safely. The SQL must be created using `supabase migration new` in the repo environment before it is applied.

## 8. Verification

- `paymentLifecycle.test.ts` tests allowed and forbidden transitions, admin-only reconciliation, legacy state mapping, and integer paise validation.
- CI on the merged Phase 5.8.1.2 commit passed PostgreSQL migration/security tests, Deno typecheck, TypeScript, ESLint, Vitest, and Vite production build.
- This branch's checks must pass before merging.
- Database migration, webhook replay tests, and sandbox provider tests remain open.

## 9. Explicit non-goals

- No live Razorpay credentials.
- No real payment collection.
- No production schema or website changes.
- No deployment of Edge Functions in this phase.
- No automatic activation of listings or bookings from frontend callbacks.
