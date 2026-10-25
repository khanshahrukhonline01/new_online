# KhelGrid Testing and Release Gates

Status: Required baseline for private rebuild. Last reviewed: 2026-10-25.
A check is passed only with a recorded result for the exact commit.

## Pull-request gates
- [ ] Reproducible dependency install from committed lockfile.
- [ ] Lint/format, typecheck, unit tests and build.
- [ ] Integration tests against isolated non-production services.
- [ ] Authorization/RLS tests for protected data.
- [ ] Migration forward validation and reviewed rollback/forward-fix plan.
- [ ] Route/SEO smoke tests for changed pages.
- [ ] Accessibility/responsive checks for changed UI.
- [ ] Security/dependency scan appropriate to project.
- [ ] No secrets or production credentials in source or build.
- [ ] Required review approval.
First map each gate to an existing script/workflow; do not assume it already exists.

## Test layers
- Unit: validation, state transitions, expiry, normalization and UI state.
- Integration: constraints, RLS, RPC atomicity, API contracts, auth and provider adapters.
- Security: anonymous access, owner access, cross-user denial, forged fields, revoked tokens, rate limits and malformed inputs.
- End-to-end: search/detail; owner submission/review; CV create/edit/share/revoke/export; booking hold/confirm/cancel; application lifecycle; consent; deep link; provider outage/stale data.
- Operations: deploy smoke test, rollback, secret rotation, alert delivery, isolated backup restore and incident drill.

## Test-data policy
Use synthetic fixtures only in isolated test environments, clearly label them and never publish them as real. Avoid production personal data. Tests must not send real notifications, emails, payments or third-party requests unless a sandbox is explicitly configured.

## Merge gate
Merge only when required CI passes on exact head SHA, security/data/privacy diff is reviewed, migrations are tested, provider terms/costs are approved, owner approves scope, and no P0 blocker remains.

## Production release gate
- [ ] Release candidate SHA and release notes recorded.
- [ ] Environment/configuration reviewed without exposing secret values.
- [ ] Backup/recovery readiness checked.
- [ ] Monitoring and rollback plan ready.
- [ ] Staging smoke tests pass.
- [ ] Owner authorizes deployment.
- [ ] Post-deploy smoke test and rollback trigger defined.

## Evidence template
Feature/requirement; environment; commit SHA; command/workflow; run URL; pass/fail/blocked/not run; scenario; limitation; reviewer/date.

A failed required check means no merge. If blocked by unavailable services, record blocked/not run, never passed. A build alone does not prove authorization or production readiness.
