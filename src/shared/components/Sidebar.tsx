import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { navigationModules, type NavigationItem } from '../navigation/navigationRegistry'
import { useSavedItems } from '../services/savedService'
import { SiteIcon, type SiteIconName } from './SiteIcon'
import {
  getCollapsedRailGroups,
  getModulesForMode,
  isSidebarItemActive,
  resolveSidebarModeForPath,
  shouldShowSportsCvPromo,
  stripLeadingPlus,
  type SidebarMode,
} from './sidebarUtils'
import './Sidebar.css'

type SidebarProps = {
  activePath: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  open: boolean
  onClose: () => void
  toggleRef: RefObject<HTMLButtonElement | null>
  collapsed: boolean
  onToggleCollapsed?: () => void
  onOpenIntake?: () => void
  onOpenAuth?: (tab?: 'login' | 'signup') => void
  isLoggedIn?: boolean
}

const SIDEBAR_SECTIONS_STORAGE_KEY = 'khelgrid-sidebar-sections-v3'
const SIDEBAR_PROMO_DISMISSED_KEY = 'khelgrid-sidebar-promo-dismissed'

function SidebarLink({
  item,
  activePath,
  onNavigate,
  onClose,
  collapsed = false,
  isLoggedIn = false,
  onOpenAuth,
  savedCount = 0,
}: {
  item: NavigationItem
  activePath: string
  onNavigate: SidebarProps['onNavigate']
  onClose?: () => void
  collapsed?: boolean
  isLoggedIn?: boolean
  onOpenAuth?: (tab?: 'login' | 'signup') => void
  savedCount?: number
}) {
  const { t } = useTranslation(['navigation', 'common'])
  const active = isSidebarItemActive(item.href, activePath)
  let itemLabel = t(item.id, item.label)
  if (!isLoggedIn && item.id === 'for-you') {
    itemLabel = `${itemLabel} (Sign In)`
  }

  const tooltipTitle = item.id === 'saved' && savedCount > 0 ? `${itemLabel} (${savedCount})` : itemLabel
  const comingSoonText = t('comingSoon', { ns: 'common', defaultValue: 'Coming soon' })

  const label = (
    <>
      <span className="sidebar-icon" aria-hidden="true">
        <SiteIcon name={item.icon} size={18} />
        {collapsed && item.id === 'saved' && savedCount > 0 && (
          <span className="sidebar-rail-count-dot" aria-hidden="true">
            {savedCount > 9 ? '9+' : savedCount}
          </span>
        )}
      </span>
      <span className="sidebar-link-label">{itemLabel}</span>
      {item.id === 'saved' && savedCount > 0 && !collapsed && (
        <span className="sidebar-count-badge">{savedCount}</span>
      )}
      {!item.available && !collapsed ? (
        <span className="sidebar-coming-soon">{comingSoonText}</span>
      ) : null}
    </>
  )

  if (!item.available) {
    return (
      <div className="sidebar-item-wrap">
        <span
          className="sidebar-link is-disabled"
          aria-disabled="true"
          data-tooltip={collapsed ? `${tooltipTitle} — ${comingSoonText}` : undefined}
          title={collapsed ? `${tooltipTitle} — ${comingSoonText}` : comingSoonText}
        >
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="sidebar-item-wrap">
      <a
        href={item.href}
        className={active ? 'sidebar-link is-active' : 'sidebar-link'}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? tooltipTitle : undefined}
        data-tooltip={collapsed ? tooltipTitle : undefined}
        title={collapsed ? tooltipTitle : undefined}
        onClick={event => {
          if (!isLoggedIn && item.id === 'for-you') {
            onNavigate(event, item.href)
            onClose?.()
            onOpenAuth?.('signup')
            return
          }
          onNavigate(event, item.href)
          onClose?.()
        }}
      >
        {label}
      </a>
    </div>
  )
}

export default function Sidebar({
  activePath,
  onNavigate,
  open,
  onClose,
  toggleRef,
  collapsed,
  onToggleCollapsed,
  onOpenIntake,
  onOpenAuth,
  isLoggedIn = false,
}: SidebarProps) {
  const { t } = useTranslation(['navigation', 'common'])
  const { count: savedCount } = useSavedItems()
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => resolveSidebarModeForPath(activePath))
  const [promoDismissed, setPromoDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(SIDEBAR_PROMO_DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {
      'your-space': true,
      discover: true,
      'play-train': false,
      'athlete-tools': false,
      'partner-saas': true,
      'learn-community': false,
      network: false,
    }
    if (typeof window === 'undefined') return defaults
    try {
      const saved = window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY)
      return saved ? { ...defaults, ...(JSON.parse(saved) as Record<string, boolean>) } : defaults
    } catch {
      return defaults
    }
  })

  // Persist section preferences
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(expandedSections))
    } catch {
      // Storage is optional; keep in-memory state.
    }
  }, [expandedSections])

  // Sync sidebar audience mode and active accordion section on route change
  useEffect(() => {
    const targetMode = resolveSidebarModeForPath(activePath)
    if (targetMode === 'partner') {
      setSidebarMode('partner')
    }
    const activeModule = navigationModules.find(section =>
      section.items.some(item => isSidebarItemActive(item.href, activePath)),
    )
    if (activeModule) {
      setExpandedSections(previous =>
        previous[activeModule.id] ? previous : { ...previous, [activeModule.id]: true },
      )
    }
  }, [activePath])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Move focus to close button when mobile drawer opens
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const rafId = window.requestAnimationFrame(() => {
      closeRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [open])

  // Keyboard focus trap + Escape for mobile drawer
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const drawer = drawerRef.current
      if (!drawer) return
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href]:not([aria-disabled="true"]), button:not(:disabled), [tabindex="0"]',
        ),
      ).filter(element => element.offsetParent !== null)
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, toggleRef])

  // Close tablet overlay sidebar with Escape when expanded on medium viewports (701px - 1023px)
  useEffect(() => {
    if (collapsed || !onToggleCollapsed || typeof window === 'undefined') return
    function handleTabletEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const isTabletOverlay = window.matchMedia('(min-width: 701px) and (max-width: 1023px)').matches
      if (isTabletOverlay) {
        event.preventDefault()
        onToggleCollapsed?.()
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleTabletEscape)
    return () => document.removeEventListener('keydown', handleTabletEscape)
  }, [collapsed, onToggleCollapsed, toggleRef])

  const visibleModules = useMemo(
    () => getModulesForMode(navigationModules, sidebarMode),
    [sidebarMode],
  )
  const railGroups = useMemo(() => getCollapsedRailGroups(navigationModules), [])

  const rawListLabel = t('listOnKhelgrid', { ns: 'common', defaultValue: 'List on KhelGrid' })
  const cleanListLabel = stripLeadingPlus(rawListLabel)
  const showPromo = shouldShowSportsCvPromo(activePath, promoDismissed)

  function handleDismissPromo() {
    setPromoDismissed(true)
    try {
      window.localStorage.setItem(SIDEBAR_PROMO_DISMISSED_KEY, 'true')
    } catch {
      // Optional persistence
    }
  }

  const mobileItems: { label: string; href: string; icon: SiteIconName }[] = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Sports', href: '/sports', icon: 'sports' },
    { label: 'Trials', href: '/opportunities', icon: 'opportunities' },
    { label: 'Venues', href: '/venues', icon: 'venues' },
    { label: 'Search', href: '/search', icon: 'search' },
  ]

  function renderModeSwitcher(prefix: string) {
    return (
      <div
        className="sidebar-mode-switcher"
        role="tablist"
        aria-label={t('sidebarModeLabel', { ns: 'navigation', defaultValue: 'Navigation workspace mode' })}
      >
        <button
          id={`${prefix}-mode-athlete`}
          type="button"
          role="tab"
          aria-selected={sidebarMode === 'athlete'}
          className={sidebarMode === 'athlete' ? 'sidebar-mode-btn is-active' : 'sidebar-mode-btn'}
          onClick={() => setSidebarMode('athlete')}
        >
          {t('modeAthlete', { ns: 'navigation', defaultValue: 'Athlete' })}
        </button>
        <button
          id={`${prefix}-mode-partner`}
          type="button"
          role="tab"
          aria-selected={sidebarMode === 'partner'}
          className={sidebarMode === 'partner' ? 'sidebar-mode-btn is-active' : 'sidebar-mode-btn'}
          onClick={() => {
            setSidebarMode('partner')
            setExpandedSections(prev => ({ ...prev, 'partner-saas': true }))
          }}
        >
          {t('modePartner', { ns: 'navigation', defaultValue: 'Partner Suite' })}
        </button>
      </div>
    )
  }

  function renderSportsCvPromo(mobile = false) {
    if (!showPromo) return null
    return (
      <div className="sidebar-promo">
        <div className="sidebar-promo-head">
          <strong>{t('promoTitle', 'Build your athlete profile')}</strong>
          <button
            type="button"
            className="sidebar-promo-dismiss"
            onClick={handleDismissPromo}
            aria-label={t('dismissPromo', { ns: 'common', defaultValue: 'Dismiss Sports CV card' })}
            title={t('dismissPromo', { ns: 'common', defaultValue: 'Dismiss' })}
          >
            <SiteIcon name="close" size={13} />
          </button>
        </div>
        <p>{t('promoText', 'Create a Sports CV and prepare a profile-ready PDF on your device.')}</p>
        <a
          href="/sports-cv"
          onClick={event => {
            onNavigate(event, '/sports-cv')
            if (mobile) onClose()
          }}
        >
          <span>{t('openSportsCv', 'Open Sports CV')}</span>
          <SiteIcon name="arrow-up-right" size={13} />
        </a>
      </div>
    )
  }

  function renderSections(mobile = false) {
    if (collapsed && !mobile) {
      return (
        <div className="sidebar-rail-links" aria-label="Core KhelGrid navigation">
          {railGroups.map(group => (
            <div className="sidebar-rail-group" key={group.id} aria-label={group.label}>
              {group.items.map(item => (
                <SidebarLink
                  key={item.id}
                  item={item}
                  activePath={activePath}
                  onNavigate={onNavigate}
                  onClose={onClose}
                  collapsed
                  isLoggedIn={isLoggedIn}
                  onOpenAuth={onOpenAuth}
                  savedCount={savedCount}
                />
              ))}
            </div>
          ))}
        </div>
      )
    }

    return (
      <>
        {visibleModules.map(section => {
          const expanded = expandedSections[section.id] ?? false
          const sectionLabel = t(section.id, section.label)
          return (
            <section
              className={expanded ? 'sidebar-module is-expanded' : 'sidebar-module'}
              key={section.id}
              aria-label={sectionLabel}
            >
              <button
                className="sidebar-module-toggle"
                type="button"
                aria-expanded={expanded}
                aria-controls={`${mobile ? 'mobile-' : ''}nav-section-${section.id}`}
                onClick={() =>
                  setExpandedSections(previous => ({ ...previous, [section.id]: !expanded }))
                }
              >
                <span className="sidebar-module-heading-icon" aria-hidden="true">
                  <SiteIcon name={section.icon} size={16} />
                </span>
                <span className="sidebar-module-label">{sectionLabel}</span>
                <SiteIcon name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
              </button>
              {expanded ? (
                <div
                  id={`${mobile ? 'mobile-' : ''}nav-section-${section.id}`}
                  className="sidebar-module-items"
                >
                  {section.items.map(item => (
                    <SidebarLink
                      key={item.id}
                      item={item}
                      activePath={activePath}
                      onNavigate={onNavigate}
                      onClose={mobile ? onClose : undefined}
                      collapsed={false}
                      isLoggedIn={isLoggedIn}
                      onOpenAuth={onOpenAuth}
                      savedCount={savedCount}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
        {renderSportsCvPromo(mobile)}
      </>
    )
  }

  return (
    <>
      {/* Mobile drawer backdrop */}
      <button
        className={open ? 'sidebar-backdrop is-visible' : 'sidebar-backdrop'}
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => {
          onClose()
          toggleRef.current?.focus()
        }}
      />

      {/* Tablet overlay backdrop (701px - 1023px when desktop sidebar is expanded) */}
      {onToggleCollapsed && (
        <button
          className={!collapsed ? 'sidebar-tablet-backdrop is-visible' : 'sidebar-tablet-backdrop'}
          type="button"
          aria-label="Collapse sidebar navigation"
          aria-hidden={collapsed}
          tabIndex={!collapsed ? 0 : -1}
          onClick={() => {
            onToggleCollapsed()
            toggleRef.current?.focus()
          }}
        />
      )}

      {/* Desktop persistent sidebar */}
      <aside
        id="app-sidebar"
        className={collapsed ? 'app-sidebar is-collapsed' : 'app-sidebar'}
        aria-label="Sidebar navigation"
        data-sidebar-mode={sidebarMode}
      >
        {!collapsed && renderModeSwitcher('desktop')}

        <nav className="sidebar-navigation" aria-label="Feature navigation">
          {renderSections(false)}
        </nav>

        <div className="sidebar-bottom">
          {collapsed && onToggleCollapsed && (
            <button
              type="button"
              className="sidebar-utility-link sidebar-expand-btn"
              onClick={onToggleCollapsed}
              title={t('expandSidebar', { ns: 'navigation', defaultValue: 'Expand sidebar' })}
              aria-label={t('expandSidebar', { ns: 'navigation', defaultValue: 'Expand sidebar' })}
              data-tooltip={t('expandSidebar', { ns: 'navigation', defaultValue: 'Expand sidebar' })}
            >
              <SiteIcon name="chevron-right" size={18} />
            </button>
          )}
          {onOpenIntake && (
            <button
              type="button"
              className="sidebar-utility-link sidebar-intake-btn"
              onClick={onOpenIntake}
              title={cleanListLabel}
              aria-label={cleanListLabel}
              data-tooltip={collapsed ? cleanListLabel : undefined}
            >
              <SiteIcon name="plus" size={18} />
              <span className="sidebar-utility-label">{cleanListLabel}</span>
            </button>
          )}
          <a
            className="sidebar-utility-link"
            href="/help-feedback"
            aria-label="Help and feedback"
            title={t('helpAndFeedback', 'Help & feedback')}
            data-tooltip={collapsed ? t('helpAndFeedback', 'Help & feedback') : undefined}
            onClick={event => onNavigate(event, '/help-feedback')}
          >
            <SiteIcon name="help-circle" size={18} />
            <span className="sidebar-utility-label">{t('helpAndFeedback', 'Help & feedback')}</span>
          </a>
          {!collapsed ? <span className="sidebar-bottom-note">KhelGrid · India</span> : null}
        </div>
      </aside>

      {/* Mobile slide-over navigation drawer */}
      <div
        ref={drawerRef}
        id="mobile-sidebar-drawer"
        className={open ? 'mobile-drawer is-open' : 'mobile-drawer'}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label="Mobile navigation"
      >
        <div className="mobile-drawer-header">
          <a
            href="/"
            className="mobile-drawer-brand"
            onClick={event => {
              onNavigate(event, '/')
              onClose()
            }}
            aria-label="KhelGrid home"
          >
            <img
              src="/assets/kg-logo.webp"
              alt="KhelGrid Platform Logo"
              className="mobile-drawer-logo"
              width="26"
              height="26"
              loading="lazy"
              decoding="async"
            />
            <span className="mobile-drawer-brand-name">KHELGRID</span>
          </a>
          <button
            ref={closeRef}
            className="sidebar-mobile-close"
            type="button"
            onClick={() => {
              onClose()
              toggleRef.current?.focus()
            }}
            aria-label="Close navigation"
          >
            <SiteIcon name="close" size={20} />
          </button>
        </div>

        <div className="mobile-drawer-controls">
          {renderModeSwitcher('mobile')}
          <div className="mobile-drawer-quick-nav" aria-label={t('quickNavigation', { ns: 'navigation', defaultValue: 'Quick navigation links' })}>
            <a
              href="/live"
              className={`mobile-quick-chip ${activePath === '/live' || activePath === '/live-scores' || activePath.startsWith('/live/') ? 'is-active' : ''}`}
              onClick={e => {
                onNavigate(e, '/live')
                onClose()
              }}
            >
              <SiteIcon name="activity" size={14} />
              <span>{t('live-scores', { ns: 'navigation', defaultValue: 'Live Scores' })}</span>
            </a>
            <a
              href="/play"
              className={`mobile-quick-chip ${activePath === '/play' || activePath.startsWith('/play/') ? 'is-active' : ''}`}
              onClick={e => {
                onNavigate(e, '/play')
                onClose()
              }}
            >
              <SiteIcon name="sports" size={14} />
              <span>{t('find-games', { ns: 'navigation', defaultValue: 'Find Games' })}</span>
            </a>
          </div>
        </div>

        <nav className="sidebar-navigation" aria-label="Mobile feature navigation">
          {renderSections(true)}
        </nav>

        <div className="sidebar-bottom">
          {onOpenIntake && (
            <button
              type="button"
              className="sidebar-utility-link sidebar-intake-btn"
              onClick={() => {
                onClose()
                onOpenIntake()
              }}
              title={cleanListLabel}
              aria-label={cleanListLabel}
            >
              <SiteIcon name="plus" size={18} />
              <span className="sidebar-utility-label">{cleanListLabel}</span>
            </button>
          )}
          <a
            className="sidebar-utility-link"
            href="/help-feedback"
            aria-label="Help and feedback"
            onClick={event => {
              onNavigate(event, '/help-feedback')
              onClose()
            }}
          >
            <SiteIcon name="help-circle" size={18} />
            <span className="sidebar-utility-label">{t('helpAndFeedback', 'Help & feedback')}</span>
          </a>
          <span className="sidebar-bottom-note">KhelGrid · India</span>
        </div>
      </div>

      {/* Mobile bottom quick navigation */}
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {mobileItems.map(item => {
          const itemKey = item.href === '/' ? 'home' : item.href.replace('/', '')
          const itemLabel = t(`mobileNav.${itemKey}`, { defaultValue: item.label })
          const active = isSidebarItemActive(item.href, activePath)
          return (
            <a
              key={item.href}
              href={item.href}
              className={active ? 'mobile-bottom-link is-active' : 'mobile-bottom-link'}
              aria-current={active ? 'page' : undefined}
              aria-label={itemLabel}
              onClick={event => onNavigate(event, item.href)}
            >
              <SiteIcon name={item.icon} size={20} />
              <small>{itemLabel}</small>
            </a>
          )
        })}
      </nav>
    </>
  )
}
