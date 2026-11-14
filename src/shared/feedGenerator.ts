import {
  RESEARCH_PAPERS,
  type ResearchPaper,
} from '../modules/khelchronicle/data/khelchronicleData.ts'

export const BASE_URL = 'https://khelgrid.com'
export const FEED_URL = `${BASE_URL}/khelchronicle/feed.xml`
export const FEED_TITLE = 'KhelChronicle Preprints · Open Sports Science Research Archive'
export const FEED_DESCRIPTION =
  'Open-access preprint repository for Indian sports science, biomechanics, exercise physiology, sports medicine, sports nutrition, sports analytics, and grassroots athletic benchmarks.'

export interface ChronicleFeedItem {
  id: string
  paperId: string
  doi: string
  title: string
  subtitle?: string
  link: string
  guid: string
  categoryName: string
  sport: string
  pubDate: string
  datePublished: string
  authors: { name: string; affiliation?: string; orcid?: string }[]
  abstractText: string
  version: string
  license: string
  pdfUrl: string
}

/**
 * Format ISO 8601 YYYY-MM-DD or full timestamp to RFC 822/2822 UTC format for RSS.
 * E.g., '2026-10-24' -> 'Sat, 24 Oct 2026 00:00:00 GMT'
 */
export function formatRfc822Date(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`)
  if (isNaN(d.getTime())) {
    return new Date().toUTCString()
  }
  return d.toUTCString()
}

/**
 * Safely escape string for CDATA inclusion to prevent XML injection.
 */
function safeCdata(text: string): string {
  return text.replace(/]]>/g, ']]]]><![CDATA[>')
}

/**
 * Build structured feed item objects from KhelChronicle research papers.
 */
export function buildChronicleFeedItems(papers: ResearchPaper[] = RESEARCH_PAPERS): ChronicleFeedItem[] {
  return papers.map(paper => {
    const link = `${BASE_URL}/khelchronicle/${paper.slug}`
    const abstractParts = [
      paper.abstract?.background ? `Background: ${paper.abstract.background}` : '',
      paper.abstract?.methods ? `Methods: ${paper.abstract.methods}` : '',
      paper.abstract?.results ? `Results: ${paper.abstract.results}` : '',
      paper.abstract?.conclusion ? `Conclusion: ${paper.abstract.conclusion}` : '',
    ].filter(Boolean)

    const abstractText = abstractParts.join('\n\n')

    return {
      id: paper.id,
      paperId: paper.paperId,
      doi: paper.doi || `10.51224/khelchronicle.2026.${paper.paperId.replace(/[^0-9]/g, '').padStart(3, '0')}`,
      title: paper.title,
      subtitle: paper.subtitle,
      link,
      guid: link,
      categoryName: paper.categoryName,
      sport: paper.sport || 'Sports Science',
      pubDate: formatRfc822Date(paper.datePublished),
      datePublished: paper.datePublished,
      authors: (paper.authors || []).map(a => ({
        name: a.name,
        affiliation: a.affiliation,
        orcid: a.orcid,
      })),
      abstractText,
      version: paper.version,
      license: paper.license || 'CC BY 4.0',
      pdfUrl: `${link}.pdf`,
    }
  })
}

/**
 * Generates valid RSS 2.0 XML with Dublin Core and PRISM metadata.
 */
export function generateChronicleRssXml(
  papers: ResearchPaper[] = RESEARCH_PAPERS,
  buildDate: Date | string = '2026-11-15T00:00:00Z',
): string {
  const items = buildChronicleFeedItems(papers)
  const lastBuildDate = typeof buildDate === 'string' ? formatRfc822Date(buildDate) : buildDate.toUTCString()

  const itemsXml = items.map(item => {
    const authorCreators = item.authors
      .map(
        a =>
          `      <dc:creator><![CDATA[${safeCdata(a.name)}${a.affiliation ? ` (${safeCdata(a.affiliation)})` : ''}]]></dc:creator>`,
      )
      .join('\n')

    const orcidTags = item.authors
      .filter(a => a.orcid)
      .map(a => `      <dc:relation><![CDATA[https://orcid.org/${safeCdata(a.orcid!)}]]></dc:relation>`)
      .join('\n')

    return `    <item>
      <title><![CDATA[${safeCdata(item.title)}]]></title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <category><![CDATA[${safeCdata(item.categoryName)}]]></category>
      <description><![CDATA[${safeCdata(item.abstractText)}]]></description>
${authorCreators}
      <dc:date>${item.datePublished}</dc:date>
      <dc:identifier>https://doi.org/${item.doi}</dc:identifier>
      <dc:rights>${item.license}</dc:rights>
${orcidTags ? `${orcidTags}\n` : ''}      <prism:doi>${item.doi}</prism:doi>
      <prism:section><![CDATA[${safeCdata(item.categoryName)}]]></prism:section>
      <prism:publicationDate>${item.datePublished}</prism:publicationDate>
      <prism:corporateName>KhelChronicle Open Sports Research Archive</prism:corporateName>
      <prism:edition>${item.version}</prism:edition>
      <enclosure url="${item.pdfUrl}" length="0" type="application/pdf" />
      <content:encoded><![CDATA[
        <article>
          <header>
            <p><strong>Preprint ID:</strong> ${safeCdata(item.paperId)} · <strong>Version:</strong> ${safeCdata(item.version)}</p>
            <p><strong>Permanent DOI:</strong> <a href="https://doi.org/${item.doi}">https://doi.org/${item.doi}</a></p>
            <p><strong>Discipline:</strong> ${safeCdata(item.categoryName)} | <strong>Sport:</strong> ${safeCdata(item.sport)}</p>
            <p><strong>Authors:</strong> ${safeCdata(item.authors.map(a => a.name).join(', '))}</p>
          </header>
          <section>
            <h3>Structured Abstract</h3>
            <p>${safeCdata(item.abstractText).replace(/\n\n/g, '</p><p>')}</p>
          </section>
          <footer>
            <p><a href="${item.link}">Read Full Galley on KhelChronicle</a> | <a href="${item.pdfUrl}">Download PDF</a></p>
          </footer>
        </article>
      ]]></content:encoded>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${BASE_URL}/khelchronicle</link>
    <description>${FEED_DESCRIPTION}</description>
    <language>en-IN</language>
    <copyright>Copyright (c) 2026 KhelChronicle authors under Creative Commons CC BY 4.0 International</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>KhelChronicle RSS Engine v1.0</generator>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/assets/kg-logo.webp</url>
      <title>${FEED_TITLE}</title>
      <link>${BASE_URL}/khelchronicle</link>
    </image>
${itemsXml}
  </channel>
</rss>
`
}
