# Partner email verification — development setup

This flow sends partner sign-up confirmation links to the public KhelGrid application at `/partner/verify`. It must never use the separate Admin application as a tenant callback.

## Required Supabase development Auth configuration

In the **development Supabase project only**:

1. Open **Authentication → URL Configuration**.
2. Keep the Site URL pointed at the public KhelGrid development deployment (currently the public Vercel development app, not the admin app).
3. Add the exact callback URL:
   - `https://khelgrid-platform.vercel.app/partner/verify`
4. If the public development app uses additional stable preview/custom hostnames, add their exact callback URLs too. Do not add broad wildcards unless there is a specific preview workflow that requires them.
5. Review **Authentication → Email Templates → Confirm signup**. If the template constructs the confirmation link manually, use `{{ .RedirectTo }}` as the destination base instead of `{{ .SiteURL }}`. Supabase's `{{ .ConfirmationURL }}` is also supported when used as the actual confirmation link. Do not hard-code an admin hostname into the template.

Supabase ignores a requested `redirectTo` destination that is not on the project's allowed Redirect URLs list; the Site URL then becomes the fallback. This is a common reason a correct client-side redirect appears to be ignored.

## Expected acceptance flow

1. Register a new academy using the public Partner Onboarding page.
2. Confirm the outgoing sign-up request includes `redirectTo: /partner/verify` and the versioned partner intake metadata.
3. Confirm the email link returns to the public development app at `/partner/verify`.
4. Confirm Supabase establishes a session and reports a confirmed email.
5. Confirm the callback provisions the tenant using the authenticated user's session; the database RPC must assign ownership from `auth.uid()`, never from browser-supplied user IDs.
6. Confirm the browser is redirected to `/workspace/academy/overview?tenant=<slug>`.
7. Repeat the callback and verify the existing owner membership is reused rather than creating another tenant.
8. Sign in as an ordinary tenant user and verify the admin application remains inaccessible; separately test authorized moderator and super-admin identities on the isolated admin application.

## Boundaries

- This change does not modify Supabase schema, production Auth settings, production DNS, or Vercel deployment configuration.
- Partner intake metadata in Supabase Auth user metadata is descriptive onboarding input, not an authorization claim. The callback verifies the current Auth user with Supabase and the tenant-owner RPC must derive ownership from the authenticated database identity.
- If the Auth membership lookup fails, onboarding fails closed and does not create a second tenant.
- The admin app remains a separate operator-only application. A tenant's email verification is never an admin grant.
