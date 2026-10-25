# KhelGrid documentation guide

Start with [Master Project Plan](MASTER_PROJECT_PLAN.md). It records the full 54-topic documentation catalogue, staged roadmap, engineering rules, and release gates.

## Existing planning documents
- [Website Page Inventory](WEBSITE_PAGE_INVENTORY.md)
- [Domain Model and Data Dictionary](DOMAIN_MODEL_AND_DATA_DICTIONARY.md)
- [Schema Gap Analysis](SCHEMA_GAP_ANALYSIS.md)
- [Full Database Plan](FULL_DATABASE_PLAN.md)
- [Two-Stage Database Roadmap](TWO_STAGE_DATABASE_ROADMAP.md)
- [Stage A Schema Change Matrix](STAGE_A_SCHEMA_CHANGE_MATRIX.md)
- [Footer, Legal Pages, and Privacy Settings](FOOTER_LEGAL_PAGES_AND_PRIVACY_SETTINGS.md)

## Directory map
- `product/`: requirements, priorities, UX, accessibility.
- `architecture/`: frontend/backend design, integrations, environments/secrets, multi-LLM integration and public/private asset governance.
- `data/`: schema governance, migrations, recovery, data quality and provenance.
- `features/`: individual user-facing capability specifications.
- `security/`: threat model, tests, reliability and incident response.
- `policies/`: legal pages, social/community, editorial verification and intellectual property.
- `growth/`: SEO, analytics and advertising.
- `operations/`: CI/CD, release controls, cost and ownership.

## New cross-cutting requirements
- [LLM Integration and Asset Governance](architecture/LLM_INTEGRATION_AND_ASSET_GOVERNANCE.md): provider-neutral future model integration, safe tool/API access, and public/internal/confidential/restricted asset handling.

## Document rules
Use a clear status (Draft, Planned, In Review, Approved, Superseded), owner, last-reviewed date, scope, dependencies, requirements, acceptance criteria and change history. Do not duplicate an existing source of truth: link to it or update it. Do not claim a feature or compliance state that has not been implemented and verified.

These documents do not authorize production changes. Production releases require separate explicit approval.