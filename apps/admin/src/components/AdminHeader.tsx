import { useState, useEffect } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'

export type AdminThemeMode = 'light' | 'dark' | 'cosmic' | 'system'

export interface AdminHeaderProps {
  onToggleSidebar: () => void
  onOpenCommandPalette: () => void
  onResetPassword: () => void
  onSignOut?: () => void
  activeWorkspaceTitle: string
  activeWorkspaceSection?: string
  theme: AdminThemeMode
  onChangeTheme: (theme: AdminThemeMode) => void
  pendingSubmissionsCount?: number
  pendingManuscriptsCount?: number
  dbLatencyMs?: number
  databaseId?: string
}

export function AdminHeader({
  onToggleSidebar,
  onOpenCommandPalette,
  onResetPassword,
  onSignOut,
  activeWorkspaceTitle,
  activeWorkspaceSection = 'Workspaces',
  theme,
  onChangeTheme,
  pendingSubmissionsCount = 0,
  pendingManuscriptsCount = 0,
  dbLatencyMs = 28,
  databaseId = 'hznsbxvovjxvmnchzzqt',
}: AdminHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const totalAlerts = pendingSubmissionsCount + pendingManuscriptsCount

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  return (
    <header className="admin-lte-topbar">
      {/* Left: Sidebar Toggle, Command Search, and Breadcrumbs */}
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-topbar-icon-btn admin-topbar-hamburger"
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          <SiteIcon name="menu" size={18} />
        </button>

        <span className="admin-topbar-brand-title" title="KhelGrid Admin Operations">
          KhelGrid Admin Operations
        </span>

        {/* Command Palette Trigger */}
        <button
          type="button"
          className="admin-topbar-command-trigger"
          onClick={onOpenCommandPalette}
          title="Open Command Palette (Ctrl+K)"
        >
          <SiteIcon name="search" size={14} />
          <span className="admin-topbar-search-text">Quick search actions, queues, tools…</span>
          <kbd className="admin-topbar-kbd">Ctrl+K</kbd>
        </button>

        {/* Workspace Breadcrumbs */}
        <nav className="admin-topbar-breadcrumbs" aria-label="Breadcrumb">
          <span className="admin-breadcrumb-section">{activeWorkspaceSection}</span>
          <SiteIcon name="chevron-right" size={12} className="admin-breadcrumb-separator" />
          <strong className="admin-breadcrumb-current">{activeWorkspaceTitle}</strong>
        </nav>
      </div>

      {/* Right: Database Telemetry, Alerts, Fullscreen, Themes, Profile */}
      <div className="admin-topbar-right">
        {/* Realtime DB Telemetry Badge */}
        <div className="admin-topbar-db-badge" title={`Connected to Supabase project ${databaseId} (${dbLatencyMs}ms ping)`}>
          <span className="admin-topbar-status-dot online" />
          <span className="admin-topbar-db-label">Dev Database ({databaseId})</span>
          <span className="admin-topbar-latency">{dbLatencyMs}ms</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="admin-topbar-dropdown-wrap">
          <button
            type="button"
            className="admin-topbar-icon-btn has-badge"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen)
              setIsProfileOpen(false)
            }}
            title="Operational Alerts"
            aria-label="Operational Alerts"
            aria-expanded={isNotificationsOpen}
          >
            <SiteIcon name="bell" size={18} />
            {totalAlerts > 0 && <span className="admin-topbar-badge-pill">{totalAlerts}</span>}
          </button>

          {isNotificationsOpen && (
            <div className="admin-topbar-popover admin-notifications-popover" role="menu">
              <div className="admin-popover-header">
                <strong>Operational Alerts</strong>
                <span className="admin-popover-count-pill">{totalAlerts} active</span>
              </div>
              <div className="admin-popover-body">
                {pendingSubmissionsCount > 0 && (
                  <div className="admin-alert-row warning">
                    <SiteIcon name="check-circle" size={16} />
                    <div>
                      <span className="admin-alert-title">{pendingSubmissionsCount} Submissions Awaiting Moderation</span>
                      <small className="admin-alert-sub">Directory venues, pickup games, and academies</small>
                    </div>
                  </div>
                )}
                {pendingManuscriptsCount > 0 && (
                  <div className="admin-alert-row purple">
                    <SiteIcon name="award" size={16} />
                    <div>
                      <span className="admin-alert-title">{pendingManuscriptsCount} KhelChronicle Manuscripts</span>
                      <small className="admin-alert-sub">Research papers awaiting editorial assessment</small>
                    </div>
                  </div>
                )}
                {totalAlerts === 0 && (
                  <div className="admin-alert-row empty">
                    <SiteIcon name="check" size={16} />
                    <span>All operational queues are clear!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          className="admin-topbar-icon-btn"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <SiteIcon name={isFullscreen ? 'close' : 'external-link'} size={16} />
        </button>

        {/* Theme Switcher (Light, Dark Slate, Cosmic Neon, System) */}
        <div className="admin-theme-select-wrap">
          <SiteIcon name={theme === 'cosmic' ? 'sparkles' : theme === 'dark' ? 'moon' : 'sun'} size={15} />
          <select
            className="admin-topbar-theme-select"
            value={theme}
            onChange={e => onChangeTheme(e.target.value as AdminThemeMode)}
            aria-label="Theme Mode Selection"
          >
            <option value="system">System default</option>
            <option value="light">Corporate Light</option>
            <option value="dark">Dark Slate</option>
            <option value="cosmic">Cosmic Neon</option>
          </select>
        </div>

        {/* Moderator Profile Menu */}
        <div className="admin-topbar-dropdown-wrap">
          <button
            type="button"
            className="admin-topbar-profile-btn"
            onClick={() => {
              setIsProfileOpen(!isProfileOpen)
              setIsNotificationsOpen(false)
            }}
            aria-label="Moderator Account Menu"
            aria-expanded={isProfileOpen}
          >
            <div className="admin-topbar-avatar">
              <span>KG</span>
            </div>
            <span className="admin-topbar-profile-name">Moderator</span>
            <SiteIcon name="chevron-down" size={13} />
          </button>

          {isProfileOpen && (
            <div className="admin-topbar-popover admin-profile-popover" role="menu">
              <div className="admin-popover-header">
                <strong>Platform Moderator</strong>
                <span className="admin-popover-role">Super Admin</span>
              </div>
              <div className="admin-popover-actions">
                <button
                  type="button"
                  className="admin-popover-action-btn"
                  onClick={() => {
                    setIsProfileOpen(false)
                    onResetPassword()
                  }}
                >
                  <SiteIcon name="lock" size={14} />
                  <span>Reset Password</span>
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    className="admin-popover-action-btn text-danger"
                    onClick={() => {
                      setIsProfileOpen(false)
                      onSignOut()
                    }}
                  >
                    <SiteIcon name="logout" size={14} />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
