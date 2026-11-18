import { useState, useEffect } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { type ResearchPaper } from '../data/khelchronicleData'
import { AcademicDataChart } from './AcademicDataChart'

interface AcademicGalleyModalProps {
  paper: ResearchPaper
  isOpen: boolean
  onClose: () => void
}

export function AcademicGalleyModal({ paper, isOpen, onClose }: AcademicGalleyModalProps) {
  const [columnMode, setColumnMode] = useState<'single' | 'two-column'>('two-column')
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 145))
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 85))

  const doi = paper.doi || `10.51224/khelchronicle.2026.${paper.paperId.replace(/[^0-9]/g, '').padStart(3, '0')}`

  return (
    <div className="kc-galley-overlay" role="dialog" aria-modal="true" aria-labelledby="galley-modal-title">
      {/* Top Floating Control Bar */}
      <div className="kc-galley-toolbar" role="toolbar" aria-label="Preprint Galley Controls">
        <div className="kc-galley-doc-badge">
          <span className="kc-galley-id">{paper.paperId}</span>
          <span className="kc-galley-sep">·</span>
          <span className="kc-galley-ver">{paper.version}</span>
          <span className="kc-galley-status">Screened Preprint Galley</span>
        </div>

        <div className="kc-galley-center-tools">
          <div className="kc-galley-col-toggle" role="group" aria-label="Layout Columns">
            <button
              type="button"
              className={`kc-galley-tool-btn ${columnMode === 'two-column' ? 'is-active' : ''}`}
              onClick={() => setColumnMode('two-column')}
              title="Two-column academic print layout"
              aria-pressed={columnMode === 'two-column'}
            >
              <span>2-Col</span>
            </button>
            <button
              type="button"
              className={`kc-galley-tool-btn ${columnMode === 'single' ? 'is-active' : ''}`}
              onClick={() => setColumnMode('single')}
              title="Single-column wide reader layout"
              aria-pressed={columnMode === 'single'}
            >
              <span>1-Col</span>
            </button>
          </div>

          <div className="kc-galley-zoom-tools" role="group" aria-label="Zoom Controls">
            <button
              type="button"
              className="kc-galley-tool-btn"
              onClick={zoomOut}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              A-
            </button>
            <span className="kc-galley-zoom-label">{zoomLevel}%</span>
            <button
              type="button"
              className="kc-galley-tool-btn"
              onClick={zoomIn}
              title="Zoom In"
              aria-label="Zoom in"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="kc-galley-print-btn"
            onClick={handlePrint}
            title="Print or Save as PDF"
            aria-label="Print or save as PDF"
          >
            <SiteIcon name="download" size={14} />
            <span>Print / PDF</span>
          </button>
        </div>

        <button
          type="button"
          className="kc-galley-close-btn"
          onClick={onClose}
          aria-label="Close manuscript galley viewer"
        >
          <SiteIcon name="close" size={18} />
          <span>Close Reader</span>
        </button>
      </div>

      {/* Main Galley Viewport */}
      <div className="kc-galley-viewport">
        <article
          className={`kc-galley-sheet ${columnMode === 'two-column' ? 'is-two-column' : 'is-single-column'}`}
          style={{ zoom: `${zoomLevel}%` }}
        >
          {/* Masthead Running Academic Header */}
          <header className="kc-galley-masthead">
            <div className="kc-galley-masthead-top">
              <span className="kc-galley-brand">KHELCHRONICLE OPEN SPORTS RESEARCH ARCHIVE</span>
              <span className="kc-galley-license-tag">Diamond Open Access · CC BY 4.0</span>
            </div>
            <div className="kc-galley-masthead-meta">
              <span><strong>Accession:</strong> {paper.paperId}</span>
              <span><strong>Version:</strong> {paper.version}</span>
              <span><strong>Discipline:</strong> {paper.categoryName}</span>
              {paper.sport && <span><strong>Sport:</strong> {paper.sport}</span>}
              <span><strong>Published:</strong> {paper.datePublished}</span>
            </div>
            <div className="kc-galley-doi-row">
              <strong>Permanent DOI:</strong>{' '}
              <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer">
                https://doi.org/{doi}
              </a>
            </div>
          </header>

          {/* Academic Title Block */}
          <div className="kc-galley-title-block">
            <h1 id="galley-modal-title" className="kc-galley-title">{paper.title}</h1>
            {paper.subtitle && <p className="kc-galley-subtitle">{paper.subtitle}</p>}

            {/* Authors Box */}
            <div className="kc-galley-authors-list">
              {paper.authors.map((author, aIdx) => (
                <div key={author.id} className="kc-galley-author-entry">
                  <span className="kc-galley-author-name">
                    {author.name}
                    <sup>{aIdx + 1}</sup>
                  </span>
                  {author.orcid && (
                    <a
                      href={`https://orcid.org/${author.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kc-galley-orcid-link"
                      title={`ORCID iD: ${author.orcid}`}
                    >
                      <span className="kc-orcid-id-icon">iD</span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Institutional Affiliations */}
            <div className="kc-galley-affiliations">
              {paper.authors.map((author, aIdx) => (
                <div key={author.id} className="kc-galley-affil-line">
                  <sup>{aIdx + 1}</sup>
                  <span>{author.affiliation}</span>
                  {author.email && <span className="kc-galley-email"> ({author.email})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Preprint Screening Disclaimer Alert */}
          <div className="kc-galley-disclaimer-box" role="status">
            <strong>KhelChronicle / SportRxiv Pre-Moderated Preprint ({paper.version})</strong>
            <p>
              This manuscript has undergone editorial pre-moderation screening for sports science scope, participant ethics, and author legitimacy. As an open-access preprint, it has not undergone formal journal certification or peer review and should not be used as clinical or medical guidelines.
            </p>
          </div>

          {/* Structured Abstract */}
          <section className="kc-galley-abstract-box" aria-labelledby="galley-abstract-title">
            <h2 id="galley-abstract-title" className="kc-galley-subhead">Abstract</h2>
            <p><strong>Background: </strong>{paper.abstract.background}</p>
            <p><strong>Methods: </strong>{paper.abstract.methods}</p>
            <p><strong>Results: </strong>{paper.abstract.results}</p>
            <p><strong>Conclusion: </strong>{paper.abstract.conclusion}</p>

            <div className="kc-galley-keywords">
              <strong>Keywords: </strong>
              <span>{paper.keywords.join(', ')}</span>
            </div>
          </section>

          {/* Two-Column / Single-Column Body */}
          <div className="kc-galley-body-flow">
            {paper.sections.map((section, sIdx) => (
              <section key={sIdx} className="kc-galley-section">
                <h2 className="kc-galley-section-heading">{section.title}</h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="kc-galley-p">{p}</p>
                ))}

                {section.callout && (
                  <div className="kc-galley-callout">
                    <div className="kc-galley-callout-title">{section.callout.title}</div>
                    <p className="kc-galley-callout-text">{section.callout.text}</p>
                  </div>
                )}

                {section.tableData && (
                  <div className="kc-galley-table-wrap">
                    {section.tableData.caption && (
                      <div className="kc-galley-table-caption">{section.tableData.caption}</div>
                    )}
                    <table className="kc-galley-table">
                      <thead>
                        <tr>
                          {section.tableData.headers.map((h, hIdx) => (
                            <th key={hIdx}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ marginTop: '14px' }}>
                      <AcademicDataChart tableData={section.tableData} />
                    </div>
                  </div>
                )}
              </section>
            ))}

            {/* Statements Block */}
            <section className="kc-galley-statements">
              <h2 className="kc-galley-section-heading">Declarations &amp; Open Science Statements</h2>
              <div className="kc-galley-statement-row">
                <strong>Research Ethics: </strong>
                <span>{paper.ethicsStatement}</span>
              </div>
              <div className="kc-galley-statement-row">
                <strong>Open Data Availability: </strong>
                <span>{paper.dataAvailability}</span>
              </div>
              <div className="kc-galley-statement-row">
                <strong>Funding Acknowledgement: </strong>
                <span>{paper.fundingStatement}</span>
              </div>
              <div className="kc-galley-statement-row">
                <strong>Conflicts of Interest: </strong>
                <span>{paper.conflictsOfInterest}</span>
              </div>
              <div className="kc-galley-statement-row">
                <strong>Licensing: </strong>
                <span>Distributed under Creative Commons Attribution 4.0 International (CC BY 4.0).</span>
              </div>
            </section>

            {/* References */}
            <section className="kc-galley-references">
              <h2 className="kc-galley-section-heading">References</h2>
              <ol className="kc-galley-ref-list">
                {paper.references.map(ref => (
                  <li key={ref.id}>
                    <span>{ref.text}</span>
                    {ref.doi && (
                      <span className="kc-galley-ref-doi"> https://doi.org/{ref.doi}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Running Footer */}
          <footer className="kc-galley-footer">
            <span>KhelChronicle Open Sports Research Archive (SportRxiv India) · {paper.paperId} · {paper.version}</span>
            <span>Page 1 of 1 (Full Manuscript View)</span>
          </footer>
        </article>
      </div>
    </div>
  )
}
