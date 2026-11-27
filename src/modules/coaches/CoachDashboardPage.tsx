import { useEffect, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import { PartnerVerificationStatusTracker } from '../partner/components/PartnerVerificationStatusTracker'
import {
  generateWhatsAppShareProfileUrl,
  type DigitalFeeReceipt,
} from '../../shared/saas/saasSharedOperations'
import {
  confirmAndVerifyCoach,
  getCoachBatches,
  getCoachEndorsements,
  getCoachInquiries,
  getCoachSaaSSummary,
  getCoachTrainees,
  getCoachTrainingPlans,
  getCurrentCoach,
  getRegisteredCoaches,
  getTraineeCombines,
  revokeCoachVerification,
  type RegisteredCoach,
} from './coachSaaSClient'
import { getKheloIndiaAssessments } from './kheloIndiaBattery'
import { resolveCoachTabForSection, type CoachHubTab } from './coachDashboardTypes'
import { CoachRosterAndInquiriesPanel } from './components/CoachRosterAndInquiriesPanel'
import { CoachBatchesAndAttendancePanel } from './components/CoachBatchesAndAttendancePanel'
import { CoachRevenueAndCredentialsPanel } from './components/CoachRevenueAndCredentialsPanel'
import { CoachPerformanceAndSaiPanel } from './components/CoachPerformanceAndSaiPanel'
import { CoachActionModals } from './components/CoachActionModals'
import './CoachDashboardPage.css'

export interface CoachDashboardPageProps {
  initialCoachSlug?: string
  workspaceSection?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function CoachDashboardPage({
  initialCoachSlug,
  workspaceSection,
  onNavigate,
}: CoachDashboardPageProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (initialCoachSlug) return initialCoachSlug
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('coach')
      if (q) return q
    }
    return 'zaheer-farooq-coach'
  })

  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const registeredCoaches = getRegisteredCoaches()
  const currentCoach: RegisteredCoach = getCurrentCoach(selectedSlug)

  const [activeTab, setActiveTab] = useState<CoachHubTab>(() => resolveCoachTabForSection(workspaceSection) ?? 'trainees')

  useEffect(() => {
    const mapped = resolveCoachTabForSection(workspaceSection)
    if (mapped) {
      setActiveTab(mapped)
    }
  }, [workspaceSection])

  // Data
  const trainees = getCoachTrainees(selectedSlug)
  const batches = getCoachBatches(selectedSlug)
  const inquiries = getCoachInquiries(selectedSlug)
  const summary = getCoachSaaSSummary(selectedSlug)
  const combines = getTraineeCombines(selectedSlug)
  const trainingPlans = getCoachTrainingPlans(selectedSlug)
  const endorsements = getCoachEndorsements(selectedSlug)
  const kheloIndiaReports = getKheloIndiaAssessments(selectedSlug)

  // Modal / Drawer open flags
  const [isAddTraineeModalOpen, setIsAddTraineeModalOpen] = useState(false)
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false)
  const [isRegisterCoachModalOpen, setIsRegisterCoachModalOpen] = useState(false)
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<DigitalFeeReceipt | null>(null)
  const [isAddCombineModalOpen, setIsAddCombineModalOpen] = useState(false)
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false)
  const [isAwardEndorsementModalOpen, setIsAwardEndorsementModalOpen] = useState(false)

  const shareWhatsAppCardUrl = generateWhatsAppShareProfileUrl({
    entityType: 'coach',
    entityName: currentCoach.name,
    slug: currentCoach.slug,
    sport: currentCoach.sport || 'Sports',
    city: currentCoach.city,
    isVerified: currentCoach.verificationStatus === 'verified',
  })

  return (
    <div className="coach-hub-root content-page" key={refreshKey}>
      {onNavigate && !workspaceSection && (
        <div style={{ marginBottom: '0.75rem' }}>
          <a
            href="#/coaches"
            className="coach-back-link"
            onClick={e => onNavigate(e, '/coaches')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              color: '#059669',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <SiteIcon name="arrow-left" size={14} />
            <span>Back to Coaches Directory</span>
          </a>
        </div>
      )}

      <div className="coach-hub-header-row">
        <div className="coach-hub-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <p className="eyebrow" style={{ color: '#059669', fontWeight: 800, margin: 0 }}>
              KHELGRID · COACH OPERATIONS HUB
            </p>
            {currentCoach.verificationStatus === 'verified' ? (
              <span className="coach-verified-pill verified">
                <SiteIcon name="shield-check" size={13} /> KhelGrid Verified Coach
              </span>
            ) : (
              <span className="coach-verified-pill pending">
                <SiteIcon name="alert-triangle" size={13} /> Pending Credentials Review
              </span>
            )}
          </div>
          <h1>{currentCoach.name}</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            {currentCoach.sport} Specialist · {currentCoach.city}, {currentCoach.state} · {currentCoach.certification}
          </p>
        </div>

        <div className="coach-hub-switcher">
          <label htmlFor="coach-hub-select">Switch Coach Workspace:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              id="coach-hub-select"
              className="coach-hub-select"
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
            >
              {registeredCoaches.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.sport} · {c.city}) {c.isCustom ? '★ Your Profile' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="coach-hub-btn-outline"
              onClick={() => setIsRegisterCoachModalOpen(true)}
              style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <SiteIcon name="plus" size={14} />
              <span>+ Register Coach</span>
            </button>
            <a
              href="#/coaches"
              className="coach-hub-btn-outline"
              onClick={e => onNavigate ? onNavigate(e, '/coaches') : undefined}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
              title="Preview how parents view your verified profile on the public directory"
            >
              <SiteIcon name="external-link" size={14} />
              <span>Public Profile</span>
            </a>
            <a
              href={shareWhatsAppCardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="coach-hub-btn-outline"
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: '#047857',
                borderColor: '#10b981',
              }}
              title="Broadcast your coaching profile and open trials on WhatsApp"
            >
              <SiteIcon name="share" size={14} />
              <span>Share WhatsApp Card</span>
            </a>
          </div>
        </div>
      </div>

      {(() => {
        const authUser = getStoredAuthUser()
        const isPlatformModerator = authUser?.role === 'admin' || authUser?.role === 'moderator'

        if (currentCoach.verificationStatus !== 'verified') {
          return (
            <>
              {!workspaceSection && (
                <PartnerVerificationStatusTracker
                  persona="coach"
                  authUser={authUser}
                  entitySlug={currentCoach.slug}
                  entityName={currentCoach.name}
                  localVerificationStatus={currentCoach.verificationStatus}
                />
              )}
              {isPlatformModerator && (
                <div className="coach-verification-status-banner pending">
                  <div className="coach-verification-status-text">
                    <SiteIcon name="alert-triangle" size={20} className="status-banner-icon pending" />
                    <div>
                      <strong>Credentials Verification Pending · Moderator Override Available</strong>
                      <p>
                        Internal trainee roster and UPI payments are active. Grant the official <strong>&quot;KhelGrid Verified Coach&quot;</strong> tag once credentials are confirmed.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="coach-hub-verify-now-btn"
                    onClick={() => {
                      confirmAndVerifyCoach(currentCoach.slug)
                      triggerRefresh()
                    }}
                    title="Admin Action: Confirm NIS/Federation credentials and grant verified badge"
                  >
                    <SiteIcon name="shield-check" size={14} />
                    <span>Confirm &amp; Grant Verified Tag (Admin)</span>
                  </button>
                </div>
              )}
            </>
          )
        }

        return (
          <div className="coach-verification-status-banner verified">
            <div className="coach-verification-status-text">
              <SiteIcon name="shield-check" size={20} className="status-banner-icon verified" />
              <div>
                <strong style={{ color: '#065f46' }}>Official KhelGrid Verified Coach</strong>
                <p style={{ color: '#047857', margin: 0, fontSize: '0.84rem' }}>
                  Credentials verified by KhelGrid Admin Desk. Your profile displays the official verified badge across student search and parent trial inquiries.
                </p>
              </div>
            </div>
            {currentCoach.isCustom && isPlatformModerator && (
              <button
                type="button"
                className="coach-hub-btn-outline"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => {
                  revokeCoachVerification(currentCoach.slug)
                  triggerRefresh()
                }}
                title="Admin Action: Revert to pending review"
              >
                Revoke Tag (Admin)
              </button>
            )}
          </div>
        )
      })()}

      <div className="coach-metrics-grid">
        <div className="coach-stat-card">
          <div className="coach-stat-header">
            <div className="coach-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <SiteIcon name="users" size={18} />
            </div>
            <span className="coach-stat-value">{summary.totalTrainees}</span>
          </div>
          <div className="coach-stat-body">
            <span className="coach-stat-title">Active Trainees</span>
            <p className="coach-stat-sub">
              <span className="coach-trend-pill positive">+14.2%</span>
              <span style={{ color: '#64748b' }}>than last month</span>
            </p>
          </div>
        </div>

        <div className="coach-stat-card">
          <div className="coach-stat-header">
            <div className="coach-stat-icon-wrap" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <SiteIcon name="sparkles" size={18} />
            </div>
            <span className="coach-stat-value">₹{summary.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
          <div className="coach-stat-body">
            <span className="coach-stat-title">Collected This Month</span>
            <p className="coach-stat-sub">
              <span className="coach-trend-pill positive">{summary.collectionRate}% collected</span>
              <span style={{ color: '#64748b' }}>₹{summary.pendingRevenue.toLocaleString('en-IN')} due</span>
            </p>
          </div>
        </div>

        <div className="coach-stat-card">
          <div className="coach-stat-header">
            <div className="coach-stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <SiteIcon name="mail" size={18} />
            </div>
            <span className="coach-stat-value">{summary.newInquiriesCount}</span>
          </div>
          <div className="coach-stat-body">
            <span className="coach-stat-title">New Inquiries</span>
            <p className="coach-stat-sub">
              <span className="coach-trend-pill positive">+4 this week</span>
              <span style={{ color: '#64748b' }}>Parent trials</span>
            </p>
          </div>
        </div>

        <div className="coach-stat-card">
          <div className="coach-stat-header">
            <div className="coach-stat-icon-wrap" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <SiteIcon name="calendar" size={18} />
            </div>
            <span className="coach-stat-value">{summary.totalBatches}</span>
          </div>
          <div className="coach-stat-body">
            <span className="coach-stat-title">Active Batches</span>
            <p className="coach-stat-sub">
              <span className="coach-trend-pill neutral">Morning &amp; Evening</span>
              <span style={{ color: '#64748b' }}>Training camps</span>
            </p>
          </div>
        </div>
      </div>

      <div className="coach-tabs-nav" role="tablist">
        {(
          [
            { id: 'trainees', icon: 'users', label: `Trainee Roster (${trainees.length})` },
            { id: 'inquiries', icon: 'mail', label: `Inbound Inquiries (${inquiries.length})` },
            { id: 'batches', icon: 'calendar', label: `Batches & Timings (${batches.length})` },
            { id: 'attendance', icon: 'check-circle', label: 'Daily Attendance' },
            { id: 'earnings', icon: 'sparkles', label: 'Total Earnings & UPI QR' },
            { id: 'credentials', icon: 'award', label: 'Credentials & Evidence' },
            { id: 'combines', icon: 'award', label: `Combines & Benchmarks (${combines.length})` },
            { id: 'plans', icon: 'calendar', label: `Weekly Drills & Homework (${trainingPlans.length})` },
            { id: 'endorsements', icon: 'shield-check', label: `Verified Endorsements (${endorsements.length})` },
            { id: 'khelo_india', icon: 'trophy', label: `🇮🇳 Khelo India & SAI Battery (${kheloIndiaReports.length})` },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`coach-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <SiteIcon name={tab.icon} size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {(activeTab === 'trainees' || activeTab === 'inquiries') && (
        <CoachRosterAndInquiriesPanel
          activeTab={activeTab}
          currentCoach={currentCoach}
          trainees={trainees}
          batches={batches}
          inquiries={inquiries}
          onOpenImportCsv={() => setIsImportCsvModalOpen(true)}
          onOpenAddTrainee={() => setIsAddTraineeModalOpen(true)}
          onSelectReceipt={setActiveReceipt}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'batches' || activeTab === 'attendance') && (
        <CoachBatchesAndAttendancePanel
          activeTab={activeTab}
          selectedSlug={selectedSlug}
          currentCoach={currentCoach}
          batches={batches}
          trainees={trainees}
          onOpenAddBatch={() => setIsAddBatchModalOpen(true)}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'earnings' || activeTab === 'credentials' || activeTab === 'endorsements') && (
        <CoachRevenueAndCredentialsPanel
          activeTab={activeTab}
          currentCoach={currentCoach}
          batches={batches}
          endorsements={endorsements}
          summary={summary}
          onOpenAwardEndorsement={() => setIsAwardEndorsementModalOpen(true)}
          onRefresh={triggerRefresh}
        />
      )}

      {(activeTab === 'combines' || activeTab === 'plans' || activeTab === 'khelo_india') && (
        <CoachPerformanceAndSaiPanel
          activeTab={activeTab}
          selectedSlug={selectedSlug}
          currentCoach={currentCoach}
          combines={combines}
          trainingPlans={trainingPlans}
          kheloIndiaReports={kheloIndiaReports}
          onOpenAddCombine={() => setIsAddCombineModalOpen(true)}
          onOpenAddPlan={() => setIsAddPlanModalOpen(true)}
          onRefresh={triggerRefresh}
        />
      )}

      <CoachActionModals
        selectedSlug={selectedSlug}
        currentCoach={currentCoach}
        batches={batches}
        trainees={trainees}
        isAddTraineeModalOpen={isAddTraineeModalOpen}
        isAddBatchModalOpen={isAddBatchModalOpen}
        isRegisterCoachModalOpen={isRegisterCoachModalOpen}
        isImportCsvModalOpen={isImportCsvModalOpen}
        isAddCombineModalOpen={isAddCombineModalOpen}
        isAddPlanModalOpen={isAddPlanModalOpen}
        isAwardEndorsementModalOpen={isAwardEndorsementModalOpen}
        activeReceipt={activeReceipt}
        onCloseAddTrainee={() => setIsAddTraineeModalOpen(false)}
        onCloseAddBatch={() => setIsAddBatchModalOpen(false)}
        onCloseRegisterCoach={() => setIsRegisterCoachModalOpen(false)}
        onCloseImportCsv={() => setIsImportCsvModalOpen(false)}
        onCloseAddCombine={() => setIsAddCombineModalOpen(false)}
        onCloseAddPlan={() => setIsAddPlanModalOpen(false)}
        onCloseAwardEndorsement={() => setIsAwardEndorsementModalOpen(false)}
        onCloseReceipt={() => setActiveReceipt(null)}
        onSelectCoachSlug={setSelectedSlug}
        onRefresh={triggerRefresh}
      />
    </div>
  )
}
