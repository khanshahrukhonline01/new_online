import { useEffect, useRef, useState, useMemo } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'
import {
  rankGlobalSearchItems,
  type GlobalSearchEntityCategory,
  type GlobalSearchEntityItem,
  type GlobalSearchFilterTab,
} from '../services/adminGlobalSearchService'

export interface CommandPaletteAction {
  id: string
  title: string
  section: string
  shortcut?: string
  icon: SiteIconName
  badge?: string
  onSelect: () => void
}

export interface AdminCommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  actions: CommandPaletteAction[]
  searchItems?: GlobalSearchEntityItem[]
  onSelectEntity?: (item: GlobalSearchEntityItem) => void
  isLoadingEntities?: boolean
}

type FlattenedPaletteEntry =
  | {
      kind: 'entity'
      key: string
      groupKey: string
      groupLabel: string
      entity: GlobalSearchEntityItem
    }
  | {
      kind: 'command'
      key: string
      groupKey: string
      groupLabel: string
      action: CommandPaletteAction
    }

const CATEGORY_GROUP_LABELS: Record<GlobalSearchEntityCategory, string> = {
  user: 'Users & Accounts',
  venue: 'Venues & Organisations',
  listing: 'Listings & Verifications',
  incident: 'Trust & Safety Incidents',
}

const FILTER_TABS: Array<{ id: GlobalSearchFilterTab; label: string; icon: SiteIconName }> = [
  { id: 'all', label: 'All', icon: 'search' },
  { id: 'user', label: 'Users', icon: 'user' },
  { id: 'listing', label: 'Listings', icon: 'file-text' },
  { id: 'venue', label: 'Venues', icon: 'venues' },
  { id: 'incident', label: 'Incidents', icon: 'flag' },
  { id: 'command', label: 'Commands', icon: 'settings' },
]

export function AdminCommandPalette({
  isOpen,
  onClose,
  actions,
  searchItems = [],
  onSelectEntity,
  isLoadingEntities = false,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<GlobalSearchFilterTab>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const trimmedQuery = query.trim()

  const filteredCommands = useMemo(() => {
    const q = trimmedQuery.toLowerCase()
    if (!q) return actions
    return actions.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        (a.badge && a.badge.toLowerCase().includes(q)),
    )
  }, [actions, trimmedQuery])

  const rankedEntities = useMemo(() => {
    if (activeTab === 'command') return []
    const limit = activeTab === 'all' ? (trimmedQuery ? 16 : 12) : 20
    return rankGlobalSearchItems(searchItems, trimmedQuery, activeTab, limit)
  }, [searchItems, trimmedQuery, activeTab])

  // Compute live counts for each category tab based on the current query
  const tabCounts = useMemo<Record<GlobalSearchFilterTab, number>>(() => {
    if (!trimmedQuery) {
      const counts: Record<GlobalSearchFilterTab, number> = {
        all: searchItems.length + actions.length,
        user: 0,
        listing: 0,
        venue: 0,
        incident: 0,
        command: actions.length,
      }
      for (const item of searchItems) {
        counts[item.category] += 1
      }
      return counts
    }

    const userMatches = rankGlobalSearchItems(searchItems, trimmedQuery, 'user', 200).length
    const listingMatches = rankGlobalSearchItems(searchItems, trimmedQuery, 'listing', 200).length
    const venueMatches = rankGlobalSearchItems(searchItems, trimmedQuery, 'venue', 200).length
    const incidentMatches = rankGlobalSearchItems(searchItems, trimmedQuery, 'incident', 200).length
    const commandMatches = filteredCommands.length

    return {
      all: userMatches + listingMatches + venueMatches + incidentMatches + commandMatches,
      user: userMatches,
      listing: listingMatches,
      venue: venueMatches,
      incident: incidentMatches,
      command: commandMatches,
    }
  }, [searchItems, actions.length, filteredCommands.length, trimmedQuery])

  // Flatten into ordered sections for unified keyboard navigation
  const flatEntries = useMemo<FlattenedPaletteEntry[]>(() => {
    const result: FlattenedPaletteEntry[] = []

    if (activeTab === 'all' && trimmedQuery) {
      // Preserve exact relevance order when searching across all categories
      if (rankedEntities.length > 0) {
        for (const entity of rankedEntities) {
          result.push({
            kind: 'entity',
            key: entity.id,
            groupKey: 'top-matches',
            groupLabel: 'Matching Records',
            entity,
          })
        }
      }
      for (const action of filteredCommands.slice(0, 6)) {
        result.push({
          kind: 'command',
          key: action.id,
          groupKey: 'commands',
          groupLabel: 'Admin Commands & Desks',
          action,
        })
      }
      return result
    }

    if (activeTab !== 'command') {
      const categoryOrder: GlobalSearchEntityCategory[] = ['user', 'venue', 'listing', 'incident']
      for (const cat of categoryOrder) {
        const catItems = rankedEntities.filter(item => item.category === cat)
        for (const entity of catItems) {
          result.push({
            kind: 'entity',
            key: entity.id,
            groupKey: cat,
            groupLabel: CATEGORY_GROUP_LABELS[cat],
            entity,
          })
        }
      }
    }

    if (activeTab === 'command' || activeTab === 'all') {
      const cmdSlice = activeTab === 'command' ? filteredCommands : filteredCommands.slice(0, 8)
      for (const action of cmdSlice) {
        result.push({
          kind: 'command',
          key: action.id,
          groupKey: 'commands',
          groupLabel: 'Admin Commands & Desks',
          action,
        })
      }
    }

    return result
  }, [activeTab, trimmedQuery, rankedEntities, filteredCommands])

  // Group flattened entries for clean section headers while keeping flat indices
  const groupedSections = useMemo(() => {
    const groups: Array<{
      groupKey: string
      groupLabel: string
      entries: Array<{ entry: FlattenedPaletteEntry; flatIndex: number }>
    }> = []

    flatEntries.forEach((entry, flatIndex) => {
      const last = groups[groups.length - 1]
      if (last && last.groupKey === entry.groupKey) {
        last.entries.push({ entry, flatIndex })
      } else {
        groups.push({
          groupKey: entry.groupKey,
          groupLabel: entry.groupLabel,
          entries: [{ entry, flatIndex }],
        })
      }
    })

    return groups
  }, [flatEntries])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveTab('all')
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 25)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeTab])

  useEffect(() => {
    if (!isOpen) return
    const activeEl = optionRefs.current[selectedIndex]
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          window.dispatchEvent(new CustomEvent('khelgrid-admin-open-palette'))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activateEntry = (entry: FlattenedPaletteEntry) => {
    if (entry.kind === 'entity') {
      onSelectEntity?.(entry.entity)
      onClose()
    } else {
      entry.action.onSelect()
      onClose()
    }
  }

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flatEntries.length === 0) return
      setSelectedIndex(prev => (prev + 1 < flatEntries.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flatEntries.length === 0) return
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : flatEntries.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatEntries[selectedIndex]
      if (item) {
        activateEntry(item)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="admin-command-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Global Admin Search and Command Palette"
      data-testid="admin-global-search-modal"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="admin-command-panel">
        <div className="admin-command-input-row">
          <SiteIcon name="search" size={18} className="admin-command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="admin-command-input"
            placeholder="Search users, listings, venues, incidents by name or ID, or type a command…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            aria-label="Global search for users, listings, venues, IDs, or commands"
            data-testid="admin-global-search-input"
          />
          {query && (
            <button
              type="button"
              className="admin-command-clear-btn"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search query"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="admin-command-esc-badge"
            onClick={onClose}
            aria-label="Close global search modal"
          >
            ESC
          </button>
        </div>

        <div
          className="admin-command-tabs"
          role="tablist"
          aria-label="Filter global search by category"
        >
          {FILTER_TABS.map(tab => {
            const isSelected = activeTab === tab.id
            const count = tabCounts[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`admin-command-tab ${isSelected ? 'is-active' : ''}`}
                data-testid={`global-search-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  inputRef.current?.focus()
                }}
              >
                <SiteIcon name={tab.icon} size={13} />
                <span>{tab.label}</span>
                <span className="admin-command-tab-count tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="admin-command-list" role="listbox" aria-label="Search results">
          {isLoadingEntities && searchItems.length === 0 ? (
            <div className="admin-command-no-results">
              <SiteIcon name="refresh" size={20} className="spinning" />
              <span>Indexing users, venues, listings, and incidents…</span>
            </div>
          ) : groupedSections.length === 0 ? (
            <div className="admin-command-no-results" data-testid="global-search-empty">
              <SiteIcon name="info" size={22} />
              <span>
                No matching users, listings, venues, or commands for &ldquo;{query}&rdquo;
              </span>
              <small>
                Try an ID like <code>USR-OWNER-001</code>, <code>ORG-CHN-TURF-09</code>,{' '}
                <code>KG-VENUE-2901</code>, or <code>TS-2026-081</code>
              </small>
            </div>
          ) : (
            groupedSections.map(group => (
              <div key={group.groupKey} className="admin-command-group">
                <div className="admin-command-group-header">
                  <span>{group.groupLabel}</span>
                  <span className="admin-command-group-count tabular-nums">
                    {group.entries.length}
                  </span>
                </div>

                {group.entries.map(({ entry, flatIndex }) => {
                  const isSelected = flatIndex === selectedIndex

                  if (entry.kind === 'entity') {
                    const { entity } = entry
                    return (
                      <button
                        key={entry.key}
                        ref={el => {
                          optionRefs.current[flatIndex] = el
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`admin-command-item admin-command-entity-item ${isSelected ? 'is-selected' : ''}`}
                        data-testid={`global-search-item-${entity.entityId}`}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={() => activateEntry(entry)}
                      >
                        <div className="admin-command-item-left">
                          <span
                            className={`admin-command-item-icon is-cat-${entity.category}`}
                            aria-hidden="true"
                          >
                            <SiteIcon name={entity.icon} size={15} />
                          </span>
                          <div className="admin-command-item-copy">
                            <span className="admin-command-title-row">
                              <span className="admin-command-item-title">{entity.title}</span>
                              <code className="admin-command-id-code">{entity.referenceCode}</code>
                            </span>
                            <span className="admin-command-item-section">{entity.subtitle}</span>
                          </div>
                        </div>

                        <div className="admin-command-item-right">
                          {entity.statusLabel && (
                            <span className="admin-command-status-tag">{entity.statusLabel}</span>
                          )}
                          <span className="admin-command-desk-chip">
                            <span aria-hidden="true">→</span> {entity.targetDeskLabel}
                          </span>
                        </div>
                      </button>
                    )
                  }

                  const { action } = entry
                  return (
                    <button
                      key={entry.key}
                      ref={el => {
                        optionRefs.current[flatIndex] = el
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`admin-command-item ${isSelected ? 'is-selected' : ''}`}
                      data-testid={`global-search-cmd-${action.id}`}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      onClick={() => activateEntry(entry)}
                    >
                      <div className="admin-command-item-left">
                        <span className="admin-command-item-icon" aria-hidden="true">
                          <SiteIcon name={action.icon} size={15} />
                        </span>
                        <div className="admin-command-item-copy">
                          <span className="admin-command-item-title">{action.title}</span>
                          <span className="admin-command-item-section">{action.section}</span>
                        </div>
                      </div>

                      <div className="admin-command-item-right">
                        {action.badge && (
                          <span className="admin-command-item-badge">{action.badge}</span>
                        )}
                        {action.shortcut && (
                          <kbd className="admin-command-item-shortcut">{action.shortcut}</kbd>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <footer className="admin-command-footer">
          <div className="admin-command-hints">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> jump to desk
            </span>
            <span>
              <kbd>ESC</kbd> dismiss
            </span>
          </div>
          <span className="admin-command-khelgrid-tag tabular-nums">
            {searchItems.length} indexed records · Global Admin Search
          </span>
        </footer>
      </div>
    </div>
  )
}

