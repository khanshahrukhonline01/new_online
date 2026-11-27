import { useState, useEffect, useId, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { useTenant } from '../../shared/context/useTenant'
import { WorkspaceDetailDrawer } from '../../shared/components/ui/WorkspaceDetailDrawer'
import { FeeReceiptDrawerContent } from '../../shared/components/workflows/FeeReceiptDrawerContent'
import {
  getRemoteParentStudentProfiles,
  getRemoteStudentAttendanceHistory,
  getRemoteStudentFeeInvoices,
  submitParentUpiProofRemote,
  generateDirectUpiDeepLink,
  generateParentFeeWhatsAppShareUrl,
  type ParentStudentProfile,
  type ParentAttendanceSession,
  type ParentFeeInvoice,
} from './parentPortalService'
import './ParentPortalPage.css'

export interface ParentPortalPageProps {
  initialStudentId?: string
  initialTab?: 'attendance' | 'fees' | 'health'
  workspaceSection?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

function resolveParentTabForSection(section?: string): 'attendance' | 'fees' | 'health' | null {
  if (!section) return null
  switch (section) {
    case 'fees':
    case 'invoices': return 'fees'
    case 'health':
    case 'passes':
    case 'qr': return 'health'
    case 'attendance':
    case 'wards':
    case 'overview': return 'attendance'
    default: return null
  }
}

export default function ParentPortalPage({
  initialStudentId = '',
  initialTab = 'attendance',
  workspaceSection,
  onNavigate,
}: ParentPortalPageProps) {
  const { openAuth } = useAuth()
  const { userId, isAuthenticated: tenantAuthenticated, isLoading: tenantLoading } = useTenant()
  const isSignedIn = Boolean(userId && tenantAuthenticated)

  const [students, setStudents] = useState<ParentStudentProfile[]>([])
  const [attendanceSessions, setAttendanceSessions] = useState<ParentAttendanceSession[]>([])
  const [feeInvoices, setFeeInvoices] = useState<ParentFeeInvoice[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId)
  const [activeTab, setActiveTab] = useState<'attendance' | 'fees' | 'health'>(() => {
    const mapped = resolveParentTabForSection(workspaceSection)
    if (mapped) return mapped
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab')
      if (tabParam === 'fees' || tabParam === 'health' || tabParam === 'attendance') return tabParam
    }
    return initialTab
  })

  useEffect(() => {
    const mapped = resolveParentTabForSection(workspaceSection)
    if (mapped) setActiveTab(mapped)
  }, [workspaceSection])

  useEffect(() => {
    if (!isSignedIn) {
      setStudents([])
      setAttendanceSessions([])
      setFeeInvoices([])
      setLoadingProfiles(false)
      return
    }
    let active = true
    setLoadingProfiles(true)
    void getRemoteParentStudentProfiles()
      .then(remoteStudents => {
        if (!active) return
        setStudents(remoteStudents)
        const queryStudent =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('student') : null
        const preferred =
          (queryStudent && remoteStudents.find(s => s.studentId === queryStudent)?.studentId) ||
          (initialStudentId && remoteStudents.find(s => s.studentId === initialStudentId)?.studentId) ||
          remoteStudents[0]?.studentId ||
          ''
        setSelectedStudentId(preferred)
      })
      .finally(() => {
        if (active) setLoadingProfiles(false)
      })
    return () => {
      active = false
    }
  }, [isSignedIn, initialStudentId])

  useEffect(() => {
    if (!isSignedIn || !selectedStudentId) {
      setAttendanceSessions([])
      setFeeInvoices([])
      return
    }
    let active = true
    void Promise.all([
      getRemoteStudentAttendanceHistory(selectedStudentId),
      getRemoteStudentFeeInvoices(selectedStudentId),
    ]).then(([att, inv]) => {
      if (!active) return
      setAttendanceSessions(att)
      setFeeInvoices(inv)
    })
    return () => {
      active = false
    }
  }, [isSignedIn, selectedStudentId])

  // Share link state
  const [copiedLink, setCopiedLink] = useState(false)
  const handleCopyPassbookLink = () => {
    if (typeof window === 'undefined' || !selectedStudentId) return
    const url = `${window.location.origin}/parent-portal?student=${selectedStudentId}&tab=${activeTab}`
    try {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // fallback
    }
  }

  // Payment Modal state
  const [payingInvoice, setPayingInvoice] = useState<ParentFeeInvoice | null>(null)
  const [utrRef, setUtrRef] = useState('')
  const [paymentStatusMsg, setPaymentStatusMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Receipt Modal state
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<ParentFeeInvoice | null>(null)

  const studentSelectId = useId()
  const utrInputId = useId()

  if (tenantLoading) {
    return (
      <div className="parent-portal-container">
        <section className="portal-content-panel" role="status" aria-live="polite">
          <h2>Verifying guardian session…</h2>
          <p>Checking authenticated session before loading guardian passbooks.</p>
        </section>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="parent-portal-container">
        <section className="portal-content-panel" aria-labelledby="parent-auth-required-title">
          <div className="parent-portal-eyebrow">
            <SiteIcon name="shield-check" size={16} />
            <span>KhelGrid Guardian-Verified Passbook (DPDP 2023)</span>
          </div>
          <h1 id="parent-auth-required-title">Sign in required</h1>
          <p>
            Sign in with your verified parent or guardian account linked by your sports academy to view live student attendance, fee invoices, and digital ground passes.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openAuth({ tab: 'login', redirectTo: '/parent-portal' })}
            >
              Sign in as Guardian
            </button>
            <a
              href="/demo?persona=parent"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
              onClick={e => onNavigate?.(e, '/demo?persona=parent')}
            >
              View Sample Demo Tour →
            </a>
          </div>
        </section>
      </div>
    )
  }

  if (loadingProfiles) {
    return (
      <div className="parent-portal-container">
        <section className="portal-content-panel" role="status" aria-live="polite">
          <h2>Loading guardian passbooks…</h2>
          <p>Verifying linked athlete records under guardian access policy.</p>
        </section>
      </div>
    )
  }

  const student: ParentStudentProfile | undefined =
    students.find(s => s.studentId === selectedStudentId) || students[0]

  if (!student) {
    return (
      <div className="parent-portal-container">
        <section className="portal-content-panel">
          <div className="parent-portal-eyebrow">
            <SiteIcon name="shield-check" size={16} />
            <span>KhelGrid Guardian-Verified Passbook (DPDP 2023)</span>
          </div>
          <h1>No linked athlete passbooks yet</h1>
          <p>
            No academy student records are currently linked to your verified account. Ask your academy director or admissions coordinator to link your guardian email under student enrollment.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <a
              href="/academies"
              className="btn-primary"
              style={{ textDecoration: 'none' }}
              onClick={e => onNavigate?.(e, '/academies')}
            >
              Browse Verified Academies →
            </a>
            <a
              href="/demo?persona=parent"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
              onClick={e => onNavigate?.(e, '/demo?persona=parent')}
            >
              View Sample Demo Tour →
            </a>
          </div>
        </section>
      </div>
    )
  }

  const presentCount = attendanceSessions.filter(s => s.status === 'PRESENT').length
  const totalSessions = attendanceSessions.length
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

  const pendingInvoices = feeInvoices.filter(i => i.status !== 'PAID')
  const totalPendingBalance = pendingInvoices.reduce((sum, i) => sum + i.netAmount, 0)

  const handleConfirmPayment = async () => {
    if (!payingInvoice) return
    const res = await submitParentUpiProofRemote({
      invoiceId: payingInvoice.invoiceId,
      utrRef,
    })
    if (!res.success) {
      setPaymentStatusMsg({ kind: 'error', text: res.message })
      return
    }
    const cleanRef = utrRef.trim()
    setFeeInvoices(prev =>
      prev.map(inv =>
        inv.invoiceId === payingInvoice.invoiceId
          ? {
              ...inv,
              status: 'PENDING_VERIFICATION',
              paymentMethod: 'UPI_DIRECT',
              transactionRef: cleanRef,
            }
          : inv,
      ),
    )
    setPaymentStatusMsg({ kind: 'success', text: res.message })
    setTimeout(() => {
      setPayingInvoice(null)
      setUtrRef('')
      setPaymentStatusMsg(null)
    }, 1500)
  }

  return (
    <div className="parent-portal-container">
      {/* Top Header */}
      <header className="parent-portal-header">
        <div className="parent-portal-header-left">
          <div className="parent-portal-eyebrow">
            <SiteIcon name="shield-check" size={16} />
            <span>KhelGrid Grassroots Athlete &amp; Parent OS</span>
            <span className="zero-comm-badge">0% Commission Guaranteed</span>
          </div>
          <h1>Parent Passbook &amp; Ground Pass</h1>
          <p>
            Real-time academy attendance, direct UPI fee receipts, and official coach progress updates for your young athlete.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="student-switcher-box">
            <label htmlFor={studentSelectId}>Select Child / Athlete:</label>
            <select
              id={studentSelectId}
              value={selectedStudentId}
              onChange={e => {
                setSelectedStudentId(e.target.value)
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href)
                  url.searchParams.set('student', e.target.value)
                  window.history.replaceState({}, '', url.toString())
                }
              }}
              className="student-select"
            >
              {students.map(s => (
                <option key={s.studentId} value={s.studentId}>
                  {s.studentName} · {s.academyName} ({s.rollNumber})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleCopyPassbookLink}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: copiedLink ? '#dcfce7' : '#ffffff',
              color: copiedLink ? '#166534' : '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: 'fit-content',
            }}
            title="Copy link to this athlete passbook"
          >
            <SiteIcon name={copiedLink ? 'check' : 'share'} size={14} />
            <span>{copiedLink ? 'Link Copied!' : 'Share Passbook'}</span>
          </button>
        </div>
      </header>

      {/* Athlete ID Card / Ground Pass Banner */}
      <div className="athlete-ground-pass-card">
        <div className="pass-meta-left">
          <div className="athlete-avatar-circle">
            {student.studentName.charAt(0)}
          </div>
          <div className="athlete-details">
            <div className="athlete-name-row">
              <h2>{student.studentName}</h2>
              <span className="roll-pill">Roll: {student.rollNumber}</span>
              <span className={`rtp-pill ${student.rtpClearance.toLowerCase()}`}>
                RTP: {student.rtpClearance}
              </span>
            </div>
            <p className="academy-subtext">
              <strong>{student.academyName}</strong> · {student.batchName} ({student.sport})
            </p>
            <div className="athlete-quick-stats">
              <span><strong>Coach:</strong> {student.coachName}</span>
              <span><strong>Attendance:</strong> {attendanceRate}%</span>
              <span><strong>Blood Group:</strong> {student.bloodGroup}</span>
              <span><strong>KhelPassport:</strong> <code>{student.khelPassportId}</code></span>
            </div>
          </div>
        </div>

        <div className="pass-qr-box">
          <div className="qr-visual-placeholder">
            <SiteIcon name="shield-check" size={48} />
          </div>
          <span className="qr-label">Digital Ground Pass</span>
          <small>Show at turnstile gate</small>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="parent-kpi-grid">
        <div className="parent-kpi-card">
          <span className="kpi-label">Attendance Record</span>
          <strong className="kpi-val highlight-green">{attendanceRate}%</strong>
          <span className="kpi-sub">{presentCount} of {totalSessions} sessions attended</span>
        </div>
        <div className="parent-kpi-card">
          <span className="kpi-label">Outstanding Balance</span>
          <strong className={`kpi-val ${totalPendingBalance > 0 ? 'highlight-amber' : 'highlight-green'}`}>
            ₹{totalPendingBalance.toLocaleString('en-IN')}
          </strong>
          <span className="kpi-sub">{pendingInvoices.length} pending billing notice(s)</span>
        </div>
        <div className="parent-kpi-card">
          <span className="kpi-label">Monthly Coaching Fee</span>
          <strong className="kpi-val">₹{student.monthlyFee.toLocaleString('en-IN')}</strong>
          <span className="kpi-sub">Direct UPI to {student.academyUpiVpa}</span>
        </div>
        <div className="parent-kpi-card">
          <span className="kpi-label">Emergency Protocol</span>
          <strong className="kpi-val">{student.emergencyContactPhone}</strong>
          <span className="kpi-sub">Blood Group: {student.bloodGroup}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="parent-portal-tabs" aria-label="Portal Navigation">
        <button
          type="button"
          className={`portal-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('attendance')
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.set('tab', 'attendance')
              window.history.replaceState({}, '', url.toString())
            }
          }}
        >
          <SiteIcon name="calendar-check" size={16} /> Attendance Passbook
        </button>
        <button
          type="button"
          className={`portal-tab-btn ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('fees')
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.set('tab', 'fees')
              window.history.replaceState({}, '', url.toString())
            }
          }}
        >
          <SiteIcon name="credit-card" size={16} /> Fee Invoices &amp; Receipts
          {pendingInvoices.length > 0 && <span className="tab-pill-badge">{pendingInvoices.length}</span>}
        </button>
        <button
          type="button"
          className={`portal-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('health')
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.set('tab', 'health')
              window.history.replaceState({}, '', url.toString())
            }
          }}
        >
          <SiteIcon name="activity" size={16} /> Health, Injury &amp; RTP
        </button>
      </nav>

      {/* Tab 1: Attendance Passbook */}
      {activeTab === 'attendance' && (
        <section className="portal-content-panel">
          <div className="panel-header">
            <div>
              <h3>Training Session Attendance History</h3>
              <p>Daily biometric and coach-marked ground attendance records.</p>
            </div>
            <span className="attendance-streak-badge">
              🔥 Current Streak: {presentCount} Days
            </span>
          </div>

          <div className="attendance-timeline">
            {attendanceSessions.length === 0 ? (
              <p className="portal-empty-note" role="status">
                No training session attendance events recorded for this athlete yet.
              </p>
            ) : (
              attendanceSessions.map(sess => (
                <div key={sess.id} className="attendance-timeline-item">
                  <div className="att-date-col">
                    <strong>{sess.date}</strong>
                    <small>{sess.markedBy}</small>
                  </div>
                  <div className="att-status-col">
                    <span className={`att-pill ${sess.status.toLowerCase()}`}>
                      {sess.status === 'PRESENT' ? '✅ Present' : sess.status === 'EXCUSED' ? 'ℹ️ Excused' : '❌ Absent'}
                    </span>
                  </div>
                  <div className="att-detail-col">
                    <h4>{sess.sessionTopic}</h4>
                    {sess.coachNotes && <p className="att-notes">Coach note: "{sess.coachNotes}"</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Tab 2: Fees & Tax Invoices */}
      {activeTab === 'fees' && (
        <section className="portal-content-panel">
          <div className="panel-header">
            <div>
              <h3>Fee Invoices &amp; Tax Receipts</h3>
              <p>Direct UPI settlement with zero platform commission deductions.</p>
            </div>
          </div>

          <div className="fee-invoices-grid">
            {feeInvoices.length === 0 ? (
              <p className="portal-empty-note" role="status">
                No fee invoices have been issued for this athlete yet.
              </p>
            ) : (
              feeInvoices.map(inv => {
              const upiLink = generateDirectUpiDeepLink(inv, student)
              const waUrl = generateParentFeeWhatsAppShareUrl(inv, student)

              return (
                <div key={inv.invoiceId} className={`invoice-card ${inv.status.toLowerCase()}`}>
                  <div className="invoice-header">
                    <span className="invoice-id">#{inv.invoiceId}</span>
                    <span className={`invoice-status-tag ${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="invoice-body">
                    <h4>{inv.monthYear} Coaching Fee</h4>
                    <div className="invoice-breakdown">
                      <div className="line-item">
                        <span>Tuition Fee</span>
                        <span>₹{inv.tuitionFee.toLocaleString('en-IN')}</span>
                      </div>
                      {inv.kitUniformFee > 0 && (
                        <div className="line-item">
                          <span>Kit / Uniform</span>
                          <span>₹{inv.kitUniformFee.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {inv.tournamentEntryFee > 0 && (
                        <div className="line-item">
                          <span>Tournament Registration</span>
                          <span>₹{inv.tournamentEntryFee.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {inv.discountAmount > 0 && (
                        <div className="line-item discount">
                          <span>Scholarship Discount</span>
                          <span>-₹{inv.discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="line-item total">
                        <strong>Net Amount Due</strong>
                        <strong>₹{inv.netAmount.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <div className="invoice-footer-meta">
                      <small>Due Date: <strong>{inv.dueDate}</strong></small>
                      {inv.paidDate && <small>Paid on: {inv.paidDate} ({inv.transactionRef})</small>}
                    </div>
                  </div>

                  <div className="invoice-actions">
                    {inv.status === 'PAID' ? (
                      <button
                        type="button"
                        className="btn-view-receipt"
                        onClick={() => setViewingReceiptInvoice(inv)}
                      >
                        <SiteIcon name="download" size={15} /> Download Tax Receipt
                      </button>
                    ) : inv.status === 'PENDING_VERIFICATION' ? (
                      <span className="invoice-status-tag pending" role="status">
                        UTR Submitted · Pending Academy Verification
                      </span>
                    ) : (
                      <>
                        {student.academyUpiVpa && (
                          <a href={upiLink} className="btn-pay-upi">
                            <SiteIcon name="credit-card" size={15} /> Pay ₹{inv.netAmount} via UPI App
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-mark-paid"
                          onClick={() => setPayingInvoice(inv)}
                        >
                          Submit Payment UTR for Verification
                        </button>
                      </>
                    )}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp-share"
                    >
                      <SiteIcon name="share" size={14} /> WhatsApp Copy
                    </a>
                  </div>
                </div>
              )
            })
            )}
          </div>
        </section>
      )}

      {/* Tab 3: Health, Injury & RTP */}
      {activeTab === 'health' && (
        <section className="portal-content-panel">
          <div className="panel-header">
            <div>
              <h3>Health, Emergency &amp; Return-To-Play (RTP) Protocol</h3>
              <p>Medical clearance tracking to ensure athlete safety before high-intensity drills.</p>
            </div>
            <span className={`rtp-badge-large ${student.rtpClearance.toLowerCase()}`}>
              Status: {student.rtpClearance}
            </span>
          </div>

          <div className="health-details-grid">
            <div className="health-card">
              <h4>Blood Group &amp; Biometrics</h4>
              <p><strong>Blood Group:</strong> {student.bloodGroup}</p>
              <p><strong>Emergency Contact:</strong> {student.emergencyContactPhone} ({student.parentName})</p>
              <p><strong>Academy Verification Contact:</strong> {student.academyName}</p>
            </div>

            <div className="health-card">
              <h4>Active Injury Status</h4>
              <p>
                {student.activeInjuries ? (
                  <span className="injury-warning">⚠️ {student.activeInjuries}</span>
                ) : (
                  <span className="injury-clear">✅ No active injuries reported. Fully fit for competition.</span>
                )}
              </p>
              <p className="rtp-explanation">
                <strong>Return-To-Play Policy:</strong> Any athlete returning from a Grade 2+ sprain or concussion requires sign-off from academy physio prior to tournament squad selection.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Direct UPI / UTR Payment Modal */}
      {payingInvoice && (
        <div className="parent-portal-modal-overlay" onClick={() => setPayingInvoice(null)}>
          <div className="parent-portal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Direct UPI Reference for Verification</h3>
              <button type="button" onClick={() => setPayingInvoice(null)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {paymentStatusMsg && (
                <div
                  role={paymentStatusMsg.kind === 'error' ? 'alert' : 'status'}
                  className={paymentStatusMsg.kind === 'error' ? 'alert-banner' : 'success-banner'}
                >
                  {paymentStatusMsg.text}
                </div>
              )}
              {paymentStatusMsg?.kind !== 'success' && (
                <>
                  <p>
                    Transfer <strong>₹{payingInvoice.netAmount.toLocaleString('en-IN')}</strong> directly to Academy VPA:{' '}
                    <code>{student.academyUpiVpa || 'Configured by Academy'}</code>, then submit your 12-digit UTR for academy verification.
                  </p>
                  <div className="form-group">
                    <label htmlFor={utrInputId}>12-Digit Bank UTR / UPI Transaction Reference:</label>
                    <input
                      id={utrInputId}
                      type="text"
                      placeholder="e.g. 431289012345"
                      value={utrRef}
                      onChange={e => setUtrRef(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setPayingInvoice(null)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary" onClick={() => void handleConfirmPayment()}>
                      Submit UTR for Verification
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Receipt Slide-Over Drawer */}
      <WorkspaceDetailDrawer
        open={Boolean(viewingReceiptInvoice)}
        onClose={() => setViewingReceiptInvoice(null)}
        title={viewingReceiptInvoice ? `Official Academy Fee Receipt · ${student.academyName}` : 'Fee Receipt'}
        statusMessage={viewingReceiptInvoice ? '✅ VERIFIED BY KHELGRID · 0% Commission Fee Clearance' : undefined}
        width={560}
      >
        {viewingReceiptInvoice && (
          <>
            <FeeReceiptDrawerContent
              receipt={{
                receiptNumber: viewingReceiptInvoice.invoiceId,
                payerName: `${student.studentName} (Roll: ${student.rollNumber})`,
                recipientOrg: student.academyName,
                amountInr: viewingReceiptInvoice.netAmount,
                paymentMethod: `Direct UPI (${viewingReceiptInvoice.transactionRef})`,
                paidAt: viewingReceiptInvoice.paidDate || '2026-11-20',
                billingCycle: viewingReceiptInvoice.monthYear,
              }}
              onPrint={() => {
                if (typeof window !== 'undefined') window.print()
              }}
            />

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Fee Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Training &amp; Coaching Tuition</td>
                  <td>Coaching</td>
                  <td style={{ textAlign: 'right' }}>₹{viewingReceiptInvoice.tuitionFee.toLocaleString('en-IN')}</td>
                </tr>
                {viewingReceiptInvoice.kitUniformFee > 0 && (
                  <tr>
                    <td>Academy Training Kit &amp; Match Jersey</td>
                    <td>Kit</td>
                    <td style={{ textAlign: 'right' }}>₹{viewingReceiptInvoice.kitUniformFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {viewingReceiptInvoice.tournamentEntryFee > 0 && (
                  <tr>
                    <td>All-India Tournament Entry Fee</td>
                    <td>Tournament</td>
                    <td style={{ textAlign: 'right' }}>₹{viewingReceiptInvoice.tournamentEntryFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {viewingReceiptInvoice.discountAmount > 0 && (
                  <tr>
                    <td>Merit Scholarship / Sibling Discount</td>
                    <td>Discount</td>
                    <td style={{ textAlign: 'right' }}>-₹{viewingReceiptInvoice.discountAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total Paid via UPI (INR)</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>₹{viewingReceiptInvoice.netAmount.toLocaleString('en-IN')}</strong></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </WorkspaceDetailDrawer>
    </div>
  )
}
