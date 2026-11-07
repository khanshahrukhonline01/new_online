# KhelGrid — Phase 1: Migration and Schema Drift Report

**Document**: Migration and Schema Drift Report  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Application Security Auditor  
**Inspection Date**: November 7, 2026  
**Development Instance**: `hznsbxvovjxvmnchzzqt`  
**Repository Branch**: `security/phase-1-database-security-baseline`  

---

## 1. Executive Summary of Drift Analysis

A rigorous comparison between the 53 migration SQL files in `supabase/migrations/` and the live development Supabase instance (`hznsbxvovjxvmnchzzqt`) revealed a **distinct deployment boundary**:

1. **Applied Migrations**: All migrations up to `20261106130000_add_listing_subscription_plans.sql` are active on the development database.
2. **Unapplied Migrations**: All migrations from `20261106150000_create_live_matches_and_host_payouts.sql` through `20261107181000_seed_tournaments_and_coaches_expansion.sql` (8 migrations total) have **not been applied** to the live development database.
3. **Implication**: The unapplied migrations contain several critical security vulnerabilities (e.g. `USING (true)` on bank accounts, live scoreboards, and candidate applications, as well as an admin privilege escalation vector in `handle_new_user`). **These vulnerabilities are currently confined to the repository and have NOT compromised the live development database.**

---

## 2. Detailed Object Drift Matrix

### 2.1 Missing Tables on Live Database (Defined in Migrations)

| Object Name | Defining Migration | Object Type | Status in Live DB | Security Classification |
|---|---|---|---|---|
| `public.community_live_matches` | `20261106150000` | Table | Missing (404) | Database/repository drift (Contains SEC-007) |
| `public.host_payout_accounts` | `20261106150000` | Table | Missing (404) | Database/repository drift (Contains SEC-006) |
| `public.host_settlement_payouts`| `20261106150000` | Table | Missing (404) | Database/repository drift (Contains SEC-006) |
| `public.sports_books` | `20261107000000` | Table | Missing (404) | Database/repository drift |
| `public.profiles` | `20261107120000` | Table | Present (401 Select Denied) / Unmigrated Columns | Database/repository drift (Contains SEC-004, SEC-005) |
| `public.tournaments_and_events` | `20261107180000` | Table | Missing (404) | Database/repository drift |
| `public.venue_slot_bookings` | `20261107180000` | Table | Missing (404) | Database/repository drift (Contains SEC-008) |
| `public.trial_applications` | `20261107180000` | Table | Missing (404) | Database/repository drift (Contains SEC-008) |
| `public.academy_enquiries` | `20261107180000` | Table | Missing (404) | Database/repository drift (Contains SEC-008) |
| `public.user_bookmarks` | `20261107180000` | Table | Missing (404) | Database/repository drift |
| `public.coach_inquiries` | `20261107180000` | Table | Missing (404) | Database/repository drift |
| `public.live_matches` | `20261107180000` | Table | Missing (404) | Database/repository drift |
| `public.live_score_events` | `20261107180000` | Table | Missing (404) | Database/repository drift |

### 2.2 Missing Stored Procedures on Live Database

| Stored Procedure | Defining Migration | Status in Live DB | Security Classification |
|---|---|---|---|
| `public.save_host_payout_account` | `20261106150000` | Missing (404) | Database/repository drift |
| `public.request_host_settlement_payout` | `20261106150000` | Missing (404) | Database/repository drift |
| `public.publish_community_match_score` | `20261106150000` | Missing (404) | Database/repository drift |
| `public.handle_new_user()` | `20261107120000` | Missing (404) | Repository-only risk (SEC-004) |
| `public.is_admin()` | `20261107120000` | Missing (404) | Repository-only risk (SEC-009) |
| `public.has_role(text)` | `20261107120000` | Missing (404) | Repository-only risk (SEC-009) |

---

## 3. Discrepancy & Drift Root Cause Analysis

1. **Incremental Deployment Disconnect**:
   Earlier migrations were executed manually via the Supabase SQL Editor or CLI up to November 6, 2026 (`20261106130000`). Later migrations added between November 6 evening and November 7 were checked into the Git repository but not deployed to the hosted Supabase database.
2. **Frontend Offline-First Resiliency Masking Drift**:
   The frontend application handles missing tables by automatically falling back to curated datasets (`curatedEntitiesData.ts`, `eventsData.ts`, `coachesData.ts`, and local storage). Because the user experience remained functional and tests passed via mocked clients, the absence of these tables on the live database went unnoticed.
3. **Naming Discrepancy on Listing Submissions**:
   The live database uses table name `public.listing_submissions`, whereas some early client methods referred to `listing_suggestions`. PostgREST returns a hint: `Perhaps you meant the table 'public.listing_submissions'`.
4. **Storage Provisioning Drift**:
   Storage bucket references in code (`venue-media`, `academy-photos`, `cv-documents`) have never been created in `storage.buckets`.

---

## 4. Drift Findings Classification

1. **Confirmed Database Vulnerability**:
   - `SEC-001`: `public.listing_subscriptions` live table permits anonymous public SELECT of customer contact info and billing amounts.
   - `SEC-002`: `public.venue_bookings` live table permits anonymous public SELECT of customer booking names, phones, and paid amounts.
   - `SEC-003`: `public.trial_reminders` live table permits anonymous public SELECT of subscriber phone numbers and emails.
2. **Confirmed Configuration Weakness**:
   - `SEC-012`: `FORCE ROW LEVEL SECURITY` is absent across all live tables.
3. **Repository-Only Risk**:
   - `SEC-004`: `handle_new_user()` metadata role escalation.
   - `SEC-005`: `profiles` public email and phone disclosure policy.
   - `SEC-006`: `host_payout_accounts` public read/update policy on bank credentials.
   - `SEC-007`: `community_live_matches` public score tampering policy.
   - `SEC-008`: `trial_applications` and `academy_enquiries` public read policy.
   - `SEC-009`: `is_admin()` missing `search_path`.
   - `SEC-011`: Fabricated coach ratings and verified badges in migration seed.
4. **Database/Repository Drift**:
   - 13 tables present in migrations are uncreated in the development database.
   - 6 functions present in migrations are uncreated in the development database.
5. **Informational Observation**:
   - `SEC-013`: Storage buckets uninitialized on development project.
