# KhelGrid SaaS Frontend Implementation Plan

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Base:** `main`  
**Working branch:** `feat/unified-saas-workspaces-v1`  
**Environment:** Development / preview only  
**Status:** Implementation baseline; no production deployment or database mutation performed.

## Product contract

KhelGrid is a public discovery platform with authenticated SaaS workspaces.

- Public visitors may browse published sports, venues, coaches, academies, trials and other public opportunities.
- Login is required for personal dashboards, saved/private records, submissions that create account-owned records, workspace operations, notifications and management actions.
- One authenticated account may hold multiple independently-authorized personas and multiple organization memberships. The active persona/entity is a navigation context, not an authorization grant.
- Switching persona or tenant must never grant access. Every private read/write remains enforced by Supabase RLS or a trusted server-side authorization boundary.
- Venue, coach, academy and trial listings remain free. Listing verification/moderation remains separate from payment. Payment collection stays disabled.
- No demo records, fabricated metrics, synthetic bookings, seeded identities or silent localStorage fallback may appear as real workspace data.
- Preserve legacy URLs and public discovery pages while consolidating workspace navigation.
- Do not modify production Supabase, production environment variables, production deployment or live user data.

## Repository baseline verified before implementation

The current repository already contains:
- `src/modules/workspace/WorkspacePage.tsx`: a signed-in landing page whose available links are derived from one scalar `authUser.role`.
- `src/modules/workspace/WorkspaceShell.tsx`: a partial shell with a persona switcher, tenant switcher, KPI strip and lazy-loaded legacy modules.
- `src/shared/routing.ts`: workspace persona route matching and legacy path mapping.
- `src/shared/context/TenantContext.tsx` and `src/shared/components/RequireTenantMember.tsx`: existing tenant context and guard, but the audit flags reliance on cached auth state and incomplete guard wiring.
- Existing domain modules for athlete, academy, coach, venue/host, tournament/organiser, organisation and creator operations.

The existing audit at `docs/architecture/unified-workspace-audit.md` records critical blockers: tenant-schema/migration drift, localStorage/demo-backed domain clients, scalar-role assumptions, missing ownership/RLS paths for several operational workflows, and a route-guard gap. These must be resolved before describing the workspaces as production-ready.

## Delivery strategy

Deliver one reviewable vertical slice at a time. A workspace is not complete merely because its page renders; it is complete only when its UI, real data source, authorization, empty/error/loading states, tests and mobile layout all pass.

### Phase 1 — Shared workspace foundation

1. Inventory all workspace routes, page modules, navigation entries, route guards, data clients and existing tests.
2. Define a canonical workspace registry for Athlete, Coach, Academy, Venue/Host, Organisation/Trial Organiser and Creator, mapping each persona to its existing domain module and supported sections.
3. Build shared workspace chrome: shell, responsive sidebar, persona switcher, entity/branch switcher, breadcrumbs, contextual actions, notification entry point, page loading/error/empty states.
4. Resolve active personas from trusted, database-backed profile/role/membership records. Do not use `user_metadata`, localStorage role values or URL persona values as authorization evidence.
5. Ensure a signed-in user can switch only among personas and entities returned by the authoritative membership resolver. Users with no matching membership see an honest onboarding/claim state.
6. Preserve current legacy routes and deep links; route them into the canonical workspace only after the destination's authorization contract is established.
7. Add tests for anonymous, authenticated-with-no-workspace, single-persona, multi-persona, multi-tenant, revoked-membership, loading and failed-membership-resolution states.

**Acceptance gate:** no private workspace is accessible anonymously; no persona/entity switch can bypass backend authorization; all legacy routes retain intended behaviour; no fake data is rendered.

### Phase 2 — Athlete workspace

- Profile and Sports CV, profile completeness, privacy controls and verified identity state.
- Own applications and their original per-domain statuses.
- Saved items, own bookings, passes and activity history only where authoritative DB sources and RLS already exist.
- Remove any demo identity, showcase fallback or locally fabricated activity from production workspace rendering.
- Verify that athlete writes use the authenticated Supabase session/JWT and cannot set verification state.

### Phase 3 — Coach workspace

- Coach profile and public profile preview.
- Credentials and verification claim submission (verification decision remains moderator-controlled).
- Inbound enquiries only after coach-recipient RLS is present and tested.
- Availability and coaching services only when backed by authoritative data.
- Replace localStorage-only operational records with database-backed flows before enabling management actions.

### Phase 4 — Academy workspace

- Academy profile, branches/units, staff and membership roles.
- Batches, students, attendance and enquiries only after canonical tenant schema, ownership constraints and RLS are present.
- Role-specific access (owner/admin, manager, coach, front desk) with least privilege.
- No fabricated student, fee, attendance or revenue totals.

### Phase 5 — Venue / Host workspace

- Venue ownership/claim state, facility inventory, enquiries and booking operations.
- Use canonical `venue_bookings` records and existing secure RPCs where applicable.
- Do not expose participant PII or booking rows publicly.
- Do not enable localStorage-generated availability, walk-ins, recurring bookings or QR passes as real records.

### Phase 6 — Organisation and trial organiser workspace

- Organisation profile, members and branches.
- Trial/event creation and management only with explicit owner linkage and moderator publication lifecycle.
- Applicant review only after organiser-scoped RLS policies exist.
- Keep submission, moderation, publication and applicant decisions as separate states.

### Phase 7 — Creator workspace

- Creator profile and campaign application/deliverable flows only after authoritative tables and RLS exist.
- Until then, render a clear unavailable/onboarding state rather than localStorage demo campaigns, earnings or reach analytics.

### Phase 8 — Cross-workspace services and launch hardening

- Shared notifications, account settings, profile switcher, audit events and responsive navigation.
- Keyboard accessibility, screen-reader labels, reduced-motion support and mobile/tablet layouts.
- End-to-end browser tests for direct URL access, session expiry, multi-persona switching, cross-tenant isolation and revoked membership.
- Build, typecheck, unit tests, security regression tests and preview smoke tests.
- Production readiness remains a separate approval after development preview acceptance.

## Security and implementation rules

- A frontend route guard is UX, not the security boundary. RLS/trusted server authorization is mandatory.
- Never authorize with user-editable JWT `user_metadata`, localStorage, a scalar client role, or a persona query parameter.
- Never add broad `SECURITY DEFINER` functions to make frontend reads work.
- For Supabase UPDATE policies, pair ownership checks in `USING` and `WITH CHECK`; use `TO authenticated` plus an ownership/membership predicate.
- Use the active Supabase session for requests that depend on `auth.uid()`; never substitute the anon key as a user bearer token.
- Keep migrations timestamped, additive, transactional, non-destructive and development-only. Do not apply migrations to the database as part of a frontend PR.
- Keep payments and paid subscription activation disabled.
- No hardcoded sample identities, bookings, listings, revenue, availability, analytics or verification states.

## Definition of done for each workspace

- [ ] Route and deep-link behaviour verified.
- [ ] Authenticated account and active membership resolved from authoritative sources.
- [ ] Server/database authorization independently verified.
- [ ] Real data only; honest loading, empty, unavailable and error states.
- [ ] Create/read/update/delete actions are wired only where supported by secure backend contracts.
- [ ] No silent localStorage/demo fallback.
- [ ] Desktop, tablet and mobile layouts pass.
- [ ] Keyboard and screen-reader basics pass.
- [ ] Unit, integration and browser acceptance tests pass.
- [ ] Build and typecheck pass.
- [ ] Preview deployment reviewed before merge.

## Immediate next implementation slice

Start with Phase 1 shared workspace foundation. Before changing route guards or membership resolution, reconcile the current migration inventory and current Supabase schema against the existing `tenant-client.ts` contract. Do not infer that an old SQL deployment script or a prior acceptance report means the schema is present in the active development database.
