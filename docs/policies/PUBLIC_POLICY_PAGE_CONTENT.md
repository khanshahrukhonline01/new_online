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

## Live-source findings that need owner confirmation

Search-indexed live content was available for these two pages during the review:

- [Live IPR & Copyright Policy](https://www.khelgrid.com/ipr-policy) contains specific ownership, user-content licence, anti-scraping, AI training opt-out, notice requirements, and a stated 36-hour takedown target. These are source-site claims, not independently verified legal conclusions. The development draft deliberately does not repeat a statutory SLA, intermediary classification, blanket ownership statement, or license grant as fact until the owner and counsel confirm the wording and operational capability.
- [Live POSH & Athlete Safeguarding Policy](https://www.khelgrid.com/posh-policy) states that an Independent Complaints Committee exists, identifies `posh@khelgrid.com`, and describes statutory timelines and minor-safeguarding escalation. The development draft does not invent or promise an ICC or claim that the inbox is monitored. Confirm the committee’s actual existence, membership, jurisdiction, contact ownership, and applicable statutory obligations before replacing the live claims.
- The live footer links to all nine canonical policy routes and a sitemap. Other live policy URLs were attempted but their full text was not reliably retrievable in this pass. The new development copy is therefore a cautious first draft, not a verified verbatim migration of every live page.

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


## Post-merge accuracy follow-up — 2026-10-29

The initial policy-pages PR was merged, but merge completion did not mean that all policy copy was final or that the public routes had been validated against the live site. A follow-up branch, `fix/policy-page-live-source-parity`, corrects the Verification Policy and Correction Policy against the current public source pages:

- Trust Center / verification process: https://www.khelgrid.com/trust-center
- Correction Policy: https://www.khelgrid.com/correction-policy
- Contact routing: https://www.khelgrid.com/contact

The follow-up clarifies that verification covers the scope of checks described by the Trust Center and does not guarantee selection, event delivery, or payment safety. Correction reports are reviewed against source evidence, safety reports are prioritized, and the public support address is `support@khelgrid.com`.

**Still not complete:** the Privacy Policy must be reconciled with actual hosting/Supabase/analytics/advertising data flows; Cookie Settings must not be presented as an implemented consent manager unless one exists; Terms and IPR/POSH text require owner and qualified legal review; POSH committee details and monitoring arrangements must be confirmed before they are represented as operational. The live site's legal claims are source material, not independent proof of legal compliance. Do not remove draft/review caveats until those checks are complete.
