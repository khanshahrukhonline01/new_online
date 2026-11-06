import { useEffect, useMemo, useRef, useState } from 'react'
import { SiteIcon, type SiteIconName } from './SiteIcon'
import './CatalogueFilterPanel.css'

export type CatalogueFilterField = {
  key: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  inputType?: 'date' | 'select'
  onChange: (value: string) => void
}

export type QuickFilterPill = {
  id: string
  label: string
  icon?: SiteIconName
  active: boolean
  onClick: () => void
}

export type CatalogueFilterPanelProps = {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  fields: CatalogueFilterField[]
  onClear: () => void
  sort?: string
  onSort?: (value: string) => void
  defaultSort?: string
  sortKey?: string
  resultCount?: number
  totalCount?: number
  title?: string
  quickFilters?: QuickFilterPill[]
}

function formatChipValue(field: CatalogueFilterField): string {
  if (field.inputType === 'date' && field.value) {
    const parts = field.value.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
      }
    }
    return field.value
  }
  return field.options.find(option => option.value === field.value)?.label ?? field.value
}

export function CatalogueQuickFilters({ items }: { items: QuickFilterPill[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="kg-quick-filter-rail" aria-label="Quick filters">
      {items.map(pill => (
        <button
          key={pill.id}
          type="button"
          className={pill.active ? 'kg-quick-pill is-active' : 'kg-quick-pill'}
          onClick={pill.onClick}
          aria-pressed={pill.active}
        >
          {pill.icon && <SiteIcon name={pill.icon} size={13} />}
          <span>{pill.label}</span>
        </button>
      ))}
    </div>
  )
}

export function CatalogueActiveChips({
  search,
  onSearch,
  fields,
  onClear,
}: {
  search: string
  onSearch: (value: string) => void
  fields: CatalogueFilterField[]
  onClear: () => void
}) {
  const active = fields.filter(field => Boolean(field.value))
  const activeCount = (search.trim() ? 1 : 0) + active.length
  if (activeCount === 0) return null

  return (
    <div className="kg-active-filters-bar" aria-label="Active filters">
      <div className="kg-active-chips-wrap">
        <span className="kg-active-chips-label">Active filters ({activeCount}):</span>
        {search.trim() && (
          <button
            type="button"
            className="kg-active-chip"
            onClick={() => onSearch('')}
            aria-label={`Remove search filter ${search.trim()}`}
          >
            Search: “{search.trim()}” <span aria-hidden="true">×</span>
          </button>
        )}
        {active.map(field => (
          <button
            type="button"
            className="kg-active-chip"
            key={field.key}
            onClick={() => field.onChange('')}
            aria-label={`Remove filter: ${field.label}`}
          >
            {field.label}: {formatChipValue(field)} <span aria-hidden="true">×</span>
          </button>
        ))}
        <button type="button" className="kg-clear-text-btn" onClick={onClear}>
          Reset all
        </button>
      </div>
    </div>
  )
}

export function CatalogueFilterPanel({
  search,
  onSearch,
  searchPlaceholder = 'Search catalogue…',
  fields,
  onClear,
  sort,
  onSort,
  defaultSort = '',
  sortKey = 'sort',
  resultCount,
  totalCount,
  title = 'Filters',
  quickFilters,
}: CatalogueFilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isPopStateRef = useRef(false)
  const active = useMemo(() => fields.filter(field => Boolean(field.value)), [fields])
  const activeCount = (search.trim() ? 1 : 0) + active.length

  // Lock background body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (mobileOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [mobileOpen])

  // Sync React state -> URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }
    const params = new URLSearchParams(window.location.search)

    if (search.trim()) {
      params.set('q', search.trim())
    } else {
      params.delete('q')
    }

    fields.forEach(field => {
      if (field.value) {
        params.set(field.key, field.value)
      } else {
        params.delete(field.key)
      }
    })

    if (sort !== undefined && sort !== null) {
      if (sort && sort !== defaultSort) {
        params.set(sortKey, sort)
      } else {
        params.delete(sortKey)
      }
    }

    const queryString = params.toString()
    const nextUrl = window.location.pathname + (queryString ? '?' + queryString : '') + window.location.hash
    const currentUrl = window.location.pathname + window.location.search + window.location.hash
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, '', nextUrl)
    }
  }, [search, fields, sort, defaultSort, sortKey])

  // Listen to browser Back / Forward (popstate) to restore filter state
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      isPopStateRef.current = true
      const params = new URLSearchParams(window.location.search)

      const nextSearch = params.get('q') ?? ''
      if (nextSearch !== search) {
        onSearch(nextSearch)
      }

      fields.forEach(field => {
        const nextVal = params.get(field.key) ?? ''
        if (nextVal !== field.value) {
          field.onChange(nextVal)
        }
      })

      if (sort !== undefined && onSort) {
        const nextSort = params.get(sortKey) ?? (defaultSort || '')
        if (nextSort !== sort) {
          onSort(nextSort)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [search, fields, sort, onSort, sortKey, defaultSort, onSearch])

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen || typeof window === 'undefined') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const clear = () => {
    onClear()
    setMobileOpen(false)
  }

  return (
    <aside className="kg-filter-rail" aria-label="Catalogue filters">
      <div className="kg-filter-heading">
        <h2>{title}</h2>
        {activeCount > 0 && (
          <button type="button" onClick={clear} aria-label="Reset all filters">
            Reset all
          </button>
        )}
      </div>

      <button
        className="kg-filter-mobile-toggle"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="kg-filter-drawer"
        onClick={() => setMobileOpen(value => !value)}
      >
        <SiteIcon name="sliders" size={17} />
        {mobileOpen ? 'Hide filters' : 'Show filters'}
        {activeCount > 0 && <span aria-label={`${activeCount} active filters`}>{activeCount}</span>}
      </button>

      {mobileOpen && (
        <div
          className="kg-filter-drawer-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="kg-filter-drawer"
        className={mobileOpen ? 'kg-filter-fields is-open' : 'kg-filter-fields'}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label={mobileOpen ? 'Filters drawer' : undefined}
      >
        <div className="kg-filter-drawer-header">
          <div className="kg-filter-drawer-title">
            <h3>Filters</h3>
            {activeCount > 0 && <span className="kg-filter-count-badge">{activeCount} active</span>}
            {resultCount !== undefined && totalCount !== undefined && (
              <span className="kg-filter-count-summary">
                ({resultCount} of {totalCount})
              </span>
            )}
          </div>
          <button
            type="button"
            className="kg-filter-drawer-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          >
            <SiteIcon name="close" size={20} />
          </button>
        </div>

        <div className="kg-filter-scroll-body">
          {quickFilters && quickFilters.length > 0 && (
            <div className="kg-drawer-quick-section">
              <span className="kg-drawer-section-title">Quick Picks</span>
              <CatalogueQuickFilters items={quickFilters} />
            </div>
          )}

          <label className="kg-filter-search">
            Search
            <div className="kg-filter-search-box">
              <span className="kg-filter-search-icon" aria-hidden="true">
                <SiteIcon name="search" size={15} />
              </span>
              <input
                type="search"
                value={search}
                onChange={event => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
              />
              {search.trim() ? (
                <button
                  type="button"
                  className="kg-filter-search-clear"
                  onClick={() => onSearch('')}
                  aria-label="Clear search"
                >
                  <SiteIcon name="close" size={13} />
                </button>
              ) : null}
            </div>
          </label>

          {fields.map(field => (
            <label className="kg-filter-field" key={field.key}>
              {field.label}
              {field.inputType === 'date' ? (
                <input
                  type="date"
                  value={field.value}
                  onChange={event => field.onChange(event.target.value)}
                />
              ) : (
                <div className="kg-filter-select-wrap">
                  <select
                    value={field.value}
                    onChange={event => field.onChange(event.target.value)}
                  >
                    <option value="">All {field.label.toLocaleLowerCase()}</option>
                    {field.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="kg-select-chevron" aria-hidden="true">
                    <SiteIcon name="chevron-down" size={13} />
                  </span>
                </div>
              )}
            </label>
          ))}

          {activeCount > 0 && (
            <div className="kg-active-filters" aria-label="Active filters">
              <div className="kg-active-filters-top">
                <span>Active filters ({activeCount})</span>
                <button type="button" className="kg-clear-text-btn" onClick={clear}>
                  Clear all
                </button>
              </div>
              <div className="kg-active-chips-wrap">
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => onSearch('')}
                    aria-label={`Remove search filter ${search.trim()}`}
                  >
                    Search: “{search.trim()}” <span aria-hidden="true">×</span>
                  </button>
                )}
                {active.map(field => (
                  <button
                    type="button"
                    key={field.key}
                    onClick={() => field.onChange('')}
                    aria-label={`Remove filter: ${field.label}`}
                  >
                    {field.label}: {formatChipValue(field)} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="kg-filter-drawer-footer">
          <button className="kg-filter-clear" type="button" onClick={clear}>
            Clear all filters
          </button>
          <button
            className="kg-filter-apply-btn"
            type="button"
            onClick={() => setMobileOpen(false)}
          >
            {resultCount !== undefined
              ? `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
              : 'Apply filters'}
          </button>
        </div>
      </div>
    </aside>
  )
}

export type CatalogueEmptyStateProps = {
  title?: string
  message?: string
  hasFilters?: boolean
  onClear?: () => void
}

export function CatalogueEmptyState({
  title = 'No matching published records',
  message = 'Try another search or clear your filters. Only records available in the catalogue can appear here.',
  hasFilters = true,
  onClear,
}: CatalogueEmptyStateProps) {
  return (
    <div className="state-panel kg-catalogue-empty-state" role="status">
      <span className="state-symbol" aria-hidden="true">
        <SiteIcon name="search" size={22} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {hasFilters && onClear && (
        <button className="secondary-link kg-empty-reset-btn" type="button" onClick={onClear}>
          <SiteIcon name="refresh" size={14} /> Clear all filters
        </button>
      )}
    </div>
  )
}
