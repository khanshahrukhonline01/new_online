import { useState, type FormEvent, type MouseEvent } from 'react'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { KpiStrip, type KpiItem } from '../../../../shared/components/ui/KpiStrip'
import { SiteIcon, type SiteIconName } from '../../../../shared/components/SiteIcon'
import type { AcademyRoleCapabilities, AcademyWorkspaceSectionId } from '../../academyHubTypes'
import {
  calculateAcademyProfileCompleteness,
  saveAcademyProfile,
  submitAcademyVerificationRequest,
  type AcademyAffiliationItem,
  type AcademyFeePlanItem,
  type AcademyOverviewPayload,
  type AcademyProfileRecord,
  type AcademyVerificationStatus,
} from '../../academyWorkspaceClient'

export interface AcademyOverviewAndProfilePanelProps {
  mode: 'overview' | 'profile'
  tenantId: string
  tenantName: string
  capabilities: AcademyRoleCapabilities
  profile: AcademyProfileRecord | null
  overview: AcademyOverviewPayload | null
  selectedBranchId: string | null
  loading: boolean
  error: string | null
  onSelectSection: (section: AcademyWorkspaceSectionId) => void
  onRefresh: () => Promise<void>
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
  onFeedback: (fb: { type: 'success' | 'error'; message: string }) => void
}

const VERIF_LABEL_MAP: Record<AcademyVerificationStatus, { label: string; className: string }> = {
  verified: { label: 'KhelGrid Verified Academy', className: 'is-verified' },
  pending_review: { label: 'Pending Moderation Review', className: 'is-pending' },
  more_info_needed: { label: 'More Info Requested', className: 'is-pending' },
  rejected: { label: 'Verification Rejected', className: 'is-danger' },
  unverified: { label: 'Unverified Profile', className: 'is-neutral' },
}

export function AcademyOverviewAndProfilePanel({
  mode,
  tenantId,
  tenantName,
  capabilities,
  profile,
  overview,
  loading,
  error,
  onSelectSection,
  onRefresh,
  onFeedback,
}: AcademyOverviewAndProfilePanelProps) {
  const [savingProfile, setSavingProfile] = useState(false)
  const [submittingVerif, setSubmittingVerif] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Editable Profile Form State initialized from PostgreSQL row
  const [displayName, setDisplayName] = useState(profile?.displayName || tenantName)
  const [tagline, setTagline] = useState(profile?.tagline || '')
  const [description, setDescription] = useState(profile?.description || '')
  const [sportsText, setSportsText] = useState((profile?.sportsOffered || []).join(', '))
  const [ageGroupsText, setAgeGroupsText] = useState((profile?.ageGroups || []).join(', '))
  const [facilitiesText, setFacilitiesText] = useState((profile?.facilitiesSummary || []).join(', '))
  const [foundedYear, setFoundedYear] = useState(profile?.foundedYear ? String(profile.foundedYear) : '')
  const [operatingHours, setOperatingHours] = useState(profile?.operatingHours || '')
  const [trainingMethodology, setTrainingMethodology] = useState(profile?.trainingMethodology || '')
  const [city, setCity] = useState(profile?.city || '')
  const [stateName, setStateName] = useState(profile?.state || '')
  const [contactPhone, setContactPhone] = useState(profile?.contactPhone || '')
  const [contactEmail, setContactEmail] = useState(profile?.contactEmail || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl || '')
  const [isPubliclyListed, setIsPubliclyListed] = useState(Boolean(profile?.isPubliclyListed))
  const [seoTitle, setSeoTitle] = useState(profile?.seoTitle || '')
  const [seoDescription, setSeoDescription] = useState(profile?.seoDescription || '')
  const [affiliations, setAffiliations] = useState<AcademyAffiliationItem[]>(profile?.affiliations || [])
  const [feeStructure, setFeeStructure] = useState<AcademyFeePlanItem[]>(profile?.feeStructure || [])

  // Verification submission form
  const [docType, setDocType] = useState('affiliation_certificate')
  const [proofDetails, setProofDetails] = useState('')
  const [docUrl, setDocUrl] = useState('')

  if (mode === 'overview') {
    const stats = overview?.stats
    const completeness = calculateAcademyProfileCompleteness(profile)

    const kpis: KpiItem[] = [
      {
        id: 'athletes',
        label: 'Active / Total Athletes',
        value: stats ? `${stats.activeAthletes} / ${stats.totalAthletes}` : '0 / 0',
        sub: 'Enrolled roster',
        trend: 'up',
      },
      {
        id: 'coaches',
        label: 'Coaches & Branches',
        value: stats ? `${stats.coachesCount} / ${stats.branchesCount}` : '0 / 0',
        sub: 'Active coaching staff & sites',
      },
      {
        id: 'sessions',
        label: 'Sessions (Next 7d)',
        value: stats ? String(stats.upcomingSessions) : '0',
        sub: stats ? `${stats.activeBatches} active batches` : '0 active batches',
      },
      {
        id: 'attendance',
        label: '30-Day Attendance',
        value: stats?.attendanceRatePct !== null && stats?.attendanceRatePct !== undefined
          ? `${stats.attendanceRatePct}%`
          : '—',
        sub: stats ? `${stats.attendanceEventsCount} roll-calls logged` : 'No roll-calls yet',
      },
      {
        id: 'admissions',
        label: 'Open Applications',
        value: stats ? String(stats.pendingApplications) : '0',
        sub: stats ? `${stats.enrolledApplications} enrolled overall` : 'Genuine database count',
        trend: stats && stats.pendingApplications > 0 ? 'up' : 'neutral',
      },
    ]

    if (capabilities.canViewFinance && stats?.canViewFinance) {
      kpis.push({
        id: 'finance',
        label: 'Recorded Fee Receipts',
        value: `₹${(stats.totalFeeCollectedInr ?? 0).toLocaleString('en-IN')}`,
        sub: `${stats.feeDueOrOverdueCount ?? 0} trainees due/overdue (0% fee)`,
        trend: 'up',
      })
    }

    const rawActions: { label: string; icon: SiteIconName; target: AcademyWorkspaceSectionId; allowed: boolean }[] = [
      { label: 'Add Athlete', icon: 'plus', target: 'athletes', allowed: capabilities.canManageAthletes },
      { label: 'Create Batch / Session', icon: 'calendar', target: 'training', allowed: capabilities.canManageTraining },
      { label: 'Mark Attendance', icon: 'check-circle', target: 'attendance', allowed: capabilities.canMarkAttendance },
      { label: 'Review Admissions', icon: 'target', target: 'admissions', allowed: capabilities.canManageAdmissions },
      { label: 'Add Branch', icon: 'map-pin', target: 'branches', allowed: capabilities.canManageBranches },
      { label: 'Invite Staff', icon: 'shield-check', target: 'staff', allowed: capabilities.canManageStaff },
      { label: 'Export Reports', icon: 'download', target: 'reports', allowed: capabilities.allowedSections.includes('reports') },
    ]
    const quickActions = rawActions.filter(a => a.allowed)

    return (
      <div className="kg-acad-stack" data-testid="academy-overview-panel">
        {error && (
          <div className="kg-acad-alert is-danger" role="alert">
            <div>
              <strong>Could not sync academy metrics.</strong> {error}
            </div>
            <button type="button" className="kg-acad-btn-outline" onClick={() => void onRefresh()}>
              Retry
            </button>
          </div>
        )}

        <KpiStrip items={kpis} />

        {/* Pending Operational Actions + Profile Readiness */}
        <div className="kg-acad-grid-2">
          <section className="kg-acad-card" aria-labelledby="acad-quick-actions-h">
            <div className="kg-acad-card-head">
              <h2 id="acad-quick-actions-h">Authorized Quick Actions</h2>
              <span className="kg-acad-pill is-info">{capabilities.label}</span>
            </div>
            {quickActions.length === 0 ? (
              <p className="kg-acad-muted">Your role has read-only access across permitted modules.</p>
            ) : (
              <div className="kg-acad-quick-grid">
                {quickActions.map(act => (
                  <button
                    key={act.label}
                    type="button"
                    className="kg-acad-quick-btn"
                    onClick={() => onSelectSection(act.target)}
                  >
                    <SiteIcon name={act.icon} size={16} />
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="kg-acad-card" aria-labelledby="acad-readiness-h">
            <div className="kg-acad-card-head">
              <h2 id="acad-readiness-h">Profile &amp; Moderation Status</h2>
              <span className={`kg-acad-verif-pill ${VERIF_LABEL_MAP[profile?.verificationStatus || 'unverified'].className}`}>
                {VERIF_LABEL_MAP[profile?.verificationStatus || 'unverified'].label}
              </span>
            </div>
            <div className="kg-acad-progress-row">
              <div className="kg-acad-progress-track">
                <div className="kg-acad-progress-fill" style={{ width: `${completeness.percent}%` }} />
              </div>
              <strong>{completeness.percent}% complete</strong>
            </div>
            {completeness.missing.length > 0 && (
              <p className="kg-acad-muted" style={{ marginTop: '0.5rem' }}>
                Missing for full directory readiness: {completeness.missing.join(', ')}.
              </p>
            )}
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              {capabilities.canManageProfile && (
                <button type="button" className="kg-acad-btn-primary" onClick={() => onSelectSection('profile')}>
                  Manage Public Profile
                </button>
              )}
              {capabilities.canViewFinance && stats?.canViewFinance && (stats.feeDueOrOverdueCount ?? 0) > 0 && (
                <button type="button" className="kg-acad-btn-outline" onClick={() => onSelectSection('fees')}>
                  Review {stats.feeDueOrOverdueCount} Pending Dues
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Live Data Panels: Recent Applications & Upcoming Sessions */}
        <div className="kg-acad-grid-2">
          <section className="kg-acad-card" aria-labelledby="acad-recent-apps-h">
            <div className="kg-acad-card-head">
              <h2 id="acad-recent-apps-h">Recent Trial &amp; Admission Enquiries</h2>
              <button type="button" className="kg-acad-link-btn" onClick={() => onSelectSection('admissions')}>
                View Pipeline
              </button>
            </div>
            {loading ? (
              <p className="kg-acad-muted">Loading database records…</p>
            ) : !overview || overview.recentApplications.length === 0 ? (
              <EmptyState
                title="No enquiries recorded yet"
                description="Incoming enquiries from parents and athletes appear here automatically."
              />
            ) : (
              <ul className="kg-acad-list">
                {overview.recentApplications.map(app => (
                  <li key={app.id} className="kg-acad-list-item">
                    <div>
                      <strong>{app.student_name}</strong>
                      <div className="kg-acad-muted">
                        {app.sport} · Parent: {app.parent_name} · Token <code>{app.enquiry_token}</code>
                      </div>
                    </div>
                    <span className="kg-acad-pill is-info">{app.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kg-acad-card" aria-labelledby="acad-upcoming-sess-h">
            <div className="kg-acad-card-head">
              <h2 id="acad-upcoming-sess-h">Upcoming Training Sessions</h2>
              <button type="button" className="kg-acad-link-btn" onClick={() => onSelectSection('training')}>
                Open Calendar
              </button>
            </div>
            {loading ? (
              <p className="kg-acad-muted">Loading schedule…</p>
            ) : !overview || overview.upcomingSessions.length === 0 ? (
              <EmptyState
                title="No upcoming sessions scheduled"
                description="Schedule single or recurring training sessions in Batches & Schedule."
              />
            ) : (
              <ul className="kg-acad-list">
                {overview.upcomingSessions.map(sess => (
                  <li key={sess.id} className="kg-acad-list-item">
                    <div>
                      <strong>{sess.title}</strong>
                      <div className="kg-acad-muted">
                        {sess.session_date} · {sess.start_time.slice(0, 5)}–{sess.end_time.slice(0, 5)} · {sess.sport}
                      </div>
                    </div>
                    <span className="kg-acad-pill is-emerald">{sess.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Branch Breakdown */}
        <section className="kg-acad-card" aria-labelledby="acad-branch-load-h">
          <div className="kg-acad-card-head">
            <h2 id="acad-branch-load-h">Branch Activity Breakdown</h2>
            {capabilities.canManageBranches && (
              <button type="button" className="kg-acad-link-btn" onClick={() => onSelectSection('branches')}>
                Manage Branches
              </button>
            )}
          </div>
          {!overview || overview.branchBreakdown.length === 0 ? (
            <EmptyState
              title="No active branches configured"
              description="Add your primary training campus or regional centres in Branches."
            />
          ) : (
            <div className="kg-acad-table-wrap">
              <table className="kg-acad-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>City</th>
                    <th>Active Athletes</th>
                    <th>Active Batches</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.branchBreakdown.map(br => (
                    <tr key={br.unit_id}>
                      <td><strong>{br.branch_name}</strong></td>
                      <td>{br.city || '—'}</td>
                      <td>{br.athletes_count}</td>
                      <td>{br.batches_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
  }

  // =========================================================================
  // MODE: PROFILE EDITOR + PUBLIC PREVIEW + MODERATION SUBMISSION
  // =========================================================================
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !capabilities.canManageProfile) return
    setSavingProfile(true)
    const parseCsvList = (txt: string) =>
      txt
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

    const res = await saveAcademyProfile(profile.id, tenantId, {
      displayName,
      tagline,
      description,
      sportsOffered: parseCsvList(sportsText),
      ageGroups: parseCsvList(ageGroupsText),
      facilitiesSummary: parseCsvList(facilitiesText),
      foundedYear: foundedYear ? Number(foundedYear) : null,
      operatingHours,
      trainingMethodology,
      city,
      state: stateName,
      contactPhone,
      contactEmail,
      websiteUrl: websiteUrl || null,
      isPubliclyListed,
      seoTitle,
      seoDescription,
      affiliations,
      feeStructure,
    })
    setSavingProfile(false)
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) await onRefresh()
  }

  const handleSubmitVerification = async (e: FormEvent) => {
    e.preventDefault()
    if (!capabilities.canSubmitVerification) return
    setSubmittingVerif(true)
    const res = await submitAcademyVerificationRequest(tenantId, docType, proofDetails, docUrl)
    setSubmittingVerif(false)
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) {
      setProofDetails('')
      await onRefresh()
    }
  }

  const verifMeta = VERIF_LABEL_MAP[profile?.verificationStatus || 'unverified']

  return (
    <div className="kg-acad-stack" data-testid="academy-profile-panel">
      <div className="kg-acad-section-head">
        <div>
          <h2>Academy Profile &amp; Public Presence</h2>
          <p className="kg-acad-muted">
            Manage structured details, sports offered, training methodology, and KhelGrid moderation verification.
          </p>
        </div>
        <div className="kg-acad-btn-row">
          <span className={`kg-acad-verif-pill ${verifMeta.className}`}>{verifMeta.label}</span>
          <button type="button" className="kg-acad-btn-outline" onClick={() => setPreviewOpen(p => !p)}>
            <SiteIcon name="eye" size={15} /> {previewOpen ? 'Hide Public Preview' : 'Preview Public Listing'}
          </button>
        </div>
      </div>

      {previewOpen && (
        <section className="kg-acad-card is-highlight" aria-label="Public Profile Preview">
          <div className="kg-acad-card-head">
            <h3>Public Listing Preview (Live Draft)</h3>
            <span className="kg-acad-pill is-info">{isPubliclyListed ? 'Visible when moderated' : 'Draft / Hidden'}</span>
          </div>
          <h4 style={{ margin: '0.25rem 0' }}>{displayName || tenantName}</h4>
          {tagline && <p className="kg-acad-muted" style={{ margin: '0 0 0.5rem' }}>{tagline}</p>}
          <p style={{ margin: '0 0 0.65rem' }}>{description || 'No description added yet.'}</p>
          <div className="kg-acad-meta-tags">
            <span>City: {city || 'Unset'}</span>
            <span>Sports: {sportsText || 'None'}</span>
            <span>Ages: {ageGroupsText || 'All'}</span>
            <span>Hours: {operatingHours || 'Flexible'}</span>
          </div>
        </section>
      )}

      <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSaveProfile(e)}>
        <h3>Core Profile Details</h3>
        <div className="kg-acad-form-grid">
          <label className="kg-acad-field">
            <span>Academy Name *</span>
            <input
              type="text"
              required
              disabled={!capabilities.canManageProfile}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </label>
          <label className="kg-acad-field">
            <span>Tagline</span>
            <input
              type="text"
              disabled={!capabilities.canManageProfile}
              placeholder="Grassroots & High-Performance Football Training"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
            />
          </label>
          <label className="kg-acad-field">
            <span>Sports Offered (comma separated)</span>
            <input
              type="text"
              disabled={!capabilities.canManageProfile}
              placeholder="Cricket, Football, Athletics"
              value={sportsText}
              onChange={e => setSportsText(e.target.value)}
            />
          </label>
          <label className="kg-acad-field">
            <span>Age Groups Served (comma separated)</span>
            <input
              type="text"
              disabled={!capabilities.canManageProfile}
              placeholder="U-11, U-14, U-17, Senior"
              value={ageGroupsText}
              onChange={e => setAgeGroupsText(e.target.value)}
            />
          </label>
          <label className="kg-acad-field">
            <span>City *</span>
            <input type="text" required disabled={!capabilities.canManageProfile} value={city} onChange={e => setCity(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>State</span>
            <input type="text" disabled={!capabilities.canManageProfile} value={stateName} onChange={e => setStateName(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Contact Phone</span>
            <input type="tel" disabled={!capabilities.canManageProfile} value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Contact Email</span>
            <input type="email" disabled={!capabilities.canManageProfile} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Founded Year</span>
            <input type="number" min={1850} max={2100} disabled={!capabilities.canManageProfile} value={foundedYear} onChange={e => setFoundedYear(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Operating Hours</span>
            <input type="text" disabled={!capabilities.canManageProfile} placeholder="06:00 AM – 08:30 PM" value={operatingHours} onChange={e => setOperatingHours(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Official Website (https://)</span>
            <input type="url" disabled={!capabilities.canManageProfile} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Facilities Summary (comma separated)</span>
            <input type="text" disabled={!capabilities.canManageProfile} placeholder="FIFA Turf, Floodlights, Rehab Gym" value={facilitiesText} onChange={e => setFacilitiesText(e.target.value)} />
          </label>
        </div>

        <label className="kg-acad-field" style={{ marginTop: '0.75rem' }}>
          <span>About the Academy</span>
          <textarea rows={3} disabled={!capabilities.canManageProfile} value={description} onChange={e => setDescription(e.target.value)} />
        </label>

        <label className="kg-acad-field" style={{ marginTop: '0.75rem' }}>
          <span>Coaching Methodology &amp; Curriculum</span>
          <textarea rows={3} disabled={!capabilities.canManageProfile} value={trainingMethodology} onChange={e => setTrainingMethodology(e.target.value)} />
        </label>

        {/* Fee Structure Transparency (display-only, no online collection) */}
        <div className="kg-acad-subblock">
          <div className="kg-acad-card-head">
            <h4>Public Fee Schedule Info (Display Only · Zero Online Payment)</h4>
            {capabilities.canManageProfile && (
              <button
                type="button"
                className="kg-acad-btn-outline"
                onClick={() =>
                  setFeeStructure(prev => [...prev, { programName: '', billingCycle: 'monthly', amountInr: 2000, notes: '' }])
                }
              >
                + Add Program Fee
              </button>
            )}
          </div>
          {feeStructure.map((item, idx) => (
            <div key={idx} className="kg-acad-inline-row">
              <input
                type="text"
                placeholder="Program name"
                disabled={!capabilities.canManageProfile}
                value={item.programName}
                onChange={e => setFeeStructure(prev => prev.map((x, i) => (i === idx ? { ...x, programName: e.target.value } : x)))}
              />
              <select
                disabled={!capabilities.canManageProfile}
                value={item.billingCycle}
                onChange={e => setFeeStructure(prev => prev.map((x, i) => (i === idx ? { ...x, billingCycle: e.target.value as AcademyFeePlanItem['billingCycle'] } : x)))}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="per_session">Per Session</option>
              </select>
              <input
                type="number"
                min={0}
                disabled={!capabilities.canManageProfile}
                value={item.amountInr}
                onChange={e => setFeeStructure(prev => prev.map((x, i) => (i === idx ? { ...x, amountInr: Number(e.target.value) } : x)))}
              />
            </div>
          ))}
        </div>

        {/* Affiliations Builder */}
        <div className="kg-acad-subblock">
          <div className="kg-acad-card-head">
            <h4>Federation &amp; Association Affiliations</h4>
            {capabilities.canManageProfile && (
              <button
                type="button"
                className="kg-acad-btn-outline"
                onClick={() =>
                  setAffiliations(prev => [...prev, { body: '', affiliationNumber: '', validUntil: '' }])
                }
              >
                + Add Affiliation
              </button>
            )}
          </div>
          {affiliations.map((aff, idx) => (
            <div key={idx} className="kg-acad-inline-row">
              <input
                type="text"
                placeholder="State FA / BCCI District / BAI"
                disabled={!capabilities.canManageProfile}
                value={aff.body}
                onChange={e => setAffiliations(prev => prev.map((x, i) => (i === idx ? { ...x, body: e.target.value } : x)))}
              />
              <input
                type="text"
                placeholder="Affiliation ID"
                disabled={!capabilities.canManageProfile}
                value={aff.affiliationNumber}
                onChange={e => setAffiliations(prev => prev.map((x, i) => (i === idx ? { ...x, affiliationNumber: e.target.value } : x)))}
              />
              <input
                type="text"
                placeholder="Valid until (e.g. 2027)"
                disabled={!capabilities.canManageProfile}
                value={aff.validUntil}
                onChange={e => setAffiliations(prev => prev.map((x, i) => (i === idx ? { ...x, validUntil: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>

        <div className="kg-acad-form-grid" style={{ marginTop: '0.75rem' }}>
          <label className="kg-acad-field">
            <span>SEO Title</span>
            <input type="text" disabled={!capabilities.canManageProfile} value={seoTitle} onChange={e => setSeoTitle(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>SEO Meta Description</span>
            <input type="text" disabled={!capabilities.canManageProfile} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} />
          </label>
        </div>

        <label className="kg-acad-checkbox" style={{ marginTop: '0.75rem' }}>
          <input
            type="checkbox"
            disabled={!capabilities.canManageProfile}
            checked={isPubliclyListed}
            onChange={e => setIsPubliclyListed(e.target.checked)}
          />
          <span>Request public directory visibility (subject to moderator verification approval)</span>
        </label>

        {capabilities.canManageProfile && (
          <div className="kg-acad-btn-row" style={{ marginTop: '1rem' }}>
            <button type="submit" className="kg-acad-btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving Profile…' : 'Save Academy Profile'}
            </button>
          </div>
        )}
      </form>

      {/* Moderation-gated Verification Request */}
      <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSubmitVerification(e)}>
        <div className="kg-acad-card-head">
          <div>
            <h3>Official Verification &amp; Accreditation Submission</h3>
            <p className="kg-acad-muted">
              Verification badges are granted exclusively by KhelGrid Trust &amp; Moderation reviewers. Direct client overrides are blocked at database level.
            </p>
          </div>
        </div>
        {profile?.moderationNote && (
          <div className="kg-acad-alert is-info">
            <strong>Moderator Note:</strong> {profile.moderationNote}
          </div>
        )}
        <div className="kg-acad-form-grid">
          <label className="kg-acad-field">
            <span>Document Type</span>
            <select disabled={!capabilities.canSubmitVerification} value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="affiliation_certificate">Sports Federation Affiliation Certificate</option>
              <option value="ground_lease">Ground Lease / Facility Ownership</option>
              <option value="municipal_trade_license">Society / Trust / Trade Registration</option>
              <option value="geotagged_photos">Geotagged Facility &amp; Coaching Proof</option>
            </select>
          </label>
          <label className="kg-acad-field">
            <span>Document Link (optional https://)</span>
            <input
              type="url"
              disabled={!capabilities.canSubmitVerification}
              placeholder="https://..."
              value={docUrl}
              onChange={e => setDocUrl(e.target.value)}
            />
          </label>
        </div>
        <label className="kg-acad-field" style={{ marginTop: '0.75rem' }}>
          <span>Proof &amp; Accreditation Details *</span>
          <textarea
            rows={2}
            required
            disabled={!capabilities.canSubmitVerification}
            placeholder="Include affiliation ID, campus verification reference, and primary coach registration number..."
            value={proofDetails}
            onChange={e => setProofDetails(e.target.value)}
          />
        </label>
        {capabilities.canSubmitVerification && (
          <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
            <button type="submit" className="kg-acad-btn-primary" disabled={submittingVerif}>
              {submittingVerif ? 'Submitting Request…' : 'Submit for KhelGrid Verification'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
