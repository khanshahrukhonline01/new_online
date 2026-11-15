import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AthleteProfilePage from './AthleteProfilePage'

describe('AthleteProfilePage', () => {
  it('renders showcase profile for Rohit Verma with bowling action telemetry, biometrics, and player card', () => {
    const html = renderToStaticMarkup(<AthleteProfilePage username="rohit-verma" />)
    expect(html).toContain('Rohit Verma')
    expect(html).toContain('@rohit-verma')
    expect(html).toContain('Right-Arm Fast Bowler')
    expect(html).toContain('Sonnet Cricket Club')
    expect(html).toContain('Video &amp; Technique Telemetry')
    expect(html).toContain('Run-up &amp; 135 km/h Outswinger Release')
    expect(html).toContain('135.2 km/h')
    expect(html).toContain('Scientific Fitness Benchmarks')
    expect(html).toContain('Scout &amp; Academy Connect')
  })

  it('renders showcase profile for Priya Nair with badminton jump smash telemetry', () => {
    const html = renderToStaticMarkup(<AthleteProfilePage username="priya-nair" />)
    expect(html).toContain('Priya Nair')
    expect(html).toContain('@priya-nair')
    expect(html).toContain('Badminton')
    expect(html).toContain('Rear-Court Jump Smash')
    expect(html).toContain('312 km/h')
    expect(html).toContain('Pullela Gopichand Badminton Academy')
  })

  it('renders loading or unconfigured fallback state gracefully for unrecognised handle', () => {
    const html = renderToStaticMarkup(<AthleteProfilePage username="unknown-ghost-athlete-123" />)
    expect(html).toContain('Loading athlete profile')
  })
})
