# KhelGrid — Phase 1: Database Object & Access Control Inventory
## Reconciled Baseline Inventory (Post-Merge Audit Edition)

**Document**: Database Object & Access Control Inventory  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Reconciliation Date**: November 7, 2026  
**Development Instance**: `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Production Site**: `https://khelgrid.com/` (Strictly Out of Scope / Untouched)  

---

## 1. Schemas Inventory

| Schema | Owner | Access Grants (`anon`) | Access Grants (`authenticated`) | PostgREST Exposed | Notes |
|---|---|---|---|---|---|
| `public` | `postgres` | `USAGE` | `USAGE` | YES | Standard application schema |
| `storage` | `supabase_admin`| `USAGE` | `USAGE` | YES | Supabase Storage API |
| `auth` | `supabase_admin` | None | None | Gated via GoTrue | User credentials & sessions |
| `private` | `postgres` (repo only) | `REVOKE ALL` | `USAGE` | NO | Proposed helper schema (unapplied on live DB) |
| `extensions`| `postgres` | `USAGE` | `USAGE` | NO | Built-in PostgreSQL extensions (`pgcrypto`, etc.) |

---

## 2. Table Inventory (Live Development Database vs. Repository)

### 2.1 Live Verified Tables (`hznsbxvovjxvmnchzzqt`) — 28 Public Tables Audited

Read-only catalog inspection on November 7, 2026, confirmed **exactly 28 public application tables** in `hznsbxvovjxvmnchzzqt`:
- **100% (28/28) have Row Level Security (RLS) enabled**.
- **0% (0/28) have FORCE ROW LEVEL SECURITY enabled**.
- **2 tables have RLS enabled with NO policies** (`pickup_game_participants`, `pickup_game_rsvp_rate_limits`), causing direct PostgREST operations to be denied by default.

| # | Table Name | Schema | Owner | RLS Enabled | RLS Forced | Policies Count | Sensitive Data Present | Access Boundary & Active Live Policy Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | `sports` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`sports_read` USING (true)) |
| 2 | `academies` | `public` | `postgres` | YES | **NO** | 1 | Public contact details | Public Read (`academies_read` USING (true)) |
| 3 | `venues` | `public` | `postgres` | YES | **NO** | 1 | Public contact details | Public Read (`venues_read` USING (true)) |
| 4 | `opportunities` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`opportunities_read` USING (true)) |
| 5 | `coaches` | `public` | `postgres` | YES | **NO** | 1 | Public contact link | Public Read (`coaches_read` USING (true)) |
| 6 | `events` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`events_read` USING (true)) |
| 7 | `cities` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`cities_read` USING (true)) |
| 8 | `site_announcements` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`site_announcements_read` USING (true)) |
| 9 | `chronicle_categories`| `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`chronicle_categories_read` USING (true)) |
| 10 | `athlete_profiles` | `public` | `postgres` | YES | **NO** | 2 | DOB, physical stats | Public Read for published; owner write |
| 11 | `venue_sports` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`venue_sports_read` USING (true)) |
| 12 | `coach_sports` | `public` | `postgres` | YES | **NO** | 1 | None | Public Read (`coach_sports_read` USING (true)) |
| 13 | `reviews` | `public` | `postgres` | YES | **NO** | 2 | User review text | Public Read; Authenticated Insert |
| 14 | `review_helpful_votes` | `public` | `postgres` | YES | **NO** | 2 | Voter IP / User ID | Public Read; Authenticated Insert |
| 15 | `user_preferences` | `public` | `postgres` | YES | **NO** | 2 | User settings | Authenticated Owner Read / Write |
| 16 | `chronicle_articles` | `public` | `postgres` | YES | **NO** | 1 | Editorial articles | Public Read |
| 17 | `chronicle_feedback` | `public` | `postgres` | YES | **NO** | 2 | Reader comments | Public Read; Authenticated Insert |
| 18 | `profiles` | `public` | `postgres` | YES | **NO** | 2 | **Email, phone numbers** | Restricted Select; Owner Write |
| 19 | `trial_reminders` | `public` | `postgres` | YES | **NO** | 3 | **Phone numbers, emails** | **BROAD SELECT: `trial_reminders_public_read` (USING true)**<br>**UNSAFE UPDATE: `trial_reminders_authenticated_update` (USING true, WITH CHECK true)** |
| 20 | `listing_subscriptions`| `public` | `postgres` | YES | **NO** | 1 | **Customer names, phones, emails, amounts, orders** | **BROAD SELECT: `listing_subscriptions_read` (USING true)** |
| 21 | `venue_bookings` | `public` | `postgres` | YES | **NO** | 1 | **Customer names, phones, booking fees, references** | **BROAD SELECT: `venue_bookings_read` (USING true)** |
| 22 | `khelgrid_payments` | `public` | `postgres` | YES | **NO** | 2 | Customer billing, transaction IDs | Authenticated Owner Read |
| 23 | `pickup_games` | `public` | `postgres` | YES | **NO** | 3 | Host phone, group URLs | Direct Select Revoked; Host Manage; Gated by RPC |
| 24 | `pickup_game_participants`| `public` | `postgres`| YES | **NO** | **0** | **Player phone, cancellation tokens** | **RLS enabled with ZERO policies** (Direct PostgREST blocked) |
| 25 | `pickup_game_rsvp_rate_limits`| `public` | `postgres`| YES | **NO** | **0** | **IP hash, window timestamps** | **RLS enabled with ZERO policies** (Internal security tracker) |
| 26 | `listing_submissions` | `public` | `postgres` | YES | **NO** | 2 | Contact phone, identity proofs | Blind Insert Only; Moderator Gated |
| 27 | `verification_claims` | `public` | `postgres` | YES | **NO** | 1 | Phone, email, lease deeds | Blind Insert Only; Select Revoked |
| 28 | `listing_reports` | `public` | `postgres` | YES | **NO** | 1 | Reporter contact, allegations | Blind Insert Only; Select Revoked |

---

### 2.2 Tables Defined in Repository Migrations (Awaiting Controlled Deployment)

The following tables are defined in migrations between `20261106150000` and `20261108030000` and are **merged in repository code but NOT yet applied** to `hznsbxvovjxvmnchzzqt`:

| Migration File | Proposed Table Name | Intended Purpose | Security Scrutiny Notes |
|---|---|---|---|
| `20261106150000` | `public.community_live_matches` | Scorekeeper match updates | Direct update restricted to authenticated scorers |
| `20261106150000` | `public.host_payout_accounts` | Host bank and UPI accounts | Owner-only read/write (`auth.uid() = host_id`) |
| `20261106150000` | `public.host_settlement_payouts` | Platform settlement audits | Owner-only read/write (`auth.uid() = host_id`) |
| `20261107000000` | `public.sports_books` | Open-source sports literature | Public catalogue read |
| `20261107180000` | `public.tournaments_and_events` | Grassroots tournament schedules| Public catalogue read |
| `20261107180000` | `public.venue_slot_bookings` | Slot reservations (unique constraint)| Unique constraint enforced; slot lookup RPC |
| `20261107180000` | `public.trial_applications` | Sports CV trial submissions | Applicant owner only (`auth.uid() = user_id`) |
| `20261107180000` | `public.academy_enquiries` | Batch admission enquiries | Enquirer owner only (`auth.uid() = user_id`) |
| `20261107180000` | `public.user_bookmarks` | Cross-device saved items | Owner-only (`auth.uid() = user_id`) |
| `20261107180000` | `public.coach_inquiries` | Direct coaching inquiries | Insert public; select restricted to owner |
| `20261107180000` | `public.live_matches` | Ball-by-ball scoreboards | Public read; write restricted |
| `20261107180000` | `public.live_score_events` | Commentary timeline | Public read; write restricted |
| `20261108000000` | `public.user_roles` | Granular RBAC assignments | Admin assignment only; RLS enforced |
| `20261108000000` | `public.role_permissions` | Permission matrix | Admin manage; authenticated read |
| `20261108030000` | `public.user_consents` | DPDP Act 2023 consent records | Owner-only read/write (`auth.uid() = user_id`) |

---

## 3. Stored Functions & SECURITY DEFINER Inventory

### 3.1 Audited Live SECURITY DEFINER Functions (18 Total)

Catalog audit confirmed **18 SECURITY DEFINER functions** on `hznsbxvovjxvmnchzzqt`:
- **16 functions grant EXECUTE to `anon`**.
- **16 functions grant EXECUTE to `authenticated`**.
- Several host-only and moderation-only procedures improperly expose `anon` EXECUTE privileges.

| Function Signature | Owner | Security Mode | `search_path` | Current Granted Roles | Intended Access Level | Remediation Action Required |
|---|---|---|---|---|---|---|
| `public.rsvp_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Guest & Authenticated | Keep public; enforce phone validation & rate limit |
| `public.cancel_pickup_game_reservation(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Guest & Authenticated | Keep public; enforce token verification |
| `public.get_pickup_game_whatsapp_invite(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Guest & Authenticated | Keep public; verify reservation token |
| `public.create_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `authenticated` | Authenticated Hosts | Revoke from `anon` if granted; verify `auth.uid()` |
| `public.update_pickup_game_details(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.reschedule_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.update_pickup_game_capacity(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.cancel_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.reopen_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.complete_pickup_game_as_host(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.get_host_pickup_games()` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; require authenticated session |
| `public.approve_pickup_game_whatsapp_invite(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Host Owner Only | **Revoke from `anon`**; verify host ownership |
| `public.admin_moderate_pickup_game(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | Platform Admin / Mod | **Revoke from `anon`**; require `is_admin()` or moderator |
| `public.is_pickup_game_admin()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Internal Helper | Retain restricted access |
| `public.is_listing_moderator()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Internal Helper | Retain restricted access |
| `public.get_listing_submissions()` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Moderator Only | Retain restricted access |
| `public.review_listing_submission(...)` | `postgres` | `SECURITY DEFINER` | `public` | Gated / Private | Moderator Only | Retain restricted access |
| `public.record_payment_transaction(...)` | `postgres` | `SECURITY DEFINER` | `public` | `anon`, `authenticated` | System / Webhook | Change status default to `'pending'` |

---

## 4. Migration History & Deployment Status Reconciliation

- **Total Migration Files in Repository**: 58 migrations.
- **Migrations Applied to Live Database (`hznsbxvovjxvmnchzzqt`)**: Migrations up to `20261106130000_add_listing_subscription_plans.sql`.
- **Phase 2 Status**:
  - PR #173 (`security/phase-2-row-level-security-remediation`, commit `456ba0a2fc99020d8ee0cd1c65f7218fa48b09ab`) merged migration `20261107233000_phase2_rls_remediation.sql` into the repository.
  - **The migration was NOT yet executed on `hznsbxvovjxvmnchzzqt`.**
  - Consequently, broad policies on `listing_subscriptions`, `venue_bookings`, and `trial_reminders` remain physically active in the live development database until the migration is formally applied in a controlled release window.
  - Review identified that `get_listing_subscription_by_order` and `get_venue_booking_voucher` in `20261107233000` return `SETOF public.*` (entire rows), which introduces a secondary PII disclosure risk. A corrective migration (`20261108040000`) is authored to replace them with zero-PII projections.
