import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  getAnnouncements,
  getOpportunities,
  getPickupGames,
  getVenues,
} from '../../integrations/supabase/public-client'
import { liveSportsEngine } from '../../modules/live/services/liveSportsEngine'
import {
  BASELINE_NOTIFICATIONS,
  type KhelNotification,
  type NotificationCategory,
} from './notificationsData'
import './NotificationCenterDrawer.css'

export interface NotificationCenterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onUnreadCountChange?: (count: number) => void
}

export default function NotificationCenterDrawer({
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange,
}: NotificationCenterDrawerProps) {
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all')
  const [notifications, setNotifications] = useState<KhelNotification[]>(BASELINE_NOTIFICATIONS)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const set = new Set<string>()
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem('khelgrid_read_notifs')
        if (stored) JSON.parse(stored).forEach((id: string) => set.add(id))
      } catch {
        // Fallback
      }
    }
    return set
  })

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const set = new Set<string>()
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem('khelgrid_dismissed_notifs')
        if (stored) JSON.parse(stored).forEach((id: string) => set.add(id))
      } catch {
        // Fallback
      }
    }
    return set
  })

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Dynamically assemble notifications from connected Supabase catalogues and live sports
  useEffect(() => {
    let active = true

    Promise.all([
      getOpportunities(),
      getVenues(),
      getPickupGames(),
      getAnnouncements(),
      liveSportsEngine.getScores().catch(() => ({ matches: [] })),
    ]).then(([oppRes, venueRes, gameRes, annRes, scoreRes]) => {
      if (!active) return

      const dynamicList: KhelNotification[] = []

      // 1. Announcements
      if (annRes.status === 'ready' && annRes.data.length > 0) {
        annRes.data.slice(0, 2).forEach(ann => {
          dynamicList.push({
            id: `ann-${ann.slug}`,
            category: 'trials',
            title: ann.title,
            message: `${ann.badge} · ${ann.subtitle || 'Active announcement'}`,
            timeAgo: 'Active Now',
            icon: 'sparkles',
            link: ann.cta_url,
            actionLabel: ann.cta_label,
            priority: 'high',
          })
        })
      }

      // 2. High priority trials
      if (oppRes.status === 'ready' && oppRes.data.length > 0) {
        oppRes.data
          .filter(o => o.is_featured || o.verification_status === 'verified')
          .slice(0, 3)
          .forEach(opp => {
            dynamicList.push({
              id: `trial-${opp.id}`,
              category: 'trials',
              title: opp.title,
              message: `${opp.organizer_name ? `${opp.organizer_name} · ` : ''}${opp.city || 'Pan-India'} · ${
                opp.application_deadline ? `Deadline: ${opp.application_deadline}` : 'Open Scouting'
              }`,
              timeAgo: 'Today',
              icon: 'trophy',
              link: `/opportunities/${opp.slug}`,
              actionLabel: 'View Trial',
              priority: opp.is_featured ? 'high' : 'normal',
            })
          })
      }

      // 3. Featured venues
      if (venueRes.status === 'ready' && venueRes.data.length > 0) {
        venueRes.data
          .filter(v => v.is_featured || v.government_facility)
          .slice(0, 2)
          .forEach(v => {
            dynamicList.push({
              id: `venue-${v.id}`,
              category: 'turfs',
              title: v.name,
              message: `${v.city}${v.address ? ` · ${v.address}` : ''} · ${
                v.government_facility ? 'Government sports complex' : 'Verified multi-sport turf'
              }`,
              timeAgo: '1d ago',
              icon: 'calendar-check',
              link: `/venues/${v.slug}`,
              actionLabel: 'Explore Venue',
            })
          })
      }

      // 4. Pickup matches
      if (gameRes.status === 'ready' && gameRes.data.length > 0) {
        gameRes.data.slice(0, 2).forEach(g => {
          dynamicList.push({
            id: `pickup-${g.id}`,
            category: 'community',
            title: `${g.emoji || '⚽'} ${g.sport} Match in ${g.city}`,
            message: `${g.venue_name} · ${g.time_label} · ${g.spots_open} spots left (${g.price_per_player})`,
            timeAgo: 'Active',
            icon: 'activity',
            link: '/play',
            actionLabel: 'Join Game',
          })
        })
      }

      // 5. Live matches from sports engine
      if (scoreRes && scoreRes.matches && scoreRes.matches.length > 0) {
        const liveMatch = scoreRes.matches[0]
        dynamicList.push({
          id: `match-${liveMatch.id}`,
          category: 'matches',
          title: `${liveMatch.tournament}: ${liveMatch.teamA.name} vs ${liveMatch.teamB.name}`,
          message: `${liveMatch.status === 'LIVE' ? 'LIVE NOW · ' : ''}${liveMatch.teamA.score || '0'} - ${
            liveMatch.teamB.score || '0'
          } · ${liveMatch.statusText || liveMatch.venueOrOvers || 'Match in progress'}`,
          timeAgo: liveMatch.status === 'LIVE' ? 'Live Now' : 'Today',
          icon: 'activity',
          link: '/live',
          actionLabel: 'Match Center',
          priority: liveMatch.status === 'LIVE' ? 'high' : 'normal',
        })
      }

      // Merge dynamic with baseline, de-duplicating by ID
      const seen = new Set<string>()
      const combined: KhelNotification[] = []

      for (const item of [...dynamicList, ...BASELINE_NOTIFICATIONS]) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          combined.push(item)
        }
      }

      setNotifications(combined)
    })

    return () => {
      active = false
    }
  }, [])

  // Auto-focus on open and listen to Esc
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Filter visible notifications (not dismissed)
  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !dismissedIds.has(n.id))
  }, [notifications, dismissedIds])

  // Unread count
  const unreadCount = useMemo(() => {
    return visibleNotifications.filter(n => !readIds.has(n.id)).length
  }, [visibleNotifications, readIds])

  // Update parent with unread count
  useEffect(() => {
    onUnreadCountChange?.(unreadCount)
  }, [unreadCount, onUnreadCountChange])

  // Tab filtering
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return visibleNotifications
    return visibleNotifications.filter(n => n.category === activeTab)
  }, [visibleNotifications, activeTab])

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: visibleNotifications.length,
      trials: visibleNotifications.filter(n => n.category === 'trials').length,
      turfs: visibleNotifications.filter(n => n.category === 'turfs').length,
      matches: visibleNotifications.filter(n => n.category === 'matches').length,
      community: visibleNotifications.filter(n => n.category === 'community').length,
    }
  }, [visibleNotifications])

  function handleMarkAllAsRead() {
    setReadIds(prev => {
      const next = new Set(prev)
      visibleNotifications.forEach(n => next.add(n.id))
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('khelgrid_read_notifs', JSON.stringify(Array.from(next)))
        } catch {
          // Ignore
        }
      }
      return next
    })
  }

  function handleDismiss(e: MouseEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()
    setDismissedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('khelgrid_dismissed_notifs', JSON.stringify(Array.from(next)))
        } catch {
          // Ignore
        }
      }
      return next
    })
  }

  function handleCardClick(e: MouseEvent<HTMLAnchorElement>, notif: KhelNotification) {
    // Mark as read
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(notif.id)
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('khelgrid_read_notifs', JSON.stringify(Array.from(next)))
        } catch {
          // Ignore
        }
      }
      return next
    })

    if (onNavigate) {
      onNavigate(e, notif.link)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="notif-drawer-overlay" role="presentation">
      <div className="notif-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="notif-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notification Center"
      >
        {/* Header */}
        <header className="notif-drawer-header">
          <div className="notif-header-title-row">
            <div className="notif-header-title-wrap">
              <SiteIcon name="bell" size={20} style={{ color: 'var(--color-primary, #059669)' }} />
              <h2 className="notif-drawer-title">Notifications</h2>
              {unreadCount > 0 && (
                <span className="notif-unread-badge" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className="notif-close-btn"
              onClick={onClose}
              aria-label="Close notifications"
              title="Close notifications"
            >
              <SiteIcon name="close" size={18} />
            </button>
          </div>

          {/* Utility Toolbar */}
          <div className="notif-toolbar">
            <span className="notif-count-summary">
              {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-read-btn"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <nav className="notif-category-tabs" aria-label="Filter notifications by category">
            <button
              type="button"
              className={`notif-tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All <small>({tabCounts.all})</small>
            </button>
            <button
              type="button"
              className={`notif-tab ${activeTab === 'trials' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('trials')}
            >
              Trials <small>({tabCounts.trials})</small>
            </button>
            <button
              type="button"
              className={`notif-tab ${activeTab === 'turfs' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('turfs')}
            >
              Turfs <small>({tabCounts.turfs})</small>
            </button>
            <button
              type="button"
              className={`notif-tab ${activeTab === 'matches' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Matches <small>({tabCounts.matches})</small>
            </button>
            <button
              type="button"
              className={`notif-tab ${activeTab === 'community' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              Community <small>({tabCounts.community})</small>
            </button>
          </nav>
        </header>

        {/* Notification List */}
        <div className="notif-list-container">
          {filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon">
                <SiteIcon name="bell" size={32} />
              </div>
              <h3 className="notif-empty-title">No notifications in this view</h3>
              <p className="notif-empty-desc">
                You’re completely up to date. You will be notified when new trials, turfs, or live match updates occur.
              </p>
              {activeTab !== 'all' && (
                <button
                  type="button"
                  className="notif-view-all-btn"
                  onClick={() => setActiveTab('all')}
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            <ul className="notif-list" aria-label="Notifications list">
              {filteredNotifications.map(notif => {
                const isRead = readIds.has(notif.id)
                return (
                  <li key={notif.id} className={`notif-item ${isRead ? 'is-read' : 'is-unread'}`}>
                    <a
                      href={notif.link}
                      className="notif-item-link"
                      onClick={e => handleCardClick(e, notif)}
                    >
                      <div className={`notif-item-icon-wrap cat-${notif.category}`}>
                        <SiteIcon name={notif.icon} size={18} />
                      </div>

                      <div className="notif-item-content">
                        <div className="notif-item-top">
                          <h4 className="notif-item-title">{notif.title}</h4>
                          {!isRead && <span className="notif-item-dot" aria-label="Unread" />}
                        </div>
                        <p className="notif-item-message">{notif.message}</p>
                        <div className="notif-item-footer">
                          <span className="notif-item-time">{notif.timeAgo}</span>
                          {notif.actionLabel && (
                            <span className="notif-item-action">
                              <span>{notif.actionLabel}</span>
                              <SiteIcon name="arrow-up-right" size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    </a>

                    <button
                      type="button"
                      className="notif-item-dismiss"
                      onClick={e => handleDismiss(e, notif.id)}
                      aria-label="Dismiss notification"
                      title="Dismiss notification"
                    >
                      <SiteIcon name="close" size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <footer className="notif-drawer-footer">
          <a
            href="/opportunities"
            onClick={e => {
              if (onNavigate) {
                onNavigate(e, '/opportunities')
                onClose()
              }
            }}
            className="notif-footer-link"
          >
            <span>Explore Trials</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
          <a
            href="/live"
            onClick={e => {
              if (onNavigate) {
                onNavigate(e, '/live')
                onClose()
              }
            }}
            className="notif-footer-link"
          >
            <span>Match Center</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
          <a
            href="/venues"
            onClick={e => {
              if (onNavigate) {
                onNavigate(e, '/venues')
                onClose()
              }
            }}
            className="notif-footer-link"
          >
            <span>Browse Venues</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
        </footer>
      </aside>
    </div>
  )
}
