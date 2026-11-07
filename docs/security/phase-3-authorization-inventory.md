# KhelGrid — Phase 3: Current-State Authorization Inventory
## Repository & Database Access Control Inventory

**Document:** Current-State Authorization Inventory  
**Programme:** KhelGrid 10-Phase Security and Authorization Programme  
**Module:** Phase 3 — Role-Based Access Control (RBAC)  
**Lead Security Architect:** Antigravity  
**Audit Date:** November 8, 2026  

---

## 1. Executive Summary

This inventory documents all authorization checks, role references, permission gates, and execution boundaries discovered across the KhelGrid React frontend, TypeScript client libraries, and PostgreSQL database schemas.

---

## 2. Frontend & Client-Tier Authorization Inventory

### 2.1 Centralized Service Integration
- **`src/shared/auth/authorizationService.ts`**: The newly established authoritative client evaluation engine:
  - Encapsulates role checking (`hasRole`) and granular permission evaluation (`hasPermission`).
  - Implements ownership-coupled checks (`canAccessResource`, `canManageListing`, `canManageVenue`, `canUpdateLiveScore`, `canManageRoles`).
  - Replaces scattered string literals with typed enums (`AppRole`, `AppPermission`, `ResourceAction`, `AppResource`).

### 2.2 Client Library Helpers
- **`src/integrations/supabase/auth-client.ts`**:
  - `hasRole(user, allowedRoles)`: Legacy helper updated to support all 10 platform roles.
  - `hasPermission(user, permission)`: Evaluates permissions against `DEFAULT_ROLE_PERMISSIONS`.
  - `adminAssignRole(targetUserId, role, notes)`: Invokes `admin_assign_role` RPC.
  - `adminRevokeRole(targetUserId, role)`: Invokes `admin_revoke_role` RPC.

### 2.3 Component-Level Authorization Points
1. **`src/modules/admin/AdminModerationPage.tsx`**:
   - Access Gate: Requires `hasRole(user, ['admin', 'moderator'])`.
   - Actions: Listing approval/rejection, verification claim auditing.
2. **`src/modules/host/HostDashboardPage.tsx`**:
   - Access Gate: Requires `hasRole(user, ['host', 'venue_owner', 'admin'])`.
   - Actions: Turf court booking logs, payout requests.
3. **`src/modules/scouting/ScoutPortalPage.tsx`**:
   - Access Gate: Requires `hasRole(user, ['scout', 'coach', 'admin'])`.
   - Actions: Athlete fitness benchmarks, normative radar percentiles, dossier export.
4. **`src/modules/live/components/ScorekeeperModal.tsx`**:
   - Access Gate: Requires match ownership or `hasRole(user, ['host', 'coach', 'admin'])`.
   - Actions: Point scoring, wicket recording, match completion.
5. **`src/modules/athlete-profile/AthleteProfilePage.tsx`**:
   - Access Gate: Editing restricted to authenticated account owner (`user.id === profile.id`).

---

## 3. Database Functions & RPC Authorization Matrix

| RPC Signature | Security Mode | search_path | Granted Roles | Caller Verification Logic | Security Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.admin_assign_role(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | `public.is_admin() OR role = 'service_role'` | **Admin Only (Hardened)** |
| `public.admin_revoke_role(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | `public.is_admin() OR role = 'service_role'` + Last-Admin Guard | **Admin Only (Hardened)** |
| `public.has_role(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `public.user_roles` relation | Authenticated Utility |
| `public.has_permission(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `public.user_roles` JOIN `role_permissions` | Authenticated Utility |
| `public.get_user_effective_permissions(...)`| `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Returns distinct permission array | Authenticated Utility |
| `public.admin_moderate_pickup_game(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `is_admin()` or moderator claim | **Moderator / Admin Only** |
| `public.cancel_pickup_game_as_host(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.complete_pickup_game_as_host(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.reopen_pickup_game_as_host(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.update_pickup_game_capacity(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.update_pickup_game_details(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.reschedule_pickup_game(...)` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |
| `public.get_host_pickup_games()` | `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Filters by `host_id = auth.uid()` | **Host Owner Only** |
| `public.approve_pickup_game_whatsapp_invite(...)`| `SECURITY DEFINER` | `public, pg_temp` | `authenticated, service_role` | Checks `game.host_id = auth.uid()` | **Host Owner Only** |

---

## 4. Identified Security Gaps & Remediations

1. **Gap 1: Mutable Profile Role Field**:
   - *Risk:* In early schemas, `role` was a column on `public.profiles`. An authenticated user could attempt to issue `PATCH /profiles` with `{ "role": "admin" }`.
   - *Remediation:* Migration `20261108000000` enforces decoupled normalized storage in `public.user_roles`. Client `INSERT/UPDATE/DELETE` on `user_roles` is completely revoked.
2. **Gap 2: Frontend-Only Access Decisions**:
   - *Risk:* Some components previously used local boolean flags (e.g. `isScorer`) to display controls without backend validation.
   - *Remediation:* Database RLS policies on `live_matches` and `community_live_matches` enforce `created_by = auth.uid() OR is_admin()`. The frontend uses `canUpdateLiveScore` from `authorizationService.ts` for consistent UI state.
3. **Gap 3: Missing Role Mutation Audit Trail**:
   - *Risk:* Unauthorized or accidental role assignment could not be attributed to a specific admin.
   - *Remediation:* Added `public.user_role_audit_logs` table automatically updated by `admin_assign_role` and `admin_revoke_role`.
