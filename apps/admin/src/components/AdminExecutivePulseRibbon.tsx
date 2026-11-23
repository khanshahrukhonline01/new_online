import { useMemo } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import type { AdminPlatformRole } from '../auth/adminSecurityPolicy'

export interface AdminExecutivePulseRibbonProps {
  pendingSubmissionsCount: number
  pendingManuscriptsCount: number
  databaseId: string
  dbLatencyMs?: number | null
  operatorRole: AdminPlatformRole
  operatorEmail: string
  activeCategoryFilter?: string
  onSelectCategoryFilter?: (category: string) => void
  onRefresh?: () => void
  onOpenCommandPalette?: () => void
}

export function AdminExecutivePulseRibbon({
  pendingSubmissionsCount,
  pendingManuscriptsCount,
  databaseId,
  dbLatencyMs = null,
  operatorRole,
  operatorEmail,
  activeCategoryFilter = 'all',
  onSelectCategoryFilter,
  onRefresh,
  onOpenCommandPalette,
}: AdminExecutivePulseRibbonProps) {
  const latencyBadge = useMemo(() => {
    if (dbLatencyMs === null) return { text: 'Testing…', status: 'neutral' }
    if (dbLatencyMs < 100) return { text: `${dbLatencyMs}ms (Optimal)`, status: 'optimal' }
    if (dbLatencyMs < 300) return { text: `${dbLatencyMs}ms (Good)`, status: 'good' }
    return { text: `${dbLatencyMs}ms (High Latency)`, status: 'slow' }
  }, [dbLatencyMs])

  const totalActionable = pendingSubmissionsCount + pendingManuscriptsCount

  const categories: Array<{ id: string; label: string; icon: 'activity' | 'opportunities' | 'venues' | 'users' | 'building' | 'calendar' | 'sports' }> = [
    { id: 'all', label: 'All Categories', icon: 'activity' },
    { id: 'opportunity', label: 'Trials & Opportunities', icon: 'opportunities' },
    { id: 'venue', label: 'Sports Venues', icon: 'venues' },
    { id: 'coach', label: 'Coaches', icon: 'users' },
    { id: 'academy', label: 'Academies', icon: 'building' },
    { id: 'event', label: 'Tournaments', icon: 'calendar' },
    { id: 'pickup_game', label: 'Pickup Games', icon: 'sports' },
  ]

  return (
    <div className="admin-executive-ribbon" role="region" aria-label="Executive Operations & System Health Ribbon">
      {/* Top Pulse Row */}
      <div className="admin-ribbon-metrics-row">
        {/* Metric 1: Pending Moderation */}
        <div className={`admin-ribbon-card ${pendingSubmissionsCount > 0 ? 'is-warning' : 'is-success'}`}>
          <div className="admin-ribbon-card-icon">
            <SiteIcon name="check-circle" size={20} />
          </div>
          <div className="admin-ribbon-card-content">
            <span className="admin-ribbon-card-label">Pending Directory Triage</span>
            <div className="admin-ribbon-card-val-row">
              <strong className="admin-ribbon-card-val">{pendingSubmissionsCount}</strong>
              <span className={`admin-ribbon-tag ${pendingSubmissionsCount > 0 ? 'tag-warn' : 'tag-ok'}`}>
                {pendingSubmissionsCount > 0 ? 'Requires Action' : 'Queue Clear'}
              </span>
            </div>
            <small className="admin-ribbon-card-sub">Directory venues, trials, coaches, academies</small>
          </div>
        </div>

        {/* Metric 2: Chronicle Research */}
        <div className={`admin-ribbon-card ${pendingManuscriptsCount > 0 ? 'is-purple' : 'is-neutral'}`}>
          <div className="admin-ribbon-card-icon">
            <SiteIcon name="award" size={20} />
          </div>
          <div className="admin-ribbon-card-content">
            <span className="admin-ribbon-card-label">KhelChronicle Manuscripts</span>
            <div className="admin-ribbon-card-val-row">
              <strong className="admin-ribbon-card-val">{pendingManuscriptsCount}</strong>
              <span className="admin-ribbon-tag tag-purple">
                {pendingManuscriptsCount > 0 ? 'Peer Review Pending' : 'Archive Synchronized'}
              </span>
            </div>
            <small className="admin-ribbon-card-sub">Diamond Open Access sports research queue</small>
          </div>
        </div>

        {/* Metric 3: System & DB Health */}
        <div className="admin-ribbon-card is-health">
          <div className="admin-ribbon-card-icon">
            <SiteIcon name="shield-check" size={20} />
          </div>
          <div className="admin-ribbon-card-content">
            <span className="admin-ribbon-card-label">Database &amp; RLS Health</span>
            <div className="admin-ribbon-card-val-row">
              <strong className="admin-ribbon-card-val" style={{ fontSize: '1.05rem', color: '#10b981' }}>
                🟢 Connected
              </strong>
              <span className={`admin-ribbon-tag tag-latency ${latencyBadge.status}`}>
                {latencyBadge.text}
              </span>
            </div>
            <small className="admin-ribbon-card-sub">
              Ref: <code style={{ color: '#94a3b8' }}>{databaseId}</code> · Least-Privilege Definer
            </small>
          </div>
        </div>

        {/* Metric 4: Operator Clearance */}
        <div className="admin-ribbon-card is-operator">
          <div className="admin-ribbon-card-icon">
            <SiteIcon name="user" size={20} />
          </div>
          <div className="admin-ribbon-card-content">
            <span className="admin-ribbon-card-label">Active Operator Clearance</span>
            <div className="admin-ribbon-card-val-row">
              <strong className="admin-ribbon-card-val" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>
                {operatorRole === 'super_admin' ? 'Super Administrator' : 'Platform Moderator'}
              </strong>
            </div>
            <small className="admin-ribbon-card-sub" title={operatorEmail}>
              {operatorEmail}
            </small>
          </div>
        </div>
      </div>

      {/* Action / Category Filter Bar */}
      <div className="admin-ribbon-category-strip">
        <div className="admin-ribbon-chips-scroll" role="tablist" aria-label="Category triage filter">
          <span className="admin-ribbon-chips-title">
            <SiteIcon name="search" size={13} /> Quick Filter:
          </span>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryFilter === cat.id}
              className={`admin-ribbon-chip ${activeCategoryFilter === cat.id ? 'is-active' : ''}`}
              onClick={() => onSelectCategoryFilter?.(cat.id)}
            >
              <SiteIcon name={cat.icon} size={13} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-ribbon-quick-actions">
          {onRefresh && (
            <button
              type="button"
              className="admin-ribbon-action-btn"
              onClick={onRefresh}
              title="Refresh queues from database"
            >
              <SiteIcon name="refresh" size={13} />
              <span>Refresh</span>
            </button>
          )}
          {onOpenCommandPalette && (
            <button
              type="button"
              className="admin-ribbon-action-btn action-cmd"
              onClick={onOpenCommandPalette}
              title="Open Command Palette (Ctrl+K)"
            >
              <kbd>Ctrl+K</kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
