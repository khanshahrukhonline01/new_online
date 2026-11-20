import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearKheloIndiaMemoryStore,
  calculateBmi,
  evaluateSubJuniorBattery,
  evaluateJuniorSeniorBattery,
  getKheloIndiaAssessments,
  saveKheloIndiaAssessment,
  generateWhatsAppKheloIndiaUrl,
} from './kheloIndiaBattery'

describe('Khelo India & SAI National Fitness Battery Engine', () => {
  beforeEach(() => {
    clearKheloIndiaMemoryStore()
  })

  it('correctly calculates BMI and maps to standard categories', () => {
    const resNormal = calculateBmi(170, 60)
    expect(resNormal.bmi).toBe(20.8)
    expect(resNormal.category).toBe('Normal')

    const resOverweight = calculateBmi(160, 70)
    expect(resOverweight.bmi).toBe(27.3)
    expect(resOverweight.category).toBe('Overweight')
  })

  it('evaluates Sub-Junior battery (Flamingo balance & Plate tapping)', () => {
    const report = evaluateSubJuniorBattery(
      {
        heightCm: 120,
        weightKg: 22,
        flamingoFallsCount: 1, // Outstanding
        plateTappingSeconds: 11.2, // Outstanding
      },
      'Arjun Das'
    )

    expect(report.athleteName).toBe('Arjun Das')
    expect(report.category).toBe('sub_junior_5_8')
    expect(report.overallGrade).toBe('A+')
    expect(report.isSaiTalentTarget).toBe(true)
    expect(report.testScores.length).toBe(3)
  })

  it('evaluates Junior/Senior battery with 6 official SAI parameters', () => {
    const report = evaluateJuniorSeniorBattery(
      {
        heightCm: 172,
        weightKg: 62,
        gender: 'male',
        dash50mSeconds: 7.0, // 5 stars
        run600mSeconds: 122, // 5 stars
        sitAndReachCm: 28, // 5 stars
        partialCurlUpsReps: 26, // 4 stars
        pushUpsReps: 28, // 4 stars
      },
      'Aarav Sharma',
      15
    )

    expect(report.overallGrade).toBe('A+')
    expect(report.averageStars).toBeGreaterThanOrEqual(4.5)
    expect(report.isSaiTalentTarget).toBe(true)
    expect(report.testScores.find(t => t.testName.includes('50m'))?.stars).toBe(5)
  })

  it('saves and retrieves Khelo India assessments with custom report codes', () => {
    const initial = getKheloIndiaAssessments('rajesh-kumar')
    expect(initial.length).toBeGreaterThan(0)

    const saved = saveKheloIndiaAssessment({
      coachSlug: 'rajesh-kumar',
      coachName: 'Coach Rajesh Kumar',
      athleteId: 'st-99',
      athleteName: 'Devansh Verma',
      age: 16,
      gender: 'male',
      category: 'senior_15_18',
      testDate: '2026-11-20',
      bmi: 21.0,
      bmiCategory: 'Normal',
      overallGrade: 'A',
      averageStars: 4.1,
      isSaiTalentTarget: false,
      testScores: [],
    })

    expect(saved.id).toBeDefined()
    expect(saved.saiReportCode).toContain('SAI-KI-2026')
    const updated = getKheloIndiaAssessments('rajesh-kumar')
    expect(updated.some(a => a.athleteName === 'Devansh Verma')).toBe(true)
  })

  it('generates pre-formatted WhatsApp share link with SAI credentials', () => {
    const report = getKheloIndiaAssessments()[0]
    const url = generateWhatsAppKheloIndiaUrl(report)
    expect(url).toContain('wa.me/?text=')
    expect(url).toContain(encodeURIComponent(report.athleteName))
  })
})
