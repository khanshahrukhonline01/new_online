import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  ALL_SPORTS_TOOLS,
  SPORTS_CV_CHECKLIST_ITEMS,
  TRIAL_PACKING_ITEMS,
  type ToolCategory,
  type ToolDefinition,
  calculateTrialReadiness,
  calculateAgeEligibility,
  calculateVo2Max,
  calculateCalorieNeeds,
  calculateSprintSplits,
  calculateTurfSplit,
  calculateTravelBudget,
  calculateWeeklyLoad,
  matchScholarships,
  calculateMatchFeeRoi,
  calculateAcademyFit,
  calculateBoostReach,
} from './toolsData'
import './SportsToolsPage.css'

export interface SportsToolsPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  initialToolSlug?: string
}

export default function SportsToolsPage({ onNavigate, initialToolSlug }: SportsToolsPageProps) {
  // 1. Tool Selection State
  const [selectedToolSlug, setSelectedToolSlug] = useState<string>(() => {
    if (initialToolSlug && ALL_SPORTS_TOOLS.some(t => t.slug === initialToolSlug)) {
      return initialToolSlug
    }
    if (typeof window !== 'undefined') {
      const urlTool = new URLSearchParams(window.location.search).get('tool')
      if (urlTool && ALL_SPORTS_TOOLS.some(t => t.slug === urlTool)) {
        return urlTool
      }
    }
    return 'trial-readiness-score'
  })

  // 2. Category & Search Filters
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Sync with initialToolSlug if changed via props
  useEffect(() => {
    if (initialToolSlug && ALL_SPORTS_TOOLS.some(t => t.slug === initialToolSlug)) {
      setSelectedToolSlug(initialToolSlug)
    }
  }, [initialToolSlug])

  // Active Tool Definition
  const activeTool = useMemo<ToolDefinition>(() => {
    return ALL_SPORTS_TOOLS.find(t => t.slug === selectedToolSlug) || ALL_SPORTS_TOOLS[0]
  }, [selectedToolSlug])

  // Filtered Tool List
  const filteredTools = useMemo(() => {
    return ALL_SPORTS_TOOLS.filter(t => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
      const q = searchQuery.trim().toLowerCase()
      if (!q) return matchesCategory
      const matchesQuery =
        t.name.toLowerCase().includes(q) ||
        t.hindiName.toLowerCase().includes(q) ||
        t.blurb.toLowerCase().includes(q) ||
        t.sportDisciplines.some(s => s.toLowerCase().includes(q))
      return matchesCategory && matchesQuery
    })
  }, [selectedCategory, searchQuery])

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: ALL_SPORTS_TOOLS.length,
      'trial-scouting': ALL_SPORTS_TOOLS.filter(t => t.category === 'trial-scouting').length,
      'fitness-science': ALL_SPORTS_TOOLS.filter(t => t.category === 'fitness-science').length,
      'organizer-match': ALL_SPORTS_TOOLS.filter(t => t.category === 'organizer-match').length,
    }
  }, [])

  function handleSelectTool(slug: string) {
    setSelectedToolSlug(slug)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tool', slug)
      window.history.replaceState({}, '', url.toString())
      const workbench = document.getElementById('tool-workbench')
      if (workbench) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  function handleCopyShare(text: string, slug: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedSlug(slug)
        setTimeout(() => setCopiedSlug(null), 3000)
      })
    }
  }

  /* --------------------------------------------------------------------------
     INPUT STATES FOR EACH INDIVIDUAL TOOL
     -------------------------------------------------------------------------- */
  // 1. Trial Readiness Score
  const [readinessSessions, setReadinessSessions] = useState(6)
  const [readinessSleep, setReadinessSleep] = useState(8)
  const [readinessPrDelta, setReadinessPrDelta] = useState(3)
  const [readinessNutrition, setReadinessNutrition] = useState(4)
  const [readinessConfidence, setReadinessConfidence] = useState(4)
  const [readinessSport, setReadinessSport] = useState('Cricket')

  const readinessResult = useMemo(() => {
    return calculateTrialReadiness({
      sessionsPerWeek: readinessSessions,
      sleepHours: readinessSleep,
      prDeltaPercent: readinessPrDelta,
      nutritionConsistency: readinessNutrition,
      mentalConfidence: readinessConfidence,
      sport: readinessSport,
    })
  }, [readinessSessions, readinessSleep, readinessPrDelta, readinessNutrition, readinessConfidence, readinessSport])

  // 2. Age Category Eligibility
  const [ageBirthDate, setAgeBirthDate] = useState('2009-07-15')
  const [ageFederation, setAgeFederation] = useState<'bcci' | 'sai' | 'aiu' | 'sgfi'>('bcci')
  const [ageSeasonYear, setAgeSeasonYear] = useState(2026)

  const ageResult = useMemo(() => {
    return calculateAgeEligibility({
      birthDate: ageBirthDate,
      federation: ageFederation,
      seasonYear: ageSeasonYear,
    })
  }, [ageBirthDate, ageFederation, ageSeasonYear])

  // 3. VO2 Max
  const [vo2Method, setVo2Method] = useState<'cooper' | 'yoyo' | 'run24'>('cooper')
  const [vo2CooperMeters, setVo2CooperMeters] = useState(2800)
  const [vo2YoyoLevel, setVo2YoyoLevel] = useState(16)
  const [vo2YoyoShuttle, setVo2YoyoShuttle] = useState(4)
  const [vo2RunMins, setVo2RunMins] = useState(9)
  const [vo2RunSecs, setVo2RunSecs] = useState(45)
  const [vo2Gender, setVo2Gender] = useState<'male' | 'female'>('male')
  const [vo2Age, setVo2Age] = useState(19)
  const [vo2Sport, setVo2Sport] = useState('Football')

  const vo2Result = useMemo(() => {
    return calculateVo2Max({
      method: vo2Method,
      cooperMeters: vo2CooperMeters,
      yoyoLevel: vo2YoyoLevel,
      yoyoShuttle: vo2YoyoShuttle,
      run24Minutes: vo2RunMins,
      run24Seconds: vo2RunSecs,
      gender: vo2Gender,
      age: vo2Age,
      sport: vo2Sport,
    })
  }, [vo2Method, vo2CooperMeters, vo2YoyoLevel, vo2YoyoShuttle, vo2RunMins, vo2RunSecs, vo2Gender, vo2Age, vo2Sport])

  // 4. Calorie Needs
  const [calGender, setCalGender] = useState<'male' | 'female'>('male')
  const [calAge, setCalAge] = useState(18)
  const [calWeight, setCalWeight] = useState(68)
  const [calHeight, setCalHeight] = useState(175)
  const [calHours, setCalHours] = useState(3.0)
  const [calGoal, setCalGoal] = useState<'maintain' | 'muscle_gain' | 'fat_loss'>('maintain')

  const calResult = useMemo(() => {
    return calculateCalorieNeeds({
      gender: calGender,
      age: calAge,
      weightKg: calWeight,
      heightCm: calHeight,
      trainingHoursPerDay: calHours,
      sportIntensity: 'high',
      goal: calGoal,
    })
  }, [calGender, calAge, calWeight, calHeight, calHours, calGoal])

  // 5. Weekly Load & ACWR
  const [loadW1, setLoadW1] = useState(12)
  const [loadW2, setLoadW2] = useState(14)
  const [loadW3, setLoadW3] = useState(13)
  const [loadW4, setLoadW4] = useState(15)
  const [loadPlanned, setLoadPlanned] = useState(16)
  const [loadDaysToTrial, setLoadDaysToTrial] = useState(6)

  const loadResult = useMemo(() => {
    return calculateWeeklyLoad({
      pastWeek1: loadW1,
      pastWeek2: loadW2,
      pastWeek3: loadW3,
      pastWeek4: loadW4,
      plannedWeek: loadPlanned,
      daysToTrial: loadDaysToTrial,
    })
  }, [loadW1, loadW2, loadW3, loadW4, loadPlanned, loadDaysToTrial])

  // 6. Sprint Splits
  const [sprintTime100m, setSprintTime100m] = useState(11.4)
  const [sprintReaction, setSprintReaction] = useState(0.16)

  const sprintResult = useMemo(() => {
    return calculateSprintSplits({
      time100m: sprintTime100m,
      reactionTime: sprintReaction,
    })
  }, [sprintTime100m, sprintReaction])

  // 7. Turf Cost Splitter
  const [turfSlotFee, setTurfSlotFee] = useState(1800)
  const [turfLightsFee, setTurfLightsFee] = useState(250)
  const [turfSnacksFee, setTurfSnacksFee] = useState(150)
  const [turfPlayersCount, setTurfPlayersCount] = useState(12)
  const [turfSubsCount, setTurfSubsCount] = useState(2)
  const [turfSubsDiscount, setTurfSubsDiscount] = useState(50)
  const [turfUpiId, setTurfUpiId] = useState('khelgrid-captain@okhdfcbank')
  const [turfVenueName, setTurfVenueName] = useState('Urban Turf Arena, Sector 21')

  const turfResult = useMemo(() => {
    return calculateTurfSplit({
      slotFee: turfSlotFee,
      lightAndBallFee: turfLightsFee,
      otherExpenses: turfSnacksFee,
      playersCount: turfPlayersCount,
      subsCount: turfSubsCount,
      subsDiscountPercent: turfSubsDiscount,
      organizerUpiId: turfUpiId,
      venueName: turfVenueName,
    })
  }, [turfSlotFee, turfLightsFee, turfSnacksFee, turfPlayersCount, turfSubsCount, turfSubsDiscount, turfUpiId, turfVenueName])

  // 8. Travel Budget Estimator
  const [travelFrom, setTravelFrom] = useState('Patna')
  const [travelTo, setTravelTo] = useState('Bengaluru')
  const [travelClass, setTravelClass] = useState<'sleeper' | '3ac' | '2ac_vande' | 'flight'>('3ac')
  const [travelDays, setTravelDays] = useState(3)
  const [travelLodging, setTravelLodging] = useState<'dharamsala' | 'budget_hotel' | 'comfort_hotel'>('budget_hotel')
  const [travelSolo, setTravelSolo] = useState(true)

  const travelResult = useMemo(() => {
    return calculateTravelBudget({
      fromCity: travelFrom,
      toCity: travelTo,
      travelClass,
      daysStay: travelDays,
      lodgingType: travelLodging,
      isSolo: travelSolo,
    })
  }, [travelFrom, travelTo, travelClass, travelDays, travelLodging, travelSolo])

  // 9. Match-Fee ROI
  const [roiFee, setRoiFee] = useState(1500)
  const [roiTravel, setRoiTravel] = useState(1800)
  const [roiScouts, setRoiScouts] = useState(8)
  const [roiAthletes, setRoiAthletes] = useState(220)
  const [roiSlots, setRoiSlots] = useState(16)
  const [roiCallback, setRoiCallback] = useState(7)

  const roiResult = useMemo(() => {
    return calculateMatchFeeRoi({
      entryFee: roiFee,
      travelStayCost: roiTravel,
      scoutsPresent: roiScouts,
      competingAthletes: roiAthletes,
      selectionSlots: roiSlots,
      callbackRate: roiCallback,
    })
  }, [roiFee, roiTravel, roiScouts, roiAthletes, roiSlots, roiCallback])

  // 10. Scholarship Matcher
  const [scholAge, setScholAge] = useState(17)
  const [scholAchievement, setScholAchievement] = useState<'intl' | 'sr_nat_gold' | 'sr_nat_medal' | 'khelo_india' | 'jr_nat_medal' | 'aiu_medal' | 'state_medal' | 'district'>('khelo_india')
  const [scholCategory, setScholCategory] = useState<'general' | 'obc' | 'sc_st' | 'ews'>('general')

  const matchedSchemes = useMemo(() => {
    return matchScholarships({
      age: scholAge,
      highestAchievement: scholAchievement,
      category: scholCategory,
      employment: 'student',
    })
  }, [scholAge, scholAchievement, scholCategory])

  // 11. Academy Shortlist Builder
  const [acadMaxFee, setAcadMaxFee] = useState(120000)
  const [acadHostel, setAcadHostel] = useState(true)
  const [acadCoachTier, setAcadCoachTier] = useState<'nis_bcci3' | 'bcci2_afcb' | 'state_licensed' | 'unaccredited'>('nis_bcci3')

  const acadResult = useMemo(() => {
    return calculateAcademyFit({
      sport: 'Cricket',
      maxAnnualFee: acadMaxFee,
      needsHostel: acadHostel,
      coachTier: acadCoachTier,
      priority: 'pro_pathway',
    })
  }, [acadMaxFee, acadHostel, acadCoachTier])

  // 12. Boost Reach Estimator
  const [boostBudget, setBoostBudget] = useState(1500)
  const [boostCityTier, setBoostCityTier] = useState<'metro' | 'tier2' | 'district'>('metro')
  const [boostDays, setBoostDays] = useState(14)

  const boostResult = useMemo(() => {
    return calculateBoostReach({
      eventType: 'trial',
      cityTier: boostCityTier,
      budgetInr: boostBudget,
      listingDurationDays: boostDays,
    })
  }, [boostBudget, boostCityTier, boostDays])

  // 13. Sports CV Checklist State (with localStorage)
  const [cvChecked, setCvChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem('khelgrid_tools_cv_checklist')
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore
    }
    const init: Record<string, boolean> = {}
    SPORTS_CV_CHECKLIST_ITEMS.forEach(item => {
      init[item.id] = !!item.defaultChecked
    })
    return init
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('khelgrid_tools_cv_checklist', JSON.stringify(cvChecked))
    } catch {
      // Ignore
    }
  }, [cvChecked])

  function toggleCvCheck(id: string) {
    setCvChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const cvCompletionPercent = useMemo(() => {
    const total = SPORTS_CV_CHECKLIST_ITEMS.length
    const checked = SPORTS_CV_CHECKLIST_ITEMS.filter(item => cvChecked[item.id]).length
    return Math.round((checked / total) * 100)
  }, [cvChecked])

  // 14. Trial-Day Packing Checklist State (with localStorage)
  const [packingChecked, setPackingChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem('khelgrid_tools_packing_list')
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore
    }
    return { p1: true, p2: true, p7: true, p8: true, p12: true }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('khelgrid_tools_packing_list', JSON.stringify(packingChecked))
    } catch {
      // Ignore
    }
  }, [packingChecked])

  function togglePackingCheck(id: string) {
    setPackingChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const packingCompletionCount = useMemo(() => {
    return TRIAL_PACKING_ITEMS.filter(item => packingChecked[item.id]).length
  }, [packingChecked])

  return (
    <div className="sports-tools-page-container">
      {/* 1. HERO SECTION */}
      <section className="tools-hero-section" aria-labelledby="tools-page-heading">
        <div className="tools-hero-inner">
          <nav className="tools-breadcrumb" aria-label="Breadcrumb">
            <a href="/" onClick={e => onNavigate?.(e, '/')}>Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Sports Tools &amp; Calculators</span>
          </nav>

          <div className="tools-hero-title-row">
            <div className="tools-hero-text">
              <div className="tools-badge-pill">
                <SiteIcon name="sparkles" size={14} />
                <span>14+ Verified Athlete &amp; Coach Calculators</span>
              </div>
              <h1 id="tools-page-heading" className="tools-hero-heading">
                Athlete Tools, Calculators &amp; Trial Planners
              </h1>
              <p className="tools-hero-hindi">
                खिलाड़ियों, कोचों और ट्रायल आयोजकों के लिए आधुनिक स्पोर्ट्स टूल्स व वैज्ञानिक कैलकुलेटर
              </p>
              <p className="tools-hero-sub">
                Quick painkillers for grassroots athletes — trial readiness scores, federation cut-off checks,
                VO2 max stamina estimators, sports CV checklists, and turf match fee splitters.
              </p>
            </div>
          </div>

          {/* Quick KPI Ribbon */}
          <div className="tools-kpi-ribbon" role="region" aria-label="Tools summary highlights">
            <div className="tools-kpi-card">
              <span className="tools-kpi-number">14</span>
              <span className="tools-kpi-label">Interactive Tools</span>
            </div>
            <div className="tools-kpi-card">
              <span className="tools-kpi-number">100%</span>
              <span className="tools-kpi-label">Free &amp; Open Access</span>
            </div>
            <div className="tools-kpi-card">
              <span className="tools-kpi-number">BCCI / SAI</span>
              <span className="tools-kpi-label">Cut-off Calibrated</span>
            </div>
            <div className="tools-kpi-card">
              <span className="tools-kpi-number">Instant</span>
              <span className="tools-kpi-label">WhatsApp &amp; UPI Export</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TABS & SEARCH CONTROLS */}
      <section className="tools-filter-section" aria-label="Filter and Search Tools">
        <div className="tools-filter-inner">
          <div className="tools-category-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              className={`tools-tab-button ${selectedCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Tools ({categoryCounts.all})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'trial-scouting'}
              className={`tools-tab-button ${selectedCategory === 'trial-scouting' ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory('trial-scouting')}
            >
              Trial &amp; Scouting ({categoryCounts['trial-scouting']})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'fitness-science'}
              className={`tools-tab-button ${selectedCategory === 'fitness-science' ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory('fitness-science')}
            >
              Fitness &amp; Science ({categoryCounts['fitness-science']})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'organizer-match'}
              className={`tools-tab-button ${selectedCategory === 'organizer-match' ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory('organizer-match')}
            >
              Organizer &amp; Match ({categoryCounts['organizer-match']})
            </button>
          </div>

          <div className="tools-search-box">
            <SiteIcon name="search" size={16} className="tools-search-icon" />
            <input
              type="text"
              placeholder="Search tools by name, sport, or keyword (e.g. Yo-Yo, BCCI, Turf)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="tools-search-input"
              aria-label="Search tools by name, sport, or keyword"
            />
            {searchQuery && (
              <button
                type="button"
                className="tools-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear tool search"
              >
                <SiteIcon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. ACTIVE INTERACTIVE WORKBENCH */}
      <section
        id="tool-workbench"
        className="tool-workbench-section"
        aria-labelledby="active-tool-title"
      >
        <div className="tool-workbench-container">
          <div className="tool-workbench-header">
            <div className="tool-workbench-meta">
              <span className="tool-type-badge">{activeTool.type}</span>
              <span className="tool-category-badge">{activeTool.categoryLabel}</span>
              <span className="tool-time-pill">
                <SiteIcon name="clock" size={13} /> {activeTool.estimatedTime}
              </span>
            </div>
            <div className="tool-workbench-headline">
              <h2 id="active-tool-title">{activeTool.name}</h2>
              <span className="tool-headline-hindi">{activeTool.hindiName}</span>
            </div>
            <p className="tool-workbench-blurb">{activeTool.detailedDescription}</p>

            <div className="tool-switcher-pills" role="navigation" aria-label="Quick tool switcher">
              <span className="switcher-label">Switch Tool:</span>
              <select
                value={selectedToolSlug}
                onChange={e => handleSelectTool(e.target.value)}
                className="tool-select-dropdown"
                aria-label="Select active sports tool"
              >
                {ALL_SPORTS_TOOLS.map(t => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              WORKBENCH BODY: DYNAMIC INTERACTIVE ENGINE PER TOOL
             ---------------------------------------------------------------- */}
          <div className="tool-workbench-body">
            {/* TOOL 1: TRIAL READINESS SCORE */}
            {selectedToolSlug === 'trial-readiness-score' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Your Current Training &amp; Recovery Inputs</h3>

                  <div className="input-group">
                    <label htmlFor="readiness-sessions">
                      <span>Weekly Training Sessions</span>
                      <strong className="input-val-tag">{readinessSessions} sessions / wk</strong>
                    </label>
                    <input
                      id="readiness-sessions"
                      type="range"
                      min={1}
                      max={14}
                      step={1}
                      value={readinessSessions}
                      onChange={e => setReadinessSessions(Number(e.target.value))}
                    />
                    <div className="input-range-hints">
                      <span>1 (Light)</span>
                      <span>5–7 (Optimal Combine Prep)</span>
                      <span>14 (Double Sessions)</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="readiness-sleep">
                      <span>Nightly Sleep Average</span>
                      <strong className="input-val-tag">{readinessSleep} hours / night</strong>
                    </label>
                    <input
                      id="readiness-sleep"
                      type="range"
                      min={4}
                      max={11}
                      step={0.5}
                      value={readinessSleep}
                      onChange={e => setReadinessSleep(Number(e.target.value))}
                    />
                    <div className="input-range-hints">
                      <span>4h (Severe Deficit)</span>
                      <span>8h (Growth Hormone Peak)</span>
                      <span>11h</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="readiness-pr">
                      <span>Recent Performance / PR Delta</span>
                      <strong className="input-val-tag">
                        {readinessPrDelta > 0 ? `+${readinessPrDelta}%` : `${readinessPrDelta}%`}
                      </strong>
                    </label>
                    <input
                      id="readiness-pr"
                      type="range"
                      min={-10}
                      max={15}
                      step={1}
                      value={readinessPrDelta}
                      onChange={e => setReadinessPrDelta(Number(e.target.value))}
                    />
                    <div className="input-range-hints">
                      <span>-10% (Fatigued)</span>
                      <span>0% (Stable Baseline)</span>
                      <span>+15% (Surging Peak)</span>
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="readiness-nutrition">Nutrition &amp; Hydration</label>
                      <select
                        id="readiness-nutrition"
                        value={readinessNutrition}
                        onChange={e => setReadinessNutrition(Number(e.target.value))}
                        className="tools-native-select"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5/5 — Strict Sports Diet + 3.5L Water</option>
                        <option value={4}>⭐⭐⭐⭐ 4/5 — Clean High-Protein &amp; Consistent</option>
                        <option value={3}>⭐⭐⭐ 3/5 — Average Home Food, Mild Hydration</option>
                        <option value={2}>⭐⭐ 2/5 — Inconsistent Meals &amp; Low Water</option>
                        <option value={1}>⭐ 1/5 — Skipping Meals / Fast Food</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label htmlFor="readiness-confidence">Mental Readiness &amp; Focus</label>
                      <select
                        id="readiness-confidence"
                        value={readinessConfidence}
                        onChange={e => setReadinessConfidence(Number(e.target.value))}
                        className="tools-native-select"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5/5 — Confident, Calm &amp; Focused</option>
                        <option value={4}>⭐⭐⭐⭐ 4/5 — High Motivation</option>
                        <option value={3}>⭐⭐⭐ 3/5 — Normal Nervousness</option>
                        <option value={2}>⭐⭐ 2/5 — Anxious / Stressed</option>
                        <option value={1}>⭐ 1/5 — Burned Out / Doubting</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="readiness-sport">Primary Sport Discipline</label>
                    <select
                      id="readiness-sport"
                      value={readinessSport}
                      onChange={e => setReadinessSport(e.target.value)}
                      className="tools-native-select"
                    >
                      <option value="Cricket">Cricket (Bowling / Batting)</option>
                      <option value="Football">Football / Soccer</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Kabaddi">Kabaddi</option>
                      <option value="Athletics">Athletics / Track &amp; Field</option>
                      <option value="Other">Other Olympic Sport</option>
                    </select>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className={`score-meter-box is-${readinessResult.tierClass}`}>
                    <span className="meter-label">TRIAL READINESS SCORE</span>
                    <div className="meter-value-large">
                      <span className="number">{readinessResult.score}</span>
                      <span className="total">/ 100</span>
                    </div>
                    <span className={`meter-status-badge ${readinessResult.tierClass}`}>
                      {readinessResult.tier}
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <h4 className="breakdown-heading">Scoring Breakdown</h4>
                    <div className="factor-item">
                      <span>Weekly Training Volume:</span>
                      <strong>{readinessResult.breakdown.volumeScore} / 25 pts</strong>
                    </div>
                    <div className="factor-item">
                      <span>Sleep Recovery:</span>
                      <strong>{readinessResult.breakdown.sleepScore} / 25 pts</strong>
                    </div>
                    <div className="factor-item">
                      <span>Recent PR Delta Progression:</span>
                      <strong>{readinessResult.breakdown.progressionScore} / 20 pts</strong>
                    </div>
                    <div className="factor-item">
                      <span>Nutrition &amp; Hydration:</span>
                      <strong>{readinessResult.breakdown.nutritionScore} / 15 pts</strong>
                    </div>
                    <div className="factor-item">
                      <span>Mental Readiness:</span>
                      <strong>{readinessResult.breakdown.mentalScore} / 15 pts</strong>
                    </div>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="award" size={16} />
                      <strong>Selector &amp; Coach Action Plan</strong>
                    </div>
                    <ul className="advice-list">
                      {readinessResult.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="action-buttons-row">
                    <button
                      type="button"
                      className="tool-action-btn primary"
                      onClick={() =>
                        handleCopyShare(
                          `🎯 Trial Readiness Score: ${readinessResult.score}/100 (${readinessResult.tier}) for ${readinessSport} on KhelGrid!\nCheck your score: https://khelgrid.com/tools?tool=trial-readiness-score`,
                          'readiness'
                        )
                      }
                    >
                      <SiteIcon name={copiedSlug === 'readiness' ? 'check' : 'copy'} size={15} />
                      <span>{copiedSlug === 'readiness' ? 'Copied to Clipboard!' : 'Copy Score Summary'}</span>
                    </button>
                    <a
                      href="/opportunities"
                      onClick={e => onNavigate?.(e, '/opportunities')}
                      className="tool-action-btn secondary"
                    >
                      <span>Find Matching Trials</span>
                      <SiteIcon name="arrow-up-right" size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 2: AGE CATEGORY & CUTOFF ELIGIBILITY */}
            {selectedToolSlug === 'age-category-eligibility' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Athlete Birthdate &amp; Target Federation</h3>

                  <div className="input-group">
                    <label htmlFor="age-dob">Athlete Date of Birth (as per Aadhaar / Birth Cert)</label>
                    <input
                      id="age-dob"
                      type="date"
                      value={ageBirthDate}
                      onChange={e => setAgeBirthDate(e.target.value)}
                      className="tools-native-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="age-federation">Target Governing Federation Cut-off Rule</label>
                    <select
                      id="age-federation"
                      value={ageFederation}
                      onChange={e => setAgeFederation(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="bcci">BCCI Cricket (September 1 Cut-off)</option>
                      <option value="sai">SAI Khelo India / NCOE (January 1 Cut-off)</option>
                      <option value="aiu">AIU All India Inter-University (July 1 Cut-off, Max Age 25)</option>
                      <option value="sgfi">SGFI School Games Federation (December 31 Cut-off)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="age-season">Target Competition Season</label>
                    <select
                      id="age-season"
                      value={ageSeasonYear}
                      onChange={e => setAgeSeasonYear(Number(e.target.value))}
                      className="tools-native-select"
                    >
                      <option value={2026}>2026–2027 Season</option>
                      <option value={2027}>2027–2028 Season</option>
                    </select>
                  </div>

                  <div className="info-callout">
                    <SiteIcon name="info" size={15} />
                    <p>
                      <strong>Official Indian Federation Rule:</strong> For BCCI tournaments (Vijay Merchant,
                      Vinoo Mankad, Cooch Behar), eligibility is calculated precisely on September 1. For SAI
                      Khelo India, it is January 1 of the calendar year.
                    </p>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">EXACT AGE ON OFFICIAL CUT-OFF DATE</span>
                    <div className="meter-value-large">
                      <span className="number">{ageResult.exactAgeOnCutoff.years}y </span>
                      <span className="number">{ageResult.exactAgeOnCutoff.months}m </span>
                      <span className="number">{ageResult.exactAgeOnCutoff.days}d</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      Cut-off: {ageResult.cutoffDateFormatted}
                    </span>
                  </div>

                  <div className="category-status-table-wrap">
                    <h4 className="breakdown-heading">Eligibility by Tournament Bracket</h4>
                    <table className="tools-status-table">
                      <thead>
                        <tr>
                          <th>Age Bracket</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ageResult.categories.map(cat => (
                          <tr key={cat.category} className={cat.isEligible ? 'row-eligible' : 'row-barred'}>
                            <td>
                              <strong>{cat.category}</strong>
                              <span className="cat-sublabel">{cat.label}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${cat.isEligible ? 'eligible' : 'barred'}`}>
                                {cat.isEligible ? 'Eligible' : 'Age-Barred'}
                              </span>
                            </td>
                            <td className="reason-cell">{cat.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="shield-check" size={16} />
                      <strong>Required Age Proof Documents for Trials</strong>
                    </div>
                    <ul className="advice-list">
                      <li>Digital QR Municipal Birth Certificate registered within 1 year of birth.</li>
                      <li>Original Aadhaar Card with active mobile link for biometric verification.</li>
                      <li>TW3 Bone Age Tanner-Whitehouse 3 wrist X-ray test report (compulsory for BCCI U-16).</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 3: VO2 MAX ESTIMATOR */}
            {selectedToolSlug === 'vo2-max-estimator' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Aerobic Capacity &amp; Endurance Test Protocol</h3>

                  <div className="input-group">
                    <label htmlFor="vo2-method">Fitness Assessment Protocol</label>
                    <select
                      id="vo2-method"
                      value={vo2Method}
                      onChange={e => setVo2Method(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="cooper">12-Minute Cooper Run (Distance in Meters)</option>
                      <option value="yoyo">Yo-Yo Intermittent Recovery Test (IR1 Level &amp; Shuttle)</option>
                      <option value="run24">2.4 km (1.5 Mile) Run Time (Minutes &amp; Seconds)</option>
                    </select>
                  </div>

                  {vo2Method === 'cooper' && (
                    <div className="input-group">
                      <label htmlFor="vo2-cooper">
                        <span>12-Minute Run Distance (meters)</span>
                        <strong className="input-val-tag">{vo2CooperMeters} meters</strong>
                      </label>
                      <input
                        id="vo2-cooper"
                        type="range"
                        min={1200}
                        max={4200}
                        step={50}
                        value={vo2CooperMeters}
                        onChange={e => setVo2CooperMeters(Number(e.target.value))}
                      />
                      <div className="input-range-hints">
                        <span>1,800m (Base)</span>
                        <span>2,800m (State Athlete)</span>
                        <span>3,600m (National Elite)</span>
                      </div>
                    </div>
                  )}

                  {vo2Method === 'yoyo' && (
                    <div className="input-row-duo">
                      <div className="input-group">
                        <label htmlFor="vo2-level">Yo-Yo IR1 Level (e.g. 16)</label>
                        <input
                          id="vo2-level"
                          type="number"
                          min={10}
                          max={23}
                          value={vo2YoyoLevel}
                          onChange={e => setVo2YoyoLevel(Number(e.target.value))}
                          className="tools-native-input"
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="vo2-shuttle">Shuttle Count (1 to 8)</label>
                        <input
                          id="vo2-shuttle"
                          type="number"
                          min={1}
                          max={8}
                          value={vo2YoyoShuttle}
                          onChange={e => setVo2YoyoShuttle(Number(e.target.value))}
                          className="tools-native-input"
                        />
                      </div>
                    </div>
                  )}

                  {vo2Method === 'run24' && (
                    <div className="input-row-duo">
                      <div className="input-group">
                        <label htmlFor="vo2-mins">2.4km Time: Minutes</label>
                        <input
                          id="vo2-mins"
                          type="number"
                          min={6}
                          max={20}
                          value={vo2RunMins}
                          onChange={e => setVo2RunMins(Number(e.target.value))}
                          className="tools-native-input"
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="vo2-secs">Seconds</label>
                        <input
                          id="vo2-secs"
                          type="number"
                          min={0}
                          max={59}
                          value={vo2RunSecs}
                          onChange={e => setVo2RunSecs(Number(e.target.value))}
                          className="tools-native-input"
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="vo2-age">Age (Years)</label>
                      <input id="vo2-age" type="number" min={12} max={50} value={vo2Age} onChange={e => setVo2Age(Number(e.target.value))} className="tools-native-input" />
                    </div>
                    <div className="input-group">
                      <label htmlFor="vo2-gender">Gender</label>
                      <select
                        id="vo2-gender"
                        value={vo2Gender}
                        onChange={e => setVo2Gender(e.target.value as any)}
                        className="tools-native-select"
                      >
                        <option value="male">Male Athlete</option>
                        <option value="female">Female Athlete</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label htmlFor="vo2-sport">Sport Discipline</label>
                      <select
                        id="vo2-sport"
                        value={vo2Sport}
                        onChange={e => setVo2Sport(e.target.value)}
                        className="tools-native-select"
                      >
                        <option value="Football">Football / Midfield</option>
                        <option value="Cricket">Cricket (Fast Bowler / Pacer)</option>
                        <option value="Badminton">Badminton Singles</option>
                        <option value="Kabaddi">Kabaddi Raider</option>
                        <option value="Athletics">Athletics / Middle Distance</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className={`score-meter-box is-${vo2Result.ratingClass}`}>
                    <span className="meter-label">ESTIMATED VO2 MAX</span>
                    <div className="meter-value-large">
                      <span className="number">{vo2Result.vo2max}</span>
                      <span className="unit"> ml / kg / min</span>
                    </div>
                    <span className={`meter-status-badge ${vo2Result.ratingClass}`}>
                      {vo2Result.rating} Cardiovascular Stamina
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <h4 className="breakdown-heading">Aerobic Benchmark Comparison</h4>
                    <div className="factor-item">
                      <span>National Percentile:</span>
                      <strong>Top {100 - vo2Result.comparisonPercentile}% of Age Group</strong>
                    </div>
                    <div className="factor-item">
                      <span>Target {vo2Sport} Benchmark:</span>
                      <strong>{vo2Result.sportBenchmarkAvg} ml/kg/min</strong>
                    </div>
                    <div className="factor-item">
                      <span>Indian National Team Camp Standard:</span>
                      <strong>58.0 – 62.5 ml/kg/min</strong>
                    </div>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="activity" size={16} />
                      <strong>Physiology &amp; Training Recommendation</strong>
                    </div>
                    <p className="advice-text">{vo2Result.coachInsight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 4: CALORIE & MACRO NEEDS */}
            {selectedToolSlug === 'calorie-needs-athlete' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Athlete Body Composition &amp; Activity</h3>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="cal-gender">Gender</label>
                      <select
                        id="cal-gender"
                        value={calGender}
                        onChange={e => setCalGender(e.target.value as any)}
                        className="tools-native-select"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label htmlFor="cal-age">Age (Years)</label>
                      <input
                        id="cal-age"
                        type="number"
                        min={12}
                        max={45}
                        value={calAge}
                        onChange={e => setCalAge(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="cal-weight">Weight (kg)</label>
                      <input
                        id="cal-weight"
                        type="number"
                        min={30}
                        max={140}
                        value={calWeight}
                        onChange={e => setCalWeight(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="cal-height">Height (cm)</label>
                      <input
                        id="cal-height"
                        type="number"
                        min={120}
                        max={220}
                        value={calHeight}
                        onChange={e => setCalHeight(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="cal-hours">
                      <span>Daily Training &amp; Match Play</span>
                      <strong className="input-val-tag">{calHours} hours / day</strong>
                    </label>
                    <input
                      id="cal-hours"
                      type="range"
                      min={0.5}
                      max={6.0}
                      step={0.5}
                      value={calHours}
                      onChange={e => setCalHours(Number(e.target.value))}
                    />
                    <div className="input-range-hints">
                      <span>1h (Skill Drill)</span>
                      <span>3h (Full Academy Practice)</span>
                      <span>6h (Combine Camp)</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="cal-goal">Phase &amp; Fitness Goal</label>
                    <select
                      id="cal-goal"
                      value={calGoal}
                      onChange={e => setCalGoal(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="maintain">Match Season Performance Maintenance</option>
                      <option value="muscle_gain">Lean Muscle &amp; Power Gain (+350 kcal)</option>
                      <option value="fat_loss">Weight Class Cut / Body Fat Reduction (-400 kcal)</option>
                    </select>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">DAILY TARGET ENERGY EXPENDITURE</span>
                    <div className="meter-value-large">
                      <span className="number">{calResult.targetCalories.toLocaleString('en-IN')}</span>
                      <span className="unit"> kcal / day</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      Basal Metabolic Rate: {calResult.bmr} kcal
                    </span>
                  </div>

                  <div className="macros-grid-cards">
                    <div className="macro-card is-protein">
                      <span className="macro-name">Protein (1.8–2.0g/kg)</span>
                      <strong className="macro-val">{calResult.proteinGrams}g</strong>
                      <span className="macro-cal">{calResult.proteinKcal} kcal</span>
                    </div>

                    <div className="macro-card is-carbs">
                      <span className="macro-name">Carbohydrates (Energy)</span>
                      <strong className="macro-val">{calResult.carbsGrams}g</strong>
                      <span className="macro-cal">{calResult.carbsKcal} kcal</span>
                    </div>

                    <div className="macro-card is-fats">
                      <span className="macro-name">Essential Fats (22%)</span>
                      <strong className="macro-val">{calResult.fatsGrams}g</strong>
                      <span className="macro-cal">{calResult.fatsKcal} kcal</span>
                    </div>

                    <div className="macro-card is-water">
                      <span className="macro-name">Hydration Target</span>
                      <strong className="macro-val">{calResult.waterLiters} Litres</strong>
                      <span className="macro-cal">Electrolytes included</span>
                    </div>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="sparkles" size={16} />
                      <strong>Indian Sports Nutrition Guidelines</strong>
                    </div>
                    <p className="advice-text">
                      Distribute your {calResult.proteinGrams}g of protein evenly across 4 meals (sattu, paneer,
                      boiled eggs, dal/sprouts, or whey). Consume 40–50g of fast-acting carbs 30 mins before
                      combine drills to prevent glycogen depletion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 5: SPORTS CV CHECKLIST */}
            {selectedToolSlug === 'sports-cv-builder-checklist' && (
              <div className="checklist-layout">
                <div className="checklist-progress-header">
                  <div className="progress-info">
                    <span className="progress-label">Sports CV Readiness Audit</span>
                    <strong className="progress-value">{cvCompletionPercent}% Completed</strong>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${cvCompletionPercent}%` }}
                      role="progressbar"
                      aria-valuenow={cvCompletionPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>

                <div className="checklist-items-grid">
                  {SPORTS_CV_CHECKLIST_ITEMS.map((item, index) => {
                    const isChecked = !!cvChecked[item.id]
                    return (
                      <div
                        key={item.id}
                        className={`checklist-item-card ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => toggleCvCheck(item.id)}
                      >
                        <div className="checklist-checkbox">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            id={`cv-check-${item.id}`}
                            aria-label={item.title}
                          />
                          <span className="custom-check-box">
                            {isChecked && <SiteIcon name="check" size={14} />}
                          </span>
                        </div>
                        <div className="checklist-text">
                          <div className="item-title-row">
                            <span className="item-num">{index + 1}.</span>
                            <span className="item-title">{item.title}</span>
                            {item.mandatory && <span className="mandatory-tag">Mandatory</span>}
                          </div>
                          <p className="item-rationale">{item.selectorRationale}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="checklist-footer-cta">
                  <div className="checklist-summary-text">
                    <SiteIcon name="badge-check" size={18} />
                    <span>
                      {cvCompletionPercent === 100
                        ? 'Your Sports CV has all 12 selector-mandated credentials!'
                        : `You have completed ${Object.values(cvChecked).filter(Boolean).length} of 12 sections.`}
                    </span>
                  </div>
                  <div className="cta-actions">
                    <a
                      href="/sports-cv"
                      onClick={e => onNavigate?.(e, '/sports-cv')}
                      className="tool-action-btn primary"
                    >
                      <SiteIcon name="sports-cv" size={16} />
                      <span>Open Sports CV Wizard</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 6: BOX CRICKET & TURF COST SPLITTER */}
            {selectedToolSlug === 'turf-cost-splitter' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Turf Booking &amp; Player Split</h3>

                  <div className="input-group">
                    <label htmlFor="turf-venue">Venue / Turf Name</label>
                    <input
                      id="turf-venue"
                      type="text"
                      value={turfVenueName}
                      onChange={e => setTurfVenueName(e.target.value)}
                      placeholder="e.g. Urban Turf Arena, Whitefield"
                      className="tools-native-input"
                    />
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="turf-slot">Turf Slot Fee (₹)</label>
                      <input
                        id="turf-slot"
                        type="number"
                        min={500}
                        max={20000}
                        step={100}
                        value={turfSlotFee}
                        onChange={e => setTurfSlotFee(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="turf-lights">Lights &amp; Balls (₹)</label>
                      <input id="turf-lights" type="number" min={0} max={5000} step={50} value={turfLightsFee} onChange={e => setTurfLightsFee(Number(e.target.value))} className="tools-native-input" />
                    </div>
                    <div className="input-group">
                      <label htmlFor="turf-snacks">Refreshments &amp; Snacks (₹)</label>
                      <input id="turf-snacks" type="number" min={0} max={3000} step={50} value={turfSnacksFee} onChange={e => setTurfSnacksFee(Number(e.target.value))} className="tools-native-input" />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="turf-players">Playing Khiladis</label>
                      <input
                        id="turf-players"
                        type="number"
                        min={2}
                        max={30}
                        value={turfPlayersCount}
                        onChange={e => setTurfPlayersCount(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="turf-subs">Bench / Substitutes</label>
                      <input
                        id="turf-subs"
                        type="number"
                        min={0}
                        max={15}
                        value={turfSubsCount}
                        onChange={e => setTurfSubsCount(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="turf-sub-disc">Substitute Contribution</label>
                    <select
                      id="turf-sub-disc"
                      value={turfSubsDiscount}
                      onChange={e => setTurfSubsDiscount(Number(e.target.value))}
                      className="tools-native-select"
                    >
                      <option value={50}>50% Discount (Half Share for Substitutes)</option>
                      <option value={0}>100% Full Share (Equal Split for Everyone)</option>
                      <option value={100}>Free / 0% (Substitutes Play Free)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="turf-upi">Captain / Organizer UPI ID (for WhatsApp Request)</label>
                    <input
                      id="turf-upi"
                      type="text"
                      value={turfUpiId}
                      onChange={e => setTurfUpiId(e.target.value)}
                      placeholder="e.g. rahul@oksbi"
                      className="tools-native-input"
                    />
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">PER PLAYER CONTRIBUTION</span>
                    <div className="meter-value-large">
                      <span className="number">₹{turfResult.costPerFullPlayer}</span>
                      <span className="unit"> / player</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      Total Court Booking: ₹{turfResult.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {turfSubsCount > 0 && (
                    <div className="factor-breakdown-list">
                      <div className="factor-item">
                        <span>Playing Khiladis ({turfPlayersCount}):</span>
                        <strong>₹{turfResult.costPerFullPlayer} each</strong>
                      </div>
                      <div className="factor-item">
                        <span>Substitutes ({turfSubsCount}):</span>
                        <strong>₹{turfResult.costPerSub} each</strong>
                      </div>
                    </div>
                  )}

                  <div className="whatsapp-preview-box">
                    <div className="preview-label">
                      <SiteIcon name="share" size={14} />
                      <span>Ready-to-Send WhatsApp Text</span>
                    </div>
                    <pre className="whatsapp-pre">{turfResult.whatsappMessage}</pre>
                  </div>

                  <div className="action-buttons-row">
                    <button
                      type="button"
                      className="tool-action-btn primary"
                      onClick={() => handleCopyShare(turfResult.whatsappMessage, 'turf')}
                    >
                      <SiteIcon name={copiedSlug === 'turf' ? 'check' : 'copy'} size={15} />
                      <span>{copiedSlug === 'turf' ? 'Copied WhatsApp Message!' : 'Copy WhatsApp Message'}</span>
                    </button>
                    <a
                      href="/venues"
                      onClick={e => onNavigate?.(e, '/venues')}
                      className="tool-action-btn secondary"
                    >
                      <span>Find &amp; Book Turfs</span>
                      <SiteIcon name="arrow-up-right" size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 7: SPRINT SPLIT & ACCELERATION */}
            {selectedToolSlug === 'sprint-split-calculator' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">100m Personal Best &amp; Stride Physics</h3>

                  <div className="input-group">
                    <label htmlFor="sprint-time">
                      <span>100m Sprint Time (seconds)</span>
                      <strong className="input-val-tag">{sprintTime100m}s</strong>
                    </label>
                    <input
                      id="sprint-time"
                      type="range"
                      min={10.0}
                      max={15.0}
                      step={0.05}
                      value={sprintTime100m}
                      onChange={e => setSprintTime100m(Number(e.target.value))}
                    />
                    <div className="input-range-hints">
                      <span>10.2s (National Champion)</span>
                      <span>11.4s (State Podium)</span>
                      <span>13.5s (Grassroots)</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="sprint-react">Reaction Time off Blocks (s)</label>
                    <input
                      id="sprint-react"
                      type="number"
                      min={0.12}
                      max={0.25}
                      step={0.01}
                      value={sprintReaction}
                      onChange={e => setSprintReaction(Number(e.target.value))}
                      className="tools-native-input"
                    />
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">PEAK SPRINT VELOCITY</span>
                    <div className="meter-value-large">
                      <span className="number">{sprintResult.topSpeedKmH}</span>
                      <span className="unit"> km/h ({sprintResult.topSpeedMs} m/s)</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      100m PB: {sprintResult.totalTime}s
                    </span>
                  </div>

                  <div className="splits-table-wrap">
                    <h4 className="breakdown-heading">10m / 30m / 60m Sprint Splits</h4>
                    <table className="tools-status-table">
                      <thead>
                        <tr>
                          <th>Phase</th>
                          <th>Distance</th>
                          <th>Split Time</th>
                          <th>Speed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sprintResult.phases.map(p => (
                          <tr key={p.phase}>
                            <td><strong>{p.phase}</strong></td>
                            <td>{p.distanceRange}</td>
                            <td><strong>{p.splitTime}s</strong></td>
                            <td>{p.phaseVelocityKmH} km/h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="award" size={16} />
                      <strong>National Benchmark Assessment</strong>
                    </div>
                    <p className="advice-text">{sprintResult.nationalComparison}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 8: SCHOLARSHIP ELIGIBILITY CHECKER */}
            {selectedToolSlug === 'scholarship-eligibility-checker' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Athlete Profile &amp; Competitive Accolades</h3>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="schol-age">Athlete Age</label>
                      <input
                        id="schol-age"
                        type="number"
                        min={10}
                        max={30}
                        value={scholAge}
                        onChange={e => setScholAge(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="schol-cat">Reservation Category</label>
                      <select
                        id="schol-cat"
                        value={scholCategory}
                        onChange={e => setScholCategory(e.target.value as any)}
                        className="tools-native-select"
                      >
                        <option value="general">General</option>
                        <option value="obc">OBC (Non-Creamy Layer)</option>
                        <option value="sc_st">SC / ST</option>
                        <option value="ews">EWS (Economically Weaker Section)</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="schol-achieve">Highest Verified Sporting Achievement</label>
                    <select
                      id="schol-achieve"
                      value={scholAchievement}
                      onChange={e => setScholAchievement(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="khelo_india">Khelo India Youth Games / University Games Medal</option>
                      <option value="sr_nat_gold">Senior National Championship (Gold Medal)</option>
                      <option value="sr_nat_medal">Senior National Championship (Silver / Bronze)</option>
                      <option value="jr_nat_medal">Junior / Sub-Junior National Medal</option>
                      <option value="aiu_medal">All India Inter-University (AIU) Medal</option>
                      <option value="state_medal">Recognized State Championship Medal</option>
                      <option value="district">District Championship / Division Winner</option>
                      <option value="intl">International Representation / World Event</option>
                    </select>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <h4 className="breakdown-heading">Eligible Schemes &amp; Sports Quotas ({matchedSchemes.length})</h4>
                  <div className="schemes-list-cards">
                    {matchedSchemes.map(s => (
                      <div key={s.schemeName} className="scheme-card">
                        <div className="scheme-header">
                          <span className="scheme-authority">{s.authority}</span>
                          <span className={`priority-pill ${s.priorityLevel.toLowerCase()}`}>
                            {s.priorityLevel} Match
                          </span>
                        </div>
                        <h4 className="scheme-title">{s.schemeName}</h4>
                        <div className="scheme-benefit">
                          <SiteIcon name="wallet" size={15} />
                          <span>{s.financialBenefit}</span>
                        </div>
                        <p className="scheme-verdict">{s.eligibilityVerdict}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 9: WEEKLY TRAINING LOAD & ACWR */}
            {selectedToolSlug === 'weekly-load-planner' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">4-Week Workload History vs Planned Week</h3>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="load-w1">Week -4 Load (hours/pts)</label>
                      <input
                        id="load-w1"
                        type="number"
                        min={2}
                        max={40}
                        value={loadW1}
                        onChange={e => setLoadW1(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="load-w2">Week -3 Load</label>
                      <input
                        id="load-w2"
                        type="number"
                        min={2}
                        max={40}
                        value={loadW2}
                        onChange={e => setLoadW2(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="load-w3">Week -2 Load</label>
                      <input
                        id="load-w3"
                        type="number"
                        min={2}
                        max={40}
                        value={loadW3}
                        onChange={e => setLoadW3(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="load-w4">Week -1 Load</label>
                      <input
                        id="load-w4"
                        type="number"
                        min={2}
                        max={40}
                        value={loadW4}
                        onChange={e => setLoadW4(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="load-planned">Current Week Planned Load</label>
                      <input
                        id="load-planned"
                        type="number"
                        min={2}
                        max={45}
                        value={loadPlanned}
                        onChange={e => setLoadPlanned(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="load-days">Days Until Next Trial</label>
                      <input
                        id="load-days"
                        type="number"
                        min={1}
                        max={30}
                        value={loadDaysToTrial}
                        onChange={e => setLoadDaysToTrial(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className={`score-meter-box is-${loadResult.zoneClass}`}>
                    <span className="meter-label">ACUTE : CHRONIC WORKLOAD RATIO (ACWR)</span>
                    <div className="meter-value-large">
                      <span className="number">{loadResult.acwr}</span>
                    </div>
                    <span className={`meter-status-badge ${loadResult.zoneClass}`}>
                      {loadResult.zone} (Chronic: {loadResult.chronicLoad}h | Acute: {loadResult.acuteLoad}h)
                    </span>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="sliders" size={16} />
                      <strong>Periodization &amp; Peaking Protocol</strong>
                    </div>
                    <p className="advice-text">{loadResult.taperAdvice}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 10: TRAVEL BUDGET ESTIMATOR */}
            {selectedToolSlug === 'travel-budget-estimator' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Outstation Trial Logistics</h3>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="travel-from">Origin City</label>
                      <input
                        id="travel-from"
                        type="text"
                        value={travelFrom}
                        onChange={e => setTravelFrom(e.target.value)}
                        placeholder="e.g. Patna, Lucknow"
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="travel-to">Trial Destination City</label>
                      <input
                        id="travel-to"
                        type="text"
                        value={travelTo}
                        onChange={e => setTravelTo(e.target.value)}
                        placeholder="e.g. Bengaluru, Delhi"
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="travel-class">Transit Mode</label>
                      <select
                        id="travel-class"
                        value={travelClass}
                        onChange={e => setTravelClass(e.target.value as any)}
                        className="tools-native-select"
                      >
                        <option value="sleeper">Train Sleeper Class (Budget)</option>
                        <option value="3ac">Train 3-Tier AC (Recommended)</option>
                        <option value="2ac_vande">Vande Bharat / 2AC Express</option>
                        <option value="flight">Economy Flight</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label htmlFor="travel-days">Duration of Stay (Days)</label>
                      <input
                        id="travel-days"
                        type="number"
                        min={1}
                        max={10}
                        value={travelDays}
                        onChange={e => setTravelDays(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="travel-lodging">Accommodation Tier</label>
                      <select
                        id="travel-lodging"
                        value={travelLodging}
                        onChange={e => setTravelLodging(e.target.value as any)}
                        className="tools-native-select"
                      >
                        <option value="dharamsala">Sports Hostel / Dharamsala (~₹500/night)</option>
                        <option value="budget_hotel">Budget Hotel near Stadium (~₹1,200/night)</option>
                        <option value="comfort_hotel">Athlete Comfort Stay (~₹2,400/night)</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label htmlFor="travel-solo">Travel Party</label>
                      <select
                        id="travel-solo"
                        value={travelSolo ? 'true' : 'false'}
                        onChange={e => setTravelSolo(e.target.value === 'true')}
                        className="tools-native-select"
                      >
                        <option value="true">Solo Athlete</option>
                        <option value="false">With Parent / Coach (+1)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">TOTAL ESTIMATED TRIAL BUDGET</span>
                    <div className="meter-value-large">
                      <span className="number">₹{travelResult.totalBudget.toLocaleString('en-IN')}</span>
                      <span className="unit"> INR</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      Includes 15% Emergency Buffer (₹{travelResult.emergencyBuffer})
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <div className="factor-item">
                      <span>Roundtrip Transit Tickets:</span>
                      <strong>₹{travelResult.transitCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Lodging ({travelDays} nights):</span>
                      <strong>₹{travelResult.lodgingCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Athlete Meals &amp; Hydration:</span>
                      <strong>₹{travelResult.foodCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Local Metro &amp; Auto Commute:</span>
                      <strong>₹{travelResult.localCommuteCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Kit &amp; Baggage Allowance:</span>
                      <strong>₹{travelResult.kitAllowance.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 11: MATCH FEE ROI */}
            {selectedToolSlug === 'match-fee-roi' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Entry Costs vs Scouting Exposure</h3>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="roi-fee">Registration / Match Fee (₹)</label>
                      <input
                        id="roi-fee"
                        type="number"
                        min={0}
                        max={10000}
                        step={100}
                        value={roiFee}
                        onChange={e => setRoiFee(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="roi-travel">Travel &amp; Stay Outlay (₹)</label>
                      <input
                        id="roi-travel"
                        type="number"
                        min={0}
                        max={15000}
                        step={100}
                        value={roiTravel}
                        onChange={e => setRoiTravel(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="roi-scouts">Verified Scouts Present</label>
                      <input
                        id="roi-scouts"
                        type="number"
                        min={1}
                        max={30}
                        value={roiScouts}
                        onChange={e => setRoiScouts(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="roi-athletes">Total Competing Khiladis</label>
                      <input
                        id="roi-athletes"
                        type="number"
                        min={10}
                        max={1500}
                        value={roiAthletes}
                        onChange={e => setRoiAthletes(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>

                  <div className="input-row-duo">
                    <div className="input-group">
                      <label htmlFor="roi-slots">Available Selection Slots</label>
                      <input
                        id="roi-slots"
                        type="number"
                        min={1}
                        max={50}
                        value={roiSlots}
                        onChange={e => setRoiSlots(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="roi-cb">Historical Callback Rate (%)</label>
                      <input
                        id="roi-cb"
                        type="number"
                        min={1}
                        max={30}
                        value={roiCallback}
                        onChange={e => setRoiCallback(Number(e.target.value))}
                        className="tools-native-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className={`score-meter-box is-${roiResult.ratingClass}`}>
                    <span className="meter-label">EXPOSURE &amp; ROI INDEX</span>
                    <div className="meter-value-large">
                      <span className="number">{roiResult.expectedValueScore}</span>
                      <span className="total"> / 100</span>
                    </div>
                    <span className={`meter-status-badge ${roiResult.ratingClass}`}>
                      {roiResult.roiRating}
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <div className="factor-item">
                      <span>Total Financial Outlay:</span>
                      <strong>₹{roiResult.totalOutlay.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Cost Per Scout Impression:</span>
                      <strong>₹{roiResult.costPerScoutImpression} / scout</strong>
                    </div>
                    <div className="factor-item">
                      <span>Statistical Selection Odds:</span>
                      <strong>{roiResult.selectionOddsPercent}%</strong>
                    </div>
                  </div>

                  {roiResult.warningFlag && (
                    <div className="danger-warning-callout">
                      <SiteIcon name="alert-circle" size={16} />
                      <p>{roiResult.warningFlag}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TOOL 12: ACADEMY SHORTLIST BUILDER */}
            {selectedToolSlug === 'academy-shortlist-builder' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Academy Quality &amp; Budget Criteria</h3>

                  <div className="input-group">
                    <label htmlFor="acad-fee">
                      <span>Max Annual Fee Budget (₹)</span>
                      <strong className="input-val-tag">₹{acadMaxFee.toLocaleString('en-IN')} / yr</strong>
                    </label>
                    <input
                      id="acad-fee"
                      type="range"
                      min={20000}
                      max={300000}
                      step={5000}
                      value={acadMaxFee}
                      onChange={e => setAcadMaxFee(Number(e.target.value))}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="acad-coach">Minimum Coach Accreditation Required</label>
                    <select
                      id="acad-coach"
                      value={acadCoachTier}
                      onChange={e => setAcadCoachTier(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="nis_bcci3">NIS Diploma / BCCI Level 3 / AFC Pro (Elite)</option>
                      <option value="bcci2_afcb">BCCI Level 2 / AFC B License (Professional)</option>
                      <option value="state_licensed">State Licensed Veteran Coach</option>
                      <option value="unaccredited">Unaccredited Private Academy</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="acad-hostel">Residential Hostel Required?</label>
                    <select
                      id="acad-hostel"
                      value={acadHostel ? 'true' : 'false'}
                      onChange={e => setAcadHostel(e.target.value === 'true')}
                      className="tools-native-select"
                    >
                      <option value="true">Yes — Residential Hostel &amp; Mess Needed</option>
                      <option value="false">No — Day Boarder / Local Commuter</option>
                    </select>
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">PATHWAY FIT SCORE</span>
                    <div className="meter-value-large">
                      <span className="number">{acadResult.fitScore}</span>
                      <span className="total"> / 100</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      {acadResult.tierVerdict}
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <div className="factor-item">
                      <span>Projected 3-Year Investment:</span>
                      <strong>₹{acadResult.estimated3YrCost.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="coach-advice-box">
                    <div className="advice-header">
                      <SiteIcon name="building" size={16} />
                      <strong>Questions to Ask the Academy Director</strong>
                    </div>
                    <ul className="advice-list">
                      {acadResult.selectorQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 13: BOOST VS ORGANIC ESTIMATOR */}
            {selectedToolSlug === 'boost-vs-organic-estimator' && (
              <div className="calculator-layout">
                <div className="calculator-inputs-panel">
                  <h3 className="panel-title">Organizer Event &amp; Promotion Parameters</h3>

                  <div className="input-group">
                    <label htmlFor="boost-tier">City / Location Tier</label>
                    <select
                      id="boost-tier"
                      value={boostCityTier}
                      onChange={e => setBoostCityTier(e.target.value as any)}
                      className="tools-native-select"
                    >
                      <option value="metro">Tier 1 Metro (Delhi, Mumbai, Bengaluru, etc.)</option>
                      <option value="tier2">Tier 2 Capital (Lucknow, Patna, Chandigarh, etc.)</option>
                      <option value="district">Tier 3 / District Headquarter</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="boost-budget">
                      <span>Promotion Budget (₹)</span>
                      <strong className="input-val-tag">₹{boostBudget.toLocaleString('en-IN')}</strong>
                    </label>
                    <input
                      id="boost-budget"
                      type="range"
                      min={0}
                      max={10000}
                      step={250}
                      value={boostBudget}
                      onChange={e => setBoostBudget(Number(e.target.value))}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="boost-days">Campaign Duration (Days)</label>
                    <input
                      id="boost-days"
                      type="number"
                      min={7}
                      max={45}
                      value={boostDays}
                      onChange={e => setBoostDays(Number(e.target.value))}
                      className="tools-native-input"
                    />
                  </div>
                </div>

                <div className="calculator-results-panel">
                  <div className="score-meter-box is-optimal">
                    <span className="meter-label">PROJECTED VERIFIED REGISTRATIONS</span>
                    <div className="meter-value-large">
                      <span className="number">{boostResult.projectedRegistrations}</span>
                      <span className="unit"> athletes</span>
                    </div>
                    <span className="meter-status-badge optimal">
                      {boostResult.reachMultiplier}× Reach Multiplier
                    </span>
                  </div>

                  <div className="factor-breakdown-list">
                    <div className="factor-item">
                      <span>Organic Base Views:</span>
                      <strong>{boostResult.organicViews.toLocaleString('en-IN')} views</strong>
                    </div>
                    <div className="factor-item">
                      <span>Verified Boosted Impressions:</span>
                      <strong>+{boostResult.boostedViews.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Direct WhatsApp Inquiries:</span>
                      <strong>~{boostResult.directWhatsappInquiries}</strong>
                    </div>
                    <div className="factor-item">
                      <span>Cost Per Registered Athlete:</span>
                      <strong>₹{boostResult.costPerRegisteredAthlete} / athlete</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 14: TRIAL-DAY PACKING LIST */}
            {selectedToolSlug === 'trial-day-packing-list' && (
              <div className="checklist-layout">
                <div className="checklist-progress-header">
                  <div className="progress-info">
                    <span className="progress-label">Trial-Day Kitbag Checklist</span>
                    <strong className="progress-value">
                      {packingCompletionCount} of {TRIAL_PACKING_ITEMS.length} items packed
                    </strong>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.round((packingCompletionCount / TRIAL_PACKING_ITEMS.length) * 100)}%`,
                      }}
                      role="progressbar"
                      aria-valuenow={packingCompletionCount}
                      aria-valuemin={0}
                      aria-valuemax={TRIAL_PACKING_ITEMS.length}
                    />
                  </div>
                </div>

                <div className="checklist-items-grid">
                  {TRIAL_PACKING_ITEMS.map((item, index) => {
                    const isChecked = !!packingChecked[item.id]
                    return (
                      <div
                        key={item.id}
                        className={`checklist-item-card ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => togglePackingCheck(item.id)}
                      >
                        <div className="checklist-checkbox">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            id={`pack-check-${item.id}`}
                            aria-label={item.title}
                          />
                          <span className="custom-check-box">
                            {isChecked && <SiteIcon name="check" size={14} />}
                          </span>
                        </div>
                        <div className="checklist-text">
                          <div className="item-title-row">
                            <span className="item-num">{index + 1}.</span>
                            <span className="item-title">{item.title}</span>
                            <span className="item-cat-pill">{item.categoryLabel}</span>
                          </div>
                          <p className="item-rationale">{item.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="checklist-footer-cta">
                  <div className="checklist-summary-text">
                    <SiteIcon name="check-circle" size={18} />
                    <span>
                      {packingCompletionCount === TRIAL_PACKING_ITEMS.length
                        ? 'Your trial bag is 100% packed and ready for competition!'
                        : `Pack the remaining ${TRIAL_PACKING_ITEMS.length - packingCompletionCount} items before leaving home.`}
                    </span>
                  </div>
                  <div className="cta-actions">
                    <button
                      type="button"
                      className="tool-action-btn secondary"
                      onClick={() => {
                        const all: Record<string, boolean> = {}
                        TRIAL_PACKING_ITEMS.forEach(it => {
                          all[it.id] = true
                        })
                        setPackingChecked(all)
                      }}
                    >
                      <span>Check All Items</span>
                    </button>
                    <button
                      type="button"
                      className="tool-action-btn primary"
                      onClick={() =>
                        handleCopyShare(
                          `🎒 KhelGrid Trial-Day Packing List (${packingCompletionCount}/${TRIAL_PACKING_ITEMS.length} packed):\n` +
                            TRIAL_PACKING_ITEMS.map(i => `${packingChecked[i.id] ? '✅' : '⬜'} ${i.title}`).join('\n'),
                          'packing'
                        )
                      }
                    >
                      <SiteIcon name={copiedSlug === 'packing' ? 'check' : 'copy'} size={15} />
                      <span>{copiedSlug === 'packing' ? 'Copied Packing List!' : 'Copy to WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. ALL TOOLS CATALOGUE GRID */}
      <section className="tools-catalogue-section" aria-labelledby="all-tools-catalogue-heading">
        <div className="tools-catalogue-inner">
          <div className="section-header-row">
            <div>
              <h2 id="all-tools-catalogue-heading" className="section-main-title">
                Explore All 14 Sports Tools &amp; Calculators
              </h2>
              <p className="section-main-sub">
                Designed for grassroots athletes across India — from maidan practice to national combine selections.
              </p>
            </div>
            <span className="tools-count-pill">{filteredTools.length} Tools Available</span>
          </div>

          <div className="tools-grid-cards">
            {filteredTools.map(tool => {
              const isSelected = tool.slug === selectedToolSlug
              return (
                <div
                  key={tool.slug}
                  className={`tool-grid-card ${isSelected ? 'is-active' : ''}`}
                  onClick={() => handleSelectTool(tool.slug)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectTool(tool.slug)
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  <div className="tool-card-top">
                    <span className="tool-category-text">{tool.categoryLabel}</span>
                    {tool.badge && <span className="tool-card-badge">{tool.badge}</span>}
                  </div>

                  <h3 className="tool-card-title">{tool.name}</h3>
                  <p className="tool-card-hindi">{tool.hindiName}</p>
                  <p className="tool-card-blurb">{tool.blurb}</p>

                  <div className="tool-card-disciplines">
                    {tool.sportDisciplines.slice(0, 3).map(sp => (
                      <span key={sp} className="discipline-tag">{sp}</span>
                    ))}
                    {tool.sportDisciplines.length > 3 && (
                      <span className="discipline-tag">+{tool.sportDisciplines.length - 3}</span>
                    )}
                  </div>

                  <div className="tool-card-bottom">
                    <span className="tool-type-indicator">
                      <SiteIcon name={tool.type === 'Checklist' ? 'check' : 'sliders'} size={14} />
                      {tool.type}
                    </span>
                    <span className="tool-launch-link">
                      {isSelected ? 'Currently Active' : 'Launch Tool'} →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5. FEDERATION & SCIENTIFIC METHODOLOGY FOOTNOTE */}
      <section className="tools-footer-info-section" aria-label="Methodology & Guidance">
        <div className="tools-footer-info-inner">
          <div className="info-badge-row">
            <SiteIcon name="shield-check" size={20} className="info-icon" />
            <div>
              <h3>Grassroots Integrity &amp; Educational Guidance</h3>
              <p>
                All calculators on KhelGrid are calibrated for educational and athletic benchmarking purposes using
                published standards from the Sports Authority of India (SAI), Board of Control for Cricket in India (BCCI),
                All India Football Federation (AIFF), and the American College of Sports Medicine (ACSM). Always confirm
                formal eligibility and entry cut-offs with the official governing body or trial organizers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
