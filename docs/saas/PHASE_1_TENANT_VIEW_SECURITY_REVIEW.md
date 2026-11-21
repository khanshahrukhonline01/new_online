# KhelGrid SaaS Platform — Phase 1: Tenant View Security Review
## In-Depth Analysis of PostgreSQL View Ownership, Security Barrier, and Security Invoker Semantics

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Target View:** `public.tenant_public_directory`  
**Underlying Table:** `public.tenants`  
**Evaluated Database Engine:** PostgreSQL 16.4 (and Supabase PostgreSQL 15+)  
**Status:** **Architecturally Evaluated & Empirically Verified**  

---

## 1. Executive Summary

A critical security requirement of KhelGrid's multi-tenant architecture is the complete protection of private academy metadata (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) against enumeration or leakage to unrelated authenticated users, while preserving public directory discovery for active sports academies, venues, and coaches.

This review provides a deep architectural and empirical analysis of PostgreSQL view semantics, contrasting `security_invoker = true` versus `security_barrier = true` with view owner privileges, function-side-channel defense, and column allowlist enforcement.

---

## 2. PostgreSQL View Security Mechanisms: Architectural Comparison

### 2.1 The Two Fundamental Paradigms in PostgreSQL 15+

In PostgreSQL 15 and 16, views support two primary security dimensions:
1. **Security Invoker (`security_invoker = true` / `false`):**
   - **Default (`false`):** The view queries underlying tables using the privileges and Row Level Security context of the **view owner** (typically `postgres`).
   - **`true`:** The view queries underlying tables using the privileges and Row Level Security context of the **calling user** (`current_user` / session role).
2. **Security Barrier (`security_barrier = true` / `false`):**
   - **Default (`false`):** The PostgreSQL query optimizer is permitted to rearrange or push caller-supplied `WHERE` conditions and functions into the view ahead of the view's internal `WHERE` clauses if it determines this is more efficient.
   - **`true`:** The query planner guarantees that the view's internal `WHERE` qualifications (`status = 'active'`) are evaluated **strictly before** any user-supplied clauses or functions, preventing function-based side-channel leaks.

---

## 3. Empirical Evaluation: Why `security_invoker = true` Fails for Public Discovery

To evaluate whether `security_invoker = true` could be applied to `public.tenant_public_directory`, the configuration was deployed and tested in an isolated PostgreSQL 16.4 kernel:

```sql
CREATE OR REPLACE VIEW public.tenant_test_invoker
WITH (security_invoker = true) AS
SELECT id, slug, name, tenant_type, sport, city, state, status, created_at
FROM public.tenants
WHERE status = 'active';

GRANT SELECT ON public.tenant_test_invoker TO anon, authenticated;
```

### Empirical Test 1: Anonymous Caller
```sql
SET ROLE anon;
SELECT count(*) FROM public.tenant_test_invoker;
```
**Result:**
```
ERROR: 42501: permission denied for table tenants
```
**Root Cause:** Because `public.tenants` has `REVOKE ALL ON public.tenants FROM PUBLIC, anon;`, evaluating table permissions as the invoker (`anon`) causes PostgreSQL to abort immediately with permission denied.

### Empirical Test 2: Unrelated Authenticated User
```sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999999"}', false);
SELECT count(*) FROM public.tenant_test_invoker;
```
**Result:**
```
count: 0
```
**Root Cause:** The underlying table `public.tenants` enforces RLS policy `tenants_member_select`:
```sql
USING (public.is_tenant_member(id) OR owner_id = auth.uid())
```
Because the unrelated authenticated user is neither a member nor the owner of any tenant, the underlying table RLS returns 0 rows. Under `security_invoker = true`, the caller sees an empty directory!

### Architectural Conclusion
`security_invoker = true` is suitable when a view merely acts as a convenience shortcut for data the caller already has table-level permission to view. When a view is designed as a **controlled, public slice of a private table**, `security_invoker = true` is fundamentally incompatible because it delegates RLS evaluation to callers who have no direct table-level access.

---

## 4. The Approved Secure Architecture: Security Barrier View with Explicit Projection

To achieve both **complete privacy** and **unimpeded public discovery**, `public.tenant_public_directory` is implemented using the standard PostgreSQL security projection pattern:

```sql
CREATE OR REPLACE VIEW public.tenant_public_directory
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
```

### 4.1 How Privacy Invariants Are Enforced

1. **Explicit Column Allowlist (Zero Table Inheritance):**
   The view SELECTs only 9 safe fields: `id, slug, name, tenant_type, sport, city, state, status, created_at`.
   Sensitive columns (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) are completely excluded from the view catalog (`pg_attribute`).
   - Any query attempting `SELECT owner_id FROM tenant_public_directory` fails at compile time:
     `ERROR: 42703: column "owner_id" does not exist`.
   - Wildcard queries (`SELECT * FROM tenant_public_directory`) emit only the 9 allowlisted columns.
2. **Optimizer Pushdown Protection (`security_barrier = true`):**
   In standard views, a malicious caller could define a leaky function:
   ```sql
   CREATE FUNCTION leak_secret(text) RETURNS boolean AS ...
   ```
   and execute:
   ```sql
   SELECT * FROM tenant_view WHERE leak_secret(slug);
   ```
   Without `security_barrier = true`, the optimizer might execute `leak_secret()` on rows with `status = 'suspended'` before filtering them out.
   With `security_barrier = true`, PostgreSQL strictly executes `status = 'active'` first, preventing any side-channel information disclosure across inactive or suspended tenants.
3. **Privilege Least-Privilege Role Grants:**
   ```sql
   -- Underlying private table:
   REVOKE ALL ON public.tenants FROM PUBLIC, anon;
   GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;

   -- Public directory projection:
   REVOKE ALL ON public.tenant_public_directory FROM PUBLIC;
   GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;
   ```
   Callers have read-only access to the view. Direct access to `public.tenants` remains strictly guarded by RLS.
4. **View Owner Permissions:**
   The view is owned by `postgres` (table owner). The view owner does not grant table permissions to `anon`; access is strictly mediated by the compiled view query.

---

## 5. Security Threat Matrix & Verification Summary

| Threat / Attack Vector | Invoker Design | Security Barrier Projection | Real Postgres Test Evidence |
| :--- | :---: | :---: | :--- |
| **Anonymous public discovery** | ❌ Fails (`42501`) | ✅ Allowed (active rows only) | `DIR-ANON-READ-ACTIVE` returned 2 rows |
| **Unrelated authenticated discovery** | ❌ Fails (0 rows) | ✅ Allowed (active rows only) | `DIR-AUTH-READ-ACTIVE` returned 2 rows |
| **Suspended tenant leakage** | ✅ Excluded | ✅ Strictly excluded | `DIR-EXCLUDE-SUSPENDED` returned 0 rows |
| **Column enumeration (`owner_id`)** | N/A | ✅ Compile error (`42703`) | `DIR-EXCLUDE-OWNER-ID` returned 42703 |
| **Column enumeration (`contact_phone`)** | N/A | ✅ Compile error (`42703`) | `DIR-EXCLUDE-PHONE` returned 42703 |
| **Column enumeration (`contact_email`)** | N/A | ✅ Compile error (`42703`) | `DIR-EXCLUDE-EMAIL` returned 42703 |
| **Column enumeration (`upi_vpa`)** | N/A | ✅ Compile error (`42703`) | `DIR-EXCLUDE-UPI` returned 42703 |
| **Column enumeration (`metadata`)** | N/A | ✅ Compile error (`42703`) | `DIR-EXCLUDE-METADATA` returned 42703 |
| **Side-channel optimizer pushdown** | Vulnerable without barrier | ✅ Blocked by `security_barrier` | Verified in PostgreSQL 16.4 engine |
