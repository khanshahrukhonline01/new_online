import { useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../../../shared/utils/qrCodeGenerator'
import { maskPhone } from '../../../../shared/saas/saasLaunchReadinessService'
import { downloadBlobFile } from '../../academyExportUtils'
import type { AcademyRoleCapabilities } from '../../academyHubTypes'
import {
  createAcademyFeeInvoice,
  generateAcademyUpiPayLink,
  inviteAcademyStaff,
  recordAcademyFeeReceipt,
  saveAcademySecuritySettings,
  sendAcademyAnnouncement,
  transferAcademyOwnership,
  updateAcademyStaffMember,
  type AcademyAnnouncementRecord,
  type AcademyAthleteRecord,
  type AcademyBatchRecord,
  type AcademyBranchRecord,
  type AcademyEnquiryRecord,
  type AcademyFeeInvoiceRecord,
  type AcademyFeeTransactionRecord,
  type AcademyOverviewPayload,
  type AcademyStaffMemberRecord,
} from '../../academyWorkspaceClient'

export interface AcademyGovernanceAndCommsPanelProps {
  mode: 'notifications' | 'reports' | 'fees' | 'staff' | 'settings'
  tenantId: string
  academyName: string
  actorName: string
  actorUserId: string
  initialUpiVpa: string
  initialHotline?: string
  initialPocsoOfficer?: string
  tenantSettings?: Record<string, unknown>
  dpdpMaskEnabled: boolean
  onToggleDpdpMask: () => void
  capabilities: AcademyRoleCapabilities
  overview: AcademyOverviewPayload | null
  branches: AcademyBranchRecord[]
  batches: AcademyBatchRecord[]
  athletes: AcademyAthleteRecord[]
  enquiries: AcademyEnquiryRecord[]
  announcements: AcademyAnnouncementRecord[]
  staffMembers: AcademyStaffMemberRecord[]
  feeInvoices?: AcademyFeeInvoiceRecord[]
  feeTransactions: AcademyFeeTransactionRecord[]
  auditLogs: { id: string; action: string; entity_type: string; details: Record<string, unknown>; created_at: string }[]
  onRefresh: () => Promise<void>
  onFeedback: (fb: { type: 'success' | 'error'; message: string }) => void
}

const INVITABLE_ACADEMY_ROLES: { value: string; label: string }[] = [
  { value: 'org_admin', label: 'Academy Administrator' },
  { value: 'manager', label: 'Academy Manager (Branch-Scoped)' },
  { value: 'admissions_manager', label: 'Admissions Manager' },
  { value: 'head_coach', label: 'Head Coach' },
  { value: 'coach', label: 'Coach / Training Staff' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'readonly_member', label: 'Read-Only Staff' },
]

export function AcademyGovernanceAndCommsPanel({
  mode,
  tenantId,
  academyName,
  actorName,
  actorUserId,
  initialUpiVpa,
  initialHotline = '',
  initialPocsoOfficer = '',
  tenantSettings,
  dpdpMaskEnabled,
  onToggleDpdpMask,
  capabilities,
  overview,
  branches,
  batches,
  athletes,
  enquiries,
  announcements,
  staffMembers,
  feeInvoices = [],
  feeTransactions,
  auditLogs,
  onRefresh,
  onFeedback,
}: AcademyGovernanceAndCommsPanelProps) {
  // Announcements
  const [audience, setAudience] = useState<AcademyAnnouncementRecord['audience']>('all_staff')
  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [annBranchId, setAnnBranchId] = useState('')
  const [annBatchId, setAnnBatchId] = useState('')

  // Staff Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('coach')
  const [inviteBranchIds, setInviteBranchIds] = useState<string[]>([])

  // Fees (Direct UPI & Cash — Payment Gateway Paused)
  const [feeStudentId, setFeeStudentId] = useState(athletes[0]?.id || '')
  const [feeInvoiceId, setFeeInvoiceId] = useState('')
  const [feeAmount, setFeeAmount] = useState('2500')
  const [feeMode, setFeeMode] = useState<AcademyFeeTransactionRecord['paymentMode']>('direct_upi')
  const [feeMonth, setFeeMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [feeDueDate, setFeeDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [feeNotes, setFeeNotes] = useState('')
  const [qrStudentId, setQrStudentId] = useState<string | null>(null)

  // Settings & Ownership Transfer
  const [upiVpa, setUpiVpa] = useState(initialUpiVpa)
  const [hotline, setHotline] = useState(initialHotline)
  const [pocsoOfficer, setPocsoOfficer] = useState(initialPocsoOfficer)
  const [transferTargetId, setTransferTargetId] = useState('')
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false)

  useEffect(() => {
    if (!feeStudentId && athletes[0]?.id) {
      setFeeStudentId(athletes[0].id)
      if (athletes[0].monthlyFee > 0) setFeeAmount(String(athletes[0].monthlyFee))
    }
  }, [feeStudentId, athletes])

  useEffect(() => {
    setUpiVpa(initialUpiVpa)
    setHotline(initialHotline)
    setPocsoOfficer(initialPocsoOfficer)
  }, [tenantId, initialUpiVpa, initialHotline, initialPocsoOfficer])

  // =========================================================================
  // 1. NOTIFICATIONS & ANNOUNCEMENTS
  // =========================================================================
  if (mode === 'notifications') {
    const handleSendAnnouncement = async (e: FormEvent) => {
      e.preventDefault()
      const res = await sendAcademyAnnouncement(tenantId, {
        audience,
        title: annTitle,
        message: annBody,
        unitId: annBranchId || null,
        batchId: annBatchId || null,
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setAnnTitle('')
        setAnnBody('')
        await onRefresh()
      }
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-notifications-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Academy Communications &amp; Announcements</h2>
            <p className="kg-acad-muted">
              Dispatch operational notices to staff, coaches, or parents via authenticated KhelGrid in-app notifications.
            </p>
          </div>
        </div>

        {capabilities.canSendAnnouncements && (
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSendAnnouncement(e)}>
            <h3>Send Targeted Announcement</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Target Audience *</span>
                <select value={audience} onChange={e => setAudience(e.target.value as AcademyAnnouncementRecord['audience'])}>
                  <option value="all_staff">All Active Academy Staff</option>
                  <option value="coaches">Coaches &amp; Instruction Staff</option>
                  <option value="branch_managers">Branch Managers &amp; Admins</option>
                  <option value="students">Linked Athletes</option>
                  <option value="parents">Linked Parents / Guardians</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Subject Title *</span>
                <input type="text" required placeholder="Rainout / Ground Maintenance Notice" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Filter by Branch (Optional)</span>
                <select value={annBranchId} onChange={e => setAnnBranchId(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Filter by Batch (Optional)</span>
                <select value={annBatchId} onChange={e => setAnnBatchId(e.target.value)}>
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
                </select>
              </label>
            </div>
            <label className="kg-acad-field" style={{ marginTop: '0.65rem' }}>
              <span>Announcement Message *</span>
              <textarea rows={3} required value={annBody} onChange={e => setAnnBody(e.target.value)} />
            </label>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary">Dispatch Announcement</button>
            </div>
          </form>
        )}

        <section className="kg-acad-card">
          <h3>Sent Announcements Log</h3>
          {announcements.length === 0 ? (
            <EmptyState title="No announcements sent yet" description="Broadcasts dispatched to staff or athletes appear here." />
          ) : (
            <ul className="kg-acad-list">
              {announcements.map(a => (
                <li key={a.id} className="kg-acad-list-item">
                  <div>
                    <strong>{a.title}</strong>
                    <p style={{ margin: '0.2rem 0' }}>{a.message}</p>
                    <div className="kg-acad-muted">
                      Audience: {a.audience.replace('_', ' ')} · Notified {a.recipientCount} users · {a.createdAt.slice(0, 10)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )
  }

  // =========================================================================
  // 2. REPORTS & CSV EXPORTS
  // =========================================================================
  if (mode === 'reports') {
    const stats = overview?.stats
    const exportAdmissionsCsv = () => {
      const headers = ['Token', 'Student', 'Parent', 'Phone', 'Sport', 'Type', 'Stage', 'Submitted At']
      const rows = enquiries.map(e => [
        `"${e.enquiryToken}"`,
        `"${e.studentName.replace(/"/g, '""')}"`,
        `"${e.parentName.replace(/"/g, '""')}"`,
        `"${dpdpMaskEnabled ? maskPhone(e.parentPhone) : e.parentPhone}"`,
        `"${e.sport}"`,
        `"${e.requestType}"`,
        `"${e.status}"`,
        `"${e.submittedAt.slice(0, 10)}"`,
      ].join(','))
      downloadBlobFile(
        `${academyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-admissions-report.csv`,
        [`# KhelGrid Admissions Report - ${academyName}`, headers.join(','), ...rows].join('\n'),
      )
    }

    const exportFeeLedgerCsv = () => {
      const headers = ['Receipt', 'Amount (INR)', 'Mode', 'Billing Month', 'Status', 'Collected Date']
      const rows = feeTransactions.map(t => [
        `"${t.receiptNumber}"`,
        t.amount,
        `"${t.paymentMode}"`,
        `"${t.billingMonth}"`,
        `"${t.status}"`,
        `"${t.collectedDate}"`,
      ].join(','))
      downloadBlobFile(
        `${academyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-fee-ledger.csv`,
        [`# KhelGrid Direct Fee Ledger - ${academyName}`, headers.join(','), ...rows].join('\n'),
      )
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-reports-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Reports, Analytics &amp; Exports</h2>
            <p className="kg-acad-muted">
              Genuine operational reports derived exclusively from academy PostgreSQL records. Financial data stays restricted to finance-authorized roles.
            </p>
          </div>
          <div className="kg-acad-btn-row">
            <button type="button" className="kg-acad-btn-outline" onClick={exportAdmissionsCsv}>
              <SiteIcon name="download" size={15} /> Export Admissions CSV
            </button>
            {capabilities.canExportReports && capabilities.canViewFinance && (
              <button type="button" className="kg-acad-btn-primary" onClick={exportFeeLedgerCsv}>
                <SiteIcon name="download" size={15} /> Export Fee Ledger CSV
              </button>
            )}
          </div>
        </div>

        <div className="kg-acad-grid-2">
          <section className="kg-acad-card">
            <h3>Admissions Funnel Breakdown</h3>
            {!overview || overview.pipelineBreakdown.length === 0 ? (
              <EmptyState title="No admissions data" description="Stage counts populate once enquiries are received." />
            ) : (
              <ul className="kg-acad-list">
                {overview.pipelineBreakdown.map(row => (
                  <li key={row.status} className="kg-acad-list-item">
                    <span>{row.status.replace('_', ' ')}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kg-acad-card">
            <h3>Operational Health Metrics</h3>
            <ul className="kg-acad-list">
              <li className="kg-acad-list-item">
                <span>Active Athletes Enrolled</span>
                <strong>{stats?.activeAthletes ?? 0}</strong>
              </li>
              <li className="kg-acad-list-item">
                <span>30-Day Roll-Call Rate</span>
                <strong>{stats?.attendanceRatePct !== null && stats?.attendanceRatePct !== undefined ? `${stats.attendanceRatePct}%` : 'No data yet'}</strong>
              </li>
              <li className="kg-acad-list-item">
                <span>Completed Sessions (30d)</span>
                <strong>{stats?.completedSessions30d ?? 0}</strong>
              </li>
              <li className="kg-acad-list-item">
                <span>Conversion (Enrolled / Total Enquiries)</span>
                <strong>
                  {stats && stats.totalApplications > 0
                    ? `${Math.round((stats.enrolledApplications / stats.totalApplications) * 100)}%`
                    : '—'}
                </strong>
              </li>
            </ul>
          </section>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 3. FEE LEDGER & DIRECT UPI (ZERO PAYMENT GATEWAY)
  // =========================================================================
  if (mode === 'fees') {
    if (!capabilities.canViewFinance) {
      return (
        <EmptyState
          title="Financial Ledger Restricted"
          description="Only Academy Owners, Administrators, and Finance Managers can access student fee ledgers."
        />
      )
    }

    const handleRecordReceipt = async (e: FormEvent) => {
      e.preventDefault()
      const res = await recordAcademyFeeReceipt({
        tenantId,
        studentId: feeStudentId,
        invoiceId: feeInvoiceId || null,
        amount: Number(feeAmount || 0),
        paymentMode: feeMode,
        collectedByName: actorName,
        billingMonth: feeMonth,
        notes: feeNotes,
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setFeeNotes('')
        setFeeInvoiceId('')
        await onRefresh()
      }
    }

    const handleIssueInvoice = async () => {
      const res = await createAcademyFeeInvoice({
        tenantId,
        studentId: feeStudentId,
        amount: Number(feeAmount || 0),
        billingMonth: feeMonth,
        dueDate: feeDueDate,
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) await onRefresh()
    }

    const qrStudent = qrStudentId ? athletes.find(a => a.id === qrStudentId) : null
    const qrSvg = qrStudent && initialUpiVpa
      ? generateQrSvgString(
          generateAcademyUpiPayLink({
            vpa: initialUpiVpa,
            name: academyName,
            amount: qrStudent.monthlyFee || Number(feeAmount || 0),
            note: `${academyName} Fee - ${qrStudent.studentName}`,
          }),
          { size: 160 },
        )
      : ''

    return (
      <div className="kg-acad-stack" data-testid="academy-fees-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Fee Tracking &amp; Direct UPI Ledger</h2>
            <p className="kg-acad-muted">
              Issue invoices and record offline cash, bank transfer, or direct academy UPI receipts. Online payment gateway collection remains paused (0% commission).
            </p>
          </div>
          <span className="kg-acad-pill is-info">Payment Collection Paused · Zero Commission Direct UPI</span>
        </div>

        {capabilities.canManageFinance && (
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleRecordReceipt(e)}>
            <h3>Issue Invoice or Record Fee Receipt</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Athlete *</span>
                <select
                  required
                  value={feeStudentId}
                  onChange={e => {
                    const id = e.target.value
                    setFeeStudentId(id)
                    const st = athletes.find(a => a.id === id)
                    if (st && st.monthlyFee > 0) setFeeAmount(String(st.monthlyFee))
                  }}
                >
                  <option value="">Select athlete</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.studentName} (₹{a.monthlyFee})</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Amount (INR) *</span>
                <input type="number" min={1} required value={feeAmount} onChange={e => setFeeAmount(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Payment Mode</span>
                <select value={feeMode} onChange={e => setFeeMode(e.target.value as AcademyFeeTransactionRecord['paymentMode'])}>
                  <option value="direct_upi">Direct Academy UPI</option>
                  <option value="cash">Cash Counter</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="cheque">Cheque</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Billing Month *</span>
                <input type="month" required value={feeMonth} onChange={e => setFeeMonth(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Invoice Due Date</span>
                <input type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Reference / UTR Note</span>
                <input type="text" placeholder="UTR / Receipt Note" value={feeNotes} onChange={e => setFeeNotes(e.target.value)} />
              </label>
            </div>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary" disabled={!feeStudentId}>
                Record Official Receipt
              </button>
              <button type="button" className="kg-acad-btn-outline" disabled={!feeStudentId} onClick={() => void handleIssueInvoice()}>
                Issue Fee Invoice
              </button>
              {feeStudentId && initialUpiVpa && (
                <button type="button" className="kg-acad-btn-outline" onClick={() => setQrStudentId(feeStudentId)}>
                  Show Direct UPI QR
                </button>
              )}
            </div>
          </form>
        )}

        {qrStudent && qrSvg && (
          <section className="kg-acad-card is-highlight">
            <div className="kg-acad-card-head">
              <h3>Direct UPI Scan for {qrStudent.studentName} ({initialUpiVpa})</h3>
              <button type="button" className="kg-acad-btn-outline" onClick={() => setQrStudentId(null)}>Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </section>
        )}

        <section className="kg-acad-card">
          <h3>Student Fee Invoices ({feeInvoices.length})</h3>
          {feeInvoices.length === 0 ? (
            <EmptyState title="No fee invoices issued yet" description="Issue monthly fee invoices above or settle direct UPI receipts." />
          ) : (
            <div className="kg-acad-table-wrap">
              <table className="kg-acad-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Athlete</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    {capabilities.canManageFinance && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {feeInvoices.map(inv => {
                    const name = athletes.find(a => a.id === inv.studentId)?.studentName || inv.studentId.slice(0, 8)
                    return (
                      <tr key={inv.id}>
                        <td><code>{inv.invoiceNumber}</code></td>
                        <td>{name}</td>
                        <td><strong>₹{inv.amount.toLocaleString('en-IN')}</strong></td>
                        <td>{inv.dueDate}</td>
                        <td><span className={`kg-acad-pill ${inv.status === 'paid' ? 'is-emerald' : 'is-warning'}`}>{inv.status.replace('_', ' ')}</span></td>
                        {capabilities.canManageFinance && (
                          <td>
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="kg-acad-btn-outline"
                                onClick={async () => {
                                  const res = await recordAcademyFeeReceipt({
                                    tenantId,
                                    studentId: inv.studentId,
                                    invoiceId: inv.id,
                                    amount: inv.amount,
                                    paymentMode: 'direct_upi',
                                    collectedByName: actorName,
                                    billingMonth: inv.billingMonth,
                                    notes: `Settled invoice ${inv.invoiceNumber}`,
                                  })
                                  onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                  if (res.success) await onRefresh()
                                }}
                              >
                                Settle Invoice
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="kg-acad-card">
          <h3>Recorded Fee Receipts ({feeTransactions.length})</h3>
          {feeTransactions.length === 0 ? (
            <EmptyState title="No fee receipts recorded" description="Record offline or direct UPI fee receipts above." />
          ) : (
            <div className="kg-acad-table-wrap">
              <table className="kg-acad-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Athlete</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Month &amp; Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTransactions.map(t => {
                    const name = athletes.find(a => a.id === t.studentId)?.studentName || t.studentId.slice(0, 8)
                    return (
                      <tr key={t.id}>
                        <td><code>{t.receiptNumber}</code></td>
                        <td>{name}</td>
                        <td><strong>₹{t.amount.toLocaleString('en-IN')}</strong></td>
                        <td>{t.paymentMode.replace('_', ' ')}</td>
                        <td>{t.billingMonth} ({t.collectedDate})</td>
                        <td><span className="kg-acad-pill is-emerald">{t.status.replace('_', ' ')}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
  }

  // =========================================================================
  // 4. STAFF & 7-ROLE RBAC + BRANCH SCOPING
  // =========================================================================
  if (mode === 'staff') {
    const handleInvite = async (e: FormEvent) => {
      e.preventDefault()
      const res = await inviteAcademyStaff(tenantId, inviteEmail, inviteRole, inviteBranchIds)
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setInviteEmail('')
        setInviteBranchIds([])
        await onRefresh()
      }
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-staff-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Staff, 7-Role RBAC &amp; Branch Scoping</h2>
            <p className="kg-acad-muted">
              Invite team members by email, assign academy roles, and optionally lock Managers or Coaches to specific academy branches.
            </p>
          </div>
        </div>

        {capabilities.canManageStaff && (
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleInvite(e)}>
            <h3>Invite Academy Team Member</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Staff Email Address *</span>
                <input type="email" required placeholder="coach@academy.in" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Academy Role *</span>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {INVITABLE_ACADEMY_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {branches.length > 0 && (
              <div className="kg-acad-subblock">
                <span>Optional Branch Restriction (leave unchecked for full academy access):</span>
                <div className="kg-acad-btn-row" style={{ marginTop: '0.4rem' }}>
                  {branches.map(b => (
                    <label key={b.id} className="kg-acad-checkbox">
                      <input
                        type="checkbox"
                        checked={inviteBranchIds.includes(b.id)}
                        onChange={e =>
                          setInviteBranchIds(prev =>
                            e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id),
                          )
                        }
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary">Send Secure Invitation</button>
            </div>
          </form>
        )}

        <section className="kg-acad-card">
          <h3>Authorized Academy Team ({staffMembers.length})</h3>
          {staffMembers.length === 0 ? (
            <EmptyState title="No team members listed" description="Invite coaches, branch managers, or admissions coordinators above." />
          ) : (
            <div className="kg-acad-table-wrap">
              <table className="kg-acad-table">
                <thead>
                  <tr>
                    <th>Member / Email</th>
                    <th>Role</th>
                    <th>Branch Scope</th>
                    <th>Status</th>
                    {capabilities.canManageStaff && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(m => {
                    const isSelf = m.userId === actorUserId
                    const isOwner = m.role === 'owner'
                    const scopeNames = m.branchUnitIds.length === 0
                      ? 'All Branches'
                      : m.branchUnitIds.map(uid => branches.find(b => b.id === uid)?.name || uid.slice(0, 6)).join(', ')
                    return (
                      <tr key={m.membershipId}>
                        <td>
                          <strong>{m.invitedEmail || (isSelf ? 'You (Signed-in Member)' : `User ${m.userId?.slice(0, 8)}`)}</strong>
                        </td>
                        <td>
                          {capabilities.canManageStaff && !isSelf && !isOwner ? (
                            <select
                              value={m.role}
                              onChange={async e => {
                                const res = await updateAcademyStaffMember(tenantId, m.membershipId, e.target.value, m.branchUnitIds)
                                onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                if (res.success) await onRefresh()
                              }}
                            >
                              {INVITABLE_ACADEMY_ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="kg-acad-pill is-info">{m.role}</span>
                          )}
                        </td>
                        <td>{scopeNames}</td>
                        <td><span className={`kg-acad-pill ${m.status === 'active' ? 'is-emerald' : 'is-warning'}`}>{m.status}</span></td>
                        {capabilities.canManageStaff && (
                          <td>
                            {!isSelf && !isOwner && m.status === 'active' && (
                              <button
                                type="button"
                                className="kg-acad-btn-outline is-danger"
                                onClick={async () => {
                                  const res = await updateAcademyStaffMember(tenantId, m.membershipId, m.role, m.branchUnitIds, 'suspended')
                                  onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                  if (res.success) await onRefresh()
                                }}
                              >
                                Suspend Access
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
  }

  // =========================================================================
  // 5. SETTINGS, DPDP PRIVACY, AUDIT TRAIL & OWNERSHIP TRANSFER
  // =========================================================================
  const transferEligible = staffMembers.filter(m => m.userId && m.userId !== actorUserId && m.status === 'active')

  return (
    <div className="kg-acad-stack" data-testid="academy-settings-panel">
      <div className="kg-acad-section-head">
        <div>
          <h2>Academy Settings, Privacy &amp; Security Audit</h2>
          <p className="kg-acad-muted">
            Configure direct NPCI UPI settings, DPDP minor PII protection, inspect immutable audit logs, and manage ownership transfer.
          </p>
        </div>
      </div>

      <form
        className="kg-acad-card kg-acad-form"
        onSubmit={async e => {
          e.preventDefault()
          const res = await saveAcademySecuritySettings(tenantId, {
            upiVpa,
            dpdpMaskMinorsDefault: dpdpMaskEnabled,
            emergencyHotline: hotline,
            pocsoOfficerName: pocsoOfficer,
            existingSettings: tenantSettings,
          })
          onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
          if (res.success) await onRefresh()
        }}
      >
        <h3>DPDP Minor Shield &amp; Direct UPI Settings</h3>
        <div className="kg-acad-form-grid">
          <label className="kg-acad-field">
            <span>Academy Direct UPI VPA (NPCI Verified Format)</span>
            <input type="text" placeholder="academy@oksbi" disabled={!capabilities.canManageSettings} value={upiVpa} onChange={e => setUpiVpa(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>POCSO / Safeguarding Officer Name</span>
            <input type="text" disabled={!capabilities.canManageSettings} value={pocsoOfficer} onChange={e => setPocsoOfficer(e.target.value)} />
          </label>
          <label className="kg-acad-field">
            <span>Emergency Medical Hotline</span>
            <input type="tel" disabled={!capabilities.canManageSettings} value={hotline} onChange={e => setHotline(e.target.value)} />
          </label>
        </div>
        <div className="kg-acad-btn-row" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="kg-acad-btn-outline" onClick={onToggleDpdpMask}>
            DPDP Minor PII Masking: {dpdpMaskEnabled ? 'ON (Masked)' : 'OFF (Full)'}
          </button>
          {capabilities.canManageSettings && (
            <button type="submit" className="kg-acad-btn-primary">Save Security Settings</button>
          )}
        </div>
      </form>

      {capabilities.canTransferOwnership && transferEligible.length > 0 && (
        <section className="kg-acad-card">
          <h3>Transfer Academy Ownership (Owner Only)</h3>
          <p className="kg-acad-muted">
            Transfer primary ownership to an active verified team member cleanly without breaking historical academy data.
          </p>
          <div className="kg-acad-inline-row">
            <select value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
              <option value="">Select target active member…</option>
              {transferEligible.map(m => (
                <option key={m.membershipId} value={m.userId!}>
                  {m.invitedEmail || m.userId} ({m.role})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="kg-acad-btn-outline is-danger"
              disabled={!transferTargetId}
              onClick={() => setConfirmTransferOpen(true)}
            >
              Transfer Ownership
            </button>
          </div>
          <ConfirmDialog
            open={confirmTransferOpen}
            title="Transfer Academy Ownership?"
            message="This transfers owner authority to the selected active member and updates your role to Administrator."
            confirmLabel="Confirm Ownership Transfer"
            destructive
            onCancel={() => setConfirmTransferOpen(false)}
            onConfirm={async () => {
              setConfirmTransferOpen(false)
              const res = await transferAcademyOwnership(tenantId, transferTargetId)
              onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
              if (res.success) await onRefresh()
            }}
          />
        </section>
      )}

      <section className="kg-acad-card">
        <h3>Immutable Security &amp; Operational Audit Trail</h3>
        {auditLogs.length === 0 ? (
          <EmptyState title="No audit events logged yet" description="Critical mutations appear here with timestamped attribution." />
        ) : (
          <div className="kg-acad-table-wrap">
            <table className="kg-acad-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td><strong>{log.action}</strong></td>
                    <td>{log.entity_type}</td>
                    <td className="kg-acad-muted">{log.created_at.replace('T', ' ').slice(0, 19)}</td>
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
