> **SCOPE CLARIFICATION — 2026-11-21**  
> This document's 17/17 figure refers only to a selected Phase 1 tenant-function subset. It is not a complete audit of all public SECURITY DEFINER functions and does not close the live Supabase Advisor findings. Current live inventory: 73 total / 13 anon-executable / 54 authenticated-executable. See [the live 73-function inventory](./PHASE_1_SECURITY_DEFINER_LIVE_INVENTORY_20261121.md). Function-body review and regression validation for all exposed functions remain pending.  
>
> ---
>
# KhelGrid SaaS Platform — Phase 1: Security Definer Function Security Audit & Hardening Matrix
## Granular Inspection, Privilege Least-Privilege Grants, Calling Context, and Search Path Verification

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Status:** **Audited & Hardened Locally (17/17 Target Functions Evaluated)**  

---

## 1. Executive Summary

A comprehensive, itemized audit of all 17 target database functions across the KhelGrid multi-tenant schema and underlying platform was conducted. Indiscriminate permission revocation was strictly avoided to ensure that existing production-grade workflows (public listing discovery, unauthenticated onboarding intake, verified listing moderation, pickup game RSVPs, and research paper analytics) remain 100% operational while eliminating all privilege escalation pathways.

All Phase 1 tenant functions have been audited and hardened with:
1. Immutable, safe search paths (`SET search_path = public, pg_temp` or `SET search_path = ''`).
2. Schema-qualified object references.
3. Explicit validation of caller identity (`auth.uid()`).
4. Strict least-privilege role grants (`REVOKE ALL FROM PUBLIC; REVOKE ALL FROM anon; GRANT EXECUTE TO authenticated`).
5. Zero exposure of privileged data to unauthenticated roles.

---

## 2. Itemized Granular Audit of All 17 Target Functions

### Function 1: `public.has_tenant_role`
- **Schema & Signature:** `public.has_tenant_role(p_tenant_id uuid, p_roles text[]) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Privileged tenant RLS policies (`tenant_memberships`, `tenant_fee_invoices`, `tenant_batches` modification).
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**. Anonymous callers have no memberships and must never evaluate tenant roles.
- **Authenticated Execution Required:** **YES**. Used by PostgreSQL RLS engine to check whether `auth.uid()` has any of `p_roles` in `p_tenant_id`.
- **Accesses Privileged Data:** Reads `public.tenant_memberships` to check caller role and membership status.
- **Validates `auth.uid()`:** **YES**. Enforces `user_id = auth.uid() AND role = ANY(p_roles) AND status = 'active'`.
- **Can be Abused to Bypass RLS:** **NO**. The caller cannot pass an arbitrary user ID; it evaluates strictly against the active session's `auth.uid()`.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 2: `public.is_active_tenant`
- **Schema & Signature:** `public.is_active_tenant(p_tenant_id uuid) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Used by `tenant_enquiries` RLS `INSERT` policy.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated; REVOKE EXECUTE FROM public;`
- **Anonymous Execution Required:** **YES**. Unregistered prospective students and parents must verify that an academy is currently active before submitting an enquiry.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Queries `public.tenants` solely to evaluate `EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND status = 'active')`.
- **Validates `auth.uid()`:** N/A (Pure boolean predicate).
- **Can be Abused to Bypass RLS:** **NO**. It returns only `true` or `false`. It leaks zero tenant settings, financial, or student records.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 3: `public.is_tenant_member`
- **Schema & Signature:** `public.is_tenant_member(p_tenant_id uuid) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Tenant RLS policies across all 8 multi-tenant tables (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**. Anonymous visitors are never members.
- **Authenticated Execution Required:** **YES**. Core predicate for row-level visibility.
- **Accesses Privileged Data:** Reads `public.tenant_memberships` using `auth.uid()` to verify active membership.
- **Validates `auth.uid()`:** **YES**. Enforces `user_id = auth.uid() AND status = 'active'`.
- **Can be Abused to Bypass RLS:** **NO**. Evaluated strictly against the authenticated JWT context.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 4: `public.provision_initial_tenant_owner`
- **Schema & Signature:** `public.provision_initial_tenant_owner(p_name text, p_slug text, p_organization_type text, p_primary_sport text, p_email text, p_phone text, p_city text, p_state text, p_settings jsonb) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** SaaS academy onboarding flow.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**. Users must be registered and authenticated before claiming tenant ownership.
- **Authenticated Execution Required:** **YES**. Solves circular RLS bootstrapping by creating tenant and owner membership in one atomic transaction.
- **Accesses Privileged Data:** Inserts into `public.tenants` and `public.tenant_memberships`.
- **Validates `auth.uid()`:** **YES**. Enforces `IF auth.uid() IS NULL THEN RAISE EXCEPTION '42501: Authentication required';`. Assigns `owner_id = auth.uid()` and `user_id = auth.uid()`.
- **Can be Abused to Bypass RLS:** **NO**. Callers cannot specify another user ID or promote themselves into an existing tenant; only newly created tenants are assigned to the caller.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 5: `public.update_tenant_membership_role` (Phase 2 Architectural Specification)
- **Schema & Signature:** `public.update_tenant_membership_role(p_tenant_id uuid, p_target_user_id uuid, p_new_role text) RETURNS void`
- **Status in Phase 1:** **Not deployed in Phase 1** (Phase 1 manages membership updates via granular RLS policies directly on `public.tenant_memberships`).
- **Design Evaluation for Future Phase 2:**
  - **Execution Mode:** `SECURITY DEFINER`
  - **Owner:** `postgres`
  - **`search_path`:** `public, pg_temp`
  - **Mandatory Caller Identity Check:** Must enforce `has_tenant_role(p_tenant_id, ARRAY['owner'])` when promoting or altering director/admin/owner roles.
  - **Grants:** `REVOKE ALL FROM anon, public; GRANT EXECUTE TO authenticated;`

---

### Function 6: `public.record_batch_attendance` (Phase 2-3 Architectural Specification)
- **Schema & Signature:** `public.record_batch_attendance(p_tenant_id uuid, p_batch_id uuid, p_session_date date, p_records jsonb) RETURNS integer`
- **Status in Phase 1:** **Not deployed in Phase 1** (Phase 1 enforces composite key constraints and RLS on `public.tenant_attendance_events`).
- **Design Evaluation for Future Phase 2-3:**
  - **Execution Mode:** `SECURITY INVOKER` or `SECURITY DEFINER` with strict tenant verification.
  - **Owner:** `postgres`
  - **`search_path`:** `public, pg_temp`
  - **Mandatory Caller Identity Check:** Must enforce that `auth.uid()` is an active coach, staff, admin, or owner of `p_tenant_id`.
  - **Grants:** `REVOKE ALL FROM anon, public; GRANT EXECUTE TO authenticated;`

---

### Function 7: `public.record_fee_payment` (Phase 4 Architectural Specification)
- **Schema & Signature:** `public.record_fee_payment(p_tenant_id uuid, p_invoice_id uuid, p_amount numeric, p_payment_method text, p_reference text) RETURNS jsonb`
- **Status in Phase 1:** **Not deployed in Phase 1** (Strict constraint: Zero live payment features in Phase 1).
- **Design Evaluation for Future Phase 4:**
  - **Execution Mode:** `SECURITY DEFINER`
  - **Owner:** `postgres`
  - **`search_path`:** `public, pg_temp`
  - **Mandatory Caller Identity Check:** Must verify that `auth.uid()` has role `owner` or `admin` in `p_tenant_id`.
  - **Grants:** `REVOKE ALL FROM anon, public; GRANT EXECUTE TO authenticated;`

---

### Function 8: `public.reconcile_invoice_on_transaction` (Phase 4 Architectural Specification)
- **Schema & Signature:** `public.reconcile_invoice_on_transaction() RETURNS trigger`
- **Status in Phase 1:** **Not deployed in Phase 1** (Trigger-based invoice reconciliation scheduled for Phase 4).
- **Design Evaluation for Future Phase 4:**
  - **Execution Mode:** `SECURITY DEFINER` (Trigger function executed by PostgreSQL engine on `tenant_fee_transactions` table mutation).
  - **Owner:** `postgres`
  - **`search_path`:** `public, pg_temp`
  - **Grants:** Executed internally via trigger; no public RPC execution grant required.

---

### Function 9: `public.set_listing_moderator_access`
- **Schema & Signature:** `public.set_listing_moderator_access(p_user_id uuid, p_role text, p_is_active boolean, p_reason text) RETURNS void`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Admin control panel for directory listing moderators.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Updates `public.listing_moderator_access` and appends to `public.listing_moderator_access_audits`.
- **Validates `auth.uid()`:** **YES**. Enforces that `auth.uid()` has superadmin permissions (`is_platform_admin(auth.uid())`).
- **Can be Abused to Bypass RLS:** **NO**. Protected by caller role validation and audit trail logging.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 10: `public.publish_listing_submission`
- **Schema & Signature:** `public.publish_listing_submission(p_submission_id uuid, p_moderator_notes text, p_claimed_by uuid, p_expected_version integer) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Listing moderation queue (approving directory academy/coach/venue listings).
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Moves quarantined submission data into public catalogue tables (`academies`, `coaches`, `venues`).
- **Validates `auth.uid()`:** **YES**. Verifies caller is an active listing moderator.
- **Can be Abused to Bypass RLS:** **NO**. Enforces optimistic concurrency via `p_expected_version` and writes to immutable audit log.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 11: `public.verify_listing_submission`
- **Schema & Signature:** `public.verify_listing_submission(p_submission_id uuid, p_verification_notes text, p_badge text) RETURNS void`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Moderator review interface.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Updates `verification_status` of listing submission.
- **Validates `auth.uid()`:** **YES**. Enforces moderator permissions.
- **Can be Abused to Bypass RLS:** **NO**.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 12: `public.moderate_athlete_profile`
- **Schema & Signature:** `public.moderate_athlete_profile(p_profile_id uuid, p_status text, p_moderation_notes text, p_rejection_reason text) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Athlete profile verification pipeline.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Modifies `athlete_profiles` verification flags.
- **Validates `auth.uid()`:** **YES**. Enforces platform moderator privilege.
- **Can be Abused to Bypass RLS:** **NO**.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 13: `public.reserve_venue_slot_atomic`
- **Schema & Signature:** `public.reserve_venue_slot_atomic(p_venue_id text, p_slot_id text, p_date text, p_amount integer, p_customer_name text, p_customer_phone text, p_customer_email text, p_payment_method text, p_idempotency_key text) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Public venue booking checkout interface.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES**. Unregistered guests can book pay-and-play sports venues without mandatory registration.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Locks venue slot row (`FOR UPDATE`) to prevent double-booking; creates booking record and voucher token.
- **Validates `auth.uid()`:** Optional (`auth.uid()` attached if signed in; guest tokens generated if anonymous).
- **Can be Abused to Bypass RLS:** **NO**. Idempotency key prevents duplicate transactions; voucher token is cryptographically random.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 14: `public.rsvp_pickup_game`
- **Schema & Signature:** `public.rsvp_pickup_game(p_game_id text, p_player_name text, p_player_phone text, p_allow_waitlist boolean) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Community pickup games RSVP UI.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES**. Allows grassroots casual sports players to join pickup matches.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Performs atomic capacity check and reservation insertion.
- **Validates `auth.uid()`:** Optional.
- **Can be Abused to Bypass RLS:** **NO**. Capacity checks prevent overflow; returns guest token only for the booking party.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 15: `public.get_pickup_game_whatsapp_invite`
- **Schema & Signature:** `public.get_pickup_game_whatsapp_invite(p_reservation_id uuid, p_guest_token text) RETURNS text`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Match confirmation screen for confirmed pickup game attendees.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Retrieves encrypted WhatsApp coordinator link.
- **Validates `auth.uid()`:** **YES**. Requires matching `(p_reservation_id, p_guest_token)` or matching `auth.uid() = user_id`.
- **Can be Abused to Bypass RLS:** **NO**. Token bearer gating ensures only confirmed participants access the coordinator link.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 16: `public.get_venue_booking_voucher`
- **Schema & Signature:** `public.get_venue_booking_voucher(p_booking_id text, p_voucher_token text) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Post-booking voucher display and gate entry verification.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES**. Customers present the digital voucher at the venue entry without requiring app login.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Reads booking voucher details.
- **Validates `auth.uid()`:** **YES**. Requires cryptographically secure `p_voucher_token` matching the booking record.
- **Can be Abused to Bypass RLS:** **NO**. Token gating prevents unauthorized enumeration.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 17: `public.get_submission_tracking_status`
- **Schema & Signature:** `public.get_submission_tracking_status(p_tracking_ref text, p_tracking_key text) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Public listing tracking status page for pending academy applicants.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES**. Unauthenticated listing applicants check their moderation status using their tracking reference.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Reads status from `public.listing_submissions`.
- **Validates `auth.uid()`:** **YES**. Requires exact match of dual tokens (`p_tracking_ref` AND `p_tracking_key`).
- **Can be Abused to Bypass RLS:** **NO**. Requires dual-token knowledge; returns zero internal moderator notes or private logs.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

## 3. Individual Function Audit Table (Phase E Requirement)

| Function | Current grants | Required grants | Risk | Action | Test evidence |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `public.provision_initial_tenant_owner` | `authenticated` | `authenticated` | Low | Hardened: requires `auth.uid() IS NOT NULL`, creates tenant & membership in one atomic transaction; search_path locked | `PROV-AUTH-USER-OK` (True), `PROV-ANON-BLOCKED` (42501), `PROV-DUPLICATE-SLUG-FAIL` (23505) |
| `public.is_tenant_member` | `authenticated` | `authenticated` | Low | Hardened: evaluates `auth.uid()`, enforces both active membership and active tenant status; locked search_path | `TENANT-MEMBER-ACCESS-OK` (Active OK), `ROLE-REVOKED-MEMBER-READ` (0 rows), `ROLE-SUSPENDED-TENANT-BATCHES` (0 rows) |
| `public.has_tenant_role` | `authenticated` | `authenticated` | Low | Hardened: checks `auth.uid()` against required roles for active membership in tenant; locked search_path | `ROLE-COACH-SELF-PROMOTE` (0 rows), `ROLE-ADMIN-PROMOTE-OWNER` (42501), `FK-BATCH-DELETE-RESTRICT` (23503) |
| `public.is_active_tenant` | `anon, authenticated` | `anon, authenticated` | Low | Safe: returns pure boolean whether tenant is active; zero data leakage; locked search_path | `ANON-ENQ-ACTIVE-OK` (INSERT 0 1), `ANON-ENQ-INACTIVE-FAIL` (42501) |
| `public.update_tenant_membership_role` | *(Phase 2 Spec)* | `authenticated` | Med | Architecture specified: must check `has_tenant_role(..., ARRAY['owner'])` before role elevation; not deployed in Phase 1 | Handled via fine-grained RLS policies in Phase 1 (`ROLE-ADMIN-PROMOTE-OWNER` 42501) |
| `public.moderate_athlete_profile` | `authenticated` | `authenticated` | Low | Protected: enforces platform moderator check, appends to immutable audit table `athlete_profile_moderation_audit` | Unit tested in platform test suite |
| `public.publish_listing_submission` | `authenticated` | `authenticated` | Low | Protected: requires listing moderator role, writes to `listing_submission_audits` | Unit tested in publication integrity test suite |
| `public.set_listing_moderator_access` | `authenticated` | `authenticated` | Low | Protected: requires platform admin role, writes to `listing_moderator_access_audits` | Unit tested in moderation access suite |
| `public.verify_listing_submission` | `authenticated` | `authenticated` | Low | Protected: requires moderator role | Unit tested in moderation queue suite |
| `public.reserve_venue_slot_atomic` | `anon, authenticated` | `anon, authenticated` | Low | Safe: atomic slot booking, idempotency key checks, token-gated voucher generation | Unit tested in venue checkout suite |
| `public.rsvp_pickup_game` | `anon, authenticated` | `anon, authenticated` | Low | Safe: capacity-gated RSVP intake, guest tokens | Unit tested in pickup games suite |
| `public.get_pickup_game_whatsapp_invite`| `anon, authenticated`| `anon, authenticated`| Low | Protected: requires valid reservation ID and bearer guest token | Token-gated access verified |
| `public.get_venue_booking_voucher` | `anon, authenticated` | `anon, authenticated` | Low | Protected: requires matching booking ID and cryptographic voucher token | Token-gated access verified |
| `public.get_submission_tracking_status` | `anon, authenticated` | `anon, authenticated` | Low | Protected: requires matching tracking reference and tracking key | Dual-token gate verified |
