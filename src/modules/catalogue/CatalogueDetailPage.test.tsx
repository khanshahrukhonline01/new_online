import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CatalogueDetailPage from './CatalogueDetailPage'
import { CURATED_OPPORTUNITIES } from '../../shared/data/curatedOpportunitiesData'

describe('CatalogueDetailPage selection trials and opportunity resolution', () => {
  it('renders verified opportunity from curated fallback with rich facts and eligibility', () => {
    const html = renderToStaticMarkup(
      <CatalogueDetailPage kind="opportunity" slug="aiu-wushu-inter-university-trials-2026" />
    )

    // Header & Facts
    expect(html).toContain('All India Inter-University Wushu Championship 2026–27 Selection Trials')
    expect(html).toContain('Rashtriya Raksha University (RRU) &amp; Association of Indian Universities (AIU)')
    expect(html).toContain('Gandhinagar')
    expect(html).toContain('₹0 Free Entry')
    expect(html).toContain('128 Spots Available')

    // Rich Eligibility & Verification sections
    expect(html).toContain('Eligibility Criteria')
    expect(html).toContain('Required Verification Documents')
    expect(html).toContain('Unique AIU ID')
    expect(html).toContain('Class 10th and 12th passing certificates')
    expect(html).toContain('Open organiser source')
  })

  it('transparently resolves legacy GSC indexed slug with t- prefix', () => {
    const html = renderToStaticMarkup(
      <CatalogueDetailPage kind="opportunity" slug="t-kca-u14-cricket-trials-kanpur-2026" />
    )

    expect(html).toContain('Kanpur Cricket Association (KCA) U-14 Selection Trials')
    expect(html).toContain('Kidwai Nagar, Kanpur')
    expect(html).toContain('Under-14 (Boys)')
    expect(html).toContain('Original Digital Birth Certificate')
    expect(html).toContain('White cricket playing uniform')
  })

  it('renders graceful loading state when unknown opportunity slug is requested', () => {
    const html = renderToStaticMarkup(
      <CatalogueDetailPage kind="opportunity" slug="non-existent-trial-slug" />
    )

    expect(html).toContain('Loading catalogue')
    expect(html).toContain('Back to opportunities')
  })

  it('curated opportunities dataset contains all top GSC indexed national trials', () => {
    const slugs = CURATED_OPPORTUNITIES.map(o => o.slug)
    expect(slugs).toContain('aiu-wushu-inter-university-trials-2026')
    expect(slugs).toContain('kca-u14-cricket-trials-kanpur-2026')
    expect(slugs).toContain('sgfi-70th-kabaddi-u17-gorakhpur-2026')
    expect(slugs).toContain('up-sports-directorate-junior-basketball-trials-kanpur-2026')
    expect(slugs).toContain('delhi-state-sub-junior-badminton-trials-2026')
    expect(slugs).toContain('bcci-u19-cooch-behar-trophy-open-trials-2026')
    expect(slugs).toContain('maharashtra-state-sub-junior-wrestling-trials-kolhapur-2026')
  })
})
