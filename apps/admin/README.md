# KhelGrid Admin

Private administration application for KhelGrid.

## Development

From the repository root:

```bash
npm ci
npm run dev:admin
```

The admin app is served by its own Vite configuration and entry point. It reuses reviewed browser-safe modules from the repository's existing `src/` tree.

## Build

```bash
npm run typecheck:admin
npm run build:admin
```

The build writes to the repository-root `dist-admin/` directory. The public application continues to use the root Vite configuration and `dist/`.

## Environment

Use the root `.env.local` with browser-safe Vite variables only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the configured publishable key)

For this development phase, the URL must target Supabase project `hznsbxvovjxvmnchzzqt`. Never set a service-role or secret key in a `VITE_*` variable.

## Access

The app requires Supabase Auth and an active database-authorized moderator or super-admin record. An ordinary authenticated user is denied. Vercel Deployment Protection is an additional preview gate, not a substitute for database authorization.

See [the architecture](../../docs/ADMIN_APPLICATION_ARCHITECTURE.md) and [implementation plan](../../docs/ADMIN_APPLICATION_IMPLEMENTATION_PLAN.md).
