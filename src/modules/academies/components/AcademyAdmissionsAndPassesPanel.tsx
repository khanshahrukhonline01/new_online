import { useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../../shared/utils/qrCodeGenerator'
import {
  convertEnquiryToStudent,
  recordTenantAuditLog,
  type DbTenant,
} from '../../../integrations/supabase/tenant-client'
import {
  generateWhatsAppParentContactUrl,
  updateLeadStatus,
  type AcademyBatch,
  type AcademyLead,
  type AcademyTrialPass,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyAdmissionsAndPassesPanelProps {
  activeTab: 'leads' | 'trial_passes'
  currentTenant: DbTenant | null
  currentAcademy: RegisteredAcademy
  leads: AcademyLead[]
  batches: AcademyBatch[]
  passes: AcademyTrialPass[]
  activeTrialPassView: AcademyTrialPass | null
  onSelectTrialPassView: (pass: AcademyTrialPass) => void
  onOpenAddLead: () => void
  onScheduleTrialForLead: (lead: AcademyLead) => void
  onOpenTrialPassModal: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onRefresh: () => void
}

/**
 * Renders the Admissions Enquiry CRM table and the digital Trial Entry Pass
 * generator/table for an academy workspace.
 */
export function AcademyAdmissionsAndPassesPanel({
  activeTab,
  currentTenant,
  currentAcademy,
  leads,
  batches,
  passes,
  activeTrialPassView,
  onSelectTrialPassView,
  onOpenAddLead,
  onScheduleTrialForLead,
  onOpenTrialPassModal,
  onNavigate,
  onRefresh,
}: AcademyAdmissionsAndPassesPanelProps) {
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all')
  const [leadSearch, setLeadSearch] = useState('')

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

  if (activeTab === 'leads') {
    return (
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
              onClick={onOpenAddLead}
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
                          const newStatus = e.target.value as AcademyLead['status']
                          updateLeadStatus(lead.id, newStatus)
                          if (newStatus === 'enrolled' && currentTenant?.id && lead.id.length > 30) {
                            const defaultBatch = batches[0]
                            convertEnquiryToStudent({
                              tenantId: currentTenant.id,
                              enquiryId: lead.id,
                              batchId: defaultBatch?.id && defaultBatch.id.length > 30 ? defaultBatch.id : '00000000-0000-0000-0000-000000000000',
                              monthlyFee: defaultBatch?.monthlyFee || 2500,
                            }).catch(err => console.warn('[AcademyHub] Remote enquiry conversion error:', err))

                            recordTenantAuditLog({
                              tenantId: currentTenant.id,
                              action: 'convert_enquiry_to_student',
                              entityType: 'tenant_enquiries',
                              entityId: lead.id,
                              details: { studentName: lead.studentName },
                            }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
                          }
                          onRefresh()
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
                          onClick={() => onScheduleTrialForLead(lead)}
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
    )
  }

  return (
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
            onClick={onOpenTrialPassModal}
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
                  No trial passes issued yet. Click &quot;Issue Trial Entry Pass&quot; above to generate one.
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
                      onClick={() => onSelectTrialPassView(p)}
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
  )
}
