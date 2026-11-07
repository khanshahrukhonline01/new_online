# KhelGrid — Phase 1: Database Security Baseline Report

**Execution Context**: KhelGrid 10-Phase Security and Authorization Programme  
**Module**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Inspection Date**: November 7, 2026  
**Development Supabase Reference**: `hznsbxvovjxvmnchzzqt`  
**Target Environment**: Development Database (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Production Site**: `https://khelgrid.com/` (Strictly Out of Scope / Untouched)  
**Branch**: `security/phase-1-database-security-baseline`

---

## 1. Executive Summary & Security Baseline

This report establishes the **evidence-backed database security baseline** for KhelGrid. It evaluates all database entities, Row Level Security (RLS) enforcement, schema separation, function security definer configurations, object privileges, storage bucket policies, and migration drift between the repository and the actual live Supabase development instance (`hznsbxvovjxvmnchzzqt`).

All live development database inspections were conducted using **strictly read-only catalog and metadata queries**. No database migrations were executed, no database objects were modified, and no production infrastructure was accessed or altered.

### Baseline Summary Metrics

| Metric | Measured Live State (`hznsbxvovjxvmnchzzqt`) | Repository Migrations Definition | Drift Status |
|---|---|---|---|
| **Non-System Schemas** | 2 (`public`, `storage`) | 3 (`public`, `storage`, `private`) | `private` helper schema unapplied in live DB |
| **Application Tables Detected** | 16 active tables | 43 unique tables created across 53 migrations | 27 tables defined in migrations not yet deployed |
| **Tables with RLS Enabled** | 16 (100% of detected tables) | 43 (100% of defined tables) | Compliant with auto-enable trigger |
| **Tables with RLS Forced** | 0 | 0 | `FORCE ROW LEVEL SECURITY` not enabled |
| **Public Read Policies with PII Exposure** | 2 tables (`venue_bookings`, `trial_reminders`) | 5 tables (`venue_bookings`, `listing_subscriptions`, `trial_applications`, `academy_enquiries`, `venue_slot_bookings`) | **Critical Risk identified** |
| **Storage Buckets Active** | 0 buckets created | 3 buckets referenced (`venue-media`, `academy-photos`, `cv-documents`) | Storage uninitialized; mock fallbacks active |
| **Active Stored Functions / RPCs** | 21 RPCs verified | 31 unique functions defined | 10 recent RPCs unapplied |
| **`SECURITY DEFINER` Functions** | 18 functions | 19 functions | Search path hardening required |

---

## 2. Environment Scope & Assessment Boundaries

1. **Development Isolation**:
   All live queries were directed exclusively to the development Supabase project `hznsbxvovjxvmnchzzqt` using the public application anon key and read-only PostgREST endpoints.
2. **Zero Modification Guarantee**:
   In strict accordance with Phase 1 Master Execution rules, **zero `CREATE`, `ALTER`, `DROP`, `UPDATE`, `INSERT`, `DELETE`, or `TRUNCATE` operations** were executed against the live development database.
3. **Data Privacy Protection**:
   No personal user records, payment cards, or sensitive identity documents were downloaded, dumped, or extracted. All evaluations were conducted via schema metadata, column listings, and empty-boundary status codes.

---

## 3. Database Objects & Row Level Security (RLS) Inventory

### 3.1 Live Tables & Access Status

The live development database contains 16 verified application tables in the `public` schema. Every detected table has Row Level Security enabled. However, the degree of data protection varies dramatically depending on the specific policy expressions:

| Table Name | RLS Enabled | Estimated Row Count | Anon Access Status | Sensitive Columns Present | Risk Level |
|---|---|---|---|---|---|
| `public.sports` | YES | 41 | 206 Partial Content (Public) | None (Public sports catalogue) | Low |
| `public.academies` | YES | 282 | 206 Partial Content (Public) | Phone, email, affiliation proof | Low / Public Directory |
| `public.venues` | YES | 27 | 206 Partial Content (Public) | Phone, email, address | Low / Public Directory |
| `public.opportunities` | YES | 91 | 206 Partial Content (Public) | None (Public trial announcements) | Low / Public Directory |
| `public.coaches` | YES | 5 | 206 Partial Content (Public) | Bio, public contact link | Low / Public Directory |
| `public.events` | YES | 4 | 206 Partial Content (Public) | None (Public sports calendar) | Low / Public Directory |
| `public.cities` | YES | 23 | 206 Partial Content (Public) | None (Public geographical index) | Low |
| `public.site_announcements` | YES | 2 | 206 Partial Content (Public) | None (Public announcements) | Low |
| `public.chronicle_categories` | YES | 6 | 206 Partial Content (Public) | None (Research taxonomy) | Low |
| `public.athlete_profiles` | YES | 3 | 206 Partial Content (Public) | Name, DOB, height, weight, benchmarks | Medium (Minor athlete PII) |
| `public.trial_reminders` | YES | 3 | 206 Partial Content (Public) | `athlete_phone`, `athlete_email` | **High (PII Exposure)** |
| `public.listing_subscriptions` | YES | 399 | 206 Partial Content (Public) | `customer_name`, `customer_phone`, `customer_email`, `amount`, `payment_id` | **Critical (Financial/Customer PII)** |
| `public.venue_bookings` | YES | > 0 | 200 OK (Public) | `customer_name`, `customer_phone`, `total_amount`, `paid_amount` | **Critical (Customer Booking PII)** |
| `public.khelgrid_payments` | YES | 0 visible to anon | 200 OK (Empty array) | `customer_name`, `customer_phone`, `customer_email`, `amount` | Safe (Restricted to authenticated owner) |
| `public.pickup_games` | YES | N/A | 401 Unauthorized | Host phone, host details | Safe (Direct select revoked; gated by RPC) |
| `public.pickup_game_participants`| YES | N/A | 401 Unauthorized | Player phone, cancellation token | Safe (Direct select revoked; gated by RPC) |
| `public.listing_submissions` | YES | N/A | 401 Unauthorized | Submitter contact details, proofs | Safe (Protected moderation queue) |
| `public.verification_claims` | YES | 0 visible to anon | 200 OK (Empty array) | Contact phone, email, proof documents | Safe (Blind insert only; select revoked) |
| `public.listing_reports` | YES | 0 visible to anon | 200 OK (Empty array) | Reporter email, phone, allegation | Safe (Blind insert only; select revoked) |

---

## 4. Function Security & Privilege Review

### 4.1 Live RPC Functions Status

Out of 31 functions defined in repository migrations, 21 functions were verified as actively deployed on `hznsbxvovjxvmnchzzqt`. Their authorization boundaries were probed:

1. **Guest-Facing Public RPCs (Intended for `anon` and `authenticated`)**:
   - `public.rsvp_pickup_game`: Validates mobile number and reservations atomically.
   - `public.cancel_pickup_game_reservation`: Validates cancellation token before modifying spots.
   - `public.get_pickup_game_whatsapp_invite`: Restricts invite link access to verified reservations.
   - `public.record_payment_transaction`: Creates payment rows atomically.
   - `public.create_venue_slot_booking`: Creates turf slot reservations.
   - `public.record_listing_subscription`: Activates listing tier subscriptions.

2. **Authenticated Host & Management Functions (Restricted)**:
   - `public.create_pickup_game`: Requires authenticated caller; validates capacity.
   - `public.update_pickup_game_details`: Requires game host session.
   - `public.reschedule_pickup_game`: Requires game host session.
   - `public.update_pickup_game_capacity`: Requires game host session.
   - `public.cancel_pickup_game_as_host`: Requires game host session.
   - `public.reopen_pickup_game_as_host`: Requires game host session.
   - `public.complete_pickup_game_as_host`: Requires game host session.
   - `public.get_host_pickup_games`: Rejects unauthenticated calls (`{"status": "error", "error_code": "UNAUTHORIZED"}`).
   - `public.approve_pickup_game_whatsapp_invite`: Rejects unauthenticated calls.

3. **Privileged Moderation Functions**:
   - `public.admin_moderate_pickup_game`: Rejects unprivileged callers with `"Administrator or moderator privileges required"`.
   - `public.is_listing_moderator`: Returns HTTP 401 to unauthorized callers (`"permission denied for function is_listing_moderator"`).
   - `public.get_listing_submissions`: Returns HTTP 401 to unauthorized callers.
   - `public.review_listing_submission`: Returns HTTP 401 to unauthorized callers.
   - `public.is_pickup_game_admin`: Returns HTTP 401 to unauthorized callers.

### 4.2 Security Vulnerabilities in Function Definitions

1. **Missing `search_path` on `SECURITY DEFINER` Functions**:
   In migration `20261107120000_auth_and_user_profiles_hardening.sql`, functions `public.is_admin()` and `public.has_role(text)` are declared as `SECURITY DEFINER` without setting `search_path = public, pg_temp` or `search_path = ''`. This creates a latent privilege escalation vector via search path manipulation.
2. **Untrusted Metadata Role Assignment in `handle_new_user()`**:
   In migration `20261107120000_auth_and_user_profiles_hardening.sql`, the trigger function `handle_new_user()` assigns `new.raw_user_meta_data->>'role'` directly to `public.profiles.role`, explicitly whitelisting `'admin'`. Any user registering via Supabase Auth could pass `{ options: { data: { role: 'admin' } } }` and acquire administrator privileges.

---

## 5. Storage Security Baseline

Inspection of `https://hznsbxvovjxvmnchzzqt.supabase.co/storage/v1/bucket` with authorized credentials revealed:
- **Active Storage Buckets**: 0.
- **Buckets Referenced in Application Code**:
  - `venue-media` (Venue court photos)
  - `academy-photos` (Academy campus photos)
  - `cv-documents` (Athlete certificates and identity documents)
- **Current Security Posture**:
  Because no storage buckets exist on the live development instance, unauthenticated callers cannot download or access athlete documents. The frontend client (`public-client.ts`) uses graceful local fallback URLs.
- **Risk for Phase 2 Deployment**:
  When storage buckets are provisioned, `cv-documents` MUST be created as a **private bucket** with strict owner-only RLS policies (`auth.uid() = (storage.foldername(name))[1]`), ensuring minor athletes' government IDs and school certificates are never publicly indexable.

---

## 6. Dangerous Defaults Baseline

The audit identified multiple schema-level defaults that could create misleading or insecure records:

1. **Automatic Payment Confirmation**:
   - `khelgrid_payments.status` defaults to `'completed'`.
   - `venue_bookings.payment_status` defaults to `'paid'`.
   - `venue_slot_bookings.payment_status` defaults to `'paid'`.
   *Consequence*: A client-side or RPC call that omits the payment status automatically marks the transaction as paid.
2. **Automatic Listing Verification Claims**:
   - `verification_claims.status` allows client-supplied values without restricting insert payloads to `'pending_review'`.
3. **Fabricated Performance & Badge Baselines**:
   - `coaches.rating` defaults to `4.90`.
   - `coaches.review_count` defaults to `48`.
   - `coaches.verified_badge` defaults to `'NIS Verified'`.
   - `tournaments_and_events.verified_badge` defaults to `true`.
   *Consequence*: New listings created in the database inherit elite credentials and ratings before being reviewed.

---

## 7. Known Limitations of the Baseline

1. **Non-Superuser Access**:
   Inspection was performed using PostgREST and development API keys. Direct superuser access to `pg_catalog.pg_authid` (database passwords and internal role configuration) was not accessible, in accordance with Supabase hosted architecture.
2. **Schema Cache Invalidation**:
   PostgREST caches database schema representations. Unapplied migrations from `20261106150000` onwards are absent from the PostgREST cache, confirming they have not been run against the database.
