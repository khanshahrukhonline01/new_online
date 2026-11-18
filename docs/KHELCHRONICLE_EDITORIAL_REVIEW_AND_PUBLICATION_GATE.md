# KhelChronicle Editorial Review and Publication Gate

## Current operating mode

KhelChronicle is an editorially moderated research archive. Public submissions are intake records only; they are not published automatically and are not endorsements of the underlying research.

The three initial seeded manuscript examples remain in the database for editorial review, but their status is `pending_review`. They are not visible to anonymous readers.

## Submission requirements

The public intake endpoint accepts only records that satisfy all of the following:

- A manuscript title, supported article type, category, primary author name, valid email and affiliation.
- An abstract of at least 50 characters and non-empty keywords.
- A real HTTPS link to the complete manuscript. Direct file upload is not enabled; the browser file picker must not be represented as an upload.
- An explicit data-availability statement.
- An ethics clearance number or documented not-applicable declaration.
- Human-subjects and minor-athlete consent declarations.
- An explicit selection and confirmation of one supported Creative Commons licence.
- The submission is created with `pending_review` status.

The database RLS policy enforces the required fields independently of browser validation. A caller cannot bypass these requirements by sending a direct REST request.

## Access and privacy

- Anonymous users may INSERT a compliant pending submission.
- Anonymous users cannot SELECT submission records.
- Authenticated non-administrators cannot read or modify the editorial queue.
- The current administrative permission boundary uses `public.is_pickup_game_admin()`; only authorized KhelGrid administrators can read or update submissions and manuscript records.
- Submission contact details remain in the private submission table and are not copied to public manuscript records by the client.

## Review workflow

1. **Pending review** — submission received; no public visibility.
2. **Revision requested** — editor records a reason in `review_notes`; submitter must provide a revised record through the supported workflow.
3. **Approved** — allowed only when the manuscript URL, author details, abstract, keywords, ethics and consent declarations, data availability and licence are complete.
4. **Rejected** — requires an editorial reason in `review_notes`.

The database records the reviewer identity and review timestamp when the status changes.

## Publication requirements

A public `chronicle_papers` record must include:

- Stable paper ID, slug, title, category, publication date and version.
- A structured author array; every author must have a name and affiliation.
- A structured abstract with background, methods, results and conclusion.
- Non-empty manuscript sections and reference list.
- Keywords, ethics statement, data-availability statement, funding statement and conflict-of-interest statement.
- An explicit supported licence.

A database trigger blocks transition to `published` when any required field is missing. Anonymous readers can see only published records that pass this database gate. The client additionally rejects incomplete records and does not use local synthetic manuscript or author fixtures as fallbacks.

## Current limitations

- Direct PDF/DOCX upload is not connected to a secure storage workflow. Authors must provide an HTTPS manuscript link.
- The public archive intentionally remains empty until a complete manuscript is reviewed and approved.
- The administrative database permissions exist, but the dedicated KhelChronicle moderation screens and role-specific editorial acceptance tests still need implementation.
- The existing seeded submissions predate the consent schema. Their consent fields remain false; they cannot be approved without fresh, genuine declarations.

## Safety constraints

This workflow does not delete existing submission or paper rows. It does not change production databases, production deployments, DNS, or payment settings.
