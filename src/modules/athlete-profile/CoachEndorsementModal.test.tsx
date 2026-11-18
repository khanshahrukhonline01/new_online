import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoachEndorsementModal } from './CoachEndorsementModal'
import { SHOWCASE_ATHLETE_PROFILES } from '../../integrations/supabase/athlete-profile-client'

describe('CoachEndorsementModal (1-Tap WhatsApp Relay & Verification Signature)', () => {
  it('returns null when isOpen is false', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['rohit-verma']
    const html = renderToStaticMarkup(
      <CoachEndorsementModal profile={profile} isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders endorsement intake form and WhatsApp coach relay link when isOpen is true', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['rohit-verma']
    const html = renderToStaticMarkup(
      <CoachEndorsementModal profile={profile} isOpen={true} onClose={vi.fn()} />
    )

    // Verify modal header
    expect(html).toContain('NIS &amp; FEDERATION ACCREDITATION RELAY')
    expect(html).toContain('Coach &amp; Selector Endorsement')
    expect(html).toContain('Rohit Verma')

    // Verify WhatsApp coach invite relay
    expect(html).toContain('Send Endorsement Request to Coach')
    expect(html).toContain('Send via WhatsApp')
    expect(html).toContain('Copy Coach Invite Link')

    // Verify Coach Direct Endorsement Form
    expect(html).toContain('OR COACH CAN SIGN OFF BELOW')
    expect(html).toContain('Coach Full Name *')
    expect(html).toContain('License / Accreditation *')
    expect(html).toContain('NIS Patiala Senior Diploma')
    expect(html).toContain('BCCI Level 2 Coach')
    expect(html).toContain('AIFF A-Diploma')
    expect(html).toContain('Sign &amp; Endorse Candidate')
  })
})
