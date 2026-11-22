# KhelGrid Admin Control Center — Authorization Model

## Guiding Principle
**The database is the sole final authority for privileged operations.** Client-side checks only govern UI rendering and must always fail closed.

## Phase 1 Implemented Client Controls
- `AdminAuthGate` (`apps/admin/src/auth/AdminAuthProvider.tsx`) verifies:
  1. Approved Supabase origin (`validateAdminSupabaseOrigin`) and non-placeholder anon key.
  2. Active Supabase auth session (`getSession` + `getUser`).
  3. Server-side `get_moderation_access_profile` RPC returning an active `moderator` or `super_admin` record (`is_active === true`).
- `auth-client.ts` (`sanitizeUntrustedRole`) strips `'admin'` and `'moderator'` whenever hydrating from `localStorage` or user-modifiable `user_metadata`.
- `authorizationService.ts` strictly fails closed to `['visitor']` whenever Supabase is unavailable, a role query fails, or no active rows exist.

## Pending Phase 2 Database Consolidation (Not Yet Applied)
Four database role mechanisms currently coexist in `supabase/migrations/` and remain scheduled for Phase 2 consolidation after Phase 1 review:
1. `public.listing_moderators` (`moderator`, `super_admin`)
2. `public.user_roles` + `public.profiles.role` (`admin`, `moderator`, etc.)
3. `is_pickup_game_admin()` (`public` vs `private` schema drift)
4. Unapplied `20261122000000` `has_platform_role()` referencing roles outside `user_roles`'s `CHECK` constraint.
