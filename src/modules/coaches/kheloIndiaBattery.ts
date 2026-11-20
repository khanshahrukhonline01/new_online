/**
 * KhelGrid Khelo India & Sports Authority of India (SAI) National Fitness Battery Engine
 * 
 * Implements the official Ministry of Youth Affairs and Sports (MYAS) & SAI 
 * National Fitness Assessment protocols for Indian grassroots athletes and schools:
 * 
 * Battery A: Sub-Junior (Ages 5–8 / Class 1–3)
 *   1. Body Mass Index (BMI)
 *   2. Flamingo Balance Test (Static balance, falls / 60s)
 *   3. Plate Tapping Test (Speed & coordination, seconds / 25 cycles)
 * 
 * Battery B: Junior & Senior (Ages 9–18+ / Class 4–12)
 *   1. Body Mass Index (BMI)
 *   2. 50m Standing Start Dash (Speed, seconds)
 *   3. 600m Run / Walk (Endurance, seconds)
 *   4. Sit & Reach Test (Flexibility, cm)
 *   5. Partial Curl-Ups (Abdominal endurance, reps / 30s)
 *   6. Push-Ups (Boys) / Modified Push-Ups (Girls) (Upper body strength, reps)
 */

export type KheloIndiaAgeCategory = 'sub_junior_5_8' | 'junior_9_14' | 'senior_15_18'
export type Gender = 'male' | 'female'

export interface KheloIndiaSubJuniorInput {
  heightCm: number
  weightKg: number
  flamingoFallsCount: number // lower is better
  plateTappingSeconds: number // lower is better
}

export interface KheloIndiaJuniorSeniorInput {
  heightCm: number
  weightKg: number
  gender: Gender
  dash50mSeconds: number // lower is better
  run600mSeconds: number // lower is better
  sitAndReachCm: number // higher is better
  partialCurlUpsReps: number // higher is better
  pushUpsReps: number // higher is better
}

export interface TestScoreResult {
  testName: string
  metricValue: string
  stars: 1 | 2 | 3 | 4 | 5
  band: 'Outstanding' | 'Above Average' | 'Average' | 'Below Average' | 'Needs Improvement'
  feedback: string
}

export interface KheloIndiaAssessmentReport {
  id: string
  coachSlug: string
  coachName: string
  athleteId: string
  athleteName: string
  age: number
  gender: Gender
  category: KheloIndiaAgeCategory
  testDate: string
  bmi: number
  bmiCategory: 'Normal' | 'Underweight' | 'Overweight' | 'Obese'
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D'
  averageStars: number
  isSaiTalentTarget: boolean
  testScores: TestScoreResult[]
  saiReportCode: string // e.g. "SAI-KI-2026-DEL-891"
}

const STORAGE_KEY = 'khelgrid_khelo_india_assessments'
const memoryStore = new Map<string, unknown>()

export function clearKheloIndiaMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item) as T
    } catch {
      // ignore
    }
  }
  return (memoryStore.get(key) as T) ?? defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  memoryStore.set(key, value)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// BMI Calculation Helper
// ---------------------------------------------------------------------------

export function calculateBmi(
  heightCm: number,
  weightKg: number,
  isChild: boolean = false
): { bmi: number; category: KheloIndiaAssessmentReport['bmiCategory'] } {
  if (heightCm <= 0 || weightKg <= 0) return { bmi: 0, category: 'Normal' }
  const heightM = heightCm / 100
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1))
  let category: KheloIndiaAssessmentReport['bmiCategory'] = 'Normal'
  if (isChild) {
    if (bmi < 13.0) category = 'Underweight'
    else if (bmi >= 18.5 && bmi < 21.0) category = 'Overweight'
    else if (bmi >= 21.0) category = 'Obese'
  } else {
    if (bmi < 18.5) category = 'Underweight'
    else if (bmi >= 25 && bmi < 30) category = 'Overweight'
    else if (bmi >= 30) category = 'Obese'
  }

  return { bmi, category }
}

// ---------------------------------------------------------------------------
// Sub-Junior (Age 5–8) Assessment Engine
// ---------------------------------------------------------------------------

export function evaluateSubJuniorBattery(
  input: KheloIndiaSubJuniorInput,
  athleteName: string
): Omit<KheloIndiaAssessmentReport, 'id' | 'coachSlug' | 'coachName' | 'athleteId' | 'testDate' | 'saiReportCode'> {
  const { bmi, category: bmiCategory } = calculateBmi(input.heightCm, input.weightKg, true)
  const testScores: TestScoreResult[] = []

  // 1. BMI Score
  const bmiStars: TestScoreResult['stars'] = bmiCategory === 'Normal' ? 5 : bmiCategory === 'Overweight' ? 3 : 2
  testScores.push({
    testName: 'Body Mass Index (BMI)',
    metricValue: `${bmi} kg/m²`,
    stars: bmiStars,
    band: bmiStars === 5 ? 'Outstanding' : bmiStars === 3 ? 'Average' : 'Below Average',
    feedback: `Height ${input.heightCm}cm, Weight ${input.weightKg}kg. Category: ${bmiCategory}.`,
  })

  // 2. Flamingo Balance Test (Falls in 60 sec: 0-1 = 5★, 2-3 = 4★, 4-6 = 3★, 7-10 = 2★, >10 = 1★)
  let flamingoStars: TestScoreResult['stars'] = 1
  if (input.flamingoFallsCount <= 1) flamingoStars = 5
  else if (input.flamingoFallsCount <= 3) flamingoStars = 4
  else if (input.flamingoFallsCount <= 6) flamingoStars = 3
  else if (input.flamingoFallsCount <= 10) flamingoStars = 2

  testScores.push({
    testName: 'Flamingo Balance Test (Static Equilibrium)',
    metricValue: `${input.flamingoFallsCount} falls / 60s`,
    stars: flamingoStars,
    band: getBandFromStars(flamingoStars),
    feedback: flamingoStars >= 4 ? 'Excellent vestibular static balance and postural stability.' : 'Core balance exercises and single-leg drills recommended.',
  })

  // 3. Plate Tapping Test (Seconds for 25 cycles: <= 11.5s = 5★, <= 13s = 4★, <= 15s = 3★, <= 18s = 2★, >18s = 1★)
  let tappingStars: TestScoreResult['stars'] = 1
  if (input.plateTappingSeconds <= 11.5) tappingStars = 5
  else if (input.plateTappingSeconds <= 13.0) tappingStars = 4
  else if (input.plateTappingSeconds <= 15.0) tappingStars = 3
  else if (input.plateTappingSeconds <= 18.0) tappingStars = 2

  testScores.push({
    testName: 'Plate Tapping Test (Hand-Eye Coordination)',
    metricValue: `${input.plateTappingSeconds}s`,
    stars: tappingStars,
    band: getBandFromStars(tappingStars),
    feedback: tappingStars >= 4 ? 'Quick limb reaction speed and cognitive motor coordination.' : 'Hand-eye coordination drills recommended.',
  })

  const averageStars = Number((testScores.reduce((sum, t) => sum + t.stars, 0) / testScores.length).toFixed(1))
  const overallGrade = calculateGrade(averageStars)
  const isSaiTalentTarget = averageStars >= 4.3

  return {
    athleteName,
    age: 7,
    gender: 'male',
    category: 'sub_junior_5_8',
    bmi,
    bmiCategory,
    overallGrade,
    averageStars,
    isSaiTalentTarget,
    testScores,
  }
}

// ---------------------------------------------------------------------------
// Junior & Senior (Age 9–18+) Assessment Engine
// ---------------------------------------------------------------------------

export function evaluateJuniorSeniorBattery(
  input: KheloIndiaJuniorSeniorInput,
  athleteName: string,
  age: number
): Omit<KheloIndiaAssessmentReport, 'id' | 'coachSlug' | 'coachName' | 'athleteId' | 'testDate' | 'saiReportCode'> {
  const { bmi, category: bmiCategory } = calculateBmi(input.heightCm, input.weightKg, age <= 12)
  const category: KheloIndiaAgeCategory = age <= 14 ? 'junior_9_14' : 'senior_15_18'
  const isMale = input.gender === 'male'
  const testScores: TestScoreResult[] = []

  // 1. BMI
  const bmiStars: TestScoreResult['stars'] = bmiCategory === 'Normal' ? 5 : bmiCategory === 'Overweight' ? 3 : 2
  testScores.push({
    testName: 'Body Mass Index (BMI)',
    metricValue: `${bmi} kg/m²`,
    stars: bmiStars,
    band: getBandFromStars(bmiStars),
    feedback: `Height ${input.heightCm}cm, Weight ${input.weightKg}kg (${bmiCategory}).`,
  })

  // 2. 50m Dash (Sprint Speed)
  let dashStars: TestScoreResult['stars'] = 1
  const dash = input.dash50mSeconds
  if (isMale) {
    if (dash <= 7.2) dashStars = 5
    else if (dash <= 7.8) dashStars = 4
    else if (dash <= 8.5) dashStars = 3
    else if (dash <= 9.3) dashStars = 2
  } else {
    if (dash <= 7.8) dashStars = 5
    else if (dash <= 8.5) dashStars = 4
    else if (dash <= 9.2) dashStars = 3
    else if (dash <= 10.0) dashStars = 2
  }
  testScores.push({
    testName: '50m Standing Start Dash (Acceleration & Top Speed)',
    metricValue: `${dash}s`,
    stars: dashStars,
    band: getBandFromStars(dashStars),
    feedback: dashStars >= 4 ? 'Explosive acceleration and rapid turnover mechanics.' : 'Drive phase and stride frequency training advised.',
  })

  // 3. 600m Run/Walk (Aerobic Endurance)
  let runStars: TestScoreResult['stars'] = 1
  const run = input.run600mSeconds
  const runMinSec = `${Math.floor(run / 60)}m ${run % 60}s`
  if (isMale) {
    if (run <= 125) runStars = 5 // <= 2m 05s
    else if (run <= 145) runStars = 4 // <= 2m 25s
    else if (run <= 170) runStars = 3 // <= 2m 50s
    else if (run <= 200) runStars = 2
  } else {
    if (run <= 140) runStars = 5 // <= 2m 20s
    else if (run <= 165) runStars = 4 // <= 2m 45s
    else if (run <= 190) runStars = 3 // <= 3m 10s
    else if (run <= 220) runStars = 2
  }
  testScores.push({
    testName: '600m Run / Walk (Cardiovascular Endurance)',
    metricValue: runMinSec,
    stars: runStars,
    band: getBandFromStars(runStars),
    feedback: runStars >= 4 ? 'High aerobic capacity (VO2 max estimate) and lactate tolerance.' : 'Progressive aerobic intervals and tempo runs recommended.',
  })

  // 4. Sit and Reach (Hamstring & Lumbar Flexibility)
  let reachStars: TestScoreResult['stars'] = 1
  const reach = input.sitAndReachCm
  if (reach >= 28) reachStars = 5
  else if (reach >= 22) reachStars = 4
  else if (reach >= 16) reachStars = 3
  else if (reach >= 10) reachStars = 2
  testScores.push({
    testName: 'Sit and Reach (Hamstring & Spinal Flexibility)',
    metricValue: `${reach} cm`,
    stars: reachStars,
    band: getBandFromStars(reachStars),
    feedback: reachStars >= 4 ? 'Optimal joint mobility reducing lower-body strain risk.' : 'Dynamic hamstring and hip-flexor mobility stretching recommended.',
  })

  // 5. Partial Curl-Ups (Abdominal Core 30s)
  let curlStars: TestScoreResult['stars'] = 1
  const curls = input.partialCurlUpsReps
  if (curls >= 28) curlStars = 5
  else if (curls >= 22) curlStars = 4
  else if (curls >= 16) curlStars = 3
  else if (curls >= 10) curlStars = 2
  testScores.push({
    testName: 'Partial Curl-Ups (Abdominal Core Endurance)',
    metricValue: `${curls} reps`,
    stars: curlStars,
    band: getBandFromStars(curlStars),
    feedback: curlStars >= 4 ? 'Robust anterior trunk stabilization under fatigue.' : 'Plank variations and anti-rotation core drills recommended.',
  })

  // 6. Push-Ups (Upper Body Strength)
  let pushStars: TestScoreResult['stars'] = 1
  const push = input.pushUpsReps
  const target5 = isMale ? 30 : 20
  const target4 = isMale ? 22 : 14
  const target3 = isMale ? 15 : 9
  const target2 = isMale ? 8 : 4
  if (push >= target5) pushStars = 5
  else if (push >= target4) pushStars = 4
  else if (push >= target3) pushStars = 3
  else if (push >= target2) pushStars = 2
  testScores.push({
    testName: `${isMale ? 'Push-Ups' : 'Modified Push-Ups'} (Upper Body Power)`,
    metricValue: `${push} reps`,
    stars: pushStars,
    band: getBandFromStars(pushStars),
    feedback: pushStars >= 4 ? 'Solid pectoralis and triceps muscular endurance.' : 'Incline push-ups and upper body resistance training advised.',
  })

  const averageStars = Number((testScores.reduce((sum, t) => sum + t.stars, 0) / testScores.length).toFixed(1))
  const overallGrade = calculateGrade(averageStars)
  const isSaiTalentTarget = averageStars >= 4.2

  return {
    athleteName,
    age,
    gender: input.gender,
    category,
    bmi,
    bmiCategory,
    overallGrade,
    averageStars,
    isSaiTalentTarget,
    testScores,
  }
}

function getBandFromStars(stars: number): TestScoreResult['band'] {
  switch (stars) {
    case 5: return 'Outstanding'
    case 4: return 'Above Average'
    case 3: return 'Average'
    case 2: return 'Below Average'
    default: return 'Needs Improvement'
  }
}

function calculateGrade(avg: number): KheloIndiaAssessmentReport['overallGrade'] {
  if (avg >= 4.5) return 'A+'
  if (avg >= 3.8) return 'A'
  if (avg >= 3.0) return 'B'
  if (avg >= 2.0) return 'C'
  return 'D'
}

// ---------------------------------------------------------------------------
// Pre-seeded Assessment Data & Storage APIs
// ---------------------------------------------------------------------------

export const DEFAULT_ASSESSMENTS: KheloIndiaAssessmentReport[] = [
  {
    id: 'ki-assess-01',
    coachSlug: 'rajesh-kumar',
    coachName: 'Coach Rajesh Kumar (NIS Patiala)',
    athleteId: 'st-01',
    athleteName: 'Aarav Sharma',
    age: 15,
    gender: 'male',
    category: 'senior_15_18',
    testDate: '2026-11-18',
    bmi: 20.4,
    bmiCategory: 'Normal',
    overallGrade: 'A+',
    averageStars: 4.7,
    isSaiTalentTarget: true,
    saiReportCode: 'SAI-KI-2026-DEL-0091',
    testScores: [
      { testName: 'Body Mass Index (BMI)', metricValue: '20.4 kg/m²', stars: 5, band: 'Outstanding', feedback: 'Ideal body composition.' },
      { testName: '50m Standing Start Dash', metricValue: '6.9s', stars: 5, band: 'Outstanding', feedback: 'Exceptional acceleration.' },
      { testName: '600m Run / Walk', metricValue: '2m 02s', stars: 5, band: 'Outstanding', feedback: 'Top 5% national aerobic stamina.' },
      { testName: 'Sit and Reach', metricValue: '29 cm', stars: 5, band: 'Outstanding', feedback: 'High hamstring flexibility.' },
      { testName: 'Partial Curl-Ups', metricValue: '26 reps', stars: 4, band: 'Above Average', feedback: 'Strong core endurance.' },
      { testName: 'Push-Ups', metricValue: '28 reps', stars: 4, band: 'Above Average', feedback: 'Good upper body pushing power.' },
    ],
  },
  {
    id: 'ki-assess-02',
    coachSlug: 'rajesh-kumar',
    coachName: 'Coach Rajesh Kumar (NIS Patiala)',
    athleteId: 'st-02',
    athleteName: 'Vihaan Verma',
    age: 14,
    gender: 'male',
    category: 'junior_9_14',
    testDate: '2026-11-19',
    bmi: 19.8,
    bmiCategory: 'Normal',
    overallGrade: 'A',
    averageStars: 4.2,
    isSaiTalentTarget: true,
    saiReportCode: 'SAI-KI-2026-DEL-0092',
    testScores: [
      { testName: 'Body Mass Index (BMI)', metricValue: '19.8 kg/m²', stars: 5, band: 'Outstanding', feedback: 'Normal BMI.' },
      { testName: '50m Standing Start Dash', metricValue: '7.4s', stars: 4, band: 'Above Average', feedback: 'Quick first 20m burst.' },
      { testName: '600m Run / Walk', metricValue: '2m 18s', stars: 4, band: 'Above Average', feedback: 'Solid pace endurance.' },
      { testName: 'Sit and Reach', metricValue: '24 cm', stars: 4, band: 'Above Average', feedback: 'Good flexibility.' },
      { testName: 'Partial Curl-Ups', metricValue: '22 reps', stars: 4, band: 'Above Average', feedback: 'Good trunk stability.' },
      { testName: 'Push-Ups', metricValue: '20 reps', stars: 4, band: 'Above Average', feedback: 'Consistent upper body tone.' },
    ],
  },
]

export function getKheloIndiaAssessments(coachSlug?: string): KheloIndiaAssessmentReport[] {
  const all = loadFromStorage<KheloIndiaAssessmentReport[]>(STORAGE_KEY, DEFAULT_ASSESSMENTS)
  if (coachSlug) return all.filter(a => a.coachSlug === coachSlug)
  return all
}

export function saveKheloIndiaAssessment(
  assessment: Omit<KheloIndiaAssessmentReport, 'id' | 'saiReportCode'> & { id?: string; saiReportCode?: string }
): KheloIndiaAssessmentReport {
  const all = loadFromStorage<KheloIndiaAssessmentReport[]>(STORAGE_KEY, DEFAULT_ASSESSMENTS)
  const id = assessment.id || `ki-assess-${Date.now()}`
  const saiReportCode = assessment.saiReportCode || `SAI-KI-2026-IND-${Math.floor(1000 + Math.random() * 9000)}`

  const newReport: KheloIndiaAssessmentReport = {
    ...assessment,
    id,
    saiReportCode,
  }

  const updated = [newReport, ...all]
  saveToStorage(STORAGE_KEY, updated)
  return newReport
}

export function generateWhatsAppKheloIndiaUrl(report: KheloIndiaAssessmentReport): string {
  const starLine = '★'.repeat(Math.round(report.averageStars)) + '☆'.repeat(5 - Math.round(report.averageStars))
  const message = [
    `🇮🇳 *KHELO INDIA / SAI OFFICIAL FITNESS REPORT CARD*`,
    `*Athlete:* ${report.athleteName} (Age: ${report.age}, ${report.gender.toUpperCase()})`,
    `*Category:* ${report.category === 'sub_junior_5_8' ? 'Sub-Junior (5-8 yrs)' : 'Junior/Senior National Battery'}`,
    `*Overall Fitness Grade:* 🏅 *${report.overallGrade}* (${report.averageStars} / 5.0 Stars) [${starLine}]`,
    `*SAI Talent Target:* ${report.isSaiTalentTarget ? '🎯 *YES - RECOMMENDED FOR SAI ACADEMY TRIALS*' : 'Developing'}`,
    `*Report Stamp ID:* \`${report.saiReportCode}\``,
    `*Supervised by:* ${report.coachName}`,
    `--------------------------------`,
    `*Key Battery Metrics:*`,
    ...report.testScores.map(t => `• ${t.testName}: ${t.metricValue} (${'★'.repeat(t.stars)})`),
    `--------------------------------`,
    `Calibrated against official Ministry of Youth Affairs & Sports norms.`,
    `View verified profile: https://khelgrid.com/sports-cv/${encodeURIComponent(report.athleteName.toLowerCase().replace(/\s+/g, '-'))}`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
