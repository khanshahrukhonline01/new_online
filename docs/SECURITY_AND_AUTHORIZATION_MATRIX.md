# KhelGrid Security and Authorization Matrix

Status: Target policy, not proof current policies enforce it. Last reviewed: 2026-10-25.

## Roles
- Anonymous visitor: deliberately public, published data only.
- Authenticated user/athlete: own profile, CV, applications, saved items and preferences.
- Venue owner: own submissions; cannot approve or publish own venue.
- Coach/academy/organizer: own organization data; verification by separate reviewer.
- Reviewer/moderator: assigned review actions with audit trail.
- Administrator: least-privilege operations, high-impact actions audited.
- Backend service: narrowly scoped server-only credentials; never service-role key in browser.

Roles must come from trusted server/database state, not request fields or local storage.

## Resource access matrix
| Resource | Anonymous | Owner | Other user | Reviewer/admin |
|---|---|---|---|---|
| Published sports/opportunities | Read public fields | Read | Read | Review/publish/archive if assigned |
| Unpublished listings | Deny | Deny unless assigned | Deny | Assigned only |
| Athlete profile/CV | Explicit public allowlist only | Read/update own | Deny private fields | Exceptional audited access |
| CV share | Allowlisted fields only when enabled | Manage/revoke own | No private fields | Audited exceptional access |
| Application | Deny private details | Own record only | Deny | Limited assigned review |
| Venue submission | Deny queue | Own pending submission | Deny | Review/approve/reject |
| Published venue/court | Public fields | Read | Read | Manage/publish |
| Booking/hold | Deny private details | Own records and valid actions | Deny | Restricted audited support |
| Payment/wallet | Deny | Own records; no client-authoritative balance | Deny | Narrow audited role |
| Notification subscription | Deny | Own subscription/device | Deny | Operational minimum only |
| Audit/security logs | Deny | Deny | Deny | Restricted staff |

## Mandatory authorization tests
For each protected table, RPC, API and tool test: anonymous request; owner access; cross-user denial; forged owner/role/status/price; forbidden transition; missing/expired/revoked token; admin path and audit; safe error response. Record endpoint, identity, expected/actual result, commit and run URL.

Do not infer safety from a migration filename. Inspect the final effective RLS policies because permissive policies can combine. RLS row filtering does not automatically hide sensitive columns.

## Security rules
- Enforce ownership in RLS and server code.
- Use explicit projections/views for public fields.
- Validate critical invariants in server and database.
- Use atomic transactions and constraints for concurrent operations.
- Never place secrets or private payloads in URLs/logs.
- Use opaque, high-entropy, revocable share tokens with expiry and field allowlists.
- Verify webhook signatures and replay protection.
- Rate-limit public endpoints and expensive provider/AI calls.
- Redact logs; separate dev/staging/prod projects and credentials.

## Release blockers
Any confirmed cross-user access, anonymous private-data exposure, client-authoritative price/balance/status, self-approval, browser secret, unsafe sensitive share link, or fabricated data presented as live/verified blocks release.
