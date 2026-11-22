# Listing Verification & Moderation Workflow

## Business Rules Enforced
- Venue, coach, academy, event, pickup game, and trial listings remain **free**.
- Payment collection and subscription entitlements remain **disabled**.
- Verification and moderation are **mandatory** before public publication.

## Phase 1 UI Integrity Safeguards Implemented
- Removed all synthetic fact fabrication (`city: 'Delhi'`, `Near Sports Ground`, `Certified Sports Coach & Trainer`, synthetic future dates) from `AdminModerationPage.tsx` and `AdminAnalyticsDashboard.tsx`.
- Removed all automatic creation/approval of fake verification evidence pointing to `https://khelgrid.com/verify/<ref>`.
- Removed `"Auto-Fill Desk Verification URL"` shortcut from `AdminControlPanelPage.tsx` and added client-side rejection of synthetic `khelgrid.com/verify/*` and non-HTTPS URLs.
- Publishing from `AdminModerationPage` or `AdminAnalyticsDashboard` now invokes `publishListingSubmission` directly against server-side verification and completeness checks without inventing missing data.

## Pending Work (Phases 2 & 5)
- Revoke direct table `UPDATE`/`INSERT` on `listing_submissions` in Phase 2 SQL migration.
- Add server-side rejection of synthetic internal evidence URLs inside `add_listing_submission_evidence`.
- Consolidate duplicate moderation desks into a single canonical Phase 5 workflow.
