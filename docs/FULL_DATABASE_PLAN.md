# KhelGrid Platform — Full Database Plan

**Status:** Planning specification only — not a migration and not evidence of implementation.  
**Scope:** Separate `khelgrid-platform` development repository and development Supabase project only.  
**Production boundary:** Do not inspect, alter, migrate, or deploy to the production repository/database as part of this plan.  
**Planning baseline:** Balanced MVP — public sports discovery, sourced opportunities, reviewed venue/court directory, and private-by-default Sports CV.

## 1. Executive decision: does the schema need updating?

**Likely yes, but only after a gap review and explicit approval.** The committed schema is a useful starter and already has five core tables (`profiles`, `sports`, `opportunities`, `venues`, `venue_courts`). It does not yet represent all planned source provenance, correction/report handling, full content lifecycle, or CV persistence choices.

Do not migrate solely to make the schema match every idea in a planning document. First settle the decisions below, compare the plan with the *applied development schema*, then write a small, reviewed migration proposal. Keep the current production database completely separate.

## 2. Database design goals

- Stay within the approved Supabase Free Plan; avoid unnecessary extensions, paid add-ons, or external services.
- Make public catalogue reads efficient while denying unpublished/private data by default.
- Put critical integrity rules in PostgreSQL constraints and trusted server/database logic, not only browser validation.
- Separate content publication state from the event/operational state of the thing being described.
- Preserve source provenance, permitted-use decisions, review history, and correction/audit trail.
- Minimize personal data and avoid collecting it until there is a clear product need.
- Keep the domain model usable by web and future mobile clients through stable IDs and documented contracts.
- Use versioned SQL migrations, repeatable tests, backups, and a documented recovery procedure.
- Prefer a small normalized model over speculative tables for deferred features.

## 3. MVP data domains and proposed table plan

Names below are conceptual proposals. Existing names should be retained where they already work; the mapping must be finalized against current migrations before SQL is drafted.

| Domain | Proposed table(s) | MVP status | Purpose and key constraints |
|---|---|---|---|
| Sports catalogue | `sports` (existing) | P1 | Curated sport names/slugs; controlled publication/retirement; stable canonical route |
| Opportunities | `opportunities` (existing) | P1 | Trial/opportunity facts, dates, eligibility, fee status, application details and lifecycle |
| Venues | `venues` (existing) | P1 | Reviewed venue facts, location, public contact, operational state and publication state |
| Courts/facilities | `venue_courts` (existing) | P1 | Child facilities with parent visibility constraints; descriptive only while booking is deferred |
| Venue sports | `venue_sports` (proposed) | Decide for MVP | Normalized many-to-many venue/sport relationship where venue-level sport offering is needed |
| Sources/provenance | `content_sources` plus typed source links or separate `opportunity_sources`, `venue_sources`, `court_sources` | P1 | Canonical source, permission/attribution, retrieval/check/review timestamps, freshness and reviewer evidence |
| Moderation audit | `content_audit_events` or equivalent append-only audit mechanism | P0 before publication tools | Records actor, action, entity, transition, timestamp and minimal change context; avoid secret/personal payloads |
| Reports/corrections | `content_reports` | P1 if database-backed reports selected | Private reports, controlled reasons/status, triage owner and resolution; never public-readable |
| CV persistence | No table for local-only MVP; otherwise owner-scoped `sports_cv_drafts` | Decision required | Prefer local-only if it meets requirements; if persisted, enforce owner-only access, deletion and retention |
| Profiles | `profiles` (existing) | Deferred use | Do not build account features merely because the table exists; approve auth lifecycle/privacy model first |
| Future bookings/payments | Separate future domain tables | Deferred | Do not create prematurely; requires concurrency, pricing, payment, refund and support design |

### Source relationship design decision

Avoid a generic `entity_type + entity_id` source link if it cannot enforce referential integrity. Prefer one of:
1. A common `content_sources` record with explicit typed join tables for each sourceable entity; or
2. Separate source-link tables per domain.

Choose the smallest design that supports actual query and review workflows. Do not use unconstrained polymorphic references as a shortcut.

## 4. Field and validation plan

### Sports
- Stable primary ID, unique slug, curated name, optional reviewed summary, publication/retirement state, created/updated timestamps.
- Retired sports should not produce misleading active directory pages.
- Index only useful supported sport pages.

### Opportunities and trials
- Stable ID; optional sport foreign key; title/slug; organizer; event start/end; application deadline; city/region/country/location precision as needed; eligibility; fee status/amount/currency; application method/contact when available; publication status; event lifecycle; source links; reviewed/checked timestamps.
- Distinguish `unknown`, `explicitly_free`, and `known_fee`; never infer free from missing amount.
- Validate date ordering, amount/currency consistency, allowed URL schemes, text lengths, foreign keys and unique canonical slugs.
- Do not call an event open unless evidence and documented deadline semantics support that status.
- Publication requires minimum field completeness, source-permission review, duplicate review and an authorized state transition.

### Venues
- Stable ID, name/slug, reviewed description, city/region and only necessary address/coordinates, timezone where operating hours may matter, approved public contact, operating state, publication state and provenance.
- Do not expose residential/private contact details or precise location unless justified and approved.
- Do not make broad verification claims without evidence and a precise definition of what was checked.

### Courts/facilities
- Stable ID, venue foreign key, name, supported sport relationship, facility attributes, optional evidenced published pricing and optional reviewed operating hours.
- Public court visibility must not exceed parent venue visibility.
- A court record does not imply bookable inventory or real-time availability.
- Decide whether `is_bookable` should be retained as dormant metadata, renamed, or removed in a separately reviewed migration; it must not enable a booking UI by itself.

### Sources and provenance
- Canonical URL, publisher/source name, permission state, permitted-use notes, attribution requirement, retrieved time, last checked time, human review time/identity, freshness policy and source record identifier only when permitted.
- Accessibility of a source does not equal permission to republish.
- A pending, prohibited, restricted or expired permission status must control what data can be published, retained, cached or attributed.
- Do not store copied source content beyond the allowed terms.

### Reports and corrections
- Target entity relation, controlled reason, bounded description, optional consented contact, status, assigned reviewer, timestamps, outcome and audit events.
- Reports are private; rate-limit intake and minimize reporter data.
- A report must not automatically change publication state unless a documented urgent safety procedure explicitly authorizes a controlled action.

### Sports CV
- Preferred initial model: no database persistence if local generation can meet preview/export needs.
- If persistent storage is required: owner ID, validated structured fields, timestamps, version, deletion state; strict owner-only RLS and server validation.
- Never index CV drafts or send CV content to analytics. Decide retention/deletion and minor-safety handling before storing personal data.

## 5. Lifecycle and state model

Keep independent dimensions separate:

- **Publication:** draft → submitted → in_review → published; rejection, archive and removal are separately defined outcomes.
- **Opportunity event state:** upcoming/open/closed/expired/date_unknown, computed by trusted logic from known dates and explicit semantics; never makes an unpublished row public.
- **Venue operating state:** active/temporarily_closed/permanently_closed/unknown; not the same as booking availability.
- **Source permission:** pending_review/permitted/restricted/prohibited/expired.
- **Report handling:** received/triaged/investigating/resolved/dismissed.

Only authorized services/roles may publish, remove or alter privileged fields. Preserve audit history for consequential changes. Decide if the existing boolean sports publication field should remain or be migrated to a lifecycle only when the benefits justify the change.

## 6. Roles, grants and RLS plan

Create a permission matrix before adding write workflows.

| Actor | Public published catalogue | Submit proposal/report | Edit own private data | Publish/moderate | Manage roles |
|---|---|---|---|---|---|
| Anonymous visitor | Read allowed published fields only | Through validated, rate-limited intake if enabled | Local CV only unless approved otherwise | No | No |
| Authenticated user (future) | Same public read rules | According to feature rules | Only own permitted records | No by default | No |
| Moderator (future) | Public reads plus restricted moderation views | Review queue | Only authorized scope | Only through trusted, audited path | No by default |
| Admin/operator (restricted) | As needed | As needed | Minimum necessary | According to audited role | Separate controlled procedure |
| Server/service credential | Only from trusted server environment | Validated service operations | Explicitly scoped operations | Explicitly scoped and audited | Never exposed to clients |

Security requirements:
- RLS enabled for every browser-accessible table.
- Table grants and RLS policies reviewed separately.
- Test SELECT/INSERT/UPDATE/DELETE independently and include negative cross-user tests.
- No broad public write policies on editorial tables.
- No service-role key in frontend bundles, mobile apps or public repositories.
- Privileged role assignment must not be self-service; role checks must not depend on user-editable profile fields.
- SECURITY DEFINER functions, if needed, must have safe search path, qualified object names, validated inputs and minimal EXECUTE grants.
- Public read policies should explicitly select allowed published records and avoid leaking private fields by selecting entire rows if sensitive columns are present.
- Use server-managed timestamps and controlled publication transitions.
- Reports, CV drafts, moderation notes and audit metadata must not be public-readable.

## 7. Indexes, uniqueness and performance

Add indexes only for documented query patterns. Candidate patterns to verify:
- Published sports ordered by display order/name.
- Published opportunities filtered by sport, city/region, lifecycle and date/deadline.
- Published venues filtered by city/region and supported sport.
- Courts by parent venue and publication state.
- Source links by target entity and permission/freshness state.
- Reports by status/assignment/created time for restricted moderators.

Potential constraints:
- Unique canonical slug per relevant route namespace.
- Unique venue/sport pair if `venue_sports` is adopted.
- Foreign keys on all real relationships.
- Non-negative amounts; currency required for known fee.
- Coherent date ranges.
- Valid lifecycle enums/check constraints.
- Court parent must exist; parent visibility enforced in query/policy and trusted publication path.
- Prevent duplicate active source/entity links where that is a real business rule.
- Avoid indexes on every field or speculative full-text/geo indexes before usage is measured.

## 8. Migrations and environment separation

- Every schema change is a reviewed, versioned SQL migration in Git.
- Verify the development project ID independently before any apply operation.
- Compare repository migration history with applied migration history before planning updates.
- Test migrations on a disposable clean database and against representative existing development data.
- Review grants, RLS, constraints, functions, triggers, indexes and downgrade/forward-fix strategy.
- Record expected impact, operator/reviewer, commit SHA, backup reference and test evidence.
- Do not rely on destructive down migrations if data could be lost; prefer a tested forward-fix when safe rollback is not possible.
- Never apply a development migration to production by changing an environment variable or reusing credentials.
- Production migration requires a separate explicit authorization, reviewed release plan and verified recovery procedure.

## 9. Backup, recovery and operations

The existing backup/restore SOP should be treated as a separate operational control. For this database plan:
- Define exact backup coverage (schema/data versus Auth users, Storage objects, secrets and project configuration).
- Store encrypted backups outside the database project with restricted access.
- Include manifest, timestamp, migration commit, checksum and scope.
- Verify upload integrity and retention.
- Restore to a disposable isolated environment; validate schema, constraints, grants, RLS and representative records.
- Define recovery point objective (acceptable data loss) and recovery time objective (acceptable downtime) based on actual needs; do not invent targets.
- Assign owners for backup failures, incidents, restore drills and key rotation.
- A successful public-schema dump alone must not be described as complete Supabase disaster recovery.

## 10. Data governance and lifecycle

For every field, document:
- Purpose and necessity.
- Data classification and public/private status.
- Source/consent/legal basis where relevant.
- Who may read/write it.
- Validation and retention/deletion rules.
- Whether it appears in search, SEO, logs, analytics or exports.
- Whether it contains personal data or minor-related information.

Retention periods remain open until the actual purpose, jurisdiction, provider terms and user expectations are reviewed. Do not collect exact coordinates, personal phone numbers, CV data or reporter identity without a justified need.

## 11. Testing and acceptance gates

Before a migration is approved:
- [ ] Verify intended development project identity and current applied migration history.
- [ ] Run migrations from a clean isolated database.
- [ ] Verify constraints and foreign keys reject malformed/inconsistent records.
- [ ] Verify anonymous reads expose only approved published fields.
- [ ] Verify anonymous users cannot publish, edit or delete catalogue records.
- [ ] Verify authenticated users cannot access another user's private records.
- [ ] Verify privileged transitions reject unauthorized actors and write audit evidence.
- [ ] Verify pending/prohibited/expired source permission blocks publication where required.
- [ ] Verify court visibility cannot bypass unpublished/removed venue visibility.
- [ ] Verify unknown fee is not treated as free and missing deadline is not treated as open.
- [ ] Verify report and CV privacy boundaries.
- [ ] Run application tests, lint, typecheck and build from a clean install.
- [ ] Attach actual test output and review evidence; do not mark unrun checks complete.

## 12. Recommended planning sequence

1. Confirm the MVP decisions: local-only CV, source permissions, required opportunity fields, venue/court evidence and report workflow.
2. Read actual applied development schema/migration history in the intended development project (read-only inspection).
3. Produce a field-by-field mapping from current schema to this target model.
4. Label each candidate schema change as **required for MVP**, **optional**, or **deferred**.
5. Draft migration specifications and RLS/constraint test cases without applying them.
6. Review migration plan and data impact.
7. Only after explicit implementation approval, implement in a disposable environment, run tests, then consider applying to the verified development project.
8. Keep production untouched throughout this development planning and implementation sequence unless separate explicit production approval is given.

## 13. Decisions still open

- [ ] CV local-only versus private persistence.
- [ ] Exact required fields and freshness thresholds for each opportunity type.
- [ ] Source permissions/attribution and source-link table structure.
- [ ] Venue/court publication and verification evidence.
- [ ] Venue-to-sport relationship need.
- [ ] Report intake storage, rate limiting, triage ownership and retention.
- [ ] Moderator role management and audit implementation.
- [ ] Date-only versus timestamp semantics and timezone policy.
- [ ] Slug change/redirect strategy.
- [ ] Exact backup coverage, recovery objectives and operational ownership.

**Final recommendation:** The schema probably needs targeted changes for the planned MVP, but no changes should be applied until the open decisions and current development schema are verified. The goal is not a maximally large database; it is the smallest secure, recoverable, well-tested schema that supports the approved MVP.
