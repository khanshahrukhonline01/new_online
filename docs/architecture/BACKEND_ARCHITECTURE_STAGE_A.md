# KhelGrid Backend Architecture — Stage A

**Status:** Draft for review  
**Last reviewed:** 2026-10-29  
**Scope:** `khelgrid-platform` development repository and its connected development Supabase project only.  
**Not authorized:** production changes, schema migrations, paid services, account activation, booking transactions, payments, or live-sports provider integration.

## 1. Goals and principles

Build the smallest secure backend for public discovery of sports, opportunities, venues and facilities. Keep public data published-only; submissions and edits must never publish automatically. Preserve source provenance and permission/attribution decisions. Unknown fees, dates, eligibility, availability, verification and scores stay unknown. Collect minimal personal data. Keep privileged credentials server-side. Use additive timestamped migrations, RLS, tests and recovery notes. This document does not itself authorize schema changes.

## 2. Verified development baseline

Read-only inspection of the connected development Supabase project on 2026-10-29 found five tables, all with RLS enabled and zero rows at inspection time:

- `sports`
- `opportunities`
- `venues`
- `venue_courts`
- `profiles` (references `auth.users`; keep dormant while account workflows remain paused)

The schema is a starter. It does not yet provide a complete source-permission register, publication audit trail, report/correction workflow or full submission/moderation experience. A registered frontend route does not prove that its backend is configured.

## 3. Target architecture

```text
React + Vite browser
  ├─ Public catalogue reads -> Supabase publishable/anon key + RLS
  │   └─ published sports/opportunities/venues/courts only
  ├─ Public submission/report forms -> future trusted, rate-limited intake
  │   └─ private pending records; no direct anonymous catalogue writes
  └─ Never contains service-role, provider, payment or admin secrets

Restricted moderation workflow (not yet implemented)
  ├─ authorized reviewer
  ├─ source/permission and completeness checks
  ├─ explicit approve/reject/archive transition
  └─ append-only audit event -> published catalogue

Future isolated integrations (separate approval)
  ├─ licensed live-sports provider adapter
  ├─ booking inventory/holds/transactions
  └─ payment provider
```

Until a reviewed moderation identity and interface exist, content changes should use a restricted documented operator workflow, not an open public write policy.

## 4. Domain scope

### P0 — public catalogue
- `sports`: curated catalogue.
- `opportunities`: trials, combines, scholarships and camps with source, dates/deadline, fee/eligibility status and publication lifecycle.
- `venues`: reviewed venue facts and publication lifecycle.
- `venue_courts`: descriptive facilities under a published parent venue. `is_bookable` does not mean a booking service is operational.

### P1 — trust and content operations (proposed, not migrated)
- Source/provenance records: canonical URL, source name, permission/attribution decision, retrieval/check/review timestamps, freshness and reviewer evidence where lawful.
- Append-only moderation audit events: actor, entity, action, timestamp and minimal change context.
- Private reports/corrections with constrained reason/status, triage and resolution.
- Reviewed submission intake for opportunities/venues with validation, rate limiting and duplicate/spam handling.

Avoid unconstrained polymorphic `entity_type + entity_id` source links that cannot enforce foreign keys. Prefer typed join tables or per-domain source links after actual query needs are confirmed.

### P2 — explicitly deferred
Authentication/accounts, athlete public profiles, saved items, notifications, messaging, applications, persistent CV drafts, booking inventory, reservations, refunds, payments and live-score ingestion. Prefer local-only Sports CV generation initially if requirements allow. Live data requires approved rights, terms, attribution, credentials, quotas and outage behaviour.

## 5. Access/security model

| Resource | Anonymous browser | Authenticated user | Restricted operator |
|---|---|---|---|
| Published catalogue | Read safe public fields | Same public access | Read/review |
| Draft/unpublished rows | Deny | Deny by default | Authorized review only |
| Source evidence/private notes | Deny | Deny by default | Least privilege |
| Reports/corrections | Submit only through approved intake; cannot list reports | Own-record access only if an approved identity model exists | Triage/resolve |
| Profiles | No public access | Own row only if auth is enabled later | No broad access without need |
| Secrets | Never | Never | Server-side only |

RLS and SQL grants are separate controls. Enable RLS on every exposed-schema table and grant only required operations. UPDATE policies require both authorization predicates in `USING` and `WITH CHECK`. Never use user-editable metadata for authorization. Avoid `SECURITY DEFINER` unless necessary and reviewed; keep privileged functions out of exposed schemas and restrict execute grants. Vite `VITE_*` values are public at build time; never place service-role keys there.

## 6. Data access conventions

- Centralize Supabase client and typed query services in the approved integration/data-access layer.
- Use explicit columns, bounded pagination, indexed filters and stable IDs.
- Distinguish loading, not configured, error/unavailable, empty, ready, not-found and forbidden. Never turn a failed request into an empty-success state.
- Validate in UI and trusted boundary/database.
- Store money as integer minor units plus ISO currency; do not infer fees from display text.
- Use UTC instants when time is known and date-only fields when only a date is sourced.
- Treat user and external-source text as untrusted.

## 7. Migration and test gates

Before any schema migration:
1. Verify development project identity and compare repository migrations with applied migration history.
2. Approve each new field/table, access model and retention period.
3. Prepare a timestamped additive migration with constraints, indexes, grants and RLS.
4. Test allowed and denied access for anon/authenticated roles, including publication-status tampering, ownership reassignment and cross-user reads.
5. Test completeness, expired opportunities, unknown fees, stale sources and unpublished-parent/child visibility.
6. Run typecheck, lint, unit tests, migration tests, build and Supabase security advisors; record actual output.
7. Back up relevant development data and document recovery. Never run a development migration against production.

No migration should be applied solely because this design proposes a table.

## 8. Delivery order

1. Inventory applied schema, repository migrations, frontend queries, routes and environment names; publish a verified gap register.
2. Implement read-only catalogue integration with typed queries, published-only access, pagination and accurate unconfigured/error states.
3. Design and approve provenance, moderation audit and private report intake; test RLS.
4. Implement restricted moderation with source checks, duplicate handling, explicit approval and audit trail.
5. Review CV persistence, accounts, booking, payments and licensed live feeds independently, including cost/rights/security acceptance gates.

## 9. Acceptance criteria

- Public queries cannot return drafts, rejected records, private reports or private profile data.
- Anonymous users cannot create/update/delete catalogue records or change publication/verification status.
- Pages distinguish empty data from configuration errors and provider outages.
- Displayed opportunity claims have reviewable evidence; unknown values remain unknown.
- Venue children cannot be exposed if their parent venue is unpublished.
- No mock listings or simulated live scores appear as real.
- No paid service, production change, auth activation, booking or payment without explicit approval.
- Required CI and database security tests pass before merge/deploy.

## Change history

- 2026-10-29: Drafted after read-only inspection of development Supabase. No schema or data was changed.
