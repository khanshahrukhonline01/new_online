# KhelGrid Sports Creator Campaign Marketplace — Architecture & Security Review

**Review date:** 22 November 2026  
**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Review type:** Read-only source/documentation review  
**Related proposal:** `docs/product/KHELGRID_SPORTS_CREATOR_CAMPAIGN_MARKETPLACE.md`  
**Decision:** **NO-GO for implementation until the blocking prerequisites below are closed.**  
**Scope boundary:** No application code, database schema, migration, Supabase environment, payment integration, or deployment was changed or tested as part of this review.

## 1. Executive decision

The proposed two-sided sports creator campaign marketplace is a reasonable product direction, but it is **not ready for implementation** against the current documented architecture.

The central issue is not the campaign workflow itself. KhelGrid's existing platform contains several security and identity foundations that must be reconciled before a new multi-tenant commercial workflow can safely reuse them:

1. Multiple overlapping platform-level role systems remain documented, with consolidation explicitly pending.
2. A separate academy/organisation SaaS tenant and membership model now exists, but it is not yet established as the canonical identity model for all KhelGrid organisations.
3. Listing moderation is a separate, established trust boundary and must not be reused as campaign approval or advertiser authority.
4. The repository's current admin security records contain unresolved historical findings and contradictory state descriptions that require current-source and development-database reconciliation.
5. The campaign proposal assumes advertiser funding, rewards, and eventual payouts, while KhelGrid payment activation remains paused.
6. The public listing intake documentation says generic registration/sign-in is paused; marketplace onboarding therefore cannot assume self-service authenticated users are currently available.

**Recommendation:** Keep the marketplace as a documentation-only proposal. First complete a read-only reconciliation of identity/RBAC and the current development database, then approve a dedicated no-payment architecture. Do not add campaign tables or routes yet.

## 2. Evidence and confidence limits

This review inspected repository documentation and selected source/migration files on the repository's default branch, plus the marketplace proposal branch. It did not connect to Supabase, execute PostgreSQL, inspect live grants, run tests, inspect private Vercel settings, or verify current deployed behavior.

Evidence labels used below:

- **Source/documentation confirmed:** directly present in a repository file inspected during this review.
- **Needs current-state verification:** repository records conflict, are historical, or do not prove current remote database state.
- **Design recommendation:** proposed target architecture, not an assertion about current implementation.

Key inspected references:

- `docs/admin-control-center/AUTHORIZATION_MODEL.md`
- `docs/admin-control-center/DATABASE_SECURITY.md`
- `docs/LISTING_MODERATION_ACCESS_SOP.md`
- `docs/contributor-centre/architecture.md`
- `docs/saas/PHASE_1_CURRENT_STATE_INVENTORY.md`
- `docs/saas/PHASE_1_ROLE_TRANSITION_MATRIX.md`
- `docs/saas/PHASE_1_RLS_TABLE_POLICY_AUDIT.md`
- `docs/audits/INDEPENDENT_PLATFORM_AUDIT_2026-11-22.md`
- `supabase/migrations/20261029182749_moderation_invoker_rls.sql`
- `supabase/migrations/20261110160000_phase_3_listing_moderation_publication_system.sql`

## 3. Findings

### F-01 — Platform RBAC is fragmented; campaign roles must not be added yet

**Severity:** Blocker / P0  
**Evidence:** `docs/admin-control-center/AUTHORIZATION_MODEL.md` explicitly lists four coexisting mechanisms: `public.listing_moderators`, `public.user_roles` plus `public.profiles.role`, pickup-game admin helpers with public/private schema drift, and an unapplied role helper whose role values conflict with a CHECK constraint.

The Admin Control Center authorization document says Phase 2 database consolidation is pending. The current Admin database security document also records role enumeration and role subsystem fragmentation as unresolved historical risks requiring reconciliation.

**Risk:** A new campaign-specific role table created before canonical RBAC is agreed could create another privilege source, inconsistent revocation, cross-module escalation, and confusing administrator semantics.

**Required action before implementation:**
- Reconcile all role tables, enums/CHECK constraints, helper functions, grants, RLS policies, RPC callers, and frontend role adapters.
- Verify actual applied migration state on the development database using read-only inspection.
- Select one canonical platform-admin authority and document its permission vocabulary.
- Keep business/creator membership roles scoped to an organisation or campaign; do not treat them as platform-admin roles.
- Add explicit negative tests for self-promotion, cross-organisation access, stale sessions, revoked access, and role-helper enumeration.

**Do not:** add `campaign_admin`, `campaign_moderator`, or `finance_admin` as another global role family before this consolidation.

### F-02 — Academy SaaS tenants are not automatically the universal organisation model

**Severity:** Blocker / P1  
**Evidence:** `docs/saas/PHASE_1_CURRENT_STATE_INVENTORY.md` describes a tenant model with `tenants`, `tenant_memberships`, tenant-scoped operational records, and RLS helpers. `docs/saas/PHASE_1_ROLE_TRANSITION_MATRIX.md` defines operational roles such as owner, director, admin, accountant, coach and staff.

The inspected records describe an academy/tenant operating model. They do not establish that every sports brand, club, event organiser, venue operator, federation, or KhelGrid-owned entity is represented by a tenant row or should be forced into that model.

**Risk:** Reusing `tenants` indiscriminately could couple campaigns to academy billing/operations semantics, create awkward non-academy tenants, or accidentally grant campaign permissions to staff roles that should not manage advertising spend.

**Required action before implementation:**
- Create an entity map for existing `profiles`, academies, coaches, venues, clubs/events (where present), tenants, and organisation ownership.
- Decide whether a canonical organisation registry exists or must be designed as a separate shared identity layer.
- Define a typed relationship from campaign organisation to its verified KhelGrid entity, with explicit ownership/authorisation evidence.
- Define campaign-specific membership permissions independently from tenant operational roles.
- Preserve multi-role user accounts without duplicating user identities.

**Design recommendation:** Use a campaign-organisation abstraction that references a verified canonical organisation/entity ID. Do not create duplicate academy/venue/coach directory records merely to make an advertiser workspace. Do not assume the proposed `campaign_organisations` table is approved until this mapping is complete.

### F-03 — Listing verification and campaign approval are separate trust decisions

**Severity:** P1  
**Evidence:** `docs/contributor-centre/architecture.md` describes the existing listing intake as a private submission queue using `submit_listing_intake(...)`, followed by Admin Control Center review and explicit publication. `docs/LISTING_MODERATION_ACCESS_SOP.md` explicitly separates editorial approval, evidence verification, and publication.

**Risk:** If a published listing automatically grants advertiser status, or if campaign approval is treated as listing verification, an organisation could promote an unverified business or use paid spend to bypass the directory's trust rules.

**Required action:**
- Keep the listing submission and publication lifecycle unchanged.
- Campaign advertiser eligibility must reference a separately verified organisation identity and authorised representative.
- Campaign approval must independently validate claims, assets, disclosures, funding/commitment, and category-specific restrictions.
- A campaign must never change a listing's verification or publication status.
- Sponsored promotion must be visibly labelled and must not imply KhelGrid endorsement or guaranteed outcomes.

**Design recommendation:** Link campaign records to canonical listing/entity IDs, but maintain separate state machines, reviewer decisions, evidence requirements, and audit trails.

### F-04 — Listing moderation security history must be reconciled before campaign admin permissions are designed

**Severity:** Blocker / P0  
**Evidence:** `docs/admin-control-center/DATABASE_SECURITY.md` records historical direct authenticated UPDATE and INSERT grants on `listing_submissions`, missing audit/RBAC reads, role enumeration concerns, and fragmented role subsystems. `docs/LISTING_MODERATION_ACCESS_SOP.md` describes a later protected RPC-based model. The records are not sufficient to prove which controls are currently deployed in the development database.

The independent platform audit dated 22 November 2026 also classifies the current admin authorization state as an evidence gap and explicitly calls for local PostgreSQL reconciliation before remote changes.

**Risk:** Campaign moderation would be built on an unverified admin trust boundary. A new admin screen cannot compensate for weak or inconsistent database authorization.

**Required action:**
- Reconcile migration history against actual development schema.
- Inspect effective grants, RLS policies, function ownership, SECURITY DEFINER search paths, EXECUTE grants, and triggers.
- Run isolated local PostgreSQL tests first.
- Prove the existing admin access model and moderator revocation behavior before adding campaign moderation.
- Treat documentation-only status statements as historical evidence, not proof of live security.

**Do not:** reuse listing moderation RPCs to approve campaign budgets, creator rewards, advertiser memberships, or payouts.

### F-05 — Authentication availability is a product dependency

**Severity:** Blocker / P1  
**Evidence:** `docs/LISTING_MODERATION_ACCESS_SOP.md` states that public self-registration and generic sign-ins are paused. This repository record may need updating, but it cannot be assumed away.

**Risk:** The marketplace concept assumes existing users can authenticate, create creator profiles, join organisations, apply to campaigns, and manage deliverables. If the current authentication posture remains paused, these workflows cannot be exposed as self-service.

**Required action:**
- Verify current public authentication configuration and approved account flows.
- Decide whether marketplace access is initially invitation-only, operator-provisioned, or enabled only after the account/security release gate.
- Define account recovery, session expiry, MFA requirements for privileged operators, and role revocation.
- Ensure no public form can grant advertiser, creator, moderator, or finance permissions.

### F-06 — Payment and reward workflow must remain disabled

**Severity:** Blocker / P0 for any money movement  
**Evidence:** The marketplace proposal itself says payment activation and creator payouts are not authorised. Existing KhelGrid security records state payment collection is paused and prohibit live transactions in the current phase.

**Risk:** A reward ledger or UI labelled payable/paid could mislead users or imply funds are held or guaranteed when no operational payment system exists.

**Required action:**
- Phase 2 may store only non-financial campaign workflow data; if reward concepts are needed, use clearly labelled synthetic/test fixtures in isolated tests.
- Do not accept campaign budgets, collect money, reserve customer funds, promise payout dates, or expose a live payout status.
- Keep real-money ledger design in a later separately approved finance/security/legal phase.
- Any future financial ledger must use integer minor units, append-only entries, idempotency, reconciliation, separation of duties, and audited compensating entries.

### F-07 — Creator channel analytics and evidence need explicit provenance

**Severity:** P1  
**Evidence:** The marketplace proposal correctly acknowledges that social platform APIs and analytics access differ by platform and account type. No current repository evidence inspected in this review establishes approved YouTube/Meta analytics integrations.

**Risk:** Self-reported screenshots or public post counts could be represented as verified analytics, used for automated rewards, or expose personal channel data without appropriate consent and permissions.

**Required action:**
- Start with public post URLs and manual evidence review only.
- Label all creator-supplied screenshots/exports as self-reported.
- Add official API integrations only after platform-specific policy, OAuth scopes, app review, retention, and privacy review.
- Keep metric capture source, timestamp, definition, verification method, and confidence/limitations.
- Never ask creators for social passwords or scrape private analytics behind login.

### F-08 — Private assets, agreements, and creator personal data need a storage design

**Severity:** P1  
**Evidence:** The listing architecture states that private evidence upload is not yet established and must be designed separately with secure storage policies. The marketplace proposal introduces creator channel details, assignment terms, private content evidence, and disputes.

**Risk:** Reusing public catalogue buckets or broad authenticated storage policies could expose contracts, identity documents, draft creative, private contact data, or moderation notes.

**Required action:**
- Design private storage buckets and object-level authorisation before file upload UI.
- Use short-lived signed URLs and server-side checks.
- Separate public campaign creative from private contracts, evidence, and moderation attachments.
- Define retention/deletion schedules and minimise collection of identity documents.
- Do not store social OAuth access/refresh tokens in client-readable rows.

### F-09 — Existing route and navigation ownership must be verified

**Severity:** P2  
**Evidence:** The contributor architecture requires preserving the existing route registry and public/admin boundaries. The marketplace routes in the proposal are explicitly provisional.

**Risk:** Proposed paths such as `/campaigns`, `/creator`, or `/admin/campaigns` could collide with existing routes, legacy aliases, or the separate admin application.

**Required action:** Inventory `src/shared/routing.ts`, `src/shared/navigation/navigationRegistry.ts`, public route tests, and the separate `apps/admin` route architecture before approving route names. Do not place admin campaign controls inside the public application merely because the proposal lists an `/admin` path.

### F-10 — No implementation verification has been performed

**Severity:** P1 verification gap  
**Evidence:** This review did not execute dependency installation, typecheck, lint, unit/integration tests, browser tests, or local PostgreSQL. The independent platform audit also documents blocked Vercel deployments and says successful builds are not established for its audited SHA.

**Risk:** A design document can be internally consistent while the target branch, migration order, CI bootstrap, or application build is not ready.

**Required action:** After architecture blockers are closed, run all tests on the exact candidate branch and commit, including local PostgreSQL RLS tests and protected-preview browser acceptance. A blocked Vercel deployment is not a successful build.

## 4. Recommended target architecture

The following is a design target only. It is not an approved schema or migration.

### 4.1 Keep four distinct trust domains

1. **Public Sports Directory:** public discovery of published, verified catalogue entities.
2. **Listing Contributor Intake:** submissions, evidence, correction requests, and listing moderation.
3. **Creator Campaign Marketplace:** advertiser organisation workspaces, creator profiles, campaigns, applications, assignments, content submissions, and analytics.
4. **Admin Control Center:** platform-level privileged review and governance, with explicit permission separation for listing moderation, campaign moderation, security administration, and (only later) finance operations.

These domains may share authenticated user identity and canonical organisation references, but they must not share state machines or silently inherit permissions.

### 4.2 Separate platform roles from organisation-scoped roles

- Platform-level roles: only the canonical, reconciled admin authority.
- Organisation-scoped campaign roles: organisation owner, campaign manager, campaign reviewer, finance viewer (future), each granted for a specific organisation.
- Creator capability: a user-level application/profile with explicit status, not a platform administrator role.
- Campaign assignment authority: a scoped relationship to a specific campaign and deliverable.
- Every role grant must have an actor, target, scope, reason, timestamp, status, and revocation path.

A user's role in an academy tenant must not automatically make them a campaign finance approver. A creator must not automatically become an advertiser. An advertiser must not approve their own content/reward where a conflict exists.

### 4.3 Use server-authoritative lifecycle transitions

Campaign creation, submission, moderation, publication, selection, acceptance, assignment changes, deliverable review, dispute resolution, and any future reward operation must be enforced server-side. UI state is never authority.

For every transition:
- validate actor and scope;
- validate current state and expected version;
- validate required evidence/terms;
- reject self-approval and conflicting actors;
- write an audit event in the same transaction;
- make retries idempotent where applicable.

### 4.4 Start with a no-payment vertical slice

After blockers are closed, the first implementation slice should be limited to:
- invitation/approved-access creator profile onboarding;
- advertiser organisation application and independent verification;
- campaign draft and moderation queue;
- public/eligible campaign discovery;
- creator applications and advertiser shortlist/selection;
- assignment terms acknowledgement;
- content URL submission and manual review;
- audit history and basic non-financial reporting.

Exclude budgets collected from customers, reward balances, payable/paid labels, affiliate commission, payout APIs, and financial ledger mutations.

## 5. Required pre-implementation gates

| Gate | Required evidence | Pass condition |
|---|---|---|
| G0 — Canonical RBAC | Role inventory, migration reconciliation, grants/RLS/RPC audit, role matrix | One documented platform-admin authority; no unresolved role helper/schema drift |
| G1 — Organisation identity | Entity map, ownership proof model, tenant relationship decision | Every advertiser maps to a canonical verified entity and authorised members |
| G2 — Authentication | Current auth configuration and onboarding decision | Approved access path exists; no public privilege self-grant |
| G3 — Admin trust boundary | Local PostgreSQL security suite and admin browser tests | Negative access tests pass; revocation and separation of duties proven |
| G4 — Data architecture | ERD, data classification, retention, RLS/storage matrix | Tenant isolation and private-data boundaries reviewed before schema creation |
| G5 — Platform compliance | Per-platform rules, disclosures, content rights, minors policy | Campaign mechanics and evidence collection are policy-reviewed |
| G6 — No-payment boundary | Feature flags and UI/API threat model | No live funding, payment collection, reward liability, or payout path |
| G7 — Release readiness | CI, typecheck, lint, tests, local DB suite, protected preview | Exact candidate SHA passes; no production release required for pilot design |

**All G0–G6 are mandatory before schema or application implementation.** G7 is mandatory before any controlled preview or pilot.

## 6. Recommended phased plan

### Phase A — Reconcile existing foundations (read-only)
1. Inspect current default-branch migrations and migration ordering.
2. Inspect the current development database read-only and reconcile applied migration state.
3. Produce one canonical role/permission matrix.
4. Map user, tenant, academy, coach, venue, club/event, and organisation identities.
5. Verify authentication availability and the separate admin app trust boundary.
6. Record unresolved discrepancies; do not patch them as part of this review.

### Phase B — Approve the no-payment marketplace architecture
1. Approve the canonical organisation reference model.
2. Approve creator onboarding and account eligibility.
3. Approve campaign state machines and server-side transition matrix.
4. Approve data classification, RLS, private storage, and audit design.
5. Approve disclosure, copyright, minors, disputes, and takedown policies.
6. Explicitly defer all money movement.

### Phase C — Build the isolated no-payment foundation
Only after explicit approval of Phase A/B outputs:
1. Add scoped organisation/creator membership workflows.
2. Add campaign draft/submission/moderation/discovery.
3. Add creator applications, selection, and assignment acceptance.
4. Add content submission/review and audit events.
5. Add RLS and negative tests before exposing UI.
6. Keep all financial fields absent or non-operational; use synthetic fixtures only in tests.

## 7. Explicit non-actions in this review

- No application source code or routes were added.
- No SQL migration or schema was created or applied.
- No Supabase project was contacted or modified.
- No service-role key, payment credential, or OAuth token was requested or used.
- No real payment, budget collection, reward liability, or payout was enabled.
- No production site, database, DNS, or Vercel configuration was changed.
- No tests or builds are claimed as passing.

## 8. Final recommendation

**Keep the marketplace proposal open as documentation only. Do not merge it as an implementation approval and do not start Phase 2 coding yet.**

The immediate next technical task should be a separate, tightly scoped **Phase A read-only reconciliation** of the existing development architecture: canonical RBAC, organisation identity, authentication availability, and current database state. Once those findings are signed off, the marketplace can be designed around the platform's real security boundaries rather than adding a parallel permission system.
