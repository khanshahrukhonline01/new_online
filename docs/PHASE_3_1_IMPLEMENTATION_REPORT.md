# Phase 3.1 — Publication Integrity & Moderator Control Panel

**Status:** Implemented on feat/phase-3-1-integrity-admin-control-panel; awaiting pull-request CI and development-database verification.  
**Migration:** 20261111100000_phase_3_1_publication_integrity_admin_control_panel.sql  
**Control panel:** /admin/control

## 1. Decision model

The listing lifecycle now distinguishes three independent decisions:

1. **Editorial approval** — an authorized moderator claims the submission for review and then approves or rejects it.
2. **Evidence verification** — a moderator records HTTPS evidence, reviews its outcome, and records a separate verification decision.
3. **Publication** — an approved and verified submission with complete category-specific facts is copied/activated in the public catalogue.

Approval alone cannot publish. Publication RPCs enforce the verification status and category completeness in PostgreSQL; frontend controls are not the security boundary.

## 2. Category publication requirements

| Category | Required publication facts | Required supporting evidence |
|---|---|---|
| Venue | City, genuine address distinct from city, description | Venue-address evidence |
| Opportunity / trial | City, organizer name | Official source |
| Academy | City and submitted description | Academy identity |
| Coach | City and reviewed qualifications | Coach qualification |
| Event | City, organizer, venue, actual start time; valid optional end time | Event details |
| Pickup game | City, sport, venue, host, actual start time; valid optional end time | Venue address and host identity |
| Sport | City and title | Official source |

No generic city, host, organizer, weekend schedule, or future event date is manufactured by the publication function. Category values are entered by a moderator and retained in the private structured-data field before publication.

## 3. Evidence and verification controls

- Evidence records are stored in listing_submission_evidence with RLS enabled and no direct anon or authenticated table access.
- Moderators add evidence through a protected RPC and review it as supporting, contradicting, or insufficient.
- A verified decision requires at least one supporting item, no contradictory item, and no pending evidence review.
- Category-specific evidence types are enforced for venues, opportunities, academies, coaches, events, pickup games and sports.
- Every evidence addition/review invalidates the prior verification decision and increments the submission version. Re-verification is required.
- Evidence cannot be changed while a listing is published; unpublish first.

## 4. Moderator and super-admin access

- listing_moderators.role supports moderator and super_admin.
- Moderators can review listings, add/review evidence, record verification decisions, and manage category publication details.
- Super admins can additionally list authorized accounts and grant/change/activate/revoke moderator access.
- The database prevents removal or demotion of the last active super-admin.
- Access changes are recorded in the private listing_moderator_access_audits table and can be read only through a super-admin RPC.
- The first super-admin must be provisioned by a trusted database operator in the intended development Supabase project. There is deliberately no public self-promotion or browser-based bootstrap path.

## 5. UI

The existing protected /admin listing review desk remains in place. It links to the new /admin/control panel, which includes:
- submission and verification queue,
- evidence register and review outcomes,
- category-specific publication fields,
- editorial approve/reject actions,
- verification decision actions,
- verified-only publication action,
- super-admin moderator access management and access audit history.

The public listing submission page remains separate from the private moderation UI.

## 6. Tests added

- Static schema and privilege assertions for Phase 3.1.
- Runtime evidence-before-publication checks.
- Runtime moderator/super-admin authorization and last-super-admin protection checks.
- End-to-end approval, evidence verification, publication, unpublication and duplicate-safe republication.
- Category publication fixtures for all seven listing types.
- TypeScript route and protected-panel rendering tests.

CI is configured to apply the Phase 3.1 migration and run both Phase 3.1 SQL test scripts. A successful workflow result is required before merging or applying the migration to any shared development database.

## 7. Deployment safety

- The migration is additive and transaction-wrapped.
- CI uses an isolated PostgreSQL fixture.
- Do not apply this migration to the live/production Supabase project.
- Before applying to the intended development Supabase project: confirm the project reference, take a backup, apply the timestamped migration, provision the first super-admin using the SOP, and test the /admin/control route with both moderator and super-admin accounts.
- Keep the service-role key server-side only.

## 8. Explicit scope boundary

This release covers all seven listing intake categories and moderator access management. It does not yet merge a separate athlete identity/certificate verification queue, content-report queue, or KhelChronicle editorial workflow into the same panel. Those workflows require their own data contracts and authorization review; they must not be represented as completed by this phase.
