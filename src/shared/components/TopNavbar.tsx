import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import NavbarSettingsMenu from './NavbarSettingsMenu'
import { SiteIcon } from './SiteIcon'
import {
  TOP_NAV_SUBMIT_ACTIONS,
  formatUnreadBadge,
  resolveRoleHubLink,
} from './topNavActions'

export interface TopNavbarProps {
  path: string
  isMobile: boolean
  menuOpen: boolean
  sidebarCollapsed: boolean
  menuToggleRef: RefObject<HTMLButtonElement | null>
  onToggleMainMenu: () => void
  onNavigate: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
  onOpenSearch: () => void
  onOpenNotifications: () => void
  unreadNotifCount: number
  onOpenFeedback: () => void
  authUser: AuthUserProfile | null
  userMenuOpen: boolean
  onToggleUserMenu: () => void
  onCloseUserMenu: () => void
  onOpenLogin: () => void
  onSignOut: () => void
  onOpenGoPro: () => void
}

export default function TopNavbar({
  path,
  isMobile,
  menuOpen,
  sidebarCollapsed,
  menuToggleRef,
  onToggleMainMenu,
  onNavigate,
  onOpenSearch,
  onOpenNotifications,
  unreadNotifCount,
  onOpenFeedback,
  authUser,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  onOpenLogin,
  onSignOut,
  onOpenGoPro,
}: TopNavbarProps) {
  const { t } = useTranslation(['common', 'navigation'])
  const [submitMenuOpen, setSubmitMenuOpen] = useState(false)
  const submitWrapRef = useRef<HTMLDivElement>(null)
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const userMenuWrapRef = useRef<HTMLDivElement>(null)

  const hubLink = resolveRoleHubLink(authUser?.role, path)
  const unreadBadge = formatUnreadBadge(unreadNotifCount)

  useEffect(() => {
    setSubmitMenuOpen(false)
  }, [path])

  useEffect(() => {
    if (!submitMenuOpen && !userMenuOpen) return

    function handleOutsideClick(event: globalThis.MouseEvent) {
      const target = event.target as Node
      if (submitMenuOpen && submitWrapRef.current && !submitWrapRef.current.contains(target)) {
        setSubmitMenuOpen(false)
      }
      if (userMenuOpen && userMenuWrapRef.current && !userMenuWrapRef.current.contains(target)) {
        onCloseUserMenu()
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (submitMenuOpen) {
        setSubmitMenuOpen(false)
        submitTriggerRef.current?.focus()
      }
      if (userMenuOpen) {
        onCloseUserMenu()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [submitMenuOpen, userMenuOpen, onCloseUserMenu])

  const isSubmitRouteActive =
    path === '/submit-listing' || path === '/khelchronicle/submit'

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {/* Zone 1: Menu toggle, Brand wordmark & Primary links */}
        <div className="header-zone header-zone-left">
          <button
            ref={menuToggleRef}
            className="menu-toggle"
            type="button"
            aria-expanded={isMobile ? menuOpen : !sidebarCollapsed}
            aria-controls={isMobile ? 'mobile-sidebar-drawer' : 'app-sidebar'}
            onClick={onToggleMainMenu}
            aria-label="Toggle main navigation"
          >
            <SiteIcon name={isMobile && menuOpen ? 'close' : 'menu'} size={20} />
          </button>

          <a
            className="brand"
            href="/"
            onClick={event => onNavigate(event, '/')}
            aria-label="KhelGrid home"
          >
            <img
              className="brand-logo"
              src="/assets/kg-logo.webp"
              alt="KhelGrid Platform Logo"
              width="32"
              height="32"
              fetchPriority="high"
            />
            <span>KHELGRID</span>
          </a>

          <span className="header-divider" aria-hidden="true" />

          <div className="header-primary-links">
            <a
              href="/play"
              className={`header-play-pill ${path === '/play' ? 'is-active' : ''}`}
              aria-current={path === '/play' ? 'page' : undefined}
              onClick={event => onNavigate(event, '/play')}
              title={t('findGames', {
                ns: 'navigation',
                defaultValue: 'Play pickup games & community matches',
              })}
            >
              <SiteIcon name="users" size={15} />
              <span>{t('play', 'Play')}</span>
            </a>

            <a
              href={hubLink.href}
              className={`header-play-pill header-saas-pill ${hubLink.isActive ? 'is-active' : ''}`}
              aria-current={hubLink.isActive ? 'page' : undefined}
              onClick={event => onNavigate(event, hubLink.href)}
              title={hubLink.title}
            >
              <SiteIcon name={hubLink.icon} size={15} />
              <span>{hubLink.label}</span>
            </a>
          </div>
        </div>

        {/* Zone 2: Centered Spotlight Command Search on Large Screens */}
        <div className="header-zone header-zone-center">
          <button
            className="header-icon-button header-search-trigger"
            type="button"
            onClick={onOpenSearch}
            aria-label={t('searchCatalogueAria', 'Search KhelGrid catalogue')}
            title="Search KhelGrid (Ctrl+K)"
          >
            <SiteIcon name="search" size={17} />
            <span className="header-search-placeholder">
              {t('searchKhelgrid', 'Search KhelGrid')}…
            </span>
            <kbd className="header-search-kbd" aria-hidden="true">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Zone 3: Consolidated Submit Menu, Utilities, Account & Single Primary CTA */}
        <div className="header-zone header-zone-right">
          <div ref={submitWrapRef} className="header-submit-menu-wrap">
            <button
              ref={submitTriggerRef}
              type="button"
              className={`header-submit-trigger ${submitMenuOpen ? 'is-open' : ''} ${isSubmitRouteActive ? 'is-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={submitMenuOpen}
              aria-controls="header-submit-popover"
              onClick={() => setSubmitMenuOpen(open => !open)}
              title="List a venue, trial, coach, academy or research paper on KhelGrid"
            >
              <SiteIcon name="plus" size={15} />
              <span className="header-submit-trigger-label">
                {t('listOnKhelgridShort', 'List & Submit')}
              </span>
              <SiteIcon
                name="chevron-down"
                size={14}
                className={`header-submit-chevron ${submitMenuOpen ? 'is-rotated' : ''}`}
              />
            </button>

            <nav
              id="header-submit-popover"
              className={`header-actions header-submit-popover ${submitMenuOpen ? 'is-open' : ''}`}
              aria-label="KhelGrid actions"
              aria-hidden={!submitMenuOpen}
            >
              <div className="header-submit-popover-head">
                <strong>Contribute to KhelGrid</strong>
                <span>Free evidence-backed listing &amp; research intake</span>
              </div>
              <div className="header-submit-popover-list">
                {TOP_NAV_SUBMIT_ACTIONS.map(action => {
                  const label = t(action.translationKey, action.defaultLabel)
                  return (
                    <a
                      key={action.id}
                      className={action.className}
                      href={action.href}
                      tabIndex={submitMenuOpen ? 0 : -1}
                      onClick={event => {
                        setSubmitMenuOpen(false)
                        onNavigate(event, action.href)
                      }}
                      title={action.title}
                      aria-label={label}
                    >
                      <span className="header-action-icon-box" aria-hidden="true">
                        <SiteIcon name={action.icon} size={16} />
                      </span>
                      <span className="header-action-copy">
                        <span className="header-action-title">{label}</span>
                        <small className="header-action-desc">{action.description}</small>
                      </span>
                      <SiteIcon
                        name="arrow-up-right"
                        size={14}
                        className="header-action-arrow"
                      />
                    </a>
                  )
                })}
              </div>
            </nav>
          </div>

          <span className="header-divider header-divider-utilities" aria-hidden="true" />

          <div className="header-utility-cluster">
            <button
              className="header-icon-button header-notif-trigger"
              type="button"
              onClick={onOpenNotifications}
              aria-label={t('notifications', 'Notifications')}
              title={t('notifications', 'Notifications')}
            >
              <SiteIcon name="bell" size={18} />
              {unreadBadge && (
                <span className="header-notif-badge">{unreadBadge}</span>
              )}
            </button>

            <NavbarSettingsMenu
              onNavigate={onNavigate}
              onOpenFeedback={onOpenFeedback}
            />
          </div>

          {authUser ? (
            <div ref={userMenuWrapRef} className="header-user-menu-wrap">
              <button
                className="header-user-btn"
                type="button"
                onClick={onToggleUserMenu}
                aria-expanded={userMenuOpen}
                aria-label={`User account menu for ${authUser.fullName}`}
                title={`Signed in as ${authUser.fullName} (${authUser.role})`}
              >
                <span className="header-user-avatar">
                  {authUser.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser.fullName || 'User Avatar'}
                      width="32"
                      height="32"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    authUser.fullName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="header-user-details">
                  <span className="header-user-name">{authUser.fullName.split(' ')[0]}</span>
                  <span className="header-user-role-badge">{authUser.role}</span>
                </span>
                <SiteIcon name="chevron-down" size={13} className="header-user-chevron" />
              </button>

              {userMenuOpen && (
                <div className="header-user-dropdown" role="menu">
                  <div className="header-user-dropdown-header">
                    <strong>{authUser.fullName}</strong>
                    <small>{authUser.email}</small>
                    <span className="header-user-role-pill">{authUser.role.toUpperCase()}</span>
                  </div>
                  <div className="header-user-dropdown-divider" />
                  <a
                    href="/dashboard"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/dashboard')
                    }}
                  >
                    <SiteIcon name="chart" size={15} />
                    <span>My Dashboard</span>
                  </a>
                  <a
                    href={`/u/@${authUser.fullName.toLowerCase().replace(/\s+/g, '-')}`}
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, `/u/@${authUser.fullName.toLowerCase().replace(/\s+/g, '-')}`)
                    }}
                  >
                    <SiteIcon name="user-round" size={15} />
                    <span>My Athlete Profile</span>
                  </a>
                  <a
                    href="/saved"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/saved')
                    }}
                  >
                    <SiteIcon name="bookmark" size={15} />
                    <span>Saved Deadlines</span>
                  </a>
                  {authUser.role === 'coach' && (
                    <a
                      href="/coach-dashboard"
                      className="header-user-dropdown-item"
                      role="menuitem"
                      onClick={e => {
                        onCloseUserMenu()
                        onNavigate(e, '/coach-dashboard')
                      }}
                    >
                      <SiteIcon name="award" size={15} />
                      <span>Coach Operations Hub</span>
                    </a>
                  )}
                  {(authUser.role === 'coach' || authUser.role === 'admin' || authUser.role === 'host') && (
                    <a
                      href="/tournament-ops"
                      className="header-user-dropdown-item"
                      role="menuitem"
                      onClick={e => {
                        onCloseUserMenu()
                        onNavigate(e, '/tournament-ops')
                      }}
                    >
                      <SiteIcon name="trophy" size={15} />
                      <span>Tournament Operations</span>
                    </a>
                  )}
                  {(authUser.role === 'academy' || authUser.role === 'host' || authUser.role === 'venue_owner' || authUser.role === 'admin') && (
                    <>
                      <a
                        href="/academy-hub"
                        className="header-user-dropdown-item"
                        role="menuitem"
                        onClick={e => {
                          onCloseUserMenu()
                          onNavigate(e, '/academy-hub')
                        }}
                      >
                        <SiteIcon name="building" size={15} />
                        <span>Academy Admissions Hub</span>
                      </a>
                      <a
                        href="/host"
                        className="header-user-dropdown-item"
                        role="menuitem"
                        onClick={e => {
                          onCloseUserMenu()
                          onNavigate(e, '/host')
                        }}
                      >
                        <SiteIcon name="calendar-check" size={15} />
                        <span>Host &amp; Partner Dashboard</span>
                      </a>
                    </>
                  )}
                  <a
                    href="/parent-portal"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/parent-portal')
                    }}
                  >
                    <SiteIcon name="shield-check" size={15} />
                    <span>Parent &amp; Athlete Passbook</span>
                  </a>
                  <a
                    href="/settings"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/settings')
                    }}
                  >
                    <SiteIcon name="sliders" size={15} />
                    <span>Account Settings</span>
                  </a>
                  <div className="header-user-dropdown-divider" />
                  <button
                    type="button"
                    className="header-user-dropdown-item is-signout"
                    role="menuitem"
                    onClick={() => {
                      onCloseUserMenu()
                      onSignOut()
                    }}
                  >
                    <SiteIcon name="close" size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="header-login-link"
              type="button"
              onClick={onOpenLogin}
              aria-label="Your profile"
              title="Sign in to your account or register as an Academy / Turf Partner"
            >
              <SiteIcon name="user-round" size={16} />
              <span>{t('login', 'Sign In')}</span>
            </button>
          )}

          <a
            className="header-go-pro"
            href="/pricing"
            onClick={event => {
              event.preventDefault()
              onOpenGoPro()
            }}
          >
            <SiteIcon name="star" size={15} />
            <span>{t('goPro', 'Go Pro')}</span>
          </a>
        </div>
      </div>
    </header>
  )
}
