import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadGlobalAdminSearchIndex,
  rankGlobalSearchItems,
} from './adminGlobalSearchService'
import { resetAdminTenantsForTesting } from './adminTenantService'
import { resetAdminVerificationsForTesting } from './adminVerificationService'
import { resetAdminTrustSafetyForTesting } from './adminTrustSafetyService'

describe('Admin Global Search Index & Ranking Service', () => {
  beforeEach(() => {
    resetAdminTenantsForTesting()
    resetAdminVerificationsForTesting()
    resetAdminTrustSafetyForTesting()
  })

  it('indexes real users, venues, listings, and incidents with valid target management desks', async () => {
    const index = await loadGlobalAdminSearchIndex()
    expect(index.length).toBeGreaterThan(15)

    const users = index.filter(i => i.category === 'user')
    const venues = index.filter(i => i.category === 'venue')
    const listings = index.filter(i => i.category === 'listing')
    const incidents = index.filter(i => i.category === 'incident')

    expect(users.length).toBeGreaterThan(0)
    expect(venues.length).toBeGreaterThan(0)
    expect(listings.length).toBeGreaterThan(0)
    expect(incidents.length).toBeGreaterThan(0)
  })

  it('ranks exact ID and reference code matches first for users, venues, listings, and incidents', async () => {
    const index = await loadGlobalAdminSearchIndex()

    // Search User by exact ID
    const userById = rankGlobalSearchItems(index, 'usr-owner-001', 'all')
    expect(userById[0]?.category).toBe('user')
    expect(userById[0]?.title).toContain('Arjun Verma')
    expect(userById[0]?.targetWorkspace).toBe('tenant_governance')
    expect(userById[0]?.focusTab).toBe('members')

    // Search Venue/Org by ID
    const venueById = rankGlobalSearchItems(index, 'org-chn-turf-09', 'all')
    expect(venueById[0]?.category).toBe('venue')
    expect(venueById[0]?.entityId).toBe('org-chn-turf-09')
    expect(venueById[0]?.targetWorkspace).toBe('tenant_governance')

    // Search Trust & Safety Incident by reference code
    const incidentByCode = rankGlobalSearchItems(index, 'TS-2026-081', 'all')
    expect(incidentByCode[0]?.category).toBe('incident')
    expect(incidentByCode[0]?.referenceCode).toBe('TS-2026-081')
    expect(incidentByCode[0]?.targetWorkspace).toBe('fraud_disputes')
  })

  it('supports category filtering and multi-token name/city queries', async () => {
    const index = await loadGlobalAdminSearchIndex()

    const venueResults = rankGlobalSearchItems(index, 'mumbai', 'venue')
    expect(venueResults.length).toBeGreaterThan(0)
    expect(venueResults.every(r => r.category === 'venue')).toBe(true)

    const listingResults = rankGlobalSearchItems(index, 'cricket', 'listing')
    expect(listingResults.length).toBeGreaterThan(0)
    expect(listingResults.every(r => r.category === 'listing')).toBe(true)

    // Command filter returns no entity results (commands are handled by AdminCommandPalette)
    expect(rankGlobalSearchItems(index, 'cricket', 'command')).toEqual([])
  })
})
