# Contributor Centre — Implementation Roadmap

**Status:** Proposed roadmap based on source review  
**Reviewed:** 2026-11-22

## Guiding rule

Build on the existing intake, tracking, moderation, evidence, and catalogue architecture. Do not rebuild a second system. Every phase must preserve existing routes and the free-submission policy. Work on a non-production branch and use isolated tests. Database work must be separately reviewed and explicitly authorized.

## Phase 1 — Architecture audit and documentation

**Status:** Source-reviewed documentation baseline prepared.

Deliverables:
- Current implementation inventory.
- Category mapping and known gaps.
- Contributor journey and route compatibility.
- Security/moderation boundary.
- KhelChronicle separation.
- Acceptance matrix and phased plan.

Completion evidence: reviewed docs and repository paths. This document does not claim runtime or database verification.

## Phase 2 — Contributor Centre landing page and category selector

**Goal:** Make the single entry point understandable and category-driven.

Scope:
- Create the Contributor Centre landing experience.
- Present six primary categories: venues, trials/opportunities, academies, coaches, events/competitions, community/pickup games.
- Keep New Sport Suggestion as a distinct additional route/type where appropriate.
- Link to existing supported `/submit-listing?type=...` values.
- Preserve `/submit-listing` and coach deep link.
- Explain free submission and evidence review; no guarantee of approval/publication.
- Link to KhelChronicle separately.

Acceptance:
- Every category link maps to a verified existing type/route.
- No dead or invented routes.
- All existing direct links still preselect correctly.
- No duplicate top-level submission CTAs.
- Responsive and keyboard-accessible category selection.

## Phase 3 — Structured category-specific forms

**Goal:** Replace the current mostly shared form plus concatenated helper text with category-specific, validated contributor forms.

Scope:
- Define a versioned frontend/backend contract for each existing listing type.
- Make required vs optional fields explicit.
- Preserve source provenance and missing-value semantics.
- Validate on both client and database/server boundary.
- Do not add schema columns or migrations without a separate design, migration-order review and approval.

Acceptance:
- Each category's data is not silently dropped or flattened ambiguously.
- Existing intake types and RPC compatibility are preserved or migrated with explicit compatibility tests.
- No city-as-address or invented event details.
- Old clients/routes continue to fail safely or remain compatible.

## Phase 4 — Evidence Centre and secure upload workflow

**Goal:** Provide safe contributor evidence submission if approved.

Prerequisites:
- Storage threat model and ownership model.
- Bucket privacy and RLS policy design.
- Upload size/type/count validation.
- Malware/content handling decision.
- Signed reviewer access.
- Retention/deletion policy.
- Cross-submission authorization tests.

Acceptance:
- Evidence is private by default.
- Submitter cannot read another submission's files.
- Public catalogue never exposes private evidence.
- Moderator evidence decisions are auditable.
- No paid provider is added without approval.

## Phase 5 — Contributor tracking and correction workflow

**Goal:** Improve the existing reference/key tracking into a clear contributor experience.

Scope:
- Status timeline and clear labels.
- Contributor-safe correction requests.
- Secure resubmission.
- Version history.
- Clear manual-email fallback distinction.
- Optional account-linked view only after auth design.

Acceptance:
- Tracking key is treated as a secret.
- Invalid keys reveal no submission details.
- Moderator-only notes remain private.
- Resubmission is state-gated and audited.

## Phase 6 — Admin Control Center integration

**Goal:** Ensure one reliable reviewer workspace.

Scope:
- Continue existing `/admin` and `/admin/control` workflow.
- Improve category filters, evidence review, correction reasons, audit visibility and publication data entry only where gaps are proven.
- Do not create a second moderation system.

Acceptance:
- Every sensitive action is server-authorized.
- Role and state checks are enforced in PostgreSQL.
- Optimistic concurrency/version checks work.
- Unauthorized users receive no queue/evidence data.
- Reviewer actions are auditable.

## Phase 7 — Catalogue publication integrity and data quality

**Goal:** Make only eligible, approved, verified records publicly discoverable.

Scope:
- Enforce category-specific publication requirements.
- Keep approval, verification and publication distinct.
- Detect duplicate destination records.
- Preserve idempotent publish/unpublish/republish behavior.
- Expire or withdraw stale listings through a reasoned workflow.
- Preserve source provenance and last-reviewed metadata where supported.

Acceptance:
- Approval alone does not create public visibility.
- Unverified/unpublished rows do not appear in public catalogue readers.
- No duplicate rows on retry/republish.
- Public data contains no private contributor fields.
- Actual event/venue/host details are required where the category demands them.

## Phase 8 — Security, privacy, accessibility and end-to-end acceptance

**Goal:** Establish release evidence across all trust boundaries.

Required tests:
- Anonymous, ordinary authenticated, moderator, super-admin and service-role cases.
- RLS/RPC negative tests.
- Submission validation and abuse controls.
- Tracking and correction privacy.
- Evidence storage access.
- Publication and unpublication integrity.
- Keyboard/screen-reader/mobile behavior.
- Browser tests across supported routes.
- Performance and regression checks.

Release gate:
- Tests run against isolated local/test infrastructure first.
- No production DB or live deployment is used as a test fixture.
- Exact commit, environment and results are recorded.
- No unresolved critical authorization or privacy defect.

## Separate track — KhelChronicle

KhelChronicle research/manuscript intake remains separate from ordinary listings. Its own route, client, data model, ethics/consent declarations, editorial decision and publication gate must be maintained. The Contributor Centre may link to the research submission experience; it must not merge research manuscripts into `listing_submissions`.

## Deferred / not in scope

- Listing fees, paid verification, paid approval or paid ranking.
- Payment checkout for ordinary listing intake.
- Automatic publication.
- Contributor self-verification.
- A second Admin Control Center.
- New external paid storage/scanning providers without approval.
- Production migrations or deployments.
