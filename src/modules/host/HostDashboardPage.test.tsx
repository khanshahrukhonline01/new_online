import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HostDashboardPage from './HostDashboardPage'

describe('HostDashboardPage', () => {
  it('shows free directory listings without inventing host records or offering checkout', () => {
    const html = renderToStaticMarkup(<HostDashboardPage />)
    expect(html).toContain('Host tools are being prepared')
    expect(html).toContain('Directory listings are free')
    expect(html).toContain('do not require a paid plan')
    expect(html).not.toContain('FSV Arena Bengaluru')
    expect(html).not.toContain('KG_ORD_')
    expect(html).not.toContain('Proceed to Pay')
    expect(html).not.toContain('Lifelong VIP Plan')
  })

  it('offers community intake without claiming publication', () => {
    const onOpenIntake = vi.fn()
    const html = renderToStaticMarkup(<HostDashboardPage onOpenIntake={onOpenIntake} />)
    expect(html).toContain('Submit a listing for review')
    expect(html).toContain('href="/submit-listing"')
    expect(html).toContain('A submission is not published or verified')
  })
})
