# Contributor Centre — Submission Workflows

**Status:** Existing source-reviewed intake plus proposed workflow specification  
**Reviewed:** 2026-11-22

## 1. Existing contributor-facing modes

The current `ListingSubmissionPage` exposes three modes:

1. **Suggest a Listing** — submits through `submitListingIntake()`.
2. **Track Submission Status** — looks up a submission using a reference number and private tracking key.
3. **Direct Email** — prepares a manual email request to the KhelGrid operations address.

The direct-email route is a fallback/concierge channel. It must not be described as the same as a database-confirmed submission unless the operations team manually creates and tracks a corresponding record.

## 2. Existing supported intake types

| Type | Current form guidance / helper data | Future structured form needs |
|---|---|---|
| `venue` | Address, sports; common title, city, source URL, details | Full public address, facility identity, sports/facilities, public contact route, hours where supplied, source evidence |
| `opportunity` | Organizer, venue, trial date/eligibility; common fields | Organizer identity, opportunity type, actual dates/deadline, eligibility, venue/location, official notice and registration route |
| `coach` | Qualifications/certifications and primary sport | Professional identity/profile, sport, credential issuer, experience, coaching location, public professional contact/source |
| `academy` | Common title, city, source and details; guidance requests address, sports/programmes, coach details | Public identity, actual address, sports/programmes, coach and affiliation claims, public contact/source |
| `event` | Organizer, venue, event dates | Organizer, event identity/type, actual start/end, venue, rules/eligibility and official announcement |
| `pickup_game` | Sport, ground/venue, host, schedule | Sport, actual venue/address, organizer/host, date/time, participation requirements and capacity only if supplied |
| `sport` | New sport suggestion and governing-body/source guidance | Keep as a separate catalogue suggestion workflow, not a public venue/coach/event listing |

The existing form uses shared fields and concatenates helper values into `details`. The target structured form should preserve the original facts and submit them through an explicitly designed, validated backend contract. Do not assume that adding frontend fields alone creates normalized database fields.

## 3. Category-specific evidence guidance

### Venue
Review genuine public identity, full street/locality address, facility and sports claims, and a reliable public source/contact route. A city alone is not a full address.

### Trial / opportunity
Review organizer identity, official notice, actual date and deadline, venue/location, eligibility and application route. State athlete registration fees only when the organizer has published them; never infer a free entry.

### Coach
Review professional identity, sport specialization, claimed qualification and issuing authority, relevant experience, and a public professional profile or academy reference. A submitted certificate is not issuer-confirmed merely because it was uploaded.

### Academy
Review public identity, actual location, sports/programmes, coaching and affiliation claims, and a reliable source. Preserve the existing restrictions against direct community publication.

### Event
Review organizer, venue, real event dates, rules and official announcement. Never invent dates or organizers.

### Community / pickup game
Review sport, real venue and address, organizer/host identity, actual schedule and participation terms. Do not publish city-as-address or fabricate a host.

### New sport suggestion
Review governing-body or authoritative-source information where available. This type may require a separate editorial/catalogue decision and should not be confused with a listing for an existing sport.

## 4. Target submission sequence

1. Choose a category from the unified Contributor Centre.
2. Read category-specific requirements and privacy notice.
3. Complete required and optional fields.
4. Provide source links and evidence through supported channels.
5. Review a clear submission summary.
6. Confirm that information is accurate and that public display is subject to review.
7. Submit to the private intake boundary.
8. Receive a reference number and private tracking credential only after successful backend confirmation.
9. Save the tracking credential securely; it must not be exposed in public URLs, logs, analytics, or public catalogue records.
10. Track review progress and respond to a correction request if one is issued.

## 5. Existing status vocabulary

The inspected listing UI and workflow documentation use these states:

- `pending_review`
- `under_review`
- `changes_requested`
- `resubmitted`
- `approved`
- `published`
- `unpublished`
- `rejected`

Do not replace these database values with a new canonical enum without a schema compatibility review. Human-readable labels can be improved independently.

### Meaning must remain distinct

- **Submitted:** intake record was accepted by the backend.
- **Under review:** authorized reviewer has claimed/started review.
- **Changes requested:** contributor action is needed.
- **Approved:** editorial moderation decision is complete; still private.
- **Verified:** evidence decision is complete under the evidence policy; this is not equivalent to approval.
- **Published:** separate authorized publication action has made the catalogue record public.
- **Unpublished:** previously public record has been withdrawn/archived through the protected process.
- **Rejected:** submission was declined with a recorded reason.

The existing UI shows a five-step progress indicator; future UI should explain evidence verification separately without suggesting it is an automatic status transition.

## 6. Corrections and resubmission

The current page provides a tracking lookup and a resubmission form when the status permits it. The documented database workflow archives prior versions and returns corrected submissions to moderation.

Future improvements should:
- Show the correction request in contributor-safe language.
- Separate public correction instructions from moderator-only notes.
- Allow edits only while the submission state and credential authorize them.
- Preserve version history and audit records.
- Return the submission to the protected review queue.
- Avoid exposing reviewer identity or internal access metadata.

## 7. Submission communications

- Show a success message only after the RPC returns a valid submitted status and both reference and tracking credentials.
- If the backend is unconfigured or unavailable, say no database submission was confirmed.
- Do not generate a fake reference number.
- Do not promise an approval timeline unless an operational service-level commitment exists.
- Keep direct email clearly labelled as manual email intake, not instant database submission.

## 8. Deferred workflow capabilities

- Full contributor account dashboard and multi-submission inbox.
- Save/resume for directory listings.
- Secure file upload for contributor evidence.
- Email notifications with delivery and consent controls.
- Duplicate suggestions and merge workflow.
- Contributor-side withdrawal.
- Category-specific structured database columns or JSON schema, after compatibility and migration review.
