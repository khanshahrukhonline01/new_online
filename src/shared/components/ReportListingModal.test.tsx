import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ReportListingModal from './ReportListingModal'

describe('ReportListingModal — Anti-Scam Reporting System', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ReportListingModal
        isOpen={false}
        onClose={vi.fn()}
        entityType="academy"
        entitySlug="test-academy"
        entityName="Delhi Elite Football Academy"
      />
    )
    expect(html).toBe('')
  })

  it('renders flagging reasons, entity name, and evidence fields when open', () => {
    const html = renderToStaticMarkup(
      <ReportListingModal
        isOpen={true}
        onClose={vi.fn()}
        entityType="academy"
        entitySlug="delhi-elite-academy"
        entityName="Delhi Elite Football Academy"
      />
    )

    // Heading & Entity Name
    expect(html).toContain('Report Suspicious Listing or Potential Scam')
    expect(html).toContain('Delhi Elite Football Academy')

    // Reasons
    expect(html).toContain('Demanding advance cash / unauthorized trial fees')
    expect(html).toContain('Fake selection trial or unauthorized tournament combine')
    expect(html).toContain('Impersonating an official club, academy, or national coach')
    expect(html).toContain('Non-existent playing facility or fraudulent turf booking')
    expect(html).toContain('Incorrect / invalid contact phone number or address')

    // Form inputs & actions
    expect(html).toContain('Evidence &amp; Description')
    expect(html).toContain('Submit Safety Report')
    expect(html).toContain('Cancel')
  })
})
