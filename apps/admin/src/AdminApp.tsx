import { AdminControlPanelPage } from '../../../src/modules/admin/AdminControlPanelPage'

const DEVELOPMENT_SUPABASE_URL = 'https://hznsbxvovjxvmnchzzqt.supabase.co'

export function AdminApp() {
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
      <AdminControlPanelPage />
    </main>
  )
}
