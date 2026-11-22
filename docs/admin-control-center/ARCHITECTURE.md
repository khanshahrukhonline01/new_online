# KhelGrid Admin Control Center — Architecture (Phase 1 Baseline)

## Deployment & Build Isolation
- **Admin Application Root:** `apps/admin/` (`apps/admin/index.html`, `apps/admin/src/main.tsx`, `apps/admin/vite.config.ts`)
- **Separate Build Output:** `dist-admin/` via `npm run build:admin`
- **Public Application Isolation:** Public `src/App.tsx` does not mount admin components and no longer exposes client-gated links to `admin.khelgrid.com` or `localhost:3001`. `public/robots.txt` explicitly disallows `/admin`, and `apps/admin/index.html` sets `noindex, nofollow, noarchive`.

## Root Fail-Closed Gate (`apps/admin/src/auth/`)
1. `adminSecurityPolicy.ts`:
   - Exact `URL.origin` allowlist (`validateAdminSupabaseOrigin`) replacing weak substring matching.
   - Strict anon key validation (`isValidAdminAnonKey`).
   - Pure fail-closed state machine (`evaluateAdminAccessGate`) blocking shell mount across `config_invalid`, `checking`, `unauthenticated`, `session_expired`, `service_unavailable`, and `access_denied`.
   - Same-origin password recovery redirect validation (`validateSafeAdminRedirectUrl`).
   - Synthetic evidence URL rejection (`isSyntheticOrUnsafeEvidenceUrl`).
2. `AdminAuthProvider.tsx`:
   - Wraps the entire `AdminApp` root. No sidebar, header, command palette, workspace component, or queue telemetry RPC executes before server-verified authorization succeeds.
   - Subscribes to `supabase.auth.onAuthStateChange`, `window.focus`, and `document.visibilitychange` to immediately clear privileged state on sign-out, expiration, or role revocation.

## Module Status Truthfulness
- **Implemented (Server-Backed UI, pending Phase 2 DB hardening):** Command Centre (`AdminControlPanelPage`), Listing Moderation Desk (`AdminModerationPage`), Operations & KPI Analytics (`AdminAnalyticsDashboard`), Chronicle Peer-Review Desk (`AdminModerationPage` chronicle view).
- **Quarantined (`Unavailable` — Planned for Phases 4–7):** Gate Check-In, Turf & Venue Oversight, Academy & Coach Oversight, Trust & Dispute Claims (`AdminGroundOversightView.tsx` now performs zero `localStorage` reads/writes).
