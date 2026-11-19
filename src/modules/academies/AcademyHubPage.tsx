import { useState, useId, type MouseEvent, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import { CURATED_ACADEMIES } from '../../shared/data/curatedEntitiesData'
import {
  getAcademyLeads,
  updateLeadStatus,
  addAcademyLead,
  getAcademyBatches,
  saveAcademyBatch,
  deleteAcademyBatch,
  getAcademyStudents,
  saveAcademyStudent,
  recordStudentPayment,
  getAcademyTrialPasses,
  createTrialPass,
  getAcademySettings,
  saveAcademySettings,
  getAcademySaaSSummary,
  generateWhatsAppParentContactUrl,
  generateWhatsAppFeeReminderUrl,
  generateUpiPayLink,
  type AcademyLead,
  type AcademyStudent,
  type AcademyTrialPass,
} from './academySaaSClient'
import './AcademyHubPage.css'

export interface AcademyHubPageProps {
  initialAcademySlug?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function AcademyHubPage({
  initialAcademySlug,
  onNavigate,
}: AcademyHubPageProps) {
  // Academy selection state
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (initialAcademySlug) return initialAcademySlug
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('academy')
      if (q) return q
    }
    return 'bengaluru-fc-academy'
  })

  // Selected Academy details
  const currentAcademy = CURATED_ACADEMIES.find(a => a.slug === selectedSlug) || {
    id: 'custom-academy',
    slug: selectedSlug,
    name: 'National Sports Academy',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Football',
  }

  // Active Tab
  const [activeTab, setActiveTab] = useState<'leads' | 'batches' | 'fees' | 'trial_passes' | 'settings'>('leads')

  // Data Refresh State
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  // Derived Data
  const leads = getAcademyLeads(selectedSlug)
  const batches = getAcademyBatches(selectedSlug)
  const students = getAcademyStudents(selectedSlug)
  const passes = getAcademyTrialPasses(selectedSlug)
  const settings = getAcademySettings(selectedSlug, currentAcademy.name)
  const summary = getAcademySaaSSummary(selectedSlug)

  // Filter State
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all')
  const [leadSearch, setLeadSearch] = useState('')

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false)
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isTrialPassModalOpen, setIsTrialPassModalOpen] = useState(false)
  const [activeUpiQrStudent, setActiveUpiQrStudent] = useState<AcademyStudent | null>(null)
  const [activeTrialPassView, setActiveTrialPassView] = useState<AcademyTrialPass | null>(null)

  // Add Lead Form State
  const [newParentName, setNewParentName] = useState('')
  const [newParentPhone, setNewParentPhone] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentAge, setNewStudentAge] = useState<number | string>(12)
  const [newSport, setNewSport] = useState(currentAcademy.sport || 'Football')
  const [newBatchName, setNewBatchName] = useState('')
  const [newRequestType, setNewRequestType] = useState<AcademyLead['requestType']>('free_trial')
  const [newLeadNotes, setNewLeadNotes] = useState('')

  // Add Batch Form State
  const [batchNameInput, setBatchNameInput] = useState('')
  const [batchSportInput, setBatchSportInput] = useState(currentAcademy.sport || 'Football')
  const [batchDaysInput, setBatchDaysInput] = useState('Mon, Wed, Fri')
  const [batchTimingsInput, setBatchTimingsInput] = useState('06:00 AM – 08:00 AM')
  const [batchCoachInput, setBatchCoachInput] = useState('')
  const [batchAgeGroupInput, setBatchAgeGroupInput] = useState('U-14 (10–14 yrs)')
  const [batchMonthlyFeeInput, setBatchMonthlyFeeInput] = useState<number>(2000)
  const [batchCapacityInput, setBatchCapacityInput] = useState<number>(25)

  // Add Student Form State
  const [studentNameInput, setStudentNameInput] = useState('')
  const [studentParentNameInput, setStudentParentNameInput] = useState('')
  const [studentParentPhoneInput, setStudentParentPhoneInput] = useState('')
  const [studentBatchIdInput, setStudentBatchIdInput] = useState(batches[0]?.id || '')
  const [studentFeeInput, setStudentFeeInput] = useState<number>(batches[0]?.monthlyFee || 2000)

  // Generate Trial Pass Form State
  const [passStudentName, setPassStudentName] = useState('')
  const [passParentPhone, setPassParentPhone] = useState('')
  const [passDate, setPassDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [passTime, setPassTime] = useState('07:00 AM')
  const [passVenue, setPassVenue] = useState(currentAcademy.name + ' Ground')

  // Director Settings Form State
  const [directorNameInput, setDirectorNameInput] = useState(settings.directorName)
  const [directorWhatsAppInput, setDirectorWhatsAppInput] = useState(settings.directorWhatsApp)
  const [upiVpaInput, setUpiVpaInput] = useState(settings.upiVpa)
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false)

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) return false
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase()
      const match =
        lead.studentName.toLowerCase().includes(q) ||
        lead.parentName.toLowerCase().includes(q) ||
        lead.parentPhone.includes(q) ||
        lead.enquiryToken.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // Handlers
  const handleAddLeadSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newParentName || !newParentPhone || !newStudentName) return

    addAcademyLead({
      academySlug: selectedSlug,
      parentName: newParentName.trim(),
      parentPhone: newParentPhone.trim(),
      studentName: newStudentName.trim(),
      studentAge: newStudentAge,
      sport: newSport,
      batchType: 'weekday',
      batchName: newBatchName.trim() || 'General Intake',
      requestType: newRequestType,
      status: 'new',
      notes: newLeadNotes.trim() || 'Direct walk-in lead added via Academy Hub.',
    })

    setIsAddLeadModalOpen(false)
    setNewParentName('')
    setNewParentPhone('')
    setNewStudentName('')
    setNewLeadNotes('')
    triggerRefresh()
  }

  const handleAddBatchSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!batchNameInput) return

    saveAcademyBatch({
      academySlug: selectedSlug,
      batchName: batchNameInput.trim(),
      sport: batchSportInput,
      days: batchDaysInput.trim(),
      timings: batchTimingsInput.trim(),
      coachName: batchCoachInput.trim() || 'Academy Coaching Staff',
      ageGroup: batchAgeGroupInput.trim(),
      monthlyFee: Number(batchMonthlyFeeInput) || 1500,
      maxCapacity: Number(batchCapacityInput) || 20,
      isActive: true,
    })

    setIsAddBatchModalOpen(false)
    setBatchNameInput('')
    setBatchCoachInput('')
    triggerRefresh()
  }

  const handleAddStudentSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!studentNameInput || !studentParentPhoneInput) return

    const selectedBatch = batches.find(b => b.id === studentBatchIdInput) || batches[0]
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)

    saveAcademyStudent({
      academySlug: selectedSlug,
      studentName: studentNameInput.trim(),
      parentName: studentParentNameInput.trim() || 'Parent',
      parentPhone: studentParentPhoneInput.trim(),
      batchId: selectedBatch?.id || 'batch-default',
      batchName: selectedBatch?.batchName || 'General Squad',
      sport: selectedBatch?.sport || currentAcademy.sport || 'Sports',
      monthlyFee: Number(studentFeeInput) || 2000,
      feeStatus: 'paid',
      lastPaymentDate: now.toISOString().slice(0, 10),
      nextDueDate: nextMonth.toISOString().slice(0, 10),
    })

    setIsAddStudentModalOpen(false)
    setStudentNameInput('')
    setStudentParentNameInput('')
    setStudentParentPhoneInput('')
    triggerRefresh()
  }

  const handleGenerateTrialPassSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!passStudentName || !passParentPhone) return

    const pass = createTrialPass({
      academySlug: selectedSlug,
      academyName: currentAcademy.name,
      studentName: passStudentName.trim(),
      parentPhone: passParentPhone.trim(),
      sport: currentAcademy.sport || 'Sports',
      trialDate: passDate,
      reportingTime: passTime,
      venueAddress: passVenue.trim(),
    })

    setIsTrialPassModalOpen(false)
    setActiveTrialPassView(pass)
    setPassStudentName('')
    setPassParentPhone('')
    triggerRefresh()
  }

  const handleSaveSettingsSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveAcademySettings({
      academySlug: selectedSlug,
      academyName: currentAcademy.name,
      directorName: directorNameInput.trim(),
      directorWhatsApp: directorWhatsAppInput.trim(),
      upiVpa: upiVpaInput.trim(),
      autoWhatsAppRoutingEnabled: true,
      isProUnlocked: true,
    })
    setSettingsSavedNotice(true)
    setTimeout(() => setSettingsSavedNotice(false), 3000)
    triggerRefresh()
  }

  // Pre-open Trial Pass generator for a specific lead
  const handleScheduleTrialForLead = (lead: AcademyLead) => {
    setPassStudentName(lead.studentName)
    setPassParentPhone(lead.parentPhone)
    updateLeadStatus(lead.id, 'trial_scheduled', 'Scheduled trial via Hub')
    setIsTrialPassModalOpen(true)
  }

  // Generate UPI QR SVG
  const getUpiQrSvg = (student: AcademyStudent) => {
    const link = generateUpiPayLink({
      vpa: settings.upiVpa || 'academy@upi',
      name: currentAcademy.name,
      amount: student.monthlyFee,
      note: `Fee ${student.studentName}`,
    })
    return generateQrSvgString(link, { size: 180, color: '#047857', bgColor: '#ffffff' })
  }

  const publicAcademyUrl = `/academies/${selectedSlug}`

  const addLeadParentNameId = useId()
  const addLeadParentPhoneId = useId()
  const addLeadStudentNameId = useId()
  const addLeadStudentAgeId = useId()
  const addLeadSportId = useId()
  const addLeadBatchNameId = useId()
  const addLeadRequestTypeId = useId()
  const addLeadNotesId = useId()

  const addBatchNameId = useId()
  const addBatchSportId = useId()
  const addBatchDaysId = useId()
  const addBatchTimingsId = useId()
  const addBatchCoachId = useId()
  const addBatchAgeGroupId = useId()
  const addBatchMonthlyFeeId = useId()
  const addBatchCapacityId = useId()

  const addStudentNameId = useId()
  const addStudentParentNameId = useId()
  const addStudentParentPhoneId = useId()
  const addStudentBatchId = useId()
  const addStudentFeeId = useId()

  const trialPassStudentNameId = useId()
  const trialPassParentPhoneId = useId()
  const trialPassDateId = useId()
  const trialPassTimeId = useId()
  const trialPassVenueId = useId()

  const settingsDirectorNameId = useId()
  const settingsDirectorWhatsAppId = useId()
  const settingsUpiVpaId = useId()

  return (
    <section className="academy-hub-root" data-testid="academy-hub-page" key={refreshKey}>
      {/* 100% Free Grassroots Launch Access Banner */}
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

      {/* Top Header & Academy Switcher */}
      <div className="academy-hub-header-row">
        <div className="academy-hub-title">
          <p className="eyebrow" style={{ color: '#059669', fontWeight: 800 }}>KHELGRID · B2B ACADEMY HUB</p>
          <h1>{currentAcademy.name}</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            {currentAcademy.city}{currentAcademy.state ? `, ${currentAcademy.state}` : ''} · {currentAcademy.sport || 'Multi-Sport'} Academy Operations
          </p>
        </div>

        <div className="academy-hub-switcher">
          <label htmlFor="academy-hub-select">Switch Academy Management Workspace:</label>
          <select
            id="academy-hub-select"
            className="academy-hub-select"
            value={selectedSlug}
            onChange={e => setSelectedSlug(e.target.value)}
          >
            {CURATED_ACADEMIES.map(a => (
              <option key={a.slug} value={a.slug}>
                {a.name} ({a.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="academy-hub-kpi-grid">
        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Inbound Leads</span>
            <SiteIcon name="user" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.totalLeads}</div>
          <p className="academy-hub-kpi-sub success">
            {summary.newLeadsCount} new parent enquiries awaiting contact
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Enrolled Students</span>
            <SiteIcon name="badge-check" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.totalStudents}</div>
          <p className="academy-hub-kpi-sub">
            Across {summary.totalBatches} active coaching batches
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Fee Collection</span>
            <SiteIcon name="calendar-check" size={18} />
          </div>
          <div className="academy-hub-kpi-value">₹{summary.totalRevenue.toLocaleString('en-IN')}</div>
          <p className="academy-hub-kpi-sub success">
            {summary.collectionRate}% collected · ₹{summary.pendingRevenue.toLocaleString('en-IN')} pending
          </p>
        </div>

        <div className="academy-hub-kpi-card">
          <div className="academy-hub-kpi-header">
            <span>Trial Passes Issued</span>
            <SiteIcon name="check-circle" size={18} />
          </div>
          <div className="academy-hub-kpi-value">{summary.trialPassesCount}</div>
          <p className="academy-hub-kpi-sub">Digital passes with verifiable QR</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="academy-hub-nav-tabs" aria-label="Academy Hub Workspaces">
        <button
          type="button"
          className={`academy-hub-tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          <SiteIcon name="mail" size={18} /> Admissions CRM &amp; Leads
          {summary.newLeadsCount > 0 && <span className="academy-hub-tab-badge">+{summary.newLeadsCount}</span>}
        </button>

        <button
          type="button"
          className={`academy-hub-tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <SiteIcon name="calendar" size={18} /> Batch Schedules ({batches.length})
        </button>

        <button
          type="button"
          className={`academy-hub-tab-btn ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          <SiteIcon name="award" size={18} /> Student Fees &amp; UPI
        </button>

        <button
          type="button"
          className={`academy-hub-tab-btn ${activeTab === 'trial_passes' ? 'active' : ''}`}
          onClick={() => setActiveTab('trial_passes')}
        >
          <SiteIcon name="shield-check" size={18} /> Trial Passes ({passes.length})
        </button>

        <button
          type="button"
          className={`academy-hub-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SiteIcon name="share" size={18} /> WhatsApp &amp; UPI Setup
        </button>
      </nav>

      {/* TAB 1: Admissions CRM & Inbound Parent Leads */}
      {activeTab === 'leads' && (
        <section aria-labelledby="leads-section-heading">
          <div className="academy-hub-section-header">
            <div>
              <h2 id="leads-section-heading" className="academy-hub-section-title">
                Admissions Enquiry CRM
              </h2>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                Incoming enquiries submitted by parents on KhelGrid. Direct 1-click WhatsApp lead routing enabled.
              </p>
            </div>

            <div className="academy-hub-actions-cluster">
              <input
                type="search"
                className="admin-search-input"
                style={{ padding: '0.55rem 0.85rem', width: '220px' }}
                placeholder="Search candidate or phone…"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
              />

              <select
                className="academy-hub-filter-select"
                value={leadStatusFilter}
                onChange={e => setLeadStatusFilter(e.target.value)}
              >
                <option value="all">All Lead Statuses</option>
                <option value="new">New Enquiries</option>
                <option value="contacted">Contacted</option>
                <option value="trial_scheduled">Trial Scheduled</option>
                <option value="enrolled">Enrolled</option>
                <option value="archived">Archived</option>
              </select>

              <button
                type="button"
                className="academy-hub-primary-btn"
                onClick={() => setIsAddLeadModalOpen(true)}
              >
                <SiteIcon name="plus" size={16} /> Add Walk-in Lead
              </button>
            </div>
          </div>

          <div className="academy-hub-table-wrapper">
            <table className="academy-hub-table">
              <thead>
                <tr>
                  <th>Candidate &amp; Sport</th>
                  <th>Parent Contact</th>
                  <th>Program / Batch</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>1-Click Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No admission enquiries match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <strong>{lead.studentName}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Age: {lead.studentAge} · {lead.sport}
                        </div>
                      </td>
                      <td>
                        <div>{lead.parentName}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#047857', fontWeight: 700 }}>
                          {lead.parentPhone}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{lead.batchName || lead.batchType}</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Token: {lead.enquiryToken}
                        </div>
                      </td>
                      <td>
                        <select
                          className={`lead-status-pill ${lead.status}`}
                          style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                          value={lead.status}
                          onChange={e => {
                            updateLeadStatus(lead.id, e.target.value as AcademyLead['status'])
                            triggerRefresh()
                          }}
                        >
                          <option value="new">🟢 New</option>
                          <option value="contacted">🔵 Contacted</option>
                          <option value="trial_scheduled">🟡 Trial Scheduled</option>
                          <option value="enrolled">✅ Enrolled</option>
                          <option value="archived">⚪ Archived</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {new Date(lead.submittedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <a
                            href={generateWhatsAppParentContactUrl(lead, currentAcademy.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="crm-action-btn whatsapp"
                            title="Chat with Parent on WhatsApp"
                            aria-label={`Chat with ${lead.parentName} on WhatsApp`}
                          >
                            <span aria-hidden="true">💬</span>
                          </a>

                          <a
                            href={`tel:${lead.parentPhone.replace(/\D/g, '')}`}
                            className="crm-action-btn"
                            title="Call Parent Direct"
                            aria-label={`Call ${lead.parentName}`}
                          >
                            <SiteIcon name="phone" size={15} />
                          </a>

                          <button
                            type="button"
                            className="crm-action-btn"
                            title="Issue Trial Pass"
                            aria-label={`Issue trial pass for ${lead.studentName}`}
                            onClick={() => handleScheduleTrialForLead(lead)}
                          >
                            <SiteIcon name="award" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: Batch Schedules & Coach Allocation */}
      {activeTab === 'batches' && (
        <section aria-labelledby="batches-section-heading">
          <div className="academy-hub-section-header">
            <div>
              <h2 id="batches-section-heading" className="academy-hub-section-title">
                Coaching Batches &amp; Timings
              </h2>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                Manage morning, evening, and weekend batches. Published batches appear live on your KhelGrid public listing.
              </p>
            </div>

            <button
              type="button"
              className="academy-hub-primary-btn"
              onClick={() => setIsAddBatchModalOpen(true)}
            >
              <SiteIcon name="plus" size={16} /> Create Coaching Batch
            </button>
          </div>

          <div className="academy-batches-grid">
            {batches.map(batch => (
              <div className="academy-batch-card" key={batch.id}>
                <div className="academy-batch-header">
                  <h3 className="academy-batch-title">{batch.batchName}</h3>
                  <span className="academy-batch-sport-pill">{batch.sport}</span>
                </div>

                <div className="academy-batch-meta-list">
                  <div className="academy-batch-meta-item">
                    <SiteIcon name="calendar" size={16} />
                    <span><strong>Days:</strong> {batch.days}</span>
                  </div>
                  <div className="academy-batch-meta-item">
                    <SiteIcon name="calendar-check" size={16} />
                    <span><strong>Timings:</strong> {batch.timings}</span>
                  </div>
                  <div className="academy-batch-meta-item">
                    <SiteIcon name="award" size={16} />
                    <span><strong>Coach:</strong> {batch.coachName}</span>
                  </div>
                  <div className="academy-batch-meta-item">
                    <SiteIcon name="user" size={16} />
                    <span><strong>Age Group:</strong> {batch.ageGroup}</span>
                  </div>
                </div>

                <div className="academy-batch-footer">
                  <div>
                    <span className="academy-batch-fee">₹{batch.monthlyFee.toLocaleString('en-IN')}</span>
                    <small style={{ color: '#64748b' }}> / month</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="academy-batch-capacity">
                      {batch.enrolledCount} / {batch.maxCapacity} slots filled
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', marginTop: '0.25rem' }}
                      onClick={() => {
                        deleteAcademyBatch(batch.id)
                        triggerRefresh()
                      }}
                    >
                      Delete Batch
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: Student Fees & Automated UPI Collection */}
      {activeTab === 'fees' && (
        <section aria-labelledby="fees-section-heading">
          <div className="academy-hub-section-header">
            <div>
              <h2 id="fees-section-heading" className="academy-hub-section-title">
                Active Student Roster &amp; UPI Fee Tracker
              </h2>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                Track fee dues, generate instant UPI scan codes, and dispatch 1-click WhatsApp payment reminders with 0% platform deductions.
              </p>
            </div>

            <button
              type="button"
              className="academy-hub-primary-btn"
              onClick={() => setIsAddStudentModalOpen(true)}
            >
              <SiteIcon name="plus" size={16} /> Enroll New Student
            </button>
          </div>

          <div className="academy-hub-table-wrapper">
            <table className="academy-hub-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Batch / Squad</th>
                  <th>Parent Contact</th>
                  <th>Monthly Fee</th>
                  <th>Fee Status</th>
                  <th>Next Due</th>
                  <th>1-Click Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td><strong>{student.studentName}</strong></td>
                    <td>{student.batchName}</td>
                    <td>
                      <div>{student.parentName}</div>
                      <small style={{ fontFamily: 'monospace', color: '#047857' }}>{student.parentPhone}</small>
                    </td>
                    <td><strong>₹{student.monthlyFee.toLocaleString('en-IN')}</strong></td>
                    <td>
                      {student.feeStatus === 'paid' && (
                        <span className="lead-status-pill enrolled">Paid</span>
                      )}
                      {student.feeStatus === 'due_soon' && (
                        <span className="lead-status-pill trial_scheduled">Due Soon</span>
                      )}
                      {student.feeStatus === 'overdue' && (
                        <span className="lead-status-pill" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                          Overdue
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{student.nextDueDate}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <a
                          href={generateWhatsAppFeeReminderUrl(student, currentAcademy.name, settings.upiVpa)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="crm-action-btn whatsapp"
                          title="Send WhatsApp Fee Reminder"
                          aria-label={`Send WhatsApp fee reminder to ${student.parentName}`}
                        >
                          <span aria-hidden="true">💬</span>
                        </a>

                        <button
                          type="button"
                          className="crm-action-btn"
                          title="Show UPI Payment QR"
                          aria-label={`Show UPI QR code for ${student.studentName}`}
                          onClick={() => setActiveUpiQrStudent(student)}
                        >
                          <SiteIcon name="arrow-up-right" size={15} />
                        </button>

                        {student.feeStatus !== 'paid' && (
                          <button
                            type="button"
                            className="crm-action-btn"
                            title="Mark as Paid (Cash / UPI)"
                            aria-label={`Mark fee paid for ${student.studentName}`}
                            onClick={() => {
                              recordStudentPayment(student.id, student.monthlyFee, 'cash')
                              triggerRefresh()
                            }}
                          >
                            <SiteIcon name="check" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: Selection Trial Pass Generator */}
      {activeTab === 'trial_passes' && (
        <section aria-labelledby="passes-section-heading">
          <div className="academy-hub-section-header">
            <div>
              <h2 id="passes-section-heading" className="academy-hub-section-title">
                Selection Trial &amp; Entry Passes
              </h2>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                Issue verified digital trial passes to athletes with verifiable QR codes for on-ground trials and scouting combines.
              </p>
            </div>

            <button
              type="button"
              className="academy-hub-primary-btn"
              onClick={() => setIsTrialPassModalOpen(true)}
            >
              <SiteIcon name="plus" size={16} /> Issue Trial Entry Pass
            </button>
          </div>

          {activeTrialPassView && (
            <div className="trial-pass-card" data-testid="trial-pass-view">
              <div className="trial-pass-header">
                <div>
                  <span className="academy-hub-banner-badge">OFFICIAL TRIAL ENTRY PASS</span>
                  <h3 style={{ margin: '0.35rem 0', fontSize: '1.4rem', color: '#065f46' }}>
                    {activeTrialPassView.academyName}
                  </h3>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Trial Assessment Pass for {activeTrialPassView.sport}
                  </span>
                </div>
                <div className="trial-pass-token">{activeTrialPassView.passNumber}</div>
              </div>

              <div className="trial-pass-body">
                <div className="trial-pass-info-grid">
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Candidate</small>
                    <p style={{ margin: '0.2rem 0', fontWeight: 800, fontSize: '1.05rem' }}>{activeTrialPassView.studentName}</p>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Parent Contact</small>
                    <p style={{ margin: '0.2rem 0', fontWeight: 700 }}>{activeTrialPassView.parentPhone}</p>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trial Date &amp; Time</small>
                    <p style={{ margin: '0.2rem 0', fontWeight: 700, color: '#047857' }}>
                      {activeTrialPassView.trialDate} at {activeTrialPassView.reportingTime}
                    </p>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ground / Venue</small>
                    <p style={{ margin: '0.2rem 0' }}>{activeTrialPassView.venueAddress}</p>
                  </div>
                </div>

                <div className="trial-pass-qr-box">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(activeTrialPassView.qrCodePayload, {
                        size: 110,
                        color: '#047857',
                        bgColor: '#ffffff',
                      }),
                    }}
                  />
                  <small>Scan to Verify</small>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <a
                  href={`https://wa.me/91${activeTrialPassView.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `*Trial Entry Pass — ${activeTrialPassView.academyName}*\n\nCandidate: *${activeTrialPassView.studentName}*\nPass No: *${activeTrialPassView.passNumber}*\nDate: *${activeTrialPassView.trialDate}* (${activeTrialPassView.reportingTime})\nVenue: ${activeTrialPassView.venueAddress}\n\nShow this pass at the ground entrance. Best of luck!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academy-hub-primary-btn"
                  style={{ background: '#25d366' }}
                >
                  <span aria-hidden="true">💬</span> Send Pass on WhatsApp
                </a>
                <button
                  type="button"
                  className="academy-hub-public-page-btn"
                  onClick={() => window.print()}
                >
                  <SiteIcon name="arrow-up-right" size={16} /> Print Pass
                </button>
              </div>
            </div>
          )}

          <div className="academy-hub-table-wrapper" style={{ marginTop: '1.5rem' }}>
            <table className="academy-hub-table">
              <thead>
                <tr>
                  <th>Pass Number</th>
                  <th>Candidate</th>
                  <th>Parent Phone</th>
                  <th>Trial Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {passes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No trial passes issued yet. Click "Issue Trial Entry Pass" above to generate one.
                    </td>
                  </tr>
                ) : (
                  passes.map(p => (
                    <tr key={p.id}>
                      <td><span className="trial-pass-token" style={{ fontSize: '0.82rem' }}>{p.passNumber}</span></td>
                      <td><strong>{p.studentName}</strong></td>
                      <td>{p.parentPhone}</td>
                      <td>{p.trialDate} ({p.reportingTime})</td>
                      <td><span className="lead-status-pill enrolled">Valid</span></td>
                      <td>
                        <button
                          type="button"
                          className="academy-hub-public-page-btn"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveTrialPassView(p)}
                        >
                          View Pass
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: WhatsApp & UPI Setup */}
      {activeTab === 'settings' && (
        <section aria-labelledby="settings-section-heading" style={{ maxWidth: '650px' }}>
          <h2 id="settings-section-heading" className="academy-hub-section-title">
            Director WhatsApp &amp; UPI Routing Setup
          </h2>
          <p style={{ color: '#64748b', margin: '0.35rem 0 1.5rem' }}>
            Configure your official WhatsApp mobile number so new parent enquiries are instantly transmitted to your phone.
          </p>

          <form onSubmit={handleSaveSettingsSubmit} className="academy-hub-form">
            <label htmlFor={settingsDirectorNameId}>
              Director / Head Coach Name
              <input
                id={settingsDirectorNameId}
                required
                value={directorNameInput}
                onChange={e => setDirectorNameInput(e.target.value)}
                placeholder="e.g. Coach Ramesh Kumar"
              />
            </label>

            <label htmlFor={settingsDirectorWhatsAppId}>
              Official WhatsApp Mobile Number (for Lead Routing)
              <input
                id={settingsDirectorWhatsAppId}
                required
                value={directorWhatsAppInput}
                onChange={e => setDirectorWhatsAppInput(e.target.value)}
                placeholder="e.g. 9845012345"
              />
              <small style={{ color: '#64748b', fontWeight: 'normal' }}>
                When parents click to enquire on your academy page, their lead and requirements route directly to this WhatsApp number.
              </small>
            </label>

            <label htmlFor={settingsUpiVpaId}>
              Academy UPI ID (VPA) for Fee Collection
              <input
                id={settingsUpiVpaId}
                value={upiVpaInput}
                onChange={e => setUpiVpaInput(e.target.value)}
                placeholder="e.g. bengaluruacademy@oksbi"
              />
              <small style={{ color: '#64748b', fontWeight: 'normal' }}>
                Used to generate instant UPI payment links and QR codes. Fees go 100% directly to your bank account.
              </small>
            </label>

            {settingsSavedNotice && (
              <p className="state-panel state-available" role="status" style={{ padding: '0.75rem 1rem' }}>
                Settings saved successfully! Lead routing and fee UPI are now active.
              </p>
            )}

            <button type="submit" className="academy-hub-primary-btn" style={{ marginTop: '0.5rem' }}>
              Save Operations Settings
            </button>
          </form>
        </section>
      )}

      {/* MODAL: Add Walk-In Lead */}
      {isAddLeadModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={() => setIsAddLeadModalOpen(false)}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Add Walk-in or Offline Parent Lead</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsAddLeadModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="academy-hub-form">
              <label htmlFor={addLeadParentNameId}>
                Parent / Guardian Name *
                <input
                  id={addLeadParentNameId}
                  required
                  value={newParentName}
                  onChange={e => setNewParentName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                />
              </label>

              <label htmlFor={addLeadParentPhoneId}>
                Parent WhatsApp / Mobile *
                <input
                  id={addLeadParentPhoneId}
                  required
                  value={newParentPhone}
                  onChange={e => setNewParentPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <label htmlFor={addLeadStudentNameId}>
                Student / Candidate Name *
                <input
                  id={addLeadStudentNameId}
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addLeadStudentAgeId}>
                  Age (years)
                  <input
                    id={addLeadStudentAgeId}
                    type="number"
                    value={newStudentAge}
                    onChange={e => setNewStudentAge(e.target.value)}
                  />
                </label>
                <label htmlFor={addLeadSportId}>
                  Sport
                  <input
                    id={addLeadSportId}
                    value={newSport}
                    onChange={e => setNewSport(e.target.value)}
                  />
                </label>
              </div>

              <label htmlFor={addLeadBatchNameId}>
                Preferred Batch / Squad
                <input
                  id={addLeadBatchNameId}
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  placeholder="e.g. Morning Elite U-14"
                />
              </label>

              <label htmlFor={addLeadRequestTypeId}>
                Admission Interest
                <select
                  id={addLeadRequestTypeId}
                  value={newRequestType}
                  onChange={e => setNewRequestType(e.target.value as AcademyLead['requestType'])}
                >
                  <option value="free_trial">Free Trial Session</option>
                  <option value="regular_admission">Regular Admission</option>
                  <option value="scholarship_assessment">Scholarship Assessment</option>
                </select>
              </label>

              <label htmlFor={addLeadNotesId}>
                Context / Notes
                <textarea
                  id={addLeadNotesId}
                  rows={2}
                  value={newLeadNotes}
                  onChange={e => setNewLeadNotes(e.target.value)}
                  placeholder="e.g. Played district inter-school, wants fast-bowling focus"
                />
              </label>

              <button type="submit" className="academy-hub-primary-btn">
                Add to CRM Inbox
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New Batch */}
      {isAddBatchModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={() => setIsAddBatchModalOpen(false)}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Create New Coaching Batch</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsAddBatchModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="academy-hub-form">
              <label htmlFor={addBatchNameId}>
                Batch Title *
                <input
                  id={addBatchNameId}
                  required
                  value={batchNameInput}
                  onChange={e => setBatchNameInput(e.target.value)}
                  placeholder="e.g. Morning Elite U-14 Youth Squad"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchSportId}>
                  Sport
                  <input
                    id={addBatchSportId}
                    value={batchSportInput}
                    onChange={e => setBatchSportInput(e.target.value)}
                  />
                </label>
                <label htmlFor={addBatchDaysId}>
                  Training Days
                  <input
                    id={addBatchDaysId}
                    value={batchDaysInput}
                    onChange={e => setBatchDaysInput(e.target.value)}
                    placeholder="e.g. Tue, Thu, Sat"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchTimingsId}>
                  Batch Timings
                  <input
                    id={addBatchTimingsId}
                    value={batchTimingsInput}
                    onChange={e => setBatchTimingsInput(e.target.value)}
                    placeholder="e.g. 06:00 AM – 08:00 AM"
                  />
                </label>
                <label htmlFor={addBatchAgeGroupId}>
                  Age Category
                  <input
                    id={addBatchAgeGroupId}
                    value={batchAgeGroupInput}
                    onChange={e => setBatchAgeGroupInput(e.target.value)}
                    placeholder="e.g. U-14 (10–14 yrs)"
                  />
                </label>
              </div>

              <label htmlFor={addBatchCoachId}>
                Allocated Coach Name &amp; License
                <input
                  id={addBatchCoachId}
                  value={batchCoachInput}
                  onChange={e => setBatchCoachInput(e.target.value)}
                  placeholder="e.g. Coach Suresh (AFC A-License)"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchMonthlyFeeId}>
                  Monthly Fee (₹)
                  <input
                    id={addBatchMonthlyFeeId}
                    type="number"
                    value={batchMonthlyFeeInput}
                    onChange={e => setBatchMonthlyFeeInput(Number(e.target.value))}
                  />
                </label>
                <label htmlFor={addBatchCapacityId}>
                  Slot Capacity
                  <input
                    id={addBatchCapacityId}
                    type="number"
                    value={batchCapacityInput}
                    onChange={e => setBatchCapacityInput(Number(e.target.value))}
                  />
                </label>
              </div>

              <button type="submit" className="academy-hub-primary-btn">
                Publish Batch Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Enroll Student */}
      {isAddStudentModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={() => setIsAddStudentModalOpen(false)}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Enroll Student into Roster</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsAddStudentModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="academy-hub-form">
              <label htmlFor={addStudentNameId}>
                Student Full Name *
                <input
                  id={addStudentNameId}
                  required
                  value={studentNameInput}
                  onChange={e => setStudentNameInput(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                />
              </label>

              <label htmlFor={addStudentParentNameId}>
                Parent Name
                <input
                  id={addStudentParentNameId}
                  value={studentParentNameInput}
                  onChange={e => setStudentParentNameInput(e.target.value)}
                  placeholder="e.g. Vikas Sharma"
                />
              </label>

              <label htmlFor={addStudentParentPhoneId}>
                Parent Phone / WhatsApp *
                <input
                  id={addStudentParentPhoneId}
                  required
                  value={studentParentPhoneInput}
                  onChange={e => setStudentParentPhoneInput(e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <label htmlFor={addStudentBatchId}>
                Assigned Batch
                <select
                  id={addStudentBatchId}
                  value={studentBatchIdInput}
                  onChange={e => {
                    setStudentBatchIdInput(e.target.value)
                    const b = batches.find(item => item.id === e.target.value)
                    if (b) setStudentFeeInput(b.monthlyFee)
                  }}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} (₹{b.monthlyFee}/mo)
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor={addStudentFeeId}>
                Agreed Monthly Fee (₹)
                <input
                  id={addStudentFeeId}
                  type="number"
                  value={studentFeeInput}
                  onChange={e => setStudentFeeInput(Number(e.target.value))}
                />
              </label>

              <button type="submit" className="academy-hub-primary-btn">
                Add to Student Roster
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Trial Pass */}
      {isTrialPassModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={() => setIsTrialPassModalOpen(false)}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Issue Selection Trial Pass</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsTrialPassModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGenerateTrialPassSubmit} className="academy-hub-form">
              <label htmlFor={trialPassStudentNameId}>
                Candidate Name *
                <input
                  id={trialPassStudentNameId}
                  required
                  value={passStudentName}
                  onChange={e => setPassStudentName(e.target.value)}
                  placeholder="e.g. Vihaan Verma"
                />
              </label>

              <label htmlFor={trialPassParentPhoneId}>
                Parent Mobile (for WhatsApp Delivery) *
                <input
                  id={trialPassParentPhoneId}
                  required
                  value={passParentPhone}
                  onChange={e => setPassParentPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={trialPassDateId}>
                  Trial Date
                  <input
                    id={trialPassDateId}
                    type="date"
                    value={passDate}
                    onChange={e => setPassDate(e.target.value)}
                  />
                </label>
                <label htmlFor={trialPassTimeId}>
                  Reporting Time
                  <input
                    id={trialPassTimeId}
                    value={passTime}
                    onChange={e => setPassTime(e.target.value)}
                    placeholder="e.g. 06:30 AM"
                  />
                </label>
              </div>

              <label htmlFor={trialPassVenueId}>
                Trial Venue / Pitch
                <input
                  id={trialPassVenueId}
                  value={passVenue}
                  onChange={e => setPassVenue(e.target.value)}
                  placeholder="e.g. Bengaluru FC Academy Pitch 1"
                />
              </label>

              <button type="submit" className="academy-hub-primary-btn">
                Generate Digital Trial Pass
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPI Payment QR Code */}
      {activeUpiQrStudent && (
        <div className="academy-hub-modal-overlay" onClick={() => setActiveUpiQrStudent(null)}>
          <div className="academy-hub-modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Scan to Pay Coaching Fee via UPI</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setActiveUpiQrStudent(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <p style={{ margin: '0.25rem 0 1rem', color: '#64748b' }}>
              Candidate: <strong>{activeUpiQrStudent.studentName}</strong> · Fee: <strong>₹{activeUpiQrStudent.monthlyFee.toLocaleString('en-IN')}</strong>
            </p>

            <div
              style={{ display: 'inline-block', padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1' }}
              dangerouslySetInnerHTML={{ __html: getUpiQrSvg(activeUpiQrStudent) }}
            />

            <div style={{ margin: '1rem 0' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Academy UPI ID:</div>
              <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#047857' }}>
                {settings.upiVpa || 'academy@upi'}
              </strong>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Compatible with Google Pay, PhonePe, Paytm, BHIM, and all bank UPI apps. 0% platform fee.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="academy-hub-primary-btn"
                style={{ flex: 1 }}
                onClick={() => {
                  recordStudentPayment(activeUpiQrStudent.id, activeUpiQrStudent.monthlyFee, 'upi')
                  setActiveUpiQrStudent(null)
                  triggerRefresh()
                }}
              >
                Mark Paid
              </button>
              <button
                type="button"
                className="academy-hub-public-page-btn"
                onClick={() => setActiveUpiQrStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
