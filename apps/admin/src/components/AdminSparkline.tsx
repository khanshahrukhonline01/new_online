import { useId, useMemo } from 'react'

export interface AdminSparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  trendLabel?: string
  ariaLabel?: string
}

export function AdminSparkline({
  data,
  color = '#10b981',
  width = 64,
  height = 24,
  trendLabel,
  ariaLabel = '7-day trend sparkline',
}: AdminSparklineProps) {
  const gradientId = useId()

  const { pathD, areaD, lastX, lastY, pctChange } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pathD: '', areaD: '', lastX: 0, lastY: 0, pctChange: 0 }
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 3
    const usableHeight = height - padding * 2

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - padding - ((val - min) / range) * usableHeight
      return { x, y }
    })

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    const firstPt = points[0]
    const lastPt = points[points.length - 1]
    const areaD = `${pathD} L ${lastPt.x.toFixed(1)} ${height} L ${firstPt.x.toFixed(1)} ${height} Z`

    const firstVal = data[0] || 1
    const lastVal = data[data.length - 1]
    const pctChange = Math.round(((lastVal - firstVal) / firstVal) * 100)

    return {
      pathD,
      areaD,
      lastX: lastPt.x,
      lastY: lastPt.y,
      pctChange,
    }
  }, [data, width, height])

  if (!pathD) return null

  const isUp = pctChange >= 0

  return (
    <div className="admin-sparkline-wrap" title={trendLabel || `7-day trend: ${isUp ? '+' : ''}${pctChange}%`}>
      <svg
        className="admin-sparkline-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath curve */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Sparkline Stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint pulse dot */}
        <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      </svg>

      <span className={`admin-sparkline-badge ${isUp ? 'is-up' : 'is-down'}`}>
        {isUp ? '↑' : '↓'}&nbsp;{Math.abs(pctChange)}%
      </span>
    </div>
  )
}
