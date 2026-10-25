# KhelGrid Requirements and Acceptance Criteria

Status: Draft baseline for the private rebuild. Last reviewed: 2026-10-25.
Scope: private khelgrid-platform rebuild. Production stays read-only until explicit approval.

## Non-negotiable rules
1. Never present sample, static fixture, generated or inferred data as current, live or verified.
2. Public listings must include provenance and lifecycle rules; show loading, empty, unconfigured, unavailable, stale and error states distinctly.
3. Do not claim login, booking, payments, notifications, CV sharing, live scores or provider integration works until tested end-to-end.
4. Secrets stay server-side. Authorization must be enforced by database/server, not only UI guards.
5. Do not change production data, settings, migrations or deployments without explicit owner approval.
6. Do not merge a PR until required checks pass and the owner approves.
7. Preserve approved KhelGrid visual identity and working behaviour unless a reviewed change says otherwise.

## Global definition of done
- [ ] Scope, non-goals, data source and failure states documented.
- [ ] Privacy, authorization and schema/API contract reviewed.
- [ ] Migration and rollback strategy reviewed when applicable.
- [ ] Unit/integration tests cover success, failure and authorization paths.
- [ ] Responsive and accessibility checks completed.
- [ ] Build, lint, typecheck and required CI pass on the exact commit.
- [ ] External provider terms, coverage, attribution, freshness and commercial rights reviewed.
- [ ] Monitoring, rollback and support ownership defined for production.
- [ ] Product owner accepts evidence and approves release.

## Feature acceptance criteria
### P0 Route parity
Every production route, alias, redirect, dynamic route, API/text endpoint and legal route is mapped. Each gets an approved preserve/rebuild/merge/defer/retire decision. Test navigation, 404s, redirects, canonical URLs, metadata and authorization.

### P0 Athlete profiles and Sports CV
Private by default unless user chooses otherwise. Two-user tests prove owner isolation. CV source of truth is explicit; local-only data is not described as synced. Share links use opaque, revocable, scoped tokens and allowlisted fields. Unknown IDs return not-found; no sample athlete fallback. “Verified” requires an auditable verification record. Test export and revocation.

### P0 Venue operations
Owner submissions remain unpublished until authorized review. Public venues are real and evidenced. Price is server/database-authoritative. Court hours, closures, holds, expiry, overlap and concurrency are enforced. Booking is atomic; cancellation transitions and ownership are tested. No client-supplied price can override published price.

### P1 Trials and applications
Every listing has source, last-checked time, event dates, eligibility, fee or explicitly unknown, location/contact, verification level and expiry/archive rule. Expired listings are not open. Applications are applicant-owned and state transitions are validated server-side.

### P1 Live sports
Use an authorized structured provider with documented coverage, terms, attribution and redistribution rights. Do not infer scores from news or model output. Show freshness; stale/outage states cannot look live. Audio is user-controlled.

### P1 Monetization and consent
Inventory every ad/analytics tag. Test unknown, grant, denial, withdrawal and reset in supported regions using real network observations. Verify publisher approval and ads.txt before readiness claims.

### P1 Mobile/PWA
Document install, service-worker lifecycle, offline/update, deep links, permissions and web/mobile differences. Test supported browsers/devices and release builds.

### P1 AI/LLM/MCP
Document every tool's schema, permission, data exposure and side effects. Treat external content as untrusted. Validate tool inputs/outputs; test injection, unauthorized access, rate limits and secret redaction.

### P1 Technical endpoints
Document methods, schemas, status codes, cache/CORS/auth/rate limits. Test invalid input and dependency failure. Indexing files must reflect real canonical routes and substantiated capabilities.

### P1 Operations
CI gates pass on exact commit. Secrets are least-privilege and environment-separated. Backup restore is tested in isolation. Rollback, incident response, monitoring and recovery objectives are documented.

## Open owner decisions
- Which production routes should be retired versus preserved?
- Which sports data provider and commercial redistribution rights are approved?
- Which identity provider and account lifecycle are in scope?
- Are athlete profiles private by default and what fields may be shared?
- Who approves production credentials, migrations and releases?


## Approved first-release scope (2026-10-25)

The product owner approved a public-first website, manually reviewed opportunity listings, an informational venue directory without booking, and private Sports CV creation/export before accounts or public sharing.

### In scope
- Public pages and sports discovery that work without login.
- Manually reviewed trials/opportunities with provenance and expiry/archive rules.
- Informational venue/court directory using reviewed source data only.
- Private Sports CV creation, editing, preview and export, with storage behaviour disclosed.
- Trust/legal/help and correction-intake paths, SEO/accessibility and quality gates.

### Out of scope for the first release
Accounts/authentication, server-side CV sync, public athlete profiles/sharing, trial applications, notifications, booking/availability/payments, live scores/commentary, advertising/analytics integrations, native app and AI/MCP features beyond an approved public read-only scope. These require later scope approval and their own acceptance/security gates.

### Release-specific acceptance
- No login is required for public discovery or the initial private CV workflow.
- No opportunity is published until a human reviewer approves evidence and required metadata.
- No venue page suggests that a court is bookable or currently available.
- CV data is not publicly accessible or transmitted to a backend by default; the chosen local storage/export behaviour is documented and tested.
- No deferred capability is advertised as operational.


## Approved scope extensions: 100+ sports, KhelGrid editorial review, comprehensive CV (2026-10-25)

### Sports catalogue
- Support at least 100 sports from a data-driven catalogue, scalable beyond 100 without hard-coded page implementations.
- India-wide is the planning default; city-level availability/content must be evidence-based, not implied for every sport.
- Reusable sport detail templates, canonical IDs/slugs, aliases, accessible search and genuine empty states are required.
- A sport with no verified listings may still have a directory page; do not fabricate opportunities or venues to populate it.

### Editorial workflow and public verification labels
- KhelGrid editorial/review team owns analysis, review and approval using the standard opportunity/trial template.
- Newly discovered records may enter the internal review queue directly, but must not become active public listings without the required checks.
- Public “not independently verified” listings are permitted only when the source is traceable and minimum authenticity, relevance, safety and currentness checks pass. Clearly label the status and source; do not imply endorsement.
- Records that fail minimum checks stay internal, are held or rejected; the word “unverified” is not a way to bypass review.
- Use distinct statuses: Verified by KhelGrid; Source listed — not independently verified; Under review (not public active); Expired/closed; Cancelled; Rejected/removed.
- “Verified by KhelGrid” indicates the documented review process was completed, not government endorsement or guaranteed event outcomes.
- Required metadata: source/publisher, evidence reference, checked date, reviewer, event date/deadline, sport, location, eligibility as stated, fee or “not stated”, contact or “not published”, status, review level, expiry/recheck date, attribution/reuse basis and correction history.
- Test source mismatch, missing/unknown facts, expiry, cancellation, duplicate, unsupported official claims and review-status authorization.

### Sports CV
- Support a comprehensive field catalogue with optional sections; not every field is mandatory.
- Sections include identity/contact; athletic profile; sport/discipline/position; measurements when relevant; performance/statistics and personal bests; competitions/results/rankings; teams/clubs/academies/coaches; career/participation; achievements/awards/selections; education/eligibility; skills/certifications/languages; goals/availability; optional references and media/portfolio links; CV language/template/version and export settings.
- Mark self-reported versus evidenced/reviewed results. Never fabricate statistics, rankings, achievements or verification badges.
- Sensitive data such as government IDs, medical records, emergency/guardian contacts and full home address is excluded from default export and should not be collected without a separately approved need and safe handling.
- PDF is the required first-release export format. DOCX or other formats may follow later.
- Provide concise and full CV layouts, optional section selection/reordering, preview, local-first edit/save, export and delete/reset.
- No account, server sync, public profile or sharing in the initial release. Clearly disclose local storage limitations and test that CV contents are not sent to a backend or analytics by default.


## Automatic expiry and public archive acceptance criteria (2026-10-25)

- Trial/opportunity lifecycle must be based on the source-supported registration deadline, event end date or documented listing-specific rule—not an invented date.
- When due, a listing automatically leaves all active website surfaces and becomes available from the public Archive area with an accurate expired/closed/cancelled state.
- Archive is a non-destructive lifecycle transition; preserve stable ID, source/evidence, dates, review state and correction history.
- The authoritative active query must exclude overdue records even if a scheduled reconciliation job is delayed. The scheduled job reconciles persisted status and is idempotent/retry-safe.
- Confirmed extensions require editorial review and recorded evidence. Missing/conflicting dates are flagged for review rather than guessed.
- Homepage, category/city pages, APIs, search, sitemap, structured data and caches must agree. No static fallback may reintroduce expired items into active listings.
- Archive UX supports search and appropriate filters; archived pages show the actual lifecycle status and do not imply the event is open or currently available.
- Public archive excludes rejected/private/internal review records and must respect canonical/indexing rules.

Required tests: deadline rollover, multi-day events, cancellations, approved extensions, missing dates, timezone boundaries, scheduler failure/retry, idempotency, cache/API/sitemap consistency and archive visibility.


## Site-wide content quality and AdSense remediation acceptance criteria (2026-10-25)

- Every public indexable URL must provide original, accurate, audience-useful value; text quantity alone does not count as quality.
- Maintain a URL-level inventory with intended user task, template, sources, editorial reviewer, last-checked/recheck dates, canonical/indexability decision and remediation status.
- Sport pages must be genuinely sport-specific; do not mass-publish interchangeable templates for 100+ sports. Low-quality pages stay noindex or unpublished until improved.
- Opportunity/trial pages require source-backed facts, current lifecycle state, date/eligibility/fee disclosure (including “not stated”), source attribution and correction path.
- Archive pages clearly state historical status; thin filter combinations and empty category/location pages must not be indexed at scale.
- Venue pages show only reviewed facts and do not fabricate photos, amenities, prices, reviews or availability.
- CV/tool and policy pages explain functionality, limitations, privacy/storage and actual editorial/ad practices.
- All current factual claims and statistics must be evidence-backed; AI-assisted drafts require human review. No invented credentials, testimonials, user counts or verification claims.
- Canonical, sitemap, robots/noindex and structured data must align with visible content and status.
- Review current Google AdSense publisher policies before reapplication. A technical integration or longer copy does not guarantee approval.
- Reapply only after a site-wide audit confirms material improvements are live, weak pages have been improved/consolidated/noindexed/withheld, and privacy/navigation/content quality are reviewed.

Required tests/reviews: URL inventory completeness, thin/duplicate/empty page detection, source/expiry consistency, unsupported claim review, canonical/sitemap/structured-data alignment, mobile readability, and documented human sign-off.
