# KhelGrid Coach Workspace — Phase Progress & Known Issues Register

## Phase Completion Log
- **Phase 0 (Codebase Audit):** Completed. Audited routes, migrations, RLS policies, and legacy prototype modules.
- **Phase 1 (Workspace Foundation):** Completed in repository code and migration SQL (`20261126120000_coach_workspace_phase1_foundation.sql`). Needs deployment to development Supabase (`hznsbxvovjxvmnchzzqt`) and post-Phase 1 review before starting Phase 2.
- **Phases 2–10:** Not yet implemented (scoped by phase gate).

## Known Issues & Security Backlog (Non-Blocking for Phase 1, Tracked for Next Phases)
1. **Unapplied Development Migration:** `supabase/migrations/20261126120000_coach_workspace_phase1_foundation.sql` must be applied to the development Supabase project `hznsbxvovjxvmnchzzqt` to serve live requests against `coach_profiles`, `coach_verification_submissions`, and the new RPCs.
2. **Legacy `coachSaaSClient.ts` Shared Callers:** `AthleteProfilePage.tsx`, `CoachInquiryModal.tsx`, and `partnerOnboardingService.ts` still invoke helper methods on `coachSaaSClient.ts`. Untouched in Phase 1 to preserve backwards compatibility; planned for DB migration in Phases 2 & 4.
3. **Public Inquiries & Endorsement Stub Security (`Phase 2/4`):**
   - `public.coach_inquiries` (`20261107180000`) lacks coach-owner SELECT/UPDATE RLS and has permissive `INSERT WITH CHECK (true)`.
   - `saveCoachEndorsement()` in `src/integrations/supabase/athlete-profile-client.ts` is currently a client-side stub; endorsements require authenticated verified-coach verification in Phase 2/4.
4. **Community Reviews Hardening (`Phase 9`):** `public.reviews` (`20261101030000`) requires authenticated/verified review INSERT/UPDATE hardening and `entity_type` expansion to support `'coach'` reviews.
5. **Pre-Existing Sibling Legacy Route Parity Note:** Audit noted `/turf-calendar` and `/tournament-ops` standalone routes in `src/App.tsx` remain outside Phase 1 Coach Workspace scope (handled inside `WorkspaceShell` when accessed via `/workspace/*`).
6. **Athlete Dashboard Dependency (`Phase 2`):** Coach-athlete invitations/consent should be aligned with the Athlete Dashboard (`UserDashboardPage`) before implementing Phase 2 relationship tables.
