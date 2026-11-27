/**
 * partnerVerificationService.test.ts
 *
 * Unit tests for Track 3 Partner Verification & Moderation Status service.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbTenant } from '../../integrations/supabase/tenant-client'
import type { WorkspacePersona } from '../../shared/routing'

const { submitVerificationProofMock, recordTenantAuditLogMock } = vi.hoisted(() => ({
  submitVerificationProofMock: vi.fn(),
  recordTenantAuditLogMock: vi.fn(),
}))

vi.mock('../../integrations/supabase/public-client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../integrations/supabase/public-client')>()
  return {
    ...actual,
    submitVerificationProof: submitVerificationProofMock,
  }
})

vi.mock('../../integrations/supabase/tenant-client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../integrations/supabase/tenant-client')>()
  return {
    ...actual,
    recordTenantAuditLog: recordTenantAuditLogMock,
  }
})

import {
  PARTNER_VERIFICATION_STORAGE_KEY,
  getPartnerVerificationSnapshot,
  getStoredVerificationClaimsForEntity,
  isPartnerVerificationPersona,
  mapPersonaToClaimEntityType,
  submitPartnerVerificationClaim,
  type StoredVerificationClaim,
} from './partnerVerificationService'

function createMockStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = val
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
  }
}

function makeTenant(overrides: Partial<DbTenant> = {}): DbTenant {
  return {
    id: 'tenant-1',
    name: 'Bengaluru Stripes Academy',
    slug: 'bengaluru-stripes',
    tenant_type: 'academy',
    status: 'active',
    city: 'Bengaluru',
    state: 'Karnataka',
    verification_status: 'unverified',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

describe('partnerVerificationService', () => {
  beforeEach(() => {
    submitVerificationProofMock.mockReset()
    recordTenantAuditLogMock.mockReset()
    recordTenantAuditLogMock.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('identifies partner verification personas accurately and excludes athlete/creator', () => {
    const allowed: WorkspacePersona[] = ['academy', 'coach', 'turf', 'host', 'tournament', 'organization']
    for (const p of allowed) {
      expect(isPartnerVerificationPersona(p)).toBe(true)
    }
    expect(isPartnerVerificationPersona('athlete')).toBe(false)
    expect(isPartnerVerificationPersona('creator')).toBe(false)
  })

  it('maps each partner persona to the valid Supabase verification_claims entity_type', () => {
    expect(mapPersonaToClaimEntityType('academy')).toBe('academy')
    expect(mapPersonaToClaimEntityType('organization')).toBe('academy')
    expect(mapPersonaToClaimEntityType('coach')).toBe('coach')
    expect(mapPersonaToClaimEntityType('turf')).toBe('venue')
    expect(mapPersonaToClaimEntityType('host')).toBe('venue')
    expect(mapPersonaToClaimEntityType('tournament')).toBe('opportunity')
  })

  it('returns unverified snapshot when tenant has no claims and unverified DB state', () => {
    const snap = getPartnerVerificationSnapshot({
      persona: 'academy',
      tenant: makeTenant({ verification_status: 'unverified' }),
    })

    expect(snap.status).toBe('unverified')
    expect(snap.statusLabel).toBe('Unverified · Proof Required')
    expect(snap.statusTone).toBe('warning')
    expect(snap.isPubliclyVerified).toBe(false)
    expect(snap.completedSteps).toBe(1)
    expect(snap.totalSteps).toBe(4)
    expect(snap.milestones.map(m => m.state)).toEqual(['done', 'active', 'pending', 'pending'])
    expect(snap.requiredEvidence).toHaveLength(3)
  })

  it('elevates unverified tenant with a stored local claim to pending_review', () => {
    const claim: StoredVerificationClaim = {
      id: 'claim-1',
      entityType: 'academy',
      entitySlug: 'bengaluru-stripes',
      entityName: 'Bengaluru Stripes Academy',
      contactName: 'Rahul Dravid',
      contactPhone: '+91 9845012345',
      documentType: 'affiliation_certificate',
      proofDetails: 'KSCA-AFF-2026-991',
      status: 'pending_review',
      submittedAt: '2026-11-24T10:00:00Z',
    }
    vi.stubGlobal('window', {
      localStorage: createMockStorage({
        [PARTNER_VERIFICATION_STORAGE_KEY]: JSON.stringify([claim]),
      }),
    })

    const stored = getStoredVerificationClaimsForEntity('bengaluru-stripes')
    expect(stored).toHaveLength(1)

    const snap = getPartnerVerificationSnapshot({
      persona: 'academy',
      tenant: makeTenant({ verification_status: 'unverified' }),
    })
    expect(snap.status).toBe('pending_review')
    expect(snap.statusLabel).toBe('Pending Moderation Review')
    expect(snap.statusTone).toBe('info')
    expect(snap.completedSteps).toBe(2)
    expect(snap.milestones.map(m => m.state)).toEqual(['done', 'done', 'active', 'pending'])
  })

  it('respects authoritative DB verified state regardless of pending local claims', () => {
    const snap = getPartnerVerificationSnapshot({
      persona: 'coach',
      tenant: makeTenant({
        slug: 'nis-coach-arjun',
        name: 'Coach Arjun Rao',
        tenant_type: 'coach',
        verification_status: 'verified',
      }),
    })

    expect(snap.status).toBe('verified')
    expect(snap.statusLabel).toBe('KhelGrid Verified')
    expect(snap.statusTone).toBe('success')
    expect(snap.isPubliclyVerified).toBe(true)
    expect(snap.completedSteps).toBe(4)
    expect(snap.milestones.map(m => m.state)).toEqual(['done', 'done', 'done', 'done'])
  })

  it('surfaces rejection_reason from tenant metadata on rejected status', () => {
    const snap = getPartnerVerificationSnapshot({
      persona: 'turf',
      tenant: makeTenant({
        tenant_type: 'venue',
        verification_status: 'rejected',
        metadata: {
          rejection_reason: 'Municipal trade license uploaded is expired; upload 2026 renewal.',
        },
      }),
    })

    expect(snap.status).toBe('rejected')
    expect(snap.statusLabel).toBe('Verification Rejected')
    expect(snap.statusTone).toBe('danger')
    expect(snap.rejectionReason).toBe('Municipal trade license uploaded is expired; upload 2026 renewal.')
    expect(snap.milestones[2].state).toBe('blocked')
    expect(snap.milestones[2].detail).toContain('expired')
  })

  it('keeps directory listing distinct from verification when directory_publication_status is unpublished or approved', () => {
    const unpublishedSnap = getPartnerVerificationSnapshot({
      persona: 'academy',
      tenant: makeTenant({
        verification_status: 'verified',
        directory_publication_status: 'unpublished',
      }),
    })
    expect(unpublishedSnap.isPubliclyVerified).toBe(true)
    expect(unpublishedSnap.isPubliclyListed).toBe(false)
    expect(unpublishedSnap.directoryPublicationStatus).toBe('unpublished')
    expect(unpublishedSnap.headline).toContain('Awaiting Public Directory Publication')
    expect(unpublishedSnap.milestones[3].state).toBe('pending')

    const approvedSnap = getPartnerVerificationSnapshot({
      persona: 'academy',
      tenant: makeTenant({
        verification_status: 'verified',
        directory_publication_status: 'approved',
      }),
    })
    expect(approvedSnap.isPubliclyVerified).toBe(true)
    expect(approvedSnap.isPubliclyListed).toBe(true)
    expect(approvedSnap.milestones[3].state).toBe('done')
  })

  it('surfaces moderatorNotes on more_info_needed claim status', () => {
    const claim: StoredVerificationClaim = {
      id: 'claim-2',
      entityType: 'venue',
      entitySlug: 'koramangala-arena',
      entityName: 'Koramangala Arena',
      contactName: 'Kiran Patel',
      contactPhone: '9845098765',
      documentType: 'geotagged_photos',
      proofDetails: 'https://drive.example.com/photos',
      status: 'more_info_needed',
      moderatorNotes: 'Please include clear wide-angle floodlight & entry gate signboard photo.',
      submittedAt: '2026-11-24T12:00:00Z',
    }
    vi.stubGlobal('window', {
      localStorage: createMockStorage({
        [PARTNER_VERIFICATION_STORAGE_KEY]: JSON.stringify([claim]),
      }),
    })

    const snap = getPartnerVerificationSnapshot({
      persona: 'host',
      entitySlug: 'koramangala-arena',
      entityName: 'Koramangala Arena',
    })

    expect(snap.status).toBe('more_info_needed')
    expect(snap.statusLabel).toBe('Clarification Requested')
    expect(snap.statusTone).toBe('warning')
    expect(snap.moderatorNotes).toBe('Please include clear wide-angle floodlight & entry gate signboard photo.')
    expect(snap.milestones[2].state).toBe('blocked')
  })

  it('validates proof submission inputs before calling submitVerificationProof', async () => {
    const badName = await submitPartnerVerificationClaim({
      persona: 'academy',
      entitySlug: 'test-ac',
      entityName: 'Test Academy',
      documentType: 'affiliation_certificate',
      proofDetails: 'KSCA-123456',
      contactName: 'A',
      contactPhone: '9845012345',
    })
    expect(badName.success).toBe(false)
    expect(submitVerificationProofMock).not.toHaveBeenCalled()

    const badPhone = await submitPartnerVerificationClaim({
      persona: 'academy',
      entitySlug: 'test-ac',
      entityName: 'Test Academy',
      documentType: 'affiliation_certificate',
      proofDetails: 'KSCA-123456',
      contactName: 'Ramesh',
      contactPhone: '12345',
    })
    expect(badPhone.success).toBe(false)
    expect(submitVerificationProofMock).not.toHaveBeenCalled()

    const badProof = await submitPartnerVerificationClaim({
      persona: 'academy',
      entitySlug: 'test-ac',
      entityName: 'Test Academy',
      documentType: 'affiliation_certificate',
      proofDetails: 'abc',
      contactName: 'Ramesh',
      contactPhone: '9845012345',
    })
    expect(badProof.success).toBe(false)
    expect(submitVerificationProofMock).not.toHaveBeenCalled()
  })

  it('submits valid verification claim, logs tenant audit event, and dispatches verification-changed', async () => {
    const dispatchEvent = vi.fn()
    vi.stubGlobal('window', {
      dispatchEvent,
    })
    submitVerificationProofMock.mockResolvedValue({
      success: true,
      message: 'Verification claim submitted.',
    })

    const res = await submitPartnerVerificationClaim({
      persona: 'turf',
      entitySlug: 'koramangala-turf',
      entityName: 'Koramangala Turf',
      tenantId: 'tenant-turf-1',
      documentType: 'ground_lease',
      proofDetails: 'BBMP Lease Deed #4491/2026',
      contactName: '  Suresh Raina  ',
      contactPhone: ' 9845012345 ',
      contactEmail: ' ops@koramangala.in ',
    })

    expect(res.success).toBe(true)
    expect(submitVerificationProofMock).toHaveBeenCalledWith({
      entityType: 'venue',
      entitySlug: 'koramangala-turf',
      entityName: 'Koramangala Turf',
      contactName: 'Suresh Raina',
      contactPhone: '9845012345',
      contactEmail: 'ops@koramangala.in',
      claimantRole: 'turf',
      documentType: 'ground_lease',
      proofDetails: 'BBMP Lease Deed #4491/2026',
    })
    expect(recordTenantAuditLogMock).toHaveBeenCalledWith({
      tenantId: 'tenant-turf-1',
      action: 'verification_proof_submitted',
      entityType: 'verification_claims',
      details: {
        entitySlug: 'koramangala-turf',
        documentType: 'ground_lease',
        persona: 'turf',
      },
    })
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
  })
})
