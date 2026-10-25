# KhelGrid Platform — Page Inventory & Sitemap

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
