# KHELGRID SAAS PLATFORM — COMPREHENSIVE CURRENT-STATE AUDIT
## Complete Architecture & Feature Inventory, Evidence Base, and Implementation Maturity

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Short: `85f558d`)  
**Development Database Reference (Identification Only):** `hznsbxvovjxvmnchzzqt`  
**Database Access Status:** `NOT VERIFIED — DATABASE ACCESS NOT AUTHORISED` (Strictly zero remote connections made per safety rules)  
**Date of Audit:** 2026-11-22  

---

## 1. Executive Summary

A comprehensive, evidence-based architectural audit of the entire KhelGrid Software-as-a-Service (SaaS) multi-tenant platform was conducted. The audit inspected the repository's database migrations, frontend views, client services, test suites, payment modules, and documentation to determine the genuine state of multi-tenant SaaS readiness.

### Key Audit Findings:
1. **The Architectural Disconnect:** A profound architectural separation exists between the database layer and the frontend application:
   - **Database Layer (Advanced):** Six recent Phase 1 PostgreSQL migrations (`20261121160000` through `20261121233000`) establish a canonical multi-tenant schema with 8 tenant-scoped tables, composite foreign keys preventing cross-tenant linkage, Row Level Security (RLS) policies, and an isolated physical projection table (`tenant_public_directory`) with atomic trigger synchronization.
   - **Frontend Layer (Prototype/LocalStorage):** The primary SaaS UI (`AcademyHubPage.tsx`, `PartnerOnboardingPage.tsx`, `parentPortalService.ts`, `academySaaSClient.ts`) is completely detached from Supabase. It persists state in browser `localStorage`, utilizes an unauthenticated client-side role dropdown (`#academy-role-select`) and workspace switcher (`#academy-hub-select`), and relies on hardcoded mock constants (`DEFAULT_LEADS`, `DEFAULT_BATCHES`, `DEFAULT_STUDENTS`).
   - **Client Adapter (`tenant-client.ts`):** A typed Supabase client adapter exists in `src/integrations/supabase/tenant-client.ts` implementing tenant queries, but it is currently imported by **0 application UI components**.
2. **Security Controls Discrepancy:** While database RLS policies enforce that users cannot elevate roles or view other tenants' data, the web UI exposes full administrative capabilities (Director, Head Coach, Front Desk) to any anonymous browser visitor via a client-side select input with zero authentication or session validation.
3. **Maturity Level:** **High Database Design Maturity / Early Frontend Prototype**. The platform has a production-grade relational isolation architecture ready in SQL, but the frontend user experience is an unauthenticated client simulation.

---

## 2. Baseline Repository State

- **Active Branch:** `feature/saas-phase-1-acceptance-remediation`
- **Head Commit SHA:** `85f558da93472155e3baf13a74505726e0c7579f`
- **Remote Tracking:** `origin/feature/saas-phase-1-acceptance-remediation` (Synchronized)
- **Working Tree:** Clean (0 unstaged changes, 0 untracked files prior to audit documentation)
- **Local Preview Server:** Running on `http://localhost:3000/` (daemon process)
- **Remote Database Access:** **Zero connections made.** Remote development Supabase (`hznsbxvovjxvmnchzzqt`) was neither probed nor modified.

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
  - Sensitive columns (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) are physically absent from this table.
  - Trigger `trg_sync_tenant_public_directory` on `public.tenants` keeps projection in sync atomically; non-active tenants are purged automatically.

#### Frontend / Service Layer:
- **Conflicting Models:**
  - `src/modules/academies/academySaaSClient.ts` defines `RegisteredAcademy` using `slug`, `name`, `city`, `sport`, `directorName`, `directorWhatsApp`, `upiVpa`, `isCustom`. It ignores `tenant_id` UUIDs entirely, using `slug` as the primary key.
  - Roles defined in `src/shared/saas/saasLaunchReadinessService.ts` (`AcademyUserRole = 'director' | 'head_coach' | 'front_desk'`) omit database roles: `'owner'`, `'admin'`, `'coach'`, `'accountant'`, `'staff'`, and `'parent'`.
  - Tenant context in UI is passed via URL query parameter `?academy=<slug>` without checking if the currently logged-in user has an active membership in that tenant.

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
  - Current Status: 100% powered by browser `localStorage` and `DEFAULT_*` constants. Anyone can view Bengaluru FC Academy's private student roster simply by navigating to `/academy-hub?academy=bengaluru-fc-academy`.

---

### C. Parent and Student Portals

- **Database RLS Provisions:**
  - `tenant_students` includes `guardian_user_id uuid REFERENCES auth.users(id)`.
  - SELECT policy `tenant_students_member_select` allows guardians (`guardian_user_id = auth.uid()`) to view their child's record.
  - `tenant_fee_invoices` and `tenant_attendance_events` allow parent access if `EXISTS (SELECT 1 FROM tenant_students WHERE id = student_id AND guardian_user_id = auth.uid())`.
- **Frontend Reality:**
  - `src/modules/parent/parentPortalService.ts` implements mock storage (`STORAGE_KEYS.PROFILES`, `STORAGE_KEYS.ATTENDANCE`, `STORAGE_KEYS.INVOICES`).
  - When Supabase credentials or database rows are absent, `parentPortalService.ts` returns simulated trainee records.
  - No parent onboarding flow, guardian verification RPC, or SMS/WhatsApp OTP linking mechanism exists.

---

### D. Coaches and Staff

- **Database Model:**
  - Staff members are stored in `tenant_memberships` with roles `'head_coach'`, `'coach'`, `'staff'`, etc.
  - No dedicated `tenant_coaches` table exists in SQL migrations; coach certifications and bio details are not persisted in the multi-tenant schema.
- **Frontend Reality:**
  - Staff tab in `AcademyHubPage.tsx` manages `AcademyStaffMember` objects in `localStorage`.
  - `saasLaunchReadinessService.ts` specifies POCSO officer designation, but this is a static client-side flag.
  - Verification Warning: Client-submitted verification badges must never be treated as authoritative credentials.

---

### E. SaaS Dashboard & UX Inventory

| Dashboard / Route | Component | Declared Role | Actual Implementation Status |
| :--- | :--- | :--- | :--- |
| `/academy-hub` (Director) | `AcademyHubPage.tsx` | `director` | **Frontend Prototype Only** (Full UI, localStorage backed) |
| `/academy-hub` (Head Coach) | `AcademyHubPage.tsx` | `head_coach` | **Frontend Prototype Only** (Restricted tabs via client state) |
| `/academy-hub` (Front Desk) | `AcademyHubPage.tsx` | `front_desk` | **Frontend Prototype Only** (Restricted tabs via client state) |
| `/partner/onboarding` | `PartnerOnboardingPage.tsx` | Any | **Frontend Prototype Only** (Unauthenticated form, writes to localStorage) |
| `/parent` | `ParentPortalPage.tsx` | Parent | **Frontend Prototype Only** (Simulated attendance and invoices) |
| `/coach-hub` | `CoachHubPage.tsx` | Coach | **Frontend Prototype Only** (Mock trainee management) |
| `/venue-hub` | `VenueHubPage.tsx` | Venue Host | **Frontend Prototype Only** (Offline slot manager) |
| Route Protection Guards | `App.tsx` | — | **Non-Functional** (Zero auth guards; all routes publicly accessible) |

---

### F. SaaS Service Layer Inspection

#### 1. `src/shared/saas/saasLaunchReadinessService.ts`
- **Line 21–24:** `getTenantStorageKey(baseKey: string, tenantSlug: string)` uses localStorage key partitioning (`khelgrid_tenant_${cleanTenant}_${baseKey}`) rather than database isolation.
- **Line 26–43:** `validateTenantAccess` performs string equality checks on slugs (`activeTenantSlug.toLowerCase() !== entityTenantSlug.toLowerCase()`) with zero cryptographic or session verification.
- **Line 49:** `AcademyUserRole = 'director' | 'head_coach' | 'front_desk'` conflicts with the 9 roles in `tenant_memberships`.
- **Line 319–326:** `computeSimpleChecksum` is a client-side 32-bit arithmetic string hash labeled "Disaster Recovery Backups & Complete Schema Restore".
- **Line 384–449:** `getAcademyPreLaunchChecklist` generates a 5-step checklist evaluated against local component state.
- **Line 480:** Hardcoded WhatsApp contact number `https://wa.me/919876543210`.

#### 2. `src/modules/academies/academySaaSClient.ts`
- **Line 468–519:** Entire data layer (`LEADS`, `BATCHES`, `STUDENTS`, `PASSES`, `SETTINGS`, `REGISTERED_ACADEMIES`, `STAFF`, `TRANSACTIONS`) is backed by `window.localStorage` with fallbacks to `DEFAULT_*` arrays.
- **Line 524–527:** `getAcademyLeads(academySlug)` filters in-memory arrays by string slug.
- **Supabase Integration:** **Zero imports of `@supabase/supabase-js` or `realtime-client.ts`.**

#### 3. `src/modules/academies/AcademyHubPage.tsx`
- **Line 143:** `const [userRole, setUserRole] = useState<AcademyUserRole>('director')` initializes the user as Director by default.
- **Line 832–848:** `<select id="academy-role-select">` allows immediate switching between Director, Head Coach, and Front Desk without authentication.
- **Line 816–827:** `<select id="academy-hub-select">` allows instant switching between any academy in the registry, exposing all associated trainee and financial records stored in the browser.

#### 4. `src/modules/partner/PartnerOnboardingPage.tsx`
- **Line 41–51:** `handleRegisterSubmit` directly invokes `registerCustomAcademy` in `academySaaSClient.ts`, saving the academy to `localStorage` and routing immediately to `/academy-hub?academy=${newAcademy.slug}`. No Supabase Auth account is created.

#### 5. `src/integrations/supabase/tenant-client.ts`
- Cleanly designed TypeScript adapter for `public.tenants`, `public.tenant_batches`, `public.tenant_students`, `public.tenant_fee_invoices`, etc.
- **Gap:** Not connected to any user-facing frontend component.

---

## 4. SaaS Functionality & Business Readiness Matrix

Each of the 23 requested functional areas is evaluated against actual repository evidence:

| # | Feature Area | Implementation Status | Evidence & Repository Findings |
| :-: | :--- | :--- | :--- |
| 1 | Tenant registration | **PARTIALLY IMPLEMENTED** | `public.tenants` schema & `provision_initial_tenant_owner()` RPC exist and pass local PostgreSQL tests. Frontend `PartnerOnboardingPage.tsx` only writes to `localStorage`. |
| 2 | Academy onboarding | **FRONTEND PROTOTYPE ONLY** | 5-step checklist in `saasLaunchReadinessService.ts` evaluates local state. No database onboarding state machine or milestone table. |
| 3 | Owner account creation | **PARTIALLY IMPLEMENTED** | DB migration enforces `owner_id = auth.uid()` via atomic RPC. Frontend form does not trigger Supabase Auth signup. |
| 4 | Membership creation | **PARTIALLY IMPLEMENTED** | DB schema has `tenant_memberships` table with composite unique key and RLS. Frontend staff management is localStorage-only. |
| 5 | Staff invitations | **SECURITY INCOMPLETE** | `tenant_memberships` has `invited_email` and `'invited'` status columns. However, invitation token generation, email delivery, and acceptance RPCs are missing. |
| 6 | Role assignment | **SECURITY INCOMPLETE** | DB RLS has strict anti-self-promotion rules (`user_id != auth.uid()`). Frontend has an unauthenticated client role dropdown (`#academy-role-select`). |
| 7 | Academy profile management | **PARTIALLY IMPLEMENTED** | DB table `public.tenants` has RLS for owner/director. Frontend Settings tab writes only to `localStorage`. |
| 8 | Branch management | **NOT IMPLEMENTED** | Neither database migrations nor frontend UI support multi-branch academies (`tenant_branches` table does not exist). |
| 9 | Coach management | **PARTIALLY IMPLEMENTED** | DB has `'coach'` role in memberships. No dedicated `tenant_coaches` table for certifications/bio. Frontend uses localStorage. |
| 10 | Student management | **PARTIALLY IMPLEMENTED** | `tenant_students` table has composite FKs and RLS. Frontend roster UI and CSV import write only to `localStorage`. |
| 11 | Parent-child linking | **SECURITY INCOMPLETE** | `tenant_students.guardian_user_id` exists in DB. However, secure parent verification, invitation, and linking RPCs do not exist. |
| 12 | Enrolment | **PARTIALLY IMPLEMENTED** | DB tables exist. Conversion from `tenant_enquiries` to `tenant_students` exists only as a client-side localStorage function. |
| 13 | Attendance | **PARTIALLY IMPLEMENTED** | `tenant_attendance_events` table with daily unique constraint exists in DB. Frontend roll-call operates on localStorage. |
| 14 | Training records | **NOT IMPLEMENTED** | No training sessions, drills, or workout tables exist in migrations or frontend components. |
| 15 | Progress tracking | **NOT IMPLEMENTED** | No assessment or skill evaluation tables exist in migrations. Trainee cards display mock evaluation badges. |
| 16 | Fee management | **PARTIALLY IMPLEMENTED** | DB tables `tenant_fee_invoices` and `tenant_fee_transactions` exist with composite FKs. Frontend ledger operates on localStorage. |
| 17 | Notifications | **FRONTEND PROTOTYPE ONLY** | Client generates WhatsApp deep links. No server-side notification queue or in-app notification center. |
| 18 | Reporting | **FRONTEND PROTOTYPE ONLY** | Client computes statistics and exports CSVs over localStorage. No database aggregation views or reporting RPCs. |
| 19 | Tenant settings | **PARTIALLY IMPLEMENTED** | Columns exist in `public.tenants`. Frontend settings form writes to localStorage. |
| 20 | Tenant suspension | **IMPLEMENTED BUT NOT VERIFIED** | Migration `20261121220000` enforces `t.status = 'active'` in `is_tenant_member()`, locking suspended tenants. Verified in local test suite; no frontend admin UI. |
| 21 | Tenant reactivation | **IMPLEMENTED BUT NOT VERIFIED** | Updating status to `'active'` restores RLS and trigger resyncs directory. Verified in local PostgreSQL; no frontend UI. |
| 22 | Tenant data isolation | **PARTIALLY IMPLEMENTED** | Database isolation is robustly architected across 8 tables + 1 projection table with 49 verified vectors. Frontend isolation is a localStorage simulation. |
| 23 | Account deletion and retention | **BACKEND MISSING** | No soft-deletion column (`deleted_at`), no data retention policy, and no DPDP account erasure/purge procedures exist in migrations. |

---

## 5. Financial & Subscription Scope

- **Listing Fee Exemption:** Per statutory project constraints, venue, coach, trial, and academy listings are **100% free**. Listing publication is gated strictly by trust and editorial verification.
- **Listing Pricing Artifacts:** `src/shared/payments/listingPricing.ts` and `supabase/functions/_shared/paymentPricing.ts` define pricing plans (`1_day`, `1_month`, `6_months`, `1_year`, `lifelong`). These contradict the free listing mandate and must remain strictly dormant.
- **SaaS Subscription Status:** SaaS subscription monetization (e.g. ₹3,499/mo Pro tier mentioned in UI headers) is **NOT active**. Payment collection via Razorpay must remain completely disabled until explicitly authorized in a future billing phase.
- **Direct Academy Collections:** Academies collect fees directly from parents via cash or their own Direct Bank UPI VPA (`upi_vpa`). KhelGrid takes 0% commission and does not intermediate tuition payments.

---

## 6. Audit Conclusion & Baseline Takeaway

The KhelGrid multi-tenant SaaS foundation has an exceptionally strong, secure relational database design in PostgreSQL, but the application layer currently runs as an unauthenticated, client-side simulation. The primary objective of Phase 2 and subsequent phases is to connect the existing frontend interfaces to the authoritative Supabase database and enforce true authentication, session guards, and role permissions.
