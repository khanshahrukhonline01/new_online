# List on KhelGrid — Contributor Centre

**Document status:** Source-reviewed architecture baseline  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Baseline branch:** `main`  
**Baseline commit:** `f17b4df919b367f0030e2966da1f2212e11a85b2`  
**Review date:** 2026-11-22

> This document distinguishes inspected repository implementation from proposed product architecture. Source inspection does not prove deployed runtime behaviour, database state, or successful end-to-end operation.

## 1. Product definition

**List on KhelGrid** is the single public contributor entry point for proposing sports-related directory and community listings. **Contributor Centre** is the name of the proposed full contributor experience built around that entry point.

It is intended to connect:
- Category selection and listing intake.
- Category-specific information and source evidence.
- Private submission tracking and correction.
- Existing moderator review and evidence verification.
- Explicit approval and separate catalogue publication.
- Public catalogue discovery after publication.

This is a platform module, not a paid SaaS plan, a listing marketplace checkout, or a second moderation application.

## 2. Current source-reviewed baseline

The following facts were found in the repository at the baseline commit:

| Area | Source-reviewed status | Evidence / limitation |
|---|---|---|
| Public listing intake | Existing and implemented in source | `src/modules/listings/ListingSubmissionPage.tsx`; `submit_listing_intake()` client call in `src/integrations/supabase/public-client.ts` |
| Category types | Existing and implemented in source | `opportunity`, `venue`, `academy`, `coach`, `event`, `pickup_game`, `sport` |
| Coach deep link | Existing and implemented in source | `/submit-listing?type=coach` is read by the listing page |
| Submission tracking | Existing and implemented in source | Reference number and private tracking key; status lookup and correction/resubmission functions |
| Evidence attachment on public intake | Not present in inspected listing form | The form accepts an HTTPS source URL and text details; it does not provide a listing-document upload workflow |
| Email fallback | Existing in source | Direct-email tab / mailto fallback; this is not the same as a database-backed submission |
| Moderator workflow | Existing and documented | `/admin` editorial review and `/admin/control` evidence/publication controls, described in `docs/LISTING_SUBMISSION_MODERATION_SOP.md` |
| Approval/publication separation | Existing and documented | `docs/LISTING_MODERATION_WORKFLOW.md` and `docs/LISTING_PUBLICATION_POLICY.md` |
| KhelChronicle intake | Separate existing workflow | `/khelchronicle/submit`, separate client and schema |
| Full Contributor Centre landing page | Proposed architecture | Not established by this source audit as a dedicated category landing page |
| Contributor dashboard | Future work / not verified | Existing tracking flow is not a full account-based contributor workspace |

The unified navbar action was introduced by PR #245 and refined in V2 navigation: the primary header action points to `/submit-listing` (`+ List on KhelGrid`), accompanied by the direct research submission action `/khelchronicle/submit` (`Submit Paper`) and adjacent B2B discovery (`Organizations` & `Campaigns`). The full category dropdown and Contributor Centre landing page are separate proposed work and must not be represented as already implemented.

## 3. Product scope

The unified entry point should support the existing listing types first:

1. **Trials & Opportunities** — existing `opportunity` type.
2. **Sports Venues** — existing `venue` type.
3. **Coaches** — existing `coach` type.
4. **Academies** — existing `academy` type.
5. **Events & Competitions** — existing `event` type.
6. **Community & Pickup Games** — existing `pickup_game` type.

The existing `sport` type is a separate new-sport suggestion/catalogue request. Preserve it as an additional supported intake type where appropriate; do not silently discard it or mislabel it as one of the six main listing categories.

All supported listing submissions remain free. Evidence review is not a paid product. Listing submission does not guarantee approval, verification, ranking, or publication.

## 4. Contributor journey — target architecture

1. Contributor opens **+ List on KhelGrid**.
2. Contributor chooses a supported category.
3. The page explains the information and evidence expected for that category.
4. Contributor enters structured category-specific information.
5. Contributor supplies an official HTTPS source and/or evidence through an approved secure evidence workflow.
6. Contributor reviews the submission and confirms it.
7. Intake creates a private submission record.
8. Contributor receives a reference number and private tracking credential.
9. Authorized moderators inspect facts and evidence.
10. Moderator requests corrections, rejects, or approves according to the protected workflow.
11. Evidence verification remains a distinct decision.
12. Publication is a separate authorized action after all category-specific requirements pass.
13. Contributor can check status and provide corrections through the supported tracking route.

Anonymous and authenticated submission are allowed only to the extent enforced by the existing database policy and RPC. The UI must not invent or imply additional permissions.

## 5. Governance principles

- One public contributor entry point; no duplicate top-level venue, trial, or coach CTAs.
- Existing category routes and query parameters must continue to work.
- Pending submissions and private submitter details must not appear in public catalogue queries.
- Approval, evidence verification, and publication are separate concepts.
- Only authorized server/database operations can change moderation or publication state.
- No self-awarded verification badges.
- No fabricated addresses, dates, organizers, hosts, qualifications, fees, availability, or counts.
- No listing fees, paid verification, paid approval, or payment dependency.
- The existing Admin Control Center remains the moderation authority.
- KhelChronicle research submissions remain a separate editorial workflow.

## 6. Relationship to other KhelGrid modules

- **Public catalogue:** consumes eligible published records; it is not an intake queue.
- **Admin Control Center:** performs privileged review, evidence verification, approval, publication, unpublication, and access management.
- **Contributor Centre:** handles contributor-facing category discovery, intake, tracking, and corrections.
- **KhelChronicle:** separate manuscript intake and editorial/research publication workflow. The Contributor Centre may link to it but must not merge its data model or review states with directory listings.

## 7. Source references

- `src/modules/listings/ListingSubmissionPage.tsx`
- `src/integrations/supabase/public-client.ts`
- `src/modules/admin/AdminModerationPage.tsx`
- `src/shared/navigation/navigationRegistry.ts`
- `src/shared/components/TopNavbar.tsx`
- `docs/LISTING_SUBMISSION_MODERATION_SOP.md`
- `docs/LISTING_MODERATION_WORKFLOW.md`
- `docs/LISTING_PUBLICATION_POLICY.md`
- `docs/policies/FREE_DIRECTORY_LISTING_AND_VERIFICATION.md`
- `docs/KHELCHRONICLE_EDITORIAL_REVIEW_AND_PUBLICATION_GATE.md`

See the companion architecture, workflow, security, and roadmap documents in this directory.

## 8. Contributor Centre page implementation

The Contributor Centre landing-page presentation is implemented on the feature branch `feature/contributor-centre-page` as a UI layer over the existing `ListingSubmissionPage` workflow.

Implemented in this branch:
- Contributor-focused hero and primary actions for starting a listing or tracking a submission.
- Six category cards mapped to existing intake values: `venue`, `opportunity`, `coach`, `academy`, `event`, and `pickup_game`.
- Separate new-sport suggestion action mapped to the existing `sport` intake value.
- Four-step explanation of submit, review, verify, and publish, with wording that keeps those decisions distinct.
- Free-submission and evidence-review trust messaging.
- Separate link to the KhelChronicle manuscript workflow.
- Responsive page styling for desktop, tablet, and mobile.
- Existing submission, tracking, correction/resubmission, and email fallback code paths are retained; the category cards select the existing form type rather than introducing a new intake API.

Not included or implied:
- No new database tables, migrations, RPCs, RLS policies, storage buckets, upload flow, or moderation permissions.
- No automatic verification, approval, or publication.
- No new listing types or payment flows.
- The top navigation category dropdown is separate work; this page implementation does not claim it has been completed.

Validation status: source changes were committed to the feature branch. Build, typecheck, lint, automated tests, and browser/mobile acceptance checks have not been run by this change.
