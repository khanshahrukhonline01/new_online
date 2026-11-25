import { useState, useMemo } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'
import type { AdminPlatformRole } from '../auth/adminSecurityPolicy'

export type AdminWorkspaceTab =
  | 'command'
  | 'moderation_desk'
  | 'analytics'
  | 'chronicle_desk'
  | 'tenant_governance'
  | 'verification_vault'
  | 'creator_campaigns'
  | 'fraud_disputes'
  | 'platform_governance'
  | 'gate_desk'
  | 'turf_oversight'
  | 'academy_oversight'

export interface AdminSidebarProps {
  activeWorkspace: AdminWorkspaceTab
  onSelectWorkspace: (tab: AdminWorkspaceTab) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  pendingSubmissionsCount?: number
  pendingManuscriptsCount?: number
  moderatorEmail: string
  moderatorRole: AdminPlatformRole
  databaseId: string
}

interface NavMenuItem {
  id: AdminWorkspaceTab
  label: string
  section: string
  icon: SiteIconName
  count?: number
}

function getInitials(email: string): string {
  const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'OP'
  return local.slice(0, 2).toUpperCase()
}

export function AdminSidebar({
  activeWorkspace,
  onSelectWorkspace,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  pendingSubmissionsCount = 0,
  pendingManuscriptsCount = 0,
  moderatorEmail,
  moderatorRole,
  databaseId,
}: AdminSidebarProps) {
  const [menuFilter, setMenuFilter] = useState('')

  const menuItems: NavMenuItem[] = useMemo(
    () => [
      {
        id: 'command',
        label: 'Command Centre',
        section: 'Operations',
        icon: 'activity',
      },
      {
        id: 'moderation_desk',
        label: 'Listing Moderation Queue',
        section: 'Operations',
        icon: 'check-circle',
        count: pendingSubmissionsCount > 0 ? pendingSubmissionsCount : undefined,
      },
      {
        id: 'analytics',
        label: 'Operations & KPI Analytics',
        section: 'Operations',
        icon: 'chart',
      },
      {
        id: 'tenant_governance',
        label: 'Tenant & Org Governance',
        section: 'Governance & Trust',
        icon: 'building',
      },
      {
        id: 'verification_vault',
        label: 'Verification & Evidence',
        section: 'Governance & Trust',
        icon: 'shield-check',
      },
      {
        id: 'fraud_disputes',
        label: 'Trust & Safety / Sanctions',
        section: 'Governance & Trust',
        icon: 'flag',
      },
      {
        id: 'platform_governance',
        label: 'Platform Settings & RBAC',
        section: 'Governance & Trust',
        icon: 'settings',
      },
      {
        id: 'chronicle_desk',
        label: 'Chronicle Peer-Review Desk',
        section: 'Editorial & Creators',
        icon: 'award',
        count: pendingManuscriptsCount > 0 ? pendingManuscriptsCount : undefined,
      },
      {
        id: 'creator_campaigns',
        label: 'Creator & Attribution Desk',
        section: 'Editorial & Creators',
        icon: 'award',
      },
      {
        id: 'gate_desk',
        label: 'Gate Check-In Telemetry',
        section: 'Facilities',
        icon: 'shield-check',
      },
      {
        id: 'turf_oversight',
        label: 'Turf Utilization & Maintenance',
        section: 'Facilities',
        icon: 'calendar',
      },
      {
        id: 'academy_oversight',
        label: 'Academy Batch & Attendance',
        section: 'Facilities',
        icon: 'building',
      },
    ],
    [pendingSubmissionsCount, pendingManuscriptsCount],
  )

  const filteredItems = useMemo(() => {
    const q = menuFilter.trim().toLowerCase()
    if (!q) return menuItems
    return menuItems.filter(
      i => i.label.toLowerCase().includes(q) || i.section.toLowerCase().includes(q),
    )
  }, [menuItems, menuFilter])

  const sections = useMemo(() => {
    const map: Record<string, NavMenuItem[]> = {}
    filteredItems.forEach(item => {
      if (!map[item.section]) map[item.section] = []
      map[item.section].push(item)
    })
    return map
  }, [filteredItems])

  const operatorHandle = moderatorEmail.includes('@')
    ? moderatorEmail.split('@')[0]
    : moderatorEmail
  const roleLabel = moderatorRole === 'super_admin' ? 'Super Admin' : 'Moderator'

  const handleSelect = (tab: AdminWorkspaceTab) => {
    onSelectWorkspace(tab)
    onCloseMobile?.()
  }

  return (
    <>
      <div
        className={`admin-sidebar-mobile-backdrop ${isMobileOpen ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`admin-lte-sidebar ${isCollapsed ? 'is-collapsed' : ''} ${isMobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Admin Navigation Sidebar"
      >
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-logo-badge" title="KhelGrid Operations">
            KG
          </span>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-app-name">KhelGrid Admin Operations</span>
            <span className="admin-sidebar-sub-name">admin.khelgrid.com</span>
          </div>
          <button
            type="button"
            className="admin-sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse to icon rail'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse to icon rail'}
          >
            <SiteIcon name={isCollapsed ? 'chevron-right' : 'menu'} size={15} />
          </button>
        </div>

        {!isCollapsed && (
          <div className="admin-sidebar-search">
            <div className="admin-sidebar-search-inner">
              <SiteIcon name="search" size={14} className="admin-sidebar-search-icon" />
              <input
                type="text"
                className="admin-sidebar-search-input"
                placeholder="Filter workspaces…"
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
                        onClick={() => handleSelect(item.id)}
                        title={item.label}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="admin-sidebar-item-icon">
                          <SiteIcon name={item.icon} size={16} />
                        </span>
                        <span className="admin-sidebar-item-label">{item.label}</span>
                        {typeof item.count === 'number' && (
                          <span className="admin-sidebar-count" aria-label={`${item.count} pending`}>
                            {item.count}
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

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-operator-row">
            <div className="admin-sidebar-user-avatar" aria-hidden="true">
              {getInitials(moderatorEmail)}
            </div>
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-user-email" title={moderatorEmail}>
                {operatorHandle}
              </span>
              <span className="admin-sidebar-user-meta">{roleLabel}</span>
            </div>
          </div>
          <div className="admin-sidebar-db-ref" title={`Supabase project ${databaseId}`}>
            DB · {databaseId}
          </div>
        </div>
      </aside>
    </>
  )
}
