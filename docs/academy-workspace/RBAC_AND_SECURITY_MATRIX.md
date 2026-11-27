# KhelGrid Academy SaaS Workspace — 7-Role RBAC & Branch Isolation Matrix

| Academy Role Tier | Canonical DB Role(s) | Scope | Profile & Verification | Branches | Athletes & Coaches | Batches & Sessions | Attendance | Admissions & Trials | Facilities & Gear | Finance (UPI Ledger) | Staff & Settings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Academy Owner** | `owner` | All branches | Full | Full | Full | Full | Full | Full | Full | Full | Full + Ownership Transfer |
| **Academy Administrator** | `org_admin`, `director`, `admin` | All branches | Full | Full | Full | Full | Full | Full | Full | Full (except owner-only transfer) | Staff (no owner demotion) + Settings |
| **Academy Manager** | `manager` | Assigned branch(es) (`academy_staff_branch_assignments`) | No | Assigned branches only | Full (assigned branches) | Full (assigned branches) | Full (assigned branches) | View-only | Full (assigned branches) | Restricted | Restricted |
| **Admissions Manager** | `admissions_manager`, `front_desk` | Assigned / Tenant | No | View | Add & Manage | View schedules | No | Full (8-stage pipeline + Moderation Trials) | View | Restricted | Restricted |
| **Coach / Training Staff** | `head_coach`, `coach` | Assigned / Tenant | No | View | View (`coach`) / Manage (`head_coach`) + Private Notes | Schedule & manage sessions | Student Roll-Call | View (`head_coach`) | View | Strictly Denied (RLS + UI) | Restricted |
| **Finance Manager** | `finance_manager`, `accountant` | Tenant-wide | No | View | View | View | No | No | No | Full Ledger + Exports (Payment Gateway Paused) | Restricted |
| **Read-Only Staff** | `readonly_member` | Assigned / Tenant | View | View | View | View | View | View | View | Restricted | Restricted |

## Database Security Guarantees
1. **Trigger-Locked Verification**: `protect_tenant_verification_fields()` and `protect_academy_profile_verification()` block any client update to `verification_status`, `verified_at`, or `verified_by`.
2. **Moderation-Locked Trials**: `protect_academy_trial_moderation()` forbids inserting/updating `academy_trial_postings.status` to `approved` or `published` without platform moderator intervention (`submit_academy_trial_for_moderation`).
3. **Branch Isolation Enforcement**: `has_academy_branch_access(p_tenant_id, p_unit_id)` enforces branch locks inside PostgreSQL RLS policies and RPCs (`get_academy_dashboard_overview`). Restricted managers cannot bypass scope by passing `unit_id = NULL`.
4. **Immutable Audit Trails**: Attendance inserts/edits append automatically via trigger to `academy_attendance_audit_logs`; critical staff/student/verification events write to `tenant_audit_logs`.
