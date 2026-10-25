import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('KhelGrid discovery shell', () => {
  it('renders the current core discovery journeys', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Explore sports')
    expect(html).toContain('Explore opportunities')
    expect(html).toContain('Browse venues')
    expect(html).toContain('India’s sports journey, connected.')
  })

  it('clearly states that live feeds and account services are not connected yet', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('live feeds and account services are not connected yet')
    expect(html).toContain('Not a booking or live-score service')
  })
})
