# KhelGrid Workspace and Account Navigation

**Status:** Feature-branch implementation; validation required before merge.
**Canonical Workspace route:** `/workspace`
**Legacy dashboard route:** `/dashboard` (retained; not redirected or removed).

## Navigation placement

- Workspace is a primary item in the existing `Your Space` sidebar module, shared by desktop sidebar, collapsed rail, and mobile drawer through the existing navigation registry.
- The desktop top navigation uses **Organizations** as the public organization entry point instead of the former **SaaS** label. Workspace itself remains in the sidebar and authenticated account menu, avoiding duplicate primary navigation.
- Guests see a compact account icon at the top right. Its accessible menu offers **Sign in** and **Create account**, which open the existing authentication modal.
- Signed-in users retain the existing profile/account dropdown, with a new Workspace shortcut. Existing dashboard, profile, saved items, settings, role-specific links and sign-out entries remain.

## Workspace behavior

- Guests see an explanation of the Workspace and the existing sign-in and registration actions.
- Signed-in users see their account identity and shortcuts selected from the role currently present in the existing auth profile.
- Athlete, parent, coach, academy, host and venue-owner roles have only the corresponding existing destinations exposed in this presentation layer.
- The page does not create a new identity system, organization membership model, role assignment flow, or private data API.
- Role display and client-side link visibility are presentation only. Every protected destination must continue enforcing authorization on the server/database; never trust a client-supplied role.
- No application history, listing ownership, booking records, messages, notifications, or organization data are fabricated. The page only links to existing destinations.

## Authentication and safety boundaries

- Reuses the existing Supabase auth client and `AuthModal` for login, registration, recovery and session handling.
- Does not change Supabase schema, migrations, RLS, RPCs, Edge Functions, secrets, auth providers, redirect URLs, or production configuration.
- Does not create demo identities or bypass email verification.
- The public Workspace is not an admin interface. Moderator and super-admin governance remains in the separately protected Admin Control Center.
- Existing `/dashboard`, `/profile`, `/saved`, `/settings`, role-specific destinations, and listing submission routes remain registered.

## Validation required

Before merge, run the repository CI jobs and verify:
1. `/workspace` resolves directly and through in-app navigation.
2. Guest account icon opens and closes with outside click and Escape; Sign in and Create account open the matching existing modal tabs.
3. Guest Workspace shows no private account data and both auth actions work.
4. Signed-in users see the correct role-based links from the real session profile; direct access to protected destinations is still rejected unless backend authorization permits it.
5. Existing account dropdown actions and sign-out still work.
6. `/dashboard` and existing profile/saved/settings routes remain compatible.
7. Desktop collapsed/expanded sidebar, mobile drawer, keyboard focus, narrow widths, and responsive header are checked.
8. Typecheck, lint, tests, and production build pass on the exact PR head.
9. No production database, environment, provider, payment, or deployment configuration is changed.

This document records source intent and implementation scope. It is not evidence that CI, browser tests, auth provider configuration, or deployment has passed.
