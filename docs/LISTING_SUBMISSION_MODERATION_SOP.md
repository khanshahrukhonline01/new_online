# Listing submission and moderation SOP

## Current scope

The public `/submit-listing` page inserts suggestions into `public.listing_submissions`. New records default to `pending_review`; they are not public catalogue records. Public and authenticated client roles may insert only the submitted listing fields and cannot read, update, approve, reject, or delete queue records.

## Required review process

1. Open the Supabase Dashboard for the intended development project using an individually authorized operator account.
2. Review `listing_submissions` in the Table Editor or SQL Editor. Do not expose the queue through a public page or browser API.
3. Check the official HTTPS source, organiser identity, title, city, event dates, eligibility, fees, and whether the information is current. Do not mark identity or venue details as verified without evidence.
4. Reject duplicate, misleading, expired, unsupported, suspicious, or privacy-invasive suggestions.
5. For an approved suggestion, create/update the appropriate catalogue row (`sports`, `opportunities`, or `venues`; coach/academy/event records require their own approved schema). Use a unique valid slug and retain source provenance. Never copy a suggestion directly into public content without review.
6. Set `publication_status = 'published'` only after source review. For opportunities, use `verification_status = 'verified'` only when evidence supports that label. Approval in the intake queue alone does not publish anything.
7. Update the queue status and review metadata in the same controlled operator transaction. Record concise moderation notes without collecting unnecessary personal information.
8. Verify the new row is returned by the public catalogue client and that a draft/rejected record remains invisible. Re-check RLS after policy changes.

## Database access model

- `anon` and `authenticated`: INSERT on the five submitted fields only, constrained by an RLS check requiring `pending_review` and empty review metadata.
- `anon` and `authenticated`: no SELECT, UPDATE, or DELETE policy for submissions.
- `service_role`: trusted server-side processing only. Never expose this key in Vite variables, source control, client bundles, logs, or support messages.
- Moderation is intentionally performed by a trusted operator in the Supabase Dashboard for this phase. Login is paused, so this release does not add an unauthenticated moderator UI or claim to have a fully automated approval console.
- Public catalogue rows remain visible only through the existing published-only RLS policies.

## Operational safeguards

- Treat all submitted text and URLs as untrusted. Verify links manually; do not automatically fetch arbitrary URLs from the server.
- The form validates HTTPS and field lengths, but client validation is not a security boundary; database constraints and grants are authoritative.
- Monitor abuse and use a CAPTCHA or server-side rate limit before promoting this public intake endpoint broadly. Do not introduce paid services without approval.
- Keep audit/backup practices aligned with the project’s existing migration and backup SOP.
- Before production rollout, obtain owner approval, test with anon/authenticated roles, review Supabase security advisors, and verify the Vercel preview.
