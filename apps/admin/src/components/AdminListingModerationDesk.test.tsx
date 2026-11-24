import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminListingModerationDesk } from './AdminListingModerationDesk'
import {
  getAdminModerationListings,
  getAdminModerationListingDetails,
  startReviewListing,
  approveAndPublishListing,
  requestListingRevision,
  rejectListing,
  unpublishListing,
  republishListing,
  addModerationNote,
  exportListingsToCsv,
  resetAdminListingsForTesting,
} from '../services/adminModerationService'

describe('AdminListingModerationDesk & Content Moderation Queue', () => {
  beforeEach(() => {
    resetAdminListingsForTesting()
  })

  it('renders the moderation desk header, micro-KPI telemetry cards, and workspace category pills', () => {
    const html = renderToStaticMarkup(
      <AdminListingModerationDesk operatorEmail="lead.moderator@khelgrid.com" />
    )

    expect(html).toContain('Content &amp; Listing Moderation Queue')
    expect(html).toContain('Cross-Workspace Catalogue Moderation')
    expect(html).toContain('Total Submissions')
    expect(html).toContain('Pending Triage')
    expect(html).toContain('Under Review')
    expect(html).toContain('Revisions Needed')
    expect(html).toContain('Published Live')
    expect(html).toContain('Rejected / Spam')
    expect(html).toContain('All Categories')
    expect(html).toContain('Venues &amp; Turfs')
    expect(html).toContain('Academies')
    expect(html).toContain('Coaches')
    expect(html).toContain('Trials &amp; Selections')
    expect(html).toContain('Camps &amp; Clinics')
    expect(html).toContain('Scholarships')
    expect(html).toContain('Pickup Games')
  })

  it('renders seed moderation listings across multiple sports workspaces with accurate metadata', () => {
    const html = renderToStaticMarkup(
      <AdminListingModerationDesk operatorEmail="lead.moderator@khelgrid.com" />
    )

    // Trial listing
    expect(html).toContain('Delhi State U-17 Youth League Selection Trials 2026')
    expect(html).toContain('KG-TRL-8821')
    expect(html).toContain('Football Delhi (DSA)')

    // Venue listing
    expect(html).toContain('Bangalore Turf Arena &amp; High Performance Ground')
    expect(html).toContain('KG-VEN-4190')

    // Academy listing
    expect(html).toContain('Pullela Badminton Grassroots Development Centre')
    expect(html).toContain('KG-ACAD-3312')

    // Coach profile
    expect(html).toContain('Master Coach Vikramaditya Rao')
    expect(html).toContain('KG-COACH-9921')

    // Camp listing
    expect(html).toContain('Winter High Altitude Endurance &amp; Speed Athletics Camp 2026')
    expect(html).toContain('KG-CMP-6610')

    // Scholarship listing
    expect(html).toContain('Reliance Foundation Youth Sports (RFYS)')
    expect(html).toContain('KG-SCH-2291')

    // Pickup Game listing
    expect(html).toContain('Saturday Evening Casual 6v6 Football Match')
    expect(html).toContain('KG-PKP-1049')
  })

  it('starts review of a pending listing, locking the ticket and setting status to under_review', () => {
    const targetId = 'kg-lst-101' // Delhi State U-17 Trials
    const before = getAdminModerationListingDetails(targetId)
    expect(before?.status).toBe('pending_review')

    const updated = startReviewListing(targetId, 'lead.moderator@khelgrid.com')
    expect(updated.status).toBe('under_review')
    expect(updated.assignedModerator).toBe('lead.moderator@khelgrid.com')
    expect(updated.auditTrail[0].action).toBe('review_started')
  })

  it('approves and publishes a listing with priority rank, verified trust seal, and audit entry', () => {
    const targetId = 'kg-lst-105' // Winter Athletics Camp (was pending_review)
    const updated = approveAndPublishListing(targetId, 'lead.moderator@khelgrid.com', {
      notes: 'Nilgiri academy accreditation and coach Ramanathan credentials verified.',
      isVerifiedTrustBadge: true,
      priorityRank: 5,
    })

    expect(updated.status).toBe('published')
    expect(updated.publishedAt).toBeDefined()
    expect(updated.isVerifiedTrustBadge).toBe(true)
    expect(updated.priorityRank).toBe(5)
    expect(updated.moderatorNotes).toContain('Nilgiri academy accreditation')
    expect(updated.auditTrail[0].action).toBe('published')
  })

  it('requests revisions from submitter, setting status to changes_requested with detailed instructions', () => {
    const targetId = 'kg-lst-109' // Kolkata Padel Club (was pending_review)
    const updated = requestListingRevision(
      targetId,
      'lead.moderator@khelgrid.com',
      'Please upload WB municipal commercial trade license and fire NOC for the Rajarhat facility.'
    )

    expect(updated.status).toBe('changes_requested')
    expect(updated.correctionRequest).toContain('WB municipal commercial trade license')
    expect(updated.auditTrail[0].action).toBe('changes_requested')
    expect(updated.assignedModerator).toBe('lead.moderator@khelgrid.com')
  })

  it('rejects spam or non-sports content with recorded justification', () => {
    const targetId = 'kg-lst-101' // Test rejection flow
    const updated = rejectListing(
      targetId,
      'lead.moderator@khelgrid.com',
      'Duplicate listing already published under active Football Delhi charter.'
    )

    expect(updated.status).toBe('rejected')
    expect(updated.rejectionReason).toContain('Duplicate listing')
    expect(updated.auditTrail[0].action).toBe('rejected')
  })

  it('unpublishes a live listing from public catalogue discovery due to maintenance', () => {
    const targetId = 'kg-lst-102' // Bangalore Turf Arena (was published)
    const before = getAdminModerationListingDetails(targetId)
    expect(before?.status).toBe('published')

    const updated = unpublishListing(
      targetId,
      'lead.moderator@khelgrid.com',
      'Turf undergoing annual maintenance and turf shockpad replacement.'
    )

    expect(updated.status).toBe('unpublished')
    expect(updated.unpublishReason).toContain('Turf undergoing annual maintenance')
    expect(updated.auditTrail[0].action).toBe('unpublished')
  })

  it('reinstates and republishes an unpublished listing after compliance check', () => {
    const targetId = 'kg-lst-111' // Old Shivaji Park (was unpublished)
    const before = getAdminModerationListingDetails(targetId)
    expect(before?.status).toBe('unpublished')

    const updated = republishListing(targetId, 'lead.moderator@khelgrid.com')
    expect(updated.status).toBe('published')
    expect(updated.unpublishReason).toBeUndefined()
    expect(updated.auditTrail[0].action).toBe('republished')
  })

  it('appends an administrative observation note to the audit trail', () => {
    const targetId = 'kg-lst-103' // Pullela Badminton
    const updated = addModerationNote(
      targetId,
      'lead.moderator@khelgrid.com',
      'Spoke with Sujatha Rao; confirmed new summer morning batches starting Dec 2026.'
    )

    expect(updated.auditTrail[0].action).toBe('note_added')
    expect(updated.auditTrail[0].notes).toContain('confirmed new summer morning batches')
  })

  it('exports filtered moderation listings to RFC 4180 compliant CSV', () => {
    const all = getAdminModerationListings()
    const csv = exportListingsToCsv(all)

    expect(csv).toContain('Reference Code,Category,Title,Organization,Sport,City,State,Status,Verified Trust Badge,Priority Rank')
    expect(csv).toContain('KG-TRL-8821,trial,Delhi State U-17 Youth League Selection Trials 2026')
    expect(csv).toContain('KG-VEN-4190,venue,Bangalore Turf Arena & High Performance Ground')
    expect(csv).toContain('KG-ACAD-3312,academy,Pullela Badminton Grassroots Development Centre')
    expect(csv).toContain('Football')
    expect(csv).toContain('Bengaluru')
    expect(csv).toContain('published')
  })
})
