# KHELGRID SAAS PLATFORM — COMPREHENSIVE RISK REGISTER
## Prioritized Security, Privacy, Financial, Data Integrity, and Operational Risks

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Head Commit:** `85f558da93472155e3baf13a74505726e0c7579f`  
**Date of Audit:** 2026-11-22  

---

## 1. Risk Scoring & Taxonomy

Risks are categorized across five critical domains and prioritized using the standard risk matrix (Impact × Likelihood):
- **CRITICAL:** Immediate security vulnerability, data disclosure, unauthorized financial mutation, or catastrophic regulatory non-compliance. Must be resolved before any multi-tenant pilot launch.
- **HIGH:** Significant architectural deficiency, unauthenticated data access, or severe integrity gap that undermines multi-tenant safety.
- **MEDIUM:** Functional limitation, missing audit trail, or operational burden that affects reliability or user experience.
- **LOW:** Code cleanliness, documentation drift, or non-blocking technical debt.

---

## 2. Comprehensive Risk Register

| Risk ID | Category | Title | Severity | Affected Components | Impact & Likelihood | Mitigation Strategy |
| :---: | :---: | :--- | :---: | :--- | :--- | :--- |
| **RSK-SEC-01** | Security & Auth | **Unauthenticated SaaS Access & Missing Route Guards** | **CRITICAL** | `src/App.tsx`, `AcademyHubPage.tsx`, `PartnerOnboardingPage.tsx` | **Impact: Extreme / Likelihood: Certain.** Any anonymous user can navigate to `/academy-hub` and access academy management interfaces without authenticating. | Implement an authenticated route guard (`RequireTenantMembership`) in `App.tsx` checking active Supabase session and membership. |
| **RSK-SEC-02** | Security & Auth | **Client-Side Role Switching in Academy Hub** | **CRITICAL** | `src/modules/academies/AcademyHubPage.tsx` (Lines 832–848) | **Impact: Extreme / Likelihood: Certain.** Users can switch between Director, Head Coach, and Front Desk via an HTML select dropdown, bypassing all intended role restrictions. | Remove the client-side role dropdown. Derive user role dynamically from `public.tenant_memberships` in the authenticated session. |
| **RSK-SEC-03** | Security & Auth | **Arbitrary Workspace Switching Across Tenants** | **CRITICAL** | `src/modules/academies/AcademyHubPage.tsx` (Lines 816–827) | **Impact: Extreme / Likelihood: Certain.** Any visitor can switch to Bengaluru FC Academy or another tenant's workspace and view private roster data stored in browser state. | Bind workspace context strictly to tenants where `auth.uid()` has an active membership record in `public.tenant_memberships`. |
| **RSK-PRIV-01** | Data Privacy | **Minor Student PII Stored in Unencrypted LocalStorage** | **CRITICAL** | `src/modules/academies/academySaaSClient.ts`, `parentPortalService.ts` | **Impact: Severe / Likelihood: Certain.** Minor children's names, parents' phone numbers, and dates of birth are written in plain text to browser `localStorage`, violating India's DPDP Act 2023. | Migrate all student and parent records to the encrypted, RLS-protected `public.tenant_students` PostgreSQL database. Wipe mock localStorage stores. |
| **RSK-PRIV-02** | Data Privacy | **Unauthenticated Parent Portal Access** | **HIGH** | `src/modules/parent/ParentPortalPage.tsx`, `parentPortalService.ts` | **Impact: High / Likelihood: High.** Parent portal displays student progress, attendance, and fee invoices based on mock client state without verified phone/OTP authentication. | Implement verified phone OTP authentication and link parent session (`auth.uid()`) to `tenant_students.guardian_user_id`. |
| **RSK-FIN-01** | Financial | **Conflicting Paid Listing Plans in Codebase** | **HIGH** | `src/shared/payments/listingPricing.ts`, `supabase/functions/_shared/paymentPricing.ts` | **Impact: High / Likelihood: Medium.** Repository contains pricing plans (`1_day`, `1_month`, etc.) that contradict the mandatory business rule that listings must remain 100% free. | Mark listing pricing modules strictly dormant with deprecation headers; ensure publication remains gated only by trust verification. |
| **RSK-FIN-02** | Financial | **Unverified Direct UPI VPA Configuration** | **HIGH** | `src/modules/academies/AcademyHubPage.tsx`, `saasLaunchReadinessService.ts` | **Impact: High / Likelihood: Medium.** Directors can enter arbitrary UPI VPAs without bank account holder name verification, creating risks of misdirected tuition payments or phishing. | Enforce database regex constraint (`^.+@[a-zA-Z0-9.-]+$`) and implement NPCI / bank VPA name-lookup verification before activating 0% fee collections. |
| **RSK-FIN-03** | Financial | **Client-Side Fee Ledger & Cash-in-Hand Discrepancies** | **MEDIUM** | `src/modules/academies/academySaaSClient.ts`, `saasLaunchReadinessService.ts` | **Impact: Medium / Likelihood: High.** Fee totals, arrears, and cash-in-hand figures are computed via client-side JavaScript over unvalidated arrays, risking reconciliation drift. | Shift authoritative fee calculation and invoice generation to database views and transactional RPCs on `tenant_fee_invoices` and `tenant_fee_transactions`. |
| **RSK-DATA-01** | Data Integrity | **Frontend Detached from PostgreSQL Multi-Tenant Tables** | **CRITICAL** | `src/integrations/supabase/tenant-client.ts` | **Impact: Extreme / Likelihood: Certain.** All changes made by academy directors in the UI are lost upon clearing browser cache or switching devices because the database client is never invoked. | Refactor `AcademyHubPage.tsx` to consume `tenant-client.ts` methods instead of `academySaaSClient.ts` localStorage functions. |
| **RSK-DATA-02** | Data Integrity | **Missing Staff Invitation Lifecycle & Acceptance RPC** | **HIGH** | `supabase/migrations/` | **Impact: High / Likelihood: High.** While `tenant_memberships` has an `'invited'` status, no secure cryptographic token generation or acceptance RPC exists to onboard coaches and staff safely. | Implement `create_staff_invitation()` and `accept_staff_invitation()` RPCs in Phase 3. |
| **RSK-DATA-03** | Data Integrity | **Absence of Soft-Deletion & DPDP Retention Policies** | **MEDIUM** | `supabase/migrations/` | **Impact: Medium / Likelihood: Medium.** Deleting a tenant or student executes hard SQL deletion (`CASCADE` or `RESTRICT`). There is no `deleted_at` column, audit retention, or statutory DSAR purge workflow. | Add soft-deletion columns (`deleted_at`, `archived_at`) and statutory data retention triggers in future database phases. |
| **RSK-OPS-01** | Operational | **GitHub Actions Free Quota Exhaustion** | **MEDIUM** | `.github/workflows/` | **Impact: Moderate / Likelihood: Certain.** GitHub Actions quota is exhausted. Remote CI cannot be used to validate commits or run automated pull request tests. | Enforce strict local verification (TypeScript check, ESLint, local PostgreSQL RLS test suite, Vitest) prior to pushing commits. |
| **RSK-OPS-02** | Operational | **Supabase Free Plan Resource Limits** | **MEDIUM** | Development database `hznsbxvovjxvmnchzzqt` | **Impact: Moderate / Likelihood: Medium.** Supabase free tier enforces limits on concurrent connections, compute pauses after inactivity, and 500MB storage ceiling. | Maintain lean schema indexing, purge ephemeral test logs, and implement connection pooling safeguards for multi-tenant scalability. |

---

## 3. Immediate Action Items Before Phase 2

1. **Acknowledge Prototype Status:** Document that all current UI demonstrations are client-side prototypes; no production launch can occur without database wiring.
2. **Preserve Isolation Baseline:** Ensure no future migration weakens the 49 verified RLS attack vector protections established in migrations `20261121160000` through `20261121233000`.
3. **Lock Out Payments:** Maintain Razorpay and subscription monetization in a disabled state per mandate.
