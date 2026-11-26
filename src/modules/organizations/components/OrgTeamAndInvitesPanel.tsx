import { useState, type FormEvent } from 'react'
import type {
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
} from '../../../shared/saas/saasTypes'

export interface OrgTeamAndInvitesPanelProps {
  activeOrg: OrganizationRecord | null
  currentUserId: string
  orgMembers: OrganizationMembership[]
  orgInvitations: OrganizationInvitation[]
  activeMembership: OrganizationMembership | null
  canManageTeam: boolean
  eligibleTransferTargets: OrganizationMembership[]
  busy: boolean
  onRoleChange: (targetUserId: string, newRole: OrganizationRole) => void
  onResolveInvite: (invitationId: string, decision: 'accept' | 'revoke') => void
  onInviteMember: (email: string, role: Exclude<OrganizationRole, 'owner'>) => Promise<boolean>
  onOwnershipTransfer: (targetUserId: string) => Promise<boolean>
}

const ASSIGNABLE_ROLES: Exclude<OrganizationRole, 'owner'>[] = [
  'org_admin',
  'director',
  'admin',
  'manager',
  'finance_manager',
  'content_manager',
  'listing_manager',
  'verification_coordinator',
  'head_coach',
  'coach',
  'accountant',
  'front_desk',
  'staff',
  'readonly_member',
]

export function OrgTeamAndInvitesPanel({
  activeOrg,
  currentUserId,
  orgMembers,
  orgInvitations,
  activeMembership,
  canManageTeam,
  eligibleTransferTargets,
  busy,
  onRoleChange,
  onResolveInvite,
  onInviteMember,
  onOwnershipTransfer,
}: OrgTeamAndInvitesPanelProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationRole, 'owner'>>('manager')
  const [transferTarget, setTransferTarget] = useState('')

  async function handleInviteSubmit(e: FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    const ok = await onInviteMember(inviteEmail.trim(), inviteRole)
    if (ok) setInviteEmail('')
  }

  return (
    <div className="org-saas-grid">
      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Organization Members &amp; Anti-Escalation RBAC</h2>
          <span>{orgMembers.length} members</span>
        </div>

        {!activeOrg ? (
          <p className="org-saas-muted">
            Select or create an organization workspace to manage team roles and memberships.
          </p>
        ) : orgMembers.length === 0 ? (
          <p className="org-saas-muted">No members linked to {activeOrg.name} yet.</p>
        ) : (
          <div className="org-saas-list">
            {orgMembers.map(member => (
              <div key={member.id} className="org-saas-list-item">
                <div>
                  <strong>
                    {member.displayName} {member.userId === currentUserId ? '(You)' : ''}
                  </strong>
                  <p>{member.email} · {member.status}</p>
                </div>
                <select
                  aria-label={`Role for ${member.displayName}`}
                  disabled={!canManageTeam || member.role === 'owner' || busy}
                  value={member.role}
                  onChange={e => onRoleChange(member.userId, e.target.value as OrganizationRole)}
                >
                  <option value="owner">owner</option>
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {activeMembership?.role === 'owner' && eligibleTransferTargets.length > 0 && (
          <div className="org-saas-subcard">
            <h3>Transfer Organization Ownership</h3>
            <div className="org-saas-inline-row">
              <select
                value={transferTarget}
                onChange={e => setTransferTarget(e.target.value)}
              >
                <option value="">Select eligible member…</option>
                {eligibleTransferTargets.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName} ({m.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="kg-btn-secondary"
                disabled={!transferTarget || busy}
                onClick={() => void onOwnershipTransfer(transferTarget)}
              >
                Transfer Ownership
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Invite Organization Member</h2>
          <span>{orgInvitations.length} invitations</span>
        </div>

        <form onSubmit={handleInviteSubmit} className="org-saas-form">
          <div className="org-saas-form-field">
            <label htmlFor="org-invite-email">Member Email</label>
            <input
              id="org-invite-email"
              type="email"
              placeholder="coach@academy.in"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="org-saas-form-field">
            <label htmlFor="org-invite-role">Assigned Role</label>
            <select
              id="org-invite-role"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
            >
              {ASSIGNABLE_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="kg-btn-primary" disabled={!activeOrg || !canManageTeam || busy}>
            Send Expiring Invite
          </button>
        </form>

        {orgInvitations.length > 0 && (
          <div className="org-saas-list" style={{ marginTop: '1rem' }}>
            {orgInvitations.map(inv => (
              <div key={inv.id} className="org-saas-list-item">
                <div>
                  <strong>{inv.invitedEmail}</strong>
                  <p>Role: {inv.role} · Status: {inv.status}</p>
                </div>
                {inv.status === 'pending' && (
                  <div className="org-saas-item-actions">
                    <button
                      type="button"
                      className="kg-btn-secondary"
                      onClick={() => onResolveInvite(inv.id, 'accept')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="kg-btn-secondary"
                      onClick={() => onResolveInvite(inv.id, 'revoke')}
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
