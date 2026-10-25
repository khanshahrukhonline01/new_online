# Navigation and Route Catalogue

**Status:** Proposed route catalogue based on the supplied KhelGrid navigation. **Not proof that routes currently work.**
**Source:** Project owner supplied URL list. Public URLs are references to the existing KhelGrid site, not implementation verification for this private project.
**Rule:** Treat each route as planned until the private app implements it and tests confirm it.

## 1. Compete

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Search Trials and Opportunities | `/search` | Search and filter published opportunities | Shared search entry; do not duplicate opportunity data |
| Sports Calendar | `/calendar` | Date-oriented view of sourced sports events/trials | Define event vs opportunity data model |
| Live Trials | `/trials` | Current/open trial discovery | Filter opportunities by status/date; no separate duplicated listings |
| Opportunities | `/opportunities` | Full opportunity directory | Canonical directory |
| Events & tournaments | `/events` | Event/tournament directory | Also linked under Play & train; one canonical route |
| Verify | `/verify` | Verification guidance or submission/status workflow | Define what is actually verified; no unsupported guarantee |
| Talent Scanner | `/talent-scanner` | Athlete discovery/scouting tool | Requires consent, permissions, and privacy/security design before launch |
| Scout Portal | `/scout-portal` | Scout-facing workspace | Authentication/authorization needed for private features |

## 2. Play & train

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Play · Find games | `/play` | Find recreational games/players | Community/user-generated content requires moderation and privacy design |
| Book venues | `/book` | Venue/court discovery and eventual booking | Directory and transactional booking must be distinguished |
| Train · Coaching | `/train` | Coaching discovery | Avoid duplicate coach records |
| Coaches | `/coaches` | Coach directory/detail pages | Define profile consent and verification rules |
| Memberships | `/memberships` | Membership information and eventual account entitlements | No paid entitlement until billing/access control exists |
| Events & tournaments | `/events` | Canonical event/tournament route | Duplicate navigation placement is intentional; do not build a second page |

## 3. Learn

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| Start From Zero | `/start-from-zero` | Beginner learning path | Content editorial/review requirements apply |
| AI Guide | `/ai-guide` | AI-assisted sports information | Requires approved LLM provider, source grounding, privacy controls and clear AI labelling |
| Guides | `/guides` | Guides index/detail pages | Avoid duplicate articles across content hubs |
| KhelChronicle | `/chronicle` | Editorial/news publication | Confirm canonical brand spelling and route; source/copyright rules apply |
| Blog | `/blog` | Blog index/detail pages | Define how it differs from Chronicle and Guides |
| Sports & Learning Hub | `/learning-hub` | Cross-topic learning hub | Curate links to canonical content rather than copying articles |
| Tools & calculators | `/tools` | Utility directory and tool pages | Define calculation logic, limits and test cases |
| Resources | `/resources` | Resource directory | Avoid duplicating Guides/Tools without clear taxonomy |

## 4. Grow

| Navigation label | Proposed path | Primary responsibility | Notes |
|---|---|---|---|
| For Academies | `/academy` | Academy information/onboarding | Distinguish marketing pages from authenticated academy portal |
| Partner with Us | `/partner` | Partnership information/contact | Use verified contact details and a safe form backend |
| List Your Sports Venue | `/list-venue` | Venue submission/onboarding | Submission needs validation, moderation and explicit publication approval |
| Careers | `/careers` | Open roles and hiring information | Show only real, current roles |
| Pricing | `/pricing` | Plans and pricing | No invented prices; billing claims must match product capability |
| Community | `/community` | Community entry point | Requires moderation/privacy rules for interactive features |
| Cities | `/cities` | City directory and location discovery | Only list cities supported by real content |
| Mobile App | `/mobile-app` | App availability/download information | Do not claim app-store availability until verified |
| My Dashboard | `/dashboard` | User-specific dashboard | Must be private/noindex; requires authentication and server-side authorization |

## 5. Shared route rules

- Use one route definition and one canonical URL per resource. Multiple navigation links may point to the same route.
- Define page purpose, audience, public/private classification, source of truth, dependencies, states, SEO/indexability, acceptance criteria and owner before implementation.
- Public informational routes may be crawlable if useful and canonical. Dashboards, scout workspaces, private CVs, submissions and account routes must not expose private content or be indexed.
- Use redirects/canonical tags for aliases rather than duplicate pages. Query strings must not contain personal or confidential data.
- Navigation visibility is not authorization. Protected actions require backend/database authorization.
- Do not expose a route as “working” merely because a placeholder renders. Show clear planned/unavailable states until integrations are real.
- Keep the route catalogue aligned with `WEBSITE_PAGE_INVENTORY.md`, route definitions, sitemap and tests.

## 6. Route readiness checklist

For every route:
- [ ] Product purpose and owner approved.
- [ ] Public/private classification and authorization defined.
- [ ] Data source, provenance and publication rules defined.
- [ ] Loading, empty, unavailable, not-found and permission-denied states defined.
- [ ] Mobile, keyboard and accessibility checks defined.
- [ ] Metadata, canonical, sitemap and noindex behaviour defined.
- [ ] Tests cover success, failure and unauthorized access.
- [ ] External links, provider terms and privacy impact reviewed.


## 7. Detailed page and subpage inventory

This section defines the intended page hierarchy and content responsibilities. Bracketed segments such as `:slug` or `:id` are route parameters, not literal URLs. Create detail pages only when a real, published record exists. Do not create thin pages or fake records to fill out the route tree.

### 7.1 Global and home

- `/` — **Home**
  - Purpose: explain KhelGrid and route visitors to Compete, Play & train, Learn and Grow.
  - Sections: primary search, featured sports, currently valid opportunities, venue discovery, learning links, city discovery, venue/partner CTA.
  - Data: only published records; show counts only when calculated from current eligible records.
  - States: loading, meaningful empty state, data unavailable; no fabricated metrics.
- `/about` — About KhelGrid; mission, service scope and accurate team/company claims.
- `/contact` — contact options; use only confirmed contact details and a protected form endpoint if a form is offered.
- `/help` — help index, common questions and escalation/contact guidance.
- `/sitemap` — human-readable sitemap generated from canonical public routes.
- `/not-found` — not-found state; should return a real 404 response where hosting/router supports it.
- Global shell: header/navigation, mobile navigation, search entry, breadcrumbs where useful, footer, consent/settings entry, skip link and accessible focus handling.

### 7.2 Compete: search, trials and opportunities

- `/search` — unified search results.
  - Filters: sport, city/region, opportunity type, organizer, open/closed status and date range when supported by data.
  - Sort: relevance and date; never imply ranking is quality verification.
  - Substates: no query, results, no results, invalid filter, unavailable data.
- `/search?q=:query` — shareable search state; query strings must not include private or personal data.
- `/sports` — sport directory.
- `/sports/:sportSlug` — sport detail with approved description, related published opportunities, venues and guides.
- `/trials` — current/open trials view using shared opportunity records and defined date/status rules.
- `/trials/:opportunitySlug` — trial detail: organizer, eligibility, dates/deadline, venue/location, fee only if sourced, required documents, source link, last checked and current status.
- `/opportunities` — all published opportunity types.
- `/opportunities/:opportunitySlug` — canonical opportunity detail; trials should use one canonical record/URL strategy, not duplicated records across separate tables.
- `/calendar` — calendar/list toggle for sourced trials and events; date, timezone and cancellation handling.
- `/events` — event and tournament directory; date, sport, location and event type filters where data exists.
- `/events/:eventSlug` — event detail, schedule only if sourced, organizer, venue, entry/deadline, source and status.
- `/verify` — explains verification standards, scope and limitations.
- `/verify/submit` — optional report/correction submission form; requires validation, abuse controls and privacy notice before activation.
- `/verify/status/:reference` — private or access-controlled status lookup if references can expose submissions; avoid guessable IDs.
- `/talent-scanner` — feature overview and consent/eligibility explanation before any search functionality.
- `/talent-scanner/search` — protected athlete discovery only after authorization, consent, data minimization and abuse review.
- `/talent-scanner/athletes/:athleteId` — protected athlete profile view with field-level visibility and access audit.
- `/scout-portal` — scout portal landing/login and permissions explanation.
- `/scout-portal/dashboard` — protected workspace, only after auth is implemented.
- `/scout-portal/saved` — saved prospects, only after storage and authorization exist.
- `/scout-portal/requests` — contact/access requests and status, only after workflow and consent are defined.
- `/scout-portal/settings` — account, privacy and access preferences when account features exist.

### 7.3 Play & train

- `/play` — find games/players; define location, sport, time, skill-level and safety filters only where supported.
- `/play/games/:gameId` — game detail, organizer, location, schedule and participation rules; user-generated content requires moderation.
- `/play/create` — protected game creation; deferred until accounts, validation, reporting and moderation exist.
- `/book` — venue directory and court discovery; make it clear whether booking is not yet connected.
- `/venues/:venueSlug` — canonical venue detail with address/location, sports, facilities, photos with rights, contact/source and published pricing only.
- `/venues/:venueSlug/courts/:courtSlug` — court details, features, operating hours and published court-specific pricing.
- `/venues/:venueSlug/availability` — only when a real authoritative availability service is connected; never display simulated availability.
- `/bookings/:bookingId` — private booking detail/status; only after auth and transactional booking are approved.
- `/bookings/:bookingId/cancel` — cancellation flow governed by disclosed policy and backend authorization.
- `/train` — coaching discovery overview.
- `/coaches` — coach directory with approved public profile fields.
- `/coaches/:coachSlug` — coach profile, sports, qualifications only when substantiated, location and contact/booking method.
- `/academy` — academy information and onboarding overview.
- `/academies` — academy directory if real records and moderation are available.
- `/academies/:academySlug` — academy profile, sports, facilities, location, source and contact.
- `/memberships` — explain available membership tiers only when approved.
- `/memberships/:planSlug` — plan details, price, benefits, exclusions and renewal/cancellation terms; no purchase claims until billing and entitlement checks work.

### 7.4 Learn and content

- `/start-from-zero` — beginner learning pathways, prerequisites and next steps.
- `/ai-guide` — AI feature introduction, capabilities, limitations, source approach and privacy notice; no model calls until provider review.
- `/ai-guide/chat` — optional interactive experience; requires approved provider, rate limits, safety checks, source grounding and user data controls.
- `/guides` — guide index and topic filters.
- `/guides/:guideSlug` — canonical guide article with author/reviewer, update date, references and related resources.
- `/chronicle` — KhelChronicle editorial index if this is confirmed as a distinct publication.
- `/chronicle/:articleSlug` — editorial article with source/author/date and correction route.
- `/blog` — blog index only if its purpose differs from Chronicle and Guides.
- `/blog/:postSlug` — blog post; canonical content ownership and cross-posting rules apply.
- `/learning-hub` — curated learning landing page linking to canonical guides, tools and resources.
- `/tools` — tools/calculators index.
- `/tools/:toolSlug` — individual calculator/tool page with documented inputs, formulas, assumptions, limits and tests.
- `/resources` — curated resource index by category.
- `/resources/:resourceSlug` — resource detail/redirect; avoid duplicate copies of the original resource and respect licence/terms.
- Content admin/editor routes are private and deferred until role-based access, editorial workflow and audit logging exist.

### 7.5 Grow, partners and organization workflows

- `/partner` — partnership overview, eligibility and contact route.
- `/partner/apply` — partner inquiry submission; requires safe form handling, spam protection and privacy notice.
- `/list-venue` — venue operator instructions, required evidence and review expectations.
- `/list-venue/submit` — venue submission form; validate fields, verify ownership/authority and hold submissions as unpublished pending review.
- `/list-venue/status/:reference` — access-controlled submission status if this workflow is built.
- `/careers` — current roles only.
- `/careers/:jobSlug` — role detail and accurate deadline/location/terms.
- `/careers/:jobSlug/apply` — deferred until secure applicant-data storage, access control, retention and deletion are defined.
- `/pricing` — public pricing page; show only owner-approved, currently valid prices and terms.
- `/community` — community entry point and rules.
- `/community/guidelines` — conduct, reporting and moderation policy.
- `/community/report` — abuse/report flow, only when moderation response and privacy safeguards are staffed.
- `/cities` — city index built from supported content.
- `/cities/:citySlug` — city landing page with real sports, venues and opportunities; avoid doorway/thin SEO pages.
- `/mobile-app` — app information and supported platform links only after availability is confirmed.

### 7.6 Account and private user pages (future stage)

All routes below are deferred. They require authentication, server-side authorization, privacy controls, deletion/export handling, session protection and tests for anonymous/wrong-user access.

- `/login`, `/signup`, `/forgot-password`, `/reset-password` — account access/recovery.
- `/dashboard` — private user overview.
- `/dashboard/profile` — profile details and visibility settings.
- `/dashboard/sports-cv` — saved CV only if server storage is deliberately enabled; local-first CVs remain on-device and must be labelled accordingly.
- `/dashboard/applications` — applications and statuses, once workflow exists.
- `/dashboard/bookings` — user bookings, once booking exists.
- `/dashboard/saved` — saved opportunities, venues and guides, once persistence exists.
- `/dashboard/notifications` — notification preferences/history, once notifications exist.
- `/dashboard/privacy` — export, deletion, consent and data preferences.
- `/dashboard/settings` — account settings and security controls.
- `/dashboard/delete-account` — confirmed deletion process with retention exceptions explained.

### 7.7 Legal, trust and system pages

- `/privacy` — privacy notice matching actual data processing.
- `/terms` — terms reviewed for the actual services offered.
- `/cookies` or privacy settings dialog — optional cookie/technology controls matching real integrations.
- `/ipr` — copyright/IPR and takedown information.
- `/cancellation` — cancellation/refund policy only for applicable services.
- `/posh` — POSH policy only where applicable and factually approved; do not invent a committee/contact.
- `/editorial-policy` — editorial/source/verification standards.
- `/corrections` — corrections and complaints intake.
- `/accessibility` — accessibility statement only to the extent supported by testing.
- `/security` — security contact/reporting guidance without exposing sensitive implementation details.
- `/status` — optional service status page only if backed by monitoring.
- `/robots.txt`, `/sitemap.xml`, canonical tags — technical SEO outputs generated from approved public routes.
- `/403` or permission-denied state — protected resource denial.
- `/500` or service-error state — non-sensitive error recovery.
- Consent/preferences, cookie settings and share/copy-link controls are shared components, not duplicate pages unless a dedicated route is justified.

### 7.8 Internal administration routes (future, private)

Do not expose these in public navigation or search engines. Build only with explicit admin roles, MFA/strong authentication where available, audit logs and least privilege.

- `/admin` — operational overview.
- `/admin/opportunities` and `/admin/opportunities/:id` — review, edit, expire and unpublish listings with provenance.
- `/admin/events` and `/admin/events/:id` — event review and correction.
- `/admin/venues` and `/admin/venues/:id` — venue/court approval and publication.
- `/admin/venue-submissions` and `/admin/venue-submissions/:id` — submission review.
- `/admin/verification` and `/admin/verification/:id` — evidence review and decision audit.
- `/admin/content` and `/admin/content/:id` — editorial drafts and publication.
- `/admin/reports` — abuse/IPR/privacy reports with restricted access.
- `/admin/users` and `/admin/users/:id` — only if account administration is approved; sensitive fields are minimized.
- `/admin/integrations` — provider health/config metadata only; never display secret values.
- `/admin/audit-log` — access-controlled audit trail.

## 8. Per-page specification template

Before implementing a route, document:

1. **Route metadata:** label, canonical path, aliases/redirects, parent navigation, owner and status.
2. **Purpose and audience:** user problem, primary task, expected next action.
3. **Page hierarchy:** sections, child routes, breadcrumbs, related routes and navigation placement.
4. **Data contract:** source of truth, schema/API, required/optional fields, provenance, freshness and publication status.
5. **Access class:** public, authenticated user, organization member, scout, moderator or administrator; specify field-level visibility.
6. **User states:** initial/loading, success, empty, unavailable, error, invalid input, not found, expired, cancelled and permission denied as applicable.
7. **Actions:** read/write operations, validation, confirmation, idempotency, audit trail and failure handling.
8. **Privacy/security:** personal data, consent, retention/deletion, abuse cases, rate limits and logging.
9. **SEO/content:** indexability, canonical URL, title/description, structured data eligibility, internal links and sitemap inclusion.
10. **Accessibility/responsive:** keyboard flow, focus, labels, contrast, reduced motion and small-screen layout.
11. **Acceptance tests:** normal path, edge cases, failure modes, unauthorized access and mobile/keyboard checks.
12. **Release evidence:** PR, CI run, preview, migration/rollback and post-release smoke checks.

## 9. Route status vocabulary

Use one status per route:
- **Proposed** — requested/planned but not scoped.
- **Specified** — page purpose, data, access, states and acceptance criteria documented.
- **Ready for implementation** — dependencies and design decisions approved.
- **In development** — implementation underway.
- **Implemented** — code exists, but release verification may still be pending.
- **Verified in preview** — acceptance checks passed in the intended preview environment.
- **Released** — explicit release approval and production smoke checks recorded.
- **Deferred** — intentionally postponed with reason.
- **Retired** — route removed/redirected with migration plan.

Do not mark a route released based on documentation or a rendered placeholder alone.


## 10. Production parity additions: routes missing from the main tree

The production repository parity audit is the detailed disposition register. Add these source-derived routes to the route catalogue so the main route inventory is complete. Proposed destinations are subject to approval and redirect planning.

- `/district-infrastructure` — sports infrastructure directory; include geographic coverage, source and last-updated date.
- `/sport/:slug` — legacy alias for `/sports/:sportSlug`; redirect to the canonical route if equivalent.
- `/sport-in-city/:slug` — sport/city landing; specify both identifiers and index only when the page has unique useful content.
- `/city/:slug` — legacy alias for `/cities/:citySlug`.
- `/live-scores` — live score and match centre; only display licensed, genuine provider data and a truthful unavailable/stale state.
- `/my-stats` — future private athlete statistics view; define metric source and profile ownership.
- `/recommendations` — future recommendations page; document ranking inputs, explainability and avoid unsupported AI claims.
- `/cv` and `/cv/:id` — legacy CV routes; reconcile with `/sports-cv`, separate private editing from public sharing, and provide revocable share access.
- `/guide/:slug` — legacy guide alias for `/guides/:guideSlug`.
- `/top-guides/:category` — category landing; merge into guide taxonomy if there is unique useful content.
- `/best-tools/:category` — tool-category landing; avoid thin SEO pages and unsupported rankings.
- `/blog/write` — private editorial authoring workflow; require roles, audit trail and publication review.
- `/admin-venue-submissions` — private admin alias; use `/admin/venue-submissions` with backend-enforced access.
- `/verification-policy`, `/trust-center`, `/cancellation-policy`, `/copyright-policy`, `/ipr-policy`, `/correction-policy`, `/editorial-policy`, `/posh-policy` — policy/trust pages; consolidate overlapping policies carefully, preserve valid legacy links and obtain owner/legal review.
- `/api/indexnow` — server-side indexing notification endpoint, only if required; validate method, authorization, rate limits and secret handling.
- `/api/trials` — typed trial/opportunity API; define schema, public-only filters, query validation, rate limits and stable errors.
- verification-token text endpoint — keep only if an active provider requires it; document purpose, ownership and expiry.
- `/robots.txt`, `/sitemap.xml`, `/ads.txt`, `/llms.txt` — technical/public metadata endpoints with distinct rules; never treat `llms.txt` as access control.

## 11. Production shared-component capabilities to map

These are component or service capabilities, not automatically separate routes:
- venue detail/court cards, facilities/amenities, venue policies, photos/carousel, reviews, operating hours, court-specific pricing, date picker, availability, booking form, confirmation and cancellation;
- game hosting/detail, pickup-game lobby, play FAQ and safety guidance;
- event calendar cards, event countdown, filters, saved-event UI and sourced calendar content;
- sports news, match analysis, statistics and prediction tools;
- athlete onboarding/profile agent, CV editor, PDF/export, share-CV modal, notifications and preferences;
- newsletter signup and consented communications;
- ad consent, ad wrappers/slots, mobile sticky ad, ad loader/diagnostics and analytics;
- PWA install prompt and native Android parity;
- trial data policy automation, scheduled notification worker, weekly backup, release workflows and MCP deployment.

For each capability, document its canonical owning route, API/data source, access class, consent/licence requirements, error states, tests and disposition in the parity audit. Shared components should not create duplicate route definitions.
