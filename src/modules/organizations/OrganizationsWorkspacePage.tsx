import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog'
import { useAuth } from '../../shared/auth/useAuth'
import { useTenant } from '../../shared/context/useTenant'
import type { DbTenantMembership } from '../../integrations/supabase/tenant-client'
import {
  CANONICAL_SAAS_PLANS,
  ORGANIZATION_ROLE_PERMISSIONS,
  ORGANIZATION_TYPES,
  computeUsageMeterStatuses,
  evaluateEntitlement,
  hasOrganizationPermission,
} from '../../shared/saas/saasCoreEngine'
import type {
  EntitlementFeatureKey,
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
  OrganizationType,
  OrganizationUnitType,
  OwnableResourceType,
  OwnershipType,
  PlanCode,
  SubscriptionRecord,
} from '../../shared/saas/saasTypes'
import {
  bindResourceOwnership,
  createEmptyWorkspaceState,
  createOrganizationUnit,
  grantAuditedEntitlementOverride,
  inviteMemberToOrganization,
  previewSwitchSubscriptionPlan,
  provisionOrganizationWorkspace,
  resolveOrganizationInvitation,
  transferOrganizationOwnership,
  updateOrganizationLifecycleStatus,
  updateOrganizationMemberRole,
  type SaaSWorkspaceState,
} from '../../integrations/supabase/saas-platform-client'
import { OrgEntitlementsAndMeteringPanel } from './components/OrgEntitlementsAndMeteringPanel'
import { OrgGovernanceAndBranchesPanel } from './components/OrgGovernanceAndBranchesPanel'
import { OrgOverviewAndProvisionPanel, type ProvisionOrgInput } from './components/OrgOverviewAndProvisionPanel'
import { OrgPermissionsAndOwnershipPanel } from './components/OrgPermissionsAndOwnershipPanel'
import { OrgTeamAndInvitesPanel } from './components/OrgTeamAndInvitesPanel'
import { resolveOrgTabForSection, type WorkspaceTab } from './organizationsTypes'
import './OrganizationsWorkspacePage.css'

export interface OrganizationsWorkspacePageProps {
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
  workspaceSection?: string
}

function buildTenantBackedWorkspace(params: {
  userId: string
  userName: string
  userEmail: string
  memberships: DbTenantMembership[]
  activeTenantId?: string | null
}): SaaSWorkspaceState {
  const base = createEmptyWorkspaceState(null)
  const organizations: OrganizationRecord[] = []
  const mappedMemberships: OrganizationMembership[] = []
  const subscriptions: SubscriptionRecord[] = []

  for (const m of params.memberships) {
    if (!m.tenant || m.tenant.status !== 'active' || m.status !== 'active') continue
    organizations.push({
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      tenantType: m.tenant.tenant_type,
      status: m.tenant.status,
      verificationStatus: m.tenant.verification_status || 'unverified',
      ownerId: m.tenant.owner_id || params.userId,
      parentTenantId: m.tenant.parent_tenant_id ?? null,
      city: m.tenant.city,
      state: m.tenant.state,
      sport: m.tenant.sport,
      contactEmail: m.tenant.contact_email,
      contactPhone: m.tenant.contact_phone,
      upiVpa: m.tenant.upi_vpa,
      createdAt: m.tenant.created_at,
      updatedAt: m.tenant.updated_at,
    })
    mappedMemberships.push({
      id: m.id,
      tenantId: m.tenant_id,
      userId: m.user_id,
      displayName: params.userName,
      email: params.userEmail,
      role: m.role,
      status: m.status,
      joinedAt: m.created_at,
    })
    subscriptions.push({
      id: `sub-${m.tenant_id}`,
      subjectType: 'tenant',
      subjectId: m.tenant_id,
      planCode: 'org_free',
      status: 'free_active',
      billingCycle: 'none',
      paymentCollectionEnabled: false,
      currentPeriodStart: m.tenant.created_at,
      currentPeriodEnd: null,
    })
  }

  const chosenTenantId =
    (params.activeTenantId && organizations.some(o => o.id === params.activeTenantId) && params.activeTenantId) ||
    organizations[0]?.id ||
    null

  return {
    ...base,
    currentUserId: params.userId,
    currentUserName: params.userName,
    currentUserEmail: params.userEmail,
    activeContext: chosenTenantId ? { kind: 'organization', tenantId: chosenTenantId } : { kind: 'personal' },
    organizations,
    memberships: mappedMemberships,
    subscriptions,
    storageMode: 'supabase',
  }
}

export default function OrganizationsWorkspacePage({
  onNavigate,
  workspaceSection,
}: OrganizationsWorkspacePageProps) {
  const { user: authUser, openAuth } = useAuth()
  const {
    userId,
    isAuthenticated,
    currentTenant,
    memberships: dbMemberships,
    isLoading: tenantLoading,
    switchTenant,
    refreshTenant,
  } = useTenant()

  const authorizedUserId = isAuthenticated && userId ? userId : null
  const syncedWorkspaceSnapshot = useMemo(() => {
    if (!authorizedUserId) return null
    return buildTenantBackedWorkspace({
      userId: authorizedUserId,
      userName: authUser?.fullName || authUser?.name || currentTenant?.name || 'Organization Member',
      userEmail: authUser?.email || '',
      memberships: dbMemberships,
      activeTenantId: currentTenant?.id ?? null,
    })
  }, [authorizedUserId, authUser?.email, authUser?.fullName, authUser?.name, currentTenant?.id, currentTenant?.name, dbMemberships])

  const [workspaceOverrides, setWorkspaceOverrides] = useState<SaaSWorkspaceState | null>(null)
  const workspace = workspaceOverrides && workspaceOverrides.currentUserId === authorizedUserId
    ? workspaceOverrides
    : syncedWorkspaceSnapshot ?? createEmptyWorkspaceState(null)
  const setWorkspace = (updater: SaaSWorkspaceState | ((prev: SaaSWorkspaceState) => SaaSWorkspaceState)) => {
    setWorkspaceOverrides(prev => {
      const baseState =
        prev && prev.currentUserId === authorizedUserId
          ? prev
          : syncedWorkspaceSnapshot ?? createEmptyWorkspaceState(null)
      return typeof updater === 'function' ? updater(baseState) : updater
    })
  }

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
    resolveOrgTabForSection(workspaceSection)
  )
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [evalFeatureKey, setEvalFeatureKey] = useState<EntitlementFeatureKey>('org.advanced_analytics')
  const [pendingSuspendTarget, setPendingSuspendTarget] = useState<OrganizationRecord | null>(null)

  useEffect(() => {
    if (workspaceSection) {
      setActiveTab(resolveOrgTabForSection(workspaceSection))
    }
  }, [workspaceSection])

  useEffect(() => {
    if (!syncedWorkspaceSnapshot) return
    setWorkspaceOverrides(syncedWorkspaceSnapshot)
  }, [syncedWorkspaceSnapshot])

  const activeOrg = useMemo(() => {
    if (workspace.activeContext.kind !== 'organization') return null
    const activeTenantId = workspace.activeContext.tenantId
    return workspace.organizations.find(o => o.id === activeTenantId) ?? null
  }, [workspace])

  const activeMembership = useMemo(() => {
    if (!activeOrg) return null
    return workspace.memberships.find(
      m => m.tenantId === activeOrg.id && m.userId === workspace.currentUserId
    ) ?? null
  }, [activeOrg, workspace.memberships, workspace.currentUserId])

  const activeSubscription = useMemo(() => {
    if (activeOrg) {
      return workspace.subscriptions.find(s => s.subjectType === 'tenant' && s.subjectId === activeOrg.id) ?? null
    }
    return workspace.subscriptions.find(s => s.subjectType === 'user' && s.subjectId === workspace.currentUserId) ?? null
  }, [activeOrg, workspace.subscriptions, workspace.currentUserId])

  const orgMembers = useMemo(
    () => (activeOrg ? workspace.memberships.filter(m => m.tenantId === activeOrg.id) : []),
    [activeOrg, workspace.memberships]
  )

  const orgInvitations = useMemo(
    () => (activeOrg ? workspace.invitations.filter(i => i.tenantId === activeOrg.id) : []),
    [activeOrg, workspace.invitations]
  )

  const orgUnits = useMemo(
    () => (activeOrg ? workspace.units.filter(u => u.tenantId === activeOrg.id) : []),
    [activeOrg, workspace.units]
  )

  const subjectType: 'user' | 'tenant' = activeOrg ? 'tenant' : 'user'
  const subjectId = activeOrg ? activeOrg.id : workspace.currentUserId
  const effectivePlanCode: PlanCode = activeSubscription?.planCode ?? (activeOrg ? 'org_free' : 'individual_free')

  const liveEntitlementResult = useMemo(() => {
    const usage = workspace.usageBySubject[subjectId] || {}
    const currentUsage =
      evalFeatureKey === 'org.multi_member'
        ? orgMembers.filter(m => m.status === 'active').length
        : evalFeatureKey === 'org.branches'
          ? orgUnits.filter(u => u.isActive).length
          : evalFeatureKey === 'venues.multi_location'
            ? (usage['venues.managed'] ?? 0)
            : evalFeatureKey === 'events.registrations'
              ? (usage['events.published_monthly'] ?? 0)
              : evalFeatureKey === 'platform.data_exports'
                ? (usage['exports.monthly'] ?? 0)
                : 0

    return evaluateEntitlement({
      featureKey: evalFeatureKey,
      subjectType,
      subjectId,
      organizationStatus: activeOrg?.status,
      subscription: activeSubscription,
      overrides: workspace.overrides,
      currentUsage,
      enforceHardLimit: true,
    })
  }, [evalFeatureKey, subjectType, subjectId, activeOrg, activeSubscription, workspace.overrides, workspace.usageBySubject, orgMembers, orgUnits])

  const meterStatuses = useMemo(() => {
    return computeUsageMeterStatuses({
      planCode: effectivePlanCode,
      usageValues: {
        ...(workspace.usageBySubject[subjectId] || {}),
        'org.members': orgMembers.filter(m => m.status === 'active').length,
        'org.branches': orgUnits.filter(u => u.isActive).length,
      },
      overrides: workspace.overrides,
      subjectId,
    })
  }, [effectivePlanCode, workspace.usageBySubject, subjectId, orgMembers, orgUnits, workspace.overrides])

  const visibleAuditLogs = useMemo(() => {
    if (!activeOrg) return workspace.auditLogs.slice(0, 20)
    return workspace.auditLogs.filter(log => log.tenantId === activeOrg.id || log.tenantId === null).slice(0, 25)
  }, [workspace.auditLogs, activeOrg])

  const orgTypeMetaMap = useMemo(() => {
    const map = new Map<OrganizationType, (typeof ORGANIZATION_TYPES)[number]>()
    for (const item of ORGANIZATION_TYPES) map.set(item.type, item)
    return map
  }, [])

  const groupedOrgTypes = useMemo(() => {
    const groups = new Map<string, (typeof ORGANIZATION_TYPES)[number][]>()
    for (const item of ORGANIZATION_TYPES) {
      const list = groups.get(item.categoryGroup) || []
      list.push(item)
      groups.set(item.categoryGroup, list)
    }
    return Array.from(groups.entries())
  }, [])

  function handleContextSwitch(value: string) {
    if (value === '__personal__') {
      setWorkspace(prev => ({ ...prev, activeContext: { kind: 'personal' } }))
      setFeedback({ type: 'success', message: 'Switched to Personal Identity context.' })
    } else {
      const targetOrg = workspace.organizations.find(o => o.id === value)
      if (!targetOrg) return
      void switchTenant(targetOrg.id)
      setWorkspace(prev => ({ ...prev, activeContext: { kind: 'organization', tenantId: targetOrg.id } }))
      setFeedback({ type: 'success', message: `Active workspace set to "${targetOrg.name}".` })
    }
  }

  async function runSyncedOrgMutation<T>(
    action: () => Promise<{ success: boolean; message: string; syncedToSupabase: boolean; state: SaaSWorkspaceState; data?: T }>,
    unsyncedError: string,
    refreshMemberships = false,
  ): Promise<boolean> {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success || !result.syncedToSupabase) {
        setFeedback({ type: 'error', message: result.message || unsyncedError })
        return false
      }
      setWorkspace(result.state)
      setFeedback({ type: 'success', message: result.message })
      if (refreshMemberships) await refreshTenant()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function handleProvisionOrg(input: ProvisionOrgInput): Promise<boolean> {
    return runSyncedOrgMutation(
      () => provisionOrganizationWorkspace(workspace, input),
      'Workspace provisioning requires an active database connection and verified Supabase session.',
      true,
    )
  }

  async function handleInviteMember(email: string, role: Exclude<OrganizationRole, 'owner'>): Promise<boolean> {
    if (!activeOrg) {
      setFeedback({ type: 'error', message: 'Select an active organization workspace before inviting members.' })
      return false
    }
    return runSyncedOrgMutation(
      () => inviteMemberToOrganization(workspace, { tenantId: activeOrg.id, invitedEmail: email, role }),
      'Database invitation write could not be confirmed.',
      true,
    )
  }

  function handleResolveInvite(invitationId: string, decision: 'accept' | 'revoke') {
    const result = resolveOrganizationInvitation(workspace, invitationId, decision)
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  function handleRoleChange(targetUserId: string, newRole: OrganizationRole) {
    if (!activeOrg) return
    const result = updateOrganizationMemberRole(workspace, {
      tenantId: activeOrg.id,
      targetUserId,
      newRole,
    })
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  async function handleOwnershipTransfer(targetUserId: string): Promise<boolean> {
    if (!activeOrg || !targetUserId) return false
    return runSyncedOrgMutation(
      () => transferOrganizationOwnership(workspace, activeOrg.id, targetUserId),
      'Ownership transfer requires an active verified database session.',
      true,
    )
  }

  function handleToggleOrgLifecycle(org: OrganizationRecord) {
    if (org.status === 'active') {
      setPendingSuspendTarget(org)
      return
    }
    const result = updateOrganizationLifecycleStatus(workspace, org.id, 'active')
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  function handleConfirmSuspend() {
    if (!pendingSuspendTarget) return
    const result = updateOrganizationLifecycleStatus(
      workspace,
      pendingSuspendTarget.id,
      'suspended',
      'Security isolation check (fail-closed verification)'
    )
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    setPendingSuspendTarget(null)
  }

  async function handleBindResource(input: {
    resourceTitle: string
    resourceType: OwnableResourceType
    ownershipType: OwnershipType
  }): Promise<boolean> {
    return runSyncedOrgMutation(
      () =>
        bindResourceOwnership(workspace, {
          resourceType: input.resourceType,
          resourceTitle: input.resourceTitle,
          ownershipType: input.ownershipType,
          ownerTenantId: input.ownershipType === 'organization' ? activeOrg?.id ?? null : null,
        }),
      'Database write required to persist resource ownership binding.',
    )
  }

  async function handleCreateUnit(input: {
    name: string
    unitType: OrganizationUnitType
    city: string
  }): Promise<boolean> {
    if (!activeOrg) {
      setFeedback({ type: 'error', message: 'Switch to an active organization to add branches or teams.' })
      return false
    }
    return runSyncedOrgMutation(
      () =>
        createOrganizationUnit(workspace, {
          tenantId: activeOrg.id,
          name: input.name,
          unitType: input.unitType,
          city: input.city,
        }),
      'Database write required to create an organization branch or unit.',
    )
  }

  function handlePreviewPlanSwitch(planCode: PlanCode) {
    const result = previewSwitchSubscriptionPlan(workspace, subjectType, subjectId, planCode)
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  function handleGrantOverride(input: {
    featureKey: EntitlementFeatureKey
    overrideLimit: string
    reason: string
  }): boolean {
    const parsedLimit = input.overrideLimit.trim() === '' ? null : Number(input.overrideLimit)
    if (parsedLimit !== null && (Number.isNaN(parsedLimit) || parsedLimit < 0)) {
      setFeedback({ type: 'error', message: 'Override limit must be blank (unlimited) or a non-negative integer.' })
      return false
    }
    const result = grantAuditedEntitlementOverride(workspace, {
      subjectType,
      subjectId,
      featureKey: input.featureKey,
      isEnabled: true,
      overrideLimit: parsedLimit,
      reason: input.reason,
    })
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    return result.success
  }

  const canManageTeam = hasOrganizationPermission({
    organization: activeOrg,
    membership: activeMembership,
    permission: 'org:team',
  })

  const canManageSettings = hasOrganizationPermission({
    organization: activeOrg,
    membership: activeMembership,
    permission: 'org:settings',
  })

  const eligibleTransferTargets = orgMembers.filter(
    m => m.status === 'active' && m.userId !== workspace.currentUserId
  )

  if (tenantLoading) {
    return (
      <section className="org-saas-page" role="status" aria-live="polite">
        <div className="org-saas-hero">
          <h1>Verifying organization workspace access…</h1>
          <p className="org-saas-subtitle">Loading verified database memberships.</p>
        </div>
      </section>
    )
  }

  if (!authorizedUserId) {
    return (
      <section className="org-saas-page" aria-labelledby="org-auth-required-title">
        <div className="org-saas-hero">
          <p className="org-saas-eyebrow">
            <SiteIcon name="shield-check" size={14} />
            <span>KHELGRID MULTI-TENANT SAAS CORE</span>
          </p>
          <h1 id="org-auth-required-title">Sign in required</h1>
          <p className="org-saas-subtitle">
            Sign in with an authenticated KhelGrid organization account backed by active Supabase membership to access organization governance, team RBAC, and branches.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openAuth({ tab: 'login', redirectTo: '/workspace/organization/overview' })}
            >
              Sign in to Organization Console
            </button>
            <a
              href="/partner-signup?role=organization"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
              onClick={e => onNavigate?.(e, '/partner-signup?role=organization')}
            >
              Register Organization →
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="org-saas-page" aria-label="Organizations and SaaS Workspace Console">
      <div className="org-saas-hero">
        <div className="org-saas-hero-top">
          <div>
            <p className="org-saas-eyebrow">
              <SiteIcon name="shield-check" size={14} />
              <span>KHELGRID PLATFORM-WIDE SAAS CORE</span>
            </p>
            <h1>Organizations &amp; Workspace Console</h1>
            <p className="org-saas-subtitle">
              Multi-tenant identity, strict organization RBAC, dual individual/organization ownership, centralized
              entitlements, usage metering, and immutable audit trails across all 18 sports ecosystem categories.
            </p>
          </div>

          <div className="org-saas-switcher-box">
            <label htmlFor="workspace-context-select" className="org-saas-switcher-label">
              Active Workspace Context
            </label>
            <select
              id="workspace-context-select"
              className="org-saas-select"
              value={activeOrg ? activeOrg.id : '__personal__'}
              onChange={e => handleContextSwitch(e.target.value)}
            >
              <option value="__personal__">
                Personal Identity — {workspace.currentUserName} (Individual)
              </option>
              {workspace.organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({orgTypeMetaMap.get(org.tenantType)?.label || org.tenantType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="org-saas-policy-strip">
          <div className="org-saas-policy-strip-main">
            <SiteIcon name="badge-check" size={16} />
            <span>
              Free public venue, coach &amp; trial listings and independent verification remain guaranteed free · Payments disabled
            </span>
          </div>
          <div className="org-saas-context-meta">
            {activeOrg ? (
              <>
                <span className={`org-saas-tag ${activeOrg.status === 'active' ? 'org-saas-tag--ok' : 'org-saas-tag--danger'}`}>
                  Status: {activeOrg.status}
                </span>
                <span className="org-saas-tag">
                  Role: {activeMembership?.role || 'none'}
                </span>
                <span className="org-saas-tag">
                  Verification: {activeOrg.verificationStatus.replace('_', ' ')}
                </span>
                <span className="org-saas-tag org-saas-tag--ok">
                  Plan: {CANONICAL_SAAS_PLANS[effectivePlanCode].name}
                </span>
              </>
            ) : (
              <>
                <span className="org-saas-tag org-saas-tag--ok">Mode: Individual Identity</span>
                <span className="org-saas-tag">Plan: {CANONICAL_SAAS_PLANS[effectivePlanCode].name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`org-saas-feedback ${feedback.type === 'success' ? 'org-saas-feedback--success' : 'org-saas-feedback--error'}`}
          role="status"
          aria-live="polite"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className="org-saas-feedback-close"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss status message"
          >
            <SiteIcon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="org-saas-kpi-grid">
        <div className="org-saas-kpi-card">
          <p className="org-saas-kpi-label">Organizations Managed</p>
          <p className="org-saas-kpi-value">{workspace.organizations.length}</p>
          <p className="org-saas-kpi-sub">18 sports ecosystem categories supported</p>
        </div>
        <div className="org-saas-kpi-card">
          <p className="org-saas-kpi-label">Active Workspace Members</p>
          <p className="org-saas-kpi-value">{activeOrg ? orgMembers.filter(m => m.status === 'active').length : 1}</p>
          <p className="org-saas-kpi-sub">
            {activeOrg ? `${orgInvitations.filter(i => i.status === 'pending').length} pending SHA-256 invite(s)` : 'Personal athlete identity'}
          </p>
        </div>
        <div className="org-saas-kpi-card">
          <p className="org-saas-kpi-label">Dual-Ownership Resources</p>
          <p className="org-saas-kpi-value">{workspace.resources.length}</p>
          <p className="org-saas-kpi-sub">Individual + Organization isolated records</p>
        </div>
        <div className="org-saas-kpi-card">
          <p className="org-saas-kpi-label">Audit Events Logged</p>
          <p className="org-saas-kpi-value">{workspace.auditLogs.length}</p>
          <p className="org-saas-kpi-sub">Append-only tamper-resistant log</p>
        </div>
      </div>

      <div className="org-saas-tabs" role="tablist" aria-label="Organization SaaS Console Sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`org-saas-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <SiteIcon name="building" size={15} />
          <span>Overview &amp; Provisioning</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'team'}
          className={`org-saas-tab ${activeTab === 'team' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <SiteIcon name="users" size={15} />
          <span>Team, RBAC &amp; Invites</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'permissions'}
          className={`org-saas-tab ${activeTab === 'permissions' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <SiteIcon name="lock" size={15} />
          <span>Permissions &amp; Ownership</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'entitlements'}
          className={`org-saas-tab ${activeTab === 'entitlements' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('entitlements')}
        >
          <SiteIcon name="sliders" size={15} />
          <span>Entitlements &amp; Metering</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'governance'}
          className={`org-saas-tab ${activeTab === 'governance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('governance')}
        >
          <SiteIcon name="file-text" size={15} />
          <span>Branches, Matrix &amp; Audit</span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <OrgOverviewAndProvisionPanel
          workspace={workspace}
          activeOrg={activeOrg}
          orgTypeMetaMap={orgTypeMetaMap}
          groupedOrgTypes={groupedOrgTypes}
          busy={busy}
          onContextSwitch={handleContextSwitch}
          onRequestToggleLifecycle={handleToggleOrgLifecycle}
          onProvisionOrg={handleProvisionOrg}
          onNavigate={onNavigate}
        />
      )}

      {activeTab === 'team' && (
        <OrgTeamAndInvitesPanel
          activeOrg={activeOrg}
          currentUserId={workspace.currentUserId}
          orgMembers={orgMembers}
          orgInvitations={orgInvitations}
          activeMembership={activeMembership}
          canManageTeam={canManageTeam}
          eligibleTransferTargets={eligibleTransferTargets}
          busy={busy}
          onRoleChange={handleRoleChange}
          onResolveInvite={handleResolveInvite}
          onInviteMember={handleInviteMember}
          onOwnershipTransfer={handleOwnershipTransfer}
        />
      )}

      {activeTab === 'permissions' && (
        <OrgPermissionsAndOwnershipPanel
          activeOrg={activeOrg}
          activeMembership={activeMembership}
          currentUserId={workspace.currentUserId}
          currentUserName={workspace.currentUserName}
          resources={workspace.resources}
          busy={busy}
          onBindResource={handleBindResource}
        />
      )}

      {activeTab === 'entitlements' && (
        <OrgEntitlementsAndMeteringPanel
          effectivePlanCode={effectivePlanCode}
          evalFeatureKey={evalFeatureKey}
          liveEntitlementResult={liveEntitlementResult}
          meterStatuses={meterStatuses}
          onEvalFeatureChange={setEvalFeatureKey}
          onPreviewPlanSwitch={handlePreviewPlanSwitch}
          onGrantOverride={handleGrantOverride}
        />
      )}

      {activeTab === 'governance' && (
        <OrgGovernanceAndBranchesPanel
          activeOrg={activeOrg}
          orgUnits={orgUnits}
          visibleAuditLogs={visibleAuditLogs}
          canManageSettings={canManageSettings}
          busy={busy}
          onCreateUnit={handleCreateUnit}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingSuspendTarget)}
        title="Suspend Organization Tenant?"
        message={
          pendingSuspendTarget
            ? `Suspending ${pendingSuspendTarget.name} enforces fail-closed write and entitlement lockout until reactivated.`
            : ''
        }
        confirmLabel="Suspend Tenant"
        destructive
        onConfirm={handleConfirmSuspend}
        onCancel={() => setPendingSuspendTarget(null)}
      />
    </section>
  )
}

export { ORGANIZATION_ROLE_PERMISSIONS }
