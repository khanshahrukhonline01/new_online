import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog'
import { useFormState } from '../../../shared/hooks/useFormState'
import type {
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
} from '../../../shared/saas/saasTypes'
import { ASSIGNABLE_ROLES } from '../organizationsTypes'

interface OrgTeamAndInvitesPanelProps {
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

interface InviteFormFields extends Record<string, unknown> {
  inviteEmail: string
  inviteRole: Exclude<OrganizationRole, 'owner'>
}

/**
 * Organization member directory, RBAC role assignments, SHA-256 invitations, and atomic ownership transfer.
 */
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
  const inviteForm = useFormState<InviteFormFields>({
    inviteEmail: '',
    inviteRole: 'listing_manager',
  })
  const [transferTargetUserId, setTransferTargetUserId] = useState('')
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false)

  async function handleInviteSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await onInviteMember(inviteForm.fields.inviteEmail, inviteForm.fields.inviteRole)
    if (ok) inviteForm.setField('inviteEmail', '')
  }

  function handleTransferSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activeOrg || !transferTargetUserId) return
    setConfirmTransferOpen(true)
  }

  async function handleConfirmedTransfer() {
    setConfirmTransferOpen(false)
    if (!transferTargetUserId) return
    const ok = await onOwnershipTransfer(transferTargetUserId)
    if (ok) setTransferTargetUserId('')
  }

  return (
    <div className="org-saas-grid-2">
      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="users" size={18} />
            <span>Organization Members &amp; Anti-Escalation RBAC</span>
          </h2>
          <span className="org-saas-tag">
            {orgMembers.length} {orgMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>
        <p className="org-saas-panel-desc">
          Role updates enforce server-aligned anti-privilege escalation guards: no self-promotion, strict role
          ceiling, suspended-tenant lockout, and owner changes strictly restricted to Atomic Ownership Transfer.
        </p>

        {!activeOrg ? (
          <p className="org-saas-panel-desc">
            Switch from Personal Identity to an Organization workspace above to manage team members and roles.
          </p>
        ) : (
          <div className="org-saas-table-wrap">
            <table className="org-saas-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Update Role</th>
                </tr>
              </thead>
              <tbody>
                {orgMembers.map(member => {
                  const isSelf = member.userId === currentUserId
                  const isOwner = member.role === 'owner'
                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.displayName}</strong>
                        {isSelf && <span className="org-saas-tag" style={{ marginLeft: 6 }}>You</span>}
                        <div className="org-saas-item-meta">{member.email}</div>
                      </td>
                      <td>
                        <span className="org-saas-code">{member.role}</span>
                      </td>
                      <td>
                        <span className={`org-saas-tag ${member.status === 'active' ? 'org-saas-tag--ok' : 'org-saas-tag--warn'}`}>
                          {member.status}
                        </span>
                      </td>
                      <td>
                        {isOwner ? (
                          <span className="org-saas-item-meta">Use Ownership Transfer</span>
                        ) : (
                          <select
                            aria-label={`Change role for ${member.displayName}`}
                            className="org-saas-select"
                            value={member.role}
                            onChange={e => onRoleChange(member.userId, e.target.value as OrganizationRole)}
                          >
                            {ASSIGNABLE_ROLES.map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeOrg && (
          <div style={{ marginTop: 20 }}>
            <h3 className="org-saas-item-title" style={{ marginBottom: 10 }}>
              Cryptographic Expiring Invitations ({orgInvitations.length})
            </h3>
            {orgInvitations.length === 0 ? (
              <p className="org-saas-panel-desc">No invitations issued yet for this organization.</p>
            ) : (
              <div className="org-saas-card-list">
                {orgInvitations.map(inv => (
                  <div key={inv.id} className="org-saas-item-card">
                    <div className="org-saas-item-top">
                      <div>
                        <strong>{inv.invitedEmail}</strong> · <span className="org-saas-code">{inv.role}</span>
                        <div className="org-saas-item-meta">
                          SHA-256 hash: <span className="org-saas-code">{inv.tokenHash.slice(0, 20)}...</span> · Expires{' '}
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`org-saas-tag ${
                          inv.status === 'accepted'
                            ? 'org-saas-tag--ok'
                            : inv.status === 'pending'
                              ? 'org-saas-tag--warn'
                              : 'org-saas-tag--danger'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    {inv.status === 'pending' && (
                      <div className="org-saas-item-actions">
                        <button
                          type="button"
                          className="org-saas-btn org-saas-btn--primary org-saas-btn--sm"
                          onClick={() => onResolveInvite(inv.id, 'accept')}
                        >
                          Simulate Accept Invite
                        </button>
                        <button
                          type="button"
                          className="org-saas-btn org-saas-btn--danger org-saas-btn--sm"
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
        )}
      </div>

      <div>
        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="mail" size={18} />
              <span>Invite Organization Member</span>
            </h2>
          </div>
          <p className="org-saas-panel-desc">
            Issues a 7-day expiring invitation backed by a SHA-256 token hash (raw token never stored in DB) and
            enforces the active organization&apos;s <span className="org-saas-code">org.multi_member</span> quota.
          </p>

          <form className="org-saas-form" onSubmit={handleInviteSubmit}>
            <div className="org-saas-field">
              <label htmlFor="invite-member-email">Member Email Address *</label>
              <input
                id="invite-member-email"
                className="org-saas-input"
                type="email"
                required
                placeholder="coach.ananya@academy.in"
                value={inviteForm.fields.inviteEmail}
                onChange={e => inviteForm.setField('inviteEmail', e.target.value)}
              />
            </div>
            <div className="org-saas-field">
              <label htmlFor="invite-member-role">Assigned Organization Role *</label>
              <select
                id="invite-member-role"
                className="org-saas-select"
                value={inviteForm.fields.inviteRole}
                onChange={e => inviteForm.setField('inviteRole', e.target.value as Exclude<OrganizationRole, 'owner'>)}
              >
                {ASSIGNABLE_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="org-saas-btn org-saas-btn--primary"
              disabled={busy || !activeOrg}
            >
              <SiteIcon name="plus" size={15} />
              <span>Create Hashed Invitation</span>
            </button>
            {activeOrg && !canManageTeam && (
              <p className="org-saas-field-hint">
                Note: Your current role ({activeMembership?.role}) or organization status ({activeOrg.status}) lacks active <span className="org-saas-code">org:team</span> permission — submitting will verify fail-closed denial.
              </p>
            )}
          </form>
        </div>

        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="shield-check" size={18} />
              <span>Atomic Ownership Transfer</span>
            </h2>
          </div>
          <p className="org-saas-panel-desc">
            Safely transfers organization ownership to another active member in one transaction, downgrading the
            previous owner to <span className="org-saas-code">org_admin</span> so an organization is never left orphaned.
          </p>

          {activeOrg && activeOrg.ownerId === currentUserId && eligibleTransferTargets.length > 0 ? (
            <form className="org-saas-form" onSubmit={handleTransferSubmit}>
              <div className="org-saas-field">
                <label htmlFor="transfer-owner-select">New Organization Owner</label>
                <select
                  id="transfer-owner-select"
                  className="org-saas-select"
                  required
                  value={transferTargetUserId}
                  onChange={e => setTransferTargetUserId(e.target.value)}
                >
                  <option value="">Select active organization member...</option>
                  {eligibleTransferTargets.map(m => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="org-saas-btn org-saas-btn--danger"
                disabled={busy || !transferTargetUserId}
              >
                Transfer Organization Ownership
              </button>
            </form>
          ) : (
            <p className="org-saas-field-hint">
              {activeOrg
                ? activeOrg.ownerId !== currentUserId
                  ? 'Only the current registered organization owner can initiate ownership transfer.'
                  : 'Invite and activate at least one additional member before transferring ownership.'
                : 'Select an organization workspace to manage ownership transfer.'}
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmTransferOpen}
        title="Confirm Atomic Ownership Transfer"
        message="This will transfer primary owner authority for this organization and downgrade your own role to org_admin."
        confirmLabel="Transfer Ownership"
        destructive
        onConfirm={handleConfirmedTransfer}
        onCancel={() => setConfirmTransferOpen(false)}
      />
    </div>
  )
}
