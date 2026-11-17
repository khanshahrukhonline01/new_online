import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AthleteProfilePage from './AthleteProfilePage'

describe('AthleteProfilePage', () => {
  it.each(['rohit-verma', 'priya-nair'])('does not expose showcase data for %s', username => {
    const html = renderToStaticMarkup(<AthleteProfilePage username={username} />)
    expect(html).toContain('Loading athlete profile')
    expect(html).not.toContain('Rohit Verma')
    expect(html).not.toContain('Priya Nair')
    expect(html).not.toContain('135.2 km/h')
    expect(html).not.toContain('312 km/h')
  })

  it('renders a loading state for an unknown handle while public profile lookup is unavailable', () => {
    const html = renderToStaticMarkup(<AthleteProfilePage username="unknown-ghost-athlete-123" />)
    expect(html).toContain('Loading athlete profile')
  })
})
