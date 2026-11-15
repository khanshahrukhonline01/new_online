import { useState, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  generateTrialIcsCalendar,
  type SavedItem,
  type SavedItemCategory,
} from './savedData'
import { useSavedItems } from '../../shared/services/savedService'
import './SavedPage.css'

export interface SavedPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export function SavedPage({ onNavigate }: SavedPageProps) {
  const { items, removeSave, clearAll } = useSavedItems()
  const [selectedCategory, setSelectedCategory] = useState<SavedItemCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'deadline' | 'recent' | 'az'>('deadline')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Remove a saved item
  const handleRemoveItem = (id: string, title: string) => {
    removeSave(id)
    showToast(`Removed "${title.slice(0, 32)}..." from saved items`)
  }

  // Clear all saved items
  const handleClearAll = () => {
    clearAll()
    showToast('All saved items cleared from local device')
  }

  // Export trials to .ics calendar file
  const handleExportCalendar = () => {
    const trials = items.filter(i => i.category === 'trial')
    if (trials.length === 0) {
      showToast('No selection trials available to export')
      return
    }

    const icsContent = generateTrialIcsCalendar(trials)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'khelgrid_saved_trials.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast(`Exported ${trials.length} saved trial dates to iCalendar (.ics)`)
  }

  // Generate Google Calendar Web URL for individual trial
  const getGoogleCalendarUrl = (item: SavedItem) => {
    const deadline = item.deadlineDate ? new Date(item.deadlineDate) : new Date(Date.now() + 7 * 86400000)
    const startIso = deadline.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endIso = new Date(deadline.getTime() + 2 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const details = `Sports Selection Trial for ${item.sport} in ${item.city}.\nVerified on KhelGrid.\nOrganizer: ${item.organizerOrAuthor || 'Official Association'}`
    const location = item.location || item.city

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🏅 Trial Deadline: ${item.title}`)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Category filter
        if (selectedCategory === 'trials' && item.category !== 'trial') return false
        if (selectedCategory === 'academies' && item.category !== 'academy') return false
        if (selectedCategory === 'venues' && item.category !== 'venue') return false
        if (selectedCategory === 'coaches' && item.category !== 'coach') return false
        if (selectedCategory === 'pickup' && item.category !== 'pickup') return false
        if (selectedCategory === 'papers' && item.category !== 'paper') return false

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            item.title.toLowerCase().includes(q) ||
            item.sport.toLowerCase().includes(q) ||
            item.city.toLowerCase().includes(q) ||
            (item.location && item.location.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          // Urgent trials first
          if (a.deadlineDate && b.deadlineDate) {
            return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime()
          }
          if (a.deadlineDate) return -1
          if (b.deadlineDate) return 1
          return a.title.localeCompare(b.title)
        }
        if (sortBy === 'recent') {
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        }
        if (sortBy === 'az') {
          return a.title.localeCompare(b.title)
        }
        return 0
      })
  }, [items, selectedCategory, searchQuery, sortBy])

  // Count items by category
  const counts = useMemo(() => {
    return {
      all: items.length,
      trials: items.filter(i => i.category === 'trial').length,
      academies: items.filter(i => i.category === 'academy').length,
      venues: items.filter(i => i.category === 'venue').length,
      coaches: items.filter(i => i.category === 'coach').length,
      pickup: items.filter(i => i.category === 'pickup').length,
      papers: items.filter(i => i.category === 'paper').length,
    }
  }, [items])

  return (
    <div className="saved-page-root">
      {/* Breadcrumb Navigation */}
      <nav className="saved-breadcrumb" aria-label="Breadcrumb">
        <a href="/" onClick={e => handleLinkClick(e, '/')}>
          Home
        </a>
        <span>/</span>
        <a href="/your-space" onClick={e => handleLinkClick(e, '/dashboard')}>
          Your Space
        </a>
        <span>/</span>
        <span>Saved Items &amp; Deadline Planner</span>
      </nav>

      {/* Hero Header */}
      <header className="saved-hero">
        <span className="saved-hero-eyebrow">
          <SiteIcon name="bookmark" size={13} />
          <span>Local Device Bookmarks · 100% Private</span>
        </span>

        <h1 className="saved-hero-title">Saved Items &amp; Deadline Planner</h1>
        <p className="saved-hero-subtitle">
          Keep track of selection trials, sports academy admissions, turf bookings, and KhelChronicle research preprints.
          Synchronize trial cutoffs directly to your Google Calendar or download an offline iCalendar (.ics) schedule.
        </p>

        {/* KPI Summary Ribbon */}
        <div className="saved-kpi-ribbon">
          <div className="saved-kpi-card">
            <div className="saved-kpi-label">Total Saved</div>
            <div className="saved-kpi-value">{counts.all}</div>
          </div>
          <div className="saved-kpi-card">
            <div className="saved-kpi-label">Trial Deadlines</div>
            <div className="saved-kpi-value urgent">{counts.trials} Active</div>
          </div>
          <div className="saved-kpi-card">
            <div className="saved-kpi-label">Academies &amp; Venues</div>
            <div className="saved-kpi-value">{counts.academies + counts.venues}</div>
          </div>
          <div className="saved-kpi-card">
            <div className="saved-kpi-label">Research Preprints</div>
            <div className="saved-kpi-value">{counts.papers}</div>
          </div>
        </div>
      </header>

      {/* Controls Bar: Search & Action Tools */}
      <div className="saved-controls-bar">
        <div className="saved-search-box">
          <SiteIcon name="search" size={16} className="saved-search-icon" />
          <input
            type="search"
            className="saved-search-input"
            placeholder="Search saved by title, sport, or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="saved-action-tools">
          <select
            className="saved-select-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'deadline' | 'recent' | 'az')}
            aria-label="Sort saved items"
          >
            <option value="deadline">Sort: Urgent Deadlines First</option>
            <option value="recent">Sort: Recently Saved</option>
            <option value="az">Sort: Title (A to Z)</option>
          </select>

          {counts.trials > 0 && (
            <button
              type="button"
              className="saved-btn-export"
              onClick={handleExportCalendar}
              title="Download RFC 5545 iCalendar file with trial alarms"
            >
              <SiteIcon name="calendar-check" size={14} />
              <span>Export Calendar (.ics)</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              className="saved-btn-clear"
              onClick={handleClearAll}
              title="Clear all saved bookmarks"
            >
              <SiteIcon name="trash" size={13} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="saved-tabs-row" role="tablist" aria-label="Filter by item type">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'all'}
          className={`saved-tab-btn ${selectedCategory === 'all' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span>All Items</span>
          <span className="saved-tab-count">{counts.all}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'trials'}
          className={`saved-tab-btn ${selectedCategory === 'trials' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('trials')}
        >
          <span>Selection Trials</span>
          <span className="saved-tab-count">{counts.trials}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'academies'}
          className={`saved-tab-btn ${selectedCategory === 'academies' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('academies')}
        >
          <span>Academies</span>
          <span className="saved-tab-count">{counts.academies}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'venues'}
          className={`saved-tab-btn ${selectedCategory === 'venues' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('venues')}
        >
          <span>Venues &amp; Turfs</span>
          <span className="saved-tab-count">{counts.venues}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'coaches'}
          className={`saved-tab-btn ${selectedCategory === 'coaches' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('coaches')}
        >
          <span>Coaches</span>
          <span className="saved-tab-count">{counts.coaches}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'pickup'}
          className={`saved-tab-btn ${selectedCategory === 'pickup' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('pickup')}
        >
          <span>Pickup Games</span>
          <span className="saved-tab-count">{counts.pickup}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'papers'}
          className={`saved-tab-btn ${selectedCategory === 'papers' ? 'is-active' : ''}`}
          onClick={() => setSelectedCategory('papers')}
        >
          <span>Research Papers</span>
          <span className="saved-tab-count">{counts.papers}</span>
        </button>
      </div>

      {/* Saved Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="saved-cards-grid">
          {filteredItems.map(item => (
            <article key={item.id} className={`saved-card is-${item.category}`}>
              <div>
                <div className="saved-card-header">
                  <div className="saved-card-badges">
                    <span className="saved-badge-cat">{item.categoryLabel}</span>
                    <span className="saved-badge-sport">{item.sport}</span>
                    {item.badgeText && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
                        · {item.badgeText}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="saved-btn-unsave"
                    onClick={() => handleRemoveItem(item.id, item.title)}
                    aria-label={`Remove ${item.title} from saved items`}
                    title="Remove from saved items"
                  >
                    <SiteIcon name="close" size={14} />
                  </button>
                </div>

                <h2 className="saved-card-title">
                  <a href={item.href} onClick={e => handleLinkClick(e, item.href)}>
                    {item.title}
                  </a>
                </h2>

                <div className="saved-card-meta">
                  {item.city && (
                    <div className="saved-meta-row">
                      <SiteIcon name="map-pin" size={13} />
                      <span>{item.city} {item.location ? `· ${item.location}` : ''}</span>
                    </div>
                  )}

                  {item.organizerOrAuthor && (
                    <div className="saved-meta-row">
                      <SiteIcon name="award" size={13} />
                      <span>{item.organizerOrAuthor}</span>
                    </div>
                  )}

                  {item.dateOrDeadline && (
                    <div className="saved-deadline-badge">
                      <SiteIcon name="clock" size={12} />
                      <span>{item.dateOrDeadline}</span>
                    </div>
                  )}

                  {item.feeOrPrice && (
                    <div className="saved-meta-row" style={{ fontWeight: 600, color: '#0f172a' }}>
                      <SiteIcon name="wallet" size={13} />
                      <span>{item.feeOrPrice}</span>
                    </div>
                  )}

                  {item.rating && (
                    <div className="saved-meta-row" style={{ fontWeight: 700, color: '#d97706' }}>
                      <SiteIcon name="star" size={13} />
                      <span>{item.rating} / 5.0 Rating</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="saved-card-footer">
                <a
                  href={item.href}
                  className="saved-btn-primary"
                  onClick={e => handleLinkClick(e, item.href)}
                >
                  <span>
                    {item.category === 'trial'
                      ? 'View Trial'
                      : item.category === 'academy'
                      ? 'View Academy'
                      : item.category === 'venue'
                      ? 'View Turf'
                      : item.category === 'paper'
                      ? 'Read Paper'
                      : 'Join Match'}
                  </span>
                  <SiteIcon name="arrow-right" size={12} />
                </a>

                {item.category === 'trial' && (
                  <a
                    href={getGoogleCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="saved-btn-cal"
                    title="Add trial registration deadline to Google Calendar"
                  >
                    <SiteIcon name="calendar" size={12} />
                    <span>Google Cal</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="saved-empty-box">
          <SiteIcon name="bookmark" size={44} className="saved-empty-icon" />
          <h2 className="saved-empty-title">
            {searchQuery ? 'No matching saved items found' : 'No saved items yet'}
          </h2>
          <p className="saved-empty-desc">
            {searchQuery
              ? `No saved items matched "${searchQuery}". Try clearing your search.`
              : 'Save sports trials, coaching academies, turfs, and KhelChronicle research papers as you explore to organize your training schedule here.'}
          </p>

          <div className="saved-empty-links">
            <a
              href="/opportunities"
              className="saved-empty-link"
              onClick={e => handleLinkClick(e, '/opportunities')}
            >
              <SiteIcon name="trophy" size={14} />
              <span>Explore Trials</span>
            </a>
            <a
              href="/academies"
              className="saved-empty-link"
              onClick={e => handleLinkClick(e, '/academies')}
            >
              <SiteIcon name="building" size={14} />
              <span>Find Academies</span>
            </a>
            <a
              href="/khelchronicle"
              className="saved-empty-link"
              onClick={e => handleLinkClick(e, '/khelchronicle')}
            >
              <SiteIcon name="award" size={14} />
              <span>Browse Research</span>
            </a>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '999px',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          role="status"
          aria-live="polite"
        >
          <SiteIcon name="check-circle" size={16} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

export default SavedPage
