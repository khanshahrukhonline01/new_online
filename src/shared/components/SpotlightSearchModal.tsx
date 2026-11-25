import { useEffect, useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  ALL_SEARCH_CATEGORIES,
  WorkspaceSearch,
  type WorkspaceSearchCategory,
  type WorkspaceSearchDatasets,
} from '../../modules/workspace/WorkspaceSearch'
import type { CanonicalWorkspaceId } from './workspaceHeaderEngine'
import './SpotlightSearchModal.css'

export interface SpotlightSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  initialQuery?: string
  activeHeaderPersona?: CanonicalWorkspaceId
}

export default function SpotlightSearchModal({
  isOpen,
  onClose,
  onNavigate,
  initialQuery = '',
  activeHeaderPersona = 'athlete',
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [unscoped, setUnscoped] = useState(false)
  const [datasets, setDatasets] = useState<WorkspaceSearchDatasets>({})
  const [isLoadingScope, setIsLoadingScope] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  const profile = useMemo(
    () => WorkspaceSearch.getProfile(activeHeaderPersona),
    [activeHeaderPersona],
  )

  const activeSources = useMemo(
    () => WorkspaceSearch.getAllowedSources(activeHeaderPersona, { unscoped }),
    [activeHeaderPersona, unscoped],
  )

  const categoryOptions = useMemo(() => {
    if (unscoped) return ALL_SEARCH_CATEGORIES
    return profile.categoryLabels
  }, [profile.categoryLabels, unscoped])

  // Reset category and scope override when persona changes or modal opens
  useEffect(() => {
    setActiveCategory('all')
    setSelectedIndex(0)
  }, [activeHeaderPersona, unscoped])

  // Auto-focus when opening & support Escape from any control inside dialog
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    setSelectedIndex(0)

    const onWindowKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [isOpen, onClose])

  // Sync initial query
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  // Query ONLY the data sources permitted for activeHeaderPersona via WorkspaceSearch
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoadingScope(true)

    WorkspaceSearch.loadScopeDatasets(activeHeaderPersona, { unscoped })
      .then(({ datasets: nextDatasets }) => {
        if (!active) return
        setDatasets(nextDatasets)
      })
      .finally(() => {
        if (active) setIsLoadingScope(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, activeHeaderPersona, unscoped])

  // Scoped Search Results via centralized WorkspaceSearch utility
  const searchResult = useMemo(
    () =>
      WorkspaceSearch.searchSync({
        persona: activeHeaderPersona,
        query,
        datasets,
        category: activeCategory as WorkspaceSearchCategory | 'all',
        limit: 30,
        unscoped,
      }),
    [activeHeaderPersona, query, datasets, activeCategory, unscoped],
  )

  const filteredResults = searchResult.items

  const fullSearchHref = useMemo(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (!unscoped) params.set('persona', activeHeaderPersona)
    return `/search?${params.toString()}`
  }, [query, unscoped, activeHeaderPersona])

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
        executeNavigate(fullSearchHref)
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

  const formattedSources = activeSources
    .filter(src => src !== 'workspace')
    .slice(0, 5)
    .map(src => src.charAt(0).toUpperCase() + src.slice(1))
    .join(' · ')

  return (
    <div className="spotlight-overlay" role="presentation">
      <div className="spotlight-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="spotlight-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search KhelGrid catalogue"
        data-workspace-persona={activeHeaderPersona}
        data-workspace-scoped={unscoped ? 'false' : 'true'}
      >
        {/* Top Search Bar Input */}
        <div className="spotlight-input-bar">
          <SiteIcon name="search" size={20} className="spotlight-search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="spotlight-input"
            placeholder={unscoped ? 'Search all KhelGrid data sources…' : profile.placeholder}
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

        {/* Workspace Scope Strip */}
        <div className="spotlight-scope-bar" aria-label="Active workspace search scope">
          <div className="spotlight-scope-meta">
            <span className="spotlight-scope-badge">
              <span className="spotlight-scope-dot" aria-hidden="true" />
              {unscoped ? 'All KhelGrid Sources' : profile.scopeLabel}
            </span>
            <span className="spotlight-scope-sources">
              {unscoped ? 'All modules & catalogues' : `Sources: ${formattedSources}`}
            </span>
          </div>
          <button
            type="button"
            className="spotlight-scope-toggle"
            onClick={() => setUnscoped(prev => !prev)}
          >
            {unscoped ? `Scope to ${profile.label}` : 'Search all'}
          </button>
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
            {categoryOptions.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`spotlight-cat-pill ${activeCategory === cat.id ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        )}

        {/* Results Container */}
        <div ref={resultsContainerRef} className="spotlight-results-container">
          {!query.trim() ? (
            <div className="spotlight-suggestions">
              <p className="spotlight-section-heading">
                {activeHeaderPersona === 'athlete' && !unscoped
                  ? 'POPULAR & TRENDING DISCOVERY'
                  : `${profile.label.toUpperCase()} WORKSPACE QUICK SEARCH`}
              </p>
              <div className="spotlight-chips-grid">
                {profile.quickChips.map(chip => (
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
              <h3>
                {isLoadingScope
                  ? `Searching ${profile.label.toLowerCase()} workspace sources…`
                  : `No exact match found for “${query.trim()}”`}
              </h3>
              <p>
                {unscoped
                  ? 'Search across the full database catalogue or adjust your search keywords.'
                  : `Currently scoped to ${profile.label} sources (${formattedSources}). Adjust keywords or broaden your scope.`}
              </p>
              <div className="spotlight-empty-actions">
                {!unscoped && (
                  <button
                    type="button"
                    className="spotlight-secondary-scope-btn"
                    onClick={() => setUnscoped(true)}
                  >
                    Search all KhelGrid instead
                  </button>
                )}
                <button
                  type="button"
                  className="spotlight-full-search-btn"
                  onClick={() => executeNavigate(fullSearchHref)}
                >
                  <span>Search full catalogue for “{query.trim()}”</span>
                  <SiteIcon name="arrow-up-right" size={14} />
                </button>
              </div>
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
              onClick={() => executeNavigate(fullSearchHref)}
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
