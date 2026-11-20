import { useEffect, useRef, useState, useMemo } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'

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
}

export function AdminCommandPalette({ isOpen, onClose, actions }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        (a.badge && a.badge.toLowerCase().includes(q))
    )
  }, [actions, query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 25)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

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

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1 < filtered.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) {
        item.onSelect()
        onClose()
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
      aria-label="Executive Command Palette"
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
            placeholder="Type a command or search desks, tools, queues… (ESC to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            aria-label="Search administrative commands and views"
          />
          <kbd className="admin-command-esc-badge" onClick={onClose}>ESC</kbd>
        </div>

        <div className="admin-command-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="admin-command-no-results">
              <SiteIcon name="info" size={24} />
              <span>No admin actions or queues matching &ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                role="option"
                aria-selected={idx === selectedIndex}
                className={`admin-command-item ${idx === selectedIndex ? 'is-selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  item.onSelect()
                  onClose()
                }}
              >
                <div className="admin-command-item-left">
                  <span className="admin-command-item-icon">
                    <SiteIcon name={item.icon} size={16} />
                  </span>
                  <div>
                    <span className="admin-command-item-title">{item.title}</span>
                    <span className="admin-command-item-section">{item.section}</span>
                  </div>
                </div>

                <div className="admin-command-item-right">
                  {item.badge && <span className="admin-command-item-badge">{item.badge}</span>}
                  {item.shortcut && <kbd className="admin-command-item-shortcut">{item.shortcut}</kbd>}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="admin-command-footer">
          <div className="admin-command-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>ESC</kbd> dismiss</span>
          </div>
          <span className="admin-command-khelgrid-tag">KhelGrid Admin Operations v0.2.0</span>
        </footer>
      </div>
    </div>
  )
}
