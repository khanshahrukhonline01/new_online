# Database Security Status (Phase 1 Boundary)

> **Important:** Per Phase 1 scope rules, **no database migrations were authored or applied during Phase 1**, and **no remote Supabase environment was contacted**.

## Confirmed Database Vulnerabilities Tracked for Phase 2
1. **Direct `UPDATE` on `public.listing_submissions` (`ADM-CRIT-003`):** `20261113174100:55` grants `UPDATE` on `listing_submissions` to `authenticated`, permitting active moderators to bypass moderation RPCs, self-approval guards, evidence requirements, and audit logging while firing `sync_verified_listing_publication_after_update`.
2. **Direct `INSERT` on `public.listing_submissions` (`ADM-HIGH-005`):** `20261113174100:47` re-opened direct intake inserts, bypassing `submit_listing_intake` rate limits and strong tracking tokens.
3. **Broken Audit/Version/RBAC Reads (`ADM-HIGH-005`):** `20261113174100` revoked `SELECT` on `listing_submission_audits`, `listing_submission_versions`, `user_roles`, `role_permissions`, and `user_role_audit_logs`.
4. **Role/Permission Enumeration Oracle (`ADM-HIGH-004`):** `has_role(uuid, text)` and `get_user_effective_permissions(uuid)` in `20261108000000` allow any authenticated caller to query arbitrary UUIDs.
5. **Fragmented Role Subsystems & Schema Drift (`ADM-HIGH-002`):** Four role models and `public` vs `private` `is_pickup_game_admin()` mismatch.
6. **KhelChronicle Direct `UPDATE` (`ADM-MED-004`):** Lacks state-machine RPC, optimistic locking, and editorial audit table.

## Local Database Verification Status
- **Status:** `NOT TESTED` (neither `psql`, `docker`, nor `supabase` CLI is installed in this sandbox).
