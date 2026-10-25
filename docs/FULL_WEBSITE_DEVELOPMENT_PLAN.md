# KhelGrid Full Website Development Plan

- Status: Planning baseline for owner review; not an implementation or deployment approval
- Last updated: 2026-10-25
- Repository: `khelgrid-platform`
- Working branch: `feat/app-shell-discovery-modules`
- Production boundary: `khelgrid-monetization-studio`, production Supabase and current live deployment remain unchanged unless the owner separately authorizes a specific change.

## 1. Objective

Finalize a complete, sequenced plan for rebuilding KhelGrid as a reliable, responsive, evidence-based sports discovery platform. This document defines the intended scope, dependencies, work packages, decisions, acceptance evidence and release gates. It does not imply the features are implemented or tested.

## 2. Product direction

KhelGrid helps people discover sports, current and upcoming selection trials/opportunities, sports venues and courts, and create a Sports CV. The platform must favour trustworthy source data, clear status, accessibility, privacy and safe operation over breadth or unsupported claims.

### Product principles
- Genuine sources only for real-world claims; no fabricated venues, trials, prices, scores, availability, reviews, ratings or verification.
- Every sourced listing has provenance, a last-checked timestamp where applicable, a status and an expiry/recheck rule.
- Separate loading, empty, unconfigured, unavailable, stale, error and success states.
- Private by default for personal data and CVs; share only by explicit user choice.
- Authorization is enforced server-side and in effective database policies.
- External providers are used only after terms, attribution, privacy, coverage, redistribution rights and cost are reviewed.
- Preserve KhelGrid's approved navy/green identity and responsive layout.
- Supabase Free Plan remains the planning constraint; no paid upgrade or provider commitment without owner approval.
- Production repository, data, domain/DNS and deployment remain out of scope until separately authorized.

## 3. Scope decisions

### Initial public MVP — recommended baseline
1. Responsive app shell, shared navigation, footer, search, accessible menu and core page states.
2. Home and sports directory, supported sport detail pages, city/sport discovery where real content exists.
3. Opportunities/trials browse and detail with source evidence, dates, eligibility, known fees, location/contact, application path, status and archive rules.
4. Venue/court directory and detail with reviewed published data, facilities, contact, photos with rights, and clearly disclosed missing fields.
5. Sports CV create, preview and export as a private/local-first feature, subject to confirming scope; do not claim account sync or public sharing until implemented.
6. Contact/help, report-a-listing/correction intake, trust and editorial policy, privacy/terms/copyright and relevant legal pages.
7. SEO foundations, accessibility, performance, error states, tests, deployment/rollback and data-quality operations.

### Deferred until prerequisites and owner approval
- Accounts/authentication, profile workspace, saved items, applications, public athlete profiles, secure share links and notifications.
- Venue booking, availability/holds, booking confirmation/cancellation, payments, wallets, refunds and subscriptions.
- Live scores, fixtures, commentary and audio until a structured provider is approved for intended use and licensing.
- Native mobile app; first validate responsive web and deep-link requirements.
- Reviews, messaging, user-generated media, community/matchups and advanced personalization.
- Advertising, sponsored ranking, premium plans, analytics tags and broad AI ingestion until consent, policy, rights, privacy and operational gates pass.
- MCP/LLM tools that access non-public data or perform write actions.

Deferred features must not be represented as available in navigation, metadata, ads, structured data, marketing copy or API responses.

## 4. Architecture and environment plan

### Frontend
- React + TypeScript + Vite; reusable design tokens, accessible primitives and shared responsive shell.
- Route registry and navigation configuration should be the source of truth for links, aliases and active states.
- Typed data-access modules isolate UI from Supabase and future provider changes.
- Each data-driven page defines loading/empty/unconfigured/unavailable/stale/error states.
- No hard-coded demo records in public production paths.

### Backend and database
- Supabase Free Plan is the initial target; confirm actual quotas/limitations before relying on background processing.
- SQL migrations are versioned, reviewed and tested in isolated development before any staging/production consideration.
- Use least-privilege grants, RLS, explicit public views/projections, constraints and server-side functions for privileged transitions.
- Never expose service-role keys in browser code. Keep provider credentials in server-only environment variables.
- Treat the database as the source of truth for published status, listing lifecycle, and any future booking invariants.
- Maintain reproducible migrations, backup evidence and a tested restore process. Do not use production data as test fixtures.

### Hosting and release
- GitHub Actions: install from lockfile, lint, typecheck, unit/integration tests, build, security checks and migration checks where available.
- Vercel preview deployment only after CI checks; verify preview environment variables and project identity before testing.
- Production release requires an explicit owner approval, reviewed release commit, smoke tests and rollback plan.
- Document exact Node/npm versions and use lockfile-based installs.

## 5. Phased delivery roadmap

Phases are gates, not calendar promises. Estimate dates only after scope decisions, baseline repository tests and available capacity are known.

### Phase 0 — Plan and baseline
Deliverables:
- Approve this plan and MVP scope/non-goals.
- Complete route parity registry with production source route, proposed private route, preserve/merge/defer/retire decision, owner, dependency, access class and acceptance test.
- Inventory data sources, provider candidates, environment variables, migrations, workflows, external scripts and legal obligations.
- Confirm Node/npm versions, package scripts, CI status and baseline test failures.
- Identify all production-only resources and prevent accidental use from development.
Exit gate: owner-approved scope and route decisions; baseline results recorded; no assumption treated as tested.

### Phase 1 — Application foundation and route parity
Deliverables:
- App shell, responsive navigation, footer, route registry, 404, aliases and redirect policy.
- Home, sports directory, sport detail, search and agreed discovery pages.
- Visual consistency, keyboard operation, accessible labels, reduced-motion support where applicable, responsive breakpoints and error/empty states.
- Canonical URLs, page metadata, sitemap/robots rules and route smoke tests.
Exit gate: every MVP route has an owner-approved disposition and tests cover direct load, refresh, back/forward, aliases, unknown route and mobile layout.

### Phase 2 — Source and content governance
Deliverables:
- Listing schema and editorial/source evidence checklist.
- Source registry with permitted use, attribution, check time, expiry/recheck cadence and correction history.
- Import/review workflow that keeps unverified records unpublished.
- Archive expired opportunities; do not infer open status from future event date alone.
- Report/correction intake, moderation workflow, editorial/trust policies and a documented response owner.
Exit gate: representative records have verified provenance; unsupported records are excluded from public active results; stale/unavailable states are tested.

### Phase 3 — Opportunities and trials
Deliverables:
- Database-backed public listing and detail pages.
- Source link, dates, eligibility, known fees or “not stated”, location/contact, status and expiry.
- Search/filter by supported sport, location, event date and type, only where source data supports it.
- API, sitemap and structured metadata use the same authoritative published records.
- Admin/reviewer publication and archive decisions are auditable if moderation tooling is in scope.
Exit gate: listing lifecycle, source mismatch, expired record, missing fields and unpublished-record tests pass. No fabricated trial data is exposed.

### Phase 4 — Venues and courts directory
Deliverables:
- Published-only venue/court directory and detail.
- Location, sport, facility amenities, contact, photos with rights, operating information and published prices only when evidence exists.
- Owner submission flow may be added only with authenticated ownership, pending state and separate reviewer approval.
- Clear distinction between venue information and actual booking/availability.
Exit gate: public queries expose only published fields; unpublished venues never appear; data-quality and owner/reviewer authorization tests pass. Booking remains disabled until its own phase.

### Phase 5 — Sports CV
Deliverables:
- CV field schema, validation, accessible wizard/editor, preview and PDF/export.
- Explicit decision on local-only versus authenticated persistence before implementation.
- Private-by-default behaviour, data minimization, safe export and clear privacy messaging.
- If sharing is approved later: opaque, scoped, expiring and revocable token; allowlisted fields; no private payload in URL.
- Language plan: English baseline, then Hindi and additional Indian languages after translation/validation/PDF tests.
Exit gate: create/edit/preview/export tests pass; no sample athlete fallback or unsupported verification claim; privacy tests cover intended storage model.

### Phase 6 — Security, privacy and operations hardening
Deliverables:
- Effective RLS/grant audit and anonymous/owner/cross-user JWT tests.
- Secrets and environment separation, rate limits, safe errors, redacted logs and dependency review.
- Consent and third-party tag inventory; privacy/legal content reviewed for actual behaviour.
- Backup coverage, encryption/key custody and isolated restore drill.
- Monitoring, incident escalation, rollback, RPO/RTO approved by owner.
Exit gate: no unresolved P0 security/privacy/data-integrity issue; evidence recorded against exact commit and environment.

### Phase 7 — Deferred authenticated workflows
Only after owner approval and identity design:
- Authentication/account lifecycle, profile workspace and saved items.
- Trial applications, applicant ownership, valid state transitions, privacy and notifications.
- Secure athlete profile and share controls.
- Notification persistence, consent, delivery/retry/idempotency, unsubscribe and honest delivery status.
Exit gate: cross-user tests, lifecycle tests, abuse/rate-limit tests and provider policy review pass.

### Phase 8 — Venue booking (separate high-risk release)
Only after booking scope and operational ownership are approved:
- Venue owner verification and admin-only publication.
- Court-specific price, hours, closures, slot duration and cancellation rules.
- Server/database-authoritative price and availability; atomic booking/hold RPCs; expiry and overlap protection.
- Concurrency, idempotency, ownership and valid status transitions.
- Payment provider, refunds, taxes, reconciliation and customer support are separate decisions; no real charge until payment compliance and end-to-end sandbox tests pass.
Exit gate: isolated concurrency and price-tampering tests pass; recovery/reconciliation process exists; no fake venue or slot; owner approves launch.

### Phase 9 — Live sports, AI/MCP, monetization and mobile
Each is an independent workstream with its own approval gate:
- Live sports: structured provider, sport/league coverage, redistribution/commercial rights, attribution, timestamps, caching, stale/outage behaviour, rate limits and cost.
- AI/MCP: schemas, public/private boundaries, injection tests, rate limits, secret redaction, logging/retention, tool inspection and provider terms.
- Monetization: publisher approval, ads.txt, consent-management, region-specific behaviour, ad placement and network request evidence.
- Mobile/PWA/native: manifest, service worker, deep links, offline/update behaviour, permissions, backup privacy and device/release tests.
Exit gate: no provider integration is labelled active until configured, licensed, tested and monitored; no synthetic content masquerades as real.

### Phase 10 — Release and continuous improvement
Deliverables:
- Final route/feature acceptance matrix and known-limitations page.
- Exact commit CI evidence, staging smoke test, accessibility/performance review and security review.
- Production configuration checklist, backup/rollback readiness, monitoring, incident contacts and owner sign-off.
- Post-release review and a prioritized backlog based on observed real usage rather than invented metrics.
Exit gate: owner explicitly authorizes production release; no P0 blocker remains.

## 6. Route parity register — required format

Maintain one row for every source-defined production route and endpoint:
| Field | Required content |
|---|---|
| Production source route | Exact path/file and dynamic parameters |
| Private route | Target path or “none” |
| Decision | Preserve / rebuild / merge / defer / retire-redirect |
| Phase | Planned delivery phase |
| Access class | Public / authenticated owner / reviewer / admin / server-only |
| Data source | Table/view/API/provider and provenance |
| SEO | Canonical, index/noindex, sitemap inclusion |
| Dependencies | Auth, provider, schema, content, legal review |
| Acceptance tests | Direct load, states, access, error, mobile as relevant |
| Owner/status | Decision owner, status, evidence link |

Route parity is not complete until all routes, API endpoints, static files, redirects and mobile/deep links are inventoried and dispositions approved.

## 7. Cross-cutting acceptance and release gates

- Correct route, title, canonical and indexability.
- Responsive layout and keyboard/screen-reader basics.
- Data provenance, status, freshness and expiry rules.
- No unsupported claims, placeholder records or silent fallback to fake content.
- Anonymous/owner/cross-user authorization tests for protected data.
- Validated inputs, safe errors, rate limiting and no client-authoritative privileges.
- Unit, integration and end-to-end tests as applicable.
- Node/npm and lockfile reproducibility; CI checks pass on exact commit.
- Provider rights, cost, consent and privacy reviewed before activation.
- Monitoring, backup/restore, rollback and support ownership for production.
- Explicit owner approval for high-risk scope decisions, migrations, credentials and releases.

## 8. Data lifecycle and editorial operating procedure

1. Discover a source and record publisher, URL and reuse/attribution basis.
2. Capture only relevant facts and record checked time and evidence reference.
3. Validate dates, eligibility, location, fee, contact and event status; unknown stays unknown.
4. Reviewer approves publication; ingestion alone does not imply verification.
5. Set a recheck/expiry schedule and archive when expired, cancelled or unconfirmed.
6. Provide correction/report path and preserve change history.
7. Use the same authoritative data source for UI, API, sitemap and structured metadata.
8. Never generate real-world scores, prices, venue details or trial facts from an LLM.

## 9. Performance, accessibility and SEO plan

- Set measurable performance budgets after measuring a baseline on representative pages/devices.
- Use semantic headings, labels, focus states, contrast, keyboard access, descriptive links and accessible status announcements.
- Avoid layout shifts from ads/images; lazy-load noncritical media with dimensions and rights checks.
- Keep canonical host, redirects, robots, sitemap, ads.txt and llms.txt aligned with real capabilities.
- Do not index private profiles, application data, share tokens or query-string payloads.
- Remove unsupported claims such as guaranteed verification, real-time scores or city coverage unless proven.
- Validate structured data against visible, truthful page content.

## 10. Cost and free-tier guardrails

- Inventory every external request, scheduled job, storage use and database query.
- Confirm Supabase Free Plan limits and backup/restore capabilities before committing to operational assumptions.
- Use bounded retries, cache only where freshness permits, and apply provider rate limits.
- No paid provider, subscription, hosting upgrade or paid migration without explicit owner approval.
- Define budget alerts and kill-switches before activating billable providers.
- Do not promise background processing or delivery guarantees that the chosen free-tier stack cannot support.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Rebuild silently omits production routes | Complete route registry and owner dispositions before parity claim |
| Unverified/expired listings harm trust | Provenance, review, expiry, correction and archive workflow |
| Cross-user access or permissive legacy policies | Effective-policy inspection plus JWT tests and explicit public projections |
| CV privacy leak | Private default, local/server scope decision, field allowlist and revocable opaque links |
| Duplicate/overlapping bookings | Defer booking until atomic DB invariants and concurrency tests pass |
| Unlicensed scores/media/ads | Provider licensing register and explicit activation gate |
| CI appears green without evidence | Exact SHA, workflow link and recorded results |
| Backup exists but cannot restore | Isolated restore drill and recovery objectives |
| Free-tier limits break features | Validate quotas and design bounded usage before launch |
| Marketing/SEO overstates capability | Claim inventory tied to implemented/tested behaviour |

## 12. Product-owner decisions required to finalize scope

Record answer, owner and date for each:
1. Approve the balanced public MVP defined in section 3, or specify scope changes.
2. Sports CV: local-only PDF/export for first release, or authenticated server persistence? Recommendation: local-first/private export for initial MVP; no public sharing.
3. Opportunities: manual editorial review first, or automated ingestion? Recommendation: manual review first; automation only after evidence and source-rights controls.
4. Venues: directory-only first, or venue-owner submissions? Recommendation: directory-only until moderation/ownership controls are ready.
5. Accounts, applications and notifications: defer until after public MVP? Recommendation: yes.
6. Booking and payments: defer until after directory, owner verification and atomic DB safeguards? Recommendation: yes.
7. Live sports provider: keep disabled until coverage and redistribution rights/cost are approved? Recommendation: yes.
8. Advertising/analytics: keep disabled until consent, publisher and policy checks are evidenced? Recommendation: yes.
9. Mobile: responsive web/PWA validation before native app? Recommendation: yes.
10. Define target launch geography, initial supported sports, editorial owner and operational contact.
11. Confirm production release approval process and who can authorize migrations/provider credentials.

## 13. Plan completion checklist

- [ ] Owner approved MVP scope and non-goals.
- [ ] All production routes/endpoints inventoried and dispositioned.
- [ ] First-release data sources and reuse rights recorded.
- [ ] CV storage/privacy decision recorded.
- [ ] Venue directory and booking boundary recorded.
- [ ] Security and authorization matrix mapped to actual tables/APIs.
- [ ] Test gates mapped to actual scripts/workflows.
- [ ] Provider, monetization and mobile decisions recorded as approved/deferred.
- [ ] Operations owner, backup/restore, rollback and incident response accepted.
- [ ] Phases have owners, dependencies and measurable acceptance evidence.
- [ ] No production change authorized implicitly by plan completion.

## 14. Related documentation
- [MVP Decision Record and Route Registry](MVP_DECISION_RECORD_AND_ROUTE_REGISTRY.md)
- [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md)
- [Requirements and Acceptance Criteria](REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md)
- [Security and Authorization Matrix](SECURITY_AND_AUTHORIZATION_MATRIX.md)
- [Testing and Release Gates](TESTING_AND_RELEASE_GATES.md)
- [External Provider and Licensing Register](EXTERNAL_PROVIDER_AND_LICENSING_REGISTER.md)
- [Incident Response and Disaster Recovery](INCIDENT_RESPONSE_AND_DISASTER_RECOVERY.md)


## 15. Product-owner-approved baseline decisions (2026-10-25)

The owner confirmed the following proposed defaults. Treat these as approved planning scope for the private rebuild; this is not authorization to deploy or alter production.

| Decision | Approved baseline | Consequence |
|---|---|---|
| Product launch | Public-first website | Prioritize public discovery pages, accessible browsing and truthful SEO before account-dependent journeys. |
| Opportunities | Manually reviewed listings | No automatic publication from scraping/AI ingestion. Every active public listing requires source evidence and editorial review. |
| Venues | Directory only; no booking | Do not accept bookings, holds, payments or represent slot availability. Venue data is informational and published only after review. |
| Sports CV | Private creation, preview and export first | No account requirement, server sync, public profile or public sharing in the first release. Choose a local/private storage design and clearly disclose it before implementation. |

### Scope boundary resulting from approval
**In the initial public-first release:** responsive public site, sports discovery, manually reviewed opportunities/trials, informational venue directory, private Sports CV create/preview/export, help/correction intake, legal/trust pages, SEO/accessibility, and quality/operations gates.

**Explicitly out of initial release:** authentication/accounts, server-side CV persistence or sync, public athlete profiles/share links, trial applications, push notifications, venue booking/availability/holds/payments, live scores/commentary, monetization and tracking integrations, native app, and AI/MCP features that ingest or expose user/private data. These may be planned as later phases but require separate scope and safety reviews.

### Acceptance criteria for the approved defaults
- Public routes remain usable without login; private CV data is not sent to the backend unless a later approved design explicitly requires it.
- Opportunity records are manually reviewed before publication; source URL, evidence/check time, event date/status and archive rule are recorded. Unknown fees/eligibility remain unknown rather than inferred.
- Venue pages describe only sourced, reviewed information; booking CTA, fake availability, prices without evidence and payment paths are absent.
- CV creation, editing, preview and export work without account creation. The storage choice and limitations are disclosed; no public share URL or “verified athlete” claim is generated by default.
- Deferred features are not presented as available in UI, metadata, structured data, API responses, advertising or marketing copy.
- Required tests and CI evidence are recorded against the exact commit before any release decision.

### Remaining product decisions
The baseline is now defined. The owner can defer the following decisions until the relevant phase rather than block initial planning:
- Initial launch sports and geographic coverage.
- Approved source list and named editorial reviewer.
- CV fields, export format and exact local-storage/retention behaviour.
- Whether/how to accept correction requests and support contact.
- Performance budgets after baseline measurements.
- Any later provider, advertising, account or booking scope and its budget.


## 16. Owner decisions: sports scale, editorial policy and complete Sports CV

Confirmed by the owner on 2026-10-25. These decisions update the first-release planning baseline; they do not authorize a production deployment.

### 16.1 Sports coverage: 100+ sports, designed to scale
- Product requirement: the sports directory must support at least 100 sports at launch, with architecture that can grow beyond that without hard-coded per-sport pages or schema rewrites.
- Initial geography: India-wide discovery is the planning default, consistent with KhelGrid's India focus. City/state filters must show only supported, evidenced data; do not imply every sport is available in every city.
- Sports catalogue fields: stable sport ID; canonical name; aliases/search terms; category; description; supported disciplines/variants; image/icon rights and attribution; active/retired status; sort order; SEO title/description/slug; localization-ready display labels; source/review metadata where claims need evidence.
- Data-driven design: sports are catalogue records, and sport detail pages use a reusable template. Filters and navigation derive from the catalogue; do not duplicate hard-coded sport lists across the UI.
- Scalability acceptance: 100+ records render and search correctly; aliases resolve to canonical records; duplicate names/slugs are handled; keyboard/mobile use works; adding a sport is a data/content operation rather than a custom code path.
- Quality rule: a sport may exist in the catalogue without current trials, venues or events. Show a genuine empty state rather than generating listings to fill the page.
- Launch coverage is not a claim that each sport has a verified opportunity, venue or live data feed.

### 16.2 Editorial ownership and verified/unverified listing policy
- Editorial owner: **KhelGrid editorial/review team** is the accountable reviewer, using a documented standard template. Individual staff assignments and backup reviewer remain an operations detail to record before launch.
- Listings may be ingested/drafted directly into the catalogue for editorial workflow, but publication status must remain explicit. Unreviewed records must not appear in public active listings by default.
- Publicly listing an item marked “unverified” is allowed only as a deliberate, clearly labelled editorial state after basic source/safety checks. It must not be presented as verified, endorsed, officially partnered or confirmed by KhelGrid.
- If a record is merely discovered and has not passed basic authenticity, relevance, safety and source checks, keep it internal as a draft/rejected item; do not publish it just because it is labelled unverified.
- Public labels must distinguish at least: **Verified by KhelGrid** (criteria met and evidence retained), **Source listed — not independently verified** (source is traceable, but key claims have not been independently confirmed), **Under review** (not public active by default), **Expired/closed**, **Cancelled**, and **Rejected/removed** (not public active).
- “Verified by KhelGrid” means KhelGrid performed the documented checks; it does not imply government endorsement, organizer partnership, guaranteed selection, or a guarantee against later changes.
- A listing must never be described as “official” unless its issuing organization and official source are evidenced. Preserve source wording and avoid implying endorsement.
- Each public record must carry a stable ID, original publisher/source URL, source organization, evidence snapshot/reference, date checked, reviewer or reviewer ID, review date, event dates, location, sport/category, eligibility, fee (amount or “not stated”), contact (or “not published”), status, confidence/verification level, expiry/recheck date, correction history and attribution/reuse basis.
- The common editorial template must require:
  1. Identity and source provenance.
  2. Event title, sport/disciplines and organizer.
  3. Event date/deadline and last checked timestamp.
  4. Venue/city/state and eligibility/age/gender/category only when stated by source.
  5. Fees, documents, equipment, contact and registration instructions only when evidenced; otherwise mark “not stated”.
  6. Source reliability, corroboration and any conflicts.
  7. Verification state, reviewer decision, rationale and next recheck/expiry.
  8. Copyright/quotation/attribution and correction/withdrawal procedure.
- Review outcomes: publish verified; publish with “not independently verified” label; request clarification; hold for review; reject; expire/archive; withdraw/correct. Record reviewer, timestamp and reason for each decision.
- Review checks: source identity and legitimacy; date/currentness; source-to-listing consistency; eligibility and fee accuracy; location/contact plausibility; duplicate detection; misleading claims; minors/safeguarding or sensitive personal information; reuse/licensing; and fraud/scam indicators.
- Conflicting or missing facts remain explicitly unknown. Never infer fees, eligibility, dates, contacts, event status or official affiliation. Never create an active listing from AI-generated details alone.
- Recheck schedule: set a record-specific next-check date based on event timing and source reliability. Recheck before event/deadline; archive after deadline or cancellation unless a source explicitly confirms extension. Provide a correction report route and retain an audit trail.
- Editorial service levels and staff names should be finalized before launch; do not promise review times until the team can meet them.

### 16.3 Sports CV: comprehensive field catalogue, optional sections
Requirement: include a comprehensive field set so athletes can create a full CV. “All fields included” means the builder supports the relevant fields and optional sections, not that every field is mandatory or shown in every export.

#### Identity and contact
- Full name; preferred/display name; profile photo (optional, user-supplied); date of birth or age (optional; minimize where possible); gender (optional); nationality; state/city; phone; email; preferred contact method; address (optional and excluded from public/export presets unless user selects it); emergency contact (optional, private and excluded from default CV export).
- Guardian/parent contact only when appropriate for a minor and with privacy/safeguarding controls.

#### Athletic profile
- Primary sport; secondary sports; discipline/event; playing position/role; dominant hand/foot where relevant; competition category; weight/height only where relevant and user supplied; playing style; athlete summary/objective; preferred playing level; current club/team/academy; coach; training base; years active; availability and preferred locations (optional).

#### Performance and measurements
- Sport-specific personal bests, official results, rankings/rating with issuing body and date; event/competition name, date, venue and result; statistics with units, season/context and source; fitness tests and measurements only when relevant, voluntary and dated.
- Do not invent scores, statistics, rankings or personal bests. Distinguish self-reported from source-verified results and record evidence/source if provided.

#### Career and participation history
- Clubs, teams, academies, schools/colleges and training centres; role/position; level/division; start/end dates; participation history; representative selection; camp/academy history; captaincy and leadership; coaching/training experience if relevant.

#### Achievements and competition record
- Medals, awards, titles, records, selections, squads, tournaments, league/season results, placements and milestones; date, organizer/issuing body, category, result and evidence/source for each item.
- Label self-reported achievements distinctly from reviewed/verified evidence; do not use a generic “verified athlete” badge.

#### Education and eligibility
- Education institution, qualification, course/grade where relevant, graduation year; academic eligibility and exam details only where relevant; certificates and licenses; eligibility documentation checklist/status without collecting unnecessary document images.
- Sensitive identifiers, government ID numbers, full certificates and medical records are excluded from the default CV and should not be requested unless a separately approved necessity and secure handling process exists.

#### Coaching, skills and support
- Technical/tactical skills; fitness/strength/endurance/flexibility skills; certifications; coaching/refereeing/official qualifications; languages; leadership/teamwork; accessibility/accommodation request only if the athlete voluntarily chooses to include it and understands the privacy implications.
- References/recommendations are optional, consent-based and not included by default without permission.

#### Media, documents and links
- Portfolio/video highlights, approved public links, image/media captions and rights/consent confirmation; certificate/award attachment references only if a later secure storage scope is approved.
- No arbitrary public links or uploads should be treated as verified evidence automatically.

#### Goals and availability
- Short/long-term goals; target trials/competitions; preferred teams/academies; training schedule/availability; relocation/travel preference; scholarship/sponsorship interest; role sought; personal statement.
- Sensitive financial, health or family information is not part of the default CV.

#### CV management and export
- CV title/version; created/updated date; selected sections; preferred template; language; privacy/export options; athlete consent confirmation where relevant.
- Export formats: **PDF is the required first-release format**. Structure the model so DOCX or other formats can be added later, but do not delay the MVP for them.
- Export presets: concise one-page profile and full detailed CV; user can choose sections and reorder optional sections.
- Accessibility: logical heading order, readable typography, sufficient contrast, selectable text, correct Unicode/font embedding where supported, and sensible page breaks.
- Allow save/edit within the chosen local-first design, preview before export, delete/reset data and download a copy. Explain that browser storage can be lost when browser data is cleared or the device is changed.
- No login, backend sync, public profile, share link or remote analytics of CV contents in the initial release.
- Never include private address, emergency/guardian contact or other sensitive fields in the default export. Provide explicit inclusion controls for optional personal contact fields.
- CV acceptance tests cover sport-specific optional fields, validation, long text, Unicode names, empty sections, multiple pages, preview/PDF consistency, local persistence behaviour, delete/reset, private-by-default data flow and no accidental network transmission of CV contents.

### 16.4 Decisions still open but not blocking the plan
- Named primary and backup editorial reviewers and review service levels.
- Exact launch sport catalogue and content-entry method for the initial 100+ records; ensure no unsupported sport-specific claims.
- CV field-level mandatory/optional rules by sport and country; default should be minimum necessary with optional relevant sections.
- PDF design variants, translation schedule and whether any later server-side document storage is justified.


## 17. Automatic expiry, archive lifecycle and public archive (owner requirement, 2026-10-25)

### Required behaviour
- Trials and opportunities that have passed their relevant deadline/event end date must automatically stop appearing in active listings and move to the website's public archive.
- Archived listings remain accessible from a clearly labelled **Archive** area on the website, with search/filter/detail pages where the retained source data supports them.
- Archive movement must be a lifecycle/status change on the authoritative record, not a destructive delete or a one-time manual UI filter.
- The active website, public API, search results, homepage cards, category/city pages, sitemap and structured data must all use the same lifecycle rules. An expired item must not leak back into active results through a fallback/static list or stale cache.
- Archive pages must clearly show “Expired”, “Closed”, “Cancelled” or the actual known state and the relevant date. Never describe archived listings as open or currently available.
- Preserve source provenance, review status, original dates, last-checked time and correction history for editorial/audit purposes. Do not silently rewrite an expired record's history.

### Date and status rules
- Each listing type must define the authoritative lifecycle date: application/registration deadline when present; otherwise the event end date or a documented event-specific rule. Do not expire a multi-day event on its start date if the source provides a later end date.
- Use the source's stated timezone where available; otherwise use one documented application timezone consistently and store timestamps with timezone semantics. Define how date-only deadlines are interpreted.
- A listing marked cancelled or withdrawn should leave active listings immediately and appear in the archive with the cancellation/withdrawal status when public disclosure is appropriate.
- If the source announces an extension, only update the deadline after editorial review and recording the evidence. Do not automatically extend because a page is unreachable.
- If dates are missing or conflicting, route the record to editorial review; do not invent an expiry date or keep it indefinitely labelled active without recheck.
- “Verified by KhelGrid” and “source listed — not independently verified” remain distinct review states from lifecycle status. Verification does not override expiry.

### Automation and resilience
- Implement an idempotent lifecycle job or database-enforced query/status process that regularly detects due records, updates their status to archived/expired and records the reason/time. The exact scheduler must fit the approved hosting/free-tier limits.
- If scheduled jobs are unavailable or fail, active-list queries must still exclude records whose authoritative deadline has passed; the job should reconcile the stored lifecycle status later. This prevents a missed scheduler run from showing stale items as active.
- The job must be safe to retry, avoid duplicate archive records, handle timezone/date boundaries, log counts and failures without exposing secrets, and alert/flag repeated failures.
- No expensive paid scheduler or provider should be introduced without owner approval. A bounded scheduled workflow, supported database scheduler or request-time reconciliation may be evaluated for the actual stack.

### Public archive UX and SEO
- Provide an Archive entry point and archive filters by sport, city/state when supported, year/date range, event type and lifecycle status.
- Archived detail pages should retain canonical URLs where appropriate, show source and expiry/cancellation context, and link to related current opportunities only when those are genuine records.
- Keep active and archive query/API contracts separate or explicitly filtered. Use stable IDs and preserve historical details needed to understand the original listing.
- Sitemap policy must be deliberate: include archive pages only when useful, public, canonical and allowed by indexing policy; exclude private/rejected records and internal review metadata. Do not generate fake or stale last-modified dates.
- Expired listings must not be marked as current event offers in structured data or snippets. Validate structured data against the visible archived status.
- Archive records must remain reachable from the website archive navigation even if they are no longer present in active listings.

### Acceptance tests
1. A listing with a passed registration deadline disappears from all active pages/API/search and appears in Archive with an accurate status/date.
2. A multi-day event remains active through its source-defined end/deadline, then archives according to its documented rule.
3. Cancellation/withdrawal immediately removes the listing from active surfaces and preserves the appropriate archive state.
4. A source-confirmed deadline extension updates lifecycle only after reviewer approval and evidence recording.
5. Missing/conflicting dates are flagged for editorial review rather than guessed.
6. Running the archive job repeatedly is idempotent; retries do not duplicate records or notifications.
7. A scheduler outage does not allow overdue listings into active queries; reconciliation restores stored status when service returns.
8. Homepage, category/city pages, APIs, sitemap, structured data and caches agree on active/archive status.
9. Archive pages show historical status and do not claim availability; rejected/private records never appear publicly.
10. Date/timezone boundaries are tested, including date-only deadlines and India Standard Time handling where relevant.


## 18. Site-wide content quality and AdSense thin-content remediation (owner requirement, 2026-10-25)

### Objective
Every public, indexable part of KhelGrid must provide substantial, useful, original and accurate value to its intended audience. The platform must not rely on empty category templates, near-duplicate location pages, thin listings, automatically generated text, placeholder/demo content or unsupported claims to create apparent scale. This is a content-quality programme, not a guarantee of Google AdSense approval; the publisher must review current Google policies and the actual site before reapplying.

### Content standards by page type
- **Homepage:** clearly explain KhelGrid's purpose and supported capabilities, show real and current content, explain editorial/verification labels and how users can report corrections. Do not use unsupported user counts, verification guarantees or coverage claims.
- **Sports index and 100+ sport detail pages:** every sport page needs sport-specific information and practical usefulness—not just a name, generic paragraph and empty cards. Include a clear sport overview, disciplines/variants where supported, rules/format or getting-started guidance from reputable sources, participation/eligibility considerations when relevant, training/safety guidance where responsibly sourced, Indian governing/official bodies when verified, and genuinely available KhelGrid opportunities/venues with status and source. Cite/link sources and distinguish general editorial guidance from official rules. If a page cannot meet the minimum quality threshold, keep it noindex or do not publish it yet; do not pad it with repetitive copy.
- **Opportunity/trial details:** provide the actual source-backed facts, dates/deadlines, eligibility as stated, fees or “not stated”, location, organizer/source, how to verify/apply at the source, last checked time, status, correction/report path and editorial context. Summarize rather than copy publisher articles; link to the original. Thin or incomplete records must be held, excluded from indexation, or published only if they still meet the minimum usefulness and safety bar.
- **Archive pages:** retain useful historical facts, original source, event date and clear expired/closed/cancelled status. Archive listings must not masquerade as current offers. Use a deliberate indexing strategy; thin archive/filter combinations may be noindex or excluded from sitemap.
- **Venue pages:** publish only reviewed facts such as location, supported sports, facilities, access/contact, operator source and verified price/hours where known. Clearly mark missing information. No fabricated photos, amenities, reviews, prices or availability. A page with insufficient unique verified information should remain unpublished/noindex until improved.
- **Search, filters and empty states:** explain the filters and what the user can do next. Avoid indexable, near-identical parameter URLs and empty city/sport combinations. No-result pages should be useful to users but normally not indexed as standalone SEO landing pages.
- **Sports CV/tool pages:** explain purpose, steps, field choices, privacy/storage limitations, how PDF export works, and include useful examples/templates without publishing user data. Do not make unsupported promises about athlete selection or verification.
- **Policy/help/about pages:** provide specific, accurate information about editorial standards, verification definitions, correction/complaint handling, source attribution, privacy, contact, advertising and limitations. Policies must match actual implementation and ownership.

### Editorial depth and originality
- Each indexable page must answer a real user need and offer information beyond a list of links or a repeated template.
- Use page-type-specific outlines with human editorial review, meaningful headings, concrete facts, examples/checklists where helpful, and relevant primary sources.
- Avoid mass-generating 100+ interchangeable sport pages. Catalogue breadth and content depth are separate requirements; publish pages in quality-controlled batches.
- Do not copy full source articles or source images without permission. Use brief factual summaries, links, required attribution and licensed/owned media.
- Do not use AI to invent facts, fill missing data, manufacture testimonials/reviews, or imply an editor verified material that was not reviewed. AI-assisted drafts require source checks and human editorial approval.
- Keep claims, statistics, dates, rankings, governing-body references and contact information tied to evidence and checked dates.
- Use author/editor attribution where appropriate and describe editorial process honestly; do not invent expert credentials or author bios.
- Provide a visible correction/report mechanism and record significant corrections.

### Publication quality gate
Create a per-URL content inventory and quality checklist. Before a page is indexable, require:
1. A clear intended audience and user task.
2. A unique page purpose and non-duplicative useful content.
3. Evidence for factual/current claims and links to reliable sources.
4. Correct lifecycle/status and no misleading CTA.
5. Editorial review and source attribution/rights review as applicable.
6. Appropriate title, meta description, canonical and structured data matching visible content.
7. Mobile readability, accessibility and no broken/empty primary content.
8. No private, personal, rejected, stale or internal-review data leakage.
9. A decision to index, noindex, consolidate, redirect or not publish.
10. Named reviewer, review date and recheck date for time-sensitive content.

### AdSense and search-quality verification workflow
- Inventory all public URLs, templates, indexable filter pages, subdomains, technical endpoints and third-party scripts.
- Review the latest AdSense publisher policies and Google Search guidance at implementation/reapplication time; policy requirements can change.
- Audit site navigation, ownership/contact transparency, original value, content depth, duplication, broken links, ads-to-content balance, mobile experience and privacy disclosures.
- Ensure ads do not cover navigation/content or make thin pages appear content-rich. Do not add more ads to solve a thin-content rejection.
- Use Search Console indexing/coverage and manual URL inspections to find indexed thin/duplicate/empty pages; sitemap only includes canonical, useful public URLs.
- Validate ads.txt and publisher configuration separately; technical approval checks do not fix low-value content.
- Reapply only after material improvements are live and the full domain has been reviewed. Approval is Google's decision and cannot be guaranteed by this plan.

### Content measurement and release gates
Track a reviewed URL inventory with: route/template, intended query/task, original value, sources, reviewer, word/section completeness where appropriate, indexability, canonical, last checked, archive status and action.
Do not use a universal word-count target as a proxy for quality. Define page-type-specific completeness criteria and review usefulness, accuracy and originality.
Before release/reapplication, every indexable page must pass the quality gate; weak pages are improved, consolidated, noindexed or withheld. The goal is not “text on every page” but useful content across the whole indexable site.

### Acceptance tests
- Every indexable route has a recorded content review and disposition.
- No indexable page consists only of a title, generic paragraph, repeated template and empty listing cards.
- Sport pages are genuinely sport-specific and sources are visible where facts require them.
- Current and archived opportunities are accurately distinguished and source-linked.
- Venue pages contain only evidenced claims and never invent pricing, amenities, reviews or availability.
- Empty/parameterized pages are not accidentally indexable at scale.
- Technical metadata, canonical URLs, sitemap and structured data agree with visible content and lifecycle status.
- AI-generated drafts cannot bypass human review or populate unsupported facts.
- Ads and third-party scripts respect the actual consent/privacy design and do not obscure primary content.
- The content audit report records all exceptions, remediation and final re-review before AdSense reapplication.
