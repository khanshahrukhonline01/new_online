import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRef } from 'react'
import WorkspaceHeader from './WorkspaceHeader'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { CanonicalWorkspaceId } from './workspaceHeaderEngine'

const noop = vi.fn()

function renderHeader(overrides: Partial<Parameters<typeof WorkspaceHeader>[0]> = {}) {
  return renderToStaticMarkup(
    <WorkspaceHeader
      path="/"
      isMobile={false}
      menuOpen={false}
      sidebarCollapsed={true}
      menuToggleRef={createRef<HTMLButtonElement>()}
      onToggleMainMenu={noop}
      onNavigate={noop}
      onOpenSearch={noop}
      onOpenNotifications={noop}
      onOpenFeedback={noop}
      authUser={null}
      userMenuOpen={false}
      onToggleUserMenu={noop}
      onCloseUserMenu={noop}
      onOpenLogin={noop}
      onOpenSignup={noop}
      onSignOut={noop}
      onOpenGoPro={noop}
      {...overrides}
    />,
  )
}

const signedInCoach: AuthUserProfile = {
  id: 'usr-coach-1',
  email: 'coach@khelgrid.com',
  fullName: 'Vikram Rathore',
  name: 'Vikram Rathore',
  role: 'coach',
  isVerified: true,
  createdAt: '2026-11-01T00:00:00Z',
}

describe('WorkspaceHeader', () => {
  it('renders discovery navigation cleanly when guest on home route', () => {
    const html = renderHeader({ path: '/' })
    expect(html).toContain('header-play-pill')
    expect(html).toContain('href="/play"')
    expect(html).toContain('header-workspace-pill')
    expect(html).toContain('href="/workspace"')
    expect(html).toContain('id="wh-persona-trigger"')
    expect(html).toContain('id="navbar-settings-btn"')
    expect(html).toContain('List on KhelGrid')
    expect(html).not.toContain('wh-kpi-strip')
  })

  it.each<[CanonicalWorkspaceId, string, string[]]>([
    ['athlete', '/workspace/athlete/overview', ['Athlete workspace KPIs', 'Profile', 'Saved', 'Sports CV']],
    ['academy', '/workspace/academy/batches', ['Academy workspace KPIs', 'Branches', 'Coaches', 'Batches']],
    ['venue', '/workspace/turf/calendar', ['Venue workspace KPIs', 'Facilities', 'Enquiries', 'Bookings']],
    ['coach', '/workspace/coach/overview', ['Coach workspace KPIs', 'Badge', 'Enquiries', 'Coach Hub']],
    ['trial_organiser', '/workspace/tournament/overview', ['Trial Organiser workspace KPIs', 'Trials', 'Squads', 'Updates']],
    ['creator', '/workspace/creator/campaigns', ['Creator workspace KPIs', 'Campaigns', 'Deliverables', 'Rewards']],
  ])('dynamically displays workspace-specific KPIs and CTA for %s persona', (persona, path, expectedTokens) => {
    const html = renderHeader({
      path,
      activePersona: persona,
      authUser: signedInCoach,
    })

    expect(html).toContain(`data-active-persona="${persona}"`)
    expect(html).toContain('wh-kpi-strip')
    for (const token of expectedTokens) {
      expect(html).toContain(token)
    }
    // Operational routes hide marketing Play/Go Pro clutter
    expect(html).not.toContain('header-play-pill')
    expect(html).not.toContain('header-go-pro')
  })

  it('dynamically renders persona-specific context menu items in the user dropdown', () => {
    const html = renderHeader({
      path: '/workspace/turf/calendar',
      activePersona: 'venue',
      authUser: signedInCoach,
      userMenuOpen: true,
    })

    expect(html).toContain('VENUE WORKSPACE')
    expect(html).toContain('Venue Pillars')
    expect(html).toContain('Facilities')
    expect(html).toContain('Enquiries')
    expect(html).toContain('Bookings')
    expect(html).toContain('Turf Slot Calendar')
    expect(html).toContain('Gate QR Check-In')
  })

  it('renders formatted unread notifications badge when unreadNotifCount > 0', () => {
    const html = renderHeader({ unreadNotifCount: 12 })
    expect(html).toContain('wh-notif-badge')
    expect(html).toContain('>9+<')
  })

  it('preserves single-row desktop flex/grid rules for header-zone-right, search icon button, brand, and primary CTA', async () => {
    // @ts-expect-error - node built-in
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in
    const path = await import('node:path')

    const workspaceHeaderCss = fs.readFileSync(path.resolve('src/shared/components/WorkspaceHeader.css'), 'utf-8')
    const discoveryCss = fs.readFileSync(path.resolve('src/styles/discovery.css'), 'utf-8')

    expect(workspaceHeaderCss).toContain('.site-header.kg-workspace-header .header-zone-right')
    expect(workspaceHeaderCss).toContain('flex-wrap: nowrap')
    expect(workspaceHeaderCss).toContain('.site-header.kg-workspace-header .header-search-icon-only')
    expect(workspaceHeaderCss).toContain('width: 38px')
    expect(discoveryCss).toContain('.site-header .brand')
    expect(discoveryCss).toContain('text-decoration: none')
    expect(discoveryCss).toContain('.site-header .header-submit-direct')
    expect(discoveryCss).toContain('.header-utility-cluster')
  })
})
