# KhelGrid SaaS Platform — Phase 1: Security Review & Findings

**Document Version:** 1.0  
**Target Environment:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Review Standard:** Supabase Security Advisor & DevSecOps Audit  

---

## 1. Security Findings Categorization

| Category | Description | Status | SaaS Pilot Impact |
| :--- | :--- | :--- | :--- |
| **Category A: New Tenant Architecture** | Newly implemented tenant, membership, and operational schemas | Fully Hardened | None (All RLS policies & search_paths secured) |
| **Category B: Existing Platform Security Debt** | Legacy functions and RPCs from October 2026 catalogue features | Catalogued | Low (Isolated from tenant workspaces) |
| **Category C: Intentionally Public & Justified** | Public discovery directory for sports venues, trials, and academies | Expected | None (Read-only access strictly verified) |
| **Category D: Pre-Pilot Remediation Items** | Concrete fixes applied during Phase 1 hardening | Remediated | Zero Blockers Remaining |

---

## 2. Category A: Tenant Architecture Review

All tables introduced in Phase 1 adhere strictly to the following security rules:
- **RLS Enabled:** `public.tenants`, `public.tenant_memberships`, `public.tenant_batches`, `public.tenant_students`, `public.tenant_enquiries`, `public.tenant_fee_invoices`, `public.tenant_fee_transactions`, `public.tenant_attendance_events`.
- **Public Grants Revoked:** `REVOKE ALL ON public.tenants FROM PUBLIC, anon;`
- **Function Search Paths:** `SET search_path = public, pg_temp` enforced on all functions.
- **Function Grants:** `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`

---

## 3. Category B & C: Existing Platform Security Debt & Justifications

### 1. Public Directory Listings (`public.academies`, `public.venues`, `public.coaches`)
- **Finding:** Anonymous SELECT granted.
- **Justification:** Intentionally public. KhelGrid is an open sports discovery platform; visitors must search and explore accredited sports facilities without forced registration.
- **Guard:** Updates and deletions require administrative moderation roles.

### 2. Legacy RPC Functions
- **Finding:** Certain legacy pickup game and sitemap helper functions possess broad execution grants.
- **Status:** Unrelated to tenant workspaces. Contained within legacy discovery modules.
- **Action:** Retained for backward compatibility; tenant operational routes do not depend on legacy RPCs.

---

## 4. Category D: Remediations Completed in Phase 1

1. **Elimination of Fake UPI VPA Synthesis:** Removed `${phone}@okhdfcbank` fallback in `PartnerOnboardingPage.tsx`. Unconfigured accounts now remain explicitly unconfigured.
2. **Guardian Consent Verification Guard:** `createGuardianConsentRecord()` in `saasLaunchReadinessService.ts` updated to set `dpdpConsentVerified: false` pending verifiable signature/OTP.
3. **Coach Credential Integrity:** Removed default `'NIS / Federation Certified Coach'` fallback in `coachSaaSClient.ts`. Unverified coaches are labeled `'Unverified / Pending Credential Verification'`.
4. **Client-Side Role Switcher Clarification:** Browser role selector in `AcademyHubPage.tsx` explicitly designated as a **Demo Preview Sandbox**, with real authorization resolved database-side via `tenant-client.ts`.
5. **Launch Readiness Honesty:** `getAcademyPreLaunchChecklist()` updated to prevent certifying mock/sample data as "Ready to Launch".
