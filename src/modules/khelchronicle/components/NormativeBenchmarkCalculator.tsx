import { useState, useMemo } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'

interface PercentileCutoff {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  p95: number
}

interface BenchmarkDataset {
  name: string
  unit: string
  isHigherBetter: boolean
  standards: Record<'U-14' | 'U-16' | 'U-19' | 'Senior', Record<'male' | 'female', PercentileCutoff>>
}

const BENCHMARKS: Record<'yoyo' | 'sprint' | 'cmj', BenchmarkDataset> = {
  yoyo: {
    name: 'Yo-Yo IR1 Distance',
    unit: 'meters',
    isHigherBetter: true,
    standards: {
      'U-14': {
        male: { p10: 720, p25: 960, p50: 1160, p75: 1380, p90: 1560, p95: 1680 },
        female: { p10: 560, p25: 760, p50: 980, p75: 1180, p90: 1340, p95: 1440 },
      },
      'U-16': {
        male: { p10: 960, p25: 1240, p50: 1480, p75: 1700, p90: 1840, p95: 1960 },
        female: { p10: 760, p25: 980, p50: 1200, p75: 1420, p90: 1580, p95: 1680 },
      },
      'U-19': {
        male: { p10: 1240, p25: 1540, p50: 1800, p75: 2040, p90: 2160, p95: 2280 },
        female: { p10: 980, p25: 1220, p50: 1460, p75: 1680, p90: 1840, p95: 1940 },
      },
      Senior: {
        male: { p10: 1440, p25: 1720, p50: 1960, p75: 2200, p90: 2320, p95: 2440 },
        female: { p10: 1120, p25: 1380, p50: 1620, p75: 1860, p90: 2020, p95: 2120 },
      },
    },
  },
  sprint: {
    name: '30m Linear Sprint',
    unit: 'seconds',
    isHigherBetter: false,
    standards: {
      'U-14': {
        male: { p10: 4.62, p25: 4.48, p50: 4.35, p75: 4.22, p90: 4.12, p95: 4.05 },
        female: { p10: 4.88, p25: 4.72, p50: 4.56, p75: 4.41, p90: 4.29, p95: 4.21 },
      },
      'U-16': {
        male: { p10: 4.44, p25: 4.31, p50: 4.18, p75: 4.07, p90: 3.98, p95: 3.91 },
        female: { p10: 4.68, p25: 4.52, p50: 4.38, p75: 4.24, p90: 4.14, p95: 4.06 },
      },
      'U-19': {
        male: { p10: 4.26, p25: 4.14, p50: 4.02, p75: 3.92, p90: 3.86, p95: 3.79 },
        female: { p10: 4.51, p25: 4.36, p50: 4.22, p75: 4.10, p90: 4.01, p95: 3.94 },
      },
      Senior: {
        male: { p10: 4.18, p25: 4.05, p50: 3.92, p75: 3.83, p90: 3.78, p95: 3.72 },
        female: { p10: 4.42, p25: 4.28, p50: 4.15, p75: 4.03, p90: 3.94, p95: 3.88 },
      },
    },
  },
  cmj: {
    name: 'Countermovement Jump (CMJ)',
    unit: 'cm',
    isHigherBetter: true,
    standards: {
      'U-14': {
        male: { p10: 28.4, p25: 31.8, p50: 35.2, p75: 38.6, p90: 41.8, p95: 43.5 },
        female: { p10: 23.5, p25: 26.8, p50: 30.1, p75: 33.4, p90: 36.5, p95: 38.2 },
      },
      'U-16': {
        male: { p10: 34.2, p25: 37.8, p50: 41.5, p75: 45.2, p90: 48.2, p95: 50.4 },
        female: { p10: 28.2, p25: 31.5, p50: 34.8, p75: 38.2, p90: 41.2, p95: 43.1 },
      },
      'U-19': {
        male: { p10: 39.5, p25: 43.6, p50: 47.8, p75: 52.1, p90: 55.4, p95: 57.8 },
        female: { p10: 32.4, p25: 35.8, p50: 39.2, p75: 42.8, p90: 45.9, p95: 47.6 },
      },
      Senior: {
        male: { p10: 42.1, p25: 46.5, p50: 51.2, p75: 55.8, p90: 58.6, p95: 61.2 },
        female: { p10: 34.6, p25: 38.2, p50: 42.0, p75: 45.6, p90: 48.8, p95: 50.8 },
      },
    },
  },
}

export function NormativeBenchmarkCalculator() {
  const [selectedTest, setSelectedTest] = useState<'yoyo' | 'sprint' | 'cmj'>('yoyo')
  const [ageGroup, setAgeGroup] = useState<'U-14' | 'U-16' | 'U-19' | 'Senior'>('U-16')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [inputValue, setInputValue] = useState<string>('1760')

  const testConfig = BENCHMARKS[selectedTest]
  const cutoffs = testConfig.standards[ageGroup][gender]

  const calculation = useMemo(() => {
    const val = parseFloat(inputValue)
    if (isNaN(val) || val <= 0) return null

    let percentileTier = ''
    let tierColor = '#64748b'
    let percentileScore = 50
    let recommendationEn = ''
    let recommendationHi = ''

    if (testConfig.isHigherBetter) {
      if (val >= cutoffs.p95) {
        percentileTier = 'Top 5% — Elite National Combine Standard'
        percentileScore = 95
        tierColor = '#15803d'
        recommendationEn = 'Outstanding aerobic conditioning suitable for elite national selection combines.'
        recommendationHi = 'उत्कृष्ट सहनशक्ति स्तर, राष्ट्रीय टीम एवं शीर्ष अकादमी चयन के पूर्णतः अनुकूल।'
      } else if (val >= cutoffs.p90) {
        percentileTier = 'Top 10% — National Elite Junior Tier'
        percentileScore = 90
        tierColor = '#16a34a'
        recommendationEn = 'Exceeds state selection thresholds. Maintain conditioning with progressive overload.'
        recommendationHi = 'राज्य चयन मानकों से काफी बेहतर। योजनाबद्ध ट्रेनिंग से इस स्तर को बनाए रखें।'
      } else if (val >= cutoffs.p75) {
        percentileTier = '75th Percentile — Above Average Academy Standard'
        percentileScore = 75
        tierColor = '#0284c7'
        recommendationEn = 'Solid athletic foundation. Incorporate sport-specific high-intensity interval intervals.'
        recommendationHi = 'मजबूत आधार। खेल-विशिष्ट हाई-इंटेन्सिटी इंटरवल रनिंग शामिल करें।'
      } else if (val >= cutoffs.p50) {
        percentileTier = '50th Percentile — National Cohort Median'
        percentileScore = 50
        tierColor = '#d97706'
        recommendationEn = 'Average fitness compared to national age peers. Increase weekly training density.'
        recommendationHi = 'राष्ट्रीय औसत स्तर। फिटनेस सुधारने के लिए साप्ताहिक अभ्यास की तीव्रता बढ़ाएं।'
      } else if (val >= cutoffs.p25) {
        percentileTier = '25th Percentile — Developing Grassroots'
        percentileScore = 25
        tierColor = '#ea580c'
        recommendationEn = 'Below competitive junior baseline. Focus on foundational aerobic base conditioning.'
        recommendationHi = 'प्रतियोगी स्तर से कम। बुनियादी एरोबिक क्षमता बढ़ाने पर विशेष ध्यान दें।'
      } else {
        percentileTier = 'Bottom 10% — Developmental Attention Required'
        percentileScore = 10
        tierColor = '#dc2626'
        recommendationEn = 'Requires structured aerobic intervention before entering high-intensity tournament play.'
        recommendationHi = 'गहन टूर्नामेंट से पूर्व खिलाड़ी की बुनियादी एरोबिक कंडीशनिंग आवश्यक है।'
      }
    } else {
      // Lower is better (e.g. 30m Sprint)
      if (val <= cutoffs.p95) {
        percentileTier = 'Top 5% — Elite National Sprinter'
        percentileScore = 95
        tierColor = '#15803d'
        recommendationEn = 'Exceptional acceleration mechanics and explosive starting power.'
        recommendationHi = 'उत्कृष्ट गति एवं त्वरण, राष्ट्रीय स्तर के एथलीटों के बराबर।'
      } else if (val <= cutoffs.p90) {
        percentileTier = 'Top 10% — National Junior Standard'
        percentileScore = 90
        tierColor = '#16a34a'
        recommendationEn = 'Superior linear acceleration. Optimize transition to maximal top speed.'
        recommendationHi = 'शानदार प्रारंभिक गति। टॉप स्पीड बनाए रखने के लिए तकनीक पर काम करें।'
      } else if (val <= cutoffs.p50) {
        percentileTier = '50th Percentile — Cohort Median'
        percentileScore = 50
        tierColor = '#d97706'
        recommendationEn = 'Solid baseline speed. Target drive-phase stride frequency mechanics.'
        recommendationHi = 'सामान्य गति। स्ट्राइड फ्रीक्वेंसी और ड्राइव-फेज तकनीक में सुधार करें।'
      } else {
        percentileTier = 'Bottom 25% — Acceleration Work Needed'
        percentileScore = 20
        tierColor = '#dc2626'
        recommendationEn = 'Sprint mechanics training recommended to improve initial 10m first-step quickness.'
        recommendationHi = 'शुरुआती 10 मीटर की गति सुधारने के लिए स्प्रिंट तकनीक अभ्यास आवश्यक है।'
      }
    }

    return {
      tier: percentileTier,
      color: tierColor,
      score: percentileScore,
      adviceEn: recommendationEn,
      adviceHi: recommendationHi,
    }
  }, [inputValue, cutoffs, testConfig])

  return (
    <section className="kc-calculator-card" aria-labelledby="calc-widget-title">
      <div className="kc-calc-header">
        <div className="kc-calc-badge">
          <SiteIcon name="chart" size={14} />
          <span>Interactive National Norms Tool</span>
        </div>
        <h3 id="calc-widget-title" className="kc-calc-title">
          Indian Athlete Normative Benchmark Calculator
        </h3>
        <p className="kc-calc-sub">
          Instant percentile ranking based on empirical testing of 4,820 grassroots athletes across 16 Indian districts (Preprint KG-2026-002).
        </p>
      </div>

      <div className="kc-calc-controls-grid">
        {/* Test Selector */}
        <div className="kc-calc-field">
          <label htmlFor="benchmark-test-select" className="kc-calc-label">Select Physical Test</label>
          <select
            id="benchmark-test-select"
            className="kc-calc-select"
            value={selectedTest}
            onChange={e => {
              const nextTest = e.target.value as 'yoyo' | 'sprint' | 'cmj'
              setSelectedTest(nextTest)
              if (nextTest === 'yoyo') setInputValue('1760')
              else if (nextTest === 'sprint') setInputValue('4.15')
              else setInputValue('45.0')
            }}
          >
            <option value="yoyo">Yo-Yo Intermittent Recovery Level 1 (Meters)</option>
            <option value="sprint">30m Electronic Sprint (Seconds)</option>
            <option value="cmj">Countermovement Jump Height (cm)</option>
          </select>
        </div>

        {/* Age Group */}
        <div className="kc-calc-field">
          <label htmlFor="benchmark-age-select" className="kc-calc-label">Age Bracket</label>
          <select
            id="benchmark-age-select"
            className="kc-calc-select"
            value={ageGroup}
            onChange={e => setAgeGroup(e.target.value as 'U-14' | 'U-16' | 'U-19' | 'Senior')}
          >
            <option value="U-14">Under-14 (12.0 - 13.9 yrs)</option>
            <option value="U-16">Under-16 (14.0 - 15.9 yrs)</option>
            <option value="U-19">Under-19 (16.0 - 18.9 yrs)</option>
            <option value="Senior">Senior Open (19.0+ yrs)</option>
          </select>
        </div>

        {/* Gender */}
        <div className="kc-calc-field">
          <label htmlFor="benchmark-gender-select" className="kc-calc-label">Cohort Gender</label>
          <select
            id="benchmark-gender-select"
            className="kc-calc-select"
            value={gender}
            onChange={e => setGender(e.target.value as 'male' | 'female')}
          >
            <option value="male">Male Athletes</option>
            <option value="female">Female Athletes</option>
          </select>
        </div>

        {/* Athlete Score Input */}
        <div className="kc-calc-field">
          <label htmlFor="benchmark-score-input" className="kc-calc-label">
            Athlete Test Score ({testConfig.unit})
          </label>
          <input
            id="benchmark-score-input"
            type="number"
            step="any"
            className="kc-calc-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={`Enter score in ${testConfig.unit}`}
          />
        </div>
      </div>

      {/* Result Display Box */}
      {calculation && (
        <div className="kc-calc-result-box" style={{ borderLeftColor: calculation.color }}>
          <div className="kc-calc-result-head">
            <span className="kc-calc-tier" style={{ color: calculation.color }}>
              {calculation.tier}
            </span>
            <span className="kc-calc-percentile-pill" style={{ background: calculation.color }}>
              {calculation.score}th Percentile
            </span>
          </div>

          {/* Visual Percentile Progress Gauge */}
          <div className="kc-calc-gauge-bar" role="progressbar" aria-valuenow={calculation.score} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="kc-calc-gauge-fill"
              style={{ width: `${calculation.score}%`, backgroundColor: calculation.color }}
            />
          </div>
          <div className="kc-calc-gauge-ticks">
            <span>10th % (Needs Work)</span>
            <span>50th % (Median)</span>
            <span>90th % (Elite Combine)</span>
          </div>

          {/* Bilingual Actionable Advice */}
          <div className="kc-calc-advice-grid">
            <div className="kc-calc-advice-col">
              <strong>Coaching Action (English):</strong>
              <p>{calculation.adviceEn}</p>
            </div>
            <div className="kc-calc-advice-col">
              <strong>कोच के लिए सुझाव (हिंदी):</strong>
              <p>{calculation.adviceHi}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
export default NormativeBenchmarkCalculator
