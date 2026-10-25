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
