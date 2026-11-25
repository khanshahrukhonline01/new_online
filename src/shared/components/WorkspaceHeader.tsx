import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import { isOperationalRoutePath } from '../routing'
import { useTenant } from '../context/useTenant'
import { useSavedItems } from '../services/savedService'
import NavbarSettingsMenu from './NavbarSettingsMenu'
import { SiteIcon } from './SiteIcon'
import { stripLeadingPlus } from './sidebarUtils'
import { TOP_NAV_SUBMIT_ACTIONS, formatUnreadBadge } from './topNavActions'
import {
  CANONICAL_WORKSPACES,
  getWorkspaceConfig,
  isWorkspaceHeaderMode,
  resolveActiveWorkspacePersona,
  resolveWorkspaceContextMenu,
  resolveWorkspaceHeaderKpis,
  type CanonicalWorkspaceId,
} from './workspaceHeaderEngine'
import { readWorkspaceSnapshot } from './workspaceHeaderMetrics'
import './WorkspaceHeader.css'

export interface WorkspaceHeaderProps {
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
  activePersona?: CanonicalWorkspaceId | null
  onPersonaChange?: (persona: CanonicalWorkspaceId) => void
  unreadNotifCount?: number
}

export default function WorkspaceHeader({
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
  activePersona: controlledPersona,
  onPersonaChange,
  unreadNotifCount = 0,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation(['common', 'navigation'])
  const { currentTenant, memberships } = useTenant()
  const { count: savedCount } = useSavedItems()

  const [localPersonaOverride, setLocalPersonaOverride] = useState<CanonicalWorkspaceId | null>(null)
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false)

  const userMenuWrapRef = useRef<HTMLDivElement>(null)
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const personaMenuWrapRef = useRef<HTMLDivElement>(null)
  const personaTriggerRef = useRef<HTMLButtonElement>(null)

  const effectiveOverride = controlledPersona ?? localPersonaOverride
  const isOperational = isOperationalRoutePath(path)

  const activePersona = useMemo(
    () =>
      resolveActiveWorkspacePersona({
        path,
        authUserRole: authUser?.role,
        overridePersona: effectiveOverride,
      }),
    [path, authUser?.role, effectiveOverride],
  )

  const activeConfig = useMemo(() => getWorkspaceConfig(activePersona), [activePersona])

  const workspaceMode = isWorkspaceHeaderMode({
    path,
    isOperationalRoute: isOperational,
    isAuthenticated: Boolean(authUser),
    hasExplicitPersonaOverride: Boolean(effectiveOverride),
  })

  const snapshot = useMemo(
    () =>
      readWorkspaceSnapshot({
        authUser,
        savedCount,
        unreadNotifCount,
        tenantCount: memberships.length,
        activeTenantName: currentTenant?.name ?? null,
        tenantVerificationStatus: currentTenant?.verification_status ?? null,
      }),
    [
      authUser,
      savedCount,
      unreadNotifCount,
      memberships.length,
      currentTenant?.name,
      currentTenant?.verification_status,
    ],
  )

  const headerKpis = useMemo(
    () => resolveWorkspaceHeaderKpis(activePersona, snapshot),
    [activePersona, snapshot],
  )

  const contextMenu = useMemo(
    () => resolveWorkspaceContextMenu(activePersona, Boolean(authUser)),
    [activePersona, authUser],
  )

  const listingAction = TOP_NAV_SUBMIT_ACTIONS.find(action => action.id === 'all')
  const unreadBadge = formatUnreadBadge(unreadNotifCount)

  // Close persona menu on route change
  useEffect(() => {
    setPersonaMenuOpen(false)
  }, [path])

  // Close menus on outside click & Escape
  useEffect(() => {
    if (!userMenuOpen && !personaMenuOpen) return

    function handleOutsideClick(event: globalThis.MouseEvent) {
      const target = event.target as Node
      if (userMenuOpen && userMenuWrapRef.current && !userMenuWrapRef.current.contains(target)) {
        onCloseUserMenu()
      }
      if (personaMenuOpen && personaMenuWrapRef.current && !personaMenuWrapRef.current.contains(target)) {
        setPersonaMenuOpen(false)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (personaMenuOpen) {
        setPersonaMenuOpen(false)
        personaTriggerRef.current?.focus()
      }
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
  }, [userMenuOpen, personaMenuOpen, onCloseUserMenu])

  function handleSelectPersona(nextPersona: CanonicalWorkspaceId) {
    setLocalPersonaOverride(nextPersona)
    onPersonaChange?.(nextPersona)
    setPersonaMenuOpen(false)

    // If the user is already inside a workspace shell or operational route, navigate straight into that workspace
    if (path.startsWith('/workspace')) {
      const nextConfig = getWorkspaceConfig(nextPersona)
      onNavigate(undefined, nextConfig.workspaceHref)
    }
  }

  return (
    <header
      className={`site-header kg-workspace-header${workspaceMode ? ' is-workspace-mode' : ''}`}
      data-active-persona={activePersona}
    >
      <div className="site-header-inner">
        {/* Zone 1: Persistent Sidebar Toggle, Brand & Unified Six-Workspace Context Switcher */}
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

          <div ref={personaMenuWrapRef} className="wh-persona-wrap">
            <button
              ref={personaTriggerRef}
              id="wh-persona-trigger"
              type="button"
              className={`wh-persona-trigger${workspaceMode ? ' is-workspace-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={personaMenuOpen}
              aria-controls="wh-persona-menu"
              onClick={() => {
                onCloseUserMenu()
                setPersonaMenuOpen(open => !open)
              }}
              aria-label={`Active workspace persona: ${activeConfig.label}. Switch workspace or open context menu`}
              title={`${activeConfig.label} Workspace (${activeConfig.subtitle})`}
            >
              <SiteIcon name={activeConfig.icon} size={14} />
              <span className="wh-persona-trigger-label">{activeConfig.shortLabel}</span>
              <SiteIcon name="chevron-down" size={12} className="wh-persona-chevron" />
            </button>

            {personaMenuOpen && (
              <div
                id="wh-persona-menu"
                className="wh-persona-popover"
                role="menu"
                aria-label="Workspace switcher and persona context menu"
              >
                <div className="wh-popover-head">
                  <span className="wh-popover-title">Switch KhelGrid Workspace</span>
                  <span className="wh-popover-entity">
                    {currentTenant?.name || (authUser ? authUser.fullName : 'All 6 Workspaces')}
                  </span>
                </div>

                <div className="wh-persona-grid" role="group" aria-label="Six KhelGrid workspaces">
                  {CANONICAL_WORKSPACES.map(ws => {
                    const isSelected = ws.id === activePersona
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        className={`wh-persona-option${isSelected ? ' is-active' : ''}`}
                        onClick={() => handleSelectPersona(ws.id)}
                      >
                        <span className="wh-persona-option-icon" aria-hidden="true">
                          <SiteIcon name={ws.icon} size={14} />
                        </span>
                        <span className="wh-persona-option-copy">
                          <strong>{ws.label}</strong>
                          <small>{ws.subtitle}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="wh-popover-section">
                  <div className="wh-popover-section-label">
                    <span>{activeConfig.label} Workspace Navigation</span>
                    <a
                      href={activeConfig.workspaceHref}
                      className="wh-context-tag"
                      onClick={e => {
                        setPersonaMenuOpen(false)
                        onNavigate(e, activeConfig.workspaceHref)
                      }}
                    >
                      Open Shell ↗
                    </a>
                  </div>
                  <div className="wh-context-list">
                    {contextMenu.pillars.map(item => (
                      <a
                        key={item.id}
                        href={item.href}
                        role="menuitem"
                        className="wh-context-link"
                        onClick={e => {
                          setPersonaMenuOpen(false)
                          onNavigate(e, item.href)
                        }}
                      >
                        <span className="wh-context-link-main">
                          <SiteIcon name={item.icon} size={15} />
                          <span className="wh-context-link-text">
                            <span>{item.label}</span>
                            <small>{item.description}</small>
                          </span>
                        </span>
                        {item.badge && <span className="wh-context-tag">{item.badge}</span>}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="wh-popover-section">
                  <div className="wh-popover-section-label">
                    <span>{activeConfig.label} Quick Tools</span>
                  </div>
                  <div className="wh-context-list">
                    {contextMenu.actions.map(action => (
                      <a
                        key={action.id}
                        href={action.href}
                        role="menuitem"
                        className="wh-context-link"
                        onClick={e => {
                          setPersonaMenuOpen(false)
                          onNavigate(e, action.href)
                        }}
                      >
                        <span className="wh-context-link-main">
                          <SiteIcon name={action.icon} size={15} />
                          <span className="wh-context-link-text">
                            <span>{action.label}</span>
                            <small>{action.description}</small>
                          </span>
                        </span>
                        {action.badge && <span className="wh-context-tag">{action.badge}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone 2: Discovery Navigation & Dynamic Workspace-Specific KPI Strip */}
        <div className="header-zone header-zone-center">
          {!isOperational && (
            <nav className="header-primary-links" aria-label="Primary KhelGrid sections">
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
          )}

          {workspaceMode && (
            <div
              className="wh-kpi-strip"
              role="region"
              aria-label={`${activeConfig.label} workspace KPIs`}
            >
              {headerKpis.map(kpi => (
                <a
                  key={kpi.id}
                  href={kpi.href}
                  className={`wh-kpi-item is-${kpi.tone}`}
                  title={kpi.title}
                  onClick={event => onNavigate(event, kpi.href)}
                >
                  <span className="wh-kpi-label">{kpi.label}</span>
                  <span className="wh-kpi-value">{kpi.value}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Zone 3: Search, Workspace Hub Link, Persona Primary Action, Utilities & Account */}
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

          <a
            className={`header-workspace-pill${path === '/workspace' || path.startsWith('/workspace/') ? ' is-active' : ''}`}
            href="/workspace"
            onClick={event => onNavigate(event, '/workspace')}
            title="Unified Six-Persona KhelGrid Workspace"
          >
            <SiteIcon name="chart" size={15} />
            <span className="header-workspace-pill-label">Workspace</span>
          </a>

          <span className="header-divider header-divider-partner" aria-hidden="true" />

          {workspaceMode ? (
            <a
              className="header-submit-direct header-submit-listing"
              href={activeConfig.primaryCta.href}
              onClick={event => onNavigate(event, activeConfig.primaryCta.href)}
              title={activeConfig.primaryCta.title}
              aria-label={activeConfig.primaryCta.label}
            >
              <SiteIcon name={activeConfig.primaryCta.icon} size={15} />
              <span>{activeConfig.primaryCta.label}</span>
            </a>
          ) : (
            listingAction && (() => {
              const cleanListingLabel = stripLeadingPlus(
                t(listingAction.translationKey, listingAction.defaultLabel),
              )
              return (
                <a
                  className="header-submit-direct header-submit-listing"
                  href={listingAction.href}
                  onClick={event => onNavigate(event, listingAction.href)}
                  title={listingAction.title}
                  aria-label={cleanListingLabel}
                >
                  <SiteIcon name={listingAction.icon} size={15} />
                  <span>{cleanListingLabel}</span>
                </a>
              )
            })()
          )}

          <span className="header-divider header-divider-utilities" aria-hidden="true" />

          <div className="header-utility-cluster">
            <button
              className="header-icon-button header-notif-trigger wh-notif-btn"
              type="button"
              onClick={onOpenNotifications}
              aria-label={t('notifications', 'Notifications')}
              title={t('notifications', 'Notifications')}
            >
              <SiteIcon name="bell" size={18} />
              {unreadBadge && (
                <span className="wh-notif-badge" aria-label={`${unreadNotifCount} unread notifications`}>
                  {unreadBadge}
                </span>
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
                ref={userMenuTriggerRef}
                className="header-user-btn"
                type="button"
                onClick={() => {
                  setPersonaMenuOpen(false)
                  onToggleUserMenu()
                }}
                aria-expanded={userMenuOpen}
                aria-label={`User account menu for ${authUser.fullName}`}
                title={`Signed in as ${authUser.fullName} (${activeConfig.label} workspace)`}
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
                  <span className="header-user-role-badge">{activeConfig.shortLabel}</span>
                </span>
                <SiteIcon name="chevron-down" size={13} className="header-user-chevron" />
              </button>

              {userMenuOpen && (
                <div className="header-user-dropdown" role="menu">
                  <div className="header-user-dropdown-header">
                    <strong>{authUser.fullName}</strong>
                    <small>{authUser.email}</small>
                    <span className="header-user-role-pill">
                      {activeConfig.label.toUpperCase()} WORKSPACE
                    </span>
                  </div>

                  <div className="header-user-dropdown-divider" />
                  <div className="header-user-dropdown-section-title">
                    {activeConfig.label} Pillars
                  </div>

                  {contextMenu.pillars.map(pillar => (
                    <a
                      key={pillar.id}
                      href={pillar.href}
                      className="header-user-dropdown-item"
                      role="menuitem"
                      onClick={e => {
                        onCloseUserMenu()
                        onNavigate(e, pillar.href)
                      }}
                    >
                      <SiteIcon name={pillar.icon} size={15} />
                      <span>{pillar.label}</span>
                    </a>
                  ))}

                  <div className="header-user-dropdown-divider" />
                  <div className="header-user-dropdown-section-title">
                    {activeConfig.label} Context Actions
                  </div>

                  {contextMenu.actions.map(action => (
                    <a
                      key={action.id}
                      href={action.href}
                      className="header-user-dropdown-item"
                      role="menuitem"
                      onClick={e => {
                        onCloseUserMenu()
                        onNavigate(e, action.href)
                      }}
                    >
                      <SiteIcon name={action.icon} size={15} />
                      <span>{action.label}</span>
                    </a>
                  ))}

                  <div className="header-user-dropdown-divider" />

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
                    <span>Public Profile</span>
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
              <button
                ref={userMenuTriggerRef}
                className="header-account-icon-btn"
                type="button"
                onClick={() => {
                  setPersonaMenuOpen(false)
                  onToggleUserMenu()
                }}
                aria-expanded={userMenuOpen}
                aria-controls="header-account-menu"
                aria-label="Your profile"
                title="Sign in to your account or switch KhelGrid workspace"
              >
                <SiteIcon name="user-round" size={18} />
              </button>
              {userMenuOpen && (
                <div id="header-account-menu" className="header-user-dropdown header-guest-dropdown" role="menu">
                  <div className="header-user-dropdown-header">
                    <strong>Your KhelGrid account</strong>
                    <small>Active view: {activeConfig.label} Workspace</small>
                  </div>
                  <div className="header-user-dropdown-divider" />
                  <button
                    type="button"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      onCloseUserMenu()
                      onOpenLogin()
                    }}
                  >
                    <SiteIcon name="user-round" size={15} />
                    <span>Sign in</span>
                  </button>
                  <button
                    type="button"
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      onCloseUserMenu()
                      onOpenSignup()
                    }}
                  >
                    <SiteIcon name="plus" size={15} />
                    <span>Create account</span>
                  </button>
                  <div className="header-user-dropdown-divider" />
                  <a
                    href={activeConfig.workspaceHref}
                    className="header-user-dropdown-item"
                    role="menuitem"
                    onClick={e => {
                      onCloseUserMenu()
                      onNavigate(e, activeConfig.workspaceHref)
                    }}
                  >
                    <SiteIcon name={activeConfig.icon} size={15} />
                    <span>Open {activeConfig.label} Workspace</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {!isOperational && (
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
          )}
        </div>
      </div>
    </header>
  )
}
