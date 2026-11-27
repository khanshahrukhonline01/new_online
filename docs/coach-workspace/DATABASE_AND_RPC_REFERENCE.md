# KhelGrid Coach Workspace — Database Schema & RPC Reference

**Migration Applied in Phase 1:** `supabase/migrations/20261126120000_coach_workspace_phase1_foundation.sql`

## 1. Tables

### `public.coach_profiles`
- **Primary Key:** `id uuid`
- **Owner Link:** `user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
- **Optional Links:** `tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL`, `directory_coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL`
- **Profile Fields:** `slug`, `full_name`, `avatar_url`, `bio`, `sports_specialization text[]`, `coaching_categories text[]`, `experience_years`, `qualifications jsonb`, `certifications jsonb`, `previous_academies jsonb`, `achievements jsonb`, `languages text[]`, `city`, `state`, `service_area`, `coaching_methodology`, `online_coaching_available`, `portfolio_url`, `intro_video_url`, `contact_preferences jsonb`
- **Verification Metadata (Moderator-Protected):** `verification_status` (`unverified | pending | under_review | verified | rejected | suspended`), `verification_feedback`, `verified_at`, `verified_by`

### `public.coach_verification_submissions`
- **Primary Key:** `id uuid`
- **Foreign Keys:** `coach_profile_id` → `coach_profiles(id)`, `user_id` → `auth.users(id)`, `tenant_id` → `tenants(id)`, `verification_claim_id` → `verification_claims(id)`
- **Fields:** `document_type` (`coaching_license | affiliation_certificate | government_id | experience_letter | other`), `document_title`, `supporting_details`, `supporting_document_url`, `status` (`pending | under_review | verified | rejected | suspended`), `moderator_feedback`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`

## 2. RPC Functions (Authenticated-Only)
1. `public.is_coach_moderator() -> boolean`
2. `public.ensure_coach_profile_for_user(p_tenant_id uuid DEFAULT NULL) -> public.coach_profiles`
3. `public.submit_coach_verification_request(p_coach_profile_id uuid, p_document_type text, p_document_title text, p_supporting_details text, p_supporting_document_url text DEFAULT NULL) -> public.coach_verification_submissions`
4. `public.moderate_coach_verification_submission(p_submission_id uuid, p_decision text, p_feedback text DEFAULT NULL) -> public.coach_verification_submissions`
5. `public.get_coach_dashboard_overview(p_tenant_id uuid DEFAULT NULL) -> jsonb`
