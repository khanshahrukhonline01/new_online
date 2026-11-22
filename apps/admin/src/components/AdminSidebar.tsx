import { useState, useMemo } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'

export type AdminWorkspaceTab =
  | 'command'
  | 'moderation_desk'
  | 'analytics'
  | 'chronicle_desk'
  | 'fraud_disputes'
  | 'creator_campaigns'
  | 'gate_desk'
  | 'turf_oversight'
  | 'academy_oversight'

export interface AdminSidebarProps {
  activeWorkspace: AdminWorkspaceTab
  onSelectWorkspace: (tab: AdminWorkspaceTab) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  pendingSubmissionsCount?: number
  pendingManuscriptsCount?: number
  moderatorEmail?: string
  moderatorRole?: 'super_admin' | 'moderator'
}

interface NavMenuItem {
  id: AdminWorkspaceTab
  label: string
  section: string
  icon: SiteIconName
  badge?: string
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple'
}

export function AdminSidebar({
  activeWorkspace,
  onSelectWorkspace,
  isCollapsed,
  onToggleCollapse,
  pendingSubmissionsCount = 0,
  pendingManuscriptsCount = 0,
  moderatorEmail = 'admin@khelgrid.com',
  moderatorRole = 'super_admin',
}: AdminSidebarProps) {
  const [menuFilter, setMenuFilter] = useState('')

  const menuItems: NavMenuItem[] = useMemo(() => [
    // CORE WORKSPACES
    { id: 'command', label: 'Command Centre', section: 'CORE WORKSPACES', icon: 'activity', badge: 'RBAC', badgeVariant: 'primary' },
    {
      id: 'moderation_desk',
      label: 'Listing & Chronicle Desk',
      section: 'CORE WORKSPACES',
      icon: 'check-circle',
      badge: pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} Pending` : 'Clear',
      badgeVariant: pendingSubmissionsCount > 0 ? 'warning' : 'success',
    },
    { id: 'analytics', label: 'Operations & KPI Analytics', section: 'CORE WORKSPACES', icon: 'chart', badge: 'Live', badgeVariant: 'success' },

    // SPECIALIZED DESKS
    {
      id: 'chronicle_desk',
      label: 'Chronicle Peer-Review Desk',
      section: 'RESEARCH & FRAUD',
      icon: 'award',
      badge: pendingManuscriptsCount > 0 ? `${pendingManuscriptsCount} MSS` : undefined,
      badgeVariant: 'purple',
    },
    { id: 'fraud_disputes', label: 'Trust & Dispute Claims', section: 'RESEARCH & FRAUD', icon: 'flag', badge: 'Safety' },

    // CREATOR CAMPAIGN MARKETPLACE
    {
      id: 'creator_campaigns',
      label: 'Sports Creator Campaigns',
      section: 'CREATOR MARKETPLACE',
      icon: 'award',
      badge: 'Moderation',
      badgeVariant: 'purple',
    },

    // ON-GROUND & SAAS
    { id: 'gate_desk', label: 'Universal Gate Check-In', section: 'FACILITY & SAAS', icon: 'shield-check', badge: 'Ground' },
    { id: 'turf_oversight', label: 'Turf Court Slot Engine', section: 'FACILITY & SAAS', icon: 'calendar', badge: 'Holds' },
    { id: 'academy_oversight', label: 'Academy SaaS Oversight', section: 'FACILITY & SAAS', icon: 'building', badge: 'Leads' },
  ], [pendingSubmissionsCount, pendingManuscriptsCount])

  const filteredItems = useMemo(() => {
    const q = menuFilter.trim().toLowerCase()
    if (!q) return menuItems
    return menuItems.filter(i => i.label.toLowerCase().includes(q) || i.section.toLowerCase().includes(q))
  }, [menuItems, menuFilter])

  // Group by section
  const sections = useMemo(() => {
    const map: Record<string, NavMenuItem[]> = {}
    filteredItems.forEach(item => {
      if (!map[item.section]) map[item.section] = []
      map[item.section].push(item)
    })
    return map
  }, [filteredItems])

  return (
    <aside className={`admin-lte-sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Admin Navigation Sidebar">
      {/* Brand Header */}
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-logo-badge" title="KhelGrid Operations">KG</span>
        <div className="admin-sidebar-brand-text">
          <span className="admin-sidebar-app-name">KhelGrid Admin Operations</span>
          <span className="admin-sidebar-sub-name">admin.khelgrid.com</span>
        </div>
        <button
          type="button"
          className="admin-sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse to icon-only'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse to icon-only'}
        >
          <SiteIcon name={isCollapsed ? 'chevron-right' : 'menu'} size={16} />
        </button>
      </div>

      {/* Moderator Profile Card */}
      <div className="admin-sidebar-user-panel">
        <div className="admin-sidebar-user-avatar">
          <SiteIcon name="user" size={18} />
          <span className="admin-sidebar-status-dot online" title="Active on development database" />
        </div>
        <div className="admin-sidebar-user-info">
          <span className="admin-sidebar-user-email" title={moderatorEmail}>
            {moderatorEmail.split('@')[0]}
          </span>
          <span className={`admin-sidebar-role-badge ${moderatorRole === 'super_admin' ? 'super' : 'mod'}`}>
            {moderatorRole === 'super_admin' ? 'Super Admin' : 'Moderator'}
          </span>
        </div>
      </div>

      {/* Quick Menu Search */}
      {!isCollapsed && (
        <div className="admin-sidebar-search">
          <div className="admin-sidebar-search-inner">
            <SiteIcon name="search" size={14} className="admin-sidebar-search-icon" />
            <input
              type="text"
              className="admin-sidebar-search-input"
              placeholder="Filter desks & tools…"
              value={menuFilter}
              onChange={e => setMenuFilter(e.target.value)}
              aria-label="Filter admin navigation menus"
            />
            {menuFilter && (
              <button
                type="button"
                className="admin-sidebar-search-clear"
                onClick={() => setMenuFilter('')}
                aria-label="Clear filter"
              >
                <SiteIcon name="close" size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tree */}
      <nav className="admin-sidebar-nav-tree" aria-label="Main Administration Desks">
        {Object.entries(sections).map(([sectionTitle, items]) => (
          <div key={sectionTitle} className="admin-sidebar-nav-section">
            <div className="admin-sidebar-section-header">
              <span>{sectionTitle}</span>
            </div>

            <ul className="admin-sidebar-menu-list">
              {items.map(item => {
                const isActive = activeWorkspace === item.id
                return (
                  <li key={item.id} className="admin-sidebar-menu-item">
                    <button
                      type="button"
                      className={`admin-sidebar-link ${isActive ? 'is-active' : ''}`}
                      onClick={() => onSelectWorkspace(item.id)}
                      title={item.label}
                    >
                      <span className="admin-sidebar-item-icon">
                        <SiteIcon name={item.icon} size={16} />
                      </span>
                      <span className="admin-sidebar-item-label">{item.label}</span>
                      {item.badge && (
                        <span className={`admin-sidebar-item-badge ${item.badgeVariant ? `badge-${item.badgeVariant}` : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-db-telemetry">
          <span className="admin-sidebar-pulse-dot" />
          <span className="admin-sidebar-db-name">hznsbxvovjxvmnchzzqt</span>
        </div>
      </div>
    </aside>
  )
}
