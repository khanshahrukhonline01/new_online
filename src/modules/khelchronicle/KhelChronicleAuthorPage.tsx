import { useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_AUTHORS,
  getPapersByAuthor,
  type ResearchAuthor,
} from './data/khelchronicleData'
import './khelchronicle.css'

interface KhelChronicleAuthorPageProps {
  authorSlug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleAuthorPage({ authorSlug, onNavigate }: KhelChronicleAuthorPageProps) {
  const author: ResearchAuthor | undefined = useMemo(() => {
    return RESEARCH_AUTHORS[authorSlug.toLowerCase()] || Object.values(RESEARCH_AUTHORS)[0]
  }, [authorSlug])

  const authoredPapers = useMemo(() => {
    if (!author) return []
    return getPapersByAuthor(author.slug)
  }, [author])

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
        <span style={{ color: '#64748b' }}>Researchers</span>
        <span> / </span>
        <span style={{ color: '#64748b' }}>{author?.name}</span>
      </nav>

      {/* Author Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>KhelChronicle Researcher Profile</span>
          </span>
          {author?.orcid && (
            <a
              href={`https://orcid.org/${author.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="kc-badge-open-access"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span style={{ fontWeight: 800 }}>iD</span>
              <span>ORCID: {author.orcid}</span>
            </a>
          )}
        </div>

        <h1 className="kc-hero-title">{author?.name}</h1>
        <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: '#07964f' }}>
          {author?.role}
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>
          {author?.affiliation}
        </p>
        <p className="kc-hero-subtitle" style={{ marginBottom: '20px' }}>
          {author?.bio}
        </p>

        {author?.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <SiteIcon name="mail" size={14} />
            <span>Research Inquiries: </span>
            <a href={`mailto:${author.email}`} style={{ color: '#07964f', fontWeight: 600 }}>
              {author.email}
            </a>
          </div>
        )}
      </header>

      {/* Authored Preprints */}
      <section aria-labelledby="authored-papers-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 id="authored-papers-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            Authored Preprints ({authoredPapers.length})
          </h2>
        </div>

        <div className="kc-papers-grid">
          {authoredPapers.map(paper => (
            <article key={paper.id} className="kc-paper-card">
              <div className="kc-paper-top-meta">
                <span className="kc-paper-id-tag">{paper.paperId}</span>
                <span className="kc-paper-ver-tag">{paper.version}</span>
                <span className="kc-paper-category-tag">{paper.categoryName}</span>
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

              <p className="kc-card-abstract-snippet">
                {paper.abstract.background.slice(0, 220)}…
              </p>

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
                  <span className="kc-metric-item">
                    <SiteIcon name="bookmark" size={13} />
                    <span>{paper.metrics.citations} citations</span>
                  </span>
                </div>

                <a
                  href={`/khelchronicle/${paper.slug}`}
                  className="kc-btn-secondary"
                  onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                >
                  <span>Read Paper</span>
                  <SiteIcon name="arrow-up-right" size={13} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
export default KhelChronicleAuthorPage
