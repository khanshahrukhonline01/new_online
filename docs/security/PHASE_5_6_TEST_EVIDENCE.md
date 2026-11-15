# KhelGrid Security Programme — Phase 5.6
## Comprehensive Automated Test Evidence & Verification Ledger

> **Document ID:** SEC-TEST-PHASE-5-6  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Production Target:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Summary of Test Execution

All quality gates, adversarial security tests, and isolated PostgreSQL test suites executed cleanly with zero failures.

| Test Suite / Gate | Test Scope | Passed / Total | Status |
|---|---|---|:---:|
| **Phase 5.6 Capture & Pricing Suite** | Isolated PostgreSQL 17 test cases | **16 / 16** | ✅ **PASSED** |
| **Phase 5.5 Settlement Suite** | Isolated PostgreSQL 17 test cases | **15 / 15** | ✅ **PASSED** |
| **Phase 5.4 Booking Lifecycle Suite** | Isolated PostgreSQL 17 test cases | **13 / 13** | ✅ **PASSED** |
| **Identity & Ownership Suite** | Isolated PostgreSQL 17 test cases | **22 / 22** | ✅ **PASSED** |
| **All Supabase Integration Suites** | 25 test files across security domains | **322 / 322** | ✅ **PASSED** |
| **Frontend Payment Service Tests** | Unit tests for `paymentService.ts` | **23 / 23** | ✅ **PASSED** |
| **Payment Checkout Modal Tests** | Unit tests for checkout UI | **4 / 4** | ✅ **PASSED** |
| **SQL Migration Safety Validator** | CI regex, transaction blocks, non-destructive check | **67 / 67** | ✅ **PASSED** |
| **TypeScript Typecheck (`tsc -b`)** | Static typing across full workspace | **0 errors** | ✅ **PASSED** |
| **ESLint (`eslint .`)** | Code style and lint rules | **0 errors** | ✅ **PASSED** |
| **Vite Production Build** | Static bundle compile & minification | **Exit code 0** | ✅ **PASSED** |

---

## 2. Phase 5.6 Dedicated Scenario Ledger

File: `src/integrations/supabase/phase5-6-payment-capture-pricing.test.ts`

1. **Scenario 1**: Settles transaction when Razorpay payment entity is captured (`status: 'captured'`, `captured: true`).
2. **Scenario 2**: Authorized but uncaptured payment is not settled and remains in `pending_verification`.
3. **Scenario 3**: Rejects payment when gateway payment entity belongs to a different order (`ORDER_MISMATCH`).
4. **Scenario 4**: Rejects payment when gateway amount differs from database order by even 1 paisa (`AMOUNT_MISMATCH`).
5. **Scenario 5**: Rejects payment when gateway currency is USD instead of authoritative INR (`CURRENCY_MISMATCH`).
6. **Scenario 6**: Webhook claim guarantees exactly-once processing across concurrent workers (`processing_in_flight`).
7. **Scenario 7**: Uses deterministic hash of raw body when webhook event ID is missing (`body_hash_...`).
8. **Scenario 8**: Quarantines payment in `reconciliation_required` when target booking record does not exist (`TARGET_BOOKING_MISSING`).
9. **Scenario 9**: Quarantines captured payment in `reconciliation_required` when booking was already cancelled (`BOOKING_ALREADY_CANCELLED`).
10. **Scenario 10**: Prevents double-booking when hold expired and slot was taken by another user (`SLOT_NO_LONGER_AVAILABLE`).
11. **Scenario 11**: Resolves exact court-specific tariff (Court 1 = ₹600, Court 2 = ₹1,200).
12. **Scenario 12**: Falls back to venue `slot_hourly_fee` (₹950) when requested court has no specific tariff.
13. **Scenario 13**: Rejects reservation with `PRICE_UNRESOLVED` when neither court nor venue has a valid tariff.
14. **Scenario 14**: Government SAI facilities have `NULL slot_hourly_fee` and reject commercial booking.
15. **Scenario 15**: Client-submitted price is ignored; database authoritative tariff is charged.
16. **Scenario 16**: Quarantines subscription payment in `reconciliation_required` when subscription record does not exist (`TARGET_SUBSCRIPTION_MISSING`).

---

## 3. Production Isolation Statement

The production domain `https://khelgrid.com/` and its database were **never connected, queried, or modified**. All work was conducted in local isolated PostgreSQL 17 test beds, with forward-only migrations prepared exclusively for Supabase development project `hznsbxvovjxvmnchzzqt`.
