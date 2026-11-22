# KHELGRID SAAS PLATFORM — COMPREHENSIVE RISK REGISTER
## Prioritized Security, Privacy, Financial, Data Integrity, and Operational Risks

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Short: `85f558d`)  
**Audit Documentation Commit:** `fd7a0f16ca68a2f5845216a10b6859ad8e2f7932` (Short: `fd7a0f1`)  
**Premature Implementation Commit:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233` (Short: `38e5b0b`)  
**Current Branch HEAD SHA:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`  
**Date of Audit & Reconciliation:** 2026-11-22  
**Implementation Governance:** **PHASE 1 AUDIT ONLY — PHASE 2 NOT APPROVED — PROTOTYPES PRESERVED AS UNACCEPTED WORK**

---

## 1. Risk Scoring & Taxonomy

Risks are categorized across five critical domains and prioritized using the standard risk matrix (Impact × Likelihood):
- **CRITICAL:** Immediate security vulnerability, data disclosure, unauthorized financial mutation, or catastrophic regulatory non-compliance. Must be resolved before any multi-tenant pilot launch.
- **HIGH:** Significant architectural deficiency, unauthenticated route access, or severe integrity gap that undermines multi-tenant safety.
- **MEDIUM:** Functional limitation, client-side privilege simulation, or operational burden that affects reliability or user experience.
- **LOW:** Code cleanliness, documentation drift, or non-blocking technical debt.

---

## 2. Comprehensive Risk Register

| Risk ID | Category | Title | Severity | Affected Components | Impact & Likelihood | Mitigation Strategy |
| :---: | :---: | :--- | :---: | :--- | :--- | :--- |
| **RSK-SEC-01** | Security & Auth | **Route Guard Unmounted in `App.tsx` (`RequireTenantMember` absent)** | **HIGH** | `src/App.tsx` (Lines 340–344) | **Impact: High / Likelihood: Certain.** `RequireTenantMember.tsx` was created but not mounted on `/academy-hub`. Unauthenticated visitors bypass route checks and enter demo mode. | Mount `<RequireTenantMember>` in `src/App.tsx` wrapping `/academy-hub` during Phase 3. |
| **RSK-SEC-02** | Security & Auth | **Client-Side Role Selector in Academy Hub Preview** | **MEDIUM** | `src/modules/academies/AcademyHubPage.tsx` (Lines 948–994) | **Impact: Medium / Likelihood: High.** Unauthenticated users can switch between Director, Head Coach, and Front Desk via `#academy-role-select` to render privileged UI tabs with mock data. | Remove the client-side role dropdown when authenticating users in Phase 3. Derive role strictly from `tenant_memberships`. |
| **RSK-SEC-03** | Security & Auth | **Premature Phase 2 Migration Vulnerability (Null Email in Invitation RPC)** | **RESOLVED (Phase 2)** | `supabase/migrations/20261122100000_phase2_*.sql` | **Remediated.** In `accept_tenant_invitation`, strict fail-closed email validation (`IS NOT NULL` and lower-case match) and `unique_tenant_user` conflict resolution were implemented. | Tested and verified in `phase2-database-consolidation.test.ts`. |
| **RSK-SEC-04** | Security & Auth | **Incomplete Soft-Delete RLS Policies** | **RESOLVED (Phase 2)** | `supabase/migrations/20261122100000_phase2_*.sql` | **Remediated.** Updated SELECT policies on `tenant_students`, `tenant_batches`, `tenant_memberships`, and `tenants` to enforce `deleted_at IS NULL` for active queries with director archival inspection. | Tested and verified in `phase2-database-consolidation.test.ts`. |
| **RSK-PRIV-01** | Data Privacy | **Minor Student PII Stored in Unencrypted LocalStorage** | **CRITICAL** | `src/modules/academies/academySaaSClient.ts`, `parentPortalService.ts` | **Impact: Severe / Likelihood: Certain.** Minor children's names, parents' phone numbers, and dates of birth are written in plain text to browser `localStorage`, violating India's DPDP Act 2023. | Migrate all student records to encrypted PostgreSQL tables with DPDP masking in Phase 5. Wipe mock localStorage stores. |
| **RSK-PRIV-02** | Data Privacy | **Unauthenticated Parent Portal Access** | **HIGH** | `src/modules/parent/ParentPortalPage.tsx`, `parentPortalService.ts` | **Impact: High / Likelihood: High.** Parent portal displays simulated progress without verified phone/OTP authentication. | Implement verified phone OTP authentication and link parent session (`auth.uid()`) to `tenant_students.guardian_user_id` in Phase 5. |
| **RSK-FIN-01** | Financial | **Conflicting Paid Listing Plans in Codebase** | **HIGH** | `src/shared/payments/listingPricing.ts`, `supabase/functions/_shared/paymentPricing.ts` | **Impact: High / Likelihood: Medium.** Repository contains pricing plans (`1_day`, `1_month`, etc.) that contradict the mandatory business rule that listings must remain 100% free. | Mark listing pricing modules strictly dormant with deprecation headers; ensure publication remains gated only by trust verification. |
| **RSK-FIN-02** | Financial | **Unverified Direct UPI VPA Configuration** | **HIGH** | `src/modules/academies/AcademyHubPage.tsx`, `saasLaunchReadinessService.ts` | **Impact: High / Likelihood: Medium.** Directors can enter arbitrary UPI VPAs without bank account holder name verification. | Enforce database regex constraint (`^.+@[a-zA-Z0-9.-]+$`) and implement NPCI / bank VPA name-lookup verification before activating 0% fee collections. |
| **RSK-FIN-03** | Financial | **Client-Side Fee Ledger & Cash-in-Hand Discrepancies** | **MEDIUM** | `src/modules/academies/academySaaSClient.ts`, `saasLaunchReadinessService.ts` | **Impact: Medium / Likelihood: High.** Fee totals and arrears are computed via client-side JavaScript over unvalidated arrays, risking reconciliation drift. | Shift authoritative fee calculation to database views and transactional RPCs on `tenant_fee_invoices` and `tenant_fee_transactions` in Phase 6. |
| **RSK-DATA-01** | Data Integrity | **Frontend Fallback to LocalStorage When Unauthenticated** | **HIGH** | `src/modules/academies/AcademyHubPage.tsx` | **Impact: High / Likelihood: Certain.** When unauthenticated, changes made by users persist only in browser localStorage and are wiped upon switching devices. | Replace hybrid fallback with strict authentication route guards in Phase 3. |
| **RSK-DATA-02** | Data Integrity | **Missing Staff Invitation Lifecycle on Live Database** | **HIGH** | `supabase/migrations/` | **Impact: High / Likelihood: High.** While invitation RPCs were drafted in Phase 2 migration, they remain unverified on live PostgreSQL. | Verify and test staff invitation lifecycle in Phase 3. |
| **RSK-ARCH-01** | Architectural | **Premature Implementation Introduced During Audit Phase** | **MEDIUM** | Branch `feature/saas-phase-1-acceptance-remediation` | **Impact: Medium / Likelihood: Certain.** Introducing 20 implementation files during an audit-only task caused documentation drift. | Reconciled via Phase 1 acceptance report; code quarantined as unaccepted prototype work. |

---

## 3. Authoritative Status Declaration

- **Phase 1: Current-State Audit and Baseline — COMPLETE & ACCEPTED.**
- **Phase 2: Secure Database and Tenant Isolation — NOT APPROVED & NOT STARTED.**
- **Premature Implementation Changes: Preserved on branch but not accepted.**
