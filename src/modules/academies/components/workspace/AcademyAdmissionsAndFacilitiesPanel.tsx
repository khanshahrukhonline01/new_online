import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../../shared/components/SiteIcon'
import { maskPhone } from '../../../../shared/saas/saasLaunchReadinessService'
import type { AcademyRoleCapabilities } from '../../academyHubTypes'
import {
  addAdmissionInternalNote,
  convertEnquiryToAthlete,
  createAdmissionEnquiry,
  createTrialPostingDraft,
  listAdmissionInternalNotes,
  saveAcademyEquipment,
  saveAcademyFacility,
  submitTrialPostingForModeration,
  updateAdmissionStage,
  type AcademyAdmissionNoteRecord,
  type AcademyBatchRecord,
  type AcademyBranchRecord,
  type AcademyEnquiryRecord,
  type AcademyEquipmentRecord,
  type AcademyFacilityRecord,
  type AcademyTrialPostingRecord,
  type AdmissionStage,
} from '../../academyWorkspaceClient'

export interface AcademyAdmissionsAndFacilitiesPanelProps {
  mode: 'admissions' | 'facilities'
  tenantId: string
  academyName: string
  actorName: string
  capabilities: AcademyRoleCapabilities
  branches: AcademyBranchRecord[]
  batches: AcademyBatchRecord[]
  enquiries: AcademyEnquiryRecord[]
  trialPostings: AcademyTrialPostingRecord[]
  facilities: AcademyFacilityRecord[]
  equipment: AcademyEquipmentRecord[]
  selectedBranchId: string | null
  dpdpMaskEnabled: boolean
  onRefresh: () => Promise<void>
  onFeedback: (fb: { type: 'success' | 'error'; message: string }) => void
}

const PIPELINE_STAGES: readonly AdmissionStage[] = [
  'new',
  'contacted',
  'shortlisted',
  'trial_scheduled',
  'trial_completed',
  'offered',
  'enrolled',
  'waitlisted',
  'rejected',
]

function sanitizeWhatsAppHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function AcademyAdmissionsAndFacilitiesPanel({
  mode,
  tenantId,
  academyName,
  actorName,
  capabilities,
  branches,
  batches,
  enquiries,
  trialPostings,
  facilities,
  equipment,
  selectedBranchId,
  dpdpMaskEnabled,
  onRefresh,
  onFeedback,
}: AcademyAdmissionsAndFacilitiesPanelProps) {
  // Admissions & Trials state
  const [admTab, setAdmTab] = useState<'pipeline' | 'trials'>('pipeline')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null)
  const [internalNotes, setInternalNotes] = useState<AcademyAdmissionNoteRecord[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [evalScore, setEvalScore] = useState('8')
  const [convertBatchId, setConvertBatchId] = useState(batches[0]?.id || '')

  // Log Walk-in Enquiry Form
  const [showAddLead, setShowAddLead] = useState(false)
  const [leadStudent, setLeadStudent] = useState('')
  const [leadParent, setLeadParent] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSport, setLeadSport] = useState('Football')
  const [leadAgeCat, setLeadAgeCat] = useState('U-14')
  const [leadReqType, setLeadReqType] = useState<AcademyEnquiryRecord['requestType']>('free_trial')
  const [leadBranchId, setLeadBranchId] = useState(selectedBranchId || branches[0]?.id || '')

  // Create Trial Posting Form
  const [trialTitle, setTrialTitle] = useState('')
  const [trialSport, setTrialSport] = useState('Football')
  const [trialCity, setTrialCity] = useState('')
  const [trialVenue, setTrialVenue] = useState('')
  const [trialAges, setTrialAges] = useState('U-13, U-15, U-17')
  const [trialDate, setTrialDate] = useState('')
  const [trialDeadline, setTrialDeadline] = useState('')
  const [trialEligibility, setTrialEligibility] = useState('')

  // Facilities & Equipment state
  const [facName, setFacName] = useState('')
  const [facType, setFacType] = useState<AcademyFacilityRecord['facilityType']>('turf')
  const [facSport, setFacSport] = useState('Football')
  const [facSurface, setFacSurface] = useState('FIFA Pro Turf')
  const [facBranchId, setFacBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [facCap, setFacCap] = useState('30')
  const [facLights, setFacLights] = useState(true)

  const [eqName, setEqName] = useState('')
  const [eqCat, setEqCat] = useState<AcademyEquipmentRecord['category']>('training_gear')
  const [eqBranchId, setEqBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [eqTotal, setEqTotal] = useState('20')
  const [eqAvail, setEqAvail] = useState('20')
  const [eqCondition, setEqCondition] = useState<AcademyEquipmentRecord['conditionStatus']>('good')

  useEffect(() => {
    const defaultBranch = selectedBranchId || branches[0]?.id || ''
    if (defaultBranch && (!leadBranchId || (selectedBranchId && leadBranchId !== selectedBranchId))) {
      setLeadBranchId(defaultBranch)
    }
    if (defaultBranch && (!facBranchId || (selectedBranchId && facBranchId !== selectedBranchId))) {
      setFacBranchId(defaultBranch)
    }
    if (defaultBranch && (!eqBranchId || (selectedBranchId && eqBranchId !== selectedBranchId))) {
      setEqBranchId(defaultBranch)
    }
    if (!convertBatchId && batches[0]?.id) {
      setConvertBatchId(batches[0].id)
    }
  }, [selectedBranchId, branches, batches, leadBranchId, facBranchId, eqBranchId, convertBatchId])

  useEffect(() => {
    if (mode === 'admissions' && selectedEnquiryId) {
      void listAdmissionInternalNotes(tenantId, selectedEnquiryId).then(setInternalNotes)
    }
  }, [mode, tenantId, selectedEnquiryId])

  if (mode === 'admissions') {
    const visibleEnquiries = enquiries.filter(e => {
      if (selectedBranchId && e.unitId !== selectedBranchId) return false
      if (stageFilter !== 'all' && e.status !== stageFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          e.studentName.toLowerCase().includes(q) ||
          e.parentName.toLowerCase().includes(q) ||
          e.enquiryToken.toLowerCase().includes(q) ||
          e.sport.toLowerCase().includes(q)
        )
      }
      return true
    })

    const selectedEnquiry = selectedEnquiryId
      ? enquiries.find(e => e.id === selectedEnquiryId) || null
      : null

    const handleAddLead = async (e: FormEvent) => {
      e.preventDefault()
      const res = await createAdmissionEnquiry(tenantId, {
        unitId: leadBranchId || selectedBranchId || null,
        studentName: leadStudent,
        parentName: leadParent,
        parentPhone: leadPhone,
        parentEmail: leadEmail,
        sport: leadSport,
        ageCategory: leadAgeCat,
        requestType: leadReqType,
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setLeadStudent('')
        setLeadParent('')
        setLeadPhone('')
        setLeadEmail('')
        setShowAddLead(false)
        await onRefresh()
      }
    }

    const handleCreateTrialDraft = async (e: FormEvent) => {
      e.preventDefault()
      const res = await createTrialPostingDraft(tenantId, {
        unitId: selectedBranchId || branches[0]?.id || null,
        title: trialTitle,
        sport: trialSport,
        city: trialCity,
        venueAddress: trialVenue,
        ageCategories: trialAges.split(',').map(s => s.trim()).filter(Boolean),
        eligibilityCriteria: trialEligibility,
        trialDate,
        applicationDeadline: trialDeadline,
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setTrialTitle('')
        setTrialEligibility('')
        await onRefresh()
      }
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-admissions-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Trials &amp; 8-Stage Admissions CRM</h2>
            <p className="kg-acad-muted">
              Track parent enquiries, schedule trials, record private staff evaluations, enroll athletes, and submit public trial listings for KhelGrid moderation.
            </p>
          </div>
          <div className="kg-acad-btn-row">
            <button
              type="button"
              className={admTab === 'pipeline' ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
              onClick={() => setAdmTab('pipeline')}
            >
              Admissions Pipeline ({visibleEnquiries.length})
            </button>
            <button
              type="button"
              className={admTab === 'trials' ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
              onClick={() => setAdmTab('trials')}
            >
              Trial Postings ({trialPostings.length})
            </button>
            {admTab === 'pipeline' && capabilities.canManageAdmissions && (
              <button type="button" className="kg-acad-btn-outline" onClick={() => setShowAddLead(v => !v)}>
                <SiteIcon name="plus" size={15} /> Log Walk-in Enquiry
              </button>
            )}
          </div>
        </div>

        {admTab === 'pipeline' ? (
          <>
            {showAddLead && capabilities.canManageAdmissions && (
              <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleAddLead(e)}>
                <h3>Log Admissions / Trial Enquiry</h3>
                <div className="kg-acad-form-grid">
                  <label className="kg-acad-field">
                    <span>Candidate Name *</span>
                    <input type="text" required value={leadStudent} onChange={e => setLeadStudent(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Parent / Guardian Name *</span>
                    <input type="text" required value={leadParent} onChange={e => setLeadParent(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Parent WhatsApp / Phone *</span>
                    <input type="tel" required value={leadPhone} onChange={e => setLeadPhone(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Email</span>
                    <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Sport *</span>
                    <input type="text" required value={leadSport} onChange={e => setLeadSport(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Age Category</span>
                    <input type="text" value={leadAgeCat} onChange={e => setLeadAgeCat(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Request Type</span>
                    <select value={leadReqType} onChange={e => setLeadReqType(e.target.value as AcademyEnquiryRecord['requestType'])}>
                      <option value="free_trial">Free Assessment Trial</option>
                      <option value="regular_admission">Regular Admission</option>
                      <option value="scholarship_assessment">Scholarship Assessment</option>
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Target Branch</span>
                    <select value={leadBranchId} onChange={e => setLeadBranchId(e.target.value)}>
                      <option value="">Main Campus</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
                  <button type="submit" className="kg-acad-btn-primary">Create Enquiry</button>
                </div>
              </form>
            )}

            <div className="kg-acad-filter-bar">
              <input
                type="search"
                placeholder="Search applicant, token, parent, or sport…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
                <option value="all">All Stages</option>
                {PIPELINE_STAGES.map(st => (
                  <option key={st} value={st}>{st.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {selectedEnquiry && (
              <section className="kg-acad-card is-highlight" aria-label="Applicant Internal Review Drawer">
                <div className="kg-acad-card-head">
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedEnquiry.studentName} · <code>{selectedEnquiry.enquiryToken}</code></h3>
                    <div className="kg-acad-muted">
                      Parent: {selectedEnquiry.parentName} · {dpdpMaskEnabled ? maskPhone(selectedEnquiry.parentPhone) : selectedEnquiry.parentPhone}
                    </div>
                  </div>
                  <button type="button" className="kg-acad-btn-outline" onClick={() => setSelectedEnquiryId(null)}>
                    Close Review
                  </button>
                </div>

                {capabilities.canManageAdmissions && selectedEnquiry.status !== 'enrolled' && (
                  <div className="kg-acad-inline-row" style={{ margin: '0.75rem 0' }}>
                    <select value={convertBatchId} onChange={e => setConvertBatchId(e.target.value)}>
                      <option value="">Assign batch on enroll…</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
                    </select>
                    <button
                      type="button"
                      className="kg-acad-btn-primary"
                      onClick={async () => {
                        const b = batches.find(item => item.id === convertBatchId)
                        const res = await convertEnquiryToAthlete(
                          tenantId,
                          selectedEnquiry.id,
                          convertBatchId || null,
                          selectedEnquiry.unitId || b?.unitId || null,
                          b?.monthlyFee || 0,
                        )
                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                        if (res.success) await onRefresh()
                      }}
                    >
                      Convert &amp; Enroll to Roster
                    </button>
                  </div>
                )}

                <div className="kg-acad-subblock">
                  <h4>Private Internal Coordinator Notes &amp; Trial Score (Never Public)</h4>
                  {capabilities.canManageAdmissions && (
                    <form
                      className="kg-acad-inline-row"
                      onSubmit={async e => {
                        e.preventDefault()
                        if (!noteBody.trim()) return
                        const res = await addAdmissionInternalNote(
                          tenantId,
                          selectedEnquiry.id,
                          selectedEnquiry.unitId,
                          actorName,
                          noteBody,
                          Number(evalScore) || null,
                        )
                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                        if (res.success) {
                          setNoteBody('')
                          setInternalNotes(await listAdmissionInternalNotes(tenantId, selectedEnquiry.id))
                        }
                      }}
                    >
                      <select value={evalScore} onChange={e => setEvalScore(e.target.value)}>
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(s => (
                          <option key={s} value={String(s)}>Score: {s}/10</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Add internal trial evaluation or follow-up comment…"
                        value={noteBody}
                        onChange={e => setNoteBody(e.target.value)}
                      />
                      <button type="submit" className="kg-acad-btn-primary">Save Internal Note</button>
                    </form>
                  )}

                  {internalNotes.length === 0 ? (
                    <p className="kg-acad-muted" style={{ marginTop: '0.5rem' }}>No internal notes added yet.</p>
                  ) : (
                    <ul className="kg-acad-list" style={{ marginTop: '0.5rem' }}>
                      {internalNotes.map(n => (
                        <li key={n.id} className="kg-acad-list-item">
                          <div>
                            <strong>{n.authorName}</strong>{' '}
                            {n.evaluationScore !== null && <span className="kg-acad-pill is-emerald">{n.evaluationScore}/10</span>}
                            <p style={{ margin: '0.25rem 0 0' }}>{n.noteBody}</p>
                          </div>
                          <span className="kg-acad-muted">{n.createdAt.slice(0, 10)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {visibleEnquiries.length === 0 ? (
              <EmptyState
                title="No admissions enquiries found"
                description="Enquiries submitted by athletes/parents on KhelGrid or logged at the desk appear here."
              />
            ) : (
              <div className="kg-acad-table-wrap">
                <table className="kg-acad-table">
                  <thead>
                    <tr>
                      <th>Candidate &amp; Token</th>
                      <th>Parent Outreach</th>
                      <th>Sport &amp; Type</th>
                      <th>Pipeline Stage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEnquiries.map(enq => (
                      <tr key={enq.id}>
                        <td>
                          <strong>{enq.studentName}</strong>
                          <div className="kg-acad-muted">
                            <code>{enq.enquiryToken}</code> · {enq.ageCategory || 'Open'}
                          </div>
                        </td>
                        <td>
                          <div>{enq.parentName}</div>
                          <a
                            href={sanitizeWhatsAppHref(
                              enq.parentPhone,
                              `Namaste ${enq.parentName}, regarding ${enq.studentName}'s trial enquiry (${enq.enquiryToken}) at ${academyName}.`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="kg-acad-link-btn"
                          >
                            WhatsApp ({dpdpMaskEnabled ? maskPhone(enq.parentPhone) : enq.parentPhone})
                          </a>
                        </td>
                        <td>
                          <div>{enq.sport}</div>
                          <div className="kg-acad-muted">{enq.requestType.replace('_', ' ')}</div>
                        </td>
                        <td>
                          {capabilities.canManageAdmissions ? (
                            <select
                              value={enq.status}
                              onChange={async e => {
                                const res = await updateAdmissionStage(tenantId, enq.id, e.target.value as AdmissionStage)
                                onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                if (res.success) await onRefresh()
                              }}
                            >
                              {PIPELINE_STAGES.map(st => (
                                <option key={st} value={st}>{st.replace('_', ' ')}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="kg-acad-pill is-info">{enq.status.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td>
                          <button type="button" className="kg-acad-btn-outline" onClick={() => setSelectedEnquiryId(enq.id)}>
                            Notes &amp; Enroll
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {capabilities.canManageAdmissions && (
              <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleCreateTrialDraft(e)}>
                <h3>Create Academy Trial / Camp Posting (Moderation-Gated)</h3>
                <div className="kg-acad-form-grid">
                  <label className="kg-acad-field">
                    <span>Trial Title *</span>
                    <input type="text" required placeholder="Annual U-15 Residential Selection Trials" value={trialTitle} onChange={e => setTrialTitle(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Sport *</span>
                    <input type="text" required value={trialSport} onChange={e => setTrialSport(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>City *</span>
                    <input type="text" required value={trialCity} onChange={e => setTrialCity(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Venue / Ground Address</span>
                    <input type="text" value={trialVenue} onChange={e => setTrialVenue(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Age Categories (comma separated)</span>
                    <input type="text" value={trialAges} onChange={e => setTrialAges(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Trial Date</span>
                    <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Application Deadline</span>
                    <input type="date" value={trialDeadline} onChange={e => setTrialDeadline(e.target.value)} />
                  </label>
                </div>
                <label className="kg-acad-field" style={{ marginTop: '0.65rem' }}>
                  <span>Eligibility Criteria</span>
                  <textarea rows={2} value={trialEligibility} onChange={e => setTrialEligibility(e.target.value)} />
                </label>
                <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
                  <button type="submit" className="kg-acad-btn-primary">Save Draft Trial</button>
                </div>
              </form>
            )}

            {trialPostings.length === 0 ? (
              <EmptyState
                title="No academy trials created yet"
                description="Draft a selection trial or camp and submit it for KhelGrid moderation."
              />
            ) : (
              <div className="kg-acad-cards-grid">
                {trialPostings.map(tr => (
                  <article key={tr.id} className="kg-acad-card">
                    <div className="kg-acad-card-head">
                      <div>
                        <h3 style={{ margin: 0 }}>{tr.title}</h3>
                        <div className="kg-acad-muted">{tr.sport} · {tr.city}</div>
                      </div>
                      <span className={`kg-acad-pill ${tr.status === 'published' ? 'is-emerald' : tr.status === 'pending_moderation' ? 'is-warning' : 'is-info'}`}>
                        {tr.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="kg-acad-muted" style={{ margin: '0.5rem 0' }}>
                      Trial: {tr.trialDate || 'TBD'} · Ages: {tr.ageCategories.join(', ') || 'Open'}
                    </p>
                    {tr.status === 'draft' && capabilities.canManageAdmissions && (
                      <button
                        type="button"
                        className="kg-acad-btn-primary"
                        onClick={async () => {
                          const res = await submitTrialPostingForModeration(tr.id)
                          onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                          if (res.success) await onRefresh()
                        }}
                      >
                        Submit for KhelGrid Moderation
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // =========================================================================
  // 2. FACILITIES & EQUIPMENT
  // =========================================================================
  const handleSaveFacility = async (e: FormEvent) => {
    e.preventDefault()
    const res = await saveAcademyFacility(tenantId, {
      unitId: facBranchId || selectedBranchId || null,
      name: facName,
      facilityType: facType,
      sport: facSport,
      surfaceType: facSurface,
      capacity: Number(facCap) || null,
      hasFloodlights: facLights,
    })
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) {
      setFacName('')
      await onRefresh()
    }
  }

  const handleSaveEquipment = async (e: FormEvent) => {
    e.preventDefault()
    const res = await saveAcademyEquipment(tenantId, {
      unitId: eqBranchId || selectedBranchId || null,
      name: eqName,
      category: eqCat,
      totalQuantity: Number(eqTotal || 0),
      availableQuantity: Number(eqAvail || 0),
      conditionStatus: eqCondition,
    })
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) {
      setEqName('')
      await onRefresh()
    }
  }

  const visibleFacilities = selectedBranchId ? facilities.filter(f => f.unitId === selectedBranchId) : facilities
  const visibleEquipment = selectedBranchId ? equipment.filter(e => e.unitId === selectedBranchId) : equipment

  return (
    <div className="kg-acad-stack" data-testid="academy-facilities-panel">
      <div className="kg-acad-section-head">
        <div>
          <h2>Facilities, Grounds &amp; Equipment Inventory</h2>
          <p className="kg-acad-muted">
            Manage grounds, synthetic turfs, indoor courts, floodlights, maintenance status, and kit/equipment inventory per branch.
          </p>
        </div>
      </div>

      {capabilities.canManageFacilities && (
        <div className="kg-acad-grid-2">
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSaveFacility(e)}>
            <h3>Add Training Facility / Ground</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Facility Name *</span>
                <input type="text" required placeholder="Center Wicket Turf 1" value={facName} onChange={e => setFacName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Type</span>
                <select value={facType} onChange={e => setFacType(e.target.value as AcademyFacilityRecord['facilityType'])}>
                  <option value="turf">Turf</option>
                  <option value="ground">Natural Ground</option>
                  <option value="court">Court</option>
                  <option value="indoor_hall">Indoor Hall</option>
                  <option value="net_lane">Practice Nets</option>
                  <option value="gym">Strength &amp; Rehab Gym</option>
                  <option value="track">Athletics Track</option>
                  <option value="swimming_pool">Swimming Pool</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Primary Sport</span>
                <input type="text" value={facSport} onChange={e => setFacSport(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Surface Type</span>
                <input type="text" value={facSurface} onChange={e => setFacSurface(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Branch</span>
                <select value={facBranchId} onChange={e => setFacBranchId(e.target.value)}>
                  <option value="">Main Campus</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Athlete Capacity</span>
                <input type="number" min={1} value={facCap} onChange={e => setFacCap(e.target.value)} />
              </label>
            </div>
            <label className="kg-acad-checkbox" style={{ marginTop: '0.65rem' }}>
              <input type="checkbox" checked={facLights} onChange={e => setFacLights(e.target.checked)} />
              <span>Floodlights available for evening sessions</span>
            </label>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary">Register Facility</button>
            </div>
          </form>

          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSaveEquipment(e)}>
            <h3>Log Equipment / Medical Asset</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Asset Name *</span>
                <input type="text" required placeholder="Bowling Machine / Cones / First Aid Kit" value={eqName} onChange={e => setEqName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Category</span>
                <select value={eqCat} onChange={e => setEqCat(e.target.value as AcademyEquipmentRecord['category'])}>
                  <option value="training_gear">Training Gear</option>
                  <option value="safety_medical">Safety &amp; First Aid</option>
                  <option value="pitch_equipment">Pitch &amp; Ground Gear</option>
                  <option value="kit">Match Kits</option>
                  <option value="electronics">Timing &amp; Electronics</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Total Units</span>
                <input type="number" min={0} required value={eqTotal} onChange={e => setEqTotal(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Available Units</span>
                <input type="number" min={0} required value={eqAvail} onChange={e => setEqAvail(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Condition</span>
                <select value={eqCondition} onChange={e => setEqCondition(e.target.value as AcademyEquipmentRecord['conditionStatus'])}>
                  <option value="good">Good / Match Ready</option>
                  <option value="needs_repair">Needs Inspection / Repair</option>
                  <option value="damaged">Damaged</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Branch</span>
                <select value={eqBranchId} onChange={e => setEqBranchId(e.target.value)}>
                  <option value="">Main Campus</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            </div>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary">Save Equipment</button>
            </div>
          </form>
        </div>
      )}

      <div className="kg-acad-grid-2">
        <section className="kg-acad-card">
          <h3>Registered Grounds &amp; Courts ({visibleFacilities.length})</h3>
          {visibleFacilities.length === 0 ? (
            <EmptyState title="No facilities listed" description="Add turfs, nets, or courts above." />
          ) : (
            <ul className="kg-acad-list">
              {visibleFacilities.map(f => (
                <li key={f.id} className="kg-acad-list-item">
                  <div>
                    <strong>{f.name}</strong>
                    <div className="kg-acad-muted">
                      {f.facilityType} · {f.sport} {f.surfaceType ? `· ${f.surfaceType}` : ''} {f.hasFloodlights ? '· Floodlights' : ''}
                    </div>
                  </div>
                  {capabilities.canManageFacilities ? (
                    <select
                      value={f.status}
                      onChange={async e => {
                        const res = await saveAcademyFacility(tenantId, {
                          id: f.id,
                          unitId: f.unitId,
                          name: f.name,
                          facilityType: f.facilityType,
                          sport: f.sport,
                          status: e.target.value as AcademyFacilityRecord['status'],
                        })
                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                        if (res.success) await onRefresh()
                      }}
                    >
                      <option value="available">Available</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  ) : (
                    <span className="kg-acad-pill is-info">{f.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kg-acad-card">
          <h3>Equipment Inventory ({visibleEquipment.length})</h3>
          {visibleEquipment.length === 0 ? (
            <EmptyState title="No equipment tracked" description="Log safety kits, balls, cones, and training gear above." />
          ) : (
            <ul className="kg-acad-list">
              {visibleEquipment.map(eq => (
                <li key={eq.id} className="kg-acad-list-item">
                  <div>
                    <strong>{eq.name}</strong>
                    <div className="kg-acad-muted">{eq.category.replace('_', ' ')} · {eq.availableQuantity}/{eq.totalQuantity} ready</div>
                  </div>
                  <span className={`kg-acad-pill ${eq.conditionStatus === 'good' ? 'is-emerald' : 'is-warning'}`}>
                    {eq.conditionStatus.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
