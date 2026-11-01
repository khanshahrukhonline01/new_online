import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VerificationClaimModal from './VerificationClaimModal'

describe('VerificationClaimModal — Credential Authentication & Claim System', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <VerificationClaimModal
        isOpen={false}
        onClose={vi.fn()}
        entityType="academy"
        entitySlug="punjab-sports-academy"
        entityName="Punjab Sports Academy"
      />
    )
    expect(html).toBe('')
  })

  it('renders credential document categories, entity name, and contact fields when open', () => {
    const html = renderToStaticMarkup(
      <VerificationClaimModal
        isOpen={true}
        onClose={vi.fn()}
        entityType="academy"
        entitySlug="punjab-sports-academy"
        entityName="Punjab Sports Academy"
      />
    )

    // Heading & Entity Name
    expect(html).toContain('Verify &amp; Authenticate Listing')
    expect(html).toContain('Punjab Sports Academy')

    // Document Categories
    expect(html).toContain('Federation / State Association Affiliation (AIFF, BAI, BCCI, etc.)')
    expect(html).toContain('Ground Ownership / Commercial Lease / Municipal Allotment')
    expect(html).toContain('Head Coach License (NIS Diploma, AFC/BWF Badge)')
    expect(html).toContain('Society Registration / GST / Trust Deed')
    expect(html).toContain('Geotagged Facility Photographs / Entrance Signboard')

    // Safety and Verification notice
    expect(html).toContain('To eliminate sports scams and protect Indian athletes')

    // Action button
    expect(html).toContain('Submit for Verification')
    expect(html).toContain('Cancel')
  })
})
