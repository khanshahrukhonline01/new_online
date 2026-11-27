import { describe, it, expect, beforeEach } from 'vitest'
import {
  claimQueueRecord,
  computeOperatorWorkloads,
  getQueueClaim,
  getQueueWorkflowAuditEvents,
  isClaimStale,
  listQueueClaims,
  reassignQueueRecord,
  releaseQueueRecord,
  resetQueueWorkflowForTesting,
} from './adminQueueWorkflowService'

describe('adminQueueWorkflowService', () => {
  beforeEach(() => {
    resetQueueWorkflowForTesting()
  })

  it('claims, reassigns, and releases queue records while logging audit events', () => {
    const claim = claimQueueRecord({
      desk: 'verification_vault',
      recordId: 'ver-991',
      referenceCode: 'VER-2026-991',
      recordTitle: 'Sunrise Cricket Academy',
      operatorEmail: 'moderator@khelgrid.com',
    })
    expect(claim.claimedBy).toBe('moderator@khelgrid.com')
    expect(getQueueClaim('verification_vault', 'ver-991')?.claimedByName).toBe('Lead Moderator')

    const reassigned = reassignQueueRecord({
      desk: 'verification_vault',
      recordId: 'ver-991',
      targetOperatorEmail: 'compliance.lead@khelgrid.com',
      actorEmail: 'moderator@khelgrid.com',
      referenceCode: 'VER-2026-991',
      recordTitle: 'Sunrise Cricket Academy',
    })
    expect(reassigned.claimedBy).toBe('compliance.lead@khelgrid.com')

    const released = releaseQueueRecord({
      desk: 'verification_vault',
      recordId: 'ver-991',
      operatorEmail: 'compliance.lead@khelgrid.com',
    })
    expect(released).toBe(true)
    expect(getQueueClaim('verification_vault', 'ver-991')).toBeNull()

    const events = getQueueWorkflowAuditEvents()
    expect(events.map(e => e.action).slice(0, 3)).toEqual([
      'QUEUE_RECORD_RELEASED',
      'QUEUE_RECORD_REASSIGNED',
      'QUEUE_RECORD_CLAIMED',
    ])
  })

  it('detects stale claims past the threshold and aggregates operator workloads accurately', () => {
    const nowMs = Date.parse('2026-11-26T12:00:00.000Z')
    const staleClaim = {
      claimKey: 'moderation_desk::rec-1',
      desk: 'moderation_desk' as const,
      recordId: 'rec-1',
      claimedBy: 'moderator@khelgrid.com',
      claimedByName: 'Lead Moderator',
      claimedAt: '2026-11-26T08:00:00.000Z',
    }
    const freshClaim = {
      claimKey: 'fraud_disputes::rec-2',
      desk: 'fraud_disputes' as const,
      recordId: 'rec-2',
      claimedBy: 'moderator@khelgrid.com',
      claimedByName: 'Lead Moderator',
      claimedAt: '2026-11-26T11:30:00.000Z',
    }

    expect(isClaimStale(staleClaim, nowMs, 2)).toBe(true)
    expect(isClaimStale(freshClaim, nowMs, 2)).toBe(false)

    const workloads = computeOperatorWorkloads([staleClaim, freshClaim], nowMs)
    const leadMod = workloads.find(w => w.operatorEmail === 'moderator@khelgrid.com')
    expect(leadMod?.totalClaimed).toBe(2)
    expect(leadMod?.byDesk.moderation_desk).toBe(1)
    expect(leadMod?.byDesk.fraud_disputes).toBe(1)
    expect(leadMod?.oldestClaimHours).toBe(4)

    expect(listQueueClaims().length).toBeGreaterThanOrEqual(2)
  })
})
