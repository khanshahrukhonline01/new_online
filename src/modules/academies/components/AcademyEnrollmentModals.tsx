import { useEffect, useId, useState, type FormEvent } from 'react'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { CsvTransferControls } from '../../../shared/components/workflows/CsvTransferControls'
import { useFormState } from '../../../shared/hooks/useFormState'
import {
  getSampleStudentCsv,
  parseStudentCsvRows,
  type ParsedStudentImportRow,
} from '../../../shared/saas/saasSharedOperations'
import {
  createTenantBatch,
  createTenantStudent,
  recordTenantAuditLog,
  type DbTenant,
} from '../../../integrations/supabase/tenant-client'
import {
  addAcademyLead,
  createTrialPass,
  saveAcademyBatch,
  saveAcademyStudent,
  type AcademyBatch,
  type AcademyLead,
  type AcademyTrialPass,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyEnrollmentModalsProps {
  selectedSlug: string
  currentTenant: DbTenant | null
  currentAcademy: RegisteredAcademy
  batches: AcademyBatch[]
  isAddLeadModalOpen: boolean
  isAddBatchModalOpen: boolean
  isAddStudentModalOpen: boolean
  isTrialPassModalOpen: boolean
  isImportCsvModalOpen: boolean
  prefilledTrialLead?: { studentName: string; parentPhone: string } | null
  onCloseAddLead: () => void
  onCloseAddBatch: () => void
  onCloseAddStudent: () => void
  onCloseTrialPass: () => void
  onCloseImportCsv: () => void
  onTrialPassIssued: (pass: AcademyTrialPass) => void
  onRefresh: () => void
}

interface AddLeadFields extends Record<string, unknown> {
  parentName: string
  parentPhone: string
  studentName: string
  studentAge: string
  sport: string
  batchName: string
  requestType: AcademyLead['requestType']
  notes: string
}

interface AddBatchFields extends Record<string, unknown> {
  batchName: string
  sport: string
  days: string
  timings: string
  coach: string
  ageGroup: string
  monthlyFee: number
  capacity: number
}

interface AddStudentFields extends Record<string, unknown> {
  studentName: string
  parentName: string
  parentPhone: string
  batchId: string
  monthlyFee: number
}

interface TrialPassFields extends Record<string, unknown> {
  studentName: string
  parentPhone: string
  trialDate: string
  reportingTime: string
  venueAddress: string
}

function defaultTrialDate() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().slice(0, 10)
}

/**
 * Orchestrates walk-in lead intake, batch creation, student enrollment,
 * CSV bulk import, and selection trial pass issuance modals.
 */
export function AcademyEnrollmentModals({
  selectedSlug,
  currentTenant,
  currentAcademy,
  batches,
  isAddLeadModalOpen,
  isAddBatchModalOpen,
  isAddStudentModalOpen,
  isTrialPassModalOpen,
  isImportCsvModalOpen,
  prefilledTrialLead,
  onCloseAddLead,
  onCloseAddBatch,
  onCloseAddStudent,
  onCloseTrialPass,
  onCloseImportCsv,
  onTrialPassIssued,
  onRefresh,
}: AcademyEnrollmentModalsProps) {
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

  const leadForm = useFormState<AddLeadFields>({
    parentName: '',
    parentPhone: '',
    studentName: '',
    studentAge: '12',
    sport: currentAcademy.sport || 'Football',
    batchName: '',
    requestType: 'free_trial',
    notes: '',
  })

  const batchForm = useFormState<AddBatchFields>({
    batchName: '',
    sport: currentAcademy.sport || 'Football',
    days: 'Mon, Wed, Fri',
    timings: '06:00 AM – 08:00 AM',
    coach: '',
    ageGroup: 'U-14 (10–14 yrs)',
    monthlyFee: 2000,
    capacity: 25,
  })

  const studentForm = useFormState<AddStudentFields>({
    studentName: '',
    parentName: '',
    parentPhone: '',
    batchId: batches[0]?.id || '',
    monthlyFee: batches[0]?.monthlyFee || 2000,
  })

  const passForm = useFormState<TrialPassFields>({
    studentName: prefilledTrialLead?.studentName || '',
    parentPhone: prefilledTrialLead?.parentPhone || '',
    trialDate: defaultTrialDate(),
    reportingTime: '07:00 AM',
    venueAddress: `${currentAcademy.name} Ground`,
  })

  useEffect(() => {
    if (prefilledTrialLead) {
      passForm.setField('studentName', prefilledTrialLead.studentName)
      passForm.setField('parentPhone', prefilledTrialLead.parentPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledTrialLead])

  useEffect(() => {
    passForm.setField('venueAddress', `${currentAcademy.name} Ground`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAcademy.name])

  const [importCsvText, setImportCsvText] = useState('')
  const [importCsvErrors, setImportCsvErrors] = useState<string[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<ParsedStudentImportRow[]>([])

  const handleAddLeadSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = leadForm.fields
    if (!f.parentName || !f.parentPhone || !f.studentName) return

    addAcademyLead({
      academySlug: selectedSlug,
      parentName: f.parentName.trim(),
      parentPhone: f.parentPhone.trim(),
      studentName: f.studentName.trim(),
      studentAge: f.studentAge,
      sport: f.sport,
      batchType: 'weekday',
      batchName: f.batchName.trim() || 'General Intake',
      requestType: f.requestType,
      status: 'new',
      notes: f.notes.trim() || 'Direct walk-in lead added via Academy Hub.',
    })

    onCloseAddLead()
    leadForm.reset({ sport: currentAcademy.sport || 'Football' })
    onRefresh()
  }

  const handleAddBatchSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = batchForm.fields
    if (!f.batchName) return

    saveAcademyBatch({
      academySlug: selectedSlug,
      batchName: f.batchName.trim(),
      sport: f.sport,
      days: f.days.trim(),
      timings: f.timings.trim(),
      coachName: f.coach.trim() || 'Academy Coaching Staff',
      ageGroup: f.ageGroup.trim(),
      monthlyFee: Number(f.monthlyFee) || 1500,
      maxCapacity: Number(f.capacity) || 20,
      isActive: true,
    })

    if (currentTenant?.id) {
      createTenantBatch({
        tenant_id: currentTenant.id,
        batch_name: f.batchName.trim(),
        sport: f.sport,
        days: f.days.trim(),
        timings: f.timings.trim(),
        coach_name: f.coach.trim() || 'Academy Coaching Staff',
        age_group: f.ageGroup.trim(),
        monthly_fee: Number(f.monthlyFee) || 1500,
        max_capacity: Number(f.capacity) || 20,
        is_active: true,
      }).catch(err => console.warn('[AcademyHub] Remote batch create error:', err))

      recordTenantAuditLog({
        tenantId: currentTenant.id,
        action: 'create_batch',
        entityType: 'tenant_batches',
        details: { batchName: f.batchName.trim() },
      }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
    }

    onCloseAddBatch()
    batchForm.setField('batchName', '')
    batchForm.setField('coach', '')
    onRefresh()
  }

  const handleAddStudentSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = studentForm.fields
    if (!f.studentName || !f.parentPhone) return

    const selectedBatch = batches.find(b => b.id === f.batchId) || batches[0]
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)

    saveAcademyStudent({
      academySlug: selectedSlug,
      studentName: f.studentName.trim(),
      parentName: f.parentName.trim() || 'Parent',
      parentPhone: f.parentPhone.trim(),
      batchId: selectedBatch?.id || 'batch-default',
      batchName: selectedBatch?.batchName || 'General Squad',
      sport: selectedBatch?.sport || currentAcademy.sport || 'Sports',
      monthlyFee: Number(f.monthlyFee) || 2000,
      feeStatus: 'paid',
      lastPaymentDate: now.toISOString().slice(0, 10),
      nextDueDate: nextMonth.toISOString().slice(0, 10),
    })

    if (currentTenant?.id) {
      createTenantStudent({
        tenant_id: currentTenant.id,
        batch_id: selectedBatch?.id && selectedBatch.id.length > 30 ? selectedBatch.id : undefined,
        student_name: f.studentName.trim(),
        parent_name: f.parentName.trim() || 'Parent',
        parent_phone: f.parentPhone.trim(),
        monthly_fee: Number(f.monthlyFee) || 2000,
        fee_status: 'paid',
        is_active: true,
      }).catch(err => console.warn('[AcademyHub] Remote student create error:', err))

      recordTenantAuditLog({
        tenantId: currentTenant.id,
        action: 'enroll_student',
        entityType: 'tenant_students',
        details: { studentName: f.studentName.trim() },
      }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
    }

    onCloseAddStudent()
    studentForm.setField('studentName', '')
    studentForm.setField('parentName', '')
    studentForm.setField('parentPhone', '')
    onRefresh()
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

      if (currentTenant?.id) {
        createTenantStudent({
          tenant_id: currentTenant.id,
          batch_id: targetBatch?.id && targetBatch.id.length > 30 ? targetBatch.id : undefined,
          student_name: row.studentName,
          parent_name: row.parentName,
          parent_phone: row.parentPhone,
          monthly_fee: row.monthlyFee || targetBatch?.monthlyFee || 2500,
          fee_status: 'paid',
          is_active: true,
        }).catch(err => console.warn('[AcademyHub] Remote CSV import student error:', err))
      }
    })

    if (currentTenant?.id) {
      recordTenantAuditLog({
        tenantId: currentTenant.id,
        action: 'bulk_import_students_csv',
        entityType: 'tenant_students',
        details: { count: importPreviewRows.length },
      }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
    }

    onCloseImportCsv()
    setImportCsvText('')
    setImportPreviewRows([])
    setImportCsvErrors([])
    onRefresh()
  }

  const handleGenerateTrialPassSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = passForm.fields
    if (!f.studentName || !f.parentPhone) return

    const pass = createTrialPass({
      academySlug: selectedSlug,
      academyName: currentAcademy.name,
      studentName: f.studentName.trim(),
      parentPhone: f.parentPhone.trim(),
      sport: currentAcademy.sport || 'Sports',
      trialDate: f.trialDate,
      reportingTime: f.reportingTime,
      venueAddress: f.venueAddress.trim(),
    })

    onCloseTrialPass()
    onTrialPassIssued(pass)
    passForm.setField('studentName', '')
    passForm.setField('parentPhone', '')
    onRefresh()
  }

  return (
    <>
      {isAddLeadModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseAddLead}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Add Walk-in or Offline Parent Lead</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseAddLead} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="academy-hub-form">
              <label htmlFor={addLeadParentNameId}>
                Parent / Guardian Name *
                <input
                  id={addLeadParentNameId}
                  required
                  value={leadForm.fields.parentName}
                  onChange={e => leadForm.setField('parentName', e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                />
              </label>

              <label htmlFor={addLeadParentPhoneId}>
                Parent WhatsApp / Mobile *
                <input
                  id={addLeadParentPhoneId}
                  required
                  value={leadForm.fields.parentPhone}
                  onChange={e => leadForm.setField('parentPhone', e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <label htmlFor={addLeadStudentNameId}>
                Student / Candidate Name *
                <input
                  id={addLeadStudentNameId}
                  required
                  value={leadForm.fields.studentName}
                  onChange={e => leadForm.setField('studentName', e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addLeadStudentAgeId}>
                  Age (years)
                  <input
                    id={addLeadStudentAgeId}
                    type="number"
                    value={leadForm.fields.studentAge}
                    onChange={e => leadForm.setField('studentAge', e.target.value)}
                  />
                </label>
                <label htmlFor={addLeadSportId}>
                  Sport
                  <input
                    id={addLeadSportId}
                    value={leadForm.fields.sport}
                    onChange={e => leadForm.setField('sport', e.target.value)}
                  />
                </label>
              </div>

              <label htmlFor={addLeadBatchNameId}>
                Preferred Batch / Squad
                <input
                  id={addLeadBatchNameId}
                  value={leadForm.fields.batchName}
                  onChange={e => leadForm.setField('batchName', e.target.value)}
                  placeholder="e.g. Morning Elite U-14"
                />
              </label>

              <label htmlFor={addLeadRequestTypeId}>
                Admission Interest
                <select
                  id={addLeadRequestTypeId}
                  value={leadForm.fields.requestType}
                  onChange={e => leadForm.setField('requestType', e.target.value as AcademyLead['requestType'])}
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
                  value={leadForm.fields.notes}
                  onChange={e => leadForm.setField('notes', e.target.value)}
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

      {isAddBatchModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseAddBatch}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Create New Coaching Batch</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseAddBatch} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="academy-hub-form">
              <label htmlFor={addBatchNameId}>
                Batch Title *
                <input
                  id={addBatchNameId}
                  required
                  value={batchForm.fields.batchName}
                  onChange={e => batchForm.setField('batchName', e.target.value)}
                  placeholder="e.g. Morning Elite U-14 Youth Squad"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchSportId}>
                  Sport
                  <input
                    id={addBatchSportId}
                    value={batchForm.fields.sport}
                    onChange={e => batchForm.setField('sport', e.target.value)}
                  />
                </label>
                <label htmlFor={addBatchDaysId}>
                  Training Days
                  <input
                    id={addBatchDaysId}
                    value={batchForm.fields.days}
                    onChange={e => batchForm.setField('days', e.target.value)}
                    placeholder="e.g. Tue, Thu, Sat"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchTimingsId}>
                  Batch Timings
                  <input
                    id={addBatchTimingsId}
                    value={batchForm.fields.timings}
                    onChange={e => batchForm.setField('timings', e.target.value)}
                    placeholder="e.g. 06:00 AM – 08:00 AM"
                  />
                </label>
                <label htmlFor={addBatchAgeGroupId}>
                  Age Category
                  <input
                    id={addBatchAgeGroupId}
                    value={batchForm.fields.ageGroup}
                    onChange={e => batchForm.setField('ageGroup', e.target.value)}
                    placeholder="e.g. U-14 (10–14 yrs)"
                  />
                </label>
              </div>

              <label htmlFor={addBatchCoachId}>
                Allocated Coach Name &amp; License
                <input
                  id={addBatchCoachId}
                  value={batchForm.fields.coach}
                  onChange={e => batchForm.setField('coach', e.target.value)}
                  placeholder="e.g. Coach Suresh (AFC A-License)"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={addBatchMonthlyFeeId}>
                  Monthly Fee (₹)
                  <input
                    id={addBatchMonthlyFeeId}
                    type="number"
                    value={batchForm.fields.monthlyFee}
                    onChange={e => batchForm.setField('monthlyFee', Number(e.target.value))}
                  />
                </label>
                <label htmlFor={addBatchCapacityId}>
                  Slot Capacity
                  <input
                    id={addBatchCapacityId}
                    type="number"
                    value={batchForm.fields.capacity}
                    onChange={e => batchForm.setField('capacity', Number(e.target.value))}
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

      {isAddStudentModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseAddStudent}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Enroll Student into Roster</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseAddStudent} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="academy-hub-form">
              <label htmlFor={addStudentNameId}>
                Student Full Name *
                <input
                  id={addStudentNameId}
                  required
                  value={studentForm.fields.studentName}
                  onChange={e => studentForm.setField('studentName', e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                />
              </label>

              <label htmlFor={addStudentParentNameId}>
                Parent Name
                <input
                  id={addStudentParentNameId}
                  value={studentForm.fields.parentName}
                  onChange={e => studentForm.setField('parentName', e.target.value)}
                  placeholder="e.g. Vikas Sharma"
                />
              </label>

              <label htmlFor={addStudentParentPhoneId}>
                Parent Phone / WhatsApp *
                <input
                  id={addStudentParentPhoneId}
                  required
                  value={studentForm.fields.parentPhone}
                  onChange={e => studentForm.setField('parentPhone', e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <label htmlFor={addStudentBatchId}>
                Assigned Batch
                <select
                  id={addStudentBatchId}
                  value={studentForm.fields.batchId}
                  onChange={e => {
                    studentForm.setField('batchId', e.target.value)
                    const b = batches.find(item => item.id === e.target.value)
                    if (b) studentForm.setField('monthlyFee', b.monthlyFee)
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
                  value={studentForm.fields.monthlyFee}
                  onChange={e => studentForm.setField('monthlyFee', Number(e.target.value))}
                />
              </label>

              <button type="submit" className="academy-hub-primary-btn">
                Add to Student Roster
              </button>
            </form>
          </div>
        </div>
      )}

      {isTrialPassModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseTrialPass}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Issue Selection Trial Pass</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseTrialPass} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleGenerateTrialPassSubmit} className="academy-hub-form">
              <label htmlFor={trialPassStudentNameId}>
                Candidate Name *
                <input
                  id={trialPassStudentNameId}
                  required
                  value={passForm.fields.studentName}
                  onChange={e => passForm.setField('studentName', e.target.value)}
                  placeholder="e.g. Vihaan Verma"
                />
              </label>

              <label htmlFor={trialPassParentPhoneId}>
                Parent Mobile (for WhatsApp Delivery) *
                <input
                  id={trialPassParentPhoneId}
                  required
                  value={passForm.fields.parentPhone}
                  onChange={e => passForm.setField('parentPhone', e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label htmlFor={trialPassDateId}>
                  Trial Date
                  <input
                    id={trialPassDateId}
                    type="date"
                    value={passForm.fields.trialDate}
                    onChange={e => passForm.setField('trialDate', e.target.value)}
                  />
                </label>
                <label htmlFor={trialPassTimeId}>
                  Reporting Time
                  <input
                    id={trialPassTimeId}
                    value={passForm.fields.reportingTime}
                    onChange={e => passForm.setField('reportingTime', e.target.value)}
                    placeholder="e.g. 06:30 AM"
                  />
                </label>
              </div>

              <label htmlFor={trialPassVenueId}>
                Trial Venue / Pitch
                <input
                  id={trialPassVenueId}
                  value={passForm.fields.venueAddress}
                  onChange={e => passForm.setField('venueAddress', e.target.value)}
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

      <WorkspaceDetailDrawer
        open={isImportCsvModalOpen}
        onClose={onCloseImportCsv}
        title="Bulk Import Students from CSV / Excel"
        width={620}
      >
        <CsvTransferControls
          title="Import Student Roster CSV"
          description="Columns: Student Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee, Sport"
          onDownloadSample={() => handleStudentCsvInputChange(getSampleStudentCsv())}
          onImportCsvText={text => handleStudentCsvInputChange(text)}
        />

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '4px' }}>
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
          <div className="kg-status-alert is-error">
            <div>
              <strong>Validation Notices:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                {importCsvErrors.slice(0, 3).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {importPreviewRows.length > 0 && (
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--kg-emerald)' }}>
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

        <div className="host-action-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="kg-btn kg-btn-ghost kg-touch-target" onClick={onCloseImportCsv}>
            Cancel
          </button>
          <button
            type="button"
            className="kg-btn kg-btn-primary kg-touch-target"
            disabled={importPreviewRows.length === 0}
            onClick={handleConfirmStudentImportCsv}
          >
            Import {importPreviewRows.length} Students Now
          </button>
        </div>
      </WorkspaceDetailDrawer>
    </>
  )
}
