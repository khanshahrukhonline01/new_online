# KhelGrid — Phase 1: Security Remediation Roadmap
## Reconciled Remediation Roadmap (Post-Merge Audit Edition)

**Document**: Security Remediation Roadmap  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation (Reconciled Baseline)  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Reconciliation Date**: November 7, 2026  
**Environment**: Development Database (`hznsbxvovjxvmnchzzqt`)  

---

## 1. Programme Phasing Overview

The KhelGrid 10-Phase Security and Authorization Programme organizes database, backend, and frontend security remediation into logically ordered, non-destructive phases:

- **Phase 1: Database Security Foundation & Baseline Audit** (Completed & Reconciled — Baseline verified across 28 public tables).
- **Phase 2: Row Level Security Remediation** (PR #173 merged in repository; corrective migration `20261108040000` authored to eliminate whole-row PII return in RPCs, fix unsafe update on reminders, protect participants, and enforce FORCE RLS).
- **Phase 3: Role-Based Access Control & Privilege Hardening** (Completed in repository).
- **Phase 4: Database Functions & Privilege Hardening** (Completed in repository).
- **Phase 5: Storage Security & Document Isolation** (Completed in repository).
- **Phase 6: Data Privacy, PII Masking & Cryptographic Protections** (Completed in repository).
- **Phase 7: Audit Logging, Security Telemetry & Intrusion Detection** (Pending).
- **Phase 8: API Rate Limiting, Abuse Prevention & DDoS Defense** (Pending).
- **Phase 9: Automated Security Regression & Penetration Testing Pipeline** (Pending).
- **Phase 10: Production Cutover, Verification & Handover Dossier** (Pending).

---

## 2. Reconciled Findings-to-Phase Mapping & Action Plan

| Finding ID | Severity | Affected Object | Assigned Phase | Target Remediation Action | Status |
|---|---|---|---|---|---|
| **SEC-001** | **Critical** | `public.listing_subscriptions` | **Phase 2** | Restrict SELECT to `auth.uid() = user_id` and admins; eliminate broad `USING (true)`. | Merged in code; pending live DB application |
| **SEC-002** | **Critical** | `public.venue_bookings` | **Phase 2** | Restrict SELECT to booking owner (`auth.uid() = user_id`); provide zero-PII slot availability RPC. | Merged in code; pending live DB application |
| **SEC-003** | **High** | `public.trial_reminders` | **Phase 2** | Restrict SELECT to `auth.uid() = user_id`; restrict UPDATE to owner; preserve public INSERT. | Merged in code; pending live DB application |
| **SEC-004** | **Critical** | `public.handle_new_user()` | **Phase 3** | Remove `'admin'` from metadata role whitelist; enforce default role `'athlete'`. | Hardened in migrations |
| **SEC-005** | **Critical** | `public.profiles` | **Phase 2** | Replace broad public SELECT with owner-only access; create `public_profiles` view. | Hardened in migrations |
| **SEC-006** | **Critical** | `public.host_payout_accounts` | **Phase 4 / 6** | Link accounts to `auth.users(id)`; encrypt banking credentials with `pgcrypto`. | Hardened in migrations |
| **SEC-007** | **High** | `public.community_live_matches` | **Phase 4** | Restrict match score UPDATE to creator or platform admin. | Hardened in migrations |
| **SEC-008** | **High** | `trial_applications`, `academy_enquiries` | **Phase 2** | Restrict SELECT to applicant `auth.uid() = user_id`. | Hardened in migrations |
| **SEC-009** | **High** | `is_admin()`, `has_role()` | **Phase 3** | Set explicit `SET search_path = public, pg_temp` on helper functions. | Hardened in migrations |
| **SEC-010** | **Medium** | `khelgrid_payments`, `venue_bookings` | **Phase 4** | Change payment status defaults from `'completed'`/`'paid'` to `'pending'`. | Hardened in migrations |
| **SEC-011** | **Medium** | `coaches`, `tournaments_and_events` | **Phase 4** | Remove synthetic defaults (`rating 4.90`, `48 reviews`); set unverified baselines. | Hardened in migrations |
| **SEC-012** | **Low** | All sensitive tables | **Phase 2** | Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` across user data tables. | Addressed in `20261108040000` |
| **SEC-013** | **Info** | `storage.buckets` | **Phase 5** | Provision `cv-documents` as private bucket with folder-level owner RLS policies. | Hardened in migrations |
| **SEC-014** | **Critical** | `get_listing_subscription_by_order`, `get_venue_booking_voucher` | **Phase 2** | Replace whole-row `SETOF` RPCs with zero-PII minimal projections. | Addressed in `20261108040000` |
| **SEC-015** | **Medium** | `pickup_game_participants`, `pickup_game_rsvp_rate_limits` | **Phase 2** | Add explicit RLS policies to eliminate tables without policies. | Addressed in `20261108040000` |
| **SEC-016** | **High** | Host and moderation `SECURITY DEFINER` functions | **Phase 2** | Revoke `EXECUTE` on host and moderation functions from `anon`. | Addressed in `20261108040000` |
