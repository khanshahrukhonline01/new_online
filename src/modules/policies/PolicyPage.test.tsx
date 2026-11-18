import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PolicyPage from './PolicyPage'

describe('PolicyPage', () => {
  it('renders official privacy policy in effect with Google AdSense and DPDP Act disclosures', () => {
    const html = renderToStaticMarkup(<PolicyPage path="/privacy" onNavigate={() => {}} />)

    expect(html).toContain('Privacy Policy')
    expect(html).toContain('Official Published Policy · In Effect')
    expect(html).toContain('Digital Personal Data Protection Act, 2023')
    expect(html).toContain('Cookies, Web Beacons &amp; Third-Party Advertising')
    expect(html).toContain('Google')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).not.toContain('Owner and legal review required')
    expect(html).not.toContain('This development copy is not a statement')
    expect(html).not.toContain('This draft is dated')
  })

  it('renders official terms of use in effect without placeholder or draft warnings', () => {
    const html = renderToStaticMarkup(<PolicyPage path="/terms" onNavigate={() => {}} />)

    expect(html).toContain('Terms of Use')
    expect(html).toContain('Official Published Policy · In Effect')
    expect(html).toContain('Permitted Use &amp; Community Conduct')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).not.toContain('Owner and legal review required')
  })

  it('renders official cookie policy in effect', () => {
    const html = renderToStaticMarkup(<PolicyPage path="/cookies" onNavigate={() => {}} />)

    expect(html).toContain('Cookie &amp; Device Storage Policy')
    expect(html).toContain('Official Published Policy · In Effect')
    expect(html).toContain('Managing and Opting Out of Cookies')
    expect(html).not.toContain('Configuration audit required')
  })
})
