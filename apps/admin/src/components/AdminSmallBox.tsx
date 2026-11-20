import type { ReactNode } from 'react'
import { SiteIcon, type SiteIconName } from '../../../../src/shared/components/SiteIcon'

export type AdminBoxTheme = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate'

export interface AdminSmallBoxProps {
  title: ReactNode
  subtitle: string
  icon: SiteIconName
  theme?: AdminBoxTheme
  href?: string
  actionText?: string
  onClick?: () => void
  badge?: string
}

export function AdminSmallBox({
  title,
  subtitle,
  icon,
  theme = 'primary',
  href,
  actionText = 'View Queue Details',
  onClick,
  badge,
}: AdminSmallBoxProps) {
  return (
    <div className={`admin-small-box theme-${theme}`}>
      <div className="admin-small-box-inner">
        <div className="admin-small-box-value">
          {title}
          {badge && <span className="admin-small-box-badge">{badge}</span>}
        </div>
        <div className="admin-small-box-subtitle">{subtitle}</div>
      </div>
      <div className="admin-small-box-icon" aria-hidden="true">
        <SiteIcon name={icon} size={48} />
      </div>
      {(href || onClick) && (
        <button
          type="button"
          className="admin-small-box-footer"
          onClick={onClick}
        >
          <span>{actionText}</span>
          <SiteIcon name="arrow-right" size={14} />
        </button>
      )}
    </div>
  )
}

export interface AdminInfoBoxProps {
  title: string
  value: ReactNode
  icon: SiteIconName
  theme?: AdminBoxTheme
  progress?: number
  progressText?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    text: string
  }
}

export function AdminInfoBox({
  title,
  value,
  icon,
  theme = 'info',
  progress,
  progressText,
  trend,
}: AdminInfoBoxProps) {
  return (
    <div className="admin-info-box">
      <span className={`admin-info-box-icon theme-${theme}`} aria-hidden="true">
        <SiteIcon name={icon} size={24} />
      </span>
      <div className="admin-info-box-content">
        <span className="admin-info-box-text">{title}</span>
        <div className="admin-info-box-number">
          {value}
          {trend && (
            <span className={`admin-info-box-trend is-${trend.direction}`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '•'} {trend.text}
            </span>
          )}
        </div>
        {progress !== undefined && (
          <div className="admin-info-box-progress-wrap">
            <div className="admin-info-box-progress-bar">
              <div
                className={`admin-info-box-progress-fill theme-${theme}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {progressText && <span className="admin-info-box-description">{progressText}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
