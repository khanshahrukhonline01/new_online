import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import UserConsentModal, {
  USER_CONSENT_STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
} from './UserConsentModal'

describe('UserConsentModal', () => {
  it('exports expected storage key and policy version constants', () => {
    expect(USER_CONSENT_STORAGE_KEY).toBe('khelgrid_user_policy_consent_v1')
    expect(CURRENT_CONSENT_VERSION).toBe('2026.1')
  })

  it('renders null when closed', () => {
    const html = renderToStaticMarkup(
      <UserConsentModal isOpen={false} forceOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders welcome card, DPDP compliance badge, and policy rules when open', () => {
    const html = renderToStaticMarkup(
      <UserConsentModal isOpen={true} onClose={vi.fn()} />
    )

    // Dialog accessibility and modal presence
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="user-consent-title"')

    // Badges and title
    expect(html).toContain('KhelGrid Standards')
    expect(html).toContain('DPDP Act 2023 Compliant')
    expect(html).toContain('Welcome to KhelGrid · Sports Opportunity Network')

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
  })
})
