import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CURATED_OPPORTUNITIES } from '../../shared/data/curatedOpportunitiesData'
import { OpportunityDetail, resolveCatalogueRecordBySlug } from './CatalogueDetailPage'

describe('CatalogueDetailPage published opportunity details', () => {
  it('renders the opportunity facts when supplied a published-record fixture', () => {
    // This fixture tests presentation only; production detail pages never use curated fallback data.
    const item = CURATED_OPPORTUNITIES[0]
    const html = renderToStaticMarkup(<OpportunityDetail item={item} />)

    expect(html).toContain('All India Inter-University Wushu Championship 2026–27 Selection Trials')
    expect(html).toContain('Rashtriya Raksha University (RRU) &amp; Association of Indian Universities (AIU)')
    expect(html).toContain('Gandhinagar')
    expect(html).toContain('₹0 Free Entry')
    expect(html).toContain('128 Spots Available')
    expect(html).toContain('Eligibility Criteria')
    expect(html).toContain('Required Verification Documents')
    expect(html).toContain('Unique AIU ID')
    expect(html).toContain('Class 10th and 12th passing certificates')
    expect(html).toContain('Open organiser source')
  })

  it('resolves legacy t-prefixed indexed slugs to the canonical stored record', () => {
    const item = CURATED_OPPORTUNITIES.find(opportunity => opportunity.slug === 'kca-u14-cricket-trials-kanpur-2026')
    expect(item).toBeDefined()
    expect(resolveCatalogueRecordBySlug(CURATED_OPPORTUNITIES, 't-kca-u14-cricket-trials-kanpur-2026')).toBe(item)
  })

  it('does not resolve unknown slugs or unrelated records', () => {
    expect(resolveCatalogueRecordBySlug(CURATED_OPPORTUNITIES, 'not-a-real-trial')).toBeUndefined()
  })
})
