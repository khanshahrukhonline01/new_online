# Deployment Readiness Checklist

**Current Status:** **`NOT READY`** (Phase 1 complete; Phases 2–10 pending).

## Checklist (Development Deployment Prerequisites)
- [x] Separate admin entry point (`apps/admin/index.html`) and build output (`dist-admin/`).
- [x] Hardcoded development Supabase anon JWT key and silent URL fallback removed from `apps/admin/vite.config.ts`.
- [x] Exact `URL.origin` allowlist enforced in `apps/admin/src/auth/adminSecurityPolicy.ts`.
- [x] Public app link to `admin.khelgrid.com` removed from `src/App.tsx`.
- [x] `public/robots.txt` disallows `/admin`; `apps/admin/index.html` sets `noindex, nofollow, noarchive`.
- [x] `.env.example` documents `VITE_ADMIN_SUPABASE_URL` and `VITE_ADMIN_SUPABASE_ANON_KEY` without secrets.
- [ ] Dedicated `vercel.json` security headers (`CSP`, `X-Frame-Options: DENY`, `HSTS`, `Referrer-Policy`, `Cache-Control: no-store`, `X-Robots-Tag`) configured and verified on live host.
- [ ] Phase 2 database privilege & canonical RBAC migration authored and tested in isolated PostgreSQL.
- [ ] MFA (`aal2`) enforced for privileged operators.
- [ ] Dedicated 4-identity Playwright E2E acceptance passed against isolated development accounts.
- [ ] Tested administrator recovery and rollback procedure verified.
