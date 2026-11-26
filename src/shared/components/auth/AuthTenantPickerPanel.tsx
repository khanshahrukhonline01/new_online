import type { MouseEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import type { AuthUserProfile } from '../../../integrations/supabase/auth-client'
import {
  resolveTenantWorkspacePath,
  type DbTenantMembership,
} from '../../../integrations/supabase/tenant-client'

interface AuthTenantPickerPanelProps {
  user: AuthUserProfile
  memberships: DbTenantMembership[]
  pendingInvitations: DbTenantMembership[]
  personalFallbackPath: string
  submitting: boolean
  onSelectTarget: (target: string, e?: MouseEvent<HTMLAnchorElement>) => void
  onAcceptInvitation: (invite: DbTenantMembership) => void
}

/**
 * Post-sign-in multi-tenant dashboard picker rendered when an authenticated user belongs
 * to multiple workspaces or holds pending team invitations.
 */
export function AuthTenantPickerPanel({
  user,
  memberships,
  pendingInvitations,
  personalFallbackPath,
  submitting,
  onSelectTarget,
  onAcceptInvitation,
}: AuthTenantPickerPanelProps) {
  return (
    <div className="kg-auth-form" role="region" aria-label="Select tenant dashboard">
      <div className="kg-auth-step-header">
        <span className="kg-auth-step-pill">Multi-Tenant Workspace Picker</span>
      </div>

      <h2 id="kg-auth-title" className="kg-auth-title">
        Choose Your Dashboard
      </h2>
      <p className="kg-auth-subtitle">
        Signed in as <strong>{user.fullName}</strong>. Select an active tenant workspace or accept a pending team invitation below.
      </p>

      {memberships.length > 0 && (
        <div className="kg-role-picker-grid">
          {memberships.map(membership => {
            const targetPath = resolveTenantWorkspacePath(membership)
            return (
              <a
                key={membership.id}
                href={targetPath}
                className="kg-role-card is-handoff-link"
                onClick={e => {
                  e.preventDefault()
                  onSelectTarget(targetPath, e)
                }}
              >
                <SiteIcon name="building" size={17} />
                <div className="kg-role-info">
                  <strong>{membership.tenant?.name || 'Workspace'}</strong>
                  <span>
                    {(membership.tenant?.tenant_type || 'organization').replace(/_/g, ' ')} • {membership.role.replace(/_/g, ' ')}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {pendingInvitations.length > 0 && (
        <div className="kg-auth-partner-handoff" style={{ marginTop: '12px' }}>
          <div className="kg-auth-partner-handoff-head">
            <SiteIcon name="sparkles" size={15} />
            <div>
              <strong>Pending Team Invitations ({pendingInvitations.length})</strong>
              <span>Accept an invitation to unlock that tenant dashboard immediately.</span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
            {pendingInvitations.map(invite => (
              <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <span>
                  <strong>{invite.tenant?.name || 'Workspace'}</strong> ({invite.role.replace(/_/g, ' ')})
                </span>
                <button
                  type="button"
                  className="kg-auth-partner-chip"
                  disabled={submitting}
                  onClick={() => onAcceptInvitation(invite)}
                >
                  Accept &amp; Open →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
        <button
          type="button"
          className="kg-auth-submit-btn kg-touch-target"
          onClick={() => onSelectTarget(personalFallbackPath)}
        >
          Open Personal Dashboard →
        </button>
        <a
          href="/workspace"
          className="kg-auth-magic-btn kg-touch-target"
          onClick={e => {
            e.preventDefault()
            onSelectTarget('/workspace', e)
          }}
        >
          View Unified Workspace Switcher →
        </a>
      </div>
    </div>
  )
}
