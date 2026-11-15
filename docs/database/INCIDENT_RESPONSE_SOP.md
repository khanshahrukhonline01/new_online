# Khelgrid Database Security Incident SOP

**Status:** Initial operational procedure.

## Trigger examples
Suspected leaked credentials; unauthorized reads or writes; unexpected schema/function/grant changes; exposed private records; destructive migration; failed backup; unexplained data loss or corruption.

## First response
1. Record time (UTC), affected project/environment, observed symptom, and reporter.
2. Stop risky deployments and scheduled jobs; preserve relevant logs and commit references.
3. If a secret may be exposed, revoke/rotate it using the provider dashboard and update authorized secret stores. Never paste the secret into issues or chat.
4. Restrict affected access paths using the smallest safe change; do not make broad permission changes without checking application impact.
5. Determine scope: credentials, roles, API logs, audit logs, table policies, migrations, and affected data.
6. Notify the project owner and any required stakeholders according to applicable obligations.

## Recovery
- Do not restore into production until the target and trusted backup are verified.
- Preserve a copy of relevant evidence where lawful and necessary.
- Restore to an isolated project first when practical; verify row counts, constraints, migration state, RLS and denied access.
- Apply a fix through reviewed migration/configuration changes.
- Resume writes and traffic only after explicit approval and smoke/security tests.

## Closure
Document timeline, root cause, affected systems/data, containment, rotation, restoration point, validation evidence, notifications, and preventive actions. Do not claim resolution while scope is unknown or verification remains incomplete.

## Guardrails
Never put credentials or sensitive personal data in incident tickets. Avoid deleting evidence. Follow applicable privacy and breach-notification requirements; seek qualified advice where needed.