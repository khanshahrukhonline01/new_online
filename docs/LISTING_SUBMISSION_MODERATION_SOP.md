# Listing Submission and Moderation SOP

## Scope and route ownership

The public /submit-listing page sends suggestions through the validated submit_listing_intake() RPC. The database creates a private pending_review row. Public visitors never insert directly into the private submissions table and cannot read or change the moderation queue.

Moderators use /admin for the editorial review desk and /admin/control for evidence verification, category publication data, publication, and access management. Both routes require an authenticated user who is explicitly allowlisted in public.listing_moderators. The browser UI is not the authorization boundary; PostgreSQL checks every protected RPC.

## Required moderation workflow

1. Sign in using an individually authorized moderator account.
2. Open /admin and select a pending or resubmitted listing.
3. Click Start Review. The database assigns the review to the current moderator. Submitters cannot review their own submissions.
4. Inspect the submitted title, category, city, details and source URL. Treat all submitted text and URLs as untrusted; inspect official sources manually and do not enter credentials on third-party pages.
5. Open /admin/control. Add HTTPS evidence with a clear description and the correct evidence type. Review each evidence item as supporting, contradicting, or insufficient.
6. Record the evidence-verification decision separately. A verified decision requires at least one supporting evidence item, no contradictory evidence, and no pending evidence reviews. Category-specific evidence requirements also apply.
7. Enter and save the actual category-specific publication data. Do not invent venue addresses, organizer or host names, coach qualifications, event dates, or schedules.
8. Return to /admin and record the editorial decision. Approval is separate from evidence verification and does not publish a catalogue record.
9. Publish from /admin/control only when editorial status is approved, evidence status is verified, and all category-specific publication requirements are satisfied.
10. If a published record must be withdrawn, use the unpublish workflow in /admin and provide a reason. Republishing reuses the linked catalogue row rather than creating a duplicate.

## Category requirements

| Listing type | Required publication details | Supporting evidence |
|---|---|---|
| Venue | City, genuine street/locality address, description | Venue address |
| Opportunity / trial | City, verified organizer name | Official source |
| Academy | City and submitted description | Academy identity |
| Coach | City and reviewed qualifications | Coach qualification |
| Event | City, organizer, venue, actual start time; valid optional end time | Event details |
| Pickup game | City, sport, venue, host and actual start time; valid optional end time | Venue address and host identity |
| Sport | City and title | Official source |

## Database access model

- anon and authenticated have no direct INSERT, SELECT, UPDATE, or DELETE privileges on listing_submissions. Public submissions use submit_listing_intake().
- anon and ordinary authenticated users cannot directly access submission rows, evidence records, moderator access records, or audit/version tables.
- service_role is trusted server-side only. Never expose its key in Vite variables, source control, client bundles, logs, or support messages.
- Moderation RPCs enforce allowlisted roles, expected versions, review state, and publication requirements in PostgreSQL.
- The legacy one-step review RPC and legacy queue RPC are disabled for authenticated clients. The protected versioned v2 queue and distinct lifecycle RPCs are the supported workflow.

## Super-admin access

The first super-admin must be provisioned by a trusted database operator in the intended development Supabase project. There is no public bootstrap or self-promotion route. After bootstrap, super admins can grant or revoke roles for existing Auth users in /admin/control. The database protects the last active super-admin and records access changes in listing_moderator_access_audits.

## Operational safeguards

- Do not mark a listing verified without the required evidence type and reviewed supporting evidence.
- Do not treat approval, verification, and publication as interchangeable labels.
- Keep submitter personal information out of public catalogue records and internal notes unless it is strictly necessary.
- Monitor abuse and use a CAPTCHA or server-side rate limit before promoting public intake broadly. Do not introduce paid services without approval.
- Apply migrations only to the intended development project after confirming the project reference and taking a backup. Do not apply these migrations to production without a separate approved rollout.


## Private UI visibility and discoverability

- The moderator control panel is a restricted application UI at `/admin/control`, not a public product destination.
- Do not add it to the main navigation, sidebar, footer, public user menu or public CTA surfaces. The normal moderator desk must not advertise a link to it.
- Keep the route available for an authorized operator who already knows the URL; the database authorization checks remain mandatory on every protected read and write.
- The route emits `noindex, nofollow, noarchive` for robots, Googlebot and Bingbot. It is intentionally absent from `public/sitemap.xml`.
- Search-engine directives and hidden navigation are discoverability controls only. They are not authentication or authorization controls; PostgreSQL RPC checks and RLS remain the security boundary.
- The page must remain a complete UI workflow: sign-in, queue selection/search, evidence entry/review, verification, editorial decisions, category publication fields, publish/unpublish, and super-admin account management. No operator should need to run SQL for routine moderation.
- An authenticated non-moderator sees an explicit access-denied screen, not another sign-in prompt. An unauthenticated visitor sees only the sign-in screen; neither state receives private queue data.
