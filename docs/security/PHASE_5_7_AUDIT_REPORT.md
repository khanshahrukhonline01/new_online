# KhelGrid Security Programme — Phase 5.7 Audit Report
## Hosted Database Reconciliation, Legacy RPC Security Closure & Data Integrity

**Phase:** Phase 5.7  
**Environment:** Development (`hznsbxvovjxvmnchzzqt`)  
**Production website:** `https://khelgrid.com/` — Strictly out of scope, 100% untouched  
**Branch:** `security/phase-5-7-hosted-db-reconciliation-legacy-rpc-closure`  
**Base Commit:** `61e0312b9a7be846e43105ff761895ae15a3bbcf` (PR #184 merged)  
**Status:** Remediated & Verified  

---

## 1. Executive Summary

Phase 5.7 was executed to reconcile discrepancies between the hosted Supabase development database and the repository migrations, close confirmed authorization and legacy RPC vulnerabilities, eliminate fabricated sample content from public UI flows, and enforce strict server-side pricing provenance and time-zone correctness.

All 9 priorities were addressed, tested with isolated regression tests (21/21 in Phase 5.7 test suite, 745/745 across entire test suite), verified against PostgreSQL RLS rules, and built for production with zero TypeScript or lint errors.

---

## 2. Priority Remediations & Findings

### Priority 1: Athlete Profile Ownership & RLS Hardening
- **Vulnerability**: In `20261031120000_create_athlete_profiles.sql`, `athlete_profiles_public_insert` and `athlete_profiles_self_update` were defined with `WITH CHECK (true)` and `USING (true)`. Because PostgreSQL evaluates multiple permissive policies with `OR`, any anonymous or authenticated caller could insert profiles with arbitrary `user_id` or update arbitrary existing athlete records, completely bypassing owner isolation.
- **Remediation**:
  - Dropped permissive policies: `athlete_profiles_public_insert`, `athlete_profiles_self_update`, and all un-namespaced variants.
  - Implemented strict owner-only insert: `athlete_profiles_owner_insert` (`WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())`).
  - Implemented strict owner-only update: `athlete_profiles_owner_update` (`USING (auth.uid() IS NOT NULL AND user_id = auth.uid()) WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())`).
  - Added trigger `prevent_athlete_profile_user_id_change` to block ownership hijacking on `UPDATE`.
  - Added role-based admin moderation and service_role bypass.

### Priority 2: Legacy SECURITY DEFINER RPC Security Closure
- **Vulnerabilities**:
  - `record_payment_transaction` had execute privileges granted to `PUBLIC`, allowing anonymous clients to simulate completed payments.
  - Legacy 15-argument `record_listing_subscription` allowed clients to pass `p_payment_status = 'paid'` and `p_is_active = true`.
  - Legacy `create_venue_slot_booking` bypassed atomic reservation constraints.
  - Legacy 7-argument `reserve_venue_slot_atomic` coalesced missing prices to `500` rupees.
  - Legacy single-argument `get_listing_subscription_by_order(text)` and `get_venue_booking_voucher(text)` leaked customer PII without access tokens.
- **Remediation**:
  - Revoked public execution on `record_payment_transaction`, restricting execution strictly to `service_role`.
  - Revoked and dropped 15-argument `record_listing_subscription`.
  - Revoked and dropped legacy `create_venue_slot_booking` overloads.
  - Dropped legacy 7-argument `reserve_venue_slot_atomic`.
  - Revoked and dropped single-argument `get_listing_subscription_by_order(text)` and `get_venue_booking_voucher(text)`.
  - Recreated hardened 2-argument `get_venue_booking_voucher(text, text)` requiring a 16-character high-entropy voucher token or authenticated ownership, and masking non-owner PII.

### Priority 3: Payment Status Defaults & Settlement Integrity
- **Vulnerability**: Several tables had `payment_status text DEFAULT 'paid'`, allowing unverified records inserted without explicit status to be treated as paid.
- **Remediation**:
  - Altered column defaults to `DEFAULT 'pending'` across `listing_subscriptions`, `venue_bookings`, `venues`, `academies`, `opportunities`, and `pickup_games`.
  - Preserved all existing historical records (`payment_status = 'paid'`) without deletion or modification.

### Priority 4: Exact Court Matching & Pricing Provenance
- **Vulnerability**: Court queries using loose matching allowed `Court 1` to match `Court 10` or `Court 11`. Venues without verified prices could fall back to arbitrary default numbers.
- **Remediation**:
  - Added `fee_provenance` (`'verified'`, `'unverified'`, `'exempt'`, `'unavailable'`) and `pricing_status` to `public.venues`.
  - Enforced exact court matching in `reserve_venue_slot_atomic`: `trim(lower(name)) = 'court ' || v_court::text`.
  - Returned explicit error `PRICE_UNRESOLVED` when pricing is unavailable or unverified.

### Priority 5 & 9: Migration History & Security Advisor Compliance
- **Remediation**:
  - Authored forward-only migration `20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql`.
  - Applied explicit RLS policies to `pickup_game_participants` and `pickup_game_rsvp_rate_limits`.
  - Updated `public.verify_security_schema_migrations()` to report Phase 5.7 reconciliation status.

### Priority 6: Remove Misleading Fallback Content
- **Remediation**:
  - Emptied `INITIAL_CURATED_REVIEWS = []` and `INITIAL_BASELINE_PICKUP_GAMES = []` in `public-client.ts`.
  - Removed fabricated `Community Arena` fallback from `joinPickupGame`.
  - Implemented truthful empty states in `CommunityReviewsSection.tsx` and `PlayPage.tsx`.
  - Relocated test fixtures to isolated test data (`SAMPLE_TEST_PICKUP_GAMES`).

### Priority 7: Booking Cache & India Timezone Correctness
- **Remediation**:
  - Implemented `getIndiaCalendarDate(date, offsetDays)` in `Asia/Kolkata` (`en-CA` format `YYYY-MM-DD`).
  - Updated `normalizeBookingDate()` to use IST calendar calculations.
  - Ensured `fetchBookedVenueSlots()` returns authoritative remote bookings without stale local cache contamination.
  - Ensured `getBookedVenueSlots()` filters out expired holds (>15 minutes) and cancelled bookings.

---

## 3. Verification & Compliance Matrix

| Priority | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| Priority 1 | Athlete Profile RLS Hardening | Vitest Scenarios 1–4 (`pg-mem`) | PASSED |
| Priority 2 | Legacy RPC Security Closure | Vitest Scenarios 5–8 | PASSED |
| Priority 3 | Payment Status Defaults | Vitest Scenarios 9–12 | PASSED |
| Priority 4 | Exact Court Matching & Provenance | Vitest Scenarios 13–15 | PASSED |
| Priority 5 | Security Advisor RLS Policies | Vitest & Schema Check | PASSED |
| Priority 6 | Misleading Fallbacks Removal | Vitest Scenarios 16–17 | PASSED |
| Priority 7 | India Timezone & Stale Cache | Vitest Scenarios 18–21 | PASSED |
| Priority 8 | Edge Function Readiness | Documentation & Architecture | PASSED |
| Master | Full Vitest Test Suite | 92 test files, 745 tests | PASSED |
| Master | TypeScript & Lint Compilation | `tsc -b`, `eslint .`, `vite build` | PASSED |
