import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('Khelgrid starter shell', () => {
  it('renders the core sports journeys', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Discover opportunities')
    expect(html).toContain('Follow the action')
    expect(html).toContain('Build your sports profile')
  })

  it('clearly labels live feeds as not connected', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('live feeds and account services are not connected yet')
  })
})
