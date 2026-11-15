import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const validUrl = 'https://example.supabase.co'
const anonKey = 'public-anon-key'

async function loadClient(url = validUrl, key = anonKey) {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
  return import('./public-client')
}

describe('trust and safety submissions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe('submitListingReport', () => {
    it('sends POST to Supabase rest/v1/listing_reports when credentials are configured', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 201 }))
      const client = await loadClient()

      const result = await client.submitListingReport({
        entityType: 'academy',
        entityId: 'acad-123',
        entitySlug: 'delhi-badminton-hub',
        entityName: 'Delhi Badminton Hub',
        reason: 'unauthorized_fee',
        details: 'Demanding 5000 advance UPI payment for trials',
        reporterEmail: 'parent@example.com',
        reporterPhone: '+91 98765 43210',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('KhelGrid Trust & Safety')

      expect(fetch).toHaveBeenCalledTimes(1)
      const [requestUrl, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(requestUrl)).toBe(`${validUrl}/rest/v1/listing_reports`)
      expect(options?.method).toBe('POST')
      expect(options?.headers).toMatchObject({
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      })

      const body = JSON.parse(String(options?.body))
      expect(body).toEqual({
        entity_type: 'academy',
        entity_id: 'acad-123',
        entity_slug: 'delhi-badminton-hub',
        entity_name: 'Delhi Badminton Hub',
        reason: 'unauthorized_fee',
        details: 'Demanding 5000 advance UPI payment for trials',
        reporter_email: 'parent@example.com',
        reporter_phone: '+91 98765 43210',
        status: 'pending',
      })
    })

    it('falls back gracefully to local storage when fetch fails or unconfigured', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      const client = await loadClient()

      const result = await client.submitListingReport({
        entityType: 'venue',
        entitySlug: 'apex-turf',
        entityName: 'Apex Turf',
        reason: 'fake_venue',
        details: 'No turf exists at this address',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('submitVerificationProof', () => {
    it('sends POST to Supabase rest/v1/verification_claims when credentials are configured', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 201 }))
      const client = await loadClient()

      const result = await client.submitVerificationProof({
        entityType: 'academy',
        entitySlug: 'gopichand-badminton-academy',
        entityName: 'Pullela Gopichand Badminton Academy',
        contactName: 'Coach Rajeev',
        contactPhone: '+91 98111 22233',
        contactEmail: 'contact@pgba.in',
        claimantRole: 'Head Coach',
        documentType: 'affiliation_certificate',
        proofDetails: 'BAI / BWF Affiliation Certificate #BAI-2024-TEL-089',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Sports Desk will review your credentials')

      expect(fetch).toHaveBeenCalledTimes(1)
      const [requestUrl, options] = vi.mocked(fetch).mock.calls[0]
      expect(String(requestUrl)).toBe(`${validUrl}/rest/v1/verification_claims`)
      expect(options?.method).toBe('POST')
      expect(options?.headers).toMatchObject({
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      })

      const body = JSON.parse(String(options?.body))
      expect(body).toEqual({
        entity_type: 'academy',
        entity_slug: 'gopichand-badminton-academy',
        entity_name: 'Pullela Gopichand Badminton Academy',
        contact_name: 'Coach Rajeev',
        contact_phone: '+91 98111 22233',
        contact_email: 'contact@pgba.in',
        claimant_role: 'Head Coach',
        document_type: 'affiliation_certificate',
        proof_details: 'BAI / BWF Affiliation Certificate #BAI-2024-TEL-089',
        status: 'pending_review',
      })
    })

    it('falls back gracefully to local storage when fetch fails or unconfigured', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      const client = await loadClient()

      const result = await client.submitVerificationProof({
        entityType: 'venue',
        entitySlug: 'decathlon-turf',
        entityName: 'Decathlon Sports Arena',
        contactName: 'Manager Suresh',
        contactPhone: '+91 98222 33344',
        documentType: 'ground_lease',
        proofDetails: 'Commercial Lease Agreement 2024-2029',
      })

      expect(result.success).toBe(true)
    })
  })
})
