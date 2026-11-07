# KhelGrid Security Programme — Phase 3: RBAC Deployment Readiness Assessment

**Date:** November 8, 2026  
**Status:** Merged to `main` (PR #175) — Migration `20261108000000` Pending Database Execution  
**Target Database:** Supabase Development Reference `hznsbxvovjxvmnchzzqt`  
**Production Impact:** Strictly Zero (Out of Scope, Untouched)  

---

## 1. Executive Summary

Phase 3 established a unified, tamper-resistant Role-Based Access Control (RBAC) foundation across the KhelGrid platform. 

The implementation was committed to `main` via PR #175 (`24ca142`). In compliance with strict change management protocols, the database migration (`20261108000000_phase3_rbac_and_privilege_hardening.sql`) was **not applied** to the live development database.

This assessment reviews deployment prerequisites, migration safety, privilege elevation risks, and authorization boundaries.

---

## 2. RBAC Implementation Architecture Review

### 2.1 Role Model & Matrix
- **10 Unified Roles:** `athlete`, `parent`, `coach`, `scout`, `academy`, `host`, `venue_owner`, `submitter`, `moderator`, `admin`.
- **Decoupled Relational Storage:** Roles are maintained in a dedicated table (`public.user_roles`) rather than mutable user metadata in JWTs or client state.
- **Fail-Closed Default:** If a user possesses no role assignment, the authorization engine (`src/shared/auth/authorizationService.ts`) defaults to `'athlete'` for basic discovery or `null` (deny-by-default for privileged endpoints).

### 2.2 Server-Side & Database Enforcement
- **Client Route Guards Are Not Security Boundaries:** The React router guards only assist UX flow. All authorization checks are enforced inside PostgreSQL RLS policies and atomic RPC procedures.
- **Privilege Self-Elevation Prevention:**
  - `public.user_roles` has direct `INSERT`, `UPDATE`, and `DELETE` revoked from `PUBLIC`, `anon`, and `authenticated`.
  - Roles can only be assigned or revoked through atomic SECURITY DEFINER functions:
    - `public.admin_assign_role(p_target_user_id, p_role, p_notes)`
    - `public.admin_revoke_role(p_target_user_id, p_role)`
  - Both functions explicitly verify that the caller is an authenticated system administrator via `public.has_role(auth.uid(), 'admin')`.
  - Last-admin protection prevents revoking the final active administrator in the database.
- **Immutable Audit Trail:** All role assignments, revocations, and system actions are logged to `public.user_role_audit_logs`.

---

## 3. Database Deployment Readiness Checklist

### 3.1 Migration File Analysis
- **Migration:** `supabase/migrations/20261108000000_phase3_rbac_and_privilege_hardening.sql`
- **Dependency:** Must run AFTER Phase 2 remediation (`20261108040000_phase2_rls_post_merge_remediation.sql`) to guarantee that core tables have secure base RLS policies.
- **Idempotency:** Employs `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DROP POLICY IF EXISTS`.
- **Destructive Statements:** **0**. No `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` statements exist in the migration.
- **Search Path Hardening:** All created functions specify `SET search_path = public, pg_temp`.

### 3.2 Pre-Deployment Verification Status

| Check Item | Requirement | Verification Result |
|---|---|---|
| Role Enumeration Check | Roles constrained to valid platform roles | `CHECK (role IN ('athlete', ...))` enforced |
| Admin Authorization Guard | Only admins can call role management RPCs | Enforced by `has_role(auth.uid(), 'admin')` |
| Last Admin Protection | Cannot delete the last remaining admin | Enforced by `COUNT(*) <= 1` check |
| Direct Mutation Block | Anon/authenticated cannot insert into `user_roles` | `REVOKE INSERT, UPDATE, DELETE` applied |
| Client-Side Metadata Untrusted | `user_metadata.role` never used for authorization | Enforced across TypeScript services |
| Test Suite Coverage | Full test suite covers RBAC denial & grants | 16/16 tests passing in `database-security-phase3-rbac.test.ts` |

---

## 4. Deployment Sequence Recommendation

1. **Step 1:** Execute Phase 2 corrective migration:
   `20261108040000_phase2_rls_post_merge_remediation.sql`
2. **Step 2:** Execute Phase 3 RBAC migration:
   `20261108000000_phase3_rbac_and_privilege_hardening.sql`
3. **Step 3:** Seed initial system administrator via Supabase CLI / service role console.
4. **Step 4:** Execute Phase 4 authentication and session security migration:
   `20261108050000_phase4_auth_and_session_security.sql`
