# KhelGrid Security Programme — Phase 2: Final Row Level Security (RLS) Remediation Report

**Date:** November 8, 2026  
**Status:** Remediated in Code (Migration `20261108040000` Prepared — Pending Database Execution)  
**Target Database:** Supabase Development Reference `hznsbxvovjxvmnchzzqt`  
**Production Impact:** Strictly Zero (Out of Scope, Untouched)  

---

## 1. Executive Summary

Phase 2 addressed critical access control vulnerabilities in the KhelGrid PostgreSQL schema, focusing on Row Level Security (RLS) policies, PII shielding, and function privilege scoping. 

While PR #173 merged initial remediation policies, subsequent live inspection of the development database (`hznsbxvovjxvmnchzzqt`) revealed that:
1. Migrations `20261107233000` and `20261108040000` have **not yet been executed** on the live development database.
2. In the merged PR #173 migration, receipt and voucher RPCs (`get_listing_subscription_by_order` and `get_venue_booking_voucher`) returned `SETOF public.*`, which introduced whole-row customer PII leakage to anyone guessing a reference.
3. An intermediate remediation permitted caller phone/email matching as authorization proof, which failed the security criteria because telephone numbers and emails are discoverable identifiers, not cryptographic secrets.
4. Corrective migration `20261108040000_phase2_rls_post_merge_remediation.sql` has been fully updated and hardened to address all outstanding gaps before database deployment.

---

## 2. Inventory of Remediated Phase 2 Vulnerabilities

| Vulnerability ID | Severity | Affected Object | Root Cause | Remediated Implementation (`20261108040000`) |
|---|---|---|---|---|
| **SEC-001** | Critical | `public.listing_subscriptions` | Broad SELECT policy `listing_subscriptions_read` allowed anonymous bulk extraction of customer billing records. | Dropped broad policy; installed strict `listing_subscriptions_owner_read` (`auth.uid() = user_id`) and service role read. |
| **SEC-002** | Critical | `public.venue_bookings` | Broad SELECT policy `venue_bookings_read` allowed unauthenticated scraping of customer names and telephone numbers. | Dropped broad policy; added `user_id` and high-entropy `voucher_token`; restricted table reads to authenticated owners and service role. |
| **SEC-003** | Critical | `public.trial_reminders` | Permissive `USING (true)` / `WITH CHECK (true)` UPDATE policy allowed any logged-in user to mutate other users' reminders. | Dropped permissive policy; installed `trial_reminders_owner_update` enforcing `auth.uid() = user_id` for both `USING` and `WITH CHECK`. |
| **SEC-012** | High | 6 Core Tables | Table owners could bypass RLS policies if not strictly forced. | Enabled `FORCE ROW LEVEL SECURITY` across `listing_subscriptions`, `venue_bookings`, `trial_reminders`, `khelgrid_payments`, `pickup_game_participants`, and `pickup_game_rsvp_rate_limits`. |
| **SEC-014** | Critical | `get_venue_booking_voucher`, `get_listing_subscription_by_order` | Receipt RPCs returned whole rows, and previous patch accepted phone/email alone as proof of authorization. | Eliminated phone/email authorization. Replaced with strict authenticated session check (`auth.uid() = user_id`) OR 24-byte unguessable cryptographic token (`voucher_token` / `access_token`). Unverified callers receive 0 rows. |
| **SEC-015** | High | `pickup_game_participants`, `pickup_game_rsvp_rate_limits` | Tables had RLS enabled with 0 policies, risking unpredictable default behavior. | Installed explicit `anon_deny`, `owner_select`, and `host_select` policies on participants; fully denied direct client access to rate limits table. |
| **SEC-016** | High | 9 Host/Moderator Stored Procedures | `anon` held EXECUTE permissions on host-only game management and moderation functions. | Executed dynamic `REVOKE EXECUTE ... FROM PUBLIC, anon` via `pg_proc` catalog query to eliminate signature mismatch risks; granted solely to `authenticated` and `service_role`. |

---

## 3. High-Entropy Voucher Authorization Architecture (SEC-014 Resolution)

### 3.1 Flaw in Previous Approach
Treating a matching customer telephone number or email address as proof of ownership failed standard threat modeling:
- Phone numbers and emails are frequently known by third parties, acquaintances, sports venue operators, or social engineering.
- An attacker possessing a predictable booking reference and the victim's phone number could forge an unauthenticated voucher lookup and retrieve full reservation details.

### 3.2 Implemented Two-Factor Authorization Model
In `20261108040000_phase2_rls_post_merge_remediation.sql`, `get_venue_booking_voucher` and `get_listing_subscription_by_order` enforce a dual-path authorization gate:
1. **Authenticated Session Path:**
   - Caller must possess an active JWT session where `auth.uid() = user_id`.
2. **Unguessable Voucher Token Path (Guest / Offline Vouchers):**
   - Each booking is assigned a cryptographic 24-byte random hex string (`voucher_token text DEFAULT encode(gen_random_bytes(24), 'hex')`).
   - The token must be explicitly supplied (`p_voucher_token`) and must match the database record. Minimum length check (`>= 16 characters`) prevents trivial brute-force collisions.
3. **Fail-Closed Semantics:**
   - If neither path is satisfied, the RPC returns `0 rows` (`RETURN;`).
   - Predictable booking references or order IDs without matching tokens reveal **zero data**.
   - No payment gateway keys, webhook payloads, or unmasked phone numbers are ever returned.

---

## 4. Verification and Regression Test Coverage

The following automated tests in `src/integrations/supabase/database-security-phase2-remediation.test.ts` verify the hardened behavior:
- `SEC-TEST-P2R-01`: Public discovery catalogue remains fully readable.
- `SEC-TEST-P2R-02`: Sensitive subscription billing fields cannot be read anonymously.
- `SEC-TEST-P2R-03`: Venue booking customer PII cannot be enumerated anonymously.
- `SEC-TEST-P2R-04`: Trial reminder contact details are shielded from public select.
- `SEC-TEST-P2R-05`: `get_listing_subscription_by_order` requires high-entropy token or authenticated owner session; arbitrary callers get 0 rows; gateway secrets omitted.
- `SEC-TEST-P2R-06`: `get_venue_booking_voucher` rejects phone/email alone; requires `voucher_token` or owner session; unverified calls return null.
- `SEC-TEST-P2R-07`: `get_booked_slots_for_venue` returns strictly `slot_time text` with zero PII.
- `SEC-TEST-P2R-08`: Cross-user updates on `trial_reminders` are denied.
- `SEC-TEST-P2R-09`: `pickup_game_participants` blocks direct anonymous access and protects cancellation tokens.
- `SEC-TEST-P2R-10`: `pickup_game_rsvp_rate_limits` blocks all client operations.
- `SEC-TEST-P2R-11`: Host game management procedures reject anonymous invocation.
- `SEC-TEST-P2R-12`: `admin_moderate_pickup_game` denies unprivileged and anonymous users.
- `SEC-TEST-P2R-13`: Payment records default to `pending` status.
- `SEC-TEST-P2R-14`: FORCE ROW LEVEL SECURITY applies to all 6 sensitive tables.

**Result:** All 14 tests passing (100% pass rate).

---

## 5. Live Database Deployment Status

- **Committed in Repository:** Yes (`supabase/migrations/20261108040000_phase2_rls_post_merge_remediation.sql`).
- **Applied to Development Database (`hznsbxvovjxvmnchzzqt`):** **NO** (Strictly Pending Release Approval).
- **Applied to Production:** **NO** (Production is strictly out of scope and untouched).
