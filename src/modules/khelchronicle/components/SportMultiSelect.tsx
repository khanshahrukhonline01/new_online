import { useEffect, useRef, useState } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  SPORTS_GAME_OPTIONS,
  filterSportGameOptions,
  toggleSportSelection,
} from '../submitManuscriptUtils'

interface SportMultiSelectProps {
  id?: string
  selectedIds: string[]
  customSport: string
  onChange: (nextIds: string[]) => void
}

export function SportMultiSelect({
  id = 'sport-multiselect-trigger',
  selectedIds,
  customSport,
  onChange,
}: SportMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = filterSportGameOptions(searchQuery)

  useEffect(() => {
    if (!isOpen) return
    searchInputRef.current?.focus()

    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const resolveChipLabel = (sportId: string): string => {
    if (sportId === 'other') {
      return customSport.trim() ? `Other: ${customSport.trim()}` : 'Other / Traditional Game'
    }
    return SPORTS_GAME_OPTIONS.find(opt => opt.id === sportId)?.name || sportId
  }

  return (
    <div className="kc-multiselect" ref={containerRef}>
      {selectedIds.length > 0 && (
        <div className="kc-multiselect-chips" aria-label="Selected sports and games">
          {selectedIds.map(sportId => {
            const label = resolveChipLabel(sportId)
            return (
              <span key={sportId} className="kc-multiselect-chip">
                <span>{label}</span>
                <button
                  type="button"
                  className="kc-multiselect-chip-remove"
                  aria-label={`Remove ${label}`}
                  onClick={() => onChange(selectedIds.filter(item => item !== sportId))}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <button
        id={id}
        type="button"
        className={`kc-multiselect-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className={`kc-multiselect-trigger-text ${selectedIds.length === 0 ? 'is-placeholder' : ''}`}>
          {selectedIds.length === 0
            ? 'Search & select sports or games (e.g. Cricket, Football, Kabaddi, Pickleball)...'
            : `${selectedIds.length} sport${selectedIds.length === 1 ? '' : 's'} / game${selectedIds.length === 1 ? '' : 's'} selected · Search to add or remove`}
        </span>
        <svg
          className={`kc-multiselect-chevron ${isOpen ? 'is-rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="kc-multiselect-popover">
          <div className="kc-multiselect-search-row">
            <SiteIcon name="search" size={14} className="kc-multiselect-search-icon" />
            <input
              ref={searchInputRef}
              type="search"
              className="kc-multiselect-search"
              aria-label="Search sports and games"
              placeholder="Search Cricket, Football, Kabaddi, Pickleball..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="kc-multiselect-listbox"
            role="listbox"
            aria-multiselectable="true"
            aria-label="Sports and games options"
          >
            {filteredOptions.length === 0 ? (
              <div className="kc-multiselect-empty">
                <p>No sports match &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  className="kc-quickfill-btn"
                  onClick={() => {
                    if (!selectedIds.includes('other')) {
                      onChange([...selectedIds, 'other'])
                    }
                    setSearchQuery('')
                    setIsOpen(false)
                  }}
                >
                  + Select Other / Traditional Game
                </button>
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedIds.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`kc-multiselect-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onChange(toggleSportSelection(selectedIds, opt.id))}
                  >
                    <span className="kc-multiselect-check" aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="kc-multiselect-opt-name">{opt.name}</span>
                    <span className="kc-multiselect-opt-group">{opt.group}</span>
                  </button>
                )
              })
            )}
          </div>

          <div className="kc-multiselect-footer">
            <span className="kc-multiselect-count">{selectedIds.length} selected</span>
            <div className="kc-multiselect-footer-actions">
              <button
                type="button"
                className="kc-quickfill-btn"
                disabled={selectedIds.length === 0}
                onClick={() => onChange([])}
              >
                Clear all
              </button>
              <button
                type="button"
                className="kc-multiselect-done-btn"
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
