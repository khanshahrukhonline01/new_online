import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import type { CoachProfileRecord } from '../coachWorkspaceClient'
import {
  addCoachAthleteNote,
  listCoachAthleteNotes,
  listCoachAthletes,
  listCoachDirectoryInquiries,
  saveCoachAthlete,
  updateCoachAthleteRelationship,
  updateCoachInquiryStatus,
  type CoachAthleteGender,
  type CoachAthleteNoteRecord,
  type CoachAthleteRecord,
  type CoachAthleteSkillLevel,
  type CoachAthleteStatus,
  type CoachDirectoryInquiryRecord,
  type CoachNoteType,
  type CoachNoteVisibility,
} from '../coachOperationsClient'

export interface CoachAthletesPanelProps {
  profile: CoachProfileRecord
  tenantId?: string | null
  initialAthleteId?: string
  onRefreshOverview: () => void
}

const STATUS_FILTERS: readonly { id: 'all' | CoachAthleteStatus; label: string }[] = [
  { id: 'all', label: 'All Roster' },
  { id: 'active', label: 'Active' },
  { id: 'invited', label: 'Invited (Pending Consent)' },
  { id: 'paused', label: 'Paused' },
  { id: 'released', label: 'Released' },
]

export function CoachAthletesPanel({
  profile,
  tenantId,
  initialAthleteId,
  onRefreshOverview,
}: CoachAthletesPanelProps) {
  const [athletes, setAthletes] = useState<CoachAthleteRecord[]>([])
  const [inquiries, setInquiries] = useState<CoachDirectoryInquiryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | CoachAthleteStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [savingAthlete, setSavingAthlete] = useState(false)

  // Add / Invite form state
  const [fullName, setFullName] = useState('')
  const [sport, setSport] = useState(profile.sportsSpecialization[0] || 'Athletics')
  const [ageGroup, setAgeGroup] = useState('U-16')
  const [ageYears, setAgeYears] = useState('15')
  const [gender, setGender] = useState<CoachAthleteGender>('male')
  const [skillLevel, setSkillLevel] = useState<CoachAthleteSkillLevel>('Intermediate')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [athleteUserId, setAthleteUserId] = useState('')
  const [goalsSummary, setGoalsSummary] = useState('')

  // Selected athlete detail + development notes
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(initialAthleteId || null)
  const [notes, setNotes] = useState<CoachAthleteNoteRecord[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [noteType, setNoteType] = useState<CoachNoteType>('development')
  const [noteVisibility, setNoteVisibility] = useState<CoachNoteVisibility>('coach_private')
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError(null)
    const rosterRes = await listCoachAthletes(profile.id)
    if (!rosterRes.ok) {
      setError(rosterRes.error)
      setLoading(false)
      return
    }
    setAthletes(rosterRes.data)

    if (profile.directoryCoachId) {
      const inqRes = await listCoachDirectoryInquiries(profile.directoryCoachId)
      if (inqRes.ok) {
        setInquiries(inqRes.data)
      }
    }
    setLoading(false)
  }, [profile.id, profile.directoryCoachId])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    if (initialAthleteId) {
      setSelectedAthleteId(initialAthleteId)
    }
  }, [initialAthleteId])

  const selectedAthlete = useMemo(
    () => athletes.find(a => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId],
  )

  const loadNotes = useCallback(async (athleteId: string) => {
    setLoadingNotes(true)
    const res = await listCoachAthleteNotes(athleteId)
    if (res.ok) {
      setNotes(res.data)
    }
    setLoadingNotes(false)
  }, [])

  useEffect(() => {
    if (selectedAthlete) {
      void loadNotes(selectedAthlete.id)
    } else {
      setNotes([])
    }
  }, [selectedAthlete, loadNotes])

  const filteredAthletes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return athletes.filter(item => {
      if (statusFilter !== 'all' && item.relationshipStatus !== statusFilter) return false
      if (!q) return true
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.sport.toLowerCase().includes(q) ||
        item.ageGroup.toLowerCase().includes(q)
      )
    })
  }, [athletes, statusFilter, searchQuery])

  const handleCreateAthlete = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFeedback(null)
    setSavingAthlete(true)

    const parsedAge = ageYears.trim() ? Number.parseInt(ageYears.trim(), 10) : null
    const res = await saveCoachAthlete({
      coachProfileId: profile.id,
      tenantId,
      fullName,
      sport,
      ageGroup,
      ageYears: parsedAge && Number.isFinite(parsedAge) ? parsedAge : null,
      gender,
      skillLevel,
      guardianName: guardianName || null,
      guardianPhone: guardianPhone || null,
      athleteUserId: athleteUserId.trim() || null,
      goalsSummary: goalsSummary || null,
    })

    setSavingAthlete(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setFeedback(
      res.data.relationshipStatus === 'invited'
        ? `Consent invitation created for ${res.data.fullName} (awaiting athlete acceptance).`
        : `${res.data.fullName} added to your active coaching roster.`,
    )
    setFullName('')
    setGuardianName('')
    setGuardianPhone('')
    setAthleteUserId('')
    setGoalsSummary('')
    setShowAddForm(false)
    setSelectedAthleteId(res.data.id)
    await loadRoster()
    onRefreshOverview()
  }

  const handleStatusChange = async (athlete: CoachAthleteRecord, nextStatus: CoachAthleteStatus) => {
    setError(null)
    setFeedback(null)
    const res = await updateCoachAthleteRelationship(athlete.id, nextStatus)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setFeedback(`Updated ${athlete.fullName} relationship to "${nextStatus}".`)
    await loadRoster()
    onRefreshOverview()
  }

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAthlete) return
    setError(null)
    setFeedback(null)
    setSavingNote(true)

    const res = await addCoachAthleteNote({
      coachAthleteId: selectedAthlete.id,
      coachProfileId: profile.id,
      noteType,
      visibility: noteVisibility,
      noteBody,
    })

    setSavingNote(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setNoteBody('')
    setFeedback(
      noteVisibility === 'coach_private'
        ? 'Private coach observation saved (invisible to athlete account).'
        : 'Shared coaching note saved and accessible to the linked athlete.',
    )
    await loadNotes(selectedAthlete.id)
  }

  const handleInquiryStatus = async (inquiry: CoachDirectoryInquiryRecord, status: CoachDirectoryInquiryRecord['status']) => {
    setError(null)
    const res = await updateCoachInquiryStatus(inquiry.id, status)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setFeedback(`Marked inquiry ${inquiry.inquiryToken} as ${status}.`)
    await loadRoster()
    onRefreshOverview()
  }

  const columns: DataTableColumn<CoachAthleteRecord>[] = [
    {
      key: 'fullName',
      header: 'Athlete',
      render: row => (
        <div>
          <strong>{row.fullName}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {row.sport} · {row.ageGroup}
            {row.ageYears ? ` (${row.ageYears}y)` : ''}
          </div>
        </div>
      ),
    },
    { key: 'skillLevel', header: 'Level', hideOnMobile: true },
    {
      key: 'consentGranted',
      header: 'Consent',
      hideOnMobile: true,
      render: row => (
        <span className={`kg-coach-pill ${row.consentGranted ? 'is-success' : 'is-warning'}`}>
          {row.consentGranted ? 'Consent Granted' : 'Pending Consent'}
        </span>
      ),
    },
    {
      key: 'relationshipStatus',
      header: 'Status',
      render: row => (
        <span
          className={`kg-coach-pill ${
            row.relationshipStatus === 'active'
              ? 'is-success'
              : row.relationshipStatus === 'invited'
                ? 'is-warning'
                : 'is-neutral'
          }`}
        >
          {row.relationshipStatus}
        </span>
      ),
    },
  ]

  return (
    <div className="kg-coach-stack" data-testid="coach-athletes-panel">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <div>
            <strong>Action blocked or failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {feedback && (
        <div className="kg-coach-alert is-success" role="status">
          <p style={{ margin: 0 }}>{feedback}</p>
        </div>
      )}

      <section className="kg-coach-card kg-coach-stack">
        <div className="kg-coach-card-head">
          <div>
            <h2>Consent-First Athlete Roster</h2>
            <p>
              Manage athletes under your direct coaching roster, linked KhelGrid accounts, and guardian-approved trainees.
            </p>
          </div>
          <div className="kg-coach-btn-row">
            <button
              type="button"
              className="kg-coach-btn-primary"
              onClick={() => setShowAddForm(prev => !prev)}
            >
              <SiteIcon name={showAddForm ? 'close' : 'plus'} size={15} />
              <span>{showAddForm ? 'Close Form' : 'Add / Invite Athlete'}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form className="kg-coach-stack" onSubmit={handleCreateAthlete} aria-label="Add or invite athlete">
            <div className="kg-coach-form-grid">
              <label className="kg-coach-field">
                <span>Athlete Full Name *</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Rohan Verma"
                />
              </label>

              <label className="kg-coach-field">
                <span>Sport *</span>
                <input
                  type="text"
                  required
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  placeholder="e.g. Athletics"
                />
              </label>

              <label className="kg-coach-field">
                <span>Age Group</span>
                <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
                  <option value="U-10">U-10</option>
                  <option value="U-12">U-12</option>
                  <option value="U-14">U-14</option>
                  <option value="U-16">U-16</option>
                  <option value="U-19">U-19</option>
                  <option value="Senior / Open">Senior / Open</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Age (Years)</span>
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={ageYears}
                  onChange={e => setAgeYears(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Gender</span>
                <select value={gender} onChange={e => setGender(e.target.value as CoachAthleteGender)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Skill Tier</span>
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value as CoachAthleteSkillLevel)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Elite">Elite</option>
                  <option value="National">National</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Parent / Guardian Name</span>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="Optional parent contact"
                />
              </label>

              <label className="kg-coach-field">
                <span>Guardian Phone</span>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={e => setGuardianPhone(e.target.value)}
                  placeholder="10-digit mobile"
                />
              </label>

              <label className="kg-coach-field">
                <span>Linked Athlete User ID (Optional UUID)</span>
                <input
                  type="text"
                  value={athleteUserId}
                  onChange={e => setAthleteUserId(e.target.value)}
                  placeholder="Starts in Invited state until athlete accepts"
                />
              </label>
            </div>

            <label className="kg-coach-field">
              <span>Training Goals &amp; Baseline Focus</span>
              <textarea
                rows={2}
                value={goalsSummary}
                onChange={e => setGoalsSummary(e.target.value)}
                placeholder="Season target events, technical milestones, or fitness objectives..."
              />
            </label>

            <div className="kg-coach-btn-row">
              <button type="submit" className="kg-coach-btn-primary" disabled={savingAthlete}>
                <SiteIcon name="check" size={14} />
                <span>{savingAthlete ? 'Saving…' : athleteUserId.trim() ? 'Send Consent Invitation' : 'Add Active Athlete'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="kg-coach-btn-row" style={{ justifyContent: 'space-between' }}>
          <div className="kg-coach-btn-row">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.id}
                type="button"
                className={statusFilter === filter.id ? 'kg-coach-btn-primary' : 'kg-coach-btn-outline'}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="kg-coach-field" style={{ minWidth: '220px' }}>
            <input
              type="search"
              aria-label="Filter athletes by name or sport"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or sport…"
            />
          </label>
        </div>

        <DataTable
          columns={columns}
          rows={filteredAthletes}
          rowKey={row => row.id}
          loading={loading}
          caption="Authorized Coach-Athlete Roster"
          rowActions={row => (
            <div className="kg-coach-btn-row">
              <button
                type="button"
                className="kg-coach-btn-outline kg-touch-target"
                onClick={() => setSelectedAthleteId(row.id)}
              >
                <span>{selectedAthleteId === row.id ? 'Viewing' : 'Notes & Detail'}</span>
              </button>
              {row.relationshipStatus === 'active' && (
                <button
                  type="button"
                  className="kg-coach-btn-outline kg-touch-target"
                  onClick={() => void handleStatusChange(row, 'paused')}
                >
                  Pause
                </button>
              )}
              {row.relationshipStatus === 'paused' && !row.athleteUserId && (
                <button
                  type="button"
                  className="kg-coach-btn-outline kg-touch-target"
                  onClick={() => void handleStatusChange(row, 'active')}
                >
                  Resume
                </button>
              )}
              {row.relationshipStatus !== 'released' && (
                <button
                  type="button"
                  className="kg-coach-btn-outline kg-touch-target"
                  onClick={() => void handleStatusChange(row, 'released')}
                >
                  Release
                </button>
              )}
            </div>
          )}
          empty={
            <EmptyState
              icon={<SiteIcon name="users" size={24} />}
              title="No athletes match this filter"
              description="Add or invite your first athlete to manage programmes, attendance roll-call, notes, and Khelo India fitness assessments."
            />
          }
        />
      </section>

      {selectedAthlete && (
        <section className="kg-coach-card kg-coach-stack" aria-label={`Athlete profile for ${selectedAthlete.fullName}`}>
          <div className="kg-coach-card-head">
            <div>
              <h3>{selectedAthlete.fullName} · Athlete Development Record</h3>
              <p>
                {selectedAthlete.sport} · {selectedAthlete.ageGroup} · {selectedAthlete.skillLevel}
                {selectedAthlete.guardianPhone ? ` · Guardian: ${selectedAthlete.guardianName || 'Listed'} (${selectedAthlete.guardianPhone})` : ''}
              </p>
            </div>
            <button
              type="button"
              className="kg-coach-btn-outline"
              onClick={() => setSelectedAthleteId(null)}
            >
              Close Detail
            </button>
          </div>

          {selectedAthlete.goalsSummary && (
            <div className="kg-coach-stat-tile">
              <span className="kg-coach-stat-label">Goals &amp; Coaching Focus</span>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{selectedAthlete.goalsSummary}</p>
            </div>
          )}

          <form className="kg-coach-stack" onSubmit={handleAddNote}>
            <div className="kg-coach-form-grid">
              <label className="kg-coach-field">
                <span>Note Category</span>
                <select value={noteType} onChange={e => setNoteType(e.target.value as CoachNoteType)}>
                  <option value="development">Technical Development</option>
                  <option value="tactical">Tactical Feedback</option>
                  <option value="fitness">Physical Conditioning</option>
                  <option value="injury_precaution">Injury / Load Precaution</option>
                  <option value="parent_update">Parent / Guardian Update</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Privacy Visibility Boundary *</span>
                <select
                  value={noteVisibility}
                  onChange={e => setNoteVisibility(e.target.value as CoachNoteVisibility)}
                >
                  <option value="coach_private">Coach Private (Hidden from athlete RLS)</option>
                  <option value="shared_with_athlete">Shared with Athlete (Visible to linked account)</option>
                </select>
              </label>
            </div>

            <label className="kg-coach-field">
              <span>Observation Note *</span>
              <textarea
                required
                rows={2}
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Record technical observations, load modifications, or next-week drill cues..."
              />
            </label>

            <div className="kg-coach-btn-row">
              <button type="submit" className="kg-coach-btn-primary" disabled={savingNote}>
                <SiteIcon name="plus" size={14} />
                <span>{savingNote ? 'Saving Note…' : 'Save Development Note'}</span>
              </button>
            </div>
          </form>

          {loadingNotes ? (
            <p className="kg-coach-muted-note">Loading athlete notes…</p>
          ) : notes.length === 0 ? (
            <p className="kg-coach-muted-note">No development notes recorded for this athlete yet.</p>
          ) : (
            <ul className="kg-coach-list">
              {notes.map(note => (
                <li key={note.id} className="kg-coach-list-item">
                  <div>
                    <strong>
                      {note.noteType.replace(/_/g, ' ')} ·{' '}
                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-IN') : ''}
                    </strong>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem' }}>{note.noteBody}</p>
                  </div>
                  <span
                    className={`kg-coach-pill ${
                      note.visibility === 'coach_private' ? 'is-warning' : 'is-success'
                    }`}
                  >
                    {note.visibility === 'coach_private' ? 'Coach Private' : 'Shared with Athlete'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {profile.directoryCoachId && (
        <section className="kg-coach-card kg-coach-stack" aria-label="Directory coaching inquiries">
          <div className="kg-coach-card-head">
            <div>
              <h3>Public Directory Coaching Inquiries</h3>
              <p>Leads submitted through your verified coach profile modal in PostgreSQL.</p>
            </div>
          </div>

          {inquiries.length === 0 ? (
            <p className="kg-coach-muted-note">No coaching inquiries received yet.</p>
          ) : (
            <ul className="kg-coach-list">
              {inquiries.map(inq => (
                <li key={inq.id} className="kg-coach-list-item">
                  <div>
                    <strong>
                      {inq.athleteName} ({inq.ageCategory} · {inq.skillLevel})
                    </strong>
                    <span>
                      {inq.inquiryToken} · {inq.sport} · Phone: {inq.phone}
                      {inq.objective ? ` · ${inq.objective}` : ''}
                    </span>
                  </div>
                  <div className="kg-coach-btn-row">
                    <span className={`kg-coach-pill ${inq.status === 'submitted' ? 'is-warning' : 'is-success'}`}>
                      {inq.status}
                    </span>
                    {inq.status === 'submitted' && (
                      <button
                        type="button"
                        className="kg-coach-btn-outline"
                        onClick={() => void handleInquiryStatus(inq, 'contacted')}
                      >
                        Mark Contacted
                      </button>
                    )}
                    {inq.status !== 'scheduled' && inq.status !== 'completed' && (
                      <button
                        type="button"
                        className="kg-coach-btn-outline"
                        onClick={() => void handleInquiryStatus(inq, 'scheduled')}
                      >
                        Mark Scheduled
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
