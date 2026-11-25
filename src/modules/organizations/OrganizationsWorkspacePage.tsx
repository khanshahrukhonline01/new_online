import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  CANONICAL_SAAS_PLANS,
  ORGANIZATION_ROLE_PERMISSIONS,
  ORGANIZATION_TYPES,
  PLATFORM_SAAS_ADOPTION_MATRIX,
  canManageOwnedResource,
  computeUsageMeterStatuses,
  evaluateEntitlement,
  hasOrganizationPermission,
  sanitizeOrganizationSlug,
} from '../../shared/saas/saasCoreEngine'
import type {
  EntitlementFeatureKey,
  ModulePermission,
  OrganizationRole,
  OrganizationType,
  OrganizationUnitType,
  OwnableResourceType,
  OwnershipType,
  PlanCode,
} from '../../shared/saas/saasTypes'
import {
  bindResourceOwnership,
  createOrganizationUnit,
  grantAuditedEntitlementOverride,
  inviteMemberToOrganization,
  loadWorkspaceState,
  previewSwitchSubscriptionPlan,
  provisionOrganizationWorkspace,
  resolveOrganizationInvitation,
  saveWorkspaceState,
  transferOrganizationOwnership,
  updateOrganizationLifecycleStatus,
  updateOrganizationMemberRole,
  type SaaSWorkspaceState,
} from '../../integrations/supabase/saas-platform-client'
import './OrganizationsWorkspacePage.css'

type WorkspaceTab = 'overview' | 'team' | 'permissions' | 'entitlements' | 'governance'

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
  'parent',
]

const ALL_MODULE_PERMISSIONS: { key: ModulePermission; label: string; module: string }[] = [
  { key: 'org:settings', label: 'Org Settings & Units', module: 'Organization' },
  { key: 'org:team', label: 'Team & Invitations', module: 'Organization' },
  { key: 'org:billing', label: 'Plan & Billing Readiness', module: 'Organization' },
  { key: 'org:audit', label: 'Security Audit Log', module: 'Organization' },
  { key: 'venues:manage', label: 'Venues & Turf Ops', module: 'Venues' },
  { key: 'coaches:manage', label: 'Coach Directory Ops', module: 'Coaches' },
  { key: 'trials:manage', label: 'Trials & Scholarships', module: 'Opportunities' },
  { key: 'events:manage', label: 'Sports Events', module: 'Events' },
  { key: 'tournaments:manage', label: 'Tournament Brackets', module: 'Tournaments' },
  { key: 'pickup_games:manage', label: 'Community Pickup Games', module: 'Play' },
  { key: 'bookings:manage', label: 'Slot & Desk Bookings', module: 'Bookings' },
  { key: 'athletes:manage', label: 'Athletes & Batches', module: 'Academy' },
  { key: 'editorial:manage', label: 'Editorial & Research', module: 'KhelChronicle' },
  { key: 'analytics:view', label: 'Tenant Analytics', module: 'Analytics' },
]

const FEATURE_KEYS: { key: EntitlementFeatureKey; label: string }[] = [
  { key: 'listings.free_submission', label: 'Free Public Listing Submission (Guaranteed Free)' },
  { key: 'verification.independent_review', label: 'Independent Verification Review (Guaranteed Free)' },
  { key: 'org.multi_member', label: 'Multi-Member Organization Seats' },
  { key: 'org.advanced_roles', label: 'Module-Level RBAC Roles' },
  { key: 'org.branches', label: 'Branches, Departments & Units' },
  { key: 'org.advanced_analytics', label: 'Advanced Organization Analytics' },
  { key: 'venues.multi_location', label: 'Multi-Location Venue Operations' },
  { key: 'academy.student_management', label: 'Academy Student & Batch Management' },
  { key: 'events.registrations', label: 'Events & Tournament Registrations' },
  { key: 'editorial.collaboration', label: 'Editorial & Research Collaboration' },
  { key: 'platform.data_exports', label: 'Monthly Data Exports' },
  { key: 'platform.api_access', label: 'Enterprise API Access' },
]

const OWNABLE_RESOURCE_TYPES: { value: OwnableResourceType; label: string }[] = [
  { value: 'venue', label: 'Sports Venue / Turf' },
  { value: 'academy', label: 'Sports Academy' },
  { value: 'coach_profile', label: 'Coach Profile' },
  { value: 'opportunity', label: 'Selection Trial / Scholarship' },
  { value: 'tournament', label: 'Tournament / League' },
  { value: 'event', label: 'Sports Event / Camp' },
  { value: 'pickup_game', label: 'Community Pickup Game' },
  { value: 'research_paper', label: 'KhelChronicle Research Paper' },
  { value: 'editorial_article', label: 'Editorial Publication' },
]

const UNIT_TYPES: { value: OrganizationUnitType; label: string }[] = [
  { value: 'branch', label: 'Branch / Campus' },
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'department', label: 'Department' },
  { value: 'team', label: 'Team / Squad' },
  { value: 'facility', label: 'Facility / Ground' },
]

interface Props {
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export default function OrganizationsWorkspacePage({ onNavigate }: Props) {
  const [workspace, setWorkspace] = useState<SaaSWorkspaceState>(() => loadWorkspaceState())
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Provision Organization Form state
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgType, setOrgType] = useState<OrganizationType>('federation')
  const [orgCity, setOrgCity] = useState('')
  const [orgState, setOrgState] = useState('')
  const [orgSport, setOrgSport] = useState('')
  const [orgEmail, setOrgEmail] = useState('')

  // Invitation Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationRole, 'owner'>>('listing_manager')
  const [transferTargetUserId, setTransferTargetUserId] = useState('')

  // Resource Ownership Form state
  const [resTitle, setResTitle] = useState('')
  const [resType, setResType] = useState<OwnableResourceType>('opportunity')
  const [resOwnerMode, setResOwnerMode] = useState<OwnershipType>('organization')
  const [resourceFilter, setResourceFilter] = useState<'all' | 'individual' | 'organization'>('all')

  // Entitlement Evaluator & Override state
  const [evalFeatureKey, setEvalFeatureKey] = useState<EntitlementFeatureKey>('org.advanced_analytics')
  const [overrideFeature, setOverrideFeature] = useState<EntitlementFeatureKey>('org.branches')
  const [overrideLimit, setOverrideLimit] = useState('15')
  const [overrideReason, setOverrideReason] = useState('')

  // Units & Adoption Matrix state
  const [unitName, setUnitName] = useState('')
  const [unitType, setUnitType] = useState<OrganizationUnitType>('branch')
  const [unitCity, setUnitCity] = useState('')
  const [matrixSearch, setMatrixSearch] = useState('')
  const [matrixPriority, setMatrixPriority] = useState<string>('all')

  useEffect(() => {
    saveWorkspaceState(workspace)
  }, [workspace])

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

  const filteredResources = useMemo(() => {
    return workspace.resources.filter(r => {
      if (resourceFilter === 'individual' && r.ownershipType !== 'individual') return false
      if (resourceFilter === 'organization' && r.ownershipType !== 'organization') return false
      if (activeOrg && r.ownershipType === 'organization' && r.ownerTenantId !== activeOrg.id) return false
      return true
    })
  }, [workspace.resources, resourceFilter, activeOrg])

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

  const filteredMatrix = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase()
    return PLATFORM_SAAS_ADOPTION_MATRIX.filter(item => {
      if (matrixPriority !== 'all' && item.integrationPriority !== matrixPriority) return false
      if (!q) return true
      return (
        item.moduleName.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q) ||
        item.ownershipMode.toLowerCase().includes(q) ||
        item.rbacRequired.toLowerCase().includes(q)
      )
    })
  }, [matrixSearch, matrixPriority])

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
      setFeedback({ type: 'success', message: 'Switched to Personal Identity workspace (individual ownership & free athlete passport).' })
    } else {
      const targetOrg = workspace.organizations.find(o => o.id === value)
      if (!targetOrg) return
      setWorkspace(prev => ({ ...prev, activeContext: { kind: 'organization', tenantId: targetOrg.id } }))
      setFeedback({ type: 'success', message: `Active workspace set to "${targetOrg.name}".` })
    }
  }

  async function handleProvisionOrg(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await provisionOrganizationWorkspace(workspace, {
        name: orgName,
        slug: orgSlug || undefined,
        tenantType: orgType,
        city: orgCity,
        stateName: orgState,
        sport: orgSport,
        contactEmail: orgEmail,
      })
      setWorkspace(result.state)
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
      if (result.success) {
        setOrgName('')
        setOrgSlug('')
        setOrgCity('')
        setOrgState('')
        setOrgSport('')
        setOrgEmail('')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleInviteMember(e: FormEvent) {
    e.preventDefault()
    if (!activeOrg) {
      setFeedback({ type: 'error', message: 'Select an active organization workspace before inviting members.' })
      return
    }
    setBusy(true)
    try {
      const result = await inviteMemberToOrganization(workspace, {
        tenantId: activeOrg.id,
        invitedEmail: inviteEmail,
        role: inviteRole,
      })
      setWorkspace(result.state)
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
      if (result.success) {
        setInviteEmail('')
      }
    } finally {
      setBusy(false)
    }
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

  async function handleOwnershipTransfer(e: FormEvent) {
    e.preventDefault()
    if (!activeOrg || !transferTargetUserId) return
    setBusy(true)
    try {
      const result = await transferOrganizationOwnership(workspace, activeOrg.id, transferTargetUserId)
      setWorkspace(result.state)
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
      if (result.success) setTransferTargetUserId('')
    } finally {
      setBusy(false)
    }
  }

  function handleToggleOrgLifecycle(tenantId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    const result = updateOrganizationLifecycleStatus(
      workspace,
      tenantId,
      nextStatus,
      nextStatus === 'suspended' ? 'Security isolation check (fail-closed verification)' : undefined
    )
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  async function handleBindResource(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await bindResourceOwnership(workspace, {
        resourceType: resType,
        resourceTitle: resTitle,
        ownershipType: resOwnerMode,
        ownerTenantId: resOwnerMode === 'organization' ? activeOrg?.id ?? null : null,
      })
      setWorkspace(result.state)
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
      if (result.success) setResTitle('')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateUnit(e: FormEvent) {
    e.preventDefault()
    if (!activeOrg) {
      setFeedback({ type: 'error', message: 'Switch to an active organization to add branches or teams.' })
      return
    }
    setBusy(true)
    try {
      const result = await createOrganizationUnit(workspace, {
        tenantId: activeOrg.id,
        name: unitName,
        unitType,
        city: unitCity,
      })
      setWorkspace(result.state)
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
      if (result.success) {
        setUnitName('')
        setUnitCity('')
      }
    } finally {
      setBusy(false)
    }
  }

  function handlePreviewPlanSwitch(planCode: PlanCode) {
    const result = previewSwitchSubscriptionPlan(workspace, subjectType, subjectId, planCode)
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
  }

  function handleGrantOverride(e: FormEvent) {
    e.preventDefault()
    const parsedLimit = overrideLimit.trim() === '' ? null : Number(overrideLimit)
    if (parsedLimit !== null && (Number.isNaN(parsedLimit) || parsedLimit < 0)) {
      setFeedback({ type: 'error', message: 'Override limit must be blank (unlimited) or a non-negative integer.' })
      return
    }
    const result = grantAuditedEntitlementOverride(workspace, {
      subjectType,
      subjectId,
      featureKey: overrideFeature,
      isEnabled: true,
      overrideLimit: parsedLimit,
      reason: overrideReason,
    })
    setWorkspace(result.state)
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message })
    if (result.success) setOverrideReason('')
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

  return (
    <section className="org-saas-page" aria-label="Organizations and SaaS Workspace Console">
      {/* Persistent Top Workspace Context Header */}
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

        {/* Policy & Active Context Strip */}
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

      {/* Live Action Feedback */}
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

      {/* KPI Summary Strip */}
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

      {/* Console Tab Bar */}
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

      {/* ====================================================================
          TAB 1: OVERVIEW & ORGANIZATION PROVISIONING
         ==================================================================== */}
      {activeTab === 'overview' && (
        <div className="org-saas-grid-2">
          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="building" size={18} />
                <span>Your Organizations</span>
              </h2>
              <span className="org-saas-tag">{workspace.organizations.length} total</span>
            </div>
            <p className="org-saas-panel-desc">
              Every organization has isolated tenant boundaries, independent verification status, and fail-closed
              suspension enforcement (suspended tenants immediately lose write and entitlement access).
            </p>

            <div className="org-saas-card-list">
              {workspace.organizations.map(org => {
                const mem = workspace.memberships.find(
                  m => m.tenantId === org.id && m.userId === workspace.currentUserId
                )
                const sub = workspace.subscriptions.find(s => s.subjectType === 'tenant' && s.subjectId === org.id)
                const isSelected = activeOrg?.id === org.id
                const meta = orgTypeMetaMap.get(org.tenantType)

                return (
                  <article
                    key={org.id}
                    className={`org-saas-item-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="org-saas-item-top">
                      <div>
                        <h3 className="org-saas-item-title">{org.name}</h3>
                        <p className="org-saas-item-meta">
                          {meta?.label || org.tenantType} · <span className="org-saas-code">/{org.slug}</span>
                          {org.city ? ` · ${org.city}${org.state ? `, ${org.state}` : ''}` : ''}
                          {org.sport ? ` · ${org.sport}` : ''}
                        </p>
                      </div>
                      <div className="org-saas-context-meta">
                        <span className={`org-saas-tag ${org.status === 'active' ? 'org-saas-tag--ok' : 'org-saas-tag--danger'}`}>
                          {org.status}
                        </span>
                        <span className="org-saas-tag">
                          {org.verificationStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="org-saas-item-actions">
                      <span className="org-saas-tag">Your Role: {mem?.role || 'viewer'}</span>
                      <span className="org-saas-tag">
                        Tier: {CANONICAL_SAAS_PLANS[sub?.planCode || 'org_free'].name}
                      </span>
                      {!isSelected && (
                        <button
                          type="button"
                          className="org-saas-btn org-saas-btn--primary org-saas-btn--sm"
                          onClick={() => handleContextSwitch(org.id)}
                        >
                          Open Workspace
                        </button>
                      )}
                      <button
                        type="button"
                        className={`org-saas-btn org-saas-btn--sm ${org.status === 'active' ? 'org-saas-btn--danger' : 'org-saas-btn--primary'}`}
                        onClick={() => handleToggleOrgLifecycle(org.id, org.status)}
                      >
                        {org.status === 'suspended' ? 'Reactivate Tenant' : 'Test Suspend (Fail-Closed)'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            {onNavigate && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a
                  href="/academy-hub"
                  className="org-saas-btn org-saas-btn--sm"
                  onClick={e => onNavigate(e, '/academy-hub')}
                >
                  Open Academy Hub <SiteIcon name="arrow-up-right" size={14} />
                </a>
                <a
                  href="/turf-calendar"
                  className="org-saas-btn org-saas-btn--sm"
                  onClick={e => onNavigate(e, '/turf-calendar')}
                >
                  Open Venue Operations <SiteIcon name="arrow-up-right" size={14} />
                </a>
                <a
                  href="/tournament-ops"
                  className="org-saas-btn org-saas-btn--sm"
                  onClick={e => onNavigate(e, '/tournament-ops')}
                >
                  Open Tournament Ops <SiteIcon name="arrow-up-right" size={14} />
                </a>
              </div>
            )}
          </div>

          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="plus" size={18} />
                <span>Register New Organization</span>
              </h2>
              <span className="org-saas-tag org-saas-tag--ok">Free Starter Tier</span>
            </div>
            <p className="org-saas-panel-desc">
              Provision any of KhelGrid&apos;s 18 sports ecosystem organization types using the atomic owner onboarding
              RPC. Public directory listings and verification remain completely free.
            </p>

            <form className="org-saas-form" onSubmit={handleProvisionOrg}>
              <div className="org-saas-field">
                <label htmlFor="new-org-name">Organization Name *</label>
                <input
                  id="new-org-name"
                  className="org-saas-input"
                  type="text"
                  required
                  minLength={2}
                  placeholder="e.g., Maharashtra State Athletics Federation"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                />
              </div>

              <div className="org-saas-form-row">
                <div className="org-saas-field">
                  <label htmlFor="new-org-type">Organization Category (18 Types) *</label>
                  <select
                    id="new-org-type"
                    className="org-saas-select"
                    value={orgType}
                    onChange={e => setOrgType(e.target.value as OrganizationType)}
                  >
                    {groupedOrgTypes.map(([group, items]) => (
                      <optgroup key={group} label={group}>
                        {items.map(item => (
                          <option key={item.type} value={item.type}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="org-saas-field">
                  <label htmlFor="new-org-slug">URL Slug (auto-generated if blank)</label>
                  <input
                    id="new-org-slug"
                    className="org-saas-input"
                    type="text"
                    placeholder={sanitizeOrganizationSlug(orgName || 'maharashtra-athletics')}
                    value={orgSlug}
                    onChange={e => setOrgSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="org-saas-form-row">
                <div className="org-saas-field">
                  <label htmlFor="new-org-city">City</label>
                  <input
                    id="new-org-city"
                    className="org-saas-input"
                    type="text"
                    placeholder="e.g., Pune"
                    value={orgCity}
                    onChange={e => setOrgCity(e.target.value)}
                  />
                </div>
                <div className="org-saas-field">
                  <label htmlFor="new-org-state">State / UT</label>
                  <input
                    id="new-org-state"
                    className="org-saas-input"
                    type="text"
                    placeholder="e.g., Maharashtra"
                    value={orgState}
                    onChange={e => setOrgState(e.target.value)}
                  />
                </div>
              </div>

              <div className="org-saas-form-row">
                <div className="org-saas-field">
                  <label htmlFor="new-org-sport">Primary Sport</label>
                  <input
                    id="new-org-sport"
                    className="org-saas-input"
                    type="text"
                    placeholder="e.g., Athletics, Football, Multi-Sport"
                    value={orgSport}
                    onChange={e => setOrgSport(e.target.value)}
                  />
                </div>
                <div className="org-saas-field">
                  <label htmlFor="new-org-email">Official Desk Email</label>
                  <input
                    id="new-org-email"
                    className="org-saas-input"
                    type="email"
                    placeholder="office@organization.org"
                    value={orgEmail}
                    onChange={e => setOrgEmail(e.target.value)}
                  />
                </div>
              </div>

              <p className="org-saas-field-hint">
                Category info: {orgTypeMetaMap.get(orgType)?.description}
              </p>

              <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy}>
                <SiteIcon name="plus" size={16} />
                <span>Provision Organization Workspace</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: TEAM, RBAC & CRYPTOGRAPHIC INVITATIONS
         ==================================================================== */}
      {activeTab === 'team' && (
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
                      const isSelf = member.userId === workspace.currentUserId
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
                                onChange={e => handleRoleChange(member.userId, e.target.value as OrganizationRole)}
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

            {/* Pending & Historical Invitations */}
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
                              onClick={() => handleResolveInvite(inv.id, 'accept')}
                            >
                              Simulate Accept Invite
                            </button>
                            <button
                              type="button"
                              className="org-saas-btn org-saas-btn--danger org-saas-btn--sm"
                              onClick={() => handleResolveInvite(inv.id, 'revoke')}
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
            {/* Invite Member Form */}
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

              <form className="org-saas-form" onSubmit={handleInviteMember}>
                <div className="org-saas-field">
                  <label htmlFor="invite-member-email">Member Email Address *</label>
                  <input
                    id="invite-member-email"
                    className="org-saas-input"
                    type="email"
                    required
                    placeholder="coach.ananya@academy.in"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="org-saas-field">
                  <label htmlFor="invite-member-role">Assigned Organization Role *</label>
                  <select
                    id="invite-member-role"
                    className="org-saas-select"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
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

            {/* Atomic Ownership Transfer */}
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

              {activeOrg && activeOrg.ownerId === workspace.currentUserId && eligibleTransferTargets.length > 0 ? (
                <form className="org-saas-form" onSubmit={handleOwnershipTransfer}>
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
                    ? activeOrg.ownerId !== workspace.currentUserId
                      ? 'Only the current registered organization owner can initiate ownership transfer.'
                      : 'Invite and activate at least one additional member before transferring ownership.'
                    : 'Select an organization workspace to manage ownership transfer.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: MODULE PERMISSIONS & DUAL RESOURCE OWNERSHIP
         ==================================================================== */}
      {activeTab === 'permissions' && (
        <div>
          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="lock" size={18} />
                <span>Effective Module Permissions ({activeMembership?.role || 'Personal Context'})</span>
              </h2>
              <span className="org-saas-tag org-saas-tag--ok">
                Platform Admin Isolation: Enforced (0 platform privileges granted by org roles)
              </span>
            </div>
            <p className="org-saas-panel-desc">
              Strict domain separation: Organization roles grant scoped module permissions inside the active tenant only
              and <strong>never</strong> confer platform moderation, verification approval, or global admin privileges.
            </p>

            <div className="org-saas-perm-grid">
              {ALL_MODULE_PERMISSIONS.map(item => {
                const granted = activeOrg
                  ? hasOrganizationPermission({
                      organization: activeOrg,
                      membership: activeMembership,
                      permission: item.key,
                    })
                  : false
                return (
                  <div
                    key={item.key}
                    className={`org-saas-perm-cell ${granted ? 'is-granted' : ''}`}
                  >
                    <div>
                      <div>{item.label}</div>
                      <div className="org-saas-item-meta">{item.key}</div>
                    </div>
                    <SiteIcon name={granted ? 'check-circle' : 'lock'} size={16} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="org-saas-grid-2">
            <div className="org-saas-panel">
              <div className="org-saas-panel-header">
                <h2>
                  <SiteIcon name="link" size={18} />
                  <span>Dual Resource Ownership Registry</span>
                </h2>
                <select
                  aria-label="Filter resources by ownership mode"
                  className="org-saas-select"
                  style={{ width: 'auto', minWidth: 165 }}
                  value={resourceFilter}
                  onChange={e => setResourceFilter(e.target.value as 'all' | 'individual' | 'organization')}
                >
                  <option value="all">All Visible Resources</option>
                  <option value="individual">Individual Owned Only</option>
                  <option value="organization">Organization Owned Only</option>
                </select>
              </div>
              <p className="org-saas-panel-desc">
                KhelGrid supports both <strong>Individual</strong> ownership (personal coach profiles, athlete CVs,
                community games) and <strong>Organization</strong> ownership (academy listings, university tournaments,
                federation trials) without forcing every user into a tenant.
              </p>

              <div className="org-saas-card-list">
                {filteredResources.map(res => {
                  const access = canManageOwnedResource({
                    resource: res,
                    actorUserId: workspace.currentUserId,
                    activeOrganization: activeOrg,
                    actorMembership: activeMembership,
                  })
                  return (
                    <div key={res.id} className="org-saas-item-card">
                      <div className="org-saas-item-top">
                        <div>
                          <h3 className="org-saas-item-title">{res.resourceTitle}</h3>
                          <p className="org-saas-item-meta">
                            Type: <span className="org-saas-code">{res.resourceType}</span> · Ownership:{' '}
                            <strong>{res.ownershipType}</strong> · Verification: {res.verificationStatus.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`org-saas-tag ${access.allowed ? 'org-saas-tag--ok' : 'org-saas-tag--warn'}`}>
                          {access.allowed ? 'Can Manage' : 'Read / Scoped'}
                        </span>
                      </div>
                      <div className="org-saas-item-meta">{access.reason}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="org-saas-panel">
              <div className="org-saas-panel-header">
                <h2>
                  <SiteIcon name="plus" size={18} />
                  <span>Bind Resource Ownership</span>
                </h2>
              </div>
              <p className="org-saas-panel-desc">
                Register a venue, trial, tournament, coach profile, or paper under either your personal account or the
                active organization. Public listing submission remains 100% free.
              </p>

              <form className="org-saas-form" onSubmit={handleBindResource}>
                <div className="org-saas-field">
                  <label htmlFor="res-title-input">Resource Title *</label>
                  <input
                    id="res-title-input"
                    className="org-saas-input"
                    type="text"
                    required
                    minLength={3}
                    placeholder="e.g., West Zone U-19 Football Selection Trials"
                    value={resTitle}
                    onChange={e => setResTitle(e.target.value)}
                  />
                </div>
                <div className="org-saas-form-row">
                  <div className="org-saas-field">
                    <label htmlFor="res-type-select">Resource Type</label>
                    <select
                      id="res-type-select"
                      className="org-saas-select"
                      value={resType}
                      onChange={e => setResType(e.target.value as OwnableResourceType)}
                    >
                      {OWNABLE_RESOURCE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="org-saas-field">
                    <label htmlFor="res-owner-mode">Ownership Mode</label>
                    <select
                      id="res-owner-mode"
                      className="org-saas-select"
                      value={resOwnerMode}
                      onChange={e => setResOwnerMode(e.target.value as OwnershipType)}
                    >
                      <option value="organization">Organization Owned ({activeOrg?.name || 'select org'})</option>
                      <option value="individual">Individual Owned ({workspace.currentUserName})</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy}>
                  <SiteIcon name="check" size={15} />
                  <span>Bind Resource Ownership</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: CENTRALIZED ENTITLEMENTS & USAGE METERING
         ==================================================================== */}
      {activeTab === 'entitlements' && (
        <div>
          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="wallet" size={18} />
                <span>Canonical Entitlement Tiers (Payments Strictly Disabled)</span>
              </h2>
              <span className="org-saas-tag org-saas-tag--ok">payment_collection_enabled = false</span>
            </div>
            <p className="org-saas-panel-desc">
              Modules query the centralized entitlement engine instead of checking hardcoded plan strings. Preview how
              organization tiers adjust quotas without enabling any payment gateway or paywalling free listings.
            </p>

            <div className="org-saas-plan-grid">
              {(['org_free', 'org_growth', 'org_enterprise'] as PlanCode[]).map(code => {
                const plan = CANONICAL_SAAS_PLANS[code]
                const isCurrent = effectivePlanCode === code
                return (
                  <div key={code} className={`org-saas-plan-card ${isCurrent ? 'is-current' : ''}`}>
                    <div>
                      <div className="org-saas-item-top">
                        <h3 className="org-saas-item-title">{plan.name}</h3>
                        {isCurrent && <span className="org-saas-tag org-saas-tag--ok">Active</span>}
                      </div>
                      <p className="org-saas-item-meta" style={{ marginTop: 6 }}>
                        {plan.summary}
                      </p>
                      <p className="org-saas-item-meta" style={{ marginTop: 8 }}>
                        Members: <strong>{plan.entitlements['org.multi_member'].limit}</strong> · Branches:{' '}
                        <strong>{plan.entitlements['org.branches'].limit}</strong> · API:{' '}
                        <strong>{plan.entitlements['platform.api_access'].enabled ? 'Included' : 'No'}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`org-saas-btn org-saas-btn--sm ${isCurrent ? '' : 'org-saas-btn--primary'}`}
                      disabled={isCurrent}
                      onClick={() => handlePreviewPlanSwitch(code)}
                    >
                      {isCurrent ? 'Current Preview Tier' : 'Preview Entitlement Tier'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="org-saas-grid-2">
            <div className="org-saas-panel">
              <div className="org-saas-panel-header">
                <h2>
                  <SiteIcon name="chart" size={18} />
                  <span>Live Usage Metering &amp; Soft/Hard Quotas</span>
                </h2>
              </div>
              <p className="org-saas-panel-desc">
                Tracks active organization members, branches, managed venues, events, exports, and storage against
                canonical plan limits and audited overrides.
              </p>

              <div className="org-saas-meter-list">
                {meterStatuses.map(meter => (
                  <div key={meter.meterKey}>
                    <div className="org-saas-meter-head">
                      <span>
                        <strong>{meter.displayName}</strong>{' '}
                        <span className="org-saas-item-meta">({meter.windowType.replace('_', ' ')})</span>
                      </span>
                      <span>
                        <strong>{meter.currentValue}</strong> / {meter.limit === null ? 'Unlimited' : meter.limit}{' '}
                        {meter.hardLimitReached ? (
                          <span className="org-saas-tag org-saas-tag--danger">Hard Limit</span>
                        ) : meter.softLimitReached ? (
                          <span className="org-saas-tag org-saas-tag--warn">Soft Warning</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="org-saas-meter-bar" role="progressbar" aria-valuenow={meter.utilizationPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={`org-saas-meter-fill ${
                          meter.hardLimitReached
                            ? 'org-saas-meter-fill--danger'
                            : meter.softLimitReached
                              ? 'org-saas-meter-fill--warn'
                              : ''
                        }`}
                        style={{ width: `${meter.utilizationPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Centralized Entitlement Evaluator */}
              <div className="org-saas-panel">
                <div className="org-saas-panel-header">
                  <h2>
                    <SiteIcon name="shield-check" size={18} />
                    <span>Centralized Entitlement Evaluator</span>
                  </h2>
                </div>
                <div className="org-saas-field">
                  <label htmlFor="entitlement-feature-select">Evaluate Feature Key</label>
                  <select
                    id="entitlement-feature-select"
                    className="org-saas-select"
                    value={evalFeatureKey}
                    onChange={e => setEvalFeatureKey(e.target.value as EntitlementFeatureKey)}
                  >
                    {FEATURE_KEYS.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`org-saas-eval-box ${
                    liveEntitlementResult.allowed ? 'org-saas-eval-box--allowed' : 'org-saas-eval-box--denied'
                  }`}
                >
                  <div className="org-saas-item-top">
                    <strong>Verdict: {liveEntitlementResult.allowed ? 'ALLOWED' : 'DENIED'}</strong>
                    <span className="org-saas-code">{liveEntitlementResult.source}</span>
                  </div>
                  <div className="org-saas-item-meta">{liveEntitlementResult.reason}</div>
                  <div className="org-saas-item-meta">
                    Effective Plan: <span className="org-saas-code">{liveEntitlementResult.planCode}</span> · Limit:{' '}
                    <strong>{liveEntitlementResult.limit === null ? 'Unlimited' : liveEntitlementResult.limit}</strong>
                    {liveEntitlementResult.remaining !== undefined && liveEntitlementResult.remaining !== null
                      ? ` · Remaining: ${liveEntitlementResult.remaining}`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Audited Admin Override Form */}
              <div className="org-saas-panel">
                <div className="org-saas-panel-header">
                  <h2>
                    <SiteIcon name="sparkles" size={18} />
                    <span>Audited Entitlement Override</span>
                  </h2>
                </div>
                <p className="org-saas-panel-desc">
                  Simulates a time-bound, platform-audited override (e.g., pilot grant for a grassroots school or
                  federation). Every override writes an immutable audit event.
                </p>
                <form className="org-saas-form" onSubmit={handleGrantOverride}>
                  <div className="org-saas-form-row">
                    <div className="org-saas-field">
                      <label htmlFor="override-feature-select">Feature Key</label>
                      <select
                        id="override-feature-select"
                        className="org-saas-select"
                        value={overrideFeature}
                        onChange={e => setOverrideFeature(e.target.value as EntitlementFeatureKey)}
                      >
                        {FEATURE_KEYS.filter(f => !f.key.startsWith('listings.') && !f.key.startsWith('verification.')).map(f => (
                          <option key={f.key} value={f.key}>
                            {f.key}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="org-saas-field">
                      <label htmlFor="override-limit-input">Override Limit (blank = unlimited)</label>
                      <input
                        id="override-limit-input"
                        className="org-saas-input"
                        type="number"
                        min={0}
                        value={overrideLimit}
                        onChange={e => setOverrideLimit(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="org-saas-field">
                    <label htmlFor="override-reason-input">Mandatory Audit Reason *</label>
                    <input
                      id="override-reason-input"
                      className="org-saas-input"
                      type="text"
                      required
                      minLength={5}
                      placeholder="e.g., State federation tournament pilot extension (30 days)"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="org-saas-btn org-saas-btn--primary">
                    Record Audited Override
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: BRANCHES/UNITS, 30-MODULE ADOPTION MATRIX & AUDIT LOG
         ==================================================================== */}
      {activeTab === 'governance' && (
        <div>
          <div className="org-saas-grid-2">
            {/* Organization Units (Branches / Departments / Teams) */}
            <div className="org-saas-panel">
              <div className="org-saas-panel-header">
                <h2>
                  <SiteIcon name="map-pin" size={18} />
                  <span>Organization Units (Branches, Teams &amp; Facilities)</span>
                </h2>
                <span className="org-saas-tag">{orgUnits.length} active</span>
              </div>
              <p className="org-saas-panel-desc">
                Lightweight hierarchy supporting multi-branch academies, university campus facilities, and regional
                federation wings with composite tenant FK isolation.
              </p>

              <div className="org-saas-card-list" style={{ marginBottom: 16 }}>
                {orgUnits.length === 0 ? (
                  <p className="org-saas-item-meta">No branches or units added for this workspace yet.</p>
                ) : (
                  orgUnits.map(unit => (
                    <div key={unit.id} className="org-saas-item-card">
                      <div className="org-saas-item-top">
                        <div>
                          <h3 className="org-saas-item-title">{unit.name}</h3>
                          <p className="org-saas-item-meta">
                            {unit.unitType.replace('_', ' ')} {unit.city ? `· ${unit.city}` : ''} · Lead:{' '}
                            {unit.leadName || 'Assigned Admin'}
                          </p>
                        </div>
                        <span className="org-saas-tag org-saas-tag--ok">Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="org-saas-form" onSubmit={handleCreateUnit}>
                <div className="org-saas-form-row">
                  <div className="org-saas-field">
                    <label htmlFor="unit-name-input">Unit Name *</label>
                    <input
                      id="unit-name-input"
                      className="org-saas-input"
                      type="text"
                      required
                      minLength={2}
                      placeholder="e.g., West Zone Athletics Wing"
                      value={unitName}
                      onChange={e => setUnitName(e.target.value)}
                    />
                  </div>
                  <div className="org-saas-field">
                    <label htmlFor="unit-type-select">Unit Type</label>
                    <select
                      id="unit-type-select"
                      className="org-saas-select"
                      value={unitType}
                      onChange={e => setUnitType(e.target.value as OrganizationUnitType)}
                    >
                      {UNIT_TYPES.map(ut => (
                        <option key={ut.value} value={ut.value}>
                          {ut.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="org-saas-field">
                  <label htmlFor="unit-city-input">City</label>
                  <input
                    id="unit-city-input"
                    className="org-saas-input"
                    type="text"
                    placeholder="e.g., Mumbai"
                    value={unitCity}
                    onChange={e => setUnitCity(e.target.value)}
                  />
                </div>
                <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy || !activeOrg}>
                  <SiteIcon name="plus" size={15} />
                  <span>Add Organization Unit</span>
                </button>
                {activeOrg && !canManageSettings && (
                  <p className="org-saas-field-hint">
                    Requires active <span className="org-saas-code">org:settings</span> permission and available{' '}
                    <span className="org-saas-code">org.branches</span> quota.
                  </p>
                )}
              </form>
            </div>

            {/* Immutable Audit Log Viewer */}
            <div className="org-saas-panel">
              <div className="org-saas-panel-header">
                <h2>
                  <SiteIcon name="shield-check" size={18} />
                  <span>Immutable Security Audit Log</span>
                </h2>
                <span className="org-saas-tag org-saas-tag--ok">Append-Only</span>
              </div>
              <p className="org-saas-panel-desc">
                Tracks provisioning, invitations, role changes, ownership transfers, lifecycle holds, and entitlement
                overrides. No UPDATE or DELETE privileges are granted to client roles in PostgreSQL.
              </p>

              <div className="org-saas-card-list">
                {visibleAuditLogs.map(log => (
                  <div key={log.id} className="org-saas-item-card">
                    <div className="org-saas-item-top">
                      <span className="org-saas-code">{log.action}</span>
                      <span className="org-saas-item-meta">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="org-saas-item-meta">
                      Actor: <strong>{log.actorLabel}</strong> · Resource: {log.resourceType}
                      {log.resourceId ? ` (${log.resourceId})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 30-Module Platform SaaS Adoption Matrix */}
          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="globe" size={18} />
                <span>30-Module Platform SaaS Adoption Matrix</span>
              </h2>
              <span className="org-saas-tag">
                {filteredMatrix.length} / {PLATFORM_SAAS_ADOPTION_MATRIX.length} modules
              </span>
            </div>
            <p className="org-saas-panel-desc">
              Complete architectural blueprint defining how every KhelGrid module integrates with identity, dual
              ownership, RBAC, entitlements, and metering while preserving public discovery and free listings.
            </p>

            <div className="org-saas-filter-bar">
              <input
                type="search"
                aria-label="Search platform modules"
                className="org-saas-input"
                placeholder="Filter by module name, route, ownership mode, or permission..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
              />
              <select
                aria-label="Filter by rollout priority"
                className="org-saas-select"
                value={matrixPriority}
                onChange={e => setMatrixPriority(e.target.value)}
              >
                <option value="all">All Integration Priorities</option>
                <option value="Now (Phase 2)">Now (Phase 2)</option>
                <option value="Next (Phase 3)">Next (Phase 3)</option>
                <option value="Not Needed (Keep Public)">Not Needed (Keep Public)</option>
              </select>
            </div>

            <div className="org-saas-table-wrap">
              <table className="org-saas-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Ownership Mode</th>
                    <th>RBAC Required</th>
                    <th>Entitlement Policy</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrix.map(row => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.moduleName}</strong>
                        <div className="org-saas-item-meta">
                          <span className="org-saas-code">{row.route}</span>
                        </div>
                      </td>
                      <td>{row.ownershipMode}</td>
                      <td>
                        <span className="org-saas-code">{row.rbacRequired}</span>
                      </td>
                      <td>{row.entitlementRelevance}</td>
                      <td>
                        <span
                          className={`org-saas-tag ${
                            row.integrationPriority === 'Now (Phase 2)'
                              ? 'org-saas-tag--ok'
                              : row.integrationPriority === 'Next (Phase 3)'
                                ? 'org-saas-tag--warn'
                                : ''
                          }`}
                        >
                          {row.integrationPriority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export { ORGANIZATION_ROLE_PERMISSIONS }
