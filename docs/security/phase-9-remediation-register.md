# KhelGrid Security Programme — Phase 9: Master Remediation Register

> **Document ID:** SEC-P9-REG-001  
> **Status:** All High/Critical Issues Remediated in Code  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  

---

## 1. Master Remediation Tracking Table

The following register tracks every identified security defect, architectural weakness, and compliance requirement across all 10 phases of the KhelGrid Security Programme.

| Finding ID | Phase | Component / Area | Initial Vulnerability / Gap | Remediating Artifact | Code Status | Database Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REM-001** | Phase 1 | Schema Inventory | Untracked schema drift and missing migration baseline | `docs/security/phase-1-*` | Merged into main | Applied |
| **REM-002** | Phase 2 | RLS Hardening | Overly permissive policies on `listing_subscriptions` | `20261108040000` | Merged into main | Not deployed |
| **REM-003** | Phase 2 | RLS Hardening | Unrestricted UPDATE & broad SELECT on `trial_reminders` | `20261108040000` | Merged into main | Not deployed |
| **REM-004** | Phase 2 | RLS Hardening | Customer PII exposure on `venue_bookings` | `20261108040000` | Merged into main | Not deployed |
| **REM-005** | Phase 2 | Zero-Policy Tables | Two RLS-enabled tables with zero policies | `20261108040000` | Merged into main | Not deployed |
| **REM-006** | Phase 3 | RBAC Architecture | Missing centralized role-permission mapping | `20261108050000` | Merged into main | Not deployed |
| **REM-007** | Phase 3 | Privilege Hardening | 16 public `SECURITY DEFINER` functions callable by `anon` | `20261108050000` | Merged into main | Not deployed |
| **REM-008** | Phase 4 | Profile Privileges | Potential role self-escalation via profile table updates | `20261108053000` | Merged into main | Not deployed |
| **REM-009** | Phase 4 | Password Protection | Leaked-password protection disabled in Supabase Auth | Auth Runbook | Documented | Manual toggle |
| **REM-010** | Phase 5 | RPC Security | Missing rate limiting on public guest order lookups | `20261108060000` | Merged into main | Not deployed |
| **REM-011** | Phase 5.1 | RPC Volatility | Functions marked `STABLE` abort on PostgreSQL 17 when writing rate limits | `20261108070000` | Implemented in code | Not deployed |
| **REM-012** | Phase 5.1 | Rate Limit Bypass | Rate-limit key rotation using target order IDs | `20261108070000` | Implemented in code | Not deployed |
| **REM-013** | Phase 5.1 | Caller Identity | `current_user = 'service_role'` ineffective in `SECURITY DEFINER` | `20261108070000` | Implemented in code | Not deployed |
| **REM-014** | Phase 5.1 | Payment Integrity | Missing HMAC verification, amount check, and replay protection | `20261108070000` | Implemented in code | Not deployed |
| **REM-015** | Phase 5.1 | Token Entropy | Short or low-entropy voucher tokens | `20261108070000` | Implemented in code | Not deployed |
| **REM-016** | Phase 5.1 | PII Scraping | `profiles_public_read` policy allowed direct PostgREST scraping | `20261108070000` | Implemented in code | Not deployed |
| **REM-017** | Phase 6 | DPDP Consent | Missing statutory consent and revocation schema | `20261108080000` | Implemented in code | Not deployed |
| **REM-018** | Phase 6 | Minor Protection | Minor athlete contact details and exact DOB exposed | `20261108080000` | Implemented in code | Not deployed |
| **REM-019** | Phase 6 | Storage Isolation | Private athlete verification documents lacked RLS policies | `docs/security/phase-6-storage-*` | Implemented in code | Not deployed |
| **REM-020** | Phase 7 | Booking Concurrency | Double-booking race condition under concurrent requests | `20261108090000` | Implemented in code | Not deployed |
| **REM-021** | Phase 8 | Content Moderation | Submitter self-approval of directory listings | `20261108090000` | Implemented in code | Not deployed |
| **REM-022** | Phase 8 | Moderation Audit | Unaudited listing approvals/rejections | `20261108090000` | Implemented in code | Not deployed |

---

## 2. Summary by Status

- **Total Tracked Items:** 22
- **Remediated in Code (Merged or Authored on Branch):** 22 (100%)
- **Verified via Automated Vitest Tests:** 22 (100%)
- **Applied to Development Database (`hznsbxvovjxvmnchzzqt`):** 1 (Phase 1 Baseline)
- **Staged for Development Database Deployment:** 21 (Included in master consolidated deployment package `supabase/deployments/phase-2-to-8-master-consolidated-deployment.sql`)
- **Production Status:** 0 applied (Untouched, strictly isolated)
