# KhelGrid — Phase 1: Database Object & Access Control Inventory

**Document**: Database Object & Access Control Inventory  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Inspection Date**: November 7, 2026  
**Development Instance**: `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  

---

## 1. Schemas Inventory

| Schema | Owner | Access Grants (`anon`) | Access Grants (`authenticated`) | PostgREST Exposed | Notes |
|---|---|---|---|---|---|
| `public` | `postgres` | `USAGE` | `USAGE` | YES | Standard application schema |
| `storage` | `supabase_admin`| `USAGE` | `USAGE` | YES | Supabase Storage API |
| `auth` | `supabase_admin` | None | None | Gated via GoTrue | User credentials & sessions |
| `private` | `postgres` (repo only) | `REVOKE ALL` | `USAGE` | NO | Proposed helper schema (unapplied on live DB) |
| `extensions`| `postgres` | `USAGE` | `USAGE` | NO | Built-in PostgreSQL extensions |

---

## 2. Table Inventory (Live Development Database vs. Repository)

### 2.1 Live Verified Tables (`hznsbxvovjxvmnchzzqt`)

| Table Name | Schema | Owner | RLS Enabled | RLS Forced | Live Row Count | Sensitive Data Present | Access Boundary |
|---|---|---|---|---|---|---|---|
| `sports` | `public` | `postgres` | YES | NO | 41 | None | Public Read |
| `academies` | `public` | `postgres` | YES | NO | 282 | Public contact details | Public Read |
| `venues` | `public` | `postgres` | YES | NO | 27 | Public contact details | Public Read |
| `opportunities` | `public` | `postgres` | YES | NO | 91 | None | Public Read |
| `coaches` | `public` | `postgres` | YES | NO | 5 | Public contact details | Public Read |
| `events` | `public` | `postgres` | YES | NO | 4 | None | Public Read |
| `cities` | `public` | `postgres` | YES | NO | 23 | None | Public Read |
| `site_announcements`| `public` | `postgres` | YES | NO | 2 | None | Public Read |
| `chronicle_categories`| `public` | `postgres` | YES | NO | 6 | None | Public Read |
| `athlete_profiles` | `public` | `postgres` | YES | NO | 3 | Full name, DOB, physical stats | Public Read (Published only) |
| `trial_reminders` | `public` | `postgres` | YES | NO | 3 | **Phone numbers, email addresses** | **Public Read (SEC-003)** |
| `listing_subscriptions`| `public` | `postgres` | YES | NO | 399 | **Customer names, phones, emails, amounts** | **Public Read (SEC-001)** |
| `venue_bookings` | `public` | `postgres` | YES | NO | > 0 | **Customer names, phones, amounts** | **Public Read (SEC-002)** |
| `khelgrid_payments` | `public` | `postgres` | YES | NO | 0 (anon) | Customer names, phones, emails, payment IDs | Authenticated Owner Read |
| `pickup_games` | `public` | `postgres` | YES | NO | 0 (anon) | Host phone, group URLs | Direct Select Revoked (401) |
| `pickup_game_participants`| `public` | `postgres`| YES | NO | 0 (anon) | Player phone, cancellation token | Direct Select Revoked (401) |
| `listing_submissions` | `public` | `postgres` | YES | NO | 0 (anon) | Submitter contact, identity proof | Direct Select Revoked (401) |
| `verification_claims` | `public` | `postgres` | YES | NO | 0 (anon) | Contact phone, email, ground lease proofs | Blind Insert Only; Select Revoked |
| `listing_reports` | `public` | `postgres` | YES | NO | 0 (anon) | Reporter email, phone, allegation | Blind Insert Only; Select Revoked |

### 2.2 Tables Defined in Repository Migrations (Awaiting Controlled Deployment)

The following tables are defined in migrations between `20261106150000` and `20261107181000` and are **not yet deployed** on `hznsbxvovjxvmnchzzqt`:

| Migration File | Proposed Table Name | Intended Purpose | Security Scrutiny Notes |
|---|---|---|---|
| `20261106150000` | `public.community_live_matches` | Scorekeeper match updates | `UPDATE USING (true)` must be fixed before deploy (SEC-007) |
| `20261106150000` | `public.host_payout_accounts` | Host bank and UPI accounts | `SELECT USING (true)` must be fixed before deploy (SEC-006) |
| `20261106150000` | `public.host_settlement_payouts` | Platform settlement audits | `SELECT USING (true)` must be fixed before deploy (SEC-006) |
| `20261107000000` | `public.sports_books` | Open-source sports literature | Public catalogue read |
| `20261107120000` | `public.profiles` | User identity & role management| `SELECT USING (true)` & metadata role check must be fixed (SEC-004, SEC-005) |
| `20261107180000` | `public.tournaments_and_events` | Grassroots tournament schedules| Public catalogue read |
| `20261107180000` | `public.venue_slot_bookings` | Slot reservations (unique constraint)| `SELECT USING (true)` must be scoped to omit PII (SEC-008) |
| `20261107180000` | `public.trial_applications` | Sports CV trial submissions | `SELECT USING (true)` must be fixed to applicant-only (SEC-008) |
| `20261107180000` | `public.academy_enquiries` | Batch admission enquiries | `SELECT USING (true)` must be fixed to applicant-only (SEC-008) |
| `20261107180000` | `public.user_bookmarks` | Cross-device saved items | Properly scoped: `auth.uid() = user_id` |
| `20261107180000` | `public.coach_inquiries` | Direct coaching inquiries | Insert public; select restricted to `auth.uid() = user_id` |
| `20261107180000` | `public.live_matches` | Ball-by-ball scoreboards | Public read; write restricted |
| `20261107180000` | `public.live_score_events` | Commentary timeline | Public read; write restricted |

---

## 3. Views & Materialized Views Inventory

No custom database views or materialized views are currently deployed on the development database `hznsbxvovjxvmnchzzqt`.

### Planned Views for Phase 2 Remediation:
1. `public.active_listing_badges` (`security_invoker = true`):
   - Exposes: `listing_type`, `listing_id`, `is_active`, `expires_at`.
   - Omits: `customer_name`, `customer_phone`, `customer_email`, `amount`, `payment_id`, `order_id`.
   - Purpose: Allows public display of listing verification tags without disclosing customer billing PII.
2. `public.venue_slot_availability` (`security_invoker = true`):
   - Exposes: `venue_id`, `slot_date`, `slot_time`, `court_or_turf_number`, `status`.
   - Omits: `customer_name`, `customer_phone`, `customer_email`, `total_amount`, `paid_amount`.
   - Purpose: Enables real-time court availability chips without exposing player identities or contact details.

---

## 4. Stored Functions & Procedures Inventory

### 4.1 Verified Live Stored Functions

| Function Signature | Owner | Security Mode | `search_path` | Granted Roles | Purpose / Security Classification |
|---|---|---|---|---|---|
| `public.rsvp_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Atomically claims pickup match spot; validates phone |
| `public.cancel_pickup_game_reservation(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Cancels spot using verified reservation UUID & token |
| `public.get_pickup_game_whatsapp_invite(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Gates WhatsApp join URL behind valid RSVP token |
| `public.create_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Creates match listing; sets creator as host |
| `public.update_pickup_game_details(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Updates match rules; verifies host identity |
| `public.reschedule_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Modifies venue/time; verifies host identity |
| `public.update_pickup_game_capacity(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Adjusts roster limit; verifies host identity |
| `public.cancel_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Cancels match; verifies host identity |
| `public.reopen_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Reopens match; verifies host identity |
| `public.complete_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Closes match; verifies host identity |
| `public.get_host_pickup_games()` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Lists hosted games for current user session |
| `public.approve_pickup_game_whatsapp_invite(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Host approval for private WhatsApp group invite |
| `public.admin_moderate_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Enforces moderator claim check before moderation |
| `public.is_pickup_game_admin()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Helper checking admin allowlist / role |
| `public.is_listing_moderator()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Helper checking listing moderator claim |
| `public.get_listing_submissions()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Returns pending community listings to moderators |
| `public.review_listing_submission(...)` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Moderates listing submission (approve/reject) |
| `public.record_payment_transaction(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Records payment transaction (Defaults to completed) |
| `public.create_venue_slot_booking(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Creates venue slot booking (Defaults to paid) |
| `public.record_listing_subscription(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Records paid listing subscription |

---

## 5. Triggers Inventory

| Trigger Name | Associated Table | Timing | Event | Trigger Function | Security Notes |
|---|---|---|---|---|---|
| `set_updated_at` | `academies` | BEFORE | UPDATE | `public.set_updated_at()` | Standard timestamp updater |
| `set_updated_at` | `venues` | BEFORE | UPDATE | `public.set_updated_at()` | Standard timestamp updater |
| `set_updated_at` | `opportunities` | BEFORE | UPDATE | `public.set_updated_at()` | Standard timestamp updater |
| `set_updated_at` | `coaches` | BEFORE | UPDATE | `public.set_updated_at()` | Standard timestamp updater |
| `set_listing_submission_updated_at` | `listing_submissions` | BEFORE | UPDATE | `public.set_listing_submission_updated_at()` | Standard timestamp updater |
| `enforce_listing_moderation_transition`| `listing_submissions` | BEFORE | UPDATE | `public.enforce_listing_moderation_transition()` | Validates state machine: pending -> approved/rejected |
| `on_auth_user_created` (repo) | `auth.users` | AFTER | INSERT | `public.handle_new_user()` | **Vulnerable to metadata admin escalation (SEC-004)** |

---

## 6. Storage Inventory

| Bucket Name | Status on Live DB | Referenced in App | Intended Privacy | Policy Requirements |
|---|---|---|---|---|
| `venue-media` | Uninitialized (404) | YES | Public | Public read; authenticated host upload |
| `academy-photos` | Uninitialized (404) | YES | Public | Public read; authenticated academy upload |
| `cv-documents` | Uninitialized (404) | YES | **Private** | Owner-only read/write (`auth.uid() = folder`) |
