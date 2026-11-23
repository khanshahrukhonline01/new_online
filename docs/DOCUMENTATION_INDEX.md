# KhelGrid Documentation Index

- Status: Working index for the private rebuild
- Last reviewed: 2026-11-07
- Version: 3.0.0 (Fully Dynamic Platform Release)
- Scope: `khelgrid-platform`, branch `main`
- Important: documentation records intended controls and audit findings; it is not proof of runtime correctness or production approval.

## Product and parity
- [Complete Changelog & Architecture Record (v3.0.0)](KHELGRID_PLATFORM_COMPLETE_CHANGELOG_AND_ARCHITECTURE_RECORD.md) — comprehensive historical record of all 15 phases, Supabase Auth architecture, Admin Moderation Desk, Turfs Near Me geolocation, User Dashboard, Indian payments, and repository parity syncs.
- [Full Website Development Plan](FULL_WEBSITE_DEVELOPMENT_PLAN.md) — complete phased roadmap, MVP scope, dependencies, acceptance gates, risk register and owner decisions.
- [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md) — source-based gap tracker; reconcile findings against tests and runtime evidence.
- [Requirements and Acceptance Criteria](REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md) — feature-level definition of done, priorities and open product decisions.
- [Sports Creator Campaign Marketplace (Proposal)](product/KHELGRID_SPORTS_CREATOR_CAMPAIGN_MARKETPLACE.md) — product and architecture proposal for a two-sided creator-marketing marketplace for Indian sports organisations and creators (documentation only).

## Security and quality
- [Security and Authorization Matrix](SECURITY_AND_AUTHORIZATION_MATRIX.md) — target roles, resource permissions, required negative tests and release blockers.
- [Testing and Release Gates](TESTING_AND_RELEASE_GATES.md) — PR/release gates, test layers and evidence template.

## External dependencies and operations
- [External Provider and Licensing Register](EXTERNAL_PROVIDER_AND_LICENSING_REGISTER.md) — provider, data-source, licensing, attribution, cost and approval tracking.
- [Incident Response and Disaster Recovery](INCIDENT_RESPONSE_AND_DISASTER_RECOVERY.md) — incident playbooks, backup/restore standard, recovery objectives and post-incident template.

## Document status convention
- **Draft/baseline**: documented target or process; owner review may still be needed.
- **Source-reviewed**: repository code/config was inspected; this does not prove deployed runtime behaviour.
- **Tested**: include exact commit, environment, test/workflow result and link.
- **Approved**: include approving owner and date for decisions that require approval.

## Before production release
1. Resolve P0 items in the parity audit and requirements document.
2. Replace TBD/pending entries in the provider register with evidence and explicit approvals.
3. Record exact-CI and staging results in the testing/release gates.
4. Complete a successful isolated restore drill and approve RPO/RTO.
5. Obtain explicit product-owner approval for production credentials, migrations, merge and deployment.


## Approved scope notes
- The full website plan records the approved 100+ scalable sports catalogue, KhelGrid editorial verification states, and comprehensive private Sports CV with PDF as the first-release export format.
- These are planning and acceptance requirements, not claims that these features have been implemented or tested.


## Baseline freeze and execution tracking (2026-10-25)
- [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md) — additive execution tracker; unchecked items are not complete.
- The full website development plan is the frozen planning baseline. Preserve existing documentation and audit history; record future scope changes additively with explicit approval.
- This freeze is not evidence of implementation, passing tests, completed content audit, or production deployment approval.


## Route parity and test evidence (2026-10-25)
- [Production Route Parity and Baseline Report](PRODUCTION_ROUTE_PARITY_AND_BASELINE_REPORT.md) — source-based inventory of production web routes, proposed MVP/deferred dispositions, critical parity gaps, and exact-commit CI evidence. This is not a runtime route audit or production release approval.


## Page-by-page implementation reference

- [Full Page and Workflow Specification](FULL_PAGE_AND_WORKFLOW_SPECIFICATION.md) — current dedicated routes, registered feature-information routes, planned route families, expected behaviour, data/security requirements, release gates and prioritized implementation roadmap. Route existence is explicitly distinguished from a working or verified workflow.

## KhelChronicle Open Sports Research Repository (SportRxiv India)
- [KhelChronicle Open Science & Research Policy](khelchronicle/KHELCHRONICLE_OPEN_SCIENCE_POLICY.md) — comprehensive policy covering Diamond Open Access (CC BY 4.0), ICMR / Helsinki participant ethics, minor athlete consent, FAIR data/code transparency, COPE peer discourse conduct, Crossref DOIs, and retraction/withdrawal standards.
- [KhelChronicle Author Submission Guidelines](khelchronicle/KHELCHRONICLE_AUTHOR_SUBMISSION_GUIDELINES.md) — complete manuscript formatting, structured abstract, supplementary dataset formats, Open Science Badges, and journal transition workflows.
- [KhelChronicle Editorial Moderation & Peer Review SOP](khelchronicle/KHELCHRONICLE_MODERATION_AND_PEER_REVIEW_SOP.md) — standard operating procedure for two-tier pre-moderation screening, ethical clearance verification, author identification, and community peer review moderation.

## Contributor Centre — List on KhelGrid

- [Contributor Centre overview](contributor-centre/README.md) — module purpose, source-reviewed baseline, category scope and contributor journey.
- [Contributor Centre architecture](contributor-centre/architecture.md) — frontend/backend boundaries, current intake integration, category mapping, routes and data ownership.
- [Contributor submission workflows](contributor-centre/submission-workflows.md) — existing intake types, evidence expectations, status vocabulary, tracking and corrections.
- [Contributor security and moderation](contributor-centre/security-and-moderation.md) — privacy, RLS/RPC boundaries, evidence handling, moderator responsibilities and acceptance tests.
- [Contributor Centre implementation roadmap](contributor-centre/implementation-roadmap.md) — phased delivery plan, dependencies, acceptance criteria and separate KhelChronicle track.

These documents are a repository source-review and target architecture baseline. They are not evidence of deployed runtime behavior, remote database migration state, or production readiness.

