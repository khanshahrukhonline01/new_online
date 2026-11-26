# KhelGrid Coach Workspace — Route & Navigation Map

## 1. Public Routes
| Path | Target | Status |
| :--- | :--- | :--- |
| `/coaches` | `CoachesPage` (public verified directory) | Active |
| `/coaches/:slug` | Redirects to `/coaches` in `routing.ts` (dedicated public detail page planned in Phase 9) | Scheduled Phase 9 |
| `/demo?persona=coach` | `TenantDemoShowcasePage` (read-only product tour) | Active |
| `/partner-signup?role=coach` | `PartnerOnboardingPage` (registers `coach` user + `coach` SaaS tenant) | Active |

## 2. Protected Coach Workspace Routes
All `/coach-dashboard*` routes (wrapped in `RegulatoryWorkspaceGuard` + `RequireTenantMember` in `App.tsx`) and `/workspace/coach/:section` routes (wrapped inside `WorkspaceShell`) resolve to `CoachDashboardPage`:

| Standalone Route | Unified Shell Route | Section ID | Phase Status |
| :--- | :--- | :--- | :--- |
| `/coach-dashboard`, `/coach/hub`, `/coach/manage` | `/workspace/coach/overview` | `overview` | Completed (Phase 1) |
| `/coach-dashboard/profile` | `/workspace/coach/profile` | `profile` | Completed (Phase 1) |
| `/coach-dashboard/credentials` *(via shell)* | `/workspace/coach/credentials` | `credentials` | Completed (Phase 1) |
| `/coach-dashboard/academy` | `/workspace/coach/academy` | `academy` | Completed (Phase 1) |
| `/coach-dashboard/notifications` | `/workspace/coach/notifications` | `notifications` | Completed (Phase 1) |
| `/coach-dashboard/settings` | `/workspace/coach/settings` | `settings` | Completed (Phase 1 link + summary) |
| `/coach-dashboard/athletes`, `/coach-dashboard/athletes/:athleteId` | `/workspace/coach/athletes` | `athletes` | Scheduled (Phase 2) |
| `/coach-dashboard/programmes`, `/create`, `/:programmeId` | `/workspace/coach/programmes` | `programmes` | Scheduled (Phase 3) |
| `/coach-dashboard/calendar`, `/coach-dashboard/sessions/:sessionId` | `/workspace/coach/calendar` | `calendar` | Scheduled (Phase 3) |
| `/coach-dashboard/attendance` | `/workspace/coach/attendance` | `attendance` | Scheduled (Phase 4) |
| `/coach-dashboard/assessments` | `/workspace/coach/assessments` | `assessments` | Scheduled (Phase 4) |
| `/coach-dashboard/teams` | `/workspace/coach/teams` | `teams` | Scheduled (Phase 5) |
| `/coach-dashboard/messages` | `/workspace/coach/messages` | `messages` | Scheduled (Phase 6) |
| `/coach-dashboard/venues` | `/workspace/coach/venues` | `venues` | Scheduled (Phase 7) |
| `/coach-dashboard/opportunities` | `/workspace/coach/opportunities` | `opportunities` | Scheduled (Phase 7) |
| `/coach-dashboard/video-analysis` | `/workspace/coach/video-analysis` | `video-analysis` | Scheduled (Phase 8) |
| `/coach-dashboard/documents` | `/workspace/coach/documents` | `documents` | Scheduled (Phase 8) |
| `/coach-dashboard/reports` | `/workspace/coach/reports` | `reports` | Scheduled (Phase 8) |
| `/coach-dashboard/reviews` | `/workspace/coach/reviews` | `reviews` | Scheduled (Phase 9) |
| `/coach-dashboard/services` | `/workspace/coach/services` | `services` | Scheduled (Phase 9) |
