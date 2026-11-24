import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminVerificationVaultDesk } from './AdminVerificationVaultDesk'
import {
  getAdminVerifications,
  getAdminVerificationDetails,
  approveVerification,
  requestVerificationCorrections,
  rejectVerification,
  revokeVerification,
  extendVerificationExpiry,
  addVerificationAuditNote,
  exportVerificationsToCsv,
  calculateExpiryStatus,
  resetAdminVerificationsForTesting,
} from '../services/adminVerificationService'

describe('AdminVerificationVaultDesk & Evidence Vault', () => {
  beforeEach(() => {
    resetAdminVerificationsForTesting()
  })

  it('renders the verification desk header, micro-KPI telemetry cards, and category filter pills', () => {
    const html = renderToStaticMarkup(
      <AdminVerificationVaultDesk operatorEmail="lead.verifier@khelgrid.com" />
    )

    expect(html).toContain('Verification Centre &amp; Evidence Vault')
    expect(html).toContain('KhelGrid Trust &amp; Credential Infrastructure')
    expect(html).toContain('Vault Dossiers')
    expect(html).toContain('Verified Seals')
    expect(html).toContain('Pending Reviews')
    expect(html).toContain('Discrepancies')
    expect(html).toContain('Expiring / Expired')
    expect(html).toContain('Authenticity Rate')
    expect(html).toContain('All Entities')
    expect(html).toContain('Coach')
    expect(html).toContain('Academy')
    expect(html).toContain('Venue')
    expect(html).toContain('Organiser')
    expect(html).toContain('Athlete')
  })

  it('renders seed verification dossiers with authentic Indian sports bodies and credentials', () => {
    const html = renderToStaticMarkup(
      <AdminVerificationVaultDesk operatorEmail="lead.verifier@khelgrid.com" />
    )

    // Coach Rajesh Kumar (Football - AFC 'A' license + NIS)
    expect(html).toContain('Coach Rajesh Kumar')
    expect(html).toContain('KG-COACH-7721')
    expect(html).toContain('NCR Elite Football Residency')
    expect(html).toContain('Football')

    // Bengaluru Grassroots Academy (Badminton - KBA/BAI)
    expect(html).toContain('Bengaluru Grassroots Badminton Academy')
    expect(html).toContain('KG-ACAD-8832')
    expect(html).toContain('Bengaluru')

    // Decathlon Turf Arena Whitefield (Multi-sport venue - FIFA Quality turf)
    expect(html).toContain('Decathlon Arena Whitefield')
    expect(html).toContain('KG-VENUE-9104')

    // Subroto Cup Organising Committee (AIFF Sanction)
    expect(html).toContain('Subroto Mukerjee Sports Education Society')
    expect(html).toContain('KG-ORG-6619')

    // Coach Sunita Devi (Boxing - BFI 3-Star + NIS Master)
    expect(html).toContain('Coach Sunita Devi')
    expect(html).toContain('KG-COACH-4190')

    // Riya Sen (Swimming - SFI National Gold)
    expect(html).toContain('Riya Sen')
    expect(html).toContain('KG-ATH-9011')
  })

  it('calculates automated expiry tracking accurately for time-bound credentials', () => {
    // 1. Permanent credential (no expiry date)
    const perm = calculateExpiryStatus(undefined)
    expect(perm.status).toBe('permanent')
    expect(perm.daysRemaining).toBeNull()
    expect(perm.formattedLabel).toContain('Permanent')

    // 2. Expired credential
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const expired = calculateExpiryStatus(pastDate.toISOString())
    expect(expired.status).toBe('expired')
    expect(expired.daysRemaining).toBeLessThanOrEqual(0)
    expect(expired.formattedLabel).toContain('Expired')

    // 3. Expiring soon credential (within 60 days)
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 30)
    const soon = calculateExpiryStatus(soonDate.toISOString())
    expect(soon.status).toBe('expiring_soon')
    expect(soon.daysRemaining).toBeGreaterThan(0)
    expect(soon.daysRemaining).toBeLessThanOrEqual(60)
    expect(soon.formattedLabel).toContain('Expiring in')

    // 4. Valid long-term credential (> 60 days)
    const farDate = new Date()
    farDate.setDate(farDate.getDate() + 180)
    const valid = calculateExpiryStatus(farDate.toISOString())
    expect(valid.status).toBe('valid')
    expect(valid.daysRemaining).toBeGreaterThan(60)
    expect(valid.formattedLabel).toContain('Valid')
  })

  it('approves verification application, issuing a Verified Trust Seal with calculated expiry date', () => {
    const targetId = 'kg-verif-002' // Bengaluru Grassroots Badminton Academy (was pending_review)
    const before = getAdminVerificationDetails(targetId)
    expect(before?.status).toBe('pending_review')

    const updated = approveVerification(
      targetId,
      'tier_1_platinum',
      12,
      'lead.verifier@khelgrid.com',
      'KBA affiliation and Fire NOC verified with state registrar.'
    )

    expect(updated.status).toBe('verified')
    expect(updated.badgeTier).toBe('tier_1_platinum')
    expect(updated.assignedReviewer).toBe('lead.verifier@khelgrid.com')
    expect(updated.expiresAt).toBeDefined()
    expect(updated.auditTrail[0].action).toBe('verified_approved')
    expect(updated.auditTrail[0].notes).toContain('KBA affiliation')
  })

  it('requests evidence corrections, transitioning status to action_required with detailed notes', () => {
    const targetId = 'kg-verif-005' // Aarav Mehta
    const updated = requestVerificationCorrections(
      targetId,
      'Please submit TW3 bone age assessment scan from an accredited SAI or district hospital.',
      'mod.athletics@khelgrid.com'
    )

    expect(updated.status).toBe('action_required')
    expect(updated.actionRequiredNotes).toContain('TW3 bone age assessment')
    expect(updated.auditTrail[0].action).toBe('clarification_requested')
    expect(updated.auditTrail[0].actorEmail).toBe('mod.athletics@khelgrid.com')
  })

  it('rejects fraudulent or unsanctioned applications with recorded justification', () => {
    const targetId = 'kg-verif-008' // Velocity Padel
    const updated = rejectVerification(
      targetId,
      'Unauthorized commercial tournament; lacks sanction from Maharashtra Olympic Association.',
      'lead.verifier@khelgrid.com'
    )

    expect(updated.status).toBe('rejected')
    expect(updated.rejectionReason).toContain('Unauthorized commercial tournament')
    expect(updated.auditTrail[0].action).toBe('rejected')
  })

  it('revokes an existing verified trust seal in response to compliance violations', () => {
    const targetId = 'kg-verif-001' // Coach Rajesh Kumar (was verified)
    const updated = revokeVerification(
      targetId,
      'Suspension notice received from AIFF disciplinary committee pending inquiry.',
      'compliance.officer@khelgrid.com'
    )

    expect(updated.status).toBe('revoked')
    expect(updated.badgeTier).toBeUndefined()
    expect(updated.rejectionReason).toContain('Suspension notice received from AIFF')
    expect(updated.auditTrail[0].action).toBe('revoked')
  })

  it('extends credential validity / grants grace period for expiring or expired licenses', () => {
    const targetId = 'kg-verif-009' // Coach Vikramaditya Rao (BCCI Level 2, expired)
    const before = getAdminVerificationDetails(targetId)
    expect(before?.status).toBe('expired')

    const updated = extendVerificationExpiry(
      targetId,
      6,
      'lead.verifier@khelgrid.com',
      'Interim 6-month grace period granted while BCCI NCA refresher course is completed.'
    )

    expect(updated.status).toBe('verified')
    const exp = calculateExpiryStatus(updated.expiresAt)
    expect(exp.status).toBe('valid')
    expect(updated.auditTrail[0].action).toBe('expiry_extended')
    expect(updated.auditTrail[0].summary).toContain('extended by 6 months')
  })

  it('appends an internal administrative audit note to the chronological ledger', () => {
    const targetId = 'kg-verif-003' // Decathlon Arena
    const noteContent = 'Spoke with facility manager Rajeshwari; confirmed LED lux level test scheduled for Dec 2026.'

    const updated = addVerificationAuditNote(
      targetId,
      noteContent,
      'ground.inspector@khelgrid.com'
    )

    expect(updated.auditTrail[0].action).toBe('note_added')
    expect(updated.auditTrail[0].notes).toBe(noteContent)
    expect(updated.auditTrail[0].actorEmail).toBe('ground.inspector@khelgrid.com')
  })

  it('exports all filtered verification dossiers into RFC 4180 compliant CSV', () => {
    const items = getAdminVerifications()
    const csv = exportVerificationsToCsv(items)

    expect(csv).toContain('Reference Code,Entity Type,Entity Name,Organization,Sport,City,State,Status,Badge Tier,Documents Count')
    expect(csv).toContain('KG-COACH-7721,coach,Coach Rajesh Kumar')
    expect(csv).toContain('KG-ACAD-8832,academy,Bengaluru Grassroots Badminton Academy')
    expect(csv).toContain('KG-VENUE-9104,venue,Decathlon Arena Whitefield')
    expect(csv).toContain('KG-ORG-6619,organiser,Subroto Mukerjee Sports Education Society')
    expect(csv).toContain('tier_1_platinum')
    expect(csv).toContain('Football')
    expect(csv).toContain('Bengaluru')
  })
})
