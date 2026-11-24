import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminTrustSafetyDesk } from './AdminTrustSafetyDesk'
import {
  getAdminTrustSafetyCases,
  getAdminTrustSafetyCaseDetails,
  startCaseInvestigation,
  levySanctionOnEntity,
  submitBanAppeal,
  adjudicateBanAppeal,
  closeTrustSafetyCase,
  addInvestigationNote,
  exportTrustSafetyLedgerToCsv,
  resetAdminTrustSafetyForTesting,
  SANCTION_DECISION_PRESETS,
  APPEAL_DECISION_PRESETS,
} from '../services/adminTrustSafetyService'

describe('AdminTrustSafetyDesk & Complaints & Sanctions Desk (Module 5)', () => {
  beforeEach(() => {
    resetAdminTrustSafetyForTesting()
  })

  it('renders Trust & Safety desk header, micro-KPI telemetry ribbon, and search controls', () => {
    const html = renderToStaticMarkup(
      <AdminTrustSafetyDesk operatorEmail="lead.investigator@khelgrid.com" />,
    )

    expect(html).toContain('Trust &amp; Safety, Complaints &amp; Sanctions Desk')
    expect(html).toContain('Dispute intake, safety incident investigations')
    expect(html).toContain('Total Cases Logged')
    expect(html).toContain('Critical P0 Active')
    expect(html).toContain('Active Investigations')
    expect(html).toContain('Active Sanctions')
    expect(html).toContain('Ban Appeals Pending')
    expect(html).toContain('Seals Revoked')
    expect(html).toContain('Export Compliance CSV')
    expect(html).toContain('Reset Test Data')
  })

  it('renders seed incident cases with authentic Indian sports safety and fraud data', async () => {
    const { cases, metrics } = await getAdminTrustSafetyCases()

    expect(cases.length).toBeGreaterThanOrEqual(7)
    expect(metrics.totalCases).toBeGreaterThanOrEqual(7)
    expect(metrics.criticalP0Active).toBeGreaterThanOrEqual(2)

    const turfHazardCase = cases.find(c => c.incidentNumber === 'TS-2026-081')
    expect(turfHazardCase).toBeDefined()
    expect(turfHazardCase?.title).toContain('Exposed Steel Pegs on AstroTurf Pitch')
    expect(turfHazardCase?.severity).toBe('critical_p0')
    expect(turfHazardCase?.category).toBe('safety_hazard')
    expect(turfHazardCase?.reportedEntityName).toBe('PlayArena Sports Turf Mumbai')
    expect(turfHazardCase?.city).toBe('Mumbai')
  })

  it('filters incident cases by severity level', async () => {
    const { cases: criticalOnly } = await getAdminTrustSafetyCases({
      severity: 'critical_p0',
    })

    expect(criticalOnly.length).toBeGreaterThanOrEqual(3)
    expect(criticalOnly.every(c => c.severity === 'critical_p0')).toBe(true)

    const { cases: highOnly } = await getAdminTrustSafetyCases({
      severity: 'high_p1',
    })
    expect(highOnly.length).toBeGreaterThanOrEqual(2)
    expect(highOnly.every(c => c.severity === 'high_p1')).toBe(true)
  })

  it('filters incident cases by incident category', async () => {
    const { cases: fraudCases } = await getAdminTrustSafetyCases({
      category: 'financial_fraud',
    })

    expect(fraudCases.length).toBe(1)
    expect(fraudCases[0].title).toContain('Fake ISL Reserve Scouting Combine')

    const { cases: bookingDisputes } = await getAdminTrustSafetyCases({
      category: 'booking_dispute',
    })
    expect(bookingDisputes.length).toBe(1)
    expect(bookingDisputes[0].reportedEntityName).toContain('SkyLine Arena Turfs')
  })

  it('searches incident cases by incident number, entity name, or keyword', async () => {
    const { cases: searchMatches } = await getAdminTrustSafetyCases({
      search: 'TS-2026-083',
    })
    expect(searchMatches.length).toBe(1)
    expect(searchMatches[0].title).toContain('Junior Players')

    const { cases: cityMatches } = await getAdminTrustSafetyCases({
      search: 'Bengaluru',
    })
    expect(cityMatches.length).toBeGreaterThanOrEqual(1)
    expect(cityMatches[0].city).toBe('Bengaluru')
  })

  it('claims active investigation for an intake_pending case and records officer note', async () => {
    const claimed = await startCaseInvestigation('inc-ts-007', {
      name: 'Rohan Deshmukh',
      email: 'rohan.d@khelgrid.com',
    })

    expect(claimed.status).toBe('under_investigation')
    expect(claimed.assignedOfficer?.name).toBe('Rohan Deshmukh')
    expect(claimed.investigationNotes[0].noteText).toContain('Claimed incident case')

    const details = await getAdminTrustSafetyCaseDetails('inc-ts-007')
    expect(details?.status).toBe('under_investigation')
  })

  it('levies disciplinary sanctions with suspension duration and verified seal revocation', async () => {
    const preset = SANCTION_DECISION_PRESETS[2] // 30-Day suspension
    const sanctioned = await levySanctionOnEntity('inc-ts-004', {
      officer: { name: 'Shreya Kulkarni', email: 'shreya.k@khelgrid.com' },
      sanctionType: preset.type,
      durationDays: preset.durationDays,
      reason: preset.reason,
      publicAdvisoryText: 'Suspended pending age fraud inquiry.',
      revokeVerifiedBadge: true,
      suspendAccess: true,
    })

    expect(sanctioned.status).toBe('sanction_issued')
    expect(sanctioned.sanctions.length).toBe(1)
    expect(sanctioned.sanctions[0].type).toBe('temporary_suspension')
    expect(sanctioned.sanctions[0].durationDays).toBe(30)
    expect(sanctioned.sanctions[0].verifiedBadgeRevoked).toBe(true)
    expect(sanctioned.sanctions[0].isActive).toBe(true)
    expect(sanctioned.investigationNotes[0].actionTaken).toContain('Levied temporary_suspension')
  })

  it('submits a formal ban appeal and adjudicates it with penalty reduction', async () => {
    const appealed = await submitBanAppeal('inc-ts-001', {
      appellantName: 'PlayArena Management',
      appellantEmail: 'management@playarena.in',
      pleaNarrative: 'We have replaced all steel pegs with flush-mount rubber anchors and hired a full-time certified paramedic on site.',
      evidenceUrl: '/evidence/playarena-compliance-audit.pdf',
    })

    expect(appealed.status).toBe('appeal_pending')
    expect(appealed.appeals.length).toBe(1)
    expect(appealed.appeals[0].status).toBe('pending')

    const adjudicated = await adjudicateBanAppeal('inc-ts-001', appealed.appeals[0].id, {
      officer: { name: 'Lead Appellate Officer', email: 'appeals@khelgrid.com' },
      decision: 'penalty_reduced',
      notes: APPEAL_DECISION_PRESETS[1].notes,
    })

    expect(adjudicated.status).toBe('appeal_resolved')
    expect(adjudicated.appeals[0].status).toBe('penalty_reduced')
    expect(adjudicated.appeals[0].adjudicatedBy).toBe('Lead Appellate Officer')
  })

  it('records confidential law enforcement investigation notes', async () => {
    const updated = await addInvestigationNote(
      'inc-ts-002',
      { name: 'Shreya Kulkarni', email: 'shreya.k@khelgrid.com' },
      'FIR No. 412/2026 registered at Hennur Police Station against Apex Sports under IPC 420 (Cheating).',
      true,
    )

    expect(updated.investigationNotes[0].noteText).toContain('FIR No. 412/2026')
    expect(updated.investigationNotes[0].isConfidential).toBe(true)
  })

  it('closes and archives an incident case with formal resolution summary', async () => {
    const closed = await closeTrustSafetyCase('inc-ts-003', {
      officer: { name: 'Rohan Deshmukh', email: 'rohan.d@khelgrid.com' },
      resolutionNotes: 'Coach completed rehabilitation course and settlement reached with complainant.',
    })

    expect(closed.status).toBe('case_closed')
    expect(closed.investigationNotes[0].actionTaken).toBe('Case closed.')
  })

  it('exports RFC 4180 compliance CSV ledger with correct headers', async () => {
    const { cases } = await getAdminTrustSafetyCases()
    const csv = exportTrustSafetyLedgerToCsv(cases)

    expect(csv).toContain('Incident Number,Severity,Status,Category,Title')
    expect(csv).toContain('TS-2026-081')
    expect(csv).toContain('PlayArena Sports Turf Mumbai')
    expect(csv).toContain('critical_p0')
  })

  it('resets cases to baseline when reset test data is triggered', async () => {
    await closeTrustSafetyCase('inc-ts-001', {
      officer: { name: 'Test', email: 'test@khelgrid.com' },
      resolutionNotes: 'Closing for test.',
    })

    const { cases: beforeReset } = await getAdminTrustSafetyCases({ status: 'case_closed' })
    expect(beforeReset.some(c => c.id === 'inc-ts-001')).toBe(true)

    resetAdminTrustSafetyForTesting()

    const { cases: afterReset } = await getAdminTrustSafetyCases()
    const turfCase = afterReset.find(c => c.id === 'inc-ts-001')
    expect(turfCase?.status).toBe('sanction_issued')
  })
})
