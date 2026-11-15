# Khelgrid Database Security Policy

**Status:** Initial policy; implementation and verification required  
**Scope:** The independent `khelgrid-platform` Supabase project and all environments derived from this repository.

## Principles
- Least privilege: grant only the minimum permissions needed for each role and feature.
- Separate environments: never use development credentials against production; production remains isolated until an approved migration plan exists.
- Deny by default: enable and test Row Level Security (RLS) on every table exposed through the Supabase Data API.
- No secrets in Git: never commit database passwords, service-role/secret keys, access tokens, or populated environment files.
- Traceable changes: schema and permission changes must be reviewed SQL migrations committed to Git.
- Validate at the database boundary: use constraints, foreign keys, appropriate transactions, and server-side authorization for sensitive actions.
- Do not treat a publishable/anon key as authorization. RLS and grants must enforce access.

## Roles and access
- Anonymous users may read only explicitly public, published records allowed by RLS.
- Authenticated users may access only records permitted by their identity and explicit policies.
- Privileged service credentials are server-side only, never bundled into browser code.
- Administrative actions require a separately authorized server-side path and auditable records.
- Revoke direct execution on SECURITY DEFINER functions from PUBLIC and API roles unless there is a documented, reviewed requirement.
- SECURITY DEFINER functions must set a safe `search_path`, qualify object names, validate inputs, and be tested for privilege escalation.
- Do not grant table privileges broadly merely because RLS is enabled; grants and policies are separate controls.

## Table and policy requirements
- Each new table requires an owner, data classification, intended readers/writers, grants, RLS policies, indexes, constraints, and tests.
- Verify policies for SELECT, INSERT, UPDATE, and DELETE independently.
- Test cross-user access and unauthenticated access; test both allowed and denied paths.
- Public catalogues must not expose drafts, private contact details, unpublished prices, secrets, or internal moderation notes.
- Use restrictive input validation and bounded text/number fields where appropriate.
- Use a safe timestamp strategy; clients must not be able to forge server-maintained audit timestamps.
- Never rely only on front-end checks for booking conflicts, payments, approvals, or ownership.

## Secrets and operations
- Store secrets only in approved environment/secret stores with restricted access.
- Rotate credentials immediately after suspected exposure; review logs and affected permissions.
- Use MFA for GitHub, Supabase, and backup storage accounts where available.
- Restrict dashboard and repository collaborator access; review access at least quarterly and after personnel changes.
- Avoid logging access tokens, passwords, payment data, or unnecessary personal information.

## Change gates
Before applying a migration: review SQL, test on a clean isolated database, test relevant existing-data compatibility, verify RLS/grants, capture a pre-change backup when data exists, and record a rollback or forward-fix plan. Production changes require explicit approval and a tested recovery path.

## Incident response
Contain access, rotate exposed secrets, preserve relevant audit evidence, assess affected data, restore only from a verified trusted source, and document corrective actions. Do not delete logs or claim an incident is resolved before verification.

## Verification
This policy is not evidence that controls are implemented. Track each control in the database operations checklist and record actual test results.