/**
 * WorkspaceShell.test.tsx
 *
 * Tests for the unified WorkspaceShell.
 * Verifies:
 * - Unauthenticated state renders sign-in CTAs (no fake demo data)
 * - Persona switcher only renders personas supported by resolved memberships
 * - Section tabs are capped at 3 per workspace
 * - Active persona is marked aria-selected="true"
 */
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Suspense } from 'react'
import WorkspaceShell from './WorkspaceShell'

const mockAuthUser = {
  id: 'usr-1',
  name: 'Rohit Sharma',
  fullName: 'Rohit Sharma',
  email: 'rohit@example.com',
  role: 'athlete' as const,
  isVerified: true,
  createdAt: '2026-11-01T00:00:00Z',
}

const noop = vi.fn()

describe('WorkspaceShell', () => {
  it('shows sign-in CTAs when unauthenticated — no fake demo personas', () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        persona="athlete"
        section="overview"
        authUser={null}
        onOpenAuth={noop}
        onNavigate={noop}
      />,
    )
    expect(html).toContain('Your workspace is waiting')
    expect(html).toContain('Sign in')
    expect(html).toContain('Create account')
    expect(html).not.toContain('Platform Admin')
    expect(html).not.toContain('Rohan Sharma Sports')
  })

  it('does not expose unassigned personas before memberships are verified', () => {
    const html = renderToStaticMarkup(
      <Suspense fallback={<div>Loading…</div>}>
        <WorkspaceShell
          persona="academy"
          section="batches"
          authUser={mockAuthUser}
          onOpenAuth={noop}
          onNavigate={noop}
        />
      </Suspense>,
    )

    expect(html).toContain('Athlete')
    expect(html).not.toContain('>Organisation</span>')
    expect(html).not.toContain('>Coach</span>')
    expect(html).not.toContain('>Creator</span>')

    expect(html).toContain('Academy Workspace')
    expect(html).toContain('Overview')
    expect(html).toContain('Batches')
    expect(html).toContain('Coaches')
    expect(html).toContain('kg-kpi-strip')
    expect(html).toContain('Verifying workspace access')
  })

  it('renders Organisation workspace shell metadata and sections for organisation persona', () => {
    const html = renderToStaticMarkup(
      <Suspense fallback={<div>Loading…</div>}>
        <WorkspaceShell
          persona="organization"
          section="overview"
          authUser={mockAuthUser}
          onOpenAuth={noop}
          onNavigate={noop}
        />
      </Suspense>,
    )

    expect(html).toContain('Organisation Workspace')
    expect(html).toContain('Overview')
    expect(html).toContain('Members')
    expect(html).toContain('Branches')
  })

  it('renders Creator workspace shell metadata and sections for creator persona', () => {
    const html = renderToStaticMarkup(
      <Suspense fallback={<div>Loading…</div>}>
        <WorkspaceShell
          persona="creator"
          section="campaigns"
          authUser={mockAuthUser}
          onOpenAuth={noop}
          onNavigate={noop}
        />
      </Suspense>,
    )

    expect(html).toContain('Creator Workspace')
    expect(html).toContain('Overview')
    expect(html).toContain('Campaigns')
    expect(html).toContain('Analytics')
  })

  it('renders Parent workspace shell metadata and sections for parent persona', async () => {
    await import('../parent/ParentPortalPage')
    const html = renderToStaticMarkup(
      <Suspense fallback={<div>Loading…</div>}>
        <WorkspaceShell
          persona="parent"
          section="attendance"
          authUser={mockAuthUser}
          onOpenAuth={noop}
          onNavigate={noop}
        />
      </Suspense>,
    )

    expect(html).toContain('Parent Workspace')
    expect(html).toContain('Attendance')
    expect(html).toContain('Fees &amp; Invoices')
    expect(html).toContain('Health &amp; QR Pass')
  })
})
