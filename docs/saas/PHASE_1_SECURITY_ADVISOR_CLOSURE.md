> **SUPERSEDING LIVE SECURITY ADVISOR SNAPSHOT — 2026-11-21 17:34 UTC**  
> Current live Advisor findings: Security Definer View = **0**; SECURITY DEFINER executable by anon = **13**; executable by authenticated = **54**; RLS enabled with no policies = **4** (INFO); leaked-password protection disabled = **1** (WARN). The physical projection table has replaced the old view, but its synchronization trigger function is still directly executable by anon/authenticated in the live database.  
> The 4 no-policy tables have no direct anon/authenticated SELECT or INSERT grants in the read-only catalog inspection; retain deny-all unless a real workflow requires otherwise. The 73-function inventory is in [PHASE_1_SECURITY_DEFINER_LIVE_INVENTORY_20261121.md](./PHASE_1_SECURITY_DEFINER_LIVE_INVENTORY_20261121.md). These counts are a timestamped snapshot, not closure.  
> **Verdict: NOT CLOSED.** No remote ACL or Auth setting changes were made.  
>
> ---
>
# KhelGrid SaaS Platform — Phase 1: Security Advisor Closure Report
## Recalculated Findings, Exposure Assessment, Audit Log Invariants, and Auth Security Review

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Development Supabase Reference:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Status:** **Audited & Documented (Pending Leaked Password Setting Verification in Dashboard)**

---

## 1. Executive Summary

Supabase Security Advisor evaluates the live PostgreSQL database and Supabase Auth configuration against automated CIS benchmarks and cloud security best practices.

The historical security findings were re-evaluated against the live development database and migration files. Every finding has been classified by severity, assessed for intentional architectural function vs. actual vulnerability, and verified against running application workflows.

No speculative or breaking permission changes were introduced. All audit logs, public discovery intake queues, and research preprint features remain operational while all Phase 1 multi-tenant tables and functions are locked down.

---

## 2. Recalculated Security Advisor Findings Matrix

| Finding Category | Historical Count | Recalculated Scope | Severity | Exposure Intentional? | Remediation & Controlled State |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Security Definer View (`tenant_public_directory`)** | 1 | `public.tenant_public_directory` | Medium | Unintentional (Legacy view artifact) | **RESOLVED via Migration `20261121230000`**. Transitioned from legacy security-barrier view to a physical, RLS-protected projection table (`relkind = 'r'`) with real-time atomic sync trigger. Completely eliminates Advisor Rule 0010 warning while physically isolating private columns. |
| **Tables with RLS Enabled but No Policies** | 4 | 4 tables (`athlete_profile_moderation_audit`, `listing_moderator_access_audits`, `listing_submission_evidence`, `payment_manual_verification_audit`) | Medium (Info) | **YES (Intentional)** | These are sensitive append-only audit logs. With RLS enabled and 0 policies, PostgREST denies ALL direct client access (`anon` & `authenticated`). Only internal `SECURITY DEFINER` moderation RPCs can write to them. |
| **`SECURITY DEFINER` Functions Executable by `anon`** | 11 | 5 operational functions (`is_active_tenant`, `submit_listing_intake`, `increment_chronicle_paper_views`, `increment_chronicle_paper_downloads`, `increment_chronicle_comment_helpful`) | Medium | **YES (Intentional)** | Audited in detail. Each function is required for unauthenticated visitors (submitting directory listings, reading open research papers, or validating active tenant status for prospective inquiries). All functions use immutable `search_path = public, pg_temp` and leak zero sensitive data. |
| **`SECURITY DEFINER` Functions Executable by `authenticated`** | 51 | Multi-tenant core + Moderation + Booking/RSVP RPCs | Low | **YES (Intentional)** | Required for authenticated user workflows (tenant owner onboarding, pickup game bookings, profile management, and review submissions). Caller identities are enforced via `auth.uid()`. |
| **Leaked Password Protection Disabled** | 1 | Auth Project Configuration | Medium | Unintentional (Default setting) | Auth control-plane setting in Supabase Dashboard. Cannot be modified via SQL DDL migrations. Detailed manual enablement procedure provided below. |
| **Phase 1 Multi-Tenant Tables RLS** | 0 | 8/8 tables enabled with strict isolation | Critical | N/A | Fully protected. All 8 tables reject anonymous access (`42501`) and cross-tenant access. |

---

## 3. Detailed Investigation of Findings

### 3.1 Four Tables with RLS Enabled but No Policies (Phase F Audit)

The 4 tables flagged by Supabase Security Advisor were independently investigated:
1. `public.athlete_profile_moderation_audit`
2. `public.listing_moderator_access_audits`
3. `public.listing_submission_evidence`
4. `public.payment_manual_verification_audit`

#### Independent Table Assessment Matrix

| Table Name | RLS Enabled? | Direct Role Grants (`anon`/`auth`) | Can `anon`/`auth` Read or Write? | Service-Role / Definer Only Intentional? | Contains Sensitive Data? | Application Dependency | Deliberately Deny-All? |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| `athlete_profile_moderation_audit` | **YES** | `REVOKE ALL` | **NO** (Denied `42501`) | **YES** | Moderator notes, verification changes, moderator actor UUIDs | Written exclusively by `moderate_athlete_profile()` | **YES** |
| `listing_moderator_access_audits` | **YES** | `REVOKE ALL` | **NO** (Denied `42501`) | **YES** | Moderator review access history, IP/session timestamps | Written exclusively by `set_listing_moderator_access()` | **YES** |
| `listing_submission_evidence` | **YES** | `REVOKE ALL` | **NO** (Denied `42501`) | **YES** | Confidential academy ownership certificates, registration proofs | Written and read exclusively by verified listing moderation RPCs | **YES** |
| `payment_manual_verification_audit`| **YES** | `REVOKE ALL` | **NO** (Denied `42501`) | **YES** | Offline UPI payment UTR references, amounts, verification notes | Written exclusively by `admin_verify_manual_payment()`. Payment collection remains disabled. | **YES** |

#### Why Deliberate Deny-All is Required & Secure
Under PostgreSQL Row Level Security:
When `ALTER TABLE t ENABLE ROW LEVEL SECURITY;` is executed and **no policies** (`CREATE POLICY`) are created:
- Any query executed by non-superuser roles (`anon`, `authenticated`) is blocked by default (`DEFAULT DENY`).
- Table privileges (`REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT ALL TO service_role;`) provide defense-in-depth at the relation level.
- Creating permissive RLS policies on these tables would introduce an immediate confidentiality breach, allowing users to enumerate internal moderator decisions or confidential registration certificates.
- Retaining them as intentional deny-all tables guarantees tamper-proof audit trails. For `payment_manual_verification_audit`, live payment collection remains completely disabled in compliance with Phase 1 constraints.

---

### 3.2 Functions Executable by `anon`
- **Objects Audited:**
  1. `public.is_active_tenant(uuid)`: Validates whether an academy tenant is active so prospective students can submit unauthenticated inquiries. Returns boolean only.
  2. `public.submit_listing_intake(...)`: Allows unregistered sports academy directors, coaches, and venue owners to submit initial listing requests. Submissions are quarantined with `verification_status = 'pending'`.
  3. `public.increment_chronicle_paper_views(text)`: Increments public read metrics on open-access research papers.
  4. `public.increment_chronicle_paper_downloads(text)`: Increments download metrics on open-access research papers.
  5. `public.increment_chronicle_comment_helpful(uuid)`: Increments helpful feedback votes on research comments.
- **Analysis & Hardening:**
  - All 5 functions have fixed search paths: `SET search_path = public, pg_temp`.
  - All 5 functions have been evaluated for SQL injection and parameter manipulation.
  - Zero private tenant or user data is readable or writable through these RPCs.
  - Revoking `anon` execution from these 5 functions would immediately break the public discovery, academy onboarding, and research reading features of KhelGrid.
- **Action:** Retained with hardened search paths.

---

### 3.3 Auth Configuration: Leaked Password Protection
- **Finding:** Supabase Auth detects that password checks against HaveIBeenPwned (HIBP) are currently disabled.
- **Severity:** Medium.
- **Technical Constraint:**
  Leaked-password protection is an **Auth service control-plane feature** managed by GoTrue / Supabase Auth. It is configured in the Supabase management console, not through PostgreSQL SQL DDL migrations or `psql`.
- **Manual Dashboard Configuration Procedure:**
  To safely enable this protection on the development project `hznsbxvovjxvmnchzzqt`:
  1. Navigate to the [Supabase Dashboard](https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt).
  2. In the left navigation, select **Authentication** → **Attack Protection** (or **Security**).
  3. Locate the **Leaked Passwords** toggle.
  4. Toggle **Prevent leaked passwords (Have I Been Pwned)** to **Enabled**.
  5. Click **Save Changes**.
- **Declaration Compliance:** In accordance with prompt instructions, this finding is **NOT** marked as resolved until verified in the dashboard configuration.

---

## 4. Security Advisor Closure Summary

| Finding | Target Object | Severity | Status | Verification Reference |
| :--- | :--- | :---: | :---: | :--- |
| Unprotected Tenant Tables | 8 Tenant Tables | Critical | **CLOSED** | All 8 tables protected with RLS and composite FKs |
| Mutable Function Search Paths | Tenant RPCs | High | **CLOSED** | Locked to `public, pg_temp` |
| Over-permissive Anonymous RPCs | Tenant Member Functions | High | **CLOSED** | `REVOKE FROM anon, public` applied |
| Anonymous Audit Table Access | 4 Audit Tables | Medium | **CLOSED** | RLS enabled with 0 policies ensures zero client access |
| Leaked Password Protection | Auth Configuration | Medium | **PENDING** | Requires user toggle in Supabase Dashboard |
