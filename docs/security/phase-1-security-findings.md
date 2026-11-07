# KhelGrid — Phase 1: Security Findings Register
## Reconciled Findings Register (Post-Merge Audit Edition)

**Document**: Security Findings Register  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Application Security Auditor  
**Reconciliation Date**: November 7, 2026  
**Environment**: Development Database (`hznsbxvovjxvmnchzzqt`)  

---

## 1. Findings Summary by Severity

| Severity | Count | Confirmed Live Database | Repository-Only (Latent Migration Risk) |
|---|---|---|---|
| **Critical** | 6 | 2 | 4 |
| **High** | 5 | 2 | 3 |
| **Medium** | 3 | 1 | 2 |
| **Low** | 1 | 1 | 0 |
| **Informational** | 1 | 1 | 0 |
| **Total** | **16** | **7** | **9** |

---

## 2. Detailed Findings Register

### SEC-001: Unrestricted Public Read Exposes Commercial Billing & Customer Contact PII
- **Severity**: **Critical**
- **Affected Database Object**: `public.listing_subscriptions`
- **Confirmation Status**: **Confirmed Live Database Vulnerability**
- **Evidence**:
  - Live probe against `https://hznsbxvovjxvmnchzzqt.supabase.co/rest/v1/listing_subscriptions` returned HTTP 206 with 399 rows accessible to the public `anon` role.
  - Exposed columns include: `customer_name`, `customer_phone`, `customer_email`, `amount`, `payment_id`, `order_id`, and `listing_name`.
  - Defined in migration `20261106130000_add_listing_subscription_plans.sql`:
    ```sql
    CREATE POLICY "listing_subscriptions_read" ON public.listing_subscriptions
      FOR SELECT TO anon, authenticated USING (true);
    ```
- **Deployment Status**: Merged in code (PR #173 migration `20261107233000`), but **not yet applied to `hznsbxvovjxvmnchzzqt`**. Broad policy remains live on database.
- **Recommended Correction**:
  - Revoke broad `USING (true)` policy on `listing_subscriptions`.
  - Restrict SELECT to authenticated record owners (`auth.uid() = user_id`) and administrators (`is_admin()`).

---

### SEC-002: Customer PII & Booking Financials Exposed to Anonymous Users
- **Severity**: **Critical**
- **Affected Database Object**: `public.venue_bookings`
- **Confirmation Status**: **Confirmed Live Database Vulnerability**
- **Evidence**:
  - Live probe against `https://hznsbxvovjxvmnchzzqt.supabase.co/rest/v1/venue_bookings` returned HTTP 200 with customer booking records to unauthenticated `anon` callers.
  - Exposed columns include: `customer_name`, `customer_phone`, `venue_name`, `slot_date`, `slot_time`, `total_amount`, `paid_amount`.
  - Defined in migration `20261106120000_create_payments_and_bookings.sql`:
    ```sql
    CREATE POLICY "venue_bookings_read" ON public.venue_bookings
      FOR SELECT TO anon, authenticated USING (true);
    ```
- **Deployment Status**: Merged in code (PR #173 migration `20261107233000`), but **not yet applied to `hznsbxvovjxvmnchzzqt`**. Broad policy remains live on database.
- **Recommended Correction**:
  - Restrict `venue_bookings` SELECT access to authenticated booking owner (`auth.uid() = user_id`).
  - Provide a dedicated zero-PII RPC (`get_booked_slots_for_venue`) exposing only `slot_time`.

---

### SEC-003: Overly Permissive Read & Unsafe Update on Selection Trial Alerts
- **Severity**: **High**
- **Affected Database Object**: `public.trial_reminders`
- **Confirmation Status**: **Confirmed Live Database Vulnerability**
- **Evidence**:
  - Live probe against `https://hznsbxvovjxvmnchzzqt.supabase.co/rest/v1/trial_reminders` returned HTTP 206 with active rows to `anon`.
  - Exposed columns include: `athlete_phone`, `athlete_email`, `trial_title`, `trial_slug`.
  - `trial_reminders_public_read` has `USING (true)`.
  - **Additional Finding**: `trial_reminders_authenticated_update` has `USING (true)` and `WITH CHECK (true)`, allowing any authenticated user to overwrite or delete notification preferences of any other athlete!
- **Deployment Status**: Merged in code (PR #173 migration `20261107233000`), but **not yet applied to `hznsbxvovjxvmnchzzqt`**. Broad read and unsafe update remain live on database.
- **Recommended Correction**:
  - Restrict SELECT access on `trial_reminders` to `auth.uid() = user_id`.
  - Restrict UPDATE access to record owner `auth.uid() = user_id`.
  - Maintain public INSERT for athlete trial alert subscriptions.

---

### SEC-004: Unauthenticated Privilege Escalation to Administrator Role via Registration Metadata
- **Severity**: **Critical**
- **Affected Database Object**: `public.handle_new_user()` trigger & `public.profiles`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261107120000_auth_and_user_profiles_hardening.sql`, lines 53-56:
    The trigger allowed user metadata to assert `'admin'`, creating privilege escalation.
- **Recommended Correction**:
  - Whitelist allowed signup roles strictly to non-admin roles (`athlete`, `host`, `coach`, `scout`, `academy`).

---

### SEC-005: Unrestricted Read Policy on Profiles Exposes Private Email and Phone Numbers
- **Severity**: **Critical**
- **Affected Database Object**: `public.profiles`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - Migration `20261107120000` defined `create policy "profiles_select_public" on public.profiles for select using (true);`.
- **Recommended Correction**:
  - Restrict direct table SELECT to `auth.uid() = id` or admin.
  - Create `public.public_profiles` view excluding `email` and `phone`.

---

### SEC-006: Over-Permissive Read & Update Policies on Host Payout Banking Credentials
- **Severity**: **Critical**
- **Affected Database Object**: `public.host_payout_accounts` & `public.host_settlement_payouts`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - Migration `20261106150000` defined `CREATE POLICY ... FOR SELECT USING (true);`.
- **Recommended Correction**:
  - Enforce strict host owner matching (`auth.uid()::text = host_id`).

---

### SEC-007: Unrestricted Scoreboard Mutation on Live Community Matches
- **Severity**: **High**
- **Affected Database Object**: `public.community_live_matches`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - Migration `20261106150000` defined `CREATE POLICY ... FOR UPDATE USING (true);`.
- **Recommended Correction**:
  - Restrict mutations to authenticated hosts/scorers.

---

### SEC-008: Over-Permissive Access on Candidate Applications & Academy Enquiries
- **Severity**: **High**
- **Affected Database Object**: `public.trial_applications` & `public.academy_enquiries`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - Migration `20261107180000` defined `USING (true)` on applicant dossiers.
- **Recommended Correction**:
  - Restrict SELECT to applicant `auth.uid() = user_id`.

---

### SEC-009: Missing `search_path` on `SECURITY DEFINER` Functions
- **Severity**: **High**
- **Affected Database Object**: `public.is_admin()`, `public.has_role(text)`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - Functions declared as `SECURITY DEFINER` without setting explicit `search_path`.
- **Recommended Correction**:
  - Explicitly specify `SET search_path = public, pg_temp` on all `SECURITY DEFINER` functions.

---

### SEC-010: Dangerous Financial & Intake Status Defaults
- **Severity**: **Medium**
- **Affected Database Object**: `khelgrid_payments.status`, `venue_bookings.payment_status`, `verification_claims.status`
- **Confirmation Status**: **Confirmed Live Database & Repository Risk**
- **Evidence**:
  - `khelgrid_payments.status` defaults to `'completed'`.
  - `venue_bookings.payment_status` defaults to `'paid'`.
- **Recommended Correction**:
  - Change default payment status to `'pending'`.

---

### SEC-011: Fabricated / Misleading Business Baseline Defaults
- **Severity**: **Medium**
- **Affected Database Object**: `public.coaches` & `public.tournaments_and_events`
- **Confirmation Status**: **Repository-Only Risk**
- **Evidence**:
  - Rating default `4.90`, review count `48`, verified badge `'NIS Verified'`.
- **Recommended Correction**:
  - Default `rating` to `0.00`, `review_count` to `0`, `verified_badge` to `null`.

---

### SEC-012: Unforced Row Level Security on Application Tables
- **Severity**: **Low**
- **Affected Database Object**: All 28 `public` tables
- **Confirmation Status**: **Confirmed Live Database Weakness**
- **Evidence**:
  - Zero tables have `FORCE ROW LEVEL SECURITY` enabled.
- **Recommended Correction**:
  - Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to all sensitive tables.

---

### SEC-013: Storage Buckets Uninitialized in Development Environment
- **Severity**: **Informational**
- **Affected Database Object**: `storage.buckets` / `storage.objects`
- **Confirmation Status**: **Confirmed Live Database Observation**
- **Evidence**:
  - `GET /storage/v1/bucket` returned `[]`.
- **Recommended Correction**:
  - Provision private `cv-documents` bucket with signed URL access model.

---

### SEC-014: Whole-Row PII Exposure in Receipt & Booking Lookup RPCs
- **Severity**: **Critical**
- **Affected Database Object**: `get_listing_subscription_by_order(text)`, `get_venue_booking_voucher(text)`
- **Confirmation Status**: **Confirmed Repository Defect in PR #173 (`20261107233000`)**
- **Evidence**:
  - Functions defined with `RETURNS SETOF public.*` executing `SELECT *`.
  - If an anonymous user guesses or extracts an order ID or booking reference, they receive full customer names, telephone numbers, emails, amount paid, and payment identifiers.
- **Recommended Correction**:
  - Redesign RPCs to return minimal projections (e.g., masked customer name, masked phone, slot details, status) with zero raw PII.
  - Require secondary verification credentials (phone/email verification or secure token hash) for unauthenticated guest voucher queries.

---

### SEC-015: Tables with Row Level Security Enabled but Zero Policies
- **Severity**: **Medium**
- **Affected Database Object**: `public.pickup_game_participants`, `public.pickup_game_rsvp_rate_limits`
- **Confirmation Status**: **Confirmed Live Database Observation**
- **Evidence**:
  - Both tables have `rowsecurity = true` but 0 policies in `pg_policies`.
  - While default PostgREST access is denied (safe failure mode), absence of explicit policies creates administrative ambiguity and Supabase Security Advisor warnings.
- **Recommended Correction**:
  - Add explicit denial policies for direct anonymous operations.
  - Define explicit host participant viewing policies and lock down rate-limit table as internal-only.

---

### SEC-016: Host & Moderation Functions Granted Public Execution Privileges
- **Severity**: **High**
- **Affected Database Object**: `cancel_pickup_game_as_host`, `complete_pickup_game_as_host`, `reopen_pickup_game_as_host`, `update_pickup_game_capacity`, `update_pickup_game_details`, `reschedule_pickup_game`, `get_host_pickup_games`, `approve_pickup_game_whatsapp_invite`, `admin_moderate_pickup_game`
- **Confirmation Status**: **Confirmed Live Database Weakness**
- **Evidence**:
  - All 18 `SECURITY DEFINER` functions grant EXECUTE to `anon` and `authenticated`.
  - Even though the function bodies check `auth.uid()`, granting EXECUTE to `anon` increases attack surface and generates Supabase Security Advisor warnings.
- **Recommended Correction**:
  - `REVOKE EXECUTE ... FROM anon, PUBLIC` on all host management and moderation procedures.
