# Change Management and Release Approval

**Status:** Draft

Documentation and isolated feature-branch work do not authorize production changes. Explicit approval is required before merging, applying production migrations, changing production secrets, DNS, domain settings or deployment configuration.

Every change request records purpose, scope, affected systems, risk, dependencies, test evidence, backup/rollback, data/privacy/legal impact and approver.

## Release gates
- Requirements and acceptance criteria agreed.
- Code review and required CI checks passed.
- Security/privacy/content review completed as relevant.
- Preview validated against the intended environment.
- Migration and rollback plan approved if data changes.
- Project owner explicitly authorizes production release.
- Post-release smoke checks and monitoring assigned.

Emergency changes must be documented and followed by review; urgency does not excuse secret exposure or unsafe data handling.