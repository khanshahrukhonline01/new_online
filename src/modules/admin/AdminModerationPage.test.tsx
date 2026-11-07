import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminModerationPage } from './AdminModerationPage'
import * as authClient from '../../integrations/supabase/auth-client'
import * as publicClient from '../../integrations/supabase/public-client'

describe('AdminModerationPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders restricted access notice when user is not an admin', () => {
    vi.spyOn(authClient, 'getStoredUser').mockReturnValue(null)
    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).toContain('Administrative Moderation Desk')
    expect(html).toContain('Access to the central moderation desk is restricted')
    expect(html).toContain('Sign In as Demo Admin')
  })

  it('renders restricted access notice when user has role athlete', () => {
    vi.spyOn(authClient, 'getStoredUser').mockReturnValue({
      id: 'usr-athlete-1',
      name: 'Aarav Sharma',
      email: 'athlete@khelgrid.com',
      role: 'athlete',
      fullName: 'Aarav Sharma',
      isVerified: true,
      createdAt: '2026-11-01T00:00:00Z',
    })
    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).toContain('Access to the central moderation desk is restricted')
  })

  it('renders full moderation workspace when user has admin role', () => {
    vi.spyOn(authClient, 'getStoredUser').mockReturnValue({
      id: 'usr-admin-1',
      name: 'Chief Moderator',
      email: 'admin@khelgrid.com',
      role: 'admin',
      fullName: 'Chief Moderator',
      isVerified: true,
      createdAt: '2026-11-01T00:00:00Z',
    })

    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).toContain('Central Administrative Desk')
    expect(html).toContain('Platform Moderation &amp; Trust Desk')
    expect(html).toContain('Submissions Queue')
    expect(html).toContain('Entity Claims &amp; Proof')
    expect(html).toContain('Trust &amp; Safety Scam Desk')
    expect(html).toContain('Athlete Badge Verification')
  })

  it('interacts with moderation API helpers properly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    const queue = await publicClient.getAdminModerationQueue()
    expect(queue.stats).toBeDefined()
    expect(queue.stats.totalVenues).toBeGreaterThan(0)
    expect(queue.pendingSubmissions.length).toBeGreaterThan(0)

    const subRes = await publicClient.moderateListingSubmission('sub-001', 'approved', 'Verified')
    expect(subRes).toBe(true)

    const clmRes = await publicClient.moderateVerificationClaim('clm-001', 'verified', 'Verified')
    expect(clmRes).toBe(true)

    const repRes = await publicClient.moderateListingReport('rep-001', 'resolved', 'Resolved')
    expect(repRes).toBe(true)
  }, 15000)
})
