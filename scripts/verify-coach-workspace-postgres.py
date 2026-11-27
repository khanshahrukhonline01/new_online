#!/usr/bin/env python3
"""
KhelGrid Coach Workspace — Native PostgreSQL 16 RLS, Trigger & Workflow Verification Suite
Executes inside an atomic rolled-back transaction (BEGIN; ... ROLLBACK;) against
the approved local Docker PostgreSQL test database ('khelgrid_rls_test') so zero
persistent tables or state are left modified.

Verifies:
1. Anonymous role (anon) fails closed (42501 / permission denied) on all Phase 3 coach tables
2. Self-assignment spoofing of coach_profiles.directory_coach_id & verification_status is blocked
3. Cross-coach tenant/profile isolation across athletes, notes, programmes, assignments,
   sessions, attendance, assessments, and directory coach inquiries
4. Consent-first invariant on linked athlete accounts & strict coach_private vs
   shared_with_athlete note visibility
5. Session overlap conflict detection (23P01) + cancelled-session slot release
6. Cross-coach foreign-key ownership triggers (23503)
7. Server-computed get_coach_dashboard_overview() live aggregation
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTAINER = "sports-platform-postgres"
TARGET_DB = "khelgrid_rls_test"

PREREQUISITE_MIGRATIONS = [
    "20261025070100_initial_core_schema.sql",
    "20261028090000_directory_and_listing_moderation.sql",
    "20261031120000_create_athlete_profiles.sql",
    "20261101010000_trust_safety_verification_and_reporting.sql",
    "20261107120000_auth_and_user_profiles_hardening.sql",
    "20261107180000_pillar1_unified_relational_schema.sql",
    "20261108000000_phase3_rbac_and_privilege_hardening.sql",
    "20261110150000_phase_moderation_notifications.sql",
    "20261122000000_saas_platform_core_rbac_entitlements_metering.sql",
    "20261122100000_phase2_schema_consolidation_and_soft_deletion.sql",
    "20261126000000_expand_profiles_role_check.sql",
    "20261126120000_coach_workspace_phase1_foundation.sql",
    "20261126140000_academy_workspace_saas_foundation.sql",
    "20261127000000_phase2_academy_finance_ledger_hardening.sql",
    "20261127120000_coach_workspace_phase3_operations.sql",
]


def strip_tx(sql: str) -> str:
    sql = re.sub(r"(?im)^\s*BEGIN\s*;\s*$", "", sql)
    sql = re.sub(r"(?im)^\s*COMMIT\s*;\s*$", "", sql)
    return sql


ASSERTION_SQL = r"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN phone text DEFAULT NULL;
  END IF;
END $$;

-- Seed isolated test identities inside auth.users
INSERT INTO auth.users (id, email) VALUES
  ('cccc1111-1111-1111-1111-111111111111', 'coach-alpha@khelgrid-test.local'),
  ('cccc2222-2222-2222-2222-222222222222', 'coach-beta@khelgrid-test.local'),
  ('cccc3333-3333-3333-3333-333333333333', 'athlete-linked@khelgrid-test.local'),
  ('cccc4444-4444-4444-4444-444444444444', 'outsider-user@khelgrid-test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_cp_alpha public.coach_profiles%ROWTYPE;
  v_cp_beta public.coach_profiles%ROWTYPE;
  v_dir_coach_id uuid;
  v_ath_offline_id uuid;
  v_ath_linked_id uuid;
  v_prog_alpha_id uuid;
  v_prog_beta_id uuid;
  v_sess_future_id uuid;
  v_sess_completed_id uuid;
  v_sess_cancelled_id uuid;
  v_count int;
  v_overview jsonb;
  v_stats jsonb;
  v_priv_blocked boolean;
BEGIN
  -- Seed a public directory coach row + inquiry for Alpha (linked by superuser/moderator only)
  INSERT INTO public.coaches (display_name, slug, sport, city, bio, experience_years, publication_status)
  VALUES ('Coach Alpha Directory', 'coach-alpha-dir', 'Athletics', 'Pune', 'Endurance sprints specialist', 9, 'published')
  RETURNING id INTO v_dir_coach_id;

  -- Provision Coach Alpha and Coach Beta via authorized RPC
  PERFORM set_config('request.jwt.claim.sub', 'cccc1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT * INTO v_cp_alpha FROM public.ensure_coach_profile_for_user(NULL);

  -- VECTOR 1: Self-assignment spoofing of directory_coach_id MUST fail under authenticated role
  v_priv_blocked := false;
  BEGIN
    UPDATE public.coach_profiles
    SET directory_coach_id = v_dir_coach_id
    WHERE id = v_cp_alpha.id;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%only authorized moderators can link public directory coach records%' THEN
      v_priv_blocked := true;
    END IF;
  END;
  IF NOT v_priv_blocked THEN
    RAISE EXCEPTION 'ASSERT FAIL (V1): Coach was allowed to spoof directory_coach_id.';
  END IF;

  -- Provision Coach Beta
  PERFORM set_config('request.jwt.claim.sub', 'cccc2222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc2222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SELECT * INTO v_cp_beta FROM public.ensure_coach_profile_for_user(NULL);

  -- Moderator/postgres links v_dir_coach_id to Alpha only
  RESET ROLE;
  UPDATE public.coach_profiles SET directory_coach_id = v_dir_coach_id WHERE id = v_cp_alpha.id;

  -- Public inquiry submitted anonymously to v_dir_coach_id
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  SET LOCAL ROLE anon;
  INSERT INTO public.coach_inquiries (
    inquiry_token, coach_id, coach_slug, coach_name, athlete_name, phone, sport, status
  ) VALUES (
    'INQ-TEST-ALPHA-01', v_dir_coach_id, 'coach-alpha-dir', 'Coach Alpha Directory', 'Diya Kulkarni', '9898989898', 'Athletics', 'submitted'
  );

  -- VECTOR 2: Anon role fails closed on ALL 7 new Phase 3 Coach tables
  FOR v_priv_blocked IN
    SELECT false
  LOOP NULL; END LOOP;

  BEGIN
    PERFORM count(*) FROM public.coach_athletes;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_athletes.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_athlete_notes;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_athlete_notes.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_training_programmes;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_training_programmes.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_programme_assignments;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_programme_assignments.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_training_sessions;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_training_sessions.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_session_attendance;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_session_attendance.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM count(*) FROM public.coach_athlete_assessments;
    RAISE EXCEPTION 'ASSERT FAIL (V2): anon could query coach_athlete_assessments.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Switch to Coach Alpha
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', 'cccc1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  -- Alpha can view directory inquiry addressed to their linked directory_coach_id
  SELECT count(*) INTO v_count FROM public.coach_inquiries WHERE coach_id = v_dir_coach_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V3a): Alpha should read their linked directory inquiry (got %).', v_count;
  END IF;

  -- Alpha adds an offline/guardian trainee (active directly) AND invites a linked registered athlete
  INSERT INTO public.coach_athletes (
    coach_profile_id, full_name, guardian_name, guardian_phone, sport, age_group, age_years, gender,
    skill_level, relationship_status, consent_granted, goals_summary
  ) VALUES (
    v_cp_alpha.id, 'Rohan Verma', 'Suresh Verma', '9811122233', 'Athletics', 'U-14', 13, 'male',
    'Intermediate', 'active', true, '800m pacing & stride efficiency'
  ) RETURNING id INTO v_ath_offline_id;

  -- VECTOR 4a: Even if Alpha passes consent_granted = true / active on a linked athlete_user_id,
  -- consent-first trigger MUST downgrade it to invited + consent_granted = false!
  INSERT INTO public.coach_athletes (
    coach_profile_id, athlete_user_id, full_name, sport, age_group, age_years, gender,
    skill_level, relationship_status, consent_granted
  ) VALUES (
    v_cp_alpha.id, 'cccc3333-3333-3333-3333-333333333333', 'Meera Joshi', 'Athletics', 'U-16', 15, 'female',
    'Advanced', 'active', true
  ) RETURNING id INTO v_ath_linked_id;

  SELECT count(*) INTO v_count
  FROM public.coach_athletes
  WHERE id = v_ath_linked_id AND relationship_status = 'invited' AND consent_granted = false;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V4a): Coach forged linked athlete consent without athlete acceptance.';
  END IF;

  -- Private vs Shared notes on invited/linked athlete
  INSERT INTO public.coach_athlete_notes (coach_athlete_id, coach_profile_id, note_type, visibility, note_body)
  VALUES
    (v_ath_linked_id, v_cp_alpha.id, 'injury_precaution', 'coach_private', 'PRIVATE_COACH_NOTE: Monitor left hamstring tightness'),
    (v_ath_linked_id, v_cp_alpha.id, 'development', 'shared_with_athlete', 'SHARED_NOTE: Maintain 3x200m tempo drills twice weekly');

  -- Alpha creates an active Training Programme & assigns both athletes
  INSERT INTO public.coach_training_programmes (
    coach_profile_id, title, sport, target_age_group, difficulty_level, duration_weeks, sessions_per_week, status, summary, exercises
  ) VALUES (
    v_cp_alpha.id, 'Sprint Acceleration Block', 'Athletics', 'U-16', 'Intermediate', 6, 4, 'active',
    'Block phase focus on drive mechanics.',
    '[{"name":"A-Skips","sets":"4","reps":"30m","intensity":"RPE 7"}]'::jsonb
  ) RETURNING id INTO v_prog_alpha_id;

  INSERT INTO public.coach_programme_assignments (programme_id, coach_athlete_id, coach_profile_id, status, progress_pct)
  VALUES
    (v_prog_alpha_id, v_ath_offline_id, v_cp_alpha.id, 'in_progress', 45),
    (v_prog_alpha_id, v_ath_linked_id, v_cp_alpha.id, 'assigned', 0);

  -- Alpha schedules a future session, a past completed session, and a cancelled slot
  INSERT INTO public.coach_training_sessions (
    coach_profile_id, programme_id, title, sport, session_date, start_time, end_time, venue_name, location_city, session_mode, status, max_participants
  ) VALUES (
    v_cp_alpha.id, v_prog_alpha_id, 'Morning Track Blocks', 'Athletics', CURRENT_DATE + 2, '07:00', '08:30', 'Shiv Chhatrapati Track', 'Pune', 'in_person', 'scheduled', 12
  ) RETURNING id INTO v_sess_future_id;

  INSERT INTO public.coach_training_sessions (
    coach_profile_id, programme_id, title, sport, session_date, start_time, end_time, venue_name, location_city, session_mode, status
  ) VALUES (
    v_cp_alpha.id, v_prog_alpha_id, 'Endurance Check Session', 'Athletics', CURRENT_DATE - 3, '07:00', '08:00', 'Pune Track', 'Pune', 'in_person', 'completed'
  ) RETURNING id INTO v_sess_completed_id;

  -- VECTOR 5: Overlapping active session on same coach & date MUST raise 23P01
  v_priv_blocked := false;
  BEGIN
    INSERT INTO public.coach_training_sessions (
      coach_profile_id, title, sport, session_date, start_time, end_time, status
    ) VALUES (
      v_cp_alpha.id, 'Conflicting Overlap', 'Athletics', CURRENT_DATE + 2, '08:00', '09:15', 'scheduled'
    );
  EXCEPTION WHEN exclusion_violation THEN
    v_priv_blocked := true;
  END;
  IF NOT v_priv_blocked THEN
    RAISE EXCEPTION 'ASSERT FAIL (V5a): Overlapping coach session was allowed.';
  END IF;

  -- Cancelled session in same window MUST be allowed & ignored for overlap
  INSERT INTO public.coach_training_sessions (
    coach_profile_id, title, sport, session_date, start_time, end_time, status
  ) VALUES (
    v_cp_alpha.id, 'Rain Cancelled Slot', 'Athletics', CURRENT_DATE + 2, '07:15', '08:15', 'cancelled'
  ) RETURNING id INTO v_sess_cancelled_id;

  -- Attendance roll-call: 2 present (offline) vs 1 absent / 1 late -> let's log 1 present + 1 late + 1 absent = 2/3 = 66.7%
  INSERT INTO public.coach_session_attendance (session_id, coach_athlete_id, coach_profile_id, status, notes)
  VALUES
    (v_sess_completed_id, v_ath_offline_id, v_cp_alpha.id, 'present', 'Strong finish'),
    (v_sess_completed_id, v_ath_linked_id, v_cp_alpha.id, 'late', 'Arrived 10m late'),
    (v_sess_future_id, v_ath_offline_id, v_cp_alpha.id, 'absent', 'Pre-informed exam');

  -- Record a Khelo India assessment for Rohan Verma only (leaving Meera needing recent assessment)
  INSERT INTO public.coach_athlete_assessments (
    coach_profile_id, coach_athlete_id, athlete_name, category, age_band, assessment_date, overall_score, grade_band, sai_report_code, metrics, coach_summary
  ) VALUES (
    v_cp_alpha.id, v_ath_offline_id, 'Rohan Verma', 'khelo_india', 'junior_9_14', CURRENT_DATE, 84.00, 'Grade A', 'SAI-KI-2026-PUN-001',
    '{"bmi":18.9,"averageStars":4.2,"testScores":[{"testName":"50m Dash","stars":4}]}'::jsonb,
    'Strong acceleration mechanics.'
  );

  -- VECTOR 3 & 4b: Coach Beta MUST see ZERO of Alpha's data & cannot link to Alpha entities
  PERFORM set_config('request.jwt.claim.sub', 'cccc2222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc2222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  SELECT count(*) INTO v_count FROM public.coach_athletes WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha athletes.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_athlete_notes WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha notes.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_training_programmes WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha programmes.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_training_sessions WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha sessions.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_session_attendance WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha attendance.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_athlete_assessments WHERE coach_profile_id = v_cp_alpha.id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha assessments.'; END IF;

  SELECT count(*) INTO v_count FROM public.coach_inquiries WHERE coach_id = v_dir_coach_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL (V3b): Beta read Alpha directory inquiries.'; END IF;

  -- Beta creates their own programme and tries cross-coach assignment onto Alpha athlete (VECTOR 6)
  INSERT INTO public.coach_training_programmes (coach_profile_id, title, sport)
  VALUES (v_cp_beta.id, 'Beta Only Plan', 'Football')
  RETURNING id INTO v_prog_beta_id;

  v_priv_blocked := false;
  BEGIN
    INSERT INTO public.coach_programme_assignments (programme_id, coach_athlete_id, coach_profile_id)
    VALUES (v_prog_beta_id, v_ath_offline_id, v_cp_beta.id);
  EXCEPTION WHEN foreign_key_violation THEN
    v_priv_blocked := true;
  END;
  IF NOT v_priv_blocked THEN
    RAISE EXCEPTION 'ASSERT FAIL (V6): Beta assigned own programme onto Alpha athlete.';
  END IF;

  -- VECTOR 4c: Outsider cannot call coach_accept_athlete_consent
  PERFORM set_config('request.jwt.claim.sub', 'cccc4444-4444-4444-4444-444444444444', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc4444-4444-4444-4444-444444444444","role":"authenticated"}', true);
  v_priv_blocked := false;
  BEGIN
    PERFORM public.coach_accept_athlete_consent(v_ath_linked_id, true);
  EXCEPTION WHEN insufficient_privilege THEN
    v_priv_blocked := true;
  END;
  IF NOT v_priv_blocked THEN
    RAISE EXCEPTION 'ASSERT FAIL (V4c): Outsider accepted someone else athlete consent.';
  END IF;

  -- Linked Athlete accepts consent & verifies note/programme/assessment visibility boundaries
  PERFORM set_config('request.jwt.claim.sub', 'cccc3333-3333-3333-3333-333333333333', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc3333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  PERFORM public.coach_accept_athlete_consent(v_ath_linked_id, true);

  -- Linked athlete reads ONLY shared_with_athlete note, NEVER coach_private
  SELECT count(*) INTO v_count
  FROM public.coach_athlete_notes
  WHERE coach_athlete_id = v_ath_linked_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V4d): Linked athlete should see exactly 1 shared note, got %.', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.coach_athlete_notes
  WHERE coach_athlete_id = v_ath_linked_id AND note_body LIKE 'PRIVATE_COACH_NOTE%';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V4d): Linked athlete leaked coach_private note.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.coach_training_programmes
  WHERE id = v_prog_alpha_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V4e): Active linked athlete could not read assigned programme.';
  END IF;

  -- VECTOR 7: Alpha overview aggregation reflects live Phase 3 operational state
  PERFORM set_config('request.jwt.claim.sub', 'cccc1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_overview := public.get_coach_dashboard_overview(NULL);
  v_stats := v_overview->'stats';

  IF (v_stats->>'totalAthletes')::int <> 2
     OR (v_stats->>'activeAthletes')::int <> 2
     OR (v_stats->>'pendingAthleteRequests')::int <> 1
     OR (v_stats->>'activeProgrammes')::int <> 1
     OR (v_stats->>'upcomingSessions')::int <> 1
     OR (v_stats->>'completedSessions')::int <> 1
     OR (v_stats->>'pendingAssessments')::int <> 1
     OR (v_stats->>'attendanceEventsCount')::int <> 3
     OR (v_stats->>'attendanceRatePct')::numeric <> 66.7 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V7): Unexpected live overview stats: %', v_stats;
  END IF;

  IF jsonb_array_length(v_overview->'recentBatches') <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V7): Expected 1 upcoming session in recentBatches, got %', v_overview->'recentBatches';
  END IF;

  IF jsonb_array_length(v_overview->'recentRequests') <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL (V7): Expected 1 submitted directory inquiry in recentRequests, got %', v_overview->'recentRequests';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ALL COACH PHASE 3 POSTGRES 16 SECURITY & WORKFLOW ASSERTIONS PASSED (7/7 VECTORS + CONSENT + OVERLAP + VISIBILITY + OVERVIEW)';
END $$;
"""


def main() -> int:
    ps = subprocess.run(
        ["docker", "ps", "--filter", f"name={CONTAINER}", "--format", "{{.Names}}"],
        text=True,
        capture_output=True,
    )
    if CONTAINER not in ps.stdout:
        print(f"Docker container '{CONTAINER}' not running.", file=sys.stderr)
        return 1

    parts = [
        "BEGIN;",
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;",
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF; END $$;",
    ]
    for mig in PREREQUISITE_MIGRATIONS:
        mig_path = ROOT / "supabase" / "migrations" / mig
        if not mig_path.exists():
            print(f"Missing migration: {mig_path}", file=sys.stderr)
            return 1
        parts.append(f"-- === {mig} ===")
        parts.append(strip_tx(mig_path.read_text(encoding="utf-8")))

    parts.append(ASSERTION_SQL)
    parts.append("ROLLBACK;")

    bundle = "\n".join(parts)
    res = subprocess.run(
        [
            "docker", "exec", "-i", CONTAINER,
            "psql", "-U", "postgres", "-d", TARGET_DB, "-v", "ON_ERROR_STOP=1",
        ],
        input=bundle,
        text=True,
        capture_output=True,
        encoding="utf-8",
    )
    if res.returncode != 0:
        print("COACH POSTGRES ASSERTION FAILED!", file=sys.stderr)
        print(res.stdout[-2000:], file=sys.stderr)
        print(res.stderr[-2500:], file=sys.stderr)
        return res.returncode

    for line in res.stderr.splitlines() + res.stdout.splitlines():
        if "ASSERT" in line or "PASSED" in line or "ROLLBACK" in line:
            print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
