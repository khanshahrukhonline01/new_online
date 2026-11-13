# KhelGrid Admin Application — Implementation Plan

**Status:** Approved plan; implementation proceeds in isolated development branch  
**Branch:** `development/admin-app-separation`  
**Architecture:** Same GitHub monorepo, separate Vite application and Vercel project  
**Target hostname:** `admin.khelgrid.com`

## Phase 0 — Inventory and safety baseline

- [x] Inspect the existing Vite/React public application, package scripts, Supabase integration and moderation UI.
- [x] Confirm current admin UI can be reused without changing the database schema.
- [x] Create a dedicated development branch from the existing admin-control-centre work.
- [ ] Record current public build/CI baseline.
- [ ] Confirm the development-only Supabase URL and publishable key are available in a safe environment.

**Exit:** Existing public app and development database are identified; no production target is touched.

## Phase 1 — Separate admin application shell

- [ ] Add `apps/admin/index.html`, entry point and independent Vite config.
- [ ] Reuse the existing authenticated moderation page and reviewed shared modules.
- [ ] Add `build:admin` and `typecheck:admin` scripts.
- [ ] Produce `dist-admin/` without changing the public `dist/` output.
- [ ] Add admin noindex metadata and a clear private-operations identity.
- [ ] Add unit/build checks for admin entry.

**Exit:** Admin app builds independently; public build remains unchanged.

## Phase 2 — Admin Vercel preview project

- [ ] Create a new Vercel project linked to the same repository.
- [ ] Configure root directory, install/build commands and `dist-admin` output.
- [ ] Add only development Supabase URL and publishable/anon key to preview/development environment.
- [ ] Enable Vercel preview Deployment Protection.
- [ ] Deploy only from `development/admin-app-separation`.
- [ ] Verify preview bundle does not contain service-role/secret keys and points to the development project.

**Exit:** Protected preview is Ready and uses the development database only. No custom domain yet.

## Phase 3 — Authentication and role boundary validation

Test distinct identities and sessions:

1. Anonymous visitor: admin shell may render only a safe sign-in surface; no private data.
2. Ordinary authenticated user: explicit access denied; protected RPCs return authorization errors.
3. Active moderator: permitted queue, evidence, verification and editorial workflows.
4. Super-admin: moderator management and access audit; last active super-admin protection.
5. Expired/revoked session: protected state cleared and re-authentication required.

**Exit:** Browser tests plus database/RPC tests pass for all identities.

## Phase 4 — Public application decoupling

- [ ] Remove the admin route and admin page imports from public app routing.
- [ ] Remove any admin-specific links and stale route metadata from public app.
- [ ] Ensure sitemap excludes all admin paths.
- [ ] Preserve a neutral fallback for the old public route.
- [ ] Run full public route, SEO, navigation and regression suites.

**Exit:** Public app contains no admin operations entry point or private UI.

## Phase 5 — Custom domain and operator access

- [ ] Inspect existing DNS records for `admin.khelgrid.com`.
- [ ] Confirm new admin Vercel project identity and exact domain binding.
- [ ] Obtain owner confirmation before DNS changes.
- [ ] Attach custom domain to the admin project and follow Vercel's exact DNS challenge.
- [ ] Add `https://admin.khelgrid.com` and required callback URLs to Supabase Auth URL configuration only after owner approval.
- [ ] Verify TLS, sign-in, refresh, sign-out and direct access.

**Exit:** Admin custom hostname works without changing the public apex/www records.

## Phase 6 — Operations platform expansion

Build only when a reliable data source exists:

- Executive operations overview.
- Listing catalogue and evidence review.
- Moderator/user governance.
- Audit centre with filters and export controls.
- Security events and access-denial monitoring.
- Platform health and deployment diagnostics.
- Operational reports.

**Exit:** Every metric has a named source, timestamp, permission boundary and tested empty/error state.

## Phase 7 — Release readiness

- [ ] All CI jobs pass.
- [ ] Both app builds pass independently.
- [ ] Security tests pass for anonymous, ordinary user, moderator and super-admin.
- [ ] Manual acceptance sign-off recorded.
- [ ] Rollback procedure rehearsed.
- [ ] No production changes occurred during development.

**Exit:** Owner may separately authorize a production release plan. This plan itself does not authorize production release.

## Explicit non-goals for this phase

- No production Supabase migration or data change.
- No production Vercel project modification.
- No DNS changes or custom-domain binding yet.
- No super-admin role grant.
- No payment activation or payment schema work.
- No invented platform health or security metrics.
