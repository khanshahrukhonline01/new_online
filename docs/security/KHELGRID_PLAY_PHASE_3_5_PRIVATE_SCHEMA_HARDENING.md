# KhelGrid Play Phase 3.5 — private-schema RPC hardening

**Status:** Draft PR for review; migration is not applied to the hosted Supabase database.  
**Scope:** Supabase database security only. No live website deployment or frontend contract changes.

## Confirmed findings

Database inspection on 2026-11-05 established:
- All 15 application RPCs were executable by both `anon` and `authenticated`.
- Default function ACLs for both `postgres` and `supabase_admin` explicitly granted `anon` and `authenticated` EXECUTE in `public`.
- Authenticated listing-moderator RLS failed with SQLSTATE `42501`: policies call `is_listing_moderator()`, but authenticated execution had been revoked.
- The `private` schema did not exist.
- Six internal helpers have dependencies from RLS policies, host/admin RPCs, table triggers, or the `ensure_rls` event trigger.

## Migration design

1. Create a non-exposed `private` schema; grant schema USAGE only to authenticated because two helpers are called by authenticated RLS policies and an invoker moderation RPC.
2. Move six internal helpers by OID: `enforce_listing_moderation_transition`, `is_listing_moderator`, `is_pickup_game_admin`, `rls_auto_enable`, `set_listing_submission_updated_at`, and `set_updated_at`.
3. Rewrite stored function bodies that schema-qualify the policy helpers, preserving all 15 public RPC signatures, argument names/defaults, return types, and security modes.
4. Preserve anon access only to the three guest RPCs (RSVP, reservation cancellation, token-gated invite retrieval); grant the other 12 public RPCs to authenticated only.
5. Keep `is_listing_moderator` SECURITY INVOKER and `is_pickup_game_admin` SECURITY DEFINER with an empty search path.
6. Remove direct browser execution from internal trigger/event-trigger helpers.
7. Correct future function defaults for both known creators: revoke global PUBLIC EXECUTE and public-schema anon/authenticated defaults. Retain the existing public-schema service_role default. Make private-schema defaults deny-by-default.

## Dependency checks

The migration and regression suite check 10 table triggers, the `ensure_rls` DDL event trigger, policy references, rewritten PL/pgSQL helper calls, and an event-trigger smoke test that creates a transactional public table and verifies RLS is enabled.

## Public RPC access matrix

| RPC group | anon | authenticated |
|---|---:|---:|
| RSVP, reservation cancellation, token-gated invite retrieval (3) | Allow | Allow |
| Host management (8) | Deny | Allow |
| Play administration (2) | Deny | Allow |
| Listing moderation (2) | Deny | Allow |

## Regression coverage

`supabase/tests/phase35_private_schema_security.sql` verifies all 15 contracts and the ACL matrix; private schema/helper privileges; absence of PUBLIC function execution; future default ACLs; trigger/event-trigger dependency preservation; event-trigger RLS behavior; active moderator RLS SELECT and review; and non-moderator denial.

Also rerun `supabase/tests/phase3_host_authorization.sql` and the existing invitation-gating regressions.

## Review and deployment gate

Do not apply this migration to the hosted project from this PR. Before deployment:
1. Run the full database suite against an isolated database matching the hosted schema.
2. Run Phase 3 host authorization and invitation-gating regressions.
3. Review exact RPC signatures, ACLs, helper references, and trigger dependencies.
4. Confirm exposed schemas remain `public` and `graphql_public`; never expose `private`.
5. Run Security Advisor in the controlled environment and interpret remaining SECURITY DEFINER warnings by intended caller.
6. Obtain explicit deployment approval and a backup/rollback plan.

This PR is a review artifact only. It does not authorize migration application or Phase 4 work.
