# KhelGrid SaaS Platform — Phase 1 Supabase Security Advisor Review
## Threat Modeling, Security Linter Classifications & Hardening Evidence

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Target Database:** Development Supabase Project `hznsbxvovjxvmnchzzqt`  
**Date of Review:** November 2026  
**Audited Schema:** Phase 1 Multi-Tenant Core Architecture  

---

## 1. Security Advisor Findings Matrix

Supabase Security Advisor / database linters inspect database configurations across four primary vulnerability vectors: RLS status, function search paths, over-permissive role grants, and unindexed foreign keys.

| Finding Category | Severity | Inspected Component | Finding Description | Remediation Status | Verification |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **RLS Enabled** | High | 8 Tenant Tables | Ensure all multi-tenant tables enforce Row Level Security | **RESOLVED** | RLS enabled on all 8 tables; unauthenticated access denied (`42501`) |
| **Function Search Path** | High | `is_tenant_member`<br>`has_tenant_role`<br>`is_active_tenant`<br>`provision_initial_tenant_owner` | Functions running as `SECURITY DEFINER` must set explicit `search_path` to prevent hijacking | **RESOLVED** | All 4 functions include `SET search_path = public, pg_temp` |
| **Over-Permissive Grants** | High | `public.tenants`<br>`public.tenant_memberships`<br>`public.tenant_batches`<br>`public.tenant_students`<br>`public.tenant_fee_*` | Tables must not grant default `ALL` privileges to `anon` or `PUBLIC` | **RESOLVED** | Explicit `REVOKE ALL ON ... FROM PUBLIC, anon;` applied |
| **Anonymous RPC Access** | Medium | Helper RPC functions | Privileged RPCs must not be callable by unauthenticated clients | **RESOLVED** | `REVOKE ALL FROM PUBLIC;` only `is_active_tenant` granted to `anon` (read-only boolean) |
| **Unindexed Foreign Keys** | Low | Composite Foreign Keys | Joins and integrity checks on foreign keys should use indexes | **RESOLVED** | 7 covering composite indexes created |
| **Cascade Deletions on Owner** | Medium | `tenants.owner_id` | Deleting an auth user must not accidentally orphan or cascade-delete a legal tenant entity | **RESOLVED** | `owner_id` configured with `ON DELETE RESTRICT` |

---

## 2. Detailed Technical Remediation & Audit Findings

### 2.1 Function Search Path Mutation (`SET search_path = public, pg_temp`)
- **Risk**: In PostgreSQL, when a `SECURITY DEFINER` function does not set a static search path, a malicious user can create an object (e.g., a custom table or operator) in a temporary schema `pg_temp` and force the privileged function to execute unexpected logic.
- **Remediation**: Every security function in Phase 1 includes:
  ```sql
  SET search_path = public, pg_temp
  ```
- **Proof**:
  - `public.is_tenant_member`: `SET search_path = public, pg_temp`
  - `public.has_tenant_role`: `SET search_path = public, pg_temp`
  - `public.is_active_tenant`: `SET search_path = public, pg_temp`
  - `public.provision_initial_tenant_owner`: `SET search_path = public, pg_temp`

---

### 2.2 Table-Level Least Privilege Revocations
- **Risk**: By default in standard PostgreSQL, `PUBLIC` receives read permissions on new tables created in the `public` schema.
- **Remediation**: At migration completion, Phase 1 executes explicit revocations:
  ```sql
  REVOKE ALL ON public.tenants FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_memberships FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_batches FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_students FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_fee_invoices FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_fee_transactions FROM PUBLIC, anon;
  REVOKE ALL ON public.tenant_attendance_events FROM PUBLIC, anon;
  ```
- **Live Empirical Proof**:
  Running `supabase.from('tenants').select('*')` returns `42501: permission denied for table tenants`.

---

### 2.3 Foreign Key Deletion Cascades vs. Restrictions
- **Tenant Memberships**: `ON DELETE CASCADE` (deleting an auth user cleans up their membership row).
- **Tenant Batches & Students**: `ON DELETE CASCADE` (deleting a tenant removes child records).
- **Tenant Fee Invoices & Transactions**: `student_id ON DELETE RESTRICT` (a student record with issued invoices or recorded cash receipts cannot be accidentally deleted, guaranteeing immutable financial accounting).
- **Tenant Owner**: `owner_id ON DELETE RESTRICT` (an organization's owner account cannot be deleted while the tenant exists without first transferring ownership).

---

## 3. Residual Advisory Items (Acknowledged & Controlled)

1. **PostgREST Schema Cache Refresh**:
   - Following manual SQL editor execution, PostgREST reloads its schema cache within milliseconds. The client gracefully handles cache synchronization without application restart.
2. **Supabase Free Plan Quota Compliance**:
   - The entire multi-tenant hierarchy operates well within free tier limits: standard PostgreSQL relational tables, 0 paid extensions, 0 Firebase dependencies, and 0 third-party cloud costs.
3. **No Live Payment Risk**:
   - Payment modes are strictly limited to `cash`, `direct_upi`, `bank_transfer`, `cheque`. No live Razorpay keys, webhook secrets, or paid subscriptions are enabled.
