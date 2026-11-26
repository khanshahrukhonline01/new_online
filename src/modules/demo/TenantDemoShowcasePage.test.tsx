import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { resolveRoute } from '../../shared/routing'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import TenantDemoShowcasePage from './TenantDemoShowcasePage'
import { DEMO_DASHBOARDS } from './tenantDemoData'

describe('TenantDemoShowcasePage & /demo routes', () => {
  it('resolves /demo, /preview, and /partner/preview routes cleanly', () => {
    expect(resolveRoute('/demo')).toEqual({
      name: 'feature',
      canonicalPath: '/demo',
      slug: 'Interactive Dashboard Demo Showcase',
    })
    expect(resolveRoute('/preview').canonicalPath).toBe('/preview')
    expect(resolveRoute('/partner/preview').canonicalPath).toBe('/partner/preview')
  })

  it('renders an explicit read-only sample disclosure and switches all 8+ dashboards cleanly', () => {
    for (const spec of DEMO_DASHBOARDS) {
      const html = renderToStaticMarkup(<TenantDemoShowcasePage initialDashboard={spec.id} />)
      expect(html).toContain('Sample Illustrative Data Only (Read-Only)')
      expect(html).toContain(spec.title)
      expect(html).toContain(spec.realWorkspacePath)
      expect(html).toContain('Sample Overview &amp; KPIs')
      expect(html).toContain('Included Features')
      expect(html).toContain('Data Permissions &amp; RBAC')
    }

    // Never injects a fake client-side session into storage
    expect(getStoredAuthUser()).toBeNull()
  })

  it('links partner previews directly to authentic /partner-signup onboarding without auth bypasses', () => {
    const academyHtml = renderToStaticMarkup(<TenantDemoShowcasePage initialDashboard="academy" />)
    expect(academyHtml).toContain('/partner-signup?role=academy&amp;mode=signup')
    expect(academyHtml).toContain('/partner-signup?role=academy&amp;mode=login')
    expect(academyHtml).toContain('Launch Real Academy Workspace')

    const orgHtml = renderToStaticMarkup(<TenantDemoShowcasePage initialDashboard="organization" />)
    expect(orgHtml).toContain('/partner-signup?role=organization&amp;mode=signup')
    expect(orgHtml).toContain('Launch Real Organisation Workspace')
  })
})
