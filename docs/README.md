# KhelGrid Documentation Guide

Start with the [Platform Master Documentation Index](DOCUMENTATION_INDEX.md) and the [Master Project Plan](MASTER_PROJECT_PLAN.md). Together, they record the complete documentation catalogue, staged roadmaps, architectural standards, and verification release gates.

---

## 1. Core Component Specifications (V2 Authoritative)

For frontend layout, navigation rules, responsive breakpoints, and accessibility standards:
- [Top Navigation Specification (V2)](top-navigation-v1.md) — Authoritative 3-zone header specification.
- [Sidebar & Mobile Drawer Specification (V2)](sidebar-v1.md) — 6-module desktop sidebar, collapsed rail, and mobile drawer specification.
- [Global Footer Specification (V2)](footer-v1.md) — 7-tier footer specification including directory columns, interactive widgets, and legal rows.
- [Sports Strip Reference (V1)](sports-strip-v1.md) — Horizontal sport navigation strip directly below the header.
- [Frontend Foundation V1](frontend-foundation-v1.md) — Design tokens, color palette, and component contracts.

---

## 2. Platform Audits & Parity Records

- [Documentation Audit and Gap Register](DOCUMENTATION_AUDIT_AND_GAP_REGISTER.md)
- [Independent Platform Audit (2026-11-22)](audits/INDEPENDENT_PLATFORM_AUDIT_2026-11-22.md)
- [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md)
- [Navigation and Route Catalogue](product/NAVIGATION_AND_ROUTE_CATALOGUE.md)
- [Page Directory and Internal Link Map](product/PAGE_DIRECTORY_AND_LINK_MAP.md)
- [Public Policy Page Content and Live-Site Parity](policies/PUBLIC_POLICY_PAGE_CONTENT.md)
- [Frontend Architecture](architecture/FRONTEND_ARCHITECTURE.md)
- [Editorial, Verification, Corrections and IPR](policies/EDITORIAL_VERIFICATION_AND_IPR.md)

---

## 3. Core Planning & Data Documents

- [Website Page Inventory](WEBSITE_PAGE_INVENTORY.md)
- [Domain Model and Data Dictionary](DOMAIN_MODEL_AND_DATA_DICTIONARY.md)
- [Schema Gap Analysis](SCHEMA_GAP_ANALYSIS.md)
- [Full Database Plan](FULL_DATABASE_PLAN.md)
- [Two-Stage Database Roadmap](TWO_STAGE_DATABASE_ROADMAP.md)
- [Stage A Schema Change Matrix](STAGE_A_SCHEMA_CHANGE_MATRIX.md)
- [Footer, Legal Pages, and Privacy Settings](FOOTER_LEGAL_PAGES_AND_PRIVACY_SETTINGS.md)
- [Image Asset Requirements and Production Plan](product/IMAGE_ASSET_REQUIREMENTS_AND_PLAN.md)
- [Master AI Image Generation Prompt](product/MASTER_AI_IMAGE_GENERATION_PROMPT.md)
- [Image Generation Prompt Library](product/image-generation-prompts/README.md)
- [KhelGrid YouTube Channel Strategy v1.0](product/KHELGRID_YOUTUBE_CHANNEL_STRATEGY_V1.md)
- [Master AI Video Generation and Production Framework](product/MASTER_AI_VIDEO_GENERATION_AND_SCRIPTING.md)
- [Video Generation Prompt Library](product/video-generation-prompts/README.md)

---

## 4. Directory Map

- `docs/admin-control-center/`: Admin micro-frontend architecture, RBAC, database security, and audit model.
- `docs/contributor-centre/`: Public contributor intake (`+ List on KhelGrid`), submission workflows, and moderation SOPs.
- `docs/khelchronicle/`: Diamond Open Access research preprint policy, author guidelines, and peer review SOP.
- `docs/product/`: Requirements, priorities, UX, accessibility, and asset planning.
- `docs/architecture/`: Frontend/backend design, integrations, environments/secrets, and asset governance.
- `docs/data/`: Schema governance, migrations, recovery, data quality, and provenance.
- `docs/security/`: Threat models, tests, reliability, and incident response.
- `docs/policies/`: Legal pages, social/community, editorial verification, and intellectual property.
- `docs/growth/`: SEO, analytics, and advertising governance.
- `docs/operations/`: CI/CD, release controls, cost, and maintenance.

---

## 5. Document Rules & Change Standards

Use a clear status (Draft, Planned, In Review, Approved, Superseded), owner, last-reviewed date, scope, dependencies, requirements, acceptance criteria, and change history. Do not duplicate an existing source of truth: link to it or update it. Do not claim a feature or compliance state that has not been implemented and verified.
