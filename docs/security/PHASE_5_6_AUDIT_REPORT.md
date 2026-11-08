# KhelGrid Security Programme — Phase 5.6 Audit Report
## Vulnerability Assessment & Pre-Remediation Baseline Audit

> **Document ID:** SEC-AUDIT-PHASE-5-6  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Base Commit:** `f58b143ef33604b9a10a4d68c21cf2339c3b179e` (PR #183 merged into `main`)  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Production Status:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Executive Summary

Phase 5.5 established a server-authoritative Razorpay payment verification pattern, introducing signature scheme separation (checkout HMAC vs. webhook HMAC), revoking anonymous access to payment settlement RPCs, and adding the `public.payment_webhook_events` deduplication table.

However, a comprehensive re-audit of the codebase and database migrations merged at `f58b143` identified several critical integration, concurrency, and reliability defects. These vulnerabilities jeopardize payment capture assurance, permit concurrent webhook race conditions, assign unverified pricing defaults to non-commercial venues, and fail to handle missing target records during settlement.

This audit establishes the baseline findings that Phase 5.6 must remediate with forward-only, transactional changes.

---

## 2. Vulnerability Findings Matrix

| Finding ID | Severity | Source File / Artifact | Exact Defect | Remediation Required | Regression Test |
|---|---|---|---|---|---|
| **SEC-5.6-01** | **CRITICAL** | `supabase/functions/verify-razorpay-payment/index.ts` | **Missing Gateway Payment Capture Verification**: Edge Function verifies checkout HMAC (`order_id\|payment_id`) but does not query Razorpay's API (`/v1/payments/{id}`). An `authorized` but uncaptured payment is treated as completed. | Call authenticated Razorpay API (`GET /v1/payments/{id}`) using server credentials; verify `status === 'captured'`, `order_id`, `amount`, and `currency` before calling settlement RPC. | `verify-razorpay-payment-capture` suite |
| **SEC-5.6-02** | **CRITICAL** | `supabase/functions/razorpay-webhook/index.ts` | **Webhook Event TOCTOU Race Condition**: Handler checks event existence via `SELECT` then `INSERT`s after settlement. Concurrent webhook deliveries both pass the check and trigger duplicate settlement RPCs. | Implement atomic database claim (`claim_webhook_event`) with row locking and state transitions (`received` -> `processing` -> `processed` / `failed_retryable`). | `webhook-concurrency-isolation` suite |
| **SEC-5.6-03** | **HIGH** | `supabase/functions/razorpay-webhook/index.ts` | **Non-Deterministic Fallback Event ID**: When `x-razorpay-event-id` header and payload ID are missing, code generates `event_created_at_Date.now()`, assigning distinct IDs to retries and breaking deduplication. | Use deterministic SHA-256 hash of verified raw request body with prefix `body_hash_` when event ID is absent. | `webhook-deterministic-dedup` suite |
| **SEC-5.6-04** | **CRITICAL** | `supabase/migrations/20261108130000_phase5_5_payment_gateway_integration.sql` | **Blanket Venue Pricing Default (₹800)**: Migration added `slot_hourly_fee DEFAULT 800` and updated all venues to 800, inventing commercial tariffs for government SAI facilities and unpriced venues. | Drop `DEFAULT 800`; nullify unverified fees on government/unpriced venues; enforce `PRICE_UNRESOLVED` rejection in `reserve_venue_slot_atomic`. | `venue-tariff-integrity` suite |
| **SEC-5.6-05** | **HIGH** | `supabase/migrations/20261108130000_phase5_5_payment_gateway_integration.sql` | **Court Tariff Lookup Conflation**: `reserve_venue_slot_atomic` selects court price with `LIMIT 1` without matching `p_court_number`. Different court rates (e.g. Court 1 ₹600 vs Court 2 ₹1200) are conflated. | Match requested court in `venue_courts` by `p_court_number` (`name = 'Court ' \|\| v_court`); fall back to venue hourly fee only if court has no tariff. | `court-specific-tariff` suite |
| **SEC-5.6-06** | **HIGH** | `supabase/migrations/20261108130000_phase5_5_payment_gateway_integration.sql` | **Silent Settlement on Missing Target**: If target booking or subscription row is missing or deleted, `UPDATE` affects 0 rows, but `settle_payment_transaction` marks payment `completed` and returns `success: true`. | Verify target row existence and row lock with `FOR UPDATE`. If missing, set payment to `reconciliation_required` and return error. | `settlement-target-verification` suite |
| **SEC-5.6-07** | **HIGH** | `supabase/migrations/20261108130000_phase5_5_payment_gateway_integration.sql` | **Late Payment on Expired / Re-booked Slot**: If payment capture arrives after booking hold expired and slot was already reserved by another user, blind settlement would cause double booking. | Check if slot was re-booked by confirmed reservation; if so, transition payment to `reconciliation_required` with reason `SLOT_TAKEN_AFTER_EXPIRY`. | `late-payment-slot-conflict` suite |
| **SEC-5.6-08** | **MEDIUM** | `supabase/migrations/20261108130000_phase5_5_payment_gateway_integration.sql` | **Manual Schema Migration Insertion**: Migration SQL hardcodes `INSERT INTO supabase_migrations.schema_migrations`, which can conflict with Supabase migration CLI and falsely report completion. | Remove manual insertion from migration SQL. Provide read-only verification procedure `verify_security_schema_migrations()`. | `migration-safety-audit` suite |

---

## 3. Deep-Dive Vulnerability Analysis

### 3.1 SEC-5.6-01: Razorpay Payment Capture Verification Gap
In Razorpay, a payment lifecycle consists of:
`created` -> `authorized` -> `captured` -> `refunded` (or `failed`).
When a customer enters payment credentials, the payment is often initially `authorized`. If manual capture is configured or asynchronous settlement is involved, the payment might not be captured yet.
In `verify-razorpay-payment/index.ts` (Phase 5.5):
```typescript
const payload = `${order_id.trim()}|${payment_id.trim()}`
const expectedSignature = await generateHmacSha256(payload, keySecret)
const isValid = await timingSafeEqual(...)
// ... immediately calls settle_payment_transaction!
```
The Edge Function verifies that the user received a signature for `order_id|payment_id`, but **never verifies with Razorpay whether the payment was actually captured**!
If the payment was authorized but subsequently voided, or if an authorization fails capture, KhelGrid's database would already have confirmed the court booking or activated the subscription.

**Remediation:**
Edge Function must call:
`GET https://api.razorpay.com/v1/payments/${payment_id}`
using Basic Auth (`RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`).
It must assert:
1. `response.id === payment_id`
2. `response.order_id === order_id`
3. `response.status === 'captured'` (if `status === 'authorized'`, return `pending_verification` without settling)
4. `response.amount === authoritativeAmountPaisa`
5. `response.currency.toUpperCase() === authoritativeCurrency`

### 3.2 SEC-5.6-02: Webhook Idempotency TOCTOU Race Condition
In `supabase/functions/razorpay-webhook/index.ts`:
```typescript
// 3. Webhook Event Idempotency Check
const eventId = req.headers.get('x-razorpay-event-id') || ...
const { data: existingEvent } = await adminClient
  .from('payment_webhook_events')
  .select('id, status')
  .eq('event_id', eventId)
  .maybeSingle()

if (existingEvent) {
  return new Response(...)
}

// ... calls settle_payment_transaction ...

await adminClient.from('payment_webhook_events').insert({ event_id: eventId, ... })
```
If two webhook requests for the same event arrive within milliseconds:
1. Worker A executes `SELECT ... WHERE event_id = 'evt_1'` -> returns `null`.
2. Worker B executes `SELECT ... WHERE event_id = 'evt_1'` -> returns `null`.
3. Worker A calls `settle_payment_transaction`.
4. Worker B calls `settle_payment_transaction`.
5. Worker A inserts `payment_webhook_events`.
6. Worker B attempts insert, fails unique constraint.

**Remediation:**
Implement an atomic database procedure `public.claim_webhook_event`:
- Performs `INSERT ... ON CONFLICT (event_id) DO NOTHING` or updates status to `processing`.
- If another worker holds the claim, rejects concurrent processing (`status: 'processing_in_flight'`).
- Upon settlement success, updates to `status: 'processed'`.

### 3.3 SEC-5.6-04 & SEC-5.6-05: Pricing Model Conflation & Court Lookup
In Phase 5.5, `slot_hourly_fee numeric(10,2) DEFAULT 800` was added to `public.venues`, and an update assigned 800 to every venue where `slot_hourly_fee IS NULL`.
This broke the business rules:
1. Government sports complexes (SAI NCOE) were given an invented commercial booking price of ₹800.
2. In `reserve_venue_slot_atomic`:
```sql
SELECT hourly_price_paise INTO v_court_price_paisa
FROM public.venue_courts
WHERE venue_id = v_venue_record.id AND is_bookable = true
LIMIT 1;
```
If a facility has multiple courts with varying rates (e.g. Court 1 Standard ₹600, Court 2 Floodlit ₹1200), `LIMIT 1` arbitrarily selected whichever row PostgreSQL returned first, ignoring `p_court_number`.

**Remediation:**
- Query `venue_courts` matching `p_court_number`.
- Drop `DEFAULT 800` from `venues.slot_hourly_fee`.
- Remove unverified 800 tariffs from government facilities (`government_facility = true`).
- If no valid court tariff and no valid venue tariff exist, return `PRICE_UNRESOLVED` and reject booking reservation.

---

## 4. Verification and Safety Confirmation

- All proposed changes are **forward-only**.
- All historical booking and subscription records (208 bookings, 508 subscriptions) will remain 100% intact.
- Production (`https://khelgrid.com/`) is strictly isolated and untouched.
