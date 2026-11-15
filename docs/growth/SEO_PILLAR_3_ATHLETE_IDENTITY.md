# Pillar 3 — Athlete Identity, Sports CV & Khel ID SEO

**Status:** In development — scope and safety audit started  
**Branch:** `feat/seo-pillar-3-athlete-identity`  
**Base:** `main` at `59a8e102d7c167e550467ae02c96ad02a2854ce8`  
**Release rule:** development/preview only; no production database, environment, domain, DNS or deployment changes.

## Objective

Make genuine athlete profiles and athlete-controlled Sports CV pages reliably shareable and discoverable, with stable canonical URLs and accurate metadata. Do not imply that a profile, achievement, credential, measurement, Khel ID, scout connection or verification has been independently validated unless the underlying trusted workflow proves it.

## Existing implementation found on main

- Public athlete routes already resolve at `/u/:username`; `/athlete/:username` is an alias.
- The Sports CV wizard exists at `/sports-cv`, creates a local draft and contains a publish flow.
- Athlete profile reads query `athlete_profiles` for `publication_status=published`.
- The athlete profile page currently renders a local showcase profile before/alongside the database read.
- Athlete profile metadata is not currently handled by a dedicated `/u/:username` branch in `getRouteSeoMetadata`; it falls through to generic page metadata.
- The profile UI currently renders the “Verified Sports CV” badge without checking the profile's verification status.
- The client publish helper currently assigns `verificationStatus: 'verified'`, writes `verification_status='verified'` and `publication_status='published'`, saves a local profile before confirming a successful server write, and returns a published result even if the network write fails.
- The local showcase profile map contains named sample records and placeholder YouTube links. These must not be treated as genuine public athlete records or indexed pages.
- The existing profile shape contains sensitive or potentially sensitive fields (for example date of birth, contact details and guardian details in the CV wizard). SEO and public share payloads must use an explicit allowlist and never serialize the full draft/profile object.

These observations are code-level findings, not proof of the current production database contents or deployed website behaviour.

## Non-negotiable trust and privacy rules

1. A public profile must come from a real server record with an explicit published state and a documented public-sharing/consent basis.
2. A public profile must not be synthesized from browser local storage, a demo/showcase map, a guessed username, or a cached private draft.
3. Network failure, missing Supabase configuration, RLS denial or a failed write must never be reported as a successful publication.
4. Publishing a profile must not set verification status to verified. Verification is a separate trusted review process and must remain unchanged by self-publication.
5. Display a verification badge only when a trusted server value supports it; use a clear “Community profile” or no badge otherwise.
6. Never expose date of birth, phone, email, guardian details, federation identifiers, private notes, or unapproved biometrics in public pages, JSON-LD, Open Graph tags, sitemaps or share URLs.
7. Profiles belonging to minors require an explicit privacy/consent review before public indexing or broad sharing. Do not infer consent from account creation or a completed wizard.
8. Unknown, unpublished, withdrawn, private, unverified-for-publication, or consent-missing records must not receive indexable metadata or structured data.
9. No fabricated athlete biographies, achievements, rankings, test results, coach affiliations, team affiliations, scout endorsements, or verification claims.
10. Do not change Supabase RLS, table grants, policies or migrations as part of an SEO-only change without a separate schema/security review and explicit approval.

## Canonical URL policy

- Canonical public handle route: `/u/:username`.
- Legacy alias: `/athlete/:username`; it should resolve to the same record and canonicalize/redirect to `/u/:username`.
- Normalize handles consistently, reject malformed or ambiguous handles, and do not silently change a previously assigned public handle.
- Khel ID is an identifier/display feature, not proof of identity or verification. Do not use it as a public URL key unless uniqueness, ownership, reassignment and privacy rules are established.
- Keep `/sports-cv` as the builder route. A private draft is not a public CV URL.
- Do not add profile URLs to the sitemap until publication, consent, indexability and server-side visibility gates are proven.

## Delivery phases

### 3.0 — Data, route and trust audit
- Inspect athlete table schema, RLS policies, grants, publication and verification transitions, owner identity, deletion/withdrawal handling and any consent fields.
- Trace all routes, cache layers, local storage fallbacks, publication writes, profile reads, QR generation and share/export behaviour.
- Identify public-safe fields and explicitly private fields.
- Record whether the current database can prove public consent and verified status; if not, keep affected pages noindex and do not invent a substitute.

### 3.1 — Truthful profile rendering
- Remove showcase/demo/local-draft fallbacks from the public route.
- Use server-returned publication state and a documented public-safe projection.
- Make verification labels status-dependent.
- Render honest loading, unavailable, unpublished/private and not-found states.
- Ensure a write is called published only after the server confirms the persisted row and its returned status.

### 3.2 — Stable routes and metadata
- Keep `/u/:username` canonical and test `/athlete/:username` alias behaviour.
- Add unique title, description, canonical URL and Open Graph profile metadata only after the public record is loaded and eligible.
- Unknown, private, unpublished, withdrawn or consent-ineligible profiles must be `noindex, nofollow` and must not emit profile structured data.
- Metadata must be derived only from public-safe fields and match visible page content.

### 3.3 — Structured data and share cards
- Use conservative Schema.org `ProfilePage` / `Person` data only when the public page qualifies.
- Include only public-safe name, sport/role, public locality and profile URL where supported.
- Do not add `sameAs`, awards, affiliations, credentials, gender, birth date, ratings or endorsements unless sourced and approved.
- Ensure Open Graph/Twitter previews contain no private data and do not imply verification.
- QR codes should point to the canonical public URL and respect withdrawal/revocation.

### 3.4 — Sitemap and indexability
- Add only eligible public athlete profiles from a read-only, published + consented dataset.
- Exclude drafts, private profiles, sample fixtures, admin/scout pages and all unavailable records.
- Preserve the existing `VITE_SITE_INDEXABLE` preview/production guard; do not enable indexing in development by default.
- Confirm sitemap, robots, canonical and rendered page behaviour together.

### 3.5 — Acceptance and release gate
- Unit tests: route aliases, handle normalization, metadata allowlist, status-specific badges, structured-data eligibility and privacy exclusions.
- Integration tests: published/consented profile, community/unverified profile, private profile, unpublished profile, withdrawn profile, unknown handle, RLS denial, network timeout and publication write failure.
- Browser tests: direct URL load, refresh, back/forward, copy/share/QR, mobile rendering and social metadata inspection.
- Verify no private CV values appear in HTML, JSON-LD, metadata, sitemap, logs or public API responses.
- Run CI and inspect a development preview. Do not declare released or indexable until evidence passes.

## Current blockers / decisions required from implementation evidence

- Confirm whether `athlete_profiles` has a consent/public-sharing field and how consent is recorded, especially for minors.
- Confirm whether the database's verification status is written only by a trusted moderator/service-role workflow.
- Confirm whether existing profile rows and the showcase records are real, consented and authorized for public display. Until confirmed, do not index them.
- Confirm whether the existing Khel ID generator produces a globally unique, stable identifier or only a local display reference.

## Acceptance summary

Pillar 3 is complete only when real public profiles have stable URLs, accurate per-profile metadata, safe share cards and conservative structured data; private drafts and sensitive fields remain private; verification is never self-assigned; and all tests plus preview checks pass. SEO ranking gains are not guaranteed.
