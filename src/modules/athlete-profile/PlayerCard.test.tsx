import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlayerCard } from './PlayerCard'
import { generateKhelId } from '../../shared/utils/khelId'
import { SHOWCASE_ATHLETE_PROFILES } from '../../integrations/supabase/athlete-profile-client'

describe('PlayerCard (FIFA Trading Card Component & Digital Khel ID)', () => {
  it('generates consistent standardized Khel ID format KG-2026-{STATE}-{SERIAL}', () => {
    const rohitKhelId = generateKhelId({ state: 'Delhi', username: 'rohit-verma' })
    expect(rohitKhelId).toMatch(/^KG-2026-DEL-\d{5}$/)

    const priyaKhelId = generateKhelId({ state: 'Telangana', username: 'priya-nair' })
    expect(priyaKhelId).toMatch(/^KG-2026-TG-\d{5}$/)

    // Preserves pre-assigned Khel ID
    const customId = generateKhelId({ username: 'test-ath', khelId: 'KG-2026-HR-99881' })
    expect(customId).toBe('KG-2026-HR-99881')
  })

  it('renders trading card for Rohit Verma with calculated OVR, position, flag, Khel ID, and scannable QR', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['rohit-verma']
    const html = renderToStaticMarkup(<PlayerCard profile={profile} />)

    expect(html).toContain('Rohit Verma')
    expect(html).toContain('Cricket')
    expect(html).toContain('Sonnet Cricket Club')
    expect(html).toContain('🇮🇳')
    expect(html).toContain('PAC')
    expect(html).toContain('STA')
    expect(html).toContain('PWR')
    expect(html).toContain('EXP')
    expect(html).toContain('TEC')
    expect(html).toContain('ACH')
    expect(html).toContain('KHEL ID (खेल आईडी)')
    expect(html).toContain('KG-2026-DEL-')
    expect(html).toContain('card-qr-box')
    expect(html).toContain('Download Card (PNG)')
    expect(html).toContain('Download (SVG)')
    expect(html).toContain('WhatsApp Card')
    expect(html).toContain('Copy Link')
  })

  it('renders compact mode without action buttons when requested', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['priya-nair']
    const html = renderToStaticMarkup(<PlayerCard profile={profile} showShareActions={false} compact />)

    expect(html).toContain('Priya Nair')
    expect(html).toContain('is-compact')
    expect(html).toContain('KG-2026-TG-')
    expect(html).not.toContain('Download Card (PNG)')
    expect(html).not.toContain('Download (SVG)')
  })

  it('renders dossier reference stamp when provided in profile metadata', () => {
    const profile = {
      ...SHOWCASE_ATHLETE_PROFILES['rohit-verma'],
      dossierReference: 'KG-DOS-20261115-4A9B',
      dossierGeneratedAt: '15 Nov 2026, 02:40 PM IST',
    }
    const html = renderToStaticMarkup(<PlayerCard profile={profile} />)

    expect(html).toContain('DOSSIER REF: KG-DOS-20261115-4A9B')
    expect(html).toContain('15 Nov 2026')
  })

  it('renders technical scouting indicators chip when sport technical attributes are present', () => {
    const profile = {
      ...SHOWCASE_ATHLETE_PROFILES['rohit-verma'],
      battingStyle: 'Left-Hand Bat (LHB)',
      bowlingStyle: 'Right-Arm Fast (135+ km/h)',
    }
    const html = renderToStaticMarkup(<PlayerCard profile={profile} />)

    expect(html).toContain('card-tech-role')
    expect(html).toContain('Batting: Left-Hand Bat (LHB) · Bowling: Right-Arm Fast (135+ km/h)')
  })

  it('does not display a coach endorsement supplied only by client-side profile data', () => {
    const profile = {
      ...SHOWCASE_ATHLETE_PROFILES['rohit-verma'],
      coachEndorsement: {
        endorsed: true,
        coachName: 'Coach Zaheer Farooq',
        coachLicense: 'NIS-EXAMPLE-001',
      },
    }
    const html = renderToStaticMarkup(<PlayerCard profile={profile} />)

    // Endorsement claims must come from a trusted server projection, not
    // showcase fixtures or arbitrary browser-provided profile fields.
    expect(html).not.toContain('card-coach-endorsed-chip')
    expect(html).not.toContain('NIS Coach Endorsed')
    expect(html).not.toContain('Coach Zaheer Farooq')
  })
})
