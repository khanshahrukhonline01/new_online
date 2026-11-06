import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import HostDashboardPage from './HostDashboardPage'

describe('HostDashboardPage Partner & Host Hub', () => {
  it('renders partner hero banner, verified badge, and quick actions', () => {
    const html = renderToStaticMarkup(<HostDashboardPage />)

    // Eyebrow and header
    expect(html).toContain('PARTNER HUB · SPORTS HOST PORTAL')
    expect(html).toContain('Verified Partner')
    expect(html).toContain('Bengaluru, Karnataka')
    expect(html).toContain('Partner Support')
  })

  it('renders all 4 tabs and primary metrics cards', () => {
    const html = renderToStaticMarkup(<HostDashboardPage />)

    // Tab buttons
    expect(html).toContain('Overview')
    expect(html).toContain('My Listings &amp; Plans')
    expect(html).toContain('Slot Bookings')
    expect(html).toContain('Earnings &amp; Receipts')

    // Metric cards
    expect(html).toContain('Active Listings')
    expect(html).toContain('Total Booking Volume')
    expect(html).toContain('Search Impressions')
    expect(html).toContain('WhatsApp Inquiries')
    expect(html).toContain('All listings verified &amp; live')
  })

  it('renders published listings with tier badges and renewal triggers', () => {
    const html = renderToStaticMarkup(<HostDashboardPage />)

    // Sample listings
    expect(html).toContain('FSV Arena Bengaluru')
    expect(html).toContain('Bengaluru Youth Sports Academy')
    expect(html).toContain('State U-17 Open Selection Trials')

    // Plan pills
    expect(html).toContain('1-Year')
    expect(html).toContain('Lifelong Listing')
    expect(html).toContain('1-Month')

    // Actions
    expect(html).toContain('Renew / Upgrade')
    expect(html).toContain('View Page')
  })
})
