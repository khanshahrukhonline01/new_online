# Database and Data Governance

**Status:** Draft baseline · Related: `FULL_DATABASE_PLAN.md`, `DOMAIN_MODEL_AND_DATA_DICTIONARY.md`, `SCHEMA_GAP_ANALYSIS.md`

## Governance
The database is the authoritative store for published listings and transactional state. Each table needs an owner, purpose, field definitions, access model, retention rules and migration history.

## RLS and permissions
Enable and review RLS for exposed tables. Deny by default; grant only required operations. Separate public published-record reads from staff/admin mutations. Do not rely on frontend checks for authorization. Test both allowed and denied access using representative roles.

## Integrity
Use foreign keys, check constraints, unique constraints and transactions where appropriate. Validate dates, statuses, fees, URLs and required fields at trusted boundaries. Booking overlap and payment consistency require server/database enforcement.

## Change safety
Use versioned SQL migrations and code review. Avoid destructive changes; prefer additive/expand-and-contract changes. Capture a recovery point before risky changes and define rollback or forward-fix steps.

## Data classification
Classify public content, operational records, personal information and secrets. Collect the minimum necessary; restrict access and retention to purpose. Do not place personal data in public logs or analytics.