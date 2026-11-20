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
  getRegisteredAcademies,
  registerCustomAcademy,
  confirmAndVerifyAcademy,
  revokeAcademyVerification,
  hasCompletedOnboarding,
  type AcademyLead,
  type AcademyBatch,
  type AcademyStudent,
  type AcademyTrialPass,
  type RegisteredAcademy,
} from './academySaaSClient'
import { exportStudentsToCsv, downloadBlobFile } from './academyExportUtils'
import {
  parseStudentCsvRows,
  getSampleStudentCsv,
  getDailyAttendance,
  saveDailyAttendance,
  generateWhatsAppAttendanceAlertUrl,
  generateWhatsAppShareProfileUrl,
  type DailyAttendanceRecord,
  type ParsedStudentImportRow,
} from '../../shared/saas/saasSharedOperations'
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

  // Registered academies list (curated + custom onboarded)
  const registeredAcademies = getRegisteredAcademies()

  // Selected Academy details
  const fallbackCurated = CURATED_ACADEMIES.find(a => a.slug === selectedSlug)
  const currentAcademy: RegisteredAcademy = registeredAcademies.find(a => a.slug === selectedSlug) || (fallbackCurated ? {
    id: fallbackCurated.slug,
    slug: fallbackCurated.slug,
    name: fallbackCurated.name,
    city: fallbackCurated.city,
    state: fallbackCurated.state || '',
    sport: fallbackCurated.sport,
    verificationStatus: 'verified',
    isCustom: false,
  } : {
    id: 'custom-academy',
    slug: selectedSlug,
    name: 'National Sports Academy',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Football',
    verificationStatus: 'pending_review',
    isCustom: true,
  })

  // Derived Data
  const leads = getAcademyLeads(selectedSlug)
  const batches = getAcademyBatches(selectedSlug)
  const students = getAcademyStudents(selectedSlug)
  const passes = getAcademyTrialPasses(selectedSlug)
  const settings = getAcademySettings(selectedSlug, currentAcademy.name)
  const summary = getAcademySaaSSummary(selectedSlug)

  // Active Tab
  const [activeTab, setActiveTab] = useState<'leads' | 'batches' | 'fees' | 'attendance' | 'trial_passes' | 'settings'>('leads')

  // CSV Import State
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const [importCsvErrors, setImportCsvErrors] = useState<string[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<ParsedStudentImportRow[]>([])

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
    entityType: 'academy',
    entityName: currentAcademy.name,
    slug: currentAcademy.slug,
    sport: currentAcademy.sport || 'Sports',
    city: currentAcademy.city,
    isVerified: currentAcademy.verificationStatus === 'verified',
  })

  // Data Refresh State
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  // 3-Step Onboarding Modal State
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/partner-signup' || window.location.pathname === '/academy/signup') return true
      const q = new URLSearchParams(window.location.search).get('onboarding')
      if (q === 'true') return true
      return !hasCompletedOnboarding() && registeredAcademies.every(a => !a.isCustom)
    }
    return false
  })
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1)
  const [onboardingMode, setOnboardingMode] = useState<'express' | 'detailed'>('express')
  const [onboardAcademyName, setOnboardAcademyName] = useState('')
  const [onboardSport, setOnboardSport] = useState('Cricket')
  const [onboardCity, setOnboardCity] = useState('')
  const [onboardDirectorName, setOnboardDirectorName] = useState('')
  const [onboardDirectorWhatsApp, setOnboardDirectorWhatsApp] = useState('')
  const [onboardUpiVpa, setOnboardUpiVpa] = useState('')
  const [onboardBatchName, setOnboardBatchName] = useState('Morning Elite Coaching Camp')
  const [onboardBatchDays, setOnboardBatchDays] = useState('Mon, Wed, Fri')
  const [onboardBatchTimings, setOnboardBatchTimings] = useState('06:30 AM – 08:30 AM')
  const [onboardBatchCapacity, setOnboardBatchCapacity] = useState(25)
  const [onboardBatchFee, setOnboardBatchFee] = useState(2500)
  const [onboardingError, setOnboardingError] = useState('')
  const [newlyCreatedAcademy, setNewlyCreatedAcademy] = useState<RegisteredAcademy | null>(null)

  // Student Fee Receipt Voucher View State
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<AcademyStudent | null>(null)

  // Coach Attendance Sheet Modal State
  const [activeAttendanceBatch, setActiveAttendanceBatch] = useState<AcademyBatch | null>(null)

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

  const handleStudentCsvInputChange = (text: string) => {
    setImportCsvText(text)
    if (!text.trim()) {
      setImportCsvErrors([])
      setImportPreviewRows([])
      return
    }
    const { valid, errors } = parseStudentCsvRows(text)
    setImportPreviewRows(valid)
    setImportCsvErrors(errors)
  }

  const handleConfirmStudentImportCsv = () => {
    if (importPreviewRows.length === 0) return
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)
    const defaultBatch = batches[0]

    importPreviewRows.forEach(row => {
      const targetBatch = batches.find(b => b.batchName.toLowerCase() === (row.batchName || '').toLowerCase()) || defaultBatch
      saveAcademyStudent({
        academySlug: selectedSlug,
        studentName: row.studentName,
        parentName: row.parentName,
        parentPhone: row.parentPhone,
        batchId: targetBatch?.id || 'batch-default',
        batchName: targetBatch?.batchName || 'General Squad',
        sport: row.sport || targetBatch?.sport || currentAcademy.sport || 'Sports',
        monthlyFee: row.monthlyFee || targetBatch?.monthlyFee || 2500,
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

  const handleExpressOnboardingSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (onboardAcademyName.trim().length < 3) {
      setOnboardingError('Please enter academy full name (at least 3 characters).')
      return
    }
    const cleanPhone = onboardDirectorWhatsApp.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setOnboardingError('Please enter a valid 10-digit WhatsApp number for parent lead routing.')
      return
    }

    const cityParts = (onboardCity.trim() || 'Delhi NCR, India').split(',')
    const cleanCity = cityParts[0]?.trim() || 'Delhi NCR'
    const cleanState = cityParts[1]?.trim() || 'India'
    const director = onboardDirectorName.trim() || `Coach ${onboardAcademyName.trim().split(' ')[0] || 'Director'}`
    const cleanSlugBase = onboardAcademyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const upi = onboardUpiVpa.trim() || `${cleanSlugBase || 'academy'}@okaxis`
    const batchName = onboardBatchName.trim() || 'Foundation Coaching Squad'

    const newAcad = registerCustomAcademy({
      name: onboardAcademyName.trim(),
      sport: onboardSport,
      city: cleanCity,
      state: cleanState,
      directorName: director,
      directorWhatsApp: cleanPhone,
      upiVpa: upi,
    })

    saveAcademyBatch({
      academySlug: newAcad.slug,
      batchName,
      sport: onboardSport,
      days: onboardBatchDays || 'Mon, Wed, Fri',
      timings: onboardBatchTimings || '06:30 AM – 08:30 AM',
      coachName: director,
      ageGroup: 'U-14 (8–14 yrs)',
      monthlyFee: Number(onboardBatchFee) || 2500,
      maxCapacity: Number(onboardBatchCapacity) || 25,
      isActive: true,
    })

    setNewlyCreatedAcademy(newAcad)
    setSelectedSlug(newAcad.slug)
    setOnboardingError('')
    setOnboardingStep(4)
    triggerRefresh()
  }

  const handleOnboardingStep1Next = (e: FormEvent) => {
    e.preventDefault()
    if (onboardAcademyName.trim().length < 3) {
      setOnboardingError('Please enter academy full name (at least 3 characters).')
      return
    }
    if (onboardDirectorName.trim().length < 2) {
      setOnboardingError('Please enter director or head coach name.')
      return
    }
    if (onboardDirectorWhatsApp.replace(/\D/g, '').length < 10) {
      setOnboardingError('Please enter a valid 10-digit WhatsApp number for parent routing.')
      return
    }
    setOnboardingError('')
    if (!onboardUpiVpa) {
      const clean = onboardAcademyName.toLowerCase().replace(/[^a-z0-9]/g, '')
      setOnboardUpiVpa(`${clean}@okaxis`)
    }
    setOnboardingStep(2)
  }

  const handleOnboardingStep2Next = (e: FormEvent) => {
    e.preventDefault()
    if (!onboardUpiVpa.trim() || !onboardUpiVpa.includes('@')) {
      setOnboardingError('Please enter a valid UPI ID (VPA) with an @ symbol (e.g. academy@okaxis).')
      return
    }
    setOnboardingError('')
    setOnboardingStep(3)
  }

  const handleOnboardingStep3Finish = (e: FormEvent) => {
    e.preventDefault()
    if (onboardBatchName.trim().length < 3) {
      setOnboardingError('Please enter training batch name (e.g. Under-14 Morning Squad).')
      return
    }

    const cityParts = onboardCity.split(',')
    const cleanCity = cityParts[0]?.trim() || 'India'
    const cleanState = cityParts[1]?.trim() || 'India'

    const newAcad = registerCustomAcademy({
      name: onboardAcademyName.trim(),
      sport: onboardSport,
      city: cleanCity,
      state: cleanState,
      directorName: onboardDirectorName.trim(),
      directorWhatsApp: onboardDirectorWhatsApp.replace(/\D/g, ''),
      upiVpa: onboardUpiVpa.trim(),
    })

    saveAcademyBatch({
      academySlug: newAcad.slug,
      batchName: onboardBatchName.trim(),
      sport: onboardSport,
      days: onboardBatchDays,
      timings: onboardBatchTimings,
      coachName: onboardDirectorName.trim() || 'Head Coach',
      ageGroup: 'U-14 (8–14 yrs)',
      monthlyFee: Number(onboardBatchFee) || 2500,
      maxCapacity: Number(onboardBatchCapacity) || 25,
      isActive: true,
    })

    setNewlyCreatedAcademy(newAcad)
    setSelectedSlug(newAcad.slug)
    setOnboardingError('')
    setOnboardingStep(4)
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
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
            >
              {registeredAcademies.map(a => (
                <option key={a.slug} value={a.slug}>
                  {a.name} ({a.city} · {a.sport}) {a.isCustom ? '★ Your Academy' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="academy-hub-btn-outline"
              onClick={() => {
                setOnboardingStep(1)
                setIsOnboardingModalOpen(true)
                setOnboardingError('')
              }}
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

      {/* Verification Status Alert Banner */}
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

      {/* KPI Metrics Strip */}
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
          className={`academy-hub-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <SiteIcon name="check-circle" size={18} /> Daily Attendance
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="academy-hub-btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => setActiveAttendanceBatch(batch)}
                      >
                        <SiteIcon name="calendar-check" size={12} />
                        <span>Attendance Sheet</span>
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer' }}
                        onClick={() => {
                          deleteAcademyBatch(batch.id)
                          triggerRefresh()
                        }}
                      >
                        Delete
                      </button>
                    </div>
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

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="academy-hub-btn-outline"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => {
                  setImportCsvText('')
                  setImportCsvErrors([])
                  setImportPreviewRows([])
                  setIsImportCsvModalOpen(true)
                }}
              >
                <SiteIcon name="upload" size={15} /> Import CSV
              </button>
              <button
                type="button"
                className="academy-hub-btn-outline"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => {
                  const csv = exportStudentsToCsv(students, currentAcademy.name)
                  downloadBlobFile(`${currentAcademy.slug}-student-roster.csv`, csv)
                }}
              >
                <SiteIcon name="download" size={15} /> Export CSV Roster
              </button>
              <button
                type="button"
                className="academy-hub-primary-btn"
                onClick={() => setIsAddStudentModalOpen(true)}
              >
                <SiteIcon name="plus" size={16} /> Enroll New Student
              </button>
            </div>
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

                        {student.feeStatus === 'paid' && (
                          <button
                            type="button"
                            className="crm-action-btn"
                            title="View / Share Digital Fee Receipt"
                            aria-label={`View fee receipt for ${student.studentName}`}
                            onClick={() => setActiveReceiptStudent(student)}
                          >
                            <SiteIcon name="download" size={15} />
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

      {/* TAB: Daily Attendance & WhatsApp Parent Roll Call */}
      {activeTab === 'attendance' && (
        <section aria-labelledby="attendance-section-heading">
          <div className="academy-hub-section-header">
            <div>
              <h2 id="attendance-section-heading" className="academy-hub-section-title">
                Daily Student Attendance &amp; WhatsApp Roll Call
              </h2>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                Mark on-ground attendance for morning &amp; evening squads with 1-click WhatsApp arrival notifications to parents.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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

          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {(() => {
              const batchStudents = students.filter(s => s.batchId === attendanceBatchId || batches.length === 1)
              const total = batchStudents.length
              const presentCount = batchStudents.filter(s => attendanceStatuses[s.id] === 'present').length
              const absentCount = batchStudents.filter(s => attendanceStatuses[s.id] === 'absent').length
              const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0

              return (
                <>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="coach-att-chip">Total Squad: {total}</span>
                    <span className="coach-att-chip present">Present: {presentCount} ({rate}%)</span>
                    <span className="coach-att-chip absent">Absent: {absentCount}</span>
                  </div>

                  <button
                    type="button"
                    className="academy-hub-primary-btn"
                    onClick={() => {
                      const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
                      const record: DailyAttendanceRecord = {
                        id: `att-${Date.now()}`,
                        entityType: 'academy',
                        entitySlug: selectedSlug,
                        batchId: attendanceBatchId,
                        batchName: batch?.batchName || 'Coaching Squad',
                        date: attendanceDate,
                        markedAt: new Date().toISOString(),
                        attendees: batchStudents.map(s => ({
                          studentId: s.id,
                          studentName: s.studentName,
                          parentPhone: s.parentPhone,
                          status: attendanceStatuses[s.id] || 'present',
                          checkInTime: batch?.timings.split('–')[0]?.trim() || '06:00 AM',
                        })),
                      }
                      saveDailyAttendance(record)
                      setAttendanceSavedNotice(true)
                      setTimeout(() => setAttendanceSavedNotice(false), 3000)
                    }}
                  >
                    <SiteIcon name="check" size={15} />
                    <span>{attendanceSavedNotice ? '✓ Attendance Saved' : 'Save Attendance Roll Call'}</span>
                  </button>
                </>
              )
            })()}
          </div>

          <div className="academy-hub-table-wrapper">
            <table className="academy-hub-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Parent Contact</th>
                  <th>Status (1-Tap Mark)</th>
                  <th>WhatsApp Parent Notice</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const batchStudents = students.filter(s => s.batchId === attendanceBatchId || batches.length === 1)
                  const currentBatch = batches.find(b => b.id === attendanceBatchId) || batches[0]

                  if (batchStudents.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No students enrolled in this batch yet.
                        </td>
                      </tr>
                    )
                  }

                  return batchStudents.map(s => {
                    const status = attendanceStatuses[s.id] || 'present'
                    const waAlertUrl = generateWhatsAppAttendanceAlertUrl({
                      studentName: s.studentName,
                      parentPhone: s.parentPhone,
                      status,
                      batchName: currentBatch?.batchName || 'Academy Squad',
                      entityName: currentAcademy.name,
                      date: attendanceDate,
                      checkInTime: currentBatch?.timings.split('–')[0]?.trim() || '06:00 AM',
                    })

                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.studentName}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{s.batchName}</div>
                        </td>
                        <td>
                          <span>{s.parentName}</span>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>+91 {s.parentPhone}</div>
                        </td>
                        <td>
                          <div className="coach-att-pills">
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'present' ? 'active present' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [s.id]: 'present' }))}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'absent' ? 'active absent' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [s.id]: 'absent' }))}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              className={`coach-att-btn ${status === 'excused' ? 'active excused' : ''}`}
                              onClick={() => setAttendanceStatuses(prev => ({ ...prev, [s.id]: 'excused' }))}
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
                            className={`crm-action-btn ${status === 'present' ? 'whatsapp' : ''}`}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: status === 'absent' ? '#dc2626' : undefined,
                            }}
                            title={`Send ${status} WhatsApp notice to ${s.parentName}`}
                          >
                            <SiteIcon name="phone" size={13} />
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

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href="/gate-checkin"
                onClick={e => onNavigate?.(e, '/gate-checkin')}
                className="academy-hub-btn-outline"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <SiteIcon name="shield-check" size={16} /> Open Gate Check-In Desk
              </a>
              <button
                type="button"
                className="academy-hub-primary-btn"
                onClick={() => setIsTrialPassModalOpen(true)}
              >
                <SiteIcon name="plus" size={16} /> Issue Trial Entry Pass
              </button>
            </div>
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
                  {(activeTrialPassView.status === 'used' || activeTrialPassView.checkedInAt) && (
                    <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      <SiteIcon name="badge-check" size={14} />
                      <span>Admitted on Ground {activeTrialPassView.checkedInAt ? `at ${new Date(activeTrialPassView.checkedInAt).toLocaleTimeString()}` : ''} {activeTrialPassView.checkedInBy ? `by ${activeTrialPassView.checkedInBy}` : ''}</span>
                    </div>
                  )}
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
                      <td>
                        {p.status === 'used' || p.checkedInAt ? (
                          <span className="lead-status-pill enrolled" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            ✓ Admitted
                          </span>
                        ) : p.status === 'cancelled' ? (
                          <span className="lead-status-pill lost">Cancelled</span>
                        ) : (
                          <span className="lead-status-pill enrolled">Valid</span>
                        )}
                      </td>
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

      {/* MODAL: Fee Receipt Voucher */}
      {activeReceiptStudent && (
        <div className="academy-hub-modal-overlay" onClick={() => setActiveReceiptStudent(null)}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Official Student Fee Receipt</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setActiveReceiptStudent(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="receipt-voucher-card">
              <div className="receipt-header">
                <span className="receipt-ref-badge">PAID · 0% PLATFORM FEE</span>
                <h4 style={{ margin: '0.4rem 0 0.2rem', color: '#065f46', fontSize: '1.1rem' }}>{currentAcademy.name}</h4>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Receipt Ref: REC-{activeReceiptStudent.id.toUpperCase()}</div>
              </div>

              <div style={{ textAlign: 'left', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div><strong>Student Name:</strong> {activeReceiptStudent.studentName}</div>
                <div><strong>Parent Name:</strong> {activeReceiptStudent.parentName} (+91 {activeReceiptStudent.parentPhone})</div>
                <div><strong>Batch:</strong> {activeReceiptStudent.batchName} ({activeReceiptStudent.sport})</div>
                <div><strong>Amount Paid:</strong> ₹{activeReceiptStudent.monthlyFee.toLocaleString('en-IN')}</div>
                <div><strong>Payment Date:</strong> {activeReceiptStudent.lastPaymentDate || 'Today'}</div>
                <div><strong>Next Fee Due Date:</strong> {activeReceiptStudent.nextDueDate}</div>
              </div>

              <div
                style={{ display: 'inline-block', padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.75rem' }}
                dangerouslySetInnerHTML={{
                  __html: generateQrSvgString(
                    JSON.stringify({
                      ref: `REC-${activeReceiptStudent.id}`,
                      student: activeReceiptStudent.studentName,
                      academy: currentAcademy.name,
                      amount: activeReceiptStudent.monthlyFee,
                      status: 'paid',
                    }),
                    { size: 140, color: '#047857' }
                  ),
                }}
              />

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <a
                  href={`https://wa.me/${activeReceiptStudent.parentPhone.startsWith('91') ? activeReceiptStudent.parentPhone : `91${activeReceiptStudent.parentPhone}`}?text=${encodeURIComponent(
                    `🧾 *Coaching Fee Receipt — ${currentAcademy.name}*\n\nDear ${activeReceiptStudent.parentName},\nFee receipt for *${activeReceiptStudent.studentName}* (${activeReceiptStudent.batchName}):\nAmount Paid: *₹${activeReceiptStudent.monthlyFee.toLocaleString('en-IN')}*\nNext Due Date: *${activeReceiptStudent.nextDueDate}*\n\nThank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academy-hub-primary-btn"
                  style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                >
                  <SiteIcon name="phone" size={15} />
                  <span>Share on WhatsApp</span>
                </a>
                <button
                  type="button"
                  className="academy-hub-public-page-btn"
                  onClick={() => window.print?.()}
                >
                  <SiteIcon name="download" size={15} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT STUDENTS FROM CSV / EXCEL */}
      {isImportCsvModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={() => setIsImportCsvModalOpen(false)}>
          <div className="academy-hub-modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Bulk Import Students from CSV / Excel</h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsImportCsvModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              <div className="coach-csv-template-box">
                <div>
                  <strong style={{ fontSize: '13px' }}>Need the format template?</strong>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                    Columns: Student Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee, Sport
                  </p>
                </div>
                <button
                  type="button"
                  className="academy-hub-btn-outline"
                  onClick={() => {
                    const sample = getSampleStudentCsv()
                    handleStudentCsvInputChange(sample)
                  }}
                  style={{ fontSize: '12px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                >
                  Load Sample Data
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Paste CSV / Spreadsheet Data
                </label>
                <textarea
                  className="coach-csv-textarea"
                  placeholder="Paste rows copied from Excel or CSV here..."
                  value={importCsvText}
                  onChange={e => handleStudentCsvInputChange(e.target.value)}
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
                  <strong style={{ fontSize: '12.5px', color: '#059669' }}>
                    ✓ {importPreviewRows.length} Students Ready to Import
                  </strong>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '6px' }}>
                    <table className="coach-csv-preview-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Parent Contact</th>
                          <th>Batch</th>
                          <th>Monthly Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.studentName}</td>
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
                  className="academy-hub-btn-outline"
                  onClick={() => setIsImportCsvModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="academy-hub-primary-btn"
                  disabled={importPreviewRows.length === 0}
                  onClick={handleConfirmStudentImportCsv}
                  style={{ opacity: importPreviewRows.length === 0 ? 0.5 : 1 }}
                >
                  Import {importPreviewRows.length} Students Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 3-Step Academy Director Onboarding Flow */}
      {isOnboardingModalOpen && (
        <div className="academy-hub-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-wizard-title">
          <div className="academy-hub-modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3 id="onboarding-wizard-title">
                {onboardingStep === 4
                  ? 'Academy Hub Ready!'
                  : onboardingMode === 'express'
                    ? '⚡ 30-Second Express Academy Launch'
                    : '⚡ Custom Academy Setup (3 Steps)'}
              </h3>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setIsOnboardingModalOpen(false)}
                aria-label="Close onboarding modal"
              >
                &times;
              </button>
            </div>

            {/* Mode Switcher: Express 30s vs Detailed 3-Step */}
            {onboardingStep < 4 && (
              <div className="onboarding-mode-switch" role="tablist">
                <button
                  type="button"
                  className={`onboarding-mode-btn ${onboardingMode === 'express' ? 'active' : ''}`}
                  onClick={() => setOnboardingMode('express')}
                >
                  ⚡ Express Launch (30 Seconds)
                </button>
                <button
                  type="button"
                  className={`onboarding-mode-btn ${onboardingMode === 'detailed' ? 'active' : ''}`}
                  onClick={() => setOnboardingMode('detailed')}
                >
                  🛠️ Detailed 3-Step Setup
                </button>
              </div>
            )}

            {/* Visual Step Progress Bar (Detailed Mode Only) */}
            {onboardingStep < 4 && onboardingMode === 'detailed' && (
              <div className="onboarding-steps-bar" aria-label="Setup steps">
                <div className={`onboarding-step-pill ${onboardingStep === 1 ? 'active' : onboardingStep > 1 ? 'completed' : ''}`}>
                  <span className="onboarding-step-num">1</span>
                  <span>Academy Profile</span>
                </div>
                <div className={`onboarding-step-pill ${onboardingStep === 2 ? 'active' : onboardingStep > 2 ? 'completed' : ''}`}>
                  <span className="onboarding-step-num">2</span>
                  <span>UPI Settlement</span>
                </div>
                <div className={`onboarding-step-pill ${onboardingStep === 3 ? 'active' : ''}`}>
                  <span className="onboarding-step-num">3</span>
                  <span>First Batch</span>
                </div>
              </div>
            )}

            {onboardingError && (
              <div style={{ padding: '0.6rem 0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
                {onboardingError}
              </div>
            )}

            {/* EXPRESS 30-SECOND ONBOARDING FORM */}
            {onboardingStep < 4 && onboardingMode === 'express' && (
              <form onSubmit={handleExpressOnboardingSubmit} className="academy-hub-form">
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
                  Register your sports academy in under 30 seconds. We automatically configure a starter squad batch and direct WhatsApp routing for parent trial inquiries.
                </p>

                <label>
                  Academy Full Name *
                  <input
                    type="text"
                    value={onboardAcademyName}
                    onChange={e => setOnboardAcademyName(e.target.value)}
                    placeholder="e.g. Shivaji Sports &amp; Cricket Academy"
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <label>
                    Primary Sport *
                    <select
                      value={onboardSport}
                      onChange={e => setOnboardSport(e.target.value)}
                    >
                      {['Cricket', 'Football', 'Badminton', 'Tennis', 'Swimming', 'Martial Arts', 'Basketball', 'Athletics', 'Multi-Sport'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Director / Coach WhatsApp *
                    <input
                      type="tel"
                      value={onboardDirectorWhatsApp}
                      onChange={e => setOnboardDirectorWhatsApp(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </label>
                </div>

                <label>
                  Academy City &amp; State *
                  <div className="onboarding-city-chips" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0.35rem 0' }}>
                    {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Jaipur', 'Chandigarh'].map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`onboarding-city-chip ${onboardCity.startsWith(c) ? 'active' : ''}`}
                        onClick={() => setOnboardCity(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={onboardCity}
                    onChange={e => setOnboardCity(e.target.value)}
                    placeholder="or type custom city, e.g. Pune, Maharashtra"
                  />
                </label>

                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  ✓ <strong>Starter Batch Included:</strong> Foundation Training Squad will be published automatically.<br />
                  ✓ <strong>0% Platform Commission:</strong> Direct UPI bank settlement. You can customize slot timings anytime in Hub settings.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="academy-hub-btn-outline"
                    onClick={() => setOnboardingMode('detailed')}
                    style={{ fontSize: '0.82rem' }}
                  >
                    Custom Batches &amp; UPI →
                  </button>
                  <button type="submit" className="academy-hub-primary-btn">
                    ⚡ Instant Register &amp; Launch Hub (30s) →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 1: Academy & Director Profile (Detailed Mode) */}
            {onboardingStep === 1 && onboardingMode === 'detailed' && (
              <form onSubmit={handleOnboardingStep1Next} className="academy-hub-form">
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
                  Register your sports academy on KhelGrid to manage parent enquiries, student batches, and fees with 100% free grassroots access.
                </p>

                <label>
                  Academy Full Name *
                  <input
                    type="text"
                    value={onboardAcademyName}
                    onChange={e => setOnboardAcademyName(e.target.value)}
                    placeholder="e.g. Shivaji Sports & Cricket Academy"
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <label>
                    Primary Sport *
                    <select
                      value={onboardSport}
                      onChange={e => setOnboardSport(e.target.value)}
                    >
                      {['Cricket', 'Football', 'Badminton', 'Tennis', 'Swimming', 'Martial Arts', 'Basketball', 'Athletics', 'Multi-Sport'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    City &amp; State *
                    <input
                      type="text"
                      value={onboardCity}
                      onChange={e => setOnboardCity(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      required
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <label>
                    Director / Head Coach Name *
                    <input
                      type="text"
                      value={onboardDirectorName}
                      onChange={e => setOnboardDirectorName(e.target.value)}
                      placeholder="e.g. Coach Anand Patil"
                      required
                    />
                  </label>

                  <label>
                    Director WhatsApp Mobile *
                    <input
                      type="tel"
                      value={onboardDirectorWhatsApp}
                      onChange={e => setOnboardDirectorWhatsApp(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="academy-hub-btn-outline"
                    onClick={() => setOnboardingMode('express')}
                  >
                    ← Express 30s Setup
                  </button>
                  <button type="submit" className="academy-hub-primary-btn">
                    Continue to Step 2: UPI Setup →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Instant UPI Settlement Setup */}
            {onboardingStep === 2 && onboardingMode === 'detailed' && (
              <form onSubmit={handleOnboardingStep2Next} className="academy-hub-form">
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
                  Set your official UPI ID (VPA). Parents pay student fees directly into your academy&apos;s bank account with <strong>0% platform deduction</strong>.
                </p>

                <label>
                  Academy / Director UPI ID (VPA) *
                  <input
                    type="text"
                    value={onboardUpiVpa}
                    onChange={e => setOnboardUpiVpa(e.target.value)}
                    placeholder="e.g. shivajiacademy@okaxis or 9823012345@paytm"
                    required
                  />
                  <small style={{ color: '#059669', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    ✓ 100% direct bank settlement into your account.
                  </small>
                </label>

                {/* Live Vector QR Code Preview */}
                <div className="onboarding-qr-preview-box">
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
                    Live Parent Payment QR Preview (GPay, PhonePe, Paytm)
                  </div>
                  <div
                    style={{ display: 'inline-block', padding: '0.5rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(
                        generateUpiPayLink({
                          vpa: onboardUpiVpa || 'academy@upi',
                          name: onboardAcademyName || 'Academy',
                          amount: 2500,
                          note: 'Coaching Fee',
                        }),
                        { size: 140, color: '#047857' }
                      ),
                    }}
                  />
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Settle directly to: <strong>{onboardUpiVpa || 'your-vpa@bank'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="academy-hub-btn-outline"
                    onClick={() => setOnboardingStep(1)}
                  >
                    ← Back
                  </button>
                  <button type="submit" className="academy-hub-primary-btn">
                    Continue to Step 3: First Batch →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Create First Training Batch */}
            {onboardingStep === 3 && onboardingMode === 'detailed' && (
              <form onSubmit={handleOnboardingStep3Finish} className="academy-hub-form">
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
                  Publish your initial training batch. It will appear on your academy profile for prospective parents and students.
                </p>

                <label>
                  Batch Name *
                  <input
                    type="text"
                    value={onboardBatchName}
                    onChange={e => setOnboardBatchName(e.target.value)}
                    placeholder="e.g. Morning Junior Cricket Squad"
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <label>
                    Schedule Days *
                    <input
                      type="text"
                      value={onboardBatchDays}
                      onChange={e => setOnboardBatchDays(e.target.value)}
                      placeholder="e.g. Mon, Wed, Fri"
                      required
                    />
                  </label>

                  <label>
                    Timings *
                    <input
                      type="text"
                      value={onboardBatchTimings}
                      onChange={e => setOnboardBatchTimings(e.target.value)}
                      placeholder="e.g. 06:30 AM – 08:30 AM"
                      required
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <label>
                    Max Slot Capacity *
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={onboardBatchCapacity}
                      onChange={e => setOnboardBatchCapacity(Number(e.target.value))}
                      required
                    />
                  </label>

                  <label>
                    Monthly Coaching Fee (₹) *
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={onboardBatchFee}
                      onChange={e => setOnboardBatchFee(Number(e.target.value))}
                      required
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="academy-hub-btn-outline"
                    onClick={() => setOnboardingStep(2)}
                  >
                    ← Back
                  </button>
                  <button type="submit" className="academy-hub-primary-btn">
                    Complete Setup &amp; Launch Academy Hub →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Celebratory Completion Screen */}
            {onboardingStep === 4 && newlyCreatedAcademy && (
              <div className="onboarding-celebration-card">
                <div className="onboarding-celebration-icon">
                  <SiteIcon name="award" size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#065f46', fontSize: '1.4rem' }}>
                  Congratulations, {newlyCreatedAcademy.name}!
                </h3>
                <p style={{ color: '#047857', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
                  Your Academy Operations Hub is now active with 100% Free Grassroots Launch Access.
                </p>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', textAlign: 'left', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  <div><strong>Official Sport:</strong> {newlyCreatedAcademy.sport}</div>
                  <div><strong>Location:</strong> {newlyCreatedAcademy.city}</div>
                  <div><strong>Head Coach:</strong> {newlyCreatedAcademy.directorName}</div>
                  <div><strong>Direct UPI Settlement:</strong> {newlyCreatedAcademy.upiVpa} (0% platform cut)</div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="academy-hub-primary-btn"
                    onClick={() => setIsOnboardingModalOpen(false)}
                  >
                    Open Academy Dashboard →
                  </button>
                  <a
                    href={`/academies/${newlyCreatedAcademy.slug}`}
                    className="academy-hub-public-page-btn"
                    onClick={e => onNavigate?.(e, `/academies/${newlyCreatedAcademy.slug}`)}
                  >
                    <SiteIcon name="external-link" size={15} />
                    <span>View Public Profile</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Coach Roll Call & Attendance Sheet */}
      {activeAttendanceBatch && (
        <div className="academy-hub-modal-overlay" onClick={() => setActiveAttendanceBatch(null)}>
          <div className="academy-hub-modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <div>
                <span className="enquiry-badge">📋 Official Coach Attendance Roster</span>
                <h3 style={{ margin: '0.25rem 0 0' }}>{activeAttendanceBatch.batchName}</h3>
              </div>
              <button
                type="button"
                className="academy-hub-modal-close"
                onClick={() => setActiveAttendanceBatch(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div><strong>Academy:</strong> {currentAcademy.name}</div>
              <div><strong>Head Coach:</strong> {activeAttendanceBatch.coachName} · <strong>Sport:</strong> {activeAttendanceBatch.sport}</div>
              <div><strong>Batch Schedule:</strong> {activeAttendanceBatch.days} ({activeAttendanceBatch.timings})</div>
              <div><strong>Enrolled Trainees:</strong> {students.filter(s => s.batchId === activeAttendanceBatch.id || s.batchName === activeAttendanceBatch.batchName).length} active students</div>
            </div>

            <div className="academy-hub-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="academy-hub-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Trainee Name</th>
                    <th>Fee Status</th>
                    <th>M</th>
                    <th>T</th>
                    <th>W</th>
                    <th>T</th>
                    <th>F</th>
                    <th>S</th>
                    <th>S</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => s.batchId === activeAttendanceBatch.id || s.batchName === activeAttendanceBatch.batchName)
                    .map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{s.studentName}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>+91 {s.parentPhone}</div>
                        </td>
                        <td>
                          <span className={`fee-status-pill ${s.feeStatus}`}>
                            {s.feeStatus.toUpperCase()}
                          </span>
                        </td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                        <td><input type="checkbox" /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="academy-hub-btn-outline"
                onClick={() => window.print?.()}
              >
                <SiteIcon name="download" size={15} /> Print Roster
              </button>
              <button
                type="button"
                className="academy-hub-primary-btn"
                onClick={() => setActiveAttendanceBatch(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
