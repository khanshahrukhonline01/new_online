# KhelGrid Academy SaaS Workspace — Architecture & Pre-Implementation Audit

## 1. Architecture Summary
The KhelGrid Academy Workspace (`/academy-hub/*` and `/workspace/academy/:section`) operates as a database-connected, role-protected, branch-scoped multi-tenant SaaS portal for sports academies, clubs, schools, universities, and training organizations.

### Preserved Platform Foundations Reused
- **Authentication & Membership Context**: `AuthContext` (`useAuth`), `TenantContext` (`useTenant`, `memberships`, `currentTenant`, `currentMembership`, `switchTenant`).
- **Route & Governance Guards**: `RegulatoryWorkspaceGuard`, `RequireTenantMember` (strictly scoped to academy-compatible tenant types & verified roles), `WorkspaceShell`.
- **Database Schema & RPCs**: Built directly onto `public.tenants`, `public.academies`, `public.tenant_units`, `public.tenant_memberships`, `public.tenant_role_permissions`, `public.tenant_batches`, `public.tenant_students`, `public.tenant_enquiries`, `public.tenant_attendance_events`, `public.tenant_fee_transactions`, `public.tenant_audit_logs`, `public.listing_submissions`, `public.verification_claims`, and `public.user_notifications`.

### Key Legacy Remediation Resolved
1. Decommissioned legacy static demo switcher (`CURATED_ACADEMIES` / `Bengaluru FC Residential Academy`), hardcoded `+12.4% MoM` stats, client-only verification overrides (`confirmAndVerifyAcademy`), and localStorage-only operational reliance inside `AcademyHubPage.tsx`.
2. Hardened `/academy-hub` route guard in `src/App.tsx` with explicit `requiredTenantTypes` and `allowedRoles`.
3. Removed client-side role selector UI (`#academy-role-select`); authorization derives exclusively from verified PostgreSQL `tenant_memberships`.
4. Kept `academySaaSClient.ts` intact solely for backwards compatibility with public directory pages (`AcademyDetailPage.tsx`, `AcademyEnquiryModal.tsx`, gate pass tools).
