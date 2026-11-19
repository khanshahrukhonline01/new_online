import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TurfSlotCalendarPage from './TurfSlotCalendarPage'
import { clearTurfSlotMemoryStore } from './turfSlotManager'

describe('TurfSlotCalendarPage UI Component', () => {
  beforeEach(() => {
    clearTurfSlotMemoryStore()
  })

  it('renders header, free launch badge, and title', () => {
    const html = renderToStaticMarkup(<TurfSlotCalendarPage />)
    expect(html).toContain('Turf &amp; Facility Slot Booking Calendar')
    expect(html).toContain('100% Free Grassroots Launch Access')
    expect(html).toContain('Manage hourly court inventory')
  })

  it('renders court tabs and active facility selector', () => {
    const html = renderToStaticMarkup(<TurfSlotCalendarPage initialVenueSlug="sree-kanteerava-stadium" />)
    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('Pitch 1 — FIFA AstroTurf 7v7')
    expect(html).toContain('Pitch 2 — Floodlit Box Cricket Arena')
    expect(html).toContain('Direct UPI Settlement')
  })

  it('renders daily KPI metrics and hourly slot cards', () => {
    const html = renderToStaticMarkup(<TurfSlotCalendarPage />)
    expect(html).toContain('Total Operating Slots')
    expect(html).toContain('Reserved Slots')
    expect(html).toContain('Open Available Slots')
    expect(html).toContain('UPI Advance Collected')
    expect(html).toContain('Projected Day Revenue')

    // Hourly slot cards
    expect(html).toContain('06:00 AM – 07:00 AM')
    expect(html).toContain('07:00 PM – 08:00 PM')
    expect(html).toContain('Book Slot')
    expect(html).toContain('Block')
  })
})
