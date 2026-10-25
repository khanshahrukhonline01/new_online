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
