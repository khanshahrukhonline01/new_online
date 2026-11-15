import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TrialAlertActions } from './TrialAlertActions'

describe('TrialAlertActions (Google Calendar, iCal, WhatsApp Alert Engine)', () => {
  it('renders Google Calendar, iCal, and WhatsApp alert buttons with encoded parameters', () => {
    const html = renderToStaticMarkup(
      <TrialAlertActions
        title="SAI NCOE Athletics National Selection Trials 2026"
        slug="sai-ncoe-athletics-2026"
        startsAt="2026-11-15T09:00:00+05:30"
        deadlineDate="2026-11-10T18:00:00+05:30"
        city="Patiala"
        venueName="Netaji Subhas National Institute of Sports"
      />,
    )

    expect(html).toContain('Trial Alerts:')
    expect(html).toContain('WhatsApp Alert')
    expect(html).toContain('Google Cal')
    expect(html).toContain('iCal (.ics)')
    expect(html).toContain('Copy')

    // Google Calendar URL verification
    expect(html).toContain('calendar.google.com/calendar/render')
    expect(html).toContain('SAI%20NCOE%20Athletics')

    // WhatsApp URL verification
    expect(html).toContain('https://wa.me/?text=')
    expect(html).toContain('Patiala')
  })
})
