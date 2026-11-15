import { useState, useMemo } from 'react'

export interface AcademicDataChartProps {
  tableData: {
    caption?: string
    headers: string[]
    rows: (string | number)[][]
  }
}

interface ParsedMetricColumn {
  colIndex: number
  header: string
  unit: string
  values: (number | null)[]
  rawValues: string[]
}

export function AcademicDataChart({ tableData }: AcademicDataChartProps) {
  const { headers, rows, caption } = tableData

  // Parse columns 1..N to identify numeric data
  const metricColumns: ParsedMetricColumn[] = useMemo(() => {
    if (!headers || headers.length <= 1 || !rows || rows.length === 0) {
      return []
    }

    const cols: ParsedMetricColumn[] = []

    for (let c = 1; c < headers.length; c++) {
      let numericCount = 0
      let detectedUnit = ''
      const values: (number | null)[] = []
      const rawValues: string[] = []

      for (let r = 0; r < rows.length; r++) {
        const raw = String(rows[r][c] ?? '').trim()
        rawValues.push(raw)

        // Parse numerical pattern (handles decimals, percentages, and ± standard deviations)
        // e.g. "11.8 ± 0.9" -> 11.8, "91.2%" -> 91.2, "1,840" -> 1840, "32.4" -> 32.4
        const cleaned = raw.replace(/,/g, '')
        const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/)

        if (match && !isNaN(parseFloat(match[0]))) {
          const num = parseFloat(match[0])
          values.push(num)
          numericCount++

          if (!detectedUnit) {
            if (raw.includes('%')) detectedUnit = '%'
            else if (raw.includes('BW')) detectedUnit = 'BW'
            else if (raw.includes('km/h')) detectedUnit = 'km/h'
            else if (raw.includes('m/s')) detectedUnit = 'm/s'
            else if (raw.includes('g/kg')) detectedUnit = 'g/kg'
            else if (raw.includes('mL/kg/min')) detectedUnit = 'mL/kg/min'
            else if (raw.includes('mIU/mL')) detectedUnit = 'mIU/mL'
            else if (raw.includes('ng/mL')) detectedUnit = 'ng/mL'
            else if (raw.includes('km')) detectedUnit = 'km'
            else if (raw.includes('min')) detectedUnit = 'min'
            else if (raw.includes('cm')) detectedUnit = 'cm'
            else if (raw.includes('hrs')) detectedUnit = 'hrs'
          }
        } else {
          values.push(null)
        }
      }

      if (numericCount > 0) {
        cols.push({
          colIndex: c,
          header: headers[c],
          unit: detectedUnit,
          values,
          rawValues,
        })
      }
    }

    return cols
  }, [headers, rows])

  const [activeMetricIdx, setActiveMetricIdx] = useState(0)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [isCompareMode, setIsCompareMode] = useState(false)

  if (metricColumns.length === 0) {
    return (
      <div className="kc-chart-fallback" role="note">
        <p>Numerical metrics are summarized directly in the academic table above.</p>
      </div>
    )
  }

  const primaryCol = metricColumns[Math.min(activeMetricIdx, metricColumns.length - 1)]
  const secondaryCol = metricColumns.length > 1 ? metricColumns[(activeMetricIdx + 1) % metricColumns.length] : null

  // Calculate scales
  const rowLabels = rows.map(r => String(r[0] ?? `Item`))
  const numItems = rowLabels.length

  const allActiveValues = primaryCol.values.filter((v): v is number => v !== null && !isNaN(v))
  if (isCompareMode && secondaryCol) {
    secondaryCol.values.forEach(v => {
      if (v !== null && !isNaN(v)) allActiveValues.push(v)
    })
  }

  const minVal = Math.min(0, ...allActiveValues)
  const maxVal = Math.max(1, ...allActiveValues)
  const valRange = maxVal - minVal || 1

  // SVG Layout dimensions
  const svgWidth = 680
  const svgHeight = 260
  const padLeft = 60
  const padRight = 30
  const padTop = 35
  const padBottom = 55
  const chartWidth = svgWidth - padLeft - padRight
  const chartHeight = svgHeight - padTop - padBottom

  const stepX = chartWidth / Math.max(1, numItems)
  const barWidth = isCompareMode && secondaryCol ? Math.max(12, Math.min(36, (stepX - 16) / 2)) : Math.max(20, Math.min(64, stepX - 24))

  // Grid ticks
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const val = minVal + ratio * valRange
    const y = padTop + chartHeight - ratio * chartHeight
    return { val: Number(val.toFixed(1)), y }
  })

  return (
    <div className="kc-academic-chart-box" role="region" aria-label={caption || 'Interactive Academic Chart'}>
      {/* Top Header & Metric Selector */}
      <div className="kc-chart-header">
        <div className="kc-chart-caption">
          <strong>📊 Visualization:</strong> {caption || 'Empirical Dataset Comparison'}
        </div>

        {metricColumns.length > 1 && (
          <div className="kc-chart-controls">
            <div className="kc-metric-pills-row" role="tablist" aria-label="Select metric to plot">
              {metricColumns.map((col, idx) => (
                <button
                  key={col.colIndex}
                  type="button"
                  role="tab"
                  aria-selected={activeMetricIdx === idx}
                  className={`kc-metric-pill ${activeMetricIdx === idx ? 'is-active' : ''}`}
                  onClick={() => setActiveMetricIdx(idx)}
                >
                  {col.header}
                </button>
              ))}
            </div>

            {metricColumns.length >= 2 && (
              <button
                type="button"
                className={`kc-compare-toggle ${isCompareMode ? 'is-active' : ''}`}
                onClick={() => setIsCompareMode(prev => !prev)}
                title="Compare two metrics side by side"
              >
                {isCompareMode ? '✓ Comparing' : '⇄ Compare'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="kc-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="kc-academic-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Bar chart of ${primaryCol.header}`}
        >
          <defs>
            <linearGradient id="kcPrimaryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="kcSecondaryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
            </linearGradient>
            <filter id="kcShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeDasharray={i === 0 ? 'none' : '3 3'}
                strokeWidth={i === 0 ? 1.5 : 1}
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
                fontFamily="system-ui, sans-serif"
              >
                {tick.val}
                {primaryCol.unit ? ` ${primaryCol.unit}` : ''}
              </text>
            </g>
          ))}

          {/* Bars and labels */}
          {rowLabels.map((label, rIdx) => {
            const centerX = padLeft + rIdx * stepX + stepX / 2
            const val1 = primaryCol.values[rIdx]
            const raw1 = primaryCol.rawValues[rIdx]
            const isHovered = hoveredIdx === rIdx

            // Primary bar calculations
            const ratio1 = val1 !== null && !isNaN(val1) ? Math.max(0, (val1 - minVal) / valRange) : 0
            const bHeight1 = Math.max(4, ratio1 * chartHeight)
            const bY1 = padTop + chartHeight - bHeight1
            const bX1 = isCompareMode && secondaryCol ? centerX - barWidth - 2 : centerX - barWidth / 2

            // Secondary bar calculations
            const val2 = secondaryCol ? secondaryCol.values[rIdx] : null
            const raw2 = secondaryCol ? secondaryCol.rawValues[rIdx] : ''
            const ratio2 = val2 !== null && !isNaN(val2) ? Math.max(0, (val2 - minVal) / valRange) : 0
            const bHeight2 = Math.max(4, ratio2 * chartHeight)
            const bY2 = padTop + chartHeight - bHeight2
            const bX2 = centerX + 2

            // Label truncate
            const displayLabel = label.length > 20 ? label.slice(0, 18) + '…' : label

            return (
              <g
                key={rIdx}
                className="kc-chart-item-group"
                onMouseEnter={() => setHoveredIdx(rIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${label}: ${primaryCol.header} ${raw1}${isCompareMode && secondaryCol ? `, ${secondaryCol.header} ${raw2}` : ''}`}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={centerX - stepX / 2 + 4}
                    y={padTop}
                    width={stepX - 8}
                    height={chartHeight + 10}
                    fill="#f1f5f9"
                    rx="6"
                    opacity="0.6"
                  />
                )}

                {/* Primary Bar */}
                <rect
                  x={bX1}
                  y={bY1}
                  width={barWidth}
                  height={bHeight1}
                  rx="4"
                  fill="url(#kcPrimaryGrad)"
                  filter={isHovered ? 'url(#kcShadow)' : undefined}
                  stroke={isHovered ? '#047857' : 'none'}
                  strokeWidth="1.5"
                  className="kc-svg-bar"
                />

                {/* Primary Value Label */}
                <text
                  x={bX1 + barWidth / 2}
                  y={bY1 - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#065f46"
                  fontFamily="system-ui, sans-serif"
                >
                  {val1 !== null ? val1 : ''}
                </text>

                {/* Secondary Bar in compare mode */}
                {isCompareMode && secondaryCol && (
                  <>
                    <rect
                      x={bX2}
                      y={bY2}
                      width={barWidth}
                      height={bHeight2}
                      rx="4"
                      fill="url(#kcSecondaryGrad)"
                      filter={isHovered ? 'url(#kcShadow)' : undefined}
                      stroke={isHovered ? '#0369a1' : 'none'}
                      strokeWidth="1.5"
                      className="kc-svg-bar"
                    />
                    <text
                      x={bX2 + barWidth / 2}
                      y={bY2 - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#075985"
                      fontFamily="system-ui, sans-serif"
                    >
                      {val2 !== null ? val2 : ''}
                    </text>
                  </>
                )}

                {/* Category X-Axis Label */}
                <text
                  x={centerX}
                  y={padTop + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? '#0f172a' : '#475569'}
                  fontFamily="system-ui, sans-serif"
                >
                  {displayLabel}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend & Active Item Inspector */}
      <div className="kc-chart-footer">
        <div className="kc-chart-legend">
          <span className="kc-legend-item">
            <span className="kc-legend-swatch" style={{ background: '#059669' }} />
            <span className="kc-legend-label">{primaryCol.header}</span>
          </span>
          {isCompareMode && secondaryCol && (
            <span className="kc-legend-item">
              <span className="kc-legend-swatch" style={{ background: '#0284c7' }} />
              <span className="kc-legend-label">{secondaryCol.header}</span>
            </span>
          )}
        </div>

        {hoveredIdx !== null && (
          <div className="kc-chart-hover-pill" role="status">
            <strong>{rowLabels[hoveredIdx]}:</strong> {primaryCol.header} = <span className="kc-hover-val">{primaryCol.rawValues[hoveredIdx]}</span>
            {isCompareMode && secondaryCol && (
              <> · {secondaryCol.header} = <span className="kc-hover-val">{secondaryCol.rawValues[hoveredIdx]}</span></>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
