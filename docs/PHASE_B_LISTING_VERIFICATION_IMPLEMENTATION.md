# Phase B – Free Listing Verification System

## Product rules

- Venue, coach, academy and sports-trial/opportunity submissions are free.
- A submission is not a published catalogue record.
- Editorial approval, evidence verification and publication are separate moderator decisions.
- Public directory rows must be both `publication_status = 'published'` and `verification_status = 'verified'`.
- Unverified legacy rows remain private/draft until evidence is reviewed. No missing details are fabricated.
- Listing verification is not a paid add-on. The legacy listing-subscription client method returns an explicit error, and the payment-intent Edge Function rejects `register_listing_subscription` with HTTP 410.

## Submission lifecycle

1. Submitter sends a validated request through `submit_listing_intake`.
2. The RPC validates type, title, city, optional HTTPS source, and request size; it applies a per-user or trusted-gateway-IP rate limit.
3. Anonymous callers cannot read or insert directly into the queue. The intake RPC returns a reference number and high-entropy tracking key.
4. Submitters can track or resubmit only with the reference number and tracking key. The queue, evidence, audit and publication records remain private.
5. An individually authorized moderator claims/reviews the submission, adds and assesses evidence, and records verification.
6. Editorial approval, evidence verification and publication are independently recorded. Publication requires verified evidence and category-specific structured details.
7. The publication-sync trigger updates the catalogue row only after the submission is published and verified.

## Access boundaries

- Anonymous: execute the validated intake and token-based tracking/resubmission RPCs; read only verified, published catalogue rows.
- Ordinary authenticated user: may submit and track their own records, but sees no moderation queue or evidence.
- Moderator: may access the protected queue and review/verify/publish assigned submissions; cannot approve their own submission.
- Super-admin: manages moderator roles and access-audit history. Users cannot self-promote; first super-admin bootstrap is a trusted database-operator action.
- Service role: backend maintenance only; never expose the service-role key to the browser.

## Catalogue handling

- Venue, coach, opportunity/trial, academy, event and pickup-game public reads require published + verified state.
- Pickup-game hosts retain their own authenticated host view; ordinary public readers do not see unverified games.
- Legacy unverified venues, coaches and trials are inserted into the private review queue with a stable catalogue-record link.
- Explicit `TEST ONLY — NOT A REAL LISTING` venue fixtures are rejected/unpublished without deleting their history.
- Evidence and access-audit tables remain deny-all to browser roles and are accessed through moderator-checked RPCs.

## Database changes

The development Supabase project has the Phase 3, Phase 3.1, Phase B intake, publication, verification, legacy-queue, function-hardening, FK-index and test-only-cleanup migrations applied. The migration chain was dry-run transactionally against the hosted development schema before application.

Phase B added 15 indexes for catalogue/moderation foreign keys. The Supabase performance advisor's unindexed-FK findings dropped from 18 to 3; the remaining findings are in athlete/payment audit tables outside Phase B.

## Verification

- SQL CI covers private queue access, anonymous intake validation/rate limiting, verified-only catalogue reads, legacy review/publication synchronization, trigger ACLs, FK indexes and explicit test-only cleanup.
- TypeScript typecheck, lint, Vitest and production build are part of the required CI job.
- Hosted development smoke tests confirmed: anonymous intake succeeds; missing trusted IP fails closed; ordinary authenticated users see zero queue rows; the active moderator sees the queue; unverified published rows are invisible to anonymous readers.
- No production database, production website, real payment credentials or live payment collection were changed.

## Operational follow-up

The development project currently has one active moderator and no active super-admin. The moderator can review and publish listings, but cannot manage moderator accounts until the project owner confirms which trusted account should be bootstrapped as the first super-admin. Keep the pull request unmerged until the latest CI run is green and the bootstrap account is confirmed.
