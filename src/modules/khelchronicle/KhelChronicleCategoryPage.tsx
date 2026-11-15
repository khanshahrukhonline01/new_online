import { useMemo, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_CATEGORIES,
  getPapersByCategory,
  type ResearchCategory,
  type ResearchPaper,
} from './data/khelchronicleData'
import { KhelChroniclePaperCard } from './components/KhelChroniclePaperCard'
import { AcademicGalleyModal } from './components/AcademicGalleyModal'
import { CitationExportModal } from './components/CitationExportModal'
import './khelchronicle.css'

interface KhelChronicleCategoryPageProps {
  categorySlug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleCategoryPage({ categorySlug, onNavigate }: KhelChronicleCategoryPageProps) {
  const category: ResearchCategory | undefined = useMemo(() => {
    return RESEARCH_CATEGORIES.find(c => c.slug === categorySlug.toLowerCase()) || RESEARCH_CATEGORIES[0]
  }, [categorySlug])

  const papers = useMemo(() => {
    if (!category) return []
    return getPapersByCategory(category.slug)
  }, [category])

  // Dynamically computed metrics for this scientific discipline
  const categoryMetrics = useMemo(() => {
    const totalPreprints = papers.length
    const totalViews = papers.reduce((sum, p) => sum + (p.metrics?.views || 0), 0)
    const totalDownloads = papers.reduce((sum, p) => sum + (p.metrics?.downloads || 0), 0)
    const totalCitations = papers.reduce((sum, p) => sum + (p.metrics?.citations || 0), 0)
    const totalAthletes = papers.reduce((sum, p) => {
      if (p.paperId === 'KG-2026-001') return sum + 85
      if (p.paperId === 'KG-2026-002') return sum + 4820
      if (p.paperId === 'KG-2026-003') return sum + 412
      if (p.paperId === 'KG-2026-006') return sum + 1240
      return sum
    }, 0)

    return {
      totalPreprints,
      totalViews,
      totalDownloads,
      totalCitations,
      totalAthletes,
    }
  }, [papers])

  // Interactive Galley & Citation Modal states
  const [galleyPaper, setGalleyPaper] = useState<ResearchPaper | null>(null)
  const [citePaper, setCitePaper] = useState<ResearchPaper | null>(null)
  const [copiedDoiId, setCopiedDoiId] = useState<string | null>(null)

  const handleCopyDoi = (paperId: string, doi: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://doi.org/${doi}`)
      setCopiedDoiId(paperId)
      setTimeout(() => setCopiedDoiId(null), 2000)
    }
  }

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  return (
    <div className="kc-root">
      {/* Breadcrumb */}
      <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
          KhelChronicle
        </a>
        <span> / </span>
        <span style={{ color: '#64748b' }}>Disciplines</span>
        <span> / </span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{category?.name}</span>
      </nav>

      {/* Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>Research Discipline</span>
          </span>
          <span className="kc-badge-open-access">Curated Scientific Discipline</span>
          <span className="kc-badge-open-access">Diamond Open Access (CC BY 4.0)</span>
        </div>

        <h1 className="kc-hero-title">{category?.name}</h1>
        <p className="kc-hero-subtitle">{category?.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href="/khelchronicle/submit"
            className="kc-submit-btn-link"
            onClick={e => handleLink(e, '/khelchronicle/submit')}
          >
            <SiteIcon name="upload" size={16} />
            <span>Submit {category?.name} Preprint</span>
          </a>
          <a
            href="/khelchronicle/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="kc-rss-pill-link"
            title="Subscribe to RSS / Atom feed"
          >
            <SiteIcon name="rss" size={14} />
            <span>RSS Feed</span>
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

      {/* Discipline Metrics Ribbon */}
      <div className="kc-trust-ribbon" style={{ margin: '20px 0 28px' }}>
        <div className="kc-ribbon-item">
          <SiteIcon name="file-text" size={15} />
          <span><strong>{categoryMetrics.totalPreprints}</strong> Preprints Published</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="eye" size={15} />
          <span><strong>{categoryMetrics.totalViews.toLocaleString('en-IN')}+</strong> Readers</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="download" size={15} />
          <span><strong>{categoryMetrics.totalDownloads.toLocaleString('en-IN')}+</strong> Full Downloads</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="bookmark" size={15} />
          <span><strong>{categoryMetrics.totalCitations}</strong> Citations</span>
        </div>
        {categoryMetrics.totalAthletes > 0 && (
          <div className="kc-ribbon-item">
            <SiteIcon name="users" size={15} />
            <span><strong>{categoryMetrics.totalAthletes.toLocaleString('en-IN')}+</strong> Benchmarked Cohorts</span>
          </div>
        )}
      </div>

      {/* Papers List */}
      <section aria-labelledby="category-preprints-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 id="category-preprints-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            Published Preprints in {category?.name} ({papers.length})
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            Showing {papers.length} of {papers.length} Preprints
          </span>
        </div>

        {papers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <SiteIcon name="search" size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>No preprints in this discipline yet</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b' }}>Be the first sports scientist to deposit a manuscript in {category?.name}.</p>
            <a
              href="/khelchronicle/submit"
              className="kc-btn-primary"
              style={{ display: 'inline-flex' }}
              onClick={e => handleLink(e, '/khelchronicle/submit')}
            >
              <span>Submit Manuscript Now</span>
            </a>
          </div>
        ) : (
          <div className="kc-papers-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {papers.map(paper => (
              <KhelChroniclePaperCard
                key={paper.id}
                paper={paper}
                copiedDoiId={copiedDoiId}
                onCopyDoi={handleCopyDoi}
                onOpenGalley={p => setGalleyPaper(p)}
                onOpenCite={p => setCitePaper(p)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal: Interactive Galley Reader */}
      {galleyPaper && (
        <AcademicGalleyModal
          paper={galleyPaper}
          isOpen={!!galleyPaper}
          onClose={() => setGalleyPaper(null)}
        />
      )}

      {/* Modal: Scholarly Citation Export */}
      {citePaper && (
        <CitationExportModal
          paper={citePaper}
          isOpen={!!citePaper}
          onClose={() => setCitePaper(null)}
        />
      )}
    </div>
  )
}
export default KhelChronicleCategoryPage
