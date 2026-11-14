# KhelGrid private admin acceptance gate

This suite targets only the isolated development admin application. It does not authorize production deployment, DNS changes, removal of the public application's legacy admin route, or production database changes.

## Dedicated test identities

Configure GitHub Actions repository secrets (or equivalent local environment variables):

- `ADMIN_BASE_URL`: protected development admin URL.
- `KG_DEV_SUPABASE_ANON_KEY`: development project's publishable/anon key (never a service-role key).
- `KG_ADMIN_TEST_USER_EMAIL` and `KG_ADMIN_TEST_USER_PASSWORD`: dedicated ordinary development user.
- `KG_ADMIN_TEST_MODERATOR_EMAIL` and `KG_ADMIN_TEST_MODERATOR_PASSWORD`: existing `khelgrid@gmail.com` moderator credentials; do not change its role.
- `KG_ADMIN_TEST_SUPER_ADMIN_EMAIL` and `KG_ADMIN_TEST_SUPER_ADMIN_PASSWORD`: dedicated temporary development super-admin.

Create the ordinary user and temporary super-admin through Supabase Dashboard → Authentication → Users → Invite user. After invitation/confirmation, use the existing trusted operator workflow to grant the super-admin role and retain its access audit record. Do not insert directly into `auth.users`, use user-editable metadata for authorization, or share credentials in source control.

## Run locally

Install the pinned test runner without changing the app dependency manifest:

```bash
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

To test a protected deployment, set `ADMIN_BASE_URL` and all three identity credential pairs before running the command.

## Acceptance coverage

- Anonymous session sees only the sign-in screen.
- Ordinary authenticated user is denied queue/evidence/governance data.
- Existing moderator can access listing moderation but not super-admin controls.
- Dedicated super-admin can access governance and access history.
- Moderator sign-out removes private UI and returns to sign-in.

## Remaining manual/hosted gates

The browser suite must run against the protected development deployment with all identities provisioned. Separately verify server-side RPC denial for anonymous and ordinary users, moderator-only RPCs, super-admin-only access grants, session revocation/expiry, and last-super-admin protection. UI tests do not replace database/RLS tests. Review each Supabase advisor finding individually before any privilege change.
