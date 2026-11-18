import { useMemo, useState, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_CATEGORIES,
  type ResearchCategory,
  type ResearchPaper,
} from './data/khelchronicleData'
import { getChroniclePapers } from '../../integrations/supabase/chronicle-client'
import './khelchronicle.css'

interface KhelChronicleCategoryPageProps {
  categorySlug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleCategoryPage({ categorySlug, onNavigate }: KhelChronicleCategoryPageProps) {
  const category: ResearchCategory | undefined = useMemo(() => {
    return RESEARCH_CATEGORIES.find(c => c.slug === categorySlug.toLowerCase())
  }, [categorySlug])

  const [papers, setPapers] = useState<ResearchPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!category) {
      setPapers([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    getChroniclePapers(category.slug).then(result => {
      if (active) setPapers(result.data)
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [category])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  if (!category) {
    return <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}><h2>Research discipline not found</h2><a href="/khelchronicle">Back to KhelChronicle</a></div>
  }

  return (
    <div className="kc-root">
      {/* Breadcrumb */}
      <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
          KhelChronicle
        </a>
        <span> / </span>
        <span style={{ color: '#64748b' }}>{category?.name}</span>
      </nav>

      {/* Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>Research Discipline</span>
          </span>
          <span className="kc-badge-open-access">Preprints Archive</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Editorial review required
          </span>
        </div>

        <h1 className="kc-hero-title">{category?.name}</h1>
        <p className="kc-hero-subtitle">{category?.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/khelchronicle/submit"
            className="kc-submit-btn-link"
            onClick={e => handleLink(e, '/khelchronicle/submit')}
          >
            <SiteIcon name="upload" size={16} />
            <span>Submit {category?.name} Preprint</span>
          </a>
          <a
            href="/khelchronicle"
            className="kc-btn-secondary"
            onClick={e => handleLink(e, '/khelchronicle')}
          >
            <span>All Disciplines</span>
          </a>
        </div>
      </header>

      {/* Papers List */}
      <section aria-labelledby="category-preprints-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 id="category-preprints-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            Published Preprints ({papers.length})
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}><p>Checking approved public manuscripts…</p></div>
        ) : !category ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}><h3>Research discipline not found</h3></div>
        ) : papers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <SiteIcon name="search" size={28} style={{ color: '#94a3b8', marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>No reviewed public manuscripts in this discipline yet</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>Be the first researcher to submit a manuscript in {category?.name}.</p>
          </div>
        ) : (
          <div className="kc-papers-grid">
            {papers.map(paper => (
              <article key={paper.id} className="kc-paper-card">
                <div className="kc-paper-top-meta">
                  <span className="kc-paper-id-tag">{paper.paperId}</span>
                  <span className="kc-paper-ver-tag">{paper.version}</span>
                  <span className="kc-paper-category-tag">{paper.categoryName}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    Published manuscript
                  </span>
                  <span className="kc-paper-date">{paper.datePublished}</span>
                </div>

                <h3 className="kc-card-title">
                  <a
                    href={`/khelchronicle/${paper.slug}`}
                    onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                  >
                    {paper.title}
                  </a>
                </h3>

                <div className="kc-paper-authors" style={{ marginBottom: '8px' }}>
                  <span>{paper.authors.map(a => a.name).join(', ')}</span>
                </div>

                <p className="kc-card-abstract-snippet">
                  {paper.abstract.background.slice(0, 220)}…
                </p>

                <div className="kc-keywords-row" style={{ marginBottom: '14px' }}>
                  {paper.keywords.map(kw => (
                    <span key={kw} className="kc-keyword-chip">#{kw}</span>
                  ))}
                </div>

                <div className="kc-card-bottom">
                  <div className="kc-metrics-group">
                    <span className="kc-metric-item">
                      <SiteIcon name="eye" size={13} />
                      <span>{paper.metrics.views} views</span>
                    </span>
                    <span className="kc-metric-item">
                      <SiteIcon name="download" size={13} />
                      <span>{paper.metrics.downloads} downloads</span>
                    </span>
                  </div>

                  <a
                    href={`/khelchronicle/${paper.slug}`}
                    className="kc-btn-secondary"
                    onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                  >
                    <span>Read Full Paper</span>
                    <SiteIcon name="arrow-up-right" size={13} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
export default KhelChronicleCategoryPage
