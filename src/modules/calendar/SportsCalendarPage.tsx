import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { getOpportunities, type CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { createBannerSvg } from '../home/homeSvgBanners'
import './SportsCalendarPage.css'

export interface SportsCalendarPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export interface CalendarEventItem {
  id: string
  title: string
  sport: string
  city: string
  venue: string
  type: 'trial_day' | 'deadline'
  date: string // YYYY-MM-DD
  fee: number
  opportunity: Opportunity
}

const AIU_CALENDAR_PDF = 'https://aiu.ac.in/wp-content/uploads/docs/2026/09/AIU-Sports-Calendar-2026-27-Final_compressed.pdf'
const AIU_WEBSITE = 'https://aiu.ac.in/'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toISODateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateOnly(str: string | null | undefined): string | null {
  if (!str) return null
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function buildGoogleCalendarUrl(event: CalendarEventItem): string {
  const dateClean = event.date.replace(/-/g, '')
  const title = encodeURIComponent(`[KhelGrid] ${event.title}`)
  const details = encodeURIComponent(
    `Sport: ${event.sport}\nCity: ${event.city}\nOrganizer: ${event.opportunity.organizer_name || 'Sports Authority / Federation'}\n\nTrack verified selection trials on KhelGrid:\nhttps://khelgrid.com/opportunities/${event.opportunity.slug}`
  )
  const location = encodeURIComponent(event.venue || event.city)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateClean}/${dateClean}&details=${details}&location=${location}`
}

export default function SportsCalendarPage({ onNavigate }: SportsCalendarPageProps) {
  const [result, setResult] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })

  // Date selection state (Defaults to November 2026)
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 10, 1))
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 10, 6))
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSport, setSelectedSport] = useState('All Sports')
  const [selectedCity, setSelectedCity] = useState('All Locations')
  const [typeFilter, setTypeFilter] = useState<'all' | 'trials' | 'deadlines' | 'free'>('all')

  // Fetch opportunities
  useEffect(() => {
    let active = true
    getOpportunities().then(val => {
      if (active) setResult(val)
    })
    return () => {
      active = false
    }
  }, [])

  const opportunities = useMemo(() => {
    return result.status === 'ready' ? result.data : []
  }, [result])

  // Extract distinct sports & cities
  const sportsList = useMemo(() => {
    const set = new Set<string>()
    for (const opp of opportunities) {
      const sportName = opp.sport?.name || (opp.metadata?.sport as string)
      if (sportName) set.add(sportName)
    }
    return Array.from(set).sort()
  }, [opportunities])

  const citiesList = useMemo(() => {
    const set = new Set<string>()
    for (const opp of opportunities) {
      if (opp.city) set.add(opp.city)
    }
    return Array.from(set).sort()
  }, [opportunities])

  // Map opportunities into structured Calendar Events
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const events: CalendarEventItem[] = []

    for (const opp of opportunities) {
      const sportName = opp.sport?.name || (opp.metadata?.sport as string) || 'Multi-Sport'
      const city = opp.city || 'Pan-India'
      const venue = opp.venue_name || city
      const fee = opp.registration_fee ?? 0

      // Trial / Start Day Event
      const startDate = parseDateOnly(opp.starts_at)
      if (startDate) {
        events.push({
          id: `${opp.id}-start`,
          title: opp.title,
          sport: sportName,
          city,
          venue,
          type: 'trial_day',
          date: startDate,
          fee,
          opportunity: opp,
        })
      }

      // Registration Deadline Event
      const deadlineDate = parseDateOnly(opp.application_deadline)
      if (deadlineDate && deadlineDate !== startDate) {
        events.push({
          id: `${opp.id}-deadline`,
          title: opp.title,
          sport: sportName,
          city,
          venue,
          type: 'deadline',
          date: deadlineDate,
          fee,
          opportunity: opp,
        })
      }
    }

    return events
  }, [opportunities])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${ev.title} ${ev.sport} ${ev.city} ${ev.venue}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      // Sport
      if (selectedSport !== 'All Sports' && ev.sport !== selectedSport) {
        return false
      }

      // City
      if (selectedCity !== 'All Locations' && ev.city !== selectedCity) {
        return false
      }

      // Type filter
      if (typeFilter === 'trials' && ev.type !== 'trial_day') return false
      if (typeFilter === 'deadlines' && ev.type !== 'deadline') return false
      if (typeFilter === 'free' && ev.fee > 0) return false

      return true
    })
  }, [allEvents, searchQuery, selectedSport, selectedCity, typeFilter])

  // Map events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>()
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) || []
      list.push(ev)
      map.set(ev.date, list)
    }
    return map
  }, [filteredEvents])

  // Active month statistics for KPI ribbon
  const monthKpis = useMemo(() => {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`

    const monthEvents = filteredEvents.filter(ev => ev.date.startsWith(prefix))
    const sports = new Set(monthEvents.map(ev => ev.sport))
    const freeCount = monthEvents.filter(ev => ev.fee === 0).length
    const deadlineCount = monthEvents.filter(ev => ev.type === 'deadline').length

    return {
      totalTrials: monthEvents.length,
      sportsCount: sports.size,
      freeCount,
      deadlineCount,
      monthName: currentMonth.toLocaleString('en-US', { month: 'short' }),
    }
  }, [filteredEvents, currentMonth])

  // Generate calendar days grid (Sun-Sat)
  const calendarGridDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      date: Date
      dateString: string
      dayNumber: number
      isCurrentMonth: boolean
    }> = []

    // 1. Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const date = new Date(year, month - 1, d)
      days.push({
        date,
        dateString: toISODateString(date),
        dayNumber: d,
        isCurrentMonth: false,
      })
    }

    // 2. Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({
        date,
        dateString: toISODateString(date),
        dayNumber: i,
        isCurrentMonth: true,
      })
    }

    // 3. Next month days to fill complete rows of 7
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        dateString: toISODateString(date),
        dayNumber: i,
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentMonth])

  // Events for selected date
  const selectedDateString = toISODateString(selectedDate)
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateString) || []
  }, [eventsByDate, selectedDateString])

  // Export visible month events as .ICS file
  const handleExportICS = () => {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    const visibleMonthEvents = filteredEvents.filter(ev => ev.date.startsWith(prefix))

    if (visibleMonthEvents.length === 0) {
      alert('No events scheduled in this month to export.')
      return
    }

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KhelGrid//Sports Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:KhelGrid Sports Calendar - ${currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    ]

    for (const ev of visibleMonthEvents) {
      const cleanDate = ev.date.replace(/-/g, '')
      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@khelgrid.com`,
        `DTSTAMP:${cleanDate}T000000Z`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `DTEND;VALUE=DATE:${cleanDate}`,
        `SUMMARY:[${ev.sport}] ${ev.title}`,
        `DESCRIPTION:${ev.type === 'deadline' ? 'Registration Deadline' : 'Selection Trial / Combine'}. Organizer: ${ev.opportunity.organizer_name || 'Sports Authority'}. View details: https://khelgrid.com/opportunities/${ev.opportunity.slug}`,
        `LOCATION:${ev.venue || ev.city}`,
        `URL:https://khelgrid.com/opportunities/${ev.opportunity.slug}`,
        'END:VEVENT'
      )
    }

    icsLines.push('END:VCALENDAR')

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `khelgrid-sports-calendar-${prefix}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date)
    // If date is outside current month view, navigate view month as well
    if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedSport('All Sports')
    setSelectedCity('All Locations')
    setTypeFilter('all')
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSport !== 'All Sports' ||
    selectedCity !== 'All Locations' ||
    typeFilter !== 'all'

  return (
    <div className="calendar-page-container">
      {/* 1. Hero Banner */}
      <section className="calendar-hero-section" aria-label="Sports Calendar Header">
        <div className="calendar-hero-inner">
          <nav className="calendar-breadcrumb" aria-label="Breadcrumb">
            <a
              href="/"
              onClick={e => {
                e.preventDefault()
                onNavigate?.(e, '/')
              }}
            >
              Home
            </a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Sports Calendar</span>
          </nav>

          <div className="calendar-hero-title-row">
            <div className="calendar-hero-content">
              <span className="calendar-eyebrow-badge">
                <SiteIcon name="calendar-check" size={13} />
                Centralized Sports Planner · 2026–27
              </span>
              <h1 className="calendar-hero-title">All-India Sports Calendar</h1>
              <p className="calendar-hero-subtitle">
                Track verified selection trials, combine schedules, and registration deadlines across India,
                alongside the official AIU national university championship calendar.
              </p>
            </div>

            <div className="calendar-hero-actions">
              <a
                href="/opportunities"
                onClick={e => {
                  e.preventDefault()
                  onNavigate?.(e, '/opportunities')
                }}
                className="calendar-hero-btn is-primary"
              >
                <SiteIcon name="trophy" size={14} />
                <span>Browse All Trials</span>
              </a>
              <button
                type="button"
                onClick={() => setViewMode(prev => (prev === 'calendar' ? 'timeline' : 'calendar'))}
                className="calendar-hero-btn"
                title="Toggle between Calendar Grid and Chronological Timeline"
              >
                <SiteIcon name={viewMode === 'calendar' ? 'activity' : 'calendar'} size={14} />
                <span>{viewMode === 'calendar' ? 'Agenda List View' : 'Month Grid View'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Content */}
      <main className="calendar-main-content">
        {/* Official AIU Inter-University Calendar Reference Card */}
        <section className="calendar-aiu-card" aria-labelledby="aiu-heading">
          <div>
            <div className="calendar-aiu-header-badges">
              <span className="calendar-aiu-tag">
                <SiteIcon name="shield-check" size={12} />
                Official university sports calendar
              </span>
              <span className="calendar-aiu-season-tag">2026–27 Season</span>
            </div>
            <h2 id="aiu-heading" className="calendar-aiu-title">
              AIU Inter-University Sports Calendar 2026–27
            </h2>
            <p className="calendar-aiu-desc">
              The Association of Indian Universities (AIU) annual calendar lists inter-university championships across
              India, including All-India, Four-Zone, and Multi-Zone university competitions. Use the verified PDF to
              check sport-wise schedules and confirm student-athlete entry details.
            </p>
            <div className="calendar-aiu-meta-row">
              <span className="calendar-aiu-pill">
                <SiteIcon name="trophy" size={12} style={{ color: '#059669' }} />
                All-India &amp; Zonal Championships
              </span>
              <span className="calendar-aiu-pill">
                <SiteIcon name="badge-check" size={12} style={{ color: '#059669' }} />
                Official AIU PDF Document
              </span>
            </div>
          </div>

          <div className="calendar-aiu-actions">
            <a
              href={AIU_CALENDAR_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-aiu-btn is-primary"
              title="Open the official AIU Sports Calendar PDF document"
            >
              <SiteIcon name="external-link" size={14} />
              <span>Open official calendar</span>
            </a>
            <a
              href={AIU_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-aiu-btn is-secondary"
              title="Visit Association of Indian Universities portal"
            >
              <span>Visit AIU website</span>
              <SiteIcon name="arrow-up-right" size={13} />
            </a>
          </div>
        </section>

        {/* 3. Monthly Calendar Engine Card */}
        <div className="calendar-section-card">
          {/* Top Controls Bar */}
          <div className="calendar-top-controls">
            <div className="calendar-heading-group">
              <div className="calendar-heading-title-row">
                <div className="calendar-icon-avatar">
                  <SiteIcon name="calendar-check" size={18} />
                </div>
                <h2 className="calendar-heading-title">Sports Selection Calendar</h2>
                <span className="calendar-view-badge">Monthly View</span>
              </div>
              <p className="calendar-heading-subtitle">
                Centralized agenda of verified selection trials, combine dates, and registration deadlines
              </p>
            </div>

            <div className="calendar-month-nav-group">
              <div className="calendar-month-stepper">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="calendar-nav-arrow"
                  aria-label="Previous month"
                >
                  <SiteIcon name="arrow-left" size={15} />
                </button>
                <span className="calendar-month-title">
                  {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="calendar-nav-arrow"
                  aria-label="Next month"
                >
                  <SiteIcon name="arrow-right" size={15} />
                </button>
              </div>

              {/* Quick Jump Month Buttons */}
              <div className="calendar-quick-months">
                {[
                  { label: 'Oct 2026', date: new Date(2026, 9, 1) },
                  { label: 'Nov 2026', date: new Date(2026, 10, 1) },
                  { label: 'Dec 2026', date: new Date(2026, 11, 1) },
                  { label: 'Jan 2027', date: new Date(2027, 0, 1) },
                ].map(m => {
                  const isActive =
                    m.date.getMonth() === currentMonth.getMonth() &&
                    m.date.getFullYear() === currentMonth.getFullYear()
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setCurrentMonth(m.date)}
                      className={`calendar-quick-month-btn${isActive ? ' is-active' : ''}`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const now = new Date(2026, 10, 6)
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                  setSelectedDate(now)
                }}
                className="calendar-action-btn"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleExportICS}
                className="calendar-action-btn is-export"
                title="Download .ICS file for Google Calendar, Apple Calendar, or Outlook"
              >
                <SiteIcon name="download" size={13} />
                <span>Export .ICS</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="calendar-filters-grid">
            <div className="calendar-search-wrap">
              <span className="calendar-search-icon">
                <SiteIcon name="search" size={14} />
              </span>
              <input
                type="text"
                placeholder="Search academy or tournament…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="calendar-search-input"
              />
            </div>

            <select
              value={selectedSport}
              onChange={e => setSelectedSport(e.target.value)}
              className="calendar-select"
              aria-label="Filter by sport"
            >
              <option value="All Sports">All Sports</option>
              {sportsList.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="calendar-select"
              aria-label="Filter by city"
            >
              <option value="All Locations">All Locations</option>
              {citiesList.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="calendar-type-pills">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`calendar-type-pill${typeFilter === 'all' ? ' is-active' : ''}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('trials')}
                className={`calendar-type-pill${typeFilter === 'trials' ? ' is-active' : ''}`}
              >
                Trials
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('deadlines')}
                className={`calendar-type-pill${typeFilter === 'deadlines' ? ' is-active' : ''}`}
              >
                Deadlines
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('free')}
                className={`calendar-type-pill${typeFilter === 'free' ? ' is-active is-active-free' : ''}`}
              >
                ₹0 Free
              </button>
            </div>
          </div>

          {/* Active Chips Row */}
          {hasActiveFilters && (
            <div className="calendar-active-chips-row">
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Active Filters:</span>
              {selectedSport !== 'All Sports' && (
                <span className="calendar-chip">
                  {selectedSport}
                  <button
                    type="button"
                    onClick={() => setSelectedSport('All Sports')}
                    className="calendar-chip-close"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedCity !== 'All Locations' && (
                <span className="calendar-chip">
                  {selectedCity}
                  <button
                    type="button"
                    onClick={() => setSelectedCity('All Locations')}
                    className="calendar-chip-close"
                  >
                    ×
                  </button>
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="calendar-chip">
                  {typeFilter === 'free' ? 'Free Entry (₹0)' : typeFilter}
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className="calendar-chip-close"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchQuery.trim() !== '' && (
                <span className="calendar-chip">
                  "{searchQuery}"
                  <button type="button" onClick={() => setSearchQuery('')} className="calendar-chip-close">
                    ×
                  </button>
                </span>
              )}
              <button type="button" onClick={handleClearFilters} className="calendar-clear-all-btn">
                Clear all
              </button>
            </div>
          )}

          {/* Monthly KPI Ribbon */}
          <div className="calendar-kpi-ribbon">
            <div className="calendar-kpi-item">
              <span className="calendar-kpi-label">Active in {monthKpis.monthName}</span>
              <span className="calendar-kpi-val">{monthKpis.totalTrials} Events</span>
            </div>
            <div className="calendar-kpi-item">
              <span className="calendar-kpi-label">Sports Disciplines</span>
              <span className="calendar-kpi-val is-emerald">{monthKpis.sportsCount} Sports</span>
            </div>
            <div className="calendar-kpi-item">
              <span className="calendar-kpi-label">Free Entry (₹0)</span>
              <span className="calendar-kpi-val is-emerald">{monthKpis.freeCount} Opportunities</span>
            </div>
            <div className="calendar-kpi-item">
              <span className="calendar-kpi-label">Closing Deadlines</span>
              <span className="calendar-kpi-val is-amber">{monthKpis.deadlineCount} Deadlines</span>
            </div>
          </div>

          {/* 4. Month Calendar Grid View */}
          {viewMode === 'calendar' ? (
            <div className="calendar-grid-wrapper">
              <div className="calendar-grid-days-header">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="calendar-grid-cells">
                {calendarGridDays.map(cell => {
                  const dayEvents = eventsByDate.get(cell.dateString) || []
                  const hasDeadline = dayEvents.some(e => e.type === 'deadline')
                  const hasTrial = dayEvents.some(e => e.type === 'trial_day')
                  const isSelected = cell.dateString === selectedDateString
                  const isToday = cell.dateString === '2026-11-06' // Platform standard date

                  return (
                    <div
                      key={cell.dateString}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectDay(cell.date)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectDay(cell.date)
                        }
                      }}
                      className={`calendar-day-cell${cell.isCurrentMonth ? '' : ' is-other-month'}${
                        isSelected ? ' is-selected' : ''
                      }`}
                      aria-label={`${cell.date.toDateString()}, ${dayEvents.length} events`}
                    >
                      <div className="calendar-day-cell-top">
                        <span className={`calendar-day-number${isToday ? ' is-today' : ''}`}>
                          {cell.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <div className="calendar-day-badges-indicator">
                            {hasDeadline && (
                              <span
                                className="calendar-indicator-dot is-deadline"
                                title="Registration Deadline Closing"
                              />
                            )}
                            {hasTrial && (
                              <span className="calendar-indicator-dot is-trial" title="Trial / Match Day" />
                            )}
                            <span className="calendar-day-count-badge">{dayEvents.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Event Chips (Desktop) */}
                      {dayEvents.length > 0 && (
                        <div className="calendar-day-event-chips">
                          {dayEvents.slice(0, 2).map(ev => (
                            <div
                              key={ev.id}
                              className={`calendar-mini-chip ${
                                ev.type === 'deadline' ? 'is-deadline' : 'is-trial'
                              }`}
                              title={`${ev.title} (${ev.sport} in ${ev.city})`}
                            >
                              {ev.type === 'deadline' ? '⚠️ Last Day' : `${ev.sport}: ${ev.title}`}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="calendar-overflow-pill">+{dayEvents.length - 2} more</div>
                          )}

                          {/* Mobile Dots */}
                          <div className="calendar-mobile-dots">
                            {dayEvents.slice(0, 3).map(ev => (
                              <span
                                key={ev.id}
                                className={`calendar-indicator-dot ${
                                  ev.type === 'deadline' ? 'is-deadline' : 'is-trial'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* 5. Chronological Timeline List View */
            <div style={{ marginBottom: 24 }}>
              <div className="calendar-agenda-cards-stack">
                {filteredEvents.length === 0 ? (
                  <div className="calendar-empty-day-state">
                    <p className="calendar-empty-title">No events matching your filters</p>
                    <p className="calendar-empty-desc">Try resetting your sport or location filters.</p>
                  </div>
                ) : (
                  filteredEvents.slice(0, 25).map(ev => (
                    <article key={ev.id} className="calendar-agenda-card">
                      <div className="calendar-agenda-card-left">
                        <div className="calendar-card-thumbnail">
                          <img
                            src={createBannerSvg(
                              ev.title,
                              ev.city,
                              '🏆',
                              'amber',
                              ev.opportunity.id || ev.opportunity.slug
                            )}
                            alt={ev.title}
                            loading="lazy"
                            width={90}
                            height={60}
                          />
                        </div>
                        <div className="calendar-card-info">
                          <div className="calendar-card-tag-row">
                            <span className="calendar-sport-pill">{ev.sport}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              <SiteIcon name="calendar" size={11} /> {ev.date}
                            </span>
                            <span className={`calendar-fee-pill${ev.fee > 0 ? ' is-paid' : ''}`}>
                              {ev.fee === 0 ? 'Free Entry (₹0)' : `₹${ev.fee}`}
                            </span>
                            {ev.type === 'deadline' && (
                              <span className="calendar-deadline-pill">Deadline</span>
                            )}
                          </div>
                          <h4 className="calendar-card-heading">{ev.title}</h4>
                          <p className="calendar-card-organizer">
                            {ev.opportunity.organizer_name || 'Sports Authority / Federation'} · {ev.venue}
                          </p>
                        </div>
                      </div>

                      <div className="calendar-agenda-card-actions">
                        <a
                          href={`/opportunities/${ev.opportunity.slug}`}
                          onClick={e => {
                            e.preventDefault()
                            onNavigate?.(e, `/opportunities/${ev.opportunity.slug}`)
                          }}
                          className="calendar-agenda-action-btn"
                        >
                          View Details
                        </a>
                        <a
                          href={buildGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="calendar-agenda-action-btn is-primary"
                          title="Add event to Google Calendar"
                        >
                          <SiteIcon name="calendar-check" size={13} />
                          <span>Google Cal</span>
                        </a>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. Day Agenda Inspector */}
          <div id="calendar-day-agenda-inspector" className="calendar-agenda-inspector">
            <div className="calendar-agenda-header">
              <div>
                <h3 className="calendar-agenda-title">
                  <SiteIcon name="calendar-check" size={16} style={{ color: '#059669' }} />
                  <span>Agenda for {formatDisplayDate(selectedDateString)}</span>
                </h3>
                <p className="calendar-agenda-subtitle">
                  {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'} scheduled on this
                  date
                </p>
              </div>

              <div className="calendar-agenda-legend">
                <span className="calendar-legend-item">
                  <span className="calendar-indicator-dot is-trial" /> Trial / Combine Day
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-indicator-dot is-deadline" /> Registration Deadline
                </span>
              </div>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="calendar-agenda-cards-stack">
                {selectedDateEvents.map(ev => (
                  <article key={ev.id} className="calendar-agenda-card">
                    <div className="calendar-agenda-card-left">
                      <div className="calendar-card-thumbnail">
                        <img
                          src={createBannerSvg(
                            ev.title,
                            ev.city,
                            '🏆',
                            'amber',
                            ev.opportunity.id || ev.opportunity.slug
                          )}
                          alt={ev.title}
                          loading="lazy"
                          width={90}
                          height={60}
                        />
                      </div>
                      <div className="calendar-card-info">
                        <div className="calendar-card-tag-row">
                          <span className="calendar-sport-pill">{ev.sport}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <SiteIcon name="map-pin" size={11} /> {ev.city}
                          </span>
                          <span className={`calendar-fee-pill${ev.fee > 0 ? ' is-paid' : ''}`}>
                            {ev.fee === 0 ? 'Free Entry (₹0)' : `₹${ev.fee}`}
                          </span>
                          {ev.type === 'deadline' && (
                            <span className="calendar-deadline-pill">⚠️ Registration Deadline</span>
                          )}
                        </div>
                        <h4 className="calendar-card-heading">{ev.title}</h4>
                        <p className="calendar-card-organizer">
                          Organized by{' '}
                          <strong>{ev.opportunity.organizer_name || 'Accredited Sports Center'}</strong>
                          {ev.venue ? ` · Venue: ${ev.venue}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="calendar-agenda-card-actions">
                      <a
                        href={`/opportunities/${ev.opportunity.slug}`}
                        onClick={e => {
                          e.preventDefault()
                          onNavigate?.(e, `/opportunities/${ev.opportunity.slug}`)
                        }}
                        className="calendar-agenda-action-btn"
                      >
                        View Details
                      </a>
                      <a
                        href={buildGoogleCalendarUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="calendar-agenda-action-btn is-primary"
                        title="Add to Google Calendar"
                      >
                        <SiteIcon name="calendar-check" size={13} />
                        <span>Add to Cal</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="calendar-empty-day-state">
                <div className="calendar-empty-icon">
                  <SiteIcon name="calendar" size={20} />
                </div>
                <h4 className="calendar-empty-title">
                  No trials or deadlines scheduled for {formatDisplayDate(selectedDateString)}
                </h4>
                <p className="calendar-empty-desc">
                  Try clicking on a highlighted date with green or amber dots in the grid, or use the quick jumps
                  below to explore key upcoming state and federation selection dates.
                </p>
                <div className="calendar-quick-jumps">
                  <button
                    type="button"
                    onClick={() => handleSelectDay(new Date(2026, 9, 23))}
                    className="calendar-quick-jump-btn"
                  >
                    Jump to Oct 23 (SAI NCOE Trials)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDay(new Date(2026, 10, 5))}
                    className="calendar-quick-jump-btn"
                  >
                    Jump to Nov 5 (DDCA Trials)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDay(new Date(2026, 10, 7))}
                    className="calendar-quick-jump-btn"
                  >
                    Jump to Nov 7 (Khel Maharan 3.0)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
