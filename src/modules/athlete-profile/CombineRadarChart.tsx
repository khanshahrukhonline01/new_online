import { useMemo, useState } from 'react'
import type { AthleteProfile } from '../../shared/domain'
import './CombineRadarChart.css'

export interface CombineRadarChartProps {
  profile: AthleteProfile
  size?: number
}

interface MetricAxis {
  key: string
  label: string
  score: number // 0-100
  actualValue: string
  description: string
}

const CENTER = 160
const MAX_RADIUS = 100
const ANGLE_STEP = (Math.PI * 2) / 6

export function CombineRadarChart({ profile, size = 320 }: CombineRadarChartProps) {
  const [activeAxis, setActiveAxis] = useState<MetricAxis | null>(null)

  const axes: MetricAxis[] = useMemo(() => {
    const fitness = profile.fitnessBenchmarks || {}
    const sprint = fitness.sprint30mSeconds
    const yoyo = fitness.yoyoIr1Meters
    const cmj = fitness.cmjHeightCm
    const pct = fitness.percentileAvg || 80

    // 1. Speed (30m Sprint): <= 3.85s -> 98, 4.0s -> 88, 4.2s -> 78, 4.4s -> 68, 4.6s+ -> 55
    let speedScore = 75
    let speedLabel = 'Untested'
    if (sprint) {
      speedScore = Math.max(45, Math.min(99, Math.round(100 - (sprint - 3.7) * 55)))
      speedLabel = `${sprint}s`
    } else {
      speedScore = Math.round(pct * 0.95)
      speedLabel = `${pct}th %ile`
    }

    // 2. Endurance (Yo-Yo IR1): >= 2100m -> 98, 1800m -> 85, 1500m -> 72, 1200m -> 60
    let enduranceScore = 75
    let enduranceLabel = 'Untested'
    if (yoyo) {
      enduranceScore = Math.max(45, Math.min(99, Math.round(50 + (yoyo - 1000) / 22)))
      enduranceLabel = `${yoyo}m`
    } else {
      enduranceScore = Math.round(pct * 0.96)
      enduranceLabel = `${pct}th %ile`
    }

    // 3. Power (Vertical Jump CMJ): >= 60cm -> 98, 52cm -> 88, 44cm -> 76, 36cm -> 62
    let powerScore = 75
    let powerLabel = 'Untested'
    if (cmj) {
      powerScore = Math.max(45, Math.min(99, Math.round(50 + (cmj - 30) * 1.6)))
      powerLabel = `${cmj} cm`
    } else {
      powerScore = Math.round(pct * 0.92)
      powerLabel = `${pct}th %ile`
    }

    // 4. Agility: Derived from speed + jump acceleration
    const agilityScore = Math.min(98, Math.round((speedScore * 0.6) + (powerScore * 0.4)))
    const agilityLabel = `${agilityScore} OVR`

    // 5. Stamina (VO2 Aerobic Capacity): Derived from Yo-Yo IR1
    let staminaScore = Math.min(98, Math.round(enduranceScore * 0.98))
    let staminaLabel = `${staminaScore} OVR`
    if (yoyo) {
      const vo2Est = (yoyo * 0.0084 + 36.4).toFixed(1)
      staminaLabel = `${vo2Est} ml/kg`
      staminaScore = Math.min(99, Math.round(Number(vo2Est) * 1.6))
    }

    // 6. Technique & Telemetry: Derived from video clips and verified tier
    const clipCount = profile.videoClips?.length || 0
    const hasTelemetry = profile.videoClips?.some(c => c.telemetry && c.telemetry.length > 0)
    const techniqueScore = Math.min(
      98,
      Math.round(
        (profile.verificationStatus === 'verified' || profile.verificationStatus === 'pro' ? 88 : 78) +
          clipCount * 2.5 +
          (hasTelemetry ? 6 : 0)
      )
    )
    const techniqueLabel = `${techniqueScore} / 100`

    return [
      {
        key: 'speed',
        label: 'SPEED',
        score: speedScore,
        actualValue: speedLabel,
        description: '30m sprint acceleration & first-step velocity',
      },
      {
        key: 'endurance',
        label: 'ENDURANCE',
        score: enduranceScore,
        actualValue: enduranceLabel,
        description: 'Yo-Yo IR1 stamina & repeated sprint recovery',
      },
      {
        key: 'power',
        label: 'POWER',
        score: powerScore,
        actualValue: powerLabel,
        description: 'Countermovement Jump (CMJ) explosive vertical thrust',
      },
      {
        key: 'agility',
        label: 'AGILITY',
        score: agilityScore,
        actualValue: agilityLabel,
        description: 'Deceleration resistance & change-of-direction reaction',
      },
      {
        key: 'stamina',
        label: 'STAMINA',
        score: staminaScore,
        actualValue: staminaLabel,
        description: 'Aerobic VO2 capacity across competitive multi-match trials',
      },
      {
        key: 'technique',
        label: 'TECHNIQUE',
        score: techniqueScore,
        actualValue: techniqueLabel,
        description: 'Biomechanical efficiency & verified video telemetry',
      },
    ]
  }, [profile])

  // Calculate coordinates for concentric background grid rings
  const getRingCoordinates = (radius: number) => {
    return axes.map((_, i) => {
      const angle = -Math.PI / 2 + i * ANGLE_STEP
      const x = CENTER + radius * Math.cos(angle)
      const y = CENTER + radius * Math.sin(angle)
      return { x, y }
    })
  }

  const athletePoints = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = -Math.PI / 2 + i * ANGLE_STEP
      const currentRadius = MAX_RADIUS * (axis.score / 100)
      const x = CENTER + currentRadius * Math.cos(angle)
      const y = CENTER + currentRadius * Math.sin(angle)
      return { x, y, axis }
    })
  }, [axes])

  const athletePolygonPath = athletePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const levelRings = [0.25, 0.5, 0.75, 1.0]

  return (
    <div className="combine-radar-container">
      <div className="radar-header">
        <div className="radar-header-title">
          <span className="radar-badge">NORMATIVE COMBINE RADAR</span>
          <h4>Physical &amp; Biomechanical Hexagon</h4>
        </div>
        <span className="radar-cohort-tag">Cohort: SAI National Juniors</span>
      </div>

      <div className="radar-svg-wrapper">
        <svg
          viewBox="0 0 320 320"
          width={size}
          height={size}
          className="combine-radar-svg"
          role="img"
          aria-label="Physical combine normative radar chart"
        >
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.05" />
            </radialGradient>
            <linearGradient id="polygonStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Web concentric grid polygons */}
          {levelRings.map(level => {
            const ringPoints = getRingCoordinates(MAX_RADIUS * level)
              .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ')
            return (
              <polygon
                key={level}
                points={ringPoints}
                className="radar-grid-ring"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth={level === 1.0 ? '1.5' : '1'}
                fill="none"
              />
            )
          })}

          {/* Spoke Axis Lines from center to outer ring */}
          {axes.map((_, i) => {
            const angle = -Math.PI / 2 + i * ANGLE_STEP
            const outerX = CENTER + MAX_RADIUS * Math.cos(angle)
            const outerY = CENTER + MAX_RADIUS * Math.sin(angle)
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outerX}
                y2={outerY}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeDasharray="2 3"
              />
            )
          })}

          {/* Athlete Data Polygon */}
          <polygon
            points={athletePolygonPath}
            fill="url(#radarGlow)"
            stroke="url(#polygonStrokeGrad)"
            strokeWidth="2.5"
            className="radar-athlete-polygon"
          />

          {/* Interactive Data Vertex Nodes */}
          {athletePoints.map((pt, i) => (
            <g
              key={i}
              className={`radar-vertex-node ${activeAxis?.key === pt.axis.key ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveAxis(pt.axis)}
              onMouseLeave={() => setActiveAxis(null)}
              onClick={() => setActiveAxis(pt.axis)}
              tabIndex={0}
              role="button"
              aria-label={`${pt.axis.label}: ${pt.axis.actualValue} (${pt.axis.score} OVR)`}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5.5"
                fill="#0b0f17"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="2.5"
                fill="#38bdf8"
              />
            </g>
          ))}

          {/* Axis Labels outside perimeter */}
          {axes.map((axis, i) => {
            const angle = -Math.PI / 2 + i * ANGLE_STEP
            const labelRadius = MAX_RADIUS + 28
            const lx = CENTER + labelRadius * Math.cos(angle)
            const ly = CENTER + labelRadius * Math.sin(angle)

            // Text alignment based on horizontal position
            let anchor: 'middle' | 'start' | 'end' = 'middle'
            if (Math.cos(angle) > 0.25) anchor = 'start'
            else if (Math.cos(angle) < -0.25) anchor = 'end'

            return (
              <g key={axis.key} className="radar-axis-label-group">
                <text
                  x={lx}
                  y={ly - 5}
                  textAnchor={anchor}
                  className="radar-axis-label"
                  fill="#94a3b8"
                >
                  {axis.label}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={anchor}
                  className="radar-axis-val"
                  fill="#38bdf8"
                >
                  {axis.actualValue}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Dynamic Detail Card / Active Hover Indicator */}
      <div className="radar-details-box">
        {activeAxis ? (
          <div className="radar-active-metric">
            <div className="active-metric-top">
              <strong>{activeAxis.label}</strong>
              <span className="active-score-pill">{activeAxis.score} / 100</span>
            </div>
            <p className="active-desc">{activeAxis.description}</p>
            <div className="active-value-line">
              Official Benchmark: <strong>{activeAxis.actualValue}</strong>
            </div>
          </div>
        ) : (
          <div className="radar-composite-summary">
            <div className="composite-ovr-strip">
              <span>Overall Combine Rating:</span>
              <strong className="ovr-text">
                {Math.round(axes.reduce((acc, a) => acc + a.score, 0) / axes.length)} OVR
              </strong>
            </div>
            <p className="radar-help-hint">Hover or tap any hexagon vertex to inspect national test benchmarks.</p>
          </div>
        )}
      </div>
    </div>
  )
}
