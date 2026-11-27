/**
 * Pure data freshness calculation & timestamp formatting helpers for AdminAnalyticsDashboard.
 */

export type DataFreshnessLevel = 'fresh' | 'aging' | 'stale'

export interface DataFreshnessState {
  level: DataFreshnessLevel
  statusLabel: string
  relativeLabel: string
  exactLabel: string
  elapsedSeconds: number
}

const FRESH_THRESHOLD_SEC = 120 // < 2 minutes
const AGING_THRESHOLD_SEC = 300 // 2–5 minutes

/**
 * Formats elapsed time since last refresh into concise human-readable relative copy.
 */
export function formatRelativeRefreshTime(lastRefreshedAt: Date, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - lastRefreshedAt.getTime()) / 1000))
  if (diffSec < 15) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

/**
 * Formats an exact readable timestamp (date + HH:MM:SS) for tooltip inspection.
 */
export function formatExactRefreshTimestamp(lastRefreshedAt: Date): string {
  try {
    return lastRefreshedAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return lastRefreshedAt.toISOString()
  }
}

/**
 * Computes semantic freshness tier and labels for the analytics telemetry indicator.
 */
export function getDataFreshnessState(
  lastRefreshedAt: Date,
  nowMs: number = Date.now(),
  isRefreshing = false,
): DataFreshnessState {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastRefreshedAt.getTime()) / 1000))
  let level: DataFreshnessLevel = 'fresh'
  let statusLabel = 'Up to date'

  if (isRefreshing) {
    level = 'fresh'
    statusLabel = 'Refreshing telemetry…'
  } else if (elapsedSeconds >= AGING_THRESHOLD_SEC) {
    level = 'stale'
    statusLabel = 'Stale snapshot'
  } else if (elapsedSeconds >= FRESH_THRESHOLD_SEC) {
    level = 'aging'
    statusLabel = 'Aging snapshot'
  }

  return {
    level,
    statusLabel,
    relativeLabel: isRefreshing ? 'syncing…' : formatRelativeRefreshTime(lastRefreshedAt, nowMs),
    exactLabel: formatExactRefreshTimestamp(lastRefreshedAt),
    elapsedSeconds,
  }
}
