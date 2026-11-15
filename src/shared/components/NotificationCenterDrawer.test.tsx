import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NotificationCenterDrawer from './NotificationCenterDrawer'

describe('NotificationCenterDrawer', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <NotificationCenterDrawer isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders modal dialog, category filter tabs, and baseline notifications when open', () => {
    const html = renderToStaticMarkup(
      <NotificationCenterDrawer isOpen={true} onClose={vi.fn()} onNavigate={vi.fn()} />
    )

    // Structural elements & Accessibility
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="Notification Center"')
    expect(html).toContain('aria-label="Close notifications"')

    // Header & Summary
    expect(html).toContain('Notifications')
    expect(html).toContain('Mark all as read')

    // Filter tabs
    expect(html).toContain('All')
    expect(html).toContain('Trials')
    expect(html).toContain('Turfs')
    expect(html).toContain('Matches')
    expect(html).toContain('Community')

    // Baseline alert items
    expect(html).toContain('Delhi State U-17 Football Trials Registration Open')
    expect(html).toContain('ISL 2026 Match Center &amp; Screening Lounges')
    expect(html).toContain('New Venue Added: FerroHub Sports Arena')
    expect(html).toContain('Pickup Match: Community Pickleball Doubles')
    expect(html).toContain('Dynamic City Hubs are Now Live')

    // Footer actions
    expect(html).toContain('Explore Trials')
    expect(html).toContain('Match Center')
    expect(html).toContain('Browse Venues')
  })
})
