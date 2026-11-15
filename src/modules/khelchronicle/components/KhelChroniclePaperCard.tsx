import type { MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { type ResearchPaper } from '../data/khelchronicleData'

export interface KhelChroniclePaperCardProps {
  paper: ResearchPaper
  copiedDoiId?: string | null
  onCopyDoi?: (paperId: string, doi: string) => void
  onOpenGalley?: (paper: ResearchPaper) => void
  onOpenCite?: (paper: ResearchPaper) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChroniclePaperCard({
  paper,
  copiedDoiId,
  onCopyDoi,
  onOpenGalley,
  onOpenCite,
  onNavigate,
}: KhelChroniclePaperCardProps) {
  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  return (
    <article className="kc-paper-card" aria-labelledby={`paper-heading-${paper.paperId}`}>
      {/* Top Meta: Accession, Version, Discipline, Sport, DOI */}
      <div className="kc-paper-top-meta">
        <span className="kc-paper-id-tag">{paper.paperId}</span>
        <span className="kc-paper-ver-tag">{paper.version}</span>
        {paper.sport && (
          <span className="kc-paper-sport-tag">
            {paper.sport}
          </span>
        )}
        {paper.methodologyLabel && (
          <span className="kc-paper-method-tag">
            {paper.methodologyLabel}
          </span>
        )}
        {paper.hasInteractiveChart && (
          <span className="kc-chart-indicator-badge" title="Interactive SVG chart available">
            📊 Chart
          </span>
        )}
        <span className="kc-paper-category-tag">{paper.categoryName}</span>
        {paper.doi && (
          <button
            type="button"
            className="kc-card-doi-pill"
            onClick={() => onCopyDoi?.(paper.paperId, paper.doi!)}
            title="Click to copy Crossref DOI"
          >
            <span className="kc-doi-mono">doi:{paper.doi}</span>
            <SiteIcon name={copiedDoiId === paper.paperId ? 'check' : 'copy'} size={11} />
            {copiedDoiId === paper.paperId && <span className="kc-copied-badge">Copied!</span>}
          </button>
        )}
      </div>

      {/* Academic Title */}
      <h3 id={`paper-heading-${paper.paperId}`} className="kc-card-title kc-serif-title">
        <a
          href={`/khelchronicle/${paper.slug}`}
          onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
        >
          {paper.title}
        </a>
      </h3>

      {/* Author Byline with ORCID micro-badges */}
      <div className="kc-card-authors-row">
        {paper.authors.map((auth, aIdx) => (
          <span key={auth.id} className="kc-author-inline-item">
            <a
              href={`/khelchronicle/author/${auth.slug}`}
              onClick={e => handleLink(e, `/khelchronicle/author/${auth.slug}`)}
            >
              {auth.name}
            </a>
            {auth.orcid && (
              <a
                href={`https://orcid.org/${auth.orcid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="kc-orcid-micro-badge"
                title={`ORCID: ${auth.orcid}`}
              >
                iD
              </a>
            )}
            {auth.affiliation ? ` (${auth.affiliation.split(',')[0]})` : ''}
            {aIdx < paper.authors.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>

      {/* Abstract Snippet */}
      <p className="kc-card-abstract-snippet">
        {paper.abstract.background.slice(0, 220)}…
      </p>

      {/* STORK Open Science Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {paper.openScienceBadges?.openData && (
          <span className="kc-chip-badge-sm kc-badge-open-data">🟢 Open Data</span>
        )}
        {paper.openScienceBadges?.openCode && (
          <span className="kc-chip-badge-sm kc-badge-open-code">💻 Open Code</span>
        )}
        {paper.openScienceBadges?.preregistered && (
          <span className="kc-chip-badge-sm kc-badge-prereg">📝 Preregistered</span>
        )}
        {paper.peerReviewStatus && (
          <span className="kc-chip-badge-sm" style={{ background: '#f1f5f9', color: '#475569' }}>
            {paper.peerReviewStatus.status === 'published_vor' ? '📖 Published in Journal' : '⏱️ Under Review'}
          </span>
        )}
        <span className="kc-chip-badge-sm kc-badge-license">⚖️ {paper.license || 'CC BY 4.0'}</span>
      </div>

      {/* Keywords */}
      <div className="kc-keywords-row" style={{ marginBottom: '14px' }}>
        {paper.keywords.slice(0, 4).map(kw => (
          <span key={kw} className="kc-keyword-chip">#{kw}</span>
        ))}
      </div>

      {/* Card Footer: Metrics & Action Buttons */}
      <div className="kc-card-bottom">
        <div className="kc-metrics-group">
          <span className="kc-metric-item" title="Abstract and paper views">
            <SiteIcon name="eye" size={13} />
            <span>{paper.metrics.views}</span>
          </span>
          <span className="kc-metric-item" title="PDF and dataset downloads">
            <SiteIcon name="download" size={13} />
            <span>{paper.metrics.downloads}</span>
          </span>
          <span className="kc-metric-item" title="Academic citations">
            <SiteIcon name="bookmark" size={13} />
            <span>{paper.metrics.citations}</span>
          </span>
        </div>

        <div className="kc-card-actions-group">
          {onOpenGalley && (
            <button
              type="button"
              className="kc-card-micro-btn"
              onClick={() => onOpenGalley(paper)}
              title="Read academic galley reader"
            >
              <SiteIcon name="file-text" size={13} />
              <span>Read Galley</span>
            </button>
          )}
          {onOpenCite && (
            <button
              type="button"
              className="kc-card-micro-btn"
              onClick={() => onOpenCite(paper)}
              title="Cite preprint in BibTeX, APA, RIS"
            >
              <SiteIcon name="bookmark" size={13} />
              <span>Cite</span>
            </button>
          )}
          <a
            href={`/khelchronicle/${paper.slug}`}
            className="kc-card-micro-btn kc-card-micro-btn-primary"
            onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
          >
            <span>Read Preprint</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
        </div>
      </div>
    </article>
  )
}
export default KhelChroniclePaperCard
