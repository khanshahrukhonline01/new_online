import { type MouseEvent, type RefObject } from 'react'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import NavbarSettingsMenu from './NavbarSettingsMenu'
import { SiteIcon } from './SiteIcon'
import { formatUnreadBadge } from './topNavActions'
import type { CanonicalWorkspaceId } from './workspaceHeaderEngine'

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
  onPersonaChange?: (persona: CanonicalWorkspaceId | null) => void
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
  unreadNotifCount = 0,
}: WorkspaceHeaderProps) {
  const unreadLabel = formatUnreadBadge(unreadNotifCount)
  const navExpanded = isMobile ? menuOpen : !sidebarCollapsed

  return (
    <header className="site-header kg-workspace-header" role="banner">
      <div className="header-left">
        <button
          ref={menuToggleRef}
          type="button"
          className="header-menu-btn"
          aria-controls="app-sidebar"
          aria-expanded={navExpanded}
          aria-label="Toggle main navigation"
          onClick={onToggleMainMenu}
        >
          <SiteIcon name="menu" size={20} />
        </button>

        <a
          href="/"
          className="header-brand"
          aria-label="KhelGrid home"
          onClick={event => onNavigate(event, '/')}
        >
          <img
            className="header-brand-logo"
            src="/assets/kg-logo.webp"
            alt="KhelGrid"
            width="106"
            height="32"
          />
        </a>
      </div>

      <div className="header-center">
        <button
          type="button"
          className="header-search-trigger"
          aria-label="Search KhelGrid catalogue"
          onClick={onOpenSearch}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <SiteIcon name="search" size={16} />
            <span>Search KhelGrid</span>
          </span>
          <kbd className="header-search-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div className="header-right">
        <a
          href="/play"
          className={`header-play-pill${path === '/play' ? ' is-active' : ''}`}
          onClick={event => onNavigate(event, '/play')}
        >
          <SiteIcon name="sports" size={15} />
          <span>Play</span>
        </a>

        <a
          href="/workspace"
          className={`header-workspace-pill${path.startsWith('/workspace') ? ' is-active' : ''}`}
          onClick={event => onNavigate(event, '/workspace')}
        >
          <SiteIcon name="building" size={15} />
          <span>Workspace</span>
        </a>

        <button
          type="button"
          className="header-icon-btn"
          aria-label="Notifications"
          onClick={onOpenNotifications}
        >
          <SiteIcon name="bell" size={18} />
          {unreadLabel && <span className="header-notif-badge">{unreadLabel}</span>}
        </button>

        <NavbarSettingsMenu
          onNavigate={(e, target) => onNavigate(e, target)}
          onOpenFeedback={onOpenFeedback}
        />

        {authUser ? (
          <div className="header-user-dropdown-wrap">
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Your profile"
              aria-expanded={userMenuOpen}
              onClick={onToggleUserMenu}
            >
              <SiteIcon name="user-round" size={18} />
            </button>
            {userMenuOpen && (
              <div className="header-user-dropdown" role="menu">
                <a
                  href="/dashboard"
                  onClick={event => {
                    onCloseUserMenu()
                    onNavigate(event, '/dashboard')
                  }}
                >
                  <SiteIcon name="home" size={15} />
                  <span>My Dashboard</span>
                </a>
                <a
                  href="/my-profile"
                  onClick={event => {
                    onCloseUserMenu()
                    onNavigate(event, '/my-profile')
                  }}
                >
                  <SiteIcon name="user-round" size={15} />
                  <span>{authUser.fullName || 'My Profile'}</span>
                </a>
                <a
                  href="/settings"
                  onClick={event => {
                    onCloseUserMenu()
                    onNavigate(event, '/settings')
                  }}
                >
                  <SiteIcon name="settings" size={15} />
                  <span>Account Settings</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onCloseUserMenu()
                    onSignOut()
                  }}
                >
                  <SiteIcon name="logout" size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Your profile"
              onClick={onOpenLogin}
            >
              <SiteIcon name="user-round" size={18} />
            </button>
            <button
              type="button"
              className="header-auth-btn is-ghost"
              onClick={onOpenLogin}
            >
              Sign In
            </button>
            <button
              type="button"
              className="header-auth-btn"
              onClick={onOpenSignup}
            >
              Join Free
            </button>
          </>
        )}
      </div>
    </header>
  )
}
