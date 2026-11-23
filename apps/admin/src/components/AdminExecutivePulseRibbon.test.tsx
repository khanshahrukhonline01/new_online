import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminExecutivePulseRibbon } from './AdminExecutivePulseRibbon'

describe('AdminExecutivePulseRibbon', () => {
  it('renders pending counts, database health, and operator details', () => {
    const html = renderToStaticMarkup(
      <AdminExecutivePulseRibbon
        pendingSubmissionsCount={7}
        pendingManuscriptsCount={3}
        databaseId="hznsbxvovjxvmnchzzqt"
        dbLatencyMs={42}
        operatorRole="super_admin"
        operatorEmail="admin@khelgrid.com"
      />
    )

    expect(html).toContain('7')
    expect(html).toContain('Requires Action')
    expect(html).toContain('3')
    expect(html).toContain('Peer Review Pending')
    expect(html).toContain('42ms (Optimal)')
    expect(html).toContain('hznsbxvovjxvmnchzzqt')
    expect(html).toContain('Super Administrator')
    expect(html).toContain('admin@khelgrid.com')
  })

  it('renders clean queue when pending submissions count is 0', () => {
    const html = renderToStaticMarkup(
      <AdminExecutivePulseRibbon
        pendingSubmissionsCount={0}
        pendingManuscriptsCount={0}
        databaseId="test-db"
        dbLatencyMs={120}
        operatorRole="moderator"
        operatorEmail="mod@khelgrid.com"
      />
    )

    expect(html).toContain('Queue Clear')
    expect(html).toContain('Platform Moderator')
    expect(html).toContain('120ms (Good)')
  })
})
