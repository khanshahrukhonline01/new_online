import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('../../../src/modules/admin/AdminControlPanelPage', () => ({
  AdminControlPanelPage: () => <div>Admin listings workspace</div>,
}))
vi.mock('../../../src/modules/admin/AdminModerationPage', () => ({
  AdminModerationPage: () => <div>Chronicle editorial workspace</div>,
}))
vi.mock('../../../src/shared/usePreferences', () => ({
  usePreferences: () => ({
    preferences: { accent: 'green', theme: 'system' },
    updatePreferences: vi.fn(),
  }),
}))

describe('separate KhelGrid admin application', () => {
  it('exposes distinct listings and KhelChronicle administration areas', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://hznsbxvovjxvmnchzzqt.supabase.co')
    const { AdminApp } = await import('./AdminApp')
    const html = renderToStaticMarkup(<AdminApp />)

    expect(html).toContain('Listings &amp; Verification')
    expect(html).toContain('KhelChronicle Editorial')
    expect(html).toContain('Admin listings workspace')
  })
})
