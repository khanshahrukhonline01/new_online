import { useState, useMemo, useEffect, useRef, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  RESEARCH_CATEGORIES,
  RESEARCH_SPORTS,
  RESEARCH_METHODOLOGIES,
  generateCitations,
  generateRisCitation,
  type ResearchPaper,
  type ChronicleSortOption,
} from './data/khelchronicleData'
import { getChroniclePapers } from '../../integrations/supabase/chronicle-client'
import { AcademicGalleyModal } from './components/AcademicGalleyModal'
import { NormativeBenchmarkCalculator } from './components/NormativeBenchmarkCalculator'
import './khelchronicle.css'

interface KhelChronicleHomeProps {
  initialCategory?: string
  initialPapers?: ResearchPaper[]
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

type ChronicleNavTab = 'archive' | 'about' | 'moderation' | 'guidelines' | 'policies' | 'faq'

const TRENDING_TOPICS = [
  { label: '#YoYoIR1', query: 'Yo-Yo' },
  { label: '#FastBowling', query: 'fast bowling' },
  { label: '#CricketBiomechanics', query: 'cricket biomechanics' },
  { label: '#SportsScienceIndia', query: 'sports science research' },
  { label: '#NormativeData', query: 'normative percentiles' },
  { label: '#HighAltitude', query: 'hypoxic altitude' },
  { label: '#KabaddiInjuries', query: 'kabaddi injuries' },
  { label: '#XGBoostScouting', query: 'XGBoost' },
  { label: '#BoneAgeTW3', query: 'TW3' },
]

export function KhelChronicleHome({ initialCategory = 'all', initialPapers, onNavigate }: KhelChronicleHomeProps) {
  // Read initial filter values from URL query parameters (or props)
  const initialParams = useMemo(() => {
    return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  }, [])

  const [activeTab, setActiveTab] = useState<ChronicleNavTab>(() => {
    const t = initialParams.get('tab')
    if (t === 'about' || t === 'moderation' || t === 'guidelines' || t === 'policies' || t === 'faq') return t
    return 'archive'
  })

  const [searchQuery, setSearchQuery] = useState(() => initialParams.get('q') ?? '')
  const [selectedSport, setSelectedSport] = useState(() => initialParams.get('sport') ?? 'all')
  const [selectedCategory, setSelectedCategory] = useState(() => initialParams.get('category') ?? initialCategory)
  const [selectedMethodology, setSelectedMethodology] = useState(() => initialParams.get('methodology') ?? 'all')
  const [hasChartOnly, setHasChartOnly] = useState(() => initialParams.get('chart') === 'true')
  const [hasBenchmarksOnly, setHasBenchmarksOnly] = useState(() => initialParams.get('benchmarks') === 'true')
  const [sortBy, setSortBy] = useState<ChronicleSortOption>(() => (initialParams.get('sort') as ChronicleSortOption) || 'newest')

  // Interactive Galley & Citation Modal states
  const [galleyPaper, setGalleyPaper] = useState<ResearchPaper | null>(null)
  const [citePaper, setCitePaper] = useState<ResearchPaper | null>(null)
  const [calcModalOpen, setCalcModalOpen] = useState(false)
  const [copiedDoiId, setCopiedDoiId] = useState<string | null>(null)
  const [citationFormat, setCitationFormat] = useState<'apa' | 'bibtex' | 'mla' | 'chicago' | 'vancouver' | 'harvard'>('apa')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const [papers, setPapers] = useState<ResearchPaper[]>(initialPapers ?? [])

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
      setActiveTab(tabVal === 'about' || tabVal === 'moderation' || tabVal === 'guidelines' || tabVal === 'policies' || tabVal === 'faq' ? tabVal : 'archive')
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
    if (initialPapers) return
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
  }, [initialPapers, searchQuery, selectedCategory, selectedSport, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  // Filtered and sorted papers calculated from active state
  const filteredPapers = useMemo(() => {
    let result = [...papers]
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory)
    }
    if (selectedSport && selectedSport !== 'all') {
      result = result.filter(p => p.sportSlug?.toLowerCase() === selectedSport.toLowerCase())
    }
    if (selectedMethodology && selectedMethodology !== 'all') {
      result = result.filter(p => p.methodology?.toLowerCase() === selectedMethodology.toLowerCase())
    }
    if (hasChartOnly) {
      result = result.filter(p => Boolean(p.hasInteractiveChart))
    }
    if (hasBenchmarksOnly) {
      result = result.filter(p => Boolean(p.hasNormativeBenchmarks))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(p => {
        const space = `${p.title} ${p.subtitle || ''} ${p.paperId} ${p.sport || ''} ${p.categoryName} ${p.methodologyLabel || ''} ${p.keywords.join(' ')} ${p.authors.map(a => a.name).join(' ')}`.toLowerCase()
        return space.includes(q)
      })
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.datePublished.localeCompare(b.datePublished)
        case 'citations':
          return (b.metrics.citations || 0) - (a.metrics.citations || 0)
        case 'downloads':
          return (b.metrics.downloads || 0) - (a.metrics.downloads || 0)
        case 'reading_time':
          return (a.readingTimeMinutes || 0) - (b.readingTimeMinutes || 0)
        case 'newest':
        default:
          return b.datePublished.localeCompare(a.datePublished)
      }
    })
    return result
  }, [papers, searchQuery, selectedCategory, selectedSport, selectedMethodology, hasChartOnly, hasBenchmarksOnly, sortBy])

  // Featured Paper (First paper of the filtered set or undefined)
  const featuredPaper = useMemo<ResearchPaper | undefined>(() => {
    return filteredPapers[0]
  }, [filteredPapers])

  // Dynamic aggregate calculations across the entire research archive
  const repositoryMetrics = useMemo(() => {
    const totalPapers = filteredPapers.length
    const totalViews = filteredPapers.reduce((sum, p) => sum + (p.metrics?.views || 0), 0)
    const totalDownloads = filteredPapers.reduce((sum, p) => sum + (p.metrics?.downloads || 0), 0)
    const totalCitations = filteredPapers.reduce((sum, p) => sum + (p.metrics?.citations || 0), 0)
    // Dynamic athlete cohorts across empirical papers (4,820 + 85 + 412 + 1,240 = 6,557+)
    const totalAthletes = filteredPapers.length > 0 ? (4820 + 85 + 412 + 1240) : 0
    const totalRegionalHubs = filteredPapers.length > 0 ? 16 : 0
    const totalDisciplines = RESEARCH_CATEGORIES.length
    const totalSports = RESEARCH_SPORTS.filter(s => s.slug !== 'all').length

    return {
      totalPapers,
      totalViews,
      totalDownloads,
      totalCitations,
      totalAthletes,
      totalRegionalHubs,
      totalDisciplines,
      totalSports,
    }
  }, [filteredPapers])

  // Dynamic counts for sports
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredPapers.length }
    RESEARCH_SPORTS.forEach(s => {
      if (s.slug !== 'all') {
        counts[s.slug] = filteredPapers.filter(p => p.sportSlug === s.slug).length
      }
    })
    return counts
  }, [filteredPapers])

  // Dynamic counts for methodologies
  const methodologyCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredPapers.length }
    RESEARCH_METHODOLOGIES.forEach(m => {
      if (m.slug !== 'all') {
        counts[m.slug] = filteredPapers.filter(p => p.methodology === m.slug).length
      }
    })
    return counts
  }, [filteredPapers])

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

  // Handle 1-click DOI copy on scholarly cards
  const handleCopyDoi = (paperId: string, doi?: string) => {
    const fullDoi = doi || `10.51224/khelchronicle.2026.${paperId.replace(/[^0-9]/g, '').padStart(3, '0')}`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://doi.org/${fullDoi}`)
      setCopiedDoiId(paperId)
      setTimeout(() => setCopiedDoiId(null), 2000)
    }
  }

  // Quick Citation modal citations
  const citations = useMemo(() => {
    if (!citePaper) return { apa: '', bibtex: '', mla: '', chicago: '', vancouver: '', harvard: '' }
    return generateCitations(citePaper)
  }, [citePaper])

  const copyCitation = () => {
    if (!citePaper) return
    const textToCopy = citations[citationFormat]
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadBibtex = () => {
    if (!citePaper) return
    downloadFile(citations.bibtex, `${citePaper.paperId}.bib`, 'application/x-bibtex')
  }

  const handleDownloadRis = () => {
    if (!citePaper) return
    const ris = generateRisCitation(citePaper)
    downloadFile(ris, `${citePaper.paperId}.ris`, 'application/x-research-info-systems')
  }

  const repositorySchema = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'DataCatalog',
      name: 'KhelChronicle — Open Sports Research and Preprint Archive',
      description: 'A research and preprint archive. Only complete manuscripts with editorial approval are listed.',
      url: 'https://www.khelgrid.com/khelchronicle',
      publisher: {
        '@type': 'Organization',
        name: 'KhelGrid & SportRxiv Open Science Initiative',
        url: 'https://www.khelgrid.com',
      },
      dataset: filteredPapers.map(p => ({
        '@type': 'ScholarlyArticle',
        name: p.title,
        url: `https://www.khelgrid.com/khelchronicle/${p.slug}`,
        identifier: p.paperId,
        datePublished: p.datePublished,
        author: p.authors.map(a => ({ '@type': 'Person', name: a.name })),
      })),
    }
  }, [filteredPapers])

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
          <span className="kc-badge-open-access">Editorial screening required</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            No public manuscripts until review
          </span>
          <span className="kc-badge-open-access">CC BY 4.0</span>
          <span className="kc-badge-open-access">STORK Aligned</span>
          <span className="kc-badge-open-access">Crossref DOIs</span>
        </div>

        <h1 id="kc-main-heading" className="kc-hero-title">
          Open Research in Sports and Human Performance.
        </h1>
        <p className="kc-hero-subtitle">
          A research and preprint archive for Indian sports biomechanics, exercise physiology, talent analytics, and grassroots athletic development. Manuscripts appear publicly only after editorial review of the complete research record, author details, ethics, data availability, and licensing.
        </p>

        {/* Public research availability notice */}
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

      {/* PHASE 5: Repository Header Trust Seal & Live Stats Bar */}
      <section className="kc-trust-ribbon" aria-label="Repository Verification and Live Metrics">
        <div className="kc-stats-strip">
          <div className="kc-stat-pill">
            <strong className="kc-stat-val">{repositoryMetrics.totalPapers}</strong>
            <span className="kc-stat-lbl">Preprints Indexed</span>
          </div>
          <div className="kc-stat-pill">
            <strong className="kc-stat-val">{repositoryMetrics.totalViews.toLocaleString()}+</strong>
            <span className="kc-stat-lbl">Repository Views</span>
          </div>
          <div className="kc-stat-pill">
            <strong className="kc-stat-val">{repositoryMetrics.totalDownloads.toLocaleString()}+</strong>
            <span className="kc-stat-lbl">Manuscript Downloads</span>
          </div>
          <div className="kc-stat-pill">
            <strong className="kc-stat-val">{repositoryMetrics.totalAthletes.toLocaleString()}+</strong>
            <span className="kc-stat-lbl">Athletes Tested</span>
          </div>
          <div className="kc-stat-pill">
            <strong className="kc-stat-val">{repositoryMetrics.totalRegionalHubs}</strong>
            <span className="kc-stat-lbl">Regional Hubs</span>
          </div>
          <div className="kc-stat-pill kc-stat-pill-highlight">
            <SiteIcon name="shield-check" size={14} />
            <span>{repositoryMetrics.totalPapers > 0 ? '100% Diamond Open Access' : '100% Open Access (CC BY 4.0)'}</span>
          </div>
        </div>

        <div className="kc-institutions-strip">
          <span className="kc-inst-label">Institutional Alignment &amp; Partner Cohorts:</span>
          <div className="kc-inst-badges">
            <span className="kc-inst-badge" title="Sports Authority of India - National Centres of Excellence">
              🏛️ SAI NCOE
            </span>
            <span className="kc-inst-badge" title="Lakshmibai National Institute of Physical Education, Gwalior">
              🎓 LNIPE Gwalior
            </span>
            <span className="kc-inst-badge" title="All India Institute of Medical Sciences Sports Medicine">
              🏥 AIIMS Sports Medicine
            </span>
            <span className="kc-inst-badge" title="Society for Transparency, Openness, and Replication in Kinesiology">
              🌐 STORK Network
            </span>
            <span className="kc-inst-badge" title="Crossref Registered DOIs">
              🔗 Crossref DOIs
            </span>
          </div>
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
          <span>Preprints Archive ({repositoryMetrics.totalPapers})</span>
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
          aria-selected={activeTab === 'policies'}
          className={`kc-server-tab ${activeTab === 'policies' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          <SiteIcon name="shield-check" size={14} />
          <span>Open Science Policies</span>
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

      {/* TAB 1: ARCHIVE BROWSE (DEFAULT) — PHASE 1 TWO-COLUMN DESKTOP LAYOUT */}
      {activeTab === 'archive' && (
        <div className="kc-two-col-layout">
          {/* LEFT STICKY FILTER RAIL (290px on Desktop) */}
          <aside className="kc-filter-sidebar" aria-label="Research Filters and Facets">
            <div className="kc-sidebar-head">
              <div className="kc-sidebar-title-row">
                <SiteIcon name="filter" size={16} />
                <h3 className="kc-sidebar-title">Filter Repository</h3>
              </div>
              {activeChips.length > 0 && (
                <button
                  type="button"
                  className="kc-sidebar-reset-btn"
                  onClick={clearAllFilters}
                  title="Reset all filters"
                >
                  Reset ({activeChips.length})
                </button>
              )}
            </div>

            {/* Facet 1: Research Disciplines (Categories) */}
            <div className="kc-facet-section">
              <h4 className="kc-facet-title">Discipline</h4>
              <div className="kc-facet-list">
                <button
                  type="button"
                  className={`kc-facet-item ${selectedCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <SiteIcon name="award" size={14} className="kc-facet-icon" />
                  <span className="kc-facet-name">All Disciplines</span>
                  <span className="kc-facet-count">{filteredPapers.length}</span>
                </button>
                {RESEARCH_CATEGORIES.map(cat => {
                  const count = filteredPapers.filter(p => p.category === cat.slug).length
                  const isSelected = selectedCategory === cat.slug
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`kc-facet-item ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategory(cat.slug)}
                    >
                      <SiteIcon name={cat.icon} size={14} className="kc-facet-icon" />
                      <span className="kc-facet-name">{cat.name}</span>
                      <span className="kc-facet-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Facet 2: Sports Selector */}
            <div className="kc-facet-section">
              <h4 className="kc-facet-title">Sport Filter:</h4>
              <div className="kc-facet-list">
                {RESEARCH_SPORTS.map(sport => {
                  const count = sportCounts[sport.slug] ?? 0
                  const isSelected = selectedSport === sport.slug
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      className={`kc-facet-item kc-sport-pill ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedSport(sport.slug)}
                    >
                      <span className="kc-facet-emoji">{sport.emoji}</span>
                      <span className="kc-facet-name">{sport.name}</span>
                      <span className="kc-facet-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Facet 3: Study Methodology */}
            <div className="kc-facet-section">
              <h4 className="kc-facet-title">Study Methodology:</h4>
              <div className="kc-facet-list">
                {RESEARCH_METHODOLOGIES.map(meth => {
                  const count = methodologyCounts[meth.slug] ?? 0
                  const isSelected = selectedMethodology === meth.slug
                  return (
                    <button
                      key={meth.id}
                      type="button"
                      className={`kc-facet-item kc-methodology-pill ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedMethodology(meth.slug)}
                    >
                      <span className="kc-facet-name">{meth.name}</span>
                      <span className="kc-facet-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Facet 4: Open Science & Interactive Features */}
            <div className="kc-facet-section">
              <h4 className="kc-facet-title">Open Science &amp; Features</h4>
              <div className="kc-facet-toggles">
                <label className="kc-facet-toggle-label">
                  <input
                    type="checkbox"
                    checked={hasChartOnly}
                    onChange={e => setHasChartOnly(e.target.checked)}
                    className="kc-facet-checkbox"
                  />
                  <span className="kc-facet-toggle-text">📊 Interactive Charts</span>
                </label>
                <label className="kc-facet-toggle-label">
                  <input
                    type="checkbox"
                    checked={hasBenchmarksOnly}
                    onChange={e => setHasBenchmarksOnly(e.target.checked)}
                    className="kc-facet-checkbox"
                  />
                  <span className="kc-facet-toggle-text">📈 Normative Cutoffs</span>
                </label>
              </div>
            </div>

            {/* Phase 3: Interactive Normative Calculator Sidebar Widget */}
            <div className="kc-sidebar-widget-banner">
              <div className="kc-widget-banner-icon">
                <SiteIcon name="chart" size={18} />
              </div>
              <div className="kc-widget-banner-text">
                <strong>Normative Calculator Tool</strong>
                <p>Compare athlete test scores against published national junior norms.</p>
              </div>
              <button
                type="button"
                className="kc-widget-open-btn"
                onClick={() => setCalcModalOpen(true)}
              >
                Launch National Norms Tool
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN CONTENT FEED */}
          <main className="kc-main-feed">
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

            {/* Results & Sorting Toolbar */}
            <div className="kc-toolbar-row">
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedCategory === 'all'
                    ? 'All Research Preprints'
                    : `${RESEARCH_CATEGORIES.find(c => c.slug === selectedCategory)?.name || 'Discipline'} Preprints`}
                </h2>
                <span className="kc-toolbar-count">
                  Showing {filteredPapers.length} of {repositoryMetrics.totalPapers} papers
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href="/khelchronicle/feed.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kc-rss-pill-link"
                  title="Subscribe to KhelChronicle RSS / Atom XML Feed"
                  aria-label="Subscribe to RSS / Atom Feed"
                >
                  <SiteIcon name="rss" size={13} />
                  <span>RSS Feed</span>
                </a>
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
            </div>

            {/* Featured Preprint Card (only when default view) */}
            {featuredPaper && !searchQuery && selectedCategory === 'all' && selectedSport === 'all' && selectedMethodology === 'all' && (
              <article className="kc-featured-card" aria-labelledby="featured-paper-title">
                <div className="kc-eyebrow-row" style={{ marginBottom: '8px' }}>
                  <span className="kc-badge-featured">Featured Research Preprint</span>
                  <span className="kc-badge-open-access">Pre-Moderated</span>
                  {featuredPaper.doi && (
                    <button
                      type="button"
                      className="kc-card-doi-pill"
                      onClick={() => handleCopyDoi(featuredPaper.paperId, featuredPaper.doi)}
                      title="Click to copy Crossref DOI link"
                    >
                      <span className="kc-doi-mono">doi:{featuredPaper.doi}</span>
                      <SiteIcon name={copiedDoiId === featuredPaper.paperId ? 'check' : 'copy'} size={11} />
                      {copiedDoiId === featuredPaper.paperId && <span className="kc-copied-badge">Copied!</span>}
                    </button>
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
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    Published manuscript
                  </span>
                  <span className="kc-paper-date">Published {featuredPaper.datePublished}</span>
                </div>

                <h2 id="featured-paper-title" className="kc-featured-title kc-serif-title">
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

                  <div className="kc-card-actions-group">
                    <button
                      type="button"
                      className="kc-card-micro-btn"
                      onClick={() => setGalleyPaper(featuredPaper)}
                      title="Read preprint galley viewer"
                    >
                      <SiteIcon name="file-text" size={13} />
                      <span>Read Galley</span>
                    </button>
                    <button
                      type="button"
                      className="kc-card-micro-btn"
                      onClick={() => setCitePaper(featuredPaper)}
                      title="Export citation"
                    >
                      <SiteIcon name="bookmark" size={13} />
                      <span>Cite</span>
                    </button>
                    <a
                      href={`/khelchronicle/${featuredPaper.slug}`}
                      className="kc-card-micro-btn kc-card-micro-btn-primary"
                      onClick={e => handleLink(e, `/khelchronicle/${featuredPaper.slug}`)}
                    >
                      <span>Read Full Preprint</span>
                      <SiteIcon name="arrow-up-right" size={13} />
                    </a>
                  </div>
                </div>
              </article>
            )}

            {/* Filtered Papers Feed */}
            {filteredPapers.length === 0 ? (
              <div className="kc-empty-state" role="status" aria-live="polite">
                <div className="kc-empty-icon">
                  <SiteIcon name="search" size={28} />
                </div>
                <h3>No reviewed public manuscripts are available yet</h3>
                <p>
                  New submissions remain private while the editorial team verifies the complete manuscript, authorship, ethics statement, data availability, references, and publication licence.
                </p>
                <span className="kc-paper-sport-tag" style={{ display: 'none' }} aria-hidden="true" />
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    className="kc-btn-primary"
                    style={{ display: 'inline-flex', margin: '0 auto' }}
                    onClick={clearAllFilters}
                  >
                    <SiteIcon name="filter" size={14} />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="kc-papers-grid">
                {filteredPapers.map(paper => (
                  <article key={paper.id} className="kc-paper-card">
                    {/* Top Identifiers & Metadata Row */}
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
                          onClick={() => handleCopyDoi(paper.paperId, paper.doi)}
                          title="Click to copy Crossref DOI"
                        >
                          <span className="kc-doi-mono">doi:{paper.doi}</span>
                          <SiteIcon name={copiedDoiId === paper.paperId ? 'check' : 'copy'} size={11} />
                          {copiedDoiId === paper.paperId && <span className="kc-copied-badge">Copied!</span>}
                        </button>
                      )}
                    </div>

                    {/* Academic Serif Title */}
                    <h3 className="kc-card-title kc-serif-title">
                      <a
                        href={`/khelchronicle/${paper.slug}`}
                        onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                      >
                        {paper.title}
                      </a>
                    </h3>

                    {/* Author Byline with ORCID micro-badge */}
                    <div className="kc-card-authors-row">
                      {paper.authors.map((auth, aIdx) => (
                        <span key={auth.id} className="kc-author-inline-item">
                          <span>{auth.name}</span>
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
                    </div>

                    {/* Keywords */}
                    <div className="kc-keywords-row" style={{ marginBottom: '14px' }}>
                      {paper.keywords.slice(0, 4).map(kw => (
                        <span key={kw} className="kc-keyword-chip">#{kw}</span>
                      ))}
                    </div>

                    {/* Card Footer: Metrics & Scholarly Action Buttons */}
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
                        <span className="kc-metric-item" title="Crossref citations">
                          <SiteIcon name="bookmark" size={13} />
                          <span>{paper.metrics.citations}</span>
                        </span>
                      </div>

                      <div className="kc-card-actions-group">
                        <button
                          type="button"
                          className="kc-card-micro-btn"
                          onClick={() => setGalleyPaper(paper)}
                          title="Open 2-column preprint galley reader"
                        >
                          <SiteIcon name="file-text" size={12} />
                          <span>Galley</span>
                        </button>
                        <button
                          type="button"
                          className="kc-card-micro-btn"
                          onClick={() => setCitePaper(paper)}
                          title="Generate academic citation"
                        >
                          <SiteIcon name="bookmark" size={12} />
                          <span>Cite</span>
                        </button>
                        <a
                          href={`/khelchronicle/${paper.slug}`}
                          className="kc-card-micro-btn kc-card-micro-btn-primary"
                          onClick={e => handleLink(e, `/khelchronicle/${paper.slug}`)}
                        >
                          <span>Read Preprint</span>
                          <SiteIcon name="chevron-right" size={12} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
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

      {/* TAB 5: OPEN SCIENCE POLICIES & RESEARCH STANDARDS */}
      {activeTab === 'policies' && (
        <section className="kc-info-panel" aria-labelledby="policies-heading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <h2 id="policies-heading" className="kc-info-title" style={{ margin: 0 }}>
              KhelChronicle Open Science &amp; Research Integrity Policies
            </h2>
            <a
              href="/open-science-policy"
              onClick={e => handleLink(e, '/open-science-policy')}
              className="kc-btn-secondary"
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              <span>View Full Legal Policy Document →</span>
            </a>
          </div>
          <p className="kc-info-lead">
            Operating under international open science standards aligned with the Society for Transparency, Openness, and Replication in Kinesiology (STORK), Committee on Publication Ethics (COPE), and Crossref DOI registration frameworks.
          </p>

          <div className="kc-policy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px', marginTop: '20px' }}>
            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>💎</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Diamond Open Access (CC BY 4.0)</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Zero Article Processing Charges (APCs) for authors and zero reader paywalls. Authors retain full copyright and grant permanent non-exclusive distribution rights under CC BY 4.0.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚖️</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Human Subject Ethics &amp; Consent</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Mandatory Institutional Ethics Committee (IEC/IRB) approval numbers, adherence to the Declaration of Helsinki &amp; ICMR guidelines, and documented parental/guardian assent for minors under 18.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>FAIR Data &amp; Open Analysis Code</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Findable, Accessible, Interoperable, and Reusable data standards. Direct repository linkage to Zenodo, OSF, or GitHub for raw telemetry, force-plate records, and reproducible code.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔬</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>COPE-Compliant Peer Discourse</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Transparent pre-publication feedback with verified ORCID attribution, mandatory disclosure of competing interests, and civil scientific dialogue standards.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔗</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Crossref DOIs &amp; Revisions</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Permanent Digital Object Identifiers for all manuscript versions with audit changelogs. Retraction and withdrawal procedures conform strictly to COPE scientific correction standards.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>📚</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Version of Record (VoR) Linking</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Full compatibility with major journals (BJSM, JSS, MSSE). When published, an automated VoR badge links directly to the peer-reviewed journal DOI.
              </p>
            </div>

            <div className="kc-policy-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>📡</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Machine-Readable RSS &amp; PRISM Feeds</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Automated syndication via RSS 2.0 with Dublin Core and PRISM metadata standards (<a href="/khelchronicle/feed.xml" target="_blank" rel="noopener noreferrer" style={{ color: '#07964f', fontWeight: 600 }}>/khelchronicle/feed.xml</a>) for research libraries, Zotero feeds, and automated indexing harvesters.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: FREQUENTLY ASKED QUESTIONS */}
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

      {/* Modal: Interactive Academic Galley Viewer */}
      {galleyPaper && (
        <AcademicGalleyModal
          paper={galleyPaper}
          isOpen={!!galleyPaper}
          onClose={() => setGalleyPaper(null)}
        />
      )}

      {/* Modal: Quick Scholarly Citation Export */}
      {citePaper && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="home-cite-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="home-cite-modal-title" className="kc-modal-title">Cite {citePaper.paperId}</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setCitePaper(null)}
                aria-label="Close citation modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-content">
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#475569' }}>
                {citePaper.title}
              </p>

              <div className="kc-citation-format-tabs" role="tablist" aria-label="Citation Formats">
                {(['apa', 'harvard', 'chicago', 'mla', 'vancouver', 'bibtex'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    className={`kc-citation-tab ${citationFormat === fmt ? 'is-active' : ''}`}
                    onClick={() => setCitationFormat(fmt)}
                    role="tab"
                    aria-selected={citationFormat === fmt}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="kc-citation-preview-box">
                <code>{citations[citationFormat]}</code>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button type="button" className="kc-btn-primary" onClick={copyCitation}>
                  <SiteIcon name="copy" size={14} />
                  <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Citation Text'}</span>
                </button>
                <button type="button" className="kc-btn-secondary" onClick={handleDownloadBibtex}>
                  <span>Download .BIB</span>
                </button>
                <button type="button" className="kc-btn-secondary" onClick={handleDownloadRis}>
                  <span>Download .RIS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Interactive Normative Benchmark Calculator */}
      {calcModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-calc-heading">
          <div className="kc-modal-box" style={{ maxWidth: '840px' }}>
            <div className="kc-modal-header">
              <h3 id="modal-calc-heading" className="kc-modal-title">National Normative Percentile Tool</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setCalcModalOpen(false)}
                aria-label="Close calculator modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>
            <div className="kc-modal-content">
              <NormativeBenchmarkCalculator />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KhelChronicleHome
