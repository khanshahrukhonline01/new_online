import { useEffect, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { FeeReceiptDrawerContent } from '../../../shared/components/workflows/FeeReceiptDrawerContent'
import { useFormState } from '../../../shared/hooks/useFormState'
import { calculateProratedCancellationRefund } from '../../../shared/saas/saasLaunchReadinessService'
import {
  generateWhatsAppBatchBroadcastUrl,
  generateWhatsAppProgressReportUrl,
  type StudentProgressReport,
} from '../../../shared/saas/saasSharedOperations'
import { generateQrSvgString } from '../../../shared/utils/qrCodeGenerator'
import {
  createTenantInvitation,
  recordTenantAuditLog,
  recordTenantFeeTransaction,
  softDeleteTenantStudent,
  type DbTenant,
} from '../../../integrations/supabase/tenant-client'
import { registerAcademySquad, type TournamentMetadata } from '../../events/tournamentOpsEngine'
import {
  generateUpiPayLink,
  recordFeeTransaction,
  recordStudentPayment,
  saveAcademyStaffMember,
  type AcademyBatch,
  type AcademyFeeTransaction,
  type AcademySettings,
  type AcademyStaffMember,
  type AcademyStudent,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyOpsAndBillingModalsProps {
  selectedSlug: string
  currentTenant: DbTenant | null
  currentAcademy: RegisteredAcademy
  settings: AcademySettings
  batches: AcademyBatch[]
  students: AcademyStudent[]
  availableTournaments: TournamentMetadata[]
  activeTournamentBatch: AcademyBatch | null
  activeUpiQrStudent: AcademyStudent | null
  activeReceiptStudent: AcademyStudent | null
  activeAttendanceBatch: AcademyBatch | null
  activeBroadcastBatch: AcademyBatch | null
  activeEvaluationStudent: AcademyStudent | null
  cancellationModalStudent: AcademyStudent | null
  isAddStaffModalOpen: boolean
  isRecordPaymentModalOpen: boolean
  onCloseTournamentModal: () => void
  onCloseUpiQr: () => void
  onCloseReceipt: () => void
  onCloseAttendanceSheet: () => void
  onCloseBroadcast: () => void
  onCloseEvaluation: () => void
  onCloseCancellation: () => void
  onCloseAddStaff: () => void
  onCloseRecordPayment: () => void
  onRefresh: () => void
}

interface StaffFormFields extends Record<string, unknown> {
  name: string
  role: AcademyStaffMember['role']
  phone: string
  email: string
  qualification: string
  batchId: string
}

interface PaymentFormFields extends Record<string, unknown> {
  studentId: string
  amount: number
  mode: AcademyFeeTransaction['paymentMode']
  staffName: string
  notes: string
}

interface BroadcastFormFields extends Record<string, unknown> {
  reason: 'rain_weather' | 'ground_maintenance' | 'heat_pollution' | 'holiday' | 'coach_emergency' | 'custom'
  customReason: string
  rescheduledTime: string
}

interface EvaluationFormFields extends Record<string, unknown> {
  term: string
  techGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  tactGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  fitGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  discGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  remarks: string
  coachName: string
}

/**
 * Orchestrates operational & billing modals/drawers for AcademyHubPage:
 * tournament squad entry, UPI QR, digital receipt, attendance sheet, weather broadcast,
 * evaluation report card, staff onboarding, offline fee recording, and cancellation refund.
 */
export function AcademyOpsAndBillingModals({
  selectedSlug,
  currentTenant,
  currentAcademy,
  settings,
  batches,
  students,
  availableTournaments,
  activeTournamentBatch,
  activeUpiQrStudent,
  activeReceiptStudent,
  activeAttendanceBatch,
  activeBroadcastBatch,
  activeEvaluationStudent,
  cancellationModalStudent,
  isAddStaffModalOpen,
  isRecordPaymentModalOpen,
  onCloseTournamentModal,
  onCloseUpiQr,
  onCloseReceipt,
  onCloseAttendanceSheet,
  onCloseBroadcast,
  onCloseEvaluation,
  onCloseCancellation,
  onCloseAddStaff,
  onCloseRecordPayment,
  onRefresh,
}: AcademyOpsAndBillingModalsProps) {
  const [targetTournamentId, setTargetTournamentId] = useState(() => availableTournaments[0]?.id || '')
  const [squadTeamName, setSquadTeamName] = useState('')
  const [tournamentRegMsg, setTournamentRegMsg] = useState('')

  useEffect(() => {
    if (activeTournamentBatch) {
      setSquadTeamName(`${currentAcademy.name} ${activeTournamentBatch.batchName}`)
      setTournamentRegMsg('')
    }
  }, [activeTournamentBatch, currentAcademy.name])

  const [cancellationReason, setCancellationReason] = useState<'injury' | 'relocation' | 'dissatisfied' | 'other'>('injury')
  const [cancellationSessionsAttended, setCancellationSessionsAttended] = useState(2)
  const [cancellationSuccessMsg, setCancellationSuccessMsg] = useState('')

  useEffect(() => {
    if (cancellationModalStudent) {
      setCancellationSessionsAttended(2)
      setCancellationSuccessMsg('')
    }
  }, [cancellationModalStudent])

  const staffForm = useFormState<StaffFormFields>({
    name: '',
    role: 'head_coach',
    phone: '',
    email: '',
    qualification: '',
    batchId: '',
  })

  const paymentForm = useFormState<PaymentFormFields>({
    studentId: students[0]?.id || '',
    amount: students[0]?.monthlyFee || 2500,
    mode: 'cash',
    staffName: 'Coach Suresh M.',
    notes: 'Cash received pitch-side',
  })

  const broadcastForm = useFormState<BroadcastFormFields>({
    reason: 'rain_weather',
    customReason: '',
    rescheduledTime: 'Tomorrow 07:00 AM',
  })

  const evalForm = useFormState<EvaluationFormFields>({
    term: 'Term 1 (Jan–Mar 2026)',
    techGrade: 'A+',
    tactGrade: 'A',
    fitGrade: 'A',
    discGrade: 'A+',
    remarks: 'Demonstrating exceptional pitch vision and leadership. Ready for zonal trial matches.',
    coachName: 'Coach Suresh M. (AFC A-License)',
  })

  const getUpiQrSvg = (student: AcademyStudent) => {
    const link = generateUpiPayLink({
      vpa: currentTenant?.upi_vpa || settings.upiVpa || 'academy@upi',
      name: currentTenant?.name || currentAcademy.name,
      amount: student.monthlyFee,
      note: `Fee ${student.studentName}`,
    })
    return generateQrSvgString(link, { size: 180, color: '#047857', bgColor: '#ffffff' })
  }

  const proratedRefund = cancellationModalStudent
    ? calculateProratedCancellationRefund({
        monthlyFee: cancellationModalStudent.monthlyFee,
        totalSessionsInMonth: 12,
        sessionsAttended: cancellationSessionsAttended,
        reason: cancellationReason,
      })
    : null

  const handleRegisterSquad = (e: FormEvent) => {
    e.preventDefault()
    if (!activeTournamentBatch) return

    const batchStudents = students.filter(s => s.batchId === activeTournamentBatch.id)
    const roster = batchStudents.length > 0 ? batchStudents.map(s => ({
      id: s.id,
      name: s.studentName,
      age: 15,
      dob: '2011-04-12',
      isPassportVerified: true,
    })) : [
      { id: 'p-1', name: 'Aarav Sharma', age: 15, dob: '2011-05-10', isPassportVerified: true },
      { id: 'p-2', name: 'Vihaan Verma', age: 15, dob: '2011-08-20', isPassportVerified: true },
    ]

    const res = registerAcademySquad({
      tournamentId: targetTournamentId,
      academyId: selectedSlug,
      academyName: currentAcademy.name,
      teamName: squadTeamName.trim() || `${currentAcademy.name} ${activeTournamentBatch.batchName}`,
      division: activeTournamentBatch.ageGroup || 'U-16',
      contactPhone: settings.directorWhatsApp || '+919876543210',
      players: roster,
    })

    setTournamentRegMsg(res.message)
    onRefresh()
    setTimeout(() => {
      onCloseTournamentModal()
      setSquadTeamName('')
      setTournamentRegMsg('')
    }, 2000)
  }

  return (
    <>
      {activeTournamentBatch && (
        <div className="academy-hub-modal-overlay" onClick={onCloseTournamentModal}>
          <div className="academy-hub-modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Enter Squad into Tournament</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseTournamentModal} aria-label="Close modal">
                &times;
              </button>
            </div>
            <form onSubmit={handleRegisterSquad} className="academy-hub-form">
              {tournamentRegMsg && (
                <div style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.88rem', marginBottom: '1rem' }}>
                  {tournamentRegMsg}
                </div>
              )}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.85rem' }}>
                Selected Batch: <strong>{activeTournamentBatch.batchName}</strong> ({activeTournamentBatch.sport}) · Division: <strong>{activeTournamentBatch.ageGroup}</strong>
              </div>
              <label>
                Select Open Tournament
                <select
                  value={targetTournamentId}
                  onChange={e => setTargetTournamentId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {availableTournaments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.city} · {t.division} · Entry Fee: ₹{t.entryFee})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Registered Squad / Team Name
                <input
                  type="text"
                  value={squadTeamName}
                  onChange={e => setSquadTeamName(e.target.value)}
                  placeholder={`e.g. ${currentAcademy.name} ${activeTournamentBatch.batchName}`}
                />
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="academy-hub-btn-outline" onClick={onCloseTournamentModal}>
                  Cancel
                </button>
                <button type="submit" className="academy-hub-primary-btn">
                  Submit Squad to Tournament Ops
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeUpiQrStudent && (
        <div className="academy-hub-modal-overlay" onClick={onCloseUpiQr}>
          <div className="academy-hub-modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Scan to Pay Coaching Fee via UPI</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseUpiQr} aria-label="Close modal">
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
                  onCloseUpiQr()
                  onRefresh()
                }}
              >
                Mark Paid
              </button>
              <button type="button" className="academy-hub-public-page-btn" onClick={onCloseUpiQr}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceDetailDrawer
        open={Boolean(activeReceiptStudent)}
        onClose={onCloseReceipt}
        title={activeReceiptStudent ? `Official Student Fee Receipt · ${currentAcademy.name}` : 'Fee Receipt'}
        statusMessage={activeReceiptStudent ? 'PAID · 0% PLATFORM FEE' : undefined}
        width={540}
      >
        {activeReceiptStudent && (
          <>
            <FeeReceiptDrawerContent
              receipt={{
                receiptNumber: `REC-${activeReceiptStudent.id.toUpperCase()}`,
                payerName: `${activeReceiptStudent.studentName} (${activeReceiptStudent.parentName}, +91 ${activeReceiptStudent.parentPhone})`,
                recipientOrg: currentAcademy.name,
                amountInr: activeReceiptStudent.monthlyFee,
                paymentMethod: 'Direct Academy UPI / Settled',
                paidAt: activeReceiptStudent.lastPaymentDate || 'Today',
                billingCycle: `${activeReceiptStudent.batchName} (${activeReceiptStudent.sport}) · Next due: ${activeReceiptStudent.nextDueDate}`,
              }}
              onPrint={() => window.print?.()}
            />

            <div
              className="kg-qr-holder"
              style={{ alignSelf: 'center' }}
              dangerouslySetInnerHTML={{
                __html: generateQrSvgString(
                  JSON.stringify({
                    ref: `REC-${activeReceiptStudent.id}`,
                    student: activeReceiptStudent.studentName,
                    academy: currentAcademy.name,
                    amount: activeReceiptStudent.monthlyFee,
                    status: 'paid',
                  }),
                  { size: 140, color: '#047857' },
                ),
              }}
            />

            <a
              href={`https://wa.me/${activeReceiptStudent.parentPhone.startsWith('91') ? activeReceiptStudent.parentPhone : `91${activeReceiptStudent.parentPhone}`}?text=${encodeURIComponent(
                `🧾 *Coaching Fee Receipt — ${currentAcademy.name}*\n\nDear ${activeReceiptStudent.parentName},\nFee receipt for *${activeReceiptStudent.studentName}* (${activeReceiptStudent.batchName}):\nAmount Paid: *₹${activeReceiptStudent.monthlyFee.toLocaleString('en-IN')}*\nNext Due Date: *${activeReceiptStudent.nextDueDate}*\n\n📱 *View Live Passbook & Pay via UPI:* https://khelgrid.com/parent-portal?student=${activeReceiptStudent.id}&tab=fees\n\nThank you!`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="kg-btn kg-btn-primary kg-touch-target"
            >
              <SiteIcon name="phone" size={15} />
              <span>Share on WhatsApp</span>
            </a>
          </>
        )}
      </WorkspaceDetailDrawer>

      {activeAttendanceBatch && (
        <div className="academy-hub-modal-overlay" onClick={onCloseAttendanceSheet}>
          <div className="academy-hub-modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <div>
                <span className="enquiry-badge">📋 Official Coach Attendance Roster</span>
                <h3 style={{ margin: '0.25rem 0 0' }}>{activeAttendanceBatch.batchName}</h3>
              </div>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseAttendanceSheet} aria-label="Close modal">
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
              <button type="button" className="academy-hub-btn-outline" onClick={() => window.print?.()}>
                <SiteIcon name="download" size={15} /> Print Roster
              </button>
              <button type="button" className="academy-hub-primary-btn" onClick={onCloseAttendanceSheet}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {activeBroadcastBatch && (
        <div className="academy-hub-modal-overlay" onClick={onCloseBroadcast}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Broadcast Session Alert</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseBroadcast} aria-label="Close modal">
                &times;
              </button>
            </div>

            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.88rem' }}>
              Broadcast session cancellation or reschedule notices directly to parents in <strong>{activeBroadcastBatch.batchName}</strong> via WhatsApp.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault()
                const url = generateWhatsAppBatchBroadcastUrl({
                  entityName: currentAcademy.name,
                  batchName: activeBroadcastBatch.batchName,
                  reason: broadcastForm.fields.reason,
                  customReason: broadcastForm.fields.customReason,
                  date: new Date().toLocaleDateString('en-IN'),
                  rescheduledTime: broadcastForm.fields.rescheduledTime,
                })
                window.open(url, '_blank', 'noopener,noreferrer')
                onCloseBroadcast()
              }}
              className="academy-hub-form"
            >
              <label>
                Cancellation / Alert Reason *
                <select
                  value={broadcastForm.fields.reason}
                  onChange={e => broadcastForm.setField('reason', e.target.value as BroadcastFormFields['reason'])}
                >
                  <option value="rain_weather">🌧️ Heavy Rain / Pitch Waterlogging</option>
                  <option value="ground_maintenance">🚜 Scheduled Turf Maintenance &amp; Relaying</option>
                  <option value="heat_pollution">☀️ Severe Weather / Heat Index Advisory</option>
                  <option value="holiday">🎉 Public Sports Holiday / Festive Break</option>
                  <option value="coach_emergency">👨‍🏫 Coach Emergency Leave / Workshop</option>
                  <option value="custom">✍️ Custom Announcement</option>
                </select>
              </label>

              {broadcastForm.fields.reason === 'custom' && (
                <label>
                  Custom Reason Text *
                  <input
                    type="text"
                    value={broadcastForm.fields.customReason}
                    onChange={e => broadcastForm.setField('customReason', e.target.value)}
                    placeholder="e.g. Floodlight power outage"
                    required
                  />
                </label>
              )}

              <label>
                Rescheduled Session Timing (Optional)
                <input
                  type="text"
                  value={broadcastForm.fields.rescheduledTime}
                  onChange={e => broadcastForm.setField('rescheduledTime', e.target.value)}
                  placeholder="e.g. Tomorrow Sunday 07:00 AM"
                />
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="academy-hub-primary-btn" style={{ flex: 1 }}>
                  <span>📢 Launch WhatsApp Broadcast</span>
                </button>
                <button type="button" className="academy-hub-public-page-btn" onClick={onCloseBroadcast}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeEvaluationStudent && (
        <div className="academy-hub-modal-overlay" onClick={onCloseEvaluation}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Quarterly Athlete Evaluation Card</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseEvaluation} aria-label="Close modal">
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0.5rem 0 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{activeEvaluationStudent.studentName}</strong>
                <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>94% Attendance Record</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {activeEvaluationStudent.batchName} ({activeEvaluationStudent.sport}) · Parent: {activeEvaluationStudent.parentName}
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const f = evalForm.fields
                const report: StudentProgressReport = {
                  reportId: `REP-${activeEvaluationStudent.id}-${Date.now()}`,
                  studentId: activeEvaluationStudent.id,
                  studentName: activeEvaluationStudent.studentName,
                  parentName: activeEvaluationStudent.parentName,
                  parentPhone: activeEvaluationStudent.parentPhone,
                  batchName: activeEvaluationStudent.batchName,
                  academyName: currentAcademy.name,
                  sport: activeEvaluationStudent.sport,
                  term: f.term,
                  attendanceRate: 94,
                  technicalGrade: f.techGrade,
                  tacticalGrade: f.tactGrade,
                  physicalFitnessGrade: f.fitGrade,
                  disciplineGrade: f.discGrade,
                  coachRemarks: f.remarks,
                  evaluatedByCoachName: f.coachName,
                  evaluatedDate: new Date().toLocaleDateString('en-IN'),
                }
                const url = generateWhatsAppProgressReportUrl(report)
                window.open(url, '_blank', 'noopener,noreferrer')
                onCloseEvaluation()
              }}
              className="academy-hub-form"
            >
              <label>
                Evaluation Period / Term *
                <input
                  type="text"
                  value={evalForm.fields.term}
                  onChange={e => evalForm.setField('term', e.target.value)}
                  placeholder="e.g. Term 1 (Jan–Mar 2026)"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Technical Skill
                  <select value={evalForm.fields.techGrade} onChange={e => evalForm.setField('techGrade', e.target.value as EvaluationFormFields['techGrade'])}>
                    <option value="A+">Grade A+ (Elite)</option>
                    <option value="A">Grade A (Advanced)</option>
                    <option value="B+">Grade B+ (Proficient)</option>
                    <option value="B">Grade B (Developing)</option>
                    <option value="C">Grade C (Foundational)</option>
                  </select>
                </label>

                <label>
                  Tactical Awareness
                  <select value={evalForm.fields.tactGrade} onChange={e => evalForm.setField('tactGrade', e.target.value as EvaluationFormFields['tactGrade'])}>
                    <option value="A+">Grade A+ (Elite Vision)</option>
                    <option value="A">Grade A (Sharp)</option>
                    <option value="B+">Grade B+ (Good)</option>
                    <option value="B">Grade B (Developing)</option>
                    <option value="C">Grade C (Basic)</option>
                  </select>
                </label>

                <label>
                  Physical Conditioning
                  <select value={evalForm.fields.fitGrade} onChange={e => evalForm.setField('fitGrade', e.target.value as EvaluationFormFields['fitGrade'])}>
                    <option value="A+">Grade A+ (Match Fit)</option>
                    <option value="A">Grade A (High Stamina)</option>
                    <option value="B+">Grade B+ (Good)</option>
                    <option value="B">Grade B (Average)</option>
                    <option value="C">Grade C (Needs Conditioning)</option>
                  </select>
                </label>

                <label>
                  Discipline &amp; Punctuality
                  <select value={evalForm.fields.discGrade} onChange={e => evalForm.setField('discGrade', e.target.value as EvaluationFormFields['discGrade'])}>
                    <option value="A+">Grade A+ (Exemplary)</option>
                    <option value="A">Grade A (Consistent)</option>
                    <option value="B+">Grade B+ (Good)</option>
                    <option value="B">Grade B (Occasional Leave)</option>
                    <option value="C">Grade C (Irregular)</option>
                  </select>
                </label>
              </div>

              <label>
                Coach Remarks &amp; Milestones *
                <textarea
                  rows={2}
                  value={evalForm.fields.remarks}
                  onChange={e => evalForm.setField('remarks', e.target.value)}
                  placeholder="Coach observations, strengths and next development goals..."
                  required
                />
              </label>

              <label>
                Evaluating Coach *
                <input
                  type="text"
                  value={evalForm.fields.coachName}
                  onChange={e => evalForm.setField('coachName', e.target.value)}
                  placeholder="e.g. Coach Suresh M. (AFC A-License)"
                  required
                />
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="academy-hub-primary-btn" style={{ flex: 1 }}>
                  <span>Send Report via WhatsApp</span>
                </button>
                <button type="button" className="academy-hub-public-page-btn" onClick={onCloseEvaluation}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddStaffModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseAddStaff}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Add Academy Staff Member</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseAddStaff} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const f = staffForm.fields
                saveAcademyStaffMember({
                  academySlug: selectedSlug,
                  name: f.name,
                  role: f.role,
                  phone: f.phone,
                  email: f.email || undefined,
                  qualification: f.qualification || undefined,
                  assignedBatches: f.batchId ? [f.batchId] : undefined,
                  status: 'active',
                  joinedDate: new Date().toISOString().slice(0, 10),
                })

                if (currentTenant?.id && f.email) {
                  const roleMap: Record<string, 'director' | 'admin' | 'head_coach' | 'coach' | 'accountant' | 'front_desk' | 'staff'> = {
                    director: 'director',
                    head_coach: 'head_coach',
                    assistant_coach: 'coach',
                    accountant: 'accountant',
                    ground_staff: 'staff',
                  }
                  createTenantInvitation({
                    tenantId: currentTenant.id,
                    invitedEmail: f.email.trim(),
                    role: roleMap[f.role] || 'coach',
                  }).catch(err => console.warn('[AcademyHub] Remote staff invitation error:', err))

                  recordTenantAuditLog({
                    tenantId: currentTenant.id,
                    action: 'invite_staff_member',
                    entityType: 'tenant_membership',
                    details: {
                      name: f.name,
                      email: f.email,
                      role: f.role,
                    },
                  }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
                }

                onCloseAddStaff()
                staffForm.reset()
                onRefresh()
              }}
              className="academy-hub-form"
            >
              <label>
                Staff Full Name *
                <input
                  type="text"
                  value={staffForm.fields.name}
                  onChange={e => staffForm.setField('name', e.target.value)}
                  placeholder="e.g. Coach Vikram Rathore"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Operational Role *
                  <select value={staffForm.fields.role} onChange={e => staffForm.setField('role', e.target.value as AcademyStaffMember['role'])}>
                    <option value="head_coach">Head Coach</option>
                    <option value="assistant_coach">Assistant Coach</option>
                    <option value="accountant">Accountant / Front Desk</option>
                    <option value="ground_staff">Ground Staff</option>
                    <option value="director">Director / Admin</option>
                  </select>
                </label>

                <label>
                  WhatsApp Phone *
                  <input
                    type="tel"
                    value={staffForm.fields.phone}
                    onChange={e => staffForm.setField('phone', e.target.value)}
                    placeholder="e.g. 9812345678"
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Email Address
                  <input
                    type="email"
                    value={staffForm.fields.email}
                    onChange={e => staffForm.setField('email', e.target.value)}
                    placeholder="e.g. coach@academy.com"
                  />
                </label>

                <label>
                  Sports Qualification
                  <input
                    type="text"
                    value={staffForm.fields.qualification}
                    onChange={e => staffForm.setField('qualification', e.target.value)}
                    placeholder="e.g. NIS Patiala / AFC B"
                  />
                </label>
              </div>

              <label>
                Assigned Primary Batch
                <select value={staffForm.fields.batchId} onChange={e => staffForm.setField('batchId', e.target.value)}>
                  <option value="">All Batches</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batchName}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="academy-hub-primary-btn" style={{ flex: 1 }}>
                  Save Staff Member
                </button>
                <button type="button" className="academy-hub-public-page-btn" onClick={onCloseAddStaff}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRecordPaymentModalOpen && (
        <div className="academy-hub-modal-overlay" onClick={onCloseRecordPayment}>
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="academy-hub-modal-header">
              <h3>Record Offline Fee Payment</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseRecordPayment} aria-label="Close modal">
                &times;
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const f = paymentForm.fields
                const std = students.find(s => s.id === f.studentId) || students[0]
                if (!std) return
                recordFeeTransaction({
                  academySlug: selectedSlug,
                  studentId: std.id,
                  studentName: std.studentName,
                  parentName: std.parentName,
                  parentPhone: std.parentPhone,
                  batchId: std.batchId,
                  batchName: std.batchName,
                  amount: f.amount,
                  paymentMode: f.mode,
                  collectedByStaffName: f.staffName,
                  collectedDate: new Date().toISOString().slice(0, 10),
                  billingMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                  status: f.mode === 'cash' ? 'cash_in_hand' : 'settled',
                  notes: f.notes,
                })
                recordStudentPayment(std.id, f.amount, f.mode === 'cash' ? 'cash' : 'upi')

                if (currentTenant?.id) {
                  recordTenantFeeTransaction({
                    tenant_id: currentTenant.id,
                    student_id: std.id.length > 30 ? std.id : '00000000-0000-0000-0000-000000000000',
                    receipt_number: `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    amount: f.amount,
                    payment_mode: f.mode === 'cash' ? 'cash' : 'direct_upi',
                    collected_by_name: f.staffName || 'Academy Staff',
                    collected_date: new Date().toISOString().slice(0, 10),
                    billing_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                    status: f.mode === 'cash' ? 'cash_in_hand' : 'settled',
                    notes: f.notes || undefined,
                  }).catch(err => console.warn('[AcademyHub] Remote fee transaction error:', err))

                  recordTenantAuditLog({
                    tenantId: currentTenant.id,
                    action: 'record_fee_payment',
                    entityType: 'tenant_fee_transactions',
                    details: {
                      studentId: std.id,
                      studentName: std.studentName,
                      amount: f.amount,
                      paymentMode: f.mode,
                    },
                  }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
                }

                onCloseRecordPayment()
                onRefresh()
              }}
              className="academy-hub-form"
            >
              <label>
                Select Student *
                <select
                  value={paymentForm.fields.studentId}
                  onChange={e => {
                    const sId = e.target.value
                    paymentForm.setField('studentId', sId)
                    const std = students.find(s => s.id === sId)
                    if (std) paymentForm.setField('amount', std.monthlyFee)
                  }}
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.studentName} — {s.batchName} (₹{s.monthlyFee})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Amount Received (₹) *
                  <input
                    type="number"
                    value={paymentForm.fields.amount}
                    onChange={e => paymentForm.setField('amount', Number(e.target.value))}
                    required
                  />
                </label>

                <label>
                  Payment Mode *
                  <select
                    value={paymentForm.fields.mode}
                    onChange={e => paymentForm.setField('mode', e.target.value as AcademyFeeTransaction['paymentMode'])}
                  >
                    <option value="cash">💵 On-Ground Cash</option>
                    <option value="direct_upi">⚡ Direct UPI QR</option>
                    <option value="bank_transfer">🏦 Direct Bank NEFT/IMPS</option>
                    <option value="cheque">📝 Cheque</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Received By Staff Member *
                  <input
                    type="text"
                    value={paymentForm.fields.staffName}
                    onChange={e => paymentForm.setField('staffName', e.target.value)}
                    required
                  />
                </label>

                <label>
                  Notes / Reference
                  <input
                    type="text"
                    value={paymentForm.fields.notes}
                    onChange={e => paymentForm.setField('notes', e.target.value)}
                    placeholder="e.g. Cash received on ground"
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="academy-hub-primary-btn" style={{ flex: 1 }}>
                  Confirm &amp; Issue Receipt
                </button>
                <button type="button" className="academy-hub-public-page-btn" onClick={onCloseRecordPayment}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancellationModalStudent && (
        <div className="academy-hub-modal-overlay" onClick={onCloseCancellation} data-testid="cancellation-modal">
          <div className="academy-hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="academy-hub-modal-header">
              <h3>Cancel / Pause Membership &amp; Prorated Refund</h3>
              <button type="button" className="academy-hub-modal-close" onClick={onCloseCancellation} aria-label="Close modal">
                &times;
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '14px', color: '#475569' }}>
                Manage fair, transparent student exit or pause with automated prorated refund calculation in compliance with consumer protection guidelines.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{cancellationModalStudent.studentName}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Batch: {cancellationModalStudent.batchName} · Monthly Tuition: ₹{cancellationModalStudent.monthlyFee.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Exit / Cancellation Reason:
                  <select
                    value={cancellationReason}
                    onChange={e => setCancellationReason(e.target.value as 'injury' | 'relocation' | 'dissatisfied' | 'other')}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="injury">Medical / Sports Injury (Full Prorated Refund)</option>
                    <option value="relocation">Relocation / Transfer (Full Prorated Refund)</option>
                    <option value="dissatisfied">Dissatisfied / Schedule Conflict</option>
                    <option value="other">Other Personal Grounds</option>
                  </select>
                </label>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Coaching Sessions Attended (Out of 12 this month):
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={cancellationSessionsAttended}
                    onChange={e => setCancellationSessionsAttended(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>

              {proratedRefund && (
                <div
                  style={{
                    marginTop: '1rem',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Sessions Remaining:</span>
                    <strong>{proratedRefund.totalDaysInMonth - proratedRefund.attendedDays} / {proratedRefund.totalDaysInMonth}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Academy Retained:</span>
                    <span>₹{proratedRefund.academyDeduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#1d4ed8', paddingTop: '6px', borderTop: '1px dashed #bfdbfe' }}>
                    <strong>Prorated Refund Due:</strong>
                    <strong>₹{proratedRefund.eligibleRefundAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#64748b' }}>
                    Transparent consumer exit calculation: {proratedRefund.reason === 'injury' ? '100% prorated medical waiver' : 'Prorated with 10% administrative processing fee'}.
                  </p>
                </div>
              )}

              {cancellationSuccessMsg && (
                <p style={{ marginTop: '1rem', padding: '8px 12px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                  {cancellationSuccessMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="academy-hub-primary-btn"
                  style={{ background: '#dc2626', borderColor: '#b91c1c', flex: 1 }}
                  onClick={() => {
                    if (currentTenant?.id && cancellationModalStudent.id.length > 30) {
                      softDeleteTenantStudent(currentTenant.id, cancellationModalStudent.id)
                        .catch(err => console.warn('[AcademyHub] Remote soft delete error:', err))

                      recordTenantAuditLog({
                        tenantId: currentTenant.id,
                        action: 'cancel_student_membership',
                        entityType: 'tenant_students',
                        entityId: cancellationModalStudent.id,
                        details: {
                          reason: cancellationReason,
                          refundAmount: proratedRefund?.eligibleRefundAmount,
                          sessionsAttended: cancellationSessionsAttended,
                        },
                      }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
                    }

                    setCancellationSuccessMsg(`Membership cancelled for ${cancellationModalStudent.studentName}. Refund voucher generated: ₹${proratedRefund?.eligibleRefundAmount}.`)
                    setTimeout(() => {
                      onCloseCancellation()
                      onRefresh()
                    }, 1200)
                  }}
                >
                  Confirm Cancellation &amp; Refund
                </button>
                <button type="button" className="academy-hub-btn-outline" onClick={onCloseCancellation}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
