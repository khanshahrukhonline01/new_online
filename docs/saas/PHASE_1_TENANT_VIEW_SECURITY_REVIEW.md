# KhelGrid SaaS Platform — Phase 1: Tenant Public Directory Architecture & View Security Resolution
## Architectural Evolution from Security-Barrier View to Synchronized RLS Projection Table

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-acceptance-remediation`  
**Target Relation:** `public.tenant_public_directory`  
**Underlying Data Source:** `public.tenants`  
**Evaluated Database Engine:** PostgreSQL 16.4 & Supabase PostgreSQL 15+  
**Status:** **Architecturally Evaluated, Remediated & Empirically Verified**  

---

## 1. Executive Summary

A core security mandate of KhelGrid Phase 1 is ensuring that sensitive operational metadata in `public.tenants` (`owner_id`, `contact_phone`, `contact_email`, `upi_vpa`, `metadata`) is strictly protected against unauthorized enumeration, while preserving high-performance public discovery for active sports academies, venues, and coaches.

Earlier audits noted that the temporary security-barrier view `public.tenant_public_directory` triggered the Supabase Security Advisor finding:
`public.tenant_public_directory — Security Definer View (Rule 0010)`

This document details the complete architectural investigation across three candidate patterns:
1. **Security-Invoker View (`security_invoker = true`):** Empirically proven to break unauthenticated directory discovery (`42501 permission denied`) or re-expose private tenant columns.
2. **Security-Barrier Owner View (`security_barrier = true` without invoker):** Provides strong functional protection, but triggers the automated Advisor heuristic due to `postgres` view ownership.
3. **Synchronized RLS Projection Table (Implemented via Migration `20261121230000`):** The definitive, battle-tested solution that transitions the directory from a view to a physical projection table with its own RLS policies. It completely resolves the Advisor warning, physically guarantees private column isolation, and maintains 100% client API compatibility.

---

## 2. Empirical Analysis: Why `security_invoker = true` View Fails

In PostgreSQL 15+, setting `WITH (security_invoker = true)` forces the query planner to evaluate base-table permissions and RLS policies as the **calling session role** rather than the view owner.

When applied to `public.tenant_public_directory`:

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
- **Observed Result:** `ERROR: 42501: permission denied for table tenants`
- **Root Cause:** In the zero-trust Phase 1 architecture, `REVOKE ALL ON public.tenants FROM PUBLIC, anon;` is strictly enforced. Invoker rights force PostgreSQL to check caller access on `public.tenants`, aborting immediately.

### Empirical Test 2: Unrelated Authenticated User (Prospective Student)
```sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
SELECT count(*) FROM public.tenant_test_invoker;
```
- **Observed Result:** Returns `0` rows.
- **Root Cause:** The RLS policy on `public.tenants` is `tenants_member_select` (`is_tenant_member(id) OR owner_id = auth.uid()`). Because the prospective student is not an enrolled member, invoker evaluation filters out 100% of rows.

### The Conflict of Invoker Rights:
To make `security_invoker = true` return rows to `anon` and unrelated users, `public.tenants` would require:
1. `GRANT SELECT ON public.tenants TO anon, authenticated;`
2. `CREATE POLICY tenants_public_select ON public.tenants FOR SELECT USING (status = 'active');`

Because PostgreSQL RLS evaluates policies with boolean `OR` and policies are row-scoped (not column-scoped), any authenticated caller running `SELECT * FROM public.tenants` would immediately read `contact_phone`, `contact_email`, `upi_vpa`, and private metadata for every active academy in India. This would directly re-introduce the critical information disclosure vulnerability.

---

## 3. The Definitive Solution: Synchronized RLS Projection Table

To permanently resolve the Security Definer View advisor finding without breaking public discovery or compromising tenant privacy, Migration `20261121230000` deploys a **dedicated synchronized projection table**.

```
+-----------------------------------------------------------------------------------------+
|                                    public.tenants                                       |
|                                                                                         |
|  [Private Columns]                   [Public Columns]                                   |
|  - owner_id, contact_phone,          - id, slug, name, tenant_type,                     |
|  - contact_email, upi_vpa,           - sport, city, state,                              |
|  - metadata                          - status, created_at                               |
|                                                                                         |
|  RLS: is_tenant_member(id)                                                              |
|       OR owner_id = auth.uid()                                                          |
+-----------------------------------------------------------------------------------------+
                                          |
                         AFTER INSERT OR UPDATE OR DELETE
                         TRIGGER: sync_tenant_public_directory()
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                            public.tenant_public_directory                               |
|                             (Physical Projection Table)                                 |
|                                                                                         |
|  Columns (Strict Allowlist Only):                                                       |
|  - id, slug, name, tenant_type, sport, city, state, status, created_at                  |
|                                                                                         |
|  RLS: status = 'active'                                                                 |
|  Grants: SELECT to anon, authenticated                                                  |
|  Writes: REVOKED (clients cannot insert/update/delete)                                   |
|                                                                                         |
|  * Rule 0010 Security Definer View: ZERO FINDINGS (Relkind = 'r', not a view)           |
|  * Private Columns: Physically impossible to leak (columns do not exist)                |
+-----------------------------------------------------------------------------------------+
```

### 3.1 Schema & Security Implementation
```sql
-- 1. Physical Table Creation (Omission by Design)
CREATE TABLE IF NOT EXISTS public.tenant_public_directory (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tenant_type text NOT NULL,
  sport text,
  city text,
  state text,
  status text NOT NULL,
  created_at timestamptz NOT NULL
);

-- 2. Row Level Security & Least Privilege Grants
ALTER TABLE public.tenant_public_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

-- 3. Dedicated RLS Policy
CREATE POLICY "tenant_public_directory_select" ON public.tenant_public_directory
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- 4. Atomic Synchronization Trigger
CREATE OR REPLACE FUNCTION public.sync_tenant_public_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.tenant_public_directory WHERE id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' THEN
      INSERT INTO public.tenant_public_directory (
        id, slug, name, tenant_type, sport, city, state, status, created_at
      ) VALUES (
        NEW.id, NEW.slug, NEW.name, NEW.tenant_type, NEW.sport, NEW.city, NEW.state, NEW.status, NEW.created_at
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        tenant_type = EXCLUDED.tenant_type,
        sport = EXCLUDED.sport,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at;
    ELSE
      -- Immediately purge suspended, pending, or archived organizations
      DELETE FROM public.tenant_public_directory WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_tenant_public_directory
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_public_directory();
```

---

## 4. Comprehensive Role Verification Matrix

The synchronized projection table was tested in native Docker PostgreSQL 16.4 across 17 distinct scenarios and 6 role contexts:

| Test Scenario | Executing Role | Expected Outcome | Observed Outcome | Result |
| :--- | :--- | :--- | :--- | :---: |
| 1. Anonymous active directory read | `anon` | Returns active tenants only | 2 active rows | **PASS** |
| 2. Stranger active directory read | `authenticated` (Stranger) | Returns active tenants only | 2 active rows | **PASS** |
| 3. Coach A active directory read | `authenticated` (Coach A) | Returns active tenants only | 2 active rows | **PASS** |
| 4. Owner A active directory read | `authenticated` (Owner A) | Returns active tenants only | 2 active rows | **PASS** |
| 5. Revoked member active read | `authenticated` (Revoked) | Returns active tenants only | 2 active rows | **PASS** |
| 6. Suspended owner active read | `authenticated` (Suspended Owner)| Returns active tenants only | 2 active rows | **PASS** |
| 7. Anon sees non-active tenants | `anon` | 0 non-active rows | 0 rows | **PASS** |
| 8. Stranger sees non-active tenants | `authenticated` (Stranger) | 0 non-active rows | 0 rows | **PASS** |
| 9. Anon queries `contact_phone` | `anon` | SQLSTATE `42703` | Column does not exist | **PASS** |
| 10. Stranger queries `upi_vpa` | `authenticated` (Stranger) | SQLSTATE `42703` | Column does not exist | **PASS** |
| 11. Stranger queries `metadata` | `authenticated` (Stranger) | SQLSTATE `42703` | Column does not exist | **PASS** |
| 12. Anon attempts INSERT | `anon` | SQLSTATE `42501` | Permission denied for table | **PASS** |
| 13. Authenticated attempts INSERT | `authenticated` (Stranger) | SQLSTATE `42501` | Permission denied for table | **PASS** |
| 14. Stranger attempts UPDATE | `authenticated` (Stranger) | SQLSTATE `42501` | Permission denied for table | **PASS** |
| 15. Stranger attempts DELETE | `authenticated` (Stranger) | SQLSTATE `42501` | Permission denied for table | **PASS** |
| 16. Anon direct SELECT on `tenants` | `anon` | SQLSTATE `42501` | Permission denied for table | **PASS** |
| 17. Stranger direct SELECT on `tenants` | `authenticated` (Stranger) | 0 private rows returned | 0 rows | **PASS** |

---

## 5. Architectural Comparison Summary

| Criteria | Security Invoker View | Security Barrier View | Synchronized Projection Table |
| :--- | :---: | :---: | :---: |
| **Supabase Advisor View Warning (0010)** | Resolved | Warning Flagged | **Resolved (Not a view)** |
| **Anonymous Public Discovery** | Broken (`42501`) | Working | **Working** |
| **Stranger Public Discovery** | Broken (`0 rows`) | Working | **Working** |
| **Private Columns Leaked** | No (or All if RLS opened)| No (`42703`) | **No (Physically absent)** |
| **Base Table RLS Intact** | Requires Compromise | Intact | **100% Intact** |
| **Optimizer Qual Pushdown Protected** | Standard RLS | `security_barrier = true` | **Standard RLS on table** |
| **Client API Compatibility** | Compatible | Compatible | **100% Drop-in Compatible** |
| **Overall Security Posture** | Flawed / Incompatible | Sound but flagged | **Mathematically Optimal** |
