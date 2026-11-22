# Audit & Incident Model

## Current State (End of Phase 1)
- Existing database audit tables (`listing_submission_audits`, `listing_moderator_access_audits`, `user_role_audit_logs`, and unapplied `saas_audit_logs`) remain fragmented and are not yet unified.
- `listing_submission_audits` and `listing_submission_versions` read paths require Phase 2 SQL privilege repair (`ADM-HIGH-005`).
- KhelChronicle editorial actions do not yet emit editorial audit records (`ADM-MED-004`, planned for Phase 6).
- Authentication events, failed privileged operations, and admin exports are not yet recorded in a unified append-only table (planned for Phase 7).

## Honest Telemetry Guarantee
- Artificial latency clamping (`Math.max(12, Math.min(80, ...))`) has been removed from `AdminApp.tsx`.
- Unimplemented Fraud/Dispute threat views have been quarantined to an honest `Unavailable` state with zero simulated alerts or fabricated scores.
