# Documentation Audit and Gap Register

**Status:** Initial desk audit · **Scope:** Documentation in `feat/app-shell-discovery-modules` against `MASTER_PROJECT_PLAN.md` and the supplied navigation catalogue.
**Limitation:** The existing public website's individual pages could not be fetched reliably in this review. The supplied URLs are treated as owner-provided requirements, not as proof of current page behaviour. This is a repository/documentation audit, not a full code, production, legal or security audit.

## 1. Audit outcome

The repository has a useful starting set of product, data, feature, security and release documents. However, the master plan currently describes a broader documentation tree than the set of files confirmed present. Some topics are referenced as if covered by other documents but do not yet have a clearly located, dedicated source of truth. The supplied navigation also expands the proposed route scope beyond the first discovery MVP.

## 2. Documentation gaps to close

| Priority | Gap | Required action / source of truth | Release implication |
|---|---|---|---|
| P0 | Navigation catalogue for all supplied routes | `product/NAVIGATION_AND_ROUTE_CATALOGUE.md` | Route scope and canonical paths need approval |
| P0 | Audit traceability | This document; maintain findings and status here | Do not treat checklist references as completed work |
| P0 | Dedicated threat model and editorial/IPR policies need existence/content verification | Verify/create `security/SECURITY_THREAT_MODEL.md` and `policies/EDITORIAL_VERIFICATION_AND_IPR.md` | Security/content gates remain open until reviewed |
| P1 | Data quality/provenance lifecycle needs a single source of truth | Verify/create `data/DATA_QUALITY_AND_PROVENANCE.md` | Listings must not be promoted without evidence/freshness rules |
| P1 | Social/community moderation and UGC | Verify/create `policies/SOCIAL_MEDIA_AND_COMMUNITY.md` | Do not enable submissions, comments, messaging or community features without moderation controls |
| P1 | Feature specifications for all new routes | Add or extend feature specs for events, coaches, academies, play, calendar, verification, talent scanner/scout portal, guides/content, tools, cities, careers, pricing and mobile app | These remain planned, not implemented |
| P1 | Search and route taxonomy overlap | Decide relationship among Search, Trials, Opportunities, Calendar, Events and Guides/Chronicle/Blog/Resources | Prevent duplicate content, data and SEO routes |
| P1 | Auth/private data boundary | Define protected routes, roles, consent and access tests before dashboard/scout/private CV features | No private user data in public responses or indexes |
| P1 | AI Guide and external LLM access | Use `architecture/LLM_INTEGRATION_AND_ASSET_GOVERNANCE.md` and add a feature-specific AI Guide spec before integration | No provider calls or private-context retrieval until approved |
| P2 | SEO/analytics/advertising and privacy settings | Verify the referenced growth/policy documents and add acceptance tests against actual scripts | No tracking/ad claims before implementation and consent review |
| P2 | Release and operational evidence | Attach actual CI, preview, migration, restore and smoke-test results per release | Documentation alone cannot pass release gates |

## 3. Duplication and consolidation decisions

1. **Events & tournaments** appears in two navigation groups. Keep one canonical `/events` route and link to it from both places.
2. **Search, Live Trials, Opportunities and Sports Calendar** are related views, not separate copies of the same data. Use shared records and clearly defined filters/views.
3. **Guides, Blog, KhelChronicle, Learning Hub and Resources** may overlap. Define editorial ownership and taxonomy before creating separate content stores or duplicating articles.
4. **Book venues and List Your Sports Venue** are distinct journeys: public discovery/booking versus operator submission/onboarding.
5. **For Academies, Coaches, Scout Portal, Talent Scanner and Dashboard** have different trust boundaries. Marketing/public directory pages must not be confused with authenticated workspaces or private athlete data.
6. **Verification** is a workflow and evidence standard, not a decorative badge. Define what evidence is checked, who checks it, review dates and correction/appeal routes.
7. **AI Guide and multi-LLM architecture** share provider/security foundations, but the user-facing AI Guide needs its own behaviour, source-citation, limitations and safety specification.

## 4. Route scope versus current MVP

### Stage A candidate
Home/app shell, public sports directory, search foundations, sourced opportunities/trials, public venue directory, local-first Sports CV, legal/footer pages and SEO/accessibility/release fundamentals.

### Planned later; do not imply available
Calendar aggregation, event/tournament management, verification workflow, play/community, coach/academy onboarding, scout portal, talent scanner, AI Guide, memberships/billing, dashboard, careers workflows, venue submissions, mobile app claims and transactional booking.

The project owner should approve this sequencing before implementation expands.

## 5. Audit method and acceptance

- Compare each master-plan item with an actual file or implementation artifact; a link or mention alone is not proof of completion.
- Mark each requirement `Not started`, `Draft`, `In review`, `Implemented`, or `Verified`; reserve `Verified` for evidence-backed checks.
- Track owner, priority, dependencies, target stage, acceptance criteria and evidence link.
- Resolve duplicate or conflicting requirements by updating the canonical source and linking from other documents.
- Re-audit after route catalogue, feature specs and policy gaps are completed.

## 6. Explicit limitations

This audit does not certify current live-site availability, code correctness, legal compliance, accessibility conformance, provider permissions or security. The browser review could not reliably retrieve the supplied public routes. No production changes were made.