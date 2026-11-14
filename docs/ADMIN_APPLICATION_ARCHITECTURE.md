# KhelGrid Admin Application Architecture

**Decision status:** Approved for development implementation  
**Date:** 14 November 2026  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Public application:** `https://khelgrid.com`  
**Admin application target:** `https://admin.khelgrid.com`  
**Development Supabase project:** `hznsbxvovjxvmnchzzqt`

## 1. Executive decision

KhelGrid will remain a single Git monorepo but run two independently built and deployed browser applications:

- **Web:** public sports discovery, catalogue, athlete and venue experiences.
- **Admin:** private internal operations, listing review, verification, access governance and future platform operations.

The applications share reviewed source modules, TypeScript contracts and the same Supabase project in development. They do not share a browser origin, deployment lifecycle, route tree or public navigation.

This is a frontend/deployment separation, not a new trust boundary for the database. PostgreSQL RLS, protected RPC authorization and server-side checks remain the authoritative security controls.

## 2. Non-negotiable isolation rules

1. All implementation work stays on `development/admin-app-separation` and is reviewed through a pull request.
2. The only permitted database target for development validation is Supabase project `hznsbxvovjxvmnchzzqt`.
3. Do not run production migrations, change production credentials, alter production DNS, attach `admin.khelgrid.com` to a production project, or promote production deployments in this phase.
4. Do not use or expose a Supabase service-role/secret key in either browser application.
5. Admin access requires Supabase Auth plus an active database-authorized moderator or super-admin role. Hiding links or using a separate subdomain is not authorization.
6. Never seed or promote a real super-admin without explicit owner approval and verified Auth identity.
7. Payments remain disabled and outside the free listing verification workflow.
8. Do not make the admin application publicly discoverable or indexable.

## 3. Target repository layout

The current public app is a Vite React SPA rooted at the repository root. The least disruptive first step is a second Vite entry point under `apps/admin`, without prematurely moving the large existing public application.

```text
khelgrid-platform/
├── apps/
│   └── admin/
│       ├── index.html
│       ├── vite.config.ts
│       ├── README.md
│       └── src/
│           ├── main.tsx
│           ├── AdminApp.tsx
│           └── admin-app.css
├── src/                         # Existing public app and shared modules
│   ├── integrations/supabase/   # Shared browser-safe client + protected RPC wrappers
│   ├── modules/admin/           # Existing moderation UI, reused during migration
│   ├── shared/                  # Shared UI/utilities/types
│   └── ...
├── supabase/
│   └── migrations/              # Existing database migration source of truth
├── docs/
│   ├── ADMIN_APPLICATION_ARCHITECTURE.md
│   ├── ADMIN_APPLICATION_IMPLEMENTATION_PLAN.md
│   └── ...
├── package.json
└── vite.config.ts               # Existing public app build
```

The admin Vite configuration uses `apps/admin` as its HTML root, reads only root-level browser-safe Vite environment variables, reuses the root `public/` assets and writes to `dist-admin/`. The public build continues to write to `dist/`.

This first step avoids a risky wholesale move of `src/`, preserves existing imports and minimizes disruption. A later package extraction can be considered only when shared modules have stable boundaries and tests.

## 4. Application and deployment topology

| Concern | Public web | Admin |
|---|---|---|
| Hostname | `khelgrid.com` | `admin.khelgrid.com` |
| Source | Same monorepo | Same monorepo |
| Vercel project | Existing project | New independent project |
| Build command | Existing `npm run build` | `npm run build:admin` |
| Build output | `dist` | `dist-admin` |
| Root directory | Repository root | Repository root |
| Supabase | Existing configured environment | Separate admin-project environment variables, development values only initially |
| Public navigation | Public routes only | No public navigation |
| Indexing | Existing public SEO | `noindex, nofollow, noarchive` |
| Deployment lifecycle | Existing lifecycle | Independent preview and release lifecycle |

### Admin Vercel project settings

Create a new Vercel project linked to the same GitHub repository, with a distinct project name such as `khelgrid-admin`.

- Root Directory: repository root (`./`).
- Install Command: `npm ci`.
- Build Command: `npm run build:admin`.
- Output Directory: `dist-admin`.
- Production Branch: do not configure or use a production deployment for this phase; use protected preview deployments from the development branch.
- Deployment Protection: keep enabled for preview environments.
- Environment variables: add only the development Supabase URL and publishable/anon key to Preview/Development targets, scoped to the development branch where Vercel supports branch-specific preview variables.
- Do not copy public production variables or secrets from the existing web project.

The new Vercel project and its settings must be independently inspected before domain attachment. Do not change the existing KhelGrid web project.

## 5. DNS and custom domain cutover

The desired hostname is `admin.khelgrid.com`, but domain attachment is deliberately a later release gate.

1. Build and test the admin preview on its generated `.vercel.app` hostname first.
2. Confirm the deployment uses the development Supabase project and has Vercel Deployment Protection enabled.
3. Confirm DNS provider/zone ownership and inspect existing records for `admin.khelgrid.com`.
4. Add `admin.khelgrid.com` only to the new admin Vercel project after owner approval of the exact project and domain binding.
5. Use the exact DNS challenge/target Vercel supplies; do not guess a CNAME target or replace the domain's nameservers.
6. Verify TLS, host routing, auth callback allow-list and direct navigation.
7. Keep the hostname unannounced and preview-only until acceptance tests pass.

No DNS record or custom-domain binding is changed by this architecture commit.

## 6. Authentication and authorization

### Browser authentication

- Use Supabase Auth with the existing supported email/password sign-in flow for authorized staff.
- The browser client uses only the project's publishable/anon key.
- Require a fresh authenticated user check on application load and when the tab regains focus.
- Resolve moderator access from the database through the existing protected access-profile RPC.
- Clear protected UI state on sign-out, expired session, authorization denial and failed access-profile lookup.
- Do not trust user-editable `user_metadata`, local storage role flags, query parameters or client-side route guards for authorization.
- Consider stricter session lifetime, MFA and step-up authentication as a separate hardening phase; do not claim these are configured unless verified.

### Role matrix

| Action | Anonymous | Ordinary user | Moderator | Super-admin |
|---|---:|---:|---:|---:|
| Open admin shell | Deny | Deny | Allow | Allow |
| Read private submission queue | Deny | Deny | Allow | Allow |
| Review evidence and listing submissions | Deny | Deny | Allow | Allow |
| Verify, approve/reject, publish/unpublish | Deny | Deny | According to protected RPC rules | According to protected RPC rules |
| List moderator accounts | Deny | Deny | Deny | Allow |
| Grant/revoke moderator roles | Deny | Deny | Deny | Allow |
| Read moderator access audit | Deny | Deny | Deny | Allow |

The actual permission boundary must be enforced in PostgreSQL/RPCs and covered by SQL tests. The frontend role matrix is a usability layer only.

## 7. Supabase and data boundaries

- Keep one migration history in `supabase/migrations`.
- Keep the existing development project as the sole integration target until the owner approves a separate staging project.
- Keep privileged operations behind existing audited RPCs or future reviewed server-side functions.
- Use `SECURITY INVOKER` by default. Any unavoidable `SECURITY DEFINER` function must be justified, tightly scoped, pinned to a safe search path, inaccessible to public roles unless explicitly required, and audited.
- Every exposed table must have appropriate RLS; views must not accidentally bypass RLS.
- Never treat Vercel protection as a replacement for Supabase authorization.
- Avoid adding new database tables during the initial UI/application split unless a separately reviewed requirement demonstrates the need.

## 8. Build, CI and release controls

CI must validate both builds independently:

- Existing public application typecheck, lint, tests and production build.
- Admin TypeScript check, admin build and admin-specific tests.
- Existing PostgreSQL moderation lifecycle and security regression tests.
- Dependency and secret scanning as available in current CI.

The admin build must fail closed if the Supabase URL or public key is missing or points to a production project during the development phase. Prefer an explicit development project allow-list in build-time validation; never infer safety from a hostname alone.

Deployment rules:

- Pull requests create protected admin previews.
- No admin custom domain until the preview is accepted.
- No production deployment or promotion in this phase.
- Keep the public web Vercel project and its deployment settings unchanged.
- Keep Vercel environment variables separated by project and environment.
- A failed admin build must not block or replace the public deployment artifact; CI can still require both checks for merge.

## 9. Migration and compatibility approach

The current `/admin/control` route remains in the public application temporarily as a compatibility path while the new app is brought up and tested. It must not be promoted as the long-term admin URL.

After the new admin preview passes role and workflow tests:

1. Move admin entry to the root route of `admin.khelgrid.com`.
2. Remove admin links and admin page route imports from the public web application.
3. Keep a deliberate, non-sensitive fallback at the old public path (for example a neutral not-found page) rather than leaking internal operations details.
4. Update sitemap/robots/SEO tests so admin routes are absent from public indexing.
5. Update operator documentation and access SOP to point to the separate admin deployment.
6. Only then consider binding the custom admin hostname, with explicit DNS/domain approval.

## 10. Operational monitoring

The admin UI should eventually expose operational signals from real sources only:

- Moderation queue metrics with explicit loaded-record scope.
- Role and access changes from the immutable/audited access history.
- Authentication and authorization failures from supported logs.
- Application exceptions from a configured error-monitoring source.
- Supabase service health from supported status/diagnostic sources.
- Deployment state from Vercel.

Do not fabricate uptime, health scores, security alerts or analytics. The initial admin shell should clearly label any module that is not yet connected as planned or unavailable.

## 11. Rollback

Because the applications deploy independently:

- Revert the admin project to its previous preview deployment or disable the admin project without changing the public web deployment.
- Remove the custom domain binding from the admin project only if domain cutover has occurred and the owner approves.
- Do not roll back or alter shared database migrations as a frontend rollback response.
- Keep the public app operational even if the admin app is unavailable.
- If admin access is unavailable, authorized operators use the documented emergency process; do not bypass RLS or share service-role credentials.

## 12. Acceptance criteria

- [ ] Admin is a separate Vite entry and separate Vercel project.
- [ ] Public build output and behavior remain unchanged.
- [ ] Admin build output is isolated in `dist-admin/`.
- [ ] Admin preview uses only the development Supabase project.
- [ ] No service-role/secret key is bundled.
- [ ] Anonymous and ordinary authenticated users cannot access private data or actions.
- [ ] Moderator workflows pass end-to-end in browser.
- [ ] Super-admin-only operations pass using a separately verified test super-admin identity.
- [ ] Super-admin last-account protection remains effective.
- [ ] Public website has no admin navigation, routes or private data exposure after migration.
- [ ] Vercel preview protection and admin Auth are both tested.
- [ ] Domain is attached only after explicit DNS review and preview acceptance.
- [ ] No production database, Vercel project, domain or deployment was changed.
