# KhelGrid scalable catalogue architecture

## Goal

Allow KhelGrid to add sports, venues, courts, trials, combines, academies, coaches, tournaments, services, and future sports-related directory types without rewriting the site for each new record or introducing a paid backend dependency.

This document defines the extension pattern. It does not authorize applying schema changes to a connected/production Supabase project.

## Design rules

1. **Data-driven, not hardcoded.** Public listings come from the database. A new venue, academy, coach, sport, or opportunity should be created as data and reviewed, not added as a React component.
2. **Stable identity.** Use UUID primary keys and unique, URL-safe slugs. Slugs are public URLs; preserve redirects/aliases when a slug changes.
3. **Separate entity types.** Venues, academies, coaches, sports, and opportunities have different validation, privacy, and lifecycle requirements. Do not force them into one untyped JSON table.
4. **Explicit relationships.** Use foreign keys and join tables for many-to-many relationships, such as a venue offering multiple sports or a coach working with multiple sports/academies.
5. **Draft → review → publish.** Public queries return only published records. A submission must not become public merely because it was received.
6. **Provenance and trust.** For externally sourced trials/events, record source URL/name, checked-at time, review status, and relevant dates. Do not label a record verified without evidence.
7. **Safe writes.** Keep public browser clients read-only for editorial records. Future submit/edit flows should use authenticated server-side actions or carefully scoped RLS policies, validation, rate limits, and audit logs. Never expose the Supabase service-role key in the browser.
8. **No false availability.** Venue listing, court pricing, and actual booking availability are separate states. Only show a price if it is stored and current; only confirm bookings after a transactional database check.
9. **Additive migrations.** Add tables/columns/indexes and backfill safely. Avoid destructive renames/drops without a reviewed migration plan, backup, and recovery path. Do not run migrations against an unidentified or legacy production project.
10. **Free-tier-first.** Keep the initial architecture compatible with Supabase Free and Vercel. Add caching, pagination, indexes, and measured query limits before considering paid services.

## Suggested domain model

- `sports`: canonical sport taxonomy; add a sport as a row.
- `venues`: facility identity and location; `venue_courts`/facilities are child records.
- `venue_sports` (or sport-linked courts): many-to-many mapping when a venue offers sports beyond individual courts.
- `opportunities`: trials, combines, camps, scholarships, jobs and similar items with a controlled type, dates, organiser, source/provenance, review state and publication state.
- `academies`: organisation profile, location, contact/public website, facilities and publication state.
- `coaches`: public professional profile and review/publication state. Private contact details and verification documents must not be exposed by public queries.
- `coach_sports`, `academy_sports`, `coach_academies`: relationship tables where many-to-many relationships are needed.
- `events`: event/tournament schedule, venue/organiser references, dates, sport, source and publication state. Keep recurring schedules distinct from individual event instances if needed.
- `media_assets`: optional later-stage shared image/document metadata; store files in Supabase Storage with explicit access rules rather than base64 blobs in rows.
- `submissions` and `audit_log`: optional moderation workflow for public listing submissions and staff changes, with limited access and retention rules.

Use existing tables when they already meet the requirement; do not create parallel tables simply to rename the same concept.

## Frontend pattern

- Keep route definitions separate from page components.
- Build reusable directory primitives: search/filter controls, pagination, empty/loading/error states, listing cards, detail pages, and source/verification labels.
- Each directory supplies its own typed query and fields but reuses those primitives.
- Query parameters should represent shareable filters (for example `?sport=football&city=Delhi`) and be validated before querying.
- Use server-side/database filtering and pagination for large result sets; avoid downloading the entire table to filter in the browser.
- Unknown slugs must show a clear not-found/unpublished state, not fabricated fallback content.
- Add a new directory by registering its route, typed data access, list/detail components, navigation entry, and tests. Adding a new record within an existing type should not require code changes.

## Security and moderation

- Enable RLS on every exposed table and verify policies with SQL security tests.
- Anonymous users may read only fields on published public records.
- Never expose private contact information, identity documents, account data, internal moderation notes, provider credentials, or service-role secrets.
- Public listing submission is not the same as verification or publication.
- Use database constraints for required fields, slug shape, valid dates, controlled statuses, and foreign-key integrity. Use server-side validation as a second layer.
- Keep an audit trail for changes to verification and publication state.
- Require a source and a review process before presenting external trials or events as verified/current.

## Performance and operations

- Add indexes to actual filter/order columns (publication state, city, sport ID, event start date, slug).
- Use cursor/range pagination and bounded query sizes.
- Avoid N+1 fetches; request related public fields in bounded queries or a view/RPC designed for the page.
- Cache only public data and define how updates invalidate it.
- Monitor Supabase row/query/storage usage and Vercel function/build usage before adding infrastructure.
- Keep SQL migrations in Git, run checks against a disposable/test database, and retain backups before applying to production.

## Acceptance checklist for each new directory

- [ ] Schema and migration are additive and reviewed.
- [ ] Required fields, relationships, uniqueness, and date constraints are database-enforced.
- [ ] RLS and grants are tested for anon, authenticated, and privileged roles.
- [ ] Draft/unverified records are not publicly visible.
- [ ] Typed read API has loading, empty, unconfigured, error, and pagination states.
- [ ] List, filters, detail route, unknown slug, keyboard navigation, and mobile layout are tested.
- [ ] Provenance and verification wording are accurate.
- [ ] No fabricated records, prices, availability, ratings, or verification claims.
- [ ] Backup/recovery and rollback plan is documented.
- [ ] CI typecheck, lint, tests, build, and preview checks pass before release.

## Current implementation boundary

The current core schema includes `sports`, `opportunities`, `venues`, `venue_courts`, and `profiles`. The current public client reads the first three catalogue types. Dedicated coach, academy, and event data models and submission/moderation workflows still require reviewed implementation. The Sports CV browser-only workflow does not create an account or submit personal information.

This is a staged architecture, not a claim that every future feature is already implemented.
