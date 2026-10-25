# KhelGrid Platform — Stage A Schema Change Matrix

**Status:** Planning specification only. This document does not apply migrations or change any database.
**Scope:** Separate khelgrid-platform project; Supabase Free plan for the initial MVP.
**Safety boundary:** Do not change production repository, production database, or deployment as part of this planning work. Any schema implementation requires separate explicit approval and a reviewed migration.

## 1. Current verified baseline

The development Supabase project was inspected read-only on 2026-10-25. The following five tables were present, each with row-level security enabled:

- profiles
- sports
- opportunities
- venues
- venue_courts

The recorded development migration versions were:

- 20261025065644_restrict_rls_auto_enable_execute
- 20261025070100_initial_core_schema

The tables contained zero rows at inspection time. The security advisor returned no findings. This is a metadata/policy review, not a penetration test, and does not establish production status.

## 2. Stage A decision matrix

| Area | Current baseline | Stage A decision | Change trigger / acceptance criteria |
|---|---|---|---|
| Sports catalogue | sports | Keep | Public reads expose published sports only; writes stay in a trusted publishing path. |
| Opportunities and trials | opportunities | Keep table; specify fields and workflow before migration | Required title, sport, location/venue, dates, eligibility, source, publication state, and freshness rules are agreed and validated. Unknown fees must not be represented as free. |
| Opportunity provenance | Existing opportunity model needs a documented source/review contract | Required design work; migration only after approval | Store source URL/name, checked-at timestamp, evidence/review state, and relevant permission/attribution notes. Do not imply official verification without evidence. |
| Opportunity publication | Existing publication_status concept | Define controlled state transitions | Only authorized trusted publishing paths may publish, unpublish, or mark a listing verified; transitions are auditable. |
| Venues | venues | Keep; define evidence and public-contact rules | Published venues have sufficient evidence, accurate location/contact details, and no unsupported claims. |
| Courts | venue_courts | Keep; decide whether courts need independent publication moderation | Court visibility must never bypass the parent venue's publication state. |
| Court sport filtering | venue_courts.sport_id exists | Consider index after query patterns are known | Add index only when representative queries and query plans show it is useful; the FK was reported unindexed in the advisor review. |
| Multi-sport venues | No separate junction table confirmed | Defer venue_sports unless venue-level sport filters require it | Introduce a junction only if venue-level sport relationships cannot be modelled accurately with current records. |
| Reports / corrections | No report workflow confirmed | Defer stored reports unless moderation requires them in Stage A | If enabled, define abuse controls, retention, access, and moderation workflow first. |
| Profiles | profiles | Keep minimal | Authenticated users may access only their own profile; do not add expanded public profiles or saved state prematurely. |
| Sports CV | Product requirement exists | Prefer local-only generation/export initially | Persist personal CV data only if local-only export cannot meet a confirmed requirement and privacy/retention rules are approved. |
| Bookings and payments | Not part of current five-table baseline | Defer to Stage B | Add only after venue data, operating hours, court-specific pricing, atomic availability, cancellation, and payment/security requirements are designed and tested. |
| Applications, notifications, saved items | Not part of Stage A baseline | Defer to Stage B | Add when authenticated workflows are approved and can be delivered securely within operational limits. |
| Live sports data | No live-provider integration in this schema baseline | Defer | Choose a genuine licensed/authorized provider and document attribution, caching, rate limits, fallback states, and cost before implementation. |
| Reviews, messaging, community, media, analytics warehouse | Not required for MVP | Defer to Stage B | Require a concrete user need, moderation/privacy plan, storage/cost estimate, and acceptance criteria. |

## 3. Security and data-quality rules

1. Keep row-level security enabled on all exposed tables.
2. Public/anonymous clients may read only published catalogue records. They must not directly insert or update trusted catalogue data.
3. Keep service-role credentials server-side only; never ship them in browser code or public build variables.
4. Enforce required fields, valid dates, valid status values, and allowed state transitions at the trusted server/database boundary, not only in UI validation.
5. Do not claim that a listing is verified, official, open, available, or free unless the evidence supports that exact claim.
6. Distinguish fee states such as known amount, explicitly free, unknown, and not stated. Unknown must never default to zero.
7. Keep source evidence and a checked-at timestamp for sourced listings. Expire, archive, or re-review stale opportunities according to a documented policy.
8. Use auditable, authorized publication changes. A client must not be able to self-approve a listing by changing a status field.
9. Preserve migration history and take a recoverable backup before any approved schema change.
10. Do not remove indexes merely because an advisor labels them unused while the database has no representative data. Validate indexes against realistic query patterns first.

## 4. Decisions required before writing a migration

- Which opportunity source types and source permissions are allowed?
- What fields are mandatory for each opportunity/trial type?
- What evidence qualifies as sourced, reviewed, or verified, and who can set each state?
- Which publication-state transitions are allowed, and how are they audited?
- Should courts have their own publication state, or inherit visibility exclusively from the venue?
- Are venue-level multi-sport filters required for Stage A?
- Must user reports/correction requests be stored in Supabase in Stage A?
- Is local-only Sports CV generation sufficient for the first release?
- Which exact catalogue queries and filters need indexes?

Record decisions and acceptance tests before drafting SQL.

## 5. Recommended next steps

1. Resolve the decisions in Section 4.
2. Write a migration specification and RLS/policy test matrix; do not execute it yet.
3. Prepare representative test fixtures and tests for publication visibility, unauthorized status changes, source freshness, unknown fees, and parent-venue visibility.
4. Review the proposed SQL and rollback/backup procedure.
5. Apply only after explicit implementation approval, first to the development project; inspect results and run tests before considering any release.

## 6. Explicit non-goals

This document does not authorize schema changes, data seeding, production access, deployment, paid service adoption, or creation of mock listings. It does not claim that any unimplemented feature is complete.
