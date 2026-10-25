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
