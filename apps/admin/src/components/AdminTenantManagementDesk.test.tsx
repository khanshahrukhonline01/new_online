import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminTenantManagementDesk } from './AdminTenantManagementDesk'
import {
  getAdminTenants,
  getAdminTenantDetails,
  updateTenantLifecycleStatus,
  updateTenantVerificationStatus,
  addTenantAdminNote,
  exportTenantsToCsv,
  resetAdminTenantsForTesting,
} from '../services/adminTenantService'

describe('AdminTenantManagementDesk & Multi-Tenant Governance Desk', () => {
  beforeEach(() => {
    resetAdminTenantsForTesting()
  })

  it('renders the governance desk header, micro-KPI metric cards, and category breakdown bar', () => {
    const html = renderToStaticMarkup(
      <AdminTenantManagementDesk operatorEmail="superadmin@khelgrid.com" />
    )

    expect(html).toContain('Tenant &amp; Organisation Governance')
    expect(html).toContain('Multi-Tenant SaaS Platform Governance')
    expect(html).toContain('Total SaaS Tenants')
    expect(html).toContain('Verified Organisations')
    expect(html).toContain('Pending Verification')
    expect(html).toContain('Suspended / Actioned')
    expect(html).toContain('Academies')
    expect(html).toContain('Venues &amp; Turfs')
    expect(html).toContain('Coaches')
    expect(html).toContain('Tournaments')
  })

  it('renders seed tenant organisations with accurate identity, sports, and city hubs', () => {
    const html = renderToStaticMarkup(
      <AdminTenantManagementDesk operatorEmail="superadmin@khelgrid.com" />
    )

    // NCR Elite Cricket & Multisport Academy
    expect(html).toContain('NCR Elite Cricket &amp; Multisport Academy')
    expect(html).toContain('ncr-elite-cricket-academy')
    expect(html).toContain('New Delhi')
    expect(html).toContain('Cricket')

    // Bangalore Turf & Football Arena
    expect(html).toContain('Bangalore Turf &amp; Football Arena')
    expect(html).toContain('bangalore-turf-and-football-arena')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('Football')

    // Pullela Badminton Excellence Centre
    expect(html).toContain('Pullela Badminton Excellence Centre')
    expect(html).toContain('Hyderabad')
    expect(html).toContain('Badminton')
  })

  it('supports administrative filtering by tenant type, status, and search query', () => {
    const all = getAdminTenants()
    expect(all.length).toBeGreaterThanOrEqual(10)

    const academiesOnly = getAdminTenants({ tenantType: 'academy' })
    expect(academiesOnly.length).toBeGreaterThan(0)
    expect(academiesOnly.every(t => t.tenantType === 'academy')).toBe(true)

    const venuesOnly = getAdminTenants({ tenantType: 'venue' })
    expect(venuesOnly.length).toBeGreaterThan(0)
    expect(venuesOnly.every(t => t.tenantType === 'venue')).toBe(true)

    const searchResult = getAdminTenants({ query: 'Kolhapur' })
    expect(searchResult.length).toBe(1)
    expect(searchResult[0]?.name).toContain('Kushti Akhada')

    const sportsResult = getAdminTenants({ sport: 'Cricket' })
    expect(sportsResult.some(t => t.name.includes('NCR Elite'))).toBe(true)
  })

  it('provides detailed tenant inspection including staff roster and physical branches', () => {
    const tenantDetail = getAdminTenantDetails('org-ncr-elite-01')
    expect(tenantDetail).not.toBeNull()
    expect(tenantDetail?.name).toBe('NCR Elite Cricket & Multisport Academy')
    expect(tenantDetail?.members.length).toBeGreaterThan(0)
    expect(tenantDetail?.members.some(m => m.role === 'head_coach')).toBe(true)
    expect(tenantDetail?.units.length).toBe(3)
    expect(tenantDetail?.accreditationDetails?.federationAffiliation).toContain('DDCA')
  })

  it('executes administrative governance verification and records audit trail', () => {
    const tenantId = 'org-kolhapur-kushti-06'
    const before = getAdminTenantDetails(tenantId)
    expect(before?.verificationStatus).toBe('pending_review')

    const res = updateTenantVerificationStatus(
      tenantId,
      'verified',
      'audit.officer@khelgrid.com',
      'Maharashtra State Wrestling Association (MSWA)',
      'Verified trust deed and affiliation records.'
    )
    expect(res.success).toBe(true)

    const after = getAdminTenantDetails(tenantId)
    expect(after?.verificationStatus).toBe('verified')
    expect(after?.accreditationDetails?.accreditationBody).toBe('Maharashtra State Wrestling Association (MSWA)')
    expect(after?.auditTrail.length).toBeGreaterThan(before?.auditTrail.length || 0)
    expect(after?.auditTrail[0]?.action).toBe('VERIFICATION_SET_TO_VERIFIED')
  })

  it('executes administrative suspension and records compliance justification', () => {
    const tenantId = 'org-ncr-elite-01'
    const before = getAdminTenantDetails(tenantId)
    expect(before?.status).toBe('active')

    const res = updateTenantLifecycleStatus(
      tenantId,
      'suspended',
      'safety.lead@khelgrid.com',
      'Emergency maintenance safety review required.'
    )
    expect(res.success).toBe(true)

    const after = getAdminTenantDetails(tenantId)
    expect(after?.status).toBe('suspended')
    expect(after?.auditTrail[0]?.action).toBe('STATUS_CHANGE_TO_SUSPENDED')
    expect(after?.auditTrail[0]?.note).toContain('Emergency maintenance')

    // Reinstatement
    const reinstateRes = updateTenantLifecycleStatus(
      tenantId,
      'active',
      'safety.lead@khelgrid.com',
      'Facility repairs completed and certified.'
    )
    expect(reinstateRes.success).toBe(true)
    expect(getAdminTenantDetails(tenantId)?.status).toBe('active')
  })

  it('adds administrative internal notes to tenant audit trail', () => {
    const tenantId = 'org-blr-turf-02'
    const res = addTenantAdminNote(
      tenantId,
      'superadmin@khelgrid.com',
      'Quarterly ground dimension inspection scheduled for next week.'
    )
    expect(res.success).toBe(true)

    const detail = getAdminTenantDetails(tenantId)
    expect(detail?.auditTrail[0]?.action).toBe('ADMIN_INTERNAL_NOTE')
    expect(detail?.auditTrail[0]?.note).toContain('Quarterly ground dimension')
  })

  it('exports tenant directory in valid RFC 4180 CSV format', () => {
    const tenants = getAdminTenants()
    const csv = exportTenantsToCsv(tenants)

    expect(csv).toContain('Tenant ID,Slug,Organisation Name,Tenant Type,Sport,City')
    expect(csv).toContain('ncr-elite-cricket-academy')
    expect(csv).toContain('bangalore-turf-and-football-arena')
    expect(csv).toContain('Cricket')
    expect(csv).toContain('New Delhi')
  })
})
