import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addCoachAthleteNote,
  assignProgrammeToAthlete,
  buildKheloIndiaAssessmentInput,
  createCoachSession,
  listCoachAssessments,
  listCoachAthletes,
  listCoachProgrammes,
  listCoachSessions,
  listSessionAttendance,
  recordCoachAssessment,
  saveCoachAthlete,
  saveCoachProgramme,
  saveSessionAttendance,
} from './coachOperationsClient'

const { mockGetSupabaseClient } = vi.hoisted(() => ({
  mockGetSupabaseClient: vi.fn(),
}))

vi.mock('../../integrations/supabase/realtime-client', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}))

describe('coachOperationsClient — Phase 3 DB Operations & Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSupabaseClient.mockReturnValue(null)
  })

  it('fails closed across all Phase 3 endpoints when Supabase is unconfigured', async () => {
    expect((await listCoachAthletes('cp-1')).ok).toBe(false)
    expect((await listCoachProgrammes('cp-1')).ok).toBe(false)
    expect((await listCoachSessions('cp-1')).ok).toBe(false)
    expect((await listSessionAttendance('sess-1')).ok).toBe(false)
    expect((await listCoachAssessments('cp-1')).ok).toBe(false)
  })

  it('enforces consent-first invitation status when athleteUserId is linked', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'ca-1',
        coach_profile_id: 'cp-1',
        tenant_id: null,
        athlete_user_id: 'usr-ath-1',
        tenant_student_id: null,
        full_name: 'Meera Joshi',
        guardian_name: null,
        guardian_phone: null,
        athlete_email: null,
        sport: 'Athletics',
        age_group: 'U-16',
        age_years: 15,
        gender: 'female',
        skill_level: 'Advanced',
        relationship_status: 'invited',
        consent_granted: false,
        accepted_at: null,
        released_at: null,
        goals_summary: '400m sprint base',
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
      error: null,
    })
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({ single: singleMock }),
    })
    mockGetSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    })

    const res = await saveCoachAthlete({
      coachProfileId: 'cp-1',
      athleteUserId: 'usr-ath-1',
      fullName: 'Meera Joshi',
      sport: 'Athletics',
      ageGroup: 'U-16',
      relationshipStatus: 'active',
      consentGranted: true,
    })

    expect(res.ok).toBe(true)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship_status: 'invited',
        consent_granted: false,
      }),
    )
    if (res.ok) {
      expect(res.data.relationshipStatus).toBe('invited')
      expect(res.data.consentGranted).toBe(false)
    }
  })

  it('validates session times and translates PostgreSQL 23P01 overlap trigger errors', async () => {
    const singleOverlap = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: '23P01',
        message: 'Session time conflict: another active session already overlaps 2026-11-28 (07:00 - 08:30).',
      },
    })
    mockGetSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: () => ({ select: () => ({ single: singleOverlap }) }),
      }),
    })

    const invalidRange = await createCoachSession({
      coachProfileId: 'cp-1',
      title: 'Evening Sprints',
      sport: 'Athletics',
      sessionDate: '2026-11-28',
      startTime: '18:00',
      endTime: '17:30',
      venueName: 'Track Arena',
      locationCity: 'Pune',
      sessionMode: 'in_person',
    })
    expect(invalidRange).toEqual({
      ok: false,
      error: 'Session end time must be later than start time.',
    })

    const overlapRes = await createCoachSession({
      coachProfileId: 'cp-1',
      title: 'Conflicting Morning Track',
      sport: 'Athletics',
      sessionDate: '2026-11-28',
      startTime: '07:30',
      endTime: '08:30',
      venueName: 'Track Arena',
      locationCity: 'Pune',
      sessionMode: 'in_person',
    })
    expect(overlapRes).toEqual({
      ok: false,
      error: 'Schedule conflict: another active session already overlaps this date and time window.',
    })
  })

  it('persists private notes, training programmes, assignments, attendance, and Khelo India battery results', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'coach_athlete_notes') {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'note-1',
                  coach_athlete_id: 'ca-1',
                  coach_profile_id: 'cp-1',
                  note_type: 'injury_precaution',
                  visibility: 'coach_private',
                  note_body: 'Monitor calf tightness.',
                  created_at: '2026-11-27T00:00:00Z',
                  updated_at: '2026-11-27T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'coach_training_programmes') {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'prog-1',
                  coach_profile_id: 'cp-1',
                  tenant_id: null,
                  title: 'Speed Endurance Block',
                  sport: 'Athletics',
                  target_age_group: 'U-16',
                  difficulty_level: 'Intermediate',
                  duration_weeks: 6,
                  sessions_per_week: 4,
                  status: 'active',
                  summary: 'Block sprints',
                  exercises: [{ name: 'A-Skips', sets: '3', reps: '30m', intensity: 'RPE 7' }],
                  created_at: '2026-11-27T00:00:00Z',
                  updated_at: '2026-11-27T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'coach_programme_assignments') {
        return {
          upsert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'assign-1',
                  programme_id: 'prog-1',
                  coach_athlete_id: 'ca-1',
                  coach_profile_id: 'cp-1',
                  status: 'assigned',
                  progress_pct: 0,
                  assigned_at: '2026-11-27T00:00:00Z',
                  completed_at: null,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'coach_session_attendance') {
        return {
          upsert: () => ({
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'att-1',
                  session_id: 'sess-1',
                  coach_athlete_id: 'ca-1',
                  coach_profile_id: 'cp-1',
                  status: 'present',
                  notes: null,
                  marked_at: '2026-11-27T07:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'coach_athlete_assessments') {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'ass-1',
                  coach_profile_id: payload.coach_profile_id,
                  coach_athlete_id: payload.coach_athlete_id,
                  athlete_name: payload.athlete_name,
                  category: payload.category,
                  age_band: payload.age_band,
                  assessment_date: payload.assessment_date,
                  overall_score: payload.overall_score,
                  grade_band: payload.grade_band,
                  sai_report_code: payload.sai_report_code,
                  metrics: payload.metrics,
                  coach_summary: payload.coach_summary,
                  created_at: '2026-11-27T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    mockGetSupabaseClient.mockReturnValue({ from: fromMock })

    const noteRes = await addCoachAthleteNote({
      coachAthleteId: 'ca-1',
      coachProfileId: 'cp-1',
      noteType: 'injury_precaution',
      visibility: 'coach_private',
      noteBody: 'Monitor calf tightness.',
    })
    expect(noteRes.ok).toBe(true)

    const progRes = await saveCoachProgramme({
      coachProfileId: 'cp-1',
      title: 'Speed Endurance Block',
      sport: 'Athletics',
      targetAgeGroup: 'U-16',
      difficultyLevel: 'Intermediate',
      durationWeeks: 6,
      sessionsPerWeek: 4,
      status: 'active',
      exercises: [{ name: 'A-Skips', sets: '3', reps: '30m', intensity: 'RPE 7' }],
    })
    expect(progRes.ok).toBe(true)

    const assignRes = await assignProgrammeToAthlete({
      programmeId: 'prog-1',
      coachAthleteId: 'ca-1',
      coachProfileId: 'cp-1',
    })
    expect(assignRes.ok).toBe(true)

    const emptyAtt = await saveSessionAttendance({ sessionId: 'sess-1', coachProfileId: 'cp-1', entries: [] })
    expect(emptyAtt.ok).toBe(false)

    const attRes = await saveSessionAttendance({
      sessionId: 'sess-1',
      coachProfileId: 'cp-1',
      entries: [{ coachAthleteId: 'ca-1', status: 'present' }],
    })
    expect(attRes.ok).toBe(true)

    const payload = buildKheloIndiaAssessmentInput({
      coachProfileId: 'cp-1',
      coachAthleteId: 'ca-1',
      athleteName: 'Rohan Verma',
      age: 13,
      ageCategory: 'junior_9_14',
      assessmentDate: '2026-11-27',
      juniorSenior: {
        heightCm: 162,
        weightKg: 50,
        gender: 'male',
        dash50mSeconds: 7.1,
        run600mSeconds: 124,
        sitAndReachCm: 28,
        partialCurlUpsReps: 28,
        pushUpsReps: 22,
      },
    })
    expect(payload.overallScore).toBeGreaterThanOrEqual(80)
    expect(payload.saiReportCode).toMatch(/^SAI-KI-\d{4}-\d{4}$/)

    const assessRes = await recordCoachAssessment(payload)
    expect(assessRes.ok).toBe(true)
    if (assessRes.ok) {
      expect(assessRes.data.category).toBe('khelo_india')
      expect(assessRes.data.overallScore).toBeGreaterThanOrEqual(80)
    }
  })
})
