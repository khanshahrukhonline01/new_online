# KhelGrid Documentation Index

- Status: Working index for the private rebuild
- Last reviewed: 2026-10-25
- Scope: `khelgrid-platform`, branch `feat/app-shell-discovery-modules`
- Important: documentation records intended controls and audit findings; it is not proof of runtime correctness or production approval.

## Product and parity
- [Full Website Development Plan](FULL_WEBSITE_DEVELOPMENT_PLAN.md) — complete phased roadmap, MVP scope, dependencies, acceptance gates, risk register and owner decisions.
- [Production Repository Parity Audit](PRODUCTION_REPOSITORY_PARITY_AUDIT.md) — source-based gap tracker; reconcile findings against tests and runtime evidence.
- [Requirements and Acceptance Criteria](REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md) — feature-level definition of done, priorities and open product decisions.

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
