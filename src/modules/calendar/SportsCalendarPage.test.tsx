import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SportsCalendarPage from './SportsCalendarPage'

describe('SportsCalendarPage', () => {
  it('renders All-India Sports Calendar hero heading, breadcrumb, and planner badge', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('All-India Sports Calendar')
    expect(html).toContain('Sports Calendar')
    expect(html).toContain('Centralized Sports Planner · 2026–27')
    expect(html).toContain('Browse All Trials')
    expect(html).toContain('Agenda List View')
  })

  it('renders official AIU Inter-University Sports Calendar reference card with verified links', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('AIU Inter-University Sports Calendar 2026–27')
    expect(html).toContain('Official university sports calendar')
    expect(html).toContain('2026–27 Season')
    expect(html).toContain('Open official calendar')
    expect(html).toContain('Visit AIU website')
    expect(html).toContain('AIU-Sports-Calendar-2026-27-Final_compressed.pdf')
    expect(html).toContain('https://aiu.ac.in/')
  })

  it('renders monthly calendar controls, month stepper, quick month pills, and Export .ICS', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('Sports Selection Calendar')
    expect(html).toContain('Monthly View')
    expect(html).toContain('Previous month')
    expect(html).toContain('Next month')
    expect(html).toContain('November 2026')
    expect(html).toContain('Oct 2026')
    expect(html).toContain('Nov 2026')
    expect(html).toContain('Dec 2026')
    expect(html).toContain('Jan 2027')
    expect(html).toContain('Today')
    expect(html).toContain('Export .ICS')
  })

  it('renders filters bar with search, sports dropdown, cities dropdown, and type pills', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('Search academy or tournament…')
    expect(html).toContain('All Sports')
    expect(html).toContain('All Locations')
    expect(html).toContain('Trials')
    expect(html).toContain('Deadlines')
    expect(html).toContain('₹0 Free')
  })

  it('renders monthly KPI stats ribbon with event counts and deadlines', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('Active in Nov')
    expect(html).toContain('Sports Disciplines')
    expect(html).toContain('Free Entry (₹0)')
    expect(html).toContain('Closing Deadlines')
  })

  it('renders the complete 7-day calendar grid with day headers', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(html).toContain(day)
    }

    expect(html).toContain('calendar-grid-cells')
    expect(html).toContain('calendar-day-cell')
  })

  it('renders the Day Agenda Inspector with quick jumps to active selection trials', () => {
    const html = renderToStaticMarkup(<SportsCalendarPage />)

    expect(html).toContain('calendar-day-agenda-inspector')
    expect(html).toContain('Agenda for')
    expect(html).toContain('Trial / Combine Day')
    expect(html).toContain('Registration Deadline')
    expect(html).toContain('Jump to Oct 23 (SAI NCOE Trials)')
    expect(html).toContain('Jump to Nov 5 (DDCA Trials)')
    expect(html).toContain('Jump to Nov 7 (Khel Maharan 3.0)')
  })
})
