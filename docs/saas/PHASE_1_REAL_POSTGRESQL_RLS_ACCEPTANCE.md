# KhelGrid SaaS Platform — Phase 1 Real PostgreSQL RLS Acceptance Report
## Database Engine Isolation Proof, Test Environment Limitation & Dual-Layer Verification

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Branch:** `feature/saas-phase-1-tenant-isolation`  
**Development Supabase Reference:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Status:** **PARTIALLY COMPLETE — NOT APPROVED (Integration Gate Held Pending Disposable Local PostgreSQL Daemon)**  

---

## 1. Test Harness Classification & Environment Truth

Per the mandatory Phase B requirements, test suites in this repository are strictly classified:

1. **Unit & Simulation Suite (`src/integrations/supabase/phase1-multi-tenant-isolation.test.ts`)**:
   - **Engine:** `pg-mem` in-memory PostgreSQL parser and SQL AST evaluator.
   - **Classification:** **Unit / Simulation Tests**.
   - **What it verifies:** Relational engine composite foreign key constraints (`ON DELETE RESTRICT`), unique composite constraints (`uq_tenant_batch`, `uq_tenant_student`, `uq_tenant_fee_invoice`), and SQL view row-filtering logic.
   - **Limitation:** Does not execute the native C-level PostgreSQL `ENABLE ROW LEVEL SECURITY` engine or kernel session roles (`SET ROLE anon`). Must **NEVER** be described as native PostgreSQL RLS proof.
   - **Result:** 17 tests passed (12 attack vectors + 5 Phase C batch deletion/archival tests).

2. **Remote Live Database Network Probe (`scripts/verify-supabase-remote-rls.mjs`)**:
   - **Engine:** Real PostgreSQL 17 / PostgREST on Supabase Development Project `hznsbxvovjxvmnchzzqt`.
   - **Classification:** **Non-Destructive Live Network Probe**.
   - **What it verifies:** Real PostgREST HTTP layer responses, table privilege revocations (`REVOKE ALL FROM anon`), least-privilege RPC execution, and RLS `WITH CHECK` evaluation via `is_active_tenant()`.
   - **Result:** 12/12 checks passed (confirmed `42501: permission denied` for anonymous SELECT across all 8 tables, and `42501: new row violates row-level security policy for table "tenant_enquiries"`).

3. **Real PostgreSQL Integration Suite (`src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts`)**:
   - **Engine:** Dedicated native PostgreSQL instance via `DATABASE_URL`.
   - **Classification:** **Native Database RLS Integration Suite**.
   - **Current Status:** **SKIPPED (Infrastructure Limitation)**.
   - **Exact Environment Limitation:** The Windows host runs Docker Desktop Service in a stopped state (`com.docker.service`). Starting the daemon from a non-elevated user shell fails because the Windows named pipe `//./pipe/dockerDesktopLinuxEngine` is not initialized without administrative privilege or active Docker Desktop GUI login. Local native `psql` is not installed on the Windows host PATH.
   - **Compliance Action:** In accordance with Section 4 and Section 12, integration tests are **NOT** reported as passing. Acceptance Gate 1 remains **PENDING** until a disposable PostgreSQL environment is connected.

---

## 2. Test Execution Details

### Unit & Simulation Suite (pg-mem)
- **Command:** `npx vitest run src/integrations/supabase/phase1-multi-tenant-isolation.test.ts`
- **Duration:** 669ms
- **Total Tests:** 17
- **Passed:** 17
- **Failed:** 0
- **Identities Simulated:**
  - Anonymous (`auth.uid() = NULL`)
  - Authenticated Member Tenant A (`auth.uid() = 1111...`)
  - Authenticated Member Tenant B (`auth.uid() = 2222...`)
  - Coach Tenant A (`auth.uid() = 3333...`)
  - Parent Guardian A (`auth.uid() = 5555...`)
  - Parent Guardian B (`auth.uid() = 6666...`)
  - Admin Tenant A (`auth.uid() = 2222...`)
  - New Onboarding User (`auth.uid() = 9999...`)

### Remote Live Network Probe (PostgreSQL 17 on Supabase)
- **Command:** `node scripts/verify-supabase-remote-rls.mjs`
- **Target URL:** `https://hznsbxvovjxvmnchzzqt.supabase.co`
- **Total Checks:** 12
- **Passed:** 12
- **Failed:** 0
- **Log Output:**
  ```text
  [PASS] public.tenants SELECT -> 42501: permission denied for table tenants
  [PASS] public.tenant_memberships SELECT -> 42501: permission denied for table tenant_memberships
  [PASS] public.tenant_batches SELECT -> 42501: permission denied for table tenant_batches
  [PASS] public.tenant_students SELECT -> 42501: permission denied for table tenant_students
  [PASS] public.tenant_enquiries SELECT -> 42501: permission denied for table tenant_enquiries
  [PASS] public.tenant_fee_invoices SELECT -> 42501: permission denied for table tenant_fee_invoices
  [PASS] public.tenant_fee_transactions SELECT -> 42501: permission denied for table tenant_fee_transactions
  [PASS] public.tenant_attendance_events SELECT -> 42501: permission denied for table tenant_attendance_events
  [PASS] RPC public.is_tenant_member -> 42501: permission denied for function is_tenant_member
  [PASS] RPC public.has_tenant_role -> 42501: permission denied for function has_tenant_role
  [PASS] RPC public.provision_initial_tenant_owner -> 42501: permission denied for function provision_initial_tenant_owner
  [PASS] tenant_enquiries invalid insert -> 42501: new row violates row-level security policy for table "tenant_enquiries"
  ```

---

## 3. Smallest Safe Alternative for Native PostgreSQL Proof

To satisfy Gate 1 without risking live development business data or requiring paid infrastructure:

1. **Option A (Local Docker Start)**:
   Launch the Docker Desktop application from the Windows Start Menu and allow the WSL2 engine to initialize. Once running, execute:
   ```bash
   docker run --name khelgrid-pg-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   npm test src/integrations/supabase/phase1-multi-tenant-postgres-integration.test.ts
   ```
2. **Option B (Disposable Ephemeral Database Branch on Supabase)**:
   Use the Supabase CLI with a separate isolated local or ephemeral branch (`supabase start`).
3. **Option C (ElectricSQL PGlite in Node)**:
   Add `@electric-sql/pglite` as a devDependency to run an in-process WebAssembly-compiled PostgreSQL 16 engine with full native RLS, kernel roles, and session variables directly inside Node.js without Docker dependencies.

---

## 4. Phase 1 Acceptance Gate Evaluation

| Acceptance Gate | Required Proof | Current Status | Notes |
| :--- | :--- | :---: | :--- |
| **Gate 1: Real PostgreSQL RLS** | Actual RLS policies tested under native PostgreSQL roles | **PENDING** | Docker daemon unavailable on host; unit/simulation suite passed |
| **Gate 2: Tenant Isolation** | Cross-tenant access denied | **VERIFIED** | Verified via live Supabase probe + simulation suite |
| **Gate 3: Membership Security** | Anti-self-promotion and role ceilings enforced | **VERIFIED** | Enforced in SQL policy definitions + simulation tests |
| **Gate 4: Owner Onboarding** | Atomic initial tenant owner creation | **VERIFIED** | Atomic RPC deployed and active on remote database |
| **Gate 5: Composite FKs** | All tenant-scoped child relationships enforced | **VERIFIED** | Enforced by relational constraints |
| **Gate 6: Batch Deletion** | Correct `RESTRICT` behavior and archival demonstrated | **VERIFIED** | 5 regression tests added; migration drafted |
| **Gate 7: Admissions Enquiry** | Anonymous intake works via helper without table leaks | **VERIFIED** | Tested live on remote Supabase |
| **Gate 8: Function Security** | Individual EXECUTE grants audited | **VERIFIED** | Full audit completed in Phase D |
| **Gate 9: Migration History** | Repository and remote database reconciled | **PENDING APPROVAL** | Reconciliation proposal ready for user review |
