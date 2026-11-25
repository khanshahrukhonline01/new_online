import { useState, useId, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../shared/components/ui/WorkspaceDetailDrawer'
import { FeeReceiptDrawerContent } from '../../shared/components/workflows/FeeReceiptDrawerContent'
import {
  getParentStudentProfiles,
  getStudentAttendanceHistory,
  getStudentFeeInvoices,
  recordParentUpiPayment,
  generateDirectUpiDeepLink,
  generateParentFeeWhatsAppShareUrl,
  type ParentStudentProfile,
  type ParentFeeInvoice,
} from './parentPortalService'
import './ParentPortalPage.css'

export interface ParentPortalPageProps {
  initialStudentId?: string
  initialTab?: 'attendance' | 'fees' | 'health'
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function ParentPortalPage({
  initialStudentId = 'st-01',
  initialTab = 'attendance',
}: ParentPortalPageProps) {
  const students = getParentStudentProfiles()
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('student')
      if (param && students.some(s => s.studentId === param)) return param
    }
    return initialStudentId
  })
  const [activeTab, setActiveTab] = useState<'attendance' | 'fees' | 'health'>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab')
      if (tabParam === 'fees' || tabParam === 'health' || tabParam === 'attendance') return tabParam
    }
    return initialTab
  })

  // Share link state
  const [copiedLink, setCopiedLink] = useState(false)
  const handleCopyPassbookLink = () => {
    if (typeof window === 'undefined') return
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
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('')

  // Receipt Modal state
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<ParentFeeInvoice | null>(null)

  const student: ParentStudentProfile =
    students.find(s => s.studentId === selectedStudentId) || students[0]

  const attendanceSessions = getStudentAttendanceHistory(student.studentId)
  const feeInvoices = getStudentFeeInvoices(student.studentId)

  const presentCount = attendanceSessions.filter(s => s.status === 'PRESENT').length
  const totalSessions = attendanceSessions.length
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : student.attendancePercentage

  const pendingInvoices = feeInvoices.filter(i => i.status !== 'PAID')
  const totalPendingBalance = pendingInvoices.reduce((sum, i) => sum + i.netAmount, 0)

  const studentSelectId = useId()
  const utrInputId = useId()

  const handleConfirmPayment = () => {
    if (!payingInvoice) return
    const res = recordParentUpiPayment(payingInvoice.invoiceId, utrRef)
    if (res.success) {
      setPaymentSuccessMsg(res.message)
      setTimeout(() => {
        setPayingInvoice(null)
        setUtrRef('')
        setPaymentSuccessMsg('')
      }, 1500)
    }
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
            {attendanceSessions.map(sess => (
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
            ))}
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
            {feeInvoices.map(inv => {
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
                    {inv.status !== 'PAID' ? (
                      <>
                        <a href={upiLink} className="btn-pay-upi">
                          <SiteIcon name="credit-card" size={15} /> Pay ₹{inv.netAmount} via UPI App
                        </a>
                        <button
                          type="button"
                          className="btn-mark-paid"
                          onClick={() => setPayingInvoice(inv)}
                        >
                          I Already Paid (Submit UTR)
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-view-receipt"
                        onClick={() => setViewingReceiptInvoice(inv)}
                      >
                        <SiteIcon name="download" size={15} /> Download Tax Receipt
                      </button>
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
            })}
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
              <p><strong>Academy Medical Lead:</strong> Dr. Sneha Pillai (Certified Sports Physio)</p>
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
              <h3>Confirm Direct UPI Payment</h3>
              <button type="button" onClick={() => setPayingInvoice(null)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {paymentSuccessMsg ? (
                <div className="success-banner">{paymentSuccessMsg}</div>
              ) : (
                <>
                  <p>
                    Please transfer <strong>₹{payingInvoice.netAmount.toLocaleString('en-IN')}</strong> to Academy VPA:{' '}
                    <code>{student.academyUpiVpa}</code>.
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
                    <button type="button" className="btn-primary" onClick={handleConfirmPayment}>
                      Confirm Payment
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
