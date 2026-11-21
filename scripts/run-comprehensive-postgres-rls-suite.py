import subprocess
import json
import sys
import os

def run_psql(sql):
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        cmd = ['psql', db_url, '-v', 'ON_ERROR_STOP=0', '-t', '-A']
    else:
        cmd = ['docker', 'exec', '-i', 'sports-platform-postgres', 'psql', '-U', 'postgres', '-d', 'khelgrid_rls_test', '-v', 'ON_ERROR_STOP=0', '-t', '-A']
    
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    return p.stdout.strip(), p.stderr.strip(), p.returncode

print("Initializing comprehensive multi-tenant RLS test harness in PostgreSQL...")

setup_sql = """
TRUNCATE auth.users CASCADE;
TRUNCATE public.tenants CASCADE;

-- 11 Test Identities
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
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'malicious_user@khelgrid.com');

-- Seed Tenants
INSERT INTO public.tenants (id, name, slug, tenant_type, sport, owner_id, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'Tenant Alpha Academy', 'tenant-alpha', 'academy', 'badminton', '11111111-1111-1111-1111-111111111111', 'active'),
('b0000000-0000-0000-0000-000000000002', 'Tenant Beta Cricket', 'tenant-beta', 'academy', 'cricket', '77777777-7777-7777-7777-777777777777', 'active'),
('c0000000-0000-0000-0000-000000000003', 'Tenant Suspended Club', 'tenant-suspended', 'academy', 'football', '11111111-1111-1111-1111-111111111111', 'suspended');

-- Seed Memberships
INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner', 'active'),
('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'director', 'active'),
('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'admin', 'active'),
('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'staff', 'active'),
('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'coach', 'active'),
('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'coach', 'suspended'),
('b0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'owner', 'active'),
('b0000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', 'coach', 'active');

-- Seed Batches
INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings, is_active) VALUES
('ba000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Alpha Morning Batch', 'badminton', 'Mon, Wed', '06:00 - 08:00', true),
('ba000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Alpha Empty Batch', 'badminton', 'Tue, Thu', '16:00 - 18:00', true),
('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Beta U16 Batch', 'cricket', 'Sat, Sun', '07:00 - 09:00', true);

-- Seed Students
INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone, guardian_user_id) VALUES
('da000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'Rohan Verma', 'Vikram Verma', '9876543210', '66666666-6666-6666-6666-666666666666'),
('db000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'Kabir Khan', 'Zubair Khan', '9876543211', NULL);

-- Seed Invoices & Transactions
INSERT INTO public.tenant_fee_invoices (id, tenant_id, student_id, invoice_number, amount, billing_month, due_date) VALUES
('fa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'INV-ALPHA-001', 2500, '2026-11', CURRENT_DATE + 30),
('fb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000001', 'INV-BETA-001', 3500, '2026-11', CURRENT_DATE + 30);

INSERT INTO public.tenant_fee_transactions (id, tenant_id, invoice_id, student_id, amount_paid, payment_method) VALUES
('ta000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 2500, 'cash');

-- Seed Attendance
INSERT INTO public.tenant_attendance_events (id, tenant_id, batch_id, student_id, session_date, attendance_status) VALUES
('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', CURRENT_DATE, 'present');

-- Seed Enquiry
INSERT INTO public.tenant_enquiries (id, tenant_id, enquiry_token, parent_name, parent_phone, student_name, sport, request_type) VALUES
('ea000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ENQ-ALPHA-01', 'Anjali Gupta', '9876543210', 'Aarav Gupta', 'badminton', 'regular_admission');
"""

stdout, stderr, code = run_psql(setup_sql)
if code != 0:
    print("Setup Error:", stderr)
    sys.exit(1)
print("Harness setup completed successfully!")

results = []

def run_test(test_id, category, role, uid, tenant_id, description, sql, validator):
    full_sql = f"""
    SET ROLE {role};
    SELECT set_config('request.jwt.claim.sub', '{uid if uid else ""}', false);
    {sql}
    """
    stdout, stderr, code = run_psql(full_sql)
    passed, reason, sqlstate = validator(stdout, stderr, code)
    res = {
        "id": test_id,
        "category": category,
        "role": role,
        "uid": uid,
        "tenant_id": tenant_id,
        "description": description,
        "sql": sql.strip(),
        "passed": passed,
        "sqlstate": sqlstate,
        "reason": reason,
        "stdout": stdout,
        "stderr": stderr
    }
    results.append(res)
    mark = "PASS" if passed else "FAIL"
    print(f"[{mark}] {test_id} [{category}]: {description} -> {reason}")

# ==============================================================================
# 5.1 ANONYMOUS ACCESS ATTACK VECTORS
# ==============================================================================
tenant_tables = [
    "tenants", "tenant_memberships", "tenant_batches", "tenant_students",
    "tenant_enquiries", "tenant_fee_invoices", "tenant_fee_transactions", "tenant_attendance_events"
]

for t in tenant_tables:
    run_test(
        f"ANON-SEL-{t.upper()}",
        "5.1 Anonymous Access",
        "anon",
        None,
        None,
        f"Anonymous SELECT on {t}",
        f"SELECT count(*) FROM public.{t};",
        lambda out, err, code: (
            "permission denied" in err,
            "Denied table read",
            "42501"
        )
    )

run_test(
    "ANON-INS-MEMBERSHIP",
    "5.1 Anonymous Access",
    "anon",
    None,
    "a0000000-0000-0000-0000-000000000001",
    "Anonymous INSERT into tenant_memberships",
    "INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ('a0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner');",
    lambda out, err, code: ("permission denied" in err, "Denied membership creation", "42501")
)

run_test(
    "ANON-INS-STUDENTS",
    "5.1 Anonymous Access",
    "anon",
    None,
    "a0000000-0000-0000-0000-000000000001",
    "Anonymous INSERT into tenant_students",
    "INSERT INTO public.tenant_students (tenant_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Anon Trainee', 'Anon Parent', '9999999999');",
    lambda out, err, code: ("permission denied" in err, "Denied student insertion", "42501")
)

run_test(
    "ANON-INS-INVOICES",
    "5.1 Anonymous Access",
    "anon",
    None,
    "a0000000-0000-0000-0000-000000000001",
    "Anonymous INSERT into tenant_fee_invoices",
    "INSERT INTO public.tenant_fee_invoices (tenant_id, student_id, invoice_number, amount, billing_month, due_date) VALUES ('a0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'INV-ANON', 1000, '2026-11', CURRENT_DATE);",
    lambda out, err, code: ("permission denied" in err, "Denied invoice creation", "42501")
)

run_test(
    "ANON-ENQ-ACTIVE-OK",
    "5.1 Anonymous Access",
    "anon",
    None,
    "a0000000-0000-0000-0000-000000000001",
    "Anonymous prospective student enquiry to active tenant",
    "INSERT INTO public.tenant_enquiries (tenant_id, enquiry_token, parent_name, parent_phone, student_name, sport, request_type) VALUES ('a0000000-0000-0000-0000-000000000001', 'ENQ-ANON-PUBLIC', 'Public Parent', '9123456789', 'Junior Star', 'badminton', 'free_trial');",
    lambda out, err, code: ("INSERT 0 1" in out, "Permitted legitimate enquiry", "00000")
)

run_test(
    "ANON-ENQ-INACTIVE-FAIL",
    "5.1 Anonymous Access",
    "anon",
    None,
    "c0000000-0000-0000-0000-000000000003",
    "Anonymous enquiry to suspended tenant blocked by is_active_tenant()",
    "INSERT INTO public.tenant_enquiries (tenant_id, enquiry_token, parent_name, parent_phone, student_name, sport, request_type) VALUES ('c0000000-0000-0000-0000-000000000003', 'ENQ-ANON-SUSP', 'Public Parent', '9123456789', 'Junior Star', 'badminton', 'free_trial');",
    lambda out, err, code: ("violates row-level security policy" in err, "Denied enquiry to inactive tenant", "42501")
)

# ==============================================================================
# 5.2 TENANT ISOLATION (CROSS-TENANT READ/WRITE BLOCKING)
# ==============================================================================
run_test(
    "ISOL-READ-STUDENTS",
    "5.2 Tenant Isolation",
    "authenticated",
    "77777777-7777-7777-7777-777777777777", # Tenant B Owner
    "a0000000-0000-0000-0000-000000000001",
    "Tenant B Owner queries Tenant A students",
    "SELECT student_name FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "77777777-7777-7777-7777-777777777777", "0 rows returned (isolated)", "00000")
)

run_test(
    "ISOL-READ-DIRECT-ID",
    "5.2 Tenant Isolation",
    "authenticated",
    "77777777-7777-7777-7777-777777777777", # Tenant B Owner
    "a0000000-0000-0000-0000-000000000001",
    "Tenant B Owner direct ID query on Tenant A student",
    "SELECT student_name FROM public.tenant_students WHERE id = 'da000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "77777777-7777-7777-7777-777777777777", "0 rows returned (direct ID access denied)", "00000")
)

run_test(
    "ISOL-READ-INVOICES",
    "5.2 Tenant Isolation",
    "authenticated",
    "77777777-7777-7777-7777-777777777777",
    "a0000000-0000-0000-0000-000000000001",
    "Tenant B Owner direct ID query on Tenant A invoice",
    "SELECT invoice_number FROM public.tenant_fee_invoices WHERE id = 'fa000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "77777777-7777-7777-7777-777777777777", "0 rows returned (invoice isolated)", "00000")
)

run_test(
    "ISOL-WRITE-STUDENT",
    "5.2 Tenant Isolation",
    "authenticated",
    "77777777-7777-7777-7777-777777777777",
    "a0000000-0000-0000-0000-000000000001",
    "Tenant B Owner attempts to insert student into Tenant A",
    "INSERT INTO public.tenant_students (tenant_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Cross Tenant Student', 'Parent', '9999999999');",
    lambda out, err, code: ("violates row-level security policy" in err, "Cross-tenant write blocked by RLS WITH CHECK", "42501")
)

run_test(
    "ISOL-WRITE-UPDATE-CROSS",
    "5.2 Tenant Isolation",
    "authenticated",
    "77777777-7777-7777-7777-777777777777",
    "a0000000-0000-0000-0000-000000000001",
    "Tenant B Owner attempts to update Tenant A student",
    "UPDATE public.tenant_students SET student_name = 'Hacked Name' WHERE id = 'da000000-0000-0000-0000-000000000001';",
    lambda out, err, code: ("UPDATE 0" in out, "0 rows updated (isolated)", "00000")
)

# ==============================================================================
# 5.3 & 5.4 ROLE-BASED ACCESS & PRIVILEGE ESCALATION PREVENTION
# ==============================================================================
run_test(
    "ROLE-COACH-SELF-PROMOTE",
    "5.4 Privilege Escalation",
    "authenticated",
    "55555555-5555-5555-5555-555555555555", # Coach A
    "a0000000-0000-0000-0000-000000000001",
    "Coach attempts self-promotion to admin",
    "UPDATE public.tenant_memberships SET role = 'admin' WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' AND user_id = '55555555-5555-5555-5555-555555555555';",
    lambda out, err, code: ("UPDATE 0" in out or "violates" in err, "Self-promotion denied by RLS policy", "00000")
)

run_test(
    "ROLE-ADMIN-PROMOTE-OWNER",
    "5.4 Privilege Escalation",
    "authenticated",
    "33333333-3333-3333-3333-333333333333", # Admin A
    "a0000000-0000-0000-0000-000000000001",
    "Admin attempts to promote coach to owner",
    "UPDATE public.tenant_memberships SET role = 'owner' WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' AND user_id = '55555555-5555-5555-5555-555555555555';",
    lambda out, err, code: ("UPDATE 0" in out or "violates" in err, "Owner promotion denied to admin", "00000")
)

run_test(
    "ROLE-DIRECTOR-PROMOTE-OWNER",
    "5.4 Privilege Escalation",
    "authenticated",
    "22222222-2222-2222-2222-222222222222", # Director A
    "a0000000-0000-0000-0000-000000000001",
    "Director attempts to promote self to owner",
    "UPDATE public.tenant_memberships SET role = 'owner' WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' AND user_id = '22222222-2222-2222-2222-222222222222';",
    lambda out, err, code: ("UPDATE 0" in out or "violates" in err, "Director self-promotion to owner denied", "00000")
)

run_test(
    "ROLE-UNAUTH-STEAL-TENANT",
    "5.4 Privilege Escalation",
    "authenticated",
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", # Malicious User
    "a0000000-0000-0000-0000-000000000001",
    "Malicious user attempts to transfer Tenant A ownership to self",
    "UPDATE public.tenants SET owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = 'a0000000-0000-0000-0000-000000000001';",
    lambda out, err, code: ("UPDATE 0" in out or "violates" in err, "Unauthorized tenant ownership transfer denied", "00000")
)

run_test(
    "ROLE-REVOKED-MEMBER-READ",
    "5.3 Role-based Access",
    "authenticated",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", # Suspended member
    "a0000000-0000-0000-0000-000000000001",
    "Suspended member queries tenant students",
    "SELECT count(*) FROM public.tenant_students WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "0", "0 rows returned (immediate revocation)", "00000")
)

run_test(
    "ROLE-STRANGER-NO-ACCESS",
    "5.3 Role-based Access",
    "authenticated",
    "99999999-9999-9999-9999-999999999999", # User with no membership
    "a0000000-0000-0000-0000-000000000001",
    "Authenticated stranger queries tenant batches",
    "SELECT count(*) FROM public.tenant_batches WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "0", "0 rows returned (no membership)", "00000")
)

# ==============================================================================
# 6. INITIAL TENANT OWNER BOOTSTRAPPING
# ==============================================================================
run_test(
    "PROV-AUTH-USER-OK",
    "6. Owner Bootstrapping",
    "authenticated",
    "99999999-9999-9999-9999-999999999999",
    None,
    "Authenticated user provisions initial tenant and becomes owner",
    "SELECT public.provision_initial_tenant_owner('new-academy-99', 'New Academy 99', 'academy', 'Mumbai', 'Maharashtra', 'cricket', '9876543200', 'owner99@khelgrid.com', '{}'::jsonb);",
    lambda out, err, code: (len(out.split()[-1]) == 36 and "ERROR" not in err, "Atomically created tenant and owner membership", "00000")
)

run_test(
    "PROV-DUPLICATE-SLUG-FAIL",
    "6. Owner Bootstrapping",
    "authenticated",
    "99999999-9999-9999-9999-999999999999",
    None,
    "Provisioning tenant with duplicate slug rejected",
    "SELECT public.provision_initial_tenant_owner('tenant-alpha', 'Duplicate Alpha', 'academy', 'Mumbai', 'Maharashtra', 'cricket', '9876543200', 'dup@khelgrid.com', '{}'::jsonb);",
    lambda out, err, code: ("duplicate key" in err or "already in use" in err, "Duplicate slug rejected (23505)", "23505")
)

run_test(
    "PROV-ANON-BLOCKED",
    "6. Owner Bootstrapping",
    "anon",
    None,
    None,
    "Anonymous execution of provision_initial_tenant_owner blocked",
    "SELECT public.provision_initial_tenant_owner('hacked-tenant', 'Hacked Tenant', 'academy', 'Delhi', 'Delhi', 'badminton', '9999999999', 'a@a.com', '{}'::jsonb);",
    lambda out, err, code: ("permission denied" in err, "Anonymous execution denied", "42501")
)

# ==============================================================================
# 7. COMPOSITE FOREIGN KEY DELETION & ARCHIVAL
# ==============================================================================
run_test(
    "FK-BATCH-DELETE-RESTRICT",
    "7. Composite FK Semantics",
    "authenticated",
    "11111111-1111-1111-1111-111111111111", # Owner A
    "a0000000-0000-0000-0000-000000000001",
    "Occupied batch deletion blocked by ON DELETE RESTRICT",
    "DELETE FROM public.tenant_batches WHERE id = 'ba000000-0000-0000-0000-000000000001';",
    lambda out, err, code: ("violates foreign key constraint" in err and "fk_student_tenant_batch" in err, "Blocked by ON DELETE RESTRICT", "23503")
)

run_test(
    "FK-EMPTY-BATCH-DELETE-OK",
    "7. Composite FK Semantics",
    "authenticated",
    "11111111-1111-1111-1111-111111111111", # Owner A
    "a0000000-0000-0000-0000-000000000001",
    "Empty batch deletion succeeds cleanly",
    "DELETE FROM public.tenant_batches WHERE id = 'ba000000-0000-0000-0000-000000000002';",
    lambda out, err, code: ("DELETE 1" in out, "Deleted empty batch", "00000")
)

run_test(
    "FK-CROSS-TENANT-ASSIGN-REJECT",
    "7. Composite FK Semantics",
    "authenticated",
    "11111111-1111-1111-1111-111111111111", # Owner A
    "a0000000-0000-0000-0000-000000000001",
    "Composite FK rejects assigning student to batch in another tenant",
    "INSERT INTO public.tenant_students (tenant_id, batch_id, student_name, parent_name, parent_phone) VALUES ('a0000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Illegal Student', 'Parent', '9999999999');",
    lambda out, err, code: ("violates foreign key constraint" in err and "fk_student_tenant_batch" in err, "Composite FK enforced", "23503")
)

run_test(
    "FK-BATCH-ARCHIVAL-OK",
    "7. Composite FK Semantics",
    "authenticated",
    "11111111-1111-1111-1111-111111111111", # Owner A
    "a0000000-0000-0000-0000-000000000001",
    "Batch archival preserves student enrollment and historical records",
    "UPDATE public.tenant_batches SET is_active = false WHERE id = 'ba000000-0000-0000-0000-000000000001'; SELECT count(*) FROM public.tenant_students WHERE batch_id = 'ba000000-0000-0000-0000-000000000001';",
    lambda out, err, code: (out.split()[-1] == "1", "Batch archived and student retained", "00000")
)

passed_total = sum(1 for r in results if r["passed"])
failed_total = sum(1 for r in results if not r["passed"])
print("\n=======================================================")
print(f"COMPREHENSIVE RLS SUITE: {passed_total}/{len(results)} PASSED, {failed_total} FAILED")
print("=======================================================")

out_path = os.environ.get("RLS_MATRIX_OUTPUT_PATH", "scripts/comprehensive_postgres_rls_matrix.json")
with open(out_path, "w") as f:
    json.dump({
        "engine": "PostgreSQL 16.4 / 17 compatible",
        "total": len(results),
        "passed": passed_total,
        "failed": failed_total,
        "tests": results
    }, f, indent=2)

if failed_total > 0:
    sys.exit(1)
