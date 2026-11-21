# KHELGRID SAAS PLATFORM — DATABASE SECURITY & ARCHITECTURE AUDIT
## Schema Integrity, Row Level Security, SECURITY DEFINER Inventory, and Migration Review

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Current Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Head Commit:** `85f558da93472155e3baf13a74505726e0c7579f`  
**Target Development Supabase:** `hznsbxvovjxvmnchzzqt`  
**Remote Database Verification:** `NOT VERIFIED — DATABASE ACCESS NOT AUTHORISED` (Evaluated purely from repository migration code and local PostgreSQL test fixtures)  
**Date of Audit:** 2026-11-22  

---

## 1. Multi-Tenant Database Schema Inventory

The Phase 1 multi-tenant architecture is established across six sequential migrations:
- `20261121160000_phase1_multi_tenant_core_schema.sql`
- `20261121200000_phase1_security_remediation_and_composite_keys.sql`
- `20261121210000_phase1_fk_deletion_and_function_hardening.sql`
- `20261121220000_phase1_tenant_information_disclosure_remediation.sql`
- `20261121230000_phase1_tenant_public_directory_projection_table.sql`
- `20261121233000_phase1_projection_trigger_execute_hardening.sql`

### A. Tables and Relational Architecture

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

### B. Composite Foreign Key Protection

Cross-tenant entity manipulation (where an attacker attempts to link an entity in Tenant A to a batch or invoice in Tenant B) is prevented at the database engine level via composite foreign keys:
1. `fk_student_tenant_batch`: `(tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id)`
2. `fk_invoice_tenant_student`: `(tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)`
3. `fk_transaction_tenant_invoice`: `(tenant_id, invoice_id) REFERENCES tenant_fee_invoices(tenant_id, id)`
4. `fk_transaction_tenant_student`: `(tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)`
5. `fk_attendance_tenant_batch`: `(tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id)`
6. `fk_attendance_tenant_student`: `(tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)`

**Deletion Behavior Hardening:**
In migration `20261121210000`, `fk_student_tenant_batch` and `fk_attendance_tenant_batch` were corrected from `ON DELETE SET NULL` to `ON DELETE RESTRICT`. In PostgreSQL, setting a composite key to NULL attempts to set both `tenant_id` and `batch_id` to NULL, which fails closed on `tenant_id NOT NULL`. More importantly, in sports academy operations, coaching batches with enrolled trainees or historical attendance records must never be silently or destructively cascaded; batches must be archived (`is_active = false`) or students reassigned.

---

## 2. Row Level Security (RLS) & Authorization Policies

Row Level Security is enabled on **100% of all tenant tables** and the public projection table.

### Policy Inventory & Evolution:

#### 1. `public.tenants`
- **Historical Finding:** Initial migration `20261121160000` defined `tenants_member_select` with `USING (public.is_tenant_member(id) OR owner_id = auth.uid() OR status = 'active')`. This allowed any authenticated user to SELECT all columns (including private phone, email, and UPI VPA) of any active tenant.
- **Remediation:** Migration `20261121220000` dropped that policy and installed:
  ```sql
  CREATE POLICY "tenants_member_select" ON public.tenants
    FOR SELECT TO authenticated
    USING (public.is_tenant_member(id) OR owner_id = auth.uid());
  ```
- **Insert Policy:** `tenants_auth_insert` enforces `WITH CHECK (owner_id = auth.uid())`.
- **Update Policy:** `tenants_owner_update` enforces `owner_id = auth.uid() OR public.has_tenant_role(id, ARRAY['owner', 'director'])`.

#### 2. `public.tenant_public_directory`
- **Select Policy:** `tenant_public_directory_select` allows `anon` and `authenticated` to view rows where `status = 'active'`.
- **Write Policies:** Zero write policies exist. All client INSERT, UPDATE, DELETE operations fail closed with SQL state `42501` (permission denied). Updates occur strictly via database trigger `trg_sync_tenant_public_directory`.

#### 3. `public.tenant_memberships`
- **Select Policy:** `tenant_memberships_select` allows users to view their own memberships (`user_id = auth.uid()`) or all memberships within tenants they belong to (`public.is_tenant_member(tenant_id)`).
- **Insert Policy:** `tenant_memberships_insert` restricts adding members to owners, directors, or admins (admins cannot create owners or directors).
- **Update Policy (Anti-Self-Promotion):**
  ```sql
  CREATE POLICY "tenant_memberships_update" ON public.tenant_memberships
    FOR UPDATE TO authenticated
    USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin']))
    WITH CHECK (
      user_id != auth.uid() AND (
        (public.has_tenant_role(tenant_id, ARRAY['owner'])) OR
        (public.has_tenant_role(tenant_id, ARRAY['director']) AND role != 'owner') OR
        (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director'))
      )
    );
  ```
  This strictly prevents a user from modifying their own role (`user_id != auth.uid()`) and enforces role ceilings.
- **Delete Policy:** Allows voluntary departure (except owner), and hierarchical removal by owner, director, or admin.

#### 4. Child Entity Tables (`tenant_batches`, `tenant_students`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_attendance_events`)
- Strictly bound by `public.is_tenant_member(tenant_id)` or `public.has_tenant_role(tenant_id, ...)`.
- Parent/guardian access to invoices and attendance is scoped to `EXISTS (SELECT 1 FROM tenant_students WHERE id = student_id AND guardian_user_id = auth.uid())`.
- Unauthenticated (`anon`) access is explicitly revoked on all 8 tables.

---

## 3. SECURITY DEFINER Functions Inventory

### A. Phase 1 Multi-Tenant Functions

| Function Signature | Language / Volatility | Search Path | Granted Roles | Security Characteristics & Calling Context |
| :--- | :--- | :--- | :--- | :--- |
| `public.is_tenant_member(p_tenant_id uuid)` | `sql` / `STABLE` | `public, pg_temp` | `authenticated` | Validates active tenant + active membership for `auth.uid()`. Fails closed if tenant is suspended. |
| `public.has_tenant_role(p_tenant_id uuid, p_roles text[])` | `sql` / `STABLE` | `public, pg_temp` | `authenticated` | Validates active tenant membership and role membership for `auth.uid()`. |
| `public.is_active_tenant(p_tenant_id uuid)` | `sql` / `STABLE` | `public, pg_temp` | `anon, authenticated` | Allows anonymous public enquiries to verify tenant status without granting SELECT on `public.tenants`. |
| `public.provision_initial_tenant_owner(...)` | `plpgsql` / `VOLATILE` | `public, pg_temp` | `authenticated` | Resolves circular authorization during onboarding. Atomically creates tenant and initial owner membership. |
| `public.sync_tenant_public_directory()` | `plpgsql` / `VOLATILE` | `pg_catalog, pg_temp` | **NONE** (Revoked from PUBLIC, anon, authenticated, service_role) | Trigger function on `public.tenants`. Replaces legacy security-definer view. Synchronizes projection table. |

### B. Resolution of Security Advisor Finding 0010 (Security Definer View)

- **The Problem:** Migration `20261121220000` created `public.tenant_public_directory` as a `VIEW WITH (security_barrier = true)`. In PostgreSQL, views owned by a superuser or privileged role bypass base table RLS for callers unless configured with `security_invoker = true`. If configured with `security_invoker = true`, unauthenticated (`anon`) callers failed with `permission denied for table tenants`.
- **The Architectural Fix:** Migration `20261121230000` completely removed the view (`DROP VIEW IF EXISTS public.tenant_public_directory`) and replaced it with a **physical projection table** and an atomic trigger `trg_sync_tenant_public_directory`.
- **Security Validation:**
  - Physical table eliminates the Security Definer View advisor finding.
  - Anon has `SELECT` only on `tenant_public_directory`. Base table `public.tenants` remains completely private.
  - Trigger function `sync_tenant_public_directory()` has search path locked to `pg_catalog, pg_temp` and execute revoked from all client roles in migration `20261121233000`.

---

## 4. Migration Consistency & History Review

### Sequential Migration Timeline:
1. `20261121160000_phase1_multi_tenant_core_schema.sql`: Core schema, 8 tables, initial RLS, helper functions.
2. `20261121200000_phase1_security_remediation_and_composite_keys.sql`: Composite foreign keys, atomic owner provisioning, anti-self-promotion policies.
3. `20261121210000_phase1_fk_deletion_and_function_hardening.sql`: Foreign key ON DELETE RESTRICT corrections, search_path enforcement.
4. `20261121220000_phase1_tenant_information_disclosure_remediation.sql`: Replaced broad SELECT policy, hardened `is_tenant_member()` for tenant suspension.
5. `20261121230000_phase1_tenant_public_directory_projection_table.sql`: Converted security-barrier view to physical projection table with trigger sync.
6. `20261121233000_phase1_projection_trigger_execute_hardening.sql`: Revoked direct execute grants on trigger function from client roles.

### Superseded / Obsolete Files:
- Historical documentation references `20261121000000_phase1_tenant_tables_and_rls.sql`, `20261121120000_phase1_composite_fk_and_membership_hardening.sql`, and `20261121180000_phase1_anonymous_and_public_isolation.sql`.
- Inspection of `supabase/migrations/` confirms these older draft names were reconciled and superseded by the 6 canonical timestamped files above.
- Migration drift test `src/integrations/supabase/phase1-ci-migration-drift.test.ts` passes locally.

---

## 5. Test Evidence & Local PostgreSQL Verification

### A. Historical vs. Current Verification:
- **Historical Evidence:** A 49/49 passing RLS attack vector matrix exists in `scripts/comprehensive_postgres_rls_matrix.json` executed on 2026-11-22 01:08 IST.
- **Current Verification:**
  - `src/integrations/supabase/phase1-runner-safety.test.ts`: Passed (2 tests) verifying that test fixtures fail closed when security flags are missing.
  - `src/integrations/supabase/phase1-ci-migration-drift.test.ts`: Passed (1 test) verifying migration sequence and schema invariants.
  - `src/integrations/supabase/phase1-multi-tenant-isolation.test.ts`: Passed (10 tests) in memory.
- **Remote Supabase Verification:** Marked as `NOT VERIFIED — DATABASE ACCESS NOT AUTHORISED`. Remote development Supabase (`hznsbxvovjxvmnchzzqt`) was not queried or altered during this audit.
