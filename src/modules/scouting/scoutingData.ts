export type ScoutAgeGroup = 'U-14' | 'U-16' | 'U-17' | 'U-19' | 'Senior'
export type ScoutGender = 'Male' | 'Female'
export type VerificationTier = 'Tier-1 Verified' | 'Tier-2 Verified'

export interface AthleteScoutMetrics {
  sprint30mSeconds?: number // 30m sprint time in seconds
  cmjHeightCm?: number // Countermovement vertical jump in cm
  yoyoIr1Meters?: number // Yo-Yo Intermittent Recovery Level 1 distance in meters
  speedOrVelocityKmph?: number // e.g. bowling speed, smash speed, or sprint top speed
  aerobicVo2Max?: number // estimated VO2 max ml/kg/min
}

export interface ScoutAthlete {
  id: string
  name: string
  hindiName?: string
  sport: string
  primaryPosition: string
  age: number
  ageGroup: ScoutAgeGroup
  gender: ScoutGender
  city: string
  state: string
  academy: string
  verifiedTier: VerificationTier
  federationUid: string
  metrics: AthleteScoutMetrics
  percentileRank: number // 0-100 normative rank
  achievements: string[]
  heightCm: number
  weightKg: number
  dominantSide: string
  scoutingSummary: string
  guardianOrCoachContact: string
}

export const BASELINE_SCOUT_ATHLETES: ScoutAthlete[] = [
  {
    id: 'scout-ath-01',
    name: 'Aarav Choudhary',
    hindiName: 'आरव चौधरी',
    sport: 'Cricket',
    primaryPosition: 'Right-Arm Fast Bowler',
    age: 17,
    ageGroup: 'U-19',
    gender: 'Male',
    city: 'Meerut',
    state: 'Uttar Pradesh',
    academy: 'Bhamashah Cricket Academy, Meerut',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'UPCA-BCCI-2026-1049',
    metrics: {
      sprint30mSeconds: 3.88,
      cmjHeightCm: 57,
      yoyoIr1Meters: 2040,
      speedOrVelocityKmph: 138,
      aerobicVo2Max: 54.2,
    },
    percentileRank: 95,
    achievements: [
      'Highest wicket-taker in UP State U-19 Inter-District Trophy (28 wickets @ 14.2)',
      'BCCI NCA Under-19 Camp Selectee 2026',
    ],
    heightCm: 188,
    weightKg: 76,
    dominantSide: 'Right Handed / Fast',
    scoutingSummary: 'Tall, high-arm action with natural seam presentation. Consistently clocks 134-138 km/h with late movement into right-handers. High stamina in multi-spell tests.',
    guardianOrCoachContact: 'Coach D.K. Tyagi (BCCI Level 2) · contact@bhamashahcricket.in',
  },
  {
    id: 'scout-ath-02',
    name: 'Kavya R. Nair',
    hindiName: 'काव्या आर. नायर',
    sport: 'Athletics',
    primaryPosition: '400m & 400m Hurdles',
    age: 18,
    ageGroup: 'U-19',
    gender: 'Female',
    city: 'Kozhikode',
    state: 'Kerala',
    academy: 'Usha School of Athletics, Kinaloor',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'AFI-KL-2025-8841',
    metrics: {
      sprint30mSeconds: 4.12,
      cmjHeightCm: 48,
      yoyoIr1Meters: 1960,
      speedOrVelocityKmph: 31.4,
      aerobicVo2Max: 58.5,
    },
    percentileRank: 97,
    achievements: [
      'Gold Medalist, 39th AFI Junior National Athletics 400m (53.82s personal best)',
      'World Athletics U-20 Championships B-Standard Qualifier',
    ],
    heightCm: 172,
    weightKg: 58,
    dominantSide: 'Left Stride Lead',
    scoutingSummary: 'Outstanding stride frequency and lactate tolerance. Splits second 200m with remarkable endurance pacing. Top recommendation for national junior relay squad.',
    guardianOrCoachContact: 'Academy Director Office · ushaschool@kerala.org',
  },
  {
    id: 'scout-ath-03',
    name: 'Lalrempuia Fanai',
    hindiName: 'लालरेंपुइया फनाई',
    sport: 'Football',
    primaryPosition: 'Box-to-Box Midfielder / #8',
    age: 16,
    ageGroup: 'U-17',
    gender: 'Male',
    city: 'Aizawl',
    state: 'Mizoram',
    academy: 'Aizawl FC Grassroots Academy',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'AIFF-CRS-2026-99381',
    metrics: {
      sprint30mSeconds: 3.94,
      cmjHeightCm: 53,
      yoyoIr1Meters: 2200,
      speedOrVelocityKmph: 29.8,
      aerobicVo2Max: 61.2,
    },
    percentileRank: 98,
    achievements: [
      'Player of the Tournament, Subroto Cup International U-17 (Mizoram State Team)',
      'India U-17 National Camp shortlist (AIFF)',
    ],
    heightCm: 174,
    weightKg: 64,
    dominantSide: 'Both Feet (Preferred Right)',
    scoutingSummary: 'Relentless work rate across 90 minutes. 86% pass completion under high press; exceptional spatial awareness and transitional ball recoveries.',
    guardianOrCoachContact: 'Head Coach Vanlalzuala · aizawlfcacademy@mfa.org',
  },
  {
    id: 'scout-ath-04',
    name: 'Tanvi Deshmukh',
    hindiName: 'तन्वी देशमुख',
    sport: 'Badminton',
    primaryPosition: 'Women’s Singles',
    age: 15,
    ageGroup: 'U-16',
    gender: 'Female',
    city: 'Pune',
    state: 'Maharashtra',
    academy: 'Nikhil Kanetkar Badminton Academy (NKBA), Pune',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'BAI-MH-2025-44910',
    metrics: {
      sprint30mSeconds: 4.25,
      cmjHeightCm: 44,
      yoyoIr1Meters: 1780,
      speedOrVelocityKmph: 285, // Smash speed km/h
      aerobicVo2Max: 52.0,
    },
    percentileRank: 93,
    achievements: [
      'Ranked #3 in All India Junior U-17 Girls Singles (BAI Circuit 2026)',
      'Silver Medalist, SGFI National School Games U-17',
    ],
    heightCm: 168,
    weightKg: 55,
    dominantSide: 'Right Handed',
    scoutingSummary: 'Explosive baseline-to-net recovery time (under 1.1s). Aggressive steep overhead smash combined with deceptive cross-court drop shots.',
    guardianOrCoachContact: 'Coach Nikhil Kanetkar (Olympian) · info@nkba.org',
  },
  {
    id: 'scout-ath-05',
    name: 'Gursewak Singh',
    hindiName: 'गुरसेवक सिंह',
    sport: 'Kabaddi',
    primaryPosition: 'Right Corner Defender',
    age: 19,
    ageGroup: 'U-19',
    gender: 'Male',
    city: 'Ludhiana',
    state: 'Punjab',
    academy: 'Grewal Sports Association, Kila Raipur',
    verifiedTier: 'Tier-2 Verified',
    federationUid: 'AKFI-PB-2025-11029',
    metrics: {
      sprint30mSeconds: 4.10,
      cmjHeightCm: 56,
      yoyoIr1Meters: 1920,
      speedOrVelocityKmph: 27.5,
    },
    percentileRank: 91,
    achievements: [
      'Best Defender Award, Junior National Kabaddi Championship (41 tackle points)',
      'PKL New Young Players (NYP) Trialist Invitation',
    ],
    heightCm: 183,
    weightKg: 82,
    dominantSide: 'Right Corner',
    scoutingSummary: 'Incredible grip strength and ankle-hold timing. Excellent communication anchoring the chain defense under pressure.',
    guardianOrCoachContact: 'Coach Harpreet Singh · contact@grewalsports.org',
  },
  {
    id: 'scout-ath-06',
    name: 'Simranjeet Kaur',
    hindiName: 'सिमरनजीत कौर',
    sport: 'Boxing',
    primaryPosition: 'Featherweight (57kg)',
    age: 17,
    ageGroup: 'U-19',
    gender: 'Female',
    city: 'Bhiwani',
    state: 'Haryana',
    academy: 'Bhiwani Boxing Club, Haryana',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'BFI-HR-2025-7721',
    metrics: {
      sprint30mSeconds: 4.30,
      cmjHeightCm: 46,
      yoyoIr1Meters: 1840,
      speedOrVelocityKmph: 28.2,
      aerobicVo2Max: 55.0,
    },
    percentileRank: 94,
    achievements: [
      'Gold Medalist, Khelo India Youth Games 2026 (57kg category)',
      'BFI National Youth Boxing Championship Best Boxer Trophy',
    ],
    heightCm: 167,
    weightKg: 57,
    dominantSide: 'Southpaw (Left-Handed)',
    scoutingSummary: 'Crisp counter-puncher with exceptional ring perimeter control. High punch volume (68 landed punches/round avg). Resilient chin against aggressive punchers.',
    guardianOrCoachContact: 'Coach Jagdish Singh (Dronacharya Awardee) · contact@bhiwaniboxing.org',
  },
  {
    id: 'scout-ath-07',
    name: 'Devraj Patil',
    hindiName: 'देवराज पाटिल',
    sport: 'Wrestling',
    primaryPosition: 'Freestyle (65kg)',
    age: 18,
    ageGroup: 'U-19',
    gender: 'Male',
    city: 'Kolhapur',
    state: 'Maharashtra',
    academy: 'Motibagh Talim Akhara, Kolhapur',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'WFI-MH-2026-6632',
    metrics: {
      sprint30mSeconds: 4.05,
      cmjHeightCm: 59,
      yoyoIr1Meters: 2000,
      speedOrVelocityKmph: 26.5,
    },
    percentileRank: 96,
    achievements: [
      'Maharashtra Kesari Junior Title Winner 2026',
      'Silver Medal, National Junior Wrestling Championship (65kg Mat)',
    ],
    heightCm: 173,
    weightKg: 65,
    dominantSide: 'Right Leg Attack / Dhobi Pachhad Specialist',
    scoutingSummary: 'Tremendous explosive core torque and double-leg takedown entry speed. Well-conditioned for 3-minute rounds without heart rate collapse.',
    guardianOrCoachContact: 'Vastad Hindurao Patil · motibaghtalim@kolhapur.org',
  },
  {
    id: 'scout-ath-08',
    name: 'Ananya Sengupta',
    hindiName: 'अनन्या सेनगुप्ता',
    sport: 'Table Tennis',
    primaryPosition: 'Offensive Attacker (Shakehand Grip)',
    age: 14,
    ageGroup: 'U-14',
    gender: 'Female',
    city: 'Kolkata',
    state: 'West Bengal',
    academy: 'South Kolkata Table Tennis Academy',
    verifiedTier: 'Tier-2 Verified',
    federationUid: 'TTFI-WB-2026-3392',
    metrics: {
      sprint30mSeconds: 4.45,
      cmjHeightCm: 41,
      yoyoIr1Meters: 1640,
      speedOrVelocityKmph: 110,
    },
    percentileRank: 92,
    achievements: [
      'Winner, Eastern Zone Sub-Junior Table Tennis Ranking 2026',
      'Quarterfinalist, UTT National Cadets Championship',
    ],
    heightCm: 158,
    weightKg: 46,
    dominantSide: 'Right Handed / Shakehand',
    scoutingSummary: 'Extremely fast wrist recovery on forehand topspin counters. Exceptional third-ball attack conversion rate (74%).',
    guardianOrCoachContact: 'Coach Sourav Mukherjee · southkolkatatt@gmail.com',
  },
  {
    id: 'scout-ath-09',
    name: 'Mohit Rawat',
    hindiName: 'मोहित रावत',
    sport: 'Athletics',
    primaryPosition: 'Long Jump & Triple Jump',
    age: 17,
    ageGroup: 'U-19',
    gender: 'Male',
    city: 'Dehradun',
    state: 'Uttarakhand',
    academy: 'Maharana Pratap Sports College, Raipur, Dehradun',
    verifiedTier: 'Tier-1 Verified',
    federationUid: 'AFI-UK-2025-9920',
    metrics: {
      sprint30mSeconds: 3.82,
      cmjHeightCm: 64,
      yoyoIr1Meters: 1980,
      speedOrVelocityKmph: 34.2,
      aerobicVo2Max: 56.4,
    },
    percentileRank: 98,
    achievements: [
      'Personal Best: 7.62m (Long Jump) & 15.84m (Triple Jump)',
      'Gold Medalist, SGFI National School Athletics U-19',
    ],
    heightCm: 185,
    weightKg: 72,
    dominantSide: 'Right Takeoff Foot',
    scoutingSummary: 'World-class approach runway speed (10.1 m/s at penultimate stride). High vertical impulse off the board with clean hitch-kick flight mechanics.',
    guardianOrCoachContact: 'Chief Athletics Coach Negi · mpsports.dehradun@gov.in',
  },
  {
    id: 'scout-ath-10',
    name: 'Priyanshu Tiwari',
    hindiName: 'प्रियांशु तिवारी',
    sport: 'Football',
    primaryPosition: 'Goalkeeper',
    age: 18,
    ageGroup: 'U-19',
    gender: 'Male',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    academy: 'Banaras Sports Complex, Sigra, Varanasi',
    verifiedTier: 'Tier-2 Verified',
    federationUid: 'AIFF-CRS-2025-1192',
    metrics: {
      sprint30mSeconds: 4.02,
      cmjHeightCm: 62,
      yoyoIr1Meters: 1940,
      speedOrVelocityKmph: 28.0,
    },
    percentileRank: 94,
    achievements: [
      'Best Goalkeeper, Uttar Pradesh State Youth Championship 2026 (5 clean sheets)',
      'Selected for North Zone Santosh Trophy Prep Camp',
    ],
    heightCm: 191,
    weightKg: 84,
    dominantSide: 'Right Handed / Sweeper-Keeper',
    scoutingSummary: 'Immense reach and reaction speed on low driven strikes. Excellent 1v1 closing angles and accurate 50m driven kicks launching counter-attacks.',
    guardianOrCoachContact: 'Coach S.K. Mishra · sigrasports@varanasi.org',
  },
]

export const SCOUT_SPORTS = [
  'All Sports',
  'Cricket',
  'Athletics',
  'Football',
  'Badminton',
  'Kabaddi',
  'Boxing',
  'Wrestling',
  'Table Tennis',
]

export const SCOUT_AGE_GROUPS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Age Groups' },
  { id: 'U-14', label: 'Under 14' },
  { id: 'U-16', label: 'Under 16' },
  { id: 'U-17', label: 'Under 17' },
  { id: 'U-19', label: 'Under 19' },
  { id: 'Senior', label: 'Senior / Open' },
]

export const STORAGE_SCOUT_SHORTLIST_KEY = 'khelgrid_scout_shortlist_v1'
export const STORAGE_SCOUT_INQUIRIES_KEY = 'khelgrid_scout_inquiries_v1'

let memoryShortlist: string[] = []

export function getScoutShortlist(): string[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_SCOUT_SHORTLIST_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  }
  return memoryShortlist
}

export function saveAthleteToShortlist(athleteId: string): string[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getScoutShortlist()
      if (!current.includes(athleteId)) {
        current.push(athleteId)
        window.localStorage.setItem(STORAGE_SCOUT_SHORTLIST_KEY, JSON.stringify(current))
      }
      return current
    } catch {
      return []
    }
  }
  if (!memoryShortlist.includes(athleteId)) {
    memoryShortlist.push(athleteId)
  }
  return [...memoryShortlist]
}

export function removeAthleteFromShortlist(athleteId: string): string[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getScoutShortlist()
      const next = current.filter(id => id !== athleteId)
      window.localStorage.setItem(STORAGE_SCOUT_SHORTLIST_KEY, JSON.stringify(next))
      return next
    } catch {
      return []
    }
  }
  memoryShortlist = memoryShortlist.filter(id => id !== athleteId)
  return [...memoryShortlist]
}

export function generateScoutShortlistCsv(athletes: ScoutAthlete[]): string {
  const headers = [
    'Athlete ID',
    'Name',
    'Sport',
    'Position/Role',
    'Age',
    'Age Group',
    'Gender',
    'City',
    'State',
    'Academy',
    'Federation UID',
    'Percentile Rank',
    '30m Sprint (s)',
    'Vertical Jump (cm)',
    'Yo-Yo IR1 (m)',
    'Top Speed (km/h)',
    'Key Achievements',
    'Coach/Guardian Contact',
  ]

  const rows = athletes.map(a => [
    `"${a.id}"`,
    `"${a.name}"`,
    `"${a.sport}"`,
    `"${a.primaryPosition}"`,
    a.age,
    `"${a.ageGroup}"`,
    `"${a.gender}"`,
    `"${a.city}"`,
    `"${a.state}"`,
    `"${a.academy.replace(/"/g, '""')}"`,
    `"${a.federationUid}"`,
    `${a.percentileRank}%`,
    a.metrics.sprint30mSeconds || 'N/A',
    a.metrics.cmjHeightCm || 'N/A',
    a.metrics.yoyoIr1Meters || 'N/A',
    a.metrics.speedOrVelocityKmph || 'N/A',
    `"${a.achievements.join('; ').replace(/"/g, '""')}"`,
    `"${a.guardianOrCoachContact.replace(/"/g, '""')}"`,
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
}
