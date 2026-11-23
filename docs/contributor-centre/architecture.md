# Contributor Centre — Architecture

**Status:** Source-reviewed baseline plus proposed target architecture  
**Baseline:** `main@f17b4df919b367f0030e2966da1f2212e11a85b2`  
**Reviewed:** 2026-11-22

## 1. Architecture boundary

The Contributor Centre is the contributor-facing boundary around the existing listing-intake system. It must not become a second database, a second moderation engine, or a replacement for the public catalogue.

### Target logical flow

```text
Public navigation
  + List on KhelGrid
        |
        v
Contributor Centre
  category selection
  category-specific intake
  source/evidence guidance
  submission confirmation
  tracking and corrections
        |
        v
Existing private listing intake boundary
  submit_listing_intake(...)
        |
        v
Private listing_submissions queue
        |
        v
Existing Admin Control Center
  editorial review
  evidence verification
  category publication data
  approval
  explicit publication / unpublication
        |
        v
Published catalogue tables and public catalogue readers
```

This diagram is a target integration view. It does not assert that every target screen or evidence-upload step is already implemented.

## 2. Current frontend implementation

### Public intake

- Page component: `src/modules/listings/ListingSubmissionPage.tsx`.
- Existing listing types: `opportunity`, `venue`, `academy`, `coach`, `event`, `pickup_game`, `sport`.
- Query parameter `type` preselects a supported type; `/submit-listing?type=coach` is supported by the current component.
- The form currently captures a common title, city/location, optional HTTPS source URL, details, and optional submitter email, with a limited set of category helper fields.
- Category-specific values are combined into a text details field before the intake call. This is not yet a normalized per-category submission payload.
- The page contains submit, track, and direct-email modes.
- Tracking uses a reference number and private tracking key.
- Correction/resubmission is available when the returned state permits it.

### Navbar

- `src/shared/components/TopNavbar.tsx` contains the primary **+ List on KhelGrid** (`/submit-listing`) and **Submit Paper** (`/khelchronicle/submit`) header actions, placed beside the B2B cluster (`/organizations` and `/campaigns`).
- Introduced by PR #245 and refined under Top Navigation V2 architecture.
- A category dropdown and a dedicated Contributor Centre landing experience remain proposed work.
- Preserve existing navigation registry destinations and availability semantics in `src/shared/navigation/navigationRegistry.ts`.

### Admin moderation

- `src/modules/admin/AdminModerationPage.tsx` contains the moderator-facing listing workflow UI.
- The documented operational split is `/admin` for editorial review and `/admin/control` for evidence verification, category publication data, publication, and access management.
- Continue to use the existing Admin Control Center and protected database operations.

## 3. Current backend boundary

The inspected client defines `ListingSubmissionInput` with a fixed union of seven listing types and sends the payload to the Supabase RPC endpoint `/rest/v1/rpc/submit_listing_intake`.

The inspected migration `supabase/migrations/20261112140000_harden_public_listing_intake_rpc.sql` defines the RPC as a security-definer function with a constrained search path, validates allowed listing types and field lengths, validates HTTPS source URLs, applies gateway-aware rate limiting, and inserts a `pending_review` row. It returns a reference number and tracking key.

The migration `20261112125000_allow_anonymous_listing_intake.sql` makes `submitter_id` nullable for anonymous intake. This documents an intended anonymous-intake path; actual deployed database state is not verified by this repository review.

The migration `20261110143000_phase_core_catalogue_listing_integrity.sql` documents a private queue and restricts direct public catalogue writes, with catalogue reads governed by published-row policies.

## 4. Category model

| Contributor category | Existing listing type | Current status in source |
|---|---|---|
| Trials & Opportunities | `opportunity` | Existing intake type and helper fields |
| Sports Venues | `venue` | Existing intake type and helper fields |
| Coaches | `coach` | Existing intake type; coach deep link preserved |
| Academies | `academy` | Existing intake type and helper guidance |
| Events & Competitions | `event` | Existing intake type and helper fields |
| Community & Pickup Games | `pickup_game` | Existing intake type and helper fields |
| New Sport Suggestion | `sport` | Existing additional intake type; keep distinct from listing categories |

Do not introduce a new `competition` listing type unless a separate schema and publication workflow are approved. Existing events and tournaments may map to `event` only where the current backend and category rules support it.

## 5. Proposed frontend modules

These are future components, not existing implementation claims:

- Contributor Centre landing page and category selector.
- Category information cards with clear eligibility and evidence guidance.
- Category-specific forms with typed fields and category-level validation.
- Evidence attachment panel, only after secure storage policies and backend handling are designed and tested.
- Submission confirmation with reference number and private tracking instructions.
- Contributor status view and correction workflow.
- Link to the separate KhelChronicle research submission page.

A category selector may route into the existing `/submit-listing?type=...` flow during migration. Do not break old deep links or create parallel forms for categories already supported.

## 6. Evidence model

Current public listing intake supports an optional HTTPS source URL and free-text details. The inspected public form does not upload supporting files.

The moderation SOP describes evidence records reviewed by authorized staff in `/admin/control`. The contributor-facing secure evidence upload path is not established by the inspected listing page and must be designed as a separate, security-reviewed capability.

Do not store private evidence in public buckets or expose submitter credentials in evidence URLs.

## 7. Data ownership and source of truth

- `listing_submissions`: private intake and moderation lifecycle record.
- Category catalogue tables: public directory records only after authorized publication.
- Evidence records and review decisions: governed by existing protected moderation data model.
- Contributor tracking: reference number plus private tracking credential; do not expose moderator-only notes.
- KhelChronicle manuscript tables: separate editorial/research data model.

Do not duplicate listing state in browser storage as an authority. Client state is presentation only.

## 8. Route strategy

Preserve:
- `/submit-listing`
- `/submit-listing?type=coach`
- Existing supported `type` values.
- Existing `mode=track` and reference/tracking query handling.
- Existing `/admin` and `/admin/control` authorization boundaries.
- `/khelchronicle/submit` as a separate route.

A dedicated Contributor Centre landing route can be considered in a later phase, but its path must be checked against `src/shared/routing.ts` and route tests before adoption. Do not create a route collision or remove the existing entry point.

## 9. Non-goals

- No listing payment, paid verification, paid ranking, or payment checkout.
- No self-service direct publication.
- No second moderation centre.
- No KhelChronicle manuscript intake inside listing tables.
- No fake queue records, demo identities, or invented category data.
- No production database or deployment changes as part of documentation.
