import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { RESEARCH_PAPERS } from './data/khelchronicleData'
import './khelchronicle.css'

interface KhelChronicleDispatchStripProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleDispatchStrip({ onNavigate }: KhelChronicleDispatchStripProps) {
  const latestPaper = RESEARCH_PAPERS[0]

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  if (!latestPaper) return null

  return (
    <section
      id="khelchronicle-research-wire"
      className="kc-dispatch-strip"
      aria-labelledby="kc-dispatch-heading"
    >
      <div className="kc-strip-inner">
        <div className="kc-strip-left">
          <div className="kc-strip-tag-row">
            <span className="kc-badge-archive">
              <SiteIcon name="award" size={13} />
              <span>KhelChronicle Research Wire</span>
            </span>
            <span className="kc-paper-id-tag">{latestPaper.paperId}</span>
            <span className="kc-paper-category-tag">{latestPaper.categoryName}</span>
            <span className="kc-paper-ver-tag">{latestPaper.version}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              Test Data Only
            </span>
          </div>

          <h3 id="kc-dispatch-heading" className="kc-strip-title">
            <a
              href={`/khelchronicle/${latestPaper.slug}`}
              onClick={e => handleLink(e, `/khelchronicle/${latestPaper.slug}`)}
            >
              {latestPaper.title}
            </a>
          </h3>

          <div className="kc-strip-author">
            <span>By {latestPaper.authors.map(a => a.name).join(', ')}</span>
            <span> · Published {latestPaper.datePublished}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href={`/khelchronicle/${latestPaper.slug}`}
            className="kc-btn-secondary"
            onClick={e => handleLink(e, `/khelchronicle/${latestPaper.slug}`)}
          >
            <span>Read Preprint</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
          <a
            href="/khelchronicle"
            className="kc-strip-link"
            onClick={e => handleLink(e, '/khelchronicle')}
          >
            <span>Explore Archive ({RESEARCH_PAPERS.length} Papers)</span>
            <SiteIcon name="chevron-right" size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}
export default KhelChronicleDispatchStrip
