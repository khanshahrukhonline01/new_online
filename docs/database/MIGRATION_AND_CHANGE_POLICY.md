# Khelgrid Database Migration and Change Policy

**Status:** Initial policy; CI enforcement and migration reconciliation required.

## Source of truth
- SQL migrations in `supabase/migrations/` are the reviewed source for intended schema changes.
- Each migration is immutable after application to a shared environment. Correct mistakes with a new forward migration.
- Keep migration filenames timestamped and descriptive, for example `YYYYMMDDHHMMSS_add_venue_hours.sql`.
- A migration recorded in the database but missing from Git must be reconciled before further schema changes. Never blindly replay it.

## Required workflow
1. Create a branch and write a narrowly scoped migration.
2. Review for destructive statements, locks, data rewrites, grants, RLS, function search paths, indexes and compatibility.
3. Test on a disposable database created from the current migration history.
4. Run schema lint/security checks and automated policy tests.
5. Test upgrade from the prior schema and any needed backfill; record expected impact.
6. Capture a pre-change backup if data exists and verify it.
7. Open a pull request with purpose, risk, test evidence, deployment steps and recovery/forward-fix plan.
8. Merge only after required checks and review pass.
9. Apply to the intended non-production project; verify migration history, schema, grants, RLS and smoke tests.
10. Production requires separate explicit approval, a verified recovery path, and a controlled release window.

## Safety rules
- Verify project ID before every apply/reset/restore command.
- Never use destructive reset commands against a shared or production database.
- Avoid `DROP`, table rewrites, renames, and constraint tightening without explicit impact analysis and data migration.
- Prefer expand-and-contract changes: add compatible structures, deploy compatible code, migrate data, then remove old structures in a later reviewed migration.
- Keep data backfills bounded, restartable and observable.
- Use transactions when supported and safe; understand operations that cannot run inside transactions.
- Use database constraints and unique indexes for invariants that must survive concurrency.
- Never use real personal data in test environments unless specifically approved and protected.

## Rollback
A SQL migration is not automatically reversible. For each migration, document either a tested rollback or a forward-fix strategy. If a migration changes or deletes data, a code rollback alone is insufficient; restore from a verified backup or perform a tested compensating migration.

## Verification evidence
Record commit SHA, migration name, target environment/project ID, execution result, post-migration checks, advisor findings and operator/date. A successful API response alone does not prove application correctness.

## Drift management
Periodically compare actual schema and migration history against Git. Investigate manual changes and reconcile them with a reviewed migration; do not overwrite unexplained drift.