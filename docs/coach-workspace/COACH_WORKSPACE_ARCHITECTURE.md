# KhelGrid Coach Workspace — Architecture (Phase 1 Baseline)

**Target Environment:** Development website + Development Supabase (`hznsbxvovjxvmnchzzqt`)  
**Status:** Phase 1 (Workspace Foundation) Implemented; Phases 2–10 Planned  

## 1. Architectural Boundaries
- **Multi-Tenant Integration:** Reuses `public.tenants`, `public.tenant_memberships`, `public.tenant_units`, and `public.tenant_invitations` via `TenantContext` (`src/shared/context/TenantContext.tsx`) and `WorkspaceShell` (`src/modules/workspace/WorkspaceShell.tsx`).
- **Dual Guard Enforcement:**
  - `/workspace/coach/:section` is protected inside `WorkspaceShell` by `<RegulatoryWorkspaceGuard persona="coach">` and `<RequireTenantMember personaLabel="Coach" requiredTenantTypes={['coach', 'academy']} allowedRoles={['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']} />`.
  - `/coach-dashboard` and `/coach-dashboard/*` routes in `src/App.tsx` enforce the identical guard stack, plus an internal fail-closed session check inside `CoachDashboardPage.tsx`.
- **Personal Profile Ownership + Tenant Scoped Operations:**
  - `public.coach_profiles` is keyed 1:1 by `auth.users(id)` (`user_id`), enabling independent coaches AND academy-employed coaches (`head_coach`, `coach`) to own and maintain a single professional credential record without losing access when switching academies.
  - `public.coach_verification_submissions` records accreditation submissions and immutable review outcomes separately from public catalogue rows (`public.coaches`).
- **Payments Status:** Payment collection, paid subscriptions, and gateway settlements remain strictly **disabled / paused** across the Coach Workspace.

## 2. Module Layout (`src/modules/coaches/`)
- `CoachDashboardPage.tsx` & `CoachDashboardPage.css` — Authenticated workspace shell, grouped sidebar navigation, status header, and section router.
- `coachWorkspaceClient.ts` — Fail-closed Supabase data access & validation layer (`coach_profiles`, `coach_verification_submissions`, RPC calls).
- `coachDashboardTypes.ts` — Canonical section registry (`COACH_WORKSPACE_NAV_ITEMS`) and deep-route resolver (`resolveCoachRouteTarget`).
- `components/CoachOverviewPanel.tsx` — Live authorized KPI strip, 10-metric breakdown, quick actions, and real empty/error states.
- `components/CoachProfileEditorPanel.tsx` — Full 18-field professional coach profile editor.
- `components/CoachVerificationPanel.tsx` — Verification submission/resubmission form, moderator feedback alert, and history timeline.
- `components/CoachSectionViews.tsx` — Academy associations view (`TenantContext`), live user notifications (`user_notifications`), account settings summary, and Phase 2–9 roadmap views.
- Existing public catalogue (`CoachesPage.tsx`, `CoachInquiryModal.tsx`) and calculation engine (`kheloIndiaBattery.ts`) remain intact and are slated for backend persistence integration in later phases.
