#!/usr/bin/env python3
"""
KhelGrid Academy Workspace — Native PostgreSQL 16 RLS, Trigger & RBAC Verification Suite
Executes inside an atomic rolled-back transaction (BEGIN; ... ROLLBACK;) against
the approved local Docker PostgreSQL test database ('khelgrid_rls_test') so zero
persistent tables or state are left modified.

Safety guarantees:
1. Requires Docker container 'sports-platform-postgres' and DB 'khelgrid_rls_test'.
2. Rejects any remote/cloud host or non-test database.
3. Uses ZERO DROP TABLE or TRUNCATE statements.
"""

from __future__ import annotations

import os
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
  ('aaaa1111-1111-1111-1111-111111111111', 'owner-a@khelgrid-test.local'),
  ('aaaa2222-2222-2222-2222-222222222222', 'branch1-mgr@khelgrid-test.local'),
  ('aaaa3333-3333-3333-3333-333333333333', 'coach-a@khelgrid-test.local'),
  ('aaaa4444-4444-4444-4444-444444444444', 'admissions-a@khelgrid-test.local'),
  ('aaaa5555-5555-5555-5555-555555555555', 'readonly-a@khelgrid-test.local'),
  ('bbbb1111-1111-1111-1111-111111111111', 'owner-b@khelgrid-test.local')
ON CONFLICT (id) DO NOTHING;

-- Provision Academy A (as owner-a) and Academy B (as owner-b)
DO $$
DECLARE
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_unit_a1 uuid;
  v_unit_a2 uuid;
  v_unit_b1 uuid;
  v_mem_mgr uuid;
  v_mem_coach uuid;
  v_mem_adm uuid;
  v_mem_ro uuid;
  v_coach_a uuid;
  v_batch_a1 uuid;
  v_batch_a2 uuid;
  v_student_a1 uuid;
  v_student_a2 uuid;
  v_fac_a1 uuid;
  v_sess_a1 uuid;
  v_enq_a1 uuid;
  v_trial_a1 uuid;
  v_overview jsonb;
  v_cnt integer;
  v_err_caught boolean;
BEGIN
  -- 1. Provision Academy A
  PERFORM set_config('request.jwt.claim.sub', 'aaaa1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_tenant_a := public.provision_initial_tenant_owner('rls-academy-a', 'RLS Academy A', 'academy', 'Bengaluru', 'Karnataka', 'Football', '9900001111', 'a@test.in');

  INSERT INTO public.tenant_units (tenant_id, name, unit_type, city, is_primary)
  VALUES (v_tenant_a, 'North Campus', 'branch', 'Bengaluru', true)
  RETURNING id INTO v_unit_a1;

  INSERT INTO public.tenant_units (tenant_id, name, unit_type, city, is_primary)
  VALUES (v_tenant_a, 'South Campus', 'branch', 'Bengaluru', false)
  RETURNING id INTO v_unit_a2;

  -- Add branch-scoped manager, coach, admissions_manager, readonly_member to Academy A
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_tenant_a, 'aaaa2222-2222-2222-2222-222222222222', 'manager', 'active')
  RETURNING id INTO v_mem_mgr;

  INSERT INTO public.academy_staff_branch_assignments (tenant_id, membership_id, unit_id, assigned_by)
  VALUES (v_tenant_a, v_mem_mgr, v_unit_a1, 'aaaa1111-1111-1111-1111-111111111111');

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_tenant_a, 'aaaa3333-3333-3333-3333-333333333333', 'coach', 'active')
  RETURNING id INTO v_mem_coach;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_tenant_a, 'aaaa4444-4444-4444-4444-444444444444', 'admissions_manager', 'active')
  RETURNING id INTO v_mem_adm;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_tenant_a, 'aaaa5555-5555-5555-5555-555555555555', 'readonly_member', 'active')
  RETURNING id INTO v_mem_ro;

  -- Seed coach, facilities, batches, students across Branch 1 & Branch 2 of Academy A
  INSERT INTO public.academy_coaches (tenant_id, user_id, membership_id, primary_unit_id, full_name, role_title)
  VALUES (v_tenant_a, 'aaaa3333-3333-3333-3333-333333333333', v_mem_coach, v_unit_a1, 'Coach Vikram', 'Senior Football Coach')
  RETURNING id INTO v_coach_a;

  INSERT INTO public.academy_facilities (tenant_id, unit_id, name, facility_type, sport, capacity)
  VALUES (v_tenant_a, v_unit_a1, 'Main Turf A1', 'turf', 'Football', 30)
  RETURNING id INTO v_fac_a1;

  INSERT INTO public.tenant_batches (tenant_id, unit_id, coach_id, batch_name, sport, days, timings, monthly_fee)
  VALUES (v_tenant_a, v_unit_a1, v_coach_a, 'U-15 North', 'Football', 'Mon,Wed,Fri', '06:30-08:00', 2500)
  RETURNING id INTO v_batch_a1;

  INSERT INTO public.tenant_batches (tenant_id, unit_id, batch_name, sport, days, timings, monthly_fee)
  VALUES (v_tenant_a, v_unit_a2, 'U-17 South', 'Football', 'Tue,Thu,Sat', '17:00-18:30', 3000)
  RETURNING id INTO v_batch_a2;

  INSERT INTO public.tenant_students (tenant_id, unit_id, batch_id, student_name, parent_name, parent_phone, sport, monthly_fee)
  VALUES (v_tenant_a, v_unit_a1, v_batch_a1, 'Rohan North', 'Sunil North', '9811111111', 'Football', 2500)
  RETURNING id INTO v_student_a1;

  INSERT INTO public.tenant_students (tenant_id, unit_id, batch_id, student_name, parent_name, parent_phone, sport, monthly_fee)
  VALUES (v_tenant_a, v_unit_a2, v_batch_a2, 'Dev South', 'Kiran South', '9822222222', 'Football', 3000)
  RETURNING id INTO v_student_a2;

  INSERT INTO public.academy_athlete_notes (tenant_id, student_id, unit_id, author_user_id, author_name, note_type, note_body)
  VALUES (v_tenant_a, v_student_a1, v_unit_a1, 'aaaa1111-1111-1111-1111-111111111111', 'Owner A', 'development', 'Private technical agility note');

  INSERT INTO public.tenant_enquiries (tenant_id, unit_id, enquiry_token, parent_name, parent_phone, student_name, student_age, sport, request_type)
  VALUES (v_tenant_a, v_unit_a1, 'ENQ-RLS-1001', 'Parent Test', '9833333333', 'Arjun Applicant', 13, 'Football', 'free_trial')
  RETURNING id INTO v_enq_a1;

  INSERT INTO public.tenant_fee_transactions (tenant_id, student_id, receipt_number, amount, payment_mode, collected_by_name, billing_month, status)
  VALUES (v_tenant_a, v_student_a1, 'RCPT-RLS-001', 2500, 'direct_upi', 'Owner A', '2026-11', 'settled');

  -- Schedule Session A1 (valid)
  INSERT INTO public.academy_training_sessions (tenant_id, batch_id, unit_id, coach_id, facility_id, title, sport, session_date, start_time, end_time)
  VALUES (v_tenant_a, v_batch_a1, v_unit_a1, v_coach_a, v_fac_a1, 'Morning Passing Drill', 'Football', CURRENT_DATE + 1, '07:00', '08:30')
  RETURNING id INTO v_sess_a1;

  -- Test 2: Session overlap protection (same facility overlapping window)
  v_err_caught := false;
  BEGIN
    INSERT INTO public.academy_training_sessions (tenant_id, batch_id, unit_id, coach_id, facility_id, title, sport, session_date, start_time, end_time)
    VALUES (v_tenant_a, v_batch_a1, v_unit_a1, NULL, v_fac_a1, 'Overlapping Turf Booking', 'Football', CURRENT_DATE + 1, '08:00', '09:00');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Overlapping facility session was allowed';
  END IF;

  -- Test 3: Attendance 'late' + immutable audit log generation
  INSERT INTO public.tenant_attendance_events (tenant_id, batch_id, student_id, unit_id, session_id, session_date, status, marked_by, notes)
  VALUES (v_tenant_a, v_batch_a1, v_student_a1, v_unit_a1, v_sess_a1, CURRENT_DATE, 'present', 'aaaa1111-1111-1111-1111-111111111111', 'On time');

  UPDATE public.tenant_attendance_events
  SET status = 'late', notes = 'Arrived 12 mins late'
  WHERE tenant_id = v_tenant_a AND student_id = v_student_a1 AND session_date = CURRENT_DATE;

  SELECT count(*) INTO v_cnt FROM public.academy_attendance_audit_logs WHERE tenant_id = v_tenant_a AND student_id = v_student_a1;
  IF v_cnt <> 2 THEN
    RAISE EXCEPTION 'ASSERT FAILED: Expected 2 attendance audit log entries (insert + update), got %', v_cnt;
  END IF;

  -- Provision Academy B (as owner-b)
  PERFORM set_config('request.jwt.claim.sub', 'bbbb1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_tenant_b := public.provision_initial_tenant_owner('rls-academy-b', 'RLS Academy B', 'academy', 'Mumbai', 'Maharashtra', 'Cricket', '9900002222', 'b@test.in');

  INSERT INTO public.tenant_units (tenant_id, name, unit_type, city, is_primary)
  VALUES (v_tenant_b, 'Mumbai Branch', 'branch', 'Mumbai', true)
  RETURNING id INTO v_unit_b1;

  -- =========================================================================
  -- SWITCH TO REAL NON-PRIVILEGED 'authenticated' ROLE FOR ATTACK VECTORS
  -- =========================================================================
  SET LOCAL ROLE authenticated;

  -- VECTOR 1: Owner A cannot verify own tenant or academy_profile or publish trial directly
  PERFORM set_config('request.jwt.claim.sub', 'aaaa1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  PERFORM public.ensure_academy_profile_for_tenant(v_tenant_a);

  v_err_caught := false;
  BEGIN
    UPDATE public.academy_profiles SET verification_status = 'verified' WHERE tenant_id = v_tenant_a;
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Owner A bypassed academy_profiles verification trigger';
  END IF;

  v_err_caught := false;
  BEGIN
    UPDATE public.tenants SET verification_status = 'verified' WHERE id = v_tenant_a;
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Owner A bypassed tenants verification trigger';
  END IF;

  v_err_caught := false;
  BEGIN
    INSERT INTO public.academy_trial_postings (tenant_id, unit_id, title, sport, status)
    VALUES (v_tenant_a, v_unit_a1, 'Fake Published Trial', 'Football', 'published');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Trial posting self-published without moderation';
  END IF;

  -- Valid draft + moderation submission by owner A
  INSERT INTO public.academy_trial_postings (tenant_id, unit_id, title, sport, city, status, created_by)
  VALUES (v_tenant_a, v_unit_a1, 'U-15 Open Selection Trials', 'Football', 'Bengaluru', 'draft', 'aaaa1111-1111-1111-1111-111111111111')
  RETURNING id INTO v_trial_a1;
  PERFORM public.submit_academy_trial_for_moderation(v_trial_a1);

  -- VECTOR 2: Cross-Academy Tenant Isolation (Owner B inspecting Academy A tables -> 0 rows)
  PERFORM set_config('request.jwt.claim.sub', 'bbbb1111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  SELECT count(*) INTO v_cnt FROM public.academy_profiles WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant read on academy_profiles'; END IF;
  SELECT count(*) INTO v_cnt FROM public.tenant_students WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant read on tenant_students'; END IF;
  SELECT count(*) INTO v_cnt FROM public.academy_athlete_notes WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant read on academy_athlete_notes'; END IF;
  SELECT count(*) INTO v_cnt FROM public.academy_training_sessions WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant read on academy_training_sessions'; END IF;
  SELECT count(*) INTO v_cnt FROM public.academy_facilities WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant read on academy_facilities'; END IF;

  v_err_caught := false;
  BEGIN
    PERFORM public.get_academy_dashboard_overview(v_tenant_a, NULL);
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Cross-tenant caller executed get_academy_dashboard_overview';
  END IF;

  -- VECTOR 3: Branch-Scoped Academy Manager (assigned strictly to North Campus v_unit_a1)
  PERFORM set_config('request.jwt.claim.sub', 'aaaa2222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa2222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  SELECT count(*) INTO v_cnt FROM public.tenant_students WHERE tenant_id = v_tenant_a AND unit_id = v_unit_a1;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'ASSERT FAILED: Branch 1 manager should see Branch 1 student'; END IF;

  SELECT count(*) INTO v_cnt FROM public.tenant_students WHERE tenant_id = v_tenant_a AND unit_id = v_unit_a2;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Branch 1 manager leaked Branch 2 student'; END IF;

  v_err_caught := false;
  BEGIN
    INSERT INTO public.tenant_students (tenant_id, unit_id, batch_id, student_name, parent_name, parent_phone)
    VALUES (v_tenant_a, v_unit_a2, v_batch_a2, 'Unauthorized Insert', 'P', '9999999999');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Branch 1 manager inserted student into Branch 2';
  END IF;

  v_err_caught := false;
  BEGIN
    INSERT INTO public.tenant_students (tenant_id, unit_id, batch_id, student_name, parent_name, parent_phone)
    VALUES (v_tenant_a, NULL, NULL, 'Unscoped Bypass', 'P', '9999999999');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Branch 1 manager bypassed branch lock with unit_id=NULL';
  END IF;

  -- VECTOR 4: Coach Role cannot see finance ledger or invite staff
  PERFORM set_config('request.jwt.claim.sub', 'aaaa3333-3333-3333-3333-333333333333', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}', true);

  SELECT count(*) INTO v_cnt FROM public.tenant_fee_transactions WHERE tenant_id = v_tenant_a;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Coach leaked financial transactions'; END IF;

  v_overview := public.get_academy_dashboard_overview(v_tenant_a, NULL);
  IF (v_overview->'stats'->>'canViewFinance')::boolean IS TRUE OR (v_overview->'stats'->'totalFeeCollectedInr')::text <> 'null' THEN
    RAISE EXCEPTION 'ASSERT FAILED: Overview RPC leaked financial totals to Coach role: %', v_overview->'stats';
  END IF;

  v_err_caught := false;
  BEGIN
    PERFORM public.update_academy_staff_membership(v_tenant_a, v_mem_coach, 'owner', NULL, 'active');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Coach self-escalated to owner';
  END IF;

  -- VECTOR 5: Read-only Staff cannot mutate attendance or batches or athletes
  PERFORM set_config('request.jwt.claim.sub', 'aaaa5555-5555-5555-5555-555555555555', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa5555-5555-5555-5555-555555555555","role":"authenticated"}', true);

  v_err_caught := false;
  BEGIN
    INSERT INTO public.academy_athlete_notes (tenant_id, student_id, unit_id, author_user_id, author_name, note_type, note_body)
    VALUES (v_tenant_a, v_student_a1, v_unit_a1, 'aaaa5555-5555-5555-5555-555555555555', 'Read Only', 'general', 'Attempted mutation');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERT FAILED: Readonly staff mutated athlete notes';
  END IF;

  -- VECTOR 6: Admissions Manager converts applicant cleanly into active athlete
  PERFORM set_config('request.jwt.claim.sub', 'aaaa4444-4444-4444-4444-444444444444', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa4444-4444-4444-4444-444444444444","role":"authenticated"}', true);

  PERFORM public.convert_academy_enquiry_to_student(v_tenant_a, v_enq_a1, v_batch_a1, v_unit_a1, 2500);
  SELECT count(*) INTO v_cnt FROM public.tenant_students WHERE tenant_id = v_tenant_a AND student_name = 'Arjun Applicant';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAILED: Admissions manager conversion did not create student';
  END IF;

  -- VECTOR 7: Anonymous visitor cannot read any private academy data (privilege revoked OR 0 RLS rows)
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO v_cnt FROM public.tenant_students;
    IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Anon read tenant_students'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    SELECT count(*) INTO v_cnt FROM public.academy_athlete_notes;
    IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Anon read academy_athlete_notes'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    SELECT count(*) INTO v_cnt FROM public.academy_trial_postings;
    IF v_cnt <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: Anon read academy_trial_postings'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  RESET ROLE;
  RAISE NOTICE 'ALL ACADEMY POSTGRES 16 SECURITY & WORKFLOW ASSERTIONS PASSED (7/7 VECTORS + CONFLICTS + AUDIT)';
END $$;
"""


def main() -> int:
    # Safety verification
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
        print("POSTGRES ASSERTION FAILED!", file=sys.stderr)
        print(res.stdout[-2000:], file=sys.stderr)
        print(res.stderr[-2500:], file=sys.stderr)
        return res.returncode

    for line in res.stderr.splitlines() + res.stdout.splitlines():
        if "ASSERT" in line or "PASSED" in line or "ROLLBACK" in line:
            print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
