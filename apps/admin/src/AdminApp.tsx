import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { AdminControlPanelPage } from '../../../src/modules/admin/AdminControlPanelPage'
import { AdminAnalyticsDashboard } from '../../../src/modules/admin/AdminAnalyticsDashboard'
import { SiteIcon } from '../../../src/shared/components/SiteIcon'
import { usePreferences } from '../../../src/shared/usePreferences'
import { AdminSidebar, type AdminWorkspaceTab } from './components/AdminSidebar'
import { AdminHeader, type AdminThemeMode } from './components/AdminHeader'
import { AdminCommandPalette, type CommandPaletteAction } from './components/AdminCommandPalette'
import { AdminGroundOversightView } from './components/AdminGroundOversightView'
import { AdminCampaignMarketplaceDesk } from './components/AdminCampaignMarketplaceDesk'
import { AdminTenantManagementDesk } from './components/AdminTenantManagementDesk'
import { AdminVerificationVaultDesk } from './components/AdminVerificationVaultDesk'
import { AdminListingModerationDesk } from './components/AdminListingModerationDesk'
import { AdminChronicleEditorialDesk } from './components/AdminChronicleEditorialDesk'
import { AdminTrustSafetyDesk } from './components/AdminTrustSafetyDesk'
import { AdminPlatformGovernanceDesk } from './components/AdminPlatformGovernanceDesk'
import { AdminRegulatoryInboxDesk } from './components/AdminRegulatoryInboxDesk'
import { loadUnifiedRegulatoryInbox } from './services/adminRegulatoryInboxService'
import {
  loadGlobalAdminSearchIndex,
  type AdminDeskDeepLink,
  type GlobalSearchEntityItem,
} from './services/adminGlobalSearchService'
import { subscribeRegulatoryState } from '../../../src/shared/governance/regulatoryBridge'
import {
  AdminAuthGate,
  useAdminAuth,
  type AdminAuthGateProps,
} from './auth/AdminAuthProvider'
import { isWorkspaceAuthorized } from './auth/adminSecurityPolicy'
import {
  getAdminModerationQueue,
  clearCatalogueCache,
} from '../../../src/integrations/supabase/public-client'
import { getChronicleModerationQueue } from '../../../src/integrations/supabase/chronicle-client'
import './admin-app.css'
import './admin-modern-theme.css'

export interface AdminAppProps {
  /**
   * Controlled unit-test injection only; never populated in runtime entrypoints.
   */
  initialAuthOverride?: AdminAuthGateProps['initialAuthOverride']
  initialWorkspace?: AdminWorkspaceTab
}

const KEY_CHORD_WORKSPACES: Record<string, AdminWorkspaceTab> = {
  c: 'command',
  i: 'regulatory_inbox',
  m: 'moderation_desk',
  a: 'analytics',
  r: 'chronicle_desk',
  t: 'tenant_governance',
  v: 'verification_vault',
  s: 'fraud_disputes',
  p: 'platform_governance',
  g: 'gate_desk',
  u: 'turf_oversight',
  b: 'academy_oversight',
}

function AuthenticatedAdminShell({
  initialWorkspace = 'command',
}: {
  initialWorkspace?: AdminWorkspaceTab
}) {
  const { identity, databaseProjectRef, signOut, revalidate, openPasswordReset } = useAdminAuth()
  const { updatePreferences } = usePreferences()

  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspaceTab>(initialWorkspace)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [pendingListingsCount, setPendingListingsCount] = useState(0)
  const [pendingManuscriptsCount, setPendingManuscriptsCount] = useState(0)
  const [inboxActionableCount, setInboxActionableCount] = useState(0)
  const [inboxBreachedCount, setInboxBreachedCount] = useState(0)
  const [toastNotification, setToastNotification] = useState<string | null>(null)
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null)
  const [isRefreshingCounts, setIsRefreshingCounts] = useState(false)
  const [globalSearchItems, setGlobalSearchItems] = useState<GlobalSearchEntityItem[]>([])
  const [isLoadingSearchIndex, setIsLoadingSearchIndex] = useState(false)
  const [deskDeepLink, setDeskDeepLink] = useState<AdminDeskDeepLink | null>(null)
  const lastGKeyTimeRef = useRef<number>(0)

  const [adminTheme, setAdminTheme] = useState<AdminThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('khelgrid_admin_theme') as AdminThemeMode | null
      if (saved && ['light', 'dark', 'cosmic', 'system'].includes(saved)) {
        return saved === 'cosmic' ? 'dark' : saved
      }
    }
    return 'dark'
  })

  const handleThemeChange = useCallback(
    (newTheme: AdminThemeMode) => {
      const normalized = newTheme === 'cosmic' ? 'dark' : newTheme
      setAdminTheme(normalized)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('khelgrid_admin_theme', normalized)
      }
      if (normalized === 'dark') {
        updatePreferences({ theme: 'dark' })
      } else if (normalized === 'light') {
        updatePreferences({ theme: 'light' })
      } else {
        updatePreferences({ theme: 'system' })
      }
    },
    [updatePreferences],
  )

  useEffect(() => {
    document.title = 'KhelGrid Admin Operations · admin.khelgrid.com'
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const root = document.documentElement
    const applyResolvedTheme = (resolved: 'light' | 'dark') => {
      root.setAttribute('data-admin-theme', resolved)
      root.classList.toggle('dark', resolved === 'dark')
      root.classList.remove('cosmic')
    }

    if (adminTheme === 'dark' || adminTheme === 'cosmic') {
      applyResolvedTheme('dark')
      return
    }
    if (adminTheme === 'light') {
      applyResolvedTheme('light')
      return
    }

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    applyResolvedTheme(mediaQuery?.matches ? 'dark' : 'light')

    if (!mediaQuery) return
    const handleMediaChange = (event: MediaQueryListEvent) => {
      applyResolvedTheme(event.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [adminTheme])

  const loadCounts = useCallback(async () => {
    setIsRefreshingCounts(true)
    const start = Date.now()
    try {
      const [queueRes, chronicleRes, inboxSnapshot] = await Promise.all([
        getAdminModerationQueue({ limit: 50 }).catch(() => null),
        getChronicleModerationQueue().catch(() => null),
        loadUnifiedRegulatoryInbox().catch(() => null),
      ])
      setDbLatencyMs(Math.max(1, Date.now() - start))
      if (queueRes?.pendingSubmissions) {
        setPendingListingsCount(queueRes.pendingSubmissions.length)
      }
      if (chronicleRes?.submissions) {
        setPendingManuscriptsCount(chronicleRes.submissions.length)
      }
      if (inboxSnapshot) {
        setInboxActionableCount(inboxSnapshot.metrics.totalActionable)
        setInboxBreachedCount(inboxSnapshot.metrics.breachedCount)
      }
    } catch {
      setDbLatencyMs(null)
    } finally {
      setIsRefreshingCounts(false)
    }
  }, [])

  const refreshGlobalSearchIndex = useCallback(async () => {
    setIsLoadingSearchIndex(true)
    try {
      const items = await loadGlobalAdminSearchIndex()
      setGlobalSearchItems(items)
    } catch {
      // keep prior search index if transient error
    } finally {
      setIsLoadingSearchIndex(false)
    }
  }, [])

  useEffect(() => {
    void loadCounts()
    void refreshGlobalSearchIndex()
    return subscribeRegulatoryState(() => {
      void loadCounts()
      void refreshGlobalSearchIndex()
    })
  }, [loadCounts, refreshGlobalSearchIndex])

  useEffect(() => {
    if (isCommandPaletteOpen) {
      void refreshGlobalSearchIndex()
    }
  }, [isCommandPaletteOpen, refreshGlobalSearchIndex])

  const handleSelectSearchEntity = useCallback((item: GlobalSearchEntityItem) => {
    setActiveWorkspace(item.targetWorkspace)
    setDeskDeepLink({
      workspace: item.targetWorkspace,
      recordId: item.focusRecordId,
      query: item.focusQuery,
      tab: item.focusTab,
      nonce: Date.now(),
    })
    setToastNotification(`Jumped to ${item.title} in ${item.targetDeskLabel}.`)
    window.setTimeout(() => setToastNotification(null), 3200)
  }, [])

  // Global keyboard navigation chords (G + workspace key), suppressed inside inputs or open dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false)
        return
      }
      if (isCommandPaletteOpen) return
      if (typeof document !== 'undefined' && document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        lastGKeyTimeRef.current = 0
        return
      }
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()
      const now = Date.now()

      if (lastGKeyTimeRef.current && now - lastGKeyTimeRef.current < 900) {
        const nextTab = KEY_CHORD_WORKSPACES[key]
        if (nextTab) {
          e.preventDefault()
          setActiveWorkspace(nextTab)
          lastGKeyTimeRef.current = 0
          return
        }
      }

      if (key === 'g') {
        lastGKeyTimeRef.current = now
      } else {
        lastGKeyTimeRef.current = 0
      }
    }

    const handleResize = () => {
      if (window.innerWidth > 820) {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isCommandPaletteOpen, isMobileSidebarOpen])

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

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 820) {
      setIsMobileSidebarOpen(prev => !prev)
    } else {
      setIsSidebarCollapsed(prev => !prev)
    }
  }, [])

  const commandActions: CommandPaletteAction[] = useMemo(
    () => [
      {
        id: 'cmd-command',
        title: 'Open Command Centre',
        section: 'Operations',
        icon: 'activity',
        shortcut: 'G C',
        onSelect: () => setActiveWorkspace('command'),
      },
      {
        id: 'cmd-regulatory-inbox',
        title: 'Open Unified Regulatory Inbox & SLA Queue',
        section: 'Operations',
        icon: 'bell',
        badge:
          inboxBreachedCount > 0
            ? `${inboxBreachedCount} SLA Breached`
            : inboxActionableCount > 0
              ? `${inboxActionableCount} Open`
              : undefined,
        shortcut: 'G I',
        onSelect: () => setActiveWorkspace('regulatory_inbox'),
      },
      {
        id: 'cmd-moderation',
        title: 'Open Listing Moderation Queue',
        section: 'Operations',
        icon: 'check-circle',
        badge: pendingListingsCount > 0 ? `${pendingListingsCount} Pending` : undefined,
        shortcut: 'G M',
        onSelect: () => setActiveWorkspace('moderation_desk'),
      },
      {
        id: 'cmd-analytics',
        title: 'Open KPI & Operations Analytics',
        section: 'Operations',
        icon: 'chart',
        shortcut: 'G A',
        onSelect: () => setActiveWorkspace('analytics'),
      },
      {
        id: 'cmd-tenant-governance',
        title: 'Open Tenant & Organisation Governance Desk',
        section: 'Governance & Trust',
        icon: 'building',
        shortcut: 'G T',
        onSelect: () => setActiveWorkspace('tenant_governance'),
      },
      {
        id: 'cmd-verification-vault',
        title: 'Open Verification Centre & Evidence Vault',
        section: 'Governance & Trust',
        icon: 'shield-check',
        shortcut: 'G V',
        onSelect: () => setActiveWorkspace('verification_vault'),
      },
      {
        id: 'cmd-trust-safety',
        title: 'Open Trust & Safety, Complaints & Sanctions Desk',
        section: 'Governance & Trust',
        icon: 'flag',
        shortcut: 'G S',
        onSelect: () => setActiveWorkspace('fraud_disputes'),
      },
      {
        id: 'cmd-platform-governance',
        title: 'Open Platform Settings, Audit Trails & RBAC Desk',
        section: 'Governance & Trust',
        icon: 'settings',
        shortcut: 'G P',
        onSelect: () => setActiveWorkspace('platform_governance'),
      },
      {
        id: 'cmd-maker-checker',
        title: 'Open Dual-Control Approvals (Maker-Checker Queue)',
        section: 'Governance & Trust',
        icon: 'shield-check',
        onSelect: () => {
          setActiveWorkspace('platform_governance')
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('khelgrid-admin-open-maker-checker'))
          }, 0)
        },
      },
      {
        id: 'cmd-chronicle',
        title: 'Open Chronicle Peer-Review Desk',
        section: 'Editorial & Creators',
        icon: 'award',
        badge: pendingManuscriptsCount > 0 ? `${pendingManuscriptsCount} Pending` : undefined,
        shortcut: 'G R',
        onSelect: () => setActiveWorkspace('chronicle_desk'),
      },
      {
        id: 'cmd-creator-campaigns',
        title: 'Open Sports Creator Campaigns & Attribution Desk',
        section: 'Editorial & Creators',
        icon: 'award',
        onSelect: () => setActiveWorkspace('creator_campaigns'),
      },
      {
        id: 'cmd-gate-desk',
        title: 'Open QR Gate Check-In Telemetry Desk',
        section: 'Facilities',
        icon: 'shield-check',
        shortcut: 'G G',
        onSelect: () => setActiveWorkspace('gate_desk'),
      },
      {
        id: 'cmd-turf-oversight',
        title: 'Open Turf Utilization & Maintenance Desk',
        section: 'Facilities',
        icon: 'calendar',
        shortcut: 'G U',
        onSelect: () => setActiveWorkspace('turf_oversight'),
      },
      {
        id: 'cmd-academy-oversight',
        title: 'Open Academy Batch & Attendance Oversight Desk',
        section: 'Facilities',
        icon: 'building',
        shortcut: 'G B',
        onSelect: () => setActiveWorkspace('academy_oversight'),
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
        title: 'Switch to Dark Theme',
        section: 'Appearance',
        icon: 'moon',
        onSelect: () => handleThemeChange('dark'),
      },
      {
        id: 'cmd-theme-light',
        title: 'Switch to Light Theme',
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
    [
      inboxActionableCount,
      inboxBreachedCount,
      pendingListingsCount,
      pendingManuscriptsCount,
      handleThemeChange,
      openPasswordReset,
      revalidate,
      signOut,
    ],
  )

  const workspaceDetails: Record<AdminWorkspaceTab, { title: string; section: string }> = {
    command: { title: 'Command Centre', section: 'Operations' },
    regulatory_inbox: { title: 'Unified Regulatory Inbox', section: 'Operations' },
    moderation_desk: { title: 'Listing Moderation Queue', section: 'Operations' },
    analytics: { title: 'Operations & KPI Analytics', section: 'Operations' },
    tenant_governance: { title: 'Tenant & Org Governance', section: 'Governance & Trust' },
    verification_vault: { title: 'Verification & Evidence', section: 'Governance & Trust' },
    fraud_disputes: { title: 'Trust & Safety / Sanctions', section: 'Governance & Trust' },
    platform_governance: { title: 'Platform Settings & RBAC', section: 'Governance & Trust' },
    chronicle_desk: { title: 'Chronicle Peer-Review Desk', section: 'Editorial & Creators' },
    creator_campaigns: { title: 'Creator & Attribution Desk', section: 'Editorial & Creators' },
    gate_desk: { title: 'Gate Check-In Telemetry', section: 'Facilities' },
    turf_oversight: { title: 'Turf Utilization & Maintenance', section: 'Facilities' },
    academy_oversight: { title: 'Academy Batch & Attendance', section: 'Facilities' },
  }

  return (
    <main
      className="khelgrid-admin-app admin-lte-layout admin-v2-shell"
      aria-label="KhelGrid private administration"
    >
      <div className="admin-lte-main-wrapper">
        <AdminSidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={tab => setActiveWorkspace(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          regulatoryInboxCount={inboxActionableCount}
          pendingSubmissionsCount={pendingListingsCount}
          pendingManuscriptsCount={pendingManuscriptsCount}
          moderatorEmail={identity.email}
          moderatorRole={identity.role}
          databaseId={databaseProjectRef}
        />

        <div className="admin-lte-content-canvas">
          <AdminHeader
            onToggleSidebar={handleToggleSidebar}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onJumpToWorkspace={tab => setActiveWorkspace(tab)}
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

          {/* Compact Actionable Triage Strip */}
          <div className="admin-triage-strip" role="region" aria-label="Quick queue jump bar">
            <div className="admin-triage-items">
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'regulatory_inbox' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('regulatory_inbox')}
                data-testid="triage-regulatory-inbox"
              >
                <span>Regulatory Inbox</span>
                <span
                  className={`admin-triage-count ${inboxBreachedCount > 0 || inboxActionableCount > 0 ? 'is-pending' : ''}`}
                >
                  {inboxBreachedCount > 0
                    ? `${inboxBreachedCount} SLA`
                    : inboxActionableCount}
                </span>
              </button>
              <span className="admin-triage-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'moderation_desk' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('moderation_desk')}
              >
                <span>Listing Queue</span>
                <span className={`admin-triage-count ${pendingListingsCount > 0 ? 'is-pending' : ''}`}>
                  {pendingListingsCount}
                </span>
              </button>
              <span className="admin-triage-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'chronicle_desk' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('chronicle_desk')}
              >
                <span>Manuscripts</span>
                <span className={`admin-triage-count ${pendingManuscriptsCount > 0 ? 'is-pending' : ''}`}>
                  {pendingManuscriptsCount}
                </span>
              </button>
              <span className="admin-triage-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'verification_vault' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('verification_vault')}
              >
                <span>Verification Vault</span>
              </button>
              <span className="admin-triage-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'fraud_disputes' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('fraud_disputes')}
              >
                <span>Trust &amp; Safety</span>
              </button>
              <span className="admin-triage-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`admin-triage-link ${activeWorkspace === 'analytics' ? 'is-active' : ''}`}
                onClick={() => setActiveWorkspace('analytics')}
              >
                <span>KPI Analytics</span>
              </button>
            </div>

            <div className="admin-triage-actions">
              <span className="admin-triage-shortcut-hint">
                Press <kbd>G</kbd> + <kbd>M</kbd> for queue · <kbd>Ctrl+K</kbd> command
              </span>
              <button
                type="button"
                className="admin-triage-refresh-btn"
                onClick={() => void loadCounts()}
                disabled={isRefreshingCounts}
                title="Refresh queue counts"
              >
                <SiteIcon name="refresh" size={13} className={isRefreshingCounts ? 'spinning' : ''} />
                <span>{isRefreshingCounts ? 'Syncing…' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {toastNotification && (
            <div className="admin-floating-toast" role="status">
              <SiteIcon name="check-circle" size={16} />
              <span>{toastNotification}</span>
            </div>
          )}

          <div className="admin-shell-content">
            {activeWorkspace === 'command' ? (
              <AdminControlPanelPage />
            ) : activeWorkspace === 'regulatory_inbox' ? (
              <AdminRegulatoryInboxDesk
                operatorEmail={identity.email}
                onJumpToWorkspace={tab => setActiveWorkspace(tab)}
              />
            ) : activeWorkspace === 'moderation_desk' ? (
              <AdminListingModerationDesk
                operatorEmail={identity.email}
                deepLink={deskDeepLink?.workspace === 'moderation_desk' ? deskDeepLink : null}
              />
            ) : activeWorkspace === 'chronicle_desk' ? (
              <AdminChronicleEditorialDesk
                currentUser={{
                  name: identity.email.split('@')[0] || 'Editorial Board Operator',
                  email: identity.email,
                }}
              />
            ) : activeWorkspace === 'tenant_governance' ? (
              <AdminTenantManagementDesk
                operatorEmail={identity.email}
                deepLink={deskDeepLink?.workspace === 'tenant_governance' ? deskDeepLink : null}
              />
            ) : activeWorkspace === 'verification_vault' ? (
              <AdminVerificationVaultDesk
                operatorEmail={identity.email}
                deepLink={deskDeepLink?.workspace === 'verification_vault' ? deskDeepLink : null}
              />
            ) : activeWorkspace === 'analytics' ? (
              <AdminAnalyticsDashboard shellAuthorized />
            ) : activeWorkspace === 'creator_campaigns' ? (
              <AdminCampaignMarketplaceDesk operatorEmail={identity.email} />
            ) : activeWorkspace === 'fraud_disputes' ? (
              <AdminTrustSafetyDesk
                operatorEmail={identity.email}
                deepLink={deskDeepLink?.workspace === 'fraud_disputes' ? deskDeepLink : null}
              />
            ) : activeWorkspace === 'platform_governance' ? (
              <AdminPlatformGovernanceDesk
                operatorEmail={identity.email}
                operatorRole={identity.role}
                operatorUserId={identity.userId}
                deepLink={deskDeepLink?.workspace === 'platform_governance' ? deskDeepLink : null}
              />
            ) : (activeWorkspace === 'gate_desk' ||
                activeWorkspace === 'turf_oversight' ||
                activeWorkspace === 'academy_oversight') &&
              isWorkspaceAuthorized(activeWorkspace, identity.role) ? (
              <AdminGroundOversightView
                initialDesk={
                  activeWorkspace === 'gate_desk'
                    ? 'gate'
                    : activeWorkspace === 'turf_oversight'
                      ? 'turf'
                      : 'academy'
                }
                operatorEmail={identity.email}
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
        searchItems={globalSearchItems}
        onSelectEntity={handleSelectSearchEntity}
        isLoadingEntities={isLoadingSearchIndex}
      />
    </main>
  )
}

export function AdminApp({ initialAuthOverride, initialWorkspace }: AdminAppProps = {}) {
  return (
    <AdminAuthGate initialAuthOverride={initialAuthOverride}>
      <AuthenticatedAdminShell initialWorkspace={initialWorkspace} />
    </AdminAuthGate>
  )
}
