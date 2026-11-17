import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminApp } from './AdminApp'

describe('AdminApp Root Shell', () => {
  it('renders the admin control panel when configured for the approved development database', () => {
    const html = renderToStaticMarkup(<AdminApp />)
    expect(html).toContain('khelgrid-admin-app')
    expect(html).not.toContain('KhelGrid Admin is unavailable')
    expect(html).toContain('Checking secure moderation access')
  })

  it('fails closed and blocks access if configured against an unauthorized or production database URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://production-project-id.supabase.co')
    try {
      const html = renderToStaticMarkup(<AdminApp />)
      expect(html).toContain('KhelGrid Admin is unavailable')
      expect(html).toContain('This development admin application is not configured for its approved development database')
      expect(html).toContain('Contact the platform owner. Do not attempt to bypass this restriction')
      expect(html).not.toContain('Checking secure moderation access')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
