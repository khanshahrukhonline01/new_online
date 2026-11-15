import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SportsToolsPage from './SportsToolsPage'
import {
  ALL_SPORTS_TOOLS,
  calculateTrialReadiness,
  calculateAgeEligibility,
  calculateVo2Max,
  calculateCalorieNeeds,
  calculateSprintSplits,
  calculateTurfSplit,
  calculateWeeklyLoad,
  calculateTravelBudget,
  matchScholarships,
  calculateMatchFeeRoi,
} from './toolsData'

describe('SportsToolsPage Component', () => {
  it('renders hero header, breadcrumb, KPI ribbon, and 14 tools indicator', () => {
    const html = renderToStaticMarkup(<SportsToolsPage />)

    expect(html).toContain('Athlete Tools, Calculators &amp; Trial Planners')
    expect(html).toContain('खिलाड़ियों, कोचों और ट्रायल आयोजकों के लिए आधुनिक स्पोर्ट्स टूल्स')
    expect(html).toContain('14+ Verified Athlete &amp; Coach Calculators')
    expect(html).toContain('14')
    expect(html).toContain('Interactive Tools')
    expect(html).toContain('BCCI / SAI')
    expect(html).toContain('Cut-off Calibrated')
  })

  it('renders category filter buttons and search input', () => {
    const html = renderToStaticMarkup(<SportsToolsPage />)

    expect(html).toContain('All Tools (14)')
    expect(html).toContain('Trial &amp; Scouting')
    expect(html).toContain('Fitness &amp; Science')
    expect(html).toContain('Organizer &amp; Match')
    expect(html).toContain('Search tools by name, sport, or keyword')
  })

  it('renders active tool workbench with Trial Readiness Score by default', () => {
    const html = renderToStaticMarkup(<SportsToolsPage />)

    expect(html).toContain('Trial Readiness Score')
    expect(html).toContain('ट्रायल तैयारी स्कोर')
    expect(html).toContain('TRIAL READINESS SCORE')
    expect(html).toContain('Scoring Breakdown')
    expect(html).toContain('Weekly Training Volume:')
    expect(html).toContain('Sleep Recovery:')
    expect(html).toContain('Selector &amp; Coach Action Plan')
  })

  it('renders initialToolSlug when specified (e.g. vo2-max-estimator)', () => {
    const html = renderToStaticMarkup(<SportsToolsPage initialToolSlug="vo2-max-estimator" />)

    expect(html).toContain('VO2 Max &amp; Aerobic Capacity')
    expect(html).toContain('ESTIMATED VO2 MAX')
    expect(html).toContain('Aerobic Benchmark Comparison')
    expect(html).toContain('National Percentile:')
  })

  it('renders all 14 tools in the catalogue cards grid', () => {
    const html = renderToStaticMarkup(<SportsToolsPage />)

    expect(html).toContain('Explore All 14 Sports Tools &amp; Calculators')
    for (const tool of ALL_SPORTS_TOOLS) {
      const escapedName = tool.name.replace(/&/g, '&amp;')
      expect(html).toContain(escapedName)
      expect(html).toContain(tool.hindiName)
    }
  })

  it('renders scientific federation integrity disclaimer in footer', () => {
    const html = renderToStaticMarkup(<SportsToolsPage />)

    expect(html).toContain('Grassroots Integrity &amp; Educational Guidance')
    expect(html).toContain('Sports Authority of India (SAI)')
    expect(html).toContain('Board of Control for Cricket in India (BCCI)')
  })
})

describe('Sports Performance Calculators Engine', () => {
  it('calculateTrialReadiness evaluates optimal vs fatigued profiles', () => {
    const optimal = calculateTrialReadiness({
      sessionsPerWeek: 6,
      sleepHours: 8.5,
      prDeltaPercent: 4,
      nutritionConsistency: 5,
      mentalConfidence: 5,
      sport: 'Cricket',
    })

    expect(optimal.score).toBeGreaterThanOrEqual(85)
    expect(optimal.tier).toBe('Peak Readiness')
    expect(optimal.tierClass).toBe('optimal')

    const fatigued = calculateTrialReadiness({
      sessionsPerWeek: 12,
      sleepHours: 5.0,
      prDeltaPercent: -4,
      nutritionConsistency: 2,
      mentalConfidence: 2,
      sport: 'Football',
    })

    expect(fatigued.score).toBeLessThan(70)
    expect(fatigued.recommendations.length).toBeGreaterThan(0)
  })

  it('calculateAgeEligibility accurately enforces BCCI September 1 cut-off', () => {
    // Born 15 July 2011 -> On Sept 1, 2026 athlete is 15 years, 1 month, 17 days
    const result = calculateAgeEligibility({
      birthDate: '2011-07-15',
      federation: 'bcci',
      seasonYear: 2026,
    })

    expect(result.exactAgeOnCutoff.years).toBe(15)
    expect(result.cutoffDateFormatted).toContain('September')

    const u14 = result.categories.find(c => c.category === 'U-14')
    const u16 = result.categories.find(c => c.category === 'U-16')
    const u19 = result.categories.find(c => c.category === 'U-19')

    expect(u14?.isEligible).toBe(false) // Over 14
    expect(u16?.isEligible).toBe(true)  // 15 years old -> eligible for U-16
    expect(u19?.isEligible).toBe(true)  // Eligible for U-19
  })

  it('calculateVo2Max computes Cooper 12-min formula accurately', () => {
    // 2800m Cooper run -> (2800 - 504.9) / 44.73 = 51.3 ml/kg/min
    const result = calculateVo2Max({
      method: 'cooper',
      cooperMeters: 2800,
      yoyoLevel: 16,
      yoyoShuttle: 4,
      run24Minutes: 9,
      run24Seconds: 30,
      gender: 'male',
      age: 18,
      sport: 'Football',
    })

    expect(result.vo2max).toBeCloseTo(51.3, 0.5)
    expect(result.rating).toBe('Excellent')
    expect(result.comparisonPercentile).toBeGreaterThanOrEqual(80)
  })

  it('calculateCalorieNeeds calculates TDEE and balanced macros', () => {
    const result = calculateCalorieNeeds({
      gender: 'male',
      age: 19,
      weightKg: 70,
      heightCm: 178,
      trainingHoursPerDay: 3.0,
      sportIntensity: 'high',
      goal: 'maintain',
    })

    expect(result.tdee).toBeGreaterThan(2400)
    expect(result.proteinGrams).toBeGreaterThan(100)
    expect(result.carbsGrams).toBeGreaterThan(250)
    expect(result.waterLiters).toBeGreaterThan(3.0)
  })

  it('calculateSprintSplits breaks down 100m into 4 acceleration phases', () => {
    const result = calculateSprintSplits({
      time100m: 11.2,
      reactionTime: 0.16,
    })

    expect(result.phases.length).toBe(4)
    expect(result.topSpeedKmH).toBeGreaterThan(30)
    expect(result.nationalComparison).toContain('podium')
  })

  it('calculateTurfSplit computes fair player shares and WhatsApp share copy', () => {
    const result = calculateTurfSplit({
      slotFee: 2000,
      lightAndBallFee: 400,
      otherExpenses: 0,
      playersCount: 10,
      subsCount: 2,
      subsDiscountPercent: 50,
      organizerUpiId: 'captain@upi',
      venueName: 'KhelGrid Arena',
    })

    // Total = 2400. Effective units = 10 + 2*0.5 = 11. Unit cost = 2400 / 11 = ~219
    expect(result.totalAmount).toBe(2400)
    expect(result.costPerFullPlayer).toBe(219)
    expect(result.costPerSub).toBe(110)
    expect(result.whatsappMessage).toContain('KhelGrid Arena')
    expect(result.whatsappMessage).toContain('captain@upi')
  })

  it('calculateWeeklyLoad flags high ACWR danger spikes', () => {
    const sweetSpot = calculateWeeklyLoad({
      pastWeek1: 12,
      pastWeek2: 12,
      pastWeek3: 13,
      pastWeek4: 13,
      plannedWeek: 14,
      daysToTrial: 7,
    })

    expect(sweetSpot.acwr).toBeCloseTo(1.12, 0.1)
    expect(sweetSpot.zone).toBe('Sweet Spot')

    const danger = calculateWeeklyLoad({
      pastWeek1: 8,
      pastWeek2: 8,
      pastWeek3: 9,
      pastWeek4: 9,
      plannedWeek: 18,
      daysToTrial: 3,
    })

    expect(danger.acwr).toBeGreaterThan(1.8)
    expect(danger.zone).toBe('High Injury Risk')
    expect(danger.taperAdvice).toContain('DANGER ZONE')
  })

  it('matchScholarships identifies SAI Khelo India and Railway quota qualifications', () => {
    const youthChampion = matchScholarships({
      age: 19,
      highestAchievement: 'khelo_india',
      category: 'general',
      employment: 'student',
    })

    const kheloIndia = youthChampion.find(s => s.schemeName.includes('Khelo India'))
    const railway = youthChampion.find(s => s.schemeName.includes('Railways'))

    expect(kheloIndia).toBeDefined()
    expect(kheloIndia?.financialBenefit).toContain('5,00,000')
    expect(railway).toBeDefined()
    expect(railway?.recruitmentTier).toContain('Group C')
  })

  it('calculateTravelBudget itemizes transit, stay, and buffer', () => {
    const budget = calculateTravelBudget({
      fromCity: 'Patna',
      toCity: 'Bengaluru',
      travelClass: '3ac',
      daysStay: 3,
      lodgingType: 'budget_hotel',
      isSolo: true,
    })

    expect(budget.transitCost).toBeGreaterThan(2000)
    expect(budget.lodgingCost).toBeGreaterThan(3000)
    expect(budget.emergencyBuffer).toBeGreaterThan(500)
    expect(budget.totalBudget).toBeGreaterThan(7000)
  })

  it('calculateMatchFeeRoi flags commercial pay-to-play red flags', () => {
    const highRisk = calculateMatchFeeRoi({
      entryFee: 3500,
      travelStayCost: 2000,
      scoutsPresent: 1,
      competingAthletes: 400,
      selectionSlots: 5,
      callbackRate: 1,
    })

    expect(highRisk.roiRating).toBe('High Risk / Unverified')
    expect(highRisk.warningFlag).toContain('RED FLAG')
  })
})
