# KhelGrid Security Programme — Phase 5.4 Audit Report
## Critical Payment Verification, Venue Booking Lifecycle & Public RPC Privacy

> **Document ID:** SEC-P54-AUDIT-001  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Branch:** `main`  
> **Target Database:** `hznsbxvovjxvmnchzzqt` (Development Supabase Project)  
> **Production Status:** `https://khelgrid.com/` — STRICTLY OUT OF SCOPE (0 modifications)  

---

## 1. Executive Summary

A comprehensive line-by-line audit of the merged Phase 5.3 codebase was conducted across frontend payment services, checkout modals, venue detail pages, standalone SQL migrations, and the master consolidated deployment package. 

While Phase 5.3 eliminated client-supplied price fallbacks and resolved database schema prerequisites (`user_id` column existence), our re-audit identified seven critical defects where client browsers still possessed unverified authority, direct table mutations bypassed atomic locks, public RPCs leaked subscriber PII, and booking vouchers lacked cryptographic authorization.

This document records the exact file, function, existing behavior, exploit scenario, required remediation, and regression test plan for each finding.

---

## 2. Finding-by-Finding Security Audit

### Finding 1: Fake Signature-Length Validation in Browser
- **File & Function:** `src/shared/payments/paymentService.ts` — `verifyPaymentSignature()`
- **Line Numbers:** 98–109
- **Existing Behavior:** Evaluates `signature.length >= 16` as verification of gateway authenticity when no expected hash is provided.
- **Exploit / Failure Scenario:** A malicious client generates a dummy 16-character string (`"aaaaaaaaaaaaaaaa"`). The browser considers this a "valid" signature, reporting false confidence and marking local checkout state as valid.
- **Required Correction:** Remove client-side signature-length spoofing. The browser cannot establish payment authenticity; true verification requires HMAC-SHA256 evaluation against the server-held secret key.
- **Regression Test:** Vitest unit test asserting that dummy signatures of arbitrary lengths reject verification and that only server verification confirms payment authenticity.

---

### Finding 2: Unverified Online Payment Settlement in `recordPaymentTransaction()`
- **File & Function:** `src/shared/payments/paymentService.ts` — `recordPaymentTransaction()`
- **Line Numbers:** 138–143, 181–209
- **Existing Behavior:** If a client passes `status: 'completed'` with a dummy signature $\ge 16$ characters, `effectiveStatus` remains `'completed'`, saving a completed receipt in `localStorage` and requesting `'completed'` status from the remote database.
- **Exploit / Failure Scenario:** An attacker bypasses payment gateways completely by forging a 16-character hex string and invoking `recordPaymentTransaction`, receiving a valid-looking receipt (`REC-...`) without transferring any funds.
- **Required Correction:** All online payments must default to `'pending_verification'` on the client and in the database. Only a server-verified gateway response or verified webhook can transition payment to `'completed'`.
- **Regression Test:** Test ensuring that client-submitted online payments are never assigned `'completed'` status without cryptographic settlement from the backend.

---

### Finding 3: Direct Table Insertion Fallback in `recordVenueSlotBooking()`
- **File & Function:** `src/shared/payments/paymentService.ts` — `recordVenueSlotBooking()`
- **Line Numbers:** 433–540
- **Existing Behavior:** If the atomic RPC `reserve_venue_slot_atomic` fails or times out, the function falls back to a direct REST `POST /rest/v1/venue_bookings` inserting client-supplied `total_amount`, `paid_amount`, `payment_status`, and `status: 'confirmed'`.
- **Exploit / Failure Scenario:** An attacker purposely induces an RPC error (e.g., malformed parameter) or directly targets the REST table endpoint to insert bookings at ₹0.00 with `status: 'confirmed'`, completely bypassing atomic locking and authoritative price lookups.
- **Required Correction:** Remove the direct table insertion fallback entirely. All venue reservations must execute strictly through `reserve_venue_slot_atomic`. If the database is unreachable, the booking must return `status: 'unconfirmed'` with `bookingRef: ''`, `isOfflineDraft: true`, and zero voucher claims.
- **Regression Test:** Test verifying that simulated RPC failure returns an unconfirmed state and never writes directly to `public.venue_bookings`.

---

### Finding 4: Insecure Paid Listing Plan Activation in `recordListingSubscription()`
- **File & Function:** `src/shared/payments/paymentService.ts` — `recordListingSubscription()`, `CommunityListingModal.tsx`
- **Line Numbers:** `paymentService.ts` 756–768, 835–841; `CommunityListingModal.tsx` 380–382
- **Existing Behavior:** Frontend checks `Boolean(input.paymentId && input.paymentId.trim().length >= 8 && input.paymentStatus === 'paid')`. If remote RPC fails, it falls through to local cache and returns `status: 'success'`. In `CommunityListingModal.tsx`, unverified UPI payments are mapped to `paymentStatus: 'paid'`.
- **Exploit / Failure Scenario:** A user enters a dummy 8-character payment ID (e.g. `PAY_12345678`) and selects UPI without paying. The subscription is granted `status: 'success'`, activating premium directory placement without verified payment.
- **Required Correction:** Subscriptions must only be activated upon verified server payment settlement. When offline or unverified, return `status: 'pending_verification'` or `error`. In PostgreSQL `record_listing_subscription`, untrusted callers must always insert subscriptions with `is_active = false` and `payment_status = 'pending'`.
- **Regression Test:** Unit tests testing arbitrary payment IDs, unverified statuses, and network failures to guarantee subscriptions are never marked active without verified payment.

---

### Finding 5: Public PII Leak in `get_listing_subscription_by_order()`
- **File & Function:** `supabase/migrations/20261108110000_identity_ownership_and_schema_reconciliation.sql`
- **Line Numbers:** 576–590
- **Existing Behavior:** Function returns `SETOF public.listing_subscriptions` executing `SELECT * FROM public.listing_subscriptions WHERE order_id = trim(p_order_id)` and is granted to `anon`.
- **Exploit / Failure Scenario:** Any anonymous user knowing or guessing an `order_id` (e.g. `KG_ORD_...`) can call this public RPC and retrieve customer phone numbers, customer emails, internal user IDs, payment IDs, and metadata.
- **Required Correction:** Revoke raw table access. Redesign the function to return a sanitized JSON projection omitting phone, email, internal user IDs, and gateway metadata. Require high-entropy `access_token` or authenticated owner context (`auth.uid() = user_id`) for retrieval.
- **Regression Test:** Isolated PostgreSQL test ensuring anonymous callers without authorization receive `NULL` and that authorized callers receive only sanitized fields without customer phone or email.

---

### Finding 6: Insecure Voucher Retrieval & Parameter Mismatch in `get_venue_booking_voucher()`
- **File & Function:** `supabase/migrations/20261108110000_identity_ownership_and_schema_reconciliation.sql` (lines 320–375), `paymentService.ts` (lines 627–665)
- **Existing Behavior:** SQL function accepts `(p_booking_ref text, p_customer_phone text)` and returns table rows. In consolidated deployment SQL, it accepts `(p_booking_id uuid, p_voucher_token text)`. Neither enforces robust rate limiting against reference enumeration, and phone-based verification allows phone scraping.
- **Exploit / Failure Scenario:** An attacker brute-forces predictable booking reference prefixes (`VB-VEN-...`) against phone numbers to harvest private booking records and customer names.
- **Required Correction:** Unify `get_venue_booking_voucher` to require high-entropy 128-bit `voucher_token` (returned during reservation) or authenticated owner context (`user_id = auth.uid()`). Enforce rate limiting (`check_and_increment_rate_limit`) and return sanitized JSON with masked customer names and zero phone/email leakage.
- **Regression Test:** Test verifying that guessing booking reference without voucher token yields `NULL`, rate limits trigger after 15 attempts, and legitimate voucher tokens return sanitized data.

---

### Finding 7: Ambiguous Booking Lifecycle & Missing Idempotency in `reserve_venue_slot_atomic()`
- **File & Function:** `supabase/migrations/20261108110000_identity_ownership_and_schema_reconciliation.sql` (lines 378–528)
- **Existing Behavior:** Creates reservations in `status = 'pending'` with 15-minute expiry. Expired holds are transitioned to `'cancelled'` instead of `'expired'`. Lacks request idempotency key, causing retries to trigger unique constraint conflicts. Frontend immediately treats `status: 'pending'` as confirmed success.
- **Exploit / Failure Scenario:** Network glitch during reservation causes user retry, which fails with `CONCURRENCY_CONFLICT` because the previous unconfirmed hold is locking the slot. Expired records are conflated with deliberate user cancellations.
- **Required Correction:**
  1. Add `p_idempotency_key text` support. If a matching idempotency key exists, return the existing reservation.
  2. Implement strict state machine: `pending` -> `confirmed` -> `completed`, with `expired`, `cancelled`, `superseded`, and `refunded` releasing the slot.
  3. Expired holds explicitly transition to `'expired'`.
  4. Frontend UI distinguishes server-confirmed booking from pending hold or unconfirmed draft.
- **Regression Test:** Isolated PostgreSQL test executing repeated requests with the same idempotency key, verifying slot release on expiry, and testing state transitions.

---

## 3. Summary of Action Items

| Item | Area | Action |
| :--- | :--- | :--- |
| **ACT-01** | Frontend | Remove signature-length checks; require verified backend settlement |
| **ACT-02** | Frontend | Remove direct table insertion fallback from `recordVenueSlotBooking` |
| **ACT-03** | Frontend | Block paid listing subscription activation without verified server settlement |
| **ACT-04** | Backend | Deploy Edge Functions for Razorpay payment verification and webhook processing |
| **ACT-05** | Database | Implement forward-only migration `20261108120000_phase5_4_payment_booking_security.sql` |
| **ACT-06** | Database | Sanitize `get_listing_subscription_by_order` and `get_venue_booking_voucher` |
| **ACT-07** | Database | Add idempotency key and explicit expiry transition to `reserve_venue_slot_atomic` |
| **ACT-08** | QA | Implement comprehensive isolated PostgreSQL regression tests |
