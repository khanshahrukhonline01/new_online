import { useEffect, useState, useCallback, useMemo } from 'react'
import { AdminControlPanelPage } from '../../../src/modules/admin/AdminControlPanelPage'
import { AdminModerationPage } from '../../../src/modules/admin/AdminModerationPage'
import { AdminAnalyticsDashboard } from '../../../src/modules/admin/AdminAnalyticsDashboard'
import { SiteIcon } from '../../../src/shared/components/SiteIcon'
import { usePreferences } from '../../../src/shared/usePreferences'
import { AdminSidebar, type AdminWorkspaceTab } from './components/AdminSidebar'
import { AdminHeader, type AdminThemeMode } from './components/AdminHeader'
import { AdminCommandPalette, type CommandPaletteAction } from './components/AdminCommandPalette'
import { AdminGroundOversightView } from './components/AdminGroundOversightView'
import {
  AdminAuthGate,
  useAdminAuth,
  type AdminAuthGateProps,
} from './auth/AdminAuthProvider'
import { UNAVAILABLE_LOCALSTORAGE_WORKSPACES } from './auth/adminSecurityPolicy'
import {
  getAdminModerationQueue,
  clearCatalogueCache,
} from '../../../src/integrations/supabase/public-client'
import { getChronicleModerationQueue } from '../../../src/integrations/supabase/chronicle-client'
import './admin-app.css'

export interface AdminAppProps {
  /**
   * Controlled unit-test injection only; never populated in runtime entrypoints.
   */
  initialAuthOverride?: AdminAuthGateProps['initialAuthOverride']
}

function AuthenticatedAdminShell() {
  const { identity, databaseProjectRef, signOut, revalidate, openPasswordReset } = useAdminAuth()
  const { preferences, updatePreferences } = usePreferences()

  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspaceTab>('command')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [pendingListingsCount, setPendingListingsCount] = useState(0)
  const [pendingManuscriptsCount, setPendingManuscriptsCount] = useState(0)
  const [toastNotification, setToastNotification] = useState<string | null>(null)
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null)

  const [adminTheme, setAdminTheme] = useState<AdminThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('khelgrid_admin_theme') as AdminThemeMode | null
      if (saved && ['light', 'dark', 'cosmic', 'system'].includes(saved)) {
        return saved
      }
    }
    return (preferences.theme as AdminThemeMode) || 'system'
  })

  const handleThemeChange = useCallback(
    (newTheme: AdminThemeMode) => {
      setAdminTheme(newTheme)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('khelgrid_admin_theme', newTheme)
      }
      if (newTheme === 'cosmic' || newTheme === 'dark') {
        updatePreferences({ theme: 'dark' })
      } else if (newTheme === 'light') {
        updatePreferences({ theme: 'light' })
      } else {
        updatePreferences({ theme: 'system' })
      }
    },
    [updatePreferences],
  )

  // Apply data-admin-theme attribute to <html>
  useEffect(() => {
    document.title = 'KhelGrid Admin Operations · admin.khelgrid.com'
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (adminTheme === 'cosmic') {
        root.setAttribute('data-admin-theme', 'cosmic')
        root.classList.add('cosmic')
        root.classList.remove('dark')
      } else if (adminTheme === 'dark') {
        root.setAttribute('data-admin-theme', 'dark')
        root.classList.add('dark')
        root.classList.remove('cosmic')
      } else if (adminTheme === 'light') {
        root.setAttribute('data-admin-theme', 'light')
        root.classList.remove('dark', 'cosmic')
      } else {
        root.removeAttribute('data-admin-theme')
        root.classList.remove('cosmic')
      }
    }
  }, [adminTheme])

  // Fetch queue counts ONLY after server-verified authorization succeeds
  const loadCounts = useCallback(async () => {
    const start = Date.now()
    try {
      const [queueRes, chronicleRes] = await Promise.all([
        getAdminModerationQueue({ limit: 50 }).catch(() => null),
        getChronicleModerationQueue().catch(() => null),
      ])
      setDbLatencyMs(Math.max(1, Date.now() - start))
      if (queueRes?.pendingSubmissions) {
        setPendingListingsCount(queueRes.pendingSubmissions.length)
      }
      if (chronicleRes?.submissions) {
        setPendingManuscriptsCount(chronicleRes.submissions.length)
      }
    } catch {
      setDbLatencyMs(null)
    }
  }, [])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  // Listen to custom switch workspace events (only active when authorized)
  useEffect(() => {
    const handleSwitchWorkspace = (e: Event) => {
      const detail = (e as CustomEvent<{ workspace?: AdminWorkspaceTab }>).detail
      if (detail?.workspace) {
        setActiveWorkspace(detail.workspace)
      }
    }
    const handleOpenPalette = () => setIsCommandPaletteOpen(true)

    window.addEventListener('khelgrid-admin-switch-workspace', handleSwitchWorkspace)
    window.addEventListener('khelgrid-admin-open-palette', handleOpenPalette)
    return () => {
      window.removeEventListener('khelgrid-admin-switch-workspace', handleSwitchWorkspace)
      window.removeEventListener('khelgrid-admin-open-palette', handleOpenPalette)
    }
  }, [])

  // Command palette actions (only exposes real operational workspaces + honest unavailable notices)
  const commandActions: CommandPaletteAction[] = useMemo(
    () => [
      {
        id: 'cmd-command',
        title: 'Open Command Centre',
        section: 'Workspaces',
        icon: 'activity',
        shortcut: 'G C',
        onSelect: () => setActiveWorkspace('command'),
      },
      {
        id: 'cmd-moderation',
        title: 'Open Listing & Evidence Desk',
        section: 'Workspaces',
        icon: 'check-circle',
        badge: `${pendingListingsCount} Pending`,
        shortcut: 'G M',
        onSelect: () => setActiveWorkspace('moderation_desk'),
      },
      {
        id: 'cmd-analytics',
        title: 'Open KPI & Operations Analytics',
        section: 'Workspaces',
        icon: 'chart',
        shortcut: 'G A',
        onSelect: () => setActiveWorkspace('analytics'),
      },
      {
        id: 'cmd-chronicle',
        title: 'Open Chronicle Peer-Review Desk',
        section: 'Governance',
        icon: 'award',
        badge: `${pendingManuscriptsCount} Manuscripts`,
        shortcut: 'G R',
        onSelect: () => setActiveWorkspace('chronicle_desk'),
      },
      {
        id: 'cmd-revalidate',
        title: 'Re-verify Admin Permissions',
        section: 'Account Security',
        icon: 'shield-check',
        onSelect: () => {
          void revalidate()
        },
      },
      {
        id: 'cmd-clear-cache',
        title: 'Clear Client Catalogue Cache',
        section: 'System Tools',
        icon: 'refresh',
        onSelect: () => {
          clearCatalogueCache()
          setToastNotification('Client catalogue cache cleared.')
          window.setTimeout(() => setToastNotification(null), 3000)
        },
      },
      {
        id: 'cmd-theme-dark',
        title: 'Switch to Dark Slate Theme',
        section: 'Appearance',
        icon: 'moon',
        onSelect: () => handleThemeChange('dark'),
      },
      {
        id: 'cmd-theme-light',
        title: 'Switch to Corporate Light Theme',
        section: 'Appearance',
        icon: 'sun',
        onSelect: () => handleThemeChange('light'),
      },
      {
        id: 'cmd-reset-pw',
        title: 'Reset Operator Password',
        section: 'Account Security',
        icon: 'lock',
        onSelect: () => openPasswordReset(),
      },
      {
        id: 'cmd-sign-out',
        title: 'Sign Out of Admin Control Center',
        section: 'Account Security',
        icon: 'logout',
        onSelect: () => {
          void signOut()
        },
      },
    ],
    [pendingListingsCount, pendingManuscriptsCount, handleThemeChange, openPasswordReset, revalidate, signOut],
  )

  const workspaceDetails: Record<AdminWorkspaceTab, { title: string; section: string }> = {
    command: { title: 'Command Centre', section: 'Core Operations' },
    moderation_desk: { title: 'Listing & Evidence Desk', section: 'Content Moderation' },
    analytics: { title: 'Operations & KPI Analytics', section: 'Intelligence' },
    chronicle_desk: { title: 'Chronicle Peer-Review Desk', section: 'Editorial Governance' },
    fraud_disputes: { title: 'Trust & Dispute Claims', section: 'Unavailable (Phase 5+)' },
    gate_desk: { title: 'Gate Check-In Oversight', section: 'Unavailable (Phase 5+)' },
    turf_oversight: { title: 'Turf & Venue Oversight', section: 'Unavailable (Phase 5+)' },
    academy_oversight: { title: 'Academy & Coach Oversight', section: 'Unavailable (Phase 5+)' },
  }

  return (
    <main className="khelgrid-admin-app admin-lte-layout" aria-label="KhelGrid private administration">
      <div className="admin-lte-main-wrapper">
        <AdminSidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={tab => setActiveWorkspace(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          pendingSubmissionsCount={pendingListingsCount}
          pendingManuscriptsCount={pendingManuscriptsCount}
          moderatorEmail={identity.email}
          moderatorRole={identity.role}
          databaseId={databaseProjectRef}
        />

        <div className="admin-lte-content-canvas">
          <AdminHeader
            onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onResetPassword={openPasswordReset}
            onSignOut={() => void signOut()}
            activeWorkspaceTitle={workspaceDetails[activeWorkspace]?.title || 'Command Centre'}
            activeWorkspaceSection={workspaceDetails[activeWorkspace]?.section || 'Operations'}
            theme={adminTheme}
            onChangeTheme={handleThemeChange}
            pendingSubmissionsCount={pendingListingsCount}
            pendingManuscriptsCount={pendingManuscriptsCount}
            dbLatencyMs={dbLatencyMs}
            databaseId={databaseProjectRef}
            operatorEmail={identity.email}
            operatorRole={identity.role}
          />

          {toastNotification && (
            <div className="admin-floating-toast" role="status">
              <SiteIcon name="check-circle" size={16} />
              <span>{toastNotification}</span>
            </div>
          )}

          <div className="admin-shell-content">
            {activeWorkspace === 'command' ? (
              <AdminControlPanelPage />
            ) : activeWorkspace === 'moderation_desk' ? (
              <AdminModerationPage initialDesk="listings" />
            ) : activeWorkspace === 'chronicle_desk' ? (
              <AdminModerationPage initialDesk="chronicle" />
            ) : activeWorkspace === 'analytics' ? (
              <AdminAnalyticsDashboard />
            ) : UNAVAILABLE_LOCALSTORAGE_WORKSPACES.has(activeWorkspace) ? (
              <AdminGroundOversightView
                initialDesk={
                  activeWorkspace === 'gate_desk'
                    ? 'gate'
                    : activeWorkspace === 'turf_oversight'
                      ? 'turf'
                      : activeWorkspace === 'fraud_disputes'
                        ? 'fraud'
                        : 'academy'
                }
              />
            ) : (
              <AdminControlPanelPage />
            )}
          </div>
        </div>
      </div>

      <AdminCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
      />
    </main>
  )
}

export function AdminApp({ initialAuthOverride }: AdminAppProps = {}) {
  return (
    <AdminAuthGate initialAuthOverride={initialAuthOverride}>
      <AuthenticatedAdminShell />
    </AdminAuthGate>
  )
}
