import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import ForYouPage from './ForYouPage'

describe('ForYouPage Component', () => {
  it('renders auth gate screen for unregistered guest visitors with call to action', () => {
    // Clear storage to guarantee guest state
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('khelgrid_auth_user')
    }

    const html = renderToString(<ForYouPage />)
    expect(html).toContain('Curated Exclusively For You')
    expect(html).toContain('Unregistered visitors do not have access to a personal feed')
    expect(html).toContain('Create Free Athlete Account')
    expect(html).toContain('Sign In')
  })

  it('renders preview benefits and test persona buttons', () => {
    const html = renderToString(<ForYouPage />)
    expect(html).toContain('Targeted Trials &amp; Cutoffs')
    expect(html).toContain('Nearby Turfs &amp; Grounds')
    expect(html).toContain('Certified Tacticians')
    expect(html).toContain('Aarav Sharma')
  })
})
