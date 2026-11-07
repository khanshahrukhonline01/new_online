# KhelGrid — Phase 1: Migration and Schema Drift Report
## Reconciled Migration & Drift Report (Post-Merge Audit Edition)

**Document**: Migration and Schema Drift Report  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Application Security Auditor  
**Reconciliation Date**: November 7, 2026  
**Development Instance**: `hznsbxvovjxvmnchzzqt`  
**Repository Branch**: `security/phase-2-rls-post-merge-verification`  

---

## 1. Executive Summary of Drift Analysis

A rigorous comparison between the 58 migration SQL files in `supabase/migrations/` and the live development Supabase instance (`hznsbxvovjxvmnchzzqt`) revealed a **distinct deployment boundary**:

1. **Applied Migrations**: All migrations up to `20261106130000_add_listing_subscription_plans.sql` are active on the development database.
2. **Unapplied Migrations**: All migrations from `20261106150000_create_live_matches_and_host_payouts.sql` through `20261108030000_phase6_privacy_pii_masking_cryptography.sql` have **not been applied** to the live development database.
3. **PR #173 Status**: PR #173 (`security/phase-2-row-level-security-remediation`, merged commit `456ba0a2fc99020d8ee0cd1c65f7218fa48b09ab`) merged migration `20261107233000_phase2_rls_remediation.sql` into the repository. **This migration has not yet been applied to `hznsbxvovjxvmnchzzqt`.**
4. **Active Live Exposure**: Because migration `20261107233000` has not yet been executed on the hosted database, `public.listing_subscriptions`, `public.venue_bookings`, and `public.trial_reminders` still have permissive `USING (true)` read policies active on `hznsbxvovjxvmnchzzqt`.
5. **Secondary RPC Exposure in Merged Code**: Review of merged migration `20261107233000` revealed that `get_listing_subscription_by_order` and `get_venue_booking_voucher` were declared returning `SETOF public.*` (`SELECT *`). If applied as-is, any caller guessing an order or booking ID could extract full customer names, telephone numbers, emails, and amounts. Corrective migration `20261108040000` is authored to eliminate this PII exposure before database deployment.

---

## 2. Detailed Object Drift Matrix

### 2.1 Live Verified Tables vs. Defined Tables

- **Live Application Tables in `public`**: 28 tables.
  - All 28 have RLS enabled.
  - 0 have FORCE RLS enabled.
  - 2 have RLS enabled with NO policies (`pickup_game_participants`, `pickup_game_rsvp_rate_limits`).
- **Unapplied Tables in Migrations**:
  - `public.community_live_matches` (`20261106150000`)
  - `public.host_payout_accounts` (`20261106150000`)
  - `public.host_settlement_payouts` (`20261106150000`)
  - `public.sports_books` (`20261107000000`)
  - `public.tournaments_and_events` (`20261107180000`)
  - `public.venue_slot_bookings` (`20261107180000`)
  - `public.trial_applications` (`20261107180000`)
  - `public.academy_enquiries` (`20261107180000`)
  - `public.user_bookmarks` (`20261107180000`)
  - `public.coach_inquiries` (`20261107180000`)
  - `public.live_matches` (`20261107180000`)
  - `public.live_score_events` (`20261107180000`)
  - `public.user_roles` (`20261108000000`)
  - `public.role_permissions` (`20261108000000`)
  - `public.user_consents` (`20261108030000`)

### 2.2 Live Stored Functions vs. Unapplied Procedures

- **Live Verified Stored Functions**: 18 functions.
  - 16 functions have `GRANT EXECUTE ... TO anon`.
  - 16 functions have `GRANT EXECUTE ... TO authenticated`.
- **Unapplied Stored Functions**:
  - `public.save_host_payout_account` (`20261106150000`)
  - `public.request_host_settlement_payout` (`20261106150000`)
  - `public.publish_community_match_score` (`20261106150000`)
  - `public.handle_new_user()` (`20261107120000`)
  - `public.is_admin()` (`20261107120000`)
  - `public.has_role(text)` (`20261107120000`)
  - `public.get_booked_slots_for_venue(...)` (`20261107233000`)
  - `public.get_venue_booking_voucher(...)` (`20261107233000`)
  - `public.get_listing_subscription_by_order(...)` (`20261107233000`)
  - `public.admin_assign_role(...)` (`20261108000000`)
  - `public.admin_revoke_role(...)` (`20261108000000`)
  - `public.export_user_data(...)` (`20261108030000`)
  - `public.anonymize_user_account(...)` (`20261108030000`)

---

## 3. Discrepancy & Drift Root Cause Analysis

1. **Incremental Deployment Disconnect**:
   Earlier migrations were executed manually via the Supabase SQL Editor or CLI up to November 6, 2026 (`20261106130000`). Later migrations added between November 6 evening and November 7 were checked into the Git repository but not deployed to the hosted Supabase database.
2. **Frontend Offline-First Resiliency Masking Drift**:
   The frontend application handles missing tables by automatically falling back to curated datasets (`curatedEntitiesData.ts`, `eventsData.ts`, `coachesData.ts`, and local storage). Because the user experience remained functional and tests passed via mocked clients, the absence of these tables on the live database went unnoticed.
3. **Phase 2 Merged vs. Deployed Disconnect**:
   PR #173 was merged to `main` in the GitHub repository, but the migration script `20261107233000_phase2_rls_remediation.sql` was not run on `hznsbxvovjxvmnchzzqt`. Consequently, the live database still has the original broad policies.

---

## 4. Drift Findings Classification

1. **Confirmed Database Vulnerability (Live Database)**:
   - `SEC-001`: `public.listing_subscriptions` live table permits anonymous public SELECT of customer contact info and billing amounts.
   - `SEC-002`: `public.venue_bookings` live table permits anonymous public SELECT of customer booking names, phones, and paid amounts.
   - `SEC-003`: `public.trial_reminders` live table permits anonymous public SELECT of subscriber phone numbers and emails, plus unrestricted authenticated UPDATE.
   - `SEC-012`: `FORCE ROW LEVEL SECURITY` is absent across all live tables.
   - `SEC-015`: `pickup_game_participants` and `pickup_game_rsvp_rate_limits` have RLS enabled with 0 policies.
   - `SEC-016`: 16 SECURITY DEFINER functions grant EXECUTE to `anon`.
2. **Repository Defect in Merged Code**:
   - `SEC-014`: Phase 2 RPCs (`get_listing_subscription_by_order`, `get_venue_booking_voucher`) return whole records via `SETOF`, leaking PII upon order/booking lookup.
