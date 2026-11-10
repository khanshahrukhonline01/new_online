import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminModerationPage } from './AdminModerationPage'

describe('AdminModerationPage', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the protected queue without exposing demo credentials or fake sample listings', () => {
    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).toContain('Listing review queue')
    expect(html).toContain('Only accounts allowlisted in the development database')
    expect(html).not.toContain('admin123')
    expect(html).not.toContain('Sign In as Demo Admin')
    expect(html).not.toContain('Decathlon Sportplex')
  })
})
