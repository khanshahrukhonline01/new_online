# Contributor Centre — Security and Moderation

**Status:** Source-reviewed security baseline and target requirements  
**Reviewed:** 2026-11-22

## 1. Security boundary

The browser is untrusted. Hiding a button, protecting a route visually, or validating a form in React is not authorization.

The existing listing workflow documentation places sensitive decisions in PostgreSQL RLS and protected RPCs. The Contributor Centre must use that same boundary.

## 2. Existing source-reviewed controls

The repository contains the following documented/source-level controls:

- `submit_listing_intake()` is the public intake RPC; the browser does not directly insert a listing row.
- `20261112140000_harden_public_listing_intake_rpc.sql` validates supported listing types, title/city/details/source/email lengths and HTTPS source URL format, and applies gateway-aware rate limiting.
- `20261112125000_allow_anonymous_listing_intake.sql` permits a nullable submitter ID for anonymous intake.
- `20261110143000_phase_core_catalogue_listing_integrity.sql` documents a private submission queue, protected moderator retrieval, and restrictions on direct public catalogue writes.
- `docs/LISTING_SUBMISSION_MODERATION_SOP.md` documents separate editorial review, evidence verification, and publication roles.
- `docs/LISTING_MODERATION_WORKFLOW.md` documents explicit status transitions, protected moderator RPCs, version checks, audit records, publication, and unpublication.
- `docs/policies/FREE_DIRECTORY_LISTING_AND_VERIFICATION.md` documents free listing intake and prohibits paid verification/approval.

These are repository findings. They do not prove that a remote database has every migration applied or that the live deployment is configured correctly.

## 3. Required role tests

| Actor | Required expected behavior |
|---|---|
| Anonymous visitor | May submit only through the approved public intake RPC; cannot read pending submissions or moderator/evidence records |
| Ordinary authenticated user | May submit through the approved path; cannot read or mutate other users' private queue records or perform moderation |
| Authorized moderator | May access only protected queue/evidence/review actions allowed by the moderator role and assignment/state rules |
| Super-admin | May perform explicitly privileged access-management and moderation operations; no self-promotion or public bootstrap |
| Service role | Server-side only; never expose its key in browser bundles, Vite variables, source control, logs or user-facing documentation |

Tests must include both allowed operations and explicit denial assertions. UI-only tests are insufficient for RLS and RPC authorization.

## 4. Moderation invariants

1. Submission is private by default.
2. The submitter cannot approve, verify, publish, or assign a moderator role to their own record.
3. Moderator queue access is protected by database authorization.
4. Evidence review is distinct from editorial approval.
5. Approval does not publish a catalogue record.
6. Publication requires a separate authorized operation and category-specific data validation.
7. Unpublication requires a reason and preserves history.
8. Republishing must not create duplicate catalogue rows.
9. Moderator-only notes, reviewer identities, internal IDs, access audits and evidence review metadata must not leak to contributors or public readers.
10. Public catalogue readers must see only eligible published records according to the category-specific publication and verification policy.

## 5. Evidence handling

### Current limitation

The inspected public listing form accepts an optional HTTPS source URL and free-text details. It does not provide a listing evidence file-upload workflow.

The moderation SOP describes evidence management in `/admin/control`. Do not imply that contributor uploads are already connected to that evidence system.

### Requirements before enabling contributor uploads

- Define private storage bucket and object ownership.
- Enforce authenticated/anonymous upload authorization server-side.
- Restrict file types, MIME sniffing, file size and file count.
- Generate non-guessable object names; do not trust user filenames.
- Prevent executable content and unsafe inline rendering.
- Keep pending evidence private; use short-lived signed access only for authorized reviewers.
- Scan files where a supported affordable service is approved; do not silently introduce paid infrastructure.
- Record uploader, submission association, checksum, content type, size, and timestamps.
- Define deletion/retention and withdrawal behavior.
- Test cross-submission access denial and path traversal/object-key manipulation.

Do not implement uploads until storage policy, backend contract and abuse controls are reviewed.

## 6. Privacy and data minimization

- Keep submitter email, tracking key, private contact details and evidence out of public catalogue rows unless a field is explicitly intended for public display and the contributor has been informed.
- Do not place tracking keys in analytics, third-party links, referrer-bearing URLs, public logs, or screenshots.
- Keep internal moderation notes separate from correction messages.
- Avoid publishing private home addresses, personal phone numbers, minors' sensitive information, or documents beyond the public purpose.
- Provide clear correction, withdrawal, retention and contact paths.
- Treat submitted URLs and documents as untrusted. Reviewers must not enter credentials into linked sites.

## 7. Abuse and integrity controls

- Retain server-side validation and gateway-aware rate limiting.
- Add duplicate detection as a reviewer aid; do not auto-merge unrelated submissions.
- Consider CAPTCHA only if measured abuse requires it and an approved no-cost option is available.
- Reject malformed/unsupported category types at the database boundary.
- Validate category publication fields again at the protected publication operation.
- Preserve actual addresses, organizers, hosts, dates, qualifications and source provenance; missing data must remain missing rather than be inferred.
- Add tests for replay, concurrent moderator actions, stale versions, duplicate publication, expired opportunities, and unpublish/republish.

## 8. Required acceptance matrix

At minimum test:
- Public intake: valid, invalid, unsupported type, overlong fields, malformed/non-HTTPS source, rate limit, missing gateway identity.
- Queue privacy: anonymous and ordinary authenticated SELECT denial.
- Tracking: valid reference/key, invalid key, mismatched key, expired/unknown reference; no internal notes leakage.
- Resubmission: only eligible status and valid tracking credential; version history retained.
- Moderator: unauthorized access denied; authorized action requires correct state and expected version.
- Evidence: private by default, reviewer-only access, cross-submission denial, decision prerequisites.
- Publication: approval alone remains private; verified evidence and required category data are required; idempotency prevents duplicate rows.
- Unpublication: reason required; public visibility removed; history preserved.
- Service role: no client exposure.
- Catalogue: unpublished and unverified records excluded according to the documented category policy.

## 9. Operational guardrails

- No production database access or changes as part of Contributor Centre design/documentation.
- Development migrations require explicit project-reference confirmation, backup, migration-order review and a separate approved task.
- No payment activation or listing charges.
- No deployment, DNS, secrets or environment changes without separate approval.
