# KhelGrid Platform Master Documentation Index

- **Status:** Authoritative Repository Documentation Index  
- **Last reviewed:** 2026-11-23  
- **Platform Version:** 3.2.0 (Dynamic Production App Shell, Intake & SaaS Multi-Tenant Platform)  
- **Scope:** `khelgrid-dotcom/khelgrid-platform`, active development and governance documentation  
- **Important:** Documentation records intended architectures, policies, design contracts, and audit findings; it is not proof of deployed runtime correctness or external approval without linked verification evidence.

---

## 1. App Shell & Core Navigation Specifications (V2 Authoritative)

The app shell coordinates global header actions, secondary discovery modules, and contextual platform anchors across all viewport sizes:

- [Top Navigation Specification (V2 Authoritative)](top-navigation-v1.md) — 3-zone architecture: Zone 1 (Brand & Menu Toggle), Zone 2 (Streamlined `Play` & `Athlete` Player Rail), and Zone 3 (Spotlight Search Trigger `Ctrl+K`, `Organizations` & `Campaigns` B2B Hub, `+ List on KhelGrid` & `Submit Paper` Intake CTAs, Notifications Drawer, Theme & Settings Menu, and Auth/Profile cluster).
- [Sidebar & Mobile Drawer Specification (V2 Authoritative)](sidebar-v1.md) — Universal navigation specification across wide desktop (`258 px`), collapsed icon rail (`68 px`), and mobile drawer (`min(330px, 100vw-42px)`). Details the 6 canonical modules (`Your Space`, `Discover`, `Play & Match Center`, `Scouting & Athlete Pipeline`, `Knowledge & Community`, `Network & Ecosystem`) driven by `src/shared/navigation/navigationRegistry.ts`.
- [Global Footer Specification (V2 Authoritative)](footer-v1.md) — 7-tier footer specification covering pre-footer interactive widgets (FAQ accordion, `GameSportPlayAcrossIndia`, `TopSportsComplexes`), 5 main directory columns, quick-access chips, products showcase grid, IPR/AI notices (`ipr@khelgrid.com`), sports network index, verified social community channels, and statutory compliance policies.
- [Sports Strip Reference (V1)](sports-strip-v1.md) — Horizontal sport navigation directly beneath the global header, icon manifest mapping, and responsive horizontal touch/wheel scrolling behavior.
- [Signature Sports Hero Specification (V1)](signature-sports-hero-v1.md) — Visual branding specification for the homepage hero carousel and media delivery standards.
- [Workspace & Account Navigation Guide](workspace-account-navigation/README.md) — Role-aware user and organization workspace navigation architecture (`/workspace` and `/dashboard`).
- [Frontend Foundation V1 & Design Tokens](frontend-foundation-v1.md) — Core design system tokens (Cool near-white `#F6F8FB`, Brand Navy `#10233F`, Emerald Green `#059669`), typography, and card radii standards.

---

## 2. Product Architecture & Engineering Plans

- [Complete Changelog & Architecture Record (v3.0+)](KHELGRID_PLATFORM_COMPLETE_CHANGELOG_AND_ARCHITECTURE_RECORD.md) — Complete historical record of all development phases, Supabase Auth architecture, Admin Moderation Desk, Turfs Near Me geolocation, User Dashboard, Indian payments, and repository parity syncs.
- [Full Website Development Plan](FULL_WEBSITE_DEVELOPMENT_PLAN.md) — Master phased roadmap, MVP scope, dependencies, acceptance gates, risk register, and product owner decisions.
- [Master Project Plan](MASTER_PROJECT_PLAN.md) — High-level governance, release criteria, and engineering standards.
- [Website Page Inventory](WEBSITE_PAGE_INVENTORY.md) — Complete inventory of all canonical routes, aliases, and module ownership.
- [Navigation and Route Catalogue](product/NAVIGATION_AND_ROUTE_CATALOGUE.md) — Hierarchical catalog of all public, authenticated, and administrative routes.
- [Page Directory and Internal Link Map](product/PAGE_DIRECTORY_AND_LINK_MAP.md) — Link structure, cross-page journeys, and route alias mapping.
- [Requirements and Acceptance Criteria](REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md) — Feature-level definition of done, acceptance tests, and quality standards.
- [Domain Model and Data Dictionary](DOMAIN_MODEL_AND_DATA_DICTIONARY.md) — Entity relationships, core data models, and database schema conventions.

---

## 3. Contributor Centre & Listing Intake Systems

- [Contributor Centre Overview](contributor-centre/README.md) — Single public contributor entry point (`+ List on KhelGrid`, `/submit-listing`) for sports listings across 7 categories.
- [Contributor Centre Architecture](contributor-centre/architecture.md) — Boundaries between client intake, RPC security-definer gateway (`submit_listing_intake`), private queue, and published catalogue.
- [Contributor Submission Workflows](contributor-centre/submission-workflows.md) — Intake fields, evidence requirements, status tracking, and submitter corrections.
- [Contributor Security and Moderation](contributor-centre/security-and-moderation.md) — Rate limiting, input sanitization, RLS policies, and reviewer responsibilities.
- [Listing Moderation Workflow](LISTING_MODERATION_WORKFLOW.md) — Operational lifecycle from submission to verification, approval, and publication.
- [Listing Moderation Access SOP](LISTING_MODERATION_ACCESS_SOP.md) — Standard operating procedure for moderators on the Admin Control Panel.
- [Listing Publication Policy](LISTING_PUBLICATION_POLICY.md) — Trust and verification rules required before any listing is made publicly visible.

---

## 4. Admin & Super-Admin Control Centre

- [Admin Application Architecture](admin-control-center/ARCHITECTURE.md) — Independent administrative micro-frontend (`apps/admin`), route isolation, and security perimeter.
- [Admin Authorization Model](admin-control-center/AUTHORIZATION_MODEL.md) — RBAC model, permissions matrix, super-admin governance, and session policies.
- [Admin Database Security](admin-control-center/DATABASE_SECURITY.md) — RLS policies, secure database RPCs, and search-path hardening.
- [Admin Audit & Incident Model](admin-control-center/AUDIT_AND_INCIDENT_MODEL.md) — Audit logging, immutable change records, and incident triage.
- [Admin Deployment Readiness](admin-control-center/DEPLOYMENT_READINESS.md) — Release gates, preview isolation, and environment configuration runbooks.
- [Admin Known Risks Register](admin-control-center/KNOWN_RISKS.md) — Active security risk inventory and mitigation tracking.
- [Development Access Guide](ADMIN_CONTROL_CENTRE_DEVELOPMENT_ACCESS.md) — Local and staging access setup guide for authorized staff.

---

## 5. KhelChronicle Open Sports Research Repository (SportRxiv India)

- [KhelChronicle Open Science & Research Policy](khelchronicle/KHELCHRONICLE_OPEN_SCIENCE_POLICY.md) — Diamond Open Access (CC BY 4.0), ICMR / Helsinki participant ethics, minor athlete consent, FAIR data/code transparency, COPE peer discourse conduct, Crossref DOIs, and retraction standards.
- [KhelChronicle Author Submission Guidelines](khelchronicle/KHELCHRONICLE_AUTHOR_SUBMISSION_GUIDELINES.md) — Manuscript formatting, structured abstract, dataset standards, Open Science Badges, and journal transition workflows.
- [KhelChronicle Editorial Moderation & Peer Review SOP](khelchronicle/KHELCHRONICLE_MODERATION_AND_PEER_REVIEW_SOP.md) — Two-tier pre-moderation screening, ethical clearance verification, author identification, and community peer review moderation.

---

## 6. Security, Compliance & Platform Audits

- [Independent Platform Audit (2026-11-22)](audits/INDEPENDENT_PLATFORM_AUDIT_2026-11-22.md) — Independent evaluation of deployment pipelines, commit author identity gates, and admin isolation.
- [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md) — Source-based gap tracker reconciling development against production codebases.
- [Security and Authorization Matrix](SECURITY_AND_AUTHORIZATION_MATRIX.md) — Target roles, resource permissions, required negative tests, and release blockers.
- [Testing and Release Gates](TESTING_AND_RELEASE_GATES.md) — Comprehensive PR/release gates, test layers, and evidence collection standards.
- [External Provider and Licensing Register](EXTERNAL_PROVIDER_AND_LICENSING_REGISTER.md) — Provider, data-source, licensing, attribution, cost, and approval tracking.
- [Incident Response and Disaster Recovery](INCIDENT_RESPONSE_AND_DISASTER_RECOVERY.md) — Incident playbooks, backup/restore standards, recovery objectives, and post-incident templates.
- [Security Programme Master Status](security/security-programme-master-status.md) — Phased security hardening roadmap (Phases 1 through 10).

---

## 7. Commercial & Flagship Strategy

- [KhelGrid Blue Ocean Flagship Strategy](strategy/KHELGRID_BLUE_OCEAN_FLAGSHIP_STRATEGY.md) — Strategic positioning, market differentiation, grassroots athlete enablement, and sustainable SaaS monetization.
- [Sports Creator Campaign Marketplace Proposal](product/KHELGRID_SPORTS_CREATOR_CAMPAIGN_MARKETPLACE.md) — Two-sided creator marketing marketplace connecting Indian sports organizations with athletes and creators.
