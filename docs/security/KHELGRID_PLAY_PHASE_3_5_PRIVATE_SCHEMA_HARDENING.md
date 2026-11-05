# KhelGrid Play Phase 3.5 — Private-schema hardening

## Status

Preparation only. This change must not be merged or deployed until the implementation migration and all regression tests pass. No database migration is included in this preparation commit.

Target Supabase project: `hznsbxvovjxvmnchzzqt` (the production-intended database for the next KhelGrid website).

## Verified baseline

- Dashboard exposure was reduced by the project owner from 21/21 to 15/21 functions. The latest dashboard count has not yet been independently re-read through the management API.
- The database currently has `public` and `graphql_public`; no `private` schema exists.
- All 15 remaining public RPCs were observed with `EXECUTE` available to both `anon` and `authenticated`.
- The 15 include guest, host/admin, and listing-moderation endpoints. Broad grants are not acceptable for host/admin operations.
- `get_listing_submissions` and `review_listing_submission` are invoker-security functions. They depend on `is_listing_moderator()`, which is currently not executable by `authenticated`; the helper is also used by listing RLS policies.
- The Phase 2 RSVP SQL test passed.
- Existing Phase 3 and Phase 3.5 invitation-gating SQL tests failed because anonymous execution remains possible for protected host/admin RPCs and invitation approval.

## Goals

1. Preserve the exact public RPC names, argument names, argument types, return types, and PostgREST call contract used by the frontend.
2. Make `public` a narrow API boundary. Keep compatibility wrappers in `public`; move implementation-only helpers and privileged implementation bodies into an unexposed `private` schema where dependency and RLS behavior permit.
3. Grant anonymous execution only to the guest-facing RSVP, guest cancellation, and token-authorized invite retrieval endpoints, after validating their guest/token authorization paths.
4. Grant host operations to `authenticated` only, with ownership checks based on `auth.uid()` and trusted admin authorization.
5. Grant admin operations to `authenticated` only, with trusted role checks. Never trust user-editable `user_metadata`.
6. Repair listing moderator helper execution safely. Prefer a design that preserves invoker/RLS semantics and does not expose a helper as an API endpoint. If a narrowly scoped SECURITY DEFINER helper is required for RLS, pin an empty search_path, schema-qualify all objects, validate the trusted moderator source, and grant only the minimum required role.
7. Keep trigger functions callable by PostgreSQL internally while preventing direct Data API execution.
8. Preserve service-role operational access without making service-role credentials available to browsers.

## Required review before writing the migration

- Capture exact signatures and full definitions for all 15 public RPCs and all dependencies.
- Inspect all frontend `.rpc()` callsites and generated Supabase types.
- Inspect all RLS policies, triggers, grants, function owners, default privileges, and schema USAGE grants.
- Determine whether the current Supabase Data API can resolve public wrappers that call private functions under the chosen owner/SECURITY DEFINER model.
- Confirm no views, triggers, policies, jobs, or other database objects depend on function OIDs or schema-qualified names in ways that would break on move/recreate.
- Verify migration compatibility with the existing Supabase Postgres/PostgREST version.

## Required migration design

- Use a timestamped SQL migration with `BEGIN`/`COMMIT`.
- Create `private` schema with restricted USAGE/CREATE grants.
- Move/recreate internal implementations in `private` with explicit ownership and pinned search_path.
- Recreate stable public wrappers with unchanged signatures and return types.
- Explicitly revoke `EXECUTE` from PUBLIC/anon/authenticated as appropriate, then grant the minimum required role per wrapper.
- Ensure function-level ACLs are correct after creation; do not rely on default privileges.
- Do not use blanket grants or blanket revokes without enumerating each signature.
- Do not alter unrelated schemas, tables, policies, or production website deployment.
- Include rollback strategy and post-migration verification SQL.

## Regression gates

All of the following must pass against a disposable/transactional test context before applying to the production-intended database:

- Existing `supabase/tests/phase2_rsvp_integrity.sql`
- Existing `supabase/tests/phase3_host_authorization.sql`
- Existing `supabase/tests/phase35_whatsapp_invite_gating.sql`
- New anonymous-denial tests for every host/admin RPC and invitation-approval RPC.
- New host ownership tests: owner succeeds; another authenticated user fails; anonymous fails.
- New trusted-admin tests: trusted admin succeeds; ordinary authenticated user fails; user_metadata spoof fails.
- New guest tests: valid RSVP/cancellation/invite token works; invalid/expired/replayed token fails as specified.
- New listing moderation tests: non-moderator denied; moderator can list/review; RLS remains effective; helper cannot be called through the Data API.
- New wrapper contract tests: exact names, argument types/names, return types, and frontend RPC behavior remain unchanged.
- Security Advisor review: investigate every remaining warning and document accepted exceptions.

## Current blockers

The existing Phase 3 and Phase 3.5 tests currently fail on anonymous EXECUTE access. The listing moderator helper permission path is also unresolved. Do not apply any migration until these issues are fixed and the complete test suite passes.
