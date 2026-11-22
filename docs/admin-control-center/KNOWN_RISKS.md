# Known Risks & Remaining Vulnerabilities (Post-Phase 1)

## Resolved in Phase 1
- `ADM-CRIT-001` — Root-level fail-closed `AdminAuthGate` added; hardcoded `Super Admin` and `admin@khelgrid.com` defaults removed.
- `ADM-CRIT-002` — `AdminGroundOversightView.tsx` `localStorage` mutations quarantined behind honest `Unavailable` panel.
- `ADM-CRIT-004` — Synthetic fact fabrication and fake `khelgrid.com/verify/*` evidence generation removed from `AdminModerationPage`, `AdminAnalyticsDashboard`, and `AdminControlPanelPage`.
- `ADM-HIGH-001` — CSS `display: none !important` rules hiding Sign Out removed; visible Sign Out wired in `AdminHeader` and command palette.
- `ADM-HIGH-003` — `auth-client.ts` and `authorizationService.ts` hardened against `localStorage`/`user_metadata` role spoofing and fail closed to `['visitor']`.
- `ADM-HIGH-006` — Hardcoded Supabase anon key & silent dev URL fallback removed from `apps/admin/vite.config.ts`; `.includes()` replaced with exact `URL.origin` check.
- `ADM-HIGH-007` — `AdminAnalyticsDashboard` substring auth gate replaced with explicit fail-closed state + `onAuthStateChange` revocation listeners added.
- `ADM-MED-001`, `ADM-MED-002`, `ADM-MED-003`, `ADM-LOW-001`, `ADM-LOW-002` — Resolved in Phase 1.

## Open Risks Requiring Phase 2+ Implementation
1. **`ADM-CRIT-003` (CRITICAL — DB):** `GRANT UPDATE ON TABLE public.listing_submissions TO authenticated` allows direct PostgREST bypass of moderation RPCs and audit logs. *Target: Phase 2.*
2. **`ADM-HIGH-002` (HIGH — DB):** Four fragmented admin/role subsystems (`listing_moderators`, `user_roles`, `is_pickup_game_admin()`, unapplied `has_platform_role()`). *Target: Phase 2.*
3. **`ADM-HIGH-004` (HIGH — DB):** `has_role(uuid, text)` and `get_user_effective_permissions(uuid)` allow arbitrary UUID role enumeration. *Target: Phase 2.*
4. **`ADM-HIGH-005` (HIGH — DB):** Phase A `REVOKE ALL` broke `SELECT` on `listing_submission_audits` / `_versions` / `user_roles` and re-opened direct `INSERT` on `listing_submissions`. *Target: Phase 2.*
5. **`ADM-HIGH-008` (HIGH — Infra/Auth):** No `vercel.json` security headers; no MFA (`aal2`) enforcement yet. *Target: Phases 2 & 8.*
6. **`ADM-MED-004` (MEDIUM — DB):** KhelChronicle editorial actions use direct table `UPDATE` without state-machine RPC or audit table. *Target: Phase 6.*
7. **`ADM-MED-005` / `ADM-MED-006` (MEDIUM):** Full 4-identity authenticated Playwright E2E and unified audit log viewer pending Phases 7 & 10.
8. **Environment/Git Limitation:** `.git` metadata and local PostgreSQL (`psql`/`docker`/`supabase` CLI) are absent in this sandbox and must be verified in a full local Git + Postgres environment before merging.
