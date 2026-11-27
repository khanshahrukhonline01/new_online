# KhelGrid Coach Workspace — RLS & Authorization Matrix

## 1. Frontend Guard Rules
- **Unauthenticated visitors:** Blocked at `App.tsx` (`/coach-dashboard*`) and `WorkspaceShell.tsx` (`/workspace/coach/*`) by `<RequireTenantMember>`, and also guarded defensively inside `CoachDashboardPage.tsx`.
- **Authenticated non-coach users (e.g., `athlete`, `parent`, `creator` without coach/academy membership):** Blocked by `<RequireTenantMember>` (`requiredTenantTypes=['coach', 'academy']`).
- **Authorized workspace members:** Active `tenant_memberships` row (`status = 'active'`, `tenant.status = 'active'`) with role in `['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']`.

## 2. Database Tables & Policies (Phase 1 Migration `20261126120000`)

| Table / RPC | `anon` | Authenticated Coach (Owner) | Other Coach / Athlete | Moderator / Admin | Enforcement Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.coach_profiles` | Denied (`REVOKE ALL`) | `SELECT`, `INSERT` (`unverified`), `UPDATE` profile fields | Denied | `SELECT`, `UPDATE` all fields | `FORCE ROW LEVEL SECURITY` + `SECURITY INVOKER` trigger `protect_coach_profile_verification()` |
| Verification columns (`verification_status`, `verified_at`, `verified_by`, `verification_feedback`) | Denied | Strictly **Immutable** on direct SQL/REST `INSERT`/`UPDATE` | Denied | Controlled via `is_coach_moderator()` / `moderate_coach_verification_submission` | `BEFORE INSERT OR UPDATE` trigger checks `current_user`, `service_role`, and `is_coach_moderator()` |
| `public.coach_verification_submissions` | Denied | `SELECT` own rows; `INSERT` (`status = 'pending'` only) | Denied | `SELECT`, `UPDATE` moderation outcomes | `FORCE ROW LEVEL SECURITY` + column-scoped `GRANT UPDATE` |
| `submit_coach_verification_request` | Denied | Allowed for own non-suspended `coach_profiles` | Denied (`RAISE EXCEPTION`) | Allowed | `SECURITY DEFINER`, `SET search_path = public, pg_temp` |
| `moderate_coach_verification_submission` | Denied | Denied (`RAISE EXCEPTION`) | Denied | Allowed | Checks `public.is_coach_moderator()` |
| `get_coach_dashboard_overview(p_tenant_id)` | Denied | Allowed when `is_tenant_member(p_tenant_id)` + coach-eligible role | Denied for unrelated tenants | Follows same tenant membership check | `SECURITY DEFINER`, explicit `auth.uid()` + `has_tenant_role()` check |

## 3. Legacy Security Notes Tracked Across Repository
- `public.coach_inquiries` (`20261107180000`), `public.reviews` (`20261101030000`), and `coachSaaSClient.ts` (`localStorage` inquiry/combine/endorsement helpers used on public modals) are isolated from the new Phase 1 Coach Workspace and remain tracked in `PHASE_PROGRESS_AND_KNOWN_ISSUES.md` for remediation in their scheduled phases.
