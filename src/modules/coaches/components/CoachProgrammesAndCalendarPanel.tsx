import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import type { CoachWorkspaceSectionId } from '../coachDashboardTypes'
import type { CoachProfileRecord } from '../coachWorkspaceClient'
import {
  assignProgrammeToAthlete,
  createCoachSession,
  listCoachAthletes,
  listCoachProgrammes,
  listCoachSessions,
  listProgrammeAssignments,
  saveCoachProgramme,
  updateCoachSessionStatus,
  updateProgrammeAssignmentProgress,
  type CoachAthleteRecord,
  type CoachProgrammeAssignmentRecord,
  type CoachProgrammeDifficulty,
  type CoachProgrammeExercise,
  type CoachProgrammeStatus,
  type CoachSessionMode,
  type CoachSessionStatus,
  type CoachTrainingProgrammeRecord,
  type CoachTrainingSessionRecord,
} from '../coachOperationsClient'

export interface CoachProgrammesPanelProps {
  profile: CoachProfileRecord
  tenantId?: string | null
  initialProgrammeId?: string
  onRefreshOverview: () => void
}

export function CoachProgrammesPanel({
  profile,
  tenantId,
  initialProgrammeId,
  onRefreshOverview,
}: CoachProgrammesPanelProps) {
  const [programmes, setProgrammes] = useState<CoachTrainingProgrammeRecord[]>([])
  const [assignments, setAssignments] = useState<CoachProgrammeAssignmentRecord[]>([])
  const [athletes, setAthletes] = useState<CoachAthleteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Builder form state
  const [showBuilder, setShowBuilder] = useState(false)
  const [title, setTitle] = useState('')
  const [sport, setSport] = useState(profile.sportsSpecialization[0] || 'Athletics')
  const [targetAgeGroup, setTargetAgeGroup] = useState('U-16')
  const [difficultyLevel, setDifficultyLevel] = useState<CoachProgrammeDifficulty>('Intermediate')
  const [durationWeeks, setDurationWeeks] = useState(6)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4)
  const [status, setStatus] = useState<CoachProgrammeStatus>('active')
  const [summary, setSummary] = useState('')
  const [exercises, setExercises] = useState<CoachProgrammeExercise[]>([
    { name: 'Dynamic Warmup & Mobility', sets: '2', reps: '10 min', intensity: 'RPE 5' },
  ])
  const [selectedAthleteByProg, setSelectedAthleteByProg] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [progRes, assignRes, athRes] = await Promise.all([
      listCoachProgrammes(profile.id),
      listProgrammeAssignments(profile.id),
      listCoachAthletes(profile.id),
    ])

    if (!progRes.ok) {
      setError(progRes.error)
      setLoading(false)
      return
    }
    setProgrammes(progRes.data)
    if (assignRes.ok) setAssignments(assignRes.data)
    if (athRes.ok) setAthletes(athRes.data.filter(a => a.relationshipStatus !== 'released'))
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSaveProgramme = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFeedback(null)
    setSaving(true)

    const res = await saveCoachProgramme({
      coachProfileId: profile.id,
      tenantId,
      title,
      sport,
      targetAgeGroup,
      difficultyLevel,
      durationWeeks,
      sessionsPerWeek,
      status,
      summary,
      exercises,
    })

    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setFeedback(`Saved training programme "${res.data.title}".`)
    setTitle('')
    setSummary('')
    setShowBuilder(false)
    await loadData()
    onRefreshOverview()
  }

  const handleAssign = async (programmeId: string) => {
    const coachAthleteId = selectedAthleteByProg[programmeId]
    if (!coachAthleteId) {
      setError('Select an athlete from the dropdown before assigning.')
      return
    }
    setError(null)
    const res = await assignProgrammeToAthlete({
      programmeId,
      coachAthleteId,
      coachProfileId: profile.id,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    const athlete = athletes.find(a => a.id === coachAthleteId)
    setFeedback(`Assigned programme to ${athlete?.fullName || 'athlete'}.`)
    await loadData()
  }

  const handleUpdateProgress = async (assignment: CoachProgrammeAssignmentRecord, nextProgress: number) => {
    const nextStatus = nextProgress >= 100 ? 'completed' : nextProgress > 0 ? 'in_progress' : 'assigned'
    const res = await updateProgrammeAssignmentProgress(assignment.id, nextProgress, nextStatus)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await loadData()
  }

  const athleteNameMap = useMemo(() => new Map(athletes.map(a => [a.id, a.fullName])), [athletes])

  return (
    <div className="kg-coach-stack" data-testid="coach-programmes-panel">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <div>
            <strong>Programme operation failed</strong>
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
            <h2>Training Programmes &amp; Exercise Curricula</h2>
            <p>Build multi-week coaching blocks with drills, intensities, and athlete progression tracking.</p>
          </div>
          <button
            type="button"
            className="kg-coach-btn-primary"
            onClick={() => setShowBuilder(prev => !prev)}
          >
            <SiteIcon name={showBuilder ? 'close' : 'plus'} size={15} />
            <span>{showBuilder ? 'Close Builder' : 'New Training Programme'}</span>
          </button>
        </div>

        {showBuilder && (
          <form className="kg-coach-stack" onSubmit={handleSaveProgramme} aria-label="Create training programme">
            <div className="kg-coach-form-grid">
              <label className="kg-coach-field">
                <span>Programme Title *</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pre-Season Acceleration & Core Block"
                />
              </label>

              <label className="kg-coach-field">
                <span>Sport *</span>
                <input
                  type="text"
                  required
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Target Age Group</span>
                <input
                  type="text"
                  value={targetAgeGroup}
                  onChange={e => setTargetAgeGroup(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Difficulty Level</span>
                <select
                  value={difficultyLevel}
                  onChange={e => setDifficultyLevel(e.target.value as CoachProgrammeDifficulty)}
                >
                  <option value="Foundation">Foundation</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="High Performance">High Performance</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Duration (Weeks)</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={durationWeeks}
                  onChange={e => setDurationWeeks(Number(e.target.value) || 4)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Sessions / Week</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={sessionsPerWeek}
                  onChange={e => setSessionsPerWeek(Number(e.target.value) || 3)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Programme Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as CoachProgrammeStatus)}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <label className="kg-coach-field">
              <span>Periodization Notes &amp; Coaching Outcomes</span>
              <textarea
                rows={2}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Describe technical focus, workload distribution, and recovery cues..."
              />
            </label>

            <div className="kg-coach-structured-block">
              <div className="kg-coach-structured-head">
                <h4>Structured Drills &amp; Exercises</h4>
                <button
                  type="button"
                  className="kg-coach-btn-outline"
                  onClick={() =>
                    setExercises(prev => [...prev, { name: '', sets: '3', reps: '10', intensity: 'RPE 7' }])
                  }
                >
                  <SiteIcon name="plus" size={14} />
                  <span>Add Drill</span>
                </button>
              </div>
              <div className="kg-coach-structured-list">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="kg-coach-structured-row">
                    <div className="kg-coach-form-grid" style={{ flex: 1 }}>
                      <label className="kg-coach-field">
                        <span>Exercise / Drill Name</span>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={e =>
                            setExercises(prev =>
                              prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)),
                            )
                          }
                          placeholder="e.g. A-Skip March"
                        />
                      </label>
                      <label className="kg-coach-field">
                        <span>Sets</span>
                        <input
                          type="text"
                          value={ex.sets}
                          onChange={e =>
                            setExercises(prev =>
                              prev.map((row, i) => (i === idx ? { ...row, sets: e.target.value } : row)),
                            )
                          }
                        />
                      </label>
                      <label className="kg-coach-field">
                        <span>Reps / Distance</span>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={e =>
                            setExercises(prev =>
                              prev.map((row, i) => (i === idx ? { ...row, reps: e.target.value } : row)),
                            )
                          }
                        />
                      </label>
                      <label className="kg-coach-field">
                        <span>Intensity</span>
                        <input
                          type="text"
                          value={ex.intensity || ''}
                          onChange={e =>
                            setExercises(prev =>
                              prev.map((row, i) => (i === idx ? { ...row, intensity: e.target.value } : row)),
                            )
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="kg-coach-icon-remove"
                      aria-label={`Remove drill ${idx + 1}`}
                      onClick={() => setExercises(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <SiteIcon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="kg-coach-btn-row">
              <button type="submit" className="kg-coach-btn-primary" disabled={saving}>
                <SiteIcon name="check" size={14} />
                <span>{saving ? 'Saving Programme…' : 'Save Training Programme'}</span>
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="kg-coach-muted-note">Loading training programmes…</p>
        ) : programmes.length === 0 ? (
          <EmptyState
            icon={<SiteIcon name="award" size={24} />}
            title="No training programmes created yet"
            description="Create a structured curriculum with sets, reps, and intensity zones, then assign it directly to athletes in your roster."
          />
        ) : (
          <div className="kg-coach-stack">
            {programmes.map(prog => {
              const progAssignments = assignments.filter(a => a.programmeId === prog.id)
              const isHighlighted = initialProgrammeId === prog.id
              return (
                <article
                  key={prog.id}
                  className="kg-coach-list-item"
                  style={isHighlighted ? { borderColor: 'var(--coach-emerald)' } : undefined}
                >
                  <div style={{ flex: '1 1 320px' }}>
                    <div className="kg-coach-btn-row" style={{ marginBottom: '0.25rem' }}>
                      <strong>{prog.title}</strong>
                      <span className={`kg-coach-pill ${prog.status === 'active' ? 'is-success' : 'is-neutral'}`}>
                        {prog.status}
                      </span>
                    </div>
                    <span>
                      {prog.sport} · {prog.targetAgeGroup} · {prog.difficultyLevel} · {prog.durationWeeks} weeks (
                      {prog.sessionsPerWeek}/wk) · {prog.exercises.length} drills
                    </span>
                    {prog.summary && (
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.84rem' }}>{prog.summary}</p>
                    )}
                    {progAssignments.length > 0 && (
                      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {progAssignments.map(a => (
                          <div key={a.id} className="kg-coach-btn-row">
                            <span style={{ fontSize: '0.8rem' }}>
                              Assigned: <strong>{athleteNameMap.get(a.coachAthleteId) || 'Athlete'}</strong> ({a.progressPct}%)
                            </span>
                            {a.progressPct < 100 && (
                              <button
                                type="button"
                                className="kg-coach-link-btn"
                                onClick={() => void handleUpdateProgress(a, Math.min(100, a.progressPct + 25))}
                              >
                                +25% Progress
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {athletes.length > 0 && (
                    <div className="kg-coach-btn-row">
                      <select
                        aria-label={`Select athlete to assign ${prog.title}`}
                        value={selectedAthleteByProg[prog.id] || ''}
                        onChange={e =>
                          setSelectedAthleteByProg(prev => ({ ...prev, [prog.id]: e.target.value }))
                        }
                        style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                      >
                        <option value="">Assign to athlete…</option>
                        {athletes.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.fullName} ({a.relationshipStatus})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="kg-coach-btn-outline"
                        onClick={() => void handleAssign(prog.id)}
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export interface CoachCalendarSessionsPanelProps {
  profile: CoachProfileRecord
  tenantId?: string | null
  initialSessionId?: string
  onRefreshOverview: () => void
  onSelectSection: (section: CoachWorkspaceSectionId) => void
}

export function CoachCalendarSessionsPanel({
  profile,
  tenantId,
  initialSessionId,
  onRefreshOverview,
  onSelectSection,
}: CoachCalendarSessionsPanelProps) {
  const [sessions, setSessions] = useState<CoachTrainingSessionRecord[]>([])
  const [programmes, setProgrammes] = useState<CoachTrainingProgrammeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterMode, setFilterMode] = useState<'upcoming' | 'all' | 'completed'>('upcoming')

  // Session form state
  const [title, setTitle] = useState('')
  const [sport, setSport] = useState(profile.sportsSpecialization[0] || 'Athletics')
  const [programmeId, setProgrammeId] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('08:30')
  const [venueName, setVenueName] = useState('')
  const [locationCity, setLocationCity] = useState(profile.city || '')
  const [sessionMode, setSessionMode] = useState<CoachSessionMode>('in_person')
  const [maxParticipants, setMaxParticipants] = useState('12')
  const [notes, setNotes] = useState('')

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [sessRes, progRes] = await Promise.all([
      listCoachSessions(profile.id),
      listCoachProgrammes(profile.id),
    ])
    if (!sessRes.ok) {
      setError(sessRes.error)
      setLoading(false)
      return
    }
    setSessions(sessRes.data)
    if (progRes.ok) setProgrammes(progRes.data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  const filteredSessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return sessions.filter(s => {
      if (filterMode === 'upcoming') {
        return (s.status === 'scheduled' || s.status === 'in_progress') && s.sessionDate >= today
      }
      if (filterMode === 'completed') {
        return s.status === 'completed'
      }
      return true
    })
  }, [sessions, filterMode])

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFeedback(null)
    setSaving(true)

    const parsedMax = maxParticipants.trim() ? Number.parseInt(maxParticipants.trim(), 10) : null
    const res = await createCoachSession({
      coachProfileId: profile.id,
      tenantId,
      programmeId: programmeId || null,
      title,
      sport,
      sessionDate,
      startTime,
      endTime,
      venueName,
      locationCity,
      sessionMode,
      maxParticipants: parsedMax && Number.isFinite(parsedMax) ? parsedMax : null,
      notes: notes || null,
    })

    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setFeedback(`Scheduled "${res.data.title}" on ${res.data.sessionDate} (${res.data.startTime}–${res.data.endTime}).`)
    setTitle('')
    setNotes('')
    setShowForm(false)
    await loadCalendar()
    onRefreshOverview()
  }

  const handleStatusUpdate = async (sessionId: string, nextStatus: CoachSessionStatus) => {
    setError(null)
    const res = await updateCoachSessionStatus(sessionId, nextStatus)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setFeedback(`Session updated to "${nextStatus}".`)
    await loadCalendar()
    onRefreshOverview()
  }

  return (
    <div className="kg-coach-stack" data-testid="coach-calendar-panel">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <div>
            <strong>Session scheduling notice</strong>
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
            <h2>Calendar &amp; Training Sessions</h2>
            <p>Schedule individual or batch sessions with PostgreSQL server-side overlap conflict protection.</p>
          </div>
          <button
            type="button"
            className="kg-coach-btn-primary"
            onClick={() => setShowForm(prev => !prev)}
          >
            <SiteIcon name={showForm ? 'close' : 'calendar'} size={15} />
            <span>{showForm ? 'Close Form' : 'Schedule Session'}</span>
          </button>
        </div>

        {showForm && (
          <form className="kg-coach-stack" onSubmit={handleCreateSession} aria-label="Schedule training session">
            <div className="kg-coach-form-grid">
              <label className="kg-coach-field">
                <span>Session Title *</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Morning Track Acceleration"
                />
              </label>

              <label className="kg-coach-field">
                <span>Sport *</span>
                <input type="text" required value={sport} onChange={e => setSport(e.target.value)} />
              </label>

              <label className="kg-coach-field">
                <span>Linked Training Programme</span>
                <select value={programmeId} onChange={e => setProgrammeId(e.target.value)}>
                  <option value="">Standalone Session</option>
                  {programmes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Date *</span>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Start Time *</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>End Time *</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Session Mode</span>
                <select value={sessionMode} onChange={e => setSessionMode(e.target.value as CoachSessionMode)}>
                  <option value="in_person">In-Person Ground</option>
                  <option value="online">Online Remote Review</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Venue / Ground Name</span>
                <input
                  type="text"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="e.g. Kanteerava Track Arena"
                />
              </label>

              <label className="kg-coach-field">
                <span>City</span>
                <input
                  type="text"
                  value={locationCity}
                  onChange={e => setLocationCity(e.target.value)}
                />
              </label>

              <label className="kg-coach-field">
                <span>Max Participants</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxParticipants}
                  onChange={e => setMaxParticipants(e.target.value)}
                />
              </label>
            </div>

            <label className="kg-coach-field">
              <span>Session Brief / Equipment Notes</span>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Cones, timing gates, hydration break plan..."
              />
            </label>

            <div className="kg-coach-btn-row">
              <button type="submit" className="kg-coach-btn-primary" disabled={saving}>
                <SiteIcon name="check" size={14} />
                <span>{saving ? 'Scheduling…' : 'Confirm Session Slot'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="kg-coach-btn-row">
          {(['upcoming', 'all', 'completed'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              className={filterMode === mode ? 'kg-coach-btn-primary' : 'kg-coach-btn-outline'}
              onClick={() => setFilterMode(mode)}
            >
              {mode === 'upcoming' ? 'Upcoming' : mode === 'completed' ? 'Completed' : 'All Sessions'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="kg-coach-muted-note">Loading coaching calendar…</p>
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon={<SiteIcon name="calendar" size={24} />}
            title="No training sessions in this view"
            description="Schedule your next training session. Overlapping slots on the same date are rejected automatically by PostgreSQL."
          />
        ) : (
          <ul className="kg-coach-list">
            {filteredSessions.map(sess => (
              <li
                key={sess.id}
                className="kg-coach-list-item"
                style={initialSessionId === sess.id ? { borderColor: 'var(--coach-emerald)' } : undefined}
              >
                <div>
                  <div className="kg-coach-btn-row" style={{ marginBottom: '0.2rem' }}>
                    <strong>{sess.title}</strong>
                    <span
                      className={`kg-coach-pill ${
                        sess.status === 'completed'
                          ? 'is-success'
                          : sess.status === 'cancelled'
                            ? 'is-error'
                            : 'is-info'
                      }`}
                    >
                      {sess.status}
                    </span>
                  </div>
                  <span>
                    {sess.sessionDate} · {sess.startTime}–{sess.endTime} · {sess.sport} ·{' '}
                    {sess.sessionMode.replace(/_/g, ' ')}
                    {sess.venueName ? ` · ${sess.venueName}` : ''}
                    {sess.locationCity ? `, ${sess.locationCity}` : ''}
                  </span>
                </div>

                <div className="kg-coach-btn-row">
                  <button
                    type="button"
                    className="kg-coach-btn-outline"
                    onClick={() => onSelectSection('attendance')}
                  >
                    Take Attendance
                  </button>
                  {sess.status === 'scheduled' && (
                    <>
                      <button
                        type="button"
                        className="kg-coach-btn-primary"
                        onClick={() => void handleStatusUpdate(sess.id, 'completed')}
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        className="kg-coach-btn-outline"
                        onClick={() => void handleStatusUpdate(sess.id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
