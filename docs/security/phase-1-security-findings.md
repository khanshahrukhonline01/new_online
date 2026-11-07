# KhelGrid — Phase 1: Security Findings Register

**Document**: Security Findings Register  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Application Security Auditor  
**Date**: November 7, 2026  
**Environment**: Development Database (`hznsbxvovjxvmnchzzqt`)  

---

## 1. Findings Summary by Severity

| Severity | Count | Confirmed Live Database | Repository-Only (Latent Migration Risk) |
|---|---|---|---|
| **Critical** | 5 | 2 | 3 |
| **High** | 4 | 1 | 3 |
| **Medium** | 2 | 1 | 1 |
| **Low** | 1 | 1 | 0 |
| **Informational** | 1 | 1 | 0 |
| **Total** | **13** | **6** | **7** |

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
- **Actual Impact**: Complete public disclosure of all commercial sports academy and venue billing customers, phone numbers, email addresses, order IDs, and subscription amounts.
- **Exploitability**: Trivially exploitable via a single HTTP GET request with the client-side public anon key.
- **Recommended Correction**:
  - Revoke broad `USING (true)` policy on `listing_subscriptions`.
  - Restrict SELECT to authenticated record owners (`auth.uid() = user_id`) and administrators (`is_admin()`).
  - Create an unprivileged view (e.g., `public.active_listing_badges`) exposing only `listing_type`, `listing_id`, `is_active`, and `expires_at` without customer PII or transaction values.
- **Regression Test Needed**: `test_listing_subscriptions_anonymous_read_denied`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-002: Customer PII & Booking Financials Exposed to Anonymous Users
- **Severity**: **Critical**
- **Affected Database Object**: `public.venue_bookings`
- **Confirmation Status**: **Confirmed Live Database Vulnerability**
- **Evidence**:
  - Live probe against `https://hznsbxvovjxvmnchzzqt.supabase.co/rest/v1/venue_bookings` returned HTTP 200 with customer booking records to the unauthenticated `anon` caller.
  - Exposed columns include: `customer_name`, `customer_phone`, `venue_name`, `slot_date`, `slot_time`, `total_amount`, `paid_amount`.
  - Defined in migration `20261106120000_create_payments_and_bookings.sql`:
    ```sql
    CREATE POLICY "venue_bookings_read" ON public.venue_bookings
      FOR SELECT TO anon, authenticated USING (true);
    ```
- **Actual Impact**: Any internet user can scrape all booked court slots, customer full names, telephone numbers, and financial payments.
- **Exploitability**: Trivially exploitable via standard PostgREST API queries.
- **Recommended Correction**:
  - Restrict `venue_bookings` SELECT access to the authenticated user who created the booking (`booked_by_user_id = auth.uid()`).
  - Provide a dedicated, unprivileged view or RPC for slot availability checking that exposes strictly `venue_id`, `slot_date`, `slot_time`, and `status` without PII.
- **Regression Test Needed**: `test_venue_bookings_pii_not_accessible_to_anon`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-003: Overly Permissive Read Exposes Subscriber Phone Numbers and Emails on Selection Trial Alerts
- **Severity**: **High**
- **Affected Database Object**: `public.trial_reminders`
- **Confirmation Status**: **Confirmed Live Database Vulnerability**
- **Evidence**:
  - Live probe against `https://hznsbxvovjxvmnchzzqt.supabase.co/rest/v1/trial_reminders` returned HTTP 206 with active rows to `anon`.
  - Exposed columns include: `athlete_phone`, `athlete_email`, `trial_title`, `trial_slug`.
  - Defined in `supabase/setup_trial_reminders.sql` and `supabase/seeds/07_seed_trial_reminders.sql`:
    ```sql
    CREATE POLICY "trial_reminders_public_read" ON public.trial_reminders
      FOR SELECT TO anon, authenticated USING (true);
    ```
- **Actual Impact**: Exposes contact numbers and emails of aspiring young athletes who subscribed to selection trial reminders.
- **Exploitability**: Trivially exploitable via public PostgREST API.
- **Recommended Correction**:
  - Restrict SELECT access on `trial_reminders` to `auth.uid() = user_id`.
  - Revoke SELECT privileges from `anon` on columns `athlete_phone` and `athlete_email`.
- **Regression Test Needed**: `test_trial_reminders_contact_details_not_public`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-004: Unauthenticated Privilege Escalation to Administrator Role via Registration Metadata
- **Severity**: **Critical**
- **Affected Database Object**: `public.handle_new_user()` trigger & `public.profiles`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261107120000_auth_and_user_profiles_hardening.sql`, lines 53-56:
    ```sql
    user_role := coalesce(new.raw_user_meta_data->>'role', 'athlete');
    if user_role not in ('athlete', 'host', 'coach', 'scout', 'academy', 'admin') then
      user_role := 'athlete';
    end if;
    ```
  - The trigger executes as `SECURITY DEFINER` on `auth.users` insert, bypassing table RLS.
  - Because `'admin'` is explicitly whitelisted in the user-supplied metadata check, a caller signing up with `{ options: { data: { role: 'admin' } } }` will have their role set to `'admin'` in `public.profiles`.
  - Function `public.is_admin()` checks `role = 'admin'` from `public.profiles`, thereby granting full administrator rights.
- **Actual Impact**: Complete platform compromise; unauthorized users could grant themselves administrator privileges at registration.
- **Exploitability**: High, if migration `20261107120000` is deployed without modification.
- **Recommended Correction**:
  - Remove `'admin'` from the allowed roles in `handle_new_user()`.
  - Restrict initial user roles strictly to `('athlete', 'host', 'coach', 'scout', 'academy')`.
  - Require administrative role promotion to occur strictly via out-of-band administrative action or service-role management.
- **Regression Test Needed**: `test_registration_cannot_self_assign_admin_role`.
- **Target Phase**: Phase 2 / Phase 3 (Auth and Role Hardening).

---

### SEC-005: Sensitive User Emails and Phone Numbers Exposed to `anon` via Broad Profiles SELECT Policy
- **Severity**: **Critical**
- **Affected Database Object**: `public.profiles`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261107120000_auth_and_user_profiles_hardening.sql`, lines 150-155:
    ```sql
    CREATE POLICY "profiles_select_public" ON public.profiles
      FOR SELECT TO anon, authenticated USING (true);
    ```
  - Table `public.profiles` stores private personal information including `email text` and `phone text`.
- **Actual Impact**: If applied, any anonymous client could query `GET /rest/v1/profiles` and extract the entire user directory, including private telephone numbers and email addresses.
- **Exploitability**: High upon deployment.
- **Recommended Correction**:
  - Split `public.profiles` policy:
    - Authenticated users can view their own profile (`auth.uid() = id`).
    - Public profiles view (`public.public_profiles`) exposing only `display_name`, `avatar_url`, `city`, `preferred_sports`, `bio`, and `is_verified` (omitting `email` and `phone`).
- **Regression Test Needed**: `test_profiles_email_and_phone_not_readable_by_anon`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-006: Bank Account Numbers and IFSC Codes Exposed with Unrestricted UPDATE Rights
- **Severity**: **Critical**
- **Affected Database Object**: `public.host_payout_accounts` & `public.host_settlement_payouts`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261106150000_create_live_matches_and_host_payouts.sql`, lines 102-123:
    ```sql
    CREATE POLICY "Public read own host payout account"
      ON public.host_payout_accounts FOR SELECT USING (true);

    CREATE POLICY "Public insert/update own host payout account"
      ON public.host_payout_accounts FOR ALL USING (true) WITH CHECK (true);
    ```
  - Table `public.host_payout_accounts` contains sensitive financial routing details: `account_number`, `ifsc_code`, `upi_id`, and `beneficiary_name`.
- **Actual Impact**: Any unauthenticated client could read all host bank account details and execute `UPDATE` queries altering host bank payout destinations to an attacker's account.
- **Exploitability**: High upon deployment.
- **Recommended Correction**:
  - Replace `host_id text` with `user_id uuid REFERENCES auth.users(id)`.
  - Restrict SELECT, INSERT, UPDATE strictly to `auth.uid() = user_id`.
  - Disallow direct client table mutation; require verified host session and OTP/PIN verification for bank destination updates.
- **Regression Test Needed**: `test_host_payout_accounts_cannot_be_read_or_modified_by_unauthorized_users`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-007: Unrestricted Public UPDATE Policy on Live Match Scoreboards
- **Severity**: **High**
- **Affected Database Object**: `public.community_live_matches`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261106150000_create_live_matches_and_host_payouts.sql`, lines 94-99:
    ```sql
    CREATE POLICY "Allow public match updates"
      ON public.community_live_matches FOR UPDATE USING (true) WITH CHECK (true);
    ```
- **Actual Impact**: Anyone on the public internet could overwrite live sports scores, alter team names, or corrupt real-time tournament broadcasts.
- **Exploitability**: High upon deployment.
- **Recommended Correction**:
  - Restrict match updates to the verified host/scorer (`created_by_user_id = auth.uid()`) or authorized platform administrators (`is_admin()`).
- **Regression Test Needed**: `test_live_matches_cannot_be_updated_by_unauthorized_callers`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-008: Candidate Sports CVs, Benchmarks, and Statements Exposed to Anonymous Users
- **Severity**: **High**
- **Affected Database Object**: `public.trial_applications` & `public.academy_enquiries`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `supabase/migrations/20261107180000_pillar1_unified_relational_schema.sql`, lines 375-388:
    ```sql
    CREATE POLICY "Users can view their own trial applications" ON public.trial_applications
      FOR SELECT USING (true);

    CREATE POLICY "Users can view their own academy enquiries" ON public.academy_enquiries
      FOR SELECT USING (true);
    ```
  - Tables store applicant telephone numbers, emails, personal statements, and physical combine percentiles.
- **Actual Impact**: A competitor or scout could download all candidate applications and contact numbers across all selection trials and academies.
- **Exploitability**: High upon deployment.
- **Recommended Correction**:
  - Correct `USING (true)` to `USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)`.
  - For academy directors, create a distinct policy checking academy ownership.
- **Regression Test Needed**: `test_trial_applications_isolated_to_applicant`.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-009: Missing `search_path` on `SECURITY DEFINER` Functions
- **Severity**: **High**
- **Affected Database Object**: `public.is_admin()`, `public.has_role(text)`
- **Confirmation Status**: **Repository-Only (Latent Migration Risk)**
- **Evidence**:
  - In `20261107120000_auth_and_user_profiles_hardening.sql`, lines 110-137:
    Functions declared as `SECURITY DEFINER` without setting explicit `search_path`.
- **Actual Impact**: Vulnerable to search path hijacking in multi-schema PostgreSQL instances.
- **Exploitability**: Medium.
- **Recommended Correction**:
  - Explicitly specify `SET search_path = public, pg_temp` on all `SECURITY DEFINER` functions.
- **Regression Test Needed**: `test_security_definer_functions_have_fixed_search_path`.
- **Target Phase**: Phase 3 (Function and RPC Hardening).

---

### SEC-010: Dangerous Financial & Intake Status Defaults
- **Severity**: **Medium**
- **Affected Database Object**: `khelgrid_payments.status`, `venue_bookings.payment_status`, `verification_claims.status`
- **Confirmation Status**: **Confirmed Live Database & Repository Risk**
- **Evidence**:
  - `khelgrid_payments.status` defaults to `'completed'`.
  - `venue_bookings.payment_status` defaults to `'paid'`.
  - `verification_claims` grants insert on `status` without enforcing `'pending_review'`.
- **Actual Impact**: Unverified payment transactions can be inserted as completed; claims could be inserted as pre-verified.
- **Exploitability**: Medium.
- **Recommended Correction**:
  - Change default payment status to `'pending'`.
  - Enforce `status = 'pending_review'` in RLS insert `WITH CHECK` expression on `verification_claims`.
- **Regression Test Needed**: `test_payment_status_defaults_to_pending`.
- **Target Phase**: Phase 4 (Business Logic and Data Integrity Hardening).

---

### SEC-011: Fabricated / Misleading Business Baseline Defaults
- **Severity**: **Medium**
- **Affected Database Object**: `public.coaches` & `public.tournaments_and_events`
- **Confirmation Status**: **Repository-Only Risk**
- **Evidence**:
  - In `20261107180000_pillar1_unified_relational_schema.sql`:
    `rating numeric(3, 2) NOT NULL DEFAULT 4.90`, `review_count integer NOT NULL DEFAULT 48`, `verified_badge text NOT NULL DEFAULT 'NIS Verified'`.
- **Actual Impact**: Any newly added coach automatically appears as verified with 48 fabricated reviews and a 4.90 rating before any vetting occurs.
- **Exploitability**: Informational / Business Integrity.
- **Recommended Correction**:
  - Default `rating` to `0.00`, `review_count` to `0`, `is_verified` to `false`, and `verified_badge` to `null`.
- **Target Phase**: Phase 4 (Business Logic and Data Integrity Hardening).

---

### SEC-012: Unforced Row Level Security on Application Tables
- **Severity**: **Low**
- **Affected Database Object**: All `public` tables
- **Confirmation Status**: **Confirmed Live Database Weakness**
- **Evidence**:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is applied, but `FORCE ROW LEVEL SECURITY` is not set on sensitive tables.
- **Actual Impact**: Table owners and roles with `BYPASSRLS` inadvertently bypass RLS during maintenance or integration scripts.
- **Exploitability**: Low.
- **Recommended Correction**:
  - Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to all tables handling PII and payments.
- **Target Phase**: Phase 2 (Row Level Security Remediation).

---

### SEC-013: Storage Buckets Uninitialized in Development Environment
- **Severity**: **Informational**
- **Affected Database Object**: `storage.buckets` / `storage.objects`
- **Confirmation Status**: **Confirmed Live Database Observation**
- **Evidence**:
  - `GET /storage/v1/bucket` returned `[]`.
- **Actual Impact**: Document uploads fallback to local mock handlers; sensitive files are not exposed because the buckets do not exist yet.
- **Recommended Correction**:
  - In Phase 5, prepare storage bucket provisioning with private configuration for `cv-documents`.
- **Target Phase**: Phase 5 (Storage Security Architecture).
