# KhelGrid Play — Phase 3.5 RPC/API security hardening

**Scope:** the production-grade Supabase database foundation for KhelGrid's next website version. The current live website deployment is separate and is not changed by this database work.

## Implemented in this branch

- Guest RSVP remains available to `anon` and `authenticated`; its atomic reservation logic and SHA-256 cancellation-token storage are preserved.
- The RSVP RPC no longer returns a WhatsApp invite URL.
- Added host-only reservation invitation approval and bearer-token-protected invitation retrieval. A guest can retrieve the link only after the host approves the reservation or a trusted phone-verification process sets `phone_verified_at`.
- Browser roles cannot update `phone_verified_at` or the approval timestamp directly.
- Direct execution of `is_pickup_game_admin()` is revoked from PUBLIC, anon and authenticated; management RPCs continue to invoke the helper internally.
- Host management operations fail closed when a configured Supabase backend is missing a token, unavailable, rejects the request, or returns a malformed response. No in-memory success is reported in configured deployments.
- Added database regression coverage for invitation withholding, approval ownership and gated retrieval; added frontend tests for configured-backend failures.

## Explicitly unresolved / follow-up required

1. **Guest rate-limit identity:** the existing server-side counter is keyed by hashed phone number (and account ID when signed in). Anonymous users can rotate phone numbers. A trustworthy network/IP signal is not currently wired into this direct PostgREST RPC. Do not accept a client-supplied IP header as trusted. A gateway/Edge Function with a verified platform-provided client IP, or an equivalent trusted abuse-control service, is required before claiming robust anonymous abuse prevention.
2. **Phone verification provider:** the schema supports a trusted verification timestamp, but no OTP provider/callback has been integrated. Host approval is the currently usable release path.
3. **Private schema relocation:** existing management and guest RPC implementations remain in `public`. The database catalog confirms that their owner is `postgres`, their `search_path` is empty, and their grants are explicit: guest RSVP/cancellation/invite retrieval are executable by `anon` and `authenticated`; host/admin operations are executable by `authenticated`; `service_role` retains backend execution. The helper `is_pickup_game_admin()` is executable only by `postgres` and `service_role`. No direct table triggers were found on the pickup-game tables. Moving implementations requires preserving PostgREST RPC compatibility and validating every internal dependency. Do not begin that migration until the actual Data API exposed-schema and per-function exposure settings are verified in the Supabase dashboard; SQL settings alone did not reveal the effective exposure configuration.
4. **Security Advisor:** anonymous SECURITY DEFINER warnings for guest RSVP, cancellation and token-gated invitation retrieval are intentional public guest workflows, but must continue to be reviewed. Authenticated management SECURITY DEFINER RPCs are also flagged by the generic advisor; each must retain its internal owner/admin checks. Do not blanket-revoke these necessary RPC grants.
5. **Trusted anonymous abuse signal:** phone/account rate limits remain bypassable by rotating guest phone numbers. No client-supplied IP header may be trusted. A verified platform-provided client-IP signal must be introduced through a controlled gateway/Edge Function or equivalent abuse-control service before claiming robust anonymous abuse prevention.
6. **Cancellation capacity invariant:** host cancellation, administrator force-cancellation, and reopening must leave no active reservations and must keep `confirmed_players` / `spots_open` consistent. The follow-up migration and regression test cover host and administrator cancellation, waitlist promotion, and fresh RSVP after reopening.

## Verification performed

- Applied both Phase 3.5 migrations to development project `hznsbxvovjxvmnchzzqt`.
- Confirmed RSVP returns a null WhatsApp URL; guest RSVP and cancellation remain callable; anon cannot approve; authenticated hosts can approve; anon can call the token-gated retrieval endpoint.
- Ran transactional SQL checks covering guest RSVP, withheld invitation, pending state, host approval and subsequent token-based link retrieval. Fixture writes were rolled back.
- The current live website deployment was not changed. The production-grade database foundation for the next website version has already received the earlier Phase 3.5 migrations; the cancellation-capacity correction in this follow-up is proposed for review and has not been applied yet.
