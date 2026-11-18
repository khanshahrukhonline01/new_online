import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MobileAppPage from './MobileAppPage'
import CareersPage from '../careers/CareersPage'
import ReferralsPage from '../referrals/ReferralsPage'

describe('MobileAppPage, CareersPage & ReferralsPage', () => {
  it('renders rich mobile PWA installation instructions without coming-soon placeholders', () => {
    const html = renderToStaticMarkup(<MobileAppPage />)
    expect(html).toContain('KhelGrid on Your Mobile Device')
    expect(html).toContain('Installing on Android')
    expect(html).toContain('Installing on iOS')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).not.toContain('Feature coming soon')
  })

  it('renders open careers and community roles across India', () => {
    const html = renderToStaticMarkup(<CareersPage />)
    expect(html).toContain('Build the Future of Indian Grassroots Sports')
    expect(html).toContain('Grassroots Sports Scout &amp; Ground Reporter')
    expect(html).toContain('Sports Science Research Fellow &amp; Editorial Reviewer')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).not.toContain('Feature coming soon')
  })

  it('renders referral and teammate invite tools', () => {
    const html = renderToStaticMarkup(<ReferralsPage />)
    expect(html).toContain('Invite Your Teammates, Academy &amp; Coaches')
    expect(html).toContain('https://khelgrid.com')
    expect(html).toContain('Share on WhatsApp')
    expect(html).toContain('Share on Telegram')
    expect(html).not.toContain('Feature coming soon')
  })
})
