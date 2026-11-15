# KhelGrid Theme System — Development Implementation

**Scope:** development branch only. No production deployment, DNS, database or payment changes are part of this work.

## Product decisions

- KhelGrid identity remains navy and emerald; the default accent is Emerald Green (#10B981).
- Optional accent palettes: Royal Blue (#2563EB) and Dynamic Orange (#F97316).
- Appearance modes: Light, Dark and System.
- Accent colour changes interface emphasis, not the KhelGrid logo or brand assets.
- Density remains the existing Comfortable/Compact preference.

## Architecture

- `src/shared/preferences.ts` owns typed preference values, defaults, local persistence and root DOM application.
- `src/shared/usePreferences.ts` synchronizes preference updates across mounted consumers and listens for operating-system appearance changes.
- `src/shared/ThemeProvider.tsx` exposes the active theme context to the public and admin applications.
- `src/styles.css` defines the shared CSS custom-property palettes.
- Public settings expose all three accent palettes and the three appearance modes.
- The separate admin entry mounts the same provider and exposes its own compact appearance controls.

## Persistence and privacy

Preferences are stored in browser local storage. This survives refreshes on the same browser origin but is not an account-synced preference and does not automatically transfer between the public and admin origins. No database schema or user profile data is changed.

## Accessibility

- Accent controls use semantic buttons, `aria-pressed`, and visible focus indicators.
- Admin selectors have visible labels and keyboard focus.
- Small-screen controls wrap rather than overflow.
- Existing reduced-motion preference remains in place; system-level reduced-motion CSS is also respected in the admin shell.

## Validation still required before calling this complete

1. Run public and admin TypeScript checks, unit tests, lint and production builds in CI.
2. Add/complete Playwright coverage for all three accents, Light/Dark/System, refresh persistence, operating-system theme changes and mobile layouts.
3. Visually inspect every public route and the separate admin preview. Some legacy module styles still contain hard-coded green/blue/orange values and require a route-by-route design-token audit before claiming every element recolours consistently.
4. Verify no changes reached the production Vercel project, production Supabase project, DNS or live domain.

## Known limitation

Local storage is origin-scoped. The public website and admin application each remember their own selection. Account-level synchronization is intentionally not introduced in this UI-only phase.
