import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  AttendanceRosterPanel,
  type AttendanceRosterMember,
  type AttendanceStatus,
} from '../../../shared/components/workflows/AttendanceRosterPanel'
import type { CoachProfileRecord } from '../coachWorkspaceClient'
import {
  buildKheloIndiaAssessmentInput,
  listCoachAssessments,
  listCoachAthletes,
  listCoachSessions,
  listSessionAttendance,
  recordCoachAssessment,
  saveSessionAttendance,
  type CoachAssessmentCategory,
  type CoachAthleteAssessmentRecord,
  type CoachAthleteRecord,
  type CoachAttendanceStatus,
  type CoachTrainingSessionRecord,
} from '../coachOperationsClient'
import type { Gender, KheloIndiaAgeCategory } from '../kheloIndiaBattery'

export interface CoachAttendancePanelProps {
  profile: CoachProfileRecord
  onRefreshOverview: () => void
}

export function CoachAttendancePanel({ profile, onRefreshOverview }: CoachAttendancePanelProps) {
  const [sessions, setSessions] = useState<CoachTrainingSessionRecord[]>([])
  const [athletes, setAthletes] = useState<CoachAthleteRecord[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [statusMap, setStatusMap] = useState<Record<string, CoachAttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | undefined>(undefined)

  const loadBase = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [sessRes, athRes] = await Promise.all([
      listCoachSessions(profile.id),
      listCoachAthletes(profile.id),
    ])

    if (!sessRes.ok) {
      setError(sessRes.error)
      setLoading(false)
      return
    }
    const validSessions = sessRes.data.filter(s => s.status !== 'cancelled')
    setSessions(validSessions)
    if (athRes.ok) {
      setAthletes(athRes.data.filter(a => a.relationshipStatus === 'active'))
    }
    if (validSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(validSessions[0].id)
    }
    setLoading(false)
  }, [profile.id, selectedSessionId])

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    if (!selectedSessionId) return
    let active = true
    ;(async () => {
      const res = await listSessionAttendance(selectedSessionId)
      if (!active) return
      const next: Record<string, CoachAttendanceStatus> = {}
      athletes.forEach(a => {
        next[a.id] = 'present'
      })
      if (res.ok) {
        res.data.forEach(row => {
          next[row.coachAthleteId] = row.status
        })
      }
      setStatusMap(next)
      setSavedLabel(undefined)
    })()
    return () => {
      active = false
    }
  }, [selectedSessionId, athletes])

  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  )

  const rosterMembers: AttendanceRosterMember[] = useMemo(
    () =>
      athletes.map(a => ({
        id: a.id,
        name: a.fullName,
        batchName: `${a.sport} · ${a.ageGroup}`,
        phone: a.guardianPhone || undefined,
        status: (statusMap[a.id] || 'present') as AttendanceStatus,
      })),
    [athletes, statusMap],
  )

  const handleToggleStatus = (memberId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [memberId]: status }))
    setSavedLabel(undefined)
  }

  const handleSave = async () => {
    if (!selectedSessionId || athletes.length === 0) return
    setSaving(true)
    setError(null)
    const entries = athletes.map(a => ({
      coachAthleteId: a.id,
      status: statusMap[a.id] || 'present',
    }))
    const res = await saveSessionAttendance({
      sessionId: selectedSessionId,
      coachProfileId: profile.id,
      entries,
    })
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSavedLabel('Saved to PostgreSQL')
    onRefreshOverview()
  }

  return (
    <div className="kg-coach-stack" data-testid="coach-attendance-panel">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <section className="kg-coach-card kg-coach-stack">
        <div className="kg-coach-card-head">
          <div>
            <h2>Session Roll-Call &amp; Attendance History</h2>
            <p>Select a training session and record attendance (Present, Late, Absent, Excused) directly to Supabase.</p>
          </div>
        </div>

        {loading ? (
          <p className="kg-coach-muted-note">Loading sessions and active athletes…</p>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<SiteIcon name="check-circle" size={24} />}
            title="No active training sessions available"
            description="Schedule a training session in Calendar & Sessions before recording roll-call attendance."
          />
        ) : athletes.length === 0 ? (
          <EmptyState
            icon={<SiteIcon name="users" size={24} />}
            title="No active athletes on your roster"
            description="Add an active athlete or wait for an invited athlete to grant consent before marking roll-call."
          />
        ) : (
          <>
            <label className="kg-coach-field" style={{ maxWidth: '460px' }}>
              <span>Training Session *</span>
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sessionDate} · {s.startTime}–{s.endTime} · {s.title}
                  </option>
                ))}
              </select>
            </label>

            <AttendanceRosterPanel
              title={selectedSession ? selectedSession.title : 'Session Roll-Call'}
              dateLabel={selectedSession ? `${selectedSession.sessionDate} (${selectedSession.startTime}–${selectedSession.endTime})` : ''}
              members={rosterMembers}
              allowedStatuses={['present', 'late', 'absent', 'excused']}
              onToggleStatus={handleToggleStatus}
              onSave={() => void handleSave()}
              saving={saving}
              savedLabel={savedLabel}
            />
          </>
        )}
      </section>
    </div>
  )
}

export interface CoachAssessmentsPanelProps {
  profile: CoachProfileRecord
  onRefreshOverview: () => void
}

export function CoachAssessmentsPanel({ profile, onRefreshOverview }: CoachAssessmentsPanelProps) {
  const [athletes, setAthletes] = useState<CoachAthleteRecord[]>([])
  const [assessments, setAssessments] = useState<CoachAthleteAssessmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mode, setMode] = useState<'khelo_india' | 'custom'>('khelo_india')

  // Shared athlete selection
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [coachSummary, setCoachSummary] = useState('')

  // Khelo India protocol inputs
  const [ageCategory, setAgeCategory] = useState<KheloIndiaAgeCategory>('junior_9_14')
  const [heightCm, setHeightCm] = useState('162')
  const [weightKg, setWeightKg] = useState('52')
  const [flamingoFalls, setFlamingoFalls] = useState('2')
  const [plateTappingSec, setPlateTappingSec] = useState('11.5')
  const [dash50m, setDash50m] = useState('7.6')
  const [run600m, setRun600m] = useState('135')
  const [sitAndReach, setSitAndReach] = useState('22')
  const [partialCurlUps, setPartialCurlUps] = useState('24')
  const [pushUps, setPushUps] = useState('18')

  // Custom single-category inputs
  const [customCategory, setCustomCategory] = useState<CoachAssessmentCategory>('speed')
  const [customScore, setCustomScore] = useState('82')
  const [customGrade, setCustomGrade] = useState('Grade A · State Competitive')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [athRes, assRes] = await Promise.all([
      listCoachAthletes(profile.id),
      listCoachAssessments(profile.id),
    ])
    if (!assRes.ok) {
      setError(assRes.error)
      setLoading(false)
      return
    }
    setAssessments(assRes.data)
    if (athRes.ok) {
      const eligible = athRes.data.filter(a => a.relationshipStatus !== 'released')
      setAthletes(eligible)
      if (eligible.length > 0 && !selectedAthleteId) {
        setSelectedAthleteId(eligible[0].id)
      }
    }
    setLoading(false)
  }, [profile.id, selectedAthleteId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedAthlete = useMemo(
    () => athletes.find(a => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId],
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAthlete) {
      setError('Select an athlete from your roster before logging an assessment.')
      return
    }

    setError(null)
    setFeedback(null)
    setSaving(true)

    let res
    if (mode === 'khelo_india') {
      const gender: Gender = selectedAthlete.gender === 'female' ? 'female' : 'male'
      const age = selectedAthlete.ageYears || (ageCategory === 'sub_junior_5_8' ? 7 : ageCategory === 'junior_9_14' ? 12 : 16)
      const payload = buildKheloIndiaAssessmentInput({
        coachProfileId: profile.id,
        coachAthleteId: selectedAthlete.id,
        athleteName: selectedAthlete.fullName,
        age,
        ageCategory,
        assessmentDate,
        coachSummary,
        subJunior:
          ageCategory === 'sub_junior_5_8'
            ? {
                heightCm: Number(heightCm) || 125,
                weightKg: Number(weightKg) || 26,
                flamingoFallsCount: Number(flamingoFalls) || 2,
                plateTappingSeconds: Number(plateTappingSec) || 12,
              }
            : undefined,
        juniorSenior:
          ageCategory !== 'sub_junior_5_8'
            ? {
                heightCm: Number(heightCm) || 162,
                weightKg: Number(weightKg) || 52,
                gender,
                dash50mSeconds: Number(dash50m) || 7.6,
                run600mSeconds: Number(run600m) || 135,
                sitAndReachCm: Number(sitAndReach) || 22,
                partialCurlUpsReps: Number(partialCurlUps) || 24,
                pushUpsReps: Number(pushUps) || 18,
              }
            : undefined,
      })
      res = await recordCoachAssessment(payload)
    } else {
      res = await recordCoachAssessment({
        coachProfileId: profile.id,
        coachAthleteId: selectedAthlete.id,
        athleteName: selectedAthlete.fullName,
        category: customCategory,
        ageBand: 'open',
        assessmentDate,
        overallScore: Number(customScore) || 0,
        gradeBand: customGrade,
        metrics: { recordedCategory: customCategory },
        coachSummary,
      })
    }

    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    setFeedback(`Saved assessment (${res.data.gradeBand} · ${res.data.overallScore}/100) for ${res.data.athleteName}.`)
    setCoachSummary('')
    await loadData()
    onRefreshOverview()
  }

  const columns: DataTableColumn<CoachAthleteAssessmentRecord>[] = [
    { key: 'assessmentDate', header: 'Date' },
    {
      key: 'athleteName',
      header: 'Athlete',
      render: row => (
        <div>
          <strong>{row.athleteName}</strong>
          {row.saiReportCode && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{row.saiReportCode}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Protocol',
      render: row => row.category.replace(/_/g, ' ').toUpperCase(),
    },
    {
      key: 'overallScore',
      header: 'Score',
      render: row => <strong>{row.overallScore} / 100</strong>,
    },
    {
      key: 'gradeBand',
      header: 'Grade / Band',
      render: row => (
        <span className={`kg-coach-pill ${row.overallScore >= 80 ? 'is-success' : 'is-info'}`}>
          {row.gradeBand}
        </span>
      ),
    },
  ]

  return (
    <div className="kg-coach-stack" data-testid="coach-assessments-panel">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
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
            <h2>Fitness, Technical &amp; Khelo India Assessments</h2>
            <p>Evaluate athletes against SAI Khelo India national batteries or domain metrics, persisted in PostgreSQL.</p>
          </div>
          <div className="kg-coach-btn-row">
            <button
              type="button"
              className={mode === 'khelo_india' ? 'kg-coach-btn-primary' : 'kg-coach-btn-outline'}
              onClick={() => setMode('khelo_india')}
            >
              Khelo India / SAI Battery
            </button>
            <button
              type="button"
              className={mode === 'custom' ? 'kg-coach-btn-primary' : 'kg-coach-btn-outline'}
              onClick={() => setMode('custom')}
            >
              Skill / Physical Test
            </button>
          </div>
        </div>

        {athletes.length === 0 && !loading ? (
          <EmptyState
            icon={<SiteIcon name="award" size={24} />}
            title="Add an athlete to start recording assessments"
            description="All evaluation records are linked by coach_athlete_id and protected via PostgreSQL RLS."
          />
        ) : (
          <form className="kg-coach-stack" onSubmit={handleSubmit}>
            <div className="kg-coach-form-grid">
              <label className="kg-coach-field">
                <span>Athlete *</span>
                <select
                  value={selectedAthleteId}
                  onChange={e => setSelectedAthleteId(e.target.value)}
                >
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} ({a.ageGroup} · {a.sport})
                    </option>
                  ))}
                </select>
              </label>

              <label className="kg-coach-field">
                <span>Assessment Date *</span>
                <input
                  type="date"
                  required
                  value={assessmentDate}
                  onChange={e => setAssessmentDate(e.target.value)}
                />
              </label>

              {mode === 'khelo_india' ? (
                <>
                  <label className="kg-coach-field">
                    <span>Khelo India Battery Age Tier</span>
                    <select
                      value={ageCategory}
                      onChange={e => setAgeCategory(e.target.value as KheloIndiaAgeCategory)}
                    >
                      <option value="sub_junior_5_8">Sub-Junior (Ages 5–8)</option>
                      <option value="junior_9_14">Junior (Ages 9–14)</option>
                      <option value="senior_15_18">Senior (Ages 15–18+)</option>
                    </select>
                  </label>

                  <label className="kg-coach-field">
                    <span>Height (cm)</span>
                    <input type="number" step="0.1" value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                  </label>

                  <label className="kg-coach-field">
                    <span>Weight (kg)</span>
                    <input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                  </label>

                  {ageCategory === 'sub_junior_5_8' ? (
                    <>
                      <label className="kg-coach-field">
                        <span>Flamingo Balance Falls (60s)</span>
                        <input type="number" value={flamingoFalls} onChange={e => setFlamingoFalls(e.target.value)} />
                      </label>
                      <label className="kg-coach-field">
                        <span>Plate Tapping (sec / 25 cycles)</span>
                        <input type="number" step="0.1" value={plateTappingSec} onChange={e => setPlateTappingSec(e.target.value)} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="kg-coach-field">
                        <span>50m Standing Dash (sec)</span>
                        <input type="number" step="0.1" value={dash50m} onChange={e => setDash50m(e.target.value)} />
                      </label>
                      <label className="kg-coach-field">
                        <span>600m Run / Walk (sec)</span>
                        <input type="number" value={run600m} onChange={e => setRun600m(e.target.value)} />
                      </label>
                      <label className="kg-coach-field">
                        <span>Sit &amp; Reach (cm)</span>
                        <input type="number" step="0.5" value={sitAndReach} onChange={e => setSitAndReach(e.target.value)} />
                      </label>
                      <label className="kg-coach-field">
                        <span>Partial Curl-Ups (reps / 30s)</span>
                        <input type="number" value={partialCurlUps} onChange={e => setPartialCurlUps(e.target.value)} />
                      </label>
                      <label className="kg-coach-field">
                        <span>Push-Ups (reps)</span>
                        <input type="number" value={pushUps} onChange={e => setPushUps(e.target.value)} />
                      </label>
                    </>
                  )}
                </>
              ) : (
                <>
                  <label className="kg-coach-field">
                    <span>Assessment Category</span>
                    <select
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value as CoachAssessmentCategory)}
                    >
                      <option value="speed">Speed &amp; Acceleration</option>
                      <option value="endurance">Aerobic Endurance</option>
                      <option value="strength">Strength &amp; Power</option>
                      <option value="agility">Agility &amp; Change of Direction</option>
                      <option value="flexibility">Mobility &amp; Flexibility</option>
                      <option value="technical">Technical Mastery</option>
                      <option value="tactical">Tactical Awareness</option>
                    </select>
                  </label>
                  <label className="kg-coach-field">
                    <span>Score (0 – 100)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customScore}
                      onChange={e => setCustomScore(e.target.value)}
                    />
                  </label>
                  <label className="kg-coach-field">
                    <span>Performance Band Label</span>
                    <input
                      type="text"
                      value={customGrade}
                      onChange={e => setCustomGrade(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            <label className="kg-coach-field">
              <span>Coach Interpretation &amp; Action Plan</span>
              <textarea
                rows={2}
                value={coachSummary}
                onChange={e => setCoachSummary(e.target.value)}
                placeholder="Key strengths, biomechanics notes, or conditioning focus areas..."
              />
            </label>

            <div className="kg-coach-btn-row">
              <button type="submit" className="kg-coach-btn-primary" disabled={saving || !selectedAthlete}>
                <SiteIcon name="check" size={14} />
                <span>{saving ? 'Recording Evaluation…' : 'Calculate & Save Assessment'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="kg-coach-card kg-coach-stack">
        <div className="kg-coach-card-head">
          <div>
            <h3>Recorded Athlete Assessments</h3>
            <p>Official historical evaluation log scoped strictly to your authorized athletes.</p>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={assessments}
          rowKey={row => row.id}
          loading={loading}
          caption="Coach Athlete Evaluation History"
          empty={
            <EmptyState
              icon={<SiteIcon name="chart" size={24} />}
              title="No assessments recorded yet"
              description="Evaluate your first athlete using Khelo India standards or domain scoring above."
            />
          }
        />
      </section>
    </div>
  )
}
