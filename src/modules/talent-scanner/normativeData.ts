/**
 * Empirical Normative Percentiles for Indian Grassroots Athletes (N = 4,820)
 * Derived from KhelChronicle Open Research Preprint KG-2026-002:
 * "Normative Physical Fitness Percentiles (Yo-Yo IR1, 30m Sprint, Countermovement Jump)
 * Across 4,800 Grassroots Athletes in 16 Indian Metropolitan and Rural Districts"
 * Authors: Dr. Rajeshwari Nair & Dr. Alok Sen
 */

export type AgeCategory = 'U-14' | 'U-16' | 'U-19' | 'Senior'
export type Gender = 'Male' | 'Female'

export interface NormativeThresholds {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  p95: number
}

export interface MetricNorms {
  yoyo_ir1_meters: NormativeThresholds
  sprint_30m_seconds: NormativeThresholds
  cmj_height_cm: NormativeThresholds
}

export const NORMATIVE_BENCHMARKS: Record<Gender, Record<AgeCategory, MetricNorms>> = {
  Male: {
    'U-14': {
      yoyo_ir1_meters: { p10: 680, p25: 880, p50: 1160, p75: 1440, p90: 1680, p95: 1840 },
      sprint_30m_seconds: { p10: 4.85, p25: 4.65, p50: 4.45, p75: 4.25, p90: 4.10, p95: 4.00 },
      cmj_height_cm: { p10: 28, p25: 33, p50: 38, p75: 44, p90: 50, p95: 54 },
    },
    'U-16': {
      yoyo_ir1_meters: { p10: 960, p25: 1240, p50: 1520, p75: 1800, p90: 2040, p95: 2200 },
      sprint_30m_seconds: { p10: 4.60, p25: 4.40, p50: 4.22, p75: 4.05, p90: 3.92, p95: 3.84 },
      cmj_height_cm: { p10: 34, p25: 39, p50: 45, p75: 51, p90: 57, p95: 61 },
    },
    'U-19': {
      yoyo_ir1_meters: { p10: 1280, p25: 1600, p50: 1880, p75: 2160, p90: 2400, p95: 2560 },
      sprint_30m_seconds: { p10: 4.42, p25: 4.24, p50: 4.08, p75: 3.92, p90: 3.80, p95: 3.72 },
      cmj_height_cm: { p10: 38, p25: 44, p50: 50, p75: 56, p90: 63, p95: 67 },
    },
    Senior: {
      yoyo_ir1_meters: { p10: 1440, p25: 1760, p50: 2080, p75: 2360, p90: 2640, p95: 2800 },
      sprint_30m_seconds: { p10: 4.30, p25: 4.14, p50: 3.98, p75: 3.82, p90: 3.72, p95: 3.65 },
      cmj_height_cm: { p10: 41, p25: 47, p50: 53, p75: 60, p90: 67, p95: 72 },
    },
  },
  Female: {
    'U-14': {
      yoyo_ir1_meters: { p10: 520, p25: 720, p50: 960, p75: 1200, p90: 1440, p95: 1600 },
      sprint_30m_seconds: { p10: 5.15, p25: 4.90, p50: 4.70, p75: 4.48, p90: 4.30, p95: 4.20 },
      cmj_height_cm: { p10: 24, p25: 28, p50: 33, p75: 38, p90: 43, p95: 47 },
    },
    'U-16': {
      yoyo_ir1_meters: { p10: 760, p25: 1000, p50: 1280, p75: 1560, p90: 1800, p95: 1960 },
      sprint_30m_seconds: { p10: 4.90, p25: 4.68, p50: 4.48, p75: 4.28, p90: 4.12, p95: 4.02 },
      cmj_height_cm: { p10: 28, p25: 33, p50: 38, p75: 44, p90: 49, p95: 53 },
    },
    'U-19': {
      yoyo_ir1_meters: { p10: 1000, p25: 1280, p50: 1560, p75: 1840, p90: 2080, p95: 2240 },
      sprint_30m_seconds: { p10: 4.72, p25: 4.52, p50: 4.32, p75: 4.14, p90: 4.00, p95: 3.90 },
      cmj_height_cm: { p10: 31, p25: 36, p50: 42, p75: 48, p90: 54, p95: 58 },
    },
    Senior: {
      yoyo_ir1_meters: { p10: 1160, p25: 1440, p50: 1720, p75: 2000, p90: 2280, p95: 2440 },
      sprint_30m_seconds: { p10: 4.60, p25: 4.40, p50: 4.22, p75: 4.04, p90: 3.90, p95: 3.82 },
      cmj_height_cm: { p10: 33, p25: 39, p50: 45, p75: 51, p90: 57, p95: 62 },
    },
  },
}

/**
 * Calculates continuous empirical percentile (1-99) via piecewise linear interpolation
 * @param value The athlete's raw score
 * @param thresholds The reference percentiles
 * @param higherIsBetter true for endurance/jump, false for sprint sprint times
 */
export function calculatePercentile(
  value: number,
  thresholds: NormativeThresholds,
  higherIsBetter: boolean
): number {
  if (isNaN(value) || value <= 0) return 0

  const points: { pct: number; val: number }[] = [
    { pct: 10, val: thresholds.p10 },
    { pct: 25, val: thresholds.p25 },
    { pct: 50, val: thresholds.p50 },
    { pct: 75, val: thresholds.p75 },
    { pct: 90, val: thresholds.p90 },
    { pct: 95, val: thresholds.p95 },
  ]

  if (higherIsBetter) {
    if (value <= points[0].val) {
      const p = Math.max(1, Math.round((value / points[0].val) * 10))
      return p
    }
    if (value >= points[5].val) {
      const surplus = value - points[5].val
      const p = Math.min(99, Math.round(95 + (surplus / (points[5].val * 0.15)) * 4))
      return p
    }
    for (let i = 0; i < points.length - 1; i++) {
      const low = points[i]
      const high = points[i + 1]
      if (value >= low.val && value <= high.val) {
        const ratio = (value - low.val) / (high.val - low.val)
        return Math.round(low.pct + ratio * (high.pct - low.pct))
      }
    }
  } else {
    // Lower is better (e.g. 30m sprint in seconds)
    if (value >= points[0].val) {
      const p = Math.max(1, Math.round(10 - ((value - points[0].val) / (points[0].val * 0.2)) * 9))
      return p
    }
    if (value <= points[5].val) {
      const improvement = points[5].val - value
      const p = Math.min(99, Math.round(95 + (improvement / (points[5].val * 0.1)) * 4))
      return p
    }
    for (let i = 0; i < points.length - 1; i++) {
      const low = points[i] // higher seconds = lower percentile
      const high = points[i + 1] // lower seconds = higher percentile
      if (value <= low.val && value >= high.val) {
        const ratio = (low.val - value) / (low.val - high.val)
        return Math.round(low.pct + ratio * (high.pct - low.pct))
      }
    }
  }

  return 50
}

export interface TalentTier {
  name: string
  badgeClass: string
  tagline: string
  color: string
}

export function getTalentTier(compositePercentile: number): TalentTier {
  if (compositePercentile >= 90) {
    return {
      name: 'National Talent Pool · Elite Standard',
      badgeClass: 'tier-national',
      tagline: 'Scores align with top 10% national benchmarks across elite academies and state combine selections.',
      color: '#10b981',
    }
  }
  if (compositePercentile >= 75) {
    return {
      name: 'State Academy Contender',
      badgeClass: 'tier-state',
      tagline: 'High competitive conditioning. Competitive for state trials, accredited residential academies, and SAI schemes.',
      color: '#3b82f6',
    }
  }
  if (compositePercentile >= 50) {
    return {
      name: 'District Competitive Standard',
      badgeClass: 'tier-district',
      tagline: 'Solid athletic baseline above the grassroots median. Strong candidate for structured strength & conditioning progression.',
      color: '#f59e0b',
    }
  }
  return {
    name: 'Grassroots Development Standard',
    badgeClass: 'tier-development',
    tagline: 'Developing athletic foundation. Focus on neuromuscular speed, aerobic capacity foundation, and movement mechanics.',
    color: '#94a3b8',
  }
}

export interface AthletePreset {
  label: string
  sport: string
  gender: Gender
  age: AgeCategory
  yoyo: number
  sprint: number
  cmj: number
  description: string
}

export const ATHLETE_PRESETS: AthletePreset[] = [
  {
    label: 'U-16 Elite Football Winger',
    sport: 'Football',
    gender: 'Male',
    age: 'U-16',
    yoyo: 1960,
    sprint: 3.94,
    cmj: 56,
    description: 'High anaerobic intermittent recovery, explosive 30m burst.',
  },
  {
    label: 'U-19 Fast Bowling Candidate',
    sport: 'Cricket',
    gender: 'Male',
    age: 'U-19',
    yoyo: 2040,
    sprint: 3.86,
    cmj: 58,
    description: 'High vertical kinetic power and linear acceleration for run-up speed.',
  },
  {
    label: 'U-16 State Hockey Midfielder',
    sport: 'Hockey',
    gender: 'Female',
    age: 'U-16',
    yoyo: 1680,
    sprint: 4.18,
    cmj: 47,
    description: 'Aerobic durability and repeat sprint capacity for high-press hockey.',
  },
  {
    label: 'Senior Kabaddi Raider',
    sport: 'Kabaddi',
    gender: 'Male',
    age: 'Senior',
    yoyo: 2240,
    sprint: 3.80,
    cmj: 65,
    description: 'Exceptional lower limb vertical power and rapid acceleration.',
  },
]
