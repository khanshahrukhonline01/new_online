import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../../shared/components/SiteIcon'
import { maskPhone } from '../../../../shared/saas/saasLaunchReadinessService'
import { downloadBlobFile } from '../../academyExportUtils'
import type { AcademyRoleCapabilities } from '../../academyHubTypes'
import {
  addAthletePrivateNote,
  archiveAcademyBranch,
  listAthletePrivateNotes,
  saveAcademyAthlete,
  saveAcademyBranch,
  saveAcademyCoach,
  type AcademyAthleteNoteRecord,
  type AcademyAthleteRecord,
  type AcademyBatchRecord,
  type AcademyBranchRecord,
  type AcademyCoachRecord,
  type AthleteEnrollmentStatus,
} from '../../academyWorkspaceClient'

export interface AcademyBranchesAndPeoplePanelProps {
  mode: 'branches' | 'athletes' | 'coaches'
  tenantId: string
  academyName: string
  actorName: string
  capabilities: AcademyRoleCapabilities
  branches: AcademyBranchRecord[]
  athletes: AcademyAthleteRecord[]
  batches: AcademyBatchRecord[]
  coaches: AcademyCoachRecord[]
  selectedBranchId: string | null
  initialDetailId: string | null
  dpdpMaskEnabled: boolean
  onSelectBranchFilter: (branchId: string | null) => void
  onRefresh: () => Promise<void>
  onFeedback: (fb: { type: 'success' | 'error'; message: string }) => void
}

function escapeCsv(val: string): string {
  return `"${String(val || '').replace(/"/g, '""')}"`
}

export function AcademyBranchesAndPeoplePanel({
  mode,
  tenantId,
  academyName,
  actorName,
  capabilities,
  branches,
  athletes,
  batches,
  coaches,
  selectedBranchId,
  initialDetailId,
  dpdpMaskEnabled,
  onRefresh,
  onFeedback,
}: AcademyBranchesAndPeoplePanelProps) {
  // Branch state
  const [branchName, setBranchName] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [branchCity, setBranchCity] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [branchPincode, setBranchPincode] = useState('')
  const [branchCapacity, setBranchCapacity] = useState('')
  const [branchPhone, setBranchPhone] = useState('')
  const [branchPrimary, setBranchPrimary] = useState(false)
  const [branchBusy, setBranchBusy] = useState(false)

  // Athlete state & filters
  const [athleteSearch, setAthleteSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(initialDetailId)
  const [privateNotes, setPrivateNotes] = useState<AcademyAthleteNoteRecord[]>([])
  const [noteType, setNoteType] = useState<AcademyAthleteNoteRecord['noteType']>('development')
  const [noteBody, setNoteBody] = useState('')

  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [studentSport, setStudentSport] = useState('')
  const [ageCategory, setAgeCategory] = useState('U-14')
  const [skillLevel, setSkillLevel] = useState<AcademyAthleteRecord['skillLevel']>('beginner')
  const [studentBranchId, setStudentBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [studentBatchId, setStudentBatchId] = useState(batches[0]?.id || '')
  const [studentCoachId, setStudentCoachId] = useState('')
  const [monthlyFee, setMonthlyFee] = useState('2000')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [consentVerified, setConsentVerified] = useState(true)

  // Coach state
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [coachEmail, setCoachEmail] = useState('')
  const [coachPhone, setCoachPhone] = useState('')
  const [coachTitle, setCoachTitle] = useState('Head Coach')
  const [coachEmployment, setCoachEmployment] = useState<AcademyCoachRecord['employmentType']>('full_time')
  const [coachBranchId, setCoachBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [coachSpecs, setCoachSpecs] = useState('')
  const [coachQuals, setCoachQuals] = useState('')

  useEffect(() => {
    if (initialDetailId) setActiveAthleteId(initialDetailId)
  }, [initialDetailId])

  useEffect(() => {
    if (mode === 'athletes' && activeAthleteId) {
      void listAthletePrivateNotes(tenantId, activeAthleteId).then(setPrivateNotes)
    }
  }, [mode, tenantId, activeAthleteId])

  // =========================================================================
  // 1. BRANCHES
  // =========================================================================
  if (mode === 'branches') {
    const handleCreateBranch = async (e: FormEvent) => {
      e.preventDefault()
      setBranchBusy(true)
      const res = await saveAcademyBranch(tenantId, {
        name: branchName,
        branchCode,
        city: branchCity,
        address: branchAddress,
        pincode: branchPincode,
        capacity: branchCapacity ? Number(branchCapacity) : null,
        contactPhone: branchPhone,
        isPrimary: branchPrimary,
      })
      setBranchBusy(false)
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setBranchName('')
        setBranchCode('')
        setBranchAddress('')
        setBranchPincode('')
        setBranchCapacity('')
        await onRefresh()
      }
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-branches-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Academy Branches &amp; Training Centres</h2>
            <p className="kg-acad-muted">
              Organize multi-campus grounds, regional centres, capacity limits, and branch-scoped staff permissions.
            </p>
          </div>
        </div>

        {capabilities.canManageBranches && (
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleCreateBranch(e)}>
            <h3>Add New Academy Branch</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Branch / Campus Name *</span>
                <input type="text" required placeholder="Indiranagar Training Centre" value={branchName} onChange={e => setBranchName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Branch Code</span>
                <input type="text" placeholder="BLR-IND-01" value={branchCode} onChange={e => setBranchCode(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>City</span>
                <input type="text" placeholder="Bengaluru" value={branchCity} onChange={e => setBranchCity(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Pincode</span>
                <input type="text" placeholder="560038" value={branchPincode} onChange={e => setBranchPincode(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Campus Address</span>
                <input type="text" placeholder="100 Feet Road Turf Complex" value={branchAddress} onChange={e => setBranchAddress(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Contact Phone</span>
                <input type="tel" value={branchPhone} onChange={e => setBranchPhone(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Max Athlete Capacity</span>
                <input type="number" min={1} value={branchCapacity} onChange={e => setBranchCapacity(e.target.value)} />
              </label>
            </div>
            <label className="kg-acad-checkbox" style={{ marginTop: '0.65rem' }}>
              <input type="checkbox" checked={branchPrimary} onChange={e => setBranchPrimary(e.target.checked)} />
              <span>Set as primary academy headquarters</span>
            </label>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary" disabled={branchBusy}>
                {branchBusy ? 'Creating Branch…' : 'Create Branch'}
              </button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <EmptyState
            title="No academy branches created yet"
            description="Create your primary training centre above to start scoping athletes, batches, facilities, and branch managers."
          />
        ) : (
          <div className="kg-acad-cards-grid">
            {branches.map(br => (
              <article key={br.id} className="kg-acad-card">
                <div className="kg-acad-card-head">
                  <div>
                    <h3 style={{ margin: 0 }}>{br.name}</h3>
                    <div className="kg-acad-muted">
                      {br.branchCode ? `${br.branchCode} · ` : ''}{br.city || 'City unset'}
                    </div>
                  </div>
                  {br.isPrimary && <span className="kg-acad-pill is-emerald">Primary</span>}
                </div>
                <p className="kg-acad-muted" style={{ margin: '0.5rem 0' }}>
                  {br.address || 'No street address set'} {br.pincode ? `(${br.pincode})` : ''}
                </p>
                <div className="kg-acad-meta-tags">
                  <span>Capacity: {br.capacity ?? 'Unset'}</span>
                  <span>Athletes: {athletes.filter(a => a.unitId === br.id).length}</span>
                  <span>Batches: {batches.filter(b => b.unitId === br.id).length}</span>
                </div>
                {capabilities.canManageBranches && !br.isPrimary && (
                  <div className="kg-acad-btn-row" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="kg-acad-btn-outline is-danger"
                      onClick={async () => {
                        const res = await archiveAcademyBranch(tenantId, br.id)
                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                        if (res.success) await onRefresh()
                      }}
                    >
                      Archive Branch
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // 2. ATHLETES ROSTER & PRIVATE DETAIL VIEW
  // =========================================================================
  if (mode === 'athletes') {
    const filtered = athletes.filter(a => {
      if (selectedBranchId && a.unitId !== selectedBranchId) return false
      if (statusFilter !== 'all' && a.enrollmentStatus !== statusFilter) return false
      if (batchFilter !== 'all' && a.batchId !== batchFilter) return false
      if (athleteSearch.trim()) {
        const q = athleteSearch.toLowerCase()
        return (
          a.studentName.toLowerCase().includes(q) ||
          a.parentName.toLowerCase().includes(q) ||
          (a.sport || '').toLowerCase().includes(q)
        )
      }
      return true
    })

    const activeAthlete = activeAthleteId ? athletes.find(a => a.id === activeAthleteId) || null : null

    const handleEnrollAthlete = async (e: FormEvent) => {
      e.preventDefault()
      const res = await saveAcademyAthlete(tenantId, {
        studentName,
        parentName,
        parentPhone,
        parentEmail,
        unitId: studentBranchId || selectedBranchId || null,
        batchId: studentBatchId || null,
        assignedCoachId: studentCoachId || null,
        sport: studentSport,
        ageCategory,
        skillLevel,
        enrollmentStatus: 'active',
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        guardianConsentVerified: consentVerified,
        monthlyFee: Number(monthlyFee || 0),
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setStudentName('')
        setParentName('')
        setParentPhone('')
        setParentEmail('')
        setShowAddAthlete(false)
        await onRefresh()
      }
    }

    const handleExportCsv = () => {
      const headers = ['Athlete Name', 'Parent/Guardian', 'Phone', 'Sport', 'Age Group', 'Skill', 'Status', 'Branch', 'Joining Date']
      const rows = filtered.map(a => {
        const branchName = branches.find(b => b.id === a.unitId)?.name || 'Unassigned'
        const displayPhone = dpdpMaskEnabled ? maskPhone(a.parentPhone) : a.parentPhone
        return [
          escapeCsv(a.studentName),
          escapeCsv(a.parentName),
          escapeCsv(displayPhone),
          escapeCsv(a.sport || ''),
          escapeCsv(a.ageCategory || ''),
          escapeCsv(a.skillLevel),
          escapeCsv(a.enrollmentStatus),
          escapeCsv(branchName),
          escapeCsv(a.joiningDate || ''),
        ].join(',')
      })
      const csv = [`# KhelGrid Athlete Roster - ${academyName}`, headers.join(','), ...rows].join('\n')
      downloadBlobFile(`${academyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-athletes.csv`, csv)
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-athletes-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Academy Athletes Roster</h2>
            <p className="kg-acad-muted">
              Manage enrolled athletes, branch assignments, guardian DPDP consent, and private coaching development notes.
            </p>
          </div>
          <div className="kg-acad-btn-row">
            <button type="button" className="kg-acad-btn-outline" onClick={handleExportCsv}>
              <SiteIcon name="download" size={15} /> Export Roster CSV
            </button>
            {capabilities.canManageAthletes && (
              <button type="button" className="kg-acad-btn-primary" onClick={() => setShowAddAthlete(v => !v)}>
                <SiteIcon name="plus" size={15} /> {showAddAthlete ? 'Cancel' : 'Enroll Athlete'}
              </button>
            )}
          </div>
        </div>

        {showAddAthlete && capabilities.canManageAthletes && (
          <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleEnrollAthlete(e)}>
            <h3>Enroll Athlete</h3>
            <div className="kg-acad-form-grid">
              <label className="kg-acad-field">
                <span>Athlete Full Name *</span>
                <input type="text" required value={studentName} onChange={e => setStudentName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Parent / Guardian Name *</span>
                <input type="text" required value={parentName} onChange={e => setParentName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Guardian Phone *</span>
                <input type="tel" required value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Guardian Email</span>
                <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Sport</span>
                <input type="text" placeholder="Cricket / Football / Badminton" value={studentSport} onChange={e => setStudentSport(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Age Category</span>
                <input type="text" value={ageCategory} onChange={e => setAgeCategory(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Skill Level</span>
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value as AcademyAthleteRecord['skillLevel'])}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite / Squad</option>
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Branch</span>
                <select value={studentBranchId} onChange={e => setStudentBranchId(e.target.value)}>
                  <option value="">Main / All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Assigned Batch</span>
                <select value={studentBatchId} onChange={e => setStudentBatchId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Assigned Coach</span>
                <select value={studentCoachId} onChange={e => setStudentCoachId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </label>
              <label className="kg-acad-field">
                <span>Emergency Contact Name</span>
                <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
              </label>
              <label className="kg-acad-field">
                <span>Emergency Contact Phone</span>
                <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
              </label>
              {capabilities.canViewFinance && (
                <label className="kg-acad-field">
                  <span>Monthly Fee Info (INR)</span>
                  <input type="number" min={0} value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} />
                </label>
              )}
            </div>
            <label className="kg-acad-checkbox" style={{ marginTop: '0.65rem' }}>
              <input type="checkbox" checked={consentVerified} onChange={e => setConsentVerified(e.target.checked)} />
              <span>Guardian DPDP data consent verified on file</span>
            </label>
            <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
              <button type="submit" className="kg-acad-btn-primary">Save Athlete Record</button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="kg-acad-filter-bar">
          <input
            type="search"
            placeholder="Search athlete, parent, or sport…"
            value={athleteSearch}
            onChange={e => setAthleteSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="transferred">Transferred</option>
          </select>
          <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
            <option value="all">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
          </select>
        </div>

        {/* Athlete Detail Drawer / Panel */}
        {activeAthlete && (
          <section className="kg-acad-card is-highlight" aria-label="Athlete Detail Panel">
            <div className="kg-acad-card-head">
              <div>
                <h3 style={{ margin: 0 }}>{activeAthlete.studentName}</h3>
                <div className="kg-acad-muted">
                  {activeAthlete.sport || 'General Sport'} · {activeAthlete.ageCategory || 'Open'} · {activeAthlete.skillLevel}
                </div>
              </div>
              <button type="button" className="kg-acad-btn-outline" onClick={() => setActiveAthleteId(null)}>
                Close Details
              </button>
            </div>
            <div className="kg-acad-meta-tags" style={{ margin: '0.65rem 0' }}>
              <span>Guardian: {activeAthlete.parentName}</span>
              <span>Contact: {dpdpMaskEnabled ? maskPhone(activeAthlete.parentPhone) : activeAthlete.parentPhone}</span>
              <span>Emergency: {activeAthlete.emergencyContactName || 'Unset'} {activeAthlete.emergencyContactPhone ? `(${dpdpMaskEnabled ? maskPhone(activeAthlete.emergencyContactPhone) : activeAthlete.emergencyContactPhone})` : ''}</span>
              <span>DPDP Consent: {activeAthlete.guardianConsentVerified ? 'Verified' : 'Pending'}</span>
            </div>

            {capabilities.canManageAthletes && (
              <div className="kg-acad-inline-row" style={{ marginBottom: '0.85rem' }}>
                <label className="kg-acad-field">
                  <span>Status Lifecycle</span>
                  <select
                    value={activeAthlete.enrollmentStatus}
                    onChange={async e => {
                      const next = e.target.value as AthleteEnrollmentStatus
                      const res = await saveAcademyAthlete(tenantId, {
                        id: activeAthlete.id,
                        studentName: activeAthlete.studentName,
                        parentName: activeAthlete.parentName,
                        parentPhone: activeAthlete.parentPhone,
                        unitId: activeAthlete.unitId,
                        batchId: activeAthlete.batchId,
                        enrollmentStatus: next,
                      })
                      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                      if (res.success) await onRefresh()
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="graduated">Graduated</option>
                    <option value="transferred">Transferred</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
            )}

            <div className="kg-acad-subblock">
              <h4>Private Staff Coaching &amp; Development Notes (Never Public)</h4>
              {(capabilities.canManageAthletes || capabilities.canMarkAttendance) && (
                <form
                  className="kg-acad-inline-row"
                  onSubmit={async e => {
                    e.preventDefault()
                    if (!noteBody.trim()) return
                    const res = await addAthletePrivateNote(
                      tenantId,
                      activeAthlete.id,
                      activeAthlete.unitId,
                      actorName,
                      noteType,
                      noteBody,
                    )
                    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                    if (res.success) {
                      setNoteBody('')
                      setPrivateNotes(await listAthletePrivateNotes(tenantId, activeAthlete.id))
                    }
                  }}
                >
                  <select value={noteType} onChange={e => setNoteType(e.target.value as AcademyAthleteNoteRecord['noteType'])}>
                    <option value="development">Development</option>
                    <option value="performance">Performance</option>
                    <option value="injury">Injury / Medical Alert</option>
                    <option value="guardian_comms">Guardian Comms</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Add private evaluation or training observation…"
                    value={noteBody}
                    onChange={e => setNoteBody(e.target.value)}
                  />
                  <button type="submit" className="kg-acad-btn-primary">Add Note</button>
                </form>
              )}
              {privateNotes.length === 0 ? (
                <p className="kg-acad-muted" style={{ marginTop: '0.5rem' }}>No private coaching notes logged for this athlete yet.</p>
              ) : (
                <ul className="kg-acad-list" style={{ marginTop: '0.5rem' }}>
                  {privateNotes.map(n => (
                    <li key={n.id} className="kg-acad-list-item">
                      <div>
                        <span className="kg-acad-pill is-info">{n.noteType}</span>{' '}
                        <strong>{n.authorName}</strong>
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

        {filtered.length === 0 ? (
          <EmptyState
            title="No athletes match current filters"
            description="Enroll athletes manually or convert admitted trial candidates from the Admissions pipeline."
          />
        ) : (
          <div className="kg-acad-table-wrap">
            <table className="kg-acad-table">
              <thead>
                <tr>
                  <th>Athlete</th>
                  <th>Guardian &amp; Phone</th>
                  <th>Branch / Batch</th>
                  <th>Sport &amp; Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const branchName = branches.find(b => b.id === a.unitId)?.name || 'Main'
                  const batchName = batches.find(b => b.id === a.batchId)?.batchName || 'Unassigned'
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.studentName}</strong>
                        <div className="kg-acad-muted">{a.ageCategory || 'Open age'}</div>
                      </td>
                      <td>
                        <div>{a.parentName}</div>
                        <div className="kg-acad-muted">
                          {dpdpMaskEnabled ? maskPhone(a.parentPhone) : a.parentPhone}
                        </div>
                      </td>
                      <td>
                        <div>{branchName}</div>
                        <div className="kg-acad-muted">{batchName}</div>
                      </td>
                      <td>
                        <div>{a.sport || '—'}</div>
                        <div className="kg-acad-muted">{a.skillLevel}</div>
                      </td>
                      <td>
                        <span className={`kg-acad-pill ${a.enrollmentStatus === 'active' ? 'is-emerald' : 'is-warning'}`}>
                          {a.enrollmentStatus}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="kg-acad-btn-outline" onClick={() => setActiveAthleteId(a.id)}>
                          Profile &amp; Notes
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // 3. COACHES & TRAINING STAFF
  // =========================================================================
  const handleSaveCoach = async (e: FormEvent) => {
    e.preventDefault()
    const res = await saveAcademyCoach(tenantId, {
      fullName: coachName,
      email: coachEmail,
      phone: coachPhone,
      roleTitle: coachTitle,
      employmentType: coachEmployment,
      primaryUnitId: coachBranchId || selectedBranchId || null,
      specializations: coachSpecs.split(',').map(s => s.trim()).filter(Boolean),
      qualificationSummary: coachQuals,
      safeguardingStatus: 'pending',
    })
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) {
      setCoachName('')
      setCoachEmail('')
      setCoachPhone('')
      setShowAddCoach(false)
      await onRefresh()
    }
  }

  const visibleCoaches = selectedBranchId
    ? coaches.filter(c => !c.primaryUnitId || c.primaryUnitId === selectedBranchId)
    : coaches

  return (
    <div className="kg-acad-stack" data-testid="academy-coaches-panel">
      <div className="kg-acad-section-head">
        <div>
          <h2>Coaches &amp; Instruction Team</h2>
          <p className="kg-acad-muted">
            Associate qualified KhelGrid coaches with branches, training batches, and safeguarding checks without creating duplicate coach accounts.
          </p>
        </div>
        {capabilities.canManageCoaches && (
          <button type="button" className="kg-acad-btn-primary" onClick={() => setShowAddCoach(v => !v)}>
            <SiteIcon name="plus" size={15} /> {showAddCoach ? 'Cancel' : 'Add Coach'}
          </button>
        )}
      </div>

      {showAddCoach && capabilities.canManageCoaches && (
        <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleSaveCoach(e)}>
          <h3>Add Academy Coach</h3>
          <div className="kg-acad-form-grid">
            <label className="kg-acad-field">
              <span>Full Name *</span>
              <input type="text" required value={coachName} onChange={e => setCoachName(e.target.value)} />
            </label>
            <label className="kg-acad-field">
              <span>Role Title *</span>
              <input type="text" required value={coachTitle} onChange={e => setCoachTitle(e.target.value)} />
            </label>
            <label className="kg-acad-field">
              <span>Email</span>
              <input type="email" value={coachEmail} onChange={e => setCoachEmail(e.target.value)} />
            </label>
            <label className="kg-acad-field">
              <span>Phone</span>
              <input type="tel" value={coachPhone} onChange={e => setCoachPhone(e.target.value)} />
            </label>
            <label className="kg-acad-field">
              <span>Employment Type</span>
              <select value={coachEmployment} onChange={e => setCoachEmployment(e.target.value as AcademyCoachRecord['employmentType'])}>
                <option value="full_time">Full-Time</option>
                <option value="part_time">Part-Time</option>
                <option value="visiting">Visiting Specialist</option>
                <option value="consultant">Consultant</option>
              </select>
            </label>
            <label className="kg-acad-field">
              <span>Primary Branch</span>
              <select value={coachBranchId} onChange={e => setCoachBranchId(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="kg-acad-field">
              <span>Specializations (comma separated)</span>
              <input type="text" placeholder="Fast Bowling, Fielding, S&C" value={coachSpecs} onChange={e => setCoachSpecs(e.target.value)} />
            </label>
            <label className="kg-acad-field">
              <span>Qualifications Summary</span>
              <input type="text" placeholder="NIS Diploma / AIFF B License" value={coachQuals} onChange={e => setCoachQuals(e.target.value)} />
            </label>
          </div>
          <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
            <button type="submit" className="kg-acad-btn-primary">Save Coach Association</button>
          </div>
        </form>
      )}

      {visibleCoaches.length === 0 ? (
        <EmptyState
          title="No coaches registered yet"
          description="Add your coaching staff above and assign them to batches, sessions, and safeguarding workflows."
        />
      ) : (
        <div className="kg-acad-cards-grid">
          {visibleCoaches.map(c => {
            const branchName = branches.find(b => b.id === c.primaryUnitId)?.name || 'All Branches'
            return (
              <article key={c.id} className="kg-acad-card">
                <div className="kg-acad-card-head">
                  <div>
                    <h3 style={{ margin: 0 }}>{c.fullName}</h3>
                    <div className="kg-acad-muted">{c.roleTitle} · {c.employmentType.replace('_', ' ')}</div>
                  </div>
                  <span className={`kg-acad-pill ${c.safeguardingStatus === 'verified' ? 'is-emerald' : 'is-warning'}`}>
                    Safeguarding: {c.safeguardingStatus}
                  </span>
                </div>
                <div className="kg-acad-meta-tags" style={{ marginTop: '0.6rem' }}>
                  <span>Branch: {branchName}</span>
                  <span>Specs: {c.specializations.length > 0 ? c.specializations.join(', ') : 'General'}</span>
                  {c.qualificationSummary && <span>License: {c.qualificationSummary}</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
