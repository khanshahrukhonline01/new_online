import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import OrganizationsWorkspacePage from './OrganizationsWorkspacePage'

describe('OrganizationsWorkspacePage', () => {
  it('renders the SaaS workspace console with policy guarantees, context switcher, and 18 organization types', () => {
    const html = renderToStaticMarkup(<OrganizationsWorkspacePage />)

    expect(html).toContain('Organizations &amp; Workspace Console')
    expect(html).toContain('Free public venue, coach &amp; trial listings and independent verification remain guaranteed free')
    expect(html).toContain('Payments disabled')
    expect(html).toContain('Active Workspace Context')
    expect(html).toContain('Register New Organization')
    expect(html).toContain('Sports Federation')
    expect(html).toContain('University Sports Board')
    expect(html).toContain('Research &amp; Editorial Org')
    expect(html).toContain('Overview &amp; Provisioning')
    expect(html).toContain('Team, RBAC &amp; Invites')
    expect(html).toContain('Permissions &amp; Ownership')
    expect(html).toContain('Entitlements &amp; Metering')
    expect(html).toContain('Branches, Matrix &amp; Audit')
  })
})
