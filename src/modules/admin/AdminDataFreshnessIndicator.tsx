import { useEffect, useRef, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getDataFreshnessState } from './analyticsFreshness'
import './AdminDataFreshnessIndicator.css'

export interface AdminDataFreshnessIndicatorProps {
  lastRefreshedAt: Date
  isRefreshing: boolean
  autoRefreshEnabled: boolean
  onRefreshNow: () => void
}

export function AdminDataFreshnessIndicator({
  lastRefreshedAt,
  isRefreshing,
  autoRefreshEnabled,
  onRefreshNow,
}: AdminDataFreshnessIndicatorProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hoverTimerRef = useRef<number | null>(null)

  const isTooltipOpen = isHovered || isPinned

  // Keep relative elapsed copy accurate every 10 seconds
  useEffect(() => {
    setNowMs(Date.now())
    const id = window.setInterval(() => {
      setNowMs(Date.now())
    }, 10_000)
    return () => window.clearInterval(id)
  }, [lastRefreshedAt])

  // Close interactive tooltip on outside click or Escape
  useEffect(() => {
    if (!isTooltipOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsPinned(false)
        setIsHovered(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPinned(false)
        setIsHovered(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isTooltipOpen])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const freshness = getDataFreshnessState(lastRefreshedAt, nowMs, isRefreshing)

  const handleMouseEnter = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    hoverTimerRef.current = window.setTimeout(() => {
      setIsHovered(false)
    }, 160)
  }

  const handleIndicatorClick = () => {
    if (isPinned) {
      setIsPinned(false)
      setIsHovered(false)
    } else {
      setIsPinned(true)
    }
  }

  return (
    <div
      className="admin-freshness-bar"
      ref={containerRef}
      data-testid="analytics-freshness-bar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="admin-freshness-anchor">
        <button
          type="button"
          className={`admin-freshness-indicator is-${freshness.level} ${isRefreshing ? 'is-syncing' : ''}`}
          onClick={handleIndicatorClick}
          aria-expanded={isTooltipOpen}
          aria-describedby={isTooltipOpen ? 'admin-analytics-freshness-tooltip' : undefined}
          data-testid="analytics-freshness-indicator"
          title={`Last refreshed at ${freshness.exactLabel}`}
        >
          <span className="admin-freshness-dot" aria-hidden="true" />
          <span className="admin-freshness-text">
            {isRefreshing ? (
              'Refreshing data…'
            ) : (
              <>
                Last refreshed <strong className="tabular-nums">{freshness.relativeLabel}</strong>
              </>
            )}
          </span>
          <SiteIcon name="info" size={12} className="admin-freshness-info-icon" />
        </button>

        {isTooltipOpen && (
          <div
            id="admin-analytics-freshness-tooltip"
            className="admin-freshness-tooltip"
            role="dialog"
            aria-label="Dashboard data refresh details"
            data-testid="analytics-freshness-tooltip"
          >
            <div className="admin-freshness-tooltip-head">
              <span className={`admin-freshness-status-badge is-${freshness.level}`}>
                <span className="admin-freshness-dot" aria-hidden="true" />
                {freshness.statusLabel}
              </span>
              <span className="admin-freshness-cadence">
                {autoRefreshEnabled ? 'Auto-sync: 30s' : 'Manual sync'}
              </span>
            </div>

            <dl className="admin-freshness-meta-list">
              <div>
                <dt>Last synced</dt>
                <dd className="tabular-nums" data-testid="analytics-freshness-exact-time">
                  {freshness.exactLabel}
                </dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>KPIs, Compliance Heatmap, Queue &amp; Audit Feed</dd>
              </div>
            </dl>

            <div className="admin-freshness-tooltip-footer">
              <button
                type="button"
                className="admin-freshness-tooltip-action"
                onClick={() => {
                  onRefreshNow()
                }}
                disabled={isRefreshing}
                data-testid="freshness-tooltip-refresh-btn"
              >
                <SiteIcon name="refresh" size={12} className={isRefreshing ? 'spinning' : ''} />
                <span>{isRefreshing ? 'Refreshing…' : 'Refresh Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <span className="admin-freshness-divider" aria-hidden="true" />

      <button
        type="button"
        className="admin-freshness-refresh-btn"
        onClick={onRefreshNow}
        disabled={isRefreshing}
        data-testid="analytics-refresh-now-btn"
        aria-label="Refresh analytics data now"
      >
        <SiteIcon name="refresh" size={13} className={isRefreshing ? 'spinning' : ''} />
        <span>{isRefreshing ? 'Refreshing…' : 'Refresh Now'}</span>
      </button>
    </div>
  )
}
