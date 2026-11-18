import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TrustPage from './TrustPage'

describe('TrustPage', () => {
  it('renders comprehensive trust, anti-fraud, and athlete safeguarding protocols', () => {
    const html = renderToStaticMarkup(<TrustPage />)

    expect(html).toContain('KhelGrid Trust &amp; Athlete Safeguarding Center')
    expect(html).toContain('Anti-Fraud Selection Trial Verification')
    expect(html).toContain('Minor Athlete Safeguarding &amp; POCSO Compliance')
    expect(html).toContain('Venue &amp; Turf Verification Standard')
    expect(html).toContain('Scientific Research Ethics (KhelChronicle)')
    expect(html).toContain('Within 24 Hours')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).not.toContain('coming soon')
    expect(html).not.toContain('This page does not verify')
  })
})
