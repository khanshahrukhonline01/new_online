/**
 * KpiStrip.tsx – max 4 KPI cards displayed in a horizontal strip.
 * Enforces the <= 4 KPI constraint required by the WorkspaceShell spec.
 */
export interface KpiItem {
  id: string
  label: string
  value: string | number
  /** Optional sub-label (e.g. "vs last month") */
  sub?: string
  /** Optional icon text/node */
  icon?: string
  /** Accent emphasis matching primitives.css */
  trend?: 'up' | 'down' | 'neutral'
}

interface KpiStripProps {
  items: KpiItem[]
  loading?: boolean
  className?: string
}

export function KpiStrip({ items, loading = false, className = '' }: KpiStripProps) {
  const visible = items.slice(0, 4)

  if (loading) {
    return (
      <div className={`kg-kpi-strip is-loading ${className}`.trim()} role="status" aria-label="Loading metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kg-kpi-card" aria-hidden="true">
            <span className="kg-kpi-label">Loading…</span>
            <strong className="kg-kpi-value">—</strong>
          </div>
        ))}
      </div>
    )
  }

  if (visible.length === 0) return null

  return (
    <dl className={`kg-kpi-strip ${className}`.trim()}>
      {visible.map((kpi) => (
        <div key={kpi.id} className={`kg-kpi-card${kpi.trend === 'up' ? ' is-emerald' : ''}`}>
          <div className="kg-kpi-top">
            <dt className="kg-kpi-label">{kpi.label}</dt>
            {kpi.icon && <span className="kg-kpi-icon" aria-hidden="true">{kpi.icon}</span>}
          </div>
          <dd className="kg-kpi-value" style={{ margin: 0 }}>{kpi.value}</dd>
          {kpi.sub && <span className="kg-kpi-sub">{kpi.sub}</span>}
        </div>
      ))}
    </dl>
  )
}
