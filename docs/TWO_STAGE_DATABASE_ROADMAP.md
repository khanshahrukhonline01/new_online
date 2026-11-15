# KhelGrid Platform — Two-Stage Database Roadmap

**Status:** Planning baseline only; no schema or infrastructure changes are applied by this document.  
**Project boundary:** Separate `khelgrid-platform` repository and its development Supabase project only.  
**Production boundary:** Production repository, production database and production deployment remain out of scope.  
**Principle:** Build for the approved MVP on Supabase Free first, while keeping a documented, testable path to a larger/full database when actual product needs justify it.

## 1. Decision: two database stages

KhelGrid should plan for two stages:

1. **Stage A — Free-plan MVP database:** smallest secure and recoverable database that supports sports discovery, sourced opportunities, reviewed venue/court directories, and private-by-default Sports CV. Prefer local CV generation if it meets requirements. No booking, payments, or live-data ingestion unless separately approved.
2. **Stage B — Expanded/full database:** a planned evolution when measured product requirements, data volume, availability, compliance, team operations or approved features exceed Stage A's safe limits. This does not automatically mean a particular paid plan or provider; reassess options and cost before approval.

“Full database” means an expanded production-grade data architecture and operating model, not simply adding every possible table now. Stage A and Stage B should share stable domain concepts and migration discipline, but Stage B must not be provisioned or paid for in advance without explicit approval.

## 2. Stage A — Free-plan MVP scope

### Intended capabilities
- Public read access to published sports catalogue, opportunities, venues and public court details.
- Controlled and reviewed content publication through a trusted, restricted workflow.
- Source provenance/permission records sufficient for the selected source strategy.
- Content correction/report intake if the product owner approves the storage and moderation model.
- Basic operations and recovery procedures appropriate to the approved free-tier limits.
- Sports CV preview/export without backend persistence if technically acceptable.
- Future web/mobile compatibility through stable IDs and typed API/domain contracts.

### Candidate schema scope
Keep the five existing tables where appropriate:
- `sports`
- `opportunities`
- `venues`
- `venue_courts`
- `profiles` (remain unused by public MVP unless authentication is explicitly enabled)

Potential additions only after decisions:
- Source/provenance records and referentially safe source links.
- Audit history for consequential publication/moderation actions.
- `venue_sports` if venue-level multi-sport queries require it.
- `content_reports` if reports are persisted in the database rather than handled through another approved workflow.

Do not create tables yet for accounts/workspaces, saved items, applications, notifications, athlete public profiles, booking inventory, bookings, payment transactions, refunds, reviews, messaging, or analytics warehouses. Those belong to later scope gates.

### Stage A non-functional boundaries
- Monitor database size, API request volume, bandwidth, backup size, scheduled-task limits and provider quotas against current Supabase Free terms.
- Do not hard-code assumptions about plan quotas in application logic; record current limits in an operational runbook and review them periodically.
- Provide pagination and bounded filters; avoid unbounded public reads and N+1 request patterns.
- Add only indexes supported by measured or anticipated MVP query patterns.
- Keep source refresh and ingestion jobs modest, rate-limited and compliant with source terms.
- Keep privileged keys server-side and use RLS/grants for browser-accessible data.
- Backups must be encrypted and access-restricted. Explicitly state which Supabase resources they do and do not cover.
- The free tier is not a substitute for availability guarantees or a tested recovery plan.

### Stage A acceptance gate
Stage A is ready only when:
- [ ] Actual development project identity and applied migration history are verified.
- [ ] Public reads show only intended published fields/records.
- [ ] Anonymous users cannot mutate catalogue data.
- [ ] Private records and moderation notes are inaccessible to unrelated users.
- [ ] Publication requires the approved source and completeness rules.
- [ ] Opportunity expiry, unknown fees and stale records behave truthfully.
- [ ] Court visibility respects parent venue visibility; no booking availability is implied.
- [ ] CV data is not persisted or exposed unless the approved privacy model supports it.
- [ ] Migration, RLS, constraint and denied-access tests pass in an isolated environment.
- [ ] Backup scope, restore drill, incident owner and operational limitations are documented.
- [ ] Performance, accessibility and failure states are tested on representative MVP journeys.
- [ ] No feature is presented as available unless its acceptance evidence exists.

## 3. Stage B — Expanded/full database scope

Stage B is a future design target, not authorization to create these tables now.

### Potential domains to add when approved
- **Accounts and identity:** account lifecycle, profile privacy, saved items, preferences, consent and deletion.
- **Athlete profiles:** explicit visibility controls, data ownership, safeguarding and moderation.
- **Applications and opportunities workflow:** application records, eligibility state, communication and organizer access.
- **Venue booking:** inventory, operating hours, pricing, temporary holds, overlap protection, idempotency, cancellation and audit events.
- **Payments:** provider references, payment state, refunds, disputes, reconciliation and webhook idempotency; never store card secrets.
- **Notifications:** preferences, delivery attempts, opt-out, retry and deduplication.
- **Community/reviews/messaging:** abuse controls, reporting, moderation, retention and safety model.
- **Live sports:** provider configuration, entitlement/rights, source timestamps, caching, stale-state behavior, quotas and usage-cost monitoring.
- **Analytics/reporting:** aggregate metrics with privacy minimization; avoid CV and sensitive personal fields.
- **Media/documents:** controlled object storage, file validation, malware scanning where appropriate, access rules and deletion lifecycle.
- **Operational/audit:** privileged-action audit, incident references, data-quality checks and migration/recovery evidence.

These are separate domain designs. Add a domain only when a product decision, owner, data lifecycle, access matrix, tests and operating cost are defined.

### Expanded architecture options to evaluate
- Larger managed PostgreSQL capacity or another approved provider if the measured workload requires it.
- Dedicated backend/API for privileged workflows and rate-limited ingestion.
- Background jobs/queues for retries and long-running work.
- Read replicas, caching, search or geospatial extensions only when measurements justify them and provider support/cost is confirmed.
- Object storage for files with separate access/retention controls.
- Separate staging/production environments and controlled release promotion.
- Monitoring, alerting, provider SLAs and formal incident/recovery objectives appropriate to business needs.

Do not assume every option is necessary or available on a specific plan. Re-check current product capabilities, quotas, prices, regional support and migration costs at the time of decision.

## 4. Stage A to Stage B migration strategy

- Keep domain types and business rules provider-neutral where reasonable, but do not abstract every query prematurely.
- Use stable primary keys, explicit foreign keys and reviewed enum/state transitions.
- Maintain ordered SQL migrations in Git; never treat a dashboard-only change as the source of truth.
- Test schema changes against a disposable copy and representative data.
- Before scaling, record table sizes, query latency, API usage, egress, scheduled-job load, error rates and restore time.
- Define data export, compatibility, downtime window, cutover, validation, rollback/forward-fix and ownership before migration.
- Preserve source provenance and audit history where legally/operationally appropriate; remove data that should not be migrated.
- Keep secrets out of Git and client bundles; rotate credentials when an incident or migration requires it.
- Run both old and new data-access paths only when consistency semantics are explicitly designed; avoid unsynchronized dual writes.
- Stage B activation requires explicit approval of the provider, plan, budget, data handling, migration test and recovery plan.

## 5. Objective triggers to consider expansion

Review Stage B when one or more of the following occurs:
- Current free-tier quota or operational limit is consistently approached, with a defined safety margin.
- Real user demand causes sustained latency, errors or failed requests that cannot be safely resolved by query/index improvements.
- A required feature needs transactions, storage, job processing, security controls or availability that Stage A cannot safely provide.
- Backup size or recovery time exceeds the agreed operational target.
- Legal, privacy, retention, audit or contractual obligations require stronger controls.
- Moderation, ingestion or support volume exceeds safe manual capacity.
- Provider terms or pricing change in a way that makes the current architecture unsuitable.

Expansion is not triggered by arbitrary user counts or guessed traffic estimates. Measure first, compare alternatives and document cost/benefit.

## 6. Cost and governance gate

Before Stage B is approved, document:
- Current usage and limit evidence.
- Feature or reliability requirement that cannot be met by Stage A.
- At least one lower-cost mitigation considered.
- Provider/plan comparison using current pricing and terms.
- Migration effort, downtime, data-export/retention implications and ongoing owner.
- Security, privacy, backup and recovery changes.
- Budget ceiling and explicit approval.

No automatic paid-plan upgrades, provider migrations or infrastructure purchases are authorized by this roadmap.

## 7. Ownership and planning checklist

- [ ] Confirm Stage A source providers and permitted-use requirements.
- [ ] Decide local-only versus persisted Sports CV.
- [ ] Decide whether reports are stored in Supabase and who moderates them.
- [ ] Define Stage A publication transitions, audit requirements and trusted publishing path.
- [ ] Verify the live development schema read-only against committed migrations.
- [ ] Label every proposed schema change: required for Stage A, optional for Stage A, or Stage B.
- [ ] Write migration and security-test specifications; do not apply them during planning.
- [ ] Document current free-tier limits from authoritative provider documentation at implementation time.
- [ ] Set measurable operational thresholds based on actual usage and recovery needs.
- [ ] Revisit Stage B only when evidence shows it is needed.

**Final rule:** Stage A is a deliberate small database, not a throwaway prototype. Stage B is a controlled evolution, not a reason to overbuild now. Keep production untouched and require a separate explicit approval before any real schema change, paid plan, or provider migration.
