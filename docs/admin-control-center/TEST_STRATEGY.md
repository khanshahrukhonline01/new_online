# Test Strategy — KhelGrid Admin Control Center

## Testing Layers
1. **Pure Logic Unit Tests (`node:test` + `vitest`):**
   - `apps/admin/src/auth/adminSecurityPolicy.test.ts` & `adminSecurityPolicy.node.test.ts`: Exact origin allowlist, anon key validation, fail-closed auth gate state machine across all 8 scenarios, safe redirect validation, synthetic evidence URL blocking, and workspace quarantine boundaries.
   - `src/shared/auth/authorizationService.test.ts`: `localStorage` and `user_metadata` tamper resistance and fail-closed `['visitor']` fallback.
2. **Component & SSR Render Tests (`vitest`):**
   - `apps/admin/src/AdminApp.test.tsx`: Verifies zero shell/sidebar/Super Admin flash for anonymous/unconfigured states and verified rendering with real Sign Out when authorized.
   - `src/modules/admin/AdminControlPanelPage.test.tsx`, `AdminModerationPage.test.tsx`, `AdminAnalyticsDashboard.test.tsx`.
3. **Browser Verification (`playwright-cli`):**
   - Unconfigured / misconfigured origin fail-closed view.
   - Anonymous visitor view on approved development origin (verifying sign-in gate, zero sidebar flash, desktop & mobile responsive layout).
   - Public app (`localhost:3000`) isolation check.
4. **Pending Automated Layers (Phases 2 & 10):**
   - Isolated PostgreSQL RLS/grant/RPC assertion suite (blocked locally by absence of `psql`/`docker`/`supabase` CLI).
   - Authenticated 4-identity + multi-tenant Playwright E2E suite against dedicated development test accounts.
