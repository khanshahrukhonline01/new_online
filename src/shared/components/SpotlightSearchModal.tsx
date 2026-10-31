import { useEffect, useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  getAcademies,
  getCities,
  getOpportunities,
  getPickupGames,
  getSports,
  getVenues,
} from '../../integrations/supabase/public-client'
import type { Academy, Opportunity, Sport, Venue } from '../../shared/domain'
import type { DatabaseCity, DatabasePickupGame } from '../../integrations/supabase/public-client'
import { RESEARCH_PAPERS } from '../../modules/khelchronicle/data/khelchronicleData'
import { ALL_INDIAN_CITIES } from '../components/citiesData'
import { VERIFIED_SPORTS } from '../sitemapGenerator'
import './SpotlightSearchModal.css'

export interface SpotlightSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  initialQuery?: string
}

interface SearchItem {
  id: string
  title: string
  subtitle: string
  category: 'sport' | 'trial' | 'venue' | 'city' | 'academy' | 'game' | 'paper'
  categoryLabel: string
  href: string
  badge?: string
  icon: string
}

const POPULAR_SEARCH_CHIPS = [
  { label: '⚽ Football Trials', query: 'Football' },
  { label: '🏸 Badminton Turfs', query: 'Badminton' },
  { label: '🏏 Cricket Academies', query: 'Cricket' },
  { label: '📍 Delhi Hub', query: 'Delhi' },
  { label: '📍 Bengaluru Hub', query: 'Bengaluru' },
  { label: '⚡ Pickleball Games', query: 'Pickleball' },
  { label: '📋 Sports CV Wizard', href: '/sports-cv' },
  { label: '📊 Live Match Center', href: '/live' },
]

export default function SpotlightSearchModal({
  isOpen,
  onClose,
  onNavigate,
  initialQuery = '',
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Catalogues
  const [sports, setSports] = useState<Sport[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [pickupGames, setPickupGames] = useState<DatabasePickupGame[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [cities, setCities] = useState<DatabaseCity[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-focus and ESC listener
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Sync initial query
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  // Fetch catalogues in background
  useEffect(() => {
    let active = true

    Promise.all([
      getSports(),
      getOpportunities(),
      getVenues(),
      getPickupGames(),
      getAcademies(),
      getCities(),
    ]).then(([sRes, oRes, vRes, pRes, aRes, cRes]) => {
      if (!active) return

      if (sRes.status === 'ready') setSports(sRes.data)
      if (oRes.status === 'ready') setOpportunities(oRes.data)
      if (vRes.status === 'ready') setVenues(vRes.data)
      if (pRes.status === 'ready') setPickupGames(pRes.data)
      if (aRes.status === 'ready') setAcademies(aRes.data)
      if (cRes.status === 'ready') setCities(cRes.data)
    })

    return () => {
      active = false
    }
  }, [])

  // Multi-entity search index
  const allSearchItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = []

    // 1. Sports
    const sportList = sports.length > 0 ? sports : VERIFIED_SPORTS.map(s => ({
      id: s,
      slug: s,
      name: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '),
    }))

    sportList.forEach(s => {
      items.push({
        id: `sport-${s.slug}`,
        title: s.name,
        subtitle: 'Olympic & Competitive Sport Directory',
        category: 'sport',
        categoryLabel: 'Sport',
        href: `/sports/${s.slug}`,
        icon: 'sports',
      })
    })

    // 2. Selection Trials
    opportunities.forEach(opp => {
      items.push({
        id: `trial-${opp.id}`,
        title: opp.title,
        subtitle: `${opp.opportunity_type || 'Trial'} · ${opp.city || 'Pan-India'}`,
        category: 'trial',
        categoryLabel: 'Trial',
        href: `/opportunities/${opp.slug}`,
        badge: opp.is_featured ? 'Featured' : undefined,
        icon: 'trophy',
      })
    })

    // 3. Venues & Turfs
    venues.forEach(v => {
      items.push({
        id: `venue-${v.id}`,
        title: v.name,
        subtitle: `${v.city}${v.address ? ` · ${v.address}` : ''}`,
        category: 'venue',
        categoryLabel: 'Venue',
        href: `/venues/${v.slug}`,
        badge: v.government_facility ? 'Govt Facility' : undefined,
        icon: 'calendar-check',
      })
    })

    // 4. City Hubs
    const cityList = cities.length > 0 ? cities : ALL_INDIAN_CITIES.map(c => ({
      slug: c.slug,
      name: c.name,
      state: c.state,
      zone: c.zone,
      is_metro: c.isMetro,
      venues: c.venues,
    }))

    cityList.forEach(c => {
      items.push({
        id: `city-${c.slug}`,
        title: `${c.name} Sports Hub`,
        subtitle: `${c.state} · ${c.is_metro ? 'Premier Metro Hub' : 'Regional Sports City'}`,
        category: 'city',
        categoryLabel: 'City Hub',
        href: `/cities/${c.slug}`,
        badge: c.is_metro ? 'Metro' : undefined,
        icon: 'map-pin',
      })
    })

    // 5. Academies
    academies.forEach(acad => {
      items.push({
        id: `academy-${acad.id}`,
        title: acad.name,
        subtitle: `${acad.city}${acad.state ? `, ${acad.state}` : ''}`,
        category: 'academy',
        categoryLabel: 'Academy',
        href: `/academies?q=${encodeURIComponent(acad.name)}`,
        icon: 'building',
      })
    })

    // 6. Pickup Matches
    pickupGames.forEach(g => {
      items.push({
        id: `pickup-${g.id}`,
        title: `${g.emoji || '⚽'} ${g.sport} in ${g.city}`,
        subtitle: `${g.venue_name} · ${g.time_label} (${g.spots_open} spots)`,
        category: 'game',
        categoryLabel: 'Pickup Match',
        href: '/play',
        icon: 'activity',
      })
    })

    // 7. KhelChronicle Research Preprints
    RESEARCH_PAPERS.forEach(paper => {
      items.push({
        id: `paper-${paper.id}`,
        title: paper.title,
        subtitle: `${paper.authors.join(', ')} · ${paper.category}`,
        category: 'paper',
        categoryLabel: 'Research',
        href: `/khelchronicle/${paper.slug}`,
        icon: 'book-open',
      })
    })

    return items
  }, [sports, opportunities, venues, cities, academies, pickupGames])

  // Filtered Results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    return allSearchItems.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory
      const matchText =
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      return matchCat && matchText
    }).slice(0, 30)
  }, [allSearchItems, query, activeCategory])

  // Keyboard navigation inside modal
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredResults.length > 0 && selectedIndex < filteredResults.length) {
        const item = filteredResults[selectedIndex]
        executeNavigate(item.href)
      } else if (query.trim()) {
        executeNavigate(`/search?q=${encodeURIComponent(query.trim())}`)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  function executeNavigate(target: string) {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem('khelgrid_recent_searches')
        const list = stored ? JSON.parse(stored) : []
        if (query.trim() && !list.includes(query.trim())) {
          window.sessionStorage.setItem(
            'khelgrid_recent_searches',
            JSON.stringify([query.trim(), ...list].slice(0, 6)),
          )
        }
      } catch {
        // Fallback
      }
    }

    if (onNavigate) {
      // Fake event
      const fakeEvent = {
        preventDefault: () => {},
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 0,
      } as unknown as MouseEvent<HTMLAnchorElement>
      onNavigate(fakeEvent, target)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="spotlight-overlay" role="presentation">
      <div className="spotlight-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="spotlight-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search KhelGrid catalogue"
      >
        {/* Top Search Bar Input */}
        <div className="spotlight-input-bar">
          <SiteIcon name="search" size={20} className="spotlight-search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="spotlight-input"
            placeholder="Search sports, trials, turfs, cities, academies, preprints…"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search KhelGrid catalogue"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              type="button"
              className="spotlight-clear-btn"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search query"
            >
              <SiteIcon name="close" size={16} />
            </button>
          ) : (
            <kbd className="spotlight-esc-pill" onClick={onClose}>ESC</kbd>
          )}
        </div>

        {/* Category Filters (when typing) */}
        {query.trim().length > 0 && (
          <nav className="spotlight-category-bar" aria-label="Filter search results by category">
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'sport' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('sport')}
            >
              Sports
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'trial' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('trial')}
            >
              Trials
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'venue' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('venue')}
            >
              Venues
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'city' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('city')}
            >
              Cities
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'academy' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('academy')}
            >
              Academies
            </button>
            <button
              type="button"
              className={`spotlight-cat-pill ${activeCategory === 'paper' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('paper')}
            >
              Research
            </button>
          </nav>
        )}

        {/* Results Container */}
        <div ref={resultsContainerRef} className="spotlight-results-container">
          {!query.trim() ? (
            <div className="spotlight-suggestions">
              <p className="spotlight-section-heading">POPULAR &amp; TRENDING DISCOVERY</p>
              <div className="spotlight-chips-grid">
                {POPULAR_SEARCH_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    className="spotlight-chip"
                    onClick={() => {
                      if (chip.href) {
                        executeNavigate(chip.href)
                      } else if (chip.query) {
                        setQuery(chip.query)
                        inputRef.current?.focus()
                      }
                    }}
                  >
                    <span>{chip.label}</span>
                    <SiteIcon name="arrow-up-right" size={12} />
                  </button>
                ))}
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="spotlight-empty-state">
              <SiteIcon name="search" size={28} />
              <h3>No exact match found for “{query.trim()}”</h3>
              <p>Search across the full database catalogue or adjust your search keywords.</p>
              <button
                type="button"
                className="spotlight-full-search-btn"
                onClick={() => executeNavigate(`/search?q=${encodeURIComponent(query.trim())}`)}
              >
                <span>Search full catalogue for “{query.trim()}”</span>
                <SiteIcon name="arrow-up-right" size={14} />
              </button>
            </div>
          ) : (
            <ul className="spotlight-results-list" role="listbox">
              {filteredResults.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`spotlight-result-item ${isSelected ? 'is-selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <a
                      href={item.href}
                      className="spotlight-result-link"
                      onClick={e => {
                        e.preventDefault()
                        executeNavigate(item.href)
                      }}
                    >
                      <div className={`spotlight-result-icon cat-${item.category}`}>
                        <SiteIcon name={item.icon as unknown as 'search'} size={16} />
                      </div>
                      <div className="spotlight-result-details">
                        <div className="spotlight-result-header">
                          <span className="spotlight-result-title">{item.title}</span>
                          {item.badge && (
                            <span className="spotlight-result-badge">{item.badge}</span>
                          )}
                        </div>
                        <span className="spotlight-result-subtitle">{item.subtitle}</span>
                      </div>
                      <span className="spotlight-cat-tag">{item.categoryLabel}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <footer className="spotlight-footer">
          <div className="spotlight-footer-keys">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>

          {query.trim() && (
            <button
              type="button"
              className="spotlight-footer-view-all"
              onClick={() => executeNavigate(`/search?q=${encodeURIComponent(query.trim())}`)}
            >
              <span>Full catalogue search</span>
              <SiteIcon name="chevron-right" size={12} />
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
