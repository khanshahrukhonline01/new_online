import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import NavbarSettingsMenu from './NavbarSettingsMenu'
import { SiteIcon } from './SiteIcon'
import {
  TOP_NAV_SUBMIT_ACTIONS,
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
  onOpenFeedback: () => void
  authUser: AuthUserProfile | null
  userMenuOpen: boolean
  onToggleUserMenu: () => void
  onCloseUserMenu: () => void
  onOpenLogin: () => void
  onOpenSignup: () => void
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
  onOpenFeedback,
  authUser,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  onOpenLogin,
  onOpenSignup,
  onSignOut,
  onOpenGoPro,
}: TopNavbarProps) {
  const { t } = useTranslation(['common', 'navigation'])
  const userMenuWrapRef = useRef<HTMLDivElement>(null)
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const listingAction = TOP_NAV_SUBMIT_ACTIONS.find(action => action.id === 'all')
  const paperAction = TOP_NAV_SUBMIT_ACTIONS.find(action => action.id === 'chronicle')

  useEffect(() => {
    if (!userMenuOpen) return

    function handleOutsideClick(event: globalThis.MouseEvent) {
      const target = event.target as Node
      if (userMenuOpen && userMenuWrapRef.current && !userMenuWrapRef.current.contains(target)) {
        onCloseUserMenu()
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (userMenuOpen) {
        onCloseUserMenu()
        userMenuTriggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen, onCloseUserMenu])

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {/* Zone 1: Persistent menu toggle and KhelGrid brand */}
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
              alt=""
              width="32"
              height="32"
              fetchPriority="high"
            />
            <span>KHELGRID</span>
          </a>
        </div>

        {/* Zone 2: Primary athlete/consumer areas — one horizontal navigation line */}
        <nav className="header-zone header-zone-center header-primary-links" aria-label="Primary KhelGrid sections">
          {[
            { label: 'Play', href: '/play' },
            { label: 'Athlete', href: '/sports-cv' },
          ].map(item => {
            const active = path === item.href || path.startsWith(`${item.href}/`)
            return (
              <a
                key={item.href}
                className={`header-primary-link${item.href === '/play' ? ' header-play-pill' : ''}${active ? ' is-active' : ''}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={event => onNavigate(event, item.href)}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* Zone 3: Consolidated Submit Menu, Utilities, Account & Single Primary CTA */}
        <div className="header-zone header-zone-right">
          <button
            className="header-icon-button header-search-trigger header-search-icon-only"
            type="button"
            onClick={onOpenSearch}
            aria-label={t('searchCatalogueAria', 'Search KhelGrid catalogue')}
            title="Search KhelGrid (Ctrl or ⌘ + K)"
          >
            <SiteIcon name="search" size={17} />
          </button>

          <div className="header-partner-nav" aria-label="Partner and Institutional workspaces">
            <a
              className={`header-partner-link${path === '/organizations' || path.startsWith('/organizations/') ? ' is-active' : ''}`}
              href="/organizations"
              onClick={event => onNavigate(event, '/organizations')}
              title="Organizations & Academy SaaS Workspace"
            >
              Organizations
            </a>
            <a
              className={`header-partner-link${path === '/campaigns' || path.startsWith('/campaigns/') ? ' is-active' : ''}`}
              href="/campaigns"
              onClick={event => onNavigate(event, '/campaigns')}
              title="Sports Creator Campaign Marketplace"
            >
              Campaigns
            </a>
          </div>

          <span className="header-divider header-divider-partner" aria-hidden="true" />

          {listingAction && (
            <a
              className="header-submit-direct header-submit-listing"
              href={listingAction.href}
              onClick={event => onNavigate(event, listingAction.href)}
              title={listingAction.title}
              aria-label={t(listingAction.translationKey, listingAction.defaultLabel)}
            >
              <SiteIcon name={listingAction.icon} size={15} />
              <span>{t(listingAction.translationKey, listingAction.defaultLabel)}</span>
            </a>
          )}

          {paperAction && (
            <a
              className="header-submit-direct header-submit-paper header-action-chronicle"
              href={paperAction.href}
              onClick={event => onNavigate(event, paperAction.href)}
              title={paperAction.title}
              aria-label={t(paperAction.translationKey, paperAction.defaultLabel)}
            >
              <SiteIcon name={paperAction.icon} size={15} />
              <span>{t(paperAction.translationKey, paperAction.defaultLabel)}</span>
            </a>
          )}

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
            </button>

            <NavbarSettingsMenu
              onNavigate={onNavigate}
              onOpenFeedback={onOpenFeedback}
            />
          </div>

          {authUser ? (
            <div ref={userMenuWrapRef} className="header-user-menu-wrap">
              <button
                ref={userMenuTriggerRef}
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
                    href="/workspace"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/workspace')
                    }}
                  >
                    <SiteIcon name="chart" size={15} />
                    <span>Workspace</span>
                  </a>
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
                  <div className="header-user-dropdown-divider" />
                  <div className="header-user-dropdown-section-title" style={{ padding: '4px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>CREATOR ECONOMY</div>
                  <a
                    href="/creator"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/creator')
                    }}
                  >
                    <SiteIcon name="award" size={15} />
                    <span>Creator Delivery Hub</span>
                  </a>
                  <a
                    href="/campaigns"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, '/campaigns')
                    }}
                  >
                    <SiteIcon name="target" size={15} />
                    <span>Campaign Marketplace</span>
                  </a>
                  <div className="header-user-dropdown-divider" />
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
            <div ref={userMenuWrapRef} className="header-user-menu-wrap">
              <button ref={userMenuTriggerRef} className="header-account-icon-btn" type="button" onClick={onToggleUserMenu} aria-expanded={userMenuOpen} aria-controls="header-account-menu" aria-label="Your profile" title="Sign in to your account or register as an Academy / Turf Partner">
                <SiteIcon name="user-round" size={18} />
              </button>
              {userMenuOpen && (
                <div id="header-account-menu" className="header-user-dropdown header-guest-dropdown" role="menu">
                  <div className="header-user-dropdown-header"><strong>Your KhelGrid account</strong><small>Sign in to access your Workspace</small></div>
                  <div className="header-user-dropdown-divider" />
                  <button type="button" className="header-user-dropdown-item" role="menuitem" onClick={() => { onCloseUserMenu(); onOpenLogin() }}><SiteIcon name="user-round" size={15} /><span>Sign in</span></button>
                  <button type="button" className="header-user-dropdown-item" role="menuitem" onClick={() => { onCloseUserMenu(); onOpenSignup() }}><SiteIcon name="plus" size={15} /><span>Create account</span></button>
                </div>
              )}
            </div>
          )}

          <a
            className="header-go-pro"
            href="/pricing"
            aria-label="Explore KhelGrid Pro"
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
