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

  it('renders authentic email/password onboarding controls without demo auth bypasses', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage />)

    expect(html).toContain('Zero Platform Commission Guarantee')
    expect(html).toContain('Launch Your Verified SaaS Workspace (30 Seconds)')
    expect(html).toContain('Official Account Email')
    expect(html).toContain('Account Password (min 6 characters)')
    expect(html).toContain('Use 1-Click Magic Email Link instead of password')
    expect(html).not.toContain('Fast-Track Demo Workspace Access')
    expect(html).not.toContain('Demo Academy:')
  })

  it('preselects role-specific fields when initialRole is provided', () => {
    const coachHtml = renderToStaticMarkup(<PartnerOnboardingPage initialRole="coach" />)
    expect(coachHtml).toContain('Full Coach Name')
    expect(coachHtml).toContain('Coaching Certification / Accreditation')

    const tournamentHtml = renderToStaticMarkup(<PartnerOnboardingPage initialRole="tournament" />)
    expect(tournamentHtml).toContain('Tournament / Sports Organisation Title')

    const orgHtml = renderToStaticMarkup(<PartnerOnboardingPage initialRole="organization" />)
    expect(orgHtml).toContain('Club / Federation / Org')
    expect(orgHtml).toContain('Organisation Subtype')
    expect(orgHtml).toContain('National / State Sports Federation')
  })

  it('renders authentic email/password sign in form when initialMode is login', () => {
    const html = renderToStaticMarkup(<PartnerOnboardingPage initialMode="login" initialRole="venue" />)

    expect(html).toContain('Registered Email Address')
    expect(html).toContain('Account Password')
    expect(html).toContain('Sign In to Turf &amp; Venue Workspace')
    expect(html).toContain('Send 1-Click Magic Login Link')
  })
})
