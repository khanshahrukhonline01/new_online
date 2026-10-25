# Khelgrid Database Backup and Recovery SOP

**Status:** Procedure defined; automation, storage and restore drill remain to be implemented and verified.  
**Scope:** New platform database only. Never run these procedures against production without a separate approved plan.

## Backup objectives
- Keep schema history in Git migrations and data exports separate from code.
- Keep backup copies outside the database provider and protect them with access controls and encryption.
- Set recovery point and recovery time objectives before real user data is introduced. Weekly backups alone may be insufficient once data changes frequently.
- A backup is considered valid only after integrity checks and a successful restore test.

## Proposed schedule
- Before any schema migration that could affect data: capture a pre-change backup when data exists.
- Initial low-volume development stage: weekly logical export plus backup-manifest and integrity check.
- Before accepting user-generated or business-critical data: choose a frequency based on acceptable data loss; consider daily or more frequent exports.
- Monthly: restore the latest backup to a disposable isolated database and record the outcome.
- After a failed export or failed verification: alert the operator, investigate, and rerun; do not mark the cycle successful.

These are Khelgrid operational targets, not claims about Supabase Free plan capabilities. Confirm provider limits, database size, and export options before selecting tooling.

## Backup contents
1. Database schema and migration history.
2. Application data required for recovery, excluding unnecessary secrets.
3. A manifest with UTC timestamp, project/environment identifier, tool/version, scope, record counts where practical, file sizes, and SHA-256 checksums.
4. Restore instructions and migration commit SHA.

Do not store database passwords, API secrets, service-role keys, or unencrypted sensitive exports in Git or ordinary shared folders.

## Storage
- Store encrypted exports in a restricted backup location separate from the database provider (Google Drive may be used only after encryption and access controls are configured).
- Restrict access to named operators; enable MFA and review sharing permissions.
- Use unique timestamped names; do not overwrite the only known-good backup.
- Define retention only after considering privacy obligations, storage limits, and recovery needs. Securely expire backups at the end of retention.

## Procedure
1. Confirm the exact target project ID and environment.
2. Confirm backup tooling is compatible with the Supabase/PostgreSQL version and includes required data.
3. Export schema/data with a documented command; capture stderr and exit status.
4. Encrypt the output before upload/storage.
5. Generate SHA-256 checksum and manifest; verify the checksum after upload.
6. Confirm backup files are accessible to an authorized recovery operator.
7. Record success only if all checks pass. Never print secrets in logs.
8. Notify the operator on failure and keep the last verified backup.

## Restore drill
1. Choose a disposable, isolated project; verify its project ID twice.
2. Never restore over production or the only source database during a drill.
3. Download and decrypt using approved access; verify checksum before restore.
4. Restore schema and data in documented order; apply migrations only if the restore strategy requires them (avoid double-applying schema).
5. Run integrity checks: expected tables, constraints, row counts, migration state, and RLS/grants.
6. Run application smoke tests and denied-access tests.
7. Record duration, failures, data loss window, and corrective actions.
8. Destroy disposable resources only after confirming they contain no needed evidence or data.

## Supabase-specific caveats
Supabase plan features and export behavior can change. Do not assume automatic backups, point-in-time recovery, or downloadable provider backups are included in the Free plan. Validate current project limits and use a tested logical export where appropriate. A Git repository is not a data backup.

## Recovery decision
The project owner authorizes recovery. Identify the incident, choose the latest verified backup, assess the acceptable loss window, isolate the target, restore and validate, then document the outcome. Do not redirect traffic or declare recovery complete until integrity and security checks pass.