import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { CsvTransferControls } from '../../../shared/components/workflows/CsvTransferControls'
import { FeeReceiptDrawerContent } from '../../../shared/components/workflows/FeeReceiptDrawerContent'
import { useFormState } from '../../../shared/hooks/useFormState'
import {
  generateWhatsAppReceiptMessageUrl,
  getSampleCoachTraineeCsv,
  parseCoachTraineeCsvRows,
  type DigitalFeeReceipt,
  type ParsedCoachTraineeImportRow,
} from '../../../shared/saas/saasSharedOperations'
import {
  awardCoachEndorsement,
  calculateCombinePercentile,
  registerCustomCoach,
  saveCoachBatch,
  saveCoachTrainee,
  saveCoachTrainingPlan,
  saveTraineeCombine,
  type CoachBatch,
  type CoachTrainee,
  type RegisteredCoach,
} from '../coachSaaSClient'

export interface CoachActionModalsProps {
  selectedSlug: string
  currentCoach: RegisteredCoach
  batches: CoachBatch[]
  trainees: CoachTrainee[]
  isAddTraineeModalOpen: boolean
  isAddBatchModalOpen: boolean
  isRegisterCoachModalOpen: boolean
  isImportCsvModalOpen: boolean
  isAddCombineModalOpen: boolean
  isAddPlanModalOpen: boolean
  isAwardEndorsementModalOpen: boolean
  activeReceipt: DigitalFeeReceipt | null
  onCloseAddTrainee: () => void
  onCloseAddBatch: () => void
  onCloseRegisterCoach: () => void
  onCloseImportCsv: () => void
  onCloseAddCombine: () => void
  onCloseAddPlan: () => void
  onCloseAwardEndorsement: () => void
  onCloseReceipt: () => void
  onSelectCoachSlug: (slug: string) => void
  onRefresh: () => void
}

interface AddTraineeFields extends Record<string, unknown> {
  traineeName: string
  parentName: string
  parentPhone: string
  ageCategory: string
  batchId: string
  monthlyFee: number
}

interface AddBatchFields extends Record<string, unknown> {
  batchName: string
  sport: string
  days: string
  timings: string
  ageGroup: string
  capacity: number
  monthlyFee: number
}

interface RegisterCoachFields extends Record<string, unknown> {
  name: string
  sport: string
  city: string
  phone: string
  email: string
  certification: string
  monthlyFee: number
  upiVpa: string
}

interface CombineFields extends Record<string, unknown> {
  traineeId: string
  traineeName: string
  ageGroup: string
  sprint30m: number | undefined
  verticalJump: number | undefined
  yoYoLevel: number | undefined
  proAgility: number | undefined
}

interface PlanFields extends Record<string, unknown> {
  batchId: string
  weekTitle: string
  focusArea: string
  drill1Day: string
  drill1Title: string
  drill1Min: number
  drill1Notes: string
  drill2Day: string
  drill2Title: string
  drill2Min: number
  drill2Notes: string
  drill3Day: string
  drill3Title: string
  drill3Min: number
  drill3Notes: string
  homework: string
}

interface EndorsementFields extends Record<string, unknown> {
  traineeName: string
  sport: string
  badgeTitle: string
  passportId: string
  statement: string
}

/**
 * Orchestrates all Coach creation, CSV import, receipt, combine, training plan,
 * and endorsement modals using structured useFormState hooks.
 */
export function CoachActionModals({
  selectedSlug,
  currentCoach,
  batches,
  trainees,
  isAddTraineeModalOpen,
  isAddBatchModalOpen,
  isRegisterCoachModalOpen,
  isImportCsvModalOpen,
  isAddCombineModalOpen,
  isAddPlanModalOpen,
  isAwardEndorsementModalOpen,
  activeReceipt,
  onCloseAddTrainee,
  onCloseAddBatch,
  onCloseRegisterCoach,
  onCloseImportCsv,
  onCloseAddCombine,
  onCloseAddPlan,
  onCloseAwardEndorsement,
  onCloseReceipt,
  onSelectCoachSlug,
  onRefresh,
}: CoachActionModalsProps) {
  const traineeForm = useFormState<AddTraineeFields>({
    traineeName: '',
    parentName: '',
    parentPhone: '',
    ageCategory: 'U-14',
    batchId: batches[0]?.id || '',
    monthlyFee: batches[0]?.monthlyFee || 3500,
  })

  const batchForm = useFormState<AddBatchFields>({
    batchName: '',
    sport: currentCoach.sport || 'Cricket',
    days: 'Mon, Wed, Fri',
    timings: '06:30 AM – 08:30 AM',
    ageGroup: 'U-14 (10–14 yrs)',
    capacity: 20,
    monthlyFee: 3500,
  })

  const coachForm = useFormState<RegisterCoachFields>({
    name: '',
    sport: 'Cricket',
    city: 'Delhi NCR',
    phone: '',
    email: '',
    certification: '',
    monthlyFee: 3500,
    upiVpa: '',
  })

  const combineForm = useFormState<CombineFields>({
    traineeId: '',
    traineeName: '',
    ageGroup: 'U-15',
    sprint30m: 4.28,
    verticalJump: 48,
    yoYoLevel: 16.2,
    proAgility: 4.75,
  })

  const planForm = useFormState<PlanFields>({
    batchId: batches[0]?.id || '',
    weekTitle: 'Week 4: Precision Fast Bowling & Seam Control',
    focusArea: 'Wrist position, upright seam, Yorker execution at death overs',
    drill1Day: 'Mon',
    drill1Title: 'Static Wrist Snaps & 4-Stump Spot Bowling',
    drill1Min: 45,
    drill1Notes: '3 sets of 18 deliveries onto a good-length chalk zone.',
    drill2Day: 'Wed',
    drill2Title: 'Run-up Rhythm & Crease Deceleration Checks',
    drill2Min: 40,
    drill2Notes: 'High-speed camera video recording of front-foot landing.',
    drill3Day: 'Fri',
    drill3Title: 'Match Simulation: 2 Death Overs Target Practice',
    drill3Min: 60,
    drill3Notes: 'Cones at blockhole and wide yorker line with fielders.',
    homework: '100 tennis ball wall-rebounds catching with soft hands + 30 core planks.',
  })

  const endorseForm = useFormState<EndorsementFields>({
    traineeName: trainees[0]?.traineeName || 'Arjun Mehra',
    sport: currentCoach.sport || 'Cricket',
    badgeTitle: 'Fast-Bowling Elite Prodigy',
    passportId: 'IN-ATH-2026-DEL-089',
    statement:
      'Demonstrated extraordinary rotational velocity, clean gather, and rapid seam release. Highly disciplined athlete primed for state U-16 trials.',
  })

  const [importCsvText, setImportCsvText] = useState('')
  const [importCsvErrors, setImportCsvErrors] = useState<string[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<ParsedCoachTraineeImportRow[]>([])

  const handleAddTraineeSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!traineeForm.fields.traineeName.trim() || !traineeForm.fields.parentPhone.trim()) return

    const matchedBatch = batches.find(b => b.id === traineeForm.fields.batchId)
    saveCoachTrainee({
      coachSlug: selectedSlug,
      traineeName: traineeForm.fields.traineeName.trim(),
      parentName: traineeForm.fields.parentName.trim() || 'Parent',
      parentPhone: traineeForm.fields.parentPhone.trim(),
      sport: currentCoach.sport,
      ageCategory: traineeForm.fields.ageCategory,
      batchId: traineeForm.fields.batchId,
      batchName: matchedBatch?.batchName || 'Regular Coaching Batch',
      monthlyFee: traineeForm.fields.monthlyFee || 3500,
      feeStatus: 'paid',
      nextDueDate: '15 Dec 2026',
      upiVpa: currentCoach.upiVpa,
    })

    onCloseAddTrainee()
    traineeForm.reset({
      batchId: batches[0]?.id || '',
      monthlyFee: batches[0]?.monthlyFee || 3500,
    })
    onRefresh()
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

    onCloseImportCsv()
    setImportCsvText('')
    setImportPreviewRows([])
    setImportCsvErrors([])
    onRefresh()
  }

  const handleAddBatchSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!batchForm.fields.batchName.trim()) return

    saveCoachBatch({
      coachSlug: selectedSlug,
      batchName: batchForm.fields.batchName.trim(),
      sport: batchForm.fields.sport,
      days: batchForm.fields.days,
      timings: batchForm.fields.timings,
      ageGroup: batchForm.fields.ageGroup,
      monthlyFee: batchForm.fields.monthlyFee,
      maxCapacity: batchForm.fields.capacity,
      isActive: true,
    })

    onCloseAddBatch()
    batchForm.setField('batchName', '')
    onRefresh()
  }

  const handleRegisterCoachSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!coachForm.fields.name.trim() || !coachForm.fields.phone.trim()) return

    const newCoach = registerCustomCoach({
      name: coachForm.fields.name.trim(),
      sport: coachForm.fields.sport,
      city: coachForm.fields.city,
      phone: coachForm.fields.phone.trim(),
      email:
        coachForm.fields.email.trim() ||
        `${coachForm.fields.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@coach.khelgrid.com`,
      certification: coachForm.fields.certification,
      monthlyFee: coachForm.fields.monthlyFee,
      upiVpa: coachForm.fields.upiVpa.trim(),
    })

    onSelectCoachSlug(newCoach.slug)
    onCloseRegisterCoach()
    coachForm.reset()
    onRefresh()
  }

  const handleSaveCombineSubmit = (e: FormEvent) => {
    e.preventDefault()
    const targetTrainee = trainees.find(t => t.id === combineForm.fields.traineeId)
    const name = targetTrainee ? targetTrainee.traineeName : (combineForm.fields.traineeName.trim() || 'Athlete')
    const { percentile, tier } = calculateCombinePercentile({
      ageGroup: combineForm.fields.ageGroup,
      sprint30m: combineForm.fields.sprint30m,
      verticalJump: combineForm.fields.verticalJump,
      yoYoLevel: combineForm.fields.yoYoLevel,
      proAgility: combineForm.fields.proAgility,
    })

    saveTraineeCombine({
      coachSlug: selectedSlug,
      traineeId: combineForm.fields.traineeId || `tr-${Date.now()}`,
      traineeName: name,
      ageGroup: combineForm.fields.ageGroup,
      testDate: new Date().toISOString().slice(0, 10),
      sprint30mSeconds: combineForm.fields.sprint30m,
      verticalJumpCm: combineForm.fields.verticalJump,
      yoYoBeepLevel: combineForm.fields.yoYoLevel ? String(combineForm.fields.yoYoLevel) : undefined,
      proAgilitySeconds: combineForm.fields.proAgility,
      compositePercentile: percentile,
      tier,
      notes: `Standard combine test for ${combineForm.fields.ageGroup} category.`,
    })

    onCloseAddCombine()
    onRefresh()
  }

  const handleSavePlanSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = planForm.fields
    const targetBatch = batches.find(b => b.id === f.batchId) || batches[0]
    saveCoachTrainingPlan({
      coachSlug: selectedSlug,
      batchId: targetBatch?.id || 'batch-all',
      batchName: targetBatch?.batchName || 'Elite Coaching Batch',
      weekTitle: f.weekTitle,
      focusArea: f.focusArea,
      drills: [
        { day: f.drill1Day, title: f.drill1Title, durationMinutes: f.drill1Min, instructions: f.drill1Notes },
        { day: f.drill2Day, title: f.drill2Title, durationMinutes: f.drill2Min, instructions: f.drill2Notes },
        { day: f.drill3Day, title: f.drill3Title, durationMinutes: f.drill3Min, instructions: f.drill3Notes },
      ],
      homeworkChallenge: f.homework,
    })

    onCloseAddPlan()
    onRefresh()
  }

  const handleAwardEndorsementSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!endorseForm.fields.traineeName.trim() || !endorseForm.fields.statement.trim()) return

    awardCoachEndorsement({
      coachSlug: selectedSlug,
      coachName: currentCoach.name,
      coachCertification: currentCoach.certification,
      traineeName: endorseForm.fields.traineeName.trim(),
      traineeId: endorseForm.fields.passportId.trim() || 'IN-ATH-2026-PENDING',
      sport: endorseForm.fields.sport,
      badgeTitle: endorseForm.fields.badgeTitle,
      endorsementText: endorseForm.fields.statement.trim(),
    })

    onCloseAwardEndorsement()
    onRefresh()
  }

  const combinePreview = calculateCombinePercentile({
    ageGroup: combineForm.fields.ageGroup,
    sprint30m: combineForm.fields.sprint30m,
    verticalJump: combineForm.fields.verticalJump,
    yoYoLevel: combineForm.fields.yoYoLevel,
    proAgility: combineForm.fields.proAgility,
  })

  return (
    <>
      {isAddTraineeModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseAddTrainee}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Add New Trainee</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseAddTrainee}>
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
                  value={traineeForm.fields.traineeName}
                  onChange={e => traineeForm.setField('traineeName', e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Parent Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alok Sharma"
                    value={traineeForm.fields.parentName}
                    onChange={e => traineeForm.setField('parentName', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Parent Phone (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={traineeForm.fields.parentPhone}
                    onChange={e => traineeForm.setField('parentPhone', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Age Category</label>
                  <select value={traineeForm.fields.ageCategory} onChange={e => traineeForm.setField('ageCategory', e.target.value)}>
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
                    value={traineeForm.fields.batchId}
                    onChange={e => {
                      traineeForm.setField('batchId', e.target.value)
                      const b = batches.find(item => item.id === e.target.value)
                      if (b) traineeForm.setField('monthlyFee', b.monthlyFee)
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
                  value={traineeForm.fields.monthlyFee}
                  onChange={e => traineeForm.setField('monthlyFee', Number(e.target.value))}
                />
              </div>

              <button type="submit" className="coach-primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Add Trainee to Roster
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddBatchModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseAddBatch}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Create Coaching Batch</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseAddBatch}>
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
                    value={batchForm.fields.batchName}
                    onChange={e => batchForm.setField('batchName', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Sport</label>
                  <select
                    value={batchForm.fields.sport}
                    onChange={e => batchForm.setField('sport', e.target.value)}
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
                    value={batchForm.fields.days}
                    onChange={e => batchForm.setField('days', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Timings</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 06:30 AM – 08:30 AM"
                    value={batchForm.fields.timings}
                    onChange={e => batchForm.setField('timings', e.target.value)}
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
                    value={batchForm.fields.ageGroup}
                    onChange={e => batchForm.setField('ageGroup', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={batchForm.fields.capacity}
                    onChange={e => batchForm.setField('capacity', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Monthly Fee per Trainee (₹)</label>
                <input
                  type="number"
                  required
                  value={batchForm.fields.monthlyFee}
                  onChange={e => batchForm.setField('monthlyFee', Number(e.target.value))}
                />
              </div>

              <button type="submit" className="coach-primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Publish Batch Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {isRegisterCoachModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseRegisterCoach}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Register New Coach Profile</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseRegisterCoach}>
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
                  value={coachForm.fields.name}
                  onChange={e => coachForm.setField('name', e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Primary Sport</label>
                  <select value={coachForm.fields.sport} onChange={e => coachForm.setField('sport', e.target.value)}>
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
                    value={coachForm.fields.city}
                    onChange={e => coachForm.setField('city', e.target.value)}
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
                    value={coachForm.fields.phone}
                    onChange={e => coachForm.setField('phone', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="coach@example.com"
                    value={coachForm.fields.email}
                    onChange={e => coachForm.setField('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Certification / Accreditation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCCI Level 3 · NIS Patiala Senior Diploma"
                  value={coachForm.fields.certification}
                  onChange={e => coachForm.setField('certification', e.target.value)}
                />
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Default Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={coachForm.fields.monthlyFee}
                    onChange={e => coachForm.setField('monthlyFee', Number(e.target.value))}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>UPI ID for Direct Payouts</label>
                  <input
                    type="text"
                    placeholder="e.g. coach@okhdfcbank"
                    value={coachForm.fields.upiVpa}
                    onChange={e => coachForm.setField('upiVpa', e.target.value)}
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

      <WorkspaceDetailDrawer
        open={isImportCsvModalOpen}
        onClose={onCloseImportCsv}
        title="Bulk Import Trainees from CSV / Excel"
        width={620}
      >
        <CsvTransferControls
          title="Import Trainees CSV"
          description="Columns: Trainee Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee, Age"
          onDownloadSample={() => handleCsvInputChange(getSampleCoachTraineeCsv())}
          onImportCsvText={text => handleCsvInputChange(text)}
        />

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
              ✓ {importPreviewRows.length} Trainees Ready to Import
            </strong>
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

        <div className="host-action-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="kg-btn kg-btn-ghost kg-touch-target" onClick={onCloseImportCsv}>
            Cancel
          </button>
          <button
            type="button"
            className="kg-btn kg-btn-primary kg-touch-target"
            disabled={importPreviewRows.length === 0}
            onClick={handleConfirmImportCsv}
          >
            Import {importPreviewRows.length} Trainees Now
          </button>
        </div>
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={Boolean(activeReceipt)}
        onClose={onCloseReceipt}
        title={activeReceipt ? `Official Payment Receipt · ${activeReceipt.entityName}` : 'Fee Receipt'}
        statusMessage={activeReceipt?.isVerified ? '🛡️ Official KhelGrid Verified Coach' : undefined}
        width={540}
      >
        {activeReceipt && (
          <>
            <FeeReceiptDrawerContent
              receipt={{
                receiptNumber: activeReceipt.receiptNumber,
                payerName: `${activeReceipt.studentName} (Parent: ${activeReceipt.parentName}, +91 ${activeReceipt.parentPhone})`,
                recipientOrg: activeReceipt.entityName,
                amountInr: activeReceipt.amount,
                paymentMethod: `${activeReceipt.paymentMethod} (${activeReceipt.upiVpa})`,
                paidAt: activeReceipt.paymentDate,
                billingCycle: `${activeReceipt.paymentMonth} · ${activeReceipt.batchName}`,
                notes: `${activeReceipt.sport} · Status: PAID IN FULL`,
              }}
              onPrint={() => {
                if (typeof window !== 'undefined') window.print()
              }}
            />
            <a
              href={generateWhatsAppReceiptMessageUrl(activeReceipt)}
              target="_blank"
              rel="noopener noreferrer"
              className="kg-btn kg-btn-primary kg-touch-target"
            >
              <SiteIcon name="phone" size={14} />
              <span>Send Receipt on WhatsApp</span>
            </a>
          </>
        )}
      </WorkspaceDetailDrawer>

      {isAddCombineModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseAddCombine}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Log Trainee Combine Test (KG-2026-002)</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseAddCombine}>
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCombineSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Select Trainee</label>
                  <select
                    value={combineForm.fields.traineeId}
                    onChange={e => {
                      combineForm.setField('traineeId', e.target.value)
                      const tr = trainees.find(t => t.id === e.target.value)
                      if (tr) combineForm.setField('traineeName', tr.traineeName)
                    }}
                  >
                    <option value="">-- Choose or type name below --</option>
                    {trainees.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.traineeName} ({t.batchName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>Or Trainee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Arjun Mehra"
                    value={combineForm.fields.traineeName}
                    onChange={e => combineForm.setField('traineeName', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Age Group Division</label>
                  <select
                    value={combineForm.fields.ageGroup}
                    onChange={e => combineForm.setField('ageGroup', e.target.value)}
                  >
                    <option value="U-12">U-12 Sub-Junior</option>
                    <option value="U-14">U-14 Junior</option>
                    <option value="U-15">U-15 Cadet</option>
                    <option value="U-17">U-17 Youth</option>
                    <option value="U-19">U-19 Junior Elite</option>
                    <option value="Senior">Senior (19+ yrs)</option>
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>30m Sprint (seconds)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4.25"
                    value={combineForm.fields.sprint30m ?? ''}
                    onChange={e => combineForm.setField('sprint30m', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Vertical Jump (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 48.0"
                    value={combineForm.fields.verticalJump ?? ''}
                    onChange={e => combineForm.setField('verticalJump', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Yo-Yo IR1 (Shuttle Level)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 16.2"
                    value={combineForm.fields.yoYoLevel ?? ''}
                    onChange={e => combineForm.setField('yoYoLevel', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Pro Agility 5-10-5 Shuttle (seconds)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4.75"
                  value={combineForm.fields.proAgility ?? ''}
                  onChange={e => combineForm.setField('proAgility', parseFloat(e.target.value) || undefined)}
                />
              </div>

              <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #6ee7b7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#065f46', fontSize: '0.85rem' }}>Calculated Talent Norm:</strong>
                  <div style={{ color: '#047857', fontSize: '0.8rem' }}>Tier: <strong>{combinePreview.tier}</strong></div>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                  {combinePreview.percentile}th %ile
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="coach-hub-btn-outline" onClick={onCloseAddCombine}>
                  Cancel
                </button>
                <button type="submit" className="coach-primary-btn">
                  Save Combine Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddPlanModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseAddPlan}>
          <div className="coach-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Create Weekly Training Plan</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseAddPlan}>
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleSavePlanSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Assign to Batch</label>
                  <select value={planForm.fields.batchId} onChange={e => planForm.setField('batchId', e.target.value)}>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} ({b.days})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>Week Curriculum Title</label>
                  <input
                    type="text"
                    required
                    value={planForm.fields.weekTitle}
                    onChange={e => planForm.setField('weekTitle', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Key Tactical / Technical Focus</label>
                <input
                  type="text"
                  required
                  value={planForm.fields.focusArea}
                  onChange={e => planForm.setField('focusArea', e.target.value)}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Day-by-Day Drills:</strong>

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px', gap: '8px', marginTop: '6px' }}>
                  <input value={planForm.fields.drill1Day} onChange={e => planForm.setField('drill1Day', e.target.value)} placeholder="Day" />
                  <input value={planForm.fields.drill1Title} onChange={e => planForm.setField('drill1Title', e.target.value)} placeholder="Drill title" />
                  <input type="number" value={planForm.fields.drill1Min} onChange={e => planForm.setField('drill1Min', parseInt(e.target.value, 10) || 30)} placeholder="Min" />
                </div>
                <input
                  style={{ marginTop: '4px', fontSize: '0.82rem' }}
                  value={planForm.fields.drill1Notes}
                  onChange={e => planForm.setField('drill1Notes', e.target.value)}
                  placeholder="Instructions / coaching cues"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px', gap: '8px', marginTop: '8px' }}>
                  <input value={planForm.fields.drill2Day} onChange={e => planForm.setField('drill2Day', e.target.value)} placeholder="Day" />
                  <input value={planForm.fields.drill2Title} onChange={e => planForm.setField('drill2Title', e.target.value)} placeholder="Drill title" />
                  <input type="number" value={planForm.fields.drill2Min} onChange={e => planForm.setField('drill2Min', parseInt(e.target.value, 10) || 30)} placeholder="Min" />
                </div>
                <input
                  style={{ marginTop: '4px', fontSize: '0.82rem' }}
                  value={planForm.fields.drill2Notes}
                  onChange={e => planForm.setField('drill2Notes', e.target.value)}
                  placeholder="Instructions / coaching cues"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px', gap: '8px', marginTop: '8px' }}>
                  <input value={planForm.fields.drill3Day} onChange={e => planForm.setField('drill3Day', e.target.value)} placeholder="Day" />
                  <input value={planForm.fields.drill3Title} onChange={e => planForm.setField('drill3Title', e.target.value)} placeholder="Drill title" />
                  <input type="number" value={planForm.fields.drill3Min} onChange={e => planForm.setField('drill3Min', parseInt(e.target.value, 10) || 30)} placeholder="Min" />
                </div>
                <input
                  style={{ marginTop: '4px', fontSize: '0.82rem' }}
                  value={planForm.fields.drill3Notes}
                  onChange={e => planForm.setField('drill3Notes', e.target.value)}
                  placeholder="Instructions / coaching cues"
                />
              </div>

              <div className="coach-modal-field" style={{ marginTop: '0.75rem' }}>
                <label>Home Practice Challenge</label>
                <textarea
                  rows={2}
                  value={planForm.fields.homework}
                  onChange={e => planForm.setField('homework', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="coach-hub-btn-outline" onClick={onCloseAddPlan}>
                  Cancel
                </button>
                <button type="submit" className="coach-primary-btn">
                  Publish Training Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAwardEndorsementModalOpen && (
        <div className="coach-modal-backdrop" onClick={onCloseAwardEndorsement}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Award Official Trainee Endorsement</h3>
              <button type="button" className="coach-modal-close-btn" onClick={onCloseAwardEndorsement}>
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleAwardEndorsementSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Athlete Name</label>
                  <input
                    type="text"
                    required
                    value={endorseForm.fields.traineeName}
                    onChange={e => endorseForm.setField('traineeName', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Athlete Passport ID</label>
                  <input
                    type="text"
                    required
                    value={endorseForm.fields.passportId}
                    onChange={e => endorseForm.setField('passportId', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Sport</label>
                  <input
                    type="text"
                    required
                    value={endorseForm.fields.sport}
                    onChange={e => endorseForm.setField('sport', e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Official Badge Title</label>
                  <input
                    type="text"
                    required
                    value={endorseForm.fields.badgeTitle}
                    onChange={e => endorseForm.setField('badgeTitle', e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Official Endorsement Statement</label>
                <textarea
                  rows={3}
                  required
                  value={endorseForm.fields.statement}
                  onChange={e => endorseForm.setField('statement', e.target.value)}
                />
              </div>

              <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px', border: '1px solid #6ee7b7', fontSize: '0.8rem', color: '#065f46' }}>
                🛡️ This endorsement generates a tamper-proof cryptographic verification hash stamped directly by <strong>{currentCoach.name}</strong> ({currentCoach.certification}) on the athlete&apos;s National Sports CV.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="coach-hub-btn-outline" onClick={onCloseAwardEndorsement}>
                  Cancel
                </button>
                <button type="submit" className="coach-primary-btn">
                  Issue Verified Endorsement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
