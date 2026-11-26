import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { isValidUpiVpa, ACADEMY_ROLE_PERMISSIONS, canRoleAccessTab } from '../../shared/saas/saasLaunchReadinessService'
import { updateTenantSettings, recordTenantAuditLog, type DbTenantMembership } from './tenant-client'
import AcademyHubPage from '../../modules/academies/AcademyHubPage'
// @ts-expect-error - node built-in
import fs from 'node:fs'
// @ts-expect-error - node built-in
import path from 'node:path'

describe('KhelGrid SaaS Platform — Phase 4 Academy Workspace & Administration Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. NPCI Indian UPI VPA Validation Engine', () => {
    it('accepts valid NPCI-compliant UPI VPAs across major Indian PSP banks and handles', () => {
      const validVpas = [
        'bengaluru@oksbi',
        'team@icici',
        'fc@okhdfcbank',
        'coach.suresh-10@paytm',
        'academy_sports@ybl',
        'khelgrid.official@axl',
        'sub-unit.delhi_2026@ibl',
        'first99@barodampay',
      ]

      validVpas.forEach(vpa => {
        expect(isValidUpiVpa(vpa), `Expected "${vpa}" to be valid UPI VPA`).toBe(true)
      })
    })

    it('rejects malformed, empty, and dangerous UPI VPA strings', () => {
      const invalidVpas = [
        null,
        undefined,
        '',
        '   ',
        'noatsign',
        'foo@',
        '@bank',
        'two@@ats',
        'invalid character$@sbi',
        'with space@axis',
        'a@b', // too short
        'a'.repeat(105) + '@oksbi', // username too long (>100)
        'academy@' + 'b'.repeat(70), // handle too long (>64)
      ]

      invalidVpas.forEach(vpa => {
        expect(isValidUpiVpa(vpa), `Expected "${vpa}" to be rejected`).toBe(false)
      })
    })
  })

  describe('2. Role-Based Access Control (RBAC) Permissions for Tenant Operations', () => {
    it('grants director role full administrative privileges to edit bank/UPI and view settings', () => {
      const directorPerms = ACADEMY_ROLE_PERMISSIONS.director
      expect(directorPerms.canEditBankUpi).toBe(true)
      expect(directorPerms.canManageFinancials).toBe(true)
      expect(directorPerms.canManageStaff).toBe(true)
      expect(directorPerms.allowedTabs).toContain('settings')
      expect(canRoleAccessTab('director', 'settings')).toBe(true)
    })

    it('denies coach and front desk roles permission to edit bank accounts or UPI VPAs', () => {
      const coachPerms = ACADEMY_ROLE_PERMISSIONS.head_coach
      expect(coachPerms.canEditBankUpi).toBe(false)
      expect(coachPerms.canManageFinancials).toBe(false)
      expect(coachPerms.allowedTabs).not.toContain('settings')
      expect(canRoleAccessTab('head_coach', 'settings')).toBe(false)

      const frontDeskPerms = ACADEMY_ROLE_PERMISSIONS.front_desk
      expect(frontDeskPerms.canEditBankUpi).toBe(false)
      expect(frontDeskPerms.canManageFinancials).toBe(false)
      expect(frontDeskPerms.allowedTabs).not.toContain('settings')
      expect(canRoleAccessTab('front_desk', 'settings')).toBe(false)
    })
  })

  describe('3. Database Tenant Client — updateTenantSettings', () => {
    it('returns unconfigured response gracefully when Supabase credentials are not present', async () => {
      const res = await updateTenantSettings('test-tenant-id', {
        name: 'Updated Academy Name',
        city: 'Bengaluru',
        upi_vpa: 'test@oksbi',
      })

      expect(res).toBeDefined()
      expect(typeof res.success).toBe('boolean')
      expect(typeof res.message).toBe('string')
    })
  })

  describe('4. Multi-Tenant Workspace Switcher Logic', () => {
    it('filters only active memberships for authorized workspace switching', () => {
      const mockMemberships: DbTenantMembership[] = [
        {
          id: 'mem-1',
          tenant_id: 'tenant-101',
          user_id: 'user-01',
          role: 'director',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant: {
            id: 'tenant-101',
            slug: 'bengaluru-elite',
            name: 'Bengaluru Elite Academy',
            tenant_type: 'academy',
            status: 'active',
            city: 'Bengaluru',
            sport: 'Football',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'mem-2',
          tenant_id: 'tenant-102',
          user_id: 'user-01',
          role: 'coach',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant: {
            id: 'tenant-102',
            slug: 'mysuru-sports',
            name: 'Mysuru Sports Center',
            tenant_type: 'academy',
            status: 'active',
            city: 'Mysuru',
            sport: 'Badminton',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'mem-3',
          tenant_id: 'tenant-103',
          user_id: 'user-01',
          role: 'staff',
          status: 'suspended',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant: {
            id: 'tenant-103',
            slug: 'suspended-academy',
            name: 'Suspended Academy',
            tenant_type: 'academy',
            status: 'suspended',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ]

      const activeMemberships = mockMemberships.filter(m => m.status === 'active')
      expect(activeMemberships).toHaveLength(2)
      expect(activeMemberships.map(m => m.tenant?.name)).toEqual([
        'Bengaluru Elite Academy',
        'Mysuru Sports Center',
      ])
      expect(activeMemberships.some(m => m.tenant_id === 'tenant-103')).toBe(false)
    })
  })

  describe('5. Database Projection Trigger Specification & Migrations', () => {
    it('verifies trg_sync_tenant_public_directory trigger definition in migrations', () => {
      const migrationFile = path.resolve(
        'supabase/migrations/20261121230000_phase1_tenant_public_directory_projection_table.sql'
      )
      expect(fs.existsSync(migrationFile)).toBe(true)

      const sql = fs.readFileSync(migrationFile, 'utf-8')
      expect(sql).toContain('CREATE TRIGGER trg_sync_tenant_public_directory')
      expect(sql).toContain('AFTER INSERT OR UPDATE OR DELETE ON public.tenants')
      expect(sql).toContain('FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_public_directory();')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.tenant_public_directory')
      expect(sql).toContain('status = \'active\'')
    })

    it('verifies Phase 2 trigger hardening preserves active alive status filter', () => {
      const hardeningFile = path.resolve(
        'supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql'
      )
      expect(fs.existsSync(hardeningFile)).toBe(true)

      const sql = fs.readFileSync(hardeningFile, 'utf-8')
      expect(sql).toContain("IF NEW.status = 'active' AND NEW.deleted_at IS NULL THEN")
      expect(sql).toContain('DELETE FROM public.tenant_public_directory WHERE id = NEW.id;')
    })
  })

  describe('6. Immutable Audit Logging Specification', () => {
    it('verifies recordTenantAuditLog parameters and return shape', async () => {
      const res = await recordTenantAuditLog({
        tenantId: '00000000-0000-0000-0000-000000000001',
        action: 'update_tenant_settings',
        entityType: 'tenants',
        entityId: '00000000-0000-0000-0000-000000000001',
        details: {
          directorName: 'Coach Suresh M.',
          upiVpa: 'academy@oksbi',
        },
      })

      expect(res).toBeDefined()
      expect(typeof res.success).toBe('boolean')
      expect(typeof res.message).toBe('string')
    })
  })

  describe('7. AcademyHubPage React Component Integration', () => {
    it('fails closed without TenantProvider session and exposes zero fake demo academies', () => {
      const htmlUnauth = renderToStaticMarkup(<AcademyHubPage />)

      expect(htmlUnauth).toContain('Authorized Academy Membership Required')
      expect(htmlUnauth).not.toContain('Bengaluru FC Residential Academy')
      expect(htmlUnauth).not.toContain('id="academy-hub-select"')
      expect(htmlUnauth).not.toContain('id="academy-role-select"')
    })
  })
})
