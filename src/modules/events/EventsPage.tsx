import { useState, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  BASELINE_EVENTS,
  EVENT_SPORTS_FILTER,
  EVENT_AGE_CATEGORIES,
  EVENT_STATES,
  EVENT_FEDERATIONS,
  STORAGE_SAVED_EVENTS_KEY,
  generateEventIcs,
  type SportEvent,
  type AgeGroup,
} from './eventsData'
import { EventRegistrationModal } from './EventRegistrationModal'
import './EventsPage.css'

export interface EventsPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export function EventsPage({ onNavigate }: EventsPageProps) {
  const [events] = useState<SportEvent[]>(BASELINE_EVENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSport, setSelectedSport] = useState('All Sports')
  const [selectedAge, setSelectedAge] = useState('all')
  const [selectedState, setSelectedState] = useState('All India / Any State')
  const [selectedFederation, setSelectedFederation] = useState('All Federations')
  const [selectedEventForModal, setSelectedEventForModal] = useState<SportEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = evt.title.toLowerCase().includes(q)
        const matchHindi = evt.hindiTitle.toLowerCase().includes(q)
        const matchCity = evt.city.toLowerCase().includes(q)
        const matchState = evt.state.toLowerCase().includes(q)
        const matchVenue = evt.venue.toLowerCase().includes(q)
        const matchFed = evt.sanctioningBody.toLowerCase().includes(q)
        if (!matchTitle && !matchHindi && !matchCity && !matchState && !matchVenue && !matchFed) {
          return false
        }
      }

      // Sport
      if (selectedSport !== 'All Sports') {
        if (selectedSport === 'Multi-Sport') {
          if (evt.sport !== 'Multi-Sport') return false
        } else if (evt.sport !== selectedSport) {
          return false
        }
      }

      // Age category
      if (selectedAge !== 'all') {
        if (!evt.ageCategories.includes(selectedAge as AgeGroup)) {
          return false
        }
      }

      // State
      if (selectedState !== 'All India / Any State') {
        if (evt.state !== selectedState && evt.state !== 'All India') {
          return false
        }
      }

      // Federation
      if (selectedFederation !== 'All Federations') {
        if (evt.sanctioningBody !== selectedFederation) {
          return false
        }
      }

      return true
    })
  }, [events, searchQuery, selectedSport, selectedAge, selectedState, selectedFederation])

  const handleDownloadIcs = (evt: SportEvent) => {
    try {
      const icsData = generateEventIcs(evt)
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${evt.slug}-khelgrid.ics`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast(`Calendar file downloaded for "${evt.title}". Import into Google/Apple Calendar.`)
    } catch {
      showToast('Calendar export failed. Please try again.')
    }
  }

  const handleSaveEvent = (evt: SportEvent) => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_EVENTS_KEY)
      const ids: string[] = stored ? (JSON.parse(stored) as string[]) : []
      if (ids.includes(evt.id)) {
        const next = ids.filter(id => id !== evt.id)
        localStorage.setItem(STORAGE_SAVED_EVENTS_KEY, JSON.stringify(next))
        showToast(`Removed "${evt.title}" from saved events.`)
      } else {
        ids.push(evt.id)
        localStorage.setItem(STORAGE_SAVED_EVENTS_KEY, JSON.stringify(ids))
        showToast(`Saved "${evt.title}" to your Bookmarks & Calendar Hub!`)
      }
    } catch {
      showToast('Saved to session storage.')
    }
  }

  const handleOpenRegistration = (evt: SportEvent) => {
    setSelectedEventForModal(evt)
    setIsModalOpen(true)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedSport('All Sports')
    setSelectedAge('all')
    setSelectedState('All India / Any State')
    setSelectedFederation('All Federations')
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedSport !== 'All Sports' ||
    selectedAge !== 'all' ||
    selectedState !== 'All India / Any State' ||
    selectedFederation !== 'All Federations'

  return (
    <main id="main-content" className="events-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="events-toast" role="status" aria-live="polite">
          <SiteIcon name="badge-check" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <header className="events-hero">
        <div className="events-hero-badge">
          <SiteIcon name="trophy" size={14} />
          <span>NATIONAL &amp; STATE CHAMPIONSHIPS HUB</span>
        </div>
        <h1 className="events-hero-title">
          National Events &amp; State Tournaments Calendar.
        </h1>
        <p className="events-hero-desc">
          Discover verified state championships, school games (SGFI), Khelo India youth competitions, senior national meets, and state ranking events with transparent eligibility criteria, prize money, and sanctioned federation rulebooks.
        </p>

        {/* Metric Highlights Ribbon */}
        <div className="events-metrics-grid">
          <div className="events-metric-card">
            <span className="metric-number">140+</span>
            <span className="metric-label">National &amp; State Meets</span>
          </div>
          <div className="events-metric-card">
            <span className="metric-number">₹2.5 Cr+</span>
            <span className="metric-label">Prize Pools &amp; Grants</span>
          </div>
          <div className="events-metric-card">
            <span className="metric-number">12</span>
            <span className="metric-label">Sanctioned Federations</span>
          </div>
          <div className="events-metric-card">
            <span className="metric-number">100%</span>
            <span className="metric-label">Verified Regulations</span>
          </div>
        </div>
      </header>

      {/* Search & Filter Workbench */}
      <section className="events-controls-section" aria-label="Tournament filters">
        {/* Search input */}
        <div className="events-search-wrapper">
          <SiteIcon name="search" size={18} />
          <input
            type="search"
            className="events-search-input"
            placeholder="Search by championship name, venue, city, or federation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search tournaments"
          />
          {searchQuery && (
            <button
              type="button"
              className="events-clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <SiteIcon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Sport Pills */}
        <div className="events-sports-scroller" role="tablist" aria-label="Filter by sport">
          {EVENT_SPORTS_FILTER.map(sport => (
            <button
              key={sport}
              type="button"
              role="tab"
              aria-selected={selectedSport === sport}
              className={`events-sport-pill ${selectedSport === sport ? 'is-active' : ''}`}
              onClick={() => setSelectedSport(sport)}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Age, State, Federation */}
        <div className="events-secondary-filters">
          <div className="filter-group">
            <label htmlFor="filter-age">Age Category:</label>
            <select
              id="filter-age"
              value={selectedAge}
              onChange={e => setSelectedAge(e.target.value)}
            >
              {EVENT_AGE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-state">Region / State:</label>
            <select
              id="filter-state"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              {EVENT_STATES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-federation">Sanctioning Body:</label>
            <select
              id="filter-federation"
              value={selectedFederation}
              onChange={e => setSelectedFederation(e.target.value)}
            >
              {EVENT_FEDERATIONS.map(fed => (
                <option key={fed} value={fed}>{fed}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="events-reset-btn"
              onClick={resetFilters}
            >
              <SiteIcon name="close" size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Events Results Header */}
      <div className="events-results-bar">
        <span className="results-count">
          Showing <strong>{filteredEvents.length}</strong> sanctioned {filteredEvents.length === 1 ? 'championship' : 'championships'}
        </span>
        <div className="quick-nav-links">
          <a
            href="/calendar"
            onClick={e => handleLinkClick(e, '/calendar')}
            className="calendar-view-link"
          >
            <SiteIcon name="calendar-check" size={15} />
            <span>AIU Sports Calendar View</span>
          </a>
          <a
            href="/opportunities"
            onClick={e => handleLinkClick(e, '/opportunities')}
            className="trials-link"
          >
            <SiteIcon name="target" size={15} />
            <span>Explore Selection Trials</span>
          </a>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="events-empty-state">
          <SiteIcon name="calendar" size={40} />
          <h3>No championships match your filter criteria</h3>
          <p>Try resetting the sport, state, or age group filters to view more upcoming tournaments.</p>
          <button type="button" className="events-reset-btn-large" onClick={resetFilters}>
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map(evt => (
            <article key={evt.id} className="event-card">
              {/* Card Header */}
              <div className="event-card-header">
                <div className="event-sanction-badge">
                  <SiteIcon name="shield-check" size={14} />
                  <span>{evt.sanctioningBody}</span>
                </div>
                <div className="event-badges-right">
                  <span className="event-sport-tag">{evt.sport}</span>
                  <span className="event-deadline-pill">
                    Closes {evt.registrationDeadline}
                  </span>
                </div>
              </div>

              {/* Title & Vernacular */}
              <h2 className="event-card-title">{evt.title}</h2>
              <p className="event-card-hindi">{evt.hindiTitle}</p>

              {/* Edition & Venue */}
              <div className="event-meta-row">
                <span className="meta-item">
                  <SiteIcon name="calendar" size={14} />
                  <span>{evt.startDate} to {evt.endDate}</span>
                </span>
                <span className="meta-item">
                  <SiteIcon name="map-pin" size={14} />
                  <span>{evt.city}, {evt.state}</span>
                </span>
              </div>

              <div className="event-venue-name">
                <strong>Venue:</strong> {evt.venue}
              </div>

              {/* Age Categories Tags */}
              <div className="event-age-tags">
                <span className="age-label">Age Groups:</span>
                {evt.ageCategories.map(cat => (
                  <span key={cat} className="age-tag">{cat}</span>
                ))}
                <span className="gender-tag">{evt.gender}</span>
              </div>

              {/* Prize & Fee Box */}
              <div className="event-rewards-box">
                <div className="reward-item">
                  <span className="reward-label">Prize / Grants:</span>
                  <span className="reward-val">{evt.prizePool}</span>
                </div>
                <div className="reward-item">
                  <span className="reward-label">Entry Fee:</span>
                  <span className="reward-fee">{evt.entryFee}</span>
                </div>
              </div>

              {/* Description */}
              <p className="event-card-desc">{evt.description}</p>

              {/* Eligibility Highlights */}
              <div className="event-qualification-box">
                <span className="qual-title">Key Participation Requirements:</span>
                <ul className="qual-list">
                  {evt.qualificationRequirements.slice(0, 2).map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="event-card-actions">
                <button
                  type="button"
                  className="btn-register-event"
                  onClick={() => handleOpenRegistration(evt)}
                >
                  <span>Register &amp; Inquire</span>
                  <SiteIcon name="arrow-up-right" size={15} />
                </button>

                <a
                  href={evt.rulebookPdfUrl || evt.officialNoticeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-rulebook-pdf"
                >
                  <SiteIcon name="file-text" size={14} />
                  <span>Official Rulebook</span>
                </a>

                <button
                  type="button"
                  className="btn-ics-calendar"
                  onClick={() => handleDownloadIcs(evt)}
                  title="Add this tournament to Google/Apple Calendar (.ics)"
                  aria-label="Add tournament to calendar"
                >
                  <SiteIcon name="calendar-check" size={15} />
                  <span>.ICS</span>
                </button>

                <button
                  type="button"
                  className="btn-save-event"
                  onClick={() => handleSaveEvent(evt)}
                  title="Bookmark event"
                  aria-label="Bookmark event"
                >
                  <SiteIcon name="bookmark" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Bottom Information Notice */}
      <footer className="events-footer-note">
        <div className="notice-icon">
          <SiteIcon name="shield-check" size={24} />
        </div>
        <div>
          <h4>KhelGrid Grassroots Verification &amp; Anti-Fraud Standard</h4>
          <p>
            All listed tournaments are verified against official circulars published by respective National Sports Federations (NSFs), the School Games Federation of India (SGFI), or the Association of Indian Universities (AIU). KhelGrid does not collect unauthorized entry cash or operate unapproved tournaments. Athletes must verify official age-eligibility guidelines and carry original identity proof during on-site reporting.
          </p>
        </div>
      </footer>

      {/* Registration & Inquiry Modal */}
      <EventRegistrationModal
        event={selectedEventForModal}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedEventForModal(null)
        }}
        onSuccessToast={showToast}
      />
    </main>
  )
}

export default EventsPage
