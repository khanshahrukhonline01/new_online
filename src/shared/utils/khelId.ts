import type { AthleteProfile, CvGenerationRecord } from '../domain'

/**
 * Standard Indian State Code Map.
 */
export const INDIAN_STATE_CODES: Record<string, string> = {
  'delhi': 'DEL',
  'nct of delhi': 'DEL',
  'maharashtra': 'MH',
  'telangana': 'TG',
  'haryana': 'HR',
  'punjab': 'PB',
  'uttar pradesh': 'UP',
  'karnataka': 'KA',
  'tamil nadu': 'TN',
  'kerala': 'KL',
  'rajasthan': 'RJ',
  'gujarat': 'GJ',
  'madhya pradesh': 'MP',
  'west bengal': 'WB',
  'bihar': 'BR',
  'odisha': 'OD',
  'andhra pradesh': 'AP',
  'assam': 'AS',
  'jharkhand': 'JH',
  'chhattisgarh': 'CG',
  'uttarakhand': 'UK',
  'himachal pradesh': 'HP',
  'goa': 'GA',
  'chandigarh': 'CH',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
}

/**
 * Generates an official, permanent Digital Khel ID (खेल आईडी)
 * Format: KG-2026-{STATE_CODE}-{SERIAL}
 * e.g. KG-2026-DEL-48291
 */
export function generateKhelId(profile: { state?: string; username: string; khelId?: string }): string {
  if (profile.khelId && profile.khelId.startsWith('KG-')) {
    return profile.khelId
  }
  const rawState = (profile.state || '').trim().toLowerCase()
  const stateCode = INDIAN_STATE_CODES[rawState] || 'IND'

  let hash = 0
  for (let i = 0; i < profile.username.length; i++) {
    hash = (hash << 5) - hash + profile.username.charCodeAt(i)
    hash |= 0
  }
  const serial = Math.abs(hash % 90000) + 10000
  return `KG-2026-${stateCode}-${serial}`
}

/**
 * Calculates a dynamic, realistic athletic rating (OVR 75 - 98)
 * based on empirical fitness benchmarks, experience, and verified achievements.
 */
export function calculateOverallRating(profile: AthleteProfile): number {
  let score = 82 // Baseline rating for verified grassroots athletes
  if (profile.fitnessBenchmarks?.percentileAvg) {
    score = Math.round(75 + profile.fitnessBenchmarks.percentileAvg * 0.22)
  } else if (profile.fitnessBenchmarks?.yoyoIr1Meters) {
    const yoyo = profile.fitnessBenchmarks.yoyoIr1Meters
    if (yoyo >= 2000) score += 9
    else if (yoyo >= 1700) score += 6
    else if (yoyo >= 1400) score += 3
  }
  const achBonus = Math.min(6, (profile.achievements || []).length * 2)
  const clipsBonus = Math.min(3, (profile.videoClips || []).length * 1.5)
  return Math.min(98, Math.max(76, Math.round(score + achBonus + clipsBonus)))
}

/**
 * Computes an empirical combine percentile and athletic tier
 * based on Yo-Yo IR1, 30m sprint, and vertical jump (CMJ).
 */
export function computeFitnessTier(benchmarks: {
  yoyoIr1Meters?: number
  sprint30mSeconds?: number
  cmjHeightCm?: number
}): { tier: string; percentileAvg: number } {
  let totalPercentile = 0
  let count = 0

  if (benchmarks.yoyoIr1Meters && benchmarks.yoyoIr1Meters > 0) {
    const p = Math.min(99, Math.max(30, Math.round(((benchmarks.yoyoIr1Meters - 1000) / 1200) * 60 + 40)))
    totalPercentile += p
    count++
  }
  if (benchmarks.sprint30mSeconds && benchmarks.sprint30mSeconds > 0) {
    const p = Math.min(99, Math.max(30, Math.round((4.6 - benchmarks.sprint30mSeconds) * 70 + 45)))
    totalPercentile += p
    count++
  }
  if (benchmarks.cmjHeightCm && benchmarks.cmjHeightCm > 0) {
    const p = Math.min(99, Math.max(30, Math.round(((benchmarks.cmjHeightCm - 30) / 35) * 60 + 40)))
    totalPercentile += p
    count++
  }

  const avg = count > 0 ? Math.round(totalPercentile / count) : 80
  let tier = 'Grassroots Prospect'
  if (avg >= 85) tier = 'Tier 1 — Elite National Candidate'
  else if (avg >= 70) tier = 'Tier 2 — State / Zonal High Performance'
  else if (avg >= 55) tier = 'Tier 3 — District / Academy Competitive'

  return { tier, percentileAvg: avg }
}

/**
 * Storage keys for official dossier generation metadata and audit history.
 */
export const DOSSIER_META_STORAGE_KEY = 'khelgrid_cv_generation_meta_v1'
export const DOSSIER_HISTORY_STORAGE_KEY = 'khelgrid_cv_generation_history_v1'

let memoryStorage: Record<string, string> = {}

function getSafeStorage(): {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return {
    getItem: (k: string) => memoryStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      memoryStorage[k] = v
    },
    removeItem: (k: string) => {
      delete memoryStorage[k]
    },
  }
}

/**
 * Formats a Date or ISO timestamp into Indian Standard Time (IST).
 * e.g. "15 Nov 2026, 02:40 PM IST"
 */
export function formatIndianDateTime(dateOrIso?: Date | string): string {
  const d = dateOrIso ? (typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso) : new Date()
  if (isNaN(d.getTime())) return '15 Nov 2026, 02:40 PM IST'

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    return `${formatter.format(d)} IST`
  } catch {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(d.getDate()).padStart(2, '0')
    const mon = months[d.getMonth()]
    const yr = d.getFullYear()
    let hr = d.getHours()
    const min = String(d.getMinutes()).padStart(2, '0')
    const ampm = hr >= 12 ? 'PM' : 'AM'
    hr = hr % 12 || 12
    return `${day} ${mon} ${yr}, ${String(hr).padStart(2, '0')}:${min} ${ampm} IST`
  }
}

/**
 * Generates an official Selection Trial Dossier Reference ID.
 * Format: KG-DOS-YYYYMMDD-{CODE}
 * e.g. KG-DOS-20261115-4A9B
 */
export function generateDossierReference(params?: {
  date?: Date | string
  revision?: number
  seed?: string
}): string {
  const d = params?.date
    ? typeof params.date === 'string'
      ? new Date(params.date)
      : params.date
    : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dateStr = `${y}${m}${day}`

  let rand = ''
  if (params?.seed) {
    let hash = 0
    for (let i = 0; i < params.seed.length; i++) {
      hash = (hash << 5) - hash + params.seed.charCodeAt(i)
      hash |= 0
    }
    rand = Math.abs(hash).toString(16).slice(0, 4).toUpperCase().padStart(4, '7A')
  } else {
    rand = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0')
  }

  return `KG-DOS-${dateStr}-${rand}`
}

/**
 * Creates a fresh, timestamped dossier generation record.
 * Automatically increments revision number and captures exact current time.
 */
export function createFreshGenerationRecord(params: {
  athleteName: string
  khelId: string
  sport: string
  previousRevision?: number
}): CvGenerationRecord {
  const now = new Date()
  const revisionNumber = (params.previousRevision || 0) + 1
  const referenceId = generateDossierReference({
    date: now,
    revision: revisionNumber,
    seed: `${params.khelId}-${revisionNumber}-${now.getTime()}`,
  })
  const formattedDateTime = formatIndianDateTime(now)

  const currentYear = now.getFullYear()
  const nextYear = currentYear + 1
  const season = `${currentYear}–${nextYear}`

  return {
    referenceId,
    revisionNumber,
    generatedAt: now.toISOString(),
    formattedDateTime,
    season,
    khelId: params.khelId,
    athleteName: params.athleteName || 'Athlete',
    sport: params.sport || 'Sports Candidate',
  }
}

/**
 * Retrieves the currently active saved generation record.
 */
export function getStoredGenerationRecord(): CvGenerationRecord | null {
  try {
    const raw = getSafeStorage().getItem(DOSSIER_META_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CvGenerationRecord
  } catch {
    // Ignore
  }
  return null
}

/**
 * Persists a generation record and prepends to the audit history list.
 */
export function saveGenerationRecord(record: CvGenerationRecord): void {
  try {
    const storage = getSafeStorage()
    storage.setItem(DOSSIER_META_STORAGE_KEY, JSON.stringify(record))

    const existingHistory = getGenerationHistory()
    const filtered = existingHistory.filter(h => h.referenceId !== record.referenceId)
    const nextHistory = [record, ...filtered].slice(0, 20)
    storage.setItem(DOSSIER_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))
  } catch {
    // Ignore quota limits
  }
}

/**
 * Retrieves all historical generation records.
 */
export function getGenerationHistory(): CvGenerationRecord[] {
  try {
    const raw = getSafeStorage().getItem(DOSSIER_HISTORY_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CvGenerationRecord[]
  } catch {
    // Ignore
  }
  return []
}

/**
 * Clears all stored generation records and history.
 */
export function clearGenerationRecords(): void {
  memoryStorage = {}
  try {
    const storage = getSafeStorage()
    storage.removeItem(DOSSIER_META_STORAGE_KEY)
    storage.removeItem(DOSSIER_HISTORY_STORAGE_KEY)
  } catch {
    // Ignore
  }
}

