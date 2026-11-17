import { useState } from 'react'
import { AdminControlPanelPage } from '../../../src/modules/admin/AdminControlPanelPage'
import { AdminModerationPage } from '../../../src/modules/admin/AdminModerationPage'
import { usePreferences } from '../../../src/shared/usePreferences'

const DEVELOPMENT_SUPABASE_URL = 'https://hznsbxvovjxvmnchzzqt.supabase.co'

export function AdminApp() {
  const { preferences, updatePreferences } = usePreferences()
  const [activeArea, setActiveArea] = useState<'listings' | 'chronicle'>('listings')
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')

  if (configuredUrl !== DEVELOPMENT_SUPABASE_URL) {
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
      <div className="admin-theme-controls" aria-label="Appearance preferences">
        <label>
          Accent colour
          <select value={preferences.accent} onChange={event => updatePreferences({ accent: event.target.value as 'green' | 'blue' | 'orange' })}>
            <option value="green">Emerald Green</option>
            <option value="blue">Royal Blue</option>
            <option value="orange">Dynamic Orange</option>
          </select>
        </label>
        <label>
          Appearance
          <select value={preferences.theme} onChange={event => updatePreferences({ theme: event.target.value as 'light' | 'dark' | 'system' })}>
            <option value="system">System default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
      <nav className="admin-app-area-nav" aria-label="Administration sections">
        <button
          type="button"
          aria-current={activeArea === 'listings' ? 'page' : undefined}
          className={activeArea === 'listings' ? 'active' : ''}
          onClick={() => setActiveArea('listings')}
        >
          Listings &amp; Verification
        </button>
        <button
          type="button"
          aria-current={activeArea === 'chronicle' ? 'page' : undefined}
          className={activeArea === 'chronicle' ? 'active' : ''}
          onClick={() => setActiveArea('chronicle')}
        >
          KhelChronicle Editorial
        </button>
      </nav>
      {activeArea === 'listings'
        ? <AdminControlPanelPage />
        : <AdminModerationPage initialDesk="chronicle" hideDeskSwitcher />}

    </main>
  )
}
