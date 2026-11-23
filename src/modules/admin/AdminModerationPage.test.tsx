import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AdminModerationPage,
  MODERATION_REJECTION_PRESETS,
  MODERATION_CORRECTION_PRESETS,
  MODERATION_APPROVAL_PRESETS,
  CHRONICLE_REJECTION_PRESETS,
  CHRONICLE_CORRECTION_PRESETS,
} from './AdminModerationPage'
import * as client from '../../integrations/supabase/public-client'
import type { ChronicleModerationQueueResult } from '../../integrations/supabase/chronicle-client'

describe('AdminModerationPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the protected queue without exposing demo credentials or fake sample listings', () => {
    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).toContain('Listing review queue')
    expect(html).toContain('Only accounts allowlisted in the development database')
    expect(html).not.toContain('admin123')
    expect(html).not.toContain('Sign In as Demo Admin')
    expect(html).not.toContain('Decathlon Sportplex')
  })

  it('does not expose a navigation link to the private evidence control panel', () => {
    const html = renderToStaticMarkup(<AdminModerationPage />)
    expect(html).not.toContain('Evidence &amp; Admin Control')
    expect(html).not.toContain('href="/admin/control"')
  })

  it('renders queue status tabs, metrics ribbon, and search toolbar when queue data is present', () => {
    const mockQueue: client.AdminModerationQueue = {
      pendingSubmissions: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          reference_number: 'KHL-20261110-TEST01',
          listing_type: 'venue',
          title: 'Bangalore Turf Park',
          city: 'Bengaluru',
          source_url: 'https://example.org/turf',
          details: '8 five-a-side football pitches',
          status: 'pending_review',
          version: 1,
          created_at: '2026-11-10T10:00:00Z',
          updated_at: '2026-11-10T10:00:00Z',
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          reference_number: 'KHL-20261110-TEST02',
          listing_type: 'opportunity',
          title: 'SAI Badminton Selection Trials',
          city: 'Delhi',
          source_url: 'https://example.org/sai',
          details: 'Under 19 trials',
          status: 'approved',
          version: 2,
          created_at: '2026-11-10T09:00:00Z',
          updated_at: '2026-11-10T09:30:00Z',
        },
      ],
      stats: {
        totalAcademies: 12,
        totalVenues: 24,
        totalCoaches: 8,
        totalEvents: 4,
        pendingSubmissionsCount: 1,
        underReviewCount: 0,
        changesRequestedCount: 0,
        approvedCount: 1,
        publishedCount: 0,
        rejectedCount: 0,
        unpublishedCount: 0,
      },
    }

    const html = renderToStaticMarkup(<AdminModerationPage initialQueue={mockQueue} />)
    expect(html).toContain('Protected Moderation Desk')
    expect(html).toContain('Listing review queue')
    expect(html).toContain('Pending Review')
    expect(html).toContain('Under Review')
    expect(html).toContain('Changes Requested')
    expect(html).toContain('Approved')
    expect(html).toContain('Published')
    expect(html).toContain('Bangalore Turf Park')
    expect(html).toContain('KHL-20261110-TEST01')
    expect(html).toContain('Directory Listings Queue')
    expect(html).toContain('KhelChronicle Manuscripts')
  })

  it('renders only database-provided Chronicle submissions and supports a Chronicle-only admin view', () => {
    const mockQueue: client.AdminModerationQueue = {
      pendingSubmissions: [],
      stats: {
        totalAcademies: 0,
        totalVenues: 0,
        totalCoaches: 0,
        totalEvents: 0,
        pendingSubmissionsCount: 0,
        underReviewCount: 0,
        changesRequestedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
        rejectedCount: 0,
        unpublishedCount: 0,
      },
    }
    const mockChronicleQueue: ChronicleModerationQueueResult = {
      submissions: [{
        id: '00000000-0000-4000-8000-000000000091',
        submissionId: 'KG-SUB-TEST-0091',
        title: 'Example manuscript supplied by the database',
        category: 'sports-biomechanics',
        categoryName: 'Sports Biomechanics',
        authorName: 'Dr. Example Researcher',
        authorEmail: 'researcher@example.test',
        affiliation: 'Example Sports Science Institute',
        abstract: 'A complete test abstract supplied by a controlled unit-test fixture.',
        humanEthicsConfirmed: true,
        minorConsentConfirmed: true,
        licenseType: 'cc-by-nc-nd-4.0',
        licenseConfirmed: true,
        status: 'pending_review',
        createdAt: '2026-11-17T08:00:00Z',
        updatedAt: '2026-11-17T08:00:00Z',
      }],
      stats: {
        pendingCount: 1,
        underReviewCount: 0,
        changesRequestedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
        rejectedCount: 0,
        totalCount: 1,
      },
    }

    const html = renderToStaticMarkup(
      <AdminModerationPage
        initialQueue={mockQueue}
        initialChronicleQueue={mockChronicleQueue}
        initialDesk="chronicle"
        hideDeskSwitcher
      />
    )

    expect(html).toContain('Pending Screening')
    expect(html).toContain('Revisions Requested')
    expect(html).toContain('Example manuscript supplied by the database')
    expect(html).toContain('Dr. Example Researcher')
    expect(html).toContain('Example Sports Science Institute')
    expect(html).toContain('KG-SUB-TEST-0091')
    expect(html).not.toContain('Dr. Tenzing Norbu')
    expect(html).not.toContain('High-Altitude Hypoxic Training Adaptation')
    expect(html).not.toContain('Directory Listings Queue')
  })

  it('provides structured preset reason templates for fast-action moderation', () => {
    expect(MODERATION_REJECTION_PRESETS.length).toBeGreaterThan(0)
    expect(MODERATION_REJECTION_PRESETS.some(p => p.label.includes('Official'))).toBe(true)

    expect(MODERATION_CORRECTION_PRESETS.length).toBeGreaterThan(0)
    expect(MODERATION_CORRECTION_PRESETS.some(p => p.label.includes('Age'))).toBe(true)

    expect(MODERATION_APPROVAL_PRESETS.length).toBeGreaterThan(0)
    expect(MODERATION_APPROVAL_PRESETS.some(p => p.label.includes('Verified'))).toBe(true)

    expect(CHRONICLE_REJECTION_PRESETS.length).toBeGreaterThan(0)
    expect(CHRONICLE_CORRECTION_PRESETS.length).toBeGreaterThan(0)
  })
})
