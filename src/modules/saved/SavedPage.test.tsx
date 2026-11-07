import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SavedPage from './SavedPage'
import {
  BASELINE_SAVED_ITEMS,
  generateTrialIcsCalendar,
} from './savedData'

describe('SavedPage & savedData', () => {
  describe('savedData utilities & baseline data', () => {
    it('has well-formed baseline saved items covering all major categories', () => {
      expect(BASELINE_SAVED_ITEMS.length).toBeGreaterThanOrEqual(5)

      const categories = new Set(BASELINE_SAVED_ITEMS.map(item => item.category))
      expect(categories.has('trial')).toBe(true)
      expect(categories.has('academy')).toBe(true)
      expect(categories.has('venue')).toBe(true)
      expect(categories.has('paper')).toBe(true)

      for (const item of BASELINE_SAVED_ITEMS) {
        expect(item.id).toBeTruthy()
        expect(item.title).toBeTruthy()
        expect(item.sport).toBeTruthy()
        expect(item.href).toBeTruthy()
      }
    })

    it('generates standard RFC 5545 .ics iCalendar format for trial events', () => {
      const trialItems = BASELINE_SAVED_ITEMS.filter(item => item.category === 'trial')
      expect(trialItems.length).toBeGreaterThan(0)

      const ics = generateTrialIcsCalendar(trialItems)
      expect(ics).toContain('BEGIN:VCALENDAR')
      expect(ics).toContain('VERSION:2.0')
      expect(ics).toContain('PRODID:-//KhelGrid//Sports Trial Calendar v2026//EN')
      expect(ics).toContain('CALSCALE:GREGORIAN')
      expect(ics).toContain('BEGIN:VEVENT')
      expect(ics).toContain('SUMMARY:🏅 Trial Deadline:')
      expect(ics).toContain('DTSTART:')
      expect(ics).toContain('DTEND:')
      expect(ics).toContain('END:VEVENT')
      expect(ics).toContain('END:VCALENDAR')
    })
  })

  describe('SavedPage rendering', () => {
    it('renders header, title, tabs, controls, and baseline cards', () => {
      const html = renderToStaticMarkup(<SavedPage onNavigate={vi.fn()} />)

      // Eyebrow and Page Title
      expect(html).toContain('Local Device Bookmarks · 100% Private')
      expect(html).toContain('Saved Items &amp; Deadline Planner')
      expect(html).toContain('Keep track of selection trials, sports academy admissions')

      // Category filter tabs
      expect(html).toContain('All Items')
      expect(html).toContain('Selection Trials')
      expect(html).toContain('Academies')
      expect(html).toContain('Venues &amp; Turfs')
      expect(html).toContain('Pickup Games')
      expect(html).toContain('Research Papers')

      // Actions & Controls
      expect(html).toContain('Export Calendar (.ics)')
      expect(html).toContain('Search saved by title, sport, or city...')
      expect(html).toContain('Sort: Urgent Deadlines First')

      // Baseline items rendered
      expect(html).toContain('SAI National Center of Excellence U-17 Football Selection Trials')
      expect(html).toContain('BCCI NCA Fast Bowling &amp; Spin Talent Combine')
      expect(html).toContain('Bengaluru FC Youth Academy')
      expect(html).toContain('Mary Kom Regional Boxing Foundation')
      expect(html).toContain('Sree Kanteerava Stadium')
      expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress')

      // Direct Calendar Sync link
      expect(html).toContain('calendar.google.com/calendar/render')
    })
  })
})

