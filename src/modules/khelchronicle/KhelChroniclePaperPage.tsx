import { useState, useMemo, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  getPaperBySlug,
  generateCitations,
  getRelatedPapers,
  generateRisCitation,
  RESEARCH_PAPERS,
  type ResearchPaper,
} from './data/khelchronicleData'
import { recordPaperView, recordPaperDownload } from '../../integrations/supabase/chronicle-client'
import { AcademicDataChart } from './components/AcademicDataChart'
import './khelchronicle.css'

interface KhelChroniclePaperPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChroniclePaperPage({ slug, onNavigate }: KhelChroniclePaperPageProps) {
  const paper: ResearchPaper | undefined = useMemo(() => {
    return getPaperBySlug(slug) || RESEARCH_PAPERS[0]
  }, [slug])

  useEffect(() => {
    if (paper) {
      recordPaperView(paper.slug)
    }
  }, [paper])

  const [citationModalOpen, setCitationModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [citationFormat, setCitationFormat] = useState<'apa' | 'bibtex' | 'mla' | 'chicago' | 'vancouver'>('apa')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [chartViewModes, setChartViewModes] = useState<Record<number, 'table' | 'chart'>>({})

  const toggleViewMode = (sectionIdx: number, mode: 'table' | 'chart') => {
    setChartViewModes(prev => ({
      ...prev,
      [sectionIdx]: mode,
    }))
  }

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const citations = useMemo(() => {
    if (!paper) return { apa: '', bibtex: '', mla: '', chicago: '', vancouver: '' }
    return generateCitations(paper)
  }, [paper])

  const relatedPapers = useMemo(() => {
    if (!paper) return []
    return getRelatedPapers(paper, 3)
  }, [paper])

  const copyCitation = () => {
    const textToCopy = citations[citationFormat]
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const handlePrintPdf = () => {
    if (paper) {
      recordPaperDownload(paper.slug)
    }
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadBibtex = () => {
    if (!paper) return
    downloadFile(citations.bibtex, `${paper.paperId}.bib`, 'application/x-bibtex')
  }

  const handleDownloadRis = () => {
    if (!paper) return
    const ris = generateRisCitation(paper)
    downloadFile(ris, `${paper.paperId}.ris`, 'application/x-research-info-systems')
  }

  const scholarlySchema = useMemo(() => {
    if (!paper) return {}
    return {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      headline: paper.title,
      name: paper.title,
      identifier: paper.paperId,
      url: `https://www.khelgrid.com/khelchronicle/${paper.slug}`,
      datePublished: paper.datePublished,
      dateModified: paper.dateModified || paper.datePublished,
      version: paper.version,
      license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
      author: paper.authors.map(a => ({
        '@type': 'Person',
        name: a.name,
        affiliation: {
          '@type': 'Organization',
          name: a.affiliation,
        },
      })),
      publisher: {
        '@type': 'Organization',
        name: 'KhelChronicle Open Sports Research Archive',
        logo: 'https://www.khelgrid.com/assets/kg-logo.webp',
      },
      description: paper.abstract.background,
      keywords: paper.keywords.join(', '),
    }
  }, [paper])

  if (!paper) {
    return (
      <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h2>Research Paper Not Found</h2>
        <p>The manuscript identifier or slug does not exist in the KhelChronicle repository.</p>
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} className="kc-btn-primary">
          Back to Research Repository
        </a>
      </div>
    )
  }

  return (
    <div className="kc-root">
      {/* Print-Only Academic Journal Header */}
      <aside className="kc-print-only-header" aria-hidden="true">
        <div className="kc-print-branding">
          <div className="kc-print-logo-row">
            <span className="kc-print-journal-name">KHELCHRONICLE OPEN SPORTS RESEARCH ARCHIVE</span>
            <span className="kc-print-badge">Diamond Open Access · CC BY-NC-ND 4.0</span>
          </div>
          <div className="kc-print-meta-row">
            <span><strong>Preprint Accession:</strong> {paper.paperId}</span>
            <span><strong>Published:</strong> {paper.datePublished}</span>
            <span><strong>Version:</strong> {paper.version}</span>
            <span><strong>Discipline:</strong> {paper.categoryName}</span>
            {paper.sport && <span><strong>Sport:</strong> {paper.sport}</span>}
          </div>
          <div className="kc-print-url">
            <strong>Permanent Repository URL:</strong> https://www.khelgrid.com/khelchronicle/{paper.slug}
          </div>
        </div>
      </aside>

      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlySchema) }}
      />

      <div className="kc-reader-container">
        {/* Navigation Breadcrumbs */}
        <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
          <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
            KhelChronicle
          </a>
          <span> / </span>
          <a href={`/khelchronicle/${paper.category}`} onClick={e => handleLink(e, `/khelchronicle/${paper.category}`)} style={{ color: '#0f172a', textDecoration: 'none' }}>
            {paper.categoryName}
          </a>
          <span> / </span>
          <span style={{ color: '#64748b' }}>{paper.paperId}</span>
        </nav>

        {/* Preprint Status Disclaimer Alert */}
        <div className="kc-preprint-alert" role="status">
          <SiteIcon name="alert-triangle" size={18} className="kc-alert-icon" />
          <div>
            <strong>KhelChronicle Open Research Preprint ({paper.version}) · Test / Demonstration Data Only</strong>
            <p style={{ margin: '4px 0 0' }}>
              Notice: This manuscript and its findings are <strong>sample demonstration test data</strong> created for platform development, demonstration, and staging verification. It has not yet been certified by formal peer review and should not be used as clinical or medical guidance.
            </p>
          </div>
        </div>

        {/* Paper Header */}
        <header className="kc-reader-header">
          <div className="kc-paper-top-meta" style={{ marginBottom: '14px' }}>
            <span className="kc-paper-id-tag">{paper.paperId}</span>
            <span className="kc-paper-ver-tag">{paper.version}</span>
            {paper.sport && (
              <span className="kc-paper-sport-tag">
                {paper.sport}
              </span>
            )}
            <span className="kc-paper-category-tag">{paper.categoryName}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              Test Data Only
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
              Diamond Open Access
            </span>
            <span className="kc-paper-date">Published {paper.datePublished}</span>
          </div>

          <h1 className="kc-reader-title">{paper.title}</h1>
          {paper.subtitle && <p className="kc-reader-subtitle">{paper.subtitle}</p>}

          {/* Authors List Box */}
          <div className="kc-reader-authors-box">
            {paper.authors.map(auth => (
              <div key={auth.id} className="kc-author-entry">
                <a
                  href={`/khelchronicle/author/${auth.slug}`}
                  onClick={e => handleLink(e, `/khelchronicle/author/${auth.slug}`)}
                  className="kc-author-name"
                >
                  {auth.name}
                </a>
                <span className="kc-author-affil">— {auth.affiliation}</span>
                {auth.orcid && (
                  <a
                    href={`https://orcid.org/${auth.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kc-author-orcid"
                    title="ORCID Researcher Record"
                  >
                    <span>iD</span>
                    <span>{auth.orcid}</span>
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Reader Action Bar */}
          <div className="kc-reader-actions-bar">
            <button
              type="button"
              className="kc-btn-primary"
              onClick={() => setExportModalOpen(true)}
              aria-label="Download or print research paper PDF"
            >
              <SiteIcon name="download" size={14} />
              <span>Download PDF / Print</span>
            </button>

            <button type="button" className="kc-btn-secondary" onClick={() => setCitationModalOpen(true)}>
              <SiteIcon name="bookmark" size={14} />
              <span>Cite This Preprint</span>
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: '#64748b' }}>
              <span>{paper.readingTimeMinutes} min read</span>
              <span>·</span>
              <span>{paper.metrics.downloads} downloads</span>
              <span>·</span>
              <span>{paper.metrics.citations} citations</span>
            </div>
          </div>
        </header>

        {/* Structured Abstract */}
        <section className="kc-structured-abstract" aria-labelledby="abstract-heading">
          <h2 id="abstract-heading" className="kc-abstract-heading">Abstract</h2>
          <div className="kc-abstract-section">
            <span className="kc-abstract-tag">Background: </span>
            <span>{paper.abstract.background}</span>
          </div>
          <div className="kc-abstract-section">
            <span className="kc-abstract-tag">Methods: </span>
            <span>{paper.abstract.methods}</span>
          </div>
          <div className="kc-abstract-section">
            <span className="kc-abstract-tag">Results: </span>
            <span>{paper.abstract.results}</span>
          </div>
          <div className="kc-abstract-section">
            <span className="kc-abstract-tag">Conclusion: </span>
            <span>{paper.abstract.conclusion}</span>
          </div>

          <div className="kc-keywords-row" style={{ marginTop: '18px', marginBottom: 0 }}>
            {paper.keywords.map(kw => (
              <span key={kw} className="kc-keyword-chip">#{kw}</span>
            ))}
          </div>
        </section>

        {/* Full Paper Body Sections */}
        <main className="kc-paper-body">
          {paper.sections.map((sec, sIdx) => {
            const currentMode = chartViewModes[sIdx] ?? 'table'

            return (
              <section key={sIdx} className="kc-section-block">
                <h2 className="kc-section-title">{sec.title}</h2>
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="kc-paragraph">{p}</p>
                ))}

                {sec.callout && (
                  <div className="kc-callout-finding">
                    <div className="kc-callout-title">{sec.callout.title}</div>
                    <p className="kc-callout-text">{sec.callout.text}</p>
                  </div>
                )}

                {sec.tableData && (
                  <div className="kc-table-wrap">
                    <div className="kc-table-top-bar">
                      {sec.tableData.caption && (
                        <div className="kc-table-caption">{sec.tableData.caption}</div>
                      )}
                      <div className="kc-chart-switcher" role="group" aria-label="Table or chart display mode">
                        <button
                          type="button"
                          className={`kc-switch-btn ${currentMode === 'table' ? 'is-active' : ''}`}
                          onClick={() => toggleViewMode(sIdx, 'table')}
                          aria-pressed={currentMode === 'table'}
                        >
                          <SiteIcon name="file-text" size={13} />
                          <span>Academic Table</span>
                        </button>
                        <button
                          type="button"
                          className={`kc-switch-btn ${currentMode === 'chart' ? 'is-active' : ''}`}
                          onClick={() => toggleViewMode(sIdx, 'chart')}
                          aria-pressed={currentMode === 'chart'}
                        >
                          <SiteIcon name="chart" size={13} />
                          <span>Interactive Chart</span>
                        </button>
                      </div>
                    </div>

                    {currentMode === 'table' ? (
                      <table className="kc-academic-table">
                        <thead>
                          <tr>
                            {sec.tableData.headers.map((h, hIdx) => (
                              <th key={hIdx}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sec.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <AcademicDataChart tableData={sec.tableData} />
                    )}
                  </div>
                )}
              </section>
            )
          })}

          {/* Research Statements Box */}
          <section className="kc-statements-box" aria-label="Research ethics and data statements">
            <div className="kc-statement-item">
              <span className="kc-statement-title">Ethics &amp; Consent Statement: </span>
              <span>{paper.ethicsStatement}</span>
            </div>
            <div className="kc-statement-item">
              <span className="kc-statement-title">Data Availability: </span>
              <span>{paper.dataAvailability}</span>
            </div>
            <div className="kc-statement-item">
              <span className="kc-statement-title">Funding &amp; Grants: </span>
              <span>{paper.fundingStatement}</span>
            </div>
            <div className="kc-statement-item">
              <span className="kc-statement-title">Conflicts of Interest: </span>
              <span>{paper.conflictsOfInterest}</span>
            </div>
            <div className="kc-statement-item">
              <span className="kc-statement-title">License &amp; Rights: </span>
              <span>Distributed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International ({paper.license}).</span>
            </div>
          </section>

          {/* Bibliographic References */}
          <section className="kc-references-box" aria-labelledby="references-heading">
            <h2 id="references-heading" className="kc-section-title">References</h2>
            <ol className="kc-references-list">
              {paper.references.map(ref => (
                <li key={ref.id} className="kc-ref-item">
                  <span>{ref.text}</span>
                  {ref.doi && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kc-ref-doi"
                    >
                      doi:{ref.doi}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Connected KhelGrid Platform Tools */}
          {paper.connectedKhelGridLinks && paper.connectedKhelGridLinks.length > 0 && (
            <aside className="kc-connected-tools" aria-label="Connected KhelGrid platform tools">
              <h3 className="kc-tools-title">
                Operationalize This Research on KhelGrid
              </h3>
              <div className="kc-tools-grid">
                {paper.connectedKhelGridLinks.map((tool, tIdx) => (
                  <a
                    key={tIdx}
                    href={tool.href}
                    className="kc-tool-card"
                    onClick={e => handleLink(e, tool.href)}
                  >
                    <div className="kc-tool-head">
                      <span className="kc-tool-label">{tool.label}</span>
                      <span className="kc-tool-badge">{tool.badge}</span>
                    </div>
                    <p className="kc-tool-desc">{tool.description}</p>
                  </a>
                ))}
              </div>
            </aside>
          )}

          {/* Related Preprints in Same Sport / Discipline */}
          {relatedPapers.length > 0 && (
            <section className="kc-related-section" aria-labelledby="related-papers-heading">
              <div className="kc-related-head">
                <h3 id="related-papers-heading" className="kc-related-title">
                  Related Preprints in {paper.sport || paper.categoryName}
                </h3>
                <a
                  href="/khelchronicle"
                  onClick={e => handleLink(e, '/khelchronicle')}
                  className="kc-related-browse-all"
                >
                  Browse All Archive ({RESEARCH_PAPERS.length} Papers) →
                </a>
              </div>
              <div className="kc-related-grid">
                {relatedPapers.map(rel => (
                  <article key={rel.id} className="kc-related-card">
                    <div className="kc-paper-top-meta" style={{ marginBottom: '6px' }}>
                      <span className="kc-paper-id-tag">{rel.paperId}</span>
                      {rel.sport && <span className="kc-paper-sport-tag">{rel.sport}</span>}
                    </div>
                    <h4 className="kc-related-card-title">
                      <a href={`/khelchronicle/${rel.slug}`} onClick={e => handleLink(e, `/khelchronicle/${rel.slug}`)}>
                        {rel.title}
                      </a>
                    </h4>
                    <p className="kc-related-authors">{rel.authors.map(a => a.name).join(', ')}</p>
                    <div className="kc-card-bottom" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{rel.readingTimeMinutes} min read</span>
                      <a
                        href={`/khelchronicle/${rel.slug}`}
                        className="kc-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={e => handleLink(e, `/khelchronicle/${rel.slug}`)}
                      >
                        Read Preprint
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Export & Download Dialog */}
      {exportModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="export-modal-title" className="kc-modal-title">Export &amp; Download Preprint</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setExportModalOpen(false)}
                aria-label="Close export modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-content">
              <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#475569' }}>
                Select your preferred academic export format for <strong>{paper.paperId}</strong>:
              </p>

              <div className="kc-export-options-grid">
                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={() => {
                    setExportModalOpen(false)
                    handlePrintPdf()
                  }}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="download" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>Official Branded PDF / Print</strong>
                    <span>Clean academic preprint layout formatted for PDF save and printing.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={handleDownloadBibtex}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="file-text" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>BibTeX Citation File (.bib)</strong>
                    <span>Standard LaTeX and Overleaf citation bibliography file.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={handleDownloadRis}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="bookmark" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>RIS Reference Manager (.ris)</strong>
                    <span>Direct import for Zotero, Mendeley, and EndNote reference managers.</span>
                  </div>
                </button>
              </div>

              <div className="kc-modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  onClick={() => setExportModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citation Modal */}
      {citationModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="citation-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="citation-modal-title" className="kc-modal-title">Cite This Research Preprint</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setCitationModalOpen(false)}
                aria-label="Close citation modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-tabs">
              {(['apa', 'bibtex', 'mla', 'chicago', 'vancouver'] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  className={`kc-modal-tab-btn ${citationFormat === fmt ? 'is-active' : ''}`}
                  onClick={() => setCitationFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="kc-modal-content">
              <div className="kc-citation-text-box">
                {citations[citationFormat]}
              </div>

              <div className="kc-modal-footer">
                <button
                  type="button"
                  className="kc-btn-primary"
                  onClick={copyCitation}
                >
                  <SiteIcon name={copyFeedback ? 'check-circle' : 'copy'} size={14} />
                  <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Citation'}</span>
                </button>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  onClick={() => setCitationModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default KhelChroniclePaperPage
