import { useState, useEffect, useRef } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import type { AdminPlatformRole } from '../auth/adminSecurityPolicy'
import type { RegulatoryInboxItem } from '../services/adminRegulatoryInboxService'
import type { AdminWorkspaceTab } from './AdminSidebar'

export type AdminThemeMode = 'light' | 'dark' | 'cosmic' | 'system'

export interface AdminHeaderProps {
  onToggleSidebar: () => void
  onOpenCommandPalette: () => void
  onJumpToWorkspace?: (tab: AdminWorkspaceTab) => void
  onSelectWatchlistItem?: (item: RegulatoryInboxItem) => void
  onOpenMakerChecker?: () => void
  onResetPassword: () => void
  onSignOut: () => void
  activeWorkspaceTitle: string
  activeWorkspaceSection?: string
  theme: AdminThemeMode
  onChangeTheme: (theme: AdminThemeMode) => void
  pendingSubmissionsCount?: number
  pendingManuscriptsCount?: number
  slaWatchlistItems?: RegulatoryInboxItem[]
  slaBreachedCount?: number
  slaAtRiskCount?: number
  pendingMakerCheckerCount?: number
  regulatoryComplianceOpenCount?: number
  dbLatencyMs?: number | null
  databaseId: string
  operatorEmail: string
  operatorRole: AdminPlatformRole
}

function getOperatorInitials(email: string): string {
  const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'OP'
  return local.slice(0, 2).toUpperCase()
}

export function AdminHeader({
  onToggleSidebar,
  onOpenCommandPalette,
  onJumpToWorkspace,
  onSelectWatchlistItem,
  onOpenMakerChecker,
  onResetPassword,
  onSignOut,
  activeWorkspaceTitle,
  activeWorkspaceSection = 'Operations',
  theme,
  onChangeTheme,
  pendingSubmissionsCount = 0,
  pendingManuscriptsCount = 0,
  slaWatchlistItems = [],
  slaBreachedCount = 0,
  slaAtRiskCount = 0,
  pendingMakerCheckerCount = 0,
  regulatoryComplianceOpenCount = 0,
  dbLatencyMs = null,
  databaseId,
  operatorEmail,
  operatorRole,
}: AdminHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  const priorityWatchCount = slaBreachedCount + slaAtRiskCount + pendingMakerCheckerCount
  const totalAlerts =
    priorityWatchCount > 0
      ? priorityWatchCount
      : pendingSubmissionsCount + pendingManuscriptsCount + regulatoryComplianceOpenCount
  const hasCriticalBreach = slaBreachedCount > 0
  const roleLabel = operatorRole === 'super_admin' ? 'Super Admin' : 'Moderator'
  const displayName = operatorEmail.includes('@') ? operatorEmail.split('@')[0] : operatorEmail
  const normalizedTheme: 'system' | 'light' | 'dark' =
    theme === 'cosmic' ? 'dark' : theme

  useEffect(() => {
    if (!isNotificationsOpen && !isProfileOpen) return

    const handleOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false)
        setIsProfileOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false)
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isNotificationsOpen, isProfileOpen])

  return (
    <header ref={headerRef} className="admin-lte-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-topbar-icon-btn admin-topbar-hamburger"
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          <SiteIcon name="menu" size={17} />
        </button>

        <nav className="admin-topbar-breadcrumbs" aria-label="Breadcrumb">
          <span className="admin-breadcrumb-section">{activeWorkspaceSection}</span>
          <SiteIcon name="chevron-right" size={12} className="admin-breadcrumb-separator" />
          <strong className="admin-breadcrumb-current">{activeWorkspaceTitle}</strong>
        </nav>
      </div>

      <div className="admin-topbar-right">
        <button
          type="button"
          className="admin-topbar-command-trigger"
          onClick={onOpenCommandPalette}
          title="Global Search & Command Palette (Ctrl+K)"
          aria-label="Global search for users, listings, venues, or IDs (Ctrl+K)"
          data-testid="admin-global-search-trigger"
        >
          <SiteIcon name="search" size={14} />
          <span className="admin-topbar-search-text">Search users, listings, venues, IDs…</span>
          <kbd className="admin-topbar-kbd">Ctrl+K</kbd>
        </button>

        <div className="admin-topbar-dropdown-wrap">
          <button
            type="button"
            className="admin-topbar-icon-btn has-badge"
            onClick={() => {
              setIsNotificationsOpen(prev => !prev)
              setIsProfileOpen(false)
            }}
            title="SLA Watchlist & Operational Alerts"
            aria-label="Operational Alerts"
            aria-haspopup="menu"
            aria-expanded={isNotificationsOpen}
            data-testid="admin-sla-watchlist-trigger"
          >
            <SiteIcon name="bell" size={16} />
            {totalAlerts > 0 && (
              <span
                className={`admin-topbar-alert-count ${hasCriticalBreach ? 'is-critical' : ''}`}
              >
                {totalAlerts}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div
              className="admin-topbar-popover admin-notifications-popover admin-sla-watchlist-popover"
              role="menu"
              data-testid="admin-sla-watchlist-popover"
            >
              <div className="admin-popover-header">
                <div className="admin-watchlist-head-row">
                  <strong>SLA Watchlist &amp; Priority Alerts</strong>
                  {slaBreachedCount > 0 && (
                    <span className="admin-watchlist-breach-tag tabular-nums">
                      {slaBreachedCount} Breached
                    </span>
                  )}
                </div>
                <span className="admin-popover-meta-line tabular-nums">
                  <span>{slaBreachedCount} breached</span>
                  <span aria-hidden="true">·</span>
                  <span>{slaAtRiskCount} at risk</span>
                  <span aria-hidden="true">·</span>
                  <span>{pendingMakerCheckerCount} dual-control</span>
                </span>
              </div>

              <div className="admin-popover-body admin-watchlist-scroll">
                {slaWatchlistItems.length > 0 && (
                  <div className="admin-watchlist-section">
                    <span className="admin-watchlist-section-label">
                      SLA Priority Items ({slaWatchlistItems.length})
                    </span>
                    {slaWatchlistItems.slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className="admin-alert-row admin-watchlist-item"
                        data-testid={`watchlist-jump-${item.referenceCode}`}
                        onClick={() => {
                          setIsNotificationsOpen(false)
                          if (onSelectWatchlistItem) {
                            onSelectWatchlistItem(item)
                          } else {
                            onJumpToWorkspace?.(item.sourceDesk)
                          }
                        }}
                      >
                        <span
                          className={`admin-watchlist-dot ${item.slaStatus === 'breached' ? 'is-breached' : 'is-at-risk'}`}
                          aria-hidden="true"
                        />
                        <div className="admin-watchlist-copy">
                          <div className="admin-watchlist-title-line">
                            <span className="admin-alert-title">{item.title}</span>
                            <span
                              className={`admin-watchlist-sla-text tabular-nums ${item.slaStatus === 'breached' ? 'is-breached' : 'is-at-risk'}`}
                            >
                              {item.slaRemainingLabel}
                            </span>
                          </div>
                          <small className="admin-alert-sub">
                            {item.referenceCode} · {item.sourceLabel} · {item.entityName}
                          </small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {pendingMakerCheckerCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-alert-row"
                    data-testid="watchlist-maker-checker"
                    onClick={() => {
                      setIsNotificationsOpen(false)
                      if (onOpenMakerChecker) {
                        onOpenMakerChecker()
                      } else {
                        onJumpToWorkspace?.('platform_governance')
                      }
                    }}
                  >
                    <SiteIcon name="shield-check" size={16} />
                    <div>
                      <span className="admin-alert-title">
                        {pendingMakerCheckerCount} dual-control approval
                        {pendingMakerCheckerCount > 1 ? 's' : ''} awaiting second sign-off
                      </span>
                      <small className="admin-alert-sub">
                        Open Maker-Checker Queue in Platform RBAC
                      </small>
                    </div>
                  </button>
                )}

                {regulatoryComplianceOpenCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-alert-row"
                    data-testid="watchlist-regulatory-compliance"
                    onClick={() => {
                      setIsNotificationsOpen(false)
                      onJumpToWorkspace?.('regulatory_compliance')
                    }}
                  >
                    <SiteIcon name="file-text" size={16} />
                    <div>
                      <span className="admin-alert-title">
                        {regulatoryComplianceOpenCount} statutory compliance filings open
                      </span>
                      <small className="admin-alert-sub">
                        DPDP DSAR, Minor Safeguards &amp; IT Rules Grievance Desk
                      </small>
                    </div>
                  </button>
                )}

                {pendingSubmissionsCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-alert-row"
                    onClick={() => {
                      setIsNotificationsOpen(false)
                      onJumpToWorkspace?.('moderation_desk')
                    }}
                  >
                    <SiteIcon name="check-circle" size={16} />
                    <div>
                      <span className="admin-alert-title">
                        {pendingSubmissionsCount} listing submissions awaiting review
                      </span>
                      <small className="admin-alert-sub">
                        Open Listing Moderation Queue
                      </small>
                    </div>
                  </button>
                )}

                {pendingManuscriptsCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-alert-row"
                    onClick={() => {
                      setIsNotificationsOpen(false)
                      onJumpToWorkspace?.('chronicle_desk')
                    }}
                  >
                    <SiteIcon name="award" size={16} />
                    <div>
                      <span className="admin-alert-title">
                        {pendingManuscriptsCount} KhelChronicle manuscripts pending
                      </span>
                      <small className="admin-alert-sub">
                        Open Chronicle Peer-Review Desk
                      </small>
                    </div>
                  </button>
                )}

                {totalAlerts === 0 && slaWatchlistItems.length === 0 && (
                  <div className="admin-alert-row">
                    <SiteIcon name="check" size={16} />
                    <span className="admin-alert-title">All SLAs and queues are on track.</span>
                  </div>
                )}
              </div>

              <div className="admin-watchlist-footer">
                <button
                  type="button"
                  role="menuitem"
                  className="admin-watchlist-footer-btn"
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onJumpToWorkspace?.('regulatory_inbox')
                  }}
                >
                  <span>Open Unified Regulatory Inbox</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="admin-theme-segmented" role="group" aria-label="Theme Mode Selection">
          {(
            [
              { id: 'light', label: 'Light', icon: 'sun' },
              { id: 'dark', label: 'Dark', icon: 'moon' },
              { id: 'system', label: 'Auto', icon: 'settings' },
            ] as const
          ).map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`admin-theme-seg-btn ${normalizedTheme === opt.id ? 'is-active' : ''}`}
              onClick={() => onChangeTheme(opt.id)}
              aria-pressed={normalizedTheme === opt.id}
              title={`Switch to ${opt.label} theme`}
            >
              <SiteIcon name={opt.icon} size={13} />
              <span className="admin-theme-seg-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-topbar-dropdown-wrap">
          <button
            type="button"
            className="admin-topbar-profile-btn"
            onClick={() => {
              setIsProfileOpen(prev => !prev)
              setIsNotificationsOpen(false)
            }}
            aria-label="Operator Account Menu"
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
          >
            <span className="admin-topbar-avatar">
              {getOperatorInitials(operatorEmail)}
            </span>
            <span className="admin-topbar-profile-name">{displayName}</span>
            <SiteIcon name="chevron-down" size={13} />
          </button>

          {isProfileOpen && (
            <div className="admin-topbar-popover admin-profile-popover" role="menu">
              <div className="admin-popover-header">
                <strong title={operatorEmail}>{operatorEmail}</strong>
                <span className="admin-popover-meta-line">
                  <span>{roleLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    DB {databaseId}
                    {dbLatencyMs !== null ? ` (${dbLatencyMs}ms)` : ''}
                  </span>
                </span>
              </div>
              <div className="admin-popover-actions">
                <button
                  type="button"
                  role="menuitem"
                  className="admin-popover-action-btn"
                  onClick={() => {
                    setIsProfileOpen(false)
                    onResetPassword()
                  }}
                >
                  <SiteIcon name="lock" size={14} />
                  <span>Reset Password</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="admin-popover-action-btn text-danger"
                  onClick={() => {
                    setIsProfileOpen(false)
                    onSignOut()
                  }}
                >
                  <SiteIcon name="logout" size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="admin-topbar-signout-btn"
          onClick={onSignOut}
          title="Sign Out"
          aria-label="Sign Out"
        >
          <SiteIcon name="logout" size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  )
}
