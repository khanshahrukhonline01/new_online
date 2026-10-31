import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SiteAnnouncementBanner from './SiteAnnouncementBanner'

describe('SiteAnnouncementBanner', () => {
  it('renders seasonal announcement banner with badge, title, and CTA link', () => {
    const html = renderToStaticMarkup(<SiteAnnouncementBanner />)

    // Structural wrapper
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="Seasonal announcement"')
    expect(html).toContain('site-announcement-banner')

    // Content from initial baseline
    expect(html).toContain('State Trials Open')
    expect(html).toContain('Delhi State U-17 Football Trials Registration Open')
    expect(html).toContain('View Trials')
    expect(html).toContain('href="/opportunities?city=Delhi"')

    // Dismiss button
    expect(html).toContain('aria-label="Dismiss announcement"')
    expect(html).toContain('title="Dismiss announcement"')
  })

  it('applies custom className when provided', () => {
    const html = renderToStaticMarkup(<SiteAnnouncementBanner className="custom-banner-class" />)
    expect(html).toContain('custom-banner-class')
  })
})
