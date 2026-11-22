# Independent KhelGrid Platform Audit — Initial Baseline

**Audit date:** 22 November 2026  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Audited ref:** `main`  
**Audited commit:** `339210f58980b8dcff9307d2d969e4b937881f83`  
**Scope:** Vercel deployment failure, repository/build configuration, public/admin application separation, and documented security/release controls.

## Executive summary

The latest public-app and admin-app Vercel deployments are not failing during compilation. Both are blocked by Vercel's project-collaboration/team-configuration gate before build execution. The current evidence points to a mismatch between the GitHub commit author and the only GitHub identity represented in the Vercel Hobby team's membership.

No production database, DNS, environment variable, deployment protection, or project setting was changed during this audit.

## Finding 1 — Both Vercel deployments are blocked before build

**Severity:** P1 — release blocker  
**Status:** Confirmed

Evidence:
- Public project: `khelgrid-platform`, deployment `dpl_itHSsynCcqAnVd8DGGnpD75un8q8`, state `BLOCKED`.
- Admin project: `khelgrid-admin`, deployment `dpl_GKu5a8V6fxmSuU5KqzVjopJj563H`, state `BLOCKED`.
- Both deployments point to `main` at commit `339210f58980b8dcff9307d2d969e4b937881f83`.
- Both deployments link to Vercel's `troubleshoot-project-collaboration#team-configuration` guidance.
- Both deployment event queries returned no build events.
- GitHub combined commit status reports failure for both Vercel contexts.

Identity evidence:
- The Vercel Hobby team has one confirmed member, the owner `lifesciencedomain-1385`, whose connected GitHub login is `khelgrid-dotcom`.
- The audited Git commit author/committer is `khanshahru`.
- `khanshahru` is not represented as a member of the current Vercel team.

**Conclusion:** Treat this as a Vercel collaboration/commit-author authorization block, not a Vite/TypeScript compilation error. Do not change application source or `vercel.json` to try to bypass this gate.

**Remediation options to validate with the owner:**
1. Ensure commits deployed to this Hobby team are authored by the GitHub identity connected to its owner account.
2. If the author is a separate developer, use a Vercel plan/team configuration that supports the required collaboration model.
3. After correcting the identity/team arrangement, trigger a non-production preview first and inspect actual build logs before any production release.

Do not alter SSO/deployment protection as a workaround.

## Finding 2 — Admin project release target differs from the documented safety plan

**Severity:** P1 — release governance  
**Status:** Confirmed configuration/documentation discrepancy

The admin deployment record reports target `production`, while `docs/ADMIN_APPLICATION_ARCHITECTURE.md` says the admin project must use protected previews and must not use production deployment/promotion during the current development phase.

The current deployment is blocked and the project reports `live: false`; therefore this is not evidence that an admin production release became live. It is nevertheless a configuration/release-gate discrepancy that must be corrected or explicitly reconciled before the admin project can deploy.

**Required verification:** inspect the admin Vercel project's production branch, Git deployment settings, deployment policy and environment scopes. Do not modify these settings without a reviewed change and owner authorization.

## Finding 3 — Build configuration is present, but runtime build success is not yet proven

**Severity:** P2 — verification gap  
**Status:** Partially verified

Observed:
- Root package scripts define public `build`, `typecheck`, `lint`, and `test` commands.
- Admin scripts define `typecheck:admin` and `build:admin`.
- Root `package-lock.json` exists.
- The root app uses Vite and writes to `dist/`.
- The admin Vite config uses a separate app root and writes to `dist-admin/`.
- The root `vercel.json` contains a catch-all SPA rewrite to `/index.html`.

Not established:
- No build ran for the blocked deployments.
- This audit did not execute npm install, typecheck, lint, unit tests, either Vite build, browser tests, or PostgreSQL tests.
- The README's historical test counts are not treated as evidence for the audited SHA.
- The Vercel project's effective Root Directory, Build Command, Output Directory, Install Command, and environment scopes still require read-back verification.

## Finding 4 — Admin authorization documentation contains unresolved/stale-risk signals

**Severity:** P0/P1 pending verification  
**Status:** Evidence gap; not asserted as a currently exploitable vulnerability

The repository's `docs/admin-control-center/KNOWN_RISKS.md` records, among other items:
- Direct authenticated UPDATE access to `public.listing_submissions` as a critical database risk.
- Fragmented role systems and possible role enumeration as high risks.
- Historical privilege regressions involving listing submission audit/version tables.
- MFA/AAL2 and security-header gaps.

The companion `AUTHORIZATION_MODEL.md` says role-system consolidation is pending. These documents need reconciliation against the actual current migration chain and the development database before being marked resolved. A documentation claim alone is not proof of a live vulnerability or proof of remediation.

**Required verification:** inspect the exact current grants, RLS policies, function ownership/search paths, role constraints, and applied migration versions using isolated local PostgreSQL first. Do not connect to or mutate production Supabase. Do not apply migrations as part of this audit.

## Finding 5 — CI workflow is large and tightly coupled to migration history

**Severity:** P2 — maintainability/reliability  
**Status:** Confirmed source-level observation

The current `.github/workflows/ci.yml` contains a long sequence of explicit historical migrations and SQL assertions, including payment-schema fixtures and later catalogue/moderation/SaaS migrations. It also checks the public and admin app commands and migration filename/transaction safety.

Risks to validate:
- A renamed, removed, or reordered migration can break CI even when the current schema is valid.
- Historical payment tests in isolated CI must remain strictly test-only and must not enable live payment behavior.
- CI migration order must match the intended clean-database bootstrap path.
- Local PostgreSQL verification must remain isolated and non-destructive.

No workflow was executed during this audit.

## Finding 6 — Latest TopNavbar refactor requires focused regression verification

**Severity:** P2 — UI regression risk  
**Status:** Review required

The latest commit replaces a large inline header in `src/App.tsx` with `TopNavbar` and extracts submit-action/role-hub/badge helpers. A Node test file was added for the extracted helpers.

The component includes a submit popover with outside-click and Escape handling. Verify keyboard focus entry/exit, focus restoration, mobile overflow, hidden-menu accessibility, route transitions, role-hub destinations, notifications, account menu, and translation fallback behavior in browser tests. The blocked deployment provides no evidence either for or against this refactor's build correctness.

## Release decision

**Do not promote either blocked deployment.** First resolve the Vercel collaboration identity issue and reconcile the admin project's production-target discrepancy. Then run the complete public/admin build and test gates on the exact candidate SHA, followed by protected preview browser tests.

## Explicitly out of scope / unchanged

- Production Supabase and production database migrations.
- Development Supabase writes or migration application.
- Production domain/DNS and custom-domain attachment.
- Vercel SSO/deployment protection changes.
- Payment activation, live credentials, or real transactions.
- Production deployment promotion.

## Evidence classification

- Confirmed: Vercel deployment states, target, commit SHA, error-link, empty build event lists, team membership and GitHub commit author identity; source-level package/Vite/CI configuration.
- Not run: local install/build/typecheck/lint/unit tests/browser tests/PostgreSQL suite.
- Pending: current database grants/RLS/function audit, effective Vercel project settings, and full end-to-end preview acceptance.
