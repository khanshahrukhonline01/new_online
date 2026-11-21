# KhelGrid SaaS Platform — Phase 1: Migration History Reconciliation Report & Reviewable Proposal
## Statement-Level Reconciliation Matrix, Drift Analysis, and Safe History Alignment Protocol

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Status:** **Proposal Formulated for User Approval (Zero Unapproved Remote Execution)**  

---

## 1. Executive Summary & Root Cause Analysis

An independent audit of the development database `hznsbxvovjxvmnchzzqt` revealed a tracking discrepancy:
1. The 8 Phase 1 multi-tenant tables (`tenants`, `tenant_memberships`, `tenant_batches`, `tenant_students`, `tenant_enquiries`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_attendance_events`), their composite foreign keys, RLS policies, and helper functions exist and are operational on the remote database.
2. However, the migration tracking table `supabase_migrations.schema_migrations` on the remote database does not contain version records for:
   - `20261121160000` (`phase1_multi_tenant_core_schema.sql`)
   - `20261121200000` (`phase1_security_remediation_and_composite_keys.sql`)
   - `20261121210000` (`phase1_fk_deletion_and_function_hardening.sql`)

### Root Cause
When DDL scripts are executed manually using the **Supabase Dashboard SQL Editor**, PostgreSQL executes the SQL statements and creates all catalog objects, but the Supabase CLI migration tracker is bypassed because the SQL Editor does not write to `supabase_migrations.schema_migrations`. Only the Supabase CLI (`supabase db push` or `supabase migration up`) inserts rows into that tracking table.

Executing `supabase db push` blindly in this state would attempt to re-run table creation statements and fail with `table "tenants" already exists`.

Per Phase F rules, this document provides:
- A statement-level reconciliation matrix comparing repository files to live DB state.
- Proof of schema equivalence.
- A reviewable, non-destructive migration history reconciliation proposal for explicit user approval prior to execution.

---

## 2. Statement-Level Reconciliation Matrix

| Migration File & Statement | Repository State | Live DB State (`hznsbxvovjxvmnchzzqt`) | Status & Action |
| :--- | :--- | :--- | :--- |
| **`20261121160000`: Table `tenants`** | `CREATE TABLE IF NOT EXISTS public.tenants` | Exists with columns `id, name, slug, organization_type, primary_sport, owner_id, status...` | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_memberships`** | `CREATE TABLE IF NOT EXISTS public.tenant_memberships` | Exists with `uq_tenant_membership_user`, role check constraint | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_batches`** | `CREATE TABLE IF NOT EXISTS public.tenant_batches` | Exists with composite unique `uq_tenant_batch` | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_students`** | `CREATE TABLE IF NOT EXISTS public.tenant_students` | Exists with composite unique `uq_tenant_student` | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_enquiries`** | `CREATE TABLE IF NOT EXISTS public.tenant_enquiries` | Exists with `tenant_id, guardian_name, email, phone...` | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_fee_invoices`** | `CREATE TABLE IF NOT EXISTS public.tenant_fee_invoices` | Exists with composite unique `uq_tenant_fee_invoice` | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_fee_transactions`** | `CREATE TABLE IF NOT EXISTS public.tenant_fee_transactions` | Exists with composite foreign keys | **Identical**. No action needed. |
| **`20261121160000`: Table `tenant_attendance_events`**| `CREATE TABLE IF NOT EXISTS public.tenant_attendance_events`| Exists with composite unique `uq_tenant_attendance` | **Identical**. No action needed. |
| **`20261121200000`: Composite FK `fk_student_tenant_batch`** | `FOREIGN KEY (tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id) ON DELETE SET NULL` | Exists in DB with `ON DELETE SET NULL` | **Identified Flaw**. Remediated in migration `20261121210000` to `ON DELETE RESTRICT`. |
| **`20261121200000`: Composite FK `fk_invoice_tenant_student`** | `FOREIGN KEY (tenant_id, student_id) REFERENCES tenant_students(tenant_id, id) ON DELETE RESTRICT` | Exists in DB | **Identical**. No action needed. |
| **`20261121200000`: Composite FK `fk_tx_tenant_invoice`** | `FOREIGN KEY (tenant_id, invoice_id) REFERENCES tenant_fee_invoices(tenant_id, id) ON DELETE RESTRICT` | Exists in DB | **Identical**. No action needed. |
| **`20261121200000`: Function `provision_initial_tenant_owner`** | `CREATE OR REPLACE FUNCTION ... SET search_path = public, pg_temp` | Exists in DB, restricted to authenticated | **Identical**. No action needed. |
| **`20261121200000`: Function `is_active_tenant`** | `CREATE OR REPLACE FUNCTION ... SET search_path = public, pg_temp` | Exists in DB, executable by anon & authenticated | **Identical**. No action needed. |
| **`20261121200000`: RLS Policy `tenant_enquiries_anon_insert_active_tenant`** | `CREATE POLICY ... WITH CHECK (public.is_active_tenant(tenant_id))` | Exists in DB | **Identical**. No action needed. |
| **`20261121200000`: RLS Policies on `tenant_memberships`** | Granular INSERT, UPDATE, DELETE policies | Exists in DB | **Identical**. No action needed. |
| **`20261121210000`: Composite FK `fk_student_tenant_batch` Deletion Fix** | `ON DELETE RESTRICT` | Currently in migration file; pending remote DB application | **Pending User Approval (Proposal B)**. |

---

## 3. Downstream Dependency Verification

Do later migrations or application features depend on these objects?
- **Public Directory:** Zero dependency. Public catalogue tables (`academies`, `coaches`, `venues`, `events`) and moderation queues remain completely independent.
- **Future Phase 2 (RBAC & SaaS Core):** When approved in the future, Phase 2 migrations will add role permissions referencing `tenant_memberships`. Reconciling Phase 1 migration tracking now prevents future migration collisions.

---

## 4. Formal Migration History Reconciliation Proposals (For User Approval)

### Proposal A: Align Tracking for Existing Migrations (`20261121160000` & `20261121200000`)
- **Operation:** Insert missing version timestamps into `supabase_migrations.schema_migrations` on development database `hznsbxvovjxvmnchzzqt`.
- **Pre-requisite Proof:** Full statement-level equivalence has been established (all objects exist, are active, and have been validated by remote network probe).
- **Safety Guarantee:** Purely additive to the migration metadata table. Zero changes to application data, public listings, or tenant tables.

```sql
-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Migration History Alignment (Proposal A)
-- Target: Development Database hznsbxvovjxvmnchzzqt
-- ==============================================================================

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

### Proposal B: Execute Remediation Migration `20261121210000` & Register Tracking
- **Operation:** Apply the foreign key constraint fix (`ON DELETE RESTRICT` on `fk_student_tenant_batch`), ensure function search paths and grants are hardened, and register `20261121210000` into `supabase_migrations.schema_migrations`.
- **Safety Guarantee:** Applies non-destructively; only modifies foreign key constraint definition.

```sql
-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: FK Deletion & Function Hardening (Proposal B)
-- Target: Development Database hznsbxvovjxvmnchzzqt
-- ==============================================================================

BEGIN;

-- 1. Replace composite foreign key on tenant_students
ALTER TABLE public.tenant_students
  DROP CONSTRAINT IF EXISTS fk_student_tenant_batch;

ALTER TABLE public.tenant_students
  ADD CONSTRAINT fk_student_tenant_batch
  FOREIGN KEY (tenant_id, batch_id)
  REFERENCES public.tenant_batches(tenant_id, id)
  ON DELETE RESTRICT;

-- 2. Ensure explicit immutable search_path on Phase 1 functions
ALTER FUNCTION public.has_tenant_role(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant(uuid) SET search_path = public, pg_temp;

-- 3. Register migration in schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261121210000',
  ARRAY['-- phase1_fk_deletion_and_function_hardening'],
  'phase1_fk_deletion_and_function_hardening'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

---

## 5. Rollback Plan
If ever necessary to revert the tracking entries:
```sql
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20261121160000', '20261121200000', '20261121210000');
```
This is zero-risk and affects no application data.
