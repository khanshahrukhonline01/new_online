# Phase 5.8.2 — Razorpay sandbox order creation

## Scope

Build the server-side foundation for Razorpay sandbox orders in the development project. Payment collection remains disabled. No gateway secrets are configured, no Edge Function is deployed, and no provider request or transaction is made by this PR.

## Architecture

1. The existing `register-payment-intent` function calculates the authoritative amount from the server's canonical pricing sources and creates a `khelgrid_payments` row.
2. For `payment_method=razorpay`, the row is marked `payment_gateway=razorpay` and `payment_method=razorpay`. The function returns a 256-bit random checkout capability once; only its SHA-256 digest is stored.
3. The new `create-razorpay-order` Edge Function requires a valid checkout capability, a pending Razorpay intent, the explicit `RAZORPAY_CHECKOUT_ENABLED=true` flag, `RAZORPAY_MODE=test`, and a key ID beginning `rzp_test_`.
4. The server reads `amount_paise` and currency from the ledger. It never accepts amount/currency from the browser.
5. An atomic compare-and-set moves `provider_order_status` from `not_created` to `creating`. Concurrent callers cannot both create provider orders.
6. The Razorpay order receipt is the internal KhelGrid order ID. The provider order ID is stored separately in `provider_order_id`.
7. A successful response exposes only the test key ID, provider order ID, amount in paise and currency. The key secret and service-role key never leave the server.
8. A timeout, provider 5xx, malformed provider response or failed database link moves the order to `creation_unknown` where possible. The function refuses blind retries and requires receipt-based reconciliation to avoid duplicate provider orders.
9. Definitive provider 4xx responses are recorded as `failed`; operators must resolve the cause before a new intent is issued.

## Database migration

`20261110100000_phase5_8_2_razorpay_order_creation.sql` adds:
- `checkout_token_hash`
- `provider_order_status`
- provider order attempt/creation timestamps
- a constrained provider-order lifecycle and partial operational index

No existing payment rows are deleted or rewritten.

## Related verification fix

The existing `verify-razorpay-payment` function previously looked up the ledger by the provider order ID as though it were the internal KhelGrid order ID. It now looks up `provider_order_id`, compares the canonical integer `amount_paise`, and passes the internal `order_id` to the settlement RPC.

## CI coverage

- Apply Phase 5.8.2 migration after the existing 5.7, 5.7.5 and 5.8.1.4 migrations in isolated PostgreSQL 17.
- Assert checkout capability and provider order lifecycle columns/constraints.
- Exercise valid `not_created -> creating -> created` state persistence and reject unknown states.
- Deno typecheck for registration, webhook, order creation and payment verification Edge Functions.
- Existing typecheck, lint, Vitest and production build.

## Not included / explicitly disabled

- No frontend Razorpay Checkout integration in this PR.
- No live or sandbox API call.
- No Razorpay credentials or secrets.
- No function deployment.
- `RAZORPAY_CHECKOUT_ENABLED` remains unset/false.
- Production website and database remain untouched.

## Operational caution

Razorpay order creation is not assumed idempotent by the provider. Because a network timeout can occur after the provider accepted the create request, the implementation does not blindly retry ambiguous outcomes. A future reconciliation operation must query Razorpay by the unique internal receipt before safely resetting an order to `not_created`.
