import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { useTenant } from '../../shared/context/useTenant'
import { getTenantAuditLogs } from '../../integrations/supabase/tenant-client'
import {
  ACADEMY_WORKSPACE_NAV_ITEMS,
  canAccessAcademySection,
  getAcademyRoleCapabilities,
  resolveAcademyRouteTarget,
  type AcademyWorkspaceSectionId,
} from './academyHubTypes'
import {
  listAcademyAnnouncements,
  listAcademyAthletes,
  listAcademyBatches,
  listAcademyBranches,
  listAcademyCoaches,
  listAcademyEquipment,
  listAcademyFacilities,
  listAcademyFeeInvoices,
  listAcademyFeeLedger,
  listAcademyStaffMembers,
  listAdmissionEnquiries,
  listTrainingSessions,
  listTrialPostings,
  loadAcademyDashboardOverview,
  loadOrInitializeAcademyProfile,
  type AcademyAnnouncementRecord,
  type AcademyAthleteRecord,
  type AcademyBatchRecord,
  type AcademyBranchRecord,
  type AcademyCoachRecord,
  type AcademyEnquiryRecord,
  type AcademyEquipmentRecord,
  type AcademyFacilityRecord,
  type AcademyFeeInvoiceRecord,
  type AcademyFeeTransactionRecord,
  type AcademyOverviewPayload,
  type AcademyProfileRecord,
  type AcademySessionRecord,
  type AcademyStaffMemberRecord,
  type AcademyTrialPostingRecord,
} from './academyWorkspaceClient'
import { AcademyOverviewAndProfilePanel } from './components/workspace/AcademyOverviewAndProfilePanel'
import { AcademyBranchesAndPeoplePanel } from './components/workspace/AcademyBranchesAndPeoplePanel'
import { AcademyTrainingAndAttendancePanel } from './components/workspace/AcademyTrainingAndAttendancePanel'
import { AcademyAdmissionsAndFacilitiesPanel } from './components/workspace/AcademyAdmissionsAndFacilitiesPanel'
import { AcademyGovernanceAndCommsPanel } from './components/workspace/AcademyGovernanceAndCommsPanel'
import './AcademyHubPage.css'

export interface AcademyHubPageProps {
  workspaceSection?: string
  currentPath?: string
  initialTab?: AcademyWorkspaceSectionId
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

const ALLOWED_ACADEMY_TENANT_TYPES = new Set([
  'academy',
  'club',
  'school',
  'college',
  'university',
  'training_org',
])

const NAV_GROUPS: readonly { id: 'operations' | 'people' | 'growth' | 'governance'; label: string }[] = [
  { id: 'operations', label: 'Academy Foundation' },
  { id: 'people', label: 'People & Schedule' },
  { id: 'growth', label: 'Admissions & Venues' },
  { id: 'governance', label: 'Reports, Team & Security' },
]

/**
 * KhelGrid Multi-Tenant SaaS Academy Dashboard.
 *
 * Security & correctness invariants:
 * - Fail-closed against unauthenticated or unassigned callers; never falls back to
 *   static/curated demo academies or fabricated statistics.
 * - Enforces active tenant membership + server-verified role + optional branch scoping.
 * - Zero client-side role switcher dropdowns or self-verification overrides.
 */
export default function AcademyHubPage({
  workspaceSection,
  currentPath,
  initialTab,
  onNavigate,
}: AcademyHubPageProps) {
  const { user: authUser, openAuth } = useAuth()
  const {
    userId,
    isAuthenticated,
    currentTenant,
    currentMembership,
    memberships,
    isLoading: tenantLoading,
    switchTenant,
  } = useTenant()

  const effectivePath =
    currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '')

  const routeTarget = useMemo(
    () => resolveAcademyRouteTarget(effectivePath, workspaceSection),
    [effectivePath, workspaceSection],
  )

  const [activeSection, setActiveSection] = useState<AcademyWorkspaceSectionId>(
    initialTab ?? routeTarget.section,
  )
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [dpdpMaskEnabled, setDpdpMaskEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [overview, setOverview] = useState<AcademyOverviewPayload | null>(null)
  const [profile, setProfile] = useState<AcademyProfileRecord | null>(null)
  const [branches, setBranches] = useState<AcademyBranchRecord[]>([])
  const [athletes, setAthletes] = useState<AcademyAthleteRecord[]>([])
  const [coaches, setCoaches] = useState<AcademyCoachRecord[]>([])
  const [batches, setBatches] = useState<AcademyBatchRecord[]>([])
  const [sessions, setSessions] = useState<AcademySessionRecord[]>([])
  const [enquiries, setEnquiries] = useState<AcademyEnquiryRecord[]>([])
  const [trialPostings, setTrialPostings] = useState<AcademyTrialPostingRecord[]>([])
  const [facilities, setFacilities] = useState<AcademyFacilityRecord[]>([])
  const [equipment, setEquipment] = useState<AcademyEquipmentRecord[]>([])
  const [announcements, setAnnouncements] = useState<AcademyAnnouncementRecord[]>([])
  const [staffMembers, setStaffMembers] = useState<AcademyStaffMemberRecord[]>([])
  const [feeInvoices, setFeeInvoices] = useState<AcademyFeeInvoiceRecord[]>([])
  const [feeTransactions, setFeeTransactions] = useState<AcademyFeeTransactionRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; entity_type: string; details: Record<string, unknown>; created_at: string }[]
  >([])

  useEffect(() => {
    setActiveSection(initialTab ?? routeTarget.section)
  }, [initialTab, routeTarget.section])

  const academyMemberships = useMemo(
    () =>
      memberships.filter(
        m =>
          m.status === 'active' &&
          m.tenant &&
          m.tenant.status === 'active' &&
          ALLOWED_ACADEMY_TENANT_TYPES.has(m.tenant.tenant_type),
      ),
    [memberships],
  )

  const activeAcademyMembership = useMemo(() => {
    if (
      currentMembership &&
      currentTenant &&
      ALLOWED_ACADEMY_TENANT_TYPES.has(currentTenant.tenant_type)
    ) {
      return currentMembership
    }
    return academyMemberships[0] || null
  }, [currentMembership, currentTenant, academyMemberships])

  const activeTenant = activeAcademyMembership?.tenant || (
    currentTenant && ALLOWED_ACADEMY_TENANT_TYPES.has(currentTenant.tenant_type)
      ? currentTenant
      : null
  )

  useEffect(() => {
    setSelectedBranchId(null)
  }, [activeTenant?.id])

  const verifiedRole = activeAcademyMembership?.role || null
  const capabilities = useMemo(() => getAcademyRoleCapabilities(verifiedRole), [verifiedRole])

  const visibleNavItems = useMemo(
    () => ACADEMY_WORKSPACE_NAV_ITEMS.filter(item => canAccessAcademySection(verifiedRole, item.id)),
    [verifiedRole],
  )

  const loadWorkspaceData = useCallback(async () => {
    if (!isAuthenticated || !userId || !activeTenant?.id || !verifiedRole) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const tid = activeTenant.id
      const caps = getAcademyRoleCapabilities(verifiedRole)

      const [
        ovRes,
        profRes,
        brList,
        athList,
        chList,
        batList,
        sessList,
        enqList,
        trialList,
        facList,
        eqList,
        annList,
        staffList,
        invList,
        feeList,
        auditList,
      ] = await Promise.all([
        loadAcademyDashboardOverview(tid, selectedBranchId),
        loadOrInitializeAcademyProfile(tid),
        listAcademyBranches(tid),
        listAcademyAthletes(tid, selectedBranchId),
        listAcademyCoaches(tid),
        listAcademyBatches(tid, selectedBranchId),
        listTrainingSessions(tid, selectedBranchId),
        listAdmissionEnquiries(tid, selectedBranchId),
        listTrialPostings(tid),
        listAcademyFacilities(tid),
        listAcademyEquipment(tid),
        listAcademyAnnouncements(tid),
        listAcademyStaffMembers(tid),
        caps.canViewFinance ? listAcademyFeeInvoices(tid) : Promise.resolve([]),
        caps.canViewFinance ? listAcademyFeeLedger(tid) : Promise.resolve([]),
        caps.canManageSettings ? getTenantAuditLogs(tid) : Promise.resolve([]),
      ])

      if (ovRes.error) setError(ovRes.error)
      setOverview(ovRes.overview)
      if (profRes.data) setProfile(profRes.data)
      setBranches(brList)
      setAthletes(athList)
      setCoaches(chList)
      setBatches(batList)
      setSessions(sessList)
      setEnquiries(enqList)
      setTrialPostings(trialList)
      setFacilities(facList)
      setEquipment(eqList)
      setAnnouncements(annList)
      setStaffMembers(staffList)
      setFeeInvoices(invList)
      setFeeTransactions(feeList)
      setAuditLogs(
        auditList.map(l => ({
          id: l.id,
          action: l.action,
          entity_type: l.entity_type,
          details: l.details || {},
          created_at: l.created_at,
        })),
      )

      const tenantRecord = activeTenant as unknown as { settings?: Record<string, unknown> }
      const tenantSettings = tenantRecord.settings || {}
      if (typeof tenantSettings.dpdpMaskMinorsDefault === 'boolean') {
        setDpdpMaskEnabled(tenantSettings.dpdpMaskMinorsDefault)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync academy workspace data.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, userId, activeTenant, verifiedRole, selectedBranchId])

  useEffect(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  const handleSelectSection = useCallback(
    (section: AcademyWorkspaceSectionId) => {
      setActiveSection(section)
      setFeedback(null)
      if (onNavigate && effectivePath.startsWith('/academy-hub')) {
        const navItem = ACADEMY_WORKSPACE_NAV_ITEMS.find(i => i.id === section)
        const target = navItem?.pathSegment ? `/academy-hub/${navItem.pathSegment}` : '/academy-hub'
        onNavigate(undefined, target)
      }
    },
    [effectivePath, onNavigate],
  )

  // Fail-closed authenticating gate (also keeps VIEWER (AUTHENTICATING) contract intact)
  if (tenantLoading) {
    return (
      <div className="kg-acad-root" data-testid="academy-workspace-authenticating">
        <div className="kg-acad-header">
          <div>
            <div className="kg-acad-eyebrow-row">
              <span className="kg-acad-eyebrow">KhelGrid SaaS Academy Workspace</span>
              <span className="kg-acad-pill is-info" data-testid="academy-role-badge">
                VIEWER (AUTHENTICATING)
              </span>
            </div>
            <h1>Verifying Academy Workspace Access</h1>
          </div>
        </div>
        <EmptyState
          title="Verifying authenticated academy membership"
          description="Checking your encrypted Supabase session and authorized tenant roles."
        />
      </div>
    )
  }

  // Fail-closed unauthenticated or unassigned gate (ZERO demo academies / hardcoded records)
  if (!isAuthenticated || !userId || !activeTenant || !verifiedRole) {
    return (
      <div className="kg-acad-root" data-testid="academy-workspace-blocked">
        <div className="kg-acad-header">
          <div>
            <div className="kg-acad-eyebrow-row">
              <span className="kg-acad-eyebrow">KhelGrid SaaS Academy Workspace</span>
              <span className="kg-acad-pill is-warning" data-testid="academy-role-badge">
                RESTRICTED ACCESS
              </span>
            </div>
            <h1>Authorized Academy Membership Required</h1>
          </div>
        </div>
        <EmptyState
          title={isAuthenticated ? 'No active Academy workspace assigned' : 'Sign in to access your Academy Workspace'}
          description={
            isAuthenticated
              ? 'Your account does not hold an active role for an academy or training centre tenant. Register an academy or accept a staff invitation to continue.'
              : 'Private athlete rosters, guardian contacts, attendance records, and admissions pipelines require authenticated KhelGrid access.'
          }
          action={
            isAuthenticated ? (
              <a
                href="/partner-signup?role=academy"
                className="kg-acad-btn-primary"
                onClick={e => onNavigate?.(e, '/partner-signup?role=academy')}
              >
                Register Sports Academy
              </a>
            ) : (
              <button
                type="button"
                className="kg-acad-btn-primary"
                onClick={() => openAuth({ tab: 'login' })}
              >
                Sign In to Continue
              </button>
            )
          }
        />
      </div>
    )
  }

  const actorName = authUser?.fullName || authUser?.name || authUser?.email || 'Academy Staff'
  const sectionPermitted = canAccessAcademySection(verifiedRole, activeSection)
  const activeTenantSettings = ((activeTenant as unknown as { settings?: Record<string, unknown> }).settings) || {}
  const initialHotline = typeof activeTenantSettings.emergencyHotline === 'string' ? activeTenantSettings.emergencyHotline : ''
  const initialPocsoOfficer = typeof activeTenantSettings.pocsoOfficerName === 'string' ? activeTenantSettings.pocsoOfficerName : ''

  return (
    <div className="kg-acad-root" data-testid="academy-workspace-root">
      {/* Header: Tenant Switcher, Verified Role Badge & Branch Filter */}
      <header className="kg-acad-header">
        <div>
          <div className="kg-acad-eyebrow-row">
            <span className="kg-acad-eyebrow">Academy SaaS Workspace</span>
            <span className="kg-acad-pill is-emerald" data-testid="academy-role-badge">
              {capabilities.label}
            </span>
            <span
              className={`kg-acad-verif-pill ${
                activeTenant.verification_status === 'verified' ? 'is-verified' : 'is-pending'
              }`}
            >
              {activeTenant.verification_status === 'verified' ? 'Verified Academy' : activeTenant.verification_status || 'unverified'}
            </span>
          </div>
          <h1>{activeTenant.name}</h1>
          <p className="kg-acad-muted">
            {[activeTenant.city, activeTenant.state, activeTenant.sport].filter(Boolean).join(' · ') || 'Sports Training Workspace'}
          </p>
        </div>

        <div className="kg-acad-controls">
          {academyMemberships.length > 1 && (
            <select
              aria-label="Switch active academy tenant"
              className="kg-acad-select"
              value={activeTenant.id}
              onChange={e => void switchTenant(e.target.value)}
            >
              {academyMemberships.map(m => (
                <option key={m.tenant_id} value={m.tenant_id}>
                  {m.tenant?.name || m.tenant_id}
                </option>
              ))}
            </select>
          )}

          {branches.length > 0 && (
            <select
              aria-label="Filter academy branch"
              className="kg-acad-select"
              value={selectedBranchId || ''}
              onChange={e => setSelectedBranchId(e.target.value || null)}
            >
              <option value="">All Authorized Branches ({branches.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  Branch: {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="kg-acad-btn-outline"
            onClick={() => setDpdpMaskEnabled(v => !v)}
          >
            DPDP Mask: {dpdpMaskEnabled ? 'ON' : 'OFF'}
          </button>

          <a
            href={`/academies/${activeTenant.slug}`}
            className="kg-acad-btn-outline"
            onClick={e => onNavigate?.(e, `/academies/${activeTenant.slug}`)}
          >
            <SiteIcon name="external-link" size={14} /> Public Listing
          </a>
        </div>
      </header>

      {/* Mobile Horizontal Quick Nav */}
      <nav className="kg-acad-mobile-nav" aria-label="Academy sections mobile">
        {visibleNavItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`kg-acad-mobile-pill ${activeSection === item.id ? 'is-active' : ''}`}
            onClick={() => handleSelectSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* 2-Column Responsive Layout */}
      <div className="kg-acad-layout">
        <aside className="kg-acad-sidebar" aria-label="Academy Workspace Navigation">
          {NAV_GROUPS.map(group => {
            const items = visibleNavItems.filter(i => i.group === group.id)
            if (items.length === 0) return null
            return (
              <div key={group.id}>
                <div className="kg-acad-nav-group-label">{group.label}</div>
                {items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    className={`kg-acad-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
                    onClick={() => handleSelectSection(item.id)}
                  >
                    <SiteIcon name={item.icon} size={15} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </aside>

        <main className="kg-acad-main">
          {feedback && (
            <div
              className={`kg-acad-alert ${feedback.type === 'success' ? 'is-success' : 'is-danger'}`}
              role="status"
              style={{ marginBottom: '1rem' }}
            >
              <span>{feedback.message}</span>
              <button type="button" className="kg-acad-link-btn" onClick={() => setFeedback(null)}>
                Dismiss
              </button>
            </div>
          )}

          {!sectionPermitted ? (
            <EmptyState
              title="Section Restricted by Academy Role"
              description={`Your assigned role (${capabilities.label}) does not grant permission to access this module.`}
              action={
                <button type="button" className="kg-acad-btn-primary" onClick={() => handleSelectSection('overview')}>
                  Return to Overview
                </button>
              }
            />
          ) : (
            <>
              {(activeSection === 'overview' || activeSection === 'profile') && (
                <AcademyOverviewAndProfilePanel
                  mode={activeSection}
                  tenantId={activeTenant.id}
                  tenantName={activeTenant.name}
                  capabilities={capabilities}
                  profile={profile}
                  overview={overview}
                  selectedBranchId={selectedBranchId}
                  loading={loading}
                  error={error}
                  onSelectSection={handleSelectSection}
                  onRefresh={loadWorkspaceData}
                  onNavigate={onNavigate}
                  onFeedback={setFeedback}
                />
              )}

              {(activeSection === 'branches' || activeSection === 'athletes' || activeSection === 'coaches') && (
                <AcademyBranchesAndPeoplePanel
                  mode={activeSection}
                  tenantId={activeTenant.id}
                  academyName={activeTenant.name}
                  actorName={actorName}
                  capabilities={capabilities}
                  branches={branches}
                  athletes={athletes}
                  batches={batches}
                  coaches={coaches}
                  selectedBranchId={selectedBranchId}
                  initialDetailId={routeTarget.section === 'athletes' ? routeTarget.detailId : null}
                  dpdpMaskEnabled={dpdpMaskEnabled}
                  onSelectBranchFilter={setSelectedBranchId}
                  onRefresh={loadWorkspaceData}
                  onFeedback={setFeedback}
                />
              )}

              {(activeSection === 'training' || activeSection === 'attendance') && (
                <AcademyTrainingAndAttendancePanel
                  mode={activeSection}
                  tenantId={activeTenant.id}
                  academyName={activeTenant.name}
                  capabilities={capabilities}
                  branches={branches}
                  coaches={coaches}
                  facilities={facilities}
                  batches={batches}
                  sessions={sessions}
                  athletes={athletes}
                  selectedBranchId={selectedBranchId}
                  onRefresh={loadWorkspaceData}
                  onFeedback={setFeedback}
                />
              )}

              {(activeSection === 'admissions' || activeSection === 'facilities') && (
                <AcademyAdmissionsAndFacilitiesPanel
                  mode={activeSection}
                  tenantId={activeTenant.id}
                  academyName={activeTenant.name}
                  actorName={actorName}
                  capabilities={capabilities}
                  branches={branches}
                  batches={batches}
                  enquiries={enquiries}
                  trialPostings={trialPostings}
                  facilities={facilities}
                  equipment={equipment}
                  selectedBranchId={selectedBranchId}
                  dpdpMaskEnabled={dpdpMaskEnabled}
                  onRefresh={loadWorkspaceData}
                  onFeedback={setFeedback}
                />
              )}

              {(activeSection === 'notifications' ||
                activeSection === 'reports' ||
                activeSection === 'fees' ||
                activeSection === 'staff' ||
                activeSection === 'settings') && (
                <AcademyGovernanceAndCommsPanel
                  mode={activeSection}
                  tenantId={activeTenant.id}
                  academyName={activeTenant.name}
                  actorName={actorName}
                  actorUserId={userId}
                  initialUpiVpa={activeTenant.upi_vpa || ''}
                  initialHotline={initialHotline}
                  initialPocsoOfficer={initialPocsoOfficer}
                  tenantSettings={activeTenantSettings}
                  dpdpMaskEnabled={dpdpMaskEnabled}
                  onToggleDpdpMask={() => setDpdpMaskEnabled(v => !v)}
                  capabilities={capabilities}
                  overview={overview}
                  branches={branches}
                  batches={batches}
                  athletes={athletes}
                  enquiries={enquiries}
                  announcements={announcements}
                  staffMembers={staffMembers}
                  feeInvoices={feeInvoices}
                  feeTransactions={feeTransactions}
                  auditLogs={auditLogs}
                  onRefresh={loadWorkspaceData}
                  onFeedback={setFeedback}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
