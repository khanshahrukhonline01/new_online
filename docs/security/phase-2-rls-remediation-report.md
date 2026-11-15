# KhelGrid — Phase 2: Row Level Security (RLS) Remediation
## Execution & Status Reconciliation Report

### 1. Executive Summary
- **Programme:** KhelGrid 10-Phase Security & Authorization Programme
- **Phase:** Phase 2 — Row Level Security (RLS) Remediation
- **Merged PR:** PR #173 (`security/phase-2-row-level-security-remediation`, commit `456ba0a2fc99020d8ee0cd1c65f7218fa48b09ab`)
- **Verification Branch:** `security/phase-2-rls-post-merge-verification`
- **Target Systems:**
  - Live Development Supabase Project: `hznsbxvovjxvmnchzzqt`
  - Repository Migration: `supabase/migrations/20261107233000_phase2_rls_remediation.sql`
  - Corrective Post-Merge Migration: `supabase/migrations/20261108040000_phase2_rls_post_merge_remediation.sql`
- **Deployment Status:**
  - **Repository Code:** Merged & Verified in automated test suites.
  - **Live Database (`hznsbxvovjxvmnchzzqt`):** **Pending Controlled Application (NOT YET APPLIED).**
  - **Production (`https://khelgrid.com/`):** Completely untouched.
- **Lead Security Architect:** Antigravity

---

### 2. Remediation Overview & Live Database Drift

| Finding ID | Severity | Target Object | Status in Repository | Status on Live DB (`hznsbxvovjxvmnchzzqt`) | Remediation Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | **Critical** | `listing_subscriptions` | **Remediated in Code** | **Active Broad Policy** (`USING true`) | Merged migration drops broad read; adds owner-only SELECT (`auth.uid() = user_id`). Pending DB application. |
| **SEC-002** | **Critical** | `venue_bookings` | **Remediated in Code** | **Active Broad Policy** (`USING true`) | Merged migration adds `user_id` and owner-only SELECT. Installed `get_booked_slots_for_venue`. Pending DB application. |
| **SEC-003** | **High** | `trial_reminders` | **Remediated in Code** | **Active Broad Policy** (`USING true`) | Merged migration drops `trial_reminders_public_read`. Preserves public INSERT. Pending DB application. |
| **SEC-004** | **Critical** | `handle_new_user()` trigger | **Remediated in Code** | Unapplied (No profiles trigger) | Whitelisted non-admin roles in migration `20261107120000`. |
| **SEC-005** | **Critical** | `profiles` | **Remediated in Code** | Active (Restricted Select) | Replaced public read with owner/admin SELECT and `public_profiles` view. |
| **SEC-006** | **Critical** | `host_payout_accounts` | **Remediated in Code** | Unapplied (Table not created) | Restricted to `auth.uid()::text = host_id` with `pgcrypto` column encryption. |
| **SEC-007** | **High** | `community_live_matches` | **Remediated in Code** | Unapplied (Table not created) | Restricted direct UPDATE to authenticated scorers. |
| **SEC-008** | **High** | `trial_applications` & `academy_enquiries` | **Remediated in Code** | Unapplied (Tables not created) | Restricted SELECT to applicant owner (`auth.uid() = user_id`). |
| **SEC-009** | **High** | Helper functions | **Remediated in Code** | Unapplied | Pinned `SET search_path = public, pg_temp`. |
| **SEC-011** | **Medium** | `coaches` schema defaults | **Remediated in Code** | Unapplied | Reset synthetic ratings/badges to unverified baselines. |
| **SEC-012** | **Low** | Table Owner Bypass | **Remediated in Code** | Active (0 tables forced) | Added `FORCE ROW LEVEL SECURITY` statements. |
| **SEC-014** | **Critical** | Whole-Row RPCs | **Remediated in `20261108040000`** | Unapplied | Replaced `SETOF public.*` with minimal zero-PII projections. |
| **SEC-015** | **Medium** | Zero-Policy Tables | **Remediated in `20261108040000`** | Active (0 policies) | Added explicit denial & host viewing policies on participants & rate limits. |
| **SEC-016** | **High** | Host Functions `anon` EXECUTE | **Remediated in `20261108040000`** | Active (16 callable by anon) | Revoked `EXECUTE` on host procedures from `anon`. |

---

### 3. Post-Merge Critical Findings & Corrections

#### 3.1 SEC-014: Whole-Row PII Exposure in Receipt RPCs
- **Defect in PR #173 (`20261107233000`)**:
  `get_listing_subscription_by_order(text)` and `get_venue_booking_voucher(text)` were declared returning `SETOF public.listing_subscriptions` and `SETOF public.venue_bookings` via `SELECT *`.
- **Vulnerability**: If an order ID or booking reference was guessed or shared, an anonymous caller could retrieve the customer's full legal name, phone number, email address, payment gateway ID, and billing amount.
- **Correction in `20261108040000`**:
  Replaced whole-row returns with minimal projections returning only order confirmation status, listing metadata, and masked names/emails. Sensitive gateway keys and raw telephone numbers are completely omitted.

#### 3.2 SEC-003: Unsafe Authenticated UPDATE on `trial_reminders`
- **Defect on Live Database**: `trial_reminders_authenticated_update` had `USING (true)` and `WITH CHECK (true)`. Any authenticated user could overwrite or delete any other athlete's trial reminder preferences.
- **Correction in `20261108040000`**:
  Replaced with `trial_reminders_owner_update` enforcing `auth.uid() IS NOT NULL AND auth.uid() = user_id`.

#### 3.3 SEC-015: Tables with RLS Enabled but Zero Policies
- **Defect on Live Database**: `public.pickup_game_participants` and `public.pickup_game_rsvp_rate_limits` had RLS enabled without any explicit policies.
- **Correction in `20261108040000`**:
  - `pickup_game_participants`: Explicitly denied direct anonymous access; granted host viewing for their games; shielded cancellation tokens from direct querying.
  - `pickup_game_rsvp_rate_limits`: Locked down as strictly internal-only (`USING (false)` for anon and authenticated).

#### 3.4 SEC-016: Host Functions Public Execution Privileges
- **Defect on Live Database**: 16 `SECURITY DEFINER` functions granted EXECUTE to `anon`.
- **Correction in `20261108040000`**:
  Revoked `EXECUTE` from `anon` and `PUBLIC` on all host management procedures (`cancel_pickup_game_as_host`, `complete_pickup_game_as_host`, `reopen_pickup_game_as_host`, `update_pickup_game_capacity`, `update_pickup_game_details`, `reschedule_pickup_game`, `get_host_pickup_games`, `approve_pickup_game_whatsapp_invite`) and moderation procedures (`admin_moderate_pickup_game`).

---

### 4. Verification and Regression Testing

- **Regression Test Suites**:
  - `database-security-phase2.test.ts` (9 tests passed).
  - `database-security-phase2-remediation.test.ts` (14 tests passed).
- **Test Invariants Verified**:
  - Anonymous denial on `listing_subscriptions`, `venue_bookings`, and `trial_reminders`.
  - Zero-PII projection verification for `get_listing_subscription_by_order` and `get_venue_booking_voucher`.
  - Cross-user update prevention on `trial_reminders`.
  - Rate-limit table isolation.
  - Revocation of anonymous execution on host functions.
  - Public sports catalogue accessibility preserved.

---

### 5. Deployment Safety & Non-Destructive Guarantee

- **Zero live migrations applied.**
- **Zero destructive SQL commands executed.**
- **Production website (`https://khelgrid.com/`) completely untouched.**
- Both migrations (`20261107233000` and `20261108040000`) are fully idempotent, forward-only, and ready for deployment in a coordinated maintenance window.
