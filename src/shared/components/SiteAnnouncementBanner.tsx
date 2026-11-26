import { useState, useEffect, useCallback, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  BASELINE_ANNOUNCEMENTS,
  type DatabaseAnnouncement,
} from '../../integrations/supabase/public-client'
import { getCachedAnnouncements } from '../cache/catalogueQueryCache'
import {
  getLiveAdminBannersForAudience,
  isPlatformMaintenanceActive,
  subscribeRegulatoryState,
  type BannerAudienceScope,
} from '../governance/regulatoryBridge'
import './SiteAnnouncementBanner.css'

export interface SiteAnnouncementBannerProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  className?: string
  audience?: BannerAudienceScope
  locale?: 'en' | 'hi'
}

const MAINTENANCE_NOTICE_ITEM: DatabaseAnnouncement = {
  id: 'kg-maintenance-mode-live',
  slug: 'khelgrid-maintenance-mode-live',
  badge: 'Maintenance Hold',
  title: 'Partner & Athlete Workspaces Are Temporarily in Scheduled Maintenance',
  subtitle: 'Public sports discovery remains available while KhelGrid completes administrative updates.',
  cta_label: 'Support Desk',
  cta_url: '/help-feedback',
  tone: 'amber',
  priority: 999,
  is_active: true,
  starts_at: '2026-11-25T00:00:00Z',
}

export default function SiteAnnouncementBanner({
  onNavigate,
  className = '',
  audience = 'all',
  locale = 'en',
}: SiteAnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<DatabaseAnnouncement[]>(BASELINE_ANNOUNCEMENTS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissedSlugs, setDismissedSlugs] = useState<Set<string>>(() => {
    const set = new Set<string>()
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem('khelgrid_dismissed_announcements')
        if (stored) {
          JSON.parse(stored).forEach((s: string) => set.add(s))
        }
      } catch {
        // Fallback to empty
      }
    }
    return set
  })

  const syncFromRegulatoryState = useCallback((fallbackList: DatabaseAnnouncement[]) => {
    const adminBanners = getLiveAdminBannersForAudience(audience, locale)
    const baseList: DatabaseAnnouncement[] =
      adminBanners !== null ? adminBanners : fallbackList

    if (isPlatformMaintenanceActive()) {
      setAnnouncements([MAINTENANCE_NOTICE_ITEM, ...baseList])
    } else {
      setAnnouncements(baseList)
    }
  }, [audience, locale])

  useEffect(() => {
    let active = true
    let cachedFallback = BASELINE_ANNOUNCEMENTS

    syncFromRegulatoryState(cachedFallback)

    getCachedAnnouncements().then(res => {
      if (active && res.status === 'ready' && res.data.length > 0) {
        cachedFallback = res.data
        syncFromRegulatoryState(cachedFallback)
      }
    })

    const unsubscribe = subscribeRegulatoryState(() => {
      if (active) {
        syncFromRegulatoryState(cachedFallback)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [syncFromRegulatoryState])

  // Auto-cycle if there are multiple active announcements
  useEffect(() => {
    const activeList = announcements.filter(a => !dismissedSlugs.has(a.slug))
    if (activeList.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeList.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [announcements, dismissedSlugs])

  const visibleList = announcements.filter(a => !dismissedSlugs.has(a.slug))
  if (!visibleList.length) return null

  const current = visibleList[currentIndex % visibleList.length]

  function handleDismiss() {
    setDismissedSlugs(prev => {
      const next = new Set(prev)
      next.add(current.slug)
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            'khelgrid_dismissed_announcements',
            JSON.stringify(Array.from(next)),
          )
        } catch {
          // Ignore
        }
      }
      return next
    })
  }

  function handleCtaClick(e: MouseEvent<HTMLAnchorElement>) {
    if (current.cta_url.startsWith('/') && onNavigate) {
      onNavigate(e, current.cta_url)
    }
  }

  return (
    <aside
      className={`site-announcement-banner tone-${current.tone} ${className}`}
      role="region"
      aria-label="Seasonal announcement"
    >
      <div className="announcement-inner">
        <div className="announcement-content">
          <span className="announcement-badge">
            <span className="announcement-live-dot" aria-hidden="true" />
            {current.badge}
          </span>
          <span className="announcement-title">{current.title}</span>
          {current.subtitle && (
            <span className="announcement-subtitle">· {current.subtitle}</span>
          )}
        </div>

        <div className="announcement-actions">
          <a
            href={current.cta_url}
            className="announcement-cta"
            onClick={handleCtaClick}
          >
            <span>{current.cta_label}</span>
            <SiteIcon name="arrow-up-right" size={14} />
          </a>

          <button
            type="button"
            className="announcement-close"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            title="Dismiss announcement"
          >
            <SiteIcon name="close" size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
