# KhelGrid — Unified Six-Workspace SaaS Architecture: Phase 0 Audit

**Repository:** `khelgrid-dotcom/khelgrid-platform`  
**Audit Scope:** Read-only architecture, database, RLS, auth/RBAC, UI component, and security audit ahead of building `/workspace` (`src/modules/workspace/`).  
**Status:** Phase 0 Complete — Awaiting review and sign-off before Phase 1 migrations or application code changes.

---

## 1. Executive Summary & Architectural Reality Check

KhelGrid already has rich domain UI modules, tested RBAC/entitlement rules (`src/shared/saas/saasCoreEngine.ts`), a multi-tenant React context (`src/shared/context/TenantContext.tsx`), and 62 timestamped security migrations (`supabase/migrations/`). However, today's partner and user workflows are split across disconnected routes (`/workspace`, `/dashboard`, `/organizations`, `/academy-hub`, `/coach-dashboard`, `/turf-calendar`, `/host`, `/tournament-ops`, `/creator`, `/parent-portal`), and **several critical backend and security gaps must be resolved before consolidating them**:

1. **Critical Migration Drift (`tenants` & SaaS Schema Missing from `supabase/migrations/`):**  
   `tenant-client.ts`, `saas-platform-client.ts`, `TenantContext.tsx`, and `AcademyHubPage.tsx` target `public.tenants`, `public.tenant_memberships`, `public.tenant_units`, `public.tenant_invitations`, `public.resource_ownership_links`, `public.tenant_batches`, `public.tenant_students`, `public.tenant_enquiries`, `public.tenant_fee_invoices`, `public.tenant_fee_transactions`, `public.tenant_attendance_events`, and `public.tenant_audit_logs`. Yet **none of those tables exist in `supabase/migrations/`** (which ends at `20261108090000_phase7_and_8_business_logic_and_moderation_security.sql`). Only a legacy reference script (`supabase/deployments/phase-1-saas-multi-tenant-deployment.sql`, flagged *"DO NOT EXECUTE"*) defines part of the tenant schema, while two Vitest files (`phase2-database-consolidation.test.ts`, `phase5-10-saas-platform-lifecycle.test.ts`) read a missing file `supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql`.
2. **Pervasive `localStorage` & Hardcoded Demo Data in Domain Clients:**  
   `academySaaSClient.ts`, `coachSaaSClient.ts`, `turfSlotManager.ts`, `campaignClient.ts`, `tournamentOpsEngine.ts`, and `tournamentRegistrationManager.ts` persist exclusively to `localStorage` / in-memory arrays and seed hardcoded demo entities/earnings/bookings. Additionally, `tenant-client.ts` and `saas-platform-client.ts` silently fall back to fabricated owners (`delhi-cricket-academy`, `Arjun Verma`) when Supabase calls fail or are unconfigured.
3. **Auth, JWT, & Inbound RLS Gaps:**
   - `athlete-profile-client.ts` and `chronicle-client.ts` send `Authorization: Bearer ${anonKey}` instead of the signed-in user's JWT, breaking `auth.uid()` RLS checks on inserts/selects; `athlete-profile-client.ts` also allows client-side `verification_status: 'verified'` and silently returns showcase profiles (`SHOWCASE_ATHLETE_PROFILES`).
   - `coach_inquiries`, `trial_applications`, and `academy_enquiries` (created in `20261107180000`) allow only the *submitter* (`user_id = auth.uid()`) or `service_role` to `SELECT` — **coaches, academies, and trial organisers have zero RLS read/update access to inbound applications/enquiries**.
   - Public `SELECT` policies remain overly permissive on `public.profiles` (`profiles_public_read USING (true)` in `20261108050000`) and `public.venue_slot_bookings` (`USING (true)` in `20261107180000`), while `venue_bookings` and `venue_slot_bookings` create duplicate booking models.
4. **Admin Separation Verified:**  
   `apps/admin` builds independently (`vite.config.admin` via `dev:admin` / `build:admin`) and `/admin` / `/admin/control` intentionally resolve to `not-found` in the customer app (`src/shared/routing.ts`). This boundary must remain strictly intact.

---

## 2. Non-Negotiable Constraints Baseline

All proposed database work and UI consolidation strictly adhere to:
- **Target environment:** Development repository and development Supabase project only; zero modifications to live production.
- **Database & Infra:** Stay on Supabase Free Plan (PostgreSQL + RLS + PostgREST + Supabase Auth; no paid extensions, background workers, or external brokers).
- **Zero fabricated records:** Remove all seed/demo organizations, bookings, earnings, users, and fallback showcase profiles from workspace runtime paths; show honest loading, unavailable, unconfigured, or empty states (`AsyncState` pattern).
- **Zero live payments / free listings:** Keep Razorpay/UPI payment collection disabled (`paymentService.ts` / `SaaSSubscriptionCard` preserved inactive without gateway activation); keep venue, academy, coach, and trial listings free.
- **Backend-enforced security:** Never trust scalar `authUser.role`, `localStorage`, or client-supplied ownership IDs; enforce all reads/writes via RLS, composite FKs, and `SECURITY DEFINER` RPCs pinned to `auth.uid()`.
- **Additive consolidation:** Preserve all existing public/legacy routes (`/dashboard`, `/academy-hub`, `/coach-dashboard`, `/turf-calendar`, `/host`, `/organizations`, `/tournament-ops`, `/creator`, `/u/:username`) with zero destructive drops.
- **Styling reality:** The project uses custom CSS variables (`src/styles.css`, `--navy: #10233f`, `--accent: #07964f` light / `#10b981` dark, `html.dark` theme) and component CSS stylesheets (Tailwind CSS is **not** installed in `package.json`). New `src/modules/workspace/` components will align cleanly with `#0B192C` deep navy, `#10B981` emerald, and existing `src/styles.css` tokens across light and dark modes.

---

## 3. Domain-by-Domain Implementation Inventory

Legend:
- **Implemented**: Authoritative DB table + RLS/RPC + functional UI working without demo fallbacks.
- **Partially Implemented**: UI and/or client logic exists, but relies on `localStorage`/demo fallbacks, lacks full DB backing, lacks assignee RLS, or is split across multiple pages.
- **Missing**: Neither authoritative backend model/workflow nor workspace UI exists.

### 3.1 Core Shell, Auth, Multi-Tenancy & Shared Chrome

| Capability | Status | Current Files / Notes |
| --- | --- | --- |
| Unified `/workspace` Shell (`WorkspaceShell`, Sidebar, Header, KPI Strip, Detail Drawer) | **Missing** | `src/modules/workspace/WorkspacePage.tsx` is a static 117-line card list linking out to separate legacy routes by scalar `authUser.role`. No `PersonaSwitcher`, no unified `EntitySwitcher`, no 4-card KPI strip, no shared drawer. |
| Global Navigation & Search / Notifications Chrome | **Implemented** (Reusable) | `TopNavbar.tsx`, `Sidebar.tsx`, `navigationRegistry.ts`, `SpotlightSearchModal.tsx`, `NotificationCenterDrawer.tsx` (reads public catalogues + `user_notifications`, though includes static `BASELINE_NOTIFICATIONS` fallback). |
| Multi-Tenant React Context & Guard | **Partially Implemented** | `TenantContext.tsx` & `RequireTenantMember.tsx` exist, but read synchronous `localStorage` (`getStoredAuthUser()`) and `tenant-client.ts` injects fake `'delhi-cricket-academy'` tenant when unconfigured. |
| Org RBAC, Entitlements & Adoption Matrix Engine | **Partially Implemented** | Pure rules well-defined in `src/shared/saas/saasCoreEngine.ts` (16 roles, 18 org types, plans, entitlements, unit checks), but `saas-platform-client.ts` runs invitations, role updates, status toggles, and plan previews in `localStorage` (`syncedToSupabase: false`). |
| Admin / Moderation Separation | **Implemented** | `apps/admin/*` runs separately; customer router returns 404 for `/admin*`; `AdminModerationPage.tsx` / `AdminControlPanelPage.tsx` are standalone modules. |

---

### 3.2 Workspace A — Athlete (`Profiles · Applications · Activities`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Profiles**: Sports CV editor, completeness, PlayerCard, `/u/:username`, privacy settings, shareable URL & QR, benchmarks | **Partially Implemented** | `SportsCvWizard.tsx` (1,869 lines), `PlayerCard.tsx` (with QR SVG/PNG/SVG export & Khel ID), `AthleteProfilePage.tsx` (`/u/:username`), `UserDashboardPage.tsx` (`profileCompletion` formula + privacy-gated `is_public_cv` / `consent_scout_sharing` columns in `20261108080000`). **Gaps:** `athlete-profile-client.ts` uses `anonKey` instead of user JWT, forces client-side `verificationStatus`, falls back to `SHOWCASE_ATHLETE_PROFILES`, and `UserDashboardPage.tsx` contains `DEMO_PERSONAS` quick-login buttons and client-synthesized profile fallbacks. Verified benchmark integration from coach/combine tools reads `localStorage` (`coachSaaSClient.ts`). |
| **Applications**: Trial applications, academy admissions enquiries, tournament registrations, KhelChronicle manuscript submissions | **Partially Implemented** | DB tables exist for `trial_applications` & `academy_enquiries` (`20261107180000`), plus `chronicle_submissions` (`20261030180000`). **Gaps:** `athlete-profile-client.ts` reads/writes `localStorage` in parallel and sends `anonKey` on REST calls; tournament registrations in `tournamentRegistrationManager.ts` are `localStorage`-only; `chronicle_submissions` has **no `user_id` column and no user `SELECT` RLS policy**, so authenticated athletes cannot list their own manuscript submissions from Supabase. Each type also keeps distinct statuses that must be displayed per-type without merging into one fake status enum. |
| **Activities**: Venue bookings, pickup game RSVPs, QR entry passes, saved opportunities, upcoming/past activities | **Partially Implemented** | DB tables `venue_bookings` (with `get_venue_booking_voucher` RPC), `pickup_games`, `pickup_game_participants`, `trial_reminders` exist; UI exists across `UserDashboardPage.tsx`, `MyPassesVaultPage.tsx`, `SavedPage.tsx`. **Gaps:** `getUserVenueBookings()` in `paymentService.ts` reads only `localStorage('khelgrid_venue_bookings')` instead of querying RLS-scoped `venue_bookings`; `MyPassesVaultPage.tsx` merges `localStorage` trial passes/turf bookings/tournament passes and injects a hardcoded `'PASS-CRI-DEMO'` pass when empty; `savedService.ts` needs DB sync check (`saved_items` / localStorage). |

---

### 3.3 Workspace B — Academy (`Branches · Coaches · Batches`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Branches**: Multi-campus / facility management, branch creation, branch counts, enquiries, capacity, financial records | **Partially Implemented** | `tenant_units` (`branch`, `regional_office`, `department`, `team`, `facility`) exists in TS types (`saasCoreEngine.ts`) and `OrganizationsWorkspacePage.tsx` UI (`createOrganizationUnit`), **but has zero SQL migration in `supabase/migrations/`**, and `AcademyHubPage.tsx` has no branch switcher/scoping on batches, students, or enquiries (`tenant_batches`, `tenant_students`, `tenant_enquiries`). Canonical link `organization (tenant) -> branch (tenant_unit) -> facility/batch` is not yet enforced in SQL. |
| **Coaches**: Staff roster, roles (`head_coach`, `coach`, `front_desk`, etc.), invitations & status, credentials, branch & batch assignments | **Partially Implemented** | `tenant_memberships` and `tenant_invitations` patterns exist in `tenant-client.ts` and `phase2` tests, and `OrganizationsWorkspacePage.tsx` / `AcademyHubPage.tsx` expose staff/invite UIs. **Gaps:** Migrations for `tenants`/`tenant_memberships`/`tenant_invitations` are missing from `supabase/migrations/`; `AcademyHubPage.tsx` still calls `localStorage`-backed `getAcademyStaff()` from `academySaaSClient.ts` (`demo` staff); invitations have no branch/batch assignment columns; `coach_credentials` / endorsement verification is `localStorage`-only. |
| **Batches**: Batch creation, morning/evening schedules, sport & age categories, capacity vs actual enrolment, roster, attendance, waitlists | **Partially Implemented** | `AcademyHubPage.tsx` (5,162 lines) implements batches, student roster, CSV import (`saasSharedOperations.ts`), daily attendance, fee ledger, safeguarding, and audit logs. **Gaps:** Most reads in `AcademyHubPage.tsx` still source from `academySaaSClient.ts` (`localStorage` + demo seed data); **waitlists** are missing at both schema and UI levels; `tenant_batches` & `tenant_students` lack `branch_id` (`unit_id`) scoping and `supabase/migrations/` DDL. |

---

### 3.4 Workspace C — Venue (`Facilities · Enquiries · Bookings`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Facilities**: Venue inventory, sport & court/pitch types, indoor/outdoor, surface, floodlights, pricing, maintenance/unavailable periods, facility-level permissions | **Partially Implemented** | Public `public.venues` + `public.venue_sports` exist in Supabase (`slot_hourly_fee` added in `20261108090000`). Rich court/pitch UI (`TurfCourt` with indoor/outdoor, surface, floodlights, peak pricing, blocked maintenance slots) exists in `TurfSlotCalendarPage.tsx` & `turfSlotManager.ts`, **but runs 100% on `localStorage` (`DEFAULT_TURF_COURTS`)** with hardcoded 4 curated venues, zero Postgres `venue_facilities`/`venue_courts` table, zero tenant/owner linkage on `venues`, and zero facility-level RBAC. |
| **Enquiries**: Structured workflow (`New -> Contacted -> Quoted -> Converted / Declined`) for corporate sports events, tournament blocks, recurring academy leases, group bookings | **Missing** | Zero DB table, zero client methods, and zero UI currently exist for venue enquiries. (Must remain a genuine enquiry workflow, never auto-confirming bookings.) |
| **Bookings**: Slot calendar, confirmed bookings, availability from DB records, walk-in booking, recurring booking, QR entry validation, history, CSV export | **Partially Implemented** | `20261108090000` provides hardened `venue_bookings` table + concurrency partial unique index (`uq_venue_slot_concurrency`) + `get_booked_slots_for_venue` RPC + `get_venue_booking_voucher` RPC. **Gaps:** `TurfSlotCalendarPage.tsx` & `turfSlotManager.ts` ignore `venue_bookings` and invent hourly slots + recurring subscriptions + walk-ins in `localStorage`; `HostDashboardPage.tsx` shows static stats (`DEFAULT_TURF_COURTS.length`) and a placeholder banner; `GateCheckInPage.tsx` (`passVerifierService.ts`) validates QR tokens against `localStorage` instead of `venue_bookings` / DB RPC; recurring booking model does not exist in Postgres; CSV export (`turfExportUtils.ts`) exports `localStorage` data without RBAC checks. |

---

### 3.5 Workspace D — Coach (`Profile · Credentials · Opportunities`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Profile**: Public coach profile, specialities, sports & age groups, bio, service locations, group vs 1:1 options, availability, preview | **Partially Implemented** | `public.coaches` + `public.coach_sports` exist in Supabase (`20261031160000`, `20261107180000` with `verification_status`, `coaching_fee`, `bio`, `certifications`). **Gaps:** `coaches` lacks `user_id` / `tenant_id` ownership columns and self-service `UPDATE` RLS policy; lacks structured service locations, group vs individual mode flags, and availability settings; `CoachDashboardPage.tsx` reads from `coachSaaSClient.ts` (`localStorage` + `INITIAL_REGISTERED_COACHES`) rather than Postgres. |
| **Credentials**: Qualification info, federation/NIS credentials, verification claim submission, independent verification status, endorsements, academy affiliations, compliance | **Partially Implemented** | `verification_claims` (`20261101010000`) & `listing_evidence` (`moderation`) infrastructure exist for public listings. **Gaps:** `coachSaaSClient.ts` lets a coach "self-verify" (`confirmAndVerifyCoach`) in `localStorage`; `athlete-profile-client.ts` `saveCoachEndorsement()` is a no-op stub returning `{ success: true }`; there are no authoritative Postgres tables/queries for `coach_credentials`, verified endorsements (`coach_endorsements`), academy staff affiliations (`tenant_memberships`), or coach compliance checks. |
| **Opportunities**: Private coaching enquiries, academy coaching/staff openings, trial evaluator/selector invites, enquiry response workflow | **Partially Implemented** | `public.coach_inquiries` exists in `20261107180000`, and `CoachDashboardPage.tsx` has an `inquiries` tab backed by `localStorage` (`coachSaaSClient.ts`). **Critical Gap:** `coach_inquiries` RLS (`20261107180000`) only allows the *submitting athlete/parent* (`auth.uid() = user_id`) to `SELECT` — **coaches cannot read or update inbound enquiries sent to them** via RLS! Academy coaching openings and trial evaluator invites do not exist in schema or UI. |

---

### 3.6 Workspace E — Trial Organiser (`Trials · Registration · Updates`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Trials**: Trial / scouting event creation (under governance/moderation rules), sport, age group, location, dates, capacity, eligibility, free-listing rules, lifecycle status | **Missing / Fragmented** | `public.opportunities` (`20261025070100`, `20261031193000`) stores public trials, and `tournaments_and_events` (`20261107180000`) stores events, while `TournamentOpsPage.tsx` focuses on knockout brackets & live scoring in `localStorage`. **Gaps:** Neither `opportunities` nor `tournaments_and_events` has organiser ownership (`owner_user_id` / `owner_tenant_id`) or organiser CRUD RLS; there is no dedicated Trial Organiser UI to create/manage trials, eligibility rules, or capacity in `/workspace`. |
| **Registration**: Applicant list, Sports CV summary inspection, age/eligibility verification, status (`Registered -> Shortlisted -> Selected / Rejected`), waitlist, attendance/check-in, export | **Partially Implemented** | `trial_applications` table exists (`20261107180000`), and `TournamentOpsPage.tsx` has a `squad-audit` age-cutoff check UI using `SAMPLE_SQUAD_ROSTER`. **Gaps:** `trial_applications` RLS blocks organisers from reading/updating applications (`auth.uid() = user_id` only); missing fields/states for `Registered / Shortlisted / Selected / Rejected / Waitlisted`, check-in timestamps, and Sports CV linkage; `tournamentRegistrationManager.ts` is `localStorage`-only. |
| **Updates**: Announcement & schedule update broadcasts, reporting time / venue / postponement / result notices, delivery log | **Missing** | Zero DB schema or UI exists for organiser-scoped trial updates/broadcasts (`user_notifications` exists for user inbox only and is read via `public-client.ts`, with no organiser dispatch RPC/table or audit log). |

---

### 3.7 Workspace F — Creator (`Campaigns · Reach · Rewards`)

| Feature Area | Status | Current Implementation & Gaps |
| --- | --- | --- |
| **Campaigns**: Eligible brand/platform/federation campaigns, briefs, deliverables, compliance disclosures (`#Ad`/`#Sponsored`), application & workflow status | **Partially Implemented** | Rich UI exists across `CreatorHubPage.tsx` (999 lines), `CampaignMarketplacePage.tsx`, `CampaignCreationPage.tsx`, `AdvertiserCampaignManagePage.tsx`, plus URL validation helpers in `campaignClient.ts`. **Critical Gap:** **100% `localStorage` + `memoryStore`** with hardcoded `INITIAL_CAMPAIGNS` and `INITIAL_APPLICATIONS`; zero Postgres tables or RLS exist for `creator_profiles`, `campaigns`, `campaign_applications`, or `campaign_deliverables`. |
| **Reach**: Linked social channels, verified follower/reach snapshots, link/deliverable analytics, campaign performance | **Partially Implemented (Demo-Only)** | `CreatorHubPage.tsx` has channel management (`platforms` array) and deliverable submission tabs, **backed purely by `localStorage` (`Arjun Verma` demo creator profile)** with zero real analytics/reach tables or snapshot verification records. |
| **Rewards**: Ledger only when backed by genuine DB-verified campaign/grant agreements; status tracking without unapproved payouts | **Partially Implemented (Demo-Only)** | `CreatorHubPage.tsx` & `campaignClient.ts` compute totals and CSV statements from `INITIAL_REWARD_LEDGER` (`localStorage`). **Must strip all fabricated INR figures** and back the ledger with RLS-scoped DB records (read-only accounting status; no live UPI/bank payout execution). |

---

## 4. Reusable Components, Engines & UI Primitives Inventory

| Asset | Path | Reuse Strategy in `src/modules/workspace/` |
| --- | --- | --- |
| SaaS Core Rules Engine & Types | `src/shared/saas/saasCoreEngine.ts`, `src/shared/saas/saasTypes.ts` | Reuse role permission matrix, slug sanitization, usage meters, entitlement evaluator (`evaluateEntitlement`), and dual ownership types (`individual` vs `organization`). Adapt `TenantType` / `OrganizationRole` carefully to stay aligned with SQL `CHECK` constraints. |
| Shared SaaS Operations & CSV/Launch Services | `src/shared/saas/saasSharedOperations.ts`, `src/shared/saas/saasLaunchReadinessService.ts` | Reuse pure CSV row validators (`parseStudentCsvRows`), attendance & fee reconciliation (`reconcileAcademyFeeLedger`), DPDP PII masking (`maskPhone`, `maskEmail`), and tab access checks (`canRoleAccessTab`). |
| Tenant Context & Bilingual i18n | `src/shared/context/TenantContext.tsx`, `src/shared/i18n/saasHindi.ts` | Keep `TenantContext` as canonical tenant/membership provider after removing fake fallbacks and verifying live Supabase session state. |
| Async State & Shell Modals | `src/shared/components/AsyncState.tsx`, `NotificationCenterDrawer.tsx`, `SpotlightSearchModal.tsx`, `SiteIcon.tsx` | Reuse `AsyncState` patterns (`loading` / `unconfigured` / `unavailable` / `empty`), `SiteIcon`, `NotificationCenterDrawer`, and `SpotlightSearchModal` inside `WorkspaceShell`. |
| Athlete Reusable Views | `src/modules/athlete-profile/PlayerCard.tsx`, `CombineRadarChart.tsx`, `src/modules/sports-cv/SportsCvWizard.tsx`, `src/modules/dashboard/UserDashboardPage.tsx` | Embed `PlayerCard`, `SportsCvWizard` (or extracted form panels), and `UserDashboardPage` data views into **Workspace A** without synthetic profile fabrication or `DEMO_PERSONAS`. |
| Academy Reusable Views | `src/modules/academies/AcademyHubPage.tsx`, `SaaSSubscriptionCard.tsx`, `academyExportUtils.ts`, `src/modules/organizations/OrganizationsWorkspacePage.tsx` | Extract Leads, Batches, Roster/Attendance, Staff/Invitations, and Unit/Branch controls into **Workspace B** panels backed by real `tenant-client.ts` queries; keep `SaaSSubscriptionCard` read-only / zero-charge. |
| Venue Reusable Views | `src/modules/venues/TurfSlotCalendarPage.tsx`, `turfExportUtils.ts`, `src/modules/verification/GateCheckInPage.tsx`, `src/shared/utils/qrCodeGenerator.ts` | Reuse slot calendar grid, peak-pricing & block UI, QR generator/scanner modal structure, and CSV export into **Workspace C** once wired to `venue_bookings` + `venue_facilities` + `venue_enquiries`. |
| Coach Reusable Views | `src/modules/coaches/CoachDashboardPage.tsx`, `kheloIndiaBattery.ts` | Reuse credential forms, Khelo India assessment calculator, training plan editor, and inquiry review UI in **Workspace D** after stripping `coachSaaSClient.ts` `localStorage` mocks. |
| Trial / Event Reusable Views | `src/modules/events/TournamentOpsPage.tsx`, `src/modules/opportunities/OpportunitiesPage.tsx`, `src/modules/verification/GateCheckInPage.tsx` | Reuse squad age-check helpers and gate QR pass check-in patterns for **Workspace E** (`Trials · Registration · Updates`), distinct from Tournament Brackets/Live Scorer. |
| Creator Reusable Views | `src/modules/campaigns/CreatorHubPage.tsx`, `validateCanonicalSocialUrl` / `validateDeliverableUrl` (`campaignClient.ts`) | Reuse canonical URL validators, `#Ad` disclosure enforcement, deliverable submission form, and CSV statement generator in **Workspace F**, replacing `localStorage` stores with DB-backed queries. |

---

## 5. Authoritative Database Dependency Map & Migration Gaps

### 5.1 Existing Supabase Tables (`supabase/migrations/`) vs Client Modules

| Table / RPC in `supabase/migrations/` | Migration Source | Current Security / Schema Notes | Workspace Usage |
| --- | --- | --- | --- |
| `public.profiles`, `user_roles`, `role_permissions`, `user_role_audit_logs` | `20261025070100`, `20261108000000`, `20261108050000` | `user_roles` supports multi-role (`athlete`, `host`, `moderator`, `admin`, `compliance_officer`), **not** `coach`, `academy`, `venue_owner`, `trial_organiser`, `creator`. Also `profiles` has overly broad `profiles_public_read USING (true)` (`20261108050000`) despite `get_public_profile()` existing! | Auth & Persona Resolution |
| `public.athlete_profiles`, `user_consents`, `guardian_consents`, `data_export_audit_logs` | `20261031120000`, `20261031170000`, `20261108080000` | Has `is_public_cv`, `consent_scout_sharing`, `guardian_consents`, `request_user_data_export()`, `withdraw_user_consent()`. Client currently uses `anonKey` instead of session JWT! | Workspace A (Profiles) |
| `public.trial_applications`, `public.academy_enquiries`, `public.coach_inquiries` | `20261107180000` | **Critical Gap:** Only `auth.uid() = user_id` (applicant) can `SELECT`. Neither coaches, academies, nor trial organisers have RLS `SELECT`/`UPDATE` policies or target tenant/owner foreign keys. | Workspaces A, B, D, E |
| `public.chronicle_papers`, `public.chronicle_submissions` | `20261030180000` | `chronicle_submissions` lacks `user_id` column, lacks `SELECT` policy for the author, and lacks columns sent by `chronicle-client.ts` (`submission_id`, `article_type`, `orcid`, etc.) in `supabase/migrations/`. | Workspace A (Applications) |
| `public.venue_bookings` + `get_booked_slots_for_venue` + `get_venue_booking_voucher` + `create_venue_booking_atomic` | `20261106120000`, `20261108040000`, `20261108090000` | Concurrency-safe (`uq_venue_slot_concurrency`), owner-scoped `SELECT`, server-verified pricing. **Gap:** `venues` table lacks `owner_tenant_id`/`owner_user_id`, so venue partners cannot manage bookings via RLS. | Workspaces A & C |
| `public.venue_slot_bookings` | `20261107180000` | **Duplicate table** alongside `venue_bookings` with unsafe `USING (true)` public `SELECT` (`"Public can check slot booking availability"`). Needs consolidation/deprecation in favor of `venue_bookings` + `get_booked_slots_for_venue` RPC. | Workspace C (Cleanup) |
| `public.pickup_games`, `pickup_game_participants`, `trial_reminders`, `user_notifications` | `20261031230000`, `20261101020000`, `20261105190000`, `20261108040000` | Hardened host/participant RPCs exist; `get_user_notifications` / `user_notifications` handles personal inbox alerts. | Workspaces A & E |
| `public.venues`, `academies`, `coaches`, `opportunities`, `tournaments_and_events` | `20261025070100`, `20261030140000`, `20261107180000` | Public directories exist; **lack canonical `tenant_id` / `owner_user_id` foreign keys** tying listed entities to `/workspace` tenants. | Workspaces B, C, D, E |
| `public.verification_claims`, `listing_submissions`, `listing_submission_evidence`, `listing_reports` | `20261029180725`, `20261101010000`, `20261108090000` | Independent verification & moderation queue already hardened; reuse `verification_claims` for coach/entity claims instead of self-verification flags. | Workspaces B, C, D, E |

### 5.2 Missing Migrations Required (Free Plan Compatible SQL)

1. **Commit Canonical Multi-Tenant SaaS Migration (`tenants`, `tenant_memberships`, `tenant_units`, `tenant_invitations`, `resource_ownership_links`, `tenant_batches`, `tenant_students`, `tenant_enquiries`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_attendance_events`, `tenant_audit_logs` + soft-delete/RPC hardening):**
   - Must unify what `tenant-client.ts`, `saas-platform-client.ts`, and `phase2-database-consolidation.test.ts` expect, while expanding `tenants.tenant_type` beyond `('academy','coach','venue','tournament')` to support all workspace org categories (including `venue`, `trial_organiser`, `brand_partner`, `federation`, `academy`, `club`, etc.), and keeping `tenant_public_directory` table/trigger ACL-safe (no security-barrier views exposing private tenant columns).
   - Must add `unit_id` (`branch_id` FK referencing `tenant_units`) to `tenant_batches`, `tenant_students`, and `tenant_enquiries` so **Academy Branches** are canonically modeled.
   - Must add `tenant_batch_waitlists` (or `enrollment_status` / waitlist queue table) for **Academy Batches**.
2. **Venue Workspace Migration (`venue_facilities`, `venue_facility_blocks`, `venue_enquiries`, plus `venues.tenant_id` & `venue_bookings` partner RLS):**
   - `venue_facilities`: courts/pitches per venue/branch (sport, indoor/outdoor, surface, lighting, base hourly rate, active/maintenance status).
   - `venue_facility_blocks`: maintenance & unavailable date/time windows.
   - `venue_enquiries`: structured lead workflow (`new -> contacted -> quoted -> converted | declined`), enquiry category (`corporate_event`, `tournament_block`, `academy_lease`, `group_booking`, `other`), submitter user/contact, quoted terms, status audit.
   - Partner-scoped RLS & check-in RPC on `venue_bookings` so authorized venue members (`is_tenant_member(tenant_id)` / `has_tenant_role(...)`) can view bookings, record walk-ins, validate QR vouchers, and export authorized CSVs; deprecate/restrict `venue_slot_bookings` `USING (true)`.
3. **Coach Workspace Migration (`coaches.user_id` / `coaches.tenant_id`, `coach_credentials`, `coach_endorsements`, `coach_opportunities`, plus `coach_inquiries` assignee RLS):**
   - Allow coaches to read & update their own profile fields (excluding `verification_status`, which stays server/moderator-only).
   - Allow coaches to read and update status (`new -> contacted -> scheduled -> accepted | declined`) on `coach_inquiries` targeted at their coach record.
   - `coach_credentials` (linked to `verification_claims` / independent review status) & `coach_endorsements` (replacing `saveCoachEndorsement()` stub).
4. **Trial Organiser Workspace Migration (`trials` / `opportunities` ownership, `trial_applications` status & organiser RLS, `trial_updates`):**
   - Link `opportunities` (or dedicated `organiser_trials` / `tournaments_and_events`) to `tenant_id` / `owner_user_id`.
   - Extend `trial_applications` with authoritative `application_status` (`registered`, `shortlisted`, `selected`, `rejected`, `waitlisted`), `checked_in_at`, `checked_in_by`, `eligibility_verified`, and organiser RLS `SELECT`/`UPDATE` scoped to owning tenant/user.
   - Create `trial_updates` (organiser announcements/time changes/postponements/results + delivery/audit log).
5. **Creator Workspace Migration (`creator_profiles`, `creator_channels`, `campaigns`, `campaign_applications`, `campaign_deliverables`, `creator_reward_ledger`):**
   - Strict RLS: creators can manage their own profile/channels, apply to published campaigns, submit HTTPS deliverables with `disclosure_confirmed = true`, and view their own read-only reward ledger entries (never creating/mutating rewards client-side).
6. **Athlete Applications Linkage (`chronicle_submissions.user_id` & author `SELECT` RLS):**
   - Add `user_id uuid REFERENCES auth.users(id)` and `SELECT` policy (`user_id = auth.uid()`) on `chronicle_submissions`, plus missing submission metadata columns (`submission_id`, `article_type`, `orcid`, `co_authors`, `keywords`, `full_text_or_url`, `supplementary_url`, `data_availability`, `ethics_clearance_number`, `license_type`, etc.) that `chronicle-client.ts` already posts.

---

## 6. Security, Auth & Permission Conflicts

| Severity | Finding | Verified Location(s) | Required Remediation |
| --- | --- | --- | --- |
| **CRITICAL** | Missing multi-tenant schema/RLS migrations in `supabase/migrations/` | `supabase/migrations/`, `phase2-database-consolidation.test.ts` | Author & verify timestamped migrations under `supabase/migrations/` before wiring `/workspace` tenant operations. |
| **CRITICAL** | Inbound enquiries/applications have zero receiver RLS (`coach_inquiries`, `trial_applications`, `academy_enquiries`) | `supabase/migrations/20261107180000_pillar1_unified_relational_schema.sql` | Add canonical target `tenant_id` / `coach_id` / `opportunity_id` ownership joins so only verified owners/staff can `SELECT` & `UPDATE` inbound rows. |
| **CRITICAL** | `athlete-profile-client.ts` & `chronicle-client.ts` authenticate REST calls with `anonKey` instead of session JWT and allow client-side `verificationStatus: 'verified'` | `src/integrations/supabase/athlete-profile-client.ts`, `src/integrations/supabase/chronicle-client.ts` | Switch all authenticated reads/writes to `getSupabaseClient()` (user session JWT), reject client verification overrides (force server/admin-only `verification_status`), and remove `SHOWCASE_ATHLETE_PROFILES` fallback from authenticated workspace flows. |
| **HIGH** | Silent fake tenant, membership, and demo-user fallbacks | `src/integrations/supabase/tenant-client.ts`, `saas-platform-client.ts`, `UserDashboardPage.tsx` (`DEMO_PERSONAS`), `PartnerOnboardingPage.tsx` (creates fake `usr-...` localStorage user) | Remove all silent mock-owner / fake-tenant fallbacks (`delhi-cricket-academy`, `Arjun Verma`, `DEMO_PERSONAS`, synthetic `usr-*` sessions); fail closed with `AsyncState` / explicit unavailable or auth-required UI. |
| **HIGH** | Permissive `SELECT` RLS policies expose PII / booking rows (`profiles_public_read USING (true)`, `venue_slot_bookings USING (true)`) | `supabase/migrations/20261108050000` (line ~90), `20261107180000` (line 357) | Restrict `profiles` direct table `SELECT` to `id = auth.uid()` (serve public fields via `get_public_profile()` RPC only); restrict `venue_slot_bookings` or consolidate into hardened `venue_bookings` + `get_booked_slots_for_venue` RPC. |
| **HIGH** | Scalar `authUser.role` in `localStorage` drives UI gates instead of multi-persona DB resolution | `TopNavbar.tsx`, `WorkspacePage.tsx`, `RequireTenantMember.tsx`, `auth-client.ts` | Resolve active workspaces dynamically from Supabase session + `user_roles` + `tenant_memberships` + entity ownership (`athlete_profiles`, `coaches`, `creator_profiles`), while enforcing all access checks on the backend via RLS/RPCs. |
| **MEDIUM** | Minor athlete DPDP Act 2023 safeguards in workspace views | `tenant_students`, `guardian_consents`, `UserDashboardPage.tsx`, `AcademyHubPage.tsx` | Ensure minor contact fields remain masked (`maskPhone`, `maskEmail`) unless viewer holds verified academy/guardian scope and `guardian_consents.is_verified` gates any public CV/scout sharing (`20261108080000`). |
| **LOW (Baseline)** | Pre-existing Admin ESLint issues & `MyPassesVaultPage` demo pass | `apps/admin/src/components/AdminExecutivePulseRibbon*.tsx`, `src/modules/passes/MyPassesVaultPage.tsx` (`PASS-CRI-DEMO`) | Leave `apps/admin` untouched per separation constraint; remove `PASS-CRI-DEMO` fabrication when integrating passes into Athlete Activities. |

---

## 7. Duplicate Functionality & Consolidation Matrix

| Overlapping Modules | Overlap Description | Canonical Consolidation Plan (Preserving Legacy Routes) |
| --- | --- | --- |
| `WorkspacePage.tsx` (`/workspace`) + `UserDashboardPage.tsx` (`/dashboard`) + `ParentPortalPage.tsx` (`/parent-portal`) + `MyPassesVaultPage.tsx` (`/my-passes`) | Athlete profile summary, applications, passes, and parent passbook are scattered across 4 pages with inconsistent `localStorage` vs DB fetches. | Consolidate into **Workspace A (Athlete)** inside `/workspace/athlete/*` (`profiles`, `applications`, `activities`). Keep `/dashboard`, `/parent-portal`, `/my-passes`, `/sports-cv`, `/u/:username` working cleanly (redirecting or wrapping shared Athlete workspace modules). |
| `OrganizationsWorkspacePage.tsx` (`/organizations`) + `AcademyHubPage.tsx` (`/academy-hub`) + `PartnerOnboardingPage.tsx` (`/partner-signup`) | Organization provisioning, branches/units, staff RBAC/invitations, and audit logs live in `/organizations` (`saas-platform-client.ts`), while Academy leads/batches/fees/attendance live in `/academy-hub` (`academySaaSClient.ts` + `tenant-client.ts`). | Unify canonical `tenants` + `tenant_units` + `tenant_memberships` under **Workspace B (Academy)** (`/workspace/academy/*`: `branches`, `coaches`, `batches`) + shared Workspace Switcher / Team Drawer. Keep `/organizations`, `/academy-hub`, and `/partner-signup` routes alive without breaking links. |
| `HostDashboardPage.tsx` (`/host`) + `TurfSlotCalendarPage.tsx` (`/turf-calendar`) + `GateCheckInPage.tsx` (`/gate-checkin`) | `/host` is a static directory card launcher referencing `DEFAULT_TURF_COURTS.length`; `/turf-calendar` manages `localStorage` courts/slots; `/gate-checkin` checks `localStorage` tokens. | Consolidate into **Workspace C (Venue)** (`/workspace/venue/*`: `facilities`, `enquiries`, `bookings`) backed by real Postgres `venue_facilities`, `venue_enquiries`, and `venue_bookings` + verified QR check-in RPC. Preserve `/host`, `/turf-calendar`, and `/gate-checkin`. |
| `CoachDashboardPage.tsx` (`/coach-dashboard`) + `coaches` public directory + `VerificationClaimModal.tsx` | Coach SaaS hub duplicates batch/attendance/fee logic and `localStorage` verification/endorsement state. | Consolidate into **Workspace D (Coach)** (`/workspace/coach/*`: `profile`, `credentials`, `opportunities`), wired to `coaches`, `coach_credentials`, `coach_endorsements`, `coach_inquiries`, and academy `tenant_memberships`. Preserve `/coach-dashboard`. |
| `TournamentOpsPage.tsx` (`/tournament-ops`) + `OpportunitiesPage.tsx` + `EventsPage.tsx` | Trial hosting/applications (`trial_applications`) vs tournament brackets/live scoring (`TournamentOpsPage.tsx`) are conflated without organiser ownership. | Carve out a dedicated **Workspace E (Trial Organiser)** (`/workspace/trials/*`: `trials`, `registration`, `updates`) wired to DB-owned trials, applications, and announcements, while preserving `/tournament-ops` and `/events`. |
| `CreatorHubPage.tsx` (`/creator`, `/creator-hub`) + `CampaignMarketplacePage.tsx` (`/campaigns`) + `AdvertiserCampaignManagePage.tsx` (`/campaigns/manage`) | Creator opportunities, applications, channels, and reward ledger run in `CreatorHubPage.tsx` over `campaignClient.ts` `localStorage` seeds. | Consolidate creator-facing tabs into **Workspace F (Creator)** (`/workspace/creator/*`: `campaigns`, `reach`, `rewards`) backed by Supabase campaign/deliverable/ledger tables, while keeping `/campaigns`, `/creator`, `/creator-hub` routes working. |

---

## 8. Proposed `src/modules/workspace/` Architecture & Routing

### 8.1 Directory Layout

```text
src/modules/workspace/
├── workspaceTypes.ts                # PersonaId ('athlete' | 'academy' | 'venue' | 'coach' | 'trial_organiser' | 'creator'), tab slugs, entity context, KPI & drawer types
├── workspaceRoutes.ts               # Pure route parser/builder for /workspace and /workspace/:persona/:section (preserves all legacy paths)
├── workspacePermissions.ts          # Backend-aligned UI capability checks (never authoritative; mirrors SQL RLS & saasCoreEngine)
├── workspaceEngine.ts               # Pure selectors, persona eligibility derivation, KPI aggregation, status label helpers (unit-tested via node:test / vitest)
├── hooks/
│   ├── useWorkspaceAuth.ts          # Verified Supabase auth session + multi-role/membership loader (no localStorage demo fallback)
│   ├── useWorkspaceContext.ts       # Active persona + active org/branch/venue entity resolution & switcher state
│   └── useWorkspaceNotifications.ts # Scoped inbox notifications integration
├── components/
│   ├── WorkspaceShell.tsx           # Shared SaaS frame (#0B192C navy, #10B981 emerald, light/dark support, mobile responsive drawer)
│   ├── WorkspaceSidebar.tsx         # Collapsible left nav: 3 primary sections per workspace + nested operational links
│   ├── WorkspaceHeader.tsx          # Workspace title, active entity badge, contextual summary, primary & secondary actions
│   ├── PersonaSwitcher.tsx          # Switch across the 6 workspaces cleanly based on user memberships/profiles or onboarding CTAs
│   ├── EntitySwitcher.tsx           # Active Academy / Branch / Venue / Trial Org selector
│   ├── WorkspaceKpiStrip.tsx        # Strictly <= 4 KPI cards with loading / unavailable / empty states (zero hardcoded numbers)
│   ├── WorkspaceTabNavigation.tsx   # Accessible 3-tab primary bar + optional secondary filters
│   ├── WorkspaceDetailDrawer.tsx    # Accessible slide-over drawer + confirmation dialog + Esc/focus management
│   ├── WorkspaceEmptyState.tsx      # Honest empty, unconfigured, unavailable, or onboarding prompts
│   └── WorkspacePermissionGate.tsx  # Fail-closed gate backed by verified session + server-resolved memberships/roles
├── personas/
│   ├── athlete/                     # Profiles, Applications, Activities views
│   ├── academy/                     # Branches, Coaches, Batches views
│   ├── venue/                       # Facilities, Enquiries, Bookings views
│   ├── coach/                       # Profile, Credentials, Opportunities views
│   ├── trials/                      # Trials, Registration, Updates views
│   └── creator/                     # Campaigns, Reach, Rewards views
├── WorkspacePage.tsx                # Entry page mounted by src/App.tsx for /workspace*
└── tests/                           # Pure engine/permission/routing + component & integration tests
```

### 8.2 Canonical Routing Plan (Additive, Non-Breaking)

- `/workspace` → Resolves to the signed-in user's default authorized persona workspace (or an honest sign-in / workspace onboarding landing view if signed out).
- `/workspace/:persona` & `/workspace/:persona/:tab` (e.g., `/workspace/athlete/profiles`, `/workspace/academy/branches`, `/workspace/venue/bookings`, `/workspace/coach/opportunities`, `/workspace/trials/registration`, `/workspace/creator/campaigns`).
- **Legacy route preservation:** `/dashboard`, `/parent-portal`, `/my-passes`, `/organizations`, `/academy-hub`, `/coach-dashboard`, `/turf-calendar`, `/host`, `/tournament-ops`, `/creator`, `/creator-hub`, `/partner-signup`, `/sports-cv`, `/u/:username`, `/gate-checkin`, and `/verify-pass` remain intact in `src/shared/routing.ts` and `src/App.tsx`.

---

## 9. Recommended Migration & Phased Implementation Order

1. **Phase 1 — Database Schema, Security & RLS Consolidation (Supabase Free Plan)**
   - **1A (Multi-Tenant Foundation):** Commit canonical `tenants`, `tenant_memberships`, `tenant_units`, `tenant_invitations`, `resource_ownership_links`, `tenant_batches` (+ `unit_id` + waitlist), `tenant_students` (+ `unit_id`), `tenant_enquiries`, `tenant_fee_invoices`, `tenant_fee_transactions`, `tenant_attendance_events`, and `tenant_audit_logs` migrations under `supabase/migrations/`, ensuring `phase2-database-consolidation.test.ts` and `phase5-10-saas-platform-lifecycle.test.ts` resolve against committed SQL.
   - **1B (RLS & Privacy Remediation):** Switch `athlete-profile-client.ts` & `chronicle-client.ts` from `anonKey` to session JWT; close `profiles` & `venue_slot_bookings` `USING (true)` leaks; add `chronicle_submissions.user_id` + author `SELECT` RLS; expand `coach_inquiries` & `trial_applications` RLS so authorized coaches/organisers can read/update assigned records; remove `SHOWCASE_ATHLETE_PROFILES` & client-side verification flags.
   - **1C (Domain Workspace Schemas):** Add migrations + RLS for Venue (`venue_facilities`, `venue_facility_blocks`, `venue_enquiries`, partner access on `venue_bookings`), Coach (`coaches` ownership, `coach_credentials`, `coach_endorsements`, `coach_opportunities`), Trial Organiser (`opportunities` / `trials` ownership, `trial_applications` pipeline, `trial_updates`), and Creator (`creator_profiles`, `creator_channels`, `campaigns`, `campaign_applications`, `campaign_deliverables`, `creator_reward_ledger`).

2. **Phase 2 — Unified `WorkspaceShell` & Auth/Permission Foundation (`src/modules/workspace/`)**
   - Build `workspaceTypes.ts`, `workspaceRoutes.ts`, `workspaceEngine.ts`, `workspacePermissions.ts` (decoupled pure TypeScript modules with unit tests).
   - Remove silent mock/demo fallbacks from `tenant-client.ts`, `saas-platform-client.ts`, and `paymentService.ts` (`getUserVenueBookings`).
   - Build `WorkspaceShell`, `WorkspaceSidebar`, `WorkspaceHeader`, `PersonaSwitcher`, `EntitySwitcher`, `WorkspaceKpiStrip`, `WorkspaceDetailDrawer`, `WorkspaceEmptyState`, `WorkspacePermissionGate`, and wire `/workspace*` into `src/shared/routing.ts` & `src/App.tsx`.

3. **Phase 3 — Six Workspace Implementations (Two Increments)**
   - **Batch 3A (Core Ecosystem):** Implement **Workspace A (Athlete)**, **Workspace B (Academy)**, and **Workspace C (Venue)** reusing and adapting `UserDashboardPage`, `PlayerCard`, `SportsCvWizard`, `AcademyHubPage`, `OrganizationsWorkspacePage`, and `TurfSlotCalendarPage` over real Supabase queries.
   - **Batch 3B (Specialist Ecosystem):** Implement **Workspace D (Coach)**, **Workspace E (Trial Organiser)**, and **Workspace F (Creator)** reusing `CoachDashboardPage`, `TournamentOpsPage`/`OpportunitiesPage`, and `CreatorHubPage` over real Supabase queries with zero seed/demo metrics.

4. **Phase 4 — Verification, Security Audit & Browser QA**
   - Verify RLS isolation tests (`pg-mem` / Vitest), unit tests for `workspaceEngine`/`workspacePermissions`/`workspaceRoutes`, `npm run typecheck`, `npm run build`, and Playwright UI verification across desktop + mobile light/dark viewports at `/workspace`.
