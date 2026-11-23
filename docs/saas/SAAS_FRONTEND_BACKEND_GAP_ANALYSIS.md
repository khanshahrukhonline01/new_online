# KHELGRID SAAS PLATFORM — FRONTEND / BACKEND GAP ANALYSIS
## Architectural Mismatches, Persistence Divergence, Authorization Bypasses, and Service Layer Realities

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Short: `85f558d`)  
**Audit Documentation Commit:** `fd7a0f16ca68a2f5845216a10b6859ad8e2f7932` (Short: `fd7a0f1`)  
**Premature Implementation Commit:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233` (Short: `38e5b0b`)  
**Current Branch HEAD SHA:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`  
**Date of Audit & Reconciliation:** 2026-11-22  
**Implementation Governance:** **PHASE 1 AUDIT ONLY — PHASE 2 NOT APPROVED — PROTOTYPES PRESERVED AS UNACCEPTED WORK**

---

## 1. Executive Summary: The Split-Brain Architecture

The KhelGrid SaaS platform exhibits an architectural disconnect between backend database controls and frontend user interfaces:
- **Backend (PostgreSQL):** Advanced multi-tenant relational schema with 8 isolated tables, composite foreign keys preventing cross-tenant corruption, robust RLS policies, atomic owner provisioning, and a synchronized public directory projection table.
- **Frontend (React / TypeScript):** High-fidelity B2B academy management UI (`AcademyHubPage.tsx`) covering 12 operational tabs. In commit `38e5b0b`, premature wiring to `tenant-client.ts` was introduced, but it still falls back to browser `localStorage` and mock constants when unauthenticated.
- **Route Guard Protection Gap (HIGH):** The `<RequireTenantMember>` route guard is **NOT mounted** in `src/App.tsx`.
- **Client-Side Role Selector (MEDIUM):** An unauthenticated role dropdown (`#academy-role-select`) remains accessible in preview mode.

---

## 2. Key Architectural Disconnects & Gaps

### GAP 1: Route Guard Unmounted in `App.tsx` (HIGH Severity Finding)

An independent investigation of the route protection hierarchy revealed:
- `src/shared/components/RequireTenantMember.tsx` was created in commit `38e5b0b`.
- It implements checks for authentication (`user === null`), tenant loading, active tenant resolution, and tenant membership status (`status === 'active'`).
- **However, in `src/App.tsx` (lines 340–344), `RequireTenantMember` is neither imported nor mounted on the `/academy-hub` route:**
  ```tsx
  // src/App.tsx lines 340-344
  <Route
    path="/academy-hub"
    element={
      <TenantProvider>
        <AcademyHubPage />
      </TenantProvider>
    }
  />
  ```
- **Consequence:** Any anonymous visitor can navigate directly to `/academy-hub` or `/academies/manage`.
- Because the route is not protected, `AcademyHubPage.tsx` falls back to its demo sandbox mode, rendering administrative interfaces with mock data.
- While authoritative database RLS prevents unauthorized data access, the frontend route fails open to an interactive preview rather than failing closed to an authentication barrier.

---

### GAP 2: Client-Side Role Selector in Academy Hub (MEDIUM Severity Finding)

In `src/modules/academies/AcademyHubPage.tsx` (lines 948–994):
- When `verifiedRole` is absent (unauthenticated / unlinked visitor), a role selector `<select id="academy-role-select">` is rendered.
- **Code Inspection:**
  ```tsx
  <select
    id="academy-role-select"
    value={userRole}
    onChange={(e) => setUserRole(e.target.value as AcademyRole)}
  >
    <option value="director">Academy Director</option>
    <option value="head_coach">Head Coach</option>
    <option value="front_desk">Front Desk / Operations</option>
  </select>
  ```
- **Behavioral Impact:**
  1. The selector controls local React state (`userRole`).
  2. It does not modify PostgreSQL memberships or bypass database RLS on Supabase API queries.
  3. However, within the client application, it allows an unauthenticated visitor to freely toggle between Director, Head Coach, and Front Desk roles.
  4. This dynamically reconfigures the visible UI tabs, exposing administrative views (such as the financial ledger, fee records, and settings) for inspection in demo mode.

---

### GAP 3: LocalStorage Fallback vs. Relational Database

| Dimension | Frontend UI Layer | Backend Database Layer | Impact & Risk |
| :--- | :--- | :--- | :--- |
| **Primary Keys** | String slugs (`bengaluru-fc-academy`) | Standard UUIDs (`gen_random_uuid()`) | Impedance mismatch. Translation between slugs and tenant UUIDs required. |
| **Storage Mechanism** | `window.localStorage` with JSON serialization | PostgreSQL tables with type constraints | Data exists only in local browser state when unauthenticated. Refreshing on another device reverts to mock data. |
| **Integrity Checks** | Basic JS string length checks | Composite foreign keys (`ON DELETE RESTRICT`) | Trainees can be assigned to non-existent batches in localStorage; fees can be recorded against non-existent students. |
| **Data Synchronization** | None; single browser tab only | Real-time WAL triggers & transactional ACID | Multiple coaches editing attendance simultaneously overwrite localStorage keys with zero concurrency control. |

---

### GAP 4: Service Layer Reality (`tenant-client.ts`)

- In commit `38e5b0b`, `tenant-client.ts` was extended with functions for soft-deleting students and batches, converting enquiries, creating invitations, and fetching audit logs.
- `AcademyHubPage.tsx` now imports `tenant-client.ts`.
- **However, calls are wrapped in try-catch blocks that fall back to `localStorage` whenever Supabase is unavailable or the user is unauthenticated.**
- Consequently, while client adapter methods exist in the codebase, the user experience for unauthenticated visitors remains a client-side simulation.

---

## 3. Authoritative Status Declaration

- **Phase 1: Current-State Audit and Baseline — COMPLETE & ACCEPTED.**
- **Phase 2: Secure Database and Tenant Isolation — NOT APPROVED & NOT STARTED.**
- **Premature Implementation Changes: Preserved on branch but not accepted.**
