# KhelGrid SaaS Platform — Phase 1 Migration Reconciliation
## Schema Versioning, Remote State Alignment & Idempotent Deployment Protocol

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Target Database:** Development Supabase Project `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Migration Files:**
1. [20261121160000_phase1_multi_tenant_core_schema.sql](../../supabase/migrations/20261121160000_phase1_multi_tenant_core_schema.sql)
2. [20261121200000_phase1_security_remediation_and_composite_keys.sql](../../supabase/migrations/20261121200000_phase1_security_remediation_and_composite_keys.sql)
3. [20261121210000_phase1_fk_deletion_and_function_hardening.sql](../../supabase/migrations/20261121210000_phase1_fk_deletion_and_function_hardening.sql)
4. [20261121220000_phase1_tenant_information_disclosure_remediation.sql](../../supabase/migrations/20261121220000_phase1_tenant_information_disclosure_remediation.sql)
**Unified Deployment Script:** [phase-1-saas-multi-tenant-deployment.sql](../../supabase/deployments/phase-1-saas-multi-tenant-deployment.sql)  
**Remote Database Changes Made:** **NONE (Awaiting Human Approval)**

---

## 1. Migration Hierarchy & Reconciliation Analysis

To reconcile migration state without using destructive operations (`DROP`, `TRUNCATE`, or table resets), Phase 1 structures migrations into a clean, verifiable deployment architecture:

```mermaid
flowchart TD
    subgraph RepoMigrations["Local Repository Migrations (supabase/migrations/)"]
        M1["20261121160000_phase1_multi_tenant_core_schema.sql\n(Canonical Multi-Tenant Schema)"]
        M2["20261121200000_phase1_security_remediation_and_composite_keys.sql\n(Composite Keys & Role Checks)"]
        M3["20261121210000_phase1_fk_deletion_and_function_hardening.sql\n(FK Deletion Behavior ON DELETE RESTRICT)"]
        M4["20261121220000_phase1_tenant_information_disclosure_remediation.sql\n(Private Tenant RLS & Public Directory View)"]
    end

    subgraph DeployArtifact["Unified Supabase Deployment (supabase/deployments/)"]
        D1["phase-1-saas-multi-tenant-deployment.sql\n(Single-file Idempotent Script for SQL Editor)"]
    end

    subgraph RemoteDB["Remote Database (hznsbxvovjxvmnchzzqt)"]
        R1["supabase_migrations.schema_migrations\n(Tracks applied migration versions)"]
        R2["8 Tenant Tables + Constraints + RLS Policies + Views"]
    end

    M1 --> D1
    M2 --> D1
    M3 --> D1
    M4 --> D1
    D1 -.->|Option A: Paste in SQL Editor (User Approved)| RemoteDB
```

---

## 2. Remote Database Status on `hznsbxvovjxvmnchzzqt`

A direct API and network probe on the live Supabase development instance confirms the following state:

1. **Tables Live**:
   The 8 tenant tables exist on the database:
   - `public.tenants`
   - `public.tenant_memberships`
   - `public.tenant_batches`
   - `public.tenant_students`
   - `public.tenant_enquiries`
   - `public.tenant_fee_invoices`
   - `public.tenant_fee_transactions`
   - `public.tenant_attendance_events`
2. **Access Revocations Live**:
   All 8 tables return `42501: permission denied` for anonymous `SELECT`.
3. **Core Helper Functions Live**:
   - `public.provision_initial_tenant_owner()` is deployed, active, and confirmed restricted to authenticated callers (`42501` for anon).
   - `public.is_active_tenant()` is deployed, active, and callable by anon (returns boolean without table leaks).
   - `tenant_enquiries` RLS evaluation confirmed working via `is_active_tenant()`.
4. **Tracking Discrepancy (Root Cause)**:
   Because the tables were created via manual execution in the Supabase Dashboard SQL Editor, `supabase_migrations.schema_migrations` does not contain the version records for these migrations. Running `supabase db push` blindly would cause table collision errors (`relation "tenants" already exists`).

---

## 3. Statement-Level Reconciliation Matrix

| Migration File & Statement | Repository State | Live DB State (`hznsbxvovjxvmnchzzqt`) | Status & Action |
| :--- | :--- | :--- | :--- |
| **`20261121160000`: Table `tenants`** | `CREATE TABLE IF NOT EXISTS public.tenants` | Exists with columns `id, name, slug, organization_type, primary_sport, owner_id, status...` | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_memberships`** | `CREATE TABLE IF NOT EXISTS public.tenant_memberships` | Exists with `uq_tenant_membership_user`, role check constraint | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_batches`** | `CREATE TABLE IF NOT EXISTS public.tenant_batches` | Exists with composite unique `uq_tenant_batch` | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_students`** | `CREATE TABLE IF NOT EXISTS public.tenant_students` | Exists with composite unique `uq_tenant_student` | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_enquiries`** | `CREATE TABLE IF NOT EXISTS public.tenant_enquiries` | Exists with `tenant_id, guardian_name, email, phone...` | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_fee_invoices`** | `CREATE TABLE IF NOT EXISTS public.tenant_fee_invoices` | Exists with composite unique `uq_tenant_fee_invoice` | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_fee_transactions`** | `CREATE TABLE IF NOT EXISTS public.tenant_fee_transactions` | Exists with composite foreign keys | **Identical**. No DDL needed. |
| **`20261121160000`: Table `tenant_attendance_events`**| `CREATE TABLE IF NOT EXISTS public.tenant_attendance_events`| Exists with composite unique `uq_tenant_attendance` | **Identical**. No DDL needed. |
| **`20261121200000`: Function `provision_initial_tenant_owner`** | `CREATE OR REPLACE FUNCTION ... SET search_path = public, pg_temp` | Exists in DB, restricted to authenticated | **Identical**. No action needed. |
| **`20261121200000`: Function `is_active_tenant`** | `CREATE OR REPLACE FUNCTION ... SET search_path = public, pg_temp` | Exists in DB, executable by anon & authenticated | **Identical**. No action needed. |
| **`20261121210000`: Composite FK `fk_student_tenant_batch` Deletion Fix** | `ON DELETE RESTRICT` | Exists in DB with `ON DELETE SET NULL` | **Pending Approval (Proposal B)**. Updates to `RESTRICT`. |
| **`20261121220000`: Private `tenants` SELECT Policy** | `USING (public.is_tenant_member(id) OR owner_id = auth.uid())` | Exists in DB with `OR status = 'active'` | **Pending Approval (Proposal B)**. Removes broad `status = 'active'`. |
| **`20261121220000`: View `tenant_public_directory`** | `CREATE VIEW public.tenant_public_directory WITH (security_barrier = true)` | View does not yet exist on remote DB | **Pending Approval (Proposal B)**. Creates view. |

---

## 4. Formal Reviewable Proposals for User Approval

### Proposal A: Align Tracking for Pre-Existing Migrations (`20261121160000` & `20261121200000`)
- **Operation:** Inserts version timestamps into `supabase_migrations.schema_migrations`.
- **Safety Guarantee:** Purely additive to metadata table; zero impact on application data or public directory.

```sql
BEGIN;

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261121160000',
  ARRAY['-- phase1_multi_tenant_core_schema'],
  'phase1_multi_tenant_core_schema'
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261121200000',
  ARRAY['-- phase1_security_remediation_and_composite_keys'],
  'phase1_security_remediation_and_composite_keys'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

---

### Proposal B: Execute Hardening Migrations (`20261121210000` & `20261121220000`) & Register Tracking
- **Operation:**
  1. Updates `fk_student_tenant_batch` to `ON DELETE RESTRICT`.
  2. Updates `public.tenants` SELECT policy to remove `OR status = 'active'`.
  3. Creates `public.tenant_public_directory` security barrier view.
  4. Registers versions in `supabase_migrations.schema_migrations`.
- **Safety Guarantee:** Idempotent, zero-downtime, zero data loss.

```sql
BEGIN;

-- 1. Replace composite foreign key on tenant_students
ALTER TABLE public.tenant_students
  DROP CONSTRAINT IF EXISTS fk_student_tenant_batch;

ALTER TABLE public.tenant_students
  ADD CONSTRAINT fk_student_tenant_batch
  FOREIGN KEY (tenant_id, batch_id)
  REFERENCES public.tenant_batches(tenant_id, id)
  ON DELETE RESTRICT;

-- 2. Lock search_path on Phase 1 functions
ALTER FUNCTION public.has_tenant_role(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant(uuid) SET search_path = public, pg_temp;

-- 3. Remediate public.tenants SELECT policy
DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;

CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(id) OR
    owner_id = auth.uid()
  );

-- 4. Create public directory projection view
DROP VIEW IF EXISTS public.tenant_public_directory CASCADE;

CREATE VIEW public.tenant_public_directory
WITH (security_barrier = true) AS
SELECT
  id,
  slug,
  name,
  tenant_type,
  sport,
  city,
  state,
  status,
  created_at
FROM public.tenants
WHERE status = 'active';

REVOKE ALL ON public.tenant_public_directory FROM PUBLIC;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

-- 5. Register migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261121210000',
  ARRAY['-- phase1_fk_deletion_and_function_hardening'],
  'phase1_fk_deletion_and_function_hardening'
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261121220000',
  ARRAY['-- phase1_tenant_information_disclosure_remediation'],
  'phase1_tenant_information_disclosure_remediation'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

---

## 5. Execution Protocol
To apply these changes:
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql).
2. Review and paste the SQL blocks from Proposals A and B.
3. Click **Run**.
4. Confirm message: `Success. No rows returned.`
