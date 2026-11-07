# KhelGrid — Phase 1: Security Remediation Roadmap

**Document**: Security Remediation Roadmap  
**Programme**: KhelGrid 10-Phase Security and Authorization Programme  
**Phase**: Phase 1 — Database Security Foundation  
**Auditor**: Senior Database Security Engineer & Supabase Security Architect  
**Inspection Date**: November 7, 2026  

---

## 1. Programme Phasing Overview

The KhelGrid 10-Phase Security and Authorization Programme organizes database, backend, and frontend security remediation into logically ordered, non-destructive phases:

- **Phase 1: Database Security Foundation & Baseline Audit** (Current Phase — Baseline established, zero migrations applied).
- **Phase 2: Row Level Security Remediation** (Hardening RLS policies, eliminating `USING (true)` PII leaks, enforcing least privilege).
- **Phase 3: Auth & Role Authorization Hardening** (Fixing `handle_new_user()`, sealing admin escalation, setting `search_path`).
- **Phase 4: Business Logic & Data Integrity Hardening** (Eliminating dangerous defaults: payment status, fake ratings).
- **Phase 5: Storage Security Architecture** (Provisioning private buckets, folder-level access controls for athlete CVs).
- **Phase 6: Private Schema & Helper Isolation** (Completing `private` schema migration for moderation helpers).
- **Phase 7: Live Match & Scorekeeper Authorization** (Restricting match scoring to authorized scorers).
- **Phase 8: Financial & Payout Security** (Host bank credentials encryption and OTP-gated updates).
- **Phase 9: End-to-End Penetration & Regression Testing** (Automated continuous security verification in CI).
- **Phase 10: Production Readiness & Compliance Review** (Final audit before production release).

---

## 2. Findings-to-Phase Mapping & Action Plan

| Finding ID | Severity | Affected Object | Assigned Phase | Target Remediation Action |
|---|---|---|---|---|
| **SEC-001** | **Critical** | `public.listing_subscriptions` | **Phase 2** | Restrict SELECT to `auth.uid() = user_id` and admins; create unprivileged `active_listing_badges` view for public tags. |
| **SEC-002** | **Critical** | `public.venue_bookings` | **Phase 2** | Restrict SELECT to booking owner (`booked_by_user_id = auth.uid()`); expose slot availability via unprivileged view. |
| **SEC-003** | **High** | `public.trial_reminders` | **Phase 2** | Restrict SELECT to `auth.uid() = user_id`; revoke public read on `athlete_phone` and `athlete_email`. |
| **SEC-004** | **Critical** | `public.handle_new_user()` | **Phase 3** | Remove `'admin'` from metadata role whitelist; enforce default role `'athlete'`; disallow client role self-assignment. |
| **SEC-005** | **Critical** | `public.profiles` | **Phase 2** | Replace broad public SELECT with owner-only access; create `public_profiles` view omitting `email` and `phone`. |
| **SEC-006** | **Critical** | `public.host_payout_accounts` | **Phase 8** | Link accounts to `auth.users(id)`; revoke public SELECT and UPDATE; require verified host auth and OTP confirmation. |
| **SEC-007** | **High** | `public.community_live_matches` | **Phase 7** | Restrict match score UPDATE to creator (`created_by_user_id = auth.uid()`) or platform admin. |
| **SEC-008** | **High** | `trial_applications`, `academy_enquiries` | **Phase 2** | Correct `USING (true)` to applicant owner-only policy (`auth.uid() = user_id`) and academy director policy. |
| **SEC-009** | **High** | `is_admin()`, `has_role()` | **Phase 3** | Set explicit `SET search_path = public, pg_temp` on all `SECURITY DEFINER` functions. |
| **SEC-010** | **Medium** | `khelgrid_payments`, `venue_bookings` | **Phase 4** | Change payment status defaults from `'completed'`/`'paid'` to `'pending'`; enforce `'pending_review'` check on claims. |
| **SEC-011** | **Medium** | `coaches`, `tournaments_and_events` | **Phase 4** | Remove synthetic defaults (`rating 4.90`, `48 reviews`, `verified true`); initialize new records with unverified defaults. |
| **SEC-012** | **Low** | All sensitive tables | **Phase 2** | Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` across all user data tables. |
| **SEC-013** | **Info** | `storage.buckets` | **Phase 5** | Provision `cv-documents` as private bucket with folder-level owner RLS policies. |

---

## 3. Immediate Phase 2 Execution Plan

When Phase 2 commences, the following steps will be executed:
1. **Migration Preparation**:
   Create a single, forward-only transactional migration:
   `supabase/migrations/20261108000000_phase2_row_level_security_remediation.sql`.
2. **Explicit Safety Constraints**:
   - Zero destructive SQL.
   - Idempotent policy drops and recreations.
   - Backward compatibility for existing public catalogue readers (`sports`, `academies`, `venues`, `events`, `cities`).
3. **Dedicated Review & Approval Gate**:
   Phase 2 migration will be reviewed in a PR before application to the development database.
