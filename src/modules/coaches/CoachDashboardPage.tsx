import { useState, type MouseEvent, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import {
  getRegisteredCoaches,
  getCurrentCoach,
  getCoachBatches,
  saveCoachBatch,
  deleteCoachBatch,
  getCoachTrainees,
  saveCoachTrainee,
  recordTraineePayment,
  getCoachInquiries,
  updateCoachInquiryStatus,
  getCoachSaaSSummary,
  registerCustomCoach,
  confirmAndVerifyCoach,
  revokeCoachVerification,
  generateWhatsAppParentReplyUrl,
  generateWhatsAppTraineeFeeReminderUrl,
  generateUpiPayLink,
  type RegisteredCoach,
} from './coachSaaSClient'
import {
  parseCoachTraineeCsvRows,
  getSampleCoachTraineeCsv,
  getDailyAttendance,
  saveDailyAttendance,
  generateWhatsAppAttendanceAlertUrl,
  generateDigitalFeeReceipt,
  generateWhatsAppReceiptMessageUrl,
  generateWhatsAppShareProfileUrl,
  type DailyAttendanceRecord,
  type DigitalFeeReceipt,
  type ParsedCoachTraineeImportRow,
} from '../../shared/saas/saasSharedOperations'
import './CoachDashboardPage.css'

export interface CoachDashboardPageProps {
  initialCoachSlug?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function CoachDashboardPage({
  initialCoachSlug,
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

  const [activeTab, setActiveTab] = useState<'trainees' | 'inquiries' | 'batches' | 'attendance' | 'earnings' | 'credentials'>('trainees')

  // Data
  const trainees = getCoachTrainees(selectedSlug)
  const batches = getCoachBatches(selectedSlug)
  const inquiries = getCoachInquiries(selectedSlug)
  const summary = getCoachSaaSSummary(selectedSlug)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')

  // Modals
  const [isAddTraineeModalOpen, setIsAddTraineeModalOpen] = useState(false)
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false)
  const [isRegisterCoachModalOpen, setIsRegisterCoachModalOpen] = useState(false)
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<DigitalFeeReceipt | null>(null)

  // CSV Import State
  const [importCsvText, setImportCsvText] = useState('')
  const [importCsvErrors, setImportCsvErrors] = useState<string[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<ParsedCoachTraineeImportRow[]>([])

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [attendanceBatchId, setAttendanceBatchId] = useState(() => batches[0]?.id || '')
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, 'present' | 'absent' | 'excused'>>(() => {
    const existing = getDailyAttendance(selectedSlug, batches[0]?.id || '', new Date().toISOString().slice(0, 10))
    const map: Record<string, 'present' | 'absent' | 'excused'> = {}
    existing?.attendees.forEach(a => {
      map[a.studentId] = a.status
    })
    return map
  })
  const [attendanceSavedNotice, setAttendanceSavedNotice] = useState(false)

  // Share Profile Card Link
  const shareWhatsAppCardUrl = generateWhatsAppShareProfileUrl({
    entityType: 'coach',
    entityName: currentCoach.name,
    slug: currentCoach.slug,
    sport: currentCoach.sport || 'Sports',
    city: currentCoach.city,
    isVerified: currentCoach.verificationStatus === 'verified',
  })

  // Add Trainee State
  const [traineeName, setTraineeName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [traineeAge, setTraineeAge] = useState('U-14')
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '')
  const [traineeFee, setTraineeFee] = useState<number>(batches[0]?.monthlyFee || 3500)

  // Add Batch State
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchSport, setNewBatchSport] = useState(currentCoach.sport || 'Cricket')
  const [newBatchDays, setNewBatchDays] = useState('Mon, Wed, Fri')
  const [newBatchTimings, setNewBatchTimings] = useState('06:30 AM – 08:30 AM')
  const [newBatchAge, setNewBatchAge] = useState('U-14 (10–14 yrs)')
  const [newBatchCapacity, setNewBatchCapacity] = useState(20)
  const [newBatchFee, setNewBatchFee] = useState(3500)

  // Register New Coach State
  const [onboardName, setOnboardName] = useState('')
  const [onboardSport, setOnboardSport] = useState('Cricket')
  const [onboardCity, setOnboardCity] = useState('Delhi NCR')
  const [onboardPhone, setOnboardPhone] = useState('')
  const [onboardEmail, setOnboardEmail] = useState('')
  const [onboardCert, setOnboardCert] = useState('SAI / NIS Patiala Diploma')
  const [onboardFee, setOnboardFee] = useState(3500)
  const [onboardUpi, setOnboardUpi] = useState('')

  // UPI QR String
  const upiQrPayload = currentCoach.upiVpa
    ? generateUpiPayLink({
        vpa: currentCoach.upiVpa,
        name: currentCoach.name,
        amount: currentCoach.monthlyFee || 3500,
        note: `Coaching Fee - ${currentCoach.name}`,
      })
    : ''
  const qrSvg = upiQrPayload ? generateQrSvgString(upiQrPayload) : ''

  const handleAddTraineeSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!traineeName.trim() || !parentPhone.trim()) return

    const matchedBatch = batches.find(b => b.id === selectedBatchId)
    saveCoachTrainee({
      coachSlug: selectedSlug,
      traineeName: traineeName.trim(),
      parentName: parentName.trim() || 'Parent',
      parentPhone: parentPhone.trim(),
      sport: currentCoach.sport,
      ageCategory: traineeAge,
      batchId: selectedBatchId,
      batchName: matchedBatch?.batchName || 'Regular Coaching Batch',
      monthlyFee: traineeFee || 3500,
      feeStatus: 'paid',
      nextDueDate: '15 Dec 2026',
      upiVpa: currentCoach.upiVpa,
    })

    setIsAddTraineeModalOpen(false)
    setTraineeName('')
    setParentName('')
    setParentPhone('')
    triggerRefresh()
  }

  const handleCsvInputChange = (text: string) => {
    setImportCsvText(text)
    if (!text.trim()) {
      setImportCsvErrors([])
      setImportPreviewRows([])
      return
    }
    const { valid, errors } = parseCoachTraineeCsvRows(text)
    setImportPreviewRows(valid)
    setImportCsvErrors(errors)
  }

  const handleConfirmImportCsv = () => {
    if (importPreviewRows.length === 0) return
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)
    const defaultBatch = batches[0]

    importPreviewRows.forEach(row => {
      const targetBatch = batches.find(b => b.batchName.toLowerCase() === (row.batchName || '').toLowerCase()) || defaultBatch
      saveCoachTrainee({
        coachSlug: selectedSlug,
        traineeName: row.traineeName,
        parentName: row.parentName,
        parentPhone: row.parentPhone,
        batchId: targetBatch?.id || 'batch-default',
        batchName: targetBatch?.batchName || 'Foundation Clinic',
        sport: currentCoach.sport || 'Cricket',
        ageCategory: row.ageGroup || 'U-14',
        monthlyFee: row.monthlyFee || targetBatch?.monthlyFee || 3500,
        feeStatus: 'paid',
        lastPaymentDate: now.toISOString().slice(0, 10),
        nextDueDate: nextMonth.toISOString().slice(0, 10),
      })
    })

    setIsImportCsvModalOpen(false)
    setImportCsvText('')
    setImportPreviewRows([])
    setImportCsvErrors([])
    triggerRefresh()
  }

  const handleAddBatchSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newBatchName.trim()) return

    saveCoachBatch({
      coachSlug: selectedSlug,
      batchName: newBatchName.trim(),
      sport: newBatchSport,
      days: newBatchDays,
      timings: newBatchTimings,
      ageGroup: newBatchAge,
      monthlyFee: newBatchFee,
      maxCapacity: newBatchCapacity,
      isActive: true,
    })

    setIsAddBatchModalOpen(false)
    setNewBatchName('')
    triggerRefresh()
  }

  const handleRegisterCoachSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!onboardName.trim() || !onboardPhone.trim()) return

    const newCoach = registerCustomCoach({
      name: onboardName.trim(),
      sport: onboardSport,
      city: onboardCity,
      phone: onboardPhone.trim(),
      email: onboardEmail.trim() || `${onboardName.toLowerCase().replace(/[^a-z0-9]/g, '')}@coach.khelgrid.com`,
      certification: onboardCert,
      monthlyFee: onboardFee,
      upiVpa: onboardUpi.trim(),
    })

    setSelectedSlug(newCoach.slug)
    setIsRegisterCoachModalOpen(false)
    triggerRefresh()
  }

  const filteredTrainees = trainees.filter(t => {
    const matchesSearch =
      t.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.parentPhone.includes(searchQuery)
    const matchesBatch = batchFilter === 'all' || t.batchId === batchFilter
    return matchesSearch && matchesBatch
  })

  return (
    <div className="coach-hub-root content-page" key={refreshKey}>
      {/* Top Header & Coach Switcher */}
      {onNavigate && (
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

      {/* Verification Status Alert Banner */}
      {currentCoach.verificationStatus !== 'verified' ? (
        <div className="coach-verification-status-banner pending">
          <div className="coach-verification-status-text">
            <SiteIcon name="alert-triangle" size={20} className="status-banner-icon pending" />
            <div>
              <strong>Credentials Verification Pending · Admin Review Required</strong>
              <p>
                Your coach dashboard, trainee roster, and direct UPI payments are active. The official public <strong>&quot;KhelGrid Verified Coach&quot;</strong> badge will appear on your public listing once verified by the KhelGrid Editorial Moderation Desk.
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
      ) : (
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
          {currentCoach.isCustom && (
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
      )}

      {/* 4 admincn-style Metric Statistics Cards */}
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

      {/* Main Tab Bar */}
      <div className="coach-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'trainees'}
          className={`coach-tab-btn ${activeTab === 'trainees' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('trainees')}
        >
          <SiteIcon name="users" size={15} />
          <span>Trainee Roster ({trainees.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'inquiries'}
          className={`coach-tab-btn ${activeTab === 'inquiries' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('inquiries')}
        >
          <SiteIcon name="mail" size={15} />
          <span>Inbound Inquiries ({inquiries.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'batches'}
          className={`coach-tab-btn ${activeTab === 'batches' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <SiteIcon name="calendar" size={15} />
          <span>Batches &amp; Timings ({batches.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'attendance'}
          className={`coach-tab-btn ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <SiteIcon name="check-circle" size={15} />
          <span>Daily Attendance</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'earnings'}
          className={`coach-tab-btn ${activeTab === 'earnings' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          <SiteIcon name="sparkles" size={15} />
          <span>Total Earnings &amp; UPI QR</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'credentials'}
          className={`coach-tab-btn ${activeTab === 'credentials' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('credentials')}
        >
          <SiteIcon name="award" size={15} />
          <span>Credentials &amp; Evidence</span>
        </button>
      </div>

      {/* TAB 1: TRAINEES ROSTER (admincn datatable style) */}
      {activeTab === 'trainees' && (
        <div className="coach-card-panel">
          <div className="coach-table-toolbar">
            <div className="coach-table-search-wrap">
              <SiteIcon name="search" size={15} className="coach-search-icon" />
              <input
                type="text"
                placeholder="Search trainees by name or parent phone…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="coach-search-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="coach-filter-select"
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
              >
                <option value="all">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batchName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="coach-hub-btn-outline"
                onClick={() => {
                  setImportCsvText('')
                  setImportCsvErrors([])
                  setImportPreviewRows([])
                  setIsImportCsvModalOpen(true)
                }}
                style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Bulk import trainees from CSV or Excel"
              >
                <SiteIcon name="upload" size={14} />
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                className="coach-primary-btn"
                onClick={() => setIsAddTraineeModalOpen(true)}
              >
                <SiteIcon name="plus" size={14} />
                <span>Add Trainee</span>
              </button>
            </div>
          </div>

          <div className="coach-table-container">
            <table className="coach-datatable">
              <thead>
                <tr>
                  <th>Trainee</th>
                  <th>Parent / Guardian</th>
                  <th>Batch</th>
                  <th>Monthly Fee</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No trainees found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTrainees.map(t => {
                    const initials = t.traineeName
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    const waUrl = generateWhatsAppTraineeFeeReminderUrl(t, currentCoach.name, currentCoach.upiVpa)

                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="coach-avatar-initials">{initials}</div>
                            <div>
                              <strong>{t.traineeName}</strong>
                              <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                                {t.ageCategory} · {t.sport}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span>{t.parentName}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            +91 {t.parentPhone}
                          </span>
                        </td>
                        <td>
                          <span className="coach-batch-tag">{t.batchName}</span>
                        </td>
                        <td>
                          <strong>₹{t.monthlyFee.toLocaleString('en-IN')}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            Due {t.nextDueDate}
                          </span>
                        </td>
                        <td>
                          {t.feeStatus === 'paid' ? (
                            <span className="coach-status-pill paid">✓ Paid</span>
                          ) : t.feeStatus === 'due_soon' ? (
                            <span className="coach-status-pill due">Due Soon</span>
                          ) : (
                            <span className="coach-status-pill overdue">Overdue</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {t.feeStatus === 'paid' ? (
                              <button
                                type="button"
                                className="coach-action-btn receipt"
                                onClick={() => {
                                  const r = generateDigitalFeeReceipt({
                                    entityType: 'coach',
                                    entityName: currentCoach.name,
                                    entitySlug: currentCoach.slug,
                                    isVerified: currentCoach.verificationStatus === 'verified',
                                    studentId: t.id,
                                    studentName: t.traineeName,
                                    parentName: t.parentName,
                                    parentPhone: t.parentPhone,
                                    batchName: t.batchName,
                                    sport: currentCoach.sport || 'Cricket',
                                    amount: t.monthlyFee,
                                    paymentDate: t.lastPaymentDate,
                                    upiVpa: currentCoach.upiVpa,
                                  })
                                  setActiveReceipt(r)
                                }}
                                title="View & Send Official Fee Receipt"
                              >
                                <SiteIcon name="file-text" size={12} />
                                <span>Receipt</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="coach-action-btn mark-paid"
                                  onClick={() => {
                                    recordTraineePayment(t.id)
                                    triggerRefresh()
                                  }}
                                  title="Record offline UPI or cash payment"
                                >
                                  Mark Paid
                                </button>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="coach-action-btn whatsapp"
                                  title="Send WhatsApp payment reminder with direct UPI link"
                                >
                                  <SiteIcon name="phone" size={12} />
                                  <span>Remind</span>
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INBOUND INQUIRIES (CRM Inbox) */}
      {activeTab === 'inquiries' && (
        <div className="coach-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Inbound Coaching Inquiries</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Prospective student trial inquiries routed directly from your public coach profile on KhelGrid.
              </p>
            </div>
            <span className="coach-trend-pill positive">{inquiries.length} Inquiries Total</span>
          </div>

          <div className="coach-inquiries-grid">
            {inquiries.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                No inquiries received yet. When parents view your verified profile, their trial requests will appear here.
              </p>
            ) : (
              inquiries.map(inq => {
                const waUrl = generateWhatsAppParentReplyUrl(inq, currentCoach.name)

                return (
                  <div key={inq.id} className="coach-inquiry-card">
                    <div className="coach-inquiry-header">
                      <div>
                        <h4>{inq.athleteName}</h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Parent: {inq.parentName || 'Parent'} · +91 {inq.phone}
                        </span>
                      </div>
                      <span className={`coach-inquiry-status-pill ${inq.status}`}>
                        {inq.status === 'new' ? 'New Inquiry' : inq.status === 'scheduled' ? 'Assessment Scheduled' : 'Enrolled'}
                      </span>
                    </div>

                    <div className="coach-inquiry-body">
                      <div className="coach-inquiry-field">
                        <span className="field-label">Age &amp; Skill:</span>
                        <span>{inq.ageCategory} · {inq.skillLevel}</span>
                      </div>
                      <div className="coach-inquiry-field">
                        <span className="field-label">Objective:</span>
                        <span>{inq.objective}</span>
                      </div>
                      <div className="coach-inquiry-field">
                        <span className="field-label">Preferred Batch:</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>{inq.preferredBatch}</span>
                      </div>
                      {inq.notes && (
                        <div className="coach-inquiry-notes">
                          <em>&quot;{inq.notes}&quot;</em>
                        </div>
                      )}
                    </div>

                    <div className="coach-inquiry-footer">
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Ref: {inq.referenceId} · {inq.submittedAt}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {inq.status === 'new' && (
                          <button
                            type="button"
                            className="coach-action-btn"
                            onClick={() => {
                              updateCoachInquiryStatus(inq.id, 'scheduled')
                              triggerRefresh()
                            }}
                          >
                            Mark Scheduled
                          </button>
                        )}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="coach-primary-btn"
                          style={{ padding: '6px 10px', fontSize: '12px', background: '#25D366', borderColor: '#25D366' }}
                        >
                          <SiteIcon name="phone" size={13} />
                          <span>WhatsApp Reply</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BATCHES & TIMINGS SCHEDULE */}
      {activeTab === 'batches' && (
        <div className="coach-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Coaching Batches &amp; Schedules</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Manage regular training camps, seasonal academies, and 1-on-1 private assessment clinics.
              </p>
            </div>
            <button
              type="button"
              className="coach-primary-btn"
              onClick={() => setIsAddBatchModalOpen(true)}
            >
              <SiteIcon name="plus" size={14} />
              <span>Create New Batch</span>
            </button>
          </div>

          <div className="coach-batches-grid">
            {batches.map(b => {
              const occupancy = Math.round((b.enrolledCount / b.maxCapacity) * 100)

              return (
                <div key={b.id} className="coach-batch-card">
                  <div className="coach-batch-card-header">
                    <span className="coach-batch-sport-tag">{b.sport}</span>
                    <button
                      type="button"
                      className="coach-batch-delete-btn"
                      onClick={() => {
                        deleteCoachBatch(b.id)
                        triggerRefresh()
                      }}
                      title="Remove batch schedule"
                    >
                      <SiteIcon name="close" size={14} />
                    </button>
                  </div>

                  <h4>{b.batchName}</h4>
                  <div className="coach-batch-meta">
                    <div className="batch-meta-row">
                      <SiteIcon name="calendar" size={13} />
                      <span>{b.days}</span>
                    </div>
                    <div className="batch-meta-row">
                      <SiteIcon name="clock" size={13} />
                      <span>{b.timings}</span>
                    </div>
                    <div className="batch-meta-row">
                      <SiteIcon name="users" size={13} />
                      <span>{b.ageGroup}</span>
                    </div>
                  </div>

                  <div className="coach-batch-capacity">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Enrolled Capacity</span>
                      <strong>{b.enrolledCount} / {b.maxCapacity} ({occupancy}%)</strong>
                    </div>
                    <div className="coach-progress-bar-bg">
                      <div
                        className="coach-progress-bar-fill"
                        style={{ width: `${Math.min(occupancy, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="coach-batch-card-footer">
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Monthly Fee</span>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                        ₹{b.monthlyFee.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <span className="coach-batch-active-pill">● Active</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: DAILY ATTENDANCE & WHATSAPP ROLL CALL */}
      {activeTab === 'attendance' && (
        <div className="coach-card-panel">
          <div className="coach-att-toolbar">
            <div className="coach-att-controls">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TRAINING BATCH</label>
                <select
                  className="coach-filter-select"
                  value={attendanceBatchId}
                  onChange={e => {
                    const bId = e.target.value
                    setAttendanceBatchId(bId)
                    const existing = getDailyAttendance(selectedSlug, bId, attendanceDate)
                    const map: Record<string, 'present' | 'absent' | 'excused'> = {}
                    existing?.attendees.forEach(a => {
                      map[a.studentId] = a.status
                    })
                    setAttendanceStatuses(map)
                  }}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} ({b.timings})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SESSION DATE</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => {
                    const d = e.target.value
                    setAttendanceDate(d)
                    const existing = getDailyAttendance(selectedSlug, attendanceBatchId, d)
                    const map: Record<string, 'present' | 'absent' | 'excused'> = {}
                    existing?.attendees.forEach(a => {
                      map[a.studentId] = a.status
                    })
                    setAttendanceStatuses(map)
                  }}
                  className="coach-search-input"
                  style={{ width: 'auto' }}
                />
              </div>
            </div>

            <div className="coach-att-stats">
              {(() => {
                const batchTrainees = trainees.filter(t => t.batchId === attendanceBatchId || batches.length === 1)
                const total = batchTrainees.length
                const presentCount = batchTrainees.filter(t => attendanceStatuses[t.id] === 'present').length
                const absentCount = batchTrainees.filter(t => attendanceStatuses[t.id] === 'absent').length
                const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0

                return (
                  <>
                    <span className="coach-att-chip">Total Squad: {total}</span>
                    <span className="coach-att-chip present">Present: {presentCount} ({rate}%)</span>
                    <span className="coach-att-chip absent">Absent: {absentCount}</span>
                    <button
                      type="button"
                      className="coach-primary-btn"
                      onClick={() => {
                        const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
                        const record: DailyAttendanceRecord = {
                          id: `att-${Date.now()}`,
                          entityType: 'coach',
                          entitySlug: selectedSlug,
                          batchId: attendanceBatchId,
                          batchName: batch?.batchName || 'Coaching Clinic',
                          date: attendanceDate,
                          markedAt: new Date().toISOString(),
                          attendees: batchTrainees.map(t => ({
                            studentId: t.id,
                            studentName: t.traineeName,
                            parentPhone: t.parentPhone,
                            status: attendanceStatuses[t.id] || 'present',
                            checkInTime: batch?.timings.split('–')[0]?.trim() || '06:30 AM',
                          })),
                        }
                        saveDailyAttendance(record)
                        setAttendanceSavedNotice(true)
                        setTimeout(() => setAttendanceSavedNotice(false), 3000)
                      }}
                    >
                      <SiteIcon name="check" size={14} />
                      <span>{attendanceSavedNotice ? '✓ Roll Call Saved' : 'Save Attendance'}</span>
                    </button>
                  </>
                )
              })()}
            </div>
          </div>

          <div className="coach-table-container">
            <table className="coach-datatable">
              <thead>
                <tr>
                  <th>Trainee</th>
                  <th>Parent Contact</th>
                  <th>Status (1-Tap Mark)</th>
                  <th>WhatsApp Alert to Parent</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const batchTrainees = trainees.filter(t => t.batchId === attendanceBatchId || batches.length === 1)
                  const currentBatch = batches.find(b => b.id === attendanceBatchId) || batches[0]

                  if (batchTrainees.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No trainees registered in this batch yet.
                        </td>
                      </tr>
                    )
                  }

                  return batchTrainees.map(t => {
                    const status = attendanceStatuses[t.id] || 'present'
                    const waAlertUrl = generateWhatsAppAttendanceAlertUrl({
                      studentName: t.traineeName,
                      parentPhone: t.parentPhone,
                      status,
                      batchName: currentBatch?.batchName || 'Coaching Clinic',
                      entityName: currentCoach.name,
                      date: attendanceDate,
                      checkInTime: currentBatch?.timings.split('–')[0]?.trim() || '06:30 AM',
                    })

                    return (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.traineeName}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            {t.ageCategory} · {currentCoach.sport}
                          </span>
                        </td>
                        <td>
                          <span>{t.parentName}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            +91 {t.parentPhone}
                          </span>
                        </td>
                        <td>
                          <div className="coach-att-pills">
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'present' ? 'active present' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [t.id]: 'present' }))}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'absent' ? 'active absent' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [t.id]: 'absent' }))}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'excused' ? 'active excused' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [t.id]: 'excused' }))}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                        <td>
                          <a
                            href={waAlertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`coach-action-btn ${status === 'present' ? 'whatsapp' : ''}`}
                            style={{
                              background: status === 'absent' ? 'rgba(239, 68, 68, 0.1)' : undefined,
                              color: status === 'absent' ? '#dc2626' : undefined,
                              borderColor: status === 'absent' ? 'rgba(239, 68, 68, 0.3)' : undefined,
                            }}
                            title={`Send ${status} WhatsApp notice to ${t.parentName}`}
                          >
                            <SiteIcon name="phone" size={12} />
                            <span>Notify Parent ({status})</span>
                          </a>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TOTAL EARNINGS & UPI QR (widget-total-earning style) */}
      {activeTab === 'earnings' && (
        <div className="coach-card-panel">
          <div className="coach-earnings-layout">
            <div className="coach-earnings-main">
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>Coaching Revenue &amp; Direct UPI Payouts</h3>
              <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.88rem' }}>
                100% of student fee collections flow directly to your UPI ID without platform cuts or settlement delays.
              </p>

              <div className="coach-earnings-summary-box">
                <div className="earnings-stat-item">
                  <span className="stat-label">Total Monthly Collection</span>
                  <strong className="stat-value" style={{ color: '#059669' }}>
                    ₹{summary.totalRevenue.toLocaleString('en-IN')}
                  </strong>
                  <small style={{ color: '#64748b' }}>From {summary.paidTrainees} paid trainees</small>
                </div>

                <div className="earnings-stat-item">
                  <span className="stat-label">Pending / Overdue Fees</span>
                  <strong className="stat-value" style={{ color: '#dc2626' }}>
                    ₹{summary.pendingRevenue.toLocaleString('en-IN')}
                  </strong>
                  <small style={{ color: '#64748b' }}>Awaiting payment</small>
                </div>

                <div className="earnings-stat-item">
                  <span className="stat-label">Platform Commission</span>
                  <strong className="stat-value" style={{ color: '#2563eb' }}>
                    0%
                  </strong>
                  <small style={{ color: '#059669' }}>Zero deduction guarantee</small>
                </div>
              </div>

              <div style={{ margin: '1.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Fee Collection Progress</span>
                  <span style={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>{summary.collectionRate}%</span>
                </div>
                <div className="coach-progress-bar-bg" style={{ height: '10px' }}>
                  <div className="coach-progress-bar-fill" style={{ width: `${summary.collectionRate}%`, background: '#059669' }} />
                </div>
              </div>

              {/* Batches Revenue Breakdown */}
              <h4 style={{ margin: '1.5rem 0 0.75rem', fontSize: '0.95rem' }}>Revenue Breakdown by Batch</h4>
              <div className="coach-batch-breakdown-list">
                {batches.map(b => (
                  <div key={b.id} className="coach-batch-breakdown-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SiteIcon name="calendar-check" size={16} style={{ color: '#059669' }} />
                      <div>
                        <strong>{b.batchName}</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          {b.enrolledCount} Trainees · {b.days}
                        </span>
                      </div>
                    </div>
                    <strong>₹{(b.enrolledCount * b.monthlyFee).toLocaleString('en-IN')} / mo</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="coach-earnings-qr-panel">
              <h4>Direct UPI Payment QR</h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 1rem' }}>
                Trainees and parents scan this QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to settle monthly coaching fees.
              </p>

              {qrSvg ? (
                <div
                  className="coach-qr-container"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="coach-qr-placeholder">
                  <span>Please configure your UPI VPA ID to generate QR</span>
                </div>
              )}

              <div className="coach-upi-id-box">
                <span style={{ fontSize: '11px', color: '#64748b' }}>CONFIGURED UPI VPA</span>
                <strong>{currentCoach.upiVpa || 'Not configured'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CREDENTIALS & NIS VERIFICATION */}
      {activeTab === 'credentials' && (
        <div className="coach-card-panel">
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Coaching Credentials &amp; Verification Evidence</h3>
          <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            KhelGrid enforces strict background and certification verification for all coaches to protect grassroots athletes.
          </p>

          <div className="coach-cert-evidence-box">
            <div className="cert-evidence-row">
              <div className="cert-evidence-label">
                <SiteIcon name="award" size={16} />
                <span>Primary Certification:</span>
              </div>
              <strong>{currentCoach.certification}</strong>
            </div>

            <div className="cert-evidence-row">
              <div className="cert-evidence-label">
                <SiteIcon name="calendar" size={16} />
                <span>Coaching Experience:</span>
              </div>
              <strong>{currentCoach.experienceYears}+ Years Active Coaching</strong>
            </div>

            <div className="cert-evidence-row">
              <div className="cert-evidence-label">
                <SiteIcon name="map-pin" size={16} />
                <span>Operating City:</span>
              </div>
              <strong>{currentCoach.city}, {currentCoach.state}</strong>
            </div>

            <div className="cert-evidence-row">
              <div className="cert-evidence-label">
                <SiteIcon name="shield-check" size={16} />
                <span>Verification Tag:</span>
              </div>
              <div>
                {currentCoach.verificationStatus === 'verified' ? (
                  <span className="coach-verified-pill verified">🛡️ Verified by KhelGrid Admin</span>
                ) : (
                  <span className="coach-verified-pill pending">🟡 Pending Review · Unconfirmed</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
            {currentCoach.verificationStatus !== 'verified' ? (
              <button
                type="button"
                className="coach-primary-btn"
                onClick={() => {
                  confirmAndVerifyCoach(currentCoach.slug)
                  triggerRefresh()
                }}
              >
                <SiteIcon name="shield-check" size={15} />
                <span>Confirm &amp; Grant Verified Tag (Admin)</span>
              </button>
            ) : (
              <button
                type="button"
                className="coach-hub-btn-outline"
                onClick={() => {
                  revokeCoachVerification(currentCoach.slug)
                  triggerRefresh()
                }}
              >
                Revoke Verified Tag (Admin)
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD TRAINEE */}
      {isAddTraineeModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsAddTraineeModalOpen(false)}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Add New Trainee</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsAddTraineeModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddTraineeSubmit} className="coach-modal-form">
              <div className="coach-modal-field">
                <label>Trainee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Sharma"
                  value={traineeName}
                  onChange={e => setTraineeName(e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Parent Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alok Sharma"
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Parent Phone (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Age Category</label>
                  <select value={traineeAge} onChange={e => setTraineeAge(e.target.value)}>
                    <option value="U-10">U-10 (6–10 yrs)</option>
                    <option value="U-14">U-14 (10–14 yrs)</option>
                    <option value="U-17">U-17 (14–17 yrs)</option>
                    <option value="U-19">U-19 (17–19 yrs)</option>
                    <option value="Senior">Senior / Open</option>
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>Assigned Batch</label>
                  <select
                    value={selectedBatchId}
                    onChange={e => {
                      setSelectedBatchId(e.target.value)
                      const b = batches.find(item => item.id === e.target.value)
                      if (b) setTraineeFee(b.monthlyFee)
                    }}
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} (₹{b.monthlyFee}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Monthly Coaching Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={traineeFee}
                  onChange={e => setTraineeFee(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="coach-primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Add Trainee to Roster
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BATCH */}
      {isAddBatchModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsAddBatchModalOpen(false)}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Create Coaching Batch</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsAddBatchModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddBatchSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Batch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Elite Bowling Clinic"
                    value={newBatchName}
                    onChange={e => setNewBatchName(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Sport</label>
                  <select
                    value={newBatchSport}
                    onChange={e => setNewBatchSport(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Athletics">Athletics</option>
                  </select>
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Training Days</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mon, Wed, Fri"
                    value={newBatchDays}
                    onChange={e => setNewBatchDays(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Timings</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 06:30 AM – 08:30 AM"
                    value={newBatchTimings}
                    onChange={e => setNewBatchTimings(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Target Age Group</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. U-15 (11–15 yrs)"
                    value={newBatchAge}
                    onChange={e => setNewBatchAge(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={newBatchCapacity}
                    onChange={e => setNewBatchCapacity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Monthly Fee per Trainee (₹)</label>
                <input
                  type="number"
                  required
                  value={newBatchFee}
                  onChange={e => setNewBatchFee(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="coach-primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Publish Batch Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW COACH */}
      {isRegisterCoachModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsRegisterCoachModalOpen(false)}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Register New Coach Profile</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsRegisterCoachModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleRegisterCoachSubmit} className="coach-modal-form">
              <div className="coach-modal-field">
                <label>Coach Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coach Ramesh Powar"
                  value={onboardName}
                  onChange={e => setOnboardName(e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Primary Sport</label>
                  <select value={onboardSport} onChange={e => setOnboardSport(e.target.value)}>
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Athletics">Athletics</option>
                    <option value="Boxing">Boxing</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Basketball">Basketball</option>
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={onboardCity}
                    onChange={e => setOnboardCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>WhatsApp Contact</label>
                  <input
                    type="tel"
                    required
                    placeholder="9820011223"
                    value={onboardPhone}
                    onChange={e => setOnboardPhone(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="coach@example.com"
                    value={onboardEmail}
                    onChange={e => setOnboardEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Certification / Accreditation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCCI Level 3 · NIS Patiala Senior Diploma"
                  value={onboardCert}
                  onChange={e => setOnboardCert(e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Default Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={onboardFee}
                    onChange={e => setOnboardFee(Number(e.target.value))}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>UPI ID for Direct Payouts</label>
                  <input
                    type="text"
                    placeholder="e.g. coach@okhdfcbank"
                    value={onboardUpi}
                    onChange={e => setOnboardUpi(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="coach-primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Launch Coach Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT TRAINEES FROM CSV / EXCEL */}
      {isImportCsvModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsImportCsvModalOpen(false)}>
          <div className="coach-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Bulk Import Trainees from CSV / Excel</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsImportCsvModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div className="coach-csv-template-box">
                <div>
                  <strong style={{ fontSize: '13px' }}>Need the format template?</strong>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                    Columns: Trainee Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee, Age
                  </p>
                </div>
                <button
                  type="button"
                  className="coach-hub-btn-outline"
                  onClick={() => {
                    const sample = getSampleCoachTraineeCsv()
                    handleCsvInputChange(sample)
                  }}
                  style={{ fontSize: '12px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                >
                  Load Sample Data
                </button>
              </div>

              <div className="coach-modal-field">
                <label>Paste CSV / Spreadsheet Text</label>
                <textarea
                  className="coach-csv-textarea"
                  placeholder="Paste rows copied from Excel or CSV here..."
                  value={importCsvText}
                  onChange={e => handleCsvInputChange(e.target.value)}
                />
              </div>

              {importCsvErrors.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>
                  <strong>Validation Notices:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                    {importCsvErrors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importPreviewRows.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '12.5px', color: '#059669' }}>
                      ✓ {importPreviewRows.length} Trainees Ready to Import
                    </strong>
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '6px' }}>
                    <table className="coach-csv-preview-table">
                      <thead>
                        <tr>
                          <th>Trainee</th>
                          <th>Parent Contact</th>
                          <th>Batch</th>
                          <th>Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.traineeName} ({r.ageGroup})</td>
                            <td>{r.parentName} (+91 {r.parentPhone})</td>
                            <td>{r.batchName || batches[0]?.batchName}</td>
                            <td>₹{r.monthlyFee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="coach-hub-btn-outline"
                  onClick={() => setIsImportCsvModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="coach-primary-btn"
                  disabled={importPreviewRows.length === 0}
                  onClick={handleConfirmImportCsv}
                  style={{ opacity: importPreviewRows.length === 0 ? 0.5 : 1 }}
                >
                  Import {importPreviewRows.length} Trainees Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL DIGITAL FEE RECEIPT VOUCHER */}
      {activeReceipt && (
        <div className="coach-modal-backdrop" onClick={() => setActiveReceipt(null)}>
          <div className="coach-receipt-card" onClick={e => e.stopPropagation()}>
            <div className="coach-receipt-header">
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                  Official Payment Receipt
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', color: '#ffffff' }}>
                  {activeReceipt.entityName}
                </h3>
                {activeReceipt.isVerified && (
                  <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600 }}>
                    🛡️ Official KhelGrid Verified Coach
                  </span>
                )}
              </div>
              <button
                type="button"
                className="coach-modal-close-btn"
                style={{ color: '#ffffff' }}
                onClick={() => setActiveReceipt(null)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="coach-receipt-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Receipt Voucher</span>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{activeReceipt.receiptNumber}</strong>
                </div>
                <div className="coach-receipt-stamp">PAID IN FULL</div>
              </div>

              <table className="coach-receipt-table">
                <tbody>
                  <tr>
                    <td>Athlete / Trainee:</td>
                    <td>{activeReceipt.studentName}</td>
                  </tr>
                  <tr>
                    <td>Parent / Guardian:</td>
                    <td>{activeReceipt.parentName} (+91 {activeReceipt.parentPhone})</td>
                  </tr>
                  <tr>
                    <td>Batch &amp; Timings:</td>
                    <td>{activeReceipt.batchName}</td>
                  </tr>
                  <tr>
                    <td>Sport:</td>
                    <td>{activeReceipt.sport}</td>
                  </tr>
                  <tr>
                    <td>Billing Period:</td>
                    <td>{activeReceipt.paymentMonth}</td>
                  </tr>
                  <tr>
                    <td>Payment Date:</td>
                    <td>{activeReceipt.paymentDate}</td>
                  </tr>
                  <tr>
                    <td>Payment Mode:</td>
                    <td>{activeReceipt.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td>Settlement UPI ID:</td>
                    <td>{activeReceipt.upiVpa}</td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                    <td style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Total Amount Paid:</td>
                    <td style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                      ₹{activeReceipt.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                <a
                  href={generateWhatsAppReceiptMessageUrl(activeReceipt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="coach-action-btn whatsapp"
                  style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '13px' }}
                >
                  <SiteIcon name="phone" size={14} />
                  <span>Send Receipt on WhatsApp</span>
                </a>
                <button
                  type="button"
                  className="coach-hub-btn-outline"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print()
                  }}
                  style={{ padding: '10px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Print or save as PDF"
                >
                  <SiteIcon name="download" size={14} />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
