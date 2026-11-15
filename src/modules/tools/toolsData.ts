/**
 * KhelGrid Sports Tools & Performance Calculators Data & Logic
 * Comprehensive algorithms calibrated for Indian athletes, selectors, and coaches.
 */

export type ToolCategory = 'all' | 'trial-scouting' | 'fitness-science' | 'organizer-match'

export interface ToolDefinition {
  slug: string
  name: string
  hindiName: string
  category: ToolCategory
  categoryLabel: string
  type: 'Calculator' | 'Checklist' | 'Estimator' | 'Planner'
  icon: string
  blurb: string
  badge?: string
  detailedDescription: string
  estimatedTime: string
  sportDisciplines: string[]
}

export const ALL_SPORTS_TOOLS: ToolDefinition[] = [
  {
    slug: 'trial-readiness-score',
    name: 'Trial Readiness Score',
    hindiName: 'ट्रायल तैयारी स्कोर',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Calculator',
    icon: 'target',
    blurb: 'Get an instant 0–100 readiness rating before your next selection trial or combine.',
    badge: 'Most Popular',
    detailedDescription: 'Evaluates your training volume, sleep recovery, recent PR progression, nutritional consistency, and mental confidence to score your trial-day peak fitness.',
    estimatedTime: '1 min',
    sportDisciplines: ['Cricket', 'Football', 'Badminton', 'Kabaddi', 'Athletics', 'All Sports']
  },
  {
    slug: 'age-category-eligibility',
    name: 'Age-Category & Cut-off Eligibility',
    hindiName: 'आयु वर्ग व कट-ऑफ पात्रता',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Calculator',
    icon: 'calendar-check',
    blurb: 'Check exact eligibility for BCCI (Sept 1), SAI Khelo India (Jan 1), and AIU meets.',
    badge: 'Essential for Trials',
    detailedDescription: 'Calculates your exact age down to the day on official federation cut-off dates and determines eligibility for Under-14, Under-16, Under-19, Under-23, and Senior categories.',
    estimatedTime: '30 sec',
    sportDisciplines: ['Cricket', 'Football', 'Badminton', 'Kabaddi', 'Athletics']
  },
  {
    slug: 'vo2-max-estimator',
    name: 'VO2 Max & Aerobic Capacity',
    hindiName: 'वीओ2 मैक्स एरोबिक टेस्ट',
    category: 'fitness-science',
    categoryLabel: 'Fitness & Science',
    type: 'Estimator',
    icon: 'activity',
    blurb: 'Estimate cardiorespiratory stamina from 12-min Cooper run, Yo-Yo IR1, or 2.4km test.',
    detailedDescription: 'Computes maximal oxygen uptake (ml/kg/min) and benchmarks your cardiovascular fitness against Indian National Team and SAI NCOE standards.',
    estimatedTime: '1 min',
    sportDisciplines: ['Football', 'Cricket Fast Bowling', 'Badminton', 'Kabaddi', 'Athletics', 'Hockey']
  },
  {
    slug: 'sports-cv-builder-checklist',
    name: 'Sports CV Builder Checklist',
    hindiName: 'स्पोर्ट्स सीवी चेकलिस्ट',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Checklist',
    icon: 'file-text',
    blurb: 'Tick off the 12 essential sections every verified selector and scout inspects.',
    badge: 'Scout Verified',
    detailedDescription: 'Audits your athlete portfolio for critical selector proofs: government ID, verified federation cards, match logs, video links, coach endorsement, and medical records.',
    estimatedTime: '2 mins',
    sportDisciplines: ['All Sports']
  },
  {
    slug: 'calorie-needs-athlete',
    name: 'Athlete Calorie & Macronutrient Needs',
    hindiName: 'दैनिक कैलोरी व प्रोटीन कैलकुलेटर',
    category: 'fitness-science',
    categoryLabel: 'Fitness & Science',
    type: 'Calculator',
    icon: 'sparkles',
    blurb: 'Get daily calories, protein (g), carbs (g), and hydration tuned for your sport and weight.',
    detailedDescription: 'Uses sport-specific metabolic equivalents (METs) and body mass to compute basal metabolic rate, total energy expenditure, and macronutrient targets.',
    estimatedTime: '1 min',
    sportDisciplines: ['Cricket', 'Football', 'Combat/Akhada', 'Badminton', 'Athletics']
  },
  {
    slug: 'weekly-load-planner',
    name: 'Weekly Training-Load & ACWR Planner',
    hindiName: 'ट्रेनिंग लोड व पीकिंग प्लानर',
    category: 'fitness-science',
    categoryLabel: 'Fitness & Science',
    type: 'Planner',
    icon: 'sliders',
    blurb: 'Distribute training volume and compute ACWR ratio so you peak without injury on trial day.',
    detailedDescription: 'Monitors Acute:Chronic Workload Ratio (ACWR) to keep athletes in the high-performance sweet spot (0.8–1.3) while avoiding overtraining spikes.',
    estimatedTime: '2 mins',
    sportDisciplines: ['Cricket', 'Football', 'Badminton', 'Athletics']
  },
  {
    slug: 'sprint-split-calculator',
    name: 'Sprint-Split & Acceleration Analyzer',
    hindiName: 'स्प्रिंट स्पीड व एक्सेलेरेशन',
    category: 'fitness-science',
    categoryLabel: 'Fitness & Science',
    type: 'Calculator',
    icon: 'award',
    blurb: 'Break a 100m or 30m PB into 10m splits, reaction time, and top speed in km/h.',
    detailedDescription: 'Analyzes drive phase (0–10m), acceleration (10–30m), top velocity (30–60m), and speed endurance drop-off with elite benchmark comparisons.',
    estimatedTime: '1 min',
    sportDisciplines: ['Athletics', 'Cricket Fielding', 'Football', 'Kabaddi']
  },
  {
    slug: 'scholarship-eligibility-checker',
    name: 'Scholarship & Sports Quota Checker',
    hindiName: 'स्कॉलरशिप व सरकारी कोटा पात्रता',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Estimator',
    icon: 'shield-check',
    blurb: 'See which SAI, Khelo India, Railway, or Police sports quota schemes you qualify for.',
    detailedDescription: 'Matches your age, tournament medal tier (National, Inter-University, State), and category against active central and state sports quota recruitment policies.',
    estimatedTime: '2 mins',
    sportDisciplines: ['All Sports']
  },
  {
    slug: 'travel-budget-estimator',
    name: 'Trial Travel Budget Estimator',
    hindiName: 'आउट-ऑफ-स्टेट ट्रायल बजट',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Estimator',
    icon: 'wallet',
    blurb: 'Ballpark total cost of attending an out-of-state trial including train, lodging, and kit.',
    detailedDescription: 'Itemizes return travel fares, budget sports stay, clean high-protein meals, local commute, and emergency buffers for outstation combine trials.',
    estimatedTime: '1 min',
    sportDisciplines: ['All Sports']
  },
  {
    slug: 'turf-cost-splitter',
    name: 'Box Cricket & Turf Booking Cost Splitter',
    hindiName: 'टर्फ मैच फीस व प्लेयर स्प्लिटर',
    category: 'organizer-match',
    categoryLabel: 'Organizer & Match',
    type: 'Calculator',
    icon: 'users',
    blurb: 'Split turf booking fee, lights, and balls across playing players and subs with UPI share.',
    badge: 'Turf Favorite',
    detailedDescription: 'Calculates exact per-player contributions, handles substitute discounts, and generates a formatted WhatsApp payment request with UPI payment details.',
    estimatedTime: '30 sec',
    sportDisciplines: ['Box Cricket', 'Football / Futsal', 'Badminton', 'Pickleball']
  },
  {
    slug: 'match-fee-roi',
    name: 'Match-Fee & Selection ROI Calculator',
    hindiName: 'मैच फीस व ट्रायल आरओआई',
    category: 'organizer-match',
    categoryLabel: 'Organizer & Match',
    type: 'Calculator',
    icon: 'chart',
    blurb: 'Compare entry fee × verified scouts present × callback rate to spot pay-to-play scams.',
    detailedDescription: 'Computes cost-per-scout-impression and expected exposure value to protect grassroots khiladis from illegitimate trials charging inflated fees.',
    estimatedTime: '1 min',
    sportDisciplines: ['Cricket', 'Football', 'Open Combines']
  },
  {
    slug: 'academy-shortlist-builder',
    name: 'Academy Shortlist & Quality Builder',
    hindiName: 'अकादमी चयन व बजट मूल्यांकन',
    category: 'organizer-match',
    categoryLabel: 'Organizer & Match',
    type: 'Planner',
    icon: 'building',
    blurb: 'Score up to 5 academies on coaching pedigree, annual fees, hostel, and player pathway.',
    detailedDescription: 'Evaluates sports institutes across certified coaching staff (NIS / BCCI / AFC), ground infrastructure, residential facilities, and Ranji/ISL placement track records.',
    estimatedTime: '2 mins',
    sportDisciplines: ['Cricket', 'Football', 'Badminton', 'Tennis', 'Combat']
  },
  {
    slug: 'boost-vs-organic-estimator',
    name: 'Boost vs Organic Reach Estimator',
    hindiName: 'इवेंट रीच व रजिस्ट्रेशन एस्टिमेटर',
    category: 'organizer-match',
    categoryLabel: 'Organizer & Match',
    type: 'Estimator',
    icon: 'star',
    blurb: 'Organizers: Estimate athlete impressions, trial sign-ups, and cost-per-registration.',
    detailedDescription: 'Forecasts verified grassroots athlete turnout for trials, box tournaments, and camps under organic listing vs KhelGrid verified promotional boost.',
    estimatedTime: '1 min',
    sportDisciplines: ['All Tournaments & Trials']
  },
  {
    slug: 'trial-day-packing-list',
    name: 'Trial-Day Packing Checklist',
    hindiName: 'ट्रायल डे किट व डॉक्यूमेंट बैग',
    category: 'trial-scouting',
    categoryLabel: 'Trial & Scouting',
    type: 'Checklist',
    icon: 'check',
    blurb: 'Don’t forget the one vital document or spare gear item that gets athletes disqualified.',
    badge: 'Trial Essential',
    detailedDescription: 'Interactive packing checklist covering original IDs, federation NOCs, footwear, spare kits, electrolyte nutrition, and first-aid strapping with progress autosave.',
    estimatedTime: '2 mins',
    sportDisciplines: ['All Sports']
  }
]

/* =========================================================================
   1. TRIAL READINESS SCORE CALCULATOR ENGINE
   ========================================================================= */
export interface TrialReadinessInputs {
  sessionsPerWeek: number
  sleepHours: number
  prDeltaPercent: number
  nutritionConsistency: number // 1 to 5
  mentalConfidence: number // 1 to 5
  sport: string
}

export interface TrialReadinessResult {
  score: number // 0 to 100
  tier: 'Peak Readiness' | 'Good Fitness' | 'Moderate / Tune Up' | 'High Fatigue Risk'
  tierClass: 'optimal' | 'good' | 'warning' | 'danger'
  breakdown: {
    volumeScore: number // out of 25
    sleepScore: number // out of 25
    progressionScore: number // out of 20
    nutritionScore: number // out of 15
    mentalScore: number // out of 15
  }
  recommendations: string[]
}

export function calculateTrialReadiness(inputs: TrialReadinessInputs): TrialReadinessResult {
  // 1. Volume Score (25 pts): Optimal is 4-7 sessions/wk. Too low (<3) or too high (>9) loses points.
  let volumeScore = 25
  if (inputs.sessionsPerWeek < 3) {
    volumeScore = Math.max(10, inputs.sessionsPerWeek * 5)
  } else if (inputs.sessionsPerWeek > 9) {
    volumeScore = Math.max(12, 25 - (inputs.sessionsPerWeek - 9) * 3)
  } else if (inputs.sessionsPerWeek >= 4 && inputs.sessionsPerWeek <= 7) {
    volumeScore = 25
  } else {
    volumeScore = 21
  }

  // 2. Sleep Score (25 pts): Optimal is 7.5 to 9.5 hours
  let sleepScore = 25
  if (inputs.sleepHours >= 7.5 && inputs.sleepHours <= 9.5) {
    sleepScore = 25
  } else if (inputs.sleepHours >= 6.5 && inputs.sleepHours < 7.5) {
    sleepScore = 20
  } else if (inputs.sleepHours >= 5.5 && inputs.sleepHours < 6.5) {
    sleepScore = 14
  } else if (inputs.sleepHours < 5.5) {
    sleepScore = 7
  } else {
    // > 9.5 hours
    sleepScore = 22
  }

  // 3. Progression / PR Delta (20 pts):
  let progressionScore = 15
  if (inputs.prDeltaPercent >= 5) progressionScore = 20
  else if (inputs.prDeltaPercent > 0) progressionScore = 17
  else if (inputs.prDeltaPercent === 0) progressionScore = 14
  else if (inputs.prDeltaPercent >= -5) progressionScore = 10
  else progressionScore = 5

  // 4. Nutrition Score (15 pts): (rating 1..5) * 3
  const nutritionScore = Math.min(15, Math.max(3, inputs.nutritionConsistency * 3))

  // 5. Mental Score (15 pts): (rating 1..5) * 3
  const mentalScore = Math.min(15, Math.max(3, inputs.mentalConfidence * 3))

  const totalScore = Math.min(100, Math.max(10, Math.round(volumeScore + sleepScore + progressionScore + nutritionScore + mentalScore)))

  let tier: TrialReadinessResult['tier'] = 'Good Fitness'
  let tierClass: TrialReadinessResult['tierClass'] = 'good'

  if (totalScore >= 85) {
    tier = 'Peak Readiness'
    tierClass = 'optimal'
  } else if (totalScore >= 70) {
    tier = 'Good Fitness'
    tierClass = 'good'
  } else if (totalScore >= 52) {
    tier = 'Moderate / Tune Up'
    tierClass = 'warning'
  } else {
    tier = 'High Fatigue Risk'
    tierClass = 'danger'
  }

  const recommendations: string[] = []
  if (inputs.sleepHours < 7) {
    recommendations.push('Critical: Target 8+ hours of uninterrupted sleep for 3 consecutive nights to restore central nervous system readiness.')
  }
  if (inputs.sessionsPerWeek > 8) {
    recommendations.push('Reduce training volume by 40% 72 hours before trial day to clear accumulated muscular fatigue and peak your explosive power.')
  }
  if (inputs.prDeltaPercent < 0) {
    recommendations.push('Recent performance plateau detected: focus on short, high-intensity technical drills rather than exhausting endurance sets.')
  }
  if (inputs.nutritionConsistency < 4) {
    recommendations.push('Hydrate with 500ml electrolyte fluid 2 hours prior to warm-up and consume easy-to-digest carbs (banana, dates) 45 mins before trials.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Outstanding balance across physical, recovery, and psychological metrics! Stick to your standard warm-up routine and compete with confidence.')
  }

  return {
    score: totalScore,
    tier,
    tierClass,
    breakdown: {
      volumeScore,
      sleepScore,
      progressionScore,
      nutritionScore,
      mentalScore,
    },
    recommendations,
  }
}

/* =========================================================================
   2. AGE-CATEGORY ELIGIBILITY ENGINE (BCCI, SAI, AIU, SGFI)
   ========================================================================= */
export interface AgeEligibilityInputs {
  birthDate: string // YYYY-MM-DD
  federation: 'bcci' | 'sai' | 'aiu' | 'sgfi'
  seasonYear: number // 2026 or 2027
}

export interface AgeCategoryStatus {
  category: string
  label: string
  isEligible: boolean
  maxAgeOnCutoff: number
  reason: string
}

export interface AgeEligibilityResult {
  exactAgeOnCutoff: {
    years: number
    months: number
    days: number
  }
  cutoffDateFormatted: string
  governingBodyName: string
  categories: AgeCategoryStatus[]
  daysToAgeOut?: number
  nextMilestone: string
}

export function calculateAgeEligibility(inputs: AgeEligibilityInputs): AgeEligibilityResult {
  const [bYear, bMonth, bDay] = inputs.birthDate.split('-').map(Number)
  const birth = new Date(bYear, bMonth - 1, bDay)

  let cutoffMonth = 8 // Sept (0-based) for BCCI
  let cutoffDay = 1
  let governingBodyName = 'BCCI (Board of Control for Cricket in India)'

  if (inputs.federation === 'sai') {
    cutoffMonth = 0 // Jan 1
    cutoffDay = 1
    governingBodyName = 'Sports Authority of India / Khelo India Youth Games'
  } else if (inputs.federation === 'aiu') {
    cutoffMonth = 6 // July 1
    cutoffDay = 1
    governingBodyName = 'AIU (Association of Indian Universities Inter-University Meets)'
  } else if (inputs.federation === 'sgfi') {
    cutoffMonth = 11 // Dec 31
    cutoffDay = 31
    governingBodyName = 'SGFI (School Games Federation of India)'
  }

  const cutoff = new Date(inputs.seasonYear, cutoffMonth, cutoffDay)

  // Calculate age on cut-off
  let years = cutoff.getFullYear() - birth.getFullYear()
  let months = cutoff.getMonth() - birth.getMonth()
  let days = cutoff.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    const prevMonthDays = new Date(cutoff.getFullYear(), cutoff.getMonth(), 0).getDate()
    days += prevMonthDays
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const decimalAge = years + months / 12 + days / 365

  const categories: AgeCategoryStatus[] = [
    {
      category: 'U-14',
      label: 'Under-14 (Sub-Junior)',
      maxAgeOnCutoff: 14,
      isEligible: decimalAge < 14,
      reason: decimalAge < 14 ? 'Eligible for Sub-Junior State & District trials' : 'Age-barred for Under-14 category',
    },
    {
      category: 'U-16',
      label: 'Under-16 (Junior / Vijay Merchant Trophy)',
      maxAgeOnCutoff: 16,
      isEligible: decimalAge < 16,
      reason: decimalAge < 16 ? 'Eligible for Junior State selections' : 'Age-barred for Under-16 category',
    },
    {
      category: 'U-19',
      label: 'Under-19 (Vinoo Mankad & Cooch Behar Trophy)',
      maxAgeOnCutoff: 19,
      isEligible: decimalAge < 19,
      reason: decimalAge < 19 ? 'Eligible for Youth National & State selections' : 'Age-barred for Under-19 category',
    },
    {
      category: 'U-23',
      label: 'Under-23 (Col. C.K. Nayudu Trophy)',
      maxAgeOnCutoff: 23,
      isEligible: decimalAge < 23,
      reason: decimalAge < 23 ? 'Eligible for Under-23 State & Development squads' : 'Age-barred for Under-23 category',
    },
    {
      category: 'Senior',
      label: 'Senior / Open (Ranji Trophy, ISL, Senior Nationals)',
      maxAgeOnCutoff: 99,
      isEligible: true,
      reason: 'Eligible for all Open & Senior selection trials',
    },
  ]

  const cutoffDateFormatted = cutoff.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  let nextMilestone = 'Senior / Open Category'
  const nextCat = categories.find(c => c.isEligible && c.maxAgeOnCutoff < 99)
  if (nextCat) {
    nextMilestone = `Eligible for ${nextCat.label}`
  }

  return {
    exactAgeOnCutoff: { years, months, days },
    cutoffDateFormatted,
    governingBodyName,
    categories,
    nextMilestone,
  }
}

/* =========================================================================
   3. VO2 MAX & AEROBIC CAPACITY CALCULATOR ENGINE
   ========================================================================= */
export interface Vo2MaxInputs {
  method: 'cooper' | 'yoyo' | 'run24'
  cooperMeters: number
  yoyoLevel: number
  yoyoShuttle: number
  run24Minutes: number
  run24Seconds: number
  gender: 'male' | 'female'
  age: number
  sport: string
}

export interface Vo2MaxResult {
  vo2max: number // ml/kg/min
  rating: 'Superior' | 'Excellent' | 'Good' | 'Fair' | 'Poor'
  ratingClass: 'optimal' | 'good' | 'warning' | 'danger'
  comparisonPercentile: number // 0 to 100
  sportBenchmarkAvg: number
  coachInsight: string
}

export function calculateVo2Max(inputs: Vo2MaxInputs): Vo2MaxResult {
  let vo2 = 45.0

  if (inputs.method === 'cooper') {
    // Cooper formula: (Distance in meters - 504.9) / 44.73
    vo2 = Math.max(15, (inputs.cooperMeters - 504.9) / 44.73)
  } else if (inputs.method === 'yoyo') {
    // Estimate distance from level & shuttle
    // YoYo IR1 level 14 = ~400m, level 16 = ~1000m, level 18 = ~1800m, level 20 = ~2400m
    const approxDist = (inputs.yoyoLevel - 10) * 200 + inputs.yoyoShuttle * 40
    vo2 = Math.max(20, approxDist * 0.0084 + 36.4)
  } else {
    // 2.4 km run time
    const totalMinutes = inputs.run24Minutes + inputs.run24Seconds / 60
    if (totalMinutes > 0) {
      vo2 = Math.max(15, 88.02 - (2.76 * totalMinutes) + (inputs.gender === 'male' ? 3.8 : 0))
    }
  }

  vo2 = Math.round(vo2 * 10) / 10

  // Sport benchmark reference
  let sportBenchmarkAvg = 55
  if (inputs.sport.toLowerCase().includes('football')) sportBenchmarkAvg = 58
  else if (inputs.sport.toLowerCase().includes('cricket')) sportBenchmarkAvg = 52
  else if (inputs.sport.toLowerCase().includes('badminton')) sportBenchmarkAvg = 56
  else if (inputs.sport.toLowerCase().includes('kabaddi')) sportBenchmarkAvg = 50
  else if (inputs.sport.toLowerCase().includes('athletics')) sportBenchmarkAvg = 64

  let rating: Vo2MaxResult['rating'] = 'Good'
  let ratingClass: Vo2MaxResult['ratingClass'] = 'good'
  let comparisonPercentile = 60

  const threshold = inputs.gender === 'male' ? 0 : -5

  if (vo2 >= 58 + threshold) {
    rating = 'Superior'
    ratingClass = 'optimal'
    comparisonPercentile = 94
  } else if (vo2 >= 51 + threshold) {
    rating = 'Excellent'
    ratingClass = 'optimal'
    comparisonPercentile = 82
  } else if (vo2 >= 44 + threshold) {
    rating = 'Good'
    ratingClass = 'good'
    comparisonPercentile = 65
  } else if (vo2 >= 38 + threshold) {
    rating = 'Fair'
    ratingClass = 'warning'
    comparisonPercentile = 45
  } else {
    rating = 'Poor'
    ratingClass = 'danger'
    comparisonPercentile = 25
  }

  let coachInsight = `Your estimated VO2 max of ${vo2} ml/kg/min places you above ${comparisonPercentile}% of competitive age-group athletes.`
  if (vo2 < sportBenchmarkAvg) {
    coachInsight += ` For elite ${inputs.sport} selection, aim for ${sportBenchmarkAvg}+ ml/kg/min via 4×4 minute high-intensity interval training (HIIT).`
  } else {
    coachInsight += ` Meets SAI National Centre of Excellence (NCOE) and elite state squad cardiovascular standards.`
  }

  return {
    vo2max: vo2,
    rating,
    ratingClass,
    comparisonPercentile,
    sportBenchmarkAvg,
    coachInsight,
  }
}

/* =========================================================================
   4. ATHLETE CALORIE & MACRO CALCULATOR ENGINE
   ========================================================================= */
export interface CalorieNeedsInputs {
  gender: 'male' | 'female'
  age: number
  weightKg: number
  heightCm: number
  trainingHoursPerDay: number
  sportIntensity: 'medium' | 'high' | 'very_high' // cricket = medium/high, football/combat = very_high
  goal: 'maintain' | 'muscle_gain' | 'fat_loss'
}

export interface CalorieNeedsResult {
  bmr: number
  tdee: number
  targetCalories: number
  proteinGrams: number
  proteinKcal: number
  carbsGrams: number
  carbsKcal: number
  fatsGrams: number
  fatsKcal: number
  waterLiters: number
}

export function calculateCalorieNeeds(inputs: CalorieNeedsInputs): CalorieNeedsResult {
  // Mifflin-St Jeor formula for BMR
  let bmr = 10 * inputs.weightKg + 6.25 * inputs.heightCm - 5 * inputs.age
  bmr += inputs.gender === 'male' ? 5 : -161

  // Activity Multiplier based on daily hours
  let activityMultiplier = 1.35
  if (inputs.trainingHoursPerDay >= 3.5) activityMultiplier = 1.85
  else if (inputs.trainingHoursPerDay >= 2.5) activityMultiplier = 1.65
  else if (inputs.trainingHoursPerDay >= 1.5) activityMultiplier = 1.5
  else if (inputs.trainingHoursPerDay >= 0.5) activityMultiplier = 1.35

  const tdee = Math.round(bmr * activityMultiplier)

  let targetCalories = tdee
  if (inputs.goal === 'muscle_gain') targetCalories += 350
  else if (inputs.goal === 'fat_loss') targetCalories -= 400

  // Protein: 1.8g to 2.2g per kg
  const proteinPerKg = inputs.goal === 'muscle_gain' ? 2.0 : 1.8
  const proteinGrams = Math.round(inputs.weightKg * proteinPerKg)
  const proteinKcal = proteinGrams * 4

  // Fats: 22% of total calories
  const fatsKcal = Math.round(targetCalories * 0.22)
  const fatsGrams = Math.round(fatsKcal / 9)

  // Carbs: Remaining calories
  const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatsKcal)
  const carbsGrams = Math.round(carbsKcal / 4)

  // Hydration: ~35ml per kg + 500ml per hour of training
  const waterLiters = Math.round((inputs.weightKg * 0.035 + inputs.trainingHoursPerDay * 0.6) * 10) / 10

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    proteinGrams,
    proteinKcal,
    carbsGrams,
    carbsKcal,
    fatsGrams,
    fatsKcal,
    waterLiters,
  }
}

/* =========================================================================
   5. SPRINT-SPLIT & VELOCITY CALCULATOR ENGINE
   ========================================================================= */
export interface SprintSplitInputs {
  time100m: number // e.g. 11.4s
  reactionTime: number // default 0.16s
}

export interface SplitPhase {
  phase: string
  distanceRange: string
  splitTime: number
  phaseVelocityKmH: number
  phaseVelocityMs: number
  description: string
}

export interface SprintSplitResult {
  totalTime: number
  reactionTime: number
  topSpeedKmH: number
  topSpeedMs: number
  phases: SplitPhase[]
  nationalComparison: string
}

export function calculateSprintSplits(inputs: SprintSplitInputs): SprintSplitResult {
  const t = Math.max(9.5, Math.min(20, inputs.time100m))
  const r = Math.max(0.12, Math.min(0.3, inputs.reactionTime))

  const runningTime = t - r

  // Model standard sprint curve:
  // 0-10m: 17.5% of running time (Drive phase)
  // 10-30m: 21.5% of running time (Transition & Acceleration)
  // 30-60m: 29.0% of running time (Max Velocity Phase)
  // 60-100m: 32.0% of running time (Speed Endurance / Deceleration)

  const t0_10 = Math.round((r + runningTime * 0.175) * 100) / 100
  const t10_30 = Math.round((runningTime * 0.215) * 100) / 100
  const t30_60 = Math.round((runningTime * 0.290) * 100) / 100
  const t60_100 = Math.round((runningTime * 0.320) * 100) / 100

  const v30_60Ms = Math.round((30 / t30_60) * 100) / 100
  const topSpeedKmH = Math.round(v30_60Ms * 3.6 * 10) / 10

  const phases: SplitPhase[] = [
    {
      phase: 'Drive Phase',
      distanceRange: '0m – 10m',
      splitTime: t0_10,
      phaseVelocityMs: Math.round((10 / t0_10) * 100) / 100,
      phaseVelocityKmH: Math.round((10 / t0_10) * 3.6 * 10) / 10,
      description: 'Explosive start from blocks, low center of gravity, high ground force application.',
    },
    {
      phase: 'Acceleration Phase',
      distanceRange: '10m – 30m',
      splitTime: t10_30,
      phaseVelocityMs: Math.round((20 / t10_30) * 100) / 100,
      phaseVelocityKmH: Math.round((20 / t10_30) * 3.6 * 10) / 10,
      description: 'Progressive posture uprighting, stride length expansion.',
    },
    {
      phase: 'Max Velocity Phase',
      distanceRange: '30m – 60m',
      splitTime: t30_60,
      phaseVelocityMs: v30_60Ms,
      phaseVelocityKmH: topSpeedKmH,
      description: 'Peak top-end sprint speed. Tall posture, elastic foot strike directly under hip.',
    },
    {
      phase: 'Speed Endurance',
      distanceRange: '60m – 100m',
      splitTime: t60_100,
      phaseVelocityMs: Math.round((40 / t60_100) * 100) / 100,
      phaseVelocityKmH: Math.round((40 / t60_100) * 3.6 * 10) / 10,
      description: 'Deceleration minimization. Lactic threshold tolerance and posture integrity.',
    },
  ]

  let nationalComparison = ''
  if (t <= 10.5) nationalComparison = 'Elite National Games / International Qualifying standard.'
  else if (t <= 11.2) nationalComparison = 'All-India Inter-University (AIU) & State Senior podium standard.'
  else if (t <= 11.9) nationalComparison = 'Strong Under-19 State selection & athletic combine candidate.'
  else if (t <= 12.8) nationalComparison = 'Solid grassroots speed for multi-sport field athletes (Cricket / Football).'
  else nationalComparison = 'Developing speed: prioritize plyometrics and sled acceleration drills.'

  return {
    totalTime: t,
    reactionTime: r,
    topSpeedKmH,
    topSpeedMs: v30_60Ms,
    phases,
    nationalComparison,
  }
}

/* =========================================================================
   6. TURF & BOX CRICKET FEE SPLITTER ENGINE
   ========================================================================= */
export interface TurfSplitInputs {
  slotFee: number // e.g. 1800
  lightAndBallFee: number // e.g. 300
  otherExpenses: number // e.g. 100 (water, snacks)
  playersCount: number // e.g. 12
  subsCount: number // e.g. 2
  subsDiscountPercent: number // 0 or 50%
  organizerUpiId: string
  venueName: string
}

export interface TurfSplitResult {
  totalAmount: number
  costPerFullPlayer: number
  costPerSub: number
  whatsappMessage: string
}

export function calculateTurfSplit(inputs: TurfSplitInputs): TurfSplitResult {
  const total = inputs.slotFee + inputs.lightAndBallFee + inputs.otherExpenses
  const subShareFactor = 1 - inputs.subsDiscountPercent / 100

  const effectiveUnits = inputs.playersCount + inputs.subsCount * subShareFactor
  const unitCost = effectiveUnits > 0 ? total / effectiveUnits : 0

  const costPerFullPlayer = Math.ceil(unitCost)
  const costPerSub = Math.ceil(unitCost * subShareFactor)

  const venueText = inputs.venueName ? `at ${inputs.venueName}` : ''
  const upiText = inputs.organizerUpiId ? `\n💳 Pay via UPI: ${inputs.organizerUpiId}` : ''

  const whatsappMessage = `🏏 Turf Match Fee Split - KhelGrid\n` +
    `Venue: ${venueText || 'Turf / Court'}\n` +
    `Total Booking: ₹${total.toLocaleString('en-IN')}\n` +
    `--------------------------\n` +
    `👤 Playing Khiladis (${inputs.playersCount}): ₹${costPerFullPlayer} each\n` +
    (inputs.subsCount > 0 ? `👥 Subs (${inputs.subsCount}): ₹${costPerSub} each\n` : '') +
    `${upiText}\n\n` +
    `⚡ Please confirm and send payment screenshot before match kickoff!`

  return {
    totalAmount: total,
    costPerFullPlayer,
    costPerSub,
    whatsappMessage,
  }
}

/* =========================================================================
   7. OUT-OF-STATE TRIAL TRAVEL BUDGET ESTIMATOR ENGINE
   ========================================================================= */
export interface TravelBudgetInputs {
  fromCity: string
  toCity: string
  travelClass: 'sleeper' | '3ac' | '2ac_vande' | 'flight'
  daysStay: number
  lodgingType: 'dharamsala' | 'budget_hotel' | 'comfort_hotel'
  isSolo: boolean // true = solo, false = with guardian
}

export interface TravelBudgetResult {
  transitCost: number
  lodgingCost: number
  foodCost: number
  localCommuteCost: number
  kitAllowance: number
  emergencyBuffer: number
  totalBudget: number
  tips: string[]
}

export function calculateTravelBudget(inputs: TravelBudgetInputs): TravelBudgetResult {
  const multiplier = inputs.isSolo ? 1.0 : 1.85

  let transitOneWay = 450
  if (inputs.travelClass === '3ac') transitOneWay = 1450
  else if (inputs.travelClass === '2ac_vande') transitOneWay = 2200
  else if (inputs.travelClass === 'flight') transitOneWay = 5500

  const transitCost = Math.round(transitOneWay * 2 * multiplier)

  let lodgingPerNight = 500
  if (inputs.lodgingType === 'budget_hotel') lodgingPerNight = 1200
  else if (inputs.lodgingType === 'comfort_hotel') lodgingPerNight = 2400

  const lodgingCost = Math.round(lodgingPerNight * inputs.daysStay * (inputs.isSolo ? 1 : 1.2))

  const foodPerDay = inputs.lodgingType === 'dharamsala' ? 350 : 600
  const foodCost = Math.round(foodPerDay * inputs.daysStay * multiplier)

  const localCommuteCost = Math.round(250 * inputs.daysStay)
  const kitAllowance = inputs.travelClass === 'flight' ? 1200 : 300

  const subtotal = transitCost + lodgingCost + foodCost + localCommuteCost + kitAllowance
  const emergencyBuffer = Math.round(subtotal * 0.15)
  const totalBudget = subtotal + emergencyBuffer

  const tips: string[] = [
    'Carry certified printouts of your trial invitation letter to claim Indian Railways sports concession discounts where applicable.',
    'Book budget stays near the trial stadium or metro corridor to eliminate surge cab pricing on trial morning.',
    'Always carry 15% liquid UPI / cash emergency buffer for unexpected security deposits or registration jersey fees.',
  ]

  return {
    transitCost,
    lodgingCost,
    foodCost,
    localCommuteCost,
    kitAllowance,
    emergencyBuffer,
    totalBudget,
    tips,
  }
}


/* =========================================================================
   8. WEEKLY LOAD PLANNER & ACWR (Acute:Chronic Workload Ratio)
   ========================================================================= */
export interface WeeklyLoadInputs {
  pastWeek1: number // arbitrary units or hours (e.g. 10h)
  pastWeek2: number // e.g. 12h
  pastWeek3: number // e.g. 11h
  pastWeek4: number // e.g. 13h
  plannedWeek: number // e.g. 15h
  daysToTrial: number // e.g. 5
}

export interface WeeklyLoadResult {
  acuteLoad: number
  chronicLoad: number
  acwr: number
  zone: 'Under-prepared' | 'Sweet Spot' | 'Caution Zone' | 'High Injury Risk'
  zoneClass: 'optimal' | 'good' | 'warning' | 'danger'
  taperAdvice: string
}

export function calculateWeeklyLoad(inputs: WeeklyLoadInputs): WeeklyLoadResult {
  const chronicLoad = Math.round(((inputs.pastWeek1 + inputs.pastWeek2 + inputs.pastWeek3 + inputs.pastWeek4) / 4) * 10) / 10
  const acuteLoad = inputs.plannedWeek
  const acwr = chronicLoad > 0 ? Math.round((acuteLoad / chronicLoad) * 100) / 100 : 1.0

  let zone: WeeklyLoadResult['zone'] = 'Sweet Spot'
  let zoneClass: WeeklyLoadResult['zoneClass'] = 'optimal'
  let taperAdvice = ''

  if (acwr < 0.8) {
    zone = 'Under-prepared'
    zoneClass = 'warning'
    taperAdvice = 'Workload is below training fitness threshold. Increase high-intensity match-tempo bursts to maintain conditioning without fatigue.'
  } else if (acwr <= 1.3) {
    zone = 'Sweet Spot'
    zoneClass = 'optimal'
    taperAdvice = 'Optimal training balance! Your Acute:Chronic Workload Ratio maximizes fitness while keeping injury risk below 3%.'
  } else if (acwr <= 1.5) {
    zone = 'Caution Zone'
    zoneClass = 'warning'
    taperAdvice = 'Rapid load spike detected. Limit contact drills and add 20 minutes of active foam rolling / cold plunge therapy.'
  } else {
    zone = 'High Injury Risk'
    zoneClass = 'danger'
    taperAdvice = 'DANGER ZONE: A workload spike above 1.5 increases soft tissue and hamstring injury risk by 200–400%. Cut volume immediately before trial.'
  }

  if (inputs.daysToTrial <= 4 && inputs.daysToTrial > 0) {
    taperAdvice += ` Trial is in ${inputs.daysToTrial} days: Reduce total session duration by 40% while preserving sharp explosive sprint/technique reps.`
  }

  return {
    acuteLoad,
    chronicLoad,
    acwr,
    zone,
    zoneClass,
    taperAdvice,
  }
}

/* =========================================================================
   9. SPORTS CV 12-POINT AUDIT CHECKLIST
   ========================================================================= */
export interface CvChecklistItem {
  id: string
  title: string
  mandatory: boolean
  selectorRationale: string
  defaultChecked?: boolean
}

export const SPORTS_CV_CHECKLIST_ITEMS: CvChecklistItem[] = [
  {
    id: 'gov-id',
    title: 'Government Photo ID & Digital Age Proof',
    mandatory: true,
    selectorRationale: 'Essential for age verification and TW3 bone test matching. Selectors reject athletes without verifiable Aadhaar or Municipal birth certificates.',
    defaultChecked: true,
  },
  {
    id: 'fed-card',
    title: 'Federation / State Association Registration ID',
    mandatory: true,
    selectorRationale: 'BCCI CRID, AIFF CRS ID, BAI ID or State Association card proves authentic registry in the competitive ladder.',
    defaultChecked: true,
  },
  {
    id: 'playing-spec',
    title: 'Playing Role, Position & Bio-Mechanical Specs',
    mandatory: true,
    selectorRationale: 'Selectors scout for specific tactical slots: e.g. Left-arm Fast, Centre-Back, Box-to-Box Midfielder, Right Corner Raider.',
    defaultChecked: true,
  },
  {
    id: 'tournament-log',
    title: 'Verified Match Logs & Scorecard Proofs',
    mandatory: true,
    selectorRationale: 'Hard statistics (runs, wickets, strike rate, goals, tackles, court finish) against known competitive opposition.',
    defaultChecked: true,
  },
  {
    id: 'physical-benchmarks',
    title: 'Standard Physical Test Scores (Yo-Yo / Sprint / Jump)',
    mandatory: true,
    selectorRationale: 'Verified physical metrics (Yo-Yo IR1 score, 30m sprint time, vertical leap) demonstrate readiness for academy training loads.',
  },
  {
    id: 'coach-endorsement',
    title: 'NIS / Federation Coach Reference & Phone Verification',
    mandatory: false,
    selectorRationale: 'Direct phone contact and written reference from an NIS diploma or BCCI/AIFF licensed coach builds instant trust.',
  },
  {
    id: 'match-footage',
    title: 'High-Definition Match Footage Reel Link (Not Nets Only)',
    mandatory: true,
    selectorRationale: 'Professional selectors prioritize unedited in-match footage showing positioning, tactical vision, and temperament under match pressure.',
  },
  {
    id: 'medical-clearance',
    title: 'Cardiac & General Sports Physical Clearance',
    mandatory: false,
    selectorRationale: 'Certificate of fitness to participate in maximum-exertion selection trials without cardiovascular risk.',
  },
  {
    id: 'injury-history',
    title: 'Documented Injury & Rehabilitation History',
    mandatory: false,
    selectorRationale: 'Full transparency regarding ligament, meniscus, or stress fractures prevents sudden rejection during academy medical screening.',
  },
  {
    id: 'guardian-noc',
    title: 'Guardian Consent & NOC (Mandatory for Minors U-18)',
    mandatory: true,
    selectorRationale: 'Legal parent/guardian authorization required by all official federations and residential academies for minors.',
  },
  {
    id: 'institution-noc',
    title: 'School / College / Employer Sports NOC',
    mandatory: false,
    selectorRationale: 'Ensures leave permission for multi-week national coaching camps and inter-state tournaments.',
  },
  {
    id: 'gear-specs',
    title: 'Equipment & Anthropometric Measurements',
    mandatory: false,
    selectorRationale: 'Height, wingspan, dominant hand/foot, and equipment specifications (bat weight, shoe size, racket tension).',
  },
]

/* =========================================================================
   10. SCHOLARSHIP & SPORTS QUOTA RECRUITMENT MATCHER
   ========================================================================= */
export interface ScholarshipInputs {
  age: number
  highestAchievement: 'intl' | 'sr_nat_gold' | 'sr_nat_medal' | 'khelo_india' | 'jr_nat_medal' | 'aiu_medal' | 'state_medal' | 'district'
  category: 'general' | 'obc' | 'sc_st' | 'ews'
  employment: 'student' | 'unemployed' | 'employed'
}

export interface QualifiedScheme {
  schemeName: string
  authority: string
  financialBenefit: string
  eligibilityVerdict: string
  recruitmentTier?: string
  priorityLevel: 'High' | 'Medium' | 'Informational'
}

export function matchScholarships(inputs: ScholarshipInputs): QualifiedScheme[] {
  const schemes: QualifiedScheme[] = []

  // SAI Khelo India Talent Development Scheme
  if (['intl', 'sr_nat_gold', 'sr_nat_medal', 'khelo_india', 'jr_nat_medal'].includes(inputs.highestAchievement) && inputs.age <= 21) {
    schemes.push({
      schemeName: 'SAI Khelo India Talent Scholarship',
      authority: 'Sports Authority of India (MYAS)',
      financialBenefit: '₹5,00,000 per annum (₹1.2 Lakh out-of-pocket allowance + boarding, coaching, medical & kit support)',
      eligibilityVerdict: 'Eligible: Age ≤ 21 with podium finish at National / Khelo India level.',
      priorityLevel: 'High',
    })
  }

  // Indian Railways Sports Quota
  if (['intl', 'sr_nat_gold', 'sr_nat_medal', 'khelo_india', 'aiu_medal'].includes(inputs.highestAchievement) && inputs.age >= 18 && inputs.age <= 25) {
    schemes.push({
      schemeName: 'Indian Railways Sports Quota Recruitment (Level 2 to Level 5)',
      authority: 'Railway Recruitment Control Board (RRCB)',
      financialBenefit: 'Direct Central Govt Permanent Job (Grade Pay ₹1900 – ₹2800) + full sports leave & diet allowance',
      eligibilityVerdict: 'Eligible: Age 18–25 with Senior National or Inter-University podium finish.',
      recruitmentTier: 'Group C / Level 2-5 Direct Entry',
      priorityLevel: 'High',
    })
  }

  // State Police / Armed Forces Quota
  if (['intl', 'sr_nat_gold', 'sr_nat_medal', 'khelo_india', 'jr_nat_medal', 'aiu_medal', 'state_medal'].includes(inputs.highestAchievement) && inputs.age >= 18 && inputs.age <= 28) {
    schemes.push({
      schemeName: 'State Police & Paramilitary Sports Quota (CRPF / CISF / ITBP)',
      authority: 'State Police Departments & Central Armed Police Forces',
      financialBenefit: 'Direct Head Constable / Sub-Inspector sports recruitment with government pension & departmental honors',
      eligibilityVerdict: 'Eligible: State or National medal holder meeting physical chest/height standards.',
      recruitmentTier: 'Constable / Sub-Inspector Entry',
      priorityLevel: 'High',
    })
  }

  // State Govt Cash Incentives
  if (['intl', 'sr_nat_gold', 'sr_nat_medal', 'khelo_india', 'jr_nat_medal', 'state_medal'].includes(inputs.highestAchievement)) {
    schemes.push({
      schemeName: 'State Sports Cash Award & Scholarship Scheme',
      authority: 'State Youth Affairs & Sports Directorate',
      financialBenefit: '₹25,000 to ₹10,00,000 one-time state cash incentive depending on medal tier',
      eligibilityVerdict: 'Eligible: Recognized state championship or national representation representing your home state.',
      priorityLevel: 'Medium',
    })
  }

  // Grassroots / University Development
  if (inputs.highestAchievement === 'district' || inputs.highestAchievement === 'state_medal') {
    schemes.push({
      schemeName: 'District Sports Council & SAI Training Centre (STC) Scheme',
      authority: 'Sports Authority of India Regional Centres',
      financialBenefit: 'Free residential stay, subsidized sports kit, scientific fitness testing, and diet subsidy',
      eligibilityVerdict: 'Eligible: District winner or State participant eligible for STC / NCOE open trials.',
      priorityLevel: 'Medium',
    })
  }

  return schemes
}

/* =========================================================================
   11. MATCH-FEE ROI & SELECTION PROBABILITY CALCULATOR
   ========================================================================= */
export interface MatchFeeRoiInputs {
  entryFee: number // e.g. 1500
  travelStayCost: number // e.g. 2000
  scoutsPresent: number // e.g. 8
  competingAthletes: number // e.g. 250
  selectionSlots: number // e.g. 15
  callbackRate: number // e.g. 6%
}

export interface MatchFeeRoiResult {
  totalOutlay: number
  costPerScoutImpression: number
  selectionOddsPercent: number
  expectedValueScore: number // 0 to 100
  roiRating: 'Exceptional ROI' | 'Fair Market Value' | 'Low Exposure / Caution' | 'High Risk / Unverified'
  ratingClass: 'optimal' | 'good' | 'warning' | 'danger'
  warningFlag: string | null
}

export function calculateMatchFeeRoi(inputs: MatchFeeRoiInputs): MatchFeeRoiResult {
  const totalOutlay = inputs.entryFee + inputs.travelStayCost
  const costPerScoutImpression = inputs.scoutsPresent > 0 ? Math.round(totalOutlay / inputs.scoutsPresent) : totalOutlay
  const selectionOddsPercent = inputs.competingAthletes > 0 ? Math.round((inputs.selectionSlots / inputs.competingAthletes) * 1000) / 10 : 5.0

  let expectedValueScore = 50
  if (inputs.entryFee === 0) expectedValueScore = 95
  else {
    const impressionValue = inputs.scoutsPresent * 25
    const oddsValue = selectionOddsPercent * 3
    const callbackValue = inputs.callbackRate * 2
    const feeDeduction = (inputs.entryFee / 250)
    expectedValueScore = Math.max(10, Math.min(100, Math.round(impressionValue + oddsValue + callbackValue - feeDeduction)))
  }

  let roiRating: MatchFeeRoiResult['roiRating'] = 'Fair Market Value'
  let ratingClass: MatchFeeRoiResult['ratingClass'] = 'good'
  let warningFlag: string | null = null

  if (inputs.entryFee > 2500 && inputs.scoutsPresent <= 2) {
    roiRating = 'High Risk / Unverified'
    ratingClass = 'danger'
    warningFlag = 'RED FLAG: Entry fee exceeds ₹2,500 with fewer than 2 verifiable scouts present. Beware of commercial pay-to-play operators.'
  } else if (expectedValueScore >= 75) {
    roiRating = 'Exceptional ROI'
    ratingClass = 'optimal'
  } else if (expectedValueScore >= 50) {
    roiRating = 'Fair Market Value'
    ratingClass = 'good'
  } else {
    roiRating = 'Low Exposure / Caution'
    ratingClass = 'warning'
  }

  return {
    totalOutlay,
    costPerScoutImpression,
    selectionOddsPercent,
    expectedValueScore,
    roiRating,
    ratingClass,
    warningFlag,
  }
}

/* =========================================================================
   12. ACADEMY SHORTLIST & QUALITY EVALUATOR
   ========================================================================= */
export interface AcademyEvalInputs {
  sport: string
  maxAnnualFee: number // e.g. 120000
  needsHostel: boolean
  coachTier: 'nis_bcci3' | 'bcci2_afcb' | 'state_licensed' | 'unaccredited'
  priority: 'pro_pathway' | 'all_round' | 'recreational'
}

export interface AcademyEvalResult {
  fitScore: number // 0 to 100
  estimated3YrCost: number
  tierVerdict: string
  selectorQuestions: string[]
}

export function calculateAcademyFit(inputs: AcademyEvalInputs): AcademyEvalResult {
  let fitScore = 70

  if (inputs.coachTier === 'nis_bcci3') fitScore += 20
  else if (inputs.coachTier === 'bcci2_afcb') fitScore += 12
  else if (inputs.coachTier === 'unaccredited') fitScore -= 25

  if (inputs.maxAnnualFee >= 100000 && inputs.needsHostel) fitScore += 10
  else if (inputs.maxAnnualFee < 60000 && inputs.needsHostel) fitScore -= 15

  fitScore = Math.max(25, Math.min(98, fitScore))

  const annualBase = inputs.maxAnnualFee
  const hostelExtra = inputs.needsHostel ? 90000 : 0
  const tournamentTravelExtra = 35000
  const estimated3YrCost = (annualBase + hostelExtra + tournamentTravelExtra) * 3

  let tierVerdict = 'High Pathway Potential'
  if (fitScore < 50) tierVerdict = 'Caution: Verify Infrastructure & Coaches'
  else if (fitScore < 75) tierVerdict = 'Solid Grassroots Development'

  const selectorQuestions = [
    'How many players from your academy have represented State or District squads in the last 24 months?',
    'Are all head coaches NIS Diploma holders or Level-2/AFC-B accredited?',
    'Does the academy manage official federation tournament entries or only private invitation leagues?',
    'What is the coach-to-student ratio on practice turf and match days?',
  ]

  return {
    fitScore,
    estimated3YrCost,
    tierVerdict,
    selectorQuestions,
  }
}

/* =========================================================================
   13. BOOST VS ORGANIC REACH ESTIMATOR FOR ORGANIZERS
   ========================================================================= */
export interface BoostReachInputs {
  eventType: 'trial' | 'tournament' | 'academy_camp' | 'box_league'
  cityTier: 'metro' | 'tier2' | 'district'
  budgetInr: number // 0 to 15000
  listingDurationDays: number // 7 to 30
}

export interface BoostReachResult {
  organicViews: number
  boostedViews: number
  totalImpressions: number
  projectedRegistrations: number
  directWhatsappInquiries: number
  costPerRegisteredAthlete: number
  reachMultiplier: number
}

export function calculateBoostReach(inputs: BoostReachInputs): BoostReachResult {
  let baseViewsPerDay = 45
  if (inputs.cityTier === 'metro') baseViewsPerDay = 110
  else if (inputs.cityTier === 'tier2') baseViewsPerDay = 75

  const organicViews = Math.round(baseViewsPerDay * inputs.listingDurationDays)

  // Boost adds verified impressions: ~12-15 impressions per ₹1 spent
  const boostedImpressions = Math.round(inputs.budgetInr * 14.5)
  const totalImpressions = organicViews + boostedImpressions

  // Typical CTR & conversion for grassroots sports:
  // 3.5% registration rate from viewers
  const projectedRegistrations = Math.max(8, Math.round(totalImpressions * 0.032))
  const directWhatsappInquiries = Math.round(projectedRegistrations * 0.45)

  const costPerRegisteredAthlete = inputs.budgetInr > 0 ? Math.round(inputs.budgetInr / projectedRegistrations) : 0
  const reachMultiplier = organicViews > 0 ? Math.round((totalImpressions / organicViews) * 10) / 10 : 1.0

  return {
    organicViews,
    boostedViews: boostedImpressions,
    totalImpressions,
    projectedRegistrations,
    directWhatsappInquiries,
    costPerRegisteredAthlete,
    reachMultiplier,
  }
}

/* =========================================================================
   14. TRIAL-DAY PACKING CHECKLIST
   ========================================================================= */
export interface PackingItem {
  id: string
  category: 'docs' | 'gear' | 'nutrition' | 'medical'
  categoryLabel: string
  title: string
  detail: string
}

export const TRIAL_PACKING_ITEMS: PackingItem[] = [
  // 1. Documents
  { id: 'p1', category: 'docs', categoryLabel: 'Essential Documents', title: 'Original Aadhaar Card + 3 Photocopies', detail: 'Mandatory for identity verification and biometric scanning at entry gates.' },
  { id: 'p2', category: 'docs', categoryLabel: 'Essential Documents', title: 'Original Birth Certificate (Digital QR / Municipal)', detail: 'Compulsory proof for age verification under BCCI / SAI guidelines.' },
  { id: 'p3', category: 'docs', categoryLabel: 'Essential Documents', title: 'Official Registration Slip / Federation Card', detail: 'BCCI CRID, AIFF CRS ID, or trial registration confirmation slip.' },
  { id: 'p4', category: 'docs', categoryLabel: 'Essential Documents', title: '4 Passport-Size Photographs (White Background)', detail: 'Required for selector score-sheets, bib tags, and medical forms.' },
  { id: 'p5', category: 'docs', categoryLabel: 'Essential Documents', title: 'School / College / Employer Sports NOC', detail: 'Proof of permission to participate from your educational institution.' },
  { id: 'p6', category: 'docs', categoryLabel: 'Essential Documents', title: 'Doctor Medical Fitness & Cardiac Clearance', detail: 'Signed by registered MBBS practitioner within last 30 days.' },

  // 2. Playing Gear
  { id: 'p7', category: 'gear', categoryLabel: 'Kit & Equipment', title: 'Competition Kit (Jersey + Shorts) + 1 Clean Spare', detail: 'Wear plain colors (white for cricket, neutral for trials) without loud sponsor logos.' },
  { id: 'p8', category: 'gear', categoryLabel: 'Kit & Equipment', title: 'Competition Footwear (Spikes / Studs / Court Shoes)', detail: 'Check surface beforehand: grass cleats vs synthetic turf vs wooden court.' },
  { id: 'p9', category: 'gear', categoryLabel: 'Kit & Equipment', title: 'Protective Equipment (Shin Guards / Box / Pads / Gloves)', detail: 'Do not rely on venue equipment; personal fit prevents blister and contact injuries.' },
  { id: 'p10', category: 'gear', categoryLabel: 'Kit & Equipment', title: '2 Extra Pairs of Sweat-Wicking Sports Socks', detail: 'Fresh dry socks during trial breaks prevent friction blisters.' },
  { id: 'p11', category: 'gear', categoryLabel: 'Kit & Equipment', title: 'Quick-Dry Microfiber Sweat Towel', detail: 'Keep hands and grips dry for precise ball and racket handling.' },

  // 3. Nutrition & Hydration
  { id: 'p12', category: 'nutrition', categoryLabel: 'Nutrition & Hydration', title: '2 Litres Water Bottle with Electrolyte / ORS Mix', detail: 'Trial days run 4–8 hours under high heat; plain water alone causes hyponatremia cramps.' },
  { id: 'p13', category: 'nutrition', categoryLabel: 'Nutrition & Hydration', title: 'Quick High-Glycemic Carbs (Bananas & Dates)', detail: 'Instant glycogen replenishment between physical tests and match simulations.' },
  { id: 'p14', category: 'nutrition', categoryLabel: 'Nutrition & Hydration', title: 'Whey Protein / Sattu Shake for Post-Trial Recovery', detail: 'Kickstarts muscle repair within the critical 45-minute post-trial recovery window.' },

  // 4. Medical & First-Aid
  { id: 'p15', category: 'medical', categoryLabel: 'Medical & First-Aid', title: 'Fast-Acting Pain Relief Spray (Volini / Moov)', detail: 'Immediate relief for acute impact knocks and muscle stiffness.' },
  { id: 'p16', category: 'medical', categoryLabel: 'Medical & First-Aid', title: 'Zinc Oxide Sports Strapping Tape & Band-Aids', detail: 'For blister hotspots, ankle support, and finger joint stabilization.' },
  { id: 'p17', category: 'medical', categoryLabel: 'Medical & First-Aid', title: 'Crepe Elastic Bandage (10cm)', detail: 'For emergency compression of sprains or joint strains.' },
  { id: 'p18', category: 'medical', categoryLabel: 'Medical & First-Aid', title: 'Personal Prescribed Medications / Inhaler', detail: 'Keep readily accessible in kit side pocket with emergency contact note.' },
]
