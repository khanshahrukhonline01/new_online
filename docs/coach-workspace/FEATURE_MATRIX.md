# KhelGrid Coach Workspace — Feature Matrix

| Module / Capability | Status | Phase | Implementation Notes |
| :--- | :--- | :--- | :--- |
| Protected Routes & Auth Guard (`/coach-dashboard*`, `/workspace/coach/*`) | **Completed** | Phase 1 | Enforced via `<RequireTenantMember>` + DB RPC session/membership validation |
| Coach Workspace Navigation Shell & Sub-Routes | **Completed** | Phase 1 | Grouped navigation covering all Section 3 routes in `CoachDashboardPage.tsx` |
| Overview KPIs, Quick Actions & Loading/Empty/Error States | **Completed** | Phase 1 | Powered by `get_coach_dashboard_overview` RPC; zero dummy numbers or local mocks |
| Professional Coach Profile (18 fields) | **Completed** | Phase 1 | Stored in `public.coach_profiles`; validation for URLs & bounds |
| Accreditation Verification Submission, Feedback & History | **Completed** | Phase 1 | Stored in `public.coach_verification_submissions` + `verification_claims`; trigger blocks self-verification |
| Academy Associations View | **Completed** | Phase 1 | Reads verified `tenant_memberships` for academy/institutional orgs |
| Live Notifications Inbox | **Completed** | Phase 1 | Reads/marks read rows in `public.user_notifications` |
| Account Settings & Privacy Links | **Partially Completed** | Phase 1 / Phase 10 | Linked to `/settings` DPDP controls + profile contact preferences; deactivation UX refinements in Phase 10 |
| Consent-Gated Athlete Management & Invitations | **Not Implemented** | Phase 2 | Requires shared Athlete Dashboard acceptance flow alignment |
| Training Programmes & Exercises Builder | **Not Implemented** | Phase 3 | Roadmap view registered at `/coach-dashboard/programmes*` |
| Training Calendar & Discrete Sessions | **Not Implemented** | Phase 3 | Roadmap view registered at `/coach-dashboard/calendar` and `/sessions/:id` |
| Session Attendance (`late`, audit) & Multi-Category Assessments | **Not Implemented** | Phase 4 | Pure SAI engine exists in `kheloIndiaBattery.ts`; DB tables in Phase 4 |
| Team Assignments & Assistant Coach Scoping | **Not Implemented** | Phase 5 | Depends on Phase 3/4 operational tables |
| Scoped Messaging & Training Announcements | **Not Implemented** | Phase 6 | Planned with strict conversation participant RLS |
| Saved Venues & Athlete Opportunity Recommendations | **Not Implemented** | Phase 7 | Deep links currently point to `/venues` and `/opportunities` |
| Private Video Analysis, Documents Storage & Reports Export | **Not Implemented** | Phase 8 | Requires private Supabase Storage bucket quota plan |
| Enquiry-Only Coaching Services, Reviews & Public `/coaches/:slug` | **Not Implemented** | Phase 9 | Requires `reviews` RLS hardening first (no payments enabled) |
| Full Postgres RLS Matrix, Browser Acceptance & Accessibility Sign-Off | **Not Implemented** | Phase 10 | Final release gate |
