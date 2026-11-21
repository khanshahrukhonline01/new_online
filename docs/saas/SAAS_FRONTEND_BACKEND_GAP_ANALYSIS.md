# KHELGRID SAAS PLATFORM — FRONTEND / BACKEND GAP ANALYSIS
## Architectural Mismatches, Persistence Divergence, Authorization Bypasses, and Service Layer Realities

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Head Commit:** `85f558da93472155e3baf13a74505726e0c7579f`  
**Date of Audit:** 2026-11-22  

---

## 1. Executive Summary: The Split-Brain Architecture

The KhelGrid SaaS platform currently exhibits a classic "split-brain" architectural disconnect:
- **Backend (PostgreSQL):** Advanced multi-tenant relational schema with 8 isolated tables, composite foreign keys preventing cross-tenant corruption, robust RLS policies, atomic owner provisioning, and a synchronized public directory projection table.
- **Frontend (React / TypeScript):** High-fidelity B2B academy management UI (`AcademyHubPage.tsx`) covering 12 operational tabs, but entirely powered by browser `localStorage`, in-memory fallback constants, and an unauthenticated client role switcher.
- **Connection Bridge:** Completely absent. The Supabase client adapter (`src/integrations/supabase/tenant-client.ts`) is fully written with TypeScript interfaces and queries, but is imported by **0 application views**.

---

## 2. Key Architectural Disconnects & Gaps

### GAP 1: LocalStorage Persistence vs. Relational Database

| Dimension | Frontend (`academySaaSClient.ts`) | Backend Database (`supabase/migrations/`) | Impact & Risk |
| :--- | :--- | :--- | :--- |
| **Primary Keys** | String slugs (e.g. `'bengaluru-fc-academy'`) | Standard UUIDs (`gen_random_uuid()`) | Complete impedance mismatch. Frontend cannot query database tables without translating slugs to tenant UUIDs. |
| **Storage Mechanism** | `window.localStorage` with JSON serialization | PostgreSQL tables with type constraints | Data exists only on the local user's browser. Refreshing on another device or incognito window wipes all changes or reverts to hardcoded mock data. |
| **Integrity Checks** | Basic JS string length checks | Composite foreign keys (`ON DELETE RESTRICT`) | Trainees can be assigned to non-existent batches in localStorage; fees can be recorded against non-existent students. |
| **Data Synchronization** | None; single browser tab only | Real-time WAL triggers & transactional ACID | Multiple coaches or staff editing attendance simultaneously will overwrite localStorage keys with zero concurrency control. |

---

### GAP 2: Client-Side Role Switcher vs. PostgreSQL RLS

In `src/modules/academies/AcademyHubPage.tsx`:
- **Line 143:**
  ```typescript
  const [userRole, setUserRole] = useState<AcademyUserRole>('director')
  ```
- **Line 832–848:**
  ```tsx
  <select
    id="academy-role-select"
    aria-label="Current Staff Role (Demo Sandbox Only)"
    value={userRole}
    onChange={e => setUserRole(e.target.value as AcademyUserRole)}
  >
    <option value="director">Director (Full Access)</option>
    <option value="head_coach">Head Coach (Batches, Attendance &amp; Kits)</option>
    <option value="front_desk">Front Desk (Leads, Passes &amp; Fee Receipts)</option>
  </select>
  ```
- **The Gap:** The UI controls tab visibility (`canRoleAccessTab`) and permission flags based entirely on this React state variable. Any visitor can grant themselves Director privileges with one click.
- **Contrast with Backend:** The database `tenant_memberships` table enforces that non-members receive zero rows, and role updates reject self-promotion (`user_id != auth.uid()`). But because the frontend never queries the database, the backend RLS policies are never exercised during UI usage.

---

### GAP 3: Unauthenticated Tenant Switching

In `src/modules/academies/AcademyHubPage.tsx`:
- **Line 816–827:**
  ```tsx
  <select
    id="academy-hub-select"
    className="academy-hub-select"
    value={selectedSlug}
    onChange={e => setSelectedSlug(e.target.value)}
  >
    {registeredAcademies.map(a => (
      <option key={a.slug} value={a.slug}>
        {a.name} ({a.city} · {a.sport}) {a.isCustom ? '★ Your Academy' : ''}
      </option>
    ))}
  </select>
  ```
- **The Gap:** The user can select any academy from the dropdown, immediately loading that academy's student list, financial ledger, and leads from `localStorage` or `DEFAULT_*` constants.
- **Contrast with Backend:** Under PostgreSQL RLS, querying `public.tenants` or child tables fails unless `public.is_tenant_member(tenant_id)` returns true. The frontend switcher completely circumvents this by passing a slug to a client-side filter: `allLeads.filter(l => l.academySlug === academySlug)`.

---

### GAP 4: Client Adapter Detachment (`tenant-client.ts`)

- File: `src/integrations/supabase/tenant-client.ts`
- Status: Defines excellent methods:
  - `getPublicTenantBySlug(slug: string)`
  - `getTenantBatches(tenantId: string)`
  - `createTenantBatch(batch: Partial<DbTenantBatch>)`
  - `getTenantStudents(tenantId: string)`
  - `createTenantStudent(student: Partial<DbTenantStudent>)`
  - `getTenantFeeInvoices(tenantId: string)`
  - `recordTenantFeeTransaction(tx: Partial<DbTenantFeeTransaction>)`
  - `recordTenantAttendance(event: Partial<DbTenantAttendanceEvent>)`
- **Inspection Finding:** Running a repository-wide search for imports of `tenant-client.ts` yields **0 results** across all views and pages in `src/`. The entire adapter is orphaned and unused by the application.

---

### GAP 5: Partner Onboarding Bypasses Authentication

In `src/modules/partner/PartnerOnboardingPage.tsx`:
- **Line 41–51:** When the registration form is submitted:
  ```typescript
  const newAcademy = registerCustomAcademy({
    name: entityName.trim(),
    sport,
    city,
    state: 'India',
    directorName: 'Academy Director',
    directorWhatsApp: phone.trim(),
    upiVpa: upiVpa.trim(),
  })
  targetRoute = `/academy-hub?academy=${newAcademy.slug}`
  ```
- **The Gap:**
  1. No Supabase Auth call (`supabase.auth.signUp`) is initiated.
  2. No database RPC (`provision_initial_tenant_owner`) is executed.
  3. The user is redirected to the academy hub as an unauthenticated visitor.
  4. The registered academy is saved solely in the browser's `localStorage` array.

---

### GAP 6: Missing Route Guards & Route Protection

In `src/App.tsx`:
- The route `/academy-hub` is rendered directly as:
  ```tsx
  <AcademyHubPage onNavigate={handleInternalNavigate} />
  ```
- There is no `<RequireAuth>` or `<RequireTenantMembership>` route wrapper.
- Any direct HTTP navigation to `http://localhost:3000/academy-hub` renders the full director dashboard immediately.

---

### GAP 7: Missing Database RPCs & Workflows

To bridge the gap between frontend features and database tables, several critical database functions are missing from `supabase/migrations/`:
1. **Lead Conversion RPC:** An atomic function `convert_enquiry_to_student(p_enquiry_id uuid, p_batch_id uuid, p_monthly_fee integer)` to safely transfer admissions CRM leads into active trainees.
2. **Staff Invitation & Acceptance Flow:** Secure cryptographic token generation, email dispatch integration, and `accept_tenant_invitation(p_token text)` RPC to associate invited emails with new `auth.users(id)` records.
3. **Parent Verification & Linking RPC:** A secure mechanism for a parent (`auth.uid()`) to claim or link to their child's record in `tenant_students` via phone number and OTP verification.
4. **Data Export & Erasure (DPDP DSAR):** Authoritative database RPC to export or anonymize minor trainee data upon statutory request.

---

## 3. Remediation Roadmap for Bridging the Gaps

1. **Phase 2:** Complete database security baseline and native PostgreSQL verification.
2. **Phase 3:** Introduce Supabase Auth wrappers, owner signup flow, and session-aware route guards (`RequireTenantMember`).
3. **Phase 4:** Wire `AcademyHubPage.tsx` to `tenant-client.ts`, replacing localStorage reads/writes with authenticated Supabase queries.
4. **Phase 5:** Implement real invitation acceptance and parent-child linking flows.
5. **Phase 6:** Implement real attendance and fee transaction recording to PostgreSQL tables.
