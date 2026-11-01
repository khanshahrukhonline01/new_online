import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SmartSchedulePicker } from './SmartSchedulePicker'

describe('SmartSchedulePicker Component', () => {
  it('renders quick day chips, time session tabs, and live auto-formatted banner', () => {
    const onChange = vi.fn()
    const html = renderToStaticMarkup(
      <SmartSchedulePicker
        value="Today · 8:00 PM"
        onChange={onChange}
        mode="pickup"
        label="Date & Time"
        required
      />,
    )

    // Heading and label
    expect(html).toContain('Date &amp; Time *')
    expect(html).toContain('Type Custom Text')

    // Day chips
    expect(html).toContain('1. Pick Day')
    expect(html).toContain('Today')
    expect(html).toContain('Tomorrow')
    expect(html).toContain('Saturday')
    expect(html).toContain('Sunday')
    expect(html).toContain('Other Date')

    // Time session tabs & slot chips
    expect(html).toContain('2. Select Time Slot')
    expect(html).toContain('Morning')
    expect(html).toContain('Evening')
    expect(html).toContain('Night Floodlights')

    // Pre-filled / Selected result banner
    expect(html).toContain('Selected Schedule:')
    expect(html).toContain('Today · 8:00 PM')
    expect(html).toContain('Instant 2-Tap Setup')
  })

  it('renders trial and tournament combine sessions when mode is opportunity', () => {
    const onChange = vi.fn()
    const html = renderToStaticMarkup(
      <SmartSchedulePicker
        value="Saturday · 07:00 AM"
        onChange={onChange}
        mode="opportunity"
        label="Trial / Combine Schedule &amp; Reporting Time"
        required
      />,
    )

    expect(html).toContain('Trial / Combine Schedule &amp; Reporting Time')
    expect(html).toContain('Morning Combines')
    expect(html).toContain('Afternoon / Evening')
    expect(html).toContain('Saturday · 07:00 AM')
  })
})
