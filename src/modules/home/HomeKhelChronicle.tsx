import { useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_PAPERS,
  generateCitations,
  type ResearchPaper,
} from '../khelchronicle/data/khelchronicleData'
import './homeKhelChronicle.css'

interface HomeKhelChronicleProps {
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void
}

const FEATURED_PAPER_SLUGS = [
  'KG-2026-001',
  'KG-2026-002',
  'KG-2026-004',
]

const ACTIONABLE_COACH_TAKEAWAYS: Record<string, { label: string; takeaway: string; badge: string }> = {
  'KG-2026-001': {
    badge: 'Injury Prevention',
    label: 'Coaching & Athlete Protocol',
    takeaway: 'Restricting pelvic-shoulder separation under 30° and keeping front-knee angle > 155° at crease contact slashes lumbar bone stress fractures by 68%.',
  },
  'KG-2026-002': {
    badge: 'National Benchmarking',
    label: 'Scouting & Testing Cutoffs',
    takeaway: 'National 90th percentile threshold for U-16 athletes is Yo-Yo IR1 ≥ 1,840m, 30m sprint ≤ 4.08s, and CMJ ≥ 48.2cm. Benchmark athletes against 4,800 peers.',
  },
  'KG-2026-004': {
    badge: 'Scouting Analytics',
    label: 'Talent Identification Models',
    takeaway: 'XGBoost ensemble model achieves 0.88 ROC-AUC for U-16 state selection prediction by tracking ball release consistency and control percentage against back-of-a-length deliveries.',
  },
}

export function HomeKhelChronicle({ onNavigate }: HomeKhelChronicleProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all')
  const [expandedAbstractSlug, setExpandedAbstractSlug] = useState<string | null>(null)
  const [activeCitePaper, setActiveCitePaper] = useState<ResearchPaper | null>(null)
  const [citeFormat, setCiteFormat] = useState<'apa' | 'bibtex' | 'mla' | 'chicago' | 'vancouver'>('apa')
  const [copiedCitation, setCopiedCitation] = useState<boolean>(false)
  const [copiedLinkSlug, setCopiedLinkSlug] = useState<string | null>(null)
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>([])
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false)

  // Load saved bookmarks from localStorage for user retention
  useEffect(() => {
    try {
      const stored = localStorage.getItem('khelgrid_chronicle_bookmarks')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setBookmarkedSlugs(parsed)
        }
      }
    } catch {
      // ignore storage access errors
    }
  }, [])

  const toggleBookmark = (slug: string) => {
    setBookmarkedSlugs(prev => {
      const exists = prev.includes(slug)
      const next = exists ? prev.filter(s => s !== slug) : [...prev, slug]
      try {
        localStorage.setItem('khelgrid_chronicle_bookmarks', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const featuredPapers = useMemo(() => {
    return FEATURED_PAPER_SLUGS.map(slug =>
      RESEARCH_PAPERS.find(p => p.slug === slug || p.paperId === slug)
    ).filter((p): p is ResearchPaper => Boolean(p))
  }, [])

  const displayPapers = useMemo(() => {
    return featuredPapers.filter(paper => {
      if (showBookmarksOnly && !bookmarkedSlugs.includes(paper.slug)) {
        return false
      }
      if (selectedDiscipline === 'all') return true
      return paper.category === selectedDiscipline
    })
  }, [featuredPapers, selectedDiscipline, showBookmarksOnly, bookmarkedSlugs])

  const handleCopyLink = async (paper: ResearchPaper) => {
    const url = `https://www.khelgrid.com/khelchronicle/${paper.slug}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
      setCopiedLinkSlug(paper.slug)
      setTimeout(() => setCopiedLinkSlug(null), 2500)
    } catch {
      // fallback
    }
  }

  const handleCopyCitation = async () => {
    if (!activeCitePaper) return
    const citations = generateCitations(activeCitePaper)
    const textToCopy = citations[citeFormat]
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy)
      }
      setCopiedCitation(true)
      setTimeout(() => setCopiedCitation(false), 2200)
    } catch {
      // fallback
    }
  }

  // Schema.org ItemList JSON-LD for rich Google Search & Google Scholar crawling
  const structuredData = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'KhelChronicle Featured Sports Science & Biomechanics Preprints',
      description: 'Peer-moderated open-access empirical research, grassroots athletic percentiles, and biomechanics preprints in Indian sports.',
      numberOfItems: featuredPapers.length,
      itemListElement: featuredPapers.map((paper, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ScholarlyArticle',
          headline: paper.title,
          name: paper.title,
          url: `https://www.khelgrid.com/khelchronicle/${paper.slug}`,
          datePublished: paper.datePublished,
          dateModified: paper.dateModified,
          keywords: paper.keywords.join(', '),
          description: paper.abstract.background,
          license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
          author: paper.authors.map(a => ({
            '@type': 'Person',
            name: a.name,
            jobTitle: a.role,
            worksFor: {
              '@type': 'Organization',
              name: a.affiliation,
            },
            sameAs: a.orcid ? `https://orcid.org/${a.orcid}` : undefined,
          })),
          publisher: {
            '@type': 'Organization',
            name: 'KhelChronicle Open Sports Research Archive',
            url: 'https://www.khelgrid.com/khelchronicle',
          },
        },
      })),
    }
  }, [featuredPapers])

  return (
    <section
      id="home-khelchronicle"
      className="home-chronicle-section"
      aria-labelledby="home-chronicle-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header with Title, Live Retention Stats, and Navigation */}
      <div className="home-chronicle-header">
        <div className="home-chronicle-heading-group">
          <div className="home-chronicle-eyebrow">
            <span className="home-chronicle-pulse" aria-hidden="true" />
            <SiteIcon name="award" size={14} style={{ color: '#10b981' }} />
            <span>KhelChronicle · Open Sports Research Repository</span>
            <span className="home-chronicle-badge-green">Diamond Open Access</span>
          </div>

          <h2 id="home-chronicle-heading" className="home-chronicle-title">
            Empirical Sports Science &amp; National Athlete Benchmarks
          </h2>
          <p className="home-chronicle-subtitle">
            Peer-moderated research preprints, 3D motion capture biomechanics, and normative physical percentiles across 16 Indian sporting corridors.
          </p>
        </div>

        <div className="home-chronicle-header-actions">
          {bookmarkedSlugs.length > 0 && (
            <button
              type="button"
              className={`home-chronicle-bookmark-filter-btn ${showBookmarksOnly ? 'active' : ''}`}
              onClick={() => setShowBookmarksOnly(prev => !prev)}
              aria-pressed={showBookmarksOnly}
              title="Filter saved reading list"
            >
              <SiteIcon name="bookmark" size={13} />
              <span>Saved ({bookmarkedSlugs.length})</span>
            </button>
          )}

          <a
            className="home-chronicle-view-all-pill"
            href="/khelchronicle"
            onClick={e => onNavigate?.(e, '/khelchronicle')}
            aria-label="View all preprints in KhelChronicle repository"
          >
            <span>Explore All Preprints (5)</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
        </div>
      </div>

      {/* Engagement Discipline Tabs */}
      <div className="home-chronicle-filter-bar" role="tablist" aria-label="Research topic tabs">
        <button
          type="button"
          role="tab"
          aria-selected={selectedDiscipline === 'all' && !showBookmarksOnly}
          className={`home-chronicle-filter-pill ${selectedDiscipline === 'all' && !showBookmarksOnly ? 'active' : ''}`}
          onClick={() => {
            setSelectedDiscipline('all')
            setShowBookmarksOnly(false)
          }}
        >
          <span>All 3 Flagships</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDiscipline === 'sports-biomechanics'}
          className={`home-chronicle-filter-pill ${selectedDiscipline === 'sports-biomechanics' ? 'active' : ''}`}
          onClick={() => {
            setSelectedDiscipline('sports-biomechanics')
            setShowBookmarksOnly(false)
          }}
        >
          <span>Biomechanics &amp; Spine Stress</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDiscipline === 'exercise-physiology'}
          className={`home-chronicle-filter-pill ${selectedDiscipline === 'exercise-physiology' ? 'active' : ''}`}
          onClick={() => {
            setSelectedDiscipline('exercise-physiology')
            setShowBookmarksOnly(false)
          }}
        >
          <span>Youth Fitness Norms</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDiscipline === 'sports-analytics'}
          className={`home-chronicle-filter-pill ${selectedDiscipline === 'sports-analytics' ? 'active' : ''}`}
          onClick={() => {
            setSelectedDiscipline('sports-analytics')
            setShowBookmarksOnly(false)
          }}
        >
          <span>Talent &amp; Match Analytics</span>
        </button>
      </div>

      {/* Three Research Cards Grid */}
      <div className="home-chronicle-grid">
        {displayPapers.map(paper => {
          const takeaway = ACTIONABLE_COACH_TAKEAWAYS[paper.paperId]
          const isExpanded = expandedAbstractSlug === paper.slug
          const isBookmarked = bookmarkedSlugs.includes(paper.slug)
          const primaryAuthor = paper.authors[0]
          const firstConnectedLink = paper.connectedKhelGridLinks?.[0]

          return (
            <article
              key={paper.id}
              className={`home-chronicle-card ${isExpanded ? 'is-expanded' : ''}`}
              itemScope
              itemType="https://schema.org/ScholarlyArticle"
            >
              {/* Card Header Meta */}
              <div className="home-chronicle-card-top">
                <div className="home-chronicle-meta-left">
                  <a
                    href={`/khelchronicle/category/${paper.category}`}
                    onClick={e => onNavigate?.(e, `/khelchronicle/category/${paper.category}`)}
                    className="home-chronicle-category-badge"
                  >
                    {paper.categoryName}
                  </a>
                  <span className="home-chronicle-id-chip">{paper.paperId}</span>
                  <span className="home-chronicle-version-chip">{paper.version}</span>
                </div>

                <div className="home-chronicle-meta-right">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(paper.slug)}
                    className={`home-chronicle-bookmark-btn ${isBookmarked ? 'is-bookmarked' : ''}`}
                    title={isBookmarked ? 'Remove from saved reading list' : 'Save to reading list'}
                    aria-label={isBookmarked ? `Unsave ${paper.title}` : `Save ${paper.title}`}
                  >
                    <SiteIcon name="bookmark" size={14} />
                    <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Title & Internal SEO Link */}
              <h3 className="home-chronicle-card-title" itemProp="headline">
                <a
                  href={`/khelchronicle/${paper.slug}`}
                  onClick={e => onNavigate?.(e, `/khelchronicle/${paper.slug}`)}
                  className="home-chronicle-card-title-link"
                >
                  {paper.title}
                </a>
              </h3>

              {/* Authors & Institutional Affiliation */}
              <div className="home-chronicle-author-row">
                <SiteIcon name="user" size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span className="home-chronicle-authors-text">
                  By{' '}
                  <a
                    href={`/khelchronicle/author/${primaryAuthor.slug}`}
                    onClick={e => onNavigate?.(e, `/khelchronicle/author/${primaryAuthor.slug}`)}
                    className="home-chronicle-author-link"
                  >
                    {primaryAuthor.name}
                  </a>
                  {paper.authors.length > 1 && ` & ${paper.authors[1].name}`}
                </span>
                <span className="home-chronicle-dot" aria-hidden="true">·</span>
                <span className="home-chronicle-institution">{primaryAuthor.affiliation}</span>
              </div>

              {/* User Retention Takeaway Box */}
              {takeaway && (
                <div className="home-chronicle-takeaway-box">
                  <div className="home-chronicle-takeaway-head">
                    <SiteIcon name="sparkles" size={13} style={{ color: '#10b981' }} />
                    <span className="home-chronicle-takeaway-label">{takeaway.label}</span>
                    <span className="home-chronicle-takeaway-badge">{takeaway.badge}</span>
                  </div>
                  <p className="home-chronicle-takeaway-p">
                    {takeaway.takeaway}
                  </p>
                </div>
              )}

              {/* User Engagement: Structured Abstract Drawer */}
              <div className="home-chronicle-abstract-wrap">
                <div className="home-chronicle-abstract-toggle-row">
                  <button
                    type="button"
                    className="home-chronicle-abstract-btn"
                    onClick={() => setExpandedAbstractSlug(isExpanded ? null : paper.slug)}
                    aria-expanded={isExpanded}
                  >
                    <SiteIcon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={13} />
                    <span>{isExpanded ? 'Hide Abstract & Methods' : 'Quick Abstract & Data (1-Click)'}</span>
                  </button>
                  <span className="home-chronicle-read-time">
                    <SiteIcon name="clock" size={12} />
                    {paper.readingTimeMinutes} min read
                  </span>
                </div>

                {isExpanded && (
                  <div className="home-chronicle-abstract-body">
                    <div className="home-chronicle-abstract-part">
                      <strong>Background:</strong> {paper.abstract.background}
                    </div>
                    <div className="home-chronicle-abstract-part">
                      <strong>Methods:</strong> {paper.abstract.methods}
                    </div>
                    <div className="home-chronicle-abstract-part highlight">
                      <strong>Key Findings:</strong> {paper.abstract.results}
                    </div>
                    <div className="home-chronicle-abstract-part">
                      <strong>Conclusion:</strong> {paper.abstract.conclusion}
                    </div>
                  </div>
                )}
              </div>

              {/* Retention Tool Link (Bridging Research to Practical Platform Utility) */}
              {firstConnectedLink && (
                <div className="home-chronicle-bridge-row">
                  <span className="home-chronicle-bridge-caption">Operationalize On KhelGrid:</span>
                  <a
                    href={firstConnectedLink.href}
                    onClick={e => onNavigate?.(e, firstConnectedLink.href)}
                    className="home-chronicle-bridge-link"
                  >
                    <span>{firstConnectedLink.label}</span>
                    <SiteIcon name="arrow-up-right" size={12} />
                  </a>
                </div>
              )}

              {/* Card Footer: Metrics & Interactive Engagement Triggers */}
              <div className="home-chronicle-card-footer">
                <div className="home-chronicle-metrics-chips">
                  <span className="home-chronicle-metric-item" title="Verified Readers">
                    <SiteIcon name="eye" size={12} />
                    <span>{paper.metrics.views.toLocaleString()}</span>
                  </span>
                  <span className="home-chronicle-metric-item" title="PDF Downloads">
                    <SiteIcon name="download" size={12} />
                    <span>{paper.metrics.downloads.toLocaleString()}</span>
                  </span>
                  <span className="home-chronicle-metric-item" title="Academic Citations">
                    <SiteIcon name="award" size={12} />
                    <span>{paper.metrics.citations} citations</span>
                  </span>
                </div>

                <div className="home-chronicle-footer-actions">
                  <button
                    type="button"
                    onClick={() => setActiveCitePaper(paper)}
                    className="home-chronicle-action-btn"
                    title="Generate academic citation"
                  >
                    <SiteIcon name="file-text" size={13} />
                    <span>Cite</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(paper)}
                    className="home-chronicle-action-btn"
                    title="Share paper permalink"
                  >
                    <SiteIcon name="share" size={13} />
                    <span>{copiedLinkSlug === paper.slug ? 'Copied!' : 'Share'}</span>
                  </button>

                  <a
                    href={`/khelchronicle/${paper.slug}`}
                    onClick={e => onNavigate?.(e, `/khelchronicle/${paper.slug}`)}
                    className="home-chronicle-read-full-btn"
                  >
                    <span>Read Paper</span>
                    <SiteIcon name="arrow-right" size={12} />
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Bottom Retention & Submission Callout */}
      <div className="home-chronicle-bottom-banner">
        <div className="home-chronicle-bottom-copy">
          <div className="home-chronicle-bottom-badge">Open Science for Indian Athletics</div>
          <h3>Are you a Sports Scientist, Biomechanist or Performance Coach?</h3>
          <p>
            Publish your research preprints, normative cohort benchmarks, or clinical sports medicine studies on KhelChronicle with zero publication charges (APC). Protect your intellectual property while giving Indian athletes empirical answers.
          </p>
        </div>
        <div className="home-chronicle-bottom-buttons">
          <a
            href="/khelchronicle/submit"
            onClick={e => onNavigate?.(e, '/khelchronicle/submit')}
            className="home-chronicle-submit-btn"
          >
            <SiteIcon name="upload" size={14} />
            <span>Submit Preprint</span>
          </a>
          <a
            href="/khelchronicle"
            onClick={e => onNavigate?.(e, '/khelchronicle')}
            className="home-chronicle-browse-all-btn"
          >
            <span>Browse Full Archive</span>
            <SiteIcon name="chevron-right" size={14} />
          </a>
        </div>
      </div>

      {/* Engagement Citation Generator Modal */}
      {activeCitePaper && (
        <div
          className="khelchronicle-modal-backdrop"
          onClick={() => setActiveCitePaper(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cite-modal-title"
        >
          <div className="khelchronicle-modal-card" onClick={e => e.stopPropagation()}>
            <div className="khelchronicle-modal-header">
              <div>
                <span className="khelchronicle-pill-green">Academic Citation</span>
                <h3 id="cite-modal-title" className="khelchronicle-modal-title">
                  {activeCitePaper.title}
                </h3>
                <p className="khelchronicle-modal-sub">
                  KhelChronicle Open Sports Research Archive · Accession {activeCitePaper.paperId}
                </p>
              </div>
              <button
                type="button"
                className="khelchronicle-modal-close"
                onClick={() => setActiveCitePaper(null)}
                aria-label="Close citation dialog"
              >
                ✕
              </button>
            </div>

            <div className="khelchronicle-citation-tabs">
              {(['apa', 'bibtex', 'mla', 'chicago', 'vancouver'] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  className={`khelchronicle-cite-tab ${citeFormat === fmt ? 'active' : ''}`}
                  onClick={() => setCiteFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="khelchronicle-citation-preview">
              <pre className="khelchronicle-cite-pre">
                <code>{generateCitations(activeCitePaper)[citeFormat]}</code>
              </pre>
            </div>

            <div className="khelchronicle-modal-footer">
              <button
                type="button"
                className="khelchronicle-btn-copy"
                onClick={handleCopyCitation}
              >
                <SiteIcon name="copy" size={14} />
                <span>{copiedCitation ? 'Copied to Clipboard!' : `Copy ${citeFormat.toUpperCase()} Citation`}</span>
              </button>
              <button
                type="button"
                className="khelchronicle-btn-done"
                onClick={() => setActiveCitePaper(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
