# KhelGrid Academy SaaS Workspace — Database & RPC Reference

**Primary Migration:** `supabase/migrations/20261126140000_academy_workspace_saas_foundation.sql`

## New & Extended Tables
- `public.academy_staff_branch_assignments` — Scoped branch assignments per `tenant_memberships`.
- `public.academy_profiles` — Extended academy public/operational metadata (1:1 with `tenants`), trigger-protected verification fields.
- `public.tenant_units` (extended) — Added `branch_code`, `address`, `pincode`, `sports_offered`, `facilities`, `operating_hours`, `contact_phone`, `contact_email`, `capacity`, `is_primary`, `deleted_at`.
- `public.academy_coaches` — Coach roster linking to `coach_profiles` & `auth.users` & `tenant_memberships` with safeguarding status.
- `public.tenant_batches` (extended) — Added branch `unit_id`, `coach_id`, `skill_level`, `description`, `start_date`, `end_date`.
- `public.tenant_students` (extended) — Added `unit_id`, `athlete_user_id`, `athlete_profile_id`, `assigned_coach_id`, `sport`, `age_category`, `skill_level`, `enrollment_status`, `joining_date`, `emergency_contact_*`, `guardian_consent_verified`, `medical_notes`.
- `public.academy_athlete_notes` — Private internal coaching/development/injury notes.
- `public.academy_training_sessions` — Discrete & recurring sessions with `prevent_academy_session_overlap()` trigger preventing double-booking of facilities or coaches.
- `public.tenant_attendance_events` (extended) + `public.academy_attendance_audit_logs` + `public.academy_coach_attendance` — Supports `present | absent | late | excused` and immutable edit logging.
- `public.academy_trial_postings` + `public.tenant_enquiries` (extended 8+ stage pipeline) + `public.academy_admission_notes`.
- `public.academy_facilities` + `public.academy_equipment_items`.
- `public.academy_announcements` — Targeted in-app communication log fanned out to `public.user_notifications`.

## SECURITY DEFINER RPCs
- `public.has_academy_branch_access(p_tenant_id, p_unit_id)`
- `public.has_academy_permission(p_tenant_id, p_permission, p_unit_id)`
- `public.ensure_academy_profile_for_tenant(p_tenant_id)`
- `public.submit_academy_profile_for_moderation(p_tenant_id, p_document_type, p_proof_details, p_document_url)`
- `public.submit_academy_trial_for_moderation(p_trial_id)`
- `public.invite_academy_staff_member(p_tenant_id, p_invited_email, p_role, p_unit_ids)`
- `public.update_academy_staff_membership(p_tenant_id, p_membership_id, p_new_role, p_unit_ids, p_status)`
- `public.convert_academy_enquiry_to_student(p_tenant_id, p_enquiry_id, p_batch_id, p_unit_id, p_monthly_fee)`
- `public.publish_academy_announcement(p_tenant_id, p_audience, p_title, p_message, p_unit_id, p_batch_id, p_channel)`
- `public.get_academy_dashboard_overview(p_tenant_id, p_unit_id)`
