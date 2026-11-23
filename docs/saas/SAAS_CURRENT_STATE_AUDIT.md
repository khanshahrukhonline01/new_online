# KHELGRID SAAS PLATFORM — COMPREHENSIVE CURRENT-STATE AUDIT
## Complete Architecture & Feature Inventory, Evidence Base, and Implementation Maturity

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Short: `85f558d`)  
**Audit Documentation Commit:** `fd7a0f16ca68a2f5845216a10b6859ad8e2f7932` (Short: `fd7a0f1`)  
**Premature Implementation Commit:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233` (Short: `38e5b0b`)  
**Current Branch HEAD SHA:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`  
**Development Database Reference (Identification Only):** `hznsbxvovjxvmnchzzqt`  
**Database Access Status:** `NOT VERIFIED — DATABASE ACCESS NOT AUTHORISED` (Strictly zero remote connections made per safety rules)  
**Date of Audit & Reconciliation:** 2026-11-22  
**Implementation Governance:** **PHASE 1 AUDIT ONLY — PHASE 2 NOT APPROVED — PROTOTYPES PRESERVED AS UNACCEPTED WORK**

---

## 1. Executive Summary

A comprehensive, evidence-based architectural audit of the entire KhelGrid Software-as-a-Service (SaaS) multi-tenant platform was conducted. The audit inspected the repository's database migrations, frontend views, client services, test suites, payment modules, and documentation to determine the genuine state of multi-tenant SaaS readiness.

### Key Audit Findings:
1. **The Architectural Disconnect:** A fundamental architectural separation exists between the database layer and the frontend application:
   - **Database Layer (Advanced):** Six Phase 1 PostgreSQL migrations (`20261121160000` through `20261121233000`) establish a canonical multi-tenant schema with 8 tenant-scoped tables, composite foreign keys preventing cross-tenant linkage, Row Level Security (RLS) policies, and an isolated physical projection table (`tenant_public_directory`) with atomic trigger synchronization.
   - **Frontend Layer (Prototype/LocalStorage):** The primary SaaS UI (`AcademyHubPage.tsx`, `PartnerOnboardingPage.tsx`, `parentPortalService.ts`, `academySaaSClient.ts`) was initially built as an unauthenticated client prototype. In commit `38e5b0b`, premature wiring to `tenant-client.ts` was added, but it still falls back to browser `localStorage` and mock data when unauthenticated.
   - **Route Protection Reality:** While a route guard component (`RequireTenantMember.tsx`) was created in `38e5b0b`, it is **NOT mounted** in `src/App.tsx`. The `/academy-hub` route remains accessible without authentication (HIGH finding).
   - **Client-Side Role Selector:** An unauthenticated role selector (`#academy-role-select`) remains accessible in preview mode in `AcademyHubPage.tsx` (lines 948–994), allowing visitors to switch roles and render administrative tabs (MEDIUM finding).
2. **Premature Phase 2 Migration:** Migration `20261122100000_phase2_schema_consolidation_and_soft_deletion.sql` was introduced in `38e5b0b`. Static analysis classifies it as **`REQUIRES CHANGES BEFORE FUTURE REVIEW`** due to a null-email invitation logic flaw, missing soft-delete RLS policies, and its untested status on the live database.
3. **Maturity Level:** **High Database Design Maturity / Early Frontend Prototype**. The platform has a solid relational foundation, but the frontend integration and route security remain in an unapproved prototype state.

---

## 2. Baseline Repository State & Commit History

- **Active Branch:** `feature/saas-phase-1-acceptance-remediation`
- **Merge Base with Main:** `b86fe736436ca135fd5c24ddd37d19e6492e3ccf`
- **Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Prior to SaaS audit)
- **Audit Documentation Delivery:** `fd7a0f16ca68a2f5845216a10b6859ad8e2f7932`
- **Premature Implementation Commit:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`
- **Current HEAD SHA:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`
- **Remote Database Access:** **Zero connections made.** Remote development Supabase (`hznsbxvovjxvmnchzzqt`) was neither probed nor modified.
- **Actions Status:** Zero GitHub Actions minutes consumed.

---

## 3. Comprehensive SaaS Architecture Inventory

### A. Tenant & Workspace Architecture

#### Database Layer:
- **Canonical Organizations Table:** `public.tenants`
  - Columns: `id` (uuid, PK), `slug` (text, unique, regex checked), `name` (text), `tenant_type` (`academy`, `coach`, `venue`, `tournament`), `status` (`active`, `pending_verification`, `suspended`, `archived`), `owner_id` (uuid, FK `auth.users(id)`), `city`, `state`, `sport`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata` (jsonb), `created_at`, `updated_at`.
  - Referential Integrity: `owner_id` uses `ON DELETE RESTRICT` to prevent orphaned tenants if a user account is deleted.
- **Tenant Memberships Table:** `public.tenant_memberships`
  - Columns: `id` (uuid, PK), `tenant_id` (uuid, FK `public.tenants(id)`), `user_id` (uuid, FK `auth.users(id)`), `role` (`owner`, `director`, `admin`, `head_coach`, `coach`, `accountant`, `front_desk`, `staff`, `parent`), `status` (`active`, `invited`, `suspended`, `revoked`), `invited_email`, `invited_by`, `created_at`, `updated_at`.
  - Constraints: Unique constraint `unique_tenant_user UNIQUE (tenant_id, user_id)`.
- **Public Directory Projection Table:** `public.tenant_public_directory`
  - Physical table replacing the legacy security-definer view per Supabase Security Advisor finding 0010.
  - Columns strictly limited to: `id`, `slug`, `name`, `tenant_type`, `sport`, `city`, `state`, `status`, `created_at`.
  - Sensitive columns (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) are physically absent.
  - Trigger `trg_sync_tenant_public_directory` on `public.tenants` keeps projection in sync atomically; non-active tenants are purged automatically.

#### Frontend / Service Layer:
- In `38e5b0b`, `TenantContext.tsx` and `RequireTenantMember.tsx` were introduced to provide active tenant and role context.
- **Route Guard Finding (HIGH):** In `src/App.tsx`, the `/academy-hub` route is wrapped only in `<TenantProvider>`. `<RequireTenantMember>` is **NOT mounted**. Unauthenticated visitors bypass route checks.
- **Client-Side Role Selector (MEDIUM):** In `AcademyHubPage.tsx`, `#academy-role-select` is rendered in demo mode when `verifiedRole` is absent, allowing client-side role toggling for previewing UI tabs.

---

### B. Academy Management

#### Separation of Public Catalogue vs. Private Workspace:
- **Public Catalogue:**
  - Routes: `/academies` (`AcademiesPage.tsx`) and `/academy/:slug` (`AcademyDetailPage.tsx`).
  - Queries `public.academies` and `tenant_public_directory` for public marketing info, programs, photo gallery, and enquiry modals (`AcademyEnquiryModal.tsx`).
  - Free directory listing policy: All academy listings are 100% free; publication is gated strictly by editorial/trust verification, not payment.
- **Private Academy Workspace:**
  - Route: `/academy-hub` (`AcademyHubPage.tsx`).
  - Contains 12 operational tabs: Leads CRM, Batches, Students/Trainees, Fees, Financial Ledger, Attendance, Staff, Passes, Trial Passes, Kits/Inventory, Safeguarding (POCSO), Settings.
  - Current Status: Uses hybrid fallback. When unauthenticated or without backend records, falls back to `localStorage` and `DEFAULT_*` constants.

---

### C. Parent and Student Portals

- **Database RLS Provisions:**
  - `tenant_students` includes `guardian_user_id uuid REFERENCES auth.users(id)`.
  - SELECT policy allows guardians (`guardian_user_id = auth.uid()`) to view their child's record.
- **Frontend Reality:**
  - `src/modules/parent/parentPortalService.ts` implements mock storage (`STORAGE_KEYS.PROFILES`, `STORAGE_KEYS.ATTENDANCE`, `STORAGE_KEYS.INVOICES`).
  - Unauthenticated access returns simulated mock records. Verified phone OTP linking remains unbuilt.

---

### D. Coaches and Staff

- **Database Model:** Supported roles in `tenant_memberships` include `'head_coach'` and `'coach'`.
- **Frontend Model:** Roster rendering supported, but staff invitation workflow RPCs in the premature Phase 2 migration remain unverified on live PostgreSQL.

---

### E. Attendance and Ground Management

- **Database Tables:** `tenant_attendance_events` with composite uniqueness on `(tenant_id, batch_id, student_id, session_date)`.
- **Frontend Implementation:** Pitch-side roll-call interface drafted with minimum 48px touch targets, but atomic upsert to live database remains unexecuted.

---

### F. Fee Invoicing and Payments

- **Database Tables:** `tenant_fee_invoices` and `tenant_fee_transactions`.
- **Financial Rule:** Platform payments remain strictly offline cash / direct UPI VPA. Razorpay remains dormant. Listing plans remain 100% free. Grassroots Pioneer Tier (₹0/mo) displayed in `SaaSSubscriptionCard.tsx`.

---

## 4. SaaS Functionality & Business Readiness Matrix

| Feature / Domain | Database Schema | RLS Coverage | Frontend UI | Backend Client Wiring | Verified Live | Overall Readiness |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tenant Isolation** | Production-grade | 100% Fail-closed | Prototype | Partial (Drafted) | No | **Prototype** |
| **Owner Provisioning** | Atomic RPC | Enforced | Prototype | Prototype | No | **Prototype** |
| **Route Protection** | N/A | N/A | Deficient | Unmounted Guard | No | **Deficient (HIGH)** |
| **Staff Invitations** | Drafted RPC | Drafted RLS | Basic Form | Drafted | No | **Unverified** |
| **Batch Management** | Canonical Table | Enforced | Full UI | Hybrid Fallback | No | **Prototype** |
| **Student Roster** | Canonical Table | Enforced | Full UI | Hybrid Fallback | No | **Prototype** |
| **DPDP Minor Protection** | Schema Fields | Basic | Unit Masking | In-Memory Only | No | **Prototype** |
| **Pitch-Side Attendance**| Idempotent Table| Enforced | 48px Touch UI | Drafted RPC | No | **Prototype** |
| **Fee Invoicing** | Sequential Table| Enforced | Full UI | Drafted RPC | No | **Prototype** |
| **Fee Ledger Reconcil.**| Summary Table | Enforced | Unit-Tested | In-Memory Tested| No | **Prototype** |
| **Tenant Audit Logs** | Drafted Table | Drafted RLS | Drafted Tab | Drafted RPC | No | **Unverified** |
| **Hindi Localization** | N/A | N/A | Registered | Unit-Tested | Yes (UI) | **Prototype** |
| **Free Listing Guarantee**| Canonical Table| Enforced | Active | Verified Active | Yes | **Production-Ready** |
| **Razorpay Lockdown** | Dormant Functions| Disabled | Inactive | Verified Disabled | Yes | **Production-Ready** |

---

## 5. Governance and Acceptance Status

- **Phase 1: Current-State Audit and Baseline — COMPLETE & ACCEPTED.**
- **Phase 2: Secure Database and Tenant Isolation — NOT APPROVED & NOT STARTED.**
- **Premature Implementation Changes: Preserved on branch but not accepted.**
