import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminChronicleEditorialDesk } from './AdminChronicleEditorialDesk'
import {
  getAdminChronicleManuscripts,
  getAdminChronicleManuscriptDetails,
  startManuscriptScreening,
  requestScreeningCorrection,
  assignPeerReviewers,
  submitPeerReviewReport,
  requestManuscriptRevision,
  acceptManuscript,
  mintDoiAndPublish,
  rejectManuscript,
  addEditorialInternalNote,
  exportChronicleRegistryToCsv,
  resetAdminChronicleForTesting,
  PRE_APPROVED_REVIEWERS_POOL,
  SCREENING_REVISION_PRESETS,
  PEER_REVIEW_DECISION_PRESETS,
} from '../services/adminChronicleService'

describe('AdminChronicleEditorialDesk & KhelChronicle Research Editorial Suite (Module 4)', () => {
  beforeEach(() => {
    resetAdminChronicleForTesting()
  })

  it('renders editorial desk header, micro-KPI telemetry ribbon, and search bar', () => {
    const html = renderToStaticMarkup(
      <AdminChronicleEditorialDesk
        currentUser={{ name: 'Dr. Anandita Sen', email: 'a.sen@iitb.ac.in' }}
      />,
    )

    expect(html).toContain('KhelChronicle Research Editorial &amp; Peer-Review Desk')
    expect(html).toContain('COPE &amp; STORK compliant')
    expect(html).toContain('Total Submissions')
    expect(html).toContain('Needs Screening')
    expect(html).toContain('In Peer Review')
    expect(html).toContain('Active Revisions')
    expect(html).toContain('Ready to Publish')
    expect(html).toContain('Published Open Access')
    expect(html).toContain('Export CSV')
    expect(html).toContain('Reset Test Data')
  })

  it('renders seed research manuscripts with authentic Indian sports science metadata', async () => {
    const { manuscripts, metrics } = await getAdminChronicleManuscripts()

    expect(manuscripts.length).toBeGreaterThanOrEqual(6)
    expect(metrics.totalSubmissions).toBeGreaterThanOrEqual(6)
    expect(metrics.avgReviewTurnaroundDays).toBe(4.2)

    const bowlingPaper = manuscripts.find(m => m.id === 'manuscript-kc-001')
    expect(bowlingPaper).toBeDefined()
    expect(bowlingPaper?.title).toContain('Pace Bowlers')
    expect(bowlingPaper?.accessionNumber).toBe('KG-2026-CH-042')
    expect(bowlingPaper?.domain).toBe('biomechanics')
    expect(bowlingPaper?.status).toBe('published')
    expect(bowlingPaper?.publishing.doi).toBe('10.5555/khelchronicle.2026.042')
    expect(bowlingPaper?.publishing.license).toBe('CC-BY-4.0')
  })

  it('filters research manuscripts by research domain', async () => {
    const { manuscripts: biomechPapers } = await getAdminChronicleManuscripts({
      domain: 'biomechanics',
    })
    expect(biomechPapers.length).toBeGreaterThanOrEqual(2)
    expect(biomechPapers.every(m => m.domain === 'biomechanics')).toBe(true)

    const { manuscripts: talentPapers } = await getAdminChronicleManuscripts({
      domain: 'talent_identification',
    })
    expect(talentPapers.length).toBeGreaterThanOrEqual(1)
    expect(talentPapers[0].title).toContain('Relative Age Effect')
  })

  it('filters research manuscripts by lifecycle status', async () => {
    const { manuscripts: publishedOnly } = await getAdminChronicleManuscripts({
      status: 'published',
    })
    expect(publishedOnly.length).toBeGreaterThanOrEqual(1)
    expect(publishedOnly.every(m => m.status === 'published')).toBe(true)

    const { manuscripts: inReviewOnly } = await getAdminChronicleManuscripts({
      status: 'in_peer_review',
    })
    expect(inReviewOnly.length).toBeGreaterThanOrEqual(1)
    expect(inReviewOnly.every(m => m.status === 'in_peer_review')).toBe(true)
  })

  it('searches manuscripts by title or accession ID keyword', async () => {
    const { manuscripts: hockeyMatches } = await getAdminChronicleManuscripts({
      search: 'hockey',
    })
    expect(hockeyMatches.length).toBeGreaterThanOrEqual(2)
    expect(hockeyMatches.some(m => m.title.includes('Heat Alleviation'))).toBe(true)
    expect(hockeyMatches.some(m => m.title.includes('Computer Vision'))).toBe(true)

    const { manuscripts: accessionMatches } = await getAdminChronicleManuscripts({
      search: 'KG-2026-CH-043',
    })
    expect(accessionMatches.length).toBe(1)
    expect(accessionMatches[0].id).toBe('manuscript-kc-002')
  })

  it('claims screening for a pending manuscript and transitions status to under_screening', async () => {
    const claimed = await startManuscriptScreening('manuscript-kc-004', {
      name: 'Dr. Anandita Sen',
      email: 'a.sen@iitb.ac.in',
    })

    expect(claimed.status).toBe('under_screening')
    expect(claimed.assignedEditor?.name).toBe('Dr. Anandita Sen')
    expect(claimed.auditTrail[0].action).toContain('Claimed Manuscript')

    const details = await getAdminChronicleManuscriptDetails('manuscript-kc-004')
    expect(details?.status).toBe('under_screening')
  })

  it('requests screening corrections with standard COPE presets', async () => {
    const corrected = await requestScreeningCorrection('manuscript-kc-004', {
      editor: { name: 'Dr. Priya Nair', email: 'priya.nair@aiims.edu' },
      reason: SCREENING_REVISION_PRESETS[0].title,
      notes: SCREENING_REVISION_PRESETS[0].notes,
    })

    expect(corrected.status).toBe('screening_revision')
    expect(corrected.auditTrail[0].action).toContain('Requested Screening Corrections')
    expect(corrected.auditTrail[0].notes).toContain('Institutional Ethics')
  })

  it('dispatches manuscript to double-blind referee pool', async () => {
    const reviewer = PRE_APPROVED_REVIEWERS_POOL[0]
    const updated = await assignPeerReviewers('manuscript-kc-004', {
      editor: { name: 'Dr. Anandita Sen', email: 'a.sen@iitb.ac.in' },
      reviewers: [
        {
          id: reviewer.id,
          reviewerName: reviewer.name,
          institution: reviewer.institution,
          orcid: reviewer.orcid,
          domain: 'biomechanics',
          blindMode: 'double_blind',
          dueDays: 10,
        },
      ],
      notes: 'Please evaluate tracking accuracy in Section 3.',
    })

    expect(updated.status).toBe('in_peer_review')
    expect(updated.reviewers.length).toBe(1)
    expect(updated.reviewers[0].reviewerName).toBe(reviewer.name)
    expect(updated.reviewers[0].blindMode).toBe('double_blind')
    expect(updated.reviewers[0].invitationStatus).toBe('invited')
  })

  it('records referee scorecards and recommendations', async () => {
    const reviewer = PRE_APPROVED_REVIEWERS_POOL[0]
    await assignPeerReviewers('manuscript-kc-004', {
      editor: { name: 'Dr. Anandita Sen', email: 'a.sen@iitb.ac.in' },
      reviewers: [
        {
          id: reviewer.id,
          reviewerName: reviewer.name,
          institution: reviewer.institution,
          orcid: reviewer.orcid,
          domain: 'biomechanics',
          blindMode: 'double_blind',
          dueDays: 10,
        },
      ],
    })

    const reviewed = await submitPeerReviewReport('manuscript-kc-004', reviewer.id, {
      recommendation: 'accept',
      scores: {
        methodology: 5,
        originality: 5,
        dataRigour: 5,
        clarity: 4,
      },
      confidentialCommentsToEditor: 'Exceptional tracking benchmark dataset for field hockey.',
      commentsForAuthor: 'Very clearly articulated model architecture.',
    })

    const assigned = reviewed.reviewers.find(r => r.id === reviewer.id)
    expect(assigned?.invitationStatus).toBe('review_submitted')
    expect(assigned?.scores?.methodology).toBe(5)
    expect(assigned?.recommendation).toBe('accept')
  })

  it('requests minor revisions and author submits point-by-point rebuttal', async () => {
    const revised = await requestManuscriptRevision('manuscript-kc-003', {
      editor: { name: 'Dr. Priya Nair', email: 'priya.nair@aiims.edu' },
      decisionTitle: PEER_REVIEW_DECISION_PRESETS[0].title,
      recommendation: 'minor_revision',
      editorialLetter: 'Please report 95% confidence intervals for core temperature.',
      dueDays: 14,
    })

    expect(revised.status).toBe('revision_requested')
    expect(revised.auditTrail[0].action).toContain('Minor Revisions Required')
  })

  it('accepts manuscript, mints persistent Crossref DOI, and publishes Open Access', async () => {
    const accepted = await acceptManuscript('manuscript-kc-002', {
      editor: { name: 'Dr. Vikramaditya Rathore', email: 'v.rathore@sainis.gov.in' },
      notes: 'Author rebuttal satisfies all reviewer questions.',
    })
    expect(accepted.status).toBe('accepted')

    const published = await mintDoiAndPublish('manuscript-kc-002', {
      editor: { name: 'Editor-in-Chief', email: 'editor@khelgrid.com' },
      license: 'CC-BY-4.0',
      customDoiSuffix: '043',
      notes: 'Registered with Crossref metadata schema 5.3',
    })

    expect(published.status).toBe('published')
    expect(published.publishing.doi).toBe('10.5555/khelchronicle.2026.043')
    expect(published.publishing.license).toBe('CC-BY-4.0')
    expect(published.publishing.openAccessVerified).toBe(true)
    expect(published.publishing.crossrefDepositStatus).toBe('minted')
  })

  it('rejects an unsuitable submission with formal reason and editorial letter', async () => {
    const rejected = await rejectManuscript('manuscript-kc-006', {
      editor: { name: 'Dr. Priya Nair', email: 'priya.nair@aiims.edu' },
      reason: 'Missing CTRI Trial Registration and Questionable Methodology',
      editorialLetter: 'Human clinical supplementation trials require prospective registration in CTRI.',
    })

    expect(rejected.status).toBe('rejected')
    expect(rejected.auditTrail[0].action).toContain('Manuscript Declined')
    expect(rejected.auditTrail[0].notes).toContain('Missing CTRI')
  })

  it('adds confidential internal editorial notes and exports CSV registry', async () => {
    const noted = await addEditorialInternalNote(
      'manuscript-kc-001',
      { name: 'Dr. Anandita Sen', email: 'a.sen@iitb.ac.in' },
      'Recommended for Khelo India national sports science award nominee list.',
    )

    expect(noted.internalNotes[0]).toContain('Khelo India national sports science award')

    const { manuscripts } = await getAdminChronicleManuscripts()
    const csv = exportChronicleRegistryToCsv(manuscripts)

    expect(csv).toContain('Accession Number,Title,Domain')
    expect(csv).toContain('KG-2026-CH-042')
    expect(csv).toContain('10.5555/khelchronicle.2026.042')
    expect(csv).toContain('Devraj Mukhopadhyay')
  })
})
