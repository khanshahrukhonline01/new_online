# KhelGrid Platform — Master Website Project Plan

**Status:** Planning baseline; not a deployment authorization.
**Project:** Private KhelGrid Platform repository.
**Current branch:** `feat/app-shell-discovery-modules`
**Production isolation:** All work in this plan remains isolated from the production website, production database, production secrets, and production deployment until the project owner explicitly authorizes a release.

## 1. Purpose

This document is the index and governance entry point for planning, building, testing, operating, and evolving the full KhelGrid website. It links product scope to architecture, data, features, security, policies, tests, and release controls.

The aim is not to create paperwork for its own sake. Closely related topics are grouped into maintained master documents, while feature-specific specifications can be split out when their complexity warrants it.

## 2. Current known baseline

- The application is a React, TypeScript, and Vite project.
- A responsive app shell and initial discovery modules exist on the feature branch.
- A read-only public Supabase REST adapter has been introduced for sports, opportunities, and venues.
- The dev Supabase project has previously been inspected as a separate development environment. Re-check its current state before relying on that snapshot.
- The current UI explicitly says live feeds and account services are not connected.
- No booking availability, payment processing, authentication flow, or live-score provider should be represented as operational until implemented and tested.
- The project uses a draft pull request; do not merge it or deploy it without explicit approval and passing checks.

## 3. Documentation directory standard

Use this structure as the canonical location for new planning and operational documentation:

```text
docs/
├── MASTER_PROJECT_PLAN.md
├── README.md
├── product/
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── ROADMAP_AND_DEPENDENCIES.md
│   └── UX_UI_AND_ACCESSIBILITY.md
├── architecture/
│   ├── FRONTEND_AND_SYSTEM_ARCHITECTURE.md
│   ├── BACKEND_API_AND_INTEGRATIONS.md
│   └── ENVIRONMENTS_AND_SECRETS.md
├── data/
│   ├── DATABASE_AND_DATA_GOVERNANCE.md
│   ├── MIGRATIONS_BACKUPS_AND_RECOVERY.md
│   └── DATA_QUALITY_AND_PROVENANCE.md
├── features/
│   ├── SPORTS_AND_DISCOVERY.md
│   ├── OPPORTUNITIES_AND_VERIFICATION.md
│   ├── VENUES_AND_BOOKING.md
│   ├── SPORTS_CV.md
│   ├── ACCOUNTS_PAYMENTS_AND_NOTIFICATIONS.md
│   └── LIVE_SPORTS_DATA.md
├── security/
│   ├── SECURITY_THREAT_MODEL.md
│   ├── TESTING_AND_ACCEPTANCE.md
│   └── RELIABILITY_AND_INCIDENTS.md
├── policies/
│   ├── FOOTER_LEGAL_PAGES_AND_PRIVACY_SETTINGS.md
│   ├── SOCIAL_MEDIA_AND_COMMUNITY.md
│   └── EDITORIAL_VERIFICATION_AND_IPR.md
├── growth/
│   ├── SEO_CONTENT_AND_METADATA.md
│   └── ANALYTICS_AND_ADVERTISING.md
└── operations/
    ├── CI_CD_DEPLOYMENT_AND_RELEASES.md
    ├── COST_CAPACITY_AND_MAINTENANCE.md
    └── CHANGE_APPROVAL_AND_RELEASE_GATES.md
```

Existing documents at the top of `docs/` remain valid. Do not move or rename them automatically; this index maps them to the relevant subjects. If a later change consolidates or relocates files, update links and history deliberately.

## 4. Documentation catalogue and coverage

The numbers below preserve the 54-topic checklist for traceability. Topics are consolidated into master documents listed in the directory tree.

### Product and UX
1. Website page inventory — existing: `WEBSITE_PAGE_INVENTORY.md`.
2. Domain model and data dictionary — existing: `DOMAIN_MODEL_AND_DATA_DICTIONARY.md`.
3. Schema gap analysis — existing: `SCHEMA_GAP_ANALYSIS.md`.
4. Product requirements document — `product/PRODUCT_REQUIREMENTS.md`.
5. Roadmap and dependency plan — `product/ROADMAP_AND_DEPENDENCIES.md`.
6. UX/UI and design system — `product/UX_UI_AND_ACCESSIBILITY.md`.
7. Frontend architecture — `architecture/FRONTEND_AND_SYSTEM_ARCHITECTURE.md`.
8. Page and feature specifications — product and feature specifications.
9. Navigation and URL standards — product requirements and frontend architecture.
10. Accessibility and responsive design — `product/UX_UI_AND_ACCESSIBILITY.md`.
11. Content and media standards — `policies/EDITORIAL_VERIFICATION_AND_IPR.md`.

### Backend and data
12. Backend/API architecture — `architecture/BACKEND_API_AND_INTEGRATIONS.md`.
13. Full database plan — existing: `FULL_DATABASE_PLAN.md`.
14. Migration and rollback SOP — `data/MIGRATIONS_BACKUPS_AND_RECOVERY.md`.
15. Database security and RLS — `data/DATABASE_AND_DATA_GOVERNANCE.md` and `security/SECURITY_THREAT_MODEL.md`.
16. Data lifecycle and quality — `data/DATA_QUALITY_AND_PROVENANCE.md`.
17. Third-party integration register — `architecture/BACKEND_API_AND_INTEGRATIONS.md`.
18. Environment and secrets management — `architecture/ENVIRONMENTS_AND_SECRETS.md`.
19. Multi-LLM provider architecture, model governance and public/private asset classification — `architecture/LLM_INTEGRATION_AND_ASSET_GOVERNANCE.md`.

### Features
20. Sports directory — `features/SPORTS_AND_DISCOVERY.md`.
21. Trials/opportunities — `features/OPPORTUNITIES_AND_VERIFICATION.md`.
22. Venues and courts — `features/VENUES_AND_BOOKING.md`.
23. Booking and availability — `features/VENUES_AND_BOOKING.md`.
24. Sports CV — `features/SPORTS_CV.md`.
25. Authentication and profiles — `features/ACCOUNTS_PAYMENTS_AND_NOTIFICATIONS.md`.
26. Payments and monetization — `features/ACCOUNTS_PAYMENTS_AND_NOTIFICATIONS.md` and `growth/ANALYTICS_AND_ADVERTISING.md`.
27. Live scores and sports data — `features/LIVE_SPORTS_DATA.md`.
28. Search and discovery — `features/SPORTS_AND_DISCOVERY.md`.
29. Notifications and user actions — `features/ACCOUNTS_PAYMENTS_AND_NOTIFICATIONS.md`.

### Policies and security
29. Footer, legal pages and privacy controls — existing: `FOOTER_LEGAL_PAGES_AND_PRIVACY_SETTINGS.md`; planned canonical copy: `policies/FOOTER_LEGAL_PAGES_AND_PRIVACY_SETTINGS.md`.
30. Social media and community — `policies/SOCIAL_MEDIA_AND_COMMUNITY.md`.
31. Privacy and data protection — legal/privacy requirements document.
32. Terms and acceptable use — legal/privacy requirements document.
33. Copyright/IPR/takedown SOP — `policies/EDITORIAL_VERIFICATION_AND_IPR.md`.
34. Editorial and verification SOP — `policies/EDITORIAL_VERIFICATION_AND_IPR.md`.
35. Advertising and third-party compliance — `growth/ANALYTICS_AND_ADVERTISING.md`.
36. Community safety/moderation — `policies/SOCIAL_MEDIA_AND_COMMUNITY.md`.

### Quality, growth, operations
37. Threat model/security — `security/SECURITY_THREAT_MODEL.md`.
38. Testing strategy — `security/TESTING_AND_ACCEPTANCE.md`.
39. Test cases/acceptance criteria — `security/TESTING_AND_ACCEPTANCE.md`.
40. Performance/reliability — `security/RELIABILITY_AND_INCIDENTS.md`.
41. Monitoring/incident response — `security/RELIABILITY_AND_INCIDENTS.md`.
42. Backup/disaster recovery — `data/MIGRATIONS_BACKUPS_AND_RECOVERY.md`.
43. Dependency/vulnerability management — `security/SECURITY_THREAT_MODEL.md`.
44. Technical SEO — `growth/SEO_CONTENT_AND_METADATA.md`.
45. Structured data/metadata — `growth/SEO_CONTENT_AND_METADATA.md`.
46. Content SEO/internal linking — `growth/SEO_CONTENT_AND_METADATA.md`.
47. Analytics/measurement — `growth/ANALYTICS_AND_ADVERTISING.md`.
48. Advertising integration — `growth/ANALYTICS_AND_ADVERTISING.md`.
49. Environment/deployment SOP — `operations/CI_CD_DEPLOYMENT_AND_RELEASES.md`.
50. CI/CD and branch protection — `operations/CI_CD_DEPLOYMENT_AND_RELEASES.md`.
51. Release/rollback checklist — `operations/CI_CD_DEPLOYMENT_AND_RELEASES.md`.
52. Change management/approval — `operations/CHANGE_APPROVAL_AND_RELEASE_GATES.md`.
53. Cost/capacity — `operations/COST_CAPACITY_AND_MAINTENANCE.md`.
54. Maintenance/ownership register — `operations/COST_CAPACITY_AND_MAINTENANCE.md`.

## 5. Cross-cutting AI and asset requirements

Future multi-LLM integrations must use a provider-neutral server-side adapter, with provider terms, costs, privacy/retention, data-region and capability differences documented. Enforce access controls before retrieving context for a model; treat prompts, retrieved documents and model output as untrusted; validate outputs and require approval for consequential actions. Never expose provider keys in frontend code.

Classify assets as public, internal, confidential or restricted/secrets. Use public storage only for reviewed, licensed, intentionally published assets; keep private assets behind authorization and private storage. Do not rely on obscure URLs as access control. Prevent private assets from entering public APIs, search indexes, sitemaps, client bundles, analytics and logs. Test anonymous and unauthorized access. See `architecture/LLM_INTEGRATION_AND_ASSET_GOVERNANCE.md`.

## 6. Release stages

### Stage A — Discovery MVP
- Responsive navigation and homepage.
- Published sports directory and sport detail pages.
- Opportunities/trials with source attribution, date status, expiry, and correction process.
- Published venue directory with factual details only.
- Sports CV generation with clearly documented local-data handling.
- Footer and core legal/policy routes.
- Basic SEO, accessibility, tests, monitoring, and deployment safeguards.

### Stage B — Trust and operations
- Editorial review tools and durable provenance.
- Data freshness/expiry automation and correction workflow.
- Expanded search and internal linking.
- Documented backup restoration tests and security review.
- Privacy settings matching actual scripts and data flows.

### Stage C — Accounts and transactions (separately approved)
- Authentication and profiles.
- Applications, saved items, notifications.
- Booking holds and court-specific availability.
- Payments/refunds only after provider, legal, reconciliation, and security review.

### Stage D — Live data and community (separately approved)
- Licensed or otherwise authorized real sports-data providers.
- Provider status, attribution, quotas, caching and graceful outage behaviour.
- Social sharing and community capabilities only with documented privacy, moderation and platform compliance.

Stages are planning targets, not claims that these features currently exist.

## 7. Mandatory engineering rules

1. No mock, simulated, or fabricated data may be presented as genuine production data.
2. No unverified opportunity may be labelled officially verified.
3. No booking, price, payment, availability, login, or live-score capability may be claimed operational until connected and tested.
4. Never expose Supabase service-role keys, payment secrets, or provider secrets in frontend code.
5. Keep dev, preview/staging, and production resources separate.
6. Use reviewed, versioned migrations; back up and test restore before risky database changes.
7. Validate authorization and data integrity at trusted server/database boundaries, not only in the UI.
8. Require tests and build checks before merge; inspect actual CI output rather than assuming success.
9. No merge, production database change, domain/DNS change, or production deployment without explicit owner approval.
10. Legal and privacy wording must reflect actual behaviour and receive appropriate review before launch.

## 8. Definition of done for each feature

A feature is complete only when:
- Its requirement and exclusions are documented.
- Its UI states include loading, empty, error/unavailable, and success where applicable.
- Data source and permission model are documented.
- Validation and failure handling are implemented.
- Automated tests and relevant manual acceptance checks pass.
- Accessibility and responsive behaviour are checked.
- SEO/privacy/legal impacts are assessed where relevant.
- Monitoring and support/rollback implications are documented.
- The PR review is complete and required CI checks pass.
- Production release has separate explicit approval.

## 9. Open decisions to track

- Confirm official social profile URLs.
- Confirm contact and legal entity details before publishing legal notices.
- Select and approve any real live-sports data provider before integrating it.
- Select LLM providers and approve their data handling, retention/training terms, costs and tool permissions before integration.
- Inventory public/private assets and confirm storage, classification, rights, access and retention rules.
- Decide when account, booking, payment, analytics, and ad features are in scope.
- Confirm applicable legal jurisdictions and review requirements.
- Confirm staging/preview setup and deployment permissions.
- Set measurable performance, recovery, and availability targets.

## 10. Document maintenance

Each substantive document should include status, owner/maintainer, last-reviewed date, scope, dependencies, and acceptance criteria. Update this master index when a document is created, renamed, superseded, or accepted. Mark incomplete items as planned rather than implying that the underlying capability is implemented.

**Important:** This master plan is documentation only. It does not authorize production changes or assert that unimplemented features are operational.
