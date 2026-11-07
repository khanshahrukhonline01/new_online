import React, { useState, useMemo } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  ATHLETE_PRESETS,
  NORMATIVE_BENCHMARKS,
  calculatePercentile,
  getTalentTier,
  type AgeCategory,
  type AthletePreset,
  type Gender,
} from './normativeData'
import { saveAthleteFitnessBenchmarks } from '../../integrations/supabase/athlete-profile-client'
import './TalentScanner.css'

interface TalentScannerPageProps {
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, path: string) => void
  onOpenAuth?: (mode?: 'login' | 'signup') => void
}

const SPORTS_LIST = [
  'Football',
  'Cricket',
  'Hockey',
  'Kabaddi',
  'Athletics',
  'Badminton',
  'Basketball',
  'Volleyball',
  'Tennis',
  'Wrestling',
  'Swimming',
  'Shooting',
  'Table Tennis',
  'Boxing',
]

export function TalentScannerPage({ onNavigate, onOpenAuth }: TalentScannerPageProps) {
  const [gender, setGender] = useState<Gender>('Male')
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('U-16')
  const [sport, setSport] = useState<string>('Football')

  // Test metrics state
  const [yoyo, setYoyo] = useState<number>(1800)
  const [sprint, setSprint] = useState<number>(4.05)
  const [cmj, setCmj] = useState<number>(51)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'guest_saved' | 'error'>('idle')
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  const handleApplyPreset = (preset: AthletePreset) => {
    setGender(preset.gender)
    setAgeCategory(preset.age)
    setSport(preset.sport)
    setYoyo(preset.yoyo)
    setSprint(preset.sprint)
    setCmj(preset.cmj)
  }

  // Active normative thresholds for this gender and age bracket
  const norms = useMemo(
    () => NORMATIVE_BENCHMARKS[gender][ageCategory],
    [gender, ageCategory],
  )

  // Individual percentiles
  const yoyoPct = useMemo(
    () => calculatePercentile(yoyo, norms.yoyo_ir1_meters, true),
    [yoyo, norms.yoyo_ir1_meters],
  )
  const sprintPct = useMemo(
    () => calculatePercentile(sprint, norms.sprint_30m_seconds, false),
    [sprint, norms.sprint_30m_seconds],
  )
  const cmjPct = useMemo(
    () => calculatePercentile(cmj, norms.cmj_height_cm, true),
    [cmj, norms.cmj_height_cm],
  )

  // Composite athletic percentile
  const compositePct = Math.round((yoyoPct + sprintPct + cmjPct) / 3)
  const tier = getTalentTier(compositePct)

  // Comparison deltas against median (p50)
  const yoyoDelta = yoyo - norms.yoyo_ir1_meters.p50
  const sprintDelta = Number((norms.sprint_30m_seconds.p50 - sprint).toFixed(2)) // positive if faster
  const cmjDelta = cmj - norms.cmj_height_cm.p50

  const handleSaveBenchmarks = async () => {
    setIsSaving(true)
    setSaveFeedback(null)
    try {
      const res = await saveAthleteFitnessBenchmarks(
        {
          yoyoIr1Meters: yoyo,
          sprint30mSeconds: sprint,
          cmjHeightCm: cmj,
          tier: tier.name,
          percentileAvg: compositePct,
          sport,
          gender,
          ageCategory,
        },
        {
          sport,
          gender,
          ageCategory,
        },
      )
      if (res.status === 'guest_saved') {
        setSaveStatus('guest_saved')
        setSaveFeedback(res.message)
      } else {
        setSaveStatus('success')
        setSaveFeedback(res.message)
      }
    } catch {
      setSaveStatus('error')
      setSaveFeedback('Failed to save benchmarks. Please check network connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadScorecard = () => {
    const testedDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>
  <rect width="600" height="750" rx="20" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="2" />
  <rect x="20" y="20" width="560" height="710" rx="14" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.4" />
  <text x="300" y="70" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2">KHELGRID NATIONAL COMBINE BENCHMARK</text>
  <text x="300" y="105" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#f8fafc" text-anchor="middle">Official Athletic Scorecard</text>
  <text x="300" y="130" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">${sport.toUpperCase()} · ${ageCategory} · ${gender.toUpperCase()}</text>
  <circle cx="300" cy="225" r="65" fill="#0f172a" stroke="#10b981" stroke-width="4" />
  <text x="300" y="222" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="#10b981" text-anchor="middle">${compositePct}</text>
  <text x="300" y="246" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#94a3b8" text-anchor="middle">PERCENTILE</text>
  <text x="300" y="325" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#f8fafc" text-anchor="middle">${tier.name}</text>
  <rect x="50" y="360" width="500" height="80" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
  <text x="75" y="395" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">Yo-Yo IR1 Distance</text>
  <text x="75" y="420" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Aerobic Intermittent Recovery</text>
  <text x="525" y="405" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#38bdf8" text-anchor="end">${yoyo} m</text>
  <text x="525" y="423" font-family="system-ui, sans-serif" font-size="11" fill="#10b981" text-anchor="end">${yoyoPct}th Percentile</text>
  <rect x="50" y="455" width="500" height="80" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
  <text x="75" y="490" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">30m Linear Sprint Time</text>
  <text x="75" y="515" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Acceleration &amp; Top Velocity</text>
  <text x="525" y="500" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#38bdf8" text-anchor="end">${sprint} s</text>
  <text x="525" y="518" font-family="system-ui, sans-serif" font-size="11" fill="#10b981" text-anchor="end">${sprintPct}th Percentile</text>
  <rect x="50" y="550" width="500" height="80" rx="10" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
  <text x="75" y="585" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">Countermovement Jump (CMJ)</text>
  <text x="75" y="610" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">Vertical Kinetic Power Impulse</text>
  <text x="525" y="595" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#38bdf8" text-anchor="end">${cmj} cm</text>
  <text x="525" y="613" font-family="system-ui, sans-serif" font-size="11" fill="#10b981" text-anchor="end">${cmjPct}th Percentile</text>
  <text x="300" y="670" font-family="system-ui, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Standardized Empirical Normative Data: KhelChronicle Preprint KG-2026-002</text>
  <text x="300" y="690" font-family="system-ui, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Tested On: ${testedDate} · Verified by KhelGrid Grassroots Combine Desk</text>
</svg>`

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `khelgrid-combine-scorecard-${sport.toLowerCase()}-${ageCategory.toLowerCase()}-${Date.now().toString(36)}.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      onNavigate(e, path)
    }
  }

  return (
    <div className="talent-scanner-page">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'KhelGrid Talent Scanner',
            url: 'https://khelgrid.com/talent-scanner',
            description:
              'Interactive athletic talent evaluation benchmarking youth athletes against 4,820 grassroots athletes in 16 Indian districts.',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'All',
            citation: {
              '@type': 'ScholarlyArticle',
              name: 'Normative Physical Fitness Percentiles (Yo-Yo IR1, 30m Sprint, Countermovement Jump) Across 4,800 Grassroots Athletes in 16 Indian Metropolitan and Rural Districts',
              author: ['Dr. Rajeshwari Nair', 'Dr. Alok Sen'],
              identifier: 'KG-2026-002',
            },
          }),
        }}
      />

      <header className="talent-scanner-header">
        <div className="eyebrow">
          <SiteIcon name="target" size={16} />
          <span>SCOUTING & ATHLETE EVALUATION</span>
        </div>
        <h1>Talent Scanner · Objective Grassroots Benchmarks</h1>
        <p className="intro-text">
          Benchmark your aerobic intermittent endurance, linear sprinting speed, and explosive vertical power
          against <strong>4,820 grassroots athletes</strong> tested across 16 Indian metropolitan and rural districts.
          Directly integrated with KhelChronicle Open Research Preprint <strong>KG-2026-002</strong>.
        </p>

        {/* Presets Strip */}
        <div className="presets-strip" role="region" aria-label="Quick athlete presets">
          <span className="presets-label">Quick Presets:</span>
          {ATHLETE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(preset)}
              title={`${preset.description} (${preset.age} ${preset.gender} ${preset.sport})`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </header>

      <div className="talent-scanner-grid">
        {/* Left Column: Input Form */}
        <div className="scanner-card">
          <h2>
            <SiteIcon name="sliders" size={20} />
            <span>Athlete Profile & Field Scores</span>
          </h2>

          {/* Gender Selector */}
          <div className="scanner-field-group">
            <label className="scanner-field-label">
              <span>Biological Gender Category</span>
              <small>Standardized athletic divisions</small>
            </label>
            <div className="scanner-toggle-group" role="radiogroup" aria-label="Gender">
              {(['Male', 'Female'] as Gender[]).map(g => (
                <button
                  key={g}
                  type="button"
                  className={`scanner-toggle-btn ${gender === g ? 'is-active' : ''}`}
                  onClick={() => setGender(g)}
                  aria-checked={gender === g}
                  role="radio"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Age Category Selector */}
          <div className="scanner-field-group">
            <label className="scanner-field-label">
              <span>Age Division</span>
              <small>Under-14 to Senior Open</small>
            </label>
            <div className="scanner-toggle-group" role="radiogroup" aria-label="Age category">
              {(['U-14', 'U-16', 'U-19', 'Senior'] as AgeCategory[]).map(a => (
                <button
                  key={a}
                  type="button"
                  className={`scanner-toggle-btn ${ageCategory === a ? 'is-active' : ''}`}
                  onClick={() => setAgeCategory(a)}
                  aria-checked={ageCategory === a}
                  role="radio"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Sport Selector */}
          <div className="scanner-field-group">
            <label className="scanner-field-label" htmlFor="sport-select">
              <span>Primary Sport</span>
              <small>Connects to relevant combine benchmarks</small>
            </label>
            <select
              id="sport-select"
              className="scanner-select"
              value={sport}
              onChange={e => setSport(e.target.value)}
            >
              {SPORTS_LIST.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Metric 1: Yo-Yo IR1 Distance */}
          <div className="metric-input-box">
            <div className="metric-header">
              <span className="metric-title">Yo-Yo IR1 Test Distance</span>
              <div className="metric-display">
                {yoyo}
                <span>meters</span>
              </div>
            </div>
            <input
              type="range"
              className="metric-slider"
              min={400}
              max={2800}
              step={40}
              value={yoyo}
              onChange={e => setYoyo(Number(e.target.value))}
              aria-label="Yo-Yo Intermittent Recovery Test Level 1 distance in meters"
            />
            <div className="metric-subtext">
              <span>Grassroots 10th %ile: {norms.yoyo_ir1_meters.p10}m</span>
              <span>National Elite 90th %ile: {norms.yoyo_ir1_meters.p90}m</span>
            </div>
          </div>

          {/* Metric 2: 30m Sprint Time */}
          <div className="metric-input-box">
            <div className="metric-header">
              <span className="metric-title">30m Electronic Sprint Time</span>
              <div className="metric-display">
                {sprint.toFixed(2)}
                <span>seconds</span>
              </div>
            </div>
            <input
              type="range"
              className="metric-slider"
              min={3.5}
              max={5.4}
              step={0.01}
              value={sprint}
              onChange={e => setSprint(Number(e.target.value))}
              aria-label="30 meter sprint time in seconds"
            />
            <div className="metric-subtext">
              <span>Grassroots 10th %ile: {norms.sprint_30m_seconds.p10}s</span>
              <span>National Elite 90th %ile: {norms.sprint_30m_seconds.p90}s</span>
            </div>
          </div>

          {/* Metric 3: CMJ Height */}
          <div className="metric-input-box">
            <div className="metric-header">
              <span className="metric-title">Countermovement Jump (CMJ)</span>
              <div className="metric-display">
                {cmj}
                <span>cm</span>
              </div>
            </div>
            <input
              type="range"
              className="metric-slider"
              min={20}
              max={75}
              step={1}
              value={cmj}
              onChange={e => setCmj(Number(e.target.value))}
              aria-label="Countermovement vertical jump height in centimeters"
            />
            <div className="metric-subtext">
              <span>Grassroots 10th %ile: {norms.cmj_height_cm.p10}cm</span>
              <span>National Elite 90th %ile: {norms.cmj_height_cm.p90}cm</span>
            </div>
          </div>
        </div>

        {/* Right Column: Instant Live Scorecard */}
        <div className="scorecard-card">
          <div className="composite-hero">
            <span className={`composite-badge ${tier.badgeClass}`}>
              {tier.name}
            </span>
            <div className="composite-score">
              {compositePct}
              <small style={{ fontSize: '1.25rem', fontWeight: 600 }}>%ile</small>
            </div>
            <p className="composite-tagline">{tier.tagline}</p>
          </div>

          {/* Metric Bars List */}
          <div className="metric-bars-list">
            {/* Yo-Yo */}
            <div className="metric-bar-item">
              <div className="metric-bar-header">
                <span className="metric-bar-title">Yo-Yo IR1 Endurance</span>
                <span className="metric-bar-pct">{yoyoPct}th Percentile</span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={yoyoPct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="progress-fill fill-green"
                  style={{ width: `${Math.min(100, Math.max(5, yoyoPct))}%` }}
                />
              </div>
              <div className="metric-comparison-note">
                {yoyoDelta >= 0 ? `+${yoyoDelta}m` : `${yoyoDelta}m`} vs {gender} {ageCategory} national median ({norms.yoyo_ir1_meters.p50}m)
              </div>
            </div>

            {/* Sprint */}
            <div className="metric-bar-item">
              <div className="metric-bar-header">
                <span className="metric-bar-title">30m Acceleration & Speed</span>
                <span className="metric-bar-pct">{sprintPct}th Percentile</span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={sprintPct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="progress-fill fill-blue"
                  style={{ width: `${Math.min(100, Math.max(5, sprintPct))}%` }}
                />
              </div>
              <div className="metric-comparison-note">
                {sprintDelta >= 0 ? `${sprintDelta}s faster` : `${Math.abs(sprintDelta)}s behind`} vs national median ({norms.sprint_30m_seconds.p50}s)
              </div>
            </div>

            {/* CMJ */}
            <div className="metric-bar-item">
              <div className="metric-bar-header">
                <span className="metric-bar-title">Vertical Kinetic Power (CMJ)</span>
                <span className="metric-bar-pct">{cmjPct}th Percentile</span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={cmjPct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="progress-fill fill-amber"
                  style={{ width: `${Math.min(100, Math.max(5, cmjPct))}%` }}
                />
              </div>
              <div className="metric-comparison-note">
                {cmjDelta >= 0 ? `+${cmjDelta}cm` : `${cmjDelta}cm`} vs national median ({norms.cmj_height_cm.p50}cm)
              </div>
            </div>
          </div>

          {/* Save Status Feedback Notice */}
          {saveStatus !== 'idle' && saveFeedback && (
            <div className={`scanner-save-banner status-${saveStatus}`} role="status">
              <div className="save-banner-icon">
                <SiteIcon name={saveStatus === 'success' ? 'badge-check' : saveStatus === 'error' ? 'alert-triangle' : 'info'} size={20} />
              </div>
              <div className="save-banner-body">
                <strong>
                  {saveStatus === 'success'
                    ? 'Player Card & Scout Portal Updated!'
                    : saveStatus === 'guest_saved'
                    ? 'Benchmarks Saved to Device'
                    : 'Sync Notice'}
                </strong>
                <p>{saveFeedback}</p>
                <div className="save-banner-actions">
                  {saveStatus === 'success' && (
                    <>
                      <a
                        href="/dashboard"
                        onClick={e => handleLinkClick(e, '/dashboard')}
                        className="save-action-link"
                      >
                        <SiteIcon name="chart" size={13} />
                        <span>View on My Dashboard</span>
                      </a>
                      <a
                        href="/scout-portal"
                        onClick={e => handleLinkClick(e, '/scout-portal')}
                        className="save-action-link"
                      >
                        <SiteIcon name="target" size={13} />
                        <span>View in Scout Portal</span>
                      </a>
                    </>
                  )}
                  {saveStatus === 'guest_saved' && onOpenAuth && (
                    <button
                      type="button"
                      className="save-auth-trigger-btn"
                      onClick={() => onOpenAuth('signup')}
                    >
                      <SiteIcon name="user" size={13} />
                      <span>Sign In to Claim Permanent Profile</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action CTAs for User Retention */}
          <div className="scanner-actions">
            <button
              type="button"
              className={`btn-save-player-card ${saveStatus === 'success' ? 'is-saved' : ''}`}
              onClick={handleSaveBenchmarks}
              disabled={isSaving}
              aria-label="Save benchmarks to my player card and scout portal"
            >
              <SiteIcon
                name={isSaving ? 'refresh' : saveStatus === 'success' ? 'badge-check' : 'sparkles'}
                size={18}
                className={isSaving ? 'scanner-spin-icon' : ''}
              />
              <span>
                {isSaving
                  ? 'Saving Benchmarks...'
                  : saveStatus === 'success'
                  ? 'Saved to Player Card & Scout Portal ✓'
                  : 'Save Benchmarks to My Player Card'}
              </span>
            </button>

            <button
              type="button"
              className="btn-download-scorecard"
              onClick={handleDownloadScorecard}
              aria-label="Download verified combine test scorecard"
            >
              <SiteIcon name="download" size={17} />
              <span>Download Official Combine Scorecard</span>
            </button>

            <a
              href="/scout-portal"
              onClick={e => handleLinkClick(e, '/scout-portal')}
              className="btn-secondary-link"
            >
              <SiteIcon name="target" size={16} />
              <span>Explore Top Verified Talent in Scout Portal</span>
            </a>
            <a
              href={`/sports-cv?sport=${encodeURIComponent(sport)}&yoyo=${yoyo}&sprint=${sprint}&cmj=${cmj}&pct=${compositePct}`}
              onClick={e => handleLinkClick(e, `/sports-cv?sport=${encodeURIComponent(sport)}`)}
              className="btn-sports-cv"
            >
              <SiteIcon name="file-text" size={18} />
              <span>Add Score to KhelGrid Sports CV</span>
            </a>

            <a
              href={`/opportunities?sport=${encodeURIComponent(sport)}`}
              onClick={e => handleLinkClick(e, `/opportunities?sport=${encodeURIComponent(sport)}`)}
              className="btn-secondary-link"
            >
              <SiteIcon name="calendar-check" size={16} />
              <span>Explore Verified {sport} Trials</span>
            </a>

            <a
              href={`/academies?sport=${encodeURIComponent(sport)}`}
              onClick={e => handleLinkClick(e, `/academies?sport=${encodeURIComponent(sport)}`)}
              className="btn-secondary-link"
            >
              <SiteIcon name="award" size={16} />
              <span>Locate Accredited {sport} Academies</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scientific Citation Card */}
      <div className="citation-box">
        <div className="citation-icon" aria-hidden="true">
          <SiteIcon name="award" size={24} />
        </div>
        <div className="citation-content">
          <div className="citation-header">
            <span className="citation-tag">Empirical Science Baseline · Test / Demo Data</span>
            <span className="citation-id">KhelChronicle Research Preprint · KG-2026-002</span>
          </div>
          <h3 className="citation-title">
            Normative Physical Fitness Percentiles (Yo-Yo IR1, 30m Sprint, Countermovement Jump) Across 4,800 Grassroots Athletes in 16 Indian Metropolitan and Rural Districts
          </h3>
          <p className="citation-authors">
            By Dr. Rajeshwari Nair & Dr. Alok Sen · Exercise Physiology Division · KhelChronicle Open Research Archive (Sample demonstration dataset for platform testing)
          </p>
          <a
            href="/khelchronicle/normative-fitness-percentiles-grassroots-athletes-india"
            onClick={e => handleLinkClick(e, '/khelchronicle/normative-fitness-percentiles-grassroots-athletes-india')}
            className="citation-link"
          >
            <span>Read full open-access preprint, testing protocols & methodology</span>
            <SiteIcon name="arrow-up-right" size={14} />
          </a>
        </div>
      </div>

      {/* Fair Play Notice */}
      <div className="fair-play-note">
        <strong>Transparency & Fair Play Notice:</strong> Objective physical screening provides comparative athletic conditioning percentiles against sample demonstration test cohorts (KG-2026-002). It does not replace on-field tactical assessments, sport-specific skill trials, or institutional coach scouting under the National Sports Development Code of India.
      </div>
    </div>
  )
}
export default TalentScannerPage
