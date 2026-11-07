import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import UserDashboardPage from './UserDashboardPage'
import * as authClient from '../../integrations/supabase/auth-client'

describe('UserDashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('renders guest onboarding hero with demo personas and sign-in triggers when logged out', () => {
    vi.spyOn(authClient, 'getStoredAuthUser').mockReturnValue(null)

    const html = renderToStaticMarkup(<UserDashboardPage />)

    expect(html).toContain('Your Personal Sports Dashboard')
    expect(html).toContain('Sign In to KhelGrid')
    expect(html).toContain('Create Free Athlete Account')
    expect(html).toContain('Athlete (Aarav Sharma)')
    expect(html).toContain('Turf Partner (FSV Sports)')
    expect(html).toContain('Platform Admin')
    expect(html).toContain('Digital Sports CV')
    expect(html).toContain('Essential Quick Actions')
  })

  it('renders personalized athlete dashboard with identity badge and KPIs when logged in', () => {
    vi.spyOn(authClient, 'getStoredAuthUser').mockReturnValue({
      id: 'usr-athlete-1',
      name: 'Aarav Sharma',
      fullName: 'Aarav Sharma',
      email: 'aarav@khelgrid.com',
      role: 'athlete',
      city: 'Delhi NCR',
      phone: '+91 98765 43210',
      preferredSports: ['Cricket'],
      isVerified: true,
      createdAt: '2026-11-01T00:00:00Z',
    })

    const html = renderToStaticMarkup(<UserDashboardPage />)

    expect(html).toContain('Welcome back, Aarav Sharma!')
    expect(html).toContain('Delhi NCR')
    expect(html).toContain('aarav@khelgrid.com')
    expect(html).toContain('Verified Member')
    expect(html).toContain('View Public Card')
    expect(html).toContain('Edit Sports CV')
    expect(html).toContain('Digital Sports CV')
    expect(html).toContain('Saved Items &amp; Deadlines')
    expect(html).toContain('Joined Matches')
    expect(html).toContain('NIS Verification')
    expect(html).toContain('Sports CV Builder')
    expect(html).toContain('Selection Trials')
    expect(html).toContain('Book Turfs &amp; Grounds')
  })

  it('renders host button when user has host role', () => {
    vi.spyOn(authClient, 'getStoredAuthUser').mockReturnValue({
      id: 'usr-host-1',
      name: 'FSV Arena Bengaluru',
      fullName: 'FSV Arena Bengaluru',
      email: 'host@khelgrid.com',
      role: 'host',
      city: 'Bengaluru',
      isVerified: true,
      createdAt: '2026-11-01T00:00:00Z',
    })

    const html = renderToStaticMarkup(<UserDashboardPage />)

    expect(html).toContain('Welcome back, FSV Arena Bengaluru!')
    expect(html).toContain('Host &amp; Turfs Hub')
  })
})
