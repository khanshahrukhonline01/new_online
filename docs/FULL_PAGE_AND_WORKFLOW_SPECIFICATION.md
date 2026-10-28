# KhelGrid Platform — Full Page and Workflow Specification

**Document status:** Implementation reference and gap register  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Last reviewed:** 2026-10-28  
**Audience:** Product owner, frontend/backend developers, database maintainers, QA, content moderators and release reviewers.

> This document distinguishes routes that exist in the current source from planned routes and from working capabilities. A route rendering a page is not proof that its complete workflow, data source, permissions, or production deployment is ready. Do not use this document as evidence that a feature has shipped.

## 1. Product principles applying to every page

1. **Truthful state:** every data-driven page must distinguish loading, configured-but-empty, unavailable/unconfigured, permission denied, invalid input, not found, and success.
2. **No invented data:** never present mock trials, scores, venue inventory, prices, bookings, ratings, credentials, or verification as real.
3. **Published-only public content:** public catalogue queries must return only records whose publication policy permits public display. Verification status is separate from publication status.
4. **Traceable opportunity/event content:** show organiser/source links, dates and last-checked details where available. Past events must not appear open.
5. **Privacy by default:** athlete information, account data, private contacts, moderation notes, and documents are not public unless there is a specific, consented, authorised design.
6. **Security at the backend:** client-side route hiding is not authorization. Use database constraints, RLS, least-privilege grants and server-side checks for privileged actions.
7. **Extensibility:** adding a record to an existing entity type should be a data operation, not a new page implementation. A new entity type needs reviewed schema, data access, UI, tests and documentation.
8. **Accessible/responsive:** keyboard-operable controls, labels, focus visibility, screen-reader status announcements, reduced-motion support and small-screen layouts.
9. **SEO only when useful:** public pages need unique useful content and canonical metadata. Private, thin, empty and admin pages must not be indexable.
10. **Release discipline:** additive migration, backup, tests, preview review and rollback plan precede production changes. Do not modify the separate production project by assumption.

## 2. Status vocabulary

- **Implemented route:** the route resolver and app switch have a path for the page.
- **Data-backed:** the page reads actual configured data through the approved client/API.
- **Workflow implemented:** a user can complete the intended task end-to-end with validation and safe persistence.
- **Verified:** the relevant automated tests and manual integration/security checks have passed for a known environment.
- **Coming soon / unavailable:** visible page foundation exists, but the underlying service is not active.
- **Review required:** policy, legal text, data source or security design needs review before launch.
- **Planned route:** included in product inventory but not necessarily registered in current routing.

Never use “Verified” unless there is evidence of the exact checks, environment and date.

## 3. Current route implementation inventory

The current route resolver is `src/shared/routing.ts`, page composition is `src/App.tsx`, and generic feature information is `src/modules/coming-soon/FeatureComingSoonPage.tsx`. The dedicated catalogue pages are home, sports index, opportunities index, venue index, search and dynamic sport/opportunity/venue details. The `/sports-cv` route is wired to the CV wizard. Many other registered paths currently render information/coming-soon content.

### 3.1 Routes handled by dedicated page components

| Route | Current component | Data / expected behaviour | Current limitation and acceptance criteria |
|---|---|---|---|
| `/` | `HomePage` | Main discovery entry; clear paths to sports, opportunities, venues and search | Audit every claim/card; no unsupported counts or fake “live” items. Test links, mobile layout and empty catalogue behaviour. |
| `/sports` | `SportsPage` | Reads published sports from Supabase | Empty/unconfigured/error states must be distinct. New published sport should appear without code changes. |
| `/sports/:slug` | `CatalogueDetailPage(kind="sport")` | Resolves a published sport by slug | Shows a not-found/unpublished state if absent. Sport-specific related content is a future enhancement; do not imply it exists. |
| `/opportunities` | `OpportunitiesPage` | Reads published opportunities and source/status fields | Needs source/date/eligibility quality review and robust filters. Never imply a listing is open based only on publication. |
| `/trials` | Alias to opportunities index | Same canonical data as opportunities | No duplicated dataset. Page title/filtering can be specialized later while canonical URL remains documented. |
| `/combines` | Alias to opportunities index | Same dataset filtered by type when supported | Current route resolver aliases; confirm whether type filter is actually applied before advertising it as specialized. |
| `/scholarships` | Alias to opportunities index | Same dataset filtered by type when supported | Do not create duplicate scholarship records. |
| `/camps` | Alias to opportunities index | Same dataset filtered by type when supported | Do not create duplicate camp records. |
| `/opportunities/:slug` | `CatalogueDetailPage(kind="opportunity")` | Published record detail; available dates, location, source and verification status | Confirm field types, date semantics and stale listing handling. Link to organiser source if present; otherwise disclose missing source. |
| `/venues` | `VenuesPage` | Reads published venues from Supabase | Does not by itself mean courts, pricing or availability are connected. Use actual published records only. |
| `/book` | Alias to `/venues` | Venue discovery, not a confirmed booking flow | Do not describe it as transactional booking until slot locking, cancellation and payment decisions are implemented. |
| `/venues/:slug` | `CatalogueDetailPage(kind="venue")` | Published venue detail | Venue detail currently warns that booking/price/live availability are not connected. Court list, hours and contact workflow need implementation. |
| `/search` | `SearchPage` | Search experience across currently supported catalogue data | Document actual searchable entity types; no claim of searching coaches/academies until connected. Test query params, empty state and keyboard operation. |
| `/sports-cv` | `SportsCvWizard` | Athlete-entered CV data and browser print-to-PDF flow | Validate all fields, no unexpected network persistence, test print CSS and multi-page output. It is not an independently verified athlete credential. |

### 3.2 Registered feature-information routes

These paths resolve through the shared feature-page component unless a later route-specific implementation is added. Their text is informational and is not a working backend workflow.

| Route | Page responsibility | What must be implemented before calling it functional |
|---|---|---|
| `/live` | Live scores | Genuine provider, licensing/terms review, coverage, attribution, freshness timestamps, error states and tests. No simulated scores. |
| `/play` | Find games / play and match | Game creation, location/time, capacity, organizer controls, abuse reporting, safety and persistence. |
| `/coaches` | Coach directory | Published coach query, sport/location filters, detail pages, public contact rules and moderation. |
| `/academies` | Academy directory | Published academy query, program/sport relationships, details, filters and moderation. |
| `/events` | Events and tournaments | Event data model/query, date-range filters, source/organiser details and past-event states. |
| `/calendar` | Sports calendar | Calendar view backed by sourced event/opportunity records, timezone handling, filters and source timestamps. |
| `/stats` | Athlete statistics | Athlete-owned measurements, input validation, units, privacy and clear distinction between self-reported and externally sourced data. |
| `/talent-scanner` | Talent discovery | Consent, legitimate purpose, transparent matching criteria, access control, safety for minors and correction/appeal path. |
| `/scout-portal` | Scout workspace | Organisation verification process, authenticated permissions, audit trail and consent-controlled athlete discovery. |
| `/verification` | Verification guidance | Defined evidence requirements, reviewer identity/authority, expiry/review rules, appeals and exact badge meanings. |
| `/learning` | Learning hub | Curated content records, taxonomy, authorship/source metadata and editorial review. |
| `/guides` | Sports guides | Published guide CMS/data source, useful unique content, review date and references. |
| `/ai-guide` | AI sports guide | Source-grounded answers, provider/cost controls, prompt/data security, privacy disclosures, evaluation and fallback behaviour. |
| `/khelchronicle` | Editorial publication | Editorial CMS, authors, dates, sources, correction mechanism and rights review. |
| `/community` | Sports community | Posting/messaging, moderation queue, abuse reports, rate limits, privacy and minor-safety controls. |
| `/tools` | Sports tools | Each tool’s formula, input validation, units, assumptions and limitations. |
| `/dashboard` | Personal dashboard | Auth, account-scoped queries, privacy, loading/empty/error states and data deletion. |
| `/profile`, `/my-profile` | Athlete profile | Auth, ownership checks, field-level visibility, consent, edit/delete/export and safe public profile design. |
| `/saved` | Saved items | A defined persistence model, ownership/privacy and remove/clear behaviour. |
| `/settings` | Account settings | Real supported settings with server-side validation and clear save/error feedback. |
| `/notifications` | Notifications | Event source, delivery provider, opt-in/preferences, deduplication and unsubscribe controls. |
| `/login`, `/signup`, `/forgot-password` | Account access | Remain paused until auth provider, branding, recovery, consent, privacy, abuse prevention and tests are ready. |
| `/for-you` | Personalised discovery | Explainable matching, preference controls, data minimisation and no sensitive inference. |
| `/trust` | Trust centre | Keep source/correction guidance accurate; do not claim a moderation SLA that is not staffed. |
| `/pricing` | Pricing/membership | Approved plan features, actual billing integration, tax/renewal/cancellation terms and support. No checkout now. |
| `/mobile-app` | Mobile app information | Only advertise store links when an official release exists. |
| `/careers` | Careers | Publish only actual open roles and an appropriate application process. |
| `/partners` | Partnerships | Contact workflow, partner due diligence and third-party data licensing rules. |
| `/about` | About | Accurate mission/scope; avoid unsupported scale, verification or outcome claims. |
| `/contact` | Contact | Monitored contact route and safe instructions about what not to email. |
| `/help` | Help/support | Help articles and an owned support/triage process. |
| `/referrals` | Referrals | Unique referral attribution, abuse prevention, clear reward terms and privacy controls before promising rewards. |

### 3.3 Registered policy routes

| Route | Required content and release gate |
|---|---|
| `/privacy` | Accurate data map, purposes, legal basis where applicable, vendors, retention, user rights, contact and jurisdictional review. |
| `/terms` | Real service scope, acceptable use, listing responsibilities, intellectual property, liability, disputes and legal review. |
| `/cookies` | Actual cookies/storage/trackers, purpose, third-party embeds and consent controls where required. |
| `/ipr-policy` | Copyright/trademark claims, rights evidence, takedown/counter-notice handling and contact process. |
| `/cancellation-policy` | Must match actual booking/payment/membership services. No policy can imply checkout or refunds exist before they do. |
| `/posh-policy` | Qualified review for actual employment arrangement and applicable law; do not claim statutory committee/contact is active unless true. |
| `/editorial-policy` | Sourcing, review, corrections, AI assistance, conflicts and separation of editorial and sponsored content. |
| `/verification-policy` | What is checked, accepted evidence, reviewer authority, review expiry, appeal and privacy requirements. |
| `/correction-policy` | Reporting route, triage, correction history, urgent safety escalation and realistic response expectations. |

Policy pages currently have draft/review-required content in the shared feature page. They must be reviewed against actual operations before being represented as final legal documents.

### 3.4 Shared application shell and system states

| Area | Behaviour and tests |
|---|---|
| Header / brand | Logo, home navigation, global search, listing contact links and status of unavailable account/notification actions. Check every CTA destination. |
| Main menu / sidebar | Same route registry, correct active state, collapse on desktop, drawer/focus behaviour on mobile, escape/close behaviour and keyboard access. |
| Sports bar | Horizontal scrolling without trapping page scroll; active route indication and narrow-screen tests. |
| Footer | Every link points to a registered page or explicit external/contact destination; no feature is advertised as live if it is not. |
| Not-found | Unknown route or unknown record gives a clear state and safe return links. No fake fallback record. |
| Loading / empty / unavailable | Announce status accessibly; provide retry where sensible; do not confuse unconfigured backend with an empty database. |
| Navigation/history | Browser back/forward, query strings, deep links, trailing slash handling and direct page refresh should behave predictably. |
| Responsive layout | Test widths around 320, 375, 700, 1024 and 1440 CSS pixels; no horizontal page overflow or inaccessible controls. |

## 4. Product inventory beyond current registered routes

The planning inventory in `docs/WEBSITE_PAGE_INVENTORY.md` contains additional routes not all registered in the current resolver. Treat these as **planned**, not implemented, until route tests and UI are added.

| Planned route family | Example paths | Requirements before release |
|---|---|---|
| Opportunity management | `/opportunities/submit`, `/opportunities/:id/report`, `/opportunities/archive` | Secure submission, review, source evidence, stale/closed state, duplicate handling and reports. |
| Venue/court management | `/venues/submit`, `/venues/:slug/courts/:courtSlug`, `/book/:venueSlug`, `/bookings`, `/bookings/:id` | Court-level operating hours/prices, atomic overlap prevention, holds/expiry, cancellation and real status. |
| Coach/academy submission | `/coaches/submit`, `/academies/submit` | Form validation, consent, private moderation, contact privacy, review/publish flow. |
| Athlete directory | `/athletes`, `/athletes/:slug` | Explicit public visibility and consent, access/deletion controls, no sensitive profile leakage. |
| CV subpages | `/sports-cv/create`, `/sports-cv/preview`, `/sports-cv/templates`, `/sports-cv/guides` | Only register if dedicated UX exists; otherwise keep a single canonical wizard route. |
| Live sports | `/live/cricket`, `/live/football`, `/live/tennis`, `/matches/:id`, `/fixtures` | Provider coverage, permitted usage, attribution, score status/freshness, match IDs and no mock live data. |
| Games | `/games`, `/pickup-games`, `/pickup-games/create`, `/pickup-games/:id` | Real persistence, abuse/safety controls, location privacy and auth before creation. |
| Editorial/city discovery | `/blog`, `/blog/:slug`, `/cities`, `/cities/:citySlug`, `/sports-calendar` | Source-backed content, useful unique pages, canonical metadata and indexability criteria. |
| Account subpages | `/auth/callback`, `/profile/edit`, `/settings/privacy`, `/applications`, `/applications/:id` | Auth and ownership enforcement, privacy controls and complete workflows. |
| Listing/business services | `/submit`, `/memberships`, `/membership`, `/pro`, `/organizers`, `/advertise` | Canonical redirects, truthful offers, secure submission and billing/advertising compliance. |
| Admin/moderation | `/admin`, `/admin/opportunities`, `/admin/venues`, `/admin/coaches`, `/admin/academies`, `/admin/reports`, `/admin/users`, `/admin/audit-log` | Not public; server/database authorization, audit logs, least privilege, CSRF/abuse protections and security tests. |
| Legal/safety additions | `/disclaimer`, `/safety`, `/accessibility` | Reviewed content and operationally accurate commitments. |
| System routes | `/403`, `/404`, `/500` | Consistent error UX; do not expose stack traces or sensitive provider errors. |

## 5. Data model and relationship expectations

Current public catalogue access in `src/integrations/supabase/public-client.ts` reads `sports`, `opportunities`, and `venues`. The initial core migration also includes `venue_courts` and `profiles`. Do not assume the latest proposal migrations are applied to any Supabase project.

The proposed directory/moderation schema may add:
- `academies`, `coaches`, `events`
- `academy_sports`, `coach_sports`, `coach_academies`, `venue_sports`
- `listing_submissions` as a private intake queue

Before using these tables:
1. Inspect the actual target database and existing migrations/policies.
2. Apply migrations to a disposable development project first.
3. Test RLS for anonymous, authenticated owner, non-owner, moderator and privileged roles.
4. Confirm users cannot self-approve, change reviewer fields, read other submissions or access private notes.
5. Add typed models and bounded data access; never trust unvalidated JSON just because it came from a form.
6. Keep relationships referentially valid; define delete/archive behaviour intentionally.
7. Add indexes based on real filters and sort order; paginate large lists.
8. Record source/provenance for externally sourced opportunities/events and separate “published” from “verified”.

### Recommended listing lifecycle

`draft → pending_review → in_review → approved/published`, with alternative outcomes `needs_changes`, `rejected`, or `archived`.

The exact database enum/status design may vary by table, but status changes must be authorized and auditable. A public submission must never directly set `publication_status = published` or `verification_status = verified`.

## 6. Page specification template

Every new or substantially changed page must document:

- **Purpose and audience**
- **Canonical route and aliases**
- **Current status** (planned / in progress / blocked / implemented / verified)
- **Page owner/module**
- **Data source and allowed fields**
- **User actions and end-to-end outcomes**
- **Validation rules and error messages**
- **Permissions / RLS / privacy classification**
- **Loading, empty, unavailable, error, permission-denied and not-found states**
- **Responsive and accessibility behaviour**
- **SEO/indexability/canonical rules**
- **External source/licensing/attribution requirements**
- **Analytics/logging and data-retention rules**
- **Unit, component, integration, security and end-to-end tests**
- **Acceptance criteria and release evidence**
- **Dependencies, migration and rollback plan**

## 7. Quality gates for every release

### Code and CI
- [ ] `npm ci` succeeds with the documented Node/npm versions.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] No unsupported icon names, missing imports, route mismatch or broken links.
- [ ] Tests cover direct deep-link load and unknown slug behaviour.

### Data/security
- [ ] Development schema matches migration history.
- [ ] RLS and grants tested against realistic roles.
- [ ] No public read/write exposure of private submissions or profile fields.
- [ ] Database constraints reject invalid slugs, dates, statuses and foreign keys.
- [ ] Duplicate submissions and abuse/rate limits have a plan.
- [ ] No secrets/service-role keys in browser bundles or logs.

### Product/UX
- [ ] Desktop and mobile navigation work with mouse, touch and keyboard.
- [ ] No fabricated data, unsupported claims, stale active opportunities or invented availability.
- [ ] All controls have meaningful labels, focus states and accessible feedback.
- [ ] Empty/unconfigured/error states are distinguishable.
- [ ] Forms explain required fields, privacy, submission status and next steps.
- [ ] Source links and verification wording are accurate.

### Release and operations
- [ ] PR reviewed; no direct production edit.
- [ ] Preview deployment checked manually at the target viewport sizes.
- [ ] Database backup completed before schema changes.
- [ ] Migration applied to the intended environment only.
- [ ] Rollback/recovery steps are written and practical.
- [ ] Production smoke test and post-release monitoring owner identified.

## 8. Prioritized implementation roadmap

### P0 — Stabilize current foundation
1. Resolve outstanding CI/type errors on open PRs.
2. Test core catalogue list/detail/search against a known development Supabase dataset.
3. Correct any header/footer links that advertise unavailable features as live.
4. Verify route, mobile navigation, browser history and page-refresh behaviour.

### P1 — Safe listing intake and moderation
1. Review and test the additive academy/coach/event/listing-submission migration.
2. Implement validated submission services without enabling public publication.
3. Keep authentication-dependent submit flows hidden/disabled while login is paused.
4. Build a restricted moderator workflow with server/database authorization and audit trail.
5. Add tests proving a submitter cannot self-publish or view other submissions.

### P2 — Data-backed directories
1. Add coach and academy directory reads, list/detail pages and filters.
2. Add event/calendar queries with date/timezone/source handling.
3. Add sport relationships and venue-sport filtering.
4. Use pagination, indexes, not-found states and quality monitoring.

### P3 — Sports CV, live data and booking
1. Verify CV validation and print-to-PDF across browsers and page breaks.
2. Select a live-score provider only after terms, coverage, cost and attribution are reviewed.
3. Build booking only after court-level pricing, operating hours, holds, concurrency-safe reservations and cancellation rules are tested.

### P4 — Account, pricing and growth
1. Enable auth only after recovery, privacy, access control and deletion/export processes work.
2. Implement saved items/notifications/applications only with complete ownership checks.
3. Activate membership/referral flows only with truthful terms and any needed payment integration.
4. Review policy pages and advertising/analytics configuration against actual production behaviour.

## 9. Documentation cross-references

- `docs/WEBSITE_PAGE_INVENTORY.md` — broad planned page inventory; not implementation proof.
- `docs/product/NAVIGATION_AND_ROUTE_CATALOGUE.md` — product navigation and proposed route tree.
- `docs/architecture/FRONTEND_AND_SYSTEM_ARCHITECTURE.md` and `docs/architecture/FRONTEND_ARCHITECTURE.md` — application/module architecture.
- `docs/DOMAIN_MODEL_AND_DATA_DICTIONARY.md` and `docs/FULL_DATABASE_PLAN.md` — domain and database model.
- `docs/SECURITY_AND_AUTHORIZATION_MATRIX.md` and `docs/security/SECURITY_THREAT_MODEL.md` — security/permission expectations.
- `docs/features/OPPORTUNITIES_AND_VERIFICATION.md`, `docs/features/VENUES_AND_BOOKING.md`, `docs/features/SPORTS_CV.md`, `docs/features/LIVE_SPORTS_DATA.md` — feature requirements.
- `docs/data/DATA_QUALITY_AND_PROVENANCE.md` and `docs/data/MIGRATIONS_BACKUPS_AND_RECOVERY.md` — data integrity and operations.
- `docs/TESTING_AND_RELEASE_GATES.md` and `docs/operations/CI_CD_DEPLOYMENT_AND_RELEASES.md` — validation/release requirements.

## 10. Change control

Update this document when a route is added, removed, renamed, aliased, or changes its data source/status. Update the route resolver tests and the page inventory in the same pull request. When a feature becomes verified, record the commit/PR, environment, automated checks and manual test evidence. Do not mark a page complete merely because its component renders.
