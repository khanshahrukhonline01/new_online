# Phase 5.8.1 — Canonical Payment Architecture and Order Lifecycle

**Status:** Architecture baseline / implementation gate  
**Scope:** KhelGrid development website and development Supabase project only  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Development Supabase project:** `hznsbxvovjxvmnchzzqt`  
**Production:** Explicitly out of scope. No production site, database, credentials, or payment settings may be changed by this phase.

## 1. Objective

Establish one provider-neutral, server-authoritative payment order model that can support Razorpay first and additional providers later. Build and test the complete payment platform in development before any production activation.

Phase 5.8.1 establishes the canonical data contract, pricing contract, lifecycle, security boundaries, and migration plan. It does not enable live payments or deploy new payment endpoints.

## 2. Verified current-state audit

The following was checked against the repository `main` branch and the development Supabase database on 2026-11-09.

### Repository

- `src/shared/payments/paymentService.ts` generates order IDs in the browser and sends the client-displayed amount to `register-payment-intent`.
- `src/shared/payments/PaymentCheckoutModal.tsx` supports manual UPI reference submission and pay-at-venue for selected targets. Card/NetBanking is explicitly not enabled as a completed gateway flow.
- `src/shared/payments/listingPricing.ts` contains the frontend listing-plan price catalogue.
- `supabase/functions/register-payment-intent/index.ts` contains a second server-side listing-plan catalogue and currently accepts `upi` and `pay_at_venue` for payment registration.
- `supabase/functions/verify-razorpay-payment/index.ts` and `supabase/functions/razorpay-webhook/index.ts` exist in source. Their existence in Git is not proof of deployment.
- `supabase/config.toml` declares JWT verification enabled for registration and verification, and disabled for the webhook (which must authenticate itself with the webhook HMAC).
- The development Supabase Edge Function inventory returned only `register-payment-intent` as deployed. The verification and webhook functions were not listed as deployed. No Razorpay order-creation function was found in the inspected source paths.

### Development database

The existing `public.khelgrid_payments` table is a useful starting point and already has:

- Internal `order_id` with a unique constraint
- Optional `payment_id`
- User/guest customer details
- Decimal INR `amount` and `currency`
- Item and target references
- `payment_gateway`, `payment_method`, `status`, and JSON metadata
- Optional `idempotency_key` with a partial unique index

The existing status check currently permits only `pending`, `pending_verification`, `completed`, `failed`, `refunded`, `pay_at_venue`, and `reconciliation_required`. It does not yet represent a complete order lifecycle such as created, authorized, cancelled, refund-pending, or partially-refunded.

The existing `payment_webhook_events` table has a unique event ID and basic event metadata, but its current shape is not a complete operational event ledger (for example, it does not expose dedicated attempt counts, processing/processed timestamps, or a structured retry/error history).

The development project has migrations through Phase 5.7.5. The latest payment-related schema work is Phase 5.5 plus Phase 5.7.5 registration hardening.\n\n### Confirmed P0 pricing defect\n\nThe venue branch in `register-payment-intent` currently calculates `expectedAmount = Math.min(300, Number(data.slot_hourly_fee))`. This hard-caps the authoritative venue payment at ₹300, regardless of the verified hourly tariff. Do not simply remove the cap in isolation: first inspect the complete `reserve_venue_slot_atomic` implementation and make the quote/order amount use exactly the same tariff, duration, court and fee rules. Until then, paid venue checkout must remain disabled for any case where the amount cannot be reconciled exactly.\n\n### Confirmed database privilege concern for follow-up\n\nThe development RPC inventory shows `set_listing_subscription_activation_window()` is SECURITY DEFINER and has EXECUTE granted to PUBLIC/anon/authenticated. This must be reviewed against its body and trigger dependencies before changing privileges. Do not revoke it blindly in this phase; add it to the payment-adjacent privileged-function audit and prove whether it can affect subscription activation or payment state.

## 3. Canonical architecture decisions

### 3.1 Internal order and provider order are different identifiers

- `payment_orders.id`: canonical internal UUID.
- `payment_orders.order_number`: human-safe, unique KhelGrid reference (for example, `KG_ORD_...`).
- `provider_order_id`: gateway-generated identifier (for Razorpay, its `order_...` value).
- `provider_payment_id`: gateway-generated payment identifier.
- Never reuse the KhelGrid order number as a gateway order ID.
- All settlement, refund, webhook, reconciliation, and support operations resolve the provider event to the internal order through the stored provider mapping.

The existing `khelgrid_payments` table must be assessed for a safe additive evolution before introducing a second order table. Avoid two competing sources of truth. The implementation decision must preserve existing payment history and existing RPC dependencies.

### 3.2 Money representation

- INR is the initial supported currency.
- Persist authoritative amounts as integer paise (`amount_paise bigint`); do not use JavaScript floating-point arithmetic for authoritative totals.
- A display amount in rupees may be derived for UI/reporting.
- All provider requests and provider responses must be compared against the exact stored paise amount and currency.
- Reject zero, negative, malformed, non-finite, and out-of-range amounts for paid orders.
- Client-supplied amount, discount, tax, fee, currency, status, and provider identifiers are never authoritative.

### 3.3 One canonical pricing service

Create a server-side quote/pricing module with typed target-specific pricing rules. It is the only authority for payment amounts.

Required quote inputs are identifiers and validated selection data, not a final price. The server resolves the target, checks eligibility and availability, calculates line items, discounts, fees/taxes where applicable, and returns a quote with a short expiry and immutable quote/order linkage.

Pricing sources to reconcile:

- Listing plans: frontend `listingPricing.ts` and server-side `listingPlan()` currently duplicate the same plan catalogue.
- Membership tiers: server-side membership catalogue and any frontend plan catalogue must be reconciled.
- Venue bookings: price must be derived from the authoritative venue tariff and the exact slot/duration/court rules used by the reservation workflow. The current ₹300 cap in `register-payment-intent` is a confirmed P0 defect and must not be carried into the new pricing module. The reservation RPC actually resolves the venue by slug or ID, then prefers the selected bookable court's `venue_courts.hourly_price_paise` and falls back to `venues.slot_hourly_fee`. It records one slot's price and currently has no duration argument. The registration function instead fetches the venue by ID only, does not resolve the selected court's price, and applies the ₹300 cap. This means the two paths can disagree even below ₹300; the quote API must use the same venue/court resolution and exact rule as the reservation path.
- Trials, athlete verification, pickup matches, and future products remain non-payable until a documented price source and settlement/fulfilment workflow exist.

A price displayed by the browser is informational. The create-order endpoint must recompute the price server-side immediately before creating the internal order and provider order.

### 3.4 Provider adapter boundary

Define a provider-neutral interface for:

- `createOrder`
- `fetchPayment`
- `capturePayment` (only if capture is part of the chosen provider flow)
- `refundPayment`
- `verifyWebhook`
- `fetchSettlement/reconciliation`

Razorpay is the first adapter. Other providers (such as Cashfree) must be addable without changing the internal order lifecycle or target fulfilment rules.

### 3.5 Guest and authenticated checkout

The current product may allow checkout without a KhelGrid login. Preserve guest checkout without trusting a caller-supplied `user_id`.

- Authenticated identity is resolved from a verified Supabase access token.
- Guest orders receive an unguessable, high-entropy capability token; only a hash is stored server-side.
- Guest capabilities are scoped to a single order and limited to status/support actions; they must not authorize changing price, customer, target, or settlement state.
- Do not store raw capability tokens, payment secrets, full card data, or gateway signatures in local storage.
- Store only the minimum customer PII required for fulfilment and receipts.

### 3.6 Payment and fulfilment are separate state machines

Suggested payment states (final names to be constrained in the migration):

- `created`
- `pending`
- `authorized`
- `captured` (settled/paid)
- `failed`
- `cancelled`
- `refund_pending`
- `partially_refunded`
- `refunded`
- `reconciliation_required`

Pay-at-venue is a fulfilment/payment arrangement, not a captured online payment. It must remain explicitly distinct and must never be reported as gateway-settled revenue.

Target fulfilment states (booking, subscription, registration) remain independent. A target may be activated only after the canonical settlement procedure verifies the provider payment is captured and matches the internal order's exact amount, currency, provider order, and target.

A browser checkout callback is an untrusted notification. It may trigger a server verification request, but it cannot settle an order or activate a target.

## 4. Required order lifecycle

1. **Quote:** Browser sends target identifiers and selection details. Server validates and calculates the quote.
2. **Internal order creation:** Server creates/reuses an idempotent internal order, storing immutable amount, currency, target, pricing breakdown, customer association, and expiry.
3. **Provider order creation:** Server creates the gateway order using the stored amount in paise and stores the returned provider order ID.
4. **Checkout:** Browser receives only the public gateway key ID, provider order ID, exact amount/currency, and safe display metadata.
5. **Client callback:** Browser submits provider payment ID and signature to the verification endpoint. It does not submit an authoritative amount or status.
6. **Server verification:** Server verifies checkout HMAC and fetches the payment from the provider API. It checks provider order ID, internal mapping, exact amount, currency, and captured state.
7. **Webhook:** Webhook verifies HMAC against the raw request body, claims a unique event idempotently, checks the provider order/payment mapping and amount, and calls the same settlement procedure.
8. **Settlement:** One database transaction locks the internal order, rejects duplicate payment allocation, records capture, and activates the target once.
9. **Reconciliation:** Unmatched, delayed, duplicate, or contradictory provider events are retained for review; they never silently activate fulfilment.
10. **Refund:** Refund requests are idempotent, provider-confirmed, auditable, and reflected as partial/full refunds without erasing the original capture.

Webhook and browser verification must converge on the same settlement procedure. Whichever arrives first wins; the second is an idempotent no-op.

## 5. Database evolution principles

Before writing a migration:

1. Inventory all readers/writers, triggers, RPCs, RLS policies, grants, and indexes touching `khelgrid_payments`, `payment_webhook_events`, `venue_bookings`, and `listing_subscriptions`.
2. Decide whether to evolve `khelgrid_payments` additively or introduce a canonical order table with an explicit, tested compatibility layer. Do not maintain two independent ledgers.
3. Preserve all historical rows and legacy references.
4. Use a forward-only, transactional migration with additive columns/constraints/indexes. No `DROP`, `TRUNCATE`, bulk deletion, or production DDL.
5. Keep all exposed-schema tables RLS-enabled and deny direct browser writes to payment state and settlement fields.
6. Keep privileged procedures narrowly scoped, with fixed search paths and explicit execute grants. Do not add broad `SECURITY DEFINER` functions to the exposed API.
7. Because new public tables are no longer automatically exposed to the Data API, explicitly decide whether a table needs Data API exposure. Prefer server-only access for payment internals.

Potential additive fields to evaluate (not a migration instruction by themselves):

- `provider_order_id`, `provider_payment_id`, `provider_signature_verified_at`
- `amount_paise`, `amount_refunded_paise`, `currency`
- `quote_id`, `pricing_version`, `pricing_breakdown`
- `expires_at`, `captured_at`, `failed_at`, `cancelled_at`, `refunded_at`
- `guest_token_hash`, `idempotency_key`
- `last_provider_event_at`, `reconciliation_status`

The exact shape must be selected after the dependency inventory and duplicate-data checks.

## 6. Feature flags and environment separation

Use server-side flags for each payment product and provider:

- `PAYMENTS_ENABLED` — global kill switch, default false.
- `RAZORPAY_ENABLED` — provider switch, default false.
- `PAYMENT_MODE` — `test` in development; live mode is not permitted in development.
- Product flags for venue booking, listing plans, memberships, and other targets, default false until each workflow passes tests.

The frontend must never contain `RAZORPAY_KEY_SECRET`, webhook secret, Supabase service-role key, or any private provider credential. Public Razorpay key ID may be returned by the server only when the relevant development feature flag is enabled.

No live credentials, live payment collection, or production deployment are part of Phase 5.8.1.

## 7. Required verification matrix

Before Phase 5.8.1 can be marked complete:

- [ ] Same idempotency key + same request returns the same internal order.
- [ ] Same idempotency key + different target/customer/quote returns conflict.
- [ ] Browser amount tampering does not change the server quote or provider order.
- [ ] Decimal/paise conversion is exact, including ₹0.01 and large valid amounts.
- [ ] Unknown target, expired quote, unavailable slot, and unsupported product are rejected.
- [ ] Provider order ID is stored and never confused with KhelGrid order number.
- [ ] Wrong provider order, payment ID, signature, amount, or currency cannot settle.
- [ ] Authorized-but-not-captured payment remains pending and does not activate fulfilment.
- [ ] Captured payment activates the correct target exactly once.
- [ ] Duplicate and out-of-order webhook deliveries are idempotent.
- [ ] Webhook invalid signature is rejected before event processing.
- [ ] Guest order access is scoped and cannot disclose another order.
- [ ] Pay-at-venue never appears as captured online revenue.
- [ ] Existing legacy payment and subscription records remain readable.
- [ ] No production project, production credentials, or live gateway account is touched.

## 8. Immediate implementation sequence

1. Finish dependency inventory for all payment tables, RPCs, triggers, and frontend call sites, including the body and trigger dependencies of `set_listing_subscription_activation_window()`.\n2. The development RPC audit confirmed `reserve_venue_slot_atomic` uses the selected bookable court's `hourly_price_paise` when present, otherwise the venue's `slot_hourly_fee`, and currently prices one slot (there is no duration argument). Registration resolves venue by ID only and uses a ₹300 cap. Make quote and reservation share the exact venue/court resolution and tariff rule; add tests for court-specific price, venue fallback, slug/ID resolution, unavailable courts, and the old ₹300 cap defect. Do not add duration multipliers unless the booking product explicitly introduces duration as a validated input.
3. Reconcile listing, membership, and venue pricing into a single server-side pricing module.
4. Define the canonical order contract and status transition matrix in shared types and database constraints.
5. Produce an additive development migration with compatibility and rollback/recovery notes.
6. Add tests for pricing, idempotency, guest access, and status transitions.
7. Only after those pass, implement the server-side Razorpay order-creation function and wire sandbox checkout.

## 9. Exit criteria

Phase 5.8.1 is complete only when the canonical pricing and order contracts are implemented, existing payment history is preserved, tests pass, the development schema matches the migration, and the order lifecycle is verified. A document or successful build alone is not completion.

**Production activation is a separate later release gate requiring explicit approval.**
