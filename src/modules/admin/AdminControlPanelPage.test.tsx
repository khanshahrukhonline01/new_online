import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminControlPanelPage, type AdminControlTab } from './AdminControlPanelPage'
import { getEvidenceChecklist } from './moderationEvidenceChecklist'
import type {
  AdminModerationQueue,
  ListingEvidenceItem,
  ListingModeratorAccount,
  ListingModeratorAccessAudit,
  ModerationAccessProfile,
} from '../../integrations/supabase/public-client'

describe('AdminControlPanelPage Acceptance & Role Boundaries', () => {
  it('maps evidence to category-specific reviewer checklist states', () => {
    const evidence = [
      { id: 'e1', evidence_type: 'venue_address', outcome: 'supports' },
      { id: 'e2', evidence_type: 'official_source', outcome: 'pending' },
    ] as never as ListingEvidenceItem[]
    const checklist = getEvidenceChecklist('venue', evidence)
    expect(checklist.find(item => item.type === 'venue_address')?.status).toBe('supported')
    expect(checklist.find(item => item.type === 'official_source')?.status).toBe('pending')
    expect(checklist.find(item => item.type === 'other')?.status).toBe('missing')
  })

  it('1. Initial Loading: does not render protected moderation or super-admin controls before database authorization resolves', () => {
    const html = renderToStaticMarkup(<AdminControlPanelPage initialLoading={true} />)
    expect(html).toContain('Checking secure moderation access')
    expect(html).not.toContain('Super-Admin RBAC')
    expect(html).not.toContain('Authorized accounts')
    expect(html).not.toContain('Evidence register')
    expect(html).not.toContain('Admin Control Centre')
  })

  it('2. Anonymous User: renders safe sign-in shell and denies private operations data to unauthenticated visitors', () => {
    const html = renderToStaticMarkup(
      <AdminControlPanelPage initialSignedIn={false} initialProfile={null} initialLoading={false} />,
    )
    // Anonymous user sees the login gate
    expect(html).toContain('Moderator &amp; Super Admin Control Panel')
    expect(html).toContain('Sign in with an individually authorized development moderator account')
    expect(html).toContain('Moderator email')
    expect(html).toContain('Password')
    expect(html).toContain('Sign in securely')

    // Denies private data and queue
    expect(html).not.toContain('Admin Control Centre')
    expect(html).not.toContain('Listing Moderation')
    expect(html).not.toContain('Super-Admin RBAC')
    expect(html).not.toContain('COMMAND WORKSPACE')
  })

  it('3. Ordinary Authenticated User: explicitly denies access and isolates private queue when user is not an active moderator', () => {
    const ordinaryProfile: ModerationAccessProfile = {
      user_id: '00000000-0000-4000-8000-000000000099',
      role: 'moderator',
      is_active: false,
    }
    const html = renderToStaticMarkup(
      <AdminControlPanelPage
        initialSignedIn={true}
        initialProfile={ordinaryProfile}
        initialLoading={false}
      />,
    )
    // Renders the explicit denial screen
    expect(html).toContain('Access not authorized')
    expect(html).toContain('You are signed in, but this account is not an active KhelGrid moderator')
    expect(html).toContain('The private queue and evidence records are unavailable to your account')
    expect(html).toContain('Sign out')

    // Absolute isolation: zero queue or operational tools rendered
    expect(html).not.toContain('Admin Control Centre')
    expect(html).not.toContain('COMMAND WORKSPACE')
    expect(html).not.toContain('Listing Moderation')
    expect(html).not.toContain('Super-Admin RBAC')
  })

  it('4. Active Moderator: grants operational access to moderation queue, evidence, and KYC, but denies super-admin governance', () => {
    const moderatorProfile: ModerationAccessProfile = {
      user_id: '00000000-0000-4000-8000-000000000001',
      role: 'moderator',
      is_active: true,
    }
    const mockQueue: AdminModerationQueue = {
      pendingSubmissions: [
        {
          id: 'sub-01',
          reference_number: 'KHL-20261110-SUB01',
          listing_type: 'venue',
          title: 'Bangalore Turf Arena',
          city: 'Bengaluru',
          source_url: 'https://example.org/arena',
          details: '8 football pitches',
          status: 'pending_review',
          version: 1,
          created_at: '2026-11-10T10:00:00Z',
          updated_at: '2026-11-10T10:00:00Z',
        },
      ],
      stats: {
        totalAcademies: 10,
        totalVenues: 20,
        totalCoaches: 5,
        totalEvents: 2,
        pendingSubmissionsCount: 1,
        underReviewCount: 0,
        changesRequestedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
        rejectedCount: 0,
        unpublishedCount: 0,
      },
    }

    const html = renderToStaticMarkup(
      <AdminControlPanelPage
        initialSignedIn={true}
        initialProfile={moderatorProfile}
        initialLoading={false}
        initialQueue={mockQueue}
      />,
    )

    // Allowed tools
    expect(html).toContain('Admin Control Centre')
    expect(html).toContain('moderator')
    expect(html).toContain('COMMAND WORKSPACE')
    expect(html).toContain('Overview &amp; Telemetry')
    expect(html).toContain('Listing Moderation')
    expect(html).toContain('Athlete KYC &amp; CVs')
    expect(html).toContain('Live Matches &amp; POTM')
    expect(html).toContain('WhatsApp Trial Alerts')
    expect(html).toContain('Site Banners &amp; Alerts')
    expect(html).toContain('Sign out')

    // Denied tools: Moderator role CANNOT access super-admin governance tab or controls
    expect(html).not.toContain('Super-Admin RBAC')
    expect(html).not.toContain('Access management')
    expect(html).not.toContain('Grant or revoke moderator access')
  })

  it('5. Super-Admin: grants full access including moderator governance, role assignment, and access audit trail', () => {
    const superAdminProfile: ModerationAccessProfile = {
      user_id: '00000000-0000-4000-8000-000000000002',
      role: 'super_admin',
      is_active: true,
    }
    const mockAccounts: ListingModeratorAccount[] = [
      {
        user_id: '00000000-0000-4000-8000-000000000001',
        role: 'moderator',
        is_active: true,
        created_at: '2026-11-01T00:00:00Z',
        created_by: null,
        notes: 'Verified regional reviewer',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000002',
        role: 'super_admin',
        is_active: true,
        created_at: '2026-11-01T00:00:00Z',
        created_by: null,
        notes: 'Lead platform administrator',
      },
    ]
    const mockAudits: ListingModeratorAccessAudit[] = [
      {
        id: 'audit-01',
        target_user_id: '00000000-0000-4000-8000-000000000001',
        actor_id: '00000000-0000-4000-8000-000000000002',
        action: 'grant',
        old_role: null,
        new_role: 'moderator',
        old_is_active: null,
        new_is_active: true,
        notes: 'Initial moderator onboarding',
        created_at: '2026-11-01T00:00:00Z',
      },
    ]

    const html = renderToStaticMarkup(
      <AdminControlPanelPage
        initialSignedIn={true}
        initialProfile={superAdminProfile}
        initialLoading={false}
        initialAccounts={mockAccounts}
        initialAccessAudits={mockAudits}
        initialTab="access"
      />,
    )

    // Allowed super-admin tools
    expect(html).toContain('Admin Control Centre')
    expect(html).toContain('super admin')
    expect(html).toContain('GOVERNANCE')
    expect(html).toContain('Super-Admin RBAC')
    expect(html).toContain('Access management')
    expect(html).toContain('Grant or revoke moderator access using an existing Auth user UUID')
    expect(html).toContain('Auth user UUID')
    expect(html).toContain('Authorized accounts')
    expect(html).toContain('00000000-0000-4000-8000-000000000001')
    expect(html).toContain('moderator · Active')
    expect(html).toContain('Moderator access history')
    expect(html).toContain('Initial moderator onboarding')
  })

  it('6. exports valid AdminControlTab types covering the platform operations pillars', () => {
    const expectedTabs: AdminControlTab[] = [
      'overview',
      'queue',
      'athletes',
      'matches',
      'alerts',
      'announcements',
      'access',
    ]
    expect(expectedTabs).toHaveLength(7)
    expect(expectedTabs).toContain('overview')
    expect(expectedTabs).toContain('athletes')
    expect(expectedTabs).toContain('matches')
    expect(expectedTabs).toContain('alerts')
    expect(expectedTabs).toContain('announcements')
    expect(expectedTabs).toContain('access')
  })
})
