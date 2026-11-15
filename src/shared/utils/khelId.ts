import type { AthleteProfile } from '../domain'

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
