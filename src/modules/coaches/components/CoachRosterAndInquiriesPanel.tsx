import { useState } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  generateDigitalFeeReceipt,
  type DigitalFeeReceipt,
} from '../../../shared/saas/saasSharedOperations'
import {
  generateWhatsAppParentReplyUrl,
  generateWhatsAppTraineeFeeReminderUrl,
  recordTraineePayment,
  updateCoachInquiryStatus,
  type CoachBatch,
  type CoachInquiry,
  type CoachTrainee,
  type RegisteredCoach,
} from '../coachSaaSClient'

export interface CoachRosterAndInquiriesPanelProps {
  activeTab: 'trainees' | 'inquiries'
  currentCoach: RegisteredCoach
  trainees: CoachTrainee[]
  batches: CoachBatch[]
  inquiries: CoachInquiry[]
  onOpenImportCsv: () => void
  onOpenAddTrainee: () => void
  onSelectReceipt: (receipt: DigitalFeeReceipt) => void
  onRefresh: () => void
}

/**
 * Renders the Coach trainee roster table (search, batch filter, fee recording, digital receipts)
 * and the inbound parent inquiries CRM queue.
 */
export function CoachRosterAndInquiriesPanel({
  activeTab,
  currentCoach,
  trainees,
  batches,
  inquiries,
  onOpenImportCsv,
  onOpenAddTrainee,
  onSelectReceipt,
  onRefresh,
}: CoachRosterAndInquiriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')

  const filteredTrainees = trainees.filter(t => {
    const matchesSearch =
      t.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.parentPhone.includes(searchQuery)
    const matchesBatch = batchFilter === 'all' || t.batchId === batchFilter
    return matchesSearch && matchesBatch
  })

  if (activeTab === 'trainees') {
    return (
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
              onClick={onOpenImportCsv}
              style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Bulk import trainees from CSV or Excel"
            >
              <SiteIcon name="upload" size={14} />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              className="coach-primary-btn"
              onClick={onOpenAddTrainee}
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
                                const receipt = generateDigitalFeeReceipt({
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
                                onSelectReceipt(receipt)
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
                                  onRefresh()
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
    )
  }

  return (
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
                          onRefresh()
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
  )
}
