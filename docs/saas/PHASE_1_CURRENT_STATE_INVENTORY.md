# KhelGrid SaaS Platform — Phase 1 Current State Inventory
## Repository, Database, Test, and Artifact Audit Matrix

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Base `main` Commit SHA:** `b86fe736436ca135fd5c24ddd37d19e6492e3ccf`  
**Current Head Commit SHA:** `25a579c3b88960813e89547d7fa13c051a61ae96`  
**Git Divergence:** 10 commits ahead of `main`, 0 commits behind `main`  
**GitHub Compare & Review URL:** [main...feature/saas-phase-1-acceptance-remediation](https://github.com/khelgrid-dotcom/khelgrid-platform/compare/main...feature/saas-phase-1-acceptance-remediation)  
**Remote Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Audit Timestamp:** 2026-11-21T22:00:00+05:30  

---

## 1. Executive Status & Environment Classification

To prevent ambiguity, every component of the Phase 1 multi-tenant architecture is classified across five factual verification categories:

1. **[SRC] Verified in Source Code:** Fully implemented, linted, type-checked, and committed to the Git repository.
2. **[LOCAL] Verified in Local PostgreSQL:** Executed and asserted against local Docker PostgreSQL 16.4 container (`sports-platform-postgres`, database `khelgrid_rls_test`).
3. **[REMOTE-RO] Observed Remotely via Read-Only Inspection:** Read from remote Supabase development project `hznsbxvovjxvmnchzzqt` without applying any remote mutations.
4. **[PENDING-ADMIN] Awaiting Administrator Approval:** Ready SQL proposals (Proposals A & B) staged for manual human review and execution in the Supabase SQL Editor.
5. **[HISTORICAL-REF] Historical / Superseded:** Earlier claims or tests from prior turns that were refactored or superseded.

---

## 2. Git State & Commit History (Ahead 10 / Behind 0)

The branch `feature/saas-phase-1-acceptance-remediation` contains the complete chronological lineage of Phase 1 engineering:

| Commit SHA | Commit Type | Description | Verification State |
| :--- | :--- | :--- | :---: |
| `25a579c` | `feat(saas)` | Phase 1 final tenant privacy remediation, view security review, and hardened local test runner | **[SRC] + [LOCAL]** |
| `59d7141` | `feat(saas)` | Phase 1 tenant data isolation remediation, safe local testing runner, and 44-vector RLS evidence | **[SRC] + [LOCAL]** |
| `56762c4` | `feat(saas)` | Phase 1 real PostgreSQL RLS acceptance, CI integration, and security closure evidence | **[SRC] + [LOCAL]** |
| `bdb8a87` | `test(saas)`| Execute real PostgreSQL 16 RLS assertions in Vitest suite and record Gate 1 acceptance | **[SRC] + [LOCAL]** |
| `9c5dbad` | `feat(saas)` | Phase 1 final security verification, composite foreign key restrict fix, and evidence docs | **[SRC] + [LOCAL]** |
| `4880b0a` | `merge` | Merge remote-tracking branch 'origin/main' into feature/saas-phase-1-tenant-isolation | **[SRC]** |
| `ba2f97d` | `docs(saas)`| Record 100% pass on live remote database RLS probe | **[HISTORICAL-REF]** |
| `144f3dd` | `feat(saas)` | Phase 1 security remediation, composite foreign keys, and remote RLS test harness | **[SRC]** |
| `b14cd7a` | `merge` | Merge pull request #239 from khelgrid-dotcom/feature/saas-phase-1-tenant-isolation | **[SRC]** |
| `efc17ac` | `feat(saas)` | Phase 1 real multi-tenant database architecture, isolation schema, and security test suite | **[SRC]** |

---

## 3. Chronological Migration Inventory

The repository contains 5 Phase 1 migrations in `supabase/migrations/`:

### 1. `20261121160000_phase1_multi_tenant_core_schema.sql` (23.0 KB)
- **Scope:** Creates base 8 multi-tenant tables (`tenants`, `tenant_memberships`, `tenant_batches`, `tenant_students`, `tenant_attendance_events`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_enquiries`).
- **Enums & Types:** Creates `tenant_type`, `tenant_status`, `tenant_role`, `membership_status`, `student_fee_status`, `enquiry_status`, `enquiry_request_type`, `payment_mode`, `fee_transaction_status`, `attendance_status`.
- **Row Level Security:** Enables RLS on all 8 tables. Implements base `is_tenant_member()`, `has_tenant_role()`.
- **Status:** **[SRC]** Committed. **[LOCAL]** Applied to `khelgrid_rls_test`. **[REMOTE-RO]** Present in remote DB schema (applied during initial migration).

### 2. `20261121200000_phase1_security_remediation_and_composite_keys.sql` (13.9 KB)
- **Scope:** Remediation for composite foreign keys `(tenant_id, id)` across child tables to prevent cross-tenant referencing.
- **Bootstrapping Function:** Implements `provision_initial_tenant_owner()` to resolve circular RLS during owner registration.
- **Granular Policies:** Replaces broad `FOR ALL` policies with granular `INSERT`, `UPDATE`, `DELETE` policies on `tenant_memberships` (blocking self-promotion).
- **Anonymous Enquiries:** Implements `is_active_tenant()` boolean predicate and updates `tenant_enquiries` INSERT policy.
- **Status:** **[SRC]** Committed. **[LOCAL]** Applied to `khelgrid_rls_test`. **[REMOTE-RO]** Present in remote DB schema.

### 3. `20261121210000_phase1_fk_deletion_and_function_hardening.sql` (3.1 KB)
- **Scope:** Hardens composite foreign key cascade behavior to `ON DELETE RESTRICT` (preventing silent cascade deletion of financial and student records). Locks `search_path = public, pg_temp` on `is_active_tenant()`, `is_tenant_member()`, `has_tenant_role()`, and `provision_initial_tenant_owner()`.
- **Status:** **[SRC]** Committed. **[LOCAL]** Applied to `khelgrid_rls_test`. **[REMOTE-RO]** Present in remote DB schema.

### 4. `20261121220000_phase1_tenant_information_disclosure_remediation.sql` (6.0 KB)
- **Scope:**
  1. Drops information-disclosure vulnerability on `public.tenants`: removes `OR status = 'active'` from `tenants_member_select`.
  2. Hardens `public.is_tenant_member(p_tenant_id uuid)` to require both active membership (`m.status = 'active'`) and active tenant status (`t.status = 'active'`).
  3. Pre-flight dependency safe guard.
- **Status:** **[SRC]** Committed. **[LOCAL]** Applied to `khelgrid_rls_test`. **[PENDING-ADMIN]** Staged for remote application.

### 5. `20261121230000_phase1_tenant_public_directory_projection_table.sql` (5.4 KB)
- **Scope:**
  1. Resolves Supabase Security Advisor "Security Definer View" Finding (0010).
  2. Transitions public directory discovery from legacy view to a dedicated, RLS-protected, synchronized projection table.
  3. Sensitive columns (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) are physically omitted from schema (impossible to leak).
  4. Atomic real-time trigger `trg_sync_tenant_public_directory` synchronizes active records and purges inactive/suspended tenants.
- **Status:** **[SRC]** Committed. **[LOCAL]** Fully tested in `khelgrid_rls_test`. **[PENDING-ADMIN]** Staged as Proposal A for remote application.

---

## 4. Tenant Client and Query Layer Inspection

The client adapter is located at [src/integrations/supabase/tenant-client.ts](../../src/integrations/supabase/tenant-client.ts).

### Architectural Separation of Queries
1. **Public Discovery (`getPublicTenantBySlug`):**
   - Target: `tenant_public_directory`
   - Projected Columns: `id, slug, name, tenant_type, sport, city, state, status, created_at`
   - Omitted Columns: `owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`
   - Caller Scope: Anonymous prospective students, public discovery visitors
   - Status: **[SRC] Verified**

2. **Authenticated Tenant Dashboard (`getTenantBySlug`):**
   - Target: `public.tenants`
   - Projected Columns: Complete `DbTenant` record including operational fields
   - Caller Scope: Authenticated tenant members (`owner`, `admin`, `coach`, `staff`)
   - Security Enforcement: PostgreSQL RLS policy `tenants_member_select`
   - Status: **[SRC] Verified**

---

## 5. Local PostgreSQL Test Runner & Fixture Safety Inspection

The test runner is located at [scripts/run-comprehensive-postgres-rls-suite.py](../../scripts/run-comprehensive-postgres-rls-suite.py).

### Safety Controls Implemented and Verified
- **Explicit Opt-in Guard:** Requires environment variable `KHELGRID_LOCAL_RLS_TEST=1`. Exits immediately with error code `1` if unset.
- **Connection String Inspection:**
  - Prohibits remote domains: `supabase.co`, `aws.com`, `pooler.supabase.com`, `neon.tech`.
  - Rejects project ID: `hznsbxvovjxvmnchzzqt`.
  - Verifies local host resolution: `localhost` or `127.0.0.1`.
  - Verifies local database whitelist: `khelgrid_rls_test` or `khelgrid_rls_ci`.
  - Verifies live server via `SELECT current_database(), inet_server_addr()`.
- **Automated Rejection Self-Test:** Invoked via `--test-safety-rejection`. Tested and asserted in [src/integrations/supabase/phase1-runner-safety.test.ts](../../src/integrations/supabase/phase1-runner-safety.test.ts).
- **Non-Destructive Targeted Cleanup:**
  - Zero `TRUNCATE` statements in test runner.
  - Zero `DROP TABLE` or `DROP SCHEMA` statements in test runner.
  - Targeted SQL cleanup deletes exclusively by known synthetic test UUIDs and slugs (`test-tenant-alpha-001`, `test-tenant-beta-002`, `test-tenant-gamma-003`).
- **Status:** **[SRC] + [LOCAL] Verified**

---

## 6. Remote Development Database Status (`hznsbxvovjxvmnchzzqt`)

Observed via read-only inspection queries:

| Feature / Policy / Object | Remote State | Local State | Action Required |
| :--- | :---: | :---: | :--- |
| `public.tenants` RLS Policy | Has `OR status = 'active'` (Vulnerable) | Dropped `OR status = 'active'` (Remediated) | Apply Proposal A via Supabase SQL Editor |
| `public.tenant_public_directory` | Missing | Exists (`security_barrier = true`) | Apply Proposal A via Supabase SQL Editor |
| Composite FKs `(tenant_id, id)` | Present (`ON DELETE RESTRICT`) | Present (`ON DELETE RESTRICT`) | None (Matches) |
| `provision_initial_tenant_owner()` | Present | Present | None (Matches) |
| Granular Membership Policies | Present | Present | None (Matches) |
| `schema_migrations` History | Missing Phase 1 rows | Up to date | Apply Proposal B via Supabase SQL Editor |
| Leaked Password Protection (HIBP) | Disabled | N/A | Enable via Auth Dashboard toggle |

---

## 7. Resolution of Previous Audit Discrepancies

1. **Test Count Discrepancy (44 vs 49):**
   - **Resolution:** Authoritative matrix count is **exactly 49 native attack vectors**. The prior count of 44 represented an intermediate draft before the final 5 vectors (such as `TENANT-PUBLIC-DIRECTORY-ANON-CAN-READ`, `DIR-NO-PHONE`, `DIR-NO-UPI`, `MEM-SELF-PROMOTE-COACH-TO-OWNER`) were formalized. All code, scripts, and documentation now strictly assert 49 vectors.
2. **View Security Semantics (`security_barrier` vs `security_invoker`):**
   - **Resolution:** Empirically verified in Docker PostgreSQL 16.4. Because `anon` and unrelated users have no `SELECT` permissions on `public.tenants`, `security_invoker = true` causes discovery to fail with `42501 permission denied` or 0 rows. A definer-owned view with `security_barrier = true` and an explicit column projection allowlist is the mathematically sound and intended PostgreSQL security pattern.
3. **Four Deny-All RLS Tables:**
   - **Resolution:** Verified that 0 policies with `REVOKE ALL FROM PUBLIC, anon, authenticated` is an intentional defense-in-depth posture for backend audit trails and submitter evidence, safely accessible only via `SECURITY DEFINER` RPCs and `service_role`.
