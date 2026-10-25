# KhelGrid Platform — Page Inventory & Sitemap

 > **Navigation source of truth:** [Navigation and Route Catalogue](product/NAVIGATION_AND_ROUTE_CATALOGUE.md). The catalogue now contains the detailed parent/child route tree, page responsibilities, shared page specification template and route status vocabulary. Keep this inventory aligned with it; a listed page is planned inventory, not proof it is implemented.


**Status:** Planning baseline for the separate `khelgrid-platform` development project.  
**Scope:** Proposed pages/routes to build; this is not a claim that these routes already exist.  
**Production safety:** This inventory applies only to this repository and its development Supabase project. Do not modify or deploy to the production `khelgrid-monetization-studio` project as part of this work.

## Architecture requirement: scalable, modular platform

The page inventory must be implemented as independent feature modules inside one cohesive application, not as one giant page/component or a flat collection of unrelated routes.

### Module boundaries

Each feature module should own its route definitions, pages, reusable components, data-access functions, validation/types, tests, and feature-specific documentation. Modules communicate through explicit shared contracts and services rather than importing each other's internal files.

Suggested structure (adapt as the project grows; do not create empty boilerplate for every future feature):

    src/
      app/                 # router, providers, layouts, navigation, route guards
      shared/              # UI, hooks, types, validation, utilities, errors
      modules/
        home/
        search/
        sports/
        opportunities/
        venues/
        booking/
        coaches/
        academies/
        athletes/
        sports-cv/
        live-sports/
        events/
        guides/
        cities/
        account/
        submissions/
        notifications/
        admin/
      integrations/        # Supabase and external provider adapters
      styles/

A module is added when its implementation is prioritized; future modules may remain documented without empty folders.

### Module design rules

1. **Route composition:** a central router composes route exports from modules. Modules own their paths and page components. Use lazy loading/code splitting for larger or optional modules.
2. **Single responsibility:** pages compose UI; components render UI; services implement use cases; repositories/data-access functions talk to the backend; schemas validate inputs/outputs. Keep complex business rules out of page components.
3. **Dependency direction:** modules may depend on shared code and approved integrations; shared code must not depend on feature modules. Cross-module calls use public exports or application-level use cases, not deep imports.
4. **Backend boundary:** keep Supabase access behind typed data-access/service functions. Never put service-role keys or secrets in browser code. Database RLS and constraints are the security boundary; client route guards are only UX.
5. **Contracts first:** define typed domain models and validated inputs/outputs for opportunities, venues, courts, bookings, athletes, and sports. Use stable IDs; slugs are URL identifiers, not authorization.
6. **Feature availability:** optional features (authentication, booking, payments, live data, paid plans) stay disabled until real backend/provider integrations and acceptance tests are ready. Feature flags are not security controls.
7. **Failure states:** data modules handle loading, empty, validation, permission-denied, not-found, provider-unavailable, and unexpected-error cases consistently.
8. **Testing:** add unit tests for domain rules/services, component tests for key states, integration tests for data access where feasible, and end-to-end tests for critical journeys.
9. **Design system:** shared design tokens, accessible UI primitives, responsive layouts, consistent forms, feedback, and error messages live in shared UI; feature modules compose them.
10. **SEO:** public route metadata, canonical URLs, indexability, structured data, and sitemap eligibility are defined per route. Private/admin pages must not be indexable.
11. **Observability:** use structured, privacy-safe logs. Never log secrets, authentication tokens, or sensitive athlete data.
12. **Migrations and portability:** schema changes are versioned migrations, reviewed, tested against development, and reversible where possible. Avoid undocumented provider-specific dependencies.
13. **No speculative functionality:** fake data must never be presented as real. A route rendering is not proof a feature is complete.

### Shared platform services

Introduce shared services only when a real use case exists: typed data access, authentication/session interface, permissions mapping, shared search/filter contract, SEO helpers, privacy-conscious analytics, feature flags, safe error reporting, and notifications. Feature flags never replace authorization. Avoid generic abstractions before multiple real features need them.

### Module delivery contract

Every module defines its purpose and scope; owned routes/navigation; domain types and validation; public exports; backend tables/policies/migrations; loading/empty/error/unauthorized/not-found states; tests; accessibility/responsive requirements; SEO rules; dependencies; rollout status; and acceptance criteria.

### Module implementation status

Track each module as **Planned**, **In progress**, **Blocked**, **Implemented**, or **Verified**. Use **Verified** only after relevant tests pass and real data/security behaviour is checked. Route existence alone is not proof of completion.

## Route principles

- Build shared layouts and reusable page templates rather than one-off pages.
- Public discovery pages should work without an account.
- Account-dependent actions should show a clear sign-in/coming-soon state until authentication is intentionally enabled.
- Use database-backed records for listings. Never display fabricated trials, venues, scores, prices, availability, verification, or statistics as real.
- Dynamic detail routes must return a real not-found state when the record does not exist.
- Admin and moderation routes must be protected server-side/database-side, not merely hidden in navigation.
- Include loading, empty, error, and unavailable states where data is fetched.
- Use canonical URLs, page titles/descriptions, sitemap rules, and robots directives appropriate to each page.

## 1. Main public pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Main sports discovery hub with real, clearly sourced highlights |
| `/search` | Search | Search across sports, trials, venues, coaches, academies, and guides |
| `/about` | About KhelGrid | Mission and platform scope |
| `/contact` | Contact | Contact channels and inquiry guidance |
| `/help` | Help centre | Help topics and common questions |
| `/faq` | Frequently asked questions | General platform FAQs |
| `/how-it-works` | How it works | Explain discovery, submissions, and booking status |
| `/feedback` | Feedback | Submit product feedback |
| `/report` | Report content | Report inaccurate, unsafe, or abusive listings |

## 2. Sports directory

| Route | Page | Purpose |
|---|---|---|
| `/sports` | All sports | Browse sports supported by the platform |
| `/sports/:slug` | Sport hub | Sport-specific overview and related opportunities, venues, coaches, and guides |
| `/sports/:slug/rules` | Rules and basics | Editorial guide, when available |
| `/sports/:slug/equipment` | Equipment guide | Editorial guide, when available |

Sport-specific pages must be generated from a maintained sport catalogue; do not create empty or duplicate indexable pages for unsupported sports.

## 3. Trials, selection, and opportunities

| Route | Page | Purpose |
|---|---|---|
| `/opportunities` | Opportunities hub | Browse trials, selections, combines, scholarships, camps, and other opportunities |
| `/trials` | Trials and selections | Focused selection-trial discovery |
| `/combines` | Combines and talent identification | Browse combines and talent events |
| `/scholarships` | Sports scholarships | Scholarship opportunities |
| `/camps` | Camps and clinics | Sports camps and clinics |
| `/opportunities/:id/:slug?` | Opportunity details | Full details, eligibility, dates, fees, venue, contact, source, and status |
| `/opportunities/submit` | Submit an opportunity | Propose a listing for review |
| `/opportunities/:id/report` | Report an opportunity | Flag incorrect or outdated details |
| `/opportunities/archive` | Past opportunities | Historical listings, clearly marked closed/archived |

Opportunity filters should include sport, state/city, date, level/age group, and opportunity type where data exists. Every active listing needs source evidence and a maintained status. Past events must not appear as open.

## 4. Venues and booking discovery

| Route | Page | Purpose |
|---|---|---|
| `/venues` | Venue directory | Search and filter sports venues |
| `/venues/:slug` | Venue profile | Venue information, facilities, sports, photos, published prices, and contact |
| `/venues/submit` | List a venue | Submit a venue for review |
| `/venues/:slug/courts/:courtSlug` | Court details | Court-specific surface, facilities, price, and operating hours |
| `/book` | Book venues | Find bookable venues and courts |
| `/book/:venueSlug` | Venue booking details | Court selection and availability, when booking is enabled |
| `/bookings` | My bookings | User booking history, once account features are enabled |
| `/bookings/:id` | Booking details | Status, slot, venue, and cancellation rules |
| `/venues/report` | Report a venue | Report incorrect venue information |

Booking must not claim real-time availability unless the database/provider confirms it. Do not accept guessed or unpublished prices. No payment collection until a separately approved payment design is implemented.

## 5. Coaches, academies, and training

| Route | Page | Purpose |
|---|---|---|
| `/coaches` | Coach directory | Browse coaches |
| `/coaches/:slug` | Coach profile | Sports, credentials, location, experience, and contact information |
| `/coaches/submit` | List a coach | Submit a coach profile for review |
| `/academies` | Academy directory | Browse sports academies |
| `/academies/:slug` | Academy profile | Programs, sports, location, facilities, and contact |
| `/academies/submit` | List an academy | Submit an academy for review |
| `/training` | Training hub | Browse training resources and programs |
| `/training/:slug` | Training resource | Individual training article/resource |

Credentials and verification badges must be evidence-backed and must not imply verification that has not occurred.

## 6. Athletes and sports CV

| Route | Page | Purpose |
|---|---|---|
| `/athletes` | Athlete directory | Public athlete profiles only where consent and visibility settings permit |
| `/athletes/:slug` | Athlete profile | Public sports profile |
| `/sports-cv` | Sports CV home | Explain and launch the CV builder |
| `/sports-cv/create` | Sports CV wizard | Build an athlete CV |
| `/sports-cv/preview` | CV preview | Review before export |
| `/sports-cv/templates` | CV templates | Available layouts |
| `/sports-cv/guides` | CV help | Instructions and examples |
| `/talent-scan` | Talent profile tools | Future/optional tools; publish only when implemented |

CV creation should remain usable without publishing personal information. Provide clear consent and privacy controls before any profile becomes public.

## 7. Live sports and scores

| Route | Page | Purpose |
|---|---|---|
| `/live` | Live sports hub | Live match centre with sport tabs |
| `/live/cricket` | Cricket scores | Cricket matches and scorecards |
| `/live/football` | Football scores | Football fixtures and scores |
| `/live/tennis` | Tennis scores | Tennis matches and scores |
| `/matches/:id` | Match centre | Match details, score, status, and provider attribution |
| `/fixtures` | Fixtures and results | Upcoming and completed matches |

These routes must be marked unavailable or show sourced schedules when a genuine licensed/authorized data provider is not connected. Never fill the page with mock matches presented as live.

## 8. Games, events, and community

| Route | Page | Purpose |
|---|---|---|
| `/games` | Games hub | Browse community games and sports activities |
| `/pickup-games` | Pickup games | Find informal games |
| `/pickup-games/create` | Create a game | Create a listing when authenticated features are enabled |
| `/pickup-games/:id` | Game details | Location, time, sport, capacity, and organizer |
| `/events` | Sports events | Browse events |
| `/events/:slug` | Event details | Event details and source |
| `/community` | Community hub | Community resources and participation |
| `/community/guidelines` | Community guidelines | Behaviour and safety expectations |

## 9. Guides, learning, and editorial content

| Route | Page | Purpose |
|---|---|---|
| `/guides` | Guides hub | Browse sports and athlete guides |
| `/guides/:slug` | Guide article | Individual guide |
| `/learning-hub` | Learning hub | Learning resources |
| `/blog` | Articles and updates | Editorial posts |
| `/blog/:slug` | Article | Individual article with author/date/source details |
| `/cities` | Cities directory | Browse supported cities |
| `/cities/:citySlug` | City sports hub | Local venues, academies, coaches, and opportunities with real records |
| `/sports-calendar` | Sports calendar | Dated events and selection calendar with source links |

Only publish editorial and city/sport landing pages when they have useful, distinct content; avoid thin or automatically duplicated SEO pages.

## 10. Account and personal workspace

These routes can be planned now, but must remain gated until authentication is deliberately enabled and configured.

| Route | Page | Purpose |
|---|---|---|
| `/login` | Sign in | Sign-in entry point |
| `/signup` | Create account | Registration |
| `/auth/callback` | Authentication callback | Complete provider sign-in |
| `/forgot-password` | Password recovery | Recovery flow, if password auth is enabled |
| `/profile` | My profile | Manage personal details |
| `/profile/edit` | Edit profile | Update profile |
| `/dashboard` | Personal dashboard | Personal activity overview |
| `/saved` | Saved items | Saved opportunities, venues, guides |
| `/applications` | My applications | Opportunity applications, if supported |
| `/applications/:id` | Application details | Application status |
| `/settings` | Account settings | Account preferences |
| `/settings/privacy` | Privacy settings | Visibility and data controls |
| `/notifications` | Notifications | User notifications |

Do not imply that applications, notifications, saved items, or account controls work until the required backend flows exist and are tested.

## 11. Submissions, memberships, and business services

| Route | Page | Purpose |
|---|---|---|
| `/submit` | Submit a listing | Choose listing type and submit for moderation |
| `/memberships` | Memberships | Explain available membership tiers |
| `/membership` | Membership overview | Optional canonical alias/redirect to `/memberships` |
| `/pro` | Pro plan | Plan details, only if the plan is actually available |
| `/organizers` | For organizers | Information for event/trial organizers |
| `/partners` | Partnerships | Partnership information |
| `/advertise` | Advertise with KhelGrid | Advertising inquiry, only when offered |

No paid plan, payment, verification service, or premium feature should be represented as available until implemented and approved.

## 12. Admin and moderation (restricted)

| Route | Page | Purpose |
|---|---|---|
| `/admin` | Admin dashboard | Moderation overview |
| `/admin/opportunities` | Opportunity moderation | Review, approve, reject, archive listings |
| `/admin/venues` | Venue moderation | Review venue and court submissions |
| `/admin/coaches` | Coach moderation | Review coach submissions |
| `/admin/academies` | Academy moderation | Review academy submissions |
| `/admin/reports` | Reports queue | Triage reported content |
| `/admin/users` | User management | Restricted account moderation, if enabled |
| `/admin/audit-log` | Audit log | Review sensitive administrative changes |

Every admin route and mutation must be authorized on the server/database. Role checks in the browser alone are insufficient.

## 13. Legal, safety, and trust

| Route | Page | Purpose |
|---|---|---|
| `/privacy` | Privacy policy | Data collection, usage, retention, and user rights |
| `/terms` | Terms of service | Platform terms |
| `/cookies` | Cookie policy | Cookie and tracking details |
| `/disclaimer` | Disclaimer | Scope and limitations of information |
| `/editorial-policy` | Editorial policy | Listing research, corrections, and sourcing |
| `/verification-policy` | Verification policy | What verification means and does not mean |
| `/corrections` | Corrections policy | Report and correct inaccurate listings |
| `/safety` | Safety centre | Guidance for athletes, minors, and in-person meetups |
| `/accessibility` | Accessibility statement | Accessibility commitment and feedback |
| `/copyright` | Copyright / IPR | Copyright and intellectual-property requests |

Legal pages must be reviewed for the actual product and jurisdiction before launch; do not publish boilerplate as legal advice.

## 14. System and error states

| Route/state | Page | Purpose |
|---|---|---|
| `/404` | Not found | Unknown route or missing record |
| `/403` | Access denied | Authenticated user lacks permission |
| `/500` | Unexpected error | Recoverable application error |
| Offline/network error | Connection state | Explain retry behaviour |
| Loading state | Loading | Accessible loading indicators |
| Empty state | No results | Helpful next step when there are no records |
| Unavailable state | Service unavailable | Clearly identify unconnected providers or disabled features |

## Recommended build order

1. **Foundation:** global shell/navigation/footer, home, search, 404, loading/empty/error states, responsive layout, SEO metadata.
2. **Core discovery:** sports, opportunities/trials, opportunity details, source/status display, submission workflow.
3. **Venue discovery:** venue list, venue details, courts, venue submissions; then booking only after availability and pricing safeguards pass.
4. **Training directory:** coaches, academies, guides, city pages.
5. **Athlete tools:** sports CV wizard and private preview/export.
6. **Live sports:** only after a genuine provider and licensing/usage terms are confirmed.
7. **Accounts/community:** only after auth and data-protection decisions are approved.
8. **Admin, trust, legal, and launch checks:** protected moderation, audit trail, policies, sitemap, accessibility, and end-to-end tests.

## Scope decision record

This is a comprehensive proposed inventory, not a promise to build every route in the first release. Prioritize pages that have real data and a tested user journey. Keep optional, paid, provider-dependent, or account-dependent pages hidden or clearly marked unavailable until ready.

## Additional architecture and launch safeguards

### Route correctness and URL governance

- Resolve static paths before dynamic parameter paths. For example, `/opportunities/submit` must be matched as a static route before `/opportunities/:id`; likewise `/venues/submit` must not be interpreted as a venue slug. Add explicit route tests for these collisions.
- Prefer one canonical URL for each page. Redirect aliases such as `/membership` to `/memberships` instead of creating duplicate content.
- Define trailing-slash, case, slug, query-parameter, pagination, and filter URL rules consistently. Preserve meaningful search filters while avoiding infinite combinations of indexable URLs.
- Use stable IDs for record lookups and human-readable slugs for URLs. Validate that a slug belongs to the requested record and return a real 404 for missing/deleted/unpublished content.
- Decide which routes are public, authenticated, role-restricted, noindex, redirect-only, or not yet enabled. Keep this registry alongside the router so sitemap, navigation, and access behaviour do not drift.

### Scalable without premature complexity

- Start with a **modular monolith**: one frontend app, one development Supabase project, clearly separated feature modules, and explicit interfaces. Do not split into microservices or separate deployments until measured operational needs justify it.
- Keep module APIs small. A module exports its route registration, public UI pieces, and approved use cases; internal components and repositories stay private.
- Use shared packages only for code that has multiple real consumers. Avoid a generic CMS, event bus, plugin marketplace, or elaborate permissions framework until the product requires it.
- Apply code splitting to large or rarely used modules (such as admin tools and the CV editor) and measure bundle size rather than splitting every tiny component.
- Use database indexes based on actual query/filter patterns, pagination for large lists, and bounded queries by default. Avoid fetching whole tables into the browser.
- Add caching only where staleness and invalidation rules are understood. Booking availability and authorization-sensitive data must not rely on stale public caches.

### Data lifecycle and moderation

- Model listing lifecycle explicitly: draft/submitted, under review, published, rejected, expired/closed, archived, and removed where applicable. Document legal transitions and which roles may perform them.
- Keep source URL, source checked-at time, status, and moderation/audit history for sourced opportunities. Expired records should automatically stop appearing in active listings based on verified event dates/status.
- Use server/database constraints for critical invariants, atomic operations for reservations, and idempotency for retryable submissions/actions where relevant.
- Define deletion, correction, retention, export, and user privacy workflows before collecting sensitive athlete or minor-related data.
- Do not collect precise location, date of birth, identity documents, health data, or other sensitive details unless there is a documented need, appropriate safeguards, and consent/legal review.

### Accessibility, localization, and responsive behaviour

- Target WCAG 2.2 AA as the accessibility goal: semantic landmarks, keyboard navigation, visible focus, adequate contrast, accessible validation, reduced-motion support, and screen-reader announcements for async status changes.
- Design mobile-first and test small screens, touch targets, long Indian place names, and slow connections. Keep navigation usable without hover.
- Prepare translation-ready UI strings and locale-aware dates/numbers. Add Hindi and other languages only with reviewed translations; do not mix translated labels with untranslated validation messages.
- Ensure forms preserve safe user input after recoverable errors and explain what can be corrected.

### Operational quality gates

Before a module can be marked **Implemented**: its routes render, core interactions work, and lint/typecheck/build pass.
Before a module can be marked **Verified**: route collision and permission tests pass; real data access and RLS are checked where applicable; loading/empty/error/not-found states are tested; mobile and accessibility checks are performed; and critical user journeys have automated tests or a recorded manual test.

Every release should run formatting/lint, TypeScript checks, unit tests, production build, migration validation, and critical end-to-end tests available in the project. Dependency/security checks and bundle-size monitoring should be added to CI where feasible. A green build alone does not prove correct data or authorization behaviour.

### Inventory governance

- Treat this file as the route proposal; maintain a separate route registry or typed route manifest as implementation begins. Do not maintain duplicate hand-written route lists across navigation, sitemap, and access rules.
- For each route, track: owner module, visibility, authentication/role requirement, data source, indexability, status, acceptance criteria, and tests.
- Review the inventory whenever a module is added, retired, renamed, or its access/data requirements change. Document redirects before removing public URLs.
- Build only prioritized modules; planned routes are not promised features and should not appear in navigation until ready.

### Immediate implementation gate

Before adding all planned pages, inspect the starter app and dependencies, choose and document the routing approach, add the shared application shell and error boundaries, and establish lint/typecheck/test/build checks. Then migrate one small vertical slice (for example, sports directory) through route, UI, typed data access, loading/error states, tests, and SEO before repeating the pattern for other modules. This validates the architecture without generating empty folders or fake content.

## Mobile application strategy

KhelGrid is intended to support both a responsive website and a dedicated mobile app. Treat these as two client experiences on the same product platform, sharing domain rules and backend contracts while respecting each platform's navigation and interaction patterns. The mobile app is planned scope; it is not yet implemented or released by this document change.

### Recommended delivery approach

- **Phase 1 — responsive web:** ensure the website works well on small screens and remains usable on slow or intermittent connections. This is useful independently and provides the first responsive baseline.
- **Phase 2 — mobile app foundation:** after validating core web modules and backend contracts, evaluate a cross-platform app using React Native with Expo (a candidate recommendation, not a final tool choice). This fits a React/TypeScript team and can target Android and iOS from a shared codebase.
- **Phase 3 — vertical-slice app:** start with a small, useful mobile release: sports/opportunity discovery, opportunity details and source/status, venue discovery, and saved items only if account functionality is securely enabled. Add modules after their APIs and acceptance criteria are proven.
- **Phase 4 — native capabilities:** add push notifications, deep links, share sheets, camera/photo upload, location-based discovery, and offline support only where the feature needs them and the user has granted relevant permissions.
- Do not wrap the website in a basic WebView and call it a full mobile app unless a deliberate product decision selects that trade-off.

### Shared platform, separate clients

Suggested high-level workspace when mobile development begins:

    apps/
      web/                 # Existing React + Vite website
      mobile/              # Future React Native / Expo client
    packages/
      domain/              # Portable domain types and pure business rules
      api-contracts/       # Validated request/response types
      design-tokens/       # Shared semantic colours, spacing, typography
      validation/          # Cross-client schemas where practical
    supabase/
      migrations/          # Versioned schema and policy changes

This is a target structure, not a request to relocate the current app immediately. Keep the current repository structure stable until an incremental migration is justified. Share portable TypeScript logic and contracts, not web-only React components, DOM APIs, or browser-specific code with the native app.

### Mobile-specific modules and screens

| App area | Initial screen/route | Notes |
|---|---|---|
| Onboarding | Welcome and feature overview | No account required to browse public content |
| Discover | Home and search | Lightweight, filterable discovery |
| Sports | Sports list and sport detail | Use the same supported sports catalogue as web |
| Opportunities | Trials/opportunities list and detail | Show source, last-checked date, eligibility, and current status |
| Venues | Venue list and venue detail | Display only published venue information and prices |
| Saved items | Saved list | Requires working authentication and user-owned storage |
| Notifications | Notification inbox/settings | Only when notification backend and consent controls exist |
| Profile | Profile/settings | Gated until authentication, privacy, and account deletion are implemented |
| Booking | Court selection and booking status | Disabled until database-enforced availability, pricing, concurrency, and cancellation checks pass |
| Live sports | Live match centre | Disabled/unavailable until a genuine authorized data provider is integrated |
| Sports CV | Create/edit/export CV | Plan for mobile-friendly forms and PDF export; protect personal athlete data |
| Help and legal | Help, privacy, terms, safety | Must be accessible from app settings and relevant flows |

Mobile screen names are a planning inventory, not existing screens or a guarantee that every feature ships in the first release.

### Mobile engineering rules

1. **Backend authority:** mobile clients are untrusted. Use the same Supabase RLS policies and trusted backend rules as the web app. Never embed service-role keys, provider secrets, or privileged credentials in the app bundle.
2. **Authentication and sessions:** if auth is enabled, use a supported secure session approach and platform-secure storage. Never store passwords or long-lived privileged tokens in ordinary local storage.
3. **Offline and retry behaviour:** distinguish cached/stale data from current data. Show when content was last refreshed; retry idempotently and avoid duplicate submissions or bookings after reconnecting.
4. **Booking correctness:** never rely on a device clock or client-side availability check to reserve a court. The database/trusted service must validate price, operating hours, holds, overlap, and state transitions atomically.
5. **Permissions and privacy:** request location, camera, photos, and notifications only when needed, explain why, and provide a manual alternative where reasonable. Avoid collecting precise location or sensitive athlete/minor data without a documented need and safeguards.
6. **Deep links:** use canonical HTTPS links that open the relevant screen in the app when installed and provide a useful web fallback. Validate parameters and authorization after opening a deep link.
7. **Performance:** paginate lists, compress/resize uploaded media, avoid unnecessary background work, support low bandwidth, and monitor app startup and crash rates.
8. **Accessibility and localization:** support screen readers, scalable text, adequate touch targets, dynamic font sizes, keyboard/accessibility navigation where applicable, and translation-ready Hindi/English UI strings.
9. **Release and distribution:** plan separate development/staging/production configuration, Android signing and iOS signing, store privacy disclosures, app permissions review, crash monitoring, and a rollback/release process. Never use production credentials in development builds.
10. **Parity without forcing identical UI:** keep domain behaviour and data rules consistent across web and mobile, but use platform-appropriate navigation, gestures, forms, and system controls.

### Mobile readiness gates

Before starting the native app, confirm the initial release scope, Android/iOS target, authentication decision, backend API contracts, privacy requirements, and who will maintain app-store releases. Then prove one end-to-end slice from backend data through a mobile screen, loading/empty/error states, accessibility, tests, and a development build.

Before any public release, test on real Android devices and, if iOS is targeted, iOS simulators/devices; test slow/offline networks, interrupted requests, expired sessions, deep links, permissions denied, small screens, accessibility, and upgrade paths. A successful web build does not validate a mobile build.

### Mobile delivery status

Track mobile work separately from web modules with statuses **Planned**, **In progress**, **Blocked**, **Implemented**, and **Verified**. This document update only records the mobile strategy and screen inventory; it does not create, build, publish, or submit an app to any app store.


## Planning completeness additions (planning only)

This section records cross-cutting decisions that should be settled before implementation expands. It does not authorize code changes, production changes, paid services, or a public launch.

### Product goals, audiences, and release scope

- Define the primary audiences and their jobs-to-be-done: athletes/parents, coaches, academies, venue owners, trial/event organizers, and visitors looking for sports information. Do not assume all audiences need accounts.
- Write a concise product promise and explicit non-goals. The platform helps people discover sports opportunities and venues; it must not imply that KhelGrid itself organizes, endorses, or guarantees third-party trials unless that is true.
- Maintain a prioritized release plan: **MVP**, next release, later/optional, and explicitly out of scope. For every MVP feature, name a user problem, owner module, dependency, success measure, risk, and acceptance criteria.
- Establish a decision log for major choices (routing, mobile framework, authentication, sports-data provider, search, analytics, monetization, and account eligibility), including alternatives considered, costs/limits, date, and revisit trigger.
- Define a visible feature-status vocabulary for internal planning: Planned, In progress, Blocked, Implemented, Verified, Deprecated. Keep user-facing states separate; never expose internal statuses as product claims.

### Roles, permissions, and account lifecycle

Plan a permission matrix before enabling accounts or submissions. Consider anonymous visitor, registered user, athlete, parent/guardian where applicable, coach, academy/venue owner, organizer, moderator, administrator, and service integration. Roles are not automatically proof of identity or qualification.

- Define who can view, create, edit, submit, publish, reject, archive, delete, export, and report each record type.
- Decide how role grants are approved, reviewed, revoked, and audited; prevent users from granting themselves privileged roles.
- Plan account deletion, data export, consent withdrawal, email/account change, recovery, session revocation, and handling of records that must be retained for security or legal reasons.
- Treat minors and parent/guardian consent as a dedicated product/legal review before collecting their personal information, enabling direct messaging, publishing profiles, or enabling location-based features.

### Source provenance, data rights, and third-party integrations

Create a source/provider register before ingesting external listings or live sports data. For each source, record owner, canonical URL/API, permitted purpose, license/terms, attribution requirements, update frequency, rate limits, cost, data retention/cache limits, contact/expiry date, and fallback behaviour.

- Do not assume publicly visible information is free to scrape, republish, or commercially use. Review each source's terms, copyright/database rights, robots rules, privacy requirements, and applicable laws before automated collection.
- For sports scores, fixtures, logos, photos, and commentary, confirm written or otherwise valid authorization and redistribution/display rights for the intended website and mobile app. A technically working API is not by itself permission to publish its data.
- Record provenance at field/listing level where practical: source, source-record identifier, retrieved/checked timestamp, editor/reviewer, confidence/status, and correction history.
- Define freshness thresholds per data type and a clear stale-data label. If a provider fails, show a truthful unavailable/stale state or a permitted fallback; never fabricate current values.
- Use provider adapters behind an internal contract so providers can be replaced without rewriting page components. Document quotas, timeouts, retry/backoff, caching, attribution, outage handling, and budget alerts.
- Never bypass paywalls, access controls, CAPTCHA, authentication, or rate limits. Do not copy third-party articles or images without the relevant rights.

### Content quality and editorial operations

- Define minimum publication requirements per content type. Opportunities should include source evidence, organizer, sport, location, eligibility, date/deadline, fees (or clearly stated unknown/free), contact/application method, and status when applicable. Do not invent missing values.
- Create a correction/expiry process with ownership and service targets: when to re-check, when to label stale, when to unpublish, how users report an error, and how disputes are resolved.
- Define duplicate detection and merge rules for repeated opportunities, venues, coaches, events, and city/sport pages. Preserve canonical IDs and redirect old public URLs when appropriate.
- Define editorial review for generated or AI-assisted copy. AI output is a draft, not evidence; a person or reliable source must validate factual claims before publication.
- Decide whether comments, reviews, messaging, user photos, or public athlete profiles are in the initial scope. If not, explicitly defer them rather than leaving moderation and abuse handling implicit.

### Search, discovery, and SEO governance

- Specify search behaviour: supported entity types, ranking principles, filters, sorting, pagination, typo/no-result behaviour, and how archived or stale records are treated.
- Plan query privacy and abuse limits for search and submission endpoints; do not expose private records through search, autocomplete, structured data, or cached responses.
- Define indexability rules for filter combinations, pagination, empty category pages, expired listings, user profiles, internal search results, and duplicate URLs. Private, personal, admin, and thin pages should not be indexable.
- Set standards for structured data only when visible page content supports it. Do not use fake ratings, prices, availability, reviews, or event status in SEO markup.
- Plan redirect ownership and a redirect map before route changes. Monitor broken links, indexing/canonical issues, and sitemap coverage after releases.

### Privacy, security, abuse, and legal review

- Create a data inventory: each field, purpose, sensitivity, lawful basis/consent where applicable, who can access it, where it is stored, retention/deletion period, and whether it is sent to third parties.
- Threat-model public forms, file uploads, admin actions, account recovery, booking, search, external callbacks, and mobile deep links. Plan validation, output encoding, rate limiting, spam/bot controls, upload type/size checks, and safe error responses.
- Define secure handling of secrets, environment separation, least-privilege access, dependency updates, vulnerability response, audit logging, and access reviews. Client-side checks are not security controls.
- Plan a report/appeal workflow for fraud, impersonation, unsafe listings, copyright complaints, harassment, and incorrect verification claims, with escalation and documented outcomes.
- Review privacy, consumer, advertising, accessibility, copyright, child-safety, and other legal obligations for the actual operating regions and product behaviour before launch. Obtain qualified legal advice where needed; this plan is not a substitute for it.

### Analytics, advertising, and monetization

- Decide what product analytics are needed to measure success (for example, successful searches, opportunity detail views, source clicks, CV exports, venue enquiries, and booking completion) and explicitly exclude unnecessary personal or sensitive data.
- Define consent, retention, opt-out, cookie/tracker disclosure, and vendor data-sharing rules before adding analytics or advertising SDKs. Do not place ad scripts on sensitive/account flows by default.
- Advertising must not obscure critical eligibility, fees, safety notices, booking terms, or source attribution. Label sponsored placements clearly and keep ranking decisions transparent.
- Treat advertising network approval, ads.txt, consent tooling, and policy compliance as launch gates, not assumed capabilities. Never promise revenue or approval.
- Do not launch paid memberships, subscriptions, booking fees, or payment collection until pricing, taxes/receipts, refunds/cancellations, dispute handling, payment-provider terms, reconciliation, and support ownership have been reviewed and tested.

### Reliability, operations, and continuity

- Set initial service expectations for availability, performance, data freshness, support response, and maintenance windows; do not promise an SLA that the team cannot meet.
- Define monitoring for application errors, failed database operations, provider outages, stale data, queue/retry failures, suspicious activity, and budget/quota thresholds. Alerts must reach a named owner.
- Document backup scope and limitations, retention, encryption/key custody, restore ownership, and recovery objectives (RPO/RTO). A successful backup job is not proof of recoverability; schedule restore drills before launch and after material schema changes.
- Define incident severity, decision-maker, user communication, containment, evidence preservation, post-incident review, and secret/key rotation. Avoid logging personal data or credentials in incident records.
- Plan graceful degradation: public browsing should not fail entirely because an optional provider, analytics tool, or mobile-only capability is unavailable.

### API and integration contracts

- Version internal API/data contracts deliberately. Define pagination, filtering, validation errors, authorization failures, idempotency, rate limits, and deprecation behaviour before multiple clients depend on them.
- Keep domain logic independent of web-only components and vendor SDKs where practical, so web and mobile share rules without sharing incompatible UI code.
- Document each integration's owner, credentials location, environment, data sent/received, failure mode, testing strategy, cost/limit, and replacement/exit plan.
- Avoid exposing internal database schemas as a permanent public API. Use stable domain contracts and least-privilege endpoints.

### Testing strategy and acceptance criteria

For each high-priority user journey, write Given/When/Then acceptance criteria and identify the evidence needed to mark it verified. At minimum plan tests for:

- Anonymous browsing, search/filter/pagination, source links, expired/unpublished/not-found records, and empty results.
- Submission validation, duplicate detection, spam/rate limiting, moderation transitions, audit history, and unauthorized mutations.
- RLS/permissions using different user roles, including attempts to read or alter another user's private data.
- Booking concurrency, expired holds, court-specific price and hours, cancellation transitions, duplicate requests, stale availability, and provider/database failures before booking is enabled.
- CV privacy, preview/export, malformed input, mobile layout, and deletion/consent behaviour.
- Accessibility keyboard/screen-reader flows, responsive layouts, localization, slow/offline networks, and recovery from interrupted requests.
- Migration upgrade and rollback/recovery procedures on the development project, plus a clean production build from a fresh install.
- Web and mobile deep links, session expiry, denied permissions, app upgrade paths, and real-device smoke tests before mobile release.

### Delivery, environments, and release management

- Keep development, test/staging (if available within budget), and production isolated with separate credentials and explicit deployment targets. No production deploy or production database change is implied by this planning work.
- Define branch/PR review rules, required CI checks, migration review, release notes, smoke tests, rollback/forward-fix decisions, and post-release monitoring.
- Establish a change gate for schema changes: migration reviewed, backup/recovery plan considered, test data prepared, RLS verified, migration applied only to the intended development environment, and results recorded.
- Track third-party costs and free-tier quotas. The free tier is a constraint, not a guarantee of unlimited capacity; plan limits, usage monitoring, and feature degradation before approaching caps.
- Define app ownership and ongoing maintenance: who handles support, moderation, provider renewals, dependency/security updates, store submissions, signing-key custody, and emergency releases.

### Risks and unresolved decisions register

Maintain a small register with **risk/decision**, **impact**, **likelihood**, **mitigation**, **owner**, **due/review date**, and **status**. Initial items to resolve before the related feature begins:

1. Which external sources and live-score provider are legally permitted, affordable, and reliable for web plus mobile?
2. Which features are in MVP, and which are explicitly deferred (accounts, bookings, payments, reviews, messaging, public profiles)?
3. What is the account/role model and what actions require identity or organizer verification?
4. What personal data is necessary, especially for minors, athlete profiles, CVs, and location features?
5. Which analytics and ad vendors, if any, meet consent, privacy, and publisher-policy requirements?
6. What search/indexing strategy is justified by current dataset size and budget?
7. What support, moderation, backup recovery, incident response, and release ownership can the team realistically maintain?
8. What objective criteria must pass before web modules, live data, booking, authentication, payments, and mobile are enabled?

### Planning completion checklist

Before implementation scope is expanded, mark each item **Decided**, **Deferred with reason**, or **Open**:

- [ ] MVP and non-goals agreed
- [ ] Primary audiences and key journeys defined
- [ ] Route registry includes access, indexability, data source, owner, and status
- [ ] Domain model and listing lifecycle agreed
- [ ] Source/provider rights and freshness rules recorded
- [ ] Role/permission matrix and moderation process agreed
- [ ] Privacy/data inventory and minor-safety review completed for relevant features
- [ ] Acceptance criteria and verification evidence defined
- [ ] Environment/release/migration gates agreed
- [ ] Backup scope, restore owner, RPO/RTO, and incident process defined
- [ ] Analytics/advertising/monetization decisions documented or explicitly deferred
- [ ] Web/mobile shared contracts and separate release gates agreed
- [ ] Risks, dependencies, costs, and decision owners recorded

A checklist item may remain open during planning, but it must not silently become an implementation assumption. This is a planning checklist, not a claim that the items have already been completed.


## Balanced MVP scope and priorities — planning decision

**Selected strategy:** Balanced MVP. The initial product prioritizes public sports discovery, sourced opportunities, a trustworthy venue/court directory, and private Sports CV creation, with trust, security, accessibility, content quality and operational safeguards treated as foundational requirements.

**Planning only:** This is a scope decision, not evidence of implementation or launch. It applies to the separate `khelgrid-platform` development project only. The production repository, production database and production deployment are out of scope.

### MVP outcomes

A visitor should be able to:
1. Discover supported sports and search public content without an account.
2. Browse trial/opportunity listings with evidence/source links, eligibility, dates, known fees/contact details, last-checked context where available, and honest status.
3. Discover reviewed venues/courts with published facilities, location and prices only when supported by evidence.
4. Create, preview, correct and export a Sports CV without making personal information public by default.
5. Report incorrect, expired, unsafe or potentially infringing content and find relevant privacy, sourcing, safety and correction policies.

Prioritize complete, trustworthy user journeys over the number of pages or features.

### Priority tiers

| Priority | Scope | Decision |
|---|---|---|
| **P0 — foundation and trust** | Responsive shell/navigation, route registry, accessible loading/empty/error/not-found states, typed domain contracts, development-only data access, migration/RLS review, CI checks, privacy/security baseline, sourcing and moderation rules | Required before release readiness |
| **P1 — core MVP** | Home, public search, supported sports directory, opportunity list/detail, source/status/expiry display, venue/court directory/detail, reviewed venue submission if safe to operate, Sports CV create/preview/export, report/correction path | Primary journeys to build and verify |
| **P1 — launch operations** | SEO/canonical/sitemap rules, performance baseline, privacy-conscious analytics decision, error/provider monitoring, tested backup/recovery procedure, support and incident ownership | Required where applicable before public launch |
| **P2 — later** | Accounts, saved items, notifications, public athlete profiles, coach/academy directories, community/pickup games, expanded editorial content, advanced search, dedicated native mobile app | Plan interfaces now; implement when core needs and dependencies are proven |
| **P3 — gated** | Live scores/fixtures, court booking, payments/subscriptions, reviews/messaging, premium plans, ads/sponsored placements, advanced AI features | Deferred until provider rights, costs, safeguards and operations are ready |

These tiers are the proposed release boundary. Changes require an explicit scope decision rather than silent expansion.

### Module requirements and acceptance criteria

#### Platform foundation and sports discovery — P0/P1
**Dependencies:** Existing React/TypeScript/Vite starter; routing decision; shared layout and design tokens; route registry; typed domain contracts; approved development data access.

**Acceptance criteria**
- Public browsing works without an account on small, medium and desktop screens.
- Navigation, headings, forms, focus, validation and async status are usable by keyboard and screen readers to the agreed accessibility target.
- The route registry records module owner, access, data source, indexability, status and tests; static routes take precedence over dynamic routes.
- Search documents supported entities, filters, pagination, no-results and error behaviour; private/unpublished records never leak into results.
- Unknown routes/missing records show a real not-found state; service failures are not disguised as successful empty results.
- CI runs lint, typecheck, unit tests and production build; critical journeys have automated tests or recorded acceptance evidence.
- Public counts, ratings, statistics and verification claims are evidence-backed or omitted.

#### Opportunities and trials — P1
**Dependencies:** Opportunity schema and lifecycle; permitted source register; provenance fields; expiry/duplicate rules; moderation roles; RLS and validation tests.

**Acceptance criteria**
- Only eligible published records appear in active lists; expired/closed opportunities are not shown as open.
- Listings provide source evidence and relevant organizer, sport, location, eligibility, dates/deadline, fee status, contact/application method and checked/status information where applicable. Unknowns are not guessed.
- Invalid, duplicate, incomplete or unauthorized submissions cannot publish outside the documented review path.
- Users can report errors; reports enter a restricted workflow with an owner, status and escalation path.
- Publication/moderation transitions are authorized by trusted backend/database rules and audited, not just hidden behind browser UI.
- Tests cover expiry boundaries, missing source, unpublished records, duplicate submissions, unauthorized edits and corrections.
- AI-generated/imported content is not treated as verified merely because it was generated or ingested.

#### Venue and court directory — P1; booking excluded
**Dependencies:** Venue/court model; reviewed submission process; publication and duplicate rules; price evidence; location/privacy decisions; reporting and moderation.

**Acceptance criteria**
- Only reviewed, published venue/court records are public.
- Prices, hours, facilities, images, ownership and verification claims appear only when supported and approved for publication.
- Unknown information is omitted or clearly marked unknown; no fake venues, ratings, prices, facilities or availability.
- Venue/court records have stable IDs, canonical routes, correction/report paths and appropriate privacy controls.
- Submitting a venue is a proposal, not automatic publication or proof of ownership.
- Tests cover unpublished/removed venues, venue-court relationships, invalid prices, duplicates, permission boundaries and empty/error states.
- The directory never implies live slot availability or booking completion. Booking remains a separate deferred feature.

#### Sports CV — P1
**Dependencies:** CV field/data inventory; private-by-default design; validation; export approach; retention/deletion decision; privacy review, including athlete/minor-related considerations.

**Acceptance criteria**
- A visitor can enter information, preview, correct errors and export a readable CV without being forced to publish a profile or create an account unless separately approved.
- Required/optional fields are documented; accessible validation preserves safe input after recoverable errors.
- Export is tested for page breaks, long names, missing optional values, malformed input and mobile usability.
- CV data is not sent to analytics or third parties without a documented purpose and controls.
- CVs are not public/indexable by default. Sharing requires explicit consent plus revocation/deletion rules.
- If data is stored, access is restricted to the owner and authorized operations; if generated locally, document what is and is not stored.
- Tests cover privacy defaults, preview/export, validation and deletion/consent behaviour.

#### Trust, safety and moderation — P0
**Dependencies:** Data inventory; role/permission matrix; content lifecycle; privacy/security review; correction and incident ownership; legal review for actual launch scope.

**Acceptance criteria**
- Relevant privacy, terms, contact/help, editorial/sourcing, verification, corrections, safety, accessibility and copyright information is available.
- Reports have a defined destination, restricted access, triage owner, status tracking and escalation for serious safety/copyright concerns.
- Publication, role and private-data mutations are authorized in the trusted backend/database and auditable.
- Secrets never ship to the client; logs exclude credentials, session tokens and unnecessary personal/athlete data.
- Retention/deletion, consent, incident response, backup scope and recovery ownership are documented before higher-risk data is collected.
- Legal content is reviewed against actual product behaviour and operating jurisdictions; boilerplate is not treated as legal advice.
- Public forms have validation, safe output handling and abuse/rate-limit protections.

### Explicitly deferred from the Balanced MVP

- **Accounts/workspace:** login, signup, saved items, applications, notifications and dashboards. Gate on approved authentication/session, role, recovery, deletion, privacy and RLS design.
- **Booking:** reservations, holds, live availability, cancellation and booking notifications. Gate on atomic database conflict prevention, expired-hold handling, court-specific published pricing, hours validation, idempotency and concurrency tests.
- **Payments/memberships:** gate on pricing, receipts/taxes, refunds, disputes, reconciliation, provider terms, support ownership and testing.
- **Live sports:** scores, fixtures, match centre, commentary and logos require an authorized provider, display/redistribution rights, attribution, freshness/outage handling, cost/quota review and real-data tests. No simulated live data.
- **Native mobile app:** first validate responsive web and core contracts; then decide Android/iOS scope, React Native/Expo suitability, maintenance owner, signing, store disclosures, device testing and release budget.
- **Public athlete profiles, coaches/academies, reviews, messaging, community games and user-generated media:** defer until consent, verification, moderation, abuse handling, privacy and support are ready.
- **Advertising/paid promotion:** defer until content usefulness, consent, placements, attribution, network terms and policy requirements are reviewed.
- **Advanced AI/personalization/large-scale ingestion:** defer until permitted data, clear user value, quality checks, measurable outcomes and operating costs are established.

Deferred does not mean rejected permanently. These features must not be shown as available or operational before their gates pass.

### Risks, dependencies and mitigations

| Risk | Potential impact | Mitigation / gate |
|---|---|---|
| Source rights do not permit reuse | Legal exposure or takedowns | Record terms, rights, attribution and allowed uses before ingesting/republishing |
| Sparse/stale opportunities | Low trust and weak discovery | Start with a smaller useful catalogue; source, expiry and correction rules are mandatory |
| Unverified venue facts/prices | Misleading users or disputes | Review before publication; unknown values stay unknown; keep booking disabled |
| Scope expansion | Delay and maintenance burden | Enforce P0/P1/P2/P3 tiers and document changes |
| Weak RLS/role model | Data exposure or unauthorized publication | Test allowed and denied access in the development environment |
| Athlete/minor data over-collection | Privacy and safety risks | Minimize fields; private-by-default CV; feature-specific review |
| Free-tier/provider limits | Outages or unexpected costs | Usage monitoring, quotas, pagination, graceful degradation; no paid upgrade without approval |
| Thin or misleading SEO pages | Poor index quality and user trust | Index only useful canonical pages with real visible content |
| No operational owner | Unresolved reports, outages or failed recovery | Assign owners for moderation, support, providers, backups, security and releases |
| Web/mobile contract drift | Inconsistent behaviour and duplicated rules | Version shared domain/API contracts; separate client release gates |

Each risk needs an owner and review date before the related feature is considered ready. No owner is assumed by this document.

### Balanced MVP go/no-go release gate

Do not call the MVP release-ready until applicable checks have evidence:

- [ ] Core public journeys work end-to-end with permitted real data; no fake production-facing content.
- [ ] Opportunity provenance, freshness, expiry, correction and moderation behaviour is tested.
- [ ] Venue/court publication and privacy rules are tested; booking is clearly unavailable rather than implied.
- [ ] Sports CV preview/export works and privacy defaults are verified.
- [ ] Database policies/constraints are tested for permitted and denied access in development.
- [ ] Responsive and agreed accessibility checks pass for core journeys.
- [ ] Loading, empty, error, stale/unavailable, expired and not-found states are tested.
- [ ] CI passes from a clean install; critical journeys have automated tests or recorded manual evidence.
- [ ] SEO metadata, canonicals, sitemap/robots and redirects match the route registry.
- [ ] Backup scope and recovery procedure are tested; an operational owner is assigned.
- [ ] Privacy/legal review, report handling, support contact and incident process fit the actual release scope.
- [ ] Target environment, credentials, rollback/forward-fix plan and post-release monitoring are reviewed.
- [ ] Deferred features are hidden or explicitly unavailable, not advertised as working.

A failed gate means **Blocked** or **In progress**, not Verified. A pass applies only to the tested version and environment.

### Next planning deliverables

Prepare these in order before widening implementation scope:

1. **MVP decision record:** scope, non-goals, success measures and explicit deferrals.
2. **Route registry:** route, module owner, access, data source, indexability, status, acceptance criteria and tests.
3. **Domain/data dictionary:** entities, field definitions, lifecycle transitions, provenance, retention and relationships.
4. **Role/permission matrix:** who may view, submit, moderate, publish, edit, archive and delete each entity.
5. **Source/provider register:** usage rights, attribution, freshness, quotas, costs, fallback and review owner.
6. **Journey acceptance plan:** Given/When/Then cases for the core user outcomes and trust/security.
7. **Release/operations checklist:** environments, migrations, CI, recovery, incidents, support and go/no-go ownership.

These are planning artifacts. Their inclusion does not claim implementation, testing, security verification, legal review or launch readiness has occurred.
