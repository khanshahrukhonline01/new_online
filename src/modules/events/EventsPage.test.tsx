import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BASELINE_EVENTS, generateEventIcs, saveEventRegistrationInquiry } from './eventsData'
import { EventsPage } from './EventsPage'
import { EventRegistrationModal } from './EventRegistrationModal'

describe('Events & State Tournaments Module', () => {
  it('has comprehensive baseline tournament data with verified criteria', () => {
    expect(BASELINE_EVENTS.length).toBeGreaterThanOrEqual(10)

    const subroto = BASELINE_EVENTS.find(e => e.slug.includes('subroto'))
    expect(subroto).toBeDefined()
    expect(subroto?.sanctioningBody).toBe('AIFF')
    expect(subroto?.ageCategories).toContain('U-17')
    expect(subroto?.verifiedBadge).toBe(true)

    const kiyg = BASELINE_EVENTS.find(e => e.slug.includes('khelo-india'))
    expect(kiyg).toBeDefined()
    expect(kiyg?.sanctioningBody).toBe('Khelo India / SAI')
  })

  it('generates valid RFC-5545 iCalendar (.ics) content for events', () => {
    const event = BASELINE_EVENTS[0]
    const ics = generateEventIcs(event)

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain(`UID:khelgrid-event-${event.id}@khelgrid.com`)
    expect(ics).toContain(`SUMMARY:[KhelGrid] ${event.title}`)
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('generates trackable tournament inquiry IDs on submission', () => {
    const inquiry = saveEventRegistrationInquiry({
      eventId: 'evt-test-1',
      eventTitle: 'Test National Championship',
      athleteName: 'Rohan Verma',
      athleteAge: '16',
      gender: 'Male',
      sport: 'Athletics',
      city: 'Delhi NCR',
      phone: '9876543210',
      email: 'rohan@example.com',
    })

    expect(inquiry.id).toMatch(/^KG-EVT-[A-Z0-9]+-\d+$/)
    expect(inquiry.athleteName).toBe('Rohan Verma')
    expect(inquiry.createdAt).toBeDefined()
  })

  it('renders EventsPage markup with hero metrics and tournament cards', () => {
    const markup = renderToStaticMarkup(<EventsPage />)

    expect(markup).toContain('National Events &amp; State Tournaments Calendar.')
    expect(markup).toContain('140+')
    expect(markup).toContain('₹2.5 Cr+')
    expect(markup).toContain('Subroto Cup International Football Tournament')
    expect(markup).toContain('Khelo India Youth Games')
    expect(markup).toContain('Official Rulebook')
    expect(markup).toContain('.ICS')
  })

  it('renders EventRegistrationModal when open', () => {
    const event = BASELINE_EVENTS[0]
    const markup = renderToStaticMarkup(
      <EventRegistrationModal
        event={event}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(markup).toContain('Register &amp; Inquire for Championship')
    expect(markup).toContain(event.title)
    expect(markup).toContain('Athlete Full Name')
    expect(markup).toContain('WhatsApp Contact Phone')
    expect(markup).toContain('DPDP Act 2023 &amp; POCSO Safe Sports')
  })
})
