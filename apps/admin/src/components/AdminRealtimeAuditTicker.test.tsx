import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminRealtimeAuditTicker } from './AdminRealtimeAuditTicker'

describe('AdminRealtimeAuditTicker (Phase 4 Event Stream)', () => {
  it('renders default operational stream with live beacon and first event', () => {
    const html = renderToStaticMarkup(<AdminRealtimeAuditTicker isLive={true} />)

    expect(html).toContain('admin-realtime-ticker')
    expect(html).toContain('REALTIME STREAM')
    expect(html).toContain('is-live')
    expect(html).toContain('Listing approved for catalogue publication')
    expect(html).toContain('KHL-2026-003')
    expect(html).toContain('Audit Log')
  })

  it('renders offline indicator when isLive is false', () => {
    const html = renderToStaticMarkup(<AdminRealtimeAuditTicker isLive={false} />)

    expect(html).toContain('OFFLINE LOG')
    expect(html).not.toContain('is-live')
  })

  it('renders custom audit events when provided', () => {
    const html = renderToStaticMarkup(
      <AdminRealtimeAuditTicker
        isLive={true}
        events={[
          {
            id: 'test-1',
            timestamp: '1m ago',
            type: 'security',
            title: 'Custom security perimeter scan passed',
            meta: 'No vulnerabilities',
          },
        ]}
      />
    )

    expect(html).toContain('Custom security perimeter scan passed')
    expect(html).toContain('No vulnerabilities')
  })
})
