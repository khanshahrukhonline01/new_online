import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminGroundOversightView } from './AdminGroundOversightView'
import {
  getGateCheckInSnapshot,
  verifyAndAdmitGateToken,
  quarantineGatePass,
  syncOfflineGateBuffer,
  getTurfOversightSnapshot,
  lockTurfSlotForMaintenance,
  releaseTurfMaintenanceLock,
  getAcademyOversightSnapshot,
  verifyCoachBatchAssignment,
  recordBatchAttendanceAudit,
  exportGroundOperationsCsv,
  resetGroundOperationsForTesting,
} from '../services/adminGroundOperationsService'
import {
  getPlatformGovernanceSnapshot,
  resetPlatformGovernanceForTesting,
} from '../services/adminPlatformGovernanceService'

const OPS_EMAIL = 'ground.ops@khelgrid.com'

describe('Graduated Phase 5+ Ground & Facility Operations Desks', () => {
  beforeEach(() => {
    resetGroundOperationsForTesting()
    resetPlatformGovernanceForTesting()
  })

  it('renders live telemetry views for gate, turf, and academy desks with zero unavailable placeholders', () => {
    const gateHtml = renderToStaticMarkup(
      <AdminGroundOversightView initialDesk="gate" operatorEmail={OPS_EMAIL} />,
    )
    expect(gateHtml).toContain('Universal QR Gate Check-In &amp; Admission Oversight')
    expect(gateHtml).toContain('#PASS-DCA-8841')
    expect(gateHtml).not.toContain('MODULE STATUS · UNAVAILABLE')

    const turfHtml = renderToStaticMarkup(
      <AdminGroundOversightView initialDesk="turf" operatorEmail={OPS_EMAIL} />,
    )
    expect(turfHtml).toContain('Turf Slot Utilization, Booking &amp; Maintenance Calendars')
    expect(turfHtml).toContain('Andheri West Floodlit AstroTurf Arena')
    expect(turfHtml).toContain('Maintenance Lock')

    const academyHtml = renderToStaticMarkup(
      <AdminGroundOversightView initialDesk="academy" operatorEmail={OPS_EMAIL} />,
    )
    expect(academyHtml).toContain('Academy Batch, Coach Credential &amp; Attendance Oversight')
    expect(academyHtml).toContain('Delhi Cricket Academy')
    expect(academyHtml).toContain('BCCI Level-2 Certified')
  })

  it('verifies fresh QR tokens, blocks duplicate replay attempts, quarantines tokens, and syncs offline buffers', () => {
    const before = getGateCheckInSnapshot()
    expect(before.metrics.offlinePendingSyncCount).toBe(2)

    // Duplicate replay against already admitted token #PASS-DCA-8841
    const replay = verifyAndAdmitGateToken({ token: '#PASS-DCA-8841' }, OPS_EMAIL)
    expect(replay.admitted).toBe(false)
    expect(replay.record.telemetryState).toBe('duplicate_blocked')

    // Valid new token admission
    const valid = verifyAndAdmitGateToken(
      {
        token: '#PASS-NEW-2026-IND',
        facility: 'Thyagaraj Sports Complex Gate 2',
        holderName: 'Kabir Verma (Basketball Trial)',
        sport: 'Basketball',
      },
      OPS_EMAIL,
    )
    expect(valid.admitted).toBe(true)
    expect(valid.record.telemetryState).toBe('admitted')

    // Quarantine newly admitted record
    const quarantined = quarantineGatePass(valid.record.id, OPS_EMAIL, 'Forged trial slip photo detected')
    expect(quarantined.telemetryState).toBe('quarantined')

    // Flush offline queue
    const syncRes = syncOfflineGateBuffer(OPS_EMAIL)
    expect(syncRes.syncedCount).toBe(2)

    const after = getGateCheckInSnapshot()
    expect(after.metrics.offlinePendingSyncCount).toBe(0)
    expect(after.metrics.blockedAnomaliesCount).toBeGreaterThanOrEqual(3)
  })

  it('locks turf slots for safety maintenance and reopens slots cleanly with utilization recalculation', () => {
    const before = getTurfOversightSnapshot()
    const lockedBefore = before.metrics.maintenanceLockedSlots

    // Lock an available slot
    const locked = lockTurfSlotForMaintenance(
      'slot-indr-1500',
      OPS_EMAIL,
      'floodlight_electrical',
      'LED tower ballast replacement scheduled.',
    )
    expect(locked.status).toBe('blocked')

    const mid = getTurfOversightSnapshot()
    expect(mid.metrics.maintenanceLockedSlots).toBe(lockedBefore + 1)

    // Release existing Andheri lock after peg repair verification
    const reopened = releaseTurfMaintenanceLock(
      'slot-andh-1800',
      OPS_EMAIL,
      'Verified steel anchor pegs recessed and turf patched safely.',
    )
    expect(reopened.status).toBe('available')

    const after = getTurfOversightSnapshot()
    expect(after.metrics.maintenanceLockedSlots).toBe(lockedBefore)
  })

  it('audits academy batch attendance, coach licensing, and triggers safety/drop-off compliance alerts', () => {
    // Verify previously flagged coach in Pune batch
    const verifiedBatch = verifyCoachBatchAssignment(
      'bat-pune-u14-evening',
      'verified',
      OPS_EMAIL,
      'Uploaded BCCI Level-1 certificate for permanent assistant coach.',
    )
    expect(verifiedBatch.coachCredentialStatus).toBe('verified')

    // Log session audit with unsafe safety ratio and low attendance
    const flaggedSession = recordBatchAttendanceAudit(
      'bat-dca-u17-pace',
      12,
      12,
      false,
      OPS_EMAIL,
      'Second bowling coach absent; coach ratio dropped below 1:15 threshold.',
    )
    expect(flaggedSession.weeklyAttendancePercent).toBe(50)
    expect(flaggedSession.oversightStatus).toBe('ratio_violation')

    const snap = getAcademyOversightSnapshot()
    expect(snap.metrics.complianceAlertsCount).toBeGreaterThanOrEqual(1)
  })

  it('exports RFC 4180 CSVs across all 3 desks and feeds events into Module 7 Platform Audit Explorer', async () => {
    expect(exportGroundOperationsCsv('gate')).toContain('#PASS-DCA-8841')
    expect(exportGroundOperationsCsv('turf')).toContain('Andheri West Floodlit AstroTurf Arena')
    expect(exportGroundOperationsCsv('academy')).toContain('Delhi Cricket Academy')

    const govSnap = await getPlatformGovernanceSnapshot()
    const sources = new Set(govSnap.auditEvents.map(e => e.sourceModule))
    expect(sources.has('gate_desk')).toBe(true)
    expect(sources.has('turf_oversight')).toBe(true)
    expect(sources.has('academy_oversight')).toBe(true)
  })
})
