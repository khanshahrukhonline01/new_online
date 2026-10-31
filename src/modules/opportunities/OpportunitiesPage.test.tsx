import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import OpportunitiesPage from './OpportunitiesPage'

describe('OpportunitiesPage', () => {
  it('renders opportunity discovery page with free entry filter and spots sorting', () => {
    const html = renderToStaticMarkup(<OpportunitiesPage />)

    expect(html).toContain('<h1>Your next opportunity.</h1>')
    expect(html).toContain('TRIALS · SELECTIONS · PROGRAMMES')
    expect(html).toContain('Free Entry Only (₹0)')
    expect(html).toContain('Most spots available')
    expect(html).toContain('Submit a trial')
  })
})
