import { useState, useMemo, useEffect, useRef, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_CATEGORIES,
  RESEARCH_SPORTS,
  RESEARCH_METHODOLOGIES,
  RESEARCH_PAPERS,
  filterAndSortPapers,
  type ResearchPaper,
  type ChronicleSortOption,
} from './data/khelchronicleData'
import { getChroniclePapers } from '../../integrations/supabase/chronicle-client'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import './khelchronicle.css'

interface KhelChronicleHomeProps {
  initialCategory?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const TRENDING_TOPICS = [
  { label: '#YoYoIR1', query: 'Yo-Yo' },
  { label: '#FastBowling', query: 'fast bowling' },
  { label: '#HighAltitude', query: 'hypoxic altitude' },
  { label: '#KabaddiInjuries', query: 'kabaddi injuries' },
  { label: '#NormativeData', query: 'normative percentiles' },
  { label: '#XGBoostScouting', query: 'XGBoost' },
  { label: '#BoneAgeTW3', query: 'TW3' },
]

export function KhelChronicleHome({ initialCategory = 'all', onNavigate }: KhelChronicleHomeProps) {
  // Read initial filter values from URL query parameters (or props)
  const initialParams = useMemo(() => {
    return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  }, [])

  const [searchQuery, setSearchQuery] = useState(() => initialParams.get('q') ?? '')
  const [selectedSport, setSelectedSport] = useState(() => initialParams.get('sport') ?? 'all')
  const [selectedCategory, setSelectedCategory] = useState(() => initialParams.get('category') ?? initialCategory)
  const [selectedMethodology, setSelectedMethodology] = useState(() => initialParams.get('methodology') ?? 'all')
  const [hasChartOnly, setHasChartOnly] = useState(() => initialParams.get('chart') === 'true')
  const [hasBenchmarksOnly, setHasBenchmarksOnly] = useState(() => initialParams.get('benchmarks') === 'true')
  const [sortBy, setSortBy] = useState<ChronicleSortOption>(() => (initialParams.get('sort') as ChronicleSortOption) || 'newest')

  const [papers, setPapers] = useState<ResearchPaper[]>(() =>
    filterAndSortPapers({
      query: initialParams.get('q') ?? '',
      category: initialParams.get('category') ?? initialCategory,
      sport: initialParams.get('sport') ?? 'all',
      methodology: initialParams.get('methodology') ?? 'all',
      hasChartOnly: initialParams.get('chart') === 'true',
      hasBenchmarksOnly: initialParams.get('benchmarks') === 'true',
      sort: (initialParams.get('sort') as ChronicleSortOption) || 'newest',
    })
  )

  const isPopStateRef = useRef(false)

  // Sync filter state to browser URL and history
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }

    const params = new URLSearchParams(window.location.search)

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    } else {
      params.delete('q')
    }

    if (selectedSport && selectedSport !== 'all') {
      params.set('sport', selectedSport)
    } else {
      params.delete('sport')
    }

    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    } else {
      params.delete('category')
    }

    if (selectedMethodology && selectedMethodology !== 'all') {
      params.set('methodology', selectedMethodology)
    } else {
      params.delete('methodology')
    }

    if (hasChartOnly) {
      params.set('chart', 'true')
    } else {
      params.delete('chart')
    }

    if (hasBenchmarksOnly) {
      params.set('benchmarks', 'true')
    } else {
      params.delete('benchmarks')
    }

    if (sortBy && sortBy !== 'newest') {
      params.set('sort', sortBy)
    } else {
      params.delete('sort')
    }

    const queryString = params.toString()
    const nextUrl = window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash
    const currentUrl = window.location.pathname + window.location.search + window.location.hash
    if (currentUrl !== nextUrl) {
      window.history.pushState({}, '', nextUrl)
    }
  }, [searchQuery, selectedSport, selectedCategory, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  // Listen to browser Back / Forward (popstate) to restore filter state
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      isPopStateRef.current = true
      const params = new URLSearchParams(window.location.search)
      setSearchQuery(params.get('q') ?? '')
      setSelectedSport(params.get('sport') ?? 'all')
      setSelectedCategory(params.get('category') ?? initialCategory)
      setSelectedMethodology(params.get('methodology') ?? 'all')
      setHasChartOnly(params.get('chart') === 'true')
      setHasBenchmarksOnly(params.get('benchmarks') === 'true')
      setSortBy((params.get('sort') as ChronicleSortOption) || 'newest')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [initialCategory])

  // Fetch papers from Supabase (or fallback) whenever filters change
  useEffect(() => {
    let active = true
    getChroniclePapers(selectedCategory, searchQuery, selectedSport, {
      methodologyFilter: selectedMethodology,
      hasChartOnly,
      hasBenchmarksOnly,
      sortBy,
    }).then(res => {
      if (active && res.data) {
        setPapers(res.data)
      }
    })
    return () => {
      active = false
    }
  }, [selectedCategory, searchQuery, selectedSport, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const filteredPapers = papers

  const featuredPaper = useMemo<ResearchPaper | undefined>(() => {
    return filteredPapers[0] || RESEARCH_PAPERS[0]
  }, [filteredPapers])

  // Compute live accurate facet counts
  const facetCounts = useMemo(() => {
    return {
      allSports: RESEARCH_PAPERS.length,
      cricket: RESEARCH_PAPERS.filter(p => p.sportSlug === 'cricket').length,
      athletics: RESEARCH_PAPERS.filter(p => p.sportSlug === 'athletics').length,
      kabaddi: RESEARCH_PAPERS.filter(p => p.sportSlug === 'kabaddi').length,
      multisport: RESEARCH_PAPERS.filter(p => p.sportSlug === 'multi-sport').length,
      charts: RESEARCH_PAPERS.filter(p => p.hasInteractiveChart).length,
      benchmarks: RESEARCH_PAPERS.filter(p => p.hasNormativeBenchmarks).length,
    }
  }, [])

  // Active filter chips computation
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []

    if (searchQuery.trim()) {
      chips.push({
        id: 'chip-query',
        label: `Search: "${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery(''),
      })
    }

    if (selectedSport !== 'all') {
      const sp = RESEARCH_SPORTS.find(s => s.slug === selectedSport)
      chips.push({
        id: 'chip-sport',
        label: `Sport: ${sp?.name || selectedSport}`,
        onRemove: () => setSelectedSport('all'),
      })
    }

    if (selectedCategory !== 'all') {
      const cat = RESEARCH_CATEGORIES.find(c => c.slug === selectedCategory)
      chips.push({
        id: 'chip-cat',
        label: `Discipline: ${cat?.name || selectedCategory}`,
        onRemove: () => setSelectedCategory('all'),
      })
    }

    if (selectedMethodology !== 'all') {
      const meth = RESEARCH_METHODOLOGIES.find(m => m.slug === selectedMethodology)
      chips.push({
        id: 'chip-meth',
        label: `Methodology: ${meth?.shortName || selectedMethodology}`,
        onRemove: () => setSelectedMethodology('all'),
      })
    }

    if (hasChartOnly) {
      chips.push({
        id: 'chip-chart',
        label: 'Chart: Interactive SVG',
        onRemove: () => setHasChartOnly(false),
      })
    }

    if (hasBenchmarksOnly) {
      chips.push({
        id: 'chip-benchmarks',
        label: 'Data: Normative Cutoffs',
        onRemove: () => setHasBenchmarksOnly(false),
      })
    }

    if (sortBy !== 'newest') {
      const sortLabels: Record<ChronicleSortOption, string> = {
        newest: 'Newest',
        oldest: 'Oldest',
        citations: 'Most Cited',
        downloads: 'Most Downloaded',
        reading_time: 'Shortest Read',
      }
      chips.push({
        id: 'chip-sort',
        label: `Sort: ${sortLabels[sortBy]}`,
        onRemove: () => setSortBy('newest'),
      })
    }

    return chips
  }, [searchQuery, selectedSport, selectedCategory, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedSport('all')
    setSelectedCategory('all')
    setSelectedMethodology('all')
    setHasChartOnly(false)
    setHasBenchmarksOnly(false)
    setSortBy('newest')
  }

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
            {searchQuery && (
              <button
                type="button"
                className="kc-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search input"
              >
                ×
              </button>
            )}
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

        {/* Trending Keywords Cloud */}
        <div className="kc-keyword-tags-row" aria-label="Popular research keywords">
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
            Trending Topics:
          </span>
          {TRENDING_TOPICS.map(topic => (
            <button
              key={topic.label}
              type="button"
              className="kc-topic-tag"
              onClick={() => setSearchQuery(topic.query)}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      <DirectoryCallout
        variant="chronicle"
        tag="Diamond Open Access"
        title="Sports Science Research · Zero APC"
        description="Publish preprints with zero submission fees, CC BY licensing, and permanent citation indexing."
        buttonLabel="Submit Paper"
        buttonHref="/khelchronicle/submit"
        onNavigate={onNavigate}
      />

      {/* Stats Row */}
      <div className="kc-stats-row" aria-label="Repository statistics">
        <div className="kc-stat-card">
          <div className="kc-stat-val">{RESEARCH_PAPERS.length}</div>
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

      {/* Filter Section: Sports & Empirical Features Strip */}
      <div className="kc-sports-filter-strip" role="region" aria-label="Filter by sport and empirical data">
        <div className="kc-sports-filter-label">
          <SiteIcon name="filter" size={13} />
          <span>Sport Filter:</span>
        </div>
        <div className="kc-sports-pills-row">
          {RESEARCH_SPORTS.map(sp => {
            const count = sp.slug === 'all'
              ? facetCounts.allSports
              : RESEARCH_PAPERS.filter(p => p.sportSlug === sp.slug).length
            const isActive = selectedSport === sp.slug
            return (
              <button
                key={sp.id}
                type="button"
                className={`kc-sport-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelectedSport(sp.slug)}
                aria-pressed={isActive}
              >
                <span className="kc-sport-emoji">{sp.emoji}</span>
                <span>{sp.name}</span>
                <small>({count})</small>
              </button>
            )
          })}

          {/* Quick Empirical Feature Toggles */}
          <button
            type="button"
            className={`kc-sport-pill kc-feature-pill ${hasChartOnly ? 'is-active' : ''}`}
            onClick={() => setHasChartOnly(!hasChartOnly)}
            aria-pressed={hasChartOnly}
            title="Filter preprints with interactive SVG charts"
          >
            <span className="kc-sport-emoji">📊</span>
            <span>Interactive Charts</span>
            <small>({facetCounts.charts})</small>
          </button>

          <button
            type="button"
            className={`kc-sport-pill kc-feature-pill ${hasBenchmarksOnly ? 'is-active' : ''}`}
            onClick={() => setHasBenchmarksOnly(!hasBenchmarksOnly)}
            aria-pressed={hasBenchmarksOnly}
            title="Filter preprints with national normative benchmarks"
          >
            <span className="kc-sport-emoji">📈</span>
            <span>Normative Cutoffs</span>
            <small>({facetCounts.benchmarks})</small>
          </button>
        </div>
      </div>

      {/* Methodology Filter Bar */}
      <div className="kc-methodologies-bar" role="region" aria-label="Filter by study methodology">
        <div className="kc-methodology-label">
          <SiteIcon name="activity" size={13} />
          <span>Methodology:</span>
        </div>
        <div className="kc-methodologies-pills-row">
          {RESEARCH_METHODOLOGIES.map(meth => {
            const count = meth.slug === 'all'
              ? RESEARCH_PAPERS.length
              : RESEARCH_PAPERS.filter(p => p.methodology === meth.slug).length
            const isActive = selectedMethodology === meth.slug
            return (
              <button
                key={meth.id}
                type="button"
                className={`kc-methodology-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelectedMethodology(meth.slug)}
                aria-pressed={isActive}
              >
                <span>{meth.name}</span>
                <small>({count})</small>
              </button>
            )
          })}
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

      {/* Active Filter Chips & Clear All */}
      {activeChips.length > 0 && (
        <div className="kc-active-chips-bar" aria-label="Active filters summary">
          <div className="kc-active-chips-group">
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              Active filters ({activeChips.length}):
            </span>
            {activeChips.map(chip => (
              <button
                key={chip.id}
                type="button"
                className="kc-active-chip"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span className="kc-chip-remove" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="kc-reset-filters-btn"
            onClick={clearAllFilters}
          >
            Reset all
          </button>
        </div>
      )}

      {/* Featured Research Paper */}
      {featuredPaper && !searchQuery && selectedCategory === 'all' && selectedSport === 'all' && selectedMethodology === 'all' && !hasChartOnly && !hasBenchmarksOnly && (
        <article className="kc-featured-card" aria-labelledby="featured-paper-title">
          <div className="kc-paper-top-meta">
            <span className="kc-paper-id-tag">{featuredPaper.paperId}</span>
            <span className="kc-paper-ver-tag">{featuredPaper.version}</span>
            {featuredPaper.sport && (
              <span className="kc-paper-sport-tag">
                {featuredPaper.sport}
              </span>
            )}
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

      {/* Filtered Papers List Section */}
      <section aria-labelledby="all-preprints-heading">
        {/* Results & Sorting Toolbar */}
        <div className="kc-toolbar-row">
          <div>
            <h2 id="all-preprints-heading" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {selectedCategory === 'all'
                ? 'All Research Preprints'
                : `${RESEARCH_CATEGORIES.find(c => c.slug === selectedCategory)?.name || 'Discipline'} Preprints`}
            </h2>
            <span className="kc-toolbar-count">
              Showing {filteredPapers.length} of {RESEARCH_PAPERS.length} papers
            </span>
          </div>

          {/* Sort Control */}
          <div className="kc-sort-wrap">
            <label htmlFor="kc-sort-select">Sort by:</label>
            <select
              id="kc-sort-select"
              className="kc-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as ChronicleSortOption)}
              aria-label="Sort research preprints"
            >
              <option value="newest">Newest Published</option>
              <option value="citations">Most Cited</option>
              <option value="downloads">Most Downloaded</option>
              <option value="reading_time">Shortest Reading Time</option>
              <option value="oldest">Date: Oldest First</option>
            </select>
          </div>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="kc-empty-state" role="status" aria-live="polite">
            <div className="kc-empty-icon">
              <SiteIcon name="search" size={28} />
            </div>
            <h3>No research preprints matched your criteria</h3>
            <p>
              No preprints were found matching your current filter configuration. Try broadening your query or clearing some filters.
            </p>
            <button
              type="button"
              className="kc-btn-primary"
              style={{ display: 'inline-flex', margin: '0 auto' }}
              onClick={clearAllFilters}
            >
              <SiteIcon name="filter" size={14} />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <div className="kc-papers-grid">
            {filteredPapers.map(paper => (
              <article key={paper.id} className="kc-paper-card">
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
                    <span className="kc-chart-indicator-badge" title="Interactive chart available">
                      📊 Chart
                    </span>
                  )}
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
                    <span className="kc-metric-item">
                      <SiteIcon name="bookmark" size={13} />
                      <span>{paper.metrics.citations}</span>
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
