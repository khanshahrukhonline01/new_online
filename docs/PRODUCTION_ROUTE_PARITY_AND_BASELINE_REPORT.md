# Production Route Parity Inventory and Baseline Test Report

- Review date: 2026-10-25
- Production source: `khelgrid-dotcom/khelgrid-monetization-studio`, branch `main`
- Rebuild source: `khelgrid-dotcom/khelgrid-platform`, branch `feat/app-shell-discovery-modules`
- Production tree inspected at: `647a896c6eb29eb81d1f8cb3152e92e55fe4c579`
- Rebuild tree inspected at: `2a103392ba9feb11c052815e3673662afc1ed77c`
- Purpose: route/source inventory and build evidence only. This is not production deployment approval.
- Preservation rule: this report is additive; do not delete or overwrite existing documentation or historical audit evidence.

## 1. Summary

The production web repository contains 70 file-based route modules under `src/routes` (including the root layout), plus separate technical endpoints and static metadata. The rebuild currently implements four page families: `/`, `/sports`, `/opportunities`, and `/venues`. It intentionally maps a few legacy aliases to these families and displays a not-found page for other paths. This is a partial MVP shell, not route parity.

The production repository also contains an Android application. This web-route inventory does not assert parity with the Android app; that needs a separate screen/deep-link/manifest inventory.

## 2. Rebuild routes currently implemented

| Route / pattern | Current rebuild behaviour | Disposition |
| --- | --- | --- |
| `/` | Home page | MVP retain |
| `/sports` | Sports catalogue landing page | MVP retain |
| `/sports/:slug` | Same generic SportsPage for all slugs; no distinct sport-detail implementation confirmed | Needs explicit detail route/content decision |
| `/opportunities` | Opportunities page | MVP retain |
| `/trials`, `/combines`, `/scholarships`, `/camps` | Same OpportunitiesPage | Legacy alias; confirm canonical redirects/SEO before release |
| `/opportunities/:id` | No distinct detail route; current generic fallback except the family matching only covers paths starting `/opportunities/` and displays OpportunitiesPage | Needs actual detail route and tested identifier behaviour |
| `/venues` | Informational venue directory | MVP retain |
| `/venues/:id` | Same generic VenuesPage for every slug; no distinct venue detail implementation confirmed | Needs detail route decision |
| `/book` | Displays VenuesPage; footer says this is not a booking service | Preserve legacy URL only if clear informational messaging/canonical decision is approved; do not imply booking works |
| All other paths | Not-found section with home link | Must be reconciled against legacy routes and documented deferrals |

Current shell code uses the History API and a popstate listener. Its route checks should be validated for direct URL load, refresh, back/forward, trailing slashes, unknown paths and nested slugs. No runtime route test was executed as part of this source review.

## 3. Production route inventory and proposed disposition

Status meanings:
- **MVP** — represented by the frozen first-release scope.
- **Alias/decision** — retain as an alias or redirect only after canonical and user-experience behaviour is decided.
- **Defer** — not in first-release scope; preserve documentation and decide whether to redirect, show a safe “coming later” page, or return not-found.
- **Policy/trust** — assess for accurate, useful public policy content; do not remove merely because the rebuild does not yet contain it.
- **Technical** — assess separately from user-facing routes; verify protocol and access controls.

### Core discovery and directories

| Production route | Initial parity decision |
| --- | --- |
| `/` | MVP: home |
| `/sports` | MVP: sports catalogue |
| `/sport/:slug` | Decide canonical relationship to `/sports/:slug`; avoid duplicate thin pages |
| `/sports/:slug` | MVP target: sport detail, but not yet distinct in rebuild |
| `/sport-in-city/:slug` | Defer until city/sport data and useful page content exist |
| `/cities` | Defer or implement only with substantive location data |
| `/city/:slug` | Defer until city pages have distinct sourced information |
| `/district-infrastructure` | Defer pending evidence-backed data and content review |
| `/search` | Defer from initial shell; opportunity discovery can be included only if data quality and lifecycle are ready |
| `/opportunities` | MVP opportunity discovery |
| `/opportunities/:id` | Detail page required before treating as parity |
| `/trials` | Alias decision; currently mapped to OpportunitiesPage in rebuild |
| `/trial/:id` | Defer until source-backed opportunity detail and expiry/archive logic pass |
| `/academy` | Defer; verify evidence and page quality before indexing |
| `/coaches` | Defer |
| `/events` | Defer |
| `/calendar` | Defer |
| `/play` | Defer |
| `/train` | Defer |
| `/book` | Informational venue directory only in first release; no booking/availability/payment claims |
| `/venue/:id` | Defer until distinct venue detail and provenance are implemented |
| `/list-venue` | Defer until safe intake, validation and moderation workflow exists |

### CV, profile, account and personalized tools

| Production route | Initial parity decision |
| --- | --- |
| `/cv` | First-release private local-first CV entry point; current rebuild does not implement the builder |
| `/cv/:id` | Do not expose public CV sharing in first release; inspect existing URL/data privacy risks before any parity decision |
| `/login` | Defer; no account/auth launch in first release |
| `/forgot-password` | Defer with authentication |
| `/verify` | Defer with authentication/verification workflow |
| `/onboarding` | Defer with accounts |
| `/profile` | Defer with accounts |
| `/dashboard` | Defer with accounts |
| `/settings` | Defer with accounts |
| `/my-stats` | Defer until provenance, account and privacy decisions are approved |
| `/recommendations` | Defer pending data quality and personalization/privacy decisions |
| `/memberships` | Defer; monetization not in first release |
| `/pricing` | Defer; do not advertise unapproved paid features |
| `/talent-scanner` | Defer; verify data/privacy/security requirements first |
| `/scout-portal` | Defer; requires a defined audience, permissions and substantiated functionality |
| `/admin-venue-submissions` | Internal/admin route: confirm authentication and server-side authorization; never expose based only on UI routing |

### Editorial, learning, content and tools

| Production route | Initial parity decision |
| --- | --- |
| `/blog` | Defer or include only with original reviewed content |
| `/blog/:slug` | Defer; ensure useful body, source and canonical metadata |
| `/blog/write` | Defer; ensure access controls and moderation before any use |
| `/chronicle` | Defer until original, reviewed content is ready |
| `/guides` | Defer or include only when content meets quality criteria |
| `/guide/:slug` | Defer until each page has substantive unique content |
| `/learning-hub` | Defer |
| `/resources` | Defer |
| `/ai-guide` | Defer until fact-checking and AI-content review are defined |
| `/start-from-zero` | Defer pending substantive content review |
| `/tools` | Defer or include only functional, tested tools |
| `/tools/:slug` | Defer until each tool actually works |
| `/best-tools/:category` | Defer; claims/rankings require methodology and evidence |
| `/top-guides/:category` | Defer; ranking and content-quality review required |
| `/mobile-app` | Defer until current app availability and supported-platform claims are verified |

### Community, partnerships and organization

| Production route | Initial parity decision |
| --- | --- |
| `/community` | Defer until moderation, privacy and actual community features exist |
| `/partner` | Defer until real partner offer and contact process are defined |
| `/careers` | Defer unless genuine openings and application handling are available |
| `/contact` | Trust-critical: preserve a working contact route in public release |
| `/verify` | Defer with authentication/verification; do not imply verification service exists |

### Policies and trust pages

| Production route | Initial parity decision |
| --- | --- |
| `/about` | Keep only accurate claims about the actual product |
| `/privacy` | Trust-critical: must match actual data handling and third-party scripts |
| `/terms` | Trust-critical: review against actual services |
| `/cancellation-policy` | Do not imply booking service exists; review or defer consistently |
| `/copyright-policy` | Review and preserve |
| `/correction-policy` | Review and preserve; align with editorial operations |
| `/editorial-policy` | Review and preserve; align with actual review practices |
| `/ipr-policy` | Review and preserve |
| `/posh-policy` | Review legal applicability and actual procedures; do not copy blindly |
| `/trust-center` | Publish only claims supported by operational evidence |
| `/verification-policy` | Align with the defined KhelGrid verification labels and workflow |

### Technical routes and files

| Endpoint / file | Initial parity decision |
| --- | --- |
| `/api/trials` | Defer or implement only with reviewed records, correct lifecycle filters, bounded output and tested response contract |
| `/api/indexnow` | Defer until access controls, request validation and provider behaviour are reviewed |
| `/sitemap.xml` | Must list only intended canonical, useful, indexable URLs and current active/archive lifecycle |
| `/robots.txt` | Must match actual indexation strategy |
| `/ads.txt` | Verify against the actual authorized advertising account; do not fabricate publisher records |
| `/llms.txt` | Optional; review claims and ensure it does not advertise unavailable features |
| `/6c71a3962bfa4c5ea1f5927c81d83ee6[.]txt` | Verify the exact owner/provider purpose and expected contents before retaining |
| `/sitemap.xml` and `public/sitemap.xml` | Check duplicate/static versus generated sitemap behaviour |
| `public/robots.txt`, `public/site.webmanifest` | Review against canonical domain, application identity and current route/indexation decisions |
| `vercel.json` | Review rewrite/redirect/cache behaviour against route parity and environment separation |

This inventory is source-based. Dynamic redirects, runtime guards, content availability, route-specific metadata and actual HTTP status codes still require runtime tests.

## 4. Critical parity gaps to resolve before release

1. **Opportunity lifecycle:** rebuild must not publish unreviewed or expired records; archive must preserve history and active queries must exclude overdue records.
2. **Content and SEO:** do not recreate every legacy URL as an empty or generic page. Assign each URL a substantive-content and indexation decision.
3. **Policies and contact:** keep trust/legal information accurate and available; defer any policy whose described service is not actually offered, with a clear and consistent strategy.
4. **Venue scope:** `/book` may be a legacy alias, but it must not promise booking. No booking transaction, hold, availability or payment flow in first release.
5. **CV privacy:** public `/cv/:id` behaviour is explicitly out of scope. Review existing implementation and URL leakage risks before copying any behaviour.
6. **Technical endpoints:** avoid public unauthenticated side effects; validate API output and sitemap/robots/ads metadata separately.
7. **Mobile app:** this web audit is not a mobile parity audit; inventory Android navigation and supported behaviours separately.

## 5. Reproducible build/test baseline evidence

### Source configuration observed

- Rebuild commit: `2a103392ba9feb11c052815e3673662afc1ed77c`.
- Node engine in `package.json`: `>=22`; repository README requests Node.js 22 LTS and npm.
- Scripts available: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- No `package-lock.json` exists at the inspected branch root. Current workflow uses `npm install`, not `npm ci`. This is **not yet a fully reproducible dependency-install baseline**; resolve lockfile policy in a separate reviewed change.
- CI workflow installs Node 22 and includes migration-safety validation before typecheck, lint, test and build.

### Latest observed GitHub Actions run

- [CI run #66](https://github.com/khelgrid-dotcom/khelgrid-platform/actions/runs/40186886441)
- Exact tested commit: `2a103392ba9feb11c052815e3673662afc1ed77c`
- Result: **success** (GitHub Actions, hosted Ubuntu runner, Node 22).
- Recorded completed steps: migration safety validation, `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
- This is evidence that those CI steps passed for that commit. It does not prove browser route behaviour, accessibility, database/RLS behaviour, production parity, deployment health or deterministic dependency installation.
- CI used `npm install` and no committed lockfile was found, so dependency resolution may change over time.

### Local execution limitation

No local checkout was created and no commands were executed in a local shell during this review. The CI run above is the available command-level evidence. Do not report it as a local build or route smoke test.

## 6. Next execution order

- [ ] Create a route ledger with one row per route, including status code/redirect target, canonical URL, access class, content source, phase, owner and acceptance test.
- [ ] Confirm every route listed above against runtime production behaviour (read-only) and add routes discovered from links, sitemap, navigation, manifests and API clients.
- [ ] Approve dispositions for every route, including aliases, policy pages, admin routes and technical endpoints.
- [ ] Decide how to obtain reproducible dependencies (commit the intended npm lockfile and move CI to `npm ci`, or document an approved alternative). Preserve the existing workflow history and change only in a reviewed commit.
- [ ] Run route smoke tests on a preview/staging build: direct load, refresh, back/forward, canonical redirect, not-found, mobile viewport, and API/metadata checks.
- [ ] Add tests for route alias behaviour, unknown slugs, active/archive boundaries and no false booking/live-score claims.
- [ ] Capture new CI results against the exact post-change commit.
- [ ] Do not deploy to production until parity decisions, content/security gates and explicit owner approval are complete.
