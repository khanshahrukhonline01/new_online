# KHELGRID SAAS PLATFORM — DATABASE SECURITY & ARCHITECTURE AUDIT
## Schema Integrity, Row Level Security, SECURITY DEFINER Inventory, and Migration Review

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Audit Baseline Commit:** `85f558da93472155e3baf13a74505726e0c7579f` (Short: `85f558d`)  
**Audit Documentation Commit:** `fd7a0f16ca68a2f5845216a10b6859ad8e2f7932` (Short: `fd7a0f1`)  
**Premature Implementation Commit:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233` (Short: `38e5b0b`)  
**Current Branch HEAD SHA:** `38e5b0b55fa3e74a3d164f5c489d9710caf32233`  
**Target Development Supabase:** `hznsbxvovjxvmnchzzqt`  
**Remote Database Verification:** `NOT VERIFIED — DATABASE ACCESS NOT AUTHORISED` (Evaluated purely from repository migration code and local PostgreSQL test fixtures)  
**Date of Audit & Reconciliation:** 2026-11-22  
**Implementation Governance:** **PHASE 1 AUDIT ONLY — PHASE 2 NOT APPROVED — PROTOTYPES PRESERVED AS UNACCEPTED WORK**

---

## 1. Multi-Tenant Database Schema Inventory

The Phase 1 multi-tenant architecture is established across six sequential migrations:
- `20261121160000_phase1_multi_tenant_core_schema.sql`
- `20261121200000_phase1_security_remediation_and_composite_keys.sql`
- `20261121210000_phase1_fk_deletion_and_function_hardening.sql`
- `20261121220000_phase1_tenant_information_disclosure_remediation.sql`
- `20261121230000_phase1_tenant_public_directory_projection_table.sql`
- `20261121233000_phase1_projection_trigger_execute_hardening.sql`

### Tables and Relational Architecture

| Table Name | Primary Key | Tenant Scoping Column | Key Constraints & Foreign Keys |
| :--- | :--- | :--- | :--- |
| `public.tenants` | `id` (uuid) | `id` (Self) | `slug` UNIQUE, `owner_id REFERENCES auth.users(id) ON DELETE RESTRICT`, `status` IN (`active`, `pending_verification`, `suspended`, `archived`) |
| `public.tenant_memberships` | `id` (uuid) | `tenant_id` (uuid) | `FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE`, `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`, `UNIQUE (tenant_id, user_id)` |
| `public.tenant_batches` | `id` (uuid) | `tenant_id` (uuid) | `FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE`, `UNIQUE (tenant_id, id)` |
| `public.tenant_students` | `id` (uuid) | `tenant_id` (uuid) | `UNIQUE (tenant_id, id)`, `FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE RESTRICT`, `guardian_user_id REFERENCES auth.users(id) ON DELETE SET NULL` |
| `public.tenant_enquiries` | `id` (uuid) | `tenant_id` (uuid) | `FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE`, `enquiry_token` UNIQUE |
| `public.tenant_fee_invoices` | `id` (uuid) | `tenant_id` (uuid) | `UNIQUE (tenant_id, id)`, `FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT`, `invoice_number` UNIQUE |
| `public.tenant_fee_transactions` | `id` (uuid) | `tenant_id` (uuid) | `FOREIGN KEY (tenant_id, invoice_id) REFERENCES public.tenant_fee_invoices(tenant_id, id) ON DELETE RESTRICT`, `FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT`, `receipt_number` UNIQUE |
| `public.tenant_attendance_events` | `id` (uuid) | `tenant_id` (uuid) | `UNIQUE (tenant_id, batch_id, student_id, session_date)`, `FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE RESTRICT`, `FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE CASCADE` |
| `public.tenant_public_directory` | `id` (uuid) | None (Public) | Physical projection table. Zero sensitive columns (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata` omitted). |

---

## 2. Row Level Security (RLS) Policy Analysis

Every tenant table has RLS enabled with fail-closed anonymous access denial.

1. **`public.tenants`:**
   - SELECT: Permitted only for active members via `public.is_tenant_member(id)`.
   - Anonymous access: DENIED. Non-members: DENIED.
2. **`public.tenant_memberships`:**
   - SELECT: Users may see their own memberships (`user_id = auth.uid()`) or all memberships if they hold administrative roles (`owner`, `director`, `admin`).
   - Anti-Self-Promotion: Users cannot update their own role.
3. **`public.tenant_batches`, `tenant_students`, `tenant_enquiries`:**
   - All policies enforce tenant containment via `public.is_tenant_member(tenant_id)`.
4. **`public.tenant_fee_invoices`, `tenant_fee_transactions`:**
   - Accessible only to owners, directors, admins, and accountants. Mutating transactions directly from client is blocked; inserts occur via RPC.
5. **`public.tenant_attendance_events`:**
   - Unique constraint `(tenant_id, batch_id, student_id, session_date)` guarantees idempotency. Coaches can record roll-call for their assigned squad.

---

## 3. SECURITY DEFINER Functions & Threat Model

| Function | Return Type | Security Context | search_path | Threat Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| `is_tenant_member(uuid)` | boolean | SECURITY DEFINER | `public, pg_temp` | Stable, fail-closed membership verification. |
| `has_tenant_role(uuid, text[])`| boolean | SECURITY DEFINER | `public, pg_temp` | Role-based authorization checking membership table. |
| `is_active_tenant(uuid)` | boolean | SECURITY DEFINER | `public, pg_temp` | Active tenant validation. |
| `provision_initial_tenant_owner`| uuid | SECURITY DEFINER | `public, pg_temp` | Atomic registration of tenant and owner membership in single transaction. Prevents orphaned tenants. |
| `sync_tenant_public_directory`| trigger | SECURITY DEFINER | `pg_catalog, pg_temp` | Atomic projection sync. Qualified table names prevent search_path injection. |

---

## 4. Static Review of Premature Phase 2 Database Migration

**File:** `supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql` (514 lines).  
**Static Classification:** **`REQUIRES CHANGES BEFORE FUTURE REVIEW`**.

### Detailed Static Analysis:
1. **Table Alterations (Soft Deletion):**
   - Adds nullable columns `deleted_at timestamptz` and `archived_at timestamptz` to `public.tenants`, `public.tenant_memberships`, `public.tenant_batches`, and `public.tenant_students`.
   - Uses `IF NOT EXISTS` pattern via `information_schema.columns`. Idempotent and backward-compatible with existing rows.
   - Creates partial indexes with `WHERE deleted_at IS NULL`.
2. **Function Hardening:**
   - Updates `is_tenant_member`, `has_tenant_role`, and `is_active_tenant` to check `deleted_at IS NULL` and `t.status = 'active'`.
   - Revokes EXECUTE from PUBLIC, granting strictly to authenticated/anon roles as appropriate.
3. **Trigger Function Update (`sync_tenant_public_directory`):**
   - Correctly purges soft-deleted tenants (`NEW.deleted_at IS NOT NULL`) from `tenant_public_directory`.
   - Explicitly sets `search_path = pg_catalog, pg_temp` with schema-qualified `public.tenant_public_directory`.
4. **Authoritative Operational RPCs:**
   - `soft_delete_tenant_student`: Verifies role (`owner`, `director`, `admin`, `head_coach`), sets `deleted_at = now()`, `is_active = false`.
   - `soft_delete_tenant_batch`: Verifies role, ensures zero active enrolled students before archiving.
   - `convert_enquiry_to_student`: Locks enquiry `FOR UPDATE`, atomically creates student record and marks enquiry `enrolled`.
   - `create_tenant_invitation`: Inserts invitation into `tenant_memberships`.
   - `accept_tenant_invitation`: Claims invitation for authenticated user.
   - `log_tenant_audit_event`: Writes append-only audit event.

### Identified Deficiencies & Risks:
- **Null-Email Logic Flaw in `accept_tenant_invitation`:**
  ```sql
  IF lower(trim(v_membership.invited_email)) != lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'Invitation email does not match authenticated user email';
  END IF;
  ```
  If `v_membership.invited_email` is NULL, `NULL != email` evaluates to SQL `NULL` (unknown). In PL/pgSQL, an `IF` condition evaluating to `NULL` is treated as false, so the exception block is not entered! This would permit an invitation with a NULL email to be claimed by any authenticated user.
- **Incomplete Soft-Delete RLS Policy Updates:**
  While the migration adds `deleted_at` columns, it does not update existing Phase 1 SELECT policies on `tenant_students`, `tenant_batches`, and `tenant_memberships`. Under existing Phase 1 RLS, direct client SELECT queries will continue to return soft-deleted records.
- **Unique Constraint Conflict Risk:**
  In `accept_tenant_invitation`, updating `user_id = auth.uid()` when an existing membership row for that user already exists in `tenant_memberships` triggers an unhandled `unique_tenant_user` constraint violation.
- **Monolithic Scope & Untested Execution:**
  Combines table alterations, function overrides, operational RPCs, and new table creation into a single 514-line script without staging. It has **never been applied or tested on the live development database `hznsbxvovjxvmnchzzqt`**.

---

## 5. Security Advisor Finding Verification

- **0001 (RLS Disabled):** Zero occurrences across all 9 tenant tables.
- **0010 (Security Definer View):** Remediated in Phase 1 via physical projection table `public.tenant_public_directory`.
- **Function Search Paths:** All 7 SECURITY DEFINER functions enforce strict `SET search_path = public, pg_temp` or `pg_catalog, pg_temp`.

---

## 6. Authoritative Status Declaration

- **Phase 1: Current-State Audit and Baseline — COMPLETE & ACCEPTED.**
- **Phase 2: Secure Database and Tenant Isolation — NOT APPROVED & NOT STARTED.**
- **Premature Implementation Changes: Preserved on branch but not accepted.**
