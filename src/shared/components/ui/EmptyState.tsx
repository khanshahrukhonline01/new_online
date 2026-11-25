/**
 * EmptyState.tsx – Zero-data empty state with optional icon, title, description, and CTA.
 */
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`kg-empty-state ${className}`.trim()} role="status">
      {icon && <div className="kg-empty-icon" aria-hidden="true">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="kg-empty-actions">{action}</div>}
    </div>
  )
}
