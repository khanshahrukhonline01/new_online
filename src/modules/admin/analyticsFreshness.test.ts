import { describe, it, expect } from 'vitest'
import {
  formatExactRefreshTimestamp,
  formatRelativeRefreshTime,
  getDataFreshnessState,
} from './analyticsFreshness'

describe('Admin Analytics Data Freshness Helpers', () => {
  it('formats relative refresh times accurately across seconds, minutes, hours, and future clock skew', () => {
    const base = new Date('2026-11-26T10:00:00Z')
    expect(formatRelativeRefreshTime(base, base.getTime() - 5000)).toBe('just now')
    expect(formatRelativeRefreshTime(base, base.getTime() + 10_000)).toBe('just now')
    expect(formatRelativeRefreshTime(base, base.getTime() + 32_000)).toBe('32s ago')
    expect(formatRelativeRefreshTime(base, base.getTime() + 125_000)).toBe('2m ago')
    expect(formatRelativeRefreshTime(base, base.getTime() + 3_700_000)).toBe('1h ago')
    expect(formatRelativeRefreshTime(base, base.getTime() + 90_000_000)).toBe('1d ago')
  })

  it('classifies freshness tiers into fresh, aging, and stale states and handles active refresh', () => {
    const base = new Date('2026-11-26T10:00:00Z')

    const fresh = getDataFreshnessState(base, base.getTime() + 45_000, false)
    expect(fresh.level).toBe('fresh')
    expect(fresh.statusLabel).toBe('Up to date')
    expect(fresh.relativeLabel).toBe('45s ago')

    const aging = getDataFreshnessState(base, base.getTime() + 180_000, false)
    expect(aging.level).toBe('aging')
    expect(aging.statusLabel).toBe('Aging snapshot')
    expect(aging.relativeLabel).toBe('3m ago')

    const stale = getDataFreshnessState(base, base.getTime() + 420_000, false)
    expect(stale.level).toBe('stale')
    expect(stale.statusLabel).toBe('Stale snapshot')
    expect(stale.relativeLabel).toBe('7m ago')

    const syncing = getDataFreshnessState(base, base.getTime() + 420_000, true)
    expect(syncing.level).toBe('fresh')
    expect(syncing.statusLabel).toBe('Refreshing telemetry…')
    expect(syncing.relativeLabel).toBe('syncing…')
  })

  it('formats a non-empty exact refresh timestamp string', () => {
    const exact = formatExactRefreshTimestamp(new Date('2026-11-26T10:05:09Z'))
    expect(exact.length).toBeGreaterThan(8)
  })
})
