import { useState, type MouseEvent } from 'react'
import { AdminApp } from '../../../apps/admin/src/AdminApp'
import { SiteIcon } from '../../shared/components/SiteIcon'

export interface AdminPreviewPortalProps {
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

const PREVIEW_OPERATOR_SESSION = {
  identity: {
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'ops.admin@khelgrid.com',
    role: 'super_admin' as const,
    isActive: true as const,
  },
  databaseProjectRef: 'hznsbxvovjxvmnchzzqt',
}

export default function AdminPreviewPortal({ onNavigate }: AdminPreviewPortalProps) {
  const isDev = Boolean(import.meta.env.DEV)
  const [mode, setMode] = useState<'ui_preview' | 'live_gate'>(isDev ? 'ui_preview' : 'live_gate')

  return (
    <div className="admin-preview-portal">
      <div className="admin-preview-mode-bar" role="region" aria-label="Admin preview controls">
        <div className="admin-preview-mode-bar-left">
          <strong>KhelGrid Admin Operations</strong>
          <span aria-hidden="true">·</span>
          <span>
            {mode === 'ui_preview' && isDev
              ? 'Interactive UI Preview (development only — all 16 workspaces unlocked for visual review)'
              : 'Live Supabase Auth Gate (fail-closed production behavior)'}
          </span>
        </div>

        <div className="admin-preview-mode-bar-actions">
          {isDev && (
            <button
              type="button"
              className={`admin-preview-mode-btn ${mode === 'ui_preview' ? 'is-active' : ''}`}
              onClick={() => setMode('ui_preview')}
            >
              UI Preview
            </button>
          )}
          <button
            type="button"
            className={`admin-preview-mode-btn ${mode === 'live_gate' || !isDev ? 'is-active' : ''}`}
            onClick={() => setMode('live_gate')}
          >
            Auth Gate
          </button>
          <a
            href="/"
            className="admin-preview-mode-btn"
            onClick={e => onNavigate?.(e, '/')}
          >
            <SiteIcon name="arrow-left" size={12} />
            <span>Back to KhelGrid</span>
          </a>
        </div>
      </div>

      {mode === 'ui_preview' && isDev ? (
        <AdminApp
          key="preview-shell"
          initialAuthOverride={PREVIEW_OPERATOR_SESSION}
          initialWorkspace="moderation_desk"
        />
      ) : (
        <AdminApp key="live-gate" />
      )}
    </div>
  )
}
