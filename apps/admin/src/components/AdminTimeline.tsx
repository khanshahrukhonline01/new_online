import type { ReactNode } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'

export interface AdminTimelineEntry {
  id: string
  dateGroup: string // e.g. "Today", "Yesterday", "Nov 18, 2026"
  timestamp: string
  title: string
  actor: string
  role?: string
  icon: SiteIconName
  iconTheme?: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'slate'
  body?: ReactNode
  badgeText?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface AdminTimelineProps {
  entries: AdminTimelineEntry[]
  emptyMessage?: string
}

export function AdminTimeline({ entries, emptyMessage = 'No administrative activity logged yet.' }: AdminTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="admin-timeline-empty">
        <SiteIcon name="clock" size={28} />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  // Group by dateGroup
  const groups: Record<string, AdminTimelineEntry[]> = {}
  entries.forEach(entry => {
    if (!groups[entry.dateGroup]) {
      groups[entry.dateGroup] = []
    }
    groups[entry.dateGroup].push(entry)
  })

  return (
    <div className="admin-timeline" role="feed" aria-label="Administrative activity audit timeline">
      {Object.entries(groups).map(([dateLabel, items]) => (
        <div key={dateLabel} className="admin-timeline-group">
          <div className="admin-timeline-date-label">
            <span>{dateLabel}</span>
          </div>

          <div className="admin-timeline-items">
            {items.map(item => (
              <article key={item.id} className="admin-timeline-item">
                <div className={`admin-timeline-icon theme-${item.iconTheme || 'info'}`} aria-hidden="true">
                  <SiteIcon name={item.icon} size={15} />
                </div>

                <div className="admin-timeline-content">
                  <header className="admin-timeline-header">
                    <div className="admin-timeline-title-wrap">
                      <span className="admin-timeline-actor">{item.actor}</span>
                      {item.role && <span className="admin-timeline-role-pill">{item.role}</span>}
                      <span className="admin-timeline-action">{item.title}</span>
                      {item.badgeText && <span className="admin-timeline-badge">{item.badgeText}</span>}
                    </div>
                    <time className="admin-timeline-time">{item.timestamp}</time>
                  </header>

                  {item.body && <div className="admin-timeline-body">{item.body}</div>}

                  {item.action && (
                    <footer className="admin-timeline-footer">
                      <button
                        type="button"
                        className="admin-timeline-action-btn"
                        onClick={item.action.onClick}
                      >
                        <span>{item.action.label}</span>
                        <SiteIcon name="arrow-right" size={13} />
                      </button>
                    </footer>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
