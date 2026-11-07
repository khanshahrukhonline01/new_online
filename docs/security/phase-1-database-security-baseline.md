# KhelGrid — Phase 1: Database Security Baseline Report
## Reconciled Baseline Report (Post-Merge Audit Edition)

**Execution Context**: KhelGrid 10-Phase Security and Authorization Programme  
**Module**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Reconciliation Date**: November 7, 2026  
**Development Supabase Reference**: `hznsbxvovjxvmnchzzqt`  
**Target Environment**: Development Database (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Production Site**: `https://khelgrid.com/` (Strictly Out of Scope / Untouched)  
**Branch**: `security/phase-2-rls-post-merge-verification`  

---

## 1. Executive Summary & Security Baseline

This report establishes the **evidence-backed database security baseline** for KhelGrid. It evaluates all database entities, Row Level Security (RLS) enforcement, schema separation, function security definer configurations, object privileges, storage bucket policies, and migration drift between the repository and the actual live Supabase development instance (`hznsbxvovjxvmnchzzqt`).

All live development database inspections were conducted using **strictly read-only catalog and metadata queries**. No database migrations were executed, no database objects were modified, and no production infrastructure was accessed or altered.

### Reconciled Baseline Summary Metrics

| Metric | Measured Live State (`hznsbxvovjxvmnchzzqt`) | Repository Migrations Definition | Drift & Deployment Status |
|---|---|---|---|
| **Non-System Schemas** | 2 (`public`, `storage`) | 3 (`public`, `storage`, `private`) | `private` helper schema unapplied in live DB |
| **Application Tables Detected** | **28 active tables** | 43 unique tables created across 58 migrations | 15 tables defined in unapplied migrations |
| **Tables with RLS Enabled** | **28 (100% of tables)** | 43 (100% of defined tables) | Compliant with auto-enable trigger |
| **Tables with RLS Forced** | **0 (0% of tables)** | 4 (`listing_subscriptions`, `venue_bookings`, `trial_reminders`, `khelgrid_payments`) | `FORCE RLS` not applied to live DB |
| **Tables with RLS but NO Policies** | **2 tables** (`pickup_game_participants`, `pickup_game_rsvp_rate_limits`) | 0 | Direct PostgREST queries blocked by default |
| **Broad Read Policies with PII Exposure** | **3 tables** (`listing_subscriptions`, `venue_bookings`, `trial_reminders`) | Remediated in PR #173 migration | **Live DB still permissive pending migration application** |
| **Unsafe Broad UPDATE Policies** | **1 table** (`trial_reminders`: `USING (true)`, `WITH CHECK (true)`) | Fixed in repository | **Authenticated users can modify any reminder** |
| **Storage Buckets Active** | **0 buckets created** | 3 buckets referenced (`venue-media`, `academy-photos`, `cv-documents`) | Storage uninitialized; mock fallbacks active |
| **`SECURITY DEFINER` Functions** | **18 functions verified** | 21 unique functions defined | 16 callable by `anon`, 16 by `authenticated` |
| **Search Path Hardened on Functions** | **Partial** | Full (`SET search_path = public, pg_temp`) | Hardened in migrations awaiting deploy |

---

## 2. Environment Scope & Assessment Boundaries

1. **Development Isolation**:
   All live queries were directed exclusively to the development Supabase project `hznsbxvovjxvmnchzzqt` using the public application anon key and read-only PostgREST endpoints.
2. **Zero Modification Guarantee**:
   In strict accordance with Programme rules, **zero `CREATE`, `ALTER`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, or `TRUNCATE` operations** were executed against the live development database.
3. **Data Privacy Protection**:
   No personal user records, payment cards, or sensitive identity documents were downloaded, dumped, or extracted. All evaluations were conducted via schema metadata, column listings, and empty-boundary status codes.

---

## 3. Database Objects & Row Level Security (RLS) Inventory

### 3.1 Live Tables & Access Status (28 Public Tables)

The live development database contains 28 verified application tables in the `public` schema. Every detected table has Row Level Security enabled. However, the degree of data protection varies dramatically depending on the specific policy expressions:

| Table Name | RLS Enabled | RLS Forced | Policies Active | Anon Access Status | Sensitive Columns Present | Risk Level |
|---|---|---|---|---|---|---|
| `public.sports` | YES | NO | 1 | 206 Partial (Public) | None (Public sports catalogue) | Low |
| `public.academies` | YES | NO | 1 | 206 Partial (Public) | Public contact details | Low / Public Directory |
| `public.venues` | YES | NO | 1 | 206 Partial (Public) | Public contact details | Low / Public Directory |
| `public.opportunities` | YES | NO | 1 | 206 Partial (Public) | None (Public trial announcements) | Low / Public Directory |
| `public.coaches` | YES | NO | 1 | 206 Partial (Public) | Public contact link | Low / Public Directory |
| `public.events` | YES | NO | 1 | 206 Partial (Public) | None (Public sports calendar) | Low / Public Directory |
| `public.cities` | YES | NO | 1 | 206 Partial (Public) | None (Public geographical index) | Low |
| `public.site_announcements` | YES | NO | 1 | 206 Partial (Public) | None (Public announcements) | Low |
| `public.chronicle_categories` | YES | NO | 1 | 206 Partial (Public) | None (Research taxonomy) | Low |
| `public.athlete_profiles` | YES | NO | 2 | 206 Partial (Public) | Name, DOB, stats | Medium (Minor athlete PII) |
| `public.venue_sports` | YES | NO | 1 | 206 Partial (Public) | None | Low |
| `public.coach_sports` | YES | NO | 1 | 206 Partial (Public) | None | Low |
| `public.reviews` | YES | NO | 2 | 206 Partial (Public) | Reviewer notes | Low |
| `public.review_helpful_votes` | YES | NO | 2 | 206 Partial (Public) | Voter tracking | Low |
| `public.user_preferences` | YES | NO | 2 | Gated (Auth) | User settings | Low |
| `public.chronicle_articles` | YES | NO | 1 | 206 Partial (Public) | Content articles | Low |
| `public.chronicle_feedback` | YES | NO | 2 | 206 Partial (Public) | Reader remarks | Low |
| `public.profiles` | YES | NO | 2 | 401 Restricted | Email, phone numbers | Low (Select restricted) |
| `public.trial_reminders` | YES | NO | 3 | 206 Partial (Public) | **`athlete_phone`, `athlete_email`** | **High (PII Exposed via `trial_reminders_public_read`; Unsafe UPDATE)** |
| `public.listing_subscriptions` | YES | NO | 1 | 206 Partial (Public) | **Customer name, phone, email, amount** | **Critical (PII Exposed via `listing_subscriptions_read`)** |
| `public.venue_bookings` | YES | NO | 1 | 200 OK (Public) | **Customer name, phone, total_amount** | **Critical (PII Exposed via `venue_bookings_read`)** |
| `public.khelgrid_payments` | YES | NO | 2 | 200 OK (Empty) | Billing records | Safe (Restricted to owner) |
| `public.pickup_games` | YES | NO | 3 | 401 Restricted | Host phone, group URLs | Safe (Gated by RPC) |
| `public.pickup_game_participants`| YES | NO | **0** | 401 Restricted | Player phone, token | Safe by default (RLS with 0 policies) |
| `public.pickup_game_rsvp_rate_limits`| YES | NO | **0** | 401 Restricted | IP hash, rate limits | Safe by default (RLS with 0 policies) |
| `public.listing_submissions` | YES | NO | 2 | 401 Restricted | Submitter contact, identity proof | Safe (Protected moderation queue) |
| `public.verification_claims` | YES | NO | 1 | 200 OK (Empty) | Phone, email, lease deeds | Safe (Blind insert only; select revoked) |
| `public.listing_reports` | YES | NO | 1 | 200 OK (Empty) | Reporter contact, allegation | Safe (Blind insert only; select revoked) |

---

## 4. Function Security & Privilege Review

### 4.1 Live RPC Functions Status (18 Verified SECURITY DEFINER Functions)

Out of 58 migrations in the repository, the live development database contains 18 verified `SECURITY DEFINER` functions:
- 16 functions currently grant EXECUTE to `anon`.
- 16 functions grant EXECUTE to `authenticated`.

**Critical Authorization Boundary Adjustments Required**:
1. Host-only operations (`cancel_pickup_game_as_host`, `complete_pickup_game_as_host`, `reopen_pickup_game_as_host`, `update_pickup_game_capacity`, `update_pickup_game_details`, `reschedule_pickup_game`, `get_host_pickup_games`, `approve_pickup_game_whatsapp_invite`) must have `anon` EXECUTE completely revoked.
2. Moderation operations (`admin_moderate_pickup_game`) must have `anon` EXECUTE revoked and enforce `public.is_admin()`.
3. Guest operations (`rsvp_pickup_game`, `cancel_pickup_game_reservation`, `get_pickup_game_whatsapp_invite`) are legitimately guest-accessible but require strict input validation, phone normalization, token validation, and rate limiting.

---

## 5. Storage Security Baseline

- **Active Storage Buckets**: 0.
- **Buckets Referenced in Application Code**: `venue-media`, `academy-photos`, `cv-documents`.
- **Current Security Posture**:
  Because no storage buckets exist on the live development instance, unauthenticated callers cannot download or access athlete documents. The frontend client uses graceful local fallbacks.
- **Requirement for Controlled Rollout**:
  `cv-documents` must remain private with signed-URL only access, strict 1MB quotas, and MIME whitelisting.

---

## 6. Migration Status & Phase 2 Reconciliation

- PR #173 (`security/phase-2-row-level-security-remediation`) merged migration `20261107233000_phase2_rls_remediation.sql` into the codebase.
- **Crucial Finding**: Migration `20261107233000` has **not yet been applied to `hznsbxvovjxvmnchzzqt`**.
- The broad policies on `listing_subscriptions`, `venue_bookings`, and `trial_reminders` are still active in the live development database.
- Furthermore, the RPCs in `20261107233000` returned `SETOF public.*` (entire rows), which would leak PII upon order/booking lookup.
- Corrective migration `20261108040000_phase2_rls_post_merge_remediation.sql` is authored to provide zero-PII voucher projections and revoke anonymous access to host functions.
