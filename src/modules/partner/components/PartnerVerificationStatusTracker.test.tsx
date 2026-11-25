/**
 * PartnerVerificationStatusTracker.test.tsx
 *
 * Component SSR render tests for PartnerVerificationStatusTracker across verification lifecycle states.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DbTenant } from '../../../integrations/supabase/tenant-client'
import { PartnerVerificationStatusTracker } from './PartnerVerificationStatusTracker'
import { PARTNER_VERIFICATION_STORAGE_KEY, type StoredVerificationClaim } from '../partnerVerificationService'

function createMockStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = val
    },
  }
}

function makeTenant(overrides: Partial<DbTenant> = {}): DbTenant {
  return {
    id: 't-1',
    name: 'Indiranagar Shuttle Club',
    slug: 'indiranagar-shuttle',
    tenant_type: 'academy',
    status: 'active',
    verification_status: 'unverified',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

describe('PartnerVerificationStatusTracker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders unverified status prompt, milestones, and Submit Accreditation Proof CTA', () => {
    const html = renderToStaticMarkup(
      <PartnerVerificationStatusTracker
        persona="academy"
        tenant={makeTenant({ verification_status: 'unverified' })}
      />
    )

    expect(html).toContain('data-testid="partner-verification-tracker"')
    expect(html).toContain('Unverified · Proof Required')
    expect(html).toContain('Stage 1/4 Complete')
    expect(html).toContain('Submit Accreditation Proof')
    expect(html).toContain('Workspace Provisioned')
    expect(html).toContain('Credentials Submitted')
    expect(html).toContain('Moderation Desk Audit')
    expect(html).toContain('Verified Public Badge')
  })

  it('renders pending review state when stored verification claim exists', () => {
    const claim: StoredVerificationClaim = {
      id: 'c-1',
      entityType: 'venue',
      entitySlug: 'indiranagar-shuttle',
      entityName: 'Indiranagar Shuttle Club',
      contactName: 'Prakash Padukone',
      contactPhone: '9845011223',
      documentType: 'ground_lease',
      proofDetails: 'Lease-2026',
      status: 'pending_review',
      submittedAt: '2026-11-24T08:00:00Z',
    }
    vi.stubGlobal('window', {
      localStorage: createMockStorage({
        [PARTNER_VERIFICATION_STORAGE_KEY]: JSON.stringify([claim]),
      }),
    })

    const html = renderToStaticMarkup(
      <PartnerVerificationStatusTracker
        persona="turf"
        tenant={makeTenant({ tenant_type: 'venue', verification_status: 'unverified' })}
      />
    )

    expect(html).toContain('Pending Moderation Review')
    expect(html).toContain('Stage 2/4 Complete')
    expect(html).toContain('Track Moderation &amp; Evidence')
  })

  it('renders rejected state with moderation reason and resubmit CTA', () => {
    const html = renderToStaticMarkup(
      <PartnerVerificationStatusTracker
        persona="coach"
        tenant={makeTenant({
          tenant_type: 'coach',
          verification_status: 'rejected',
          metadata: {
            rejection_reason: 'NIS diploma registration number could not be verified.',
          },
        })}
      />
    )

    expect(html).toContain('Verification Rejected')
    expect(html).toContain('Resubmit Corrected Proof')
    expect(html).toContain('NIS diploma registration number could not be verified.')
  })

  it('renders verified state with Stage 4/4 Complete and View Verification Vault CTA', () => {
    const html = renderToStaticMarkup(
      <PartnerVerificationStatusTracker
        persona="organization"
        tenant={makeTenant({
          tenant_type: 'club',
          verification_status: 'verified',
        })}
      />
    )

    expect(html).toContain('Official KhelGrid Verified Partner')
    expect(html).toContain('Stage 4/4 Complete')
    expect(html).toContain('View Verification Vault')
  })
})
