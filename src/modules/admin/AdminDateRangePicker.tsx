import { useEffect, useRef, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  DEFAULT_COMPLIANCE_DATE_RANGE,
  type ComplianceDateRange,
  type ComplianceDateRangePreset,
  type ResolvedComplianceDateWindow,
} from './complianceHeatmapData'
import './AdminDateRangePicker.css'

export interface AdminDateRangePickerProps {
  value: ComplianceDateRange
  resolvedWindow: ResolvedComplianceDateWindow
  onChange: (next: ComplianceDateRange) => void
  comparePreviousPeriod?: boolean
  onToggleComparePreviousPeriod?: (enabled: boolean) => void
  previousWindowPreview?: string | null
}

const PRESET_OPTIONS: readonly {
  preset: Exclude<ComplianceDateRangePreset, 'custom'>
  label: string
  sub: string
}[] = [
  { preset: '7d', label: 'Last 7 Days', sub: 'Short-term spike detection' },
  { preset: '30d', label: 'Last 30 Days', sub: 'Default rolling compliance window' },
  { preset: '90d', label: 'Last 90 Days', sub: 'Quarterly regulatory trajectory' },
  { preset: 'all', label: 'All Time', sub: 'Full historical signal scope' },
]

export function AdminDateRangePicker({
  value,
  resolvedWindow,
  onChange,
  comparePreviousPeriod = false,
  onToggleComparePreviousPeriod,
  previousWindowPreview = null,
}: AdminDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(value.startDate ?? resolvedWindow.startDateIso)
  const [draftEnd, setDraftEnd] = useState(value.endDate ?? resolvedWindow.endDateIso)
  const [validationError, setValidationError] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleToggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev
      if (next) {
        setDraftStart(value.startDate ?? resolvedWindow.startDateIso)
        setDraftEnd(value.endDate ?? resolvedWindow.endDateIso)
        setValidationError('')
      }
      return next
    })
  }

  const handleSelectPreset = (preset: Exclude<ComplianceDateRangePreset, 'custom'>) => {
    setValidationError('')
    onChange({ preset, startDate: null, endDate: null })
    if (preset === 'all' && comparePreviousPeriod && onToggleComparePreviousPeriod) {
      onToggleComparePreviousPeriod(false)
    }
    setIsOpen(false)
  }

  const handleApplyCustom = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draftStart || !draftEnd) {
      setValidationError('Select both start and end dates.')
      return
    }
    if (draftStart > draftEnd) {
      setValidationError('Start date must be on or before end date.')
      return
    }
    setValidationError('')
    onChange({
      preset: 'custom',
      startDate: draftStart,
      endDate: draftEnd,
    })
    setIsOpen(false)
  }

  const isNonDefault = value.preset !== '30d' || comparePreviousPeriod
  const canCompare = value.preset !== 'all'

  return (
    <div className="admin-date-picker" ref={rootRef}>
      <button
        type="button"
        className={`admin-analytics-btn admin-analytics-btn-secondary admin-date-picker-trigger ${isNonDefault ? 'is-custom-active' : ''}`}
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Compliance date range: ${resolvedWindow.label}${comparePreviousPeriod && canCompare ? ', comparing to previous period' : ''}`}
        data-testid="analytics-date-range-trigger"
        title={`Active scope: ${resolvedWindow.startDateIso} to ${resolvedWindow.endDateIso}`}
      >
        <SiteIcon name="calendar" size={14} />
        <span className="admin-date-picker-label">
          {resolvedWindow.label}
          {comparePreviousPeriod && canCompare ? ' · vs Prev' : ''}
        </span>
        <SiteIcon name="chevron-down" size={13} />
      </button>

      {isOpen && (
        <div
          className="admin-date-picker-popover"
          role="dialog"
          aria-label="Select compliance analytics date range"
          data-testid="analytics-date-range-popover"
        >
          <div className="admin-date-picker-section">
            <span className="admin-date-picker-kicker">Quick Presets</span>
            <div className="admin-date-preset-grid" role="group" aria-label="Date range presets">
              {PRESET_OPTIONS.map(opt => {
                const active = value.preset === opt.preset
                return (
                  <button
                    key={opt.preset}
                    type="button"
                    className={`admin-date-preset-btn ${active ? 'is-active' : ''}`}
                    onClick={() => handleSelectPreset(opt.preset)}
                    aria-pressed={active}
                    data-testid={`date-preset-${opt.preset}`}
                  >
                    <strong>{opt.label}</strong>
                    <span>{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {onToggleComparePreviousPeriod && (
            <div className="admin-date-compare-row">
              <label className={`admin-date-compare-toggle ${!canCompare ? 'is-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={canCompare && comparePreviousPeriod}
                  disabled={!canCompare}
                  onChange={e => onToggleComparePreviousPeriod(e.target.checked)}
                  data-testid="date-range-compare-toggle"
                />
                <span className="admin-date-compare-copy">
                  <strong>Compare to previous period</strong>
                  <small>
                    {!canCompare
                      ? 'Select a bounded range (7d, 30d, 90d, or Custom)'
                      : previousWindowPreview
                        ? `Baseline: ${previousWindowPreview}`
                        : 'Overlays prior-window deltas & dashed baseline trend'}
                  </small>
                </span>
              </label>
            </div>
          )}

          <form className="admin-date-custom-form" onSubmit={handleApplyCustom}>
            <span className="admin-date-picker-kicker">Custom Date Range</span>
            <div className="admin-date-input-row">
              <label className="admin-date-field">
                <span>Start Date</span>
                <input
                  type="date"
                  value={draftStart}
                  onChange={e => {
                    setDraftStart(e.target.value)
                    setValidationError('')
                  }}
                  data-testid="date-range-start-input"
                  aria-label="Start date"
                />
              </label>
              <label className="admin-date-field">
                <span>End Date</span>
                <input
                  type="date"
                  value={draftEnd}
                  onChange={e => {
                    setDraftEnd(e.target.value)
                    setValidationError('')
                  }}
                  data-testid="date-range-end-input"
                  aria-label="End date"
                />
              </label>
            </div>

            {validationError && (
              <p className="admin-date-error" role="alert" data-testid="date-range-error">
                {validationError}
              </p>
            )}

            <div className="admin-date-custom-footer">
              <span className="admin-date-window-meta">
                Active: {resolvedWindow.startDateIso} → {resolvedWindow.endDateIso}
              </span>
              <div className="admin-date-footer-actions">
                {isNonDefault && (
                  <button
                    type="button"
                    className="admin-date-reset-btn"
                    onClick={() => {
                      onChange(DEFAULT_COMPLIANCE_DATE_RANGE)
                      onToggleComparePreviousPeriod?.(false)
                      setIsOpen(false)
                    }}
                    data-testid="date-range-reset-btn"
                  >
                    Reset 30d
                  </button>
                )}
                <button
                  type="submit"
                  className="admin-date-apply-btn"
                  data-testid="date-range-apply-btn"
                >
                  Apply Range
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
