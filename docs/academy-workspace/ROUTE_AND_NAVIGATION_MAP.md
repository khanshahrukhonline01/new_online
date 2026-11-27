# KhelGrid Academy SaaS Workspace — Route & Navigation Map

## Operational Workspace Routes (Guarded)
All operational routes below require:
1. Active `RegulatoryWorkspaceGuard persona="academy"` clearance
2. Active `RequireTenantMember` verification (`tenant_type` in `academy | club | school | college | university | training_org`)
3. Active server-verified role inside `tenant_memberships`

- `/academy-hub` — Overview & live PostgreSQL metrics
- `/academies/manage` — Alias to Academy Overview
- `/academy-hub/profile` — Academy profile editor, fee display schedule, affiliations, preview & moderation verification submission
- `/academy-hub/branches` — Branches / training centres management
- `/academy-hub/athletes` & `/academy-hub/athletes/:studentId` — Athlete roster & private detail/notes drawer
- `/academy-hub/coaches` — Coaches & safeguarding directory
- `/academy-hub/training` / `/academy-hub/batches` / `/academy-hub/sessions` — Batches & conflict-guarded session calendar
- `/academy-hub/attendance` — Athlete roll-call (`present | late | absent | excused`), Pitch-Side Ground Mode, coach presence & immutable edit history
- `/academy-hub/admissions` / `/academy-hub/trials` — 8-stage Admissions CRM, internal evaluator notes & moderation-gated trial postings
- `/academy-hub/facilities` / `/academy-hub/equipment` — Facilities, grounds & equipment stock
- `/academy-hub/notifications` — Targeted academy announcements & in-app dispatch log
- `/academy-hub/reports` — Conversion & operational reports + UTF-8 BOM CSV exports
- `/academy-hub/fees` / `/academy-hub/ledger` — Direct zero-commission UPI & offline fee ledger (restricted to Owner/Admin/Finance Manager; online payment gateway paused)
- `/academy-hub/staff` — 7-role RBAC invitations, branch assignments & deactivation
- `/academy-hub/settings` — DPDP minor masking defaults, NPCI UPI VPA setup, immutable audit logs & Owner transfer
- `/workspace/academy/:section` (`overview`, `batches`, `coaches`) — Unified WorkspaceShell persona route preserved
