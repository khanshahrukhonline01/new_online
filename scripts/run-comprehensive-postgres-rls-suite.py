#!/usr/bin/env python3
"""
KhelGrid SaaS Platform — Phase 1: Real Native PostgreSQL RLS Integration Suite
Runs a comprehensive attack matrix against a live local PostgreSQL instance.

SAFETY GUARANTEES:
1. Explicit local test opt-in:
   - Mandates KHELGRID_LOCAL_RLS_TEST=1 in environment.
2. Pre-flight host & database validation:
   - Rejects remote hosts, cloud providers, and production connections.
   - Refuses execution if target database is not an approved isolated test database
     ('khelgrid_rls_test' or 'khelgrid_rls_ci').
3. Non-destructive lifecycle:
   - ZERO TRUNCATE or DROP commands.
   - Targeted cleanup strictly limited to reserved fixture IDs and dedicated test-owner IDs.
4. Native PostgreSQL kernel evaluation:
   - Evaluates real C-level Row Level Security via SET ROLE and set_config jwt claims.
5. Migration presence validation:
   - Verifies tenant_public_directory exists, tenants_member_select has zero 'status = active',
     and is_tenant_member enforces tenant status before executing tests.
"""

import subprocess
import json
import sys
import os
import urllib.parse
import re

# ==============================================================================
# 1. SAFETY & ISOLATION PRE-FLIGHT VERIFICATION
# ==============================================================================

APPROVED_TEST_DATABASES = {'khelgrid_rls_test', 'khelgrid_rls_ci'}
PROHIBITED_HOST_PATTERNS = [
    r'supabase\.(co|in|net)',
    r'hznsbxvovjxvmnchzzqt',
    r'aws\.com',
    r'pooler\.supabase\.com',
    r'neon\.tech',
    r'elephantsql\.com',
    r'render\.com',
    r'railway\.app'
]

LOCAL_HOST_PATTERNS = [
    r'^localhost$',
    r'^127\.0\.0\.1$',
    r'^::1$',
    r'^postgres$',  # Docker network alias
    r'^host\.docker\.internal$'
]

def check_safety(db_url=None, opt_in=None):
    """
    Evaluates safety invariants. Returns (is_safe, failure_reason).
    """
    if opt_in != '1':
        return False, "Missing required environment variable KHELGRID_LOCAL_RLS_TEST=1 (explicit local test opt-in required)"
    
    if db_url:
        parsed = urllib.parse.urlparse(db_url)
        hostname = parsed.hostname or ''
        dbname = parsed.path.lstrip('/')
        
        for pat in PROHIBITED_HOST_PATTERNS:
            if re.search(pat, db_url, re.IGNORECASE):
                return False, f"Matches prohibited remote pattern '{pat}': {hostname}"
        
        is_local = any(re.match(pat, hostname, re.IGNORECASE) for pat in LOCAL_HOST_PATTERNS)
        if not is_local:
            return False, f"Host '{hostname}' is not an approved local address"
            
        if dbname not in APPROVED_TEST_DATABASES:
            return False, f"Database '{dbname}' is not in approved test databases {APPROVED_TEST_DATABASES}"
            
    return True, "Safety verified"

def run_safety_rejection_tests():
    """
    Validates that the safety guardrail correctly rejects prohibited inputs.
    """
    print("Executing runner safety rejection suite...")
    test_cases = [
        ("Missing opt-in", None, None, False),
        ("Remote Supabase host", "postgresql://postgres:secret@hznsbxvovjxvmnchzzqt.supabase.co:5432/postgres", "1", False),
        ("Supabase pooler", "postgresql://postgres:secret@db.pooler.supabase.com:6543/postgres", "1", False),
        ("AWS cloud host", "postgresql://postgres:secret@remote.aws.com:5432/khelgrid_rls_test", "1", False),
        ("Local production db", "postgresql://postgres:secret@127.0.0.1:5432/khelgrid_production", "1", False),
        ("Valid local test db", "postgresql://postgres:secret@127.0.0.1:5432/khelgrid_rls_test", "1", True),
    ]
    
    for name, url, opt, expected in test_cases:
        is_safe, msg = check_safety(url, opt)
        if is_safe != expected:
            print(f"[FAILED] Safety test '{name}': expected {expected}, got {is_safe} ({msg})")
            sys.exit(1)
        else:
            print(f"[PASS] Safety test '{name}': correctly rejected/allowed ({msg})")
            
    print("\n[SAFETY REJECTION VERIFIED] All prohibited connection strings and flags were safely rejected.")
    sys.exit(0)

# CLI hook for safety rejection testing
if '--test-safety-rejection' in sys.argv:
    run_safety_rejection_tests()

# Execute pre-flight check
opt_in = os.environ.get('KHELGRID_LOCAL_RLS_TEST')
db_url = os.environ.get('DATABASE_URL')
is_safe, reason = check_safety(db_url, opt_in)
if not is_safe:
    print(f"\n[FATAL SAFETY VIOLATION] {reason}")
    print("To run local PostgreSQL RLS tests:")
    print("  Windows PowerShell: $env:KHELGRID_LOCAL_RLS_TEST=\"1\"; npm run test:phase1:postgres")
    print("  Linux/macOS:        KHELGRID_LOCAL_RLS_TEST=1 npm run test:phase1:postgres")
    sys.exit(1)

# Docker container check if no explicit DATABASE_URL is provided
if not db_url:
    cmd = ['docker', 'ps', '--filter', 'name=sports-platform-postgres', '--format', '{{.Names}}']
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, check=True)
        if 'sports-platform-postgres' not in p.stdout:
            print("[FATAL BLOCKED] Local Docker container 'sports-platform-postgres' is not running.")
            print("To run local tests, start Docker Desktop and ensure 'sports-platform-postgres' is up.")
            sys.exit(1)
    except Exception as e:
        print(f"[FATAL BLOCKED] Docker check failed: {e}")
        sys.exit(1)

def run_psql(sql, on_error_stop=True):
    db_url = os.environ.get('DATABASE_URL')
    stop_flag = '1' if on_error_stop else '0'
    if db_url:
        cmd = ['psql', db_url, '-v', f'ON_ERROR_STOP={stop_flag}', '-v', 'VERBOSITY=verbose', '-t', '-A']
    else:
        cmd = ['docker', 'exec', '-i', 'sports-platform-postgres', 'psql', '-U', 'postgres', '-d', 'khelgrid_rls_test', '-v', f'ON_ERROR_STOP={stop_flag}', '-v', 'VERBOSITY=verbose', '-t', '-A']
    
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    return p.stdout.strip(), p.stderr.strip(), p.returncode

# Verify live PostgreSQL connection and database name
probe_stdout, probe_stderr, probe_rc = run_psql("SELECT current_database(), current_user;")
if probe_rc != 0 or not probe_stdout:
    print(f"[FATAL BLOCKED] Unable to connect to local test PostgreSQL: {probe_stderr}")
    sys.exit(1)

live_db = probe_stdout.split('|')[0].strip()
if live_db not in APPROVED_TEST_DATABASES:
    print(f"[FATAL SAFETY VIOLATION] Connected database '{live_db}' is not an approved test database!")
    sys.exit(1)

# Verify Migration 20261121220000 Presence
check_view_out, _, check_view_rc = run_psql("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_public_directory';")
if check_view_rc != 0 or check_view_out != "1":
    print("[FATAL BLOCKED] Migration 20261121220000 missing: public.tenant_public_directory does not exist.")
    sys.exit(1)

check_policy_out, _, check_policy_rc = run_psql("SELECT qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenants_member_select';")
if "status = 'active'" in check_policy_out or "status = ''active''" in check_policy_out:
    print("[FATAL BLOCKED] Migration 20261121220000 not applied: public.tenants policy still contains 'status = active'.")
    sys.exit(1)

check_fn_out, _, check_fn_rc = run_psql("SELECT prosrc FROM pg_proc WHERE proname = 'is_tenant_member';")
if "t.status = 'active'" not in check_fn_out:
    print("[FATAL BLOCKED] Migration 20261121220000 not applied: is_tenant_member() does not enforce tenant status check.")
    sys.exit(1)

# Verify the projection-trigger hardening migration has been applied.
acl_sql = """
SELECT
  (NOT has_function_privilege('anon', 'public.sync_tenant_public_directory()', 'EXECUTE'))
  AND (NOT has_function_privilege('authenticated', 'public.sync_tenant_public_directory()', 'EXECUTE'))
  AND EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = 'public.sync_tenant_public_directory()'::regprocedure
      AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']::text[]
  );
"""
acl_out, acl_err, acl_rc = run_psql(acl_sql)
if acl_rc != 0 or acl_out.strip().lower() != "t":
    print("[FATAL BLOCKED] Projection trigger ACL hardening migration 20261121233000 is missing or incomplete.")
    print(acl_err)
    sys.exit(1)

print(f"[SAFETY & MIGRATION VERIFIED] Running against verified local test database: {live_db}")

# ==============================================================================
# 2. TARGETED NON-DESTRUCTIVE FIXTURE SETUP
# ==============================================================================

TEST_USER_IDS = [
    '11111111-1111-1111-1111-111111111111', # 1. owner_a
    '22222222-2222-2222-2222-222222222222', # 2. director_a
    '33333333-3333-3333-3333-333333333333', # 3. admin_a
    '44444444-4444-4444-4444-444444444444', # 4. staff_a
    '55555555-5555-5555-5555-555555555555', # 5. coach_a
    '66666666-6666-6666-6666-666666666666', # 6. guardian_a
    '77777777-7777-7777-7777-777777777777', # 7. owner_b
    '88888888-8888-8888-8888-888888888888', # 8. coach_b
    '99999999-9999-9999-9999-999999999999', # 9. no_membership (stranger)
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', # 10. revoked_member_a (suspended status)
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', # 11. malicious_user
    'cccccccc-cccc-cccc-cccc-cccccccccccc', # 12. suspended_tenant_member_c
    'dddddddd-dddd-dddd-dddd-dddddddddddd', # 13. owner_c (owner of suspended tenant)
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'  # 14. inactive_member_a (inactive status)
]

TEST_TENANT_IDS = [
    'a0000000-0000-0000-0000-000000000001', # tenant_a (active)
    'b0000000-0000-0000-0000-000000000002', # tenant_b (active)
    'c0000000-0000-0000-0000-000000000003', # tenant_c (suspended)
    'd0000000-0000-0000-0000-000000000004'  # new_onboarding_tenant
]

# Targeted cleanup strictly for the above IDs (ZERO TRUNCATE)
cleanup_sql = f"""
DELETE FROM public.tenant_attendance_events WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_fee_transactions WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_fee_invoices WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_enquiries WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_students WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_batches WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenant_memberships WHERE tenant_id IN ('{"','".join(TEST_TENANT_IDS)}') OR user_id IN ('{"','".join(TEST_USER_IDS)}') OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id IN ('{"','".join(TEST_USER_IDS)}'));
DELETE FROM public.tenants WHERE id IN ('{"','".join(TEST_TENANT_IDS)}') OR owner_id IN ('{"','".join(TEST_USER_IDS)}');
DELETE FROM auth.users WHERE id IN ('{"','".join(TEST_USER_IDS)}');
"""

run_psql(cleanup_sql, on_error_stop=False)

setup_sql = f"""
-- 14 Test Identities
INSERT INTO auth.users (id, email) VALUES
('11111111-1111-1111-1111-111111111111', 'owner_a@khelgrid.com'),
('22222222-2222-2222-2222-222222222222', 'director_a@khelgrid.com'),
('33333333-3333-3333-3333-333333333333', 'admin_a@khelgrid.com'),
('44444444-4444-4444-4444-444444444444', 'staff_a@khelgrid.com'),
('55555555-5555-5555-5555-555555555555', 'coach_a@khelgrid.com'),
('66666666-6666-6666-6666-666666666666', 'guardian_a@khelgrid.com'),
('77777777-7777-7777-7777-777777777777', 'owner_b@khelgrid.com'),
('88888888-8888-8888-8888-888888888888', 'coach_b@khelgrid.com'),
('99999999-9999-9999-9999-999999999999', 'no_membership@khelgrid.com'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'revoked_member_a@khelgrid.com'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'malicious_user@khelgrid.com'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'suspended_member_c@khelgrid.com'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner_c@khelgrid.com'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'inactive_member_a@khelgrid.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Tenants (with sensitive fields contact_phone, contact_email, upi_vpa, metadata)
INSERT INTO public.tenants (id, name, slug, tenant_type, sport, city, state, contact_phone, contact_email, upi_vpa, metadata, owner_id, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'Tenant Alpha Academy', 'tenant-alpha', 'academy', 'badminton', 'Bengaluru', 'Karnataka', '+919876543210', 'owner_a@khelgrid.com', 'alpha@upi', '{{"tax_id": "GSTIN123"}}'::jsonb, '11111111-1111-1111-1111-111111111111', 'active'),
('b0000000-0000-0000-0000-000000000002', 'Tenant Beta Cricket', 'tenant-beta', 'academy', 'cricket', 'Mumbai', 'Maharashtra', '+919876543211', 'owner_b@khelgrid.com', 'beta@upi', '{{"tax_id": "GSTIN456"}}'::jsonb, '77777777-7777-7777-7777-777777777777', 'active'),
('c0000000-0000-0000-0000-000000000003', 'Tenant Suspended Club', 'tenant-suspended', 'academy', 'football', 'Delhi', 'Delhi', '+919876543212', 'suspended@khelgrid.com', 'suspended@upi', '{{"tax_id": "GSTIN789"}}'::jsonb, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'suspended');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'directory_publication_status'
  ) THEN
    UPDATE public.tenants
    SET verification_status = 'verified', directory_publication_status = 'approved'
    WHERE id IN (
      'a0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000002'
    );
  END IF;
END $$;

-- Seed Memberships
INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner', 'active'),
('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'director', 'active'),
('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'admin', 'active'),
('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'staff', 'active'),
('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'coach', 'active'),
('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'coach', 'suspended'),
('a0000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'coach', 'revoked'),
('b0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'owner', 'active'),
('b0000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', 'coach', 'active'),
('c0000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner', 'active'),
('c0000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'coach', 'active');

-- Seed Batches
INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings, monthly_fee, max_capacity, is_active) VALUES
('ba000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Morning Advanced U16', 'badminton', 'Mon, Wed, Fri', '06:00 - 08:00', 3500.00, 20, true),
('ba000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Evening Beginners', 'badminton', 'Tue, Thu', '17:00 - 18:30', 2500.00, 15, true),
('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Cricket Fast Bowling', 'cricket', 'Sat, Sun', '07:00 - 10:00', 4000.00, 25, true),
('bc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Suspended Club Batch', 'football', 'Sat, Sun', '10:00 - 12:00', 1000.00, 10, true);

-- Seed Students
INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone, guardian_user_id, monthly_fee, fee_status, is_active) VALUES
('da000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'Aarav Sharma', 'Rajesh Sharma', '+919876543201', '66666666-6666-6666-6666-666666666666', 3500.00, 'paid', true),
('db000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'Vivaan Patel', 'Kiran Patel', '+919876543202', NULL, 4000.00, 'paid', true),
('dc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'bc000000-0000-0000-0000-000000000001', 'Suspended Student', 'Parent C', '+919876543203', NULL, 1000.00, 'paid', true);

-- Seed Invoices
INSERT INTO public.tenant_fee_invoices (id, tenant_id, student_id, invoice_number, billing_month, amount, status, due_date) VALUES
('fa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'INV-2026-001', '2026-11-01', 3500.00, 'paid', CURRENT_DATE + 5),
('fb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000001', 'INV-2026-002', '2026-11-01', 4000.00, 'paid', CURRENT_DATE + 5);
"""

stdout, stderr, rc = run_psql(setup_sql, on_error_stop=True)
if rc != 0:
    print(f"[SETUP ERROR]: {stderr}")
    sys.exit(1)

# ==============================================================================
# 3. 49-VECTOR NATIVE POSTGRESQL ATTACK MATRIX
# ==============================================================================

test_matrix = [
    # --------------------------------------------------------------------------
    # CATEGORY 1: ANONYMOUS ACCESS REJECTION (8 Multi-Tenant Operational Tables)
    # --------------------------------------------------------------------------
    {
        "id": "ANON-SEL-TENANTS-PRIV",
        "category": "1. Anonymous Privileged",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenants;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on private public.tenants denied"
    },
    {
        "id": "ANON-SEL-TENANT_MEMBERSHIPS",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_memberships;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_memberships denied"
    },
    {
        "id": "ANON-SEL-TENANT_BATCHES",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_batches;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_batches denied"
    },
    {
        "id": "ANON-SEL-TENANT_STUDENTS",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_students;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_students denied"
    },
    {
        "id": "ANON-SEL-TENANT_ENQUIRIES",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_enquiries;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_enquiries denied"
    },
    {
        "id": "ANON-SEL-TENANT_FEE_INVOICES",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_fee_invoices;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_fee_invoices denied"
    },
    {
        "id": "ANON-SEL-TENANT_FEE_TRANSACTIONS",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_fee_transactions;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_fee_transactions denied"
    },
    {
        "id": "ANON-SEL-TENANT_ATTENDANCE_EVENTS",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_attendance_events;",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous SELECT on public.tenant_attendance_events denied"
    },
    {
        "id": "ANON-INS-MEMBERSHIP",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ('a0000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'owner');",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous INSERT on public.tenant_memberships denied"
    },
    {
        "id": "ANON-INS-STUDENTS",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "INSERT INTO public.tenant_students (tenant_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Hacker', 'Parent', '9999999999');",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous INSERT on public.tenant_students denied"
    },
    {
        "id": "ANON-INS-INVOICES",
        "category": "1. Anonymous Operational",
        "role": "anon",
        "jwt_uid": None,
        "sql": "INSERT INTO public.tenant_fee_invoices (tenant_id, student_id, invoice_number, billing_month, amount, due_date) VALUES ('a0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'INV-FAK-001', '2026-11-01', 9999, CURRENT_DATE);",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous INSERT on public.tenant_fee_invoices denied"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 2: PUBLIC DIRECTORY PROJECTION (Safe Allowlisted View)
    # --------------------------------------------------------------------------
    {
        "id": "DIR-ANON-READ-ACTIVE",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_public_directory;",
        "expected_rc": 0,
        "expected_output": "2",
        "desc": "Anonymous SELECT on tenant_public_directory returns exactly 2 active tenants"
    },
    {
        "id": "DIR-AUTH-READ-ACTIVE",
        "category": "2. Public Directory Projection",
        "role": "authenticated",
        "jwt_uid": "99999999-9999-9999-9999-999999999999", # Stranger
        "sql": "SELECT count(*) FROM public.tenant_public_directory;",
        "expected_rc": 0,
        "expected_output": "2",
        "desc": "Unrelated authenticated user returns exactly 2 active tenants from directory"
    },
    {
        "id": "DIR-EXCLUDE-SUSPENDED",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT count(*) FROM public.tenant_public_directory WHERE id = 'c0000000-0000-0000-0000-000000000003';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Suspended Tenant C is strictly excluded from public directory"
    },
    {
        "id": "DIR-EXCLUDE-OWNER-ID",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT owner_id FROM public.tenant_public_directory;",
        "expected_rc": 1,
        "expected_state": "42703", # undefined_column
        "desc": "Selecting owner_id from tenant_public_directory rejected (column excluded)"
    },
    {
        "id": "DIR-EXCLUDE-PHONE",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT contact_phone FROM public.tenant_public_directory;",
        "expected_rc": 1,
        "expected_state": "42703",
        "desc": "Selecting contact_phone from tenant_public_directory rejected (column excluded)"
    },
    {
        "id": "DIR-EXCLUDE-EMAIL",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT contact_email FROM public.tenant_public_directory;",
        "expected_rc": 1,
        "expected_state": "42703",
        "desc": "Selecting contact_email from tenant_public_directory rejected (column excluded)"
    },
    {
        "id": "DIR-EXCLUDE-UPI",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT upi_vpa FROM public.tenant_public_directory;",
        "expected_rc": 1,
        "expected_state": "42703",
        "desc": "Selecting upi_vpa from tenant_public_directory rejected (column excluded)"
    },
    {
        "id": "DIR-EXCLUDE-METADATA",
        "category": "2. Public Directory Projection",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT metadata FROM public.tenant_public_directory;",
        "expected_rc": 1,
        "expected_state": "42703",
        "desc": "Selecting metadata from tenant_public_directory rejected (column excluded)"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 3: PRIVATE TENANT RECORD ISOLATION (public.tenants Table)
    # --------------------------------------------------------------------------
    {
        "id": "TENANT-STRANGER-DENIED",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "99999999-9999-9999-9999-999999999999", # Stranger
        "sql": "SELECT count(*) FROM public.tenants;",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Unrelated authenticated user querying public.tenants gets 0 rows"
    },
    {
        "id": "TENANT-CROSS-OWNER-DENIED",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "SELECT count(*) FROM public.tenants WHERE id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Tenant B owner cannot view Tenant A private tenant row (gets 0 rows)"
    },
    {
        "id": "TENANT-OWNER-ACCESS-OK",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "11111111-1111-1111-1111-111111111111", # Owner A
        "sql": "SELECT slug, contact_phone, upi_vpa FROM public.tenants WHERE id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "tenant-alpha|+919876543210|alpha@upi",
        "desc": "Tenant A owner successfully accesses own private tenant details and UPI"
    },
    {
        "id": "TENANT-MEMBER-ACCESS-OK",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "55555555-5555-5555-5555-555555555555", # Coach A
        "sql": "SELECT slug FROM public.tenants WHERE id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "tenant-alpha",
        "desc": "Tenant A active coach accesses own tenant record via is_tenant_member"
    },
    {
        "id": "TENANT-SUSPENDED-OWNER-ACCESS-OK",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "dddddddd-dddd-dddd-dddd-dddddddddddd", # Owner of suspended Tenant C
        "sql": "SELECT slug, status FROM public.tenants WHERE id = 'c0000000-0000-0000-0000-000000000003';",
        "expected_rc": 0,
        "expected_output": "tenant-suspended|suspended",
        "desc": "Owner of suspended tenant accesses own tenant row via owner_id"
    },
    {
        "id": "TENANT-SUSPENDED-STRANGER-DENIED",
        "category": "3. Private Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "99999999-9999-9999-9999-999999999999", # Stranger
        "sql": "SELECT count(*) FROM public.tenants WHERE id = 'c0000000-0000-0000-0000-000000000003';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Stranger querying suspended tenant row gets 0 rows"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 4: CROSS-TENANT DATA ISOLATION (Students, Invoices, Writes)
    # --------------------------------------------------------------------------
    {
        "id": "ISOL-READ-STUDENTS",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Owner B querying Tenant A students returns 0 rows"
    },
    {
        "id": "ISOL-READ-DIRECT-ID",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "SELECT count(*) FROM public.tenant_students WHERE id = 'da000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Owner B direct query by student UUID returns 0 rows"
    },
    {
        "id": "ISOL-READ-INVOICES",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "SELECT count(*) FROM public.tenant_fee_invoices WHERE id = 'fa000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Owner B direct query by invoice UUID returns 0 rows"
    },
    {
        "id": "ISOL-WRITE-STUDENT",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "INSERT INTO public.tenant_students (tenant_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Cross Student', 'Parent', '9999999999');",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Owner B inserting student into Tenant A blocked by RLS"
    },
    {
        "id": "ISOL-WRITE-UPDATE-CROSS",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "UPDATE public.tenant_students SET student_name = 'Hacked' WHERE id = 'da000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "UPDATE 0",
        "desc": "Owner B updating Tenant A student affects 0 rows"
    },
    {
        "id": "ISOL-WRITE-DELETE-CROSS",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "77777777-7777-7777-7777-777777777777", # Owner B
        "sql": "DELETE FROM public.tenant_students WHERE id = 'da000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "DELETE 0",
        "desc": "Owner B deleting Tenant A student affects 0 rows"
    },
    {
        "id": "STAFF-READ-STUDENTS-OK",
        "category": "4. Cross-Tenant Isolation",
        "role": "authenticated",
        "jwt_uid": "44444444-4444-4444-4444-444444444444", # Staff A
        "sql": "SELECT student_name FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "Aarav Sharma",
        "desc": "Tenant A staff member reads student record via is_tenant_member"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 5: PRIVILEGE ESCALATION & ROLE BOUNDARIES
    # --------------------------------------------------------------------------
    {
        "id": "ROLE-COACH-SELF-PROMOTE",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "55555555-5555-5555-5555-555555555555", # Coach A
        "sql": "UPDATE public.tenant_memberships SET role = 'admin' WHERE user_id = '55555555-5555-5555-5555-555555555555' AND tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "UPDATE 0",
        "desc": "Coach self-promoting to admin affects 0 rows"
    },
    {
        "id": "ROLE-ADMIN-PROMOTE-OWNER",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "33333333-3333-3333-3333-333333333333", # Admin A
        "sql": "UPDATE public.tenant_memberships SET role = 'owner' WHERE user_id = '33333333-3333-3333-3333-333333333333' AND tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Admin promoting self to owner blocked by RLS WITH CHECK policy"
    },
    {
        "id": "ROLE-DIRECTOR-PROMOTE-OWNER",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "22222222-2222-2222-2222-222222222222", # Director A
        "sql": "UPDATE public.tenant_memberships SET role = 'owner' WHERE user_id = '22222222-2222-2222-2222-222222222222' AND tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Director promoting self to owner blocked by RLS WITH CHECK policy"
    },
    {
        "id": "ROLE-UNAUTH-STEAL-TENANT",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", # Malicious
        "sql": "UPDATE public.tenants SET owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "UPDATE 0",
        "desc": "Malicious user hijacking tenant ownership affects 0 rows"
    },
    {
        "id": "ROLE-REVOKED-MEMBER-READ",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", # Suspended member
        "sql": "SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Suspended member receives 0 rows immediately"
    },
    {
        "id": "ROLE-REVOKED-STATUS-MEMBER-READ",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", # Revoked member
        "sql": "SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Revoked status member receives 0 rows immediately"
    },
    {
        "id": "ROLE-SUSPENDED-TENANT-BATCHES",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "cccccccc-cccc-cccc-cccc-cccccccccccc", # Member of suspended Tenant C
        "sql": "SELECT count(*) FROM public.tenant_batches WHERE tenant_id = 'c0000000-0000-0000-0000-000000000003';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Member of suspended tenant cannot access batches (0 rows)"
    },
    {
        "id": "ROLE-SUSPENDED-TENANT-STUDENTS",
        "category": "5. Privilege Escalation",
        "role": "authenticated",
        "jwt_uid": "cccccccc-cccc-cccc-cccc-cccccccccccc", # Member of suspended Tenant C
        "sql": "SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'c0000000-0000-0000-0000-000000000003';",
        "expected_rc": 0,
        "expected_output": "0",
        "desc": "Member of suspended tenant cannot access students (0 rows)"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 6: INITIAL OWNER ONBOARDING BOOTSTRAPPING
    # --------------------------------------------------------------------------
    {
        "id": "PROV-AUTH-USER-OK",
        "category": "6. Onboarding Bootstrapping",
        "role": "authenticated",
        "jwt_uid": "99999999-9999-9999-9999-999999999999", # Stranger
        "sql": "SELECT (public.provision_initial_tenant_owner('new-academy-99', 'New Academy 99', 'academy', 'Bengaluru', 'Karnataka', 'badminton', '+919876543299', 'new@khelgrid.com', '{}'::jsonb) IS NOT NULL)::text;",
        "expected_rc": 0,
        "expected_output": "true",
        "desc": "Authenticated caller creates new tenant & initial owner membership atomically"
    },
    {
        "id": "PROV-DUPLICATE-SLUG-FAIL",
        "category": "6. Onboarding Bootstrapping",
        "role": "authenticated",
        "jwt_uid": "99999999-9999-9999-9999-999999999999",
        "sql": "SELECT public.provision_initial_tenant_owner('tenant-alpha', 'Tenant Alpha Dup', 'academy', 'Bengaluru', 'Karnataka', 'badminton', '+919876543200', 'dup@khelgrid.com', '{}'::jsonb);",
        "expected_rc": 1,
        "expected_state": "23505", # unique_violation
        "desc": "Duplicate tenant slug provision rejected by unique constraint"
    },
    {
        "id": "PROV-ANON-BLOCKED",
        "category": "6. Onboarding Bootstrapping",
        "role": "anon",
        "jwt_uid": None,
        "sql": "SELECT public.provision_initial_tenant_owner('anon-academy', 'Anon Academy', 'academy', 'City', 'State', 'badminton', '123', 'a@k.com', '{}'::jsonb);",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous caller cannot execute provision_initial_tenant_owner (permission denied)"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 7: COMPOSITE FOREIGN KEY & DELETION SEMANTICS
    # --------------------------------------------------------------------------
    {
        "id": "FK-BATCH-DELETE-RESTRICT",
        "category": "7. FK Deletion Semantics",
        "role": "authenticated",
        "jwt_uid": "11111111-1111-1111-1111-111111111111", # Owner A
        "sql": "DELETE FROM public.tenant_batches WHERE id = 'ba000000-0000-0000-0000-000000000001';",
        "expected_rc": 1,
        "expected_state": "23503", # foreign_key_violation
        "desc": "Deleting batch with enrolled students blocked by ON DELETE RESTRICT"
    },
    {
        "id": "FK-EMPTY-BATCH-DELETE-OK",
        "category": "7. FK Deletion Semantics",
        "role": "authenticated",
        "jwt_uid": "11111111-1111-1111-1111-111111111111", # Owner A
        "sql": "DELETE FROM public.tenant_batches WHERE id = 'ba000000-0000-0000-0000-000000000002';",
        "expected_rc": 0,
        "expected_output": "DELETE 1",
        "desc": "Deleting empty batch succeeds cleanly"
    },
    {
        "id": "FK-CROSS-TENANT-ASSIGN-REJECT",
        "category": "7. FK Deletion Semantics",
        "role": "authenticated",
        "jwt_uid": "11111111-1111-1111-1111-111111111111", # Owner A
        "sql": "INSERT INTO public.tenant_students (tenant_id, batch_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Illegal Cross', 'Parent', '9999999999');",
        "expected_rc": 1,
        "expected_state": "23503",
        "desc": "Assigning Tenant A student to Tenant B batch rejected by composite FK"
    },
    {
        "id": "FK-BATCH-ARCHIVAL-OK",
        "category": "7. FK Deletion Semantics",
        "role": "authenticated",
        "jwt_uid": "11111111-1111-1111-1111-111111111111", # Owner A
        "sql": "UPDATE public.tenant_batches SET is_active = false WHERE id = 'ba000000-0000-0000-0000-000000000001'; SELECT count(*) FROM public.tenant_students WHERE batch_id = 'ba000000-0000-0000-0000-000000000001';",
        "expected_rc": 0,
        "expected_output": "1",
        "desc": "Batch archival (is_active = false) retains all enrolled student records"
    },

    # --------------------------------------------------------------------------
    # CATEGORY 8: ENQUIRY INTAKE SECURITY
    # --------------------------------------------------------------------------
    {
        "id": "ANON-ENQ-ACTIVE-OK",
        "category": "8. Enquiry Intake Security",
        "role": "anon",
        "jwt_uid": None,
        "sql": "INSERT INTO public.tenant_enquiries (tenant_id, enquiry_token, student_name, parent_name, parent_phone, sport, request_type) VALUES ('a0000000-0000-0000-0000-000000000001', 'ENQ-TST-001', 'Prospective Kid', 'Prospective Parent', '+919876543290', 'badminton', 'free_trial');",
        "expected_rc": 0,
        "expected_output": "INSERT 0 1",
        "desc": "Anonymous enquiry to active tenant allowed via is_active_tenant()"
    },
    {
        "id": "ANON-ENQ-INACTIVE-FAIL",
        "category": "8. Enquiry Intake Security",
        "role": "anon",
        "jwt_uid": None,
        "sql": "INSERT INTO public.tenant_enquiries (tenant_id, enquiry_token, student_name, parent_name, parent_phone, sport, request_type) VALUES ('c0000000-0000-0000-0000-000000000003', 'ENQ-TST-002', 'Suspended Kid', 'Parent', '+919876543291', 'football', 'free_trial');",
        "expected_rc": 1,
        "expected_state": "42501",
        "desc": "Anonymous enquiry to suspended tenant blocked by is_active_tenant()"
    }
]

# ==============================================================================
# 4. EXECUTION ENGINE
# ==============================================================================

passed_count = 0
failed_count = 0
results = []

print(f"\nExecuting {len(test_matrix)} native PostgreSQL RLS attack vectors...")

for idx, t in enumerate(test_matrix, 1):
    role = t['role']
    uid = t.get('jwt_uid')
    raw_sql = t['sql']
    
    session_prefix = f"SET ROLE {role};\n"
    if uid:
        session_prefix += f"SELECT set_config('request.jwt.claim.sub', '{uid}', false);\n"
        session_prefix += f"SELECT set_config('request.jwt.claims', '{json.dumps({'sub': uid})}', false);\n"
    else:
        session_prefix += "SELECT set_config('request.jwt.claim.sub', '', false);\n"
        session_prefix += "SELECT set_config('request.jwt.claims', '', false);\n"
        
    full_sql = f"{session_prefix}{raw_sql}\nRESET ROLE;\n"
    
    stdout, stderr, rc = run_psql(full_sql, on_error_stop=True)
    
    expected_rc = t.get('expected_rc', 0)
    expected_state = t.get('expected_state')
    expected_output = t.get('expected_output')
    
    # Parse SQLSTATE from stderr if present
    # Postgres verbose outputs: "ERROR:  42501: permission denied for table ..."
    actual_state = None
    state_match = re.search(r'ERROR:\s+([0-9A-Z]{5}):', stderr)
    if state_match:
        actual_state = state_match.group(1)
        
    test_passed = False
    
    if expected_rc == 1:
        if rc != 0:
            if expected_state:
                if actual_state == expected_state or expected_state in stderr:
                    test_passed = True
                else:
                    test_passed = False
            else:
                test_passed = True
    else:
        if rc == 0:
            if expected_output is not None:
                # Filter out session noise (SET, RESET, config echoes)
                filtered_lines = [
                    l.strip() for l in stdout.splitlines() 
                    if l.strip() and l.strip() not in ('SET', 'RESET') 
                    and l.strip() != (uid or "")
                    and not (l.strip().startswith('{"sub"') or l.strip().startswith('set_config'))
                ]
                last_line = filtered_lines[-1] if filtered_lines else ""
                if last_line == expected_output or expected_output in stdout.splitlines() or expected_output in stdout:
                    test_passed = True
                else:
                    test_passed = False
            else:
                test_passed = True
                
    status_str = "PASS" if test_passed else "FAIL"
    if test_passed:
        passed_count += 1
        print(f"[{status_str}] {t['id']}: {t['desc']}")
    else:
        failed_count += 1
        print(f"[{status_str}] {t['id']}: {t['desc']}")
        print(f"       Expected RC: {expected_rc}, State: {expected_state}, Output: {expected_output}")
        print(f"       Actual   RC: {rc}, State: {actual_state}, Stdout: '{stdout}', Stderr: '{stderr}'")
        
    results.append({
        "id": t['id'],
        "category": t['category'],
        "role": role,
        "jwt_uid": uid,
        "sql": raw_sql,
        "expected_rc": expected_rc,
        "expected_state": expected_state,
        "expected_output": expected_output,
        "actual_rc": rc,
        "actual_state": actual_state,
        "stdout": stdout,
        "stderr": stderr,
        "status": status_str
    })

# Supplemental native PostgreSQL projection-trigger ACL and lifecycle gate.
# This is separate from the fixed 49-vector tenant RLS matrix.
projection_trigger_sql = """
BEGIN;
DO $$
DECLARE
  v_test_id uuid := gen_random_uuid();
  v_slug text;
  v_name text;
BEGIN
  IF has_function_privilege('anon', 'public.sync_tenant_public_directory()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.sync_tenant_public_directory()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Client role can directly execute projection trigger function';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = 'public.sync_tenant_public_directory()'::regprocedure
      AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']::text[]
  ) THEN
    RAISE EXCEPTION 'Projection trigger function search_path is not hardened';
  END IF;

  IF has_table_privilege('anon', 'public.tenant_public_directory', 'INSERT')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'UPDATE')
     OR has_table_privilege('anon', 'public.tenant_public_directory', 'DELETE')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'INSERT')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.tenant_public_directory', 'DELETE') THEN
    RAISE EXCEPTION 'Client role has direct write access to projection table';
  END IF;

  v_slug := 'phase1-trigger-' || replace(v_test_id::text, '-', '');
  INSERT INTO public.tenants (id, slug, name, tenant_type, status)
  VALUES (v_test_id, v_slug, 'Phase 1 Trigger Test', 'academy', 'pending_verification');

  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Pending tenant leaked into public projection';
  END IF;

  UPDATE public.tenants SET status = 'active' WHERE id = v_test_id;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Active tenant missing from public projection';
  END IF;

  UPDATE public.tenants SET name = 'Phase 1 Trigger Updated' WHERE id = v_test_id;
  SELECT name INTO v_name FROM public.tenant_public_directory WHERE id = v_test_id;
  IF v_name IS DISTINCT FROM 'Phase 1 Trigger Updated' THEN
    RAISE EXCEPTION 'Tenant update was not synchronized';
  END IF;

  UPDATE public.tenants SET status = 'suspended' WHERE id = v_test_id;
  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Suspended tenant remained publicly discoverable';
  END IF;

  UPDATE public.tenants SET status = 'active' WHERE id = v_test_id;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Reactivated tenant was not restored to projection';
  END IF;

  DELETE FROM public.tenants WHERE id = v_test_id;
  IF EXISTS (SELECT 1 FROM public.tenant_public_directory WHERE id = v_test_id) THEN
    RAISE EXCEPTION 'Deleted tenant remained in projection';
  END IF;
END;
$$;
ROLLBACK;
"""
projection_out, projection_err, projection_rc = run_psql(projection_trigger_sql, on_error_stop=True)
projection_gate_passed = projection_rc == 0
if projection_gate_passed:
    print("[PASS] PROJECTION-TRIGGER-ACL-LIFECYCLE: trigger-only execution and active/suspended/reactivated/deleted synchronization")
else:
    print("[FAIL] PROJECTION-TRIGGER-ACL-LIFECYCLE")
    print(projection_err)

# Targeted teardown cleanup
run_psql(cleanup_sql, on_error_stop=False)

print("\n" + "=" * 70)
print(f"COMPREHENSIVE RLS SUITE: {passed_count}/{len(test_matrix)} PASSED, {failed_count} FAILED")
print(f"Detailed evidence written to: scripts/comprehensive_postgres_rls_matrix.json")
print("=" * 70)

output_payload = {
    "suite": "KhelGrid SaaS Platform — Phase 1 Real Native PostgreSQL RLS Integration Suite",
    "engine": "PostgreSQL 16.4 (sports-platform-postgres Docker)",
    "database": live_db,
    "total_vectors": len(test_matrix),
    "passed": passed_count,
    "failed": failed_count,
    "success_rate": f"{(passed_count / len(test_matrix)) * 100:.1f}%",
    "supplemental_checks": {
        "projection_trigger_acl_and_lifecycle": projection_gate_passed
    },
    "results": results
}

with open("scripts/comprehensive_postgres_rls_matrix.json", "w", encoding="utf-8") as f:
    json.dump(output_payload, f, indent=2)

if failed_count > 0:
    sys.exit(1)
sys.exit(0)
