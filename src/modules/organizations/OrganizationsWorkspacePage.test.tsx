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
    expect(html).toContain('No linked organizations yet')
    expect(html).not.toContain('NCR Elite Cricket Academy')
  })

  it('wires workspaceSection props directly to matching organization workspace tabs', () => {
    const membersHtml = renderToStaticMarkup(<OrganizationsWorkspacePage workspaceSection="members" />)
    expect(membersHtml).toContain('Organization Members &amp; Anti-Escalation RBAC')
    expect(membersHtml).toContain('Invite Organization Member')

    const branchesHtml = renderToStaticMarkup(<OrganizationsWorkspacePage workspaceSection="branches" />)
    expect(branchesHtml).toContain('Organization Units (Branches, Teams &amp; Facilities)')
    expect(branchesHtml).toContain('30-Module Platform SaaS Adoption Matrix')
  })
})
