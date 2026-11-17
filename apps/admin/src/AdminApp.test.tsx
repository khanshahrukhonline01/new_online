import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminApp } from './AdminApp'

describe('AdminApp Root Shell & Dual Workspace Navigation', () => {
  it('renders the executive admin topbar and command centre when configured for the approved development database', () => {
    const html = renderToStaticMarkup(<AdminApp />)
    expect(html).toContain('khelgrid-admin-app')
    expect(html).not.toContain('KhelGrid Admin is unavailable')

    // Topbar brand and telemetry
    expect(html).toContain('KhelGrid Admin Operations')
    expect(html).toContain('admin.khelgrid.com')
    expect(html).toContain('Dev Database (hznsbxvovjxvmnchzzqt)')

    // Workspace navigation tabs
    expect(html).toContain('Command Centre')
    expect(html).toContain('Listing &amp; Chronicle Desk')

    // Initial default workspace state
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
      expect(html).not.toContain('Command Centre')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
