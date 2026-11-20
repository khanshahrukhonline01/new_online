import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PartnerOnboardingPage from './PartnerOnboardingPage'

describe('PartnerOnboardingPage Component Suite', () => {
  it('renders unified partner onboarding and sign in page', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage />)

    expect(html).toContain('KHELGRID · PARTNER ONBOARDING &amp; SIGN IN')
    expect(html).toContain('India&#x27;s National Sports Operations Infrastructure')
    expect(html).toContain('New Partner Onboarding (Free)')
    expect(html).toContain('Sign In to Workspace')
  })

  it('renders all 4 SaaS organisation role selectors', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage />)

    expect(html).toContain('Sports Academy')
    expect(html).toContain('Coach &amp; Trainer')
    expect(html).toContain('Turf &amp; Venue')
    expect(html).toContain('Tournament Ops')
  })

  it('renders zero platform commission guarantee and launch action button', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage />)

    expect(html).toContain('Zero Platform Commission Guarantee')
    expect(html).toContain('Launch Your Verified SaaS Workspace (30 Seconds)')
    expect(html).toContain('Fast-Track Demo Workspace Access')
    expect(html).toContain('Demo Academy: Delhi Cricket Academy')
    expect(html).toContain('Demo Coach: Coach Zaheer Farooq')
    expect(html).toContain('Demo Turf: Sree Kanteerava Arena')
    expect(html).toContain('Demo Tournament Ops Suite')
  })

  it('renders sign in mode form when initialMode is login', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage initialMode="login" />)

    expect(html).toContain('Registered Phone Number or Email')
    expect(html).toContain('Sign In to')
  })
})
