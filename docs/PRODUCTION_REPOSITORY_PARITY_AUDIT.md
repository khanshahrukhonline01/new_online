# Production Repository Parity Audit

**Audit date:** 2026-10-25  
**Source repository inspected:** [khelgrid-monetization-studio](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio), public `main` branch  
**Planning repository:** `khelgrid-platform`, branch `feat/app-shell-discovery-modules`  
**Purpose:** Identify production-source routes, components, infrastructure and workflows that the private rebuild plan needs to account for.

> **Safety boundary:** This is a read-only source-tree/documentation comparison. File or route presence does not prove a page is deployed, functional, secure, connected to real data or accessible in production. No production files, settings, database or deployment were changed.

## 1. Method and limits

The production repository's Git tree was inspected on `main`. The source contains a route directory, shared components, service modules, Supabase migrations, CI workflows, an Android app tree and a ChatGPT/MCP integration folder. This audit identifies named source-level surfaces and planning omissions; it does not execute the site, crawl every rendered URL, test every user journey or inspect every route's full implementation.

## 2. High-priority planning gaps

Add these areas to the private plan before declaring route parity complete:

1. **Existing route parity register:** map each production route to the private planned route, decision (preserve, merge, defer, retire/redirect), stage, data dependencies, access class and acceptance test.
2. **Profile and athlete workflows:** profile, onboarding, my stats, athlete profile agent, achievements/memberships and profile visibility.
3. **Sports CV lifecycle:** CV index, CV creation/editor, public/shared CV detail, PDF/export, share controls, local vs server persistence, language support and privacy.
4. **Venue operations:** venue detail, court details, venue owner submissions, submission review/admin, operating hours, court-specific prices, availability/holds, booking confirmation/cancellation, reviews/amenities/policies and owner verification.
5. **Opportunity application lifecycle:** trial detail, trial applications, organizer/source evidence, review/publish/expiry, alerts/newsletter and scheduled refresh/notification worker.
6. **Live sports stack:** live scores, sport bar, live service/provider adapter, cache, sound/audio, stale/unavailable states, provider rights, rate limits and costs.
7. **Content and sports intelligence:** sport/city pages, district sports infrastructure, guide/category landing pages, best-tools/category pages, match analysis/predictor/statistics, newsletter and editorial corrections.
8. **Monetization and consent:** AdSense loader/units/layout wrappers, consent banner/settings, diagnostics, analytics, Google tag loader, ad slot behaviour and network-specific policy/approval gates.
9. **Platform delivery:** Android/native app/PWA installation, mobile-app information page, deep links and parity expectations across web and app.
10. **LLM/MCP integration:** `chatgpt-mcp` API/tools, tool schemas, authorization, read/write scope, source provenance, provider-independent LLM adapter, prompt injection defenses, quotas, logging and user privacy.
11. **Operations and safety:** scheduled workflows, trial data policy workflow, weekly Supabase backup and restore evidence, IndexNow/sitemap/robots/llms.txt, server error capture and health diagnostics.
12. **Administration and trust:** venue submission admin, trust center, verification policy, cancellation policy, copyright/IPR, correction policy, editorial policy, POSH policy, terms/privacy and access-controlled review queues.

## 3. Production source routes to reconcile

The production repository contains these source route files. Treat these as **source-defined routes**, not a claim that every route is live or functioning. Dynamic segments such as `:slug` represent parameters.

### 3.1 Core and navigation
- `/` — homepage.
- `/about`, `/contact`.
- `/search`, `/sports`, `/sports/:slug`, `/sport/:slug`, `/sport-in-city/:slug`.
- `/cities`, `/city/:slug`, `/district-infrastructure`.
- `/calendar`, `/events`, `/trials`, `/trial/:id`, `/opportunities`, `/opportunities/:id`.
- `/live-scores`.
- `/play`, `/book`, `/train`, `/coaches`, `/academy`, `/memberships`.

### 3.2 Athlete, account and CV
- `/login`, `/forgot-password`, `/onboarding`.
- `/profile`, `/dashboard`, `/settings`, `/my-stats`, `/recommendations`.
- `/cv`, `/cv/:id`.
- Component-level capabilities to account for: athlete onboarding wizard, athlete profile agent, user profile, CV editor/card/sharing, share-CV modal, notifications/preferences and protected-route handling.
- Planning action: explicitly decide whether account routes are in Stage A or deferred; distinguish a local-only CV from a server-saved or public share page.

### 3.3 Learn, content and tools
- `/start-from-zero`, `/ai-guide`, `/learning-hub`.
- `/guides`, `/guide/:slug`, `/top-guides/:category`.
- `/blog`, `/blog/:slug`, `/blog/write`, `/chronicle`.
- `/resources`, `/tools`, `/tools/:slug`, `/best-tools/:category`.
- Planning action: distinguish editorial article types and canonical URLs; decide whether `/blog/write` is authenticated/editor-only and keep it out of public indexing.

### 3.4 Grow, venue management and trust/legal
- `/partner`, `/list-venue`, `/admin-venue-submissions`, `/careers`, `/pricing`, `/mobile-app`, `/scout-portal`, `/talent-scanner`.
- `/verify`, `/verification-policy`, `/trust-center`.
- `/privacy`, `/terms`, `/cancellation-policy`, `/copyright-policy`, `/ipr-policy`, `/correction-policy`, `/editorial-policy`, `/posh-policy`.
- Planning action: classify each route public/private/admin; verify whether private admin routes are actually protected at server/data layer, not only hidden from navigation.

### 3.5 Technical routes and API endpoints
- `/robots.txt`, `/sitemap.xml`, `/ads.txt`, `/llms.txt`.
- `/api/indexnow`, `/api/trials`, and a verification-token text route.
- Planning action: document cache, authentication, rate limiting, error contracts, data exposure, canonical URL generation, crawl/indexing policy and secret handling for each endpoint.

## 4. Source components/features not obvious from navigation

The tree also contains source for:
- Venue details, court/venue availability preview, amenities, policies, image carousel, reviews, date picker, booking form/confirmation and booking service.
- Game hosting and game detail flows, play FAQ/editorial/SEO components, pickup-game lobby and home quick actions.
- Sports calendar cards including AIU calendar content, event countdown/filters/saved events, sports news and match analysis/statistics/prediction components.
- Athlete profile, onboarding, Sports CV editor/sharing, trial discovery/search/detail, newsletter signup, notification preferences and dashboards.
- Ad consent, AdSense wrappers/units/mobile sticky slots/loader/diagnostics and analytics.
- PWA install banner, native Android project and app-specific navigation/data/session/AdMob modules.

Planning action: create a capability inventory mapping each component family to its canonical page, domain entity, source of truth, access level, tests and disposition. Do not create separate routes for every component; some are shared UI modules.

## 5. Backend, database and workflow parity

The source tree includes Supabase migrations for sports entities, user profiles/achievements/memberships, venue hours/policies, booking transactions, notifications/subscriptions, profile security, verification self-approval restrictions, auth-user/profile synchronization, trial tables and review/publish guards, venue submission intake/review, court pricing/hours, court availability and sports feed caching.

It also includes source for:
- `src/lib/booking-service.ts`, `src/lib/live-sports-service.ts`, `src/lib/trials-service.ts`, `src/services/trials-database-service.ts`, `src/services/notification-worker-service.ts`, `src/lib/user-profile-service.ts`, and Supabase auth/service adapters.
- Workflows for trial/opportunity data policy, weekly Supabase backup, build/release and ChatGPT MCP deployment.

Planning action:
- Reconcile the private Stage A schema and later-stage migrations with these capabilities without copying production data or applying production migrations.
- Document migration ownership, schema mapping, data portability and safe migration/rollback strategy.
- Specify transactional booking invariants, price/hour validation, expired holds and overlap protection.
- Specify trial lifecycle states, source evidence, publication authority, scheduled refresh and notification consent.
- Require restore drills; a backup workflow alone is not proof of recoverability.
- Keep credentials/secrets out of client bundles, logs and LLM prompts.

## 6. Public/private asset and data-access gaps

The plan should explicitly inventory these categories:
- **Public content assets:** approved logos, sport imagery, venue photos with rights, public articles/guides, public opportunity/event details and generated public metadata.
- **Private user assets:** unpublished CVs, profile/contact fields, applications, saved scouts/prospects, booking history, messages/reports and uploaded identity/evidence documents.
- **Restricted operational assets:** moderation/verification evidence, venue ownership proofs, audit logs, provider credentials, API keys, backups and incident records.
- **LLM-exposable data:** only fields explicitly approved for the intended tool/provider; default-deny private data, redact identifiers, require authorization per request and record purpose/retention.

Each asset class must specify storage bucket/path, public/private access policy, signed URL expiry where relevant, retention/deletion, caching, indexing and whether it can be sent to third-party analytics/LLM/ad providers. Never treat an unguessable URL as authorization.

## 7. Route reconciliation checklist

For every production source route/component, record:
- [ ] Existing source file or component.
- [ ] Canonical route in the private plan.
- [ ] Decision: preserve, merge, defer, retire/redirect.
- [ ] Target stage and priority.
- [ ] Public/private/admin access classification.
- [ ] Data entity/API/provider and real-data requirements.
- [ ] Privacy, copyright, consent and retention requirements.
- [ ] Empty/loading/error/unauthorized/expired states.
- [ ] SEO/indexing/canonical URL rules.
- [ ] Unit/integration/e2e acceptance tests.
- [ ] Migration and rollback implications.
- [ ] Evidence URL for implementation/preview/release once completed.

## 8. Recommended order

1. Approve this parity register and the complete route inventory.
2. Compare every source route against `product/NAVIGATION_AND_ROUTE_CATALOGUE.md`; add explicit missing routes and disposition decisions.
3. Finish feature specifications for account/CV, venue owner/admin, applications, live sports, ads/consent, PWA/native app, content taxonomy and LLM/MCP.
4. Review the data dictionary/schema plan against the source migrations; do not blindly port or run migrations.
5. Implement in the private repository, verify with tests and preview, and only plan a production cutover after explicit approval.

## 9. Audit limitations

This is a source-tree audit of `main` as observed on 2026-10-25. It is not a runtime crawl, security certification, legal opinion, third-party policy approval or proof that a named route is currently deployed. The private platform plan should record these as candidate capabilities until implementation evidence confirms otherwise.


## 10. Route-by-route parity and disposition register

This is the initial disposition proposal for source-defined routes. The product owner should approve changes before implementation. “Merge” means one canonical experience may satisfy multiple navigation entries; it does not mean delete a route without a redirect or link strategy.

| Production source route | Planned canonical route / destination | Proposed disposition | Priority / stage | Notes and acceptance condition |
|---|---|---|---|---|
| `/` | `/` | Preserve | P0 / Stage A | Reconcile content blocks, claims and data states |
| `/about` | `/about` | Add to catalogue | P2 / public foundations | Use factual organization/service claims |
| `/contact` | `/contact` | Add to catalogue | P1 / public foundations | Confirm inbox/endpoint and spam controls |
| `/search` | `/search` | Preserve | P0 / Stage A | Shared query/filter state and empty/error states |
| `/sports` | `/sports` | Preserve | P0 / Stage A | Published sports only |
| `/sports/:slug` | `/sports/:sportSlug` | Preserve/canonicalize | P0 / Stage A | One slug convention |
| `/sport/:slug` | `/sports/:sportSlug` | Merge + redirect/alias | P1 | Avoid duplicate indexing/content |
| `/sport-in-city/:slug` | `/cities/:citySlug/sports/:sportSlug` (proposed) | Add or redirect after content review | P2 | Do not create thin doorway pages; define both city and sport keys |
| `/cities` | `/cities` | Preserve | P1 | Generate only supported cities |
| `/city/:slug` | `/cities/:citySlug` | Merge + redirect/alias | P1 | Single city URL convention |
| `/district-infrastructure` | `/district-infrastructure` | Add to catalogue | P2 | Define provenance and update cadence for infrastructure data |
| `/calendar` | `/calendar` | Preserve | P1 | Shared event/trial domain; explicit timezone |
| `/events` | `/events` | Preserve | P1 | One route despite multiple menu placements |
| `/trials` | `/trials` | Preserve | P0 | Shared opportunity records and date/status rules |
| `/trial/:id` | `/trials/:opportunitySlug` or stable ID URL | Merge/canonicalize | P0 | Preserve inbound links with redirects; do not expose private IDs unnecessarily |
| `/opportunities` | `/opportunities` | Preserve | P0 | One canonical public listing |
| `/opportunities/:id` | `/opportunities/:opportunitySlug` or stable ID URL | Merge/canonicalize | P0 | Ensure old links resolve and canonical metadata is consistent |
| `/live-scores` | `/live-scores` (or approved `/live` alias) | Add explicit canonical route | P1 / later integration | Only real licensed provider data; stale/unavailable state; no mock scores |
| `/play` | `/play` | Preserve, initially limited | P2 | User-generated features deferred until moderation/auth |
| `/book` | `/book` | Preserve | P0 directory; booking later | Clearly distinguish directory from live transactional booking |
| `/train` | `/train` | Preserve | P1 | Coaching discovery overview |
| `/coaches` | `/coaches` | Preserve | P1 | Real public profiles only |
| `/academy` | `/academy` | Keep as academy landing/onboarding | P1 | Clarify relation to directory |
| `/memberships` | `/memberships` | Defer purchase; preserve info route | P2 | Do not promise entitlements before billing/access checks |
| `/login` | `/login` | Defer safely | P2 | No dead buttons; account feature only after auth/security approval |
| `/forgot-password` | `/forgot-password` | Defer with auth | P2 | Must work with chosen auth provider |
| `/onboarding` | `/onboarding` | Defer with auth | P2 | Consent, validation and data minimization |
| `/profile` | `/dashboard/profile` or public `/athletes/:slug` | Split/clarify | P1 planning, later implementation | Distinguish private self-profile from public athlete profile |
| `/dashboard` | `/dashboard` | Defer with auth | P2 | Server-side authorization required |
| `/settings` | `/dashboard/settings` | Merge/canonicalize | P2 | Include security and privacy controls |
| `/my-stats` | `/dashboard/my-stats` | Defer with profile | P2 | Define source and ownership of statistics |
| `/recommendations` | `/dashboard/recommendations` | Defer/specify | P2 | Explain ranking logic; no unsupported AI claims |
| `/cv` | `/sports-cv` | Merge/canonicalize | P1 / local-first candidate | Preserve local-only behavior and export |
| `/cv/:id` | `/sports-cv/:cvId` or `/share/cv/:token` | Split public share from private editor | P1 planning, later implementation | Public share must use revocable, scoped access; never expose private CV by guessed ID |
| `/start-from-zero` | `/start-from-zero` | Preserve | P1 | Content provenance and reviewed learning pathways |
| `/ai-guide` | `/ai-guide` | Preserve as informational page first | P1 planning; model calls later | Provider review, privacy, costs, safety and citations |
| `/learning-hub` | `/learning-hub` | Preserve | P1 | Curate canonical content rather than duplicate articles |
| `/guides` | `/guides` | Preserve | P1 | Editorial taxonomy |
| `/guide/:slug` | `/guides/:guideSlug` | Merge + redirect/alias | P1 | One canonical plural route |
| `/top-guides/:category` | `/guides/category/:category` (proposed) | Merge if useful | P2 | Only index pages with substantive content |
| `/blog` | `/blog` | Preserve only if distinct from Chronicle | P2 | Decide content ownership and canonical taxonomy |
| `/blog/:slug` | `/blog/:postSlug` | Preserve if blog remains distinct | P2 | Canonical metadata, source and author |
| `/blog/write` | private editorial workflow | Defer/private | P2 | Never public-write without roles, moderation and audit trail |
| `/chronicle` | `/chronicle` | Preserve if distinct | P2 | Avoid duplicating blog/guide content |
| `/resources` | `/resources` | Preserve | P1 | Link to original resources and licences |
| `/tools` | `/tools` | Preserve | P1 | Tool catalogue |
| `/tools/:slug` | `/tools/:toolSlug` | Preserve | P1 | Formula, assumptions, validation and tests |
| `/best-tools/:category` | `/tools/category/:category` (proposed) | Merge if substantive | P2 | No SEO doorway pages or unsupported rankings |
| `/partner` | `/partner` | Preserve | P2 | Verified contact and partner criteria |
| `/list-venue` | `/list-venue` | Preserve | P1 | Explain review; submitted data remains unpublished |
| `/admin-venue-submissions` | `/admin/venue-submissions` | Move to private admin namespace | P1 dependency, implementation later | Server-enforced admin access and audit log |
| `/careers` | `/careers` | Preserve | P2 | Current roles only |
| `/pricing` | `/pricing` | Preserve information route | P2 | Price/terms must be current and approved |
| `/mobile-app` | `/mobile-app` | Preserve information route | P2 | Only link to actually available app versions |
| `/scout-portal` | `/scout-portal` | Defer protected functions | P2 | Role, consent and access audit |
| `/talent-scanner` | `/talent-scanner` | Defer protected functions | P2 | Athlete privacy and authorized discovery |
| `/verify` | `/verify` | Preserve | P1 | Explain exact scope of verification |
| `/verification-policy` | `/verification-policy` or `/editorial-policy` | Merge after legal/editorial review | P1 | Avoid conflicting policy versions |
| `/trust-center` | `/trust-center` | Add to catalogue | P1 | Public trust overview; no sensitive security disclosures |
| `/privacy` | `/privacy` | Preserve | P0 before collection | Match actual processing and third-party providers |
| `/terms` | `/terms` | Preserve | P0 before public service launch | Owner/legal review |
| `/cancellation-policy` | `/cancellation` | Canonicalize/alias | P1 before bookings | Only describe actually offered booking terms |
| `/copyright-policy` | `/ipr` or `/copyright-policy` | Consolidate | P1 | Takedown contact and response workflow |
| `/ipr-policy` | `/ipr` or `/ipr-policy` | Consolidate | P1 | Avoid conflicting overlapping policy pages |
| `/correction-policy` | `/corrections` | Canonicalize/alias | P1 | Provide correction request and handling |
| `/editorial-policy` | `/editorial-policy` | Preserve | P1 | Link source and verification standards |
| `/posh-policy` | `/posh-policy` | Preserve only after applicability/owner review | P1 legal review | Never invent committee or contact details |
| `/robots.txt` | generated `/robots.txt` | Preserve technical endpoint | P0 before SEO launch | Environment-specific crawl policy |
| `/sitemap.xml` | generated `/sitemap.xml` | Preserve technical endpoint | P0 before SEO launch | Only canonical public URLs |
| `/ads.txt` | generated/static `/ads.txt` | Preserve when ad network requires it | P1 monetization | Exact authorized seller entries only |
| `/llms.txt` | `/llms.txt` | Optional, review | P2 | Public content guidance only; not an access-control mechanism |
| `/api/indexnow` | server-side API endpoint | Preserve if needed | P2 | Validate method, auth, key handling, abuse and provider rules |
| `/api/trials` | typed opportunity/trials API | Preserve/merge with approved API contract | P0 | Validate query parameters, publication filter, rate limit and errors |
| verification-token text route | static token verification endpoint | Preserve only if still required | P2 | No secrets or unrelated data; document ownership/expiry |

## 11. Cross-cutting parity tasks

- [ ] Add a production route alias/redirect map before changing public URLs.
- [ ] Confirm public vs authenticated vs role-protected routes at both UI and backend.
- [ ] Audit each route for source-of-truth data, SEO, analytics/ad behaviour, consent and error states.
- [ ] Map shared components to pages instead of inventing one route per component.
- [ ] Confirm all current production feature claims before copying them to the rebuild.
- [ ] Keep unimplemented/deferred routes out of navigation or show a clear, honest unavailable state.
- [ ] Record each decision with owner and date; review before release.


## 11. Detailed audit — athlete profiles and Sports CV (P0 parity gate)

**Status: Gap found — source implementation inspected; end-to-end behaviour and deployed runtime not verified.** This is a source-code review of the production repository's `main` branch, not an authorization to copy the implementation or deploy changes. Evidence links below point to the inspected source files.

### Evidence reviewed

- [`SportsCV.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/SportsCV.tsx): card/edit/split/wizard views; editor changes call the CV save helper; PNG export and sharing controls exist; reset starts with blank achievements and sets `verified: false`.
- [`SportsCVEditor.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/SportsCVEditor.tsx): editor supports athlete identity, sport/position, achievements, stats and performance metrics; Hindi label support is present in the component.
- [`AthleteOnboardingWizard.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/AthleteOnboardingWizard.tsx): six-step onboarding UI exists (identity, position, benchmarks, honours, socials/reels, finalize); imports `updateUserProfile` and CV storage helpers. A complete persistence/authorization journey was not established by this file alone.
- [`sports-cv-storage.ts`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/lib/sports-cv-storage.ts): CV load/save uses browser `localStorage` under `khelgrid_athlete_sports_cv_v2`, with in-memory fallback. `getBlankSportsCV()` is empty and unverified, but `getDefaultSportsCV()` contains a fully populated fictional-looking athlete, achievements, statistics, a coach contact and `verified: true`; all consumers must be checked to ensure it is used only in clearly labelled demos/tests.
- [`sports-cv-sharing.ts`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/lib/sports-cv-sharing.ts): public CV links can encode the entire CV as a base64url `data` query parameter; a localStorage/in-memory registry is also used for slug resolution. That registry is browser-local, not a cross-device server source of truth. Base64 encoding is not encryption or access control.
- [`ShareSportsCVModal.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/ShareSportsCVModal.tsx): sharing UI creates link/QR/social-share actions. Its success copy describes a public profile, but a production-safe server-side publication, owner authorization and revocation workflow were not demonstrated by this component.
- [`user-profile-service.ts`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/lib/user-profile-service.ts): profile reads attempt Supabase only when configured and a current authenticated user is available, then fall back to browser-local data and default profile data. The file includes seeded default profile, achievement, membership and enrollment examples. A complete write-path/RLS review is still required before relying on it for real accounts.

### Checklist and findings

| Requirement | Status | Evidence-based finding / remaining work |
|---|---|---|
| Onboarding flow | Partially verified | A six-step wizard exists. Verify required-field validation, cancel/resume behaviour, age/minor consent, accessibility, duplicate submissions and success/error states with tests. |
| Profile visibility | Gap found | Private self-profile versus public athlete profile is not proven to be enforced end-to-end. Define explicit visibility states (private, unlisted/share-link, public), consent, field-level exposure and revocation. |
| CV editor | Partially verified | A structured editor and update handler exist. Test all fields, validation, malformed/oversized input, mobile layouts and keyboard/screen-reader access. |
| Export | Partially verified | PNG card export is present. Verify generated output, failure handling, font/image loading, and whether a PDF export is actually supported; do not claim PDF parity without evidence. |
| Share links / QR | Gap found | Share URL can carry the full CV in a query string and browser-local registry. Query strings can be retained in browser history, server/proxy logs, analytics and referrer data. Prefer an opaque, revocable share token backed by a server record; exclude private contact/identity fields by default. |
| Persistence | Gap found | Sports CV data is browser-local, not a server-persisted athlete-owned record. Device/browser changes can lose access; browser data is not an authenticated source of truth. Define local draft vs account-synced state and conflict/recovery behaviour. |
| Authentication and ownership | Unable to verify | Profile service calls Supabase auth for a profile read, but this does not establish that every CV/profile read and write is authorized. Inspect all write paths, route guards, RLS policies and service-role boundaries. |
| Access rules / RLS | Unable to verify | This review has not yet traced the relevant migrations and database policies to prove that users can read/write only their own private records and that public shares expose only approved fields. |
| Verification claims | Gap found | The default CV fixture includes `verified: true` and sample achievements with verified flags. Prohibit fixture/default data from real-user flows; verification badges must be derived from a trusted review record, not user-editable CV fields. |
| Demo/sample data | Gap found | Default profile/achievement/membership fixtures exist in `user-profile-service.ts`. Confirm every consumer labels these as examples and that no seeded fixture appears as a genuine athlete, award, membership or verification in production. |
| Language support | Partially verified | English/Hindi labels and a language helper are present. Validate the full wizard, errors, exported artifacts and persistence in both languages; document unsupported translations honestly. |

### Required private-platform decisions before implementation

1. **Stage A:** Keep account/auth and private profile editing explicitly unconnected until authentication, ownership, RLS and privacy controls are implemented and tested. A local-only CV draft may be offered only with a clear local-storage warning.
2. **CV data model:** Separate private profile fields, CV content, verified achievements/evidence and public-share projection. Never trust client-supplied `verified` flags.
3. **Sharing:** Do not reproduce the full-CV-in-query-string pattern. Use a high-entropy opaque share token, server-side allowlisted projection, explicit opt-in, revocation/expiry and no-index metadata where appropriate. Avoid exposing email, phone, exact birth date, private coach contacts or evidence documents by default.
4. **Persistence:** Use authenticated owner-scoped server persistence for account-synced data; enforce access in database policies and server operations, not only in UI. Retain a separately labelled local draft mode if needed.
5. **Fixture policy:** Sample athletes, achievements, metrics, coach references, memberships and verification badges must never be presented as real records. Use empty defaults in real-user creation flows.
6. **Acceptance tests:** Cover unauthenticated access, cross-user read/write attempts, public projection allowlist, share-token revocation/expiry, local draft recovery, save failures, onboarding validation, export and Hindi/English rendering.

### Audit boundary / next steps

The source files above were inspected, but no production code or data was changed. Before marking this area **Verified**, inspect the profile/CV route definitions and guards, all profile/CV write operations, Supabase migrations/RLS policies, and relevant unit/integration/e2e tests; then execute those tests in the private platform checkout. The presence of a migration or test file alone is not proof of a passing security control.


### Additional profile-service review (write-path and query scope)

Further inspection of `user-profile-service.ts` and `supabase.ts` found additional items that must be checked before any profile service is treated as safe:

- `getUserProfile()` attempts to query the `profiles` row using the current authenticated user's ID, then falls back to local cached/default data. The default profile contains realistic-looking personal, sport and achievement claims and must not appear as a real signed-in user's record.
- `getSportsAchievements()` queries `sports_achievements` ordered by year without a visible `user_id` filter in the reviewed query, then merges locally stored achievements. Whether RLS safely scopes results is not established here. Treat this as a **high-priority authorization check**, not proof of a confirmed vulnerability until policies and runtime identity are examined.
- `getEnrolledPrograms()` queries `coaching_enrollments` joined to `coaching_programs` without a visible owner filter in the reviewed client query and falls back to sample enrollments. Verify that RLS enforces per-user access and that contact details cannot leak across accounts.
- `getUserMembership()` selects active `user_memberships` rows with `.limit(1)` but no visible user filter in the reviewed query. Verify RLS and ownership scoping; membership/entitlement status must not be inferred from an arbitrary active row.
- `addSportsAchievement()` contains a client-side insert path. Inspect the remainder of its payload and all database policies to confirm that a client cannot self-assign trusted verification fields, spoof ownership, or create records visible to other users.
- `src/lib/supabase.ts` initializes the browser client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and includes a fallback project URL if the environment is not configured. The anon key is expected to be public; security must rely on RLS and server-side authorization. The fallback URL should be reviewed for environment isolation so a misconfigured build cannot silently point at the wrong project.

**Required action for the private platform:** model all profile, achievement, enrollment and membership records with an explicit owner/tenant boundary; add owner filters where appropriate; enforce equivalent database RLS; derive verified status only from privileged review records; test cross-user reads/writes and unauthenticated requests. Keep production unchanged while doing this review.


## 12. Detailed source review — CV routes, auth guard and profile/achievement RLS

**Status: Gap found — concrete unsafe patterns are visible in source/migrations.** This remains a read-only audit of production `main`; no production migration or code was changed.

### Route and access findings

- [`src/routes/profile.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/routes/profile.tsx) wraps the profile page in `ProtectedRoute` and marks it noindex. This is a useful UI guard, but it is not a substitute for database authorization.
- [`src/routes/onboarding.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/routes/onboarding.tsx) renders the onboarding wizard without a route-level `ProtectedRoute`. If onboarding is intended to create account-bound records, its public access and persistence must be explicitly designed and tested.
- [`src/routes/cv.index.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/routes/cv.index.tsx) redirects to a CV slug derived from browser-local CV data and falls back to `aarav-sharma-cricket`.
- [`src/routes/cv.$id.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/routes/cv.$id.tsx) resolves the CV from a query payload or local registry/sample fallback, and its SEO title/description label the profile “Verified” / “official verified” without an evidenced verification lookup in this route. The public CV page also renders a “KhelGrid Verified Dossier” badge. This is a **high-priority trust and accuracy gap**.
- [`src/components/ProtectedRoute.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/ProtectedRoute.tsx) checks client auth state and an app role to decide what UI to render. It is only a frontend boundary; the data layer must independently authorize every operation.

### Share implementation and tests

- [`sports-cv-sharing.ts`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/lib/sports-cv-sharing.ts) decodes arbitrary `data` query payloads into `SportsCVData` and returns them as a public CV; the shape check only requires `athleteName` and `sport`. A payload can be supplied by the link sender; it is not authenticated, verified, owner-approved or revocable.
- Unknown slugs can fall back to generated sample athlete data; specific demo slugs return populated sample athletes. This can make a guessed/unregistered URL display data as if it were an actual public athlete.
- [`SportsCVSharing.test.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/SportsCVSharing.test.tsx) explicitly tests the `?data=` portable payload and the demo fallback records (including a “verified” sample). These tests document existing behaviour; they do not establish privacy or trust safety.
- [`ProtectedRoute.test.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/components/ProtectedRoute.test.tsx) tests rendered client-side auth/role states. It does not test Supabase RLS, direct REST access, or cross-user data isolation.

### Database policy findings from reviewed migrations

- [`20260916_user_profile_achievements_memberships.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20260916_user_profile_achievements_memberships.sql) initially creates broad policies on `user_profiles`, `sports_achievements` and `user_memberships`: public SELECT/INSERT/UPDATE for several tables and public DELETE for achievements. The migration includes `user_id` columns, but these original policies do not constrain operations to the current owner.
- [`20260927_production_hardening_and_integrity.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20260927_production_hardening_and_integrity.sql) replaces some update/delete policies with owner-or-admin checks. However, the reviewed portion does not demonstrate that the earlier public SELECT/INSERT policies were all removed/replaced for all three tables. Since permissive PostgreSQL RLS policies combine with OR semantics, a restrictive policy does not neutralize a remaining permissive policy by itself.
- [`20261020220000_harden_profile_column_privileges.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261020220000_harden_profile_column_privileges.sql) hardens the separate `public.profiles` table's column privileges and revokes anon SELECT. This is a positive control for that table, but it does not prove that the separate legacy `user_profiles`, `sports_achievements`, `user_memberships`, CV share flow, or every client write path is safe.
- [`20261020220500_revoke_unsafe_api_role_table_privileges.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261020220500_revoke_unsafe_api_role_table_privileges.sql) revokes TRUNCATE/TRIGGER/REFERENCES from browser-facing roles, but this does not itself correct broad row-level policies.
- [`20261020224000_restrict_verification_self_approval.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261020224000_restrict_verification_self_approval.sql) applies column-level restrictions to academy/organizer verification. That is a useful pattern, but athlete achievement verification requires its own equivalent control and evidence-backed review workflow.

### Audit conclusion for P0 athlete/CV

**Do not copy the current CV share implementation or legacy profile/achievement policies into the private rebuild.** The private plan should use:
1. Authenticated owner-scoped private profile/CV storage.
2. Database RLS and grants verified with anonymous, authenticated-owner, authenticated-other-user and admin test identities.
3. Separate public CV projection with an explicit field allowlist and an opt-in publication record.
4. Opaque random share tokens stored server-side, with expiry/revocation and no private data in URL query strings.
5. Trusted verification status stored separately and only writable through a privileged, audited review workflow.
6. Empty/unverified defaults for real users; clearly labelled sample fixtures only in isolated demo/test contexts.
7. SEO metadata that says “verified” only when a trusted verification record exists; no fabricated fallback CV on unknown slugs.
8. Tests for direct API access and RLS, not only React component render tests.

### Completion state

| Check | Status |
|---|---|
| Profile route client guard | Partially checked; UI guard exists, server/database boundary still required |
| CV route access | Gap found; public route accepts client-provided CV payload and sample fallbacks |
| CV persistence | Gap found; browser-local storage/registry, no server-owned CV record demonstrated |
| Share revocation and access | Gap found; no server-side token lifecycle demonstrated |
| Verification integrity | Gap found; default sample and route metadata imply verification without route-level evidence |
| RLS for legacy profile/achievement/membership tables | Gap found; reviewed historical migration defines broad public policies; full final effective policy state still needs complete migration-chain and live-schema confirmation |
| Runtime security tests | Unable to verify; no live tests executed as part of this source review |


## 13. Next parity area — venue directory, submissions and booking operations

**Status: Partially checked; source/migration review found both safeguards and unresolved operational questions.** This section is a source-level audit only. It does not confirm the current production database has these migrations applied or that the live booking journey works.

### Evidence reviewed

- [`src/routes/book.tsx`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/routes/book.tsx) loads directory venues from Supabase when configured and does not automatically fill the directory with the imported sample `VENUES` list in the inspected effect. However, its SEO description says “verified” and “instantly reserve” more broadly than this source inspection can substantiate. Loading/empty/error presentation and all booking paths require a UI test pass.
- [`src/lib/booking-service.ts`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/src/lib/booking-service.ts) reads booking records from Supabase only, requires a selected court, calls a slot-availability RPC, and refuses to use a non-atomic insert fallback when the atomic RPC fails. It also checks that the selected venue exists in the database and rejects nonpositive/missing hold prices. These are positive source-level controls.
- [`20261024060000_venue_court_pricing_hours_phase1.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261024060000_venue_court_pricing_hours_phase1.sql) introduces explicit `booking_enabled`, court-specific pricing and operating-hour validation; booking requires an active court and positive published rate.
- [`20261024070000_court_availability_phase2.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261024070000_court_availability_phase2.sql) defines a court/date availability RPC and comments that the atomic booking RPC validates enabled court, rate, verified hours, overlaps and creates pending requests. The actual deployed RPC definition was not retrieved/verified in this review.
- [`20261024030000_venue_submission_intake.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261024030000_venue_submission_intake.sql) creates a private intake queue, allows public submission only in pending/unreviewed state and restricts reads/review to admins under the migration's role model.
- [`20261024040000_venue_submission_review_publish.sql`](https://github.com/khelgrid-dotcom/khelgrid-monetization-studio/blob/main/supabase/migrations/20261024040000_venue_submission_review_publish.sql) implements admin-only review/publication and requires approval, address and supported booking method before publication. The created venue starts without a published price/rating, which is safer than guessing one.

### Findings and remaining checks

| Requirement | Status | Finding / next action |
|---|---|---|
| Live directory source | Partially verified | Supabase query is present; verify configured/unconfigured, empty, permission error and network error UI states. |
| Fake/sample venue separation | Partially verified | Booking rejects a venue not found in DB. Audit every UI action to ensure sample cards cannot enter a booking flow and no sample listing is described as verified. |
| Court-specific rate | Partially verified | Client requires a published positive rate for holds and migration adds constraints. Verify atomic booking RPC independently recalculates and persists the authoritative DB rate, ignoring client totals. |
| Operating hours | Partially verified | Validation helper exists. Verify booking RPC checks the selected court's schedule and the venue/court verification timestamp; test closed days, missing hours, invalid time, overnight and timezone cases. |
| Availability / overlap | Partially verified | Availability RPC and atomic booking call exist in source; deployed function body and concurrent booking test results remain unverified. Confirm expired holds are ignored and two simultaneous requests cannot both succeed. |
| Booking access and privacy | Unable to verify | `getVenueBookings()` selects booking rows without a visible user filter in the client query. RLS must ensure users see only their own bookings (and admins/venue operators only authorized scopes). Test direct API access, not only UI filtering. |
| Booking confirmation / cancellation | Partially checked | Current flow reports a pending request and says to contact the venue for confirmation. Inspect cancellation RPC, status transitions and authorization before claiming end-to-end transactional booking. |
| Venue submission intake | Partially verified | Migration has validation and admin-only review intent. Verify the admin role lookup is consistent with the canonical auth/profile schema and test anonymous submit, user read denial, admin review and non-admin rejection. |
| Publication quality | Partially verified | Publication checks address and booking method and avoids guessed rating/price. Ensure published venue remains non-bookable until each court has confirmed hours and a verified positive court rate. |
| Migration/deployment state | Unable to verify | Repository migration files do not prove they are applied to the target DB. Confirm migration history and inspect live RPC/table/policy definitions in the intended non-production environment only. |

### Private-platform acceptance rules

1. Keep venue directory discovery read-only until there are genuinely reviewed venue records.
2. Make booking impossible unless the venue is published, the selected court is active and booking-enabled, its own verified price and schedule are present, and the server confirms availability.
3. The database—not the browser—must compute total price from the selected court's current published price and duration. Reject client-submitted price overrides.
4. Enforce overlap prevention and idempotency inside one database transaction/RPC; fail closed if the protection service is unavailable.
5. Keep booking details private by owner; public availability responses must expose only minimum slot status and times, not names, contact details, email or booking identifiers.
6. Use explicit statuses such as requested/pending, venue-confirmed, cancelled and completed; never show “confirmed” merely because a request was inserted.
7. Test venue owner intake, admin review, publication, court setup, pricing, operating hours, holds, overlapping requests, cancellation and unauthorized access using a disposable development database.
8. Do not apply migrations to production during this parity audit. Do not seed fake venues or publish guessed prices.



## 7. Follow-up source audit: trials, notifications, live sports, ads and technical endpoints

**Scope:** read-only inspection of named files on production repository `main`; no runtime execution, provider verification, deployment inspection or database-policy evaluation was performed. These are source findings, not claims about current production runtime.

### 7.1 Trials and opportunity data — gaps found

Files inspected: `src/lib/trials-service.ts`, `src/services/trials-database-service.ts`, `src/routes/api.trials.ts`, `src/routes/sitemap[.]xml.ts`.

- `fetchAvailableTrialsFromSupabase` queries the `trials` table and filters active/upcoming statuses, then filters by event end date. It returns query errors and does not merge static cards into a successful database response. This is a positive fail-closed behaviour for that service.
- A separate `trialsDatabaseService` still falls back to the static `TRIALS` array for summary stats and individual trial detail when the database is unavailable or a lookup fails. Callers must visibly distinguish that fallback from current, source-verified database records; otherwise the same site can have inconsistent source-of-truth behaviour.
- `/api/trials` directly serializes static `TRIALS`, with public wildcard CORS and a cache lifetime up to 24 hours at shared caches. Its payload includes source URLs and a `verified` value derived from `verifiedLabel`; this endpoint is not database-backed in the inspected file. A client could therefore receive dated static records even if the live database service has no rows.
- Sitemap opportunity URLs are generated from static `TRIALS`; its last-modified date is a hard-coded constant. Venue URLs likewise come from static `VENUES`. This can index stale/non-authoritative listings or URLs that don't correspond to live database entities.
- **Required follow-up:** consolidate public listing/API/sitemap/detail views onto one authoritative data path; distinguish source-published vs independently verified; validate source evidence, fee/eligibility/date/expiry; use bounded cache invalidation; add tests for empty/error/archive/upcoming cases and sitemap/API consistency. Do not delete data or alter production until owner approval and evidence review.

### 7.2 Notifications — prototype/local state and authorization risks

File inspected: `src/services/notification-worker-service.ts`.

- The module contains hard-coded sample subscriptions and a test-looking FCM token in `DEFAULT_SUBSCRIPTIONS`; local storage falls back to these defaults when there is no saved value or parsing fails. This is demonstration state and must never be treated as a real subscriber/device.
- `subscribeToTrialAlerts` accepts `userId` and `fcmToken` from the caller, tries a Supabase upsert, then returns `success: true` even if the database write did not succeed. The return shape exposes `isSupabaseLive`, but callers must not interpret `success` alone as durable subscription.
- `getNotificationSubscriptions` queries using caller-provided user ID or FCM token. Its fallback returns the entire local list if the requested filter finds no matches, which can expose unrelated local subscription records to UI callers. The function also starts with `isSupabaseLive = false` and only returns true on one successful non-empty branch.
- `unsubscribeFromTrialAlerts` updates by subscription ID without a visible user filter in this client function and returns `success: true` even if persistence failed. Effective RLS/constraints may mitigate database access, but they were not evaluated here.
- **Required follow-up:** remove sample tokens/subscriptions from production defaults; make persistence result explicit; require authenticated identity and server/database ownership checks; make reads return only exact matches (no unfiltered fallback); bind unsubscribe to owner or an unguessable verified device credential; implement real server-side push delivery and retry/idempotency before claiming notifications work. Test unauthorized cross-user reads/writes and opt-out behaviour.

### 7.3 Live sports — external headlines are not a score API

Files inspected: `src/routes/live-scores.tsx`, `src/lib/live-sports-service.ts`, `src/data/liveSports.ts`.

- The live-score page initializes its state from `LIVE_SPORTS_UPDATES`, a static fixture array. The page itself labels its refresh action as a status check and tells users that live data is not connected; refresh does not fetch scores.
- A separate service tries to parse Google News RSS search results using regular expressions and infers teams, sport, status and scores from article headlines. It can also ask a server-side Gemini model to return a JSON list of purported current matches. News headlines and generated search summaries are not authoritative structured match-state feeds; inference can misclassify sports, scores or live status.
- The service response type and source comments should not be interpreted as proof that a licensed/official score provider is connected. The inspected code does not establish a provider contract, match identifiers, score validation, per-sport structured endpoints, source freshness guarantees or rights to redistribute official live data.
- **Required follow-up:** keep fixture/demo data visibly marked and excluded from claims of live service; select a real provider with documented terms, coverage, attribution and commercial redistribution rights; implement server-side adapters, secret handling, normalization, stale-data detection and rate limits; use official match IDs/status and never derive scores from news text; test stale/error/empty states. No provider should be called “connected” until a real integration is configured and verified.

### 7.4 Advertising and consent — implementation exists, policy compliance unverified

Files inspected: `src/components/ads/AdConsent.tsx`, `src/components/ads/AdConsentBanner.tsx`, `src/components/ads/AdSenseLoader.tsx`, `src/lib/ump-web.ts` (loader integration referenced from consent module).

- Consent is stored in browser local storage with `unknown`, `granted`, and `denied` states. The banner labels “Non-personalized” and “Accept all”; the code comment says ads are not requested until consent is resolved in consent-required mode.
- The provider's default `requireConsent` is `false`; therefore the actual application-level provider configuration and every loader/slot call site determine whether script loading waits for a choice. The banner alone is not proof that all ad requests are blocked before consent.
- “Non-personalized” is not the same as “no tracking/no storage” or a legally valid consent refusal in every jurisdiction. Consent Mode/UMP wiring, geography, vendor disclosures, retention, withdrawal, tag order, mobile/native ad consent and actual network requests were not tested.
- AdSense loader is guarded by an environment-variable wrapper according to its comments, but the actual production environment and AdSense account approval/ads.txt state were not checked.
- **Required follow-up:** audit provider props and all ad slot/analytics tags; verify real network requests in clean browser sessions for unknown/granted/denied and privacy-settings reset; confirm current Google publisher policies and applicable privacy rules; test native Android consent separately; ensure denied/unknown states do not load unauthorized trackers or personalized ad requests. Do not promise compliance from source comments alone.

### 7.5 Technical endpoints and SEO — actionable source issues

Files inspected: `src/routes/api.indexnow.ts`, `src/lib/indexnow.ts`, `src/routes/api.trials.ts`, `src/routes/robots[.]txt.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/llms[.]txt.ts`.

- `GET /api/indexnow` submits the first 100 sitemap URLs to an external indexing service. `POST /api/indexnow` accepts a caller-supplied `urls` array and forwards it after only basic normalization/length bounding. There is no visible authentication, rate limiting, same-host allowlist, or URL validation in this route/service. This creates an abuse surface and permits submissions outside the intended canonical host because absolute URLs beginning with `http` are passed through.
- The IndexNow key is a public protocol key and is returned in the GET JSON; the important controls are correct host/key-file verification and abuse resistance, not treating that public key as a password.
- Sitemap generation uses a fixed last-modified date, includes static trial and venue catalog entries, and includes a query-string archive URL. It does not prove every URL returns canonical 200 or has index-worthy content.
- The `llms.txt` fallback contains strong claims such as “verified,” “zero fake trials,” “real-time searchable,” “Khelo India accredited,” “real-time scores,” and “book ... across Indian metro cities.” These claims need evidence and should not be emitted as fallback copy unless current capabilities substantiate them. It also advertises the static-backed trials API as delivering verified trials.
- `robots.txt` explicitly allows many crawlers, including LLM-related user agents; that is a policy choice, not an automatic compliance requirement. Confirm desired crawl permissions and ensure disallowed/private routes are protected by authorization, not merely robots directives.
- **Required follow-up:** restrict IndexNow POST to canonical owned-host URLs, validate scheme/host/path, cap request size/count and rate-limit; add auth or a signed internal trigger if endpoint is intended for internal use; dynamically set trustworthy lastmod values; verify sitemap URL responses and content; fact-check `llms.txt` claims; explicitly approve crawler policy.

### 7.6 Updated completion status

| Area | Status after this pass | Still required |
|---|---|---|
| Production route parity | Partial source inventory | Route-by-route mapping and approved preserve/merge/defer/retire decisions |
| Athlete profiles and Sports CV | Source review found material gaps | Effective RLS chain, write-path audit, owner-scoped persistence, secure share-token design and access tests |
| Venue operations | Partial source review; safeguards exist in code/migrations | Verify effective policies/RPCs, server-calculated pricing, concurrency, expiry and cancellation tests |
| Trials and opportunity lifecycle | Source audit found split data paths | Unify authoritative DB/API/sitemap path; source verification and lifecycle tests |
| Notifications | Source audit found demo defaults and persistence/ownership risks | Remove samples, owner-bound access, real delivery worker, honest persistence status |
| Live sports | Source audit found static fixtures and inferred news/Gemini data path | Genuine licensed structured provider and verified freshness/error handling |
| Monetization and consent | Source review only | Test actual provider/tag behaviour, all consent states, geography and native app |
| Mobile/PWA | Not yet audited in detail | Inspect manifests, service worker, Android permissions/ad consent/deep links |
| AI/LLM/MCP | Partial source inventory only | Inspect tool schemas, auth, least privilege, injection/data leakage, quotas and logging |
| Operations | Partial source inventory only | Inspect workflows, backup/restore evidence, release gates, monitoring and secret scopes |
| Technical endpoints | Source audit found IndexNow and SEO consistency risks | Harden endpoint, verify sitemap/crawler/llms claims against real responses |

**Safety boundary unchanged:** no production files, database, settings, migrations or deployments were changed. This pass edited only the private planning audit document. No tests or live endpoint checks were run as part of this source-only pass.


## 8. Follow-up source audit: mobile app, MCP, CI and backup operations

**Scope:** read-only inspection of production `main` files `.github/workflows/weekly-supabase-backup.yml`, `.github/workflows/trial-opportunity-data-policy.yml`, `.github/workflows/chatgpt-mcp.yml`, `chatgpt-mcp/README.md`, `chatgpt-mcp/api/mcp.ts`, `app/src/main/AndroidManifest.xml`, `app/src/main/java/com/khelgrid/app/MainActivity.kt`, `app/src/main/java/com/khelgrid/app/ads/AdMobManager.kt`, `package.json` and `vite.config.ts`. No workflow was executed and no mobile build was run.

### 8.1 Android / mobile app — source exists, release readiness not established

- Android manifest requests internet, network-state and advertising ID permissions; declares the Google official sample AdMob application ID. This is appropriate for test builds but not evidence of a production AdMob configuration or monetization readiness.
- `MainActivity` calls `initialiseAdsWithConsent(this)` before rendering the Compose UI and includes a banner-ad component in the bottom navigation layout. The consent implementation was not fully traced end-to-end in this pass; verify that no ad request or SDK initialization capable of requesting ads occurs before the UMP consent callback resolves for the relevant geography.
- The manifest has `allowBackup="true"`; inventory the local/session data written by the app and decide whether backups should include any tokens, personal data, cached profile information or wallet/session state. Do not assume Android backup settings are safe by default.
- The source tree contains a native app and ad manager, but this audit did not inspect the full navigation/deep-link/session implementation, app signing, release workflow, Play Store listing, accessibility or device tests. No claim of native parity or release readiness is warranted.
- **Required follow-up:** maintain separate test/production ad identifiers; confirm UMP gating through instrumentation/network tests; review Android backup/data-extraction rules and sensitive local storage; document deep links and supported screens; build and test release variants on representative Android versions.

### 8.2 ChatGPT MCP integration — appropriately read-only in design, but not launch-verified

- `chatgpt-mcp/README.md` describes a separate Vercel project using Supabase URL plus anon key, expressly rejects a service-role key, and limits the first version to public opportunity search/detail tools. The MCP handler selects published opportunities and enforces the same status filter in its query.
- The tool schema caps query fields and result counts; database errors return a generic user-facing message while logging an error code. This is a useful least-privilege direction.
- The README itself says this is a development scaffold, requires PR typecheck and a real MCP Inspector test, and calls out missing rate limiting/abuse monitoring. The endpoint has not been proven deployed, connected to the intended Supabase project, or tested with MCP Inspector in this audit.
- **Required follow-up:** verify effective anonymous RLS on the actual project; test malformed requests, query escaping, published/unpublished filtering and sensitive-field minimization; add rate limits/abuse controls and request-size limits at the hosting edge; verify canonical opportunity URLs; run typecheck and MCP Inspector; document data retention and prompt-injection boundaries. Never include private profile, application, payment, wallet or booking tools without a separate authorization design and approval.

### 8.3 CI and release checks — declared gates are not evidence they passed

- The data-policy workflow pins Node.js 22 and runs `npm ci`, the mandatory data-policy script, tests, lint and build for pull requests and pushes to `main`. This is a useful declared quality gate; actual run status was not queried in this source review.
- The MCP workflow uses Node.js 22 but runs `npm install` rather than `npm ci`, then typecheck only. Reproducible install should be preferred where a committed lockfile exists; add tests and security checks as the endpoint matures.
- `vite.config.ts` configures the dev server with `allowedHosts: true`, `cors: true`, and `Access-Control-Allow-Origin: *`. This is development-server configuration, not a production security guarantee; verify that these settings are limited to local/dev and do not unintentionally broaden any exposed preview server.
- **Required follow-up:** inspect recent workflow runs and required branch checks, confirm lockfile and exact Node/npm versions, test the production build, and keep protected deployment/merge gated on passing checks. No checks are represented as passing based solely on workflow YAML.

### 8.4 Backup and recovery — encrypted scheduled dump exists, restore proof is missing

- The weekly backup workflow schedules a Sunday run and also permits manual dispatch. It checks for a database URL and passphrase, creates a PostgreSQL custom-format dump, encrypts it with OpenSSL AES-256-CBC/PBKDF2, calculates a SHA-256 checksum, removes the unencrypted dump, and uploads the encrypted artifact with 90-day retention.
- The inspected workflow does **not** perform a restore drill or validate the backup by restoring into an isolated disposable database. A non-empty encrypted file plus checksum does not prove decryption, logical consistency or recoverability.
- The workflow uses repository secrets; verify the scope and environment protection of these secrets, access to backup artifacts, retention needs, passphrase escrow/rotation, artifact download permissions and whether backups include Supabase-managed objects or only the database dump.
- **Required follow-up:** create a documented restore runbook and scheduled isolated restore verification; verify checksums before decryption; run `pg_restore --list` and an actual restore against a disposable database; test schema/data counts and key constraints; record recovery time and recovery point objectives; ensure backup credentials are read-only where possible and artifact access is restricted. Never run a restore against production as part of an audit.

### 8.5 Operations and release status summary

| Area | Source-level conclusion | Not yet proven |
|---|---|---|
| Android / PWA | Native Android source and UMP/AdMob code exist; test ad ID is configured | Consent timing, backup privacy, release signing, actual builds/device tests, full PWA scope |
| AI / MCP | Read-only public opportunities scaffold with anon key and published-status filter | Deployment, effective RLS, MCP Inspector, rate limits and abuse tests |
| CI / release | Workflows declare Node 22, tests/lint/build and MCP typecheck | Current run results, required checks, successful build or merge readiness |
| Backups | Scheduled encrypted dump workflow and 90-day artifact retention exist | Successful scheduled runs, decryption/restore drills, recovery evidence, artifact/secret access review |

**Current audit coverage:** all ten requested parity areas now have at least some source-level inventory or findings in this document. This does **not** mean all ten are fully audited or implemented. Highest priority remaining work is runtime/effective-RLS verification, test execution, canonical route mapping and documented acceptance criteria. No production files, DB, settings, migrations, deployments or PR merge actions were performed.


## 9. User-requested six-area status table and completion criteria

This table supersedes any older summary that says these areas simply “need detailed audit.” Source inspection has begun for all six, but source inspection is not the same as end-to-end verification.

| Priority | Area | Current status | What remains to call it complete |
|---|---|---|---|
| P0 | Production route parity | **Partially checked — source route inventory recorded** | Generate a canonical route/alias/redirect matrix from production source and private routes; decide preserve/merge/defer/retire for every route; check navigation, HTTP status, canonical URLs, metadata, auth gates and tests. |
| P0 | Athlete profiles and Sports CV | **Detailed source review started; material security/data gaps found** | Trace every read/write path and final effective RLS policy for legacy and current profile tables; prove owner isolation; replace local-only profile/CV persistence where cross-device persistence is required; remove unverified “verified” claims/sample fallbacks; design private-by-default sharing with revocable opaque tokens and field allowlist; test exports and unauthorized access. |
| P0 | Venue operations | **Detailed source review started; some safeguards found, runtime unverified** | Verify all migrations/RPC definitions are actually applied to the intended non-production DB; prove admin-only publication, owner-scoped submissions/bookings, server-calculated published price, hours and court availability, hold expiry, overlap/concurrency safety, cancellation transitions and UI loading/empty/error states; execute integration tests. |
| P1 | Trial applications and notifications | **Source review started; split data paths and notification risks found** | Trace application state transitions and authorization; define evidence and expiry rules; unify DB/API/detail/sitemap as one authoritative source; remove demo notification defaults; prove owner-bound subscriptions, actual durable persistence, push delivery, retries, opt-out and schedule behaviour. |
| P1 | Live sports | **Source review started; no verified structured score provider established** | Choose provider with documented terms/coverage and commercial redistribution permission; implement real server-side adapter and match IDs; validate freshness/stale states, caching, rate limits, audio controls and provider outages; prove UI never presents fixtures or inferred headlines as live scores. |
| P1 | Monetization and consent | **Source review started; consent implementation exists, compliance unverified** | Inventory every ad/analytics/third-party tag and placement including native Android; test actual network requests before choice, after grant, after denial and after withdrawal; validate regional consent/UMP behaviour, AdSense account/ads.txt and provider configuration; check layout, frequency, policy disclosures and privacy settings. |

### Acceptance gate for these six areas

Mark an area **verified** only after all applicable evidence exists in the private branch: (1) source diff/review, (2) migrations and effective DB policies reviewed against the intended dev/staging project, (3) automated tests executed with recorded result, (4) manual or integration test evidence for key success and failure paths, and (5) product-owner approval of route/data/provider decisions. Until then, use “partial source audit” or “blocked on verification,” not “complete.”

**Execution boundary:** this update is a status/acceptance-criteria document only. It does not claim tests were run, provider licensing was confirmed, migrations were applied, production was changed, or any feature is complete.


## 10. User-requested P1 audit tracker: mobile/PWA, AI/LLM, technical endpoints and operations

These four areas have source-level notes in earlier sections, but the user requests that they remain explicit tracker rows. They are **not complete**; the statuses below distinguish source inspection from runtime/security verification.

| Priority | Area | Current status | What remains |
|---|---|---|---|
| P1 | Mobile and PWA | **Partial source audit; needs detailed verification** | Inspect the complete Android/PWA implementation, manifest, service worker/offline caching, install prompts and update flow; test deep links and route handling; compare web/mobile screens and account/data behaviour; verify permissions, local storage/backup exclusions, consent-before-ad-request, accessibility, signing and real device/release builds. |
| P1 | AI and LLM integration | **Partial source audit; needs detailed verification** | Inventory all MCP/LLM tools and provider configuration; verify the deployed endpoint and environment separation; test effective authorization/RLS and private-data boundaries; validate input/output schemas, prompt-injection resistance, untrusted source handling, secret exposure, tool permissions, rate limits, logging/retention and failure behaviour; run MCP Inspector and relevant automated security tests. |
| P1 | Technical endpoints | **Source review found IndexNow/SEO consistency risks; needs endpoint tests** | Enumerate every API, text and verification endpoint; check actual status codes, response schemas, cache/CORS/security headers, authentication, validation, rate limits and error responses; constrain IndexNow URLs to the canonical owned host; test robots.txt, sitemap.xml, ads.txt, llms.txt, API endpoints and canonical/indexing rules against the intended release. |
| P1 | Operations | **Partial workflow source audit; needs operational evidence** | Inspect actual CI/deployment runs, required checks, branch protections and release approvals; confirm Node/npm/lockfile reproducibility; verify secret scopes, monitoring/alerts and error reporting; prove encrypted backups can be decrypted and restored into an isolated database; document incident response, rollback, RPO/RTO and recovery ownership. |

### Evidence required before changing status to complete

- **Mobile/PWA:** a real production build plus installation, navigation/deep-link, offline/update and consent tests on supported browsers/devices.
- **AI/LLM:** tool-by-tool authorization matrix, privacy/data-flow review, injection and unauthorized-access tests, and successful MCP Inspector verification against a non-production deployment.
- **Technical endpoints:** automated contract/security tests plus real HTTP response checks for success, invalid input, unauthenticated requests, rate limits and unavailable dependencies.
- **Operations:** links/results for required CI and deployment checks, monitoring/error reporting evidence, and a successful isolated backup restore drill.

**Safety and accuracy note:** this is a private-repository audit-tracker update. It does not claim that the above tests were executed, the backup restored successfully, any provider is live, or production was changed. The production repository, database and deployment remain untouched.


## 11. Consolidated ten-area tracker (latest status)

Use this consolidated table as the current summary. Earlier sections preserve detailed source findings and audit notes.

| Priority | Area | Current status | What remains |
|---|---|---|---|
| P0 | Production route parity | **Partially checked** | Reconcile every production source route, alias, dynamic route, API/text endpoint and redirect against the private plan; approve preserve/merge/defer/retire decisions; test navigation, status codes, canonical metadata and auth gates. |
| P0 | Athlete profiles and Sports CV | **Needs detailed verification; source review has identified material gaps** | Verify onboarding, profile visibility, CV editor, sharing/export, persistence and final effective access rules; audit every read/write path; test owner isolation and remove unverified “verified” claims/sample fallback. |
| P0 | Venue operations | **Needs detailed verification; source safeguards found** | Verify owner submissions, admin review/publication, DB-authoritative pricing, operating hours, availability, expired holds, concurrent booking transactions, ownership, cancellation and applied migrations/RPCs in non-production; execute integration tests. |
| P1 | Trial applications and notifications | **Needs detailed verification; source review found split paths and notification risks** | Trace application state machine, applicant ownership, evidence and expiry; unify DB/API/detail/sitemap truth; verify real subscription persistence, scheduled delivery, retry/idempotency, unsubscribe and opt-out; remove sample defaults. |
| P1 | Live sports | **Needs detailed verification; no authoritative structured score provider established in inspected source** | Inspect adapters, caching, audio and stale-data behaviour; confirm provider coverage, licensing/redistribution terms and real credentials; test freshness, failures and rate limits; prevent fixtures/news inference from appearing as live scores. |
| P1 | Monetization and consent | **Needs detailed verification; consent implementation exists, compliance unverified** | Trace every ad loader/placement, analytics tag and third-party integration; test unknown/granted/denied/withdrawn states and actual network requests; validate UMP/geography, AdSense/ads.txt configuration, privacy disclosures and native app behaviour. |
| P1 | Mobile and PWA | **Needs detailed verification; partial Android source audit recorded** | Inspect Android/PWA install, manifest, service worker/offline updates, deep links, permissions, web/mobile parity, local-data backup rules and consent; run real device and release-build tests. |
| P1 | AI and LLM integration | **Needs detailed verification; partial read-only MCP source audit recorded** | Inspect every MCP tool/provider and environment; verify authorization/RLS, private-data boundaries, input/output validation, prompt-injection resistance, secrets, rate limits and retention; run security tests and MCP Inspector against non-production. |
| P1 | Technical endpoints | **Needs detailed verification; IndexNow and SEO risks found in source** | Verify endpoint implementations and real responses/status codes, access controls, validation, cache/CORS/security headers and errors; harden IndexNow; test robots, sitemap, ads.txt, llms.txt and canonical/indexing rules. |
| P1 | Operations | **Needs detailed verification; workflow definitions reviewed, operational evidence missing** | Inspect actual workflow runs and release gates, monitoring/error reporting, branch protection and secret scopes; confirm dependency/toolchain reproducibility; perform an isolated backup restore drill and document rollback, incident response and RPO/RTO. |

**Global status:** no area is fully verified end-to-end from the evidence gathered so far. “Source reviewed” means code/configuration was inspected; it does not mean tests passed or a live service is working. Completion requires recorded test/runtime evidence and owner approval where decisions affect data, providers, migrations or production.
