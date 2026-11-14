# KhelGrid Development Admin & Super-Admin Control Centre

**Status:** Development documentation and access runbook  
**Application route:** `/admin/control`  
**Development branch:** `development/admin-control-center`  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Development Supabase project reference:** `hznsbxvovjxvmnchzzqt`

> This document describes the development environment. It does not authorize production deployment, production database changes, or production role grants.

## 1. Purpose and scope

The Control Centre is the private, UI-based operations area for authorized KhelGrid personnel. It is intended to grow beyond listing moderation into a central platform operations console.

The current implementation is primarily the listing moderation and verification workflow. Dashboard counters are calculated from the records loaded by the moderation queue; they are not yet a complete platform-wide analytics or observability system.

### Planned operations areas

| Area | Scope | Delivery status |
|---|---|---|
| Executive overview | Loaded queue counts, refresh time, operational entry point | Initial implementation |
| Listing review | Private submission queue, search, claim/review workflow | Existing foundation |
| Evidence & verification | Evidence register, reviewer outcomes, verification decision | Existing foundation |
| Editorial & publication | Approve/reject, category publication data, publish/unpublish | Existing foundation |
| Moderator administration | Super-admin-managed moderator access and access history | Existing foundation; super-admin UI only |
| Audit centre | Searchable, filterable operational audit history and exports | Planned expansion |
| Security centre | Access anomalies, failed authorization trends, security alerts | Planned; not yet implemented |
| Platform health | Application errors, database health, job status and service diagnostics | Planned; not yet implemented |
| Reporting | Operational reports and controlled exports | Planned; not yet implemented |

Do not describe planned areas as available features until their code, data sources, permissions and tests exist.

## 2. How to access the development Control Centre

### A. Open the correct development deployment

1. Open the Vercel project for `khelgrid-platform` in the KhelGrid Vercel account.
2. Open **Deployments**.
3. Find the deployment whose Git branch is `development/admin-control-center` (or the latest approved development branch used for this work).
4. Confirm its deployment state is **Ready**.
5. Open that deployment's URL or its assigned branch alias.
6. Append `/admin/control` to that exact deployment URL.

Example format (replace the host with the current Ready deployment URL):

```text
https://<current-development-deployment-host>/admin/control
```

Vercel preview deployment URLs and aliases can change between commits. Do not copy a stale deployment URL from an old chat or assume that `https://khelgrid.com/admin/control` is the development site. The production domain must not be used to test development changes.

Vercel Deployment Protection / SSO may appear before the application. Complete the authorized Vercel access step first. Vercel protection and KhelGrid application authorization are separate gates.

### B. Run the development site locally

From the repository root:

```bash
npm install
cp .env.example .env.local
```

Configure the local environment with the development Supabase URL and the public/anon key for project `hznsbxvovjxvmnchzzqt`. Use the exact variable names documented in `.env.example`. Never put a Supabase service-role key in Vite/browser variables, `.env.local` committed to Git, or client code.

Then run:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/admin/control
```

The local application must be connected to the intended development Supabase project, not production.

## 3. Who can enter

The route is not a public feature and is intentionally omitted from public navigation. Knowing the URL does not grant access.

1. The operator must authenticate using an existing Supabase Auth account in the development project.
2. The authenticated user must have an active row in `public.listing_moderators`.
3. PostgreSQL authorization and the protected RPC/RLS rules decide what the user can read or change.
4. An ordinary authenticated user without an active moderator record must receive an access-denied result.
5. Anonymous visitors must not be able to read moderation submissions, evidence, access lists or audit records.

### Role capabilities

| Capability | Moderator | Super-admin |
|---|:---:|:---:|
| Read authorized moderation queue | Yes | Yes |
| Claim and review submissions | Yes | Yes |
| Add and review evidence | Yes | Yes |
| Record evidence verification | Yes | Yes |
| Editorial approve/reject | Yes | Yes |
| Save publication details and publish/unpublish | Yes, subject to database rules | Yes, subject to database rules |
| View moderator account list | No | Yes |
| Grant/change/revoke moderator roles | No | Yes |
| View moderator access audit | No | Yes |

The database is the authorization boundary. Frontend state, hidden navigation, URL obscurity, local storage and user-editable metadata are never permission checks.

## 4. First super-admin provisioning

The first super-admin is bootstrapped by a trusted database operator; there is no public self-promotion or unauthenticated bootstrap.

1. Confirm the target is the development Supabase project `hznsbxvovjxvmnchzzqt`.
2. In Supabase Authentication, invite/create the intended operator's account.
3. Verify the person's identity and exact Auth user UUID independently.
4. Follow the controlled bootstrap procedure in [Listing Moderation Access SOP](LISTING_MODERATION_ACCESS_SOP.md), using only the development project's SQL Editor.
5. Verify the resulting role and access using the application.
6. Record who approved the grant and why through the documented access-audit process.

**Do not guess an email or UUID, promote a test fixture, or grant a real super-admin role without explicit owner approval.** Before provisioning, inspect the current active super-admin set and the database's last-super-admin protections. Never put passwords, access tokens, service-role keys or personal credentials in this repository.

After a super-admin exists, routine moderator grants and revocations should be performed through the protected Control Centre UI, not by giving moderators database credentials.

## 5. Current Control Centre workflow

1. Sign in with an authorized development account.
2. Review the queue and select a submission.
3. Claim/start review where the workflow requires it.
4. Inspect the submitted details and source carefully.
5. Add HTTPS evidence with a clear description and the correct evidence category.
6. Review evidence outcomes as supporting, contradicting or insufficient.
7. Record verification separately from editorial approval.
8. Save genuine category-specific publication fields. Never invent missing addresses, dates, organizers, hosts, qualifications or venue details.
9. Record the editorial approval/rejection decision.
10. Publish only when the database's evidence, approval and category requirements are satisfied.
11. Unpublish with a clear reason when a public listing must be withdrawn.

Venue, coach, academy and trial submissions are free catalogue submissions. Listing review and verification must not be coupled to payment collection. Payment features remain outside this workflow while payments are paused.

See [Listing Submission and Moderation SOP](LISTING_SUBMISSION_MODERATION_SOP.md) for category-specific evidence and publication rules.

## 6. Privacy and discoverability

- Do not add `/admin/control` to the public header, sidebar, footer, sitemap or public calls to action.
- The route should carry `noindex, nofollow, noarchive` metadata.
- An authenticated non-moderator should see a clear access-denied screen.
- Do not expose evidence URLs, reviewer notes, submitter private data, moderator account details or audit rows to public catalogue clients.
- Search-engine directives and hidden navigation are not security controls. RLS and server-side database authorization remain mandatory.

## 7. Required release and security checks

Before calling the Control Centre production-ready, complete and retain evidence for all of the following:

- [ ] TypeScript check, lint, full Vitest suite and production build pass.
- [ ] PostgreSQL migration and moderation lifecycle tests pass in CI.
- [ ] Anonymous visitor is denied protected queue, evidence and access data.
- [ ] Ordinary authenticated user is denied protected moderation reads and writes.
- [ ] Authorized moderator can complete permitted evidence and moderation workflows.
- [ ] Moderator cannot access super-admin-only account administration or access audit.
- [ ] Super-admin can perform authorized account administration.
- [ ] Last active super-admin cannot be removed or demoted.
- [ ] Rejection, approval, verification, publication and unpublication are tested separately.
- [ ] Browser UI tests use distinct real test accounts/roles in the development environment.
- [ ] Public catalogue queries expose only eligible published records.
- [ ] Vercel preview is Ready and protected access is verified.
- [ ] No production database, production domain or production deployment was modified as part of development validation.

Database transaction/rollback tests are valuable but do not replace browser-based end-to-end testing with distinct authenticated identities.

## 8. Environment and change-control rules

- Development Supabase project: `hznsbxvovjxvmnchzzqt`.
- Keep development and production credentials separate.
- Do not apply migrations to production as part of this work.
- Do not merge or promote this branch to production without owner review and explicit approval.
- Keep changes in the development branch and review them through a pull request.
- Do not claim platform-wide health, analytics, security monitoring or audit-centre capabilities until implemented and tested.

## 9. Related repository references

- [Listing Moderation Access SOP](LISTING_MODERATION_ACCESS_SOP.md)
- [Listing Submission and Moderation SOP](LISTING_SUBMISSION_MODERATION_SOP.md)
- [Repository README](../README.md)
- [Development branch](https://github.com/khelgrid-dotcom/khelgrid-platform/tree/development/admin-control-center)
- [Control Centre development pull request](https://github.com/khelgrid-dotcom/khelgrid-platform/pull/221)

