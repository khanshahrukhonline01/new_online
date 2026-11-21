# KhelGrid SaaS Platform — Phase 1: Migration Review & Rollback Strategy

**Target Database:** `hznsbxvovjxvmnchzzqt.supabase.co`  
**Migration Artifact:** `supabase/migrations/20261121160000_phase1_multi_tenant_core_schema.sql`  
**Transactional Execution:** Yes (`BEGIN; ... COMMIT;`)  
**Destructive Statement Count:** 0 (`DROP` = 0, `TRUNCATE` = 0)  

---

## 1. Migration Object Breakdown

### Canonical Schema Additions
1. `public.tenants`: Core multi-tenant organization boundary.
   - UUID primary key with `gen_random_uuid()`.
   - Immutable alphanumeric slug regex: `CHECK (slug ~ '^[a-z0-9-]+$')`.
   - Distinct tenant types (`academy`, `coach`, `venue`, `tournament`).
   - Lifecycle status (`active`, `pending_verification`, `suspended`, `archived`).
   - Foreign key to `auth.users(id)` for primary owner.
   - Separate directory link column `directory_entity_id` for optional public listing claims.

2. `public.tenant_memberships`: Role-based tenant memberships.
   - Composite unique constraint `UNIQUE (tenant_id, user_id)`.
   - Strictly enumerated roles: `owner`, `director`, `admin`, `head_coach`, `coach`, `accountant`, `front_desk`, `staff`, `parent`.
   - Statuses: `active`, `invited`, `suspended`, `revoked`.

3. `public.tenant_batches`: Training batches and squad schedules.
   - Tenant-scoped uniqueness: `CONSTRAINT unique_batch_per_tenant UNIQUE (tenant_id, batch_name)`.
   - Composite key support for child tables: `CONSTRAINT uq_tenant_batch UNIQUE (tenant_id, id)`.

4. `public.tenant_students`: Student athletes.
   - Tenant foreign key with composite batch link: `FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id)`.
   - Composite key support for attendance: `CONSTRAINT uq_tenant_student UNIQUE (tenant_id, id)`.

5. `public.tenant_enquiries`: Admissions CRM.
   - Unique alphanumeric enquiry tokens.

6. `public.tenant_fee_invoices` & `public.tenant_fee_transactions`:
   - Sequential invoice tracking and append-only receipt ledger.
   - Composite integrity preventing cross-tenant transactions.

7. `public.tenant_attendance_events`:
   - Daily roll-call ledger with unique composite constraint:
     `CONSTRAINT unique_daily_attendance UNIQUE (tenant_id, batch_id, student_id, session_date)`.
   - Guarantees idempotency and prevents double-marking on the same date.

---

## 2. Server-Side Security Functions

1. `public.is_tenant_member(p_tenant_id uuid)`
   - `LANGUAGE sql STABLE SECURITY DEFINER`
   - `SET search_path = public, pg_temp`
   - Revoked from `PUBLIC`, granted strictly to `authenticated`.

2. `public.has_tenant_role(p_tenant_id uuid, p_roles text[])`
   - `LANGUAGE sql STABLE SECURITY DEFINER`
   - `SET search_path = public, pg_temp`
   - Revoked from `PUBLIC`, granted strictly to `authenticated`.

---

## 3. Preservation of Existing Data & Non-Destructive Verification

- **Public Directory Untouched:** Zero modifications to existing public catalogue tables:
  - `public.academies`
  - `public.venues`
  - `public.coaches`
  - `public.events`
  - `public.pickup_games`
- **Zero Demo Pollution:** No demo fixtures are inserted into customer tables. Seed scripts remain completely decoupled.
- **Fail-Closed Default:** In the event of an unauthenticated or cross-tenant query, RLS policies deny access by returning 0 rows.

---

## 4. Rollback Strategy & Recovery Guide

In the event that Phase 1 must be reverted during development testing, the following transactional script safely drops newly introduced SaaS tables in reverse foreign-key order without impacting any public directory data:

```sql
BEGIN;

-- Drop operational tables in reverse dependency order
DROP TABLE IF EXISTS public.tenant_attendance_events CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_transactions CASCADE;
DROP TABLE IF EXISTS public.tenant_fee_invoices CASCADE;
DROP TABLE IF EXISTS public.tenant_enquiries CASCADE;
DROP TABLE IF EXISTS public.tenant_students CASCADE;
DROP TABLE IF EXISTS public.tenant_batches CASCADE;
DROP TABLE IF EXISTS public.tenant_membership_audit_logs CASCADE;
DROP TABLE IF EXISTS public.tenant_invitations CASCADE;
DROP TABLE IF EXISTS public.tenant_memberships CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Drop security functions
DROP FUNCTION IF EXISTS public.has_tenant_role(uuid, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.is_tenant_member(uuid) CASCADE;

COMMIT;
```
*Note: This rollback script is exclusively reserved for catastrophic pre-pilot testing recovery and is never executed in production.*
