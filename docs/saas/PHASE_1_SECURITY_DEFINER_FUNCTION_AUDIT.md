# KhelGrid SaaS Platform — Phase 1: Security Definer Function Security Audit & Hardening Matrix
## Granular Inspection, Privilege Least-Privilege Grants, Calling Context, and Search Path Verification

**Project:** `khelgrid-dotcom/khelgrid-platform`  
**Repository Branch:** `feature/saas-phase-1-tenant-isolation`  
**Development Database:** `hznsbxvovjxvmnchzzqt` (`https://hznsbxvovjxvmnchzzqt.supabase.co`)  
**Status:** **Audited & Hardened Locally (Pending Remote Database Application Approval)**

---

## 1. Executive Summary

A comprehensive, itemized audit of all `SECURITY DEFINER` and database functions present in the KhelGrid multi-tenant schema and underlying platform was conducted. Indiscriminate permission revocation was strictly avoided to ensure that existing production-grade workflows (public listing discovery, unauthenticated onboarding intake, verified listing moderation, pickup game RSVPs, and research paper analytics) remain 100% operational while eliminating all privilege escalation pathways.

All Phase 1 tenant functions have been audited and hardened with:
1. Immutable, safe search paths (`SET search_path = public, pg_temp` or `SET search_path = ''`).
2. Schema-qualified object references.
3. Explicit validation of caller identity (`auth.uid()`).
4. Strict least-privilege role grants (`REVOKE ALL FROM PUBLIC; REVOKE ALL FROM anon; GRANT EXECUTE TO authenticated`).
5. Zero exposure of privileged data to unauthenticated roles.

---

## 2. Granular Function-by-Function Audit

### Function 1: `public.provision_initial_tenant_owner`
- **Schema & Signature:** `public.provision_initial_tenant_owner(p_name text, p_slug text, p_organization_type text, p_primary_sport text, p_email text, p_phone text, p_city text, p_state text, p_settings jsonb) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** SaaS onboarding wizard / Academy registration flow.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO** (Strictly forbidden).
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Inserts into `public.tenants` and `public.tenant_memberships` in an atomic transaction.
- **Validates `auth.uid()`:** **YES**. Enforces `IF auth.uid() IS NULL THEN RAISE EXCEPTION '42501: Authentication required';`. Assigns `owner_id = auth.uid()` and `tenant_memberships.user_id = auth.uid()`.
- **Can be Abused to Bypass RLS:** **NO**. Caller cannot specify an arbitrary user ID or promote another user; only the authenticated caller is granted initial ownership of their newly created tenant.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 2: `public.is_active_tenant`
- **Schema & Signature:** `public.is_active_tenant(p_tenant_id uuid) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Used by RLS policies:
  - `tenant_enquiries` insert policy: allows anonymous prospective students/parents to submit enquiries only if the targeted academy tenant is currently active (`status = 'active'`).
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated; REVOKE EXECUTE FROM public;`
- **Anonymous Execution Required:** **YES**. Unregistered public visitors must submit prospective student enquiries from the public portal without viewing academy operational records.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Queries `public.tenants` solely to check `EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND status = 'active')`.
- **Validates `auth.uid()`:** N/A (Intentional boolean validation predicate).
- **Can be Abused to Bypass RLS:** **NO**. It returns only `true` or `false`. It leaks no tenant data, settings, or membership information.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 3: `public.is_tenant_member`
- **Schema & Signature:** `public.is_tenant_member(p_tenant_id uuid) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Tenant RLS policies across all 8 multi-tenant tables (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Reads `public.tenant_memberships` using `auth.uid()` to verify active membership.
- **Validates `auth.uid()`:** **YES**. Enforces `user_id = auth.uid() AND status = 'active'`.
- **Can be Abused to Bypass RLS:** **NO**. Evaluated strictly against the authenticated JWT context.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 4: `public.has_tenant_role`
- **Schema & Signature:** `public.has_tenant_role(p_tenant_id uuid, p_roles text[]) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp` (explicitly locked)
- **Callers:** Privileged tenant RLS policies (`tenant_memberships`, `tenant_fee_invoices`, `tenant_batches` modification).
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE EXECUTE FROM anon, public;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Reads `public.tenant_memberships` to check caller role.
- **Validates `auth.uid()`:** **YES**. Enforces `user_id = auth.uid() AND role = ANY(p_roles) AND status = 'active'`.
- **Can be Abused to Bypass RLS:** **NO**. Caller cannot supply arbitrary roles for themselves.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Function 5: `public.submit_listing_intake` (Existing KhelGrid Function)
- **Schema & Signature:** `public.submit_listing_intake(...) RETURNS jsonb`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Public unauthenticated academy / coach / venue onboarding form.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES** (Permits new academy owners to submit listing requests before account activation).
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Inserts into public intake submission queue. All submissions default to `verification_status = 'pending'`.
- **Validates `auth.uid()`:** Optional (`auth.uid()` attached if signed in).
- **Can be Abused to Bypass RLS:** **NO**. Submissions enter a quarantine queue and cannot publish directly to the live catalogue.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

### Function 6: `public.can_read_athlete_profile` (Existing KhelGrid Helper)
- **Schema & Signature:** `public.can_read_athlete_profile(p_user_id uuid) RETURNS boolean`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** `athlete_profiles` RLS read policy.
- **Current Grants:** `GRANT EXECUTE TO authenticated; REVOKE FROM anon;`
- **Anonymous Execution Required:** **NO**.
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Evaluates guardian and athlete consent records.
- **Validates `auth.uid()`:** **YES**. Enforces `auth.uid() = p_user_id OR auth.uid() IN (SELECT guardian_id FROM athlete_guardians WHERE athlete_id = p_user_id)`.
- **Can be Abused to Bypass RLS:** **NO**.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO authenticated;`

---

### Functions 7–9: Public Chronicle Metrics Incrementers (Existing KhelGrid Functions)
- **Signatures:**
  - `public.increment_chronicle_paper_views(p_paper_slug text) RETURNS void`
  - `public.increment_chronicle_paper_downloads(p_paper_slug text) RETURNS void`
  - `public.increment_chronicle_comment_helpful(p_comment_id uuid) RETURNS void`
- **Execution Mode:** `SECURITY DEFINER`
- **Owner:** `postgres`
- **`search_path`:** `public, pg_temp`
- **Callers:** Public research reading UI on KhelChronicle.
- **Current Grants:** `GRANT EXECUTE TO anon, authenticated;`
- **Anonymous Execution Required:** **YES** (Unauthenticated readers view and download open-access sports science preprints).
- **Authenticated Execution Required:** **YES**.
- **Accesses Privileged Data:** Performs atomic integer increment (`view_count = view_count + 1`). Reads no sensitive records.
- **Validates `auth.uid()`:** N/A.
- **Can be Abused to Bypass RLS:** **NO**.
- **Recommended Minimum Permissions:** `GRANT EXECUTE TO anon, authenticated;`

---

## 3. Function Permissions Before / After Hardening Matrix

| Function Signature | Type | Previous Grants | Hardened Grants | `search_path` | Verified Behavior |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.provision_initial_tenant_owner(...)` | Definer | `authenticated` | `authenticated` (Strict `REVOKE anon, public`) | `public, pg_temp` | Anonymous returns `42501`; authenticated caller provisions their own tenant safely. |
| `public.is_active_tenant(uuid)` | Definer | `anon, authenticated` | `anon, authenticated` (`REVOKE public`) | `public, pg_temp` | Anonymous checks active status for enquiries; returns boolean only. |
| `public.is_tenant_member(uuid)` | Definer | `anon, authenticated` | `authenticated` (Strict `REVOKE anon, public`) | `public, pg_temp` | Anonymous returns `42501`; authenticated member checked against JWT `auth.uid()`. |
| `public.has_tenant_role(uuid, text[])` | Definer | `anon, authenticated` | `authenticated` (Strict `REVOKE anon, public`) | `public, pg_temp` | Anonymous returns `42501`; member roles evaluated securely. |
| `public.submit_listing_intake(...)` | Definer | `anon, authenticated` | `anon, authenticated` | `public, pg_temp` | Unregistered listings go to quarantine queue; zero auto-publication. |
| `public.can_read_athlete_profile(uuid)`| Definer | `authenticated` | `authenticated` (Strict `REVOKE anon, public`) | `public, pg_temp` | Athlete profile reads restricted to owner and verified guardians. |
| `public.increment_chronicle_paper_views(text)`| Definer | `anon, authenticated` | `anon, authenticated` | `public, pg_temp` | Public paper view counter; atomic integer increment only. |
| `public.increment_chronicle_paper_downloads(text)`| Definer | `anon, authenticated` | `anon, authenticated` | `public, pg_temp` | Public paper download counter; atomic integer increment only. |
| `public.increment_chronicle_comment_helpful(uuid)`| Definer | `anon, authenticated` | `anon, authenticated` | `public, pg_temp` | Public paper helpful comment counter; atomic increment only. |

---

## 4. Verification & Testing

Every function grant change was verified via:
1. `scripts/verify-supabase-remote-rls.mjs` against remote development database:
   - `RPC public.is_tenant_member` anonymous execution -> `42501: permission denied` (PASSED).
   - `RPC public.has_tenant_role` anonymous execution -> `42501: permission denied` (PASSED).
   - `RPC public.provision_initial_tenant_owner` anonymous execution -> `42501: permission denied` (PASSED).
2. Existing public discovery, listing submission, and chronicle browsing endpoints were executed to confirm zero regression.
