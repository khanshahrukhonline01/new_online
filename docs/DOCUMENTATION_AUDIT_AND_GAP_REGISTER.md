# Documentation Audit and Gap Register

**Status:** Initial repository-document audit · **Branch:** `feat/app-shell-discovery-modules`
**Scope:** Confirmed document existence, directory placement, route coverage, overlap and planning gaps. This is not a full code, live-site, legal or security audit.

## 1. Audit summary

A separate read-only comparison against the public production source repository is now available in [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md). It records source-defined routes, feature families, backend/workflow areas and public/private asset requirements that need explicit reconciliation with the private plan. Treat these as source-tree findings, not proof of live runtime behaviour.

The repository has an established planning baseline: master plan, page inventory, product requirements, roadmap, route catalogue, data dictionary/schema documents, feature specifications, security/reliability documents, policy drafts and release procedures. The initial audit found a few references in the master plan that pointed to files not yet present, plus overlaps between menu labels that need canonical ownership.

### Evidence rules
- `Present — draft`: file exists, but its requirements are not necessarily approved or implemented.
- `Missing`: expected dedicated document was not found at the expected path during this audit.
- `Implementation unverified`: documentation exists but does not prove the feature works.
- `Verified`: only use when actual test/review evidence is linked.

## 2. Document existence audit

| Area | Canonical document | Audit result | Required next step |
|---|---|---|---|
| Master plan and index | `MASTER_PROJECT_PLAN.md`, `README.md` | Present | Keep links and status accurate |
| Page inventory | `WEBSITE_PAGE_INVENTORY.md` | Present; large inventory | Reconcile routes and page ownership with route catalogue |
| Product requirements | `product/PRODUCT_REQUIREMENTS.md` | Present — draft | Approve scope and measurable acceptance criteria |
| Roadmap | `product/ROADMAP_AND_DEPENDENCIES.md` | Present — draft | Prioritize each route and feature by stage |
| UX/accessibility | `product/UX_UI_AND_ACCESSIBILITY.md` | Present — draft | Add route-level acceptance checks |
| Navigation/routes | `product/NAVIGATION_AND_ROUTE_CATALOGUE.md` | Present — proposed | Approve canonical routes, public/private flags and aliases |
| Frontend architecture | `architecture/FRONTEND_ARCHITECTURE.md` | Added in this audit — draft | Review against current code and tests |
| Backend/integrations | `architecture/BACKEND_API_AND_INTEGRATIONS.md` | Present — draft | Confirm API contracts, auth boundary and provider inventory |
| Environment/secrets | `architecture/ENVIRONMENTS_AND_SECRETS.md` | Present — draft | Verify CI and deployment settings without exposing secrets |
| Multi-LLM/assets | `architecture/LLM_INTEGRATION_AND_ASSET_GOVERNANCE.md` | Present — planning | Keep future integration deferred until provider/security review |
| Data quality/provenance | `data/DATA_QUALITY_AND_PROVENANCE.md` | Present — draft | Define freshness, expiry and evidence workflow concretely |
| Threat model | `security/SECURITY_THREAT_MODEL.md` | Present — draft | Review against real data flows and threats |
| Testing/acceptance | `security/TESTING_AND_ACCEPTANCE.md` | Present — draft | Attach real CI and test evidence per PR |
| Reliability/incidents | `security/RELIABILITY_AND_INCIDENTS.md` | Present — draft | Set realistic service targets and owners |
| Editorial/IPR | `policies/EDITORIAL_VERIFICATION_AND_IPR.md` | Added in this audit — draft | Legal/editorial review before adoption |
| Social/community | `policies/SOCIAL_MEDIA_AND_COMMUNITY.md` | Present — draft | Review moderation and privacy before enabling UGC |
| SEO/metadata | `growth/SEO_CONTENT_AND_METADATA.md` | Present — draft | Validate against rendered pages and sitemap |
| Ads/analytics | `growth/ANALYTICS_AND_ADVERTISING.md` | Present — draft | Verify actual scripts, consent and provider terms |
| CI/CD/releases | `operations/CI_CD_DEPLOYMENT_AND_RELEASES.md` | Present — draft | Confirm workflow and deployment evidence |
| Change/release gates | `operations/CHANGE_APPROVAL_AND_RELEASE_GATES.md` | Present — draft | Keep explicit production approval requirement |
| Cost/maintenance | `operations/COST_CAPACITY_AND_MAINTENANCE.md` | Present — draft | Populate approved provider/owner information |
| Feature specs | `features/*.md` | Core specs present | Extend for every later-stage route listed below |

## 3. Detailed page/subpage coverage update

The canonical [Navigation and Route Catalogue](product/NAVIGATION_AND_ROUTE_CATALOGUE.md) now contains a hierarchical page/subpage list for global/home, Compete, Play & train, Learn, Grow, future account pages, legal/system pages and future private admin pages. It also includes a per-page specification template and route lifecycle status vocabulary. This closes the documentation gap for a consolidated route tree, but it does not mean each individual feature has a complete implementation-ready specification.

## 4. Navigation coverage and overlaps

The navigation catalogue is a planning inventory. Listed routes are not proof of existing implementation.

| Route/group | Planning decision | Gap / next action |
|---|---|---|
| Search, Live Trials, Opportunities | Shared opportunity records with different filters/views | Define search facets, canonical detail URLs and status transitions |
| Sports Calendar, Events & tournaments | Related but distinct calendar and event-detail experiences | Define shared event/opportunity relationship and duplicate rules |
| Verify | Trust/evidence workflow | Define verification scope, reviewer, expiry, correction and appeal |
| Talent Scanner, Scout Portal, Dashboard | Private/high-risk workflows | Specify identity, roles, consent, access logging and abuse controls before implementation |
| Play / Community | May involve user-generated content and matching | Define moderation, reporting, blocking and privacy before activation |
| Book venues / List Your Sports Venue | Separate consumer and operator journeys | Distinguish public directory from submission, approval and actual booking |
| Train, Coaches, For Academies | Related coaching/organization discovery | Define canonical coach/academy records, claims and profile consent |
| Memberships / Pricing | Commercial information vs actual entitlements | No paid feature claims until billing and authorization are implemented |
| Start From Zero, Guides, Blog, Chronicle, Learning Hub, Resources | Potential editorial taxonomy overlap | Assign canonical content types, ownership, tagging and cross-link rules |
| Tools & calculators | Utility collection | Specify formulas, assumptions, input validation and tests per tool |
| Careers | Public roles vs application handling | Show real current roles; define private applicant-data handling if applications are added |
| Mobile App | Informational route only unless a real app exists | Verify app-store links and platform availability before claiming launch |
| AI Guide | User-facing AI feature | Create separate functional specification before integrating provider-neutral LLM layer |
| Cities | Geographic discovery taxonomy | Define canonical city identifiers and only show cities with real supported content |

## 5. Missing or incomplete specifications

Priorities:
- **P0:** Before the next major implementation expansion: approve route catalogue, route-to-stage mapping, core acceptance criteria, data/publication rules and security/privacy boundaries.
- **P1:** Before relevant feature implementation: add detailed specifications for Calendar/Events, Verify, Play/community, Coaches/Academies, Talent Scanner/Scout Portal, AI Guide, content taxonomy, tools/calculators, venue submission, memberships/pricing, Careers and Mobile App.
- **P2:** Before public launch of each applicable capability: validate SEO, analytics/advertising consent, monitoring, backup restore, operational ownership and release runbooks against real configuration.

## 6. Consolidation rules

1. One canonical `/events` route may be linked from multiple navigation groups; do not build duplicate pages.
2. Search, trials, opportunities and calendar views should reference a shared domain model rather than copy records into parallel tables.
3. Guides, Blog, Chronicle, Learning Hub and Resources need explicit content types and canonical URLs before content expansion.
4. Venue discovery, venue submission, court availability and confirmed booking are separate states/workflows.
5. Verification must describe the evidence checked; paid placement is not verification.
6. Multi-LLM architecture is shared infrastructure; each user-facing AI feature needs its own UX, source, safety and acceptance requirements.
7. Public/private asset labels must align with actual storage policies, API responses, indexing, caches and model retrieval.

## 7. Current stage recommendation

**Stage A candidate:** app shell, public sports directory, sourced opportunities/trials, public venue directory, local-first Sports CV, shared navigation, legal/footer foundations, SEO/accessibility and CI gates.

**Later stages, not to be presented as live until implemented:** calendar/event workflows, verification operations, venue submissions, booking transactions, accounts/dashboard, scout/talent workflows, community/play, coaching/academy onboarding, AI Guide, memberships/payments, careers applications and mobile app distribution.

The project owner should approve sequencing and scope before expanding implementation.

## 8. Acceptance and follow-up

- [ ] Each route has a stage, owner, public/private classification, source of truth, dependencies and acceptance criteria.
- [ ] Every master-plan reference resolves to a real file or is explicitly marked missing.
- [ ] Each requirement is marked `Not started`, `Draft`, `In review`, `Implemented` or `Verified`.
- [ ] `Verified` items include a test/review/preview evidence link.
- [ ] Duplicate requirements point to a canonical document.
- [ ] Feature-specific specifications are completed before implementation begins.
- [ ] Re-audit after scope approval and again before production release.

## 9. Limitations

The public URLs supplied for the existing website were not reliably retrievable during the earlier review, so this audit treats the user's navigation list as intended scope rather than evidence of live-site behaviour. This audit verifies documentation paths and planning consistency only; it does not establish that code, production behaviour, legal compliance, accessibility, security or external provider permissions have been verified. No production changes were made.