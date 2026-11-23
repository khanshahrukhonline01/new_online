import { useEffect, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'

export interface RealtimeAuditEvent {
  id: string
  timestamp: string
  type: 'approval' | 'submission' | 'screening' | 'revision' | 'security'
  title: string
  refCode?: string
  meta?: string
}

export const DEFAULT_OPERATIONAL_EVENTS: RealtimeAuditEvent[] = [
  {
    id: 'evt-1',
    timestamp: 'Just now',
    type: 'approval',
    title: 'Listing approved for catalogue publication',
    refCode: 'KHL-2026-003',
    meta: 'Football Academy · Delhi',
  },
  {
    id: 'evt-2',
    timestamp: '7m ago',
    type: 'submission',
    title: 'New trial intake received from academy coordinator',
    refCode: 'KHL-2026-005',
    meta: 'U-17 Cricket Trials · Mumbai',
  },
  {
    id: 'evt-3',
    timestamp: '22m ago',
    type: 'screening',
    title: 'KhelChronicle peer-screening started by moderator',
    refCode: 'KG-SUB-002',
    meta: 'High-Altitude Hypoxia Training · Sports Science',
  },
  {
    id: 'evt-4',
    timestamp: '48m ago',
    type: 'security',
    title: 'Database connection & RLS health revalidation verified',
    meta: 'hznsbxvovjxvmnchzzqt · 34ms latency',
  },
  {
    id: 'evt-5',
    timestamp: '2h ago',
    type: 'revision',
    title: 'Clarification requested from organizer',
    refCode: 'KHL-2026-001',
    meta: 'Federation sanction circular required',
  },
]

export interface AdminRealtimeAuditTickerProps {
  events?: RealtimeAuditEvent[]
  isLive?: boolean
  onSelectRefCode?: (refCode: string) => void
}

export function AdminRealtimeAuditTicker({
  events = DEFAULT_OPERATIONAL_EVENTS,
  isLive = true,
  onSelectRefCode,
}: AdminRealtimeAuditTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showFullLog, setShowFullLog] = useState(false)

  // Auto-rotate ticker every 5 seconds when not paused
  useEffect(() => {
    if (isPaused || events.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % events.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isPaused, events.length])

  const activeEvent = events[currentIndex] || events[0]

  const getEventIcon = (type: RealtimeAuditEvent['type']) => {
    switch (type) {
      case 'approval':
        return <SiteIcon name="check-circle" size={14} />
      case 'submission':
        return <SiteIcon name="arrow-up-right" size={14} />
      case 'screening':
        return <SiteIcon name="award" size={14} />
      case 'revision':
        return <SiteIcon name="alert-circle" size={14} />
      case 'security':
        return <SiteIcon name="shield-check" size={14} />
    }
  }

  return (
    <>
      <div
        className="admin-realtime-ticker"
        role="region"
        aria-label="Real-time operations event stream"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left Live Beacon */}
        <div className="admin-ticker-live-tag">
          <span className={`admin-ticker-beacon ${isLive ? 'is-live' : ''}`} />
          <span>{isLive ? 'REALTIME STREAM' : 'OFFLINE LOG'}</span>
        </div>

        {/* Center Active Event */}
        <div className="admin-ticker-item">
          <span className={`admin-ticker-type-icon type-${activeEvent.type}`}>
            {getEventIcon(activeEvent.type)}
          </span>
          {activeEvent.refCode && (
            <button
              type="button"
              className="admin-ticker-ref"
              onClick={() => onSelectRefCode?.(activeEvent.refCode!)}
              title={`Filter for ${activeEvent.refCode}`}
            >
              {activeEvent.refCode}
            </button>
          )}
          <span className="admin-ticker-title">{activeEvent.title}</span>
          {activeEvent.meta && <span className="admin-ticker-meta">· {activeEvent.meta}</span>}
          <span className="admin-ticker-time">{activeEvent.timestamp}</span>
        </div>

        {/* Right Controls */}
        <div className="admin-ticker-controls">
          <span className="admin-ticker-counter">
            {currentIndex + 1}/{events.length}
          </span>
          <button
            type="button"
            className="admin-ticker-btn"
            onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : events.length - 1))}
            title="Previous operational event"
            aria-label="Previous operational event"
          >
            ‹
          </button>
          <button
            type="button"
            className="admin-ticker-btn"
            onClick={() => setCurrentIndex(prev => (prev + 1) % events.length)}
            title="Next operational event"
            aria-label="Next operational event"
          >
            ›
          </button>
          <button
            type="button"
            className="admin-ticker-btn"
            onClick={() => setShowFullLog(true)}
            title="Expand full activity log"
          >
            <SiteIcon name="activity" size={12} />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* Expanded Audit Log Modal */}
      {showFullLog && (
        <div className="admin-drawer-backdrop" onClick={() => setShowFullLog(false)}>
          <div
            className="admin-shortcuts-dialog"
            style={{ maxWidth: 620 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-audit-log-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-shortcuts-header">
              <h3 id="admin-audit-log-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SiteIcon name="activity" size={18} />
                Real-Time Operations &amp; Security Stream
              </h3>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => setShowFullLog(false)}
                aria-label="Close activity log"
              >
                ✕
              </button>
            </div>

            <div className="admin-ticker-expanded-list">
              {events.map(evt => (
                <div key={evt.id} className="admin-ticker-expanded-item">
                  <div className={`admin-ticker-type-icon type-${evt.type}`}>
                    {getEventIcon(evt.type)}
                  </div>
                  <div className="admin-ticker-expanded-body">
                    <div className="top-line">
                      {evt.refCode && <span className="ref-pill">{evt.refCode}</span>}
                      <strong>{evt.title}</strong>
                      <span className="time">{evt.timestamp}</span>
                    </div>
                    {evt.meta && <small className="meta">{evt.meta}</small>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
