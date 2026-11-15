# KhelGrid Security Programme — Phase 5.2 Fresh Baseline Report

> **Document ID:** SEC-P52-BASE-001  
> **Status:** Verified against Development Database (`hznsbxvovjxvmnchzzqt`)  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Branch:** `security/phase-5-2-critical-remediation-and-db-verification`  
> **Base Commit:** `57f8523a440606a9a991c18e4b5c11c87accc74b` (Merge PR #178 on `main`)  
> **Inspection Date:** November 8, 2026  

---

## 1. Executive Summary

This fresh baseline report establishes the factual security posture of the KhelGrid development database (`hznsbxvovjxvmnchzzqt`) and repository at the commencement of Phase 5.2.

Direct live database probing confirms that **none of the migrations from Phase 2 through Phase 8 (migrations `20261108040000` through `20261108090000`) have been applied to the live development database**.

As a result:
1. Broad SELECT policies remain active on `listing_subscriptions`, `venue_bookings`, and `trial_reminders`, exposing customer names, phone numbers, and payment details to anonymous users.
2. The table `athlete_profiles` remains exposed to anonymous INSERT and broad SELECT.
3. The tables `pickup_game_participants` and `pickup_game_rsvp_rate_limits` have RLS enabled with zero policies.
4. Sixteen public `SECURITY DEFINER` functions remain directly executable by anonymous users via PostgREST.
5. In the merged PR #178 code, `verify_payment_transaction` accepted `p_gateway_signature` but did not validate it against any official gateway cryptographic HMAC specification.
6. Leaked-password protection is not enabled by default in Supabase Auth settings.

---

## 2. Direct Probing Evidence on Development Database (`hznsbxvovjxvmnchzzqt`)

### 2.1 Table Accessibility & Data Exposure Matrix (Anonymous Role)

| Table Name | Live Schema Cache Status | Data Returned to Anonymous Role | Security Finding |
| :--- | :--- | :--- | :--- |
| `public.venues` | Exists | Public venue listings | **Intentional Public Catalogue** |
| `public.cities` | Exists | Public city directory | **Intentional Public Catalogue** |
| `public.academies` | Exists | Public academy listings | **Intentional Public Catalogue** |
| `public.coaches` | Exists | Public coach listings | **Intentional Public Catalogue** |
| `public.events` | Exists | Public tournament events | **Intentional Public Catalogue** |
| `public.listing_subscriptions` | Exists | **Exposes customer phone, email, amount, payment ID** | 🚨 **CRITICAL: Unrestricted Private Data Policy** |
| `public.venue_bookings` | Exists | **Exposes customer phone, name, paid amount, ref** | 🚨 **CRITICAL: Unrestricted Private Data Policy** |
| `public.trial_reminders` | Exists | **Exposes athlete phone, email, notification type** | 🚨 **CRITICAL: Unrestricted Private Data Policy** |
| `public.athlete_profiles` | Exists | **Exposes full athlete records; public INSERT active** | 🚨 **HIGH: Unrestricted Public Access & Mutation** |
| `public.profiles` | Exists | Denied (42501) | RLS active; Owner-only policy needed |
| `public.pickup_game_participants` | Exists | Denied (42501) / Zero policies | ⚠️ **ZERO POLICY TABLE** |
| `public.pickup_game_rsvp_rate_limits` | Exists | Denied (42501) / Zero policies | ⚠️ **ZERO POLICY TABLE** |
| `public.user_roles` | **Missing (PGRST205)** | N/A | Phase 3 migration not applied to live DB |
| `public.role_permissions` | **Missing (PGRST205)** | N/A | Phase 3 migration not applied to live DB |
| `public.user_consents` | **Missing (PGRST205)** | N/A | Phase 6 migration not applied to live DB |
| `public.guardian_consents` | **Missing (PGRST205)** | N/A | Phase 6 migration not applied to live DB |
| `public.api_rate_limits` | **Missing (PGRST205)** | N/A | Phase 5 migration not applied to live DB |
| `public.listing_moderation_audit_logs` | **Missing (PGRST205)** | N/A | Phase 8 migration not applied to live DB |

### 2.2 Public `SECURITY DEFINER` Function Audit (Anonymous Invocation)

All 16 functions identified by the Supabase Security Advisor were tested on `hznsbxvovjxvmnchzzqt`:

| Function Name | Live DB Status | Anon Invocation Test Result | Privilege Finding |
| :--- | :--- | :--- | :--- |
| `admin_moderate_pickup_game` | Exists | Executable by `anon` (Internal logic checks admin) | 🚨 **EXECUTE not revoked from anon** |
| `create_pickup_game` | Exists | Executable by `anon` (Internal logic checks auth) | 🚨 **EXECUTE not revoked from anon** |
| `rsvp_pickup_game` | Exists | Executable by `anon` (Public guest RSVP) | **Intentional Guest Operation (Requires Rate Limit)** |
| `cancel_pickup_game_reservation` | Exists | Executable by `anon` (Token-based cancel) | **Intentional Guest Operation (Requires Token Check)** |
| `get_host_pickup_games` | Exists | Executable by `anon` (Returns UNAUTHORIZED) | 🚨 **EXECUTE not revoked from anon** |
| `approve_pickup_game_whatsapp_invite`| Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `cancel_pickup_game_as_host` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `complete_pickup_game_as_host` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `get_pickup_game_whatsapp_invite` | Exists | Executable by `anon` (Token check) | **Intentional Guest Operation** |
| `reopen_pickup_game_as_host` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `reschedule_pickup_game` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `update_pickup_game_capacity` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `update_pickup_game_details` | Exists | Executable by `anon` (Internal check) | 🚨 **EXECUTE not revoked from anon** |
| `create_venue_slot_booking` | Missing | PGRST202 | Phase 7 migration not applied to live DB |
| `record_listing_subscription` | Missing | PGRST202 | Phase 4/5 migration not applied to live DB |
| `record_payment_transaction` | Missing | PGRST202 | Phase 4/5 migration not applied to live DB |

---

## 3. Discrepancy Reconciliation: Code vs Live Database

1. **Merged Codebase vs Live DB Divergence**:
   The GitHub repository `main` branch includes PR #173 through #178. However, because automated CLI deployment was blocked by credential boundaries, the development Supabase project has remained at migration version `20261105173325` / `20261106130000`.
2. **Defects in Merged Code (PR #178)**:
   - `verify_payment_transaction` took `p_gateway_signature` but did not execute cryptographic verification.
   - `athlete_profiles_public_insert` policy was not dropped.
   - `guardian_consents` defaulted `verified_at` to `now()` without verification evidence.
   - `user_consents` had a broad `FOR ALL` policy permitting deletion/overwrite of statutory records.
   - `create_venue_slot_booking` accepted client-supplied prices without venue cross-referencing.

---

## 4. Phase 5.2 Remediation Mandate

Before deploying any migration to `hznsbxvovjxvmnchzzqt`:
1. Author migration `20261108100000_phase5_2_critical_remediation_and_closure.sql` addressing all code defects.
2. Build an isolated PostgreSQL test suite validating all migrations in strict dependency order.
3. Update the master consolidated SQL package.
4. Prepare deployment runbooks and read-back verification scripts.
