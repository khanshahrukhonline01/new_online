# Public Policy Page Content and Live-Site Parity

**Status:** In Review — draft public-facing policy content; not legally approved  
**Prepared:** 2026-10-29  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Scope:** Dedicated policy-page copy, source parity, navigation, publication checks and outstanding legal/operational confirmations.

## Source comparison

The requested source is the live KhelGrid website. The following URLs were checked as references; live content availability can vary by route, redirects and deployment. This document does not claim a verbatim copy or legal equivalence. Content below is intentionally re-authored into concise, consistent language and should be reviewed against the actual live policy text before approval.

| Page | Live reference | Development route | Treatment in this PR | Release notes |
|---|---|---|---|---|
| Privacy | https://www.khelgrid.com/privacy | `/privacy` | Dedicated page added | Must verify real data inventory, vendors, retention, rights, contact and jurisdiction. |
| Terms | https://www.khelgrid.com/terms | `/terms` | Dedicated page added | Counsel review required for operator identity, governing law, liability and disputes. |
| Cookies | https://www.khelgrid.com/cookies and https://www.khelgrid.com/privacy#cookie-settings | `/cookies` | Dedicated explanatory page added | Does not implement or claim a consent manager; audit actual scripts/cookies. |
| IPR & Copyright | https://www.khelgrid.com/ipr-policy | `/ipr-policy` | Dedicated page added | Uses existing IPR contact `ipr@khelgrid.com`; legal process/timelines require review. |
| Cancellation & Refunds | https://www.khelgrid.com/cancellation-policy | `/cancellation-policy` | Dedicated page added | Clearly states no KhelGrid checkout/refund workflow is confirmed by this route. |
| POSH & Athlete Safeguarding | https://www.khelgrid.com/posh-policy | `/posh-policy` | Dedicated page added | Does not invent committee/officer; legal applicability and formal contact require confirmation. |
| Editorial & Sources | https://www.khelgrid.com/editorial-policy | `/editorial-policy` | Dedicated page added | Aligns with source provenance and no-fabrication requirements. |
| Verification | https://www.khelgrid.com/verification-policy | `/verification-policy` | Dedicated page added | Prohibits broad verification claims absent evidence and review workflow. |
| Corrections & Complaints | https://www.khelgrid.com/correction-policy | `/correction-policy` | Dedicated page added | No response-time promise until an owner and SLA are approved. |

## Content principles

- This is a clean-room rewrite, not a word-for-word reproduction of protected text.
- State only known operational details; distinguish planned behavior from implemented behavior.
- Never imply that login, booking, payment, refunds, consent preferences, moderation, or verification are operational unless tested.
- Use `khelgrid@gmail.com` for general enquiry/correction intake and `ipr@khelgrid.com` for IPR reports, subject to owner confirmation before final publication.
- Do not invent a legal entity, physical address, statutory committee, named officer, response deadline, refund SLA, or legal jurisdiction.
- Show draft/review status during development. Remove the review warning only after documented owner and legal approval.
- Add a proper consent-management UI only after a cookie/script inventory and jurisdiction review; a policy page is not a consent mechanism.

## Link and navigation requirements

- The global footer should link to all nine policy pages with internal paths.
- Every policy page includes a policy-directory nav, current-page indication, About/Contact links and confirmed email links.
- Header/sidebar navigation remains focused on product areas; legal pages belong in the footer and Trust Center, not the primary sports menu.
- Use consistent canonical paths: `/privacy`, `/terms`, `/cookies`, `/ipr-policy`, `/cancellation-policy`, `/posh-policy`, `/editorial-policy`, `/verification-policy`, `/correction-policy`.
- The XML sitemap must include only public, canonical, approved/indexable pages; do not add draft policies to a production sitemap before review.

## Acceptance checklist

- [ ] Each policy route resolves to its own dedicated page, not generic coming-soon copy.
- [ ] Internal links among policies and About/Contact work on desktop and mobile.
- [ ] Footer policy links use internal canonical paths.
- [ ] Keyboard focus and active-page indication are accessible.
- [ ] Text makes no unsupported operational or legal-compliance claims.
- [ ] Build, typecheck, lint and route tests pass.
- [ ] Live policy text and current deployment are compared manually before publication.
- [ ] Owner/legal review approves policy wording and confirms operational contacts.
- [ ] Preview verified; no production deployment or database mutation implied by CI.

## Change log

- 2026-10-29: Initial dedicated policy page content and navigation specification added.
