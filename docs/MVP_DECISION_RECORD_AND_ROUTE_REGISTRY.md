# KhelGrid Balanced MVP — Decision Record and Route Registry

**Status:** Planning baseline; decisions below are proposed for MVP planning, not proof of implementation.  
**Project:** Separate `khelgrid-platform` repository and its development Supabase project only.  
**Production boundary:** This document does not authorize or describe changes to the production repository, production database, or production deployment.  
**Last planning update:** 2026-10-25

## 1. MVP decision record

### Decision

Adopt a **Balanced MVP** focused on public sports discovery, sourced opportunities/trials, reviewed venue/court directories, and private-by-default Sports CV creation/export. Trust, security, accessibility, moderation, source provenance, privacy, and basic operational readiness are foundational—not optional follow-up work.

### Why this scope

- It delivers useful public value without requiring account creation for core discovery.
- It prioritizes data quality and user trust over an oversized initial feature set.
- It creates a modular foundation that can later support a dedicated mobile app without prematurely building a second client.
- It avoids live-data licensing, booking concurrency, payment handling, and account-security complexity until their dependencies and owners are established.

### MVP success measures to define before launch

Set numeric targets only after baseline data and operating capacity are understood. Proposed measures:
- Successful public search and relevant result selection.
- Opportunity detail views followed by source/application link clicks.
- Percentage of published opportunities with required evidence and current status.
- Percentage of published venue records meeting the venue data-quality checklist.
- Successful CV preview/export without accidental public disclosure.
- Report acknowledgement and resolution time.
- Critical journey completion, accessibility findings, error rates, page performance and stale-data rate.

Do not publish invented usage counts, quality percentages, ratings or service-level promises.

### In scope

1. Responsive application shell, navigation, help/contact and core system states.
2. Public search and supported sports directory.
3. Opportunity/trial browse and detail pages with source, status, expiry, eligibility and known application details.
4. Venue/court browse and detail pages with reviewed, published information only.
5. Sports CV create, preview and export, private by default.
6. Content reporting/correction intake, moderation policy, relevant trust/legal pages, SEO governance, accessibility, security and release checks.

### Out of scope for initial MVP

- Authentication/account workspace, saved items, applications, notifications and public athlete profiles.
- Reservation/booking, live availability, payment collection, subscriptions and refunds.
- Live scores, fixtures and commentary until an authorized provider and usage rights are confirmed.
- Dedicated native mobile app until the responsive web journeys and shared contracts are validated.
- Reviews, messaging, public user-generated media, community games and advanced personalization.
- Advertising, sponsored ranking, premium plans and broad AI/automated ingestion before their policy, rights, privacy and operational gates pass.

Deferred features must not appear as operational in navigation, marketing or structured data.

### Non-negotiable constraints

- No fake or simulated data presented as genuine.
- No unverified public claims, ratings, verification badges, prices, availability or statistics.
- External content must be used only after source terms, copyright/database rights, privacy and attribution requirements are reviewed.
- Browser checks are not authorization; trusted backend/database policies must protect privileged actions and private data.
- No service-role keys or provider secrets in client code.
- Free-tier quotas are monitored; no paid upgrade or service migration without explicit approval.
- Changes in this planning phase do not touch production resources.

## 2. Dependencies and decision gates

| Dependency | Required decision/evidence | Blocks |
|---|---|---|
| Route and module registry | Canonical route, owner, access and indexability rules | Public route expansion and SEO |
| Domain/data dictionary | Entity fields, relationships, lifecycle and validation | Opportunity/venue data work |
| Source/provider register | Rights, attribution, refresh/freshness, cost, quotas and fallback | Publishing sourced listings and any live data |
| Moderation model | Roles, allowed transitions, audit history, correction and escalation | Public submissions and publication |
| Privacy/data inventory | Purpose, sensitivity, access, retention/deletion and third-party sharing | CV storage, accounts and athlete data |
| RLS/DB rules | Intended allow/deny tests in development | Any private or privileged data access |
| CV export approach | Privacy model, format/layout validation and storage decision | Sports CV release |
| SEO policy | Canonicals, indexability, sitemap, redirects and structured-data constraints | Public indexing |
| Operational ownership | Support, incidents, backups/restore, monitoring and release owner | Public launch |
| Native mobile decision | Core web proof, shared contracts, target platforms, maintenance and release budget | Dedicated mobile app |
| Live data provider | Valid usage/display rights, attribution, freshness, cost and reliability tests | Live sports feature |
| Booking safeguards | Atomic overlap protection, expired holds, published prices, operating hours, cancellation and concurrency tests | Booking feature |
| Payment design | Provider terms, receipts/taxes, refunds, disputes, reconciliation and support | Any money collection |

## 3. Route registry

This is the initial registry of **planned routes**. It is intentionally compact: routes not needed for the MVP remain in the broader page inventory and are not automatically approved for implementation. “Planned” does not mean the route already exists.

| Route / route pattern | Module owner | Visibility/access | Data source | Indexability plan | Priority/status |
|---|---|---|---|---|---|
| `/` | Home | Public | Published catalogue and approved editorial content | Index if useful, complete content exists | P1 / Planned |
| `/search` | Search | Public | Published sports, opportunities, venues; bounded queries | Noindex search results by default; canonical policy for meaningful landing pages | P1 / Planned |
| `/sports` | Sports | Public | Maintained supported-sports catalogue | Index when non-empty and useful | P1 / Planned |
| `/sports/:slug` | Sports | Public | Supported sports catalogue and published related records | Index only for supported sports with distinct useful content | P1 / Planned |
| `/opportunities` | Opportunities | Public | Published opportunities only | Index when useful and not thin | P1 / Planned |
| `/trials` | Opportunities | Public | Published active trial/selection records | Index if useful; avoid duplicate content with opportunities hub | P1 / Planned |
| `/opportunities/:id/:slug?` | Opportunities | Public; published records only | Published opportunity record and provenance | Canonical record URL; noindex unpublished/private; closed records follow archive policy | P1 / Planned |
| `/opportunities/submit` | Submissions | Public intake; rate-limited; review required | Validated submission intake, not direct publication | Noindex | P1 if moderation workflow is ready; otherwise deferred |
| `/opportunities/:id/report` | Trust/reporting | Public intake; protected report handling | Report intake linked to record; private moderation store | Noindex | P1 / Planned |
| `/venues` | Venues | Public | Published reviewed venue records | Index when useful content exists | P1 / Planned |
| `/venues/:slug` | Venues | Public; published records only | Published venue and public court details | Canonical venue URL; noindex unpublished records | P1 / Planned |
| `/venues/:slug/courts/:courtSlug` | Venues | Public; published court only | Published court and parent venue | Canonical if content is distinct and useful | P1 / Planned |
| `/venues/submit` | Submissions | Public intake; review required | Validated proposal, not automatic publication | Noindex | P1 if moderation workflow is ready; otherwise deferred |
| `/venues/report` | Trust/reporting | Public intake; protected report handling | Report intake and private moderation store | Noindex | P1 / Planned |
| `/sports-cv` | Sports CV | Public | CV guidance/templates; no personal record required | Index if useful | P1 / Planned |
| `/sports-cv/create` | Sports CV | Public tool; personal input remains private | Local/private CV workflow; storage choice still to be decided | Noindex | P1 / Planned |
| `/sports-cv/preview` | Sports CV | Private to the current workflow/user; no public sharing by default | Current CV draft | Noindex; never include personal draft in sitemap | P1 / Planned |
| `/sports-cv/templates` | Sports CV | Public | Maintained templates | Index if distinct and useful | P1 / Planned |
| `/about` | Platform | Public | Approved editorial content | Index | P1 / Planned |
| `/contact` | Platform/support | Public | Approved support/contact channel | Index | P1 / Planned |
| `/help`, `/faq` | Help | Public | Reviewed help content | Index when useful | P1 / Planned |
| `/report` | Trust/reporting | Public intake; protected handling | Report intake | Noindex | P1 / Planned |
| `/privacy`, `/terms` | Trust/legal | Public | Reviewed policies matching actual product behaviour | Index as appropriate | P0 before public launch |
| `/editorial-policy`, `/verification-policy`, `/corrections`, `/safety`, `/accessibility`, `/copyright` | Trust/legal | Public | Approved policies and workflows | Index as appropriate | P0 before public launch |
| `/404` and global loading/error/unavailable states | App foundation | Public/system | Application state | Noindex for error pages | P0 / Planned |
| `/login`, `/signup`, `/dashboard`, `/saved`, `/applications`, `/notifications` | Account | Account-gated | Authenticated user data; auth not enabled for MVP | Noindex | P2 / Deferred |
| `/book`, `/book/:venueSlug`, `/bookings/:id` | Booking | Would require approved account/booking rules | Trusted availability and booking service | Noindex for personal booking pages | P3 / Deferred |
| `/live`, `/live/:sport`, `/matches/:id` | Live sports | Public only after provider approval | Authorized live-data adapter | Index only where real, useful, permitted content exists | P3 / Deferred |
| `/admin/**` | Admin/moderation | Restricted role; backend/database enforcement | Protected moderation/audit data | Noindex and never in public sitemap | Restricted future module |

### Route registry rules

- Register static routes before parameterized routes so `/opportunities/submit` is not treated as an opportunity ID and `/venues/submit` is not treated as a venue slug.
- Use stable IDs for record lookups and slugs for readable URLs. Resolve missing, unpublished and removed records according to documented policy.
- Maintain one canonical URL per page. Define case, trailing slash, query filters, pagination and redirects consistently.
- Sitemap, navigation, route guards and indexability must derive from or be checked against one typed route manifest as implementation begins.
- Never include private CV drafts, account pages, reports, admin routes, internal search results or unavailable feature pages in public sitemaps.
- A planned route must not appear in navigation until its minimum acceptance criteria pass.

## 4. Cross-cutting acceptance criteria

Before any MVP route is marked **Verified**, record evidence that:
- It meets the visibility/access rule in this registry.
- Data is real, permitted, validated, and appropriately published.
- Loading, empty, error, unavailable and not-found behaviour is correct where applicable.
- Accessibility and responsive checks have been completed.
- Tests pass for key happy paths and relevant denied/error paths.
- SEO metadata/indexability/canonical behaviour matches the registry.
- No unsupported claim or private data is exposed.
- Dependencies, owner, release status and known limitations are documented.

### Core journey acceptance examples

**Sports discovery**
- Given a visitor, when they open the sports index and select a supported sport, they see the matching canonical page.
- Given an unsupported or retired sport, when its URL is opened, the page does not invent content and returns the documented not-found/redirect result.
- Given no matching search results, the interface explains that clearly and offers a reasonable next step.

**Opportunity discovery**
- Given a published current listing with source evidence, when opened, its source, relevant dates, eligibility and status are visible.
- Given an expired or unpublished listing, it cannot appear as an open opportunity.
- Given a submission or correction, it cannot change public state until the documented authorized review transition occurs.

**Venue discovery**
- Given a venue/court record, only reviewed published fields are public.
- Given unknown pricing or availability, the page does not guess a price or imply a free/open slot.
- Given a venue proposal, it remains pending until authorized review.

**Sports CV**
- Given CV input, the visitor can preview, correct and export it.
- Given a fresh session or private draft, CV data is not publicly accessible or indexed by default.
- Given invalid input or export failure, the user receives an accessible error and can recover without unnecessary data loss.

**Trust/security**
- Given a user without moderator permission, direct attempts to publish or alter privileged records are denied by trusted backend/database rules.
- Given a report, its details are not exposed to other public users and it has a defined review destination.
- Given an external source/provider outage, the product displays a truthful unavailable/stale state rather than fabricated current data.

## 5. Planning status vocabulary

- **Planned:** documented, not implemented.
- **In progress:** implementation started, acceptance evidence incomplete.
- **Blocked:** a dependency, decision, risk or test prevents progress.
- **Implemented:** the intended code path exists and basic checks pass.
- **Verified:** acceptance criteria have been tested in the intended environment, including security/data behaviour where applicable.
- **Deferred:** intentionally outside current MVP; not available to users.

Track each route and module using one status and a link to its acceptance evidence. Do not mark this document's planning work as feature verification.

## 6. Open decisions to resolve before build scope expands

- [ ] Confirm whether MVP CV generation is fully local or uses private backend storage.
- [ ] Select and document the initial permitted sources for opportunities and venue records.
- [ ] Agree required fields and freshness thresholds per listing type.
- [ ] Approve moderator roles, audit fields and publication transitions.
- [ ] Confirm public submission intake and spam/rate-limit controls.
- [ ] Confirm privacy, retention, deletion and child-safety requirements for the actual data collected.
- [ ] Choose the routing approach and typed route-manifest format after inspecting the starter app.
- [ ] Define initial accessibility/performance targets and how they will be measured.
- [ ] Assign operational owners for support, moderation, backups, incidents and releases.
- [ ] Define MVP success metrics and baselines before setting numeric targets.

Items may remain open during planning, but must not silently become implementation assumptions.
