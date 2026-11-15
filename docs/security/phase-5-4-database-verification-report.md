# KhelGrid Security Programme — Phase 5.4 Database Verification Report

**Document ID:** `KG-SEC-PHASE-5-4-DB-VERIFY`  
**Target Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Target Environment:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
**Production Target:** `https://khelgrid.com/` — **STRICTLY OUT OF SCOPE / 100% UNTOUCHED**  
**Migration Package:** `supabase/migrations/20261108120000_phase5_4_payment_booking_security.sql`  
**Consolidated Package:** `supabase/deployments/phase-2-to-8-master-consolidated-deployment.sql`  
**Status:** Validated in Isolated PostgreSQL & Ready for Hosted Dev Deployment

---

## 1. Executive Summary

Phase 5.4 addresses the core root causes of database migration failure `ERROR: 23505 uq_venue_slot_concurrency` and `ERROR: 42703 column "user_id" does not exist`, completely closes client-side payment verification spoofing, stops direct unauthenticated mutations, and shields sensitive customer PII across public RPC functions.

### Safety Guarantee & Boundaries

1. **Development Only:** All operations and testing are scoped to the development Supabase project (`hznsbxvovjxvmnchzzqt`) and local isolated PostgreSQL runtimes.
2. **Production Untouched:** No production code, database, secrets, or hosting environments of `khelgrid.com` have been or will be accessed or altered.
3. **Data Preservation:** Zero booking rows, customer rows, or athlete records have been deleted. All 208 venue bookings, 3 athlete profiles, 3 reminders, and 508 listing subscriptions remain preserved.

---

## 2. Root Cause Analysis & Reconciliation

### 2.1 The Unique Concurrency Constraint Failure (`23505`)

- **Root Cause:** An earlier automated test run inserted identical duplicate records on slot `(venue_id='v-1', slot_date='Today', slot_time='6:00 PM – 7:00 PM', court_number=1)` with non-normalized dates (`Today`).
- **Resolution Strategy:**
  1. Historical relative dates (`Today`) are converted to their ISO calendar date (`YYYY-MM-DD`) based on IST creation timestamp.
  2. Duplicate automated test records are safely transitioned to `superseded` (`cancellation_reason = 'Reconciled duplicate automated test run'`), leaving the primary valid reservation intact.
  3. Past confirmed bookings with dates prior to current date are marked as `completed`.
  4. Partial unique index `uq_venue_slot_concurrency` is created strictly over `status IN ('confirmed', 'pending')`, allowing cancelled, expired, refunded, and superseded historical records to coexist cleanly without collision.

### 2.2 The Missing `user_id` Column Failure (`42703`)

- **Root Cause:** A consolidated deployment migration referenced `user_id` on `public.venue_bookings` before the schema column extension was executed.
- **Resolution Strategy:**
  1. Added nullable `user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` to `venue_bookings`.
  2. Preserved guest booking capability: anonymous users reserve slots with `user_id = NULL`.
  3. Authenticated bookings strictly derive ownership from `auth.uid()`, preventing client ID tampering.

---

## 3. Core Architectural Upgrades in Phase 5.4

### 3.1 Hardened Server-Authoritative Booking Lifecycle

```
[Available Slot]
      │
      ▼  reserve_venue_slot_atomic() (Advisory Xact Lock + Expiry Sweeper)
   (pending) ───[ 15-Minute TTL Expires ]───► (expired)
      │                                            │
      ├─── Online Payment Gateway Settled ──┐      │ (Slot released immediately)
      │    (verify_payment_signature_and_settle)   │
      ▼                                     ▼      ▼
 (confirmed) ◄── Pay-At-Venue Confirmed ────┘ [New Player Can Reserve]
      │
      ├─── Match Time Elapses ───► (completed)
      └─── User/Admin Cancel ───► (cancelled)
```

- **In-Transaction Expired Hold Sweeping:** `get_booked_slots_for_venue()` and `reserve_venue_slot_atomic()` update stale `pending` reservations (`expires_at < now()`) to `expired` inside the transaction before calculating availability.
- **Request Idempotency:** Added `idempotency_key text` and unique partial index `uq_venue_bookings_idempotency` preventing duplicate booking creations upon network retry.
- **Authoritative Pricing:** Booking fee is resolved directly from `venues.plan_price`. Zero trust is placed on client-provided amounts.

### 3.2 Server-Held Secret Cryptographic Payment Verification

- **Eliminated Client Length Spoofing:** Completely removed `verifyPaymentSignature` returning `true` based on `signature.length >= 16`.
- **Isolated Gateway Vault:** Razorpay API secret and webhook secret are stored in `private.gateway_credentials` (revoked from `anon`, `authenticated`, and `PUBLIC`; granted strictly to `service_role`).
- **HMAC-SHA256 Cryptographic Verification:** `verify_payment_signature_and_settle()` calculates `HMAC-SHA256(order_id + "|" + payment_id, secret)` using `pgcrypto.extensions.hmac` and verifies equality.
- **Transactional Atomic Target Settlement:** Upon valid signature verification, the payment status in `khelgrid_payments` is transitioned to `completed`, and associated targets (`venue_bookings` or `listing_subscriptions`) are atomically activated in the same transaction.

### 3.3 Public RPC Privacy Shielding (DPDP Act 2023)

- **Sanitized Venue Voucher (`get_venue_booking_voucher`):**
  - Revoked broad `SELECT` on `venue_bookings`.
  - Requires 192-bit `voucher_token` or verified session ownership (`auth.uid() = user_id`).
  - Returns sanitized projection: customer phone and email are omitted entirely; customer name is masked (`R***n S***a`).
  - Protected with rate limiting (15 requests/minute).
- **Sanitized Listing Subscription (`get_listing_subscription_by_order`):**
  - Revoked table return (`SETOF public.listing_subscriptions`).
  - Requires 128-bit `access_token` or owner authentication.
  - Shields contact phone and email.

---

## 4. Verification Test Results

### 4.1 Isolated PostgreSQL Automated Suite (`phase5-4-payment-booking-isolated-postgres.test.ts`)

| Scenario | Target | Verification Focus | Result |
|---|---|---|---|
| 1 | `verify_payment_signature_and_settle` | Valid Razorpay HMAC-SHA256 settles payment and activates booking | **PASSED** |
| 2 | `verify_payment_signature_and_settle` | Forged/tampered signature is rejected (`INVALID_SIGNATURE`) | **PASSED** |
| 3 | `verify_payment_signature_and_settle` | Replay defense: settled order returns `already_settled` | **PASSED** |
| 4 | `verify_payment_signature_and_settle` | Duplicate payment ID allocated across different orders rejected | **PASSED** |
| 5 | `reserve_venue_slot_atomic` | Guest user can reserve slot (`user_id = NULL`), returns 192-bit token | **PASSED** |
| 6 | `reserve_venue_slot_atomic` | Concurrency defense: concurrent booking on same slot rejected | **PASSED** |
| 7 | `reserve_venue_slot_atomic` | Multi-court isolation: court 2 succeeds when court 1 reserved | **PASSED** |
| 8 | `reserve_venue_slot_atomic` | Stale pending hold (>15 mins) automatically swept and re-allocated | **PASSED** |
| 9 | `reserve_venue_slot_atomic` | Idempotent request retry returns existing booking without duplicate | **PASSED** |
| 10 | `reserve_venue_slot_atomic` | Unpriced venue (`plan_price = NULL`) rejected (`PRICE_UNRESOLVED`) | **PASSED** |
| 11 | `record_listing_subscription` | Untrusted caller forced to `pending`/inactive; admin can activate | **PASSED** |
| 12 | `get_listing_subscription_by_order` | Access token required; customer phone/email omitted | **PASSED** |
| 13 | `get_venue_booking_voucher` | 192-bit token required; phone/email shielded; name masked | **PASSED** |

**PostgreSQL Suite Summary:** 13/13 scenarios passed (100% pass rate).

### 4.2 Frontend Unit Tests (`paymentService.test.ts` & `PaymentCheckoutModal.test.tsx`)

- `paymentService.test.ts`: 19/19 tests passed.
  - Verified online checkout initializes as `pending_verification`.
  - Verified offline drafts return `unconfirmed` with `isOfflineDraft: true` and no local booking reference.
  - Verified server RPC invocation routes through `reserve_venue_slot_atomic`.
- `PaymentCheckoutModal.test.tsx`: 4/4 tests passed.
  - Verified checkout modal rendering, plan selection, and payment status propagation.

---

## 5. Development Supabase Project Deployment Instructions

To apply Phase 5.4 to the development project `hznsbxvovjxvmnchzzqt`:

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt).
2. Open the **SQL Editor**.
3. Load and execute the forward-only migration:
   `supabase/migrations/20261108120000_phase5_4_payment_booking_security.sql`
4. Confirm successful execution.
5. In the **Edge Functions** tab, deploy:
   - `supabase/functions/verify-razorpay-payment/index.ts`
   - `supabase/functions/razorpay-webhook/index.ts`
6. Set the function secrets in Supabase Dashboard:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
