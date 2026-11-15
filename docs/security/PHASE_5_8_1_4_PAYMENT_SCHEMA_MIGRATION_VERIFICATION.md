# Phase 5.8.1.4 — Payment Schema Migration and Compatibility Verification

**Development migration applied:** `20261109193312_phase5_8_1_4_payment_schema_compatibility`
**Development project:** `hznsbxvovjxvmnchzzqt`
**Production:** untouched. Payment collection remains disabled.

## PR #197 and implementation follow-up

PR #197 merged the migration design and preflight audit. This follow-up adds the actual timestamped SQL migration, isolated PostgreSQL 17 fixture coverage, CI assertions, and workflow integration.

## Database changes applied to development

### `public.khelgrid_payments`
- Added `amount_paise bigint NOT NULL`, backfilled from the existing INR `amount` column.
- Added nullable `provider_order_id text` with length validation and a unique partial index.
- Added a private trigger function to keep legacy INR amount and canonical paise synchronized.
- Preserved the existing ledger, primary key, order ID, payment ID, statuses, and owner-read RLS policy.
- Did not rename or remove any legacy columns.

### `public.payment_webhook_events`
- Added `processing_started_at`, `processed_at`, `attempt_count`, `last_error`, `settlement_data`, and `updated_at`.
- Changed the default status for new events to `received`.
- Added retry and attempt-count constraints and a partial retry index.
- Added atomic `claim_webhook_event` and `finalize_webhook_event` procedures matching the current Razorpay webhook source call signatures.
- Restricted both procedures to `service_role`; verified anon/authenticated cannot execute them.
- Preserved the unique event ID and service-role-only RLS policy.

## Development verification performed

- Supabase migration history reports version `20261109193312` with the expected migration name.
- Confirmed existing payment records remain in the database; prior preflight established exact paise conversion for all three existing rows.
- Confirmed service-role execute privilege on both webhook procedures and denial for anon/authenticated.
- Confirmed webhook event table remains RLS enabled and forced.
- Confirmed provider-order unique index and webhook retry index exist.
- Ran a transaction-wrapped smoke exercise for paise synchronization and webhook claim/retry/finalize; test transaction rolled back so no test records should persist. (CI assertions provide durable repeatable verification.)
- Supabase security advisor still reports pre-existing unrelated security-definer and auth-password findings; this migration adds no browser-executable webhook procedure.

## Automated CI added

The PostgreSQL 17 workflow now:
1. Seeds a hosted-schema-compatible payment/webhook fixture with two legacy payment rows.
2. Applies Phase 5.7 and Phase 5.7.5 migrations.
3. Applies this Phase 5.8.1.4 migration.
4. Runs assertions for exact legacy backfill, old/new amount synchronization, mismatched write rejection, provider order ID uniqueness, webhook claim idempotency, in-flight duplicate rejection, retry counter, processed event deduplication, and function grants.

## Remaining known work

- CI for this follow-up PR must pass before merge.
- Current Razorpay webhook source still treats a settlement RPC result of `status='error'` as a processed webhook event with error metadata. That is a known correctness defect to fix and test before webhook deployment.
- The development project has not deployed Razorpay webhook or payment verification functions.
- This phase does not create Razorpay orders, configure gateway credentials, enable checkout, or collect money.

## Safety

- No production database or production website changes.
- No live credentials or transactions.
- No Edge Function deployment.
- Payment collection remains disabled.
