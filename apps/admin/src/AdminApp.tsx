import { useEffect, useState } from 'react'
import { AdminControlPanelPage } from '../../../src/modules/admin/AdminControlPanelPage'
import { AdminModerationPage } from '../../../src/modules/admin/AdminModerationPage'
import { SiteIcon } from '../../../src/shared/components/SiteIcon'
import { usePreferences } from '../../../src/shared/usePreferences'

const DEVELOPMENT_SUPABASE_URL = 'https://hznsbxvovjxvmnchzzqt.supabase.co'

export function AdminApp() {
  const { preferences, updatePreferences } = usePreferences()
  const configuredUrl = (import.meta.env.VITE_SUPABASE_URL || DEVELOPMENT_SUPABASE_URL)
    ?.toString()
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/$/, '')

  const [activeWorkspace, setActiveWorkspace] = useState<'command' | 'moderation_desk'>('command')

  useEffect(() => {
    document.title = 'KhelGrid Admin Operations · admin.khelgrid.com'
  }, [])

  useEffect(() => {
    const handleSwitchWorkspace = (e: Event) => {
      const detail = (e as CustomEvent<{ workspace?: 'command' | 'moderation_desk' }>).detail
      if (detail?.workspace) {
        setActiveWorkspace(detail.workspace)
      }
    }
    window.addEventListener('khelgrid-admin-switch-workspace', handleSwitchWorkspace)
    return () => window.removeEventListener('khelgrid-admin-switch-workspace', handleSwitchWorkspace)
  }, [])

  const isApproved =
    Boolean(configuredUrl) &&
    (configuredUrl === DEVELOPMENT_SUPABASE_URL || configuredUrl.includes('hznsbxvovjxvmnchzzqt'))

  if (!isApproved) {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-config-error" role="alert">
        <h1>KhelGrid Admin is unavailable</h1>
        <p>This development admin application is not configured for its approved development database.</p>
        <p>Contact the platform owner. Do not attempt to bypass this restriction.</p>
      </main>
    )
  }

  return (
    <main className="khelgrid-admin-app" aria-label="KhelGrid private administration">
      {/* Executive Operations Topbar */}
      <header className="admin-shell-topbar">
        <div className="admin-shell-brand">
          <span className="admin-shell-badge-mark">KG</span>
          <div>
            <span className="admin-shell-title">KhelGrid Admin Operations</span>
            <span className="admin-shell-sub">admin.khelgrid.com</span>
          </div>
        </div>

        <nav className="admin-shell-nav" aria-label="Admin views">
          <button
            type="button"
            className={`admin-shell-tab-btn ${activeWorkspace === 'command' ? 'is-active' : ''}`}
            onClick={() => setActiveWorkspace('command')}
          >
            <SiteIcon name="activity" size={15} />
            <span>Command Centre</span>
          </button>
          <button
            type="button"
            className={`admin-shell-tab-btn ${activeWorkspace === 'moderation_desk' ? 'is-active' : ''}`}
            onClick={() => setActiveWorkspace('moderation_desk')}
          >
            <SiteIcon name="check-circle" size={15} />
            <span>Listing &amp; Chronicle Desk</span>
          </button>
        </nav>

        <div className="admin-shell-meta">
          <button
            type="button"
            className="admin-shell-reset-pw-btn"
            title="Reset moderator password"
            onClick={() => {
              setActiveWorkspace('command')
              window.dispatchEvent(new CustomEvent('khelgrid-admin-open-forgot-password'))
            }}
          >
            <SiteIcon name="lock" size={13} />
            <span>Reset Password</span>
          </button>
          <div className="admin-theme-inline" aria-label="Appearance preferences">
            <label>
              Theme
              <select value={preferences.theme} onChange={event => updatePreferences({ theme: event.target.value as 'light' | 'dark' | 'system' })}>
                <option value="system">System default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
          <span className="admin-shell-db-indicator">
            <span className="admin-shell-status-dot" />
            <span>Dev Database (hznsbxvovjxvmnchzzqt)</span>
          </span>
        </div>
      </header>

      {/* Main Admin Workspace View */}
      <div className="admin-shell-content">
        {activeWorkspace === 'command' ? (
          <AdminControlPanelPage />
        ) : (
          <AdminModerationPage />
        )}
      </div>
    </main>
  )
}
