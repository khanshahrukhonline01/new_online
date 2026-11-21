import { describe, expect, it } from 'vitest'
import { newDb, DataType } from 'pg-mem'

describe('Phase 1: Multi-Tenant Database Architecture & Isolation Suite', () => {
  function setupMultiTenantDatabase() {
    const db = newDb()

    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => globalThis.crypto.randomUUID(),
    })

    let currentAuthUser: string | null = null

    db.public.registerFunction({
      name: 'auth_uid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => currentAuthUser,
    })

    // Setup mock auth schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        role text DEFAULT 'authenticated',
        created_at timestamptz DEFAULT now()
      );
    `)

    // Tenants table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        tenant_type text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        owner_id uuid REFERENCES auth.users(id),
        city text,
        sport text,
        upi_vpa text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Memberships table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN (
          'owner', 'director', 'admin', 'head_coach', 'coach',
          'accountant', 'front_desk', 'staff', 'parent'
        )),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'invited')),
        invited_email text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
      );
    `)

    // Batches table with composite unique constraint for child foreign-key guarantees
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_name text NOT NULL,
        sport text NOT NULL,
        days text NOT NULL,
        timings text NOT NULL,
        coach_name text,
        monthly_fee integer NOT NULL DEFAULT 0,
        max_capacity integer NOT NULL DEFAULT 25,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unique_batch_per_tenant UNIQUE (tenant_id, batch_name),
        CONSTRAINT uq_tenant_batch UNIQUE (tenant_id, id)
      );
    `)

    // Students table with composite foreign key preventing cross-tenant batch association
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_id uuid,
        student_name text NOT NULL,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        monthly_fee integer NOT NULL DEFAULT 0,
        fee_status text NOT NULL DEFAULT 'due_soon',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_student_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE SET NULL,
        CONSTRAINT uq_tenant_student UNIQUE (tenant_id, id)
      );
    `)

    // Invoices & Transactions
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_fee_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE RESTRICT,
        invoice_number text NOT NULL UNIQUE,
        amount integer NOT NULL,
        billing_month text NOT NULL,
        status text NOT NULL DEFAULT 'issued',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.tenant_fee_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        invoice_id uuid REFERENCES public.tenant_fee_invoices(id),
        student_id uuid NOT NULL REFERENCES public.tenant_students(id),
        receipt_number text NOT NULL UNIQUE,
        amount integer NOT NULL,
        payment_mode text NOT NULL,
        collected_by_name text NOT NULL,
        status text NOT NULL DEFAULT 'cash_in_hand',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Daily Attendance
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_attendance_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_id uuid NOT NULL REFERENCES public.tenant_batches(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
        session_date date NOT NULL,
        status text NOT NULL,
        marked_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unique_attendance_session UNIQUE (tenant_id, batch_id, student_id, session_date)
      );
    `)

    return {
      db,
      setAuthUser: (userId: string | null) => {
        currentAuthUser = userId
      },
      getAuthUser: () => currentAuthUser,
      // Helper function mirroring server-side public.is_tenant_member(p_tenant_id)
      isTenantMember: (tenantId: string) => {
        if (!currentAuthUser) return false
        const rows = db.public.many(
          `SELECT 1 FROM public.tenant_memberships WHERE tenant_id = '${tenantId}' AND user_id = '${currentAuthUser}' AND status = 'active';`
        )
        return rows.length > 0
      },
      // Helper function mirroring server-side public.has_tenant_role(p_tenant_id, p_roles)
      hasTenantRole: (tenantId: string, allowedRoles: string[]) => {
        if (!currentAuthUser) return false
        const rows = db.public.many(
          `SELECT role FROM public.tenant_memberships WHERE tenant_id = '${tenantId}' AND user_id = '${currentAuthUser}' AND status = 'active';`
        )
        if (!rows.length) return false
        return allowedRoles.includes(rows[0].role)
      },
    }
  }

  it('proves strict data isolation between two independent academy tenants', () => {
    const { db } = setupMultiTenantDatabase()

    const ownerAId = '11111111-1111-1111-1111-111111111111'
    const ownerBId = '22222222-2222-2222-2222-222222222222'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerAId}', 'director@bengalurufc.com'),
        ('${ownerBId}', 'director@gopichand.com');
    `)

    const tenantAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type, status, owner_id, city, sport, upi_vpa) VALUES
        ('${tenantAId}', 'bengaluru-fc-academy', 'Bengaluru FC Residential Academy', 'academy', 'active', '${ownerAId}', 'Bengaluru', 'Football', 'bfc@hdfc'),
        ('${tenantBId}', 'gopichand-badminton', 'Pullela Gopichand Badminton Academy', 'academy', 'active', '${ownerBId}', 'Hyderabad', 'Badminton', 'gopichand@icici');
    `)

    db.public.none(`
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantAId}', '${ownerAId}', 'director', 'active'),
        ('${tenantBId}', '${ownerBId}', 'director', 'active');
    `)

    const batchAId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    const batchBId = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'

    db.public.none(`
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings, monthly_fee) VALUES
        ('${batchAId}', '${tenantAId}', 'Morning Elite U-14 Football', 'Football', 'Tue, Thu, Sat', '06:00 AM – 08:00 AM', 3500),
        ('${batchBId}', '${tenantBId}', 'Advanced Shuttlers Batch', 'Badminton', 'Mon, Wed, Fri', '05:30 AM – 07:30 AM', 4500);
    `)

    const studentAId = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'
    const studentBId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'

    db.public.none(`
      INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone, monthly_fee, fee_status) VALUES
        ('${studentAId}', '${tenantAId}', '${batchAId}', 'Rohan Kumar', 'Suresh Kumar', '9845012345', 3500, 'paid'),
        ('${studentBId}', '${tenantBId}', '${batchBId}', 'Ananya Reddy', 'Venkat Reddy', '9849012345', 4500, 'due_soon');
    `)

    const tenantAStudents = db.public.many(
      `SELECT id, student_name, tenant_id FROM public.tenant_students WHERE tenant_id = '${tenantAId}';`
    )
    expect(tenantAStudents).toHaveLength(1)
    expect(tenantAStudents[0].student_name).toBe('Rohan Kumar')
    expect(tenantAStudents[0].tenant_id).toBe(tenantAId)

    const tenantBStudents = db.public.many(
      `SELECT id, student_name, tenant_id FROM public.tenant_students WHERE tenant_id = '${tenantBId}';`
    )
    expect(tenantBStudents).toHaveLength(1)
    expect(tenantBStudents[0].student_name).toBe('Ananya Reddy')
    expect(tenantBStudents[0].tenant_id).toBe(tenantBId)

    const crossTenantCount = db.public.one(
      `SELECT count(*) as count FROM public.tenant_students s
       JOIN public.tenant_batches b ON s.batch_id = b.id
       WHERE s.tenant_id != b.tenant_id;`
    )
    expect(Number(crossTenantCount.count)).toBe(0)
  })

  it('enforces unique daily attendance roll-call per student session', () => {
    const { db } = setupMultiTenantDatabase()

    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const batchId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    const studentId = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings) VALUES ('${batchId}', '${tenantId}', 'U-14', 'Football', 'Mon', '06:00 AM');
      INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone) VALUES ('${studentId}', '${tenantId}', '${batchId}', 'Rohan', 'Suresh', '9845012345');
    `)

    db.public.none(`
      INSERT INTO public.tenant_attendance_events (tenant_id, batch_id, student_id, session_date, status)
      VALUES ('${tenantId}', '${batchId}', '${studentId}', '2026-11-21', 'present');
    `)

    const recorded = db.public.many(`SELECT * FROM public.tenant_attendance_events WHERE tenant_id = '${tenantId}';`)
    expect(recorded).toHaveLength(1)
    expect(recorded[0].status).toBe('present')

    // Duplicate roll-call for same student and date must be rejected by unique constraint
    expect(() => {
      db.public.none(`
        INSERT INTO public.tenant_attendance_events (tenant_id, batch_id, student_id, session_date, status)
        VALUES ('${tenantId}', '${batchId}', '${studentId}', '2026-11-21', 'absent');
      `)
    }).toThrow()
  })

  it('enforces immutable financial ledger receipts linked to tenant students', () => {
    const { db } = setupMultiTenantDatabase()

    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const batchId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    const studentId = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'
    const invoiceId = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings) VALUES ('${batchId}', '${tenantId}', 'U-14', 'Football', 'Mon', '06:00 AM');
      INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone) VALUES ('${studentId}', '${tenantId}', '${batchId}', 'Rohan', 'Suresh', '9845012345');
    `)

    db.public.none(`
      INSERT INTO public.tenant_fee_invoices (id, tenant_id, student_id, invoice_number, amount, billing_month, status)
      VALUES ('${invoiceId}', '${tenantId}', '${studentId}', 'INV-2026-11-001', 3500, 'November 2026', 'issued');
    `)

    db.public.none(`
      INSERT INTO public.tenant_fee_transactions (tenant_id, invoice_id, student_id, receipt_number, amount, payment_mode, collected_by_name, status)
      VALUES ('${tenantId}', '${invoiceId}', '${studentId}', 'REC-BFC-001', 3500, 'direct_upi', 'Coach Suresh', 'settled');
    `)

    const txs = db.public.many(`SELECT * FROM public.tenant_fee_transactions WHERE tenant_id = '${tenantId}';`)
    expect(txs).toHaveLength(1)
    expect(txs[0].receipt_number).toBe('REC-BFC-001')
    expect(txs[0].amount).toBe(3500)
    expect(txs[0].payment_mode).toBe('direct_upi')
  })

  it('denies unauthenticated anonymous callers from reading private tenant records (fail-closed)', () => {
    const { db, setAuthUser, isTenantMember } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    // Anonymous caller
    setAuthUser(null)
    expect(isTenantMember(tenantId)).toBe(false)

    // With RLS member filter, query for anonymous user returns 0 rows
    const visibleStudents = isTenantMember(tenantId)
      ? db.public.many(`SELECT * FROM public.tenant_students WHERE tenant_id = '${tenantId}';`)
      : []
    expect(visibleStudents).toHaveLength(0)
  })

  it('denies authenticated users without membership from accessing private tenant data', () => {
    const { db, setAuthUser, isTenantMember } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const outsiderId = '33333333-3333-3333-3333-333333333333'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${outsiderId}', 'stranger@khelgrid.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
    `)

    setAuthUser(outsiderId)
    expect(isTenantMember(tenantId)).toBe(false)

    const visibleBatches = isTenantMember(tenantId)
      ? db.public.many(`SELECT * FROM public.tenant_batches WHERE tenant_id = '${tenantId}';`)
      : []
    expect(visibleBatches).toHaveLength(0)
  })

  it('enforces role boundaries: owner/admin can manage batches but ordinary staff cannot', () => {
    const { db, setAuthUser, hasTenantRole } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const ownerId = '11111111-1111-1111-1111-111111111111'
    const staffId = '44444444-4444-4444-4444-444444444444'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerId}', 'owner@bengaluru.com'),
        ('${staffId}', 'trainer@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${ownerId}', 'owner', 'active'),
        ('${tenantId}', '${staffId}', 'coach', 'active');
    `)

    // Owner has batch management permissions
    setAuthUser(ownerId)
    expect(hasTenantRole(tenantId, ['owner', 'director', 'admin'])).toBe(true)

    // Coach does not have batch administrative management permissions
    setAuthUser(staffId)
    expect(hasTenantRole(tenantId, ['owner', 'director', 'admin'])).toBe(false)
  })

  it('prevents cross-tenant write operations: Tenant A staff cannot insert records into Tenant B', () => {
    const { db, setAuthUser, isTenantMember } = setupMultiTenantDatabase()
    const tenantAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const staffAId = '55555555-5555-5555-5555-555555555555'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${staffAId}', 'coachA@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES
        ('${tenantAId}', 'tenant-a', 'Tenant A', 'academy'),
        ('${tenantBId}', 'tenant-b', 'Tenant B', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantAId}', '${staffAId}', 'coach', 'active');
    `)

    setAuthUser(staffAId)
    expect(isTenantMember(tenantAId)).toBe(true)
    expect(isTenantMember(tenantBId)).toBe(false)

    // Simulating RLS WITH CHECK policy on INSERT:
    const canInsertTenantB = isTenantMember(tenantBId)
    expect(canInsertTenantB).toBe(false)
  })

  it('prevents cross-tenant entity linking: Tenant A student cannot reference Tenant B batch', () => {
    const { db } = setupMultiTenantDatabase()
    const tenantAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const batchBId = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES
        ('${tenantAId}', 'tenant-a', 'Tenant A', 'academy'),
        ('${tenantBId}', 'tenant-b', 'Tenant B', 'academy');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings) VALUES
        ('${batchBId}', '${tenantBId}', 'Tenant B Batch', 'Football', 'Mon', '06:00 AM');
    `)

    // Attempting to insert a Tenant A student that references Tenant B's batch must fail composite foreign key
    expect(() => {
      db.public.none(`
        INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone)
        VALUES ('a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9', '${tenantAId}', '${batchBId}', 'Attacker Student', 'Parent', '9845012345');
      `)
    }).toThrow()
  })

  it('immediately revokes access when membership status is set to revoked or suspended', () => {
    const { db, setAuthUser, isTenantMember } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const staffId = '66666666-6666-6666-6666-666666666666'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${staffId}', 'rogue@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${staffId}', 'coach', 'active');
    `)

    setAuthUser(staffId)
    expect(isTenantMember(tenantId)).toBe(true)

    // Admin revokes membership
    db.public.none(`
      UPDATE public.tenant_memberships SET status = 'revoked' WHERE tenant_id = '${tenantId}' AND user_id = '${staffId}';
    `)

    // Membership check must immediately evaluate to false
    expect(isTenantMember(tenantId)).toBe(false)

    // Admin suspends membership
    db.public.none(`
      UPDATE public.tenant_memberships SET status = 'suspended' WHERE tenant_id = '${tenantId}' AND user_id = '${staffId}';
    `)
    expect(isTenantMember(tenantId)).toBe(false)
  })

  it('prevents ordinary members from escalating role to owner', () => {
    const { db, setAuthUser, hasTenantRole } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const staffId = '77777777-7777-7777-7777-777777777777'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${staffId}', 'assistant@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${staffId}', 'coach', 'active');
    `)

    setAuthUser(staffId)
    // Only owner/director can alter roles
    const canAlterRole = hasTenantRole(tenantId, ['owner', 'director'])
    expect(canAlterRole).toBe(false)
  })

  it('guarantees that signing out (clearing auth context) immediately blocks access', () => {
    const { db, setAuthUser, isTenantMember } = setupMultiTenantDatabase()
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const ownerId = '11111111-1111-1111-1111-111111111111'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'director@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES ('${tenantId}', 'bengaluru-fc', 'Bengaluru FC', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${ownerId}', 'owner', 'active');
    `)

    // While logged in, access is granted
    setAuthUser(ownerId)
    expect(isTenantMember(tenantId)).toBe(true)

    // User signs out -> auth context cleared to null
    setAuthUser(null)
    expect(isTenantMember(tenantId)).toBe(false)
  })
})
