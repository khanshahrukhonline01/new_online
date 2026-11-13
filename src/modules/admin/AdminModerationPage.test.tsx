import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminModerationPage } from './AdminModerationPage'
import * as client from '../../integrations/supabase/public-client'

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

  it('renders KhelChronicle Manuscripts desk with research disciplines, author affiliations, and ethics badges', () => {
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

    const html = renderToStaticMarkup(
      <AdminModerationPage initialQueue={mockQueue} initialDesk="chronicle" />
    )

    expect(html).toContain('KhelChronicle Manuscripts')
    expect(html).toContain('Pending Screening')
    expect(html).toContain('Under Review')
    expect(html).toContain('Revisions Requested')
    expect(html).toContain('Approved (Preprints)')
    expect(html).toContain('Published Archive')
    expect(html).toContain('All Disciplines')
    expect(html).toContain('Sports Biomechanics')
    expect(html).toContain('Exercise Physiology')
    expect(html).toContain('High-Altitude Hypoxic Training Adaptation')
    expect(html).toContain('Dr. Tenzing Norbu')
    expect(html).toContain('Shillaroo')
    expect(html).toContain('IRB Human Ethics Certified')
    expect(html).toContain('Minor Consent Verified')
    expect(html).toContain('Diamond Open Access (No APC)')
  })
})
