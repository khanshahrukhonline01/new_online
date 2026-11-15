# KhelGrid — Development Schema Gap Analysis

**Status:** Read-only planning review completed from repository files.  
**Review date:** 2026-10-25  
**Scope:** Separate `khelgrid-platform` repository, its committed migrations, documentation, and current `src` starter files.  
**Explicit exclusion:** No production repository, production database, or production deployment was inspected or changed as part of this report. No database connection or live project introspection was performed during this review. Findings describe committed repository artifacts, not necessarily the exact live development database state.

## 1. Executive summary

The current development repository has a useful **starter schema** and a clear security baseline, but it is **not yet the Balanced MVP domain model** described in the planning documents. The current application remains a starter landing page; the inspected app files do not show implemented routes, Supabase client integration, or feature data-access services.

The two committed migrations define five core tables: `profiles`, `sports`, `opportunities`, `venues`, and `venue_courts`. RLS is enabled on these tables. Public reads are limited to published catalogue rows, and profiles are scoped to the authenticated user's own row. These are good foundations, but several planned data and workflow requirements are not yet represented in the committed schema.

**Recommendation:** Do not write or apply a new migration as part of this planning review. Resolve the priority decisions in this report, then draft a separately reviewed development-only migration plan with tests.

## 2. Evidence reviewed

- `supabase/migrations/20261025065644_restrict_rls_auto_enable_execute.sql`
- `supabase/migrations/20261025070100_initial_core_schema.sql`
- `src/App.tsx` and `src/App.test.tsx`
- `package.json`
- `docs/ARCHITECTURE.md`
- `docs/DELIVERY_PLAN.md`
- `docs/database/DATABASE_SECURITY_POLICY.md`
- `docs/database/DATABASE_OPERATIONS_CHECKLIST.md`
- `docs/DOMAIN_MODEL_AND_DATA_DICTIONARY.md`
- `docs/MVP_DECISION_RECORD_AND_ROUTE_REGISTRY.md`

The app file currently renders a static shell with focus areas and explicitly labels live feeds/account services as not connected. The package dependencies inspected include React, Vite and test/lint tooling, but no Supabase client dependency is declared in the inspected `package.json`.

## 3. Existing schema inventory

| Existing table | Current schema purpose | Assessment against Balanced MVP |
|---|---|---|
| `profiles` | Auth-linked user profile fields | Not required for public browsing; account workspace is deferred. Keep dormant until account/privacy design is approved. |
| `sports` | Slug, name, `is_published`, timestamps | Useful base; lacks planned summary, retirement lifecycle and richer editorial review metadata. |
| `opportunities` | Title/slug, optional sport, type, organizer/city/venue, dates, source URL/name, verification and publication status | Partial base; lacks source-permission relation, freshness/review history, fee/eligibility/application detail, explicit multi-state moderation lifecycle and richer location fields. |
| `venues` | Slug/name/description/city/address/timezone/publication status | Partial base; lacks source/review history, operating status, location privacy policy, contact/facility/verification evidence model. |
| `venue_courts` | Parent venue, name, optional sport, currency, price in paise, `is_bookable`, timestamps | Partial base; lacks per-court publication state, supported-sports relation, facility/hours model and explicit pricing evidence. The `is_bookable` field should not be treated as a promise that booking works. |

The current migrations do **not** define dedicated tables for source provenance, content reports/corrections, venue-to-sport relationships, or persisted Sports CV drafts. Some of these may be implemented locally or in future designs, but they are not represented in the inspected migrations.

## 4. Gap register

Priority meanings:
- **P0:** resolve before public launch or before the related security-sensitive feature is enabled.
- **P1:** needed for a reliable Balanced MVP implementation.
- **P2:** defer until the relevant feature is approved.

| ID | Priority | Gap / evidence | Risk or consequence | Planning recommendation |
|---|---|---|---|---|
| G-01 | P1 | Opportunities have only a source URL/name; no source register/provenance entity | Cannot consistently record permission status, attribution, retrieval vs review time, source restrictions or freshness | Decide a referentially safe source-link design and minimum evidence fields before publishing externally sourced records |
| G-02 | P1 | Opportunity columns omit fee status/amount, eligibility, application method/contact, region/country, explicit status timestamps and review history | Listings may lack important decision information; unknown values can be confused with absent data | Approve required-for-publication field matrix by opportunity type; distinguish unknown from free/zero |
| G-03 | P1 | Opportunity `verification_status` and `publication_status` use small separate enums; publication enum is only draft/published/archived | No committed submitted/in-review/rejected/removed lifecycle or audit trail; “verified” may be interpreted too broadly | Define transition matrix and precise meaning of verification; add authorized, auditable moderation workflow in a future migration design |
| G-04 | P1 | `sports` uses `is_published` boolean while other entities use status strings | Different lifecycle patterns make shared moderation and route handling inconsistent | Decide whether to retain simple boolean for sports or standardize an explicit lifecycle; do not migrate merely for stylistic uniformity |
| G-05 | P1 | Venues lack operational state, source/review metadata, and verification evidence model | Stale or unsubstantiated venue claims may be displayed | Define reviewed venue publication checklist, operating state, source evidence and exact scope of any verification claim |
| G-06 | P1 | Courts have no own publication status; RLS permits court reads when parent venue is published | An unreviewed court can be exposed under a published venue if inserted through a privileged path | Decide whether court-level publication is needed; enforce parent and child publication rules together |
| G-07 | P1 | Court `is_bookable` exists while booking is explicitly deferred; no booking tables/safeguards exist in these migrations | UI could accidentally imply booking is available | Keep booking UI/service disabled; treat the field as non-authoritative legacy/planning metadata until its meaning is decided |
| G-08 | P1 | No venue-sport junction; each court has at most one `sport_id` | Venue-wide supported sports may be duplicated or lost | Decide whether venue-sport relationship is needed for MVP and define unique-pair/evidence rules |
| G-09 | P1 | No content-report/correction table or workflow in migrations | Public reports cannot yet be managed through a database-backed moderation queue | Decide whether initial report intake is external/form-only or database-backed; specify restricted access, spam controls, owner and escalation |
| G-10 | P1 | No Sports CV storage model | Cannot persist CVs in Supabase yet; local-only flow remains possible | Choose local-only CV generation for MVP or design private owner-scoped storage after privacy/retention review |
| G-11 | P0 before account feature | `profiles` references `auth.users`, but account functionality is deferred | Table exists before account lifecycle and deletion policy is approved | Keep account-facing routes and operations disabled; approve session, deletion, recovery, consent and role model before using it |
| G-12 | P0 before admin/submission feature | Editorial tables grant public select only; no moderation role/permissions or audit tables are defined in these migrations | No reviewed browser-side workflow for authorized publishing is described by current schema | Define trusted server/admin pathway, role assignment process, audit event schema and negative authorization tests before submissions/publication tools |
| G-13 | P1 | No slug history/redirect model | Changing slugs can break canonical URLs and external links | Decide whether to preserve old slugs in a redirect table or use a documented not-found policy |
| G-14 | P1 | Date fields are `timestamptz` and the schema checks end >= start, but no deadline/event-state policy is encoded | Timezone/deadline edge cases can mislabel opportunities as open or expired | Document date-only vs instant semantics, source timezone handling and trusted event-state computation |
| G-15 | P1 | Existing text checks cover some names/slugs, but publication completeness/source permission rules are not enforced by the schema | Privileged writes can publish incomplete or unpermitted content unless another trusted path validates it | Decide which invariants belong in DB constraints/triggers versus a trusted publication service; test bypass attempts |
| G-16 | P0 | RLS policies exist for SELECT and profile INSERT/UPDATE; no public write policies for editorial tables | This is appropriately restrictive, but the future moderation write path is not yet designed | Preserve deny-by-default; do not add broad client write grants as a shortcut |
| G-17 | P1 | `profiles.avatar_url` and `venues.address` are plain text; no URL/precision/contact publication rules in schema | Could allow invalid URLs or excessive personal/location detail through privileged writes | Define validation and field-level publication policy; avoid adding sensitive location data without a use case |
| G-18 | P1 | Existing court price is integer `hourly_price_paise` and `currency_code` permits any uppercase three-letter code | INR paise is suitable for the intended India MVP, but generic multi-currency semantics are not fully specified | Decide India-only INR scope or a general money model; do not treat display strings as authoritative prices |
| G-19 | P0 before public launch | Operations checklist requires testing and evidence; this review did not inspect live database state, run SQL tests or run CI | Repository inspection alone cannot confirm applied schema, RLS effectiveness or deployment readiness | Before migration or launch, verify development project ID, migration history, RLS/grants and actual allowed/denied test evidence |
| G-20 | P1 | Current `src/App.tsx` is a static landing shell; no route registry implementation/data layer appears in inspected files | Planned routes and domain types are not implemented in the starter | Plan foundation slice: router, typed contracts, service boundary, error/loading states and tests before building all routes |
| G-21 | P1 | Inspected `package.json` does not declare Supabase client | Frontend cannot yet use typed Supabase SDK through the declared dependency set | Decide whether the MVP reads public data directly with RLS or through server endpoints; add dependency only in a separately approved implementation step |
| G-22 | P2 | No account/role table beyond auth-linked profiles; no public athlete profiles, bookings, payments, reviews or messaging schema | These deferred features are not supported by current schema | Leave them deferred; design separately only after scope, rights, safety and operational gates pass |

## 5. Security review of the committed migration (static review only)

Positive controls visible in the SQL:
- RLS is enabled on all five core tables.
- Anonymous/authenticated SELECT policies expose only published sports/opportunities/venues, and courts under published venues.
- Profiles are restricted by `auth.uid() = id` for SELECT/INSERT/UPDATE.
- Direct editorial table writes are not granted to anon/authenticated roles.
- The `set_updated_at()` function uses a fixed `search_path`, and direct execute is revoked from public/anon/authenticated.
- A separate migration revokes direct EXECUTE on `rls_auto_enable()` from API roles.

Review caveats / follow-up:
- This was a static reading of committed SQL; it does not prove the migration was applied exactly as committed or that no dashboard/manual changes exist.
- RLS and SQL grants are separate controls; preserve both when future tables are introduced.
- A service-role key bypasses RLS and must remain server-side; privileged publishing must validate inputs and authorization before writes.
- There is no court-specific publication predicate yet; parent venue publication alone is insufficient if courts need individual review.
- No automated authorization test results were run as part of this read-only report.

## 6. Recommended planning decisions, in order

1. **Decide CV persistence:** recommend local-only CV generation for initial MVP if PDF/export requirements can be met, avoiding account and personal-data storage dependencies.
2. **Approve opportunity publication matrix:** required fields, unknown/fee states, source permission, freshness threshold, lifecycle transitions and who can approve.
3. **Approve venue/court publication matrix:** parent-child visibility, evidence for facilities/prices/contact, location precision and meaning of any verification.
4. **Decide source provenance structure:** prefer typed foreign-key/source-link tables or a safe normalized approach; avoid unconstrained polymorphic IDs that cannot enforce referential integrity.
5. **Define report intake:** decide if reports are stored in Supabase during MVP; define private access, spam protection, retention, triage owner and urgent escalation.
6. **Define trusted publishing path:** role grant/revocation, audit history, allowed state transitions and how service-role access is controlled.
7. **Set slug and date semantics:** redirect policy, timezone and deadline interpretation.
8. **Plan schema changes as a separate reviewed migration:** include constraints, RLS/grants, indexes, migration tests and rollback/forward-fix notes. Apply only to the verified development project after explicit implementation approval.

## 7. Proposed validation plan before any migration

- [ ] Confirm the target is the separate development Supabase project by project ID.
- [ ] Compare applied migration history with committed migration files.
- [ ] Confirm actual table columns, constraints, grants, RLS flags and policies in development.
- [ ] Test anon can read only published public catalogue rows.
- [ ] Test anon cannot insert/update/delete catalogue records.
- [ ] Test authenticated users cannot read or update another user's profile.
- [ ] Test unpublished venue children are not exposed (after the policy/model is decided).
- [ ] Test a privileged publishing attempt with missing source/required fields is rejected by the trusted path.
- [ ] Test source permission pending/prohibited/expired blocks publication where required.
- [ ] Run migration from a clean disposable development database and test both successful and denied cases.
- [ ] Record CI/test evidence and review before applying any change to the intended development project.

## 8. Decision log

| Decision | Current status | Recommended owner |
|---|---|---|
| MVP scope | Balanced MVP selected in planning docs | Product owner |
| CV storage | Open | Product/privacy owner |
| Source/provenance model | Open | Data/product owner |
| Opportunity publication rules | Open | Editorial/moderation owner |
| Venue/court publication rules | Open | Venue/data owner |
| Report storage and triage | Open | Trust/operations owner |
| Moderator authorization/audit | Open | Security/backend owner |
| Date/time and slug policy | Open | Product/engineering owner |
| Schema migration plan | Not started; requires approval | Engineering/database owner |

**Conclusion:** The current schema is a deliberately narrow starting point, not a failed implementation. It needs planned additions and decisions before it can safely support all Balanced MVP workflows. This report does not create or apply any migration and does not certify the live development database or application.
