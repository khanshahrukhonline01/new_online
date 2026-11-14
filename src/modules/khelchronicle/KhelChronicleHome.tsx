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
import './khelchronicle.css'

interface KhelChronicleHomeProps {
  initialCategory?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

type ChronicleNavTab = 'archive' | 'about' | 'moderation' | 'guidelines' | 'faq'

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

  const [activeTab, setActiveTab] = useState<ChronicleNavTab>(() => {
    const t = initialParams.get('tab')
    if (t === 'about' || t === 'moderation' || t === 'guidelines' || t === 'faq') return t
    return 'archive'
  })

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

  // Sync filter and tab state to browser URL and history
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }

    const params = new URLSearchParams(window.location.search)

    if (activeTab !== 'archive') {
      params.set('tab', activeTab)
    } else {
      params.delete('tab')
    }

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

    const queryStr = params.toString()
    const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (newUrl !== currentUrl) {
      window.history.pushState({ path: newUrl }, '', newUrl)
    }
  }, [activeTab, searchQuery, selectedSport, selectedCategory, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  // Listen to popstate event for browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      isPopStateRef.current = true
      const p = new URLSearchParams(window.location.search)
      const tabVal = p.get('tab')
      setActiveTab(tabVal === 'about' || tabVal === 'moderation' || tabVal === 'guidelines' || tabVal === 'faq' ? tabVal : 'archive')
      setSearchQuery(p.get('q') ?? '')
      setSelectedSport(p.get('sport') ?? 'all')
      setSelectedCategory(p.get('category') ?? initialCategory)
      setSelectedMethodology(p.get('methodology') ?? 'all')
      setHasChartOnly(p.get('chart') === 'true')
      setHasBenchmarksOnly(p.get('benchmarks') === 'true')
      setSortBy((p.get('sort') as ChronicleSortOption) || 'newest')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initialCategory])

  // Attempt async fetch from Supabase (with fallback built into client)
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
    }).catch(() => {
      // In offline/error states, client returns local fallback data cleanly
    })
    return () => { active = false }
  }, [searchQuery, selectedCategory, selectedSport, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  // Filtered and sorted papers calculated from active state
  const filteredPapers = useMemo(() => {
    return filterAndSortPapers({
      query: searchQuery,
      category: selectedCategory,
      sport: selectedSport,
      methodology: selectedMethodology,
      hasChartOnly,
      hasBenchmarksOnly,
      sort: sortBy,
    })
  }, [searchQuery, selectedCategory, selectedSport, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  // Featured Paper (First paper of the filtered set or default)
  const featuredPaper = useMemo(() => {
    return filteredPapers[0] || papers[0] || RESEARCH_PAPERS[0]
  }, [filteredPapers, papers])

  // Dynamic counts for sports
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: RESEARCH_PAPERS.length }
    RESEARCH_SPORTS.forEach(s => {
      if (s.slug !== 'all') {
        counts[s.slug] = RESEARCH_PAPERS.filter(p => p.sportSlug === s.slug).length
      }
    })
    return counts
  }, [])

  // Dynamic counts for methodologies
  const methodologyCounts = useMemo(() => {
    const counts: Record<string, number> = { all: RESEARCH_PAPERS.length }
    RESEARCH_METHODOLOGIES.forEach(m => {
      if (m.slug !== 'all') {
        counts[m.slug] = RESEARCH_PAPERS.filter(p => p.methodology === m.slug).length
      }
    })
    return counts
  }, [])

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []

    if (searchQuery.trim()) {
      chips.push({
        id: 'chip-query',
        label: `Search: "${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery(''),
      })
    }

    if (selectedSport !== 'all') {
      const sportObj = RESEARCH_SPORTS.find(s => s.slug === selectedSport)
      chips.push({
        id: 'chip-sport',
        label: `Sport: ${sportObj?.name || selectedSport}`,
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
      name: 'KhelChronicle / SportRxiv India — Open Sports Research and Preprint Archive',
      description: 'An open-access research repository for sports biomechanics, exercise physiology, youth athletic development, and Indian sports policy.',
      url: 'https://www.khelgrid.com/khelchronicle',
      publisher: {
        '@type': 'Organization',
        name: 'KhelGrid & SportRxiv Open Science Initiative',
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
          <span className="kc-badge-open-access">CC BY 4.0</span>
          <span className="kc-badge-open-access">STORK Aligned</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Test Data Only
          </span>
        </div>

        <h1 id="kc-main-heading" className="kc-hero-title">
          Open Research in Sports and Human Performance.
        </h1>
        <p className="kc-hero-subtitle">
          An open-access preprint archive for sports biomechanics, exercise physiology, movement sciences, talent identification, and Indian sports policy. Free to submit, free to read, permanent Crossref DOIs.
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
              placeholder="Search preprints by keyword, author, DOI, or methodology…"
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
            <span>Submit a Preprint</span>
          </a>
        </div>

        {/* Trending Keywords / Hashtags */}
        <div className="kc-keyword-tags-row" role="group" aria-label="Trending research topics">
          <span className="kc-topic-label">Trending Topics:</span>
          {TRENDING_TOPICS.map(topic => (
            <button
              key={topic.label}
              type="button"
              className={`kc-topic-tag ${searchQuery === topic.query ? 'is-active' : ''}`}
              onClick={() => {
                setSearchQuery(topic.query)
                setActiveTab('archive')
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      {/* SportRxiv Top Navigation Tabs */}
      <nav className="kc-server-nav-tabs" role="tablist" aria-label="KhelChronicle Navigation Tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'archive'}
          className={`kc-server-tab ${activeTab === 'archive' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          <SiteIcon name="file-text" size={14} />
          <span>Preprints Archive ({RESEARCH_PAPERS.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'about'}
          className={`kc-server-tab ${activeTab === 'about' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <SiteIcon name="info" size={14} />
          <span>About KhelChronicle</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'moderation'}
          className={`kc-server-tab ${activeTab === 'moderation' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('moderation')}
        >
          <SiteIcon name="shield-check" size={14} />
          <span>Editorial &amp; Moderation Policy</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'guidelines'}
          className={`kc-server-tab ${activeTab === 'guidelines' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('guidelines')}
        >
          <SiteIcon name="award" size={14} />
          <span>Author Guidelines</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'faq'}
          className={`kc-server-tab ${activeTab === 'faq' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          <SiteIcon name="help-circle" size={14} />
          <span>FAQ</span>
        </button>
      </nav>

      {/* TAB 1: ARCHIVE BROWSE (DEFAULT) */}
      {activeTab === 'archive' && (
        <>
          {/* Sports Filter & Feature Toggles Strip */}
          <div className="kc-sports-filter-strip" role="group" aria-label="Filter preprints by sport and empirical features">
            <span className="kc-sports-filter-label">Sport Filter:</span>
            {RESEARCH_SPORTS.map(sport => {
              const count = sportCounts[sport.slug] ?? 0
              const isSelected = selectedSport === sport.slug
              return (
                <button
                  key={sport.id}
                  type="button"
                  className={`kc-sport-pill ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setSelectedSport(sport.slug)}
                  aria-pressed={isSelected}
                >
                  <span className="kc-sport-emoji" aria-hidden="true">{sport.emoji}</span>
                  <span className="kc-sport-name">{sport.name}</span>
                  <span className="kc-sport-count" aria-label={`${count} papers`}>{count}</span>
                </button>
              )
            })}

            {/* Quick Feature Toggles */}
            <div className="kc-feature-toggles-wrap">
              <button
                type="button"
                className={`kc-feature-pill ${hasChartOnly ? 'is-active' : ''}`}
                onClick={() => setHasChartOnly(prev => !prev)}
                aria-pressed={hasChartOnly}
                title="Filter papers with interactive SVG data charts"
              >
                <span>📊 Interactive Charts</span>
              </button>
              <button
                type="button"
                className={`kc-feature-pill ${hasBenchmarksOnly ? 'is-active' : ''}`}
                onClick={() => setHasBenchmarksOnly(prev => !prev)}
                aria-pressed={hasBenchmarksOnly}
                title="Filter papers with normative cutoffs and percentiles"
              >
                <span>📈 Normative Cutoffs</span>
              </button>
            </div>
          </div>

          {/* Methodology Filter Bar */}
          <div className="kc-methodologies-bar" role="group" aria-label="Filter preprints by study methodology">
            <span className="kc-methodology-label">Study Methodology:</span>
            <div className="kc-methodology-pills-row">
              {RESEARCH_METHODOLOGIES.map(meth => {
                const count = methodologyCounts[meth.slug] ?? 0
                const isSelected = selectedMethodology === meth.slug
                return (
                  <button
                    key={meth.id}
                    type="button"
                    className={`kc-methodology-pill ${isSelected ? 'is-active' : ''}`}
                    onClick={() => setSelectedMethodology(meth.slug)}
                    aria-pressed={isSelected}
                  >
                    <span>{meth.shortName}</span>
                    <span className="kc-methodology-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {activeChips.length > 0 && (
            <div className="kc-active-chips-bar" role="region" aria-label="Active filters">
              <span className="kc-active-chips-label">Active filters ({activeChips.length}):</span>
              <div className="kc-chips-wrapper">
                {activeChips.map(chip => (
                  <span key={chip.id} className="kc-active-chip">
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      className="kc-chip-remove"
                      onClick={chip.onRemove}
                      aria-label={`Remove filter: ${chip.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="kc-reset-filters-btn"
                  onClick={clearAllFilters}
                  aria-label="Reset all filters"
                >
                  Reset all
                </button>
              </div>
            </div>
          )}

          {/* Category Quick Filter Grid */}
          <div className="kc-categories-grid" role="region" aria-label="Research disciplines">
            <button
              type="button"
              className={`kc-category-chip ${selectedCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <SiteIcon name="award" size={14} />
              <span>All Disciplines ({RESEARCH_PAPERS.length})</span>
            </button>
            {RESEARCH_CATEGORIES.map(cat => {
              const count = RESEARCH_PAPERS.filter(p => p.category === cat.slug).length
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`kc-category-chip ${selectedCategory === cat.slug ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory(cat.slug)}
                >
                  <SiteIcon name={cat.icon} size={14} />
                  <span>{cat.name} ({count})</span>
                </button>
              )
            })}
          </div>

          {/* Featured Preprint Card */}
          {featuredPaper && !searchQuery && selectedCategory === 'all' && selectedSport === 'all' && selectedMethodology === 'all' && (
            <article className="kc-featured-card" aria-labelledby="featured-paper-title">
              <div className="kc-eyebrow-row" style={{ marginBottom: '8px' }}>
                <span className="kc-badge-featured">Featured Research Preprint</span>
                <span className="kc-badge-open-access">Pre-Moderated</span>
                {featuredPaper.doi && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0369a1', fontWeight: 600 }}>
                    doi:{featuredPaper.doi}
                  </span>
                )}
              </div>

              <div className="kc-paper-top-meta" style={{ marginBottom: '10px' }}>
                <span className="kc-paper-id-tag">{featuredPaper.paperId}</span>
                <span className="kc-paper-ver-tag">{featuredPaper.version}</span>
                {featuredPaper.sport && (
                  <span className="kc-paper-sport-tag">
                    {featuredPaper.sport}
                  </span>
                )}
                <span className="kc-paper-category-tag">{featuredPaper.categoryName}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                  Diamond Open Access
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
                      {paper.doi && (
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0369a1', fontWeight: 600 }}>
                          doi:{paper.doi}
                        </span>
                      )}
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

                    {/* Open science badges preview */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {paper.openScienceBadges?.openData && (
                        <span className="kc-chip-badge-sm">🟢 Open Data</span>
                      )}
                      {paper.openScienceBadges?.openCode && (
                        <span className="kc-chip-badge-sm">💻 Open Code</span>
                      )}
                      {paper.openScienceBadges?.preregistered && (
                        <span className="kc-chip-badge-sm">📝 Preregistered</span>
                      )}
                      {paper.peerReviewStatus && (
                        <span className="kc-chip-badge-sm" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {paper.peerReviewStatus.status === 'published_vor' ? '📖 Published in Journal' : '⏱️ Under Review'}
                        </span>
                      )}
                    </div>

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
                        <span>View Preprint &amp; Galley</span>
                        <SiteIcon name="chevron-right" size={13} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* TAB 2: ABOUT SPORTRXIV / KHELCHRONICLE */}
      {activeTab === 'about' && (
        <section className="kc-info-panel" aria-labelledby="about-heading">
          <h2 id="about-heading" className="kc-info-title">About KhelChronicle &amp; SportRxiv India</h2>
          <p className="kc-info-lead">
            KhelChronicle operates as the dedicated open-access preprint archive for movement, exercise, kinesiology, sports biomechanics, and human athletic performance in India, following the international principles established by <strong>STORK (Society for Transparency, Openness, and Replication in Kinesiology)</strong> and <strong>SportRxiv</strong>.
          </p>

          <div className="kc-info-grid">
            <div className="kc-info-card">
              <div className="kc-info-icon-box">
                <SiteIcon name="award" size={20} />
              </div>
              <h3>Diamond Open Access</h3>
              <p>
                KhelChronicle is 100% free to submit and 100% free to read. There are zero Article Processing Charges (APCs) or subscription paywalls. Authors retain copyright under a Creative Commons Attribution 4.0 license (CC BY 4.0).
              </p>
            </div>

            <div className="kc-info-card">
              <div className="kc-info-icon-box">
                <SiteIcon name="check" size={20} />
              </div>
              <h3>STORK Open Science Alignment</h3>
              <p>
                We promote methodological transparency, data sharing, code reproducibility, and study preregistration across Indian sports research institutes (SAI, LNIPE, AIIMS, NIS Patiala) and grassroots universities.
              </p>
            </div>

            <div className="kc-info-card">
              <div className="kc-info-icon-box">
                <SiteIcon name="file-text" size={20} />
              </div>
              <h3>Permanent Crossref DOIs</h3>
              <p>
                Every accepted preprint is assigned a persistent Digital Object Identifier (DOI) and structured JSON-LD scholarly metadata, ensuring indexing across Google Scholar, Crossref, and international research libraries.
              </p>
            </div>

            <div className="kc-info-card">
              <div className="kc-info-icon-box">
                <SiteIcon name="users" size={20} />
              </div>
              <h3>Bridging Science &amp; Grassroots Coaching</h3>
              <p>
                Beyond academic articles, KhelChronicle mandates practical coaching cues in English and Hindi, empowering physical educators and district academy coaches to translate empirical findings directly to the field.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: EDITORIAL & MODERATION POLICY */}
      {activeTab === 'moderation' && (
        <section className="kc-info-panel" aria-labelledby="moderation-heading">
          <h2 id="moderation-heading" className="kc-info-title">Editorial &amp; Pre-Moderation Policy</h2>
          <p className="kc-info-lead">
            Following the SportRxiv operational model, all submissions undergo a rapid pre-moderation screening check (completed within 3 to 5 business days) before being posted publicly to the repository.
          </p>

          <div className="kc-policy-box">
            <h3>What Our Editorial Moderators Verify:</h3>
            <ul className="kc-policy-list">
              <li>
                <strong>Scientific Scope:</strong> The manuscript must address sports science, biomechanics, exercise physiology, kinesiology, sports medicine, sports psychology, or athletic development. Non-scholarly opinion essays, marketing whitepapers, and commercial sales claims are declined.
              </li>
              <li>
                <strong>Author Legitimacy:</strong> All listed authors must be identifiable researchers, coaches, or clinicians with institutional, academy, or university affiliations and valid ORCID iDs.
              </li>
              <li>
                <strong>Academic Integrity &amp; Plagiarism:</strong> Submissions are screened against known databases to ensure originality and protect against duplicate publications or academic misconduct.
              </li>
              <li>
                <strong>Participant Ethics &amp; Minor Assent:</strong> Studies with human participants must cite Institutional Ethics Committee (IEC) clearance. Studies involving junior or minor athletes must declare parental consent and participant assent.
              </li>
              <li>
                <strong>Assistive Generative AI Transparency:</strong> Use of generative AI tools for coding or copyediting must be explicitly disclosed in the methods section. AI tools cannot be listed as an author.
              </li>
            </ul>
          </div>

          <div className="kc-notice-box" style={{ marginTop: '20px' }}>
            <strong>Important Clarification: What Moderation Is NOT</strong>
            <p style={{ margin: '4px 0 0' }}>
              Pre-moderation is a scope, safety, and legitimacy screen. It is <strong>not</strong> formal journal peer review. Moderators do not validate statistical models or verify scientific conclusions. Readers and practitioners must interpret preprints as preliminary scientific communications.
            </p>
          </div>
        </section>
      )}

      {/* TAB 4: AUTHOR SUBMISSION GUIDELINES */}
      {activeTab === 'guidelines' && (
        <section className="kc-info-panel" aria-labelledby="guidelines-heading">
          <h2 id="guidelines-heading" className="kc-info-title">Author Guidelines &amp; Submission Walkthrough</h2>
          <p className="kc-info-lead">
            Sharing your findings on KhelChronicle establishes priority of discovery, invites early collegial feedback, and broadens dissemination to sports practitioners across India and globally.
          </p>

          <div className="kc-steps-flow">
            <div className="kc-step-card">
              <span className="kc-step-number">1</span>
              <h4>Submission Checklist &amp; Ethics</h4>
              <p>Confirm the study is original work in sports/movement science, has ethical clearance, and meets the CC BY 4.0 Diamond Open Access agreement.</p>
            </div>

            <div className="kc-step-card">
              <span className="kc-step-number">2</span>
              <h4>Upload Galley File</h4>
              <p>Upload your primary manuscript in PDF format. Authors are encouraged to attach supplementary telemetry datasets (CSV/XLSX) or analysis code.</p>
            </div>

            <div className="kc-step-card">
              <span className="kc-step-number">3</span>
              <h4>Metadata &amp; Structured Abstract</h4>
              <p>Provide title, subject category, sport focus, keywords, and a structured abstract (Background, Methods, Results, Conclusion), plus coaching takeaways.</p>
            </div>

            <div className="kc-step-card">
              <span className="kc-step-number">4</span>
              <h4>Authors &amp; ORCID iDs</h4>
              <p>List all contributing authors with institutional affiliation, contact email, and verified ORCID identifiers.</p>
            </div>

            <div className="kc-step-card">
              <span className="kc-step-number">5</span>
              <h4>Open Science Badges &amp; Review</h4>
              <p>Provide repository links for Open Data (Zenodo/OSF), Open Code (GitHub), or Preregistration. Submit for 3-5 day editorial screening.</p>
            </div>
          </div>

          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <a
              href="/khelchronicle/submit"
              className="kc-btn-primary"
              style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '15px' }}
              onClick={e => handleLink(e, '/khelchronicle/submit')}
            >
              <SiteIcon name="upload" size={16} />
              <span>Launch Submission Wizard</span>
            </a>
          </div>
        </section>
      )}

      {/* TAB 5: FREQUENTLY ASKED QUESTIONS */}
      {activeTab === 'faq' && (
        <section className="kc-info-panel" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="kc-info-title">Frequently Asked Questions</h2>
          <div className="kc-faq-list">
            <div className="kc-faq-item">
              <h4>What is a preprint?</h4>
              <p>
                A preprint is a complete scientific manuscript that is deposited in an open repository prior to, or in parallel with, formal journal peer review. It enables researchers to share findings immediately rather than waiting months for traditional journal publishing cycles.
              </p>
            </div>

            <div className="kc-faq-item">
              <h4>Can I still submit my manuscript to a traditional peer-reviewed journal?</h4>
              <p>
                Yes. Almost all major sports science and medical journals (including British Journal of Sports Medicine, Journal of Sports Sciences, Medicine &amp; Science in Sports &amp; Exercise, Elsevier, Springer-Nature) explicitly allow and encourage preprint deposition prior to submission.
              </p>
            </div>

            <div className="kc-faq-item">
              <h4>How do I cite a KhelChronicle preprint?</h4>
              <p>
                Preprints are formally citable using their persistent Crossref DOI. For example: <em>Rathore, V., &amp; Sen, A. (2026). Kinematic Correlates of Lumbar Spine Stress... KhelChronicle Open Sports Research Archive, KG-2026-001. https://doi.org/10.51224/khelchronicle.2026.001</em>.
              </p>
            </div>

            <div className="kc-faq-item">
              <h4>Are there any fees or submission costs?</h4>
              <p>
                No. KhelChronicle operates on the Diamond Open Access model. There are never any submission fees, article processing charges (APCs), or reader paywalls.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Submission CTA Banner at bottom */}
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
              <span>Submit Your Manuscript (Free Open Access)</span>
              <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default KhelChronicleHome
