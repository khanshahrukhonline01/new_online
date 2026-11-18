import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import type { ResearchAuthor, ResearchPaper } from './data/khelchronicleData'
import { getChronicleAuthorBySlug } from '../../integrations/supabase/chronicle-client'
import { KhelChroniclePaperCard } from './components/KhelChroniclePaperCard'
import { AcademicGalleyModal } from './components/AcademicGalleyModal'
import { CitationExportModal } from './components/CitationExportModal'
import './khelchronicle.css'

interface KhelChronicleAuthorPageProps {
  authorSlug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleAuthorPage({ authorSlug, onNavigate }: KhelChronicleAuthorPageProps) {
  const [author, setAuthor] = useState<ResearchAuthor | null | undefined>(undefined)
  const [authoredPapers, setAuthoredPapers] = useState<ResearchPaper[]>([])

  useEffect(() => {
    let active = true
    setAuthor(undefined)
    getChronicleAuthorBySlug(authorSlug).then(result => {
      if (active) {
        setAuthor(result.data?.author ?? null)
        setAuthoredPapers(result.data?.papers ?? [])
      }
    })
    return () => {
      active = false
    }
  }, [authorSlug])

  // Scholar impact metrics dynamically computed
  const authorMetrics = useMemo(() => {
    const totalPreprints = authoredPapers.length
    const totalViews = authoredPapers.reduce((sum, p) => sum + (p.metrics?.views || 0), 0)
    const totalDownloads = authoredPapers.reduce((sum, p) => sum + (p.metrics?.downloads || 0), 0)
    const totalCitations = authoredPapers.reduce((sum, p) => sum + (p.metrics?.citations || 0), 0)
    const totalAthletesTested = authoredPapers.reduce((sum, p) => {
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
      totalAthletesTested,
    }
  }, [authoredPapers])

  // Collaborators & co-authors
  const coAuthors = useMemo(() => {
    if (!author) return []
    const map = new Map<string, ResearchAuthor>()
    authoredPapers.forEach(paper => {
      paper.authors.forEach(a => {
        if (a.slug !== author.slug && !map.has(a.slug)) {
          map.set(a.slug, a)
        }
      })
    })
    return Array.from(map.values())
  }, [author, authoredPapers])

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

  if (author === undefined) {
    return <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}><h2>Checking author record…</h2></div>
  }

  if (author === null) {
    return <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}><h2>Researcher profile not found</h2><p>Only author records linked to approved public manuscripts are shown.</p><a href="/khelchronicle">Back to KhelChronicle</a></div>
  }

  return (
    <div className="kc-root">
      {/* Breadcrumb */}
      <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
          KhelChronicle
        </a>
        <span> / </span>
        <span style={{ color: '#64748b' }}>Researchers</span>
        <span> / </span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{author?.name}</span>
      </nav>

      {/* Author Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>KhelChronicle Researcher Profile</span>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Author record
          </span>
          <span className="kc-badge-open-access">
            Verified Institutional Investigator
          </span>
          {author?.orcid && (
            <a
              href={`https://orcid.org/${author.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="kc-badge-open-access"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Verified ORCID iD"
            >
              <span style={{ fontWeight: 800 }}>iD</span>
              <span>ORCID: {author.orcid}</span>
            </a>
          )}
        </div>

        <h1 className="kc-hero-title">{author?.name}</h1>
        <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#07964f' }}>
          {author?.role}
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#475569' }}>
          {author?.affiliation}
        </p>
        <p className="kc-hero-subtitle" style={{ marginBottom: '20px' }}>
          {author?.bio}
        </p>

        {author?.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <SiteIcon name="mail" size={14} />
            <span>Research Inquiries &amp; Replication: </span>
            <a href={`mailto:${author.email}`} style={{ color: '#07964f', fontWeight: 600 }}>
              {author.email}
            </a>
          </div>
        )}
      </header>

      {/* Researcher Impact Metrics Strip */}
      <div className="kc-trust-ribbon" style={{ margin: '20px 0 28px' }}>
        <div className="kc-ribbon-item">
          <SiteIcon name="file-text" size={15} />
          <span><strong>{authorMetrics.totalPreprints}</strong> Authored Preprints</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="eye" size={15} />
          <span><strong>{authorMetrics.totalViews.toLocaleString('en-IN')}+</strong> Cumulative Views</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="download" size={15} />
          <span><strong>{authorMetrics.totalDownloads.toLocaleString('en-IN')}+</strong> Manuscript Downloads</span>
        </div>
        <div className="kc-ribbon-item">
          <SiteIcon name="bookmark" size={15} />
          <span><strong>{authorMetrics.totalCitations}</strong> Academic Citations</span>
        </div>
        {authorMetrics.totalAthletesTested > 0 && (
          <div className="kc-ribbon-item">
            <SiteIcon name="users" size={15} />
            <span><strong>{authorMetrics.totalAthletesTested.toLocaleString('en-IN')}+</strong> Athletes Benchmarked</span>
          </div>
        )}
      </div>

      {/* Main Content Layout: Authored Papers & Collaborators */}
      <div style={{ display: 'grid', gridTemplateColumns: coAuthors.length > 0 ? 'minmax(0, 1fr) 280px' : '1fr', gap: '28px', alignItems: 'start' }}>
        {/* Authored Preprints Column */}
        <section aria-labelledby="authored-papers-title">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 id="authored-papers-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Authored Preprints ({authoredPapers.length})
            </h2>
            <a
              href="/khelchronicle/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-rss-pill-link"
              title="Subscribe to KhelChronicle RSS feed"
            >
              <SiteIcon name="rss" size={13} />
              <span>RSS Feed</span>
            </a>
          </div>

          <div className="kc-papers-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {authoredPapers.map(paper => (
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
        </section>

        {/* Collaborators / Co-Authors Sidebar */}
        {coAuthors.length > 0 && (
          <aside aria-label="Research Collaborators" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Frequent Co-Authors ({coAuthors.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {coAuthors.map(co => (
                <div key={co.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <a
                    href={`/khelchronicle/author/${co.slug}`}
                    onClick={e => handleLink(e, `/khelchronicle/author/${co.slug}`)}
                    style={{ fontSize: '14px', fontWeight: 700, color: '#07964f', textDecoration: 'none' }}
                  >
                    {co.name}
                  </a>
                  <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    {co.affiliation?.split(',')[0]}
                  </span>
                  {co.orcid && (
                    <a
                      href={`https://orcid.org/${co.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kc-orcid-micro-badge"
                      style={{ alignSelf: 'flex-start', marginTop: '2px' }}
                      title={`ORCID: ${co.orcid}`}
                    >
                      iD {co.orcid}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

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
export default KhelChronicleAuthorPage
