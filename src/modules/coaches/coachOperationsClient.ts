import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import type { ServiceResult } from './coachWorkspaceClient'
import {
  evaluateJuniorSeniorBattery,
  evaluateSubJuniorBattery,
  type KheloIndiaAgeCategory,
  type KheloIndiaJuniorSeniorInput,
  type KheloIndiaSubJuniorInput,
} from './kheloIndiaBattery'

export type CoachAthleteStatus = 'invited' | 'active' | 'paused' | 'released'
export type CoachAthleteGender = 'male' | 'female' | 'other'
export type CoachAthleteSkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite' | 'National'
export type CoachNoteType = 'development' | 'tactical' | 'fitness' | 'injury_precaution' | 'parent_update'
export type CoachNoteVisibility = 'coach_private' | 'shared_with_athlete'
export type CoachProgrammeDifficulty = 'Foundation' | 'Beginner' | 'Intermediate' | 'Advanced' | 'High Performance'
export type CoachProgrammeStatus = 'draft' | 'active' | 'completed' | 'archived'
export type CoachSessionMode = 'in_person' | 'online' | 'hybrid'
export type CoachSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type CoachAttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type CoachAssessmentCategory =
  | 'khelo_india'
  | 'speed'
  | 'endurance'
  | 'strength'
  | 'agility'
  | 'flexibility'
  | 'technical'
  | 'tactical'

export interface CoachAthleteRecord {
  id: string
  coachProfileId: string
  tenantId: string | null
  athleteUserId: string | null
  tenantStudentId: string | null
  fullName: string
  guardianName: string | null
  guardianPhone: string | null
  athleteEmail: string | null
  sport: string
  ageGroup: string
  ageYears: number | null
  gender: CoachAthleteGender
  skillLevel: CoachAthleteSkillLevel
  relationshipStatus: CoachAthleteStatus
  consentGranted: boolean
  acceptedAt: string | null
  releasedAt: string | null
  goalsSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface SaveCoachAthleteInput {
  id?: string
  coachProfileId: string
  tenantId?: string | null
  athleteUserId?: string | null
  tenantStudentId?: string | null
  fullName: string
  guardianName?: string | null
  guardianPhone?: string | null
  athleteEmail?: string | null
  sport: string
  ageGroup: string
  ageYears?: number | null
  gender?: CoachAthleteGender
  skillLevel?: CoachAthleteSkillLevel
  relationshipStatus?: CoachAthleteStatus
  consentGranted?: boolean
  goalsSummary?: string | null
}

export interface CoachAthleteNoteRecord {
  id: string
  coachAthleteId: string
  coachProfileId: string
  noteType: CoachNoteType
  visibility: CoachNoteVisibility
  noteBody: string
  createdAt: string
  updatedAt: string
}

export interface CoachProgrammeExercise {
  name: string
  sets: string
  reps: string
  intensity?: string
}

export interface CoachTrainingProgrammeRecord {
  id: string
  coachProfileId: string
  tenantId: string | null
  title: string
  sport: string
  targetAgeGroup: string
  difficultyLevel: CoachProgrammeDifficulty
  durationWeeks: number
  sessionsPerWeek: number
  status: CoachProgrammeStatus
  summary: string | null
  exercises: CoachProgrammeExercise[]
  createdAt: string
  updatedAt: string
}

export interface SaveCoachProgrammeInput {
  id?: string
  coachProfileId: string
  tenantId?: string | null
  title: string
  sport: string
  targetAgeGroup: string
  difficultyLevel: CoachProgrammeDifficulty
  durationWeeks: number
  sessionsPerWeek: number
  status: CoachProgrammeStatus
  summary?: string | null
  exercises: CoachProgrammeExercise[]
}

export interface CoachProgrammeAssignmentRecord {
  id: string
  programmeId: string
  coachAthleteId: string
  coachProfileId: string
  status: 'assigned' | 'in_progress' | 'completed' | 'paused'
  progressPct: number
  assignedAt: string
  completedAt: string | null
}

export interface CoachTrainingSessionRecord {
  id: string
  coachProfileId: string
  tenantId: string | null
  programmeId: string | null
  title: string
  sport: string
  sessionDate: string
  startTime: string
  endTime: string
  venueName: string
  locationCity: string
  sessionMode: CoachSessionMode
  status: CoachSessionStatus
  maxParticipants: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SaveCoachSessionInput {
  coachProfileId: string
  tenantId?: string | null
  programmeId?: string | null
  title: string
  sport: string
  sessionDate: string
  startTime: string
  endTime: string
  venueName: string
  locationCity: string
  sessionMode: CoachSessionMode
  status?: CoachSessionStatus
  maxParticipants?: number | null
  notes?: string | null
}

export interface CoachSessionAttendanceRecord {
  id: string
  sessionId: string
  coachAthleteId: string
  coachProfileId: string
  status: CoachAttendanceStatus
  notes: string | null
  markedAt: string
}

export interface CoachAthleteAssessmentRecord {
  id: string
  coachProfileId: string
  coachAthleteId: string
  athleteName: string
  category: CoachAssessmentCategory
  ageBand: 'sub_junior_5_8' | 'junior_9_14' | 'senior_15_18' | 'open' | null
  assessmentDate: string
  overallScore: number
  gradeBand: string
  saiReportCode: string | null
  metrics: Record<string, unknown>
  coachSummary: string | null
  createdAt: string
}

export interface CoachDirectoryInquiryRecord {
  id: string
  inquiryToken: string
  coachId: string | null
  coachSlug: string
  athleteName: string
  parentName: string | null
  phone: string
  email: string | null
  sport: string
  trainingType: string
  ageCategory: string
  skillLevel: string
  objective: string | null
  status: 'submitted' | 'contacted' | 'scheduled' | 'completed' | 'declined'
  createdAt: string
}

function unconfiguredResult<T>(): ServiceResult<T> {
  return {
    ok: false,
    error: 'Database connection is not configured for this environment.',
  }
}

function friendlyDbError(error: { code?: string; message?: string }, fallback: string): string {
  const msg = error.message || ''
  if (error.code === '23P01' || msg.includes('Session time conflict')) {
    return 'Schedule conflict: another active session already overlaps this date and time window.'
  }
  if (error.code === '42501') {
    return msg || 'Access denied by database row-level security policy.'
  }
  return msg || fallback
}

function normalizeExercises(value: unknown): CoachProgrammeExercise[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map(entry => ({
      name: typeof entry.name === 'string' ? entry.name.trim() : '',
      sets: typeof entry.sets === 'string' ? entry.sets.trim() : String(entry.sets ?? ''),
      reps: typeof entry.reps === 'string' ? entry.reps.trim() : String(entry.reps ?? ''),
      intensity: typeof entry.intensity === 'string' ? entry.intensity.trim() : '',
    }))
    .filter(item => item.name.length > 0)
}

export function mapCoachAthleteRow(row: Record<string, unknown>): CoachAthleteRecord {
  return {
    id: String(row.id),
    coachProfileId: String(row.coach_profile_id),
    tenantId: typeof row.tenant_id === 'string' ? row.tenant_id : null,
    athleteUserId: typeof row.athlete_user_id === 'string' ? row.athlete_user_id : null,
    tenantStudentId: typeof row.tenant_student_id === 'string' ? row.tenant_student_id : null,
    fullName: typeof row.full_name === 'string' ? row.full_name : '',
    guardianName: typeof row.guardian_name === 'string' ? row.guardian_name : null,
    guardianPhone: typeof row.guardian_phone === 'string' ? row.guardian_phone : null,
    athleteEmail: typeof row.athlete_email === 'string' ? row.athlete_email : null,
    sport: typeof row.sport === 'string' ? row.sport : 'Multi-Sport',
    ageGroup: typeof row.age_group === 'string' ? row.age_group : 'Open',
    ageYears: typeof row.age_years === 'number' ? row.age_years : null,
    gender: (typeof row.gender === 'string' ? row.gender : 'male') as CoachAthleteGender,
    skillLevel: (typeof row.skill_level === 'string' ? row.skill_level : 'Intermediate') as CoachAthleteSkillLevel,
    relationshipStatus: (typeof row.relationship_status === 'string'
      ? row.relationship_status
      : 'invited') as CoachAthleteStatus,
    consentGranted: Boolean(row.consent_granted),
    acceptedAt: typeof row.accepted_at === 'string' ? row.accepted_at : null,
    releasedAt: typeof row.released_at === 'string' ? row.released_at : null,
    goalsSummary: typeof row.goals_summary === 'string' ? row.goals_summary : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export function mapCoachProgrammeRow(row: Record<string, unknown>): CoachTrainingProgrammeRecord {
  return {
    id: String(row.id),
    coachProfileId: String(row.coach_profile_id),
    tenantId: typeof row.tenant_id === 'string' ? row.tenant_id : null,
    title: typeof row.title === 'string' ? row.title : '',
    sport: typeof row.sport === 'string' ? row.sport : '',
    targetAgeGroup: typeof row.target_age_group === 'string' ? row.target_age_group : 'Open',
    difficultyLevel: (typeof row.difficulty_level === 'string'
      ? row.difficulty_level
      : 'Intermediate') as CoachProgrammeDifficulty,
    durationWeeks: typeof row.duration_weeks === 'number' ? row.duration_weeks : 4,
    sessionsPerWeek: typeof row.sessions_per_week === 'number' ? row.sessions_per_week : 3,
    status: (typeof row.status === 'string' ? row.status : 'active') as CoachProgrammeStatus,
    summary: typeof row.summary === 'string' ? row.summary : null,
    exercises: normalizeExercises(row.exercises),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export function mapCoachSessionRow(row: Record<string, unknown>): CoachTrainingSessionRecord {
  return {
    id: String(row.id),
    coachProfileId: String(row.coach_profile_id),
    tenantId: typeof row.tenant_id === 'string' ? row.tenant_id : null,
    programmeId: typeof row.programme_id === 'string' ? row.programme_id : null,
    title: typeof row.title === 'string' ? row.title : '',
    sport: typeof row.sport === 'string' ? row.sport : '',
    sessionDate: String(row.session_date ?? ''),
    startTime: String(row.start_time ?? '').slice(0, 5),
    endTime: String(row.end_time ?? '').slice(0, 5),
    venueName: typeof row.venue_name === 'string' ? row.venue_name : '',
    locationCity: typeof row.location_city === 'string' ? row.location_city : '',
    sessionMode: (typeof row.session_mode === 'string' ? row.session_mode : 'in_person') as CoachSessionMode,
    status: (typeof row.status === 'string' ? row.status : 'scheduled') as CoachSessionStatus,
    maxParticipants: typeof row.max_participants === 'number' ? row.max_participants : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export function mapCoachAssessmentRow(row: Record<string, unknown>): CoachAthleteAssessmentRecord {
  return {
    id: String(row.id),
    coachProfileId: String(row.coach_profile_id),
    coachAthleteId: String(row.coach_athlete_id),
    athleteName: typeof row.athlete_name === 'string' ? row.athlete_name : '',
    category: (typeof row.category === 'string' ? row.category : 'technical') as CoachAssessmentCategory,
    ageBand: (typeof row.age_band === 'string' ? row.age_band : null) as CoachAthleteAssessmentRecord['ageBand'],
    assessmentDate: String(row.assessment_date ?? ''),
    overallScore: typeof row.overall_score === 'number' ? row.overall_score : Number(row.overall_score ?? 0),
    gradeBand: typeof row.grade_band === 'string' ? row.grade_band : '',
    saiReportCode: typeof row.sai_report_code === 'string' ? row.sai_report_code : null,
    metrics:
      row.metrics && typeof row.metrics === 'object' && !Array.isArray(row.metrics)
        ? (row.metrics as Record<string, unknown>)
        : {},
    coachSummary: typeof row.coach_summary === 'string' ? row.coach_summary : null,
    createdAt: String(row.created_at ?? ''),
  }
}

// ---------------------------------------------------------------------------
// 1. COACH–ATHLETE ROSTER & DEVELOPMENT NOTES
// ---------------------------------------------------------------------------

export async function listCoachAthletes(coachProfileId: string): Promise<ServiceResult<CoachAthleteRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_athletes')
    .select('*')
    .eq('coach_profile_id', coachProfileId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load coach athlete roster.') }
  }
  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(mapCoachAthleteRow),
  }
}

export async function saveCoachAthlete(input: SaveCoachAthleteInput): Promise<ServiceResult<CoachAthleteRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const trimmedName = input.fullName.trim()
  if (trimmedName.length < 2) {
    return { ok: false, error: 'Athlete name must be at least 2 characters.' }
  }
  if (!input.sport.trim()) {
    return { ok: false, error: 'Sport specialization is required for each athlete.' }
  }
  const cleanPhone = input.guardianPhone?.trim() || null
  if (cleanPhone && cleanPhone.length < 7) {
    return { ok: false, error: 'Guardian phone must contain at least 7 digits.' }
  }

  const hasLinkedUser = Boolean(input.athleteUserId?.trim())
  const payload = {
    coach_profile_id: input.coachProfileId,
    tenant_id: input.tenantId ?? null,
    athlete_user_id: input.athleteUserId?.trim() || null,
    tenant_student_id: input.tenantStudentId?.trim() || null,
    full_name: trimmedName,
    guardian_name: input.guardianName?.trim() || null,
    guardian_phone: cleanPhone,
    athlete_email: input.athleteEmail?.trim() || null,
    sport: input.sport.trim(),
    age_group: input.ageGroup.trim() || 'Open',
    age_years: input.ageYears ?? null,
    gender: input.gender || 'male',
    skill_level: input.skillLevel || 'Intermediate',
    // Linked KhelGrid athlete accounts always begin in consent-pending 'invited' state
    relationship_status: hasLinkedUser ? 'invited' : (input.relationshipStatus || 'active'),
    consent_granted: hasLinkedUser ? false : (input.consentGranted ?? true),
    goals_summary: input.goalsSummary?.trim() || null,
  }

  const query = input.id
    ? client.from('coach_athletes').update(payload).eq('id', input.id).select('*').single()
    : client.from('coach_athletes').insert(payload).select('*').single()

  const { data, error } = await query
  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not save athlete record.') }
  }
  return { ok: true, data: mapCoachAthleteRow(data as Record<string, unknown>) }
}

export async function updateCoachAthleteRelationship(
  athleteId: string,
  status: CoachAthleteStatus,
): Promise<ServiceResult<CoachAthleteRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_athletes')
    .update({ relationship_status: status })
    .eq('id', athleteId)
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not update athlete relationship status.') }
  }
  return { ok: true, data: mapCoachAthleteRow(data as Record<string, unknown>) }
}

export async function listCoachAthleteNotes(coachAthleteId: string): Promise<ServiceResult<CoachAthleteNoteRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_athlete_notes')
    .select('*')
    .eq('coach_athlete_id', coachAthleteId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load athlete development notes.') }
  }
  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      noteType: (typeof row.note_type === 'string' ? row.note_type : 'development') as CoachNoteType,
      visibility: (typeof row.visibility === 'string' ? row.visibility : 'coach_private') as CoachNoteVisibility,
      noteBody: typeof row.note_body === 'string' ? row.note_body : '',
      createdAt: String(row.created_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
    })),
  }
}

export async function addCoachAthleteNote(input: {
  coachAthleteId: string
  coachProfileId: string
  noteType: CoachNoteType
  visibility: CoachNoteVisibility
  noteBody: string
}): Promise<ServiceResult<CoachAthleteNoteRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const trimmed = input.noteBody.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: 'Note text must be at least 2 characters.' }
  }

  const { data, error } = await client
    .from('coach_athlete_notes')
    .insert({
      coach_athlete_id: input.coachAthleteId,
      coach_profile_id: input.coachProfileId,
      note_type: input.noteType,
      visibility: input.visibility,
      note_body: trimmed,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not save athlete note.') }
  }
  const row = data as Record<string, unknown>
  return {
    ok: true,
    data: {
      id: String(row.id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      noteType: String(row.note_type) as CoachNoteType,
      visibility: String(row.visibility) as CoachNoteVisibility,
      noteBody: String(row.note_body),
      createdAt: String(row.created_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
    },
  }
}

export async function listCoachDirectoryInquiries(coachId: string): Promise<ServiceResult<CoachDirectoryInquiryRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_inquiries')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load public directory inquiries.') }
  }

  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      inquiryToken: String(row.inquiry_token ?? ''),
      coachId: typeof row.coach_id === 'string' ? row.coach_id : null,
      coachSlug: String(row.coach_slug ?? ''),
      athleteName: String(row.athlete_name ?? ''),
      parentName: typeof row.parent_name === 'string' ? row.parent_name : null,
      phone: String(row.phone ?? ''),
      email: typeof row.email === 'string' ? row.email : null,
      sport: String(row.sport ?? ''),
      trainingType: String(row.training_type ?? 'one_on_one'),
      ageCategory: String(row.age_category ?? ''),
      skillLevel: String(row.skill_level ?? ''),
      objective: typeof row.objective === 'string' ? row.objective : null,
      status: (typeof row.status === 'string' ? row.status : 'submitted') as CoachDirectoryInquiryRecord['status'],
      createdAt: String(row.created_at ?? ''),
    })),
  }
}

export async function updateCoachInquiryStatus(
  inquiryId: string,
  status: CoachDirectoryInquiryRecord['status'],
): Promise<ServiceResult<void>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { error } = await client
    .from('coach_inquiries')
    .update({ status })
    .eq('id', inquiryId)

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Could not update inquiry status.') }
  }
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 2. TRAINING PROGRAMMES & ASSIGNMENTS
// ---------------------------------------------------------------------------

export async function listCoachProgrammes(
  coachProfileId: string,
): Promise<ServiceResult<CoachTrainingProgrammeRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_training_programmes')
    .select('*')
    .eq('coach_profile_id', coachProfileId)
    .order('updated_at', { ascending: false })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load training programmes.') }
  }
  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(mapCoachProgrammeRow),
  }
}

export async function saveCoachProgramme(
  input: SaveCoachProgrammeInput,
): Promise<ServiceResult<CoachTrainingProgrammeRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  if (input.title.trim().length < 2) {
    return { ok: false, error: 'Programme title must be at least 2 characters.' }
  }
  if (!input.sport.trim()) {
    return { ok: false, error: 'Programme sport is required.' }
  }

  const exercises = input.exercises
    .map(ex => ({
      name: ex.name.trim(),
      sets: ex.sets.trim(),
      reps: ex.reps.trim(),
      intensity: (ex.intensity || '').trim(),
    }))
    .filter(ex => ex.name.length > 0)

  const payload = {
    coach_profile_id: input.coachProfileId,
    tenant_id: input.tenantId ?? null,
    title: input.title.trim(),
    sport: input.sport.trim(),
    target_age_group: input.targetAgeGroup.trim() || 'Open',
    difficulty_level: input.difficultyLevel,
    duration_weeks: Math.max(1, Math.min(52, Math.round(input.durationWeeks || 4))),
    sessions_per_week: Math.max(1, Math.min(14, Math.round(input.sessionsPerWeek || 3))),
    status: input.status,
    summary: input.summary?.trim() || null,
    exercises,
  }

  const query = input.id
    ? client.from('coach_training_programmes').update(payload).eq('id', input.id).select('*').single()
    : client.from('coach_training_programmes').insert(payload).select('*').single()

  const { data, error } = await query
  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not save training programme.') }
  }
  return { ok: true, data: mapCoachProgrammeRow(data as Record<string, unknown>) }
}

export async function listProgrammeAssignments(
  coachProfileId: string,
): Promise<ServiceResult<CoachProgrammeAssignmentRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_programme_assignments')
    .select('*')
    .eq('coach_profile_id', coachProfileId)
    .order('assigned_at', { ascending: false })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load programme assignments.') }
  }

  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      programmeId: String(row.programme_id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      status: String(row.status) as CoachProgrammeAssignmentRecord['status'],
      progressPct: typeof row.progress_pct === 'number' ? row.progress_pct : 0,
      assignedAt: String(row.assigned_at ?? ''),
      completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    })),
  }
}

export async function assignProgrammeToAthlete(input: {
  programmeId: string
  coachAthleteId: string
  coachProfileId: string
}): Promise<ServiceResult<CoachProgrammeAssignmentRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_programme_assignments')
    .upsert(
      {
        programme_id: input.programmeId,
        coach_athlete_id: input.coachAthleteId,
        coach_profile_id: input.coachProfileId,
        status: 'assigned',
      },
      { onConflict: 'programme_id,coach_athlete_id' },
    )
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not assign programme to athlete.') }
  }
  const row = data as Record<string, unknown>
  return {
    ok: true,
    data: {
      id: String(row.id),
      programmeId: String(row.programme_id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      status: String(row.status) as CoachProgrammeAssignmentRecord['status'],
      progressPct: typeof row.progress_pct === 'number' ? row.progress_pct : 0,
      assignedAt: String(row.assigned_at ?? ''),
      completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    },
  }
}

export async function updateProgrammeAssignmentProgress(
  assignmentId: string,
  progressPct: number,
  status: CoachProgrammeAssignmentRecord['status'],
): Promise<ServiceResult<void>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { error } = await client
    .from('coach_programme_assignments')
    .update({
      progress_pct: Math.max(0, Math.min(100, Math.round(progressPct))),
      status,
    })
    .eq('id', assignmentId)

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Could not update programme progression.') }
  }
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 3. CALENDAR & TRAINING SESSIONS
// ---------------------------------------------------------------------------

export async function listCoachSessions(coachProfileId: string): Promise<ServiceResult<CoachTrainingSessionRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_training_sessions')
    .select('*')
    .eq('coach_profile_id', coachProfileId)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load training calendar sessions.') }
  }
  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(mapCoachSessionRow),
  }
}

export async function createCoachSession(input: SaveCoachSessionInput): Promise<ServiceResult<CoachTrainingSessionRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  if (input.title.trim().length < 2) {
    return { ok: false, error: 'Session title must be at least 2 characters.' }
  }
  if (!input.sessionDate || !input.startTime || !input.endTime) {
    return { ok: false, error: 'Date, start time, and end time are required.' }
  }
  if (input.endTime <= input.startTime) {
    return { ok: false, error: 'Session end time must be later than start time.' }
  }

  const { data, error } = await client
    .from('coach_training_sessions')
    .insert({
      coach_profile_id: input.coachProfileId,
      tenant_id: input.tenantId ?? null,
      programme_id: input.programmeId || null,
      title: input.title.trim(),
      sport: input.sport.trim() || 'Athletics',
      session_date: input.sessionDate,
      start_time: input.startTime,
      end_time: input.endTime,
      venue_name: input.venueName.trim(),
      location_city: input.locationCity.trim(),
      session_mode: input.sessionMode,
      status: input.status || 'scheduled',
      max_participants: input.maxParticipants ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not schedule training session.') }
  }
  return { ok: true, data: mapCoachSessionRow(data as Record<string, unknown>) }
}

export async function updateCoachSessionStatus(
  sessionId: string,
  status: CoachSessionStatus,
): Promise<ServiceResult<CoachTrainingSessionRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_training_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not update session status.') }
  }
  return { ok: true, data: mapCoachSessionRow(data as Record<string, unknown>) }
}

// ---------------------------------------------------------------------------
// 4. SESSION ATTENDANCE ROLL-CALL
// ---------------------------------------------------------------------------

export async function listSessionAttendance(
  sessionId: string,
): Promise<ServiceResult<CoachSessionAttendanceRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_session_attendance')
    .select('*')
    .eq('session_id', sessionId)

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load session attendance.') }
  }

  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      status: String(row.status) as CoachAttendanceStatus,
      notes: typeof row.notes === 'string' ? row.notes : null,
      markedAt: String(row.marked_at ?? ''),
    })),
  }
}

export async function saveSessionAttendance(input: {
  sessionId: string
  coachProfileId: string
  entries: { coachAthleteId: string; status: CoachAttendanceStatus; notes?: string }[]
}): Promise<ServiceResult<CoachSessionAttendanceRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  if (input.entries.length === 0) {
    return { ok: false, error: 'Add or select athletes before saving session attendance.' }
  }

  const rows = input.entries.map(entry => ({
    session_id: input.sessionId,
    coach_athlete_id: entry.coachAthleteId,
    coach_profile_id: input.coachProfileId,
    status: entry.status,
    notes: entry.notes?.trim() || null,
    marked_at: new Date().toISOString(),
  }))

  const { data, error } = await client
    .from('coach_session_attendance')
    .upsert(rows, { onConflict: 'session_id,coach_athlete_id' })
    .select('*')

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Could not persist session attendance roll-call.') }
  }

  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(row => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      coachAthleteId: String(row.coach_athlete_id),
      coachProfileId: String(row.coach_profile_id),
      status: String(row.status) as CoachAttendanceStatus,
      notes: typeof row.notes === 'string' ? row.notes : null,
      markedAt: String(row.marked_at ?? ''),
    })),
  }
}

// ---------------------------------------------------------------------------
// 5. ATHLETE ASSESSMENTS & KHELO INDIA / SAI DB EVALUATION
// ---------------------------------------------------------------------------

export async function listCoachAssessments(
  coachProfileId: string,
): Promise<ServiceResult<CoachAthleteAssessmentRecord[]>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const { data, error } = await client
    .from('coach_athlete_assessments')
    .select('*')
    .eq('coach_profile_id', coachProfileId)
    .order('assessment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: friendlyDbError(error, 'Failed to load athlete assessments.') }
  }
  return {
    ok: true,
    data: ((data || []) as Record<string, unknown>[]).map(mapCoachAssessmentRow),
  }
}

export async function recordCoachAssessment(input: {
  coachProfileId: string
  coachAthleteId: string
  athleteName: string
  category: CoachAssessmentCategory
  ageBand?: CoachAthleteAssessmentRecord['ageBand']
  assessmentDate: string
  overallScore: number
  gradeBand: string
  saiReportCode?: string | null
  metrics: Record<string, unknown>
  coachSummary?: string | null
}): Promise<ServiceResult<CoachAthleteAssessmentRecord>> {
  const client = getSupabaseClient()
  if (!client) return unconfiguredResult()

  const clampedScore = Math.max(0, Math.min(100, Number(input.overallScore.toFixed(2))))
  if (!Number.isFinite(clampedScore)) {
    return { ok: false, error: 'Assessment score must be a valid number between 0 and 100.' }
  }

  const { data, error } = await client
    .from('coach_athlete_assessments')
    .insert({
      coach_profile_id: input.coachProfileId,
      coach_athlete_id: input.coachAthleteId,
      athlete_name: input.athleteName.trim(),
      category: input.category,
      age_band: input.ageBand || 'open',
      assessment_date: input.assessmentDate,
      overall_score: clampedScore,
      grade_band: input.gradeBand.trim() || 'Evaluated',
      sai_report_code: input.saiReportCode?.trim() || null,
      metrics: input.metrics,
      coach_summary: input.coachSummary?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: friendlyDbError(error || {}, 'Could not save athlete assessment.') }
  }
  return { ok: true, data: mapCoachAssessmentRow(data as Record<string, unknown>) }
}

/** Pure helper combining Khelo India protocols with PostgreSQL storage format. */
export function buildKheloIndiaAssessmentInput(params: {
  coachProfileId: string
  coachAthleteId: string
  athleteName: string
  age: number
  ageCategory: KheloIndiaAgeCategory
  assessmentDate: string
  subJunior?: KheloIndiaSubJuniorInput
  juniorSenior?: KheloIndiaJuniorSeniorInput
  coachSummary?: string
}) {
  const evaluation =
    params.ageCategory === 'sub_junior_5_8' && params.subJunior
      ? evaluateSubJuniorBattery(params.subJunior, params.athleteName)
      : evaluateJuniorSeniorBattery(
          params.juniorSenior || {
            heightCm: 160,
            weightKg: 52,
            gender: 'male',
            dash50mSeconds: 7.8,
            run600mSeconds: 145,
            sitAndReachCm: 20,
            partialCurlUpsReps: 20,
            pushUpsReps: 16,
          },
          params.athleteName,
          params.age,
        )

  const overallScore = Math.round(evaluation.averageStars * 20)
  const gradeBand = evaluation.isSaiTalentTarget
    ? `Grade ${evaluation.overallGrade} · SAI Talent Target`
    : `Grade ${evaluation.overallGrade}`
  const saiReportCode = `SAI-KI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  return {
    coachProfileId: params.coachProfileId,
    coachAthleteId: params.coachAthleteId,
    athleteName: params.athleteName,
    category: 'khelo_india' as const,
    ageBand: evaluation.category,
    assessmentDate: params.assessmentDate,
    overallScore,
    gradeBand,
    saiReportCode,
    metrics: {
      bmi: evaluation.bmi,
      bmiCategory: evaluation.bmiCategory,
      averageStars: evaluation.averageStars,
      overallGrade: evaluation.overallGrade,
      isSaiTalentTarget: evaluation.isSaiTalentTarget,
      testScores: evaluation.testScores,
    },
    coachSummary:
      params.coachSummary?.trim() ||
      `Khelo India ${evaluation.category} protocol · Avg ${evaluation.averageStars}/5 stars · BMI ${evaluation.bmi} (${evaluation.bmiCategory}).`,
  }
}
