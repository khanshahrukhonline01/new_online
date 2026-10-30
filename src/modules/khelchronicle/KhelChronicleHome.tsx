import { useState, useMemo, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_CATEGORIES,
  RESEARCH_PAPERS,
  searchPapers,
  type ResearchPaper,
} from './data/khelchronicleData'
import { getChroniclePapers } from '../../integrations/supabase/chronicle-client'
import './khelchronicle.css'

interface KhelChronicleHomeProps {
  initialCategory?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleHome({ initialCategory = 'all', onNavigate }: KhelChronicleHomeProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [papers, setPapers] = useState<ResearchPaper[]>(() => searchPapers('', initialCategory))

  useEffect(() => {
    let active = true
    getChroniclePapers(selectedCategory, searchQuery).then(res => {
      if (active && res.data) {
        setPapers(res.data)
      }
    })
    return () => {
      active = false
    }
  }, [selectedCategory, searchQuery])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const filteredPapers = papers

  const featuredPaper = useMemo<ResearchPaper | undefined>(() => {
    return filteredPapers[0] || RESEARCH_PAPERS[0]
  }, [filteredPapers])

  const repositorySchema = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'DataCatalog',
      name: 'KhelChronicle — Open Sports Research and Preprint Archive',
      description: 'An open-access research repository for sports biomechanics, exercise physiology, youth athletic development, and Indian sports policy.',
      url: 'https://www.khelgrid.com/khelchronicle',
      publisher: {
        '@type': 'Organization',
        name: 'KhelGrid',
        url: 'https://www.khelgrid.com',
      },
      dataset: RESEARCH_PAPERS.map(p => ({
        '@type': 'ScholarlyArticle',
        name: p.title,
        url: `https://www.khelgrid.com/khelchronicle/${p.slug}`,
        identifier: p.paperId,
        datePublished: p.datePublished,
        author: p.authors.map(a => ({ '@type': 'Person', name: a.name })),
      })),
    }
  }, [])

  return (
    <div className="kc-root">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(repositorySchema) }}
      />

      {/* Hero Section */}
      <section className="kc-hero" aria-labelledby="kc-main-heading">
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>KhelChronicle · Open Sports Research Archive</span>
          </span>
          <span className="kc-badge-open-access">Diamond Open Access</span>
          <span className="kc-badge-open-access">CC BY-NC-ND 4.0</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Test Data Only
          </span>
        </div>

        <h1 id="kc-main-heading" className="kc-hero-title">
          Open Research in Sports and Human Performance.
        </h1>
        <p className="kc-hero-subtitle">
          An open-access preprint and technical research repository dedicated to Indian sports biomechanics, exercise physiology, talent scouting analytics, and grassroots athletic development.
        </p>

        {/* Test Data Disclaimer Banner */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#92400e', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SiteIcon name="info" size={16} />
          <span><strong>Demonstration Mode:</strong> The research preprints, normative athlete percentiles, and author affiliations displayed here are <strong>sample test data</strong> created for platform development, demonstration, and staging verification.</span>
        </div>

        {/* Hero Actions / Search */}
        <div className="kc-hero-actions">
          <div className="kc-search-wrap">
            <SiteIcon name="search" size={18} className="kc-search-icon" />
            <input
              type="search"
              className="kc-search-input"
              placeholder="Search preprints by keyword, author, paper ID, or methodology…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search research preprints"
            />
          </div>
          <a
            href="/khelchronicle/submit"
            className="kc-submit-btn-link"
            onClick={e => handleLink(e, '/khelchronicle/submit')}
          >
            <SiteIcon name="upload" size={16} />
            <span>Submit Research Manuscript</span>
          </a>
        </div>
      </section>

      {/* Stats Row */}
      <div className="kc-stats-row" aria-label="Repository statistics">
        <div className="kc-stat-card">
          <div className="kc-stat-val">5</div>
          <div className="kc-stat-lbl">Active Preprints</div>
        </div>
        <div className="kc-stat-card">
          <div className="kc-stat-val">4,800+</div>
          <div className="kc-stat-lbl">Athletes Benchmarked</div>
        </div>
        <div className="kc-stat-card">
          <div className="kc-stat-val">7</div>
          <div className="kc-stat-lbl">Research Disciplines</div>
        </div>
        <div className="kc-stat-card">
          <div className="kc-stat-val">100%</div>
          <div className="kc-stat-lbl">Diamond Open Access</div>
        </div>
      </div>

      {/* Categories Bar */}
      <nav className="kc-categories-bar" aria-label="Research disciplines filter">
        <button
          type="button"
          className={`kc-cat-pill ${selectedCategory === 'all' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span>All Disciplines</span>
          <small>({RESEARCH_PAPERS.length})</small>
        </button>
        {RESEARCH_CATEGORIES.map(cat => {
          const count = RESEARCH_PAPERS.filter(p => p.category === cat.slug).length
          const isActive = selectedCategory === cat.slug
          return (
            <button
              key={cat.id}
              type="button"
              className={`kc-cat-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              <span>{cat.name}</span>
              {count > 0 && <small>({count})</small>}
            </button>
          )
        })}
      </nav>

      {/* Featured Research Paper */}
      {featuredPaper && (
        <article className="kc-featured-card" aria-labelledby="featured-paper-title">
          <div className="kc-paper-top-meta">
            <span className="kc-paper-id-tag">{featuredPaper.paperId}</span>
            <span className="kc-paper-ver-tag">{featuredPaper.version}</span>
            <span className="kc-paper-category-tag">{featuredPaper.categoryName}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              Test Data
            </span>
            <span className="kc-paper-date">Published {featuredPaper.datePublished}</span>
          </div>

          <h2 id="featured-paper-title" className="kc-featured-title">
            <a
              href={`/khelchronicle/${featuredPaper.slug}`}
              onClick={e => handleLink(e, `/khelchronicle/${featuredPaper.slug}`)}
            >
              {featuredPaper.title}
            </a>
          </h2>

          <div className="kc-paper-authors">
            <span>By </span>
            {featuredPaper.authors.map((auth, idx) => (
              <span key={auth.id}>
                <a
                  href={`/khelchronicle/author/${auth.slug}`}
                  onClick={e => handleLink(e, `/khelchronicle/author/${auth.slug}`)}
                >
                  {auth.name}
                </a>
                {auth.affiliation ? ` (${auth.affiliation.split(',')[0]})` : ''}
                {idx < featuredPaper.authors.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>

          <div className="kc-abstract-box">
            <span className="kc-abstract-label">Abstract: </span>
            <span>{featuredPaper.abstract.background} {featuredPaper.abstract.results}</span>
          </div>

          <div className="kc-keywords-row">
            {featuredPaper.keywords.map(kw => (
              <span key={kw} className="kc-keyword-chip">#{kw}</span>
            ))}
          </div>

          <div className="kc-card-bottom">
            <div className="kc-metrics-group">
              <span className="kc-metric-item">
                <SiteIcon name="download" size={14} />
                <span>{featuredPaper.metrics.downloads} downloads</span>
              </span>
              <span className="kc-metric-item">
                <SiteIcon name="eye" size={14} />
                <span>{featuredPaper.metrics.views} views</span>
              </span>
              <span className="kc-metric-item">
                <SiteIcon name="bookmark" size={14} />
                <span>{featuredPaper.metrics.citations} citations</span>
              </span>
            </div>

            <div className="kc-card-actions">
              <a
                href={`/khelchronicle/${featuredPaper.slug}`}
                className="kc-btn-primary"
                onClick={e => handleLink(e, `/khelchronicle/${featuredPaper.slug}`)}
              >
                <span>Read Full Preprint</span>
                <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
          </div>
        </article>
      )}

      {/* Filtered Papers List */}
      <section aria-labelledby="all-preprints-heading">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 id="all-preprints-heading" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            {selectedCategory === 'all'
              ? 'All Research Preprints'
              : `${RESEARCH_CATEGORIES.find(c => c.slug === selectedCategory)?.name || 'Discipline'} Preprints`}
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredPapers.length} of {RESEARCH_PAPERS.length} papers
          </span>
        </div>

        {filteredPapers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <SiteIcon name="search" size={28} style={{ color: '#94a3b8', marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>No research preprints matched your criteria</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>Try broadening your search query or switching disciplines.</p>
          </div>
        ) : (
          <div className="kc-papers-grid">
            {filteredPapers.map(paper => (
              <article key={paper.id} className="kc-paper-card">
                <div className="kc-paper-top-meta">
                  <span className="kc-paper-id-tag">{paper.paperId}</span>
                  <span className="kc-paper-ver-tag">{paper.version}</span>
                  <span className="kc-paper-category-tag">{paper.categoryName}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    Test Data
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
                  {paper.keywords.slice(0, 4).map(kw => (
                    <span key={kw} className="kc-keyword-chip">#{kw}</span>
                  ))}
                </div>

                <div className="kc-card-bottom">
                  <div className="kc-metrics-group">
                    <span className="kc-metric-item">
                      <SiteIcon name="eye" size={13} />
                      <span>{paper.metrics.views}</span>
                    </span>
                    <span className="kc-metric-item">
                      <SiteIcon name="download" size={13} />
                      <span>{paper.metrics.downloads}</span>
                    </span>
                  </div>

                  <a
                    href={`/khelchronicle/${paper.slug}`}
                    className="kc-btn-secondary"
                    onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                  >
                    <span>View Abstract &amp; Full Paper</span>
                    <SiteIcon name="chevron-right" size={13} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Submission Banner */}
      <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SiteIcon name="award" size={18} style={{ color: '#07964f' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Are you a sports scientist, coach, or academic researcher in India?
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#475569', maxWidth: '820px' }}>
            KhelChronicle provides free, open-access preprint distribution for research across sports biomechanics, exercise physiology, sports medicine, and grassroots sports policy. Preprints are screened, citable with permanent identifiers, and discoverable via Google Scholar metadata.
          </p>
          <div>
            <a
              href="/khelchronicle/submit"
              className="kc-btn-primary"
              style={{ display: 'inline-flex', marginTop: '6px' }}
              onClick={e => handleLink(e, '/khelchronicle/submit')}
            >
              <span>View Author Submission Guidelines</span>
              <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
export default KhelChronicleHome
