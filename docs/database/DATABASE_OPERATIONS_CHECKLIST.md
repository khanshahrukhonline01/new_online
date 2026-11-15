# Khelgrid Database Operations Checklist

Use this checklist as an evidence log. Mark an item complete only after performing it and recording the result.

## Before each migration
- [ ] Confirm project ID and environment.
- [ ] Review migration SQL, grants, RLS, constraints, indexes and function security.
- [ ] Test migration on an isolated database.
- [ ] Test allowed and denied access for anon, authenticated, and privileged paths.
- [ ] Verify backup and restore/forward-fix plan if data could be affected.
- [ ] Pass CI and peer review.
- [ ] Record commit SHA, operator, target, and expected impact.

## Weekly (initial development cadence)
- [ ] Confirm expected project health.
- [ ] Check latest database migration history against Git.
- [ ] Run security advisor and review new findings.
- [ ] Export database data/schema using approved tooling.
- [ ] Encrypt export, generate checksum and manifest, and verify uploaded copy.
- [ ] Confirm backup storage permissions and available capacity.
- [ ] Record success or create an incident for any failure.

## Monthly
- [ ] Restore the latest verified backup into a disposable isolated project.
- [ ] Validate tables, constraints, data counts, migration state, grants and RLS.
- [ ] Run application smoke tests and negative authorization tests.
- [ ] Review Supabase/GitHub/backup-storage users, tokens and MFA.
- [ ] Review data retention and remove expired backup copies securely.
- [ ] Document recovery time, recovery point and corrective actions.

## Before production release
- [ ] Production project identity independently verified.
- [ ] No development credentials or development database URL in production.
- [ ] All migrations reviewed and reproducible.
- [ ] Security and dependency checks pass.
- [ ] RLS/grants/functions tested with allowed and denied cases.
- [ ] Backup is recent and verified; recovery procedure has a successful drill.
- [ ] Monitoring, incident contacts and rollback/forward-fix plan ready.
- [ ] Explicit release approval recorded.

## Evidence record
Date/time UTC:
Environment/project ID:
Migration commit:
Backup manifest/checksum:
Restore test reference:
Security advisor findings:
Checks and results:
Operator/reviewer:
Exceptions and follow-up issue:

**Important:** A checked box is not evidence by itself; attach a command output, CI run, backup manifest, or review reference.