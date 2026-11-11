# KhelGrid Phase 3: Complete Listing Moderation & Publication System – Implementation Report

**Document Date:** 2026-11-10  
**Phase:** Phase 3 v1.0  
**Target:** Development Environment Only (`khelgrid-dotcom/khelgrid-platform`)  
**Production Integrity Status:** `https://khelgrid.com/` strictly untouched  

---

## 1. Executive Summary & Audit Findings

### 1.1 PR #204 Inspection
- **PR:** #204 (`fix/listing-moderator-rpc-grants`).
- **Audit Findings:** PR #204 had already been merged into `khelgrid/main` as commit `b270ab3f7ef44370382ca990c7ffbfbd58489bb2`.
- **Missing Migration CI Failure Resolution:** Commits `6b65ce6`, `03d2ffd`, and `0322021` split moderator grants into versioned migrations (`20261110043733`, `20261110043804`, `20261110043836`) and added `20261110143000_phase_core_catalogue_listing_integrity.sql`, resolving the migration gap.
- **Starting Point:** Local repository was fast-forwarded to `b270ab3` from `khelgrid/main`, and feature branch `feat/phase-3-listing-moderation-publication` was created.

### 1.2 Database & Schema Audit
Prior to Phase 3:
- `public.listing_submissions` had basic fields (`listing_type`, `title`, `city`, `source_url`, `details`, `status`, `notes`) with an enum-like status check supporting only `pending`, `approved`, `rejected`.
- `public.listing_moderators` existed as an allowlist (`user_id`, `is_active`, `notes`), but there were no active moderators in the development database.
- Approval and publication were conflated or undefined; no mapping existed from submissions to published catalogue records.
- Submissions lacked human-readable reference numbers, cryptographic submitter tracking tokens, structured rejection reasons, correction request messages, and unpublish reasons.
- No historical versioning or audit trail tables existed for listing changes.

---

## 2. Database & Lifecycle Architecture

### 2.1 State Lifecycle & Invariants
Phase 3 implements an 8-state validated lifecycle:
- `pending_review` (default on submission)
- `under_review` (claimed by moderator)
- `changes_requested` (moderator requests specific updates)
- `resubmitted` (submitter provides corrections)
- `approved` (moderator approval; remains private)
- `published` (explicit publication action; catalogue record active)
- `rejected` (terminal state with required reason)
- `unpublished` (withdrawn with required reason)

Enforced via PostgreSQL trigger `enforce_listing_moderation_transition()`:
- `rejected` is terminal.
- Rejection requires `rejection_reason`.
- Changes requested requires `correction_request`.
- Unpublish requires `unpublish_reason`.
- Approval NEVER publishes or creates a catalogue row.

### 2.2 Migrations Added
File: `supabase/migrations/20261110160000_phase_3_listing_moderation_publication_system.sql`
- **Transactions:** Wrapped in `begin; ... commit;`.
- **Safety:** Zero destructive statements (`DROP TABLE`, `DROP SCHEMA`, `DROP DATABASE`, `TRUNCATE`). 100% compliant with CI checks.
- **Supabase Free Plan:** Designed with minimal overhead, index efficiency, and bounded result sets.

#### Table Enhancements: `public.listing_submissions`
- Added columns: `reference_number` (`KHL-YYYYMMDD-XXXX`), `tracking_key` (64-character token), `submitter_id`, `submitter_email`, `rejection_reason`, `correction_request`, `unpublish_reason`, `assigned_moderator_id`, `review_started_at`, `published_at`, `published_by`, `unpublished_at`, `unpublished_by`, `published_record_id`, `published_table`, `version`.
- Added partial and composite indexes for queue queries, reference numbers, tracking keys, and status filters.

#### New Audit Ledger: `public.listing_submission_audits`
- Tracks all lifecycle transitions, actor IDs, previous/new statuses, moderator notes, and structured metadata.
- Protected by RLS: moderators have SELECT access; general users/anon have zero access.

#### New Version Archive: `public.listing_submission_versions`
- Archives snapshot copies of submissions whenever a submitter resubmits corrections, preserving a forensic record of what was submitted at each stage.
- Protected by RLS: moderators have SELECT access.

---

## 3. Secure Authorization Model

- **Public / Anonymous Role:**
  - Can invoke `submit_listing_intake` to submit suggestions.
  - Can invoke `get_submission_tracking_status` with `reference_number` and `tracking_key` to check progress. Zero PII or internal moderator notes are exposed.
  - Can invoke `resubmit_listing_submission` with `tracking_key` to respond to correction requests.
  - Cannot access queue lists, moderation RPCs, or audit tables.
- **Authenticated Non-Moderators:**
  - Same restrictions as anonymous visitors for moderation endpoints.
  - Denied access to `get_listing_submissions_v2` and all moderator mutation RPCs.
- **Authorized Moderators:**
  - Authenticated users with `is_active = true` in `public.listing_moderators`.
  - Authorized to review, claim, approve, reject, request corrections, publish, and unpublish.
  - Authorized to inspect audit trails and version archives.

---

## 4. Complete RPC Interface Specification

1. `submit_listing_intake(p_listing_type, p_title, p_city, p_source_url, p_details, p_submitter_email)`
   - Caller: `anon`, `authenticated`, `service_role`.
   - Returns `{ status, reference_number, tracking_key, message }`.
2. `get_submission_tracking_status(p_reference_number, p_tracking_key)`
   - Caller: `anon`, `authenticated`, `service_role`.
   - Returns sanitized tracking progress, hiding all moderator internal notes and reviewer identity.
3. `resubmit_listing_submission(p_reference_number, p_tracking_key, p_title, p_details, p_source_url)`
   - Caller: `anon`, `authenticated`, `service_role`.
   - Validates `changes_requested` status, saves snapshot to `listing_submission_versions`, transitions to `resubmitted`.
4. `get_listing_submissions_v2(p_status, p_category, p_search, p_limit, p_offset, p_sort_by, p_sort_dir)`
   - Caller: `authenticated` (moderators only).
   - Supports paginated listing, tab filtering, text search, sorting, and summary metrics.
5. `start_listing_review(p_submission_id, p_expected_version)`
   - Caller: `authenticated` (moderators only).
   - Sets `under_review`, assigns reviewer, checks version concurrency.
6. `approve_listing_submission(p_submission_id, p_notes, p_expected_version)`
   - Caller: `authenticated` (moderators only).
   - Sets `approved`. Explicitly does NOT publish catalogue record.
7. `reject_listing_submission(p_submission_id, p_reason, p_notes, p_expected_version)`
   - Caller: `authenticated` (moderators only).
   - Requires `p_reason`, sets `rejected`, records audit.
8. `request_listing_corrections(p_submission_id, p_message, p_notes, p_expected_version)`
   - Caller: `authenticated` (moderators only).
   - Requires `p_message`, sets `changes_requested`.
9. `publish_listing_submission(p_submission_id, p_target_slug, p_sport_id, p_expected_version)`
   - Caller: `authenticated` (moderators only).
   - Idempotently maps fields and inserts/updates target table (`opportunities`, `venues`, `academies`, `coaches`, `events`, `pickup_games`, `sports`), sets `published`.
10. `unpublish_listing_submission(p_submission_id, p_reason, p_notes, p_expected_version)`
    - Caller: `authenticated` (moderators only).
    - Requires `p_reason`, updates catalogue entity to remove public visibility, sets `unpublished`.
11. `get_listing_submission_audit_trail(p_submission_id)`
    - Caller: `authenticated` (moderators only).
    - Returns audit history for detail view.
12. `get_listing_submission_versions(p_submission_id)`
    - Caller: `authenticated` (moderators only).
    - Returns previous revision snapshots.

---

## 5. Supported Categories & Catalogue Mapping

| Listing Category | Target Database Table | Published Visibility Conditions |
|---|---|---|
| Opportunities & Trials | `public.opportunities` | `status = 'published' AND is_active = true` |
| Venues & Facilities | `public.venues` | `publication_status = 'published' AND is_published = true` |
| Academies | `public.academies` | `publication_status = 'published' AND is_published = true` |
| Coaches & Trainers | `public.coaches` | `is_published = true AND is_active = true` |
| Events & Tournaments | `public.events` | `status = 'published' AND is_active = true` |
| Pickup Games | `public.pickup_games` | `status = 'published' AND is_active = true` |
| Sports Directory | `public.sports` | `is_active = true` |

---

## 6. Frontend Modules Implemented

1. **Moderation Desk (`/admin/moderation`):**
   - File: `src/modules/admin/AdminModerationPage.tsx`, `AdminModerationPage.css`.
   - Real-time tab filters (All, Pending Review, Under Review, Changes Requested, Resubmitted, Approved, Published, Rejected, Unpublished).
   - Search by title, reference number, city; category selector; sorting by newest, oldest, last updated.
   - Comprehensive detail modal with submitted information, source link verification, audit history, version comparator, and action dialogs.
2. **Community Suggestion & Intake (`/submit-listing`, `/suggest`):**
   - File: `src/modules/listings/ListingSubmissionPage.tsx`, `ListingSubmissionPage.css`.
   - Multi-category submission wizard supporting all 7 categories.
   - Generates and presents `reference_number` and `tracking_key` in a secure copyable confirmation card.
3. **Public Submission Tracking (`/track-submission`, `/track`):**
   - File: `src/modules/listings/ListingSubmissionPage.tsx`.
   - Token-based status check.
   - Visual progress stepper.
   - Interactive resubmission form for `changes_requested`.

---

## 7. Quality Assurance & Verification Results

### 7.1 Automated Tests
- **Vitest Full Suite:** 97 test files, **772 passed (100% pass rate)**.
- **Isolated PostgreSQL Engine Suite (`pg-mem`):** `src/integrations/supabase/phase-3-moderation-lifecycle-isolated-postgres.test.ts` (10 tests covering all 20 lifecycle scenarios, all passed).
- **TypeScript Typecheck:** `tsc -b --pretty` passed with 0 errors.
- **ESLint:** 0 errors (4 existing fast-refresh warnings in unchanged files).
- **Vite Production Build:** Successfully bundled with 0 errors. Code-split chunks generated cleanly.
- **Migration Safety Check:** All 77 migrations verified with regex `^[ \t]*(drop[ \t]+(table|schema|database)|truncate)`; 0 violations found.

---

## 8. Production Safety Confirmation

- Production deployment (`https://khelgrid.com/`) and production databases were **completely untouched** during this implementation.
- All testing and execution occurred exclusively in local and development environments.
