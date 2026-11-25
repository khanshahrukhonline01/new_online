import { useEffect, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CURATED_ACADEMIES } from '../../shared/data/curatedEntitiesData'
import { useTenant } from '../../shared/context/useTenant'
import {
  type AcademyUserRole,
  canRoleAccessTab,
  getAcademyPreLaunchChecklist,
  generateSupportConciergeWhatsAppUrl,
  reconcileAcademyFeeLedger,
} from '../../shared/saas/saasLaunchReadinessService'
import { generateWhatsAppShareProfileUrl } from '../../shared/saas/saasSharedOperations'
import { getAvailableTournaments } from '../events/tournamentOpsEngine'
import {
  getAcademyEquipment,
  getAcademyKitDistributions,
  getAcademySafetyIncidents,
  getAcademyStaffSafeguarding,
} from './academyInventoryService'
import {
  confirmAndVerifyAcademy,
  getAcademyBatches,
  getAcademyFeeTransactions,
  getAcademyLeads,
  getAcademyLedgerSummary,
  getAcademySaaSSummary,
  getAcademySettings,
  getAcademyStaff,
  getAcademyStudents,
  getAcademyTrialPasses,
  getRegisteredAcademies,
  hasCompletedOnboarding,
  revokeAcademyVerification,
  updateLeadStatus,
  type AcademyBatch,
  type AcademyLead,
  type AcademyStudent,
  type AcademyTrialPass,
  type RegisteredAcademy,
} from './academySaaSClient'
import {
  ACADEMY_HUB_TABS,
  resolveAcademyTabForSection,
  type AcademyHubTab,
} from './academyHubTypes'
import { AcademyAdmissionsAndPassesPanel } from './components/AcademyAdmissionsAndPassesPanel'
import { AcademyBatchesAndAttendancePanel } from './components/AcademyBatchesAndAttendancePanel'
import { AcademyFeesAndLedgerPanel } from './components/AcademyFeesAndLedgerPanel'
import { AcademyComplianceAndSettingsPanel } from './components/AcademyComplianceAndSettingsPanel'
import { AcademyOnboardingModal } from './components/AcademyOnboardingModal'
import { AcademyEnrollmentModals } from './components/AcademyEnrollmentModals'
import { AcademyOpsAndBillingModals } from './components/AcademyOpsAndBillingModals'
import './AcademyHubPage.css'

export interface AcademyHubPageProps {
  initialAcademySlug?: string
  initialTab?: AcademyHubTab
  workspaceSection?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function AcademyHubPage({
  initialAcademySlug,
  initialTab,
  workspaceSection,
  onNavigate,
}: AcademyHubPageProps) {
  const {
    currentTenant,
    userRole: verifiedRole,
    memberships,
    switchTenant,
    refreshTenant,
  } = useTenant()

  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (initialAcademySlug) return initialAcademySlug
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('academy')
      if (q) return q
    }
    return currentTenant?.slug || 'bengaluru-fc-academy'
  })

  useEffect(() => {
    if (currentTenant?.slug && !initialAcademySlug) {
      setSelectedSlug(currentTenant.slug)
    }
  }, [currentTenant?.slug, initialAcademySlug])

  const registeredAcademies = getRegisteredAcademies()
  const activeMemberships = (memberships || []).filter(m => m.status === 'active')

  const fallbackCurated = CURATED_ACADEMIES.find(a => a.slug === selectedSlug)
  const currentAcademy: RegisteredAcademy =
    currentTenant && (currentTenant.slug === selectedSlug || !registeredAcademies.some(a => a.slug === selectedSlug))
      ? {
          id: currentTenant.id,
          slug: currentTenant.slug,
          name: currentTenant.name,
          city: currentTenant.city || 'Bengaluru',
          state: currentTenant.state || '',
          sport: currentTenant.sport || 'Multi-Sport',
          verificationStatus:
            currentTenant.verification_status === 'verified'
              ? 'verified'
              : currentTenant.status === 'active'
                ? 'verified'
                : 'pending_review',
          isCustom: true,
        }
      : registeredAcademies.find(a => a.slug === selectedSlug) ||
        (fallbackCurated
          ? {
              id: fallbackCurated.slug,
              slug: fallbackCurated.slug,
              name: fallbackCurated.name,
              city: fallbackCurated.city,
              state: fallbackCurated.state || '',
              sport: fallbackCurated.sport,
              verificationStatus: 'verified',
              isCustom: false,
            }
          : {
              id: 'custom-academy',
              slug: selectedSlug,
              name: 'National Sports Academy',
              city: 'Bengaluru',
              state: 'Karnataka',
              sport: 'Football',
              verificationStatus: 'pending_review',
              isCustom: true,
            })

  const leads = getAcademyLeads(selectedSlug)
  const batches = getAcademyBatches(selectedSlug)
  const students = getAcademyStudents(selectedSlug)
  const passes = getAcademyTrialPasses(selectedSlug)
  const settings = getAcademySettings(selectedSlug, currentAcademy.name)
  const summary = getAcademySaaSSummary(selectedSlug)
  const staff = getAcademyStaff(selectedSlug)
  const feeTransactions = getAcademyFeeTransactions(selectedSlug)
  const ledgerSummary = getAcademyLedgerSummary(selectedSlug)

  const kits = getAcademyKitDistributions(selectedSlug)
  const equipment = getAcademyEquipment(selectedSlug)
  const safeguardingStaff = getAcademyStaffSafeguarding(selectedSlug)
  const safetyIncidents = getAcademySafetyIncidents(selectedSlug)
  const availableTournaments = getAvailableTournaments()

  const [activeTab, setActiveTab] = useState<AcademyHubTab>(() => {
    const fromSection = resolveAcademyTabForSection(workspaceSection)
    if (fromSection) return fromSection
    if (initialTab) return initialTab
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('tab')
      if (q && (ACADEMY_HUB_TABS as readonly string[]).includes(q)) {
        return q as AcademyHubTab
      }
    }
    return 'leads'
  })

  useEffect(() => {
    const mapped = resolveAcademyTabForSection(workspaceSection)
    if (mapped) {
      setActiveTab(mapped)
    }
  }, [workspaceSection])

  const [userRole, setUserRole] = useState<AcademyUserRole>(() => {
    if (verifiedRole === 'coach' || verifiedRole === 'head_coach') return 'head_coach'
    if (verifiedRole === 'staff' || verifiedRole === 'front_desk') return 'front_desk'
    return 'director'
  })

  useEffect(() => {
    if (verifiedRole) {
      if (verifiedRole === 'coach' || verifiedRole === 'head_coach') {
        setUserRole('head_coach')
      } else if (verifiedRole === 'staff' || verifiedRole === 'front_desk') {
        setUserRole('front_desk')
      } else {
        setUserRole('director')
      }
    }
  }, [verifiedRole])

  const [dpdpSafeMode, setDpdpSafeMode] = useState(true)
  const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(true)
  const [bilingualMode, setBilingualMode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('onboarding')
      if (q === 'true') return true
      return !hasCompletedOnboarding() && registeredAcademies.every(a => !a.isCustom)
    }
    return false
  })

  // Operational Modal / Drawer Triggers
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false)
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isTrialPassModalOpen, setIsTrialPassModalOpen] = useState(false)
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false)
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false)
  const [prefilledTrialLead, setPrefilledTrialLead] = useState<{ studentName: string; parentPhone: string } | null>(null)
  const [activeTrialPassView, setActiveTrialPassView] = useState<AcademyTrialPass | null>(null)
  const [activeUpiQrStudent, setActiveUpiQrStudent] = useState<AcademyStudent | null>(null)
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<AcademyStudent | null>(null)
  const [activeAttendanceBatch, setActiveAttendanceBatch] = useState<AcademyBatch | null>(null)
  const [activeBroadcastBatch, setActiveBroadcastBatch] = useState<AcademyBatch | null>(null)
  const [activeEvaluationStudent, setActiveEvaluationStudent] = useState<AcademyStudent | null>(null)
  const [activeTournamentBatch, setActiveTournamentBatch] = useState<AcademyBatch | null>(null)
  const [cancellationModalStudent, setCancellationModalStudent] = useState<AcademyStudent | null>(null)

  const preLaunchChecklist = getAcademyPreLaunchChecklist({
    hasUpiVpa: Boolean((currentTenant?.upi_vpa || settings.upiVpa) && (currentTenant?.upi_vpa || settings.upiVpa)?.includes('@')),
    hasBatches: batches.length > 0,
    hasStudents: students.length > 0,
    hasTakenAttendance: students.some(s => s.feeStatus === 'paid'),
    hasConfiguredStaff: staff.length > 0,
  })

  const feeReconciliation = reconcileAcademyFeeLedger({
    students,
    transactions: feeTransactions,
  })

  const shareWhatsAppCardUrl = generateWhatsAppShareProfileUrl({
    entityType: 'academy',
    entityName: currentAcademy.name,
    slug: currentAcademy.slug,
    sport: currentAcademy.sport || 'Sports',
    city: currentAcademy.city,
    isVerified: currentAcademy.verificationStatus === 'verified',
  })

  const handleScheduleTrialForLead = (lead: AcademyLead) => {
    setPrefilledTrialLead({ studentName: lead.studentName, parentPhone: lead.parentPhone })
    updateLeadStatus(lead.id, 'trial_scheduled', 'Scheduled trial via Hub')
    setIsTrialPassModalOpen(true)
  }

  const publicAcademyUrl = `/academies/${selectedSlug}`

  return (
    <section className="academy-hub-root" data-testid="academy-hub-page" key={refreshKey}>
      <div className="academy-hub-launch-banner" data-testid="academy-hub-launch-banner">
        <div className="academy-hub-banner-content">
          <div className="academy-hub-banner-icon" aria-hidden="true">
            <SiteIcon name="award" size={26} />
          </div>
          <div>
            <span className="academy-hub-banner-badge">100% Free Grassroots Launch Access</span>
            <h4>Academy Pro Hub (₹3,499/mo Value) Unlocked Without Charges</h4>
            <p>
              KhelGrid is empowering grassroots sports academies across India with full admissions CRM, batch scheduling, automated UPI fee collection, and trial passes completely free during our launch phase.
            </p>
          </div>
        </div>

        <div className="academy-hub-banner-actions">
          <a
            href={publicAcademyUrl}
            className="academy-hub-public-page-btn"
            onClick={e => onNavigate?.(e, publicAcademyUrl)}
          >
            <SiteIcon name="external-link" size={16} /> View Public Academy Page
          </a>
        </div>
      </div>

      <div className="academy-hub-header-row">
        <div className="academy-hub-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <p className="eyebrow" style={{ color: '#059669', fontWeight: 800, margin: 0 }}>
              KHELGRID · B2B ACADEMY HUB
            </p>
            {currentAcademy.verificationStatus === 'verified' ? (
              <span className="academy-verified-pill verified">
                <SiteIcon name="shield-check" size={13} /> KhelGrid Verified Academy
              </span>
            ) : (
              <span className="academy-verified-pill pending">
                <SiteIcon name="alert-triangle" size={13} /> Pending Admin Verification
              </span>
            )}
          </div>
          <h1>{currentAcademy.name}</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            {currentAcademy.city}{currentAcademy.state ? `, ${currentAcademy.state}` : ''} · {currentAcademy.sport || 'Multi-Sport'} Academy Operations
          </p>
        </div>

        <div className="academy-hub-switcher">
          <label htmlFor="academy-hub-select">Switch Academy Management Workspace:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              id="academy-hub-select"
              className="academy-hub-select"
              value={currentTenant?.slug || selectedSlug}
              onChange={async e => {
                const targetVal = e.target.value
                const membership = activeMemberships.find(
                  m => m.tenant_id === targetVal || m.tenant?.slug === targetVal
                )
                if (membership) {
                  await switchTenant(membership.tenant_id)
                  if (membership.tenant?.slug) {
                    setSelectedSlug(membership.tenant.slug)
                  }
                } else {
                  setSelectedSlug(targetVal)
                }
              }}
            >
              {activeMemberships.length > 0 && (
                <optgroup label="Your Authorized Workspaces (PostgreSQL)">
                  {activeMemberships.map(m => (
                    <option key={m.id} value={m.tenant?.slug || m.tenant_id}>
                      {m.tenant?.name || `Academy (${m.tenant_id.slice(0, 8)})`} ({m.tenant?.city || 'India'} · {m.tenant?.sport || 'Sports'}) — Role: {m.role}
                    </option>
                  ))}
                </optgroup>
              )}
              {activeMemberships.length > 0 ? (
                <optgroup label="Registered &amp; Demo Academies">
                  {registeredAcademies.map(a => (
                    <option key={a.slug} value={a.slug}>
                      {a.name} ({a.city} · {a.sport}) {a.isCustom ? '★ Your Academy' : ''}
                    </option>
                  ))}
                </optgroup>
              ) : (
                registeredAcademies.map(a => (
                  <option key={a.slug} value={a.slug}>
                    {a.name} ({a.city} · {a.sport}) {a.isCustom ? '★ Your Academy' : ''}
                  </option>
                ))
              )}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Role:</span>
              {verifiedRole ? (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#065f46',
                  }}
                  title="Role authorized by PostgreSQL tenant_memberships"
                >
                  ✓ {verifiedRole.toUpperCase()}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    color: '#64748b',
                  }}
                  title="Authoritative role is determined by PostgreSQL tenant memberships."
                >
                  VIEWER (AUTHENTICATING)
                </span>
              )}
            </div>

            <button
              type="button"
              className="academy-hub-btn-outline"
              onClick={() => setBilingualMode(v => !v)}
              style={{
                padding: '7px 11px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: bilingualMode ? '#eff6ff' : '#ffffff',
                borderColor: bilingualMode ? '#3b82f6' : '#cbd5e1',
                color: bilingualMode ? '#1d4ed8' : '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Toggle Hindi/English bilingual mode for pitch-side coaching and parent interactions"
            >
              <span>🌐 {bilingualMode ? 'English UI' : 'हिंदी / द्विभाषी'}</span>
            </button>

            <button
              type="button"
              className="academy-hub-btn-outline"
              onClick={() => setDpdpSafeMode(v => !v)}
              style={{
                padding: '7px 11px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: dpdpSafeMode ? '#ecfdf5' : '#ffffff',
                borderColor: dpdpSafeMode ? '#10b981' : '#cbd5e1',
                color: dpdpSafeMode ? '#047857' : '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="DPDP Act 2023 Minor Privacy Safe Mode (masks phone & emails by default)"
            >
              <SiteIcon name="shield-check" size={14} />
              <span>DPDP Minor Shield: {dpdpSafeMode ? 'ON (Masked)' : 'OFF (Admin Visible)'}</span>
            </button>

            <a
              href={generateSupportConciergeWhatsAppUrl({
                academyName: currentAcademy.name,
                directorName: settings.directorName || 'Director',
                queryType: 'onboarding',
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="academy-hub-btn-outline"
              style={{
                padding: '7px 11px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
                color: '#15803d',
                borderColor: '#86efac',
                background: '#f0fdf4',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="KhelGrid Onboarding & Support Concierge on WhatsApp"
            >
              <SiteIcon name="message" size={14} />
              <span>Support Concierge</span>
            </a>

            <button
              type="button"
              className="academy-hub-btn-outline"
              onClick={() => setIsOnboardingModalOpen(true)}
              style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <SiteIcon name="sparkles" size={14} />
              <span>+ Setup New Academy</span>
            </button>

            <a
              href={shareWhatsAppCardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="academy-hub-btn-outline"
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: '#047857',
                borderColor: '#10b981',
                cursor: 'pointer',
              }}
              title="Broadcast your academy profile and trial admissions on WhatsApp"
            >
              <SiteIcon name="share" size={14} />
              <span>Share WhatsApp Card</span>
            </a>
          </div>
        </div>
      </div>

      {currentAcademy.verificationStatus !== 'verified' ? (
        <div className="academy-verification-status-banner pending">
          <div className="academy-verification-status-text">
            <SiteIcon name="alert-triangle" size={20} className="status-banner-icon pending" />
            <div>
              <strong>Verification Tag Pending · Admin Confirmation Required</strong>
              <p>
                Your academy is registered and your internal batch management, students CRM, and UPI fees are fully operational.
                The official public <strong>&quot;KhelGrid Verified&quot;</strong> badge will appear on your public listing once verified by the KhelGrid Editorial Moderation Desk.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="academy-hub-verify-now-btn"
            onClick={() => {
              confirmAndVerifyAcademy(currentAcademy.slug)
              triggerRefresh()
            }}
            title="Moderator / Admin Action: Confirm credentials and grant verified badge"
          >
            <SiteIcon name="shield-check" size={14} />
            <span>Confirm &amp; Grant Verified Tag (Admin)</span>
          </button>
        </div>
      ) : (
        <div className="academy-verification-status-banner verified">
          <div className="academy-verification-status-text">
            <SiteIcon name="shield-check" size={20} className="status-banner-icon verified" />
            <div>
              <strong style={{ color: '#065f46' }}>Official KhelGrid Verified Partner</strong>
              <p style={{ color: '#047857', margin: 0, fontSize: '0.84rem' }}>
                Credentials and facility verified by KhelGrid Admin Desk. Your public listing displays the official verified badge across search and player trial discovery.
              </p>
            </div>
          </div>
          {currentAcademy.isCustom && (
            <button
              type="button"
              className="academy-hub-btn-outline"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              onClick={() => {
                revokeAcademyVerification(currentAcademy.slug)
                triggerRefresh()
              }}
              title="Admin Action: Revert to pending review"
            >
              Revoke Tag (Admin)
            </button>
          )}
        </div>
      )}

      {showOnboardingChecklist && (
        <div
          data-testid="pre-launch-checklist"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: preLaunchChecklist.isReadyForLaunch ? '4px solid #10b981' : '4px solid #f59e0b',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SiteIcon name={preLaunchChecklist.isReadyForLaunch ? 'check-circle' : 'sparkles'} size={18} />
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                Pre-Launch Readiness Checklist ({preLaunchChecklist.steps.filter(s => s.isCompleted).length}/{preLaunchChecklist.steps.length} Complete · {preLaunchChecklist.progressPercentage}%)
              </strong>
              {preLaunchChecklist.isReadyForLaunch ? (
                <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Ready to Launch
                </span>
              ) : (
                <span style={{ fontSize: '12px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Setup In Progress
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowOnboardingChecklist(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', padding: '4px' }}
              title="Dismiss checklist"
            >
              ✕ Dismiss
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {preLaunchChecklist.steps.map(step => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 10px',
                  background: step.isCompleted ? '#f0fdf4' : '#f8fafc',
                  border: step.isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <SiteIcon name={step.isCompleted ? 'check-circle' : 'sparkles'} size={16} />
                <div>
                  <div style={{ fontWeight: 600, color: step.isCompleted ? '#166534' : '#334155' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="academy-hub-kpi-grid">
        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Inbound Leads</span>
            <SiteIcon name="user" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.totalLeads}</div>
          <p className="academy-hub-kpi-sub success">
            <span className="coach-trend-pill positive">+{summary.newLeadsCount} this week</span> {summary.newLeadsCount} new parent enquiries awaiting contact
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Enrolled Students</span>
            <SiteIcon name="badge-check" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.totalStudents}</div>
          <p className="academy-hub-kpi-sub">
            <span className="coach-trend-pill positive">+12.4% MoM</span> Across {summary.totalBatches} active coaching batches
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Fee Collection</span>
            <SiteIcon name="calendar-check" size={18} />
          </div>
          <div className="academy-hub-kpi-value">₹{summary.totalRevenue.toLocaleString('en-IN')}</div>
          <p className="academy-hub-kpi-sub success">
            <span className="coach-trend-pill positive">{summary.collectionRate}% collected</span> {summary.collectionRate}% collected · ₹{summary.pendingRevenue.toLocaleString('en-IN')} pending
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Trial Passes Issued</span>
            <SiteIcon name="check-circle" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.trialPassesCount}</div>
          <p className="academy-hub-kpi-sub">
            <span className="coach-trend-pill neutral">Active Gate Passes</span> Digital passes with verifiable QR
          </p>
        </div>
      </div>

      <nav className="academy-hub-nav-tabs" aria-label="Academy Hub Workspaces">
        {canRoleAccessTab(userRole, 'leads') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>
            <SiteIcon name="mail" size={18} /> Admissions CRM &amp; Leads
            {summary.newLeadsCount > 0 && <span className="academy-hub-tab-badge">+{summary.newLeadsCount}</span>}
          </button>
        )}

        {canRoleAccessTab(userRole, 'batches') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'batches' ? 'active' : ''}`} onClick={() => setActiveTab('batches')}>
            <SiteIcon name="calendar" size={18} /> Batch Schedules ({batches.length})
          </button>
        )}

        {canRoleAccessTab(userRole, 'fees') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
            <SiteIcon name="award" size={18} /> Student Fees &amp; UPI
          </button>
        )}

        {canRoleAccessTab(userRole, 'ledger') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
            <SiteIcon name="wallet" size={18} /> Cash &amp; UPI Ledger
            {ledgerSummary.cashInHand > 0 && <span className="academy-hub-tab-badge" style={{ background: '#f59e0b' }}>₹{ledgerSummary.cashInHand}</span>}
          </button>
        )}

        {canRoleAccessTab(userRole, 'attendance') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            <SiteIcon name="check-circle" size={18} /> Daily Attendance
          </button>
        )}

        {canRoleAccessTab(userRole, 'staff') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
            <SiteIcon name="users" size={18} /> Staff &amp; Coaches ({staff.length})
          </button>
        )}

        {canRoleAccessTab(userRole, 'trial_passes') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'trial_passes' ? 'active' : ''}`} onClick={() => setActiveTab('trial_passes')}>
            <SiteIcon name="shield-check" size={18} /> Trial Passes ({passes.length})
          </button>
        )}

        {canRoleAccessTab(userRole, 'kits') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'kits' ? 'active' : ''}`} onClick={() => setActiveTab('kits')}>
            <SiteIcon name="award" size={18} /> Kit &amp; Gear Locker ({kits.length})
          </button>
        )}

        {canRoleAccessTab(userRole, 'safeguarding') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'safeguarding' ? 'active' : ''}`} onClick={() => setActiveTab('safeguarding')}>
            <SiteIcon name="shield-check" size={18} /> POCSO &amp; Safeguarding ({safeguardingStaff.length})
          </button>
        )}

        {canRoleAccessTab(userRole, 'settings') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <SiteIcon name="share" size={18} /> WhatsApp &amp; UPI Setup
          </button>
        )}

        {canRoleAccessTab(userRole, 'audit_logs') && (
          <button type="button" className={`academy-hub-tab-btn ${activeTab === 'audit_logs' ? 'active' : ''}`} onClick={() => setActiveTab('audit_logs')}>
            <SiteIcon name="shield-check" size={18} /> {bilingualMode ? 'सुरक्षा ऑडिट लॉग (Audit Log)' : 'Security Audit Log'}
          </button>
        )}
      </nav>

      {(activeTab === 'leads' || activeTab === 'trial_passes') && (
        <AcademyAdmissionsAndPassesPanel
          activeTab={activeTab}
          currentTenant={currentTenant}
          currentAcademy={currentAcademy}
          leads={leads}
          batches={batches}
          passes={passes}
          activeTrialPassView={activeTrialPassView}
          onSelectTrialPassView={setActiveTrialPassView}
          onOpenAddLead={() => setIsAddLeadModalOpen(true)}
          onScheduleTrialForLead={handleScheduleTrialForLead}
          onOpenTrialPassModal={() => setIsTrialPassModalOpen(true)}
          onNavigate={onNavigate}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'batches' || activeTab === 'attendance') && (
        <AcademyBatchesAndAttendancePanel
          activeTab={activeTab}
          selectedSlug={selectedSlug}
          currentTenant={currentTenant}
          currentAcademy={currentAcademy}
          batches={batches}
          students={students}
          dpdpSafeMode={dpdpSafeMode}
          onOpenAddBatch={() => setIsAddBatchModalOpen(true)}
          onOpenAttendanceSheet={setActiveAttendanceBatch}
          onOpenBroadcast={setActiveBroadcastBatch}
          onOpenTournamentSquad={setActiveTournamentBatch}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'fees' || activeTab === 'ledger') && (
        <AcademyFeesAndLedgerPanel
          activeTab={activeTab}
          currentAcademy={currentAcademy}
          settings={settings}
          students={students}
          feeTransactions={feeTransactions}
          ledgerSummary={ledgerSummary}
          feeReconciliation={feeReconciliation}
          dpdpSafeMode={dpdpSafeMode}
          onOpenImportCsv={() => setIsImportCsvModalOpen(true)}
          onOpenAddStudent={() => setIsAddStudentModalOpen(true)}
          onOpenRecordPayment={() => setIsRecordPaymentModalOpen(true)}
          onSelectUpiQrStudent={setActiveUpiQrStudent}
          onSelectReceiptStudent={setActiveReceiptStudent}
          onSelectEvaluationStudent={setActiveEvaluationStudent}
          onSelectCancellationStudent={setCancellationModalStudent}
          onNavigate={onNavigate}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'staff' ||
        activeTab === 'kits' ||
        activeTab === 'safeguarding' ||
        activeTab === 'settings' ||
        activeTab === 'audit_logs') && (
        <AcademyComplianceAndSettingsPanel
          activeTab={activeTab}
          selectedSlug={selectedSlug}
          currentTenant={currentTenant}
          currentAcademy={currentAcademy}
          verifiedRole={verifiedRole}
          userRole={userRole}
          bilingualMode={bilingualMode}
          batches={batches}
          students={students}
          leads={leads}
          passes={passes}
          staff={staff}
          feeTransactions={feeTransactions}
          settings={settings}
          kits={kits}
          equipment={equipment}
          safeguardingStaff={safeguardingStaff}
          safetyIncidents={safetyIncidents}
          onOpenAddStaff={() => setIsAddStaffModalOpen(true)}
          onRefreshTenant={refreshTenant}
          onRefresh={triggerRefresh}
        />
      )}

      <AcademyOnboardingModal
        open={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onAcademyCreated={newAcad => {
          setSelectedSlug(newAcad.slug)
          triggerRefresh()
        }}
        onNavigate={onNavigate}
      />

      <AcademyEnrollmentModals
        selectedSlug={selectedSlug}
        currentTenant={currentTenant}
        currentAcademy={currentAcademy}
        batches={batches}
        isAddLeadModalOpen={isAddLeadModalOpen}
        isAddBatchModalOpen={isAddBatchModalOpen}
        isAddStudentModalOpen={isAddStudentModalOpen}
        isTrialPassModalOpen={isTrialPassModalOpen}
        isImportCsvModalOpen={isImportCsvModalOpen}
        prefilledTrialLead={prefilledTrialLead}
        onCloseAddLead={() => setIsAddLeadModalOpen(false)}
        onCloseAddBatch={() => setIsAddBatchModalOpen(false)}
        onCloseAddStudent={() => setIsAddStudentModalOpen(false)}
        onCloseTrialPass={() => setIsTrialPassModalOpen(false)}
        onCloseImportCsv={() => setIsImportCsvModalOpen(false)}
        onTrialPassIssued={setActiveTrialPassView}
        onRefresh={triggerRefresh}
      />

      <AcademyOpsAndBillingModals
        selectedSlug={selectedSlug}
        currentTenant={currentTenant}
        currentAcademy={currentAcademy}
        settings={settings}
        batches={batches}
        students={students}
        availableTournaments={availableTournaments}
        activeTournamentBatch={activeTournamentBatch}
        activeUpiQrStudent={activeUpiQrStudent}
        activeReceiptStudent={activeReceiptStudent}
        activeAttendanceBatch={activeAttendanceBatch}
        activeBroadcastBatch={activeBroadcastBatch}
        activeEvaluationStudent={activeEvaluationStudent}
        cancellationModalStudent={cancellationModalStudent}
        isAddStaffModalOpen={isAddStaffModalOpen}
        isRecordPaymentModalOpen={isRecordPaymentModalOpen}
        onCloseTournamentModal={() => setActiveTournamentBatch(null)}
        onCloseUpiQr={() => setActiveUpiQrStudent(null)}
        onCloseReceipt={() => setActiveReceiptStudent(null)}
        onCloseAttendanceSheet={() => setActiveAttendanceBatch(null)}
        onCloseBroadcast={() => setActiveBroadcastBatch(null)}
        onCloseEvaluation={() => setActiveEvaluationStudent(null)}
        onCloseCancellation={() => setCancellationModalStudent(null)}
        onCloseAddStaff={() => setIsAddStaffModalOpen(false)}
        onCloseRecordPayment={() => setIsRecordPaymentModalOpen(false)}
        onRefresh={triggerRefresh}
      />
    </section>
  )
}
