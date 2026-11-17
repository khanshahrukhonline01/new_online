import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CURATED_OPPORTUNITIES } from '../../shared/data/curatedOpportunitiesData'
import { OpportunityDetail, resolveCatalogueRecordBySlug } from './CatalogueDetailPage'

describe('CatalogueDetailPage opportunity presentation', () => {
  it('renders source-backed opportunity details without inventing availability or eligibility', () => {
    const item = CURATED_OPPORTUNITIES[0]
    const html = renderToStaticMarkup(<OpportunityDetail item={item} />)

    expect(html).toContain(item.title)
    if (item.organizer_name) expect(html).toContain(item.organizer_name)
    if (item.city) expect(html).toContain(item.city)
    expect(html).toContain('Confirm eligibility, dates, fees and registration status with the organiser')
    expect(html).not.toContain('128 Spots Available')
    expect(html).not.toContain('Required Verification Documents')
  })

  it('resolves an exact slug and the supported legacy t-prefix alias', () => {
    const records = [{ slug: 'kca-u14-cricket-trials-kanpur-2026' }, { slug: 'other-trial' }]
    expect(resolveCatalogueRecordBySlug(records, 'kca-u14-cricket-trials-kanpur-2026')).toBe(records[0])
    expect(resolveCatalogueRecordBySlug(records, 't-kca-u14-cricket-trials-kanpur-2026')).toBe(records[0])
  })

  it('does not resolve unknown slugs', () => {
    expect(resolveCatalogueRecordBySlug([{ slug: 'known-trial' }], 'not-a-real-trial')).toBeUndefined()
  })
})
