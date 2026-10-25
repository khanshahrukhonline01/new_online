# KhelGrid Incident Response and Disaster Recovery

Status: Operational baseline; owners and target times require approval. Last reviewed: 2026-10-25.
Never run destructive recovery actions against production without explicit approval and a reviewed plan.

## Severity
- SEV-1: data exposure, compromised secret, major outage or integrity loss affecting many users.
- SEV-2: critical feature outage, booking integrity issue, suspected corruption or backup/recovery concern.
- SEV-3: isolated degradation or stale data with safe fallback.
- SEV-4: cosmetic or low-impact defect.

## First-response checklist
1. Record detection time, service/environment, reporter and evidence.
2. Assign incident lead and technical owner through approved channels.
3. Preserve logs/metrics and commit/deployment IDs; redact tokens and personal data.
4. Assess confidentiality, integrity, availability, financial and user impact.
5. Contain safely; preserve evidence before destructive fixes.
6. Escalate privacy/security incidents according to applicable legal/contractual obligations.
7. Communicate verified facts only.
8. Recover with reviewed steps and verify with smoke/integrity tests.
9. Record timeline, root cause, corrective actions, owners and due dates.

## Playbooks
### Secret exposure
Revoke/rotate credential, inspect scope/access logs, identify exposure window, remove from current config and history where possible, then verify replacement without exposing values.

### Unauthorized data access
Contain path, preserve evidence, review effective RLS/grants/routes/logs, assess impact, follow applicable notification obligations, and add regression tests before re-enabling.

### Booking/data integrity
Pause affected operations if safe and authorized; preserve transaction records; reconcile booking, hold, price and provider events; never overwrite balances/statuses without reconciliation.

### Provider outage/stale feed
Show unavailable/stale state and last update; use bounded retries; never substitute fabricated scores; follow provider escalation terms.

### Failed backup
Preserve artifact/checksum, restrict access, verify integrity/key custody and restore only into an isolated environment first.

## Backup/restore standard
Document database/object coverage, frequency, retention, encryption and access. Verify checksum; inspect archive; restore into an isolated disposable DB; validate schema, critical counts, constraints and application smoke tests; record recovered timestamp, duration, errors and data gap. Test periodically and after workflow changes.

## Recovery objectives (owner approval required)
| Data/service | Proposed RPO | Proposed RTO | Status |
|---|---|---|---|
| Public catalogue | TBD | TBD | Pending |
| Profiles/CVs/applications | TBD | TBD | Pending |
| Venue bookings/transactions | TBD | TBD | Pending |
| Provider caches | TBD | TBD | Pending |
| Security/audit logs | TBD | TBD | Pending |

## Release rollback
Record release commit, migrations and provider/config changes. Define rollback trigger/owner and smoke tests before release. Database rollback can be unsafe after writes; use reviewed forward-fix/restore strategy. Verify health and data integrity after rollback.

## Monitoring
Define thresholds and owners for availability/latency/errors, stale-feed age, booking conflicts, auth denials, rate-limit spikes, backup age/job failure and restore drills. Never log passwords, tokens, service-role keys, full private CV payloads, payment details or sensitive personal data.

## Post-incident review template
Incident ID/severity; timeline; impact/environment; containment/recovery; root cause; data/security assessment; evidence/commit references; corrective actions/owners/due dates; regression tests/monitoring changes; review approval/date.
