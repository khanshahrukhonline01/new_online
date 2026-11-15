import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import YouTubeShortsSection from './YouTubeShortsSection'

describe('YouTubeShortsSection', () => {
  it('renders section title, subtitle, and YouTube powered badge', () => {
    const html = renderToStaticMarkup(<YouTubeShortsSection />)
    expect(html).toContain('Tactical Drills &amp; Short Videos — YouTube Powered')
    expect(html).toContain('30-to-60 second high-speed biomechanics')
    expect(html).toContain('Watch on YouTube')
    expect(html).toContain('https://www.youtube.com/@KhelGrid')
  })

  it('renders video cards with thumbnails, durations, and channels', () => {
    const html = renderToStaticMarkup(<YouTubeShortsSection />)
    expect(html).toContain('Fast Bowling: Front-Knee Bracing &amp; 140 km/h Release')
    expect(html).toContain('Modern Football: Half-Space Penetration &amp; Third-Man Runs')
    expect(html).toContain('Badminton Footwork: Kinetic Split-Step &amp; Corner Recovery')
    expect(html).toContain('Sprint Acceleration: The 45-Degree Drive Phase Piston')
    expect(html).toContain('https://img.youtube.com/vi/jP0rG6s9h8w/hqdefault.jpg')
    expect(html).toContain('Watch Drill')
    expect(html).toContain('aria-label="Sports coaching video shorts rail"')
  })
})
