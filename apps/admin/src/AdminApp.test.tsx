import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminApp } from './AdminApp'

const VALID_TEST_KEY = 'a'.repeat(64)

describe('AdminApp Root Authentication Gate & Fail-Closed Shell (Phase 1)', () => {
  it('blocks unauthenticated/unresolved visitors from seeing admin sidebar, command palette, or fake Super Admin badges', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://hznsbxvovjxvmnchzzqt.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_TEST_KEY)
    try {
      const html = renderToStaticMarkup(<AdminApp />)
      expect(html).toContain('Verifying platform access')
      expect(html).not.toContain('admin-lte-sidebar')
      expect(html).not.toContain('Super Admin')
      expect(html).not.toContain('admin@khelgrid.com')
      expect(html).not.toContain('Command Centre')
      expect(html).not.toContain('Listing &amp; Chronicle Desk')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('fails closed when Supabase URL or anon key is missing, production, or substring-spoofed', () => {
    const invalidUrls = [
      '',
      'https://production-project-id.supabase.co',
      'https://evil.example/hznsbxvovjxvmnchzzqt',
    ]

    for (const badUrl of invalidUrls) {
      vi.stubEnv('VITE_SUPABASE_URL', badUrl)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_TEST_KEY)
      try {
        const html = renderToStaticMarkup(<AdminApp />)
        expect(html).toContain('KhelGrid Admin is unavailable')
        expect(html).toContain('This development admin application is not configured for its approved development database')
        expect(html).not.toContain('admin-lte-sidebar')
        expect(html).not.toContain('Command Centre')
      } finally {
        vi.unstubAllEnvs()
      }
    }
  })

  it('renders the authenticated workspace with real server-verified identity and visible Sign Out only when authorized', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://hznsbxvovjxvmnchzzqt.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_TEST_KEY)
    try {
      const html = renderToStaticMarkup(
        <AdminApp
          initialAuthOverride={{
            identity: {
              userId: '00000000-0000-4000-8000-000000000101',
              email: 'reviewer.ops@example.test',
              role: 'moderator',
              isActive: true,
            },
            databaseProjectRef: 'hznsbxvovjxvmnchzzqt',
          }}
        />,
      )
      expect(html).toContain('KhelGrid Admin Operations')
      expect(html).toContain('reviewer.ops')
      expect(html).toContain('Moderator')
      expect(html).toContain('Sign Out')
      expect(html).toContain('Gate Check-In Telemetry')
      expect(html).toContain('Turf Utilization &amp; Maintenance')
      expect(html).toContain('Academy Batch &amp; Attendance')
      expect(html).toContain('Platform Settings &amp; RBAC')
      expect(html).not.toContain('Unavailable')
      expect(html).not.toContain('admin@khelgrid.com')
      expect(html).not.toContain('Super Admin')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
