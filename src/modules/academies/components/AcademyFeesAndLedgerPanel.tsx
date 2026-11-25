import type { MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  maskPhone,
  type FeeReconciliationSummary,
} from '../../../shared/saas/saasLaunchReadinessService'
import { generateWhatsAppPaymentReminderUrl } from '../../../shared/saas/saasSharedOperations'
import { downloadBlobFile, exportStudentsToCsv, exportTransactionsToCsv } from '../academyExportUtils'
import {
  generateWhatsAppFeeReminderUrl,
  recordStudentPayment,
  settleCashInHand,
  type AcademyFeeTransaction,
  type AcademyLedgerSummary,
  type AcademySettings,
  type AcademyStudent,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyFeesAndLedgerPanelProps {
  activeTab: 'fees' | 'ledger'
  currentAcademy: RegisteredAcademy
  settings: AcademySettings
  students: AcademyStudent[]
  feeTransactions: AcademyFeeTransaction[]
  ledgerSummary: AcademyLedgerSummary
  feeReconciliation: FeeReconciliationSummary
  dpdpSafeMode: boolean
  onOpenImportCsv: () => void
  onOpenAddStudent: () => void
  onOpenRecordPayment: () => void
  onSelectUpiQrStudent: (student: AcademyStudent) => void
  onSelectReceiptStudent: (student: AcademyStudent) => void
  onSelectEvaluationStudent: (student: AcademyStudent) => void
  onSelectCancellationStudent: (student: AcademyStudent) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onRefresh: () => void
}

/**
 * Renders the Academy Student Roster & UPI Fee Tracker and Cash & Direct UPI Financial Ledger tabs.
 */
export function AcademyFeesAndLedgerPanel({
  activeTab,
  currentAcademy,
  settings,
  students,
  feeTransactions,
  ledgerSummary,
  feeReconciliation,
  dpdpSafeMode,
  onOpenImportCsv,
  onOpenAddStudent,
  onOpenRecordPayment,
  onSelectUpiQrStudent,
  onSelectReceiptStudent,
  onSelectEvaluationStudent,
  onSelectCancellationStudent,
  onNavigate,
  onRefresh,
}: AcademyFeesAndLedgerPanelProps) {
  if (activeTab === 'fees') {
    return (
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
              onClick={onOpenImportCsv}
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
              onClick={onOpenAddStudent}
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
                    <small style={{ fontFamily: 'monospace', color: '#047857' }}>
                      {dpdpSafeMode ? maskPhone(student.parentPhone) : student.parentPhone}
                    </small>
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
                        href={student.feeStatus === 'overdue' ? generateWhatsAppPaymentReminderUrl({
                          studentName: student.studentName,
                          parentName: student.parentName,
                          parentPhone: student.parentPhone,
                          academyName: currentAcademy.name,
                          batchName: student.batchName,
                          monthlyFee: student.monthlyFee,
                          dueDate: student.nextDueDate,
                          upiVpa: settings.upiVpa,
                        }) : generateWhatsAppFeeReminderUrl(student, currentAcademy.name, settings.upiVpa)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crm-action-btn whatsapp"
                        title={student.feeStatus === 'overdue' ? 'Send WhatsApp Overdue Fee Reminder' : 'Send WhatsApp Fee Reminder'}
                        aria-label={`Send WhatsApp fee reminder to ${student.parentName}`}
                      >
                        <span aria-hidden="true">💬</span>
                      </a>

                      <button
                        type="button"
                        className="crm-action-btn"
                        title="Show UPI Payment QR"
                        aria-label={`Show UPI QR code for ${student.studentName}`}
                        onClick={() => onSelectUpiQrStudent(student)}
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
                            onRefresh()
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
                          onClick={() => onSelectReceiptStudent(student)}
                        >
                          <SiteIcon name="download" size={15} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="crm-action-btn"
                        title="Generate Quarterly Progress Report Card"
                        aria-label={`Progress report for ${student.studentName}`}
                        onClick={() => onSelectEvaluationStudent(student)}
                      >
                        <SiteIcon name="file-text" size={15} />
                      </button>

                      <a
                        href={`/parent-portal?student=${student.id}&tab=fees`}
                        onClick={e => onNavigate?.(e, `/parent-portal?student=${student.id}&tab=fees`)}
                        className="crm-action-btn"
                        title="Open Student Parent Passbook & UPI Invoicing"
                        aria-label={`Parent passbook for ${student.studentName}`}
                      >
                        <SiteIcon name="shield-check" size={15} />
                      </a>

                      <button
                        type="button"
                        className="crm-action-btn"
                        title="Cancel / Pause Membership & Calculate Prorated Refund"
                        aria-label={`Cancel or pause membership for ${student.studentName}`}
                        onClick={() => onSelectCancellationStudent(student)}
                      >
                        <SiteIcon name="alert-triangle" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="ledger-section-heading">
      <div className="academy-hub-section-header">
        <div>
          <h2 id="ledger-section-heading" className="academy-hub-section-title">
            Cash &amp; Direct UPI Financial Ledger
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Complete audit trail of monthly tuition fees collected across UPI, on-ground cash, and bank transfers with 0% platform deductions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="academy-hub-btn-outline"
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => {
              const csv = exportTransactionsToCsv(feeTransactions, currentAcademy.name)
              downloadBlobFile(`${currentAcademy.slug}-financial-ledger.csv`, csv)
            }}
          >
            <SiteIcon name="download" size={15} /> Export Ledger CSV
          </button>
          <button
            type="button"
            className="academy-hub-primary-btn"
            onClick={onOpenRecordPayment}
          >
            <SiteIcon name="plus" size={16} /> Record Offline Fee Payment
          </button>
        </div>
      </div>

      <div
        data-testid="fee-reconciliation-card"
        style={{
          background: feeReconciliation.isReconciled ? '#f0fdf4' : '#fffbeb',
          border: feeReconciliation.isReconciled ? '1px solid #bbf7d0' : '1px solid #fde68a',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SiteIcon name={feeReconciliation.isReconciled ? 'check-circle' : 'alert-triangle'} size={20} />
          <div>
            <strong style={{ color: feeReconciliation.isReconciled ? '#166534' : '#92400e', fontSize: '14px' }}>
              Fee Ledger Mathematical Reconciliation Audit
            </strong>
            <p style={{ margin: 0, fontSize: '12px', color: feeReconciliation.isReconciled ? '#15803d' : '#b45309' }}>
              Enrolled Expected: ₹{feeReconciliation.totalExpectedMonthly.toLocaleString('en-IN')} = Collected: ₹{feeReconciliation.totalCollected.toLocaleString('en-IN')} + Pending Dues: ₹{feeReconciliation.outstandingArrears.toLocaleString('en-IN')}
              {feeReconciliation.isReconciled ? ' · Zero Discrepancy Verified' : ` · Discrepancies: ${feeReconciliation.discrepancies.join('; ')}`}
            </p>
          </div>
        </div>
        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: feeReconciliation.isReconciled ? '#dcfce7' : '#fef3c7', fontWeight: 700, color: feeReconciliation.isReconciled ? '#15803d' : '#b45309' }}>
          {feeReconciliation.isReconciled ? '100% Balanced' : 'Audit Variance'}
        </span>
      </div>

      <div className="academy-ledger-grid">
        <div className="academy-ledger-card">
          <span className="academy-ledger-label">Total Monthly Expected</span>
          <span className="academy-ledger-value">₹{ledgerSummary.totalExpectedMonthly.toLocaleString('en-IN')}</span>
          <small style={{ color: '#64748b' }}>Active enrolled trainees</small>
        </div>

        <div className="academy-ledger-card">
          <span className="academy-ledger-label">Total Collected This Month</span>
          <span className="academy-ledger-value" style={{ color: '#059669' }}>₹{ledgerSummary.totalCollected.toLocaleString('en-IN')}</span>
          <small style={{ color: '#059669', fontWeight: 650 }}>{ledgerSummary.collectionRate}% collected rate</small>
        </div>

        <div className="academy-ledger-card">
          <span className="academy-ledger-label">Direct UPI Collections</span>
          <span className="academy-ledger-value">₹{ledgerSummary.upiCollected.toLocaleString('en-IN')}</span>
          <small style={{ color: '#64748b' }}>0% middleman fees</small>
        </div>

        <div className={`academy-ledger-card ${ledgerSummary.cashInHand > 0 ? 'cash-alert' : ''}`}>
          <span className="academy-ledger-label">Cash-in-Hand Held by Coaches</span>
          <span className="academy-ledger-value">₹{ledgerSummary.cashInHand.toLocaleString('en-IN')}</span>
          <small style={{ color: ledgerSummary.cashInHand > 0 ? '#b45309' : '#64748b' }}>
            {ledgerSummary.cashInHand > 0 ? '⚠️ Awaiting deposit into bank' : 'All cash reconciled'}
          </small>
        </div>

        <div className="academy-ledger-card">
          <span className="academy-ledger-label">Pending / Overdue Balance</span>
          <span className="academy-ledger-value" style={{ color: ledgerSummary.pendingDues > 0 ? '#dc2626' : '#64748b' }}>
            ₹{ledgerSummary.pendingDues.toLocaleString('en-IN')}
          </span>
          <small style={{ color: '#dc2626' }}>{ledgerSummary.overdueCount} students overdue</small>
        </div>
      </div>

      <div className="academy-hub-table-wrapper">
        <table className="academy-hub-table">
          <thead>
            <tr>
              <th>Receipt / Date</th>
              <th>Student &amp; Parent</th>
              <th>Batch</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Received By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {feeTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No fee transactions recorded yet for this billing cycle.
                </td>
              </tr>
            ) : (
              feeTransactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>{tx.receiptNumber}</span>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tx.collectedDate}</div>
                  </td>
                  <td>
                    <strong>{tx.studentName}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tx.parentName} ({tx.parentPhone})</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{tx.batchName}</span>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tx.billingMonth}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#047857' }}>₹{tx.amount.toLocaleString('en-IN')}</span>
                  </td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
                      {tx.paymentMode === 'direct_upi' ? '⚡ Direct UPI' : tx.paymentMode === 'cash' ? '💵 Cash' : tx.paymentMode}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{tx.collectedByStaffName}</td>
                  <td>
                    <span className={`ledger-status-pill ${tx.status}`}>
                      {tx.status === 'settled' ? '✅ Settled to Bank' : '⚠️ Cash-in-Hand'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {tx.status === 'cash_in_hand' && (
                        <button
                          type="button"
                          className="academy-hub-btn-outline"
                          style={{ padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                          onClick={() => {
                            settleCashInHand(tx.id)
                            onRefresh()
                          }}
                          title="Confirm cash deposit to academy bank account"
                        >
                          Settle to Bank
                        </button>
                      )}
                      <button
                        type="button"
                        className="crm-action-btn"
                        title="View Official Receipt"
                        onClick={() => {
                          const std = students.find(s => s.id === tx.studentId) || {
                            id: tx.studentId,
                            academySlug: tx.academySlug,
                            studentName: tx.studentName,
                            parentName: tx.parentName,
                            parentPhone: tx.parentPhone,
                            batchId: tx.batchId,
                            batchName: tx.batchName,
                            sport: 'Sports',
                            monthlyFee: tx.amount,
                            feeStatus: 'paid' as const,
                            nextDueDate: '2026-12-05',
                            lastPaymentDate: tx.collectedDate,
                          }
                          onSelectReceiptStudent(std)
                        }}
                      >
                        <SiteIcon name="download" size={14} />
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
  )
}
