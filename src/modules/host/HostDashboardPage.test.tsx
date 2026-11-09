import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HostDashboardPage from './HostDashboardPage'

describe('HostDashboardPage', () => {
  it('does not show sample host records or accept listing-plan payments while paused', () => {
    const html = renderToStaticMarkup(<HostDashboardPage />)
    expect(html).toContain('Host tools are being prepared')
    expect(html).toContain('Listing payments and host payouts are paused')
    expect(html).not.toContain('FSV Arena Bengaluru')
    expect(html).not.toContain('KG_ORD_')
    expect(html).not.toContain('Proceed to Pay')
    expect(html).not.toContain('Lifelong VIP Plan')
  })

  it('offers community intake without claiming publication', () => {
    const onOpenIntake = vi.fn()
    const html = renderToStaticMarkup(<HostDashboardPage onOpenIntake={onOpenIntake} />)
    expect(html).toContain('Submit a listing for review')
    expect(html).toContain('A submission is not published or verified')
  })
})
