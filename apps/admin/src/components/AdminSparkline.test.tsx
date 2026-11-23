import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminSparkline } from './AdminSparkline'

describe('AdminSparkline (Phase 4 SVG Analytics)', () => {
  it('renders SVG sparkline path and percentage badge for positive trend', () => {
    const html = renderToStaticMarkup(
      <AdminSparkline data={[10, 12, 14, 18, 20]} color="#10b981" />
    )

    expect(html).toContain('admin-sparkline-svg')
    expect(html).toContain('admin-sparkline-badge')
    expect(html).toContain('is-up')
    expect(html).toContain('100%')
    expect(html).toContain('linearGradient')
    expect(html).toContain('circle')
  })

  it('renders downward badge for declining trend', () => {
    const html = renderToStaticMarkup(
      <AdminSparkline data={[20, 15, 10, 5]} color="#ef4444" ariaLabel="declining trend" />
    )

    expect(html).toContain('is-down')
    expect(html).toContain('75%')
    expect(html).toContain('aria-label="declining trend"')
  })

  it('returns null safely when data array is empty', () => {
    const html = renderToStaticMarkup(<AdminSparkline data={[]} />)
    expect(html).toBe('')
  })
})
