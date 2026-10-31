import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlayerCard } from './PlayerCard'
import { SHOWCASE_ATHLETE_PROFILES } from '../../integrations/supabase/athlete-profile-client'

describe('PlayerCard (FIFA Trading Card Component)', () => {
  it('renders trading card for Rohit Verma with calculated OVR, position, flag, and attributes', () => {
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
    expect(html).toContain('Download Card')
    expect(html).toContain('WhatsApp Card')
    expect(html).toContain('Copy Link')
  })

  it('renders compact mode without action buttons when requested', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['priya-nair']
    const html = renderToStaticMarkup(<PlayerCard profile={profile} showShareActions={false} compact />)

    expect(html).toContain('Priya Nair')
    expect(html).toContain('is-compact')
    expect(html).not.toContain('Download Card')
  })
})
