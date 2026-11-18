# Phase 5.8.1 — Canonical Payment Architecture

**Status:** architecture baseline and first pricing corrections in progress  
**Environment:** KhelGrid development only  
**Gateway target:** Razorpay, sandbox/test mode first  
**Production collection:** disabled; no production deployment or database changes are part of this phase.

## 1. Decisions

1. PostgreSQL is the authoritative payment ledger. Browser state, local storage, a checkout callback, a UPI UTR supplied by a customer, and a success screen are never settlement evidence.
2. Reuse `public.khelgrid_payments` as the initial canonical order/payment ledger. Do not create a second competing ledger. Add provider/order/event/refund fields only after dependency and migration review.
3. Amounts are integer minor units at provider boundaries: INR paise. Persist the existing database amount representation only where legacy schema requires it; convert once, explicitly, and compare exact paise values.
4. Razorpay is the first provider adapter. Provider-specific IDs and responses must not become the platform's internal order identity.
5. The server generates the internal order ID and idempotency boundary. The browser may request an order but may not choose its authoritative amount, target ownership, currency, settlement status, or provider order ID.
6. A venue booking, listing subscription, trial registration, or membership activates only after a verified captured payment has been atomically settled against the matching target.
7. `pay_at_venue` is a booking/payment arrangement, not an online payment and not a captured/paid status.
8. Guest checkout remains supported. Authenticated identity is derived from a verified Supabase session, never from a body-supplied user ID. Guest access will use a scoped, high-entropy capability whose hash is stored server-side; raw capability values must not be logged.
9. Gateway secrets remain in Supabase Edge Function secrets or a restricted private server-side credential store. No secret is exposed via `VITE_*`, browser bundles, local storage, logs, or client payloads.
10. Feature flags default off. No payment method is enabled merely because credentials exist.

## 2. Canonical order model

The existing `khelgrid_payments` row is the canonical order/ledger entry. The next schema revision must review and, if needed, add the following concepts without duplicating existing columns:

| Concept | Required semantics |
|---|---|
| Internal order ID | Server-generated, unique, immutable |
| Idempotency key | Unique per checkout request; retries return the same order |
| Target | Typed target (venue booking, listing subscription, trial, membership, etc.) plus target ID |
| Quote | Server-calculated amount in paise, INR currency, pricing source/version and quote timestamp |
| Provider | `razorpay`, `upi_direct`, or `pay_at_venue` |
| Provider order ID | Nullable until provider order creation; unique when present |
| Provider payment ID | Nullable until payment; globally unique when present |
| State | Explicit lifecycle state, not overloaded with target activation |
| Customer | Minimal customer data; authenticated user ID or guest capability hash |
| Audit metadata | Safe structured metadata; no secrets or unnecessary PII |
| Timestamps | Created, updated, expires, captured, failed, refunded |

Do not rename or drop legacy columns in this phase. Existing records must remain readable and auditable.

## 3. Lifecycle

Expected online lifecycle:

`created → awaiting_payment → authorized → captured → settled`

Alternative terminal/intermediate states:

- `failed`: provider confirms failure or a definitive validation rejection occurs.
- `cancelled`: order is cancelled before capture.
- `expired`: checkout/booking hold expires without capture.
- `reconciliation_required`: gateway and ledger disagree or evidence is incomplete.
- `refund_pending → partially_refunded | refunded`: refund workflow, later phase.

The existing legacy values (`pending`, `pending_verification`, `completed`, `failed`, `refunded`, `pay_at_venue`, `reconciliation_required`) must be mapped explicitly before changing constraints or status values. Do not silently reinterpret historical rows.

Only server-side settlement can move a captured order to settled/completed and activate its target. An authorized-but-not-captured payment remains pending. A webhook event is acknowledged only after its idempotent claim and processing outcome are durably recorded.

## 4. Canonical pricing and venue quote contract

Pricing authority belongs to the server:

- Venue booking price must use the same rule as `reserve_venue_slot_atomic`: selected bookable court's positive `hourly_price_paise` when available, otherwise the venue's verified `slot_hourly_fee`.
- Venue pricing requires both `fee_provenance = 'verified'` and `pricing_status = 'verified'`.
- No arbitrary price cap, silent fallback to zero, parsing of display strings as authoritative prices, or client-selected discount.
- Listing plan amounts/durations must come from one server-side catalogue and be reconciled with the database function and frontend display catalogue.
- Trial registration fee must be read from the published opportunity row. Free opportunities should use a separate no-payment registration path rather than inserting a zero-value gateway order.
- Pickup match collection remains disabled until its own participant registration and settlement workflow is complete.
- Membership collection remains disabled until entitlement activation, renewal, cancellation, and refund semantics are implemented.
- Quote and booking must agree on target, venue, court, customer, exact amount, currency, and expiry. The payment-to-booking link must reject both underpayment and overpayment.

The frontend may display a quote, but must submit only the target identifiers and selected options required for the server to calculate the quote again.

## 5. Provider adapter contract

Implement a provider-neutral server interface with operations equivalent to:

- `createOrder(quote, internalOrderId)`
- `fetchPayment(providerPaymentId)`
- `verifyCheckoutSignature(orderId, paymentId, signature)`
- `verifyWebhook(rawBody, headers)`
- `refund(paymentId, amountPaise, idempotencyKey)`

Razorpay is the first adapter. The future provider adapter must implement the same contract without changing booking, subscription, or entitlement business logic.

The server-created Razorpay order must use the stored quote's exact amount in paise and INR. The client receives only the public key ID, provider order ID, amount, currency, and safe display data.

## 6. Guest and authenticated checkout

- Authenticated checkout: server verifies the Supabase access token with Auth and derives the user ID from the verified user.
- Guest checkout: server creates a high-entropy one-time or scoped capability; store only a cryptographic hash. Bind it to the order, target, expiry and permitted read/cancel operations. Rate-limit by privacy-preserving identifiers.
- Never accept a raw `user_id`, admin role, payment status, provider status, target owner, or settlement claim from the browser.
- Do not return subscription access tokens or booking voucher secrets in general-purpose payment responses. Return scoped credentials only to the intended claimant and only when required.

## 7. Webhooks and idempotency

- Verify Razorpay HMAC against the exact raw request body before parsing.
- Require an event ID where supplied; otherwise use a deterministic raw-body digest and retain enough metadata to diagnose provider retries.
- Claim events atomically with a unique constraint and explicit processing lease/status.
- A duplicate processed event returns success without repeating settlement.
- A transient database/settlement error remains retryable and returns a retryable response; do not mark it processed.
- Validate provider order ID, payment ID, amount, currency, captured status, and internal order mapping before settlement.
- Reconcile delayed, out-of-order and duplicate events. Never allow a late failure event to downgrade a captured/settled payment.
- Keep event payload storage minimal and redact personal data.

## 8. Environment and release gates

Development/test mode only until every gate passes:

- Razorpay test credentials stored only as Supabase Edge Function secrets.
- Server-side order creation deployed to development.
- Checkout signature verification and webhook HMAC verified.
- Capture confirmed by provider API and webhook; duplicate/retry tests pass.
- Amount, currency, order, target and customer mismatches are rejected.
- Booking hold expiry, failed payment and late capture are covered.
- Refund and reconciliation flows are complete before any real collection.
- Admin permissions, audit trail, customer receipts, cancellation policy, tax invoice treatment and support runbook are reviewed.
- Production credentials and production deployment require a separate explicit release approval.

## 9. Findings confirmed during Phase 5.8.1 inspection

1. `register-payment-intent` used `Math.min(300, slot_hourly_fee)` for venue orders. This diverged from the booking RPC, which uses the selected court price (paise) when present, otherwise the verified venue fee. Removed the arbitrary ₹300 cap and aligned the server registration calculation to the selected bookable court / verified venue fee.
2. Payment-to-booking linkage previously allowed a payment amount lower than the booking total because it rejected only `payment.amount > booking.total_amount`. Changed this to exact amount equality.
3. Razorpay order creation is not present in the inspected Edge Function inventory/source. The verification and webhook functions exist, but that alone does not provide a complete checkout flow.
4. Checkout UI still exposes a disabled Cards/NetBanking tab and an old UPI manual-UTR flow. The UI copy says “Verifying Payment with NPCI & Bank” while the server only records a customer-supplied UTR as pending; it does not independently verify bank settlement.
5. Booking creation and payment linking are separate requests. A failure between them can leave an orphan pending booking/payment pair; a later phase must make the workflow atomic or provide safe, expiring compensation/recovery.
6. The existing payment ledger uses a decimal amount column, while Razorpay APIs use integer paise. Explicit conversion and exact equality are mandatory at every boundary.
7. Existing payment and subscription tables contain legacy state vocabulary and sensitive customer data. Schema evolution must preserve historical records and retain restrictive RLS/grants.

## 10. Remaining Phase 5.8.1 exit criteria

- [x] Development branch created from `main`.
- [x] Venue registration no longer applies an arbitrary ₹300 cap.
- [x] Payment/booking linkage requires exact amount equality.
- [x] Architecture, lifecycle, quote, guest-checkout and environment decisions documented.
- [ ] Add server-generated canonical order/quote endpoint and idempotent database contract.
- [ ] Remove or correct misleading frontend payment/verification copy.
- [ ] Resolve booking + payment linkage atomicity and expiry behavior.
- [ ] Add automated tests for quote parity, amount mismatch, retries, duplicate order IDs and invalid target states.
- [ ] Review all legacy pricing catalogues and settlement target mappings.
- [ ] Run typecheck, lint, full tests, PostgreSQL migration tests and Edge Function tests.
- [ ] Review development Supabase advisors and exact grants/RLS after schema changes.

**No live gateway collection is enabled by this architecture document.**
