# Reliability, Monitoring and Incident Response

**Status:** Draft baseline

## Reliability
Define measurable availability, latency, error-rate, recovery-point and recovery-time targets before promising them. Monitor application errors, API failures, stale feeds, quota exhaustion and database health without collecting unnecessary personal data.

## Incident procedure
1. Detect and classify severity.
2. Contain impact and protect users/data.
3. Notify the responsible owner.
4. Preserve relevant logs without exposing secrets.
5. Recover via tested rollback/forward fix.
6. Verify service and data integrity.
7. Record root cause, impact, actions and follow-ups.

## Observability
Use structured, redacted logs and actionable alerts. Do not log passwords, access tokens, private CV data or payment details. Define retention and access.

## Acceptance
Assign incident ownership and escalation, test recovery procedures, and publish only service claims backed by measured evidence.