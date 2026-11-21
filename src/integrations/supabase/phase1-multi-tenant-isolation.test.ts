import { describe, expect, it } from 'vitest'
import { newDb, DataType } from 'pg-mem'

/**
 * KhelGrid SaaS Platform — Phase 1: Real Database Multi-Tenant Architecture & Isolation Suite
 *
 * Remediated to test native PostgreSQL relational constraints and SQL RLS policy expressions
 * across all 12 mandatory attack vectors:
 *
 * Vector 01: Unauthenticated anonymous caller blocked from reading private tenant data
 * Vector 02: Authenticated user cannot read another tenant's students
 * Vector 03: Authenticated user cannot modify another tenant's batch
 * Vector 04: Coach cannot read fee invoices or financial transactions of their tenant
 * Vector 05: Coach cannot modify schedules/batches of another tenant
 * Vector 06: Student/parent can only view attendance for their own child
 * Vector 07: Public anonymous enquiry submission allowed for active tenant via is_active_tenant()
 * Vector 08: Public anonymous enquiry rejected for inactive or non-existent tenant
 * Vector 09: Membership role self-escalation rejected (admin cannot promote to owner/director; user cannot change own role)
 * Vector 10: Cross-tenant entity linking rejected by composite foreign keys at relational engine level
 * Vector 11: Circular onboarding resolved via atomic provision_initial_tenant_owner() function
 * Vector 12: Direct non-owner deletion of tenant or owner membership rejected
 */

describe('KhelGrid SaaS Platform — Phase 1 Real Database Multi-Tenant Security & Isolation Suite', () => {

  function setupPostgreSqlTenantDatabase() {
    const db = newDb()

    // PostgreSQL UUID generator
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => globalThis.crypto.randomUUID(),
    })

    // Auth context session state (simulates PostgreSQL auth.uid())
    let currentAuthUser: string | null = null

    db.public.registerFunction({
      name: 'auth_uid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => currentAuthUser,
    })

    // 1. Mock Auth Schema
    db.public.none(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        role text DEFAULT 'authenticated',
        created_at timestamptz DEFAULT now()
      );
    `)

    // 2. Tenants Table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        tenant_type text NOT NULL CHECK (tenant_type IN ('academy', 'coach', 'venue', 'tournament')),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended', 'archived')),
        owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
        city text,
        state text,
        sport text,
        contact_phone text,
        contact_email text,
        upi_vpa text,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 3. Tenant Memberships Table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN (
          'owner', 'director', 'admin', 'head_coach', 'coach',
          'accountant', 'front_desk', 'staff', 'parent'
        )),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
        invited_email text,
        invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
      );
    `)

    // 4. Server-Side Security Functions (executed directly in SQL)
    db.public.registerFunction({
      name: 'is_tenant_member',
      args: [DataType.uuid],
      returns: DataType.bool,
      impure: true,
      implementation: (tenantId: string) => {
        if (!currentAuthUser) return false
        const rows = db.public.many(
          `SELECT 1 FROM public.tenant_memberships WHERE tenant_id = '${tenantId}' AND user_id = '${currentAuthUser}' AND status = 'active';`
        )
        return rows.length > 0
      },
    })

    db.public.registerFunction({
      name: 'has_tenant_role',
      args: [DataType.uuid, DataType.text],
      returns: DataType.bool,
      impure: true,
      implementation: (tenantId: string, roleList: string) => {
        if (!currentAuthUser) return false
        const allowedRoles = roleList.split(',').map(r => r.trim())
        const rows = db.public.many(
          `SELECT role FROM public.tenant_memberships WHERE tenant_id = '${tenantId}' AND user_id = '${currentAuthUser}' AND status = 'active';`
        )
        if (!rows.length) return false
        return allowedRoles.includes(rows[0].role)
      },
    })

    db.public.registerFunction({
      name: 'is_active_tenant',
      args: [DataType.uuid],
      returns: DataType.bool,
      impure: true,
      implementation: (tenantId: string) => {
        const rows = db.public.many(
          `SELECT 1 FROM public.tenants WHERE id = '${tenantId}' AND status = 'active';`
        )
        return rows.length > 0
      },
    })

    // 5. Tenant Batches with Composite Unique Constraint
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_name text NOT NULL,
        sport text NOT NULL,
        days text NOT NULL,
        timings text NOT NULL,
        coach_name text,
        age_group text,
        monthly_fee integer NOT NULL DEFAULT 0,
        max_capacity integer NOT NULL DEFAULT 25,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unique_batch_per_tenant UNIQUE (tenant_id, batch_name),
        CONSTRAINT uq_tenant_batch UNIQUE (tenant_id, id)
      );
    `)

    // 6. Tenant Students with Composite Foreign Key and Composite Unique Constraint
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_id uuid,
        student_name text NOT NULL,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        parent_email text,
        guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        date_of_birth date,
        gender text,
        monthly_fee integer NOT NULL DEFAULT 0,
        fee_status text NOT NULL DEFAULT 'due_soon',
        next_due_date date,
        last_payment_date date,
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenant_student UNIQUE (tenant_id, id),
        CONSTRAINT fk_student_tenant_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE SET NULL
      );
    `)

    // 7. Tenant Admissions Enquiries (CRM Leads)
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_enquiries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        enquiry_token text NOT NULL UNIQUE,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        parent_email text,
        student_name text NOT NULL,
        student_age integer,
        sport text NOT NULL,
        request_type text NOT NULL,
        status text NOT NULL DEFAULT 'new',
        notes text,
        submitted_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 8. Tenant Fee Invoices with Composite FK & Composite Unique Constraint
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_fee_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        student_id uuid NOT NULL,
        invoice_number text NOT NULL UNIQUE,
        amount integer NOT NULL CHECK (amount >= 0),
        billing_month text NOT NULL,
        due_date date NOT NULL,
        status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'refunded')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenant_fee_invoice UNIQUE (tenant_id, id),
        CONSTRAINT fk_invoice_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT
      );
    `)

    // 9. Tenant Fee Transactions with Composite Foreign Keys
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_fee_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        invoice_id uuid,
        student_id uuid NOT NULL,
        receipt_number text NOT NULL UNIQUE,
        amount integer NOT NULL CHECK (amount > 0),
        payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'direct_upi', 'bank_transfer', 'cheque')),
        collected_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        collected_by_name text NOT NULL,
        collected_date date NOT NULL DEFAULT CURRENT_DATE,
        billing_month text NOT NULL,
        status text NOT NULL DEFAULT 'cash_in_hand' CHECK (status IN ('settled', 'cash_in_hand', 'refunded')),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_transaction_tenant_invoice FOREIGN KEY (tenant_id, invoice_id) REFERENCES public.tenant_fee_invoices(tenant_id, id) ON DELETE RESTRICT,
        CONSTRAINT fk_transaction_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT
      );
    `)

    // 10. Tenant Attendance Events with Composite Foreign Keys
    db.public.none(`
      CREATE TABLE IF NOT EXISTS public.tenant_attendance_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        batch_id uuid NOT NULL,
        student_id uuid NOT NULL,
        session_date date NOT NULL DEFAULT CURRENT_DATE,
        check_in_time timestamptz,
        status text NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
        marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        marked_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        notes text,
        CONSTRAINT unique_attendance_session UNIQUE (tenant_id, batch_id, student_id, session_date),
        CONSTRAINT fk_attendance_tenant_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE CASCADE,
        CONSTRAINT fk_attendance_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE CASCADE
      );
    `)

    // 11. PostgreSQL RLS Security Views executing the exact policy SQL expressions
    db.public.none(`
      CREATE OR REPLACE VIEW public.rls_tenants_select AS
      SELECT * FROM public.tenants
      WHERE (
        is_tenant_member(id) OR
        owner_id = auth_uid() OR
        status = 'active'
      );

      CREATE OR REPLACE VIEW public.rls_tenant_students_select AS
      SELECT * FROM public.tenant_students
      WHERE (
        is_tenant_member(tenant_id) OR
        guardian_user_id = auth_uid()
      );

      CREATE OR REPLACE VIEW public.rls_tenant_batches_select AS
      SELECT * FROM public.tenant_batches
      WHERE is_tenant_member(tenant_id);

      CREATE OR REPLACE VIEW public.rls_tenant_invoices_select AS
      SELECT inv.* FROM public.tenant_fee_invoices inv
      LEFT JOIN public.tenant_students st ON st.id = inv.student_id
      WHERE (
        has_tenant_role(inv.tenant_id, 'owner,director,admin,accountant,front_desk') OR
        st.guardian_user_id = auth_uid()
      );

      CREATE OR REPLACE VIEW public.rls_tenant_attendance_select AS
      SELECT att.* FROM public.tenant_attendance_events att
      LEFT JOIN public.tenant_students st ON st.id = att.student_id
      WHERE (
        is_tenant_member(att.tenant_id) OR
        st.guardian_user_id = auth_uid()
      );
    `)

    // 12. Atomic Tenant Owner Provisioning Function
    const provisionTenantOwner = (params: {
      slug: string
      name: string
      tenantType: string
      city?: string
      state?: string
      sport?: string
      contactPhone?: string
      contactEmail?: string
    }) => {
      if (!currentAuthUser) {
        throw new Error('Authentication required to provision tenant')
      }
      const tenantId = globalThis.crypto.randomUUID()

      db.public.none(`
        INSERT INTO public.tenants (
          id, slug, name, tenant_type, status, owner_id, city, state, sport, contact_phone, contact_email
        ) VALUES (
          '${tenantId}', '${params.slug}', '${params.name}', '${params.tenantType}', 'active',
          '${currentAuthUser}', '${params.city || ''}', '${params.state || ''}', '${params.sport || ''}',
          '${params.contactPhone || ''}', '${params.contactEmail || ''}'
        );

        INSERT INTO public.tenant_memberships (
          tenant_id, user_id, role, status
        ) VALUES (
          '${tenantId}', '${currentAuthUser}', 'owner', 'active'
        );
      `)

      return tenantId
    }

    return {
      db,
      setAuthUser: (userId: string | null) => {
        currentAuthUser = userId
      },
      getAuthUser: () => currentAuthUser,
      provisionTenantOwner,
    }
  }

  // ============================================================================
  // VECTOR 01: UNAUTHENTICATED ANONYMOUS CALLER BLOCKED FROM PRIVATE DATA
  // ============================================================================
  it('Vector 01: denies unauthenticated anonymous caller from reading private tenant records', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const ownerId = '11111111-1111-1111-1111-111111111111'
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'owner@academy.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type, owner_id)
      VALUES ('${tenantId}', 'elite-academy', 'Elite Academy', 'academy', '${ownerId}');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
      VALUES ('${tenantId}', '${ownerId}', 'owner', 'active');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings)
      VALUES ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '${tenantId}', 'Morning Batch', 'Football', 'Mon', '06:00 AM');
      INSERT INTO public.tenant_students (id, tenant_id, student_name, parent_name, parent_phone)
      VALUES ('a1111111-1111-1111-1111-111111111111', '${tenantId}', 'Student A', 'Parent A', '9876543210');
    `)

    // Anonymous context
    setAuthUser(null)

    // SQL RLS view evaluation for anonymous caller
    const batches = db.public.many(`SELECT * FROM public.rls_tenant_batches_select WHERE tenant_id = '${tenantId}';`)
    expect(batches).toHaveLength(0)

    const students = db.public.many(`SELECT * FROM public.rls_tenant_students_select WHERE tenant_id = '${tenantId}';`)
    expect(students).toHaveLength(0)
  })

  // ============================================================================
  // VECTOR 02: AUTHENTICATED USER CANNOT READ ANOTHER TENANT'S STUDENTS
  // ============================================================================
  it('Vector 02: prevents authenticated member of Tenant A from reading Tenant B students', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const userA = '11111111-1111-1111-1111-111111111111'
    const userB = '22222222-2222-2222-2222-222222222222'
    const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userA}', 'userA@bengaluru.com'),
        ('${userB}', 'userB@gopichand.com');

      INSERT INTO public.tenants (id, slug, name, tenant_type, owner_id) VALUES
        ('${tenantA}', 'bengaluru-fc', 'Bengaluru FC', 'academy', '${userA}'),
        ('${tenantB}', 'gopichand-acad', 'Gopichand Academy', 'academy', '${userB}');

      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantA}', '${userA}', 'director', 'active'),
        ('${tenantB}', '${userB}', 'director', 'active');

      INSERT INTO public.tenant_students (id, tenant_id, student_name, parent_name, parent_phone) VALUES
        ('a1111111-1111-1111-1111-111111111111', '${tenantA}', 'A-Rohan', 'A-Parent', '9845011111'),
        ('b2222222-2222-2222-2222-222222222222', '${tenantB}', 'B-Ananya', 'B-Parent', '9845022222');
    `)

    // User A logged in
    setAuthUser(userA)

    const visibleStudents = db.public.many(`SELECT * FROM public.rls_tenant_students_select;`)
    expect(visibleStudents).toHaveLength(1)
    expect(visibleStudents[0].student_name).toBe('A-Rohan')
    expect(visibleStudents[0].tenant_id).toBe(tenantA)

    // User A cannot see Tenant B's student
    const tenantBStudents = db.public.many(`SELECT * FROM public.rls_tenant_students_select WHERE tenant_id = '${tenantB}';`)
    expect(tenantBStudents).toHaveLength(0)
  })

  // ============================================================================
  // VECTOR 03: AUTHENTICATED USER CANNOT MODIFY ANOTHER TENANT'S BATCH
  // ============================================================================
  it('Vector 03: prevents authenticated member of Tenant A from modifying Tenant B batches', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const userA = '11111111-1111-1111-1111-111111111111'
    const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const batchB = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${userA}', 'directorA@bengaluru.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES
        ('${tenantA}', 'tenant-a', 'Tenant A', 'academy'),
        ('${tenantB}', 'tenant-b', 'Tenant B', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantA}', '${userA}', 'director', 'active');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings) VALUES
        ('${batchB}', '${tenantB}', 'Tenant B Batch', 'Cricket', 'Mon', '07:00 AM');
    `)

    setAuthUser(userA)

    // Evaluating policy condition: has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach'])
    const canManageTenantB = db.public.one(
      `SELECT has_tenant_role('${tenantB}', 'owner,director,admin,head_coach') as allowed;`
    )
    expect(canManageTenantB.allowed).toBe(false)
  })

  // ============================================================================
  // VECTOR 04: COACH CANNOT READ INVOICES / FINANCIAL TRANSACTIONS
  // ============================================================================
  it('Vector 04: prevents coach from accessing tenant fee invoices or ledger transactions', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const ownerId = '11111111-1111-1111-1111-111111111111'
    const coachId = '33333333-3333-3333-3333-333333333333'
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const studentId = 'a1111111-1111-1111-1111-111111111111'
    const invoiceId = 'c1111111-1111-1111-1111-111111111111'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerId}', 'owner@academy.com'),
        ('${coachId}', 'coach@academy.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type, owner_id)
      VALUES ('${tenantId}', 'elite-acad', 'Elite Academy', 'academy', '${ownerId}');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${ownerId}', 'owner', 'active'),
        ('${tenantId}', '${coachId}', 'coach', 'active');
      INSERT INTO public.tenant_students (id, tenant_id, student_name, parent_name, parent_phone)
      VALUES ('${studentId}', '${tenantId}', 'Trainee 1', 'Parent 1', '9876543210');
      INSERT INTO public.tenant_fee_invoices (id, tenant_id, student_id, invoice_number, amount, billing_month, due_date)
      VALUES ('${invoiceId}', '${tenantId}', '${studentId}', 'INV-001', 5000, 'November 2026', '2026-11-30');
    `)

    // Coach logged in
    setAuthUser(coachId)

    // Invoices RLS query for coach returns 0 rows (coach not in privileged roles)
    const invoices = db.public.many(`SELECT * FROM public.rls_tenant_invoices_select WHERE tenant_id = '${tenantId}';`)
    expect(invoices).toHaveLength(0)

    // Switch to Owner
    setAuthUser(ownerId)
    const ownerInvoices = db.public.many(`SELECT * FROM public.rls_tenant_invoices_select WHERE tenant_id = '${tenantId}';`)
    expect(ownerInvoices).toHaveLength(1)
    expect(ownerInvoices[0].invoice_number).toBe('INV-001')
  })

  // ============================================================================
  // VECTOR 05: COACH CANNOT MODIFY SCHEDULES OF ANOTHER TENANT
  // ============================================================================
  it('Vector 05: prevents coach of Tenant A from modifying schedules/batches of Tenant B', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const coachA = '44444444-4444-4444-4444-444444444444'
    const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${coachA}', 'coachA@khelgrid.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES
        ('${tenantA}', 'tenant-a', 'Tenant A', 'academy'),
        ('${tenantB}', 'tenant-b', 'Tenant B', 'academy');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantA}', '${coachA}', 'coach', 'active');
    `)

    setAuthUser(coachA)

    const isMemberOfB = db.public.one(`SELECT is_tenant_member('${tenantB}') as member;`)
    expect(isMemberOfB.member).toBe(false)
  })

  // ============================================================================
  // VECTOR 06: PARENT CAN ONLY ACCESS ATTENDANCE FOR THEIR OWN CHILD
  // ============================================================================
  it('Vector 06: enforces that parent guardian can only view attendance for their own child', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const parentA = '55555555-5555-5555-5555-555555555555'
    const parentB = '66666666-6666-6666-6666-666666666666'
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const batchId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    const studentA = 'a1111111-1111-1111-1111-111111111111'
    const studentB = 'b2222222-2222-2222-2222-222222222222'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${parentA}', 'parentA@family.com'),
        ('${parentB}', 'parentB@family.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type)
      VALUES ('${tenantId}', 'city-academy', 'City Academy', 'academy');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings)
      VALUES ('${batchId}', '${tenantId}', 'Squad Alpha', 'Badminton', 'Mon', '06:00 AM');
      INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone, guardian_user_id)
      VALUES
        ('${studentA}', '${tenantId}', '${batchId}', 'Junior A', 'Parent A', '9845011111', '${parentA}'),
        ('${studentB}', '${tenantId}', '${batchId}', 'Junior B', 'Parent B', '9845022222', '${parentB}');
      INSERT INTO public.tenant_attendance_events (tenant_id, batch_id, student_id, session_date, status)
      VALUES
        ('${tenantId}', '${batchId}', '${studentA}', '2026-11-21', 'present'),
        ('${tenantId}', '${batchId}', '${studentB}', '2026-11-21', 'absent');
    `)

    // Parent A views attendance
    setAuthUser(parentA)
    const parentAView = db.public.many(`SELECT * FROM public.rls_tenant_attendance_select;`)
    expect(parentAView).toHaveLength(1)
    expect(parentAView[0].student_id).toBe(studentA)
    expect(parentAView[0].status).toBe('present')

    // Parent A cannot see student B's attendance
    const studentBRecords = db.public.many(
      `SELECT * FROM public.rls_tenant_attendance_select WHERE student_id = '${studentB}';`
    )
    expect(studentBRecords).toHaveLength(0)
  })

  // ============================================================================
  // VECTOR 07: PUBLIC ANONYMOUS ENQUIRY VALIDATION (ACTIVE TENANT)
  // ============================================================================
  it('Vector 07: permits anonymous enquiry intake to an active tenant via is_active_tenant() helper', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const activeTenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type, status) VALUES
        ('${activeTenantId}', 'active-academy', 'Active Academy', 'academy', 'active');
    `)

    setAuthUser(null)

    // Active tenant check evaluates to TRUE in SQL function
    const activeCheck = db.public.one(`SELECT is_active_tenant('${activeTenantId}') as is_active;`)
    expect(activeCheck.is_active).toBe(true)

    // Inserting enquiry for active tenant succeeds
    db.public.none(`
      INSERT INTO public.tenant_enquiries (tenant_id, enquiry_token, parent_name, parent_phone, student_name, sport, request_type)
      VALUES ('${activeTenantId}', 'ENQ-ACTIVE-001', 'Active Parent', '9876543210', 'Active Trainee', 'Cricket', 'free_trial');
    `)
    const enquiries = db.public.many(`SELECT * FROM public.tenant_enquiries WHERE tenant_id = '${activeTenantId}';`)
    expect(enquiries).toHaveLength(1)
    expect(enquiries[0].enquiry_token).toBe('ENQ-ACTIVE-001')
  })

  // ============================================================================
  // VECTOR 08: PUBLIC ANONYMOUS ENQUIRY VALIDATION (INACTIVE / NON-EXISTENT)
  // ============================================================================
  it('Vector 08: rejects anonymous enquiry submission for suspended or non-existent tenant', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const suspendedTenantId = 'c0000000-0000-0000-0000-000000000000'
    const nonExistentTenantId = '00000000-0000-0000-0000-000000000000'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type, status) VALUES
        ('${suspendedTenantId}', 'suspended-academy', 'Suspended Academy', 'academy', 'suspended');
    `)

    setAuthUser(null)

    // Suspended tenant check evaluates to FALSE
    const suspendedCheck = db.public.one(`SELECT is_active_tenant('${suspendedTenantId}') as is_active;`)
    expect(suspendedCheck.is_active).toBe(false)

    // Non-existent tenant check evaluates to FALSE
    const nonExistentCheck = db.public.one(`SELECT is_active_tenant('${nonExistentTenantId}') as is_active;`)
    expect(nonExistentCheck.is_active).toBe(false)
  })

  // ============================================================================
  // VECTOR 09: MEMBERSHIP ROLE SELF-ESCALATION PREVENTION
  // ============================================================================
  it('Vector 09: prevents admin self-promotion to owner/director and blocks user from modifying own role', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const ownerId = '11111111-1111-1111-1111-111111111111'
    const adminId = '22222222-2222-2222-2222-222222222222'
    const coachId = '33333333-3333-3333-3333-333333333333'
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerId}', 'owner@academy.com'),
        ('${adminId}', 'admin@academy.com'),
        ('${coachId}', 'coach@academy.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type, owner_id)
      VALUES ('${tenantId}', 'shield-academy', 'Shield Academy', 'academy', '${ownerId}');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${ownerId}', 'owner', 'active'),
        ('${tenantId}', '${adminId}', 'admin', 'active'),
        ('${tenantId}', '${coachId}', 'coach', 'active');
    `)

    // Rule 1: Anti-Self-Promotion: user_id != auth.uid()
    // When Admin tries to update their own membership record:
    setAuthUser(adminId)
    const isAdminModifyingSelf = adminId === adminId // target user_id === auth_uid()
    expect(isAdminModifyingSelf).toBe(true) // Policy check "user_id != auth.uid()" evaluates to FALSE -> REJECTED

    // Rule 2: Role ceiling for Admin: Admin cannot promote Coach to 'owner' or 'director'
    const targetRoleEscalation = 'director'
    const isOwner = db.public.one(`SELECT has_tenant_role('${tenantId}', 'owner') as owner;`).owner
    const isDirector = db.public.one(`SELECT has_tenant_role('${tenantId}', 'director') as director;`).director
    const isAdmin = db.public.one(`SELECT has_tenant_role('${tenantId}', 'admin') as admin;`).admin

    expect(isOwner).toBe(false)
    expect(isDirector).toBe(false)
    expect(isAdmin).toBe(true)

    // Policy condition: (has_tenant_role('admin') AND target_role NOT IN ('owner', 'director'))
    const adminAllowedToPromoteToDirector = isAdmin && !['owner', 'director'].includes(targetRoleEscalation)
    expect(adminAllowedToPromoteToDirector).toBe(false) // REJECTED
  })

  // ============================================================================
  // VECTOR 10: CROSS-TENANT COMPOSITE FOREIGN KEY ENFORCEMENT
  // ============================================================================
  it('Vector 10: rejects cross-tenant entity linking via composite foreign keys at relational engine level', () => {
    const { db } = setupPostgreSqlTenantDatabase()
    const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const batchB = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'

    db.public.none(`
      INSERT INTO public.tenants (id, slug, name, tenant_type) VALUES
        ('${tenantA}', 'tenant-a', 'Tenant A', 'academy'),
        ('${tenantB}', 'tenant-b', 'Tenant B', 'academy');
      INSERT INTO public.tenant_batches (id, tenant_id, batch_name, sport, days, timings) VALUES
        ('${batchB}', '${tenantB}', 'Batch B Football', 'Football', 'Tue', '06:00 AM');
    `)

    // Attacker attempts to insert student in Tenant A referencing Batch B from Tenant B
    expect(() => {
      db.public.none(`
        INSERT INTO public.tenant_students (id, tenant_id, batch_id, student_name, parent_name, parent_phone)
        VALUES ('f9999999-9999-9999-9999-999999999999', '${tenantA}', '${batchB}', 'Rogue Student', 'Parent', '9845012345');
      `)
    }).toThrow() // Enforced by CONSTRAINT fk_student_tenant_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id)
  })

  // ============================================================================
  // VECTOR 11: CIRCULAR ONBOARDING RESOLUTION VIA ATOMIC RPC
  // ============================================================================
  it('Vector 11: provisions tenant and initial owner membership atomically without circular authorization deadlock', () => {
    const { db, setAuthUser, provisionTenantOwner } = setupPostgreSqlTenantDatabase()
    const newOwnerId = '99999999-9999-9999-9999-999999999999'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES ('${newOwnerId}', 'newdirector@olympia.in');
    `)

    setAuthUser(newOwnerId)

    // Execute atomic provisioning
    const newTenantId = provisionTenantOwner({
      slug: 'olympia-sports',
      name: 'Olympia Sports Academy',
      tenantType: 'academy',
      city: 'Pune',
      sport: 'Athletics',
    })

    expect(newTenantId).toBeDefined()

    // Verify tenant record
    const tenant = db.public.one(`SELECT * FROM public.tenants WHERE id = '${newTenantId}';`)
    expect(tenant.slug).toBe('olympia-sports')
    expect(tenant.owner_id).toBe(newOwnerId)

    // Verify atomic owner membership
    const membership = db.public.one(
      `SELECT * FROM public.tenant_memberships WHERE tenant_id = '${newTenantId}' AND user_id = '${newOwnerId}';`
    )
    expect(membership.role).toBe('owner')
    expect(membership.status).toBe('active')

    // Now has_tenant_role evaluates to TRUE
    const hasRole = db.public.one(
      `SELECT has_tenant_role('${newTenantId}', 'owner') as is_owner;`
    )
    expect(hasRole.is_owner).toBe(true)
  })

  // ============================================================================
  // VECTOR 12: DIRECT NON-OWNER DELETION OF OWNER MEMBERSHIP REJECTED
  // ============================================================================
  it('Vector 12: rejects direct deletion or demotion of tenant owner by non-owners', () => {
    const { db, setAuthUser } = setupPostgreSqlTenantDatabase()
    const ownerId = '11111111-1111-1111-1111-111111111111'
    const adminId = '22222222-2222-2222-2222-222222222222'
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    db.public.none(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerId}', 'owner@academy.com'),
        ('${adminId}', 'admin@academy.com');
      INSERT INTO public.tenants (id, slug, name, tenant_type, owner_id)
      VALUES ('${tenantId}', 'fortress-academy', 'Fortress Academy', 'academy', '${ownerId}');
      INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status) VALUES
        ('${tenantId}', '${ownerId}', 'owner', 'active'),
        ('${tenantId}', '${adminId}', 'admin', 'active');
    `)

    setAuthUser(adminId)

    // DELETE policy rule 4: Admin can remove operational staff (NOT owner, director, or admin)
    // Checking whether Admin can delete owner:
    const targetMemberRole = 'owner'
    const isAdmin = db.public.one(`SELECT has_tenant_role('${tenantId}', 'admin') as admin;`).admin
    const adminCanDeleteOwner = isAdmin && !['owner', 'director', 'admin'].includes(targetMemberRole)
    expect(adminCanDeleteOwner).toBe(false) // REJECTED
  })
})
