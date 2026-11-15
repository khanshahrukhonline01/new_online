import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { VideoTelemetryOverlay } from './VideoTelemetryOverlay'
import { SHOWCASE_ATHLETE_PROFILES } from '../../integrations/supabase/athlete-profile-client'

describe('VideoTelemetryOverlay (Match Footage HUD & Telemetry Metrics)', () => {
  it('renders video telemetry card with radar speed, approach velocity, and broadcast HUD stamps', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['rohit-verma']
    const clip = profile.videoClips![0]
    const html = renderToStaticMarkup(
      <VideoTelemetryOverlay clip={clip} athleteName={profile.fullName} sport={profile.sport} />
    )

    // Verify broadcast HUD elements
    expect(html).toContain('TELEMETRY ACTIVE')
    expect(html).toContain('00:24.00')
    expect(html).toContain('★ KHELGRID BIOMECHANICS LAB')

    // Verify title and description
    expect(html).toContain('Run-up &amp; 135 km/h Outswinger Release')
    expect(html).toContain('Lateral biomechanics showing front-knee brace')

    // Verify telemetry metrics pills
    expect(html).toContain('Release Speed')
    expect(html).toContain('135.2 km/h')
    expect(html).toContain('Seam Deviation')
    expect(html).toContain('2.8° Outswing')
    expect(html).toContain('Approach Velocity')
    expect(html).toContain('6.4 m/s')

    // Verify action tray
    expect(html).toContain('Watch Telemetry Video')
  })
})
