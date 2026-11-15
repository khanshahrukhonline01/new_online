# Migration, Backup and Recovery SOP

**Status:** Draft; test restore before relying on any backup

## Before a migration
1. Confirm project and environment.
2. Inspect the current schema and migration history.
3. Review SQL, access policies, locks, data transformations and rollback limits.
4. Create/confirm a backup or export suitable for the affected data.
5. Test against development data and run validation queries.
6. Obtain approval for any production operation.

## Migration execution
Apply versioned migrations in order. Never edit an already-applied migration to change its meaning. Record commit, migration ID, environment, operator and outcome. Verify row counts, constraints, RLS and application smoke tests.

## Rollback and recovery
Prefer a tested rollback for reversible changes; for destructive or data-transforming changes, plan a forward fix and restore strategy in advance. Restore to an isolated environment first, validate integrity, then obtain approval before production recovery.

## Backup policy
Define frequency, retention, encryption, access controls, storage location and recovery-point/recovery-time objectives. Store copies independently of the primary project where feasible. A backup is not proven until restoration has been tested.

## Acceptance
Maintain a runbook, last successful backup time, last restore-test date, responsible owner and unresolved recovery gaps. Do not promise zero data loss or a recovery time that has not been measured.