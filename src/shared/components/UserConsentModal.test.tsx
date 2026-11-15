import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import UserConsentModal, {
  USER_CONSENT_STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  USER_SPORTS_PASS_STORAGE_KEY,
  SPORTS_PASS_ROLES,
  SPORTS_PASS_DISCIPLINES,
  SPORTS_PASS_CITIES,
} from './UserConsentModal'

describe('UserConsentModal & Sports Pass', () => {
  it('exports expected storage key, sports pass key, and policy version constants', () => {
    expect(USER_CONSENT_STORAGE_KEY).toBe('khelgrid_user_policy_consent_v1')
    expect(CURRENT_CONSENT_VERSION).toBe('2026.1')
    expect(USER_SPORTS_PASS_STORAGE_KEY).toBe('khelgrid_user_sports_pass_v1')
    expect(SPORTS_PASS_ROLES.length).toBe(4)
    expect(SPORTS_PASS_DISCIPLINES.length).toBeGreaterThanOrEqual(10)
    expect(SPORTS_PASS_CITIES).toContain('Delhi NCR')
    expect(SPORTS_PASS_CITIES).toContain('Bengaluru')
  })

  it('renders null when closed', () => {
    const html = renderToStaticMarkup(
      <UserConsentModal isOpen={false} forceOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders Step 1 Sports Pass tab with roles, sports grid, and city hubs when open', () => {
    const html = renderToStaticMarkup(
      <UserConsentModal isOpen={true} onClose={vi.fn()} initialTab="sports_pass" />
    )

    // Dialog accessibility and modal presence
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="user-consent-title"')

    // Badges and title
    expect(html).toContain('KhelGrid Standards')
    expect(html).toContain('DPDP Act 2023 Compliant')
    expect(html).toContain('Welcome to KhelGrid · Sports Opportunity Network')

    // Tab buttons
    expect(html).toContain('1. Sports Pass &amp; Interests (खेलग्रिड पास)')
    expect(html).toContain('2. Rules &amp; Privacy (नियम व सुरक्षा)')

    // 4 Roles
    expect(html).toContain("I&#x27;m an Athlete / Player")
    expect(html).toContain('Sports Parent')
    expect(html).toContain('Turf &amp; Weekend Player')
    expect(html).toContain('Coach / Academy / Scout')

    // Sports Disciplines with vernacular names
    expect(html).toContain('Cricket')
    expect(html).toContain('क्रिकेट')
    expect(html).toContain('Football')
    expect(html).toContain('फुटबॉल')
    expect(html).toContain('Badminton')
    expect(html).toContain('बैडमिंटन')
    expect(html).toContain('Kabaddi')
    expect(html).toContain('कबड्डी')

    // Cities
    expect(html).toContain('Delhi NCR')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('Mumbai')

    // Actions
    expect(html).toContain('Review Rules &amp; Policies →')
    expect(html).toContain('Accept &amp; Continue')
  })

  it('renders Step 2 Rules & Privacy tab with 4 trust pillars and policy links', () => {
    const html = renderToStaticMarkup(
      <UserConsentModal isOpen={true} onClose={vi.fn()} initialTab="rules_privacy" />
    )

    // 4 Key Trust & Compliance Pillars
    expect(html).toContain('Child Safety &amp; Youth Protection')
    expect(html).toContain('POCSO')
    expect(html).toContain('Transparent Terms &amp; Privacy')
    expect(html).toContain('IPR &amp; Authentic Telemetry')
    expect(html).toContain('Local Preferences &amp; 0ms Caching')

    // Quick links to official policies
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/ipr-policy"')
    expect(html).toContain('href="/verification-policy"')
    expect(html).toContain('href="/posh-policy"')

    // Primary action buttons
    expect(html).toContain('Accept &amp; Continue')
    expect(html).toContain('Customize Preferences')
    expect(html).toContain('Back to Sports Pass')
  })
})
