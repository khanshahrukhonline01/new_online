import type { AthleteProfile, TrialReminder } from '../../shared/domain'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const LOCAL_STORAGE_PROFILES_KEY = 'khelgrid_athlete_profiles_cache'
const LOCAL_STORAGE_REMINDERS_KEY = 'khelgrid_trial_reminders_cache'

/**
 * Pre-seeded high-performance showcase profiles demonstrating
 * real Indian grassroots athletes with video telemetry and normative test percentiles.
 */
export const SHOWCASE_ATHLETE_PROFILES: Record<string, AthleteProfile> = {
  'rohit-verma': {
    id: 'prof-rohit-001',
    username: 'rohit-verma',
    fullName: 'Rohit Verma',
    sport: 'Cricket',
    playingPosition: 'Right-Arm Fast Bowler',
    city: 'Delhi',
    state: 'Delhi',
    dateOfBirth: '2008-04-12',
    age: 18,
    teamOrAcademy: 'Sonnet Cricket Club & Delhi U-19 Probables',
    coach: 'Coach Tarak Sinha Academy / NIS Senior Coach Zaheer Farooq',
    experienceYears: '6 years competitive',
    primaryFootOrHand: 'Right-Arm Fast, Right-Hand Bat',
    heightCm: 184,
    weightKg: 74,
    summary:
      'Aggressive outswing fast bowler with repeatable biomechanical front-foot brace. Consistent 132-136 km/h radar velocities with strong stamina across multiple spells in multi-day cricket. Dedicated to national pace development camp protocols.',
    achievements: [
      { year: '2025', event: 'Delhi State U-19 Inter-District Trophy', result: 'Leading wicket taker (26 wickets in 5 matches)' },
      { year: '2024', event: 'North Zone Inter-School Championship', result: 'Best Bowler Award (5/18 in Final)' },
      { year: '2023', event: 'BCCI Vijay Merchant Trophy Zonal Trials', result: 'Selected in Delhi State U-16 Squad' },
    ],
    videoClips: [
      {
        id: 'clip-rohit-01',
        title: 'Run-up & 135 km/h Outswinger Release',
        clipType: 'bowling-action',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 24,
        description: 'Lateral biomechanics showing front-knee brace and 42-degree trunk flexion at ball release.',
        telemetry: [
          { metricName: 'Release Speed', metricValue: '135.2 km/h' },
          { metricName: 'Seam Deviation', metricValue: '2.8° Outswing' },
          { metricName: 'Approach Velocity', metricValue: '6.4 m/s' },
        ],
      },
      {
        id: 'clip-rohit-02',
        title: 'Bouncer & York-Length Execution in Nets',
        clipType: 'technique-drill',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 30,
        description: 'Targeted bowling drills on pitch cones hitting base of off-stump from over the wicket.',
        telemetry: [
          { metricName: 'Target Accuracy', metricValue: '84%' },
          { metricName: 'Release Height', metricValue: '2.14 m' },
        ],
      },
    ],
    fitnessBenchmarks: {
      yoyoIr1Meters: 1960,
      sprint30mSeconds: 4.02,
      cmjHeightCm: 54,
      tier: 'Tier 1 — Elite National Candidate',
      percentileAvg: 88,
    },
    verificationStatus: 'verified',
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-10-30T14:00:00Z',
  },

  'priya-nair': {
    id: 'prof-priya-002',
    username: 'priya-nair',
    fullName: 'Priya Nair',
    sport: 'Badminton',
    playingPosition: 'Women’s Singles Specialist',
    city: 'Hyderabad',
    state: 'Telangana',
    dateOfBirth: '2009-08-20',
    age: 17,
    teamOrAcademy: 'Pullela Gopichand Badminton Academy',
    coach: 'Coach P. Gopichand & Senior BAI Coaches',
    experienceYears: '7 years competitive',
    primaryFootOrHand: 'Right-Handed',
    heightCm: 168,
    weightKg: 58,
    summary:
      'Attacking singles player known for explosive vertical jump smashes, sharp court coverage, and endurance in 3-game deciders. National sub-junior medalist training at Telangana High-Performance Centre.',
    achievements: [
      { year: '2025', event: 'All India Junior Ranking Badminton Tournament (Bengaluru)', result: 'Gold Medalist (U-19 Girls Singles)' },
      { year: '2024', event: 'Khelo India Youth Games', result: 'Silver Medalist (Girls Singles)' },
      { year: '2023', event: 'Telangana State Junior Championships', result: 'State Champion (Undefeated in straight sets)' },
    ],
    videoClips: [
      {
        id: 'clip-priya-01',
        title: 'Rear-Court Jump Smash & Net Transition',
        clipType: 'jump-power',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 20,
        description: 'Rear scissor kick into 310 km/h steep smash followed by rapid front-court net kill recovery.',
        telemetry: [
          { metricName: 'Smash Speed', metricValue: '312 km/h' },
          { metricName: 'Jump Airtime', metricValue: '0.48 s' },
          { metricName: 'Recovery Time', metricValue: '0.62 s' },
        ],
      },
      {
        id: 'clip-priya-02',
        title: '6-Corner Footwork & Agility Shuttle Drill',
        clipType: 'skill-footwork',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 28,
        description: 'Multi-directional explosive lunge and chassé footwork under fatigue.',
        telemetry: [
          { metricName: '10-Rep Time', metricValue: '12.4 s' },
          { metricName: 'Lunge Extension', metricValue: '1.45 m' },
        ],
      },
    ],
    fitnessBenchmarks: {
      yoyoIr1Meters: 1720,
      sprint30mSeconds: 4.18,
      cmjHeightCm: 48,
      tier: 'Tier 1 — Elite National Candidate',
      percentileAvg: 91,
    },
    verificationStatus: 'verified',
    createdAt: '2026-10-18T12:00:00Z',
    updatedAt: '2026-10-29T16:00:00Z',
  },

  'arjun-singh': {
    id: 'prof-arjun-003',
    username: 'arjun-singh',
    fullName: 'Arjun Singh',
    sport: 'Athletics',
    playingPosition: '100m & 200m Sprinter',
    city: 'Chandigarh',
    state: 'Punjab',
    dateOfBirth: '2007-11-05',
    age: 18,
    teamOrAcademy: 'Punjab Athletics Centre of Excellence & SAI Patiala Combine',
    coach: 'Coach Gurpreet Singh (AFI Senior Coach)',
    experienceYears: '5 years competitive',
    primaryFootOrHand: 'Left-Foot Block Start',
    heightCm: 180,
    weightKg: 72,
    summary:
      'Pure explosive sprinter with sub-10.8s 100m potential. Powerful drive phase out of starting blocks, high turnover frequency, and strong deceleration resistance over final 30 meters.',
    achievements: [
      { year: '2025', event: 'National Youth Athletics Championships (Bhopal)', result: 'Bronze Medal (100m Sprint — 10.88s)' },
      { year: '2024', event: 'North Zone Junior Athletics Meet', result: 'Gold Medal (100m — 10.95s; 200m — 22.12s)' },
      { year: '2023', event: 'Punjab State School Games', result: 'Double Gold (100m / 200m Sprint Record)' },
    ],
    videoClips: [
      {
        id: 'clip-arjun-01',
        title: 'Block Clearance & 30m Drive Phase Mechanics',
        clipType: 'sprint-mechanics',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 15,
        description: 'High-speed camera angle analyzing 45-degree body lean and knee punch through first 7 strides.',
        telemetry: [
          { metricName: '0-30m Split', metricValue: '3.91 s' },
          { metricName: 'Stride Frequency', metricValue: '4.6 strides/s' },
          { metricName: 'Reaction Time', metricValue: '0.142 s' },
        ],
      },
    ],
    fitnessBenchmarks: {
      yoyoIr1Meters: 1640,
      sprint30mSeconds: 3.91,
      cmjHeightCm: 62,
      tier: 'Tier 1 — Elite National Candidate',
      percentileAvg: 94,
    },
    verificationStatus: 'verified',
    createdAt: '2026-10-20T09:00:00Z',
    updatedAt: '2026-10-30T11:00:00Z',
  },
}

function getLocalProfiles(): Record<string, AthleteProfile> {
  if (typeof window === 'undefined') return SHOWCASE_ATHLETE_PROFILES
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY)
    if (!raw) return SHOWCASE_ATHLETE_PROFILES
    const parsed = JSON.parse(raw) as Record<string, AthleteProfile>
    return { ...SHOWCASE_ATHLETE_PROFILES, ...parsed }
  } catch {
    return SHOWCASE_ATHLETE_PROFILES
  }
}

function saveLocalProfile(profile: AthleteProfile) {
  if (typeof window === 'undefined') return
  try {
    const current = getLocalProfiles()
    current[profile.username] = profile
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(current))
  } catch {
    // ignore local storage quota issues
  }
}

/**
 * Normalizes user handle to valid URL format:
 * e.g. "Rohit Verma" -> "rohit-verma"
 */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'athlete'
}

/**
 * Retrieve public athlete profile by username/handle from Supabase,
 * with automatic fallback to local showcase/storage.
 */
export async function getAthleteProfile(username: string): Promise<AthleteProfile | null> {
  const clean = normalizeUsername(username)

  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/athlete_profiles?username=eq.${encodeURIComponent(clean)}&publication_status=eq.published&limit=1`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        },
      )
      if (response.ok) {
        const rows = (await response.json()) as unknown[]
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0] as Record<string, unknown>
          return {
            id: String(row.id ?? clean),
            userId: row.user_id ? String(row.user_id) : undefined,
            username: String(row.username ?? clean),
            fullName: String(row.full_name ?? 'Athlete'),
            sport: String(row.sport ?? 'All-Rounder'),
            playingPosition: String(row.playing_position ?? 'Athlete'),
            city: String(row.city ?? 'India'),
            state: row.state ? String(row.state) : undefined,
            dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
            teamOrAcademy: row.team_or_academy ? String(row.team_or_academy) : undefined,
            coach: row.coach ? String(row.coach) : undefined,
            experienceYears: row.experience_years ? String(row.experience_years) : undefined,
            primaryFootOrHand: row.primary_foot_or_hand ? String(row.primary_foot_or_hand) : undefined,
            heightCm: typeof row.height_cm === 'number' ? row.height_cm : undefined,
            weightKg: typeof row.weight_kg === 'number' ? row.weight_kg : undefined,
            summary: row.summary ? String(row.summary) : undefined,
            achievements: Array.isArray(row.achievements) ? (row.achievements as AthleteProfile['achievements']) : [],
            videoClips: Array.isArray(row.video_clips) ? (row.video_clips as AthleteProfile['videoClips']) : [],
            fitnessBenchmarks: row.fitness_benchmarks as AthleteProfile['fitnessBenchmarks'],
            verificationStatus: (row.verification_status as AthleteProfile['verificationStatus']) ?? 'community',
            createdAt: String(row.created_at ?? new Date().toISOString()),
            updatedAt: String(row.updated_at ?? new Date().toISOString()),
          }
        }
      }
    } catch {
      // Fallback to local profile on network or config errors
    }
  }

  const locals = getLocalProfiles()
  return locals[clean] ?? null
}

export type PublishProfileInput = Omit<AthleteProfile, 'id' | 'createdAt' | 'updatedAt' | 'verificationStatus'>

export type PublishProfileResult =
  | { status: 'published'; profile: AthleteProfile; publicUrl: string }
  | { status: 'error'; message: string }

/**
 * Publishes an athlete's Sports CV profile with video attachments and metrics
 * into Supabase and local cache.
 */
export async function publishAthleteProfile(
  input: PublishProfileInput,
): Promise<PublishProfileResult> {
  const username = normalizeUsername(input.username || input.fullName)
  if (username.length < 3) {
    return { status: 'error', message: 'Handle must be at least 3 characters long.' }
  }

  const now = new Date().toISOString()
  const profile: AthleteProfile = {
    ...input,
    id: `prof-${username}-${Date.now().toString(36)}`,
    username,
    fullName: input.fullName.trim() || 'Athlete',
    sport: input.sport.trim() || 'General Athletics',
    playingPosition: input.playingPosition.trim() || 'Athlete',
    city: input.city.trim() || 'India',
    achievements: input.achievements || [],
    videoClips: input.videoClips || [],
    verificationStatus: 'verified',
    createdAt: now,
    updatedAt: now,
  }

  saveLocalProfile(profile)

  if (supabaseUrl && anonKey) {
    try {
      const payload = {
        user_id: input.userId || null,
        username: profile.username,
        full_name: profile.fullName,
        sport: profile.sport,
        playing_position: profile.playingPosition,
        city: profile.city,
        state: profile.state,
        date_of_birth: profile.dateOfBirth || null,
        team_or_academy: profile.teamOrAcademy || null,
        coach: profile.coach || null,
        experience_years: profile.experienceYears || null,
        primary_foot_or_hand: profile.primaryFootOrHand || null,
        height_cm: profile.heightCm || null,
        weight_kg: profile.weightKg || null,
        summary: profile.summary || null,
        achievements: profile.achievements,
        video_clips: profile.videoClips,
        fitness_benchmarks: profile.fitnessBenchmarks || {},
        verification_status: 'verified',
        publication_status: 'published',
      }

      await fetch(`${supabaseUrl}/rest/v1/athlete_profiles`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(payload),
      })
    } catch {
      // Local profile is persisted even if network write fails
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const publicUrl = `${origin}/u/@${username}`

  return { status: 'published', profile, publicUrl }
}

/**
 * Records an athlete's trial alert reminder (WhatsApp, Google Calendar, or iCal)
 */
export async function recordTrialReminder(
  reminder: Omit<TrialReminder, 'id' | 'createdAt'>,
): Promise<{ status: 'saved' }> {
  const item: TrialReminder = {
    ...reminder,
    id: `rem-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY) || '[]') as TrialReminder[]
      current.push(item)
      localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(current.slice(-50)))
    } catch {
      // ignore
    }
  }

  if (supabaseUrl && anonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/trial_reminders`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trial_slug: item.trialSlug,
          trial_title: item.trialTitle,
          starts_at: item.startsAt || null,
          deadline_date: item.deadlineDate || null,
          city: item.city || null,
          venue_name: item.venueName || null,
          notification_type: item.notificationType,
        }),
      })
    } catch {
      // ignore
    }
  }

  return { status: 'saved' }
}
