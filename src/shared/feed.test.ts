import { describe, expect, it } from 'vitest'
import {
  BASE_URL,
  FEED_DESCRIPTION,
  FEED_TITLE,
  FEED_URL,
  buildChronicleFeedItems,
  formatRfc822Date,
  generateChronicleRssXml,
} from './feedGenerator'
import { RESEARCH_PAPERS } from '../modules/khelchronicle/data/khelchronicleData'

describe('KhelChronicle RSS 2.0 & PRISM Feed Engine', () => {
  it('formats dates strictly to RFC 822 / RFC 2822 standard', () => {
    const formatted = formatRfc822Date('2026-10-24')
    expect(formatted).toBe('Sat, 24 Oct 2026 00:00:00 GMT')

    const fallback = formatRfc822Date('invalid-date')
    expect(fallback).toBeTruthy()
    expect(fallback.endsWith('GMT')).toBe(true)
  })

  it('builds structured feed items for all indexed research preprints', () => {
    const items = buildChronicleFeedItems()
    expect(items).toHaveLength(RESEARCH_PAPERS.length)
    expect(items.length).toBeGreaterThanOrEqual(7)

    const first = items[0]
    expect(first.paperId).toBe('KG-2026-001')
    expect(first.doi).toBe('10.51224/khelchronicle.2026.001')
    expect(first.link).toBe(`${BASE_URL}/khelchronicle/kinematic-correlates-lumbar-spine-stress-fast-bowlers`)
    expect(first.guid).toBe(first.link)
    expect(first.pubDate).toBe('Sat, 24 Oct 2026 00:00:00 GMT')
    expect(first.categoryName).toBe('Sports Biomechanics')
    expect(first.sport).toBe('Cricket')
    expect(first.authors.length).toBeGreaterThan(0)
    expect(first.abstractText).toContain('Background:')
    expect(first.abstractText).toContain('Methods:')
    expect(first.abstractText).toContain('Results:')
    expect(first.abstractText).toContain('Conclusion:')
  })

  it('generates valid RSS 2.0 XML with Dublin Core and PRISM namespaces', () => {
    const xml = generateChronicleRssXml()

    // 1. XML & RSS headers
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"')
    expect(xml).toContain('xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/"')
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')

    // 2. Channel metadata
    expect(xml).toContain(`<title>${FEED_TITLE}</title>`)
    expect(xml).toContain(`<link>${BASE_URL}/khelchronicle</link>`)
    expect(xml).toContain(`<description>${FEED_DESCRIPTION}</description>`)
    expect(xml).toContain('<language>en-IN</language>')
    expect(xml).toContain(`<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`)
    expect(xml).toContain('<docs>https://www.rssboard.org/rss-specification</docs>')

    // 3. Item count matches research papers
    const itemMatches = xml.match(/<item>/g)
    expect(itemMatches).toHaveLength(RESEARCH_PAPERS.length)

    // 4. Verify Dublin Core & PRISM elements on preprints
    for (const paper of RESEARCH_PAPERS) {
      expect(xml).toContain(`<prism:doi>${paper.doi}</prism:doi>`)
      expect(xml).toContain(`<dc:identifier>https://doi.org/${paper.doi}</dc:identifier>`)
      expect(xml).toContain(`<dc:date>${paper.datePublished}</dc:date>`)
      expect(xml).toContain(`<prism:publicationDate>${paper.datePublished}</prism:publicationDate>`)
      expect(xml).toContain(`<guid isPermaLink="true">${BASE_URL}/khelchronicle/${paper.slug}</guid>`)
      expect(xml).toContain(`<enclosure url="${BASE_URL}/khelchronicle/${paper.slug}.pdf"`)
    }

    // 5. Verify ORCID relation presence
    expect(xml).toContain('<dc:relation><![CDATA[https://orcid.org/0000-0002-8941-4412]]></dc:relation>')

    // 6. Valid closing tags
    expect(xml.trim().endsWith('</rss>')).toBe(true)
  })
})
