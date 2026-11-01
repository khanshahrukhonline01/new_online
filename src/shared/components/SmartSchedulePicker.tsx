import { useState, useEffect, useId, type ChangeEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import './SmartSchedulePicker.css'

export interface SmartSchedulePickerProps {
  value: string
  onChange: (formattedLabel: string, isoTimestamp?: string) => void
  mode?: 'pickup' | 'opportunity'
  label?: string
  required?: boolean
}

interface DayOption {
  key: string
  label: string
  date: Date
  displayDate: string
}

const PICKUP_TIME_SESSIONS = [
  {
    name: 'Morning',
    icon: 'sun' as const,
    slots: ['06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM'],
  },
  {
    name: 'Evening',
    icon: 'clock' as const,
    slots: ['05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'],
  },
  {
    name: 'Night Floodlights',
    icon: 'moon' as const,
    slots: ['08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'],
  },
]

const TRIAL_TIME_SESSIONS = [
  {
    name: 'Morning Combines',
    icon: 'sun' as const,
    slots: ['06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM'],
  },
  {
    name: 'Afternoon / Evening',
    icon: 'clock' as const,
    slots: ['02:00 PM', '03:00 PM', '03:30 PM', '04:00 PM', '05:00 PM'],
  },
]

export function SmartSchedulePicker({
  value,
  onChange,
  mode = 'pickup',
  label = 'Match Schedule & Timing',
  required = false,
}: SmartSchedulePickerProps) {
  const customDateInputId = useId()
  const customTimeInputId = useId()
  const customManualInputId = useId()

  const [selectedDayKey, setSelectedDayKey] = useState<string>('today')
  const [selectedTime, setSelectedTime] = useState<string>('08:00 PM')
  const [customDate, setCustomDate] = useState<string>('')
  const [customTime, setCustomTime] = useState<string>('')
  const [showManualEdit, setShowManualEdit] = useState(false)
  const [activeSessionTab, setActiveSessionTab] = useState<number>(mode === 'pickup' ? 1 : 0)

  // Compute upcoming dynamic days based on today's calendar
  const now = new Date()
  const today = new Date(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const sat = new Date(now)
  const currentDay = now.getDay()
  const daysUntilSat = (6 - currentDay + 7) % 7 || 7
  sat.setDate(now.getDate() + daysUntilSat)

  const sun = new Date(now)
  const daysUntilSun = (7 - currentDay) % 7 || 7
  sun.setDate(now.getDate() + daysUntilSun)

  const formatDateDisplay = (d: Date) => {
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const dayOptions: DayOption[] = [
    { key: 'today', label: 'Today', date: today, displayDate: formatDateDisplay(today) },
    { key: 'tomorrow', label: 'Tomorrow', date: tomorrow, displayDate: formatDateDisplay(tomorrow) },
    { key: 'saturday', label: 'Saturday', date: sat, displayDate: formatDateDisplay(sat) },
    { key: 'sunday', label: 'Sunday', date: sun, displayDate: formatDateDisplay(sun) },
  ]

  const sessions = mode === 'pickup' ? PICKUP_TIME_SESSIONS : TRIAL_TIME_SESSIONS

  // Helper to compute ISO and formatted string
  const computeSchedule = (dayKey: string, timeStr: string, cDateStr?: string) => {
    let dayPrefix = 'Today'
    let targetDate = today

    if (dayKey === 'custom' && cDateStr) {
      const parts = cDateStr.split('-')
      if (parts.length === 3) {
        targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        dayPrefix = formatDateDisplay(targetDate)
      }
    } else {
      const opt = dayOptions.find(o => o.key === dayKey)
      if (opt) {
        dayPrefix = opt.label
        targetDate = opt.date
      }
    }

    const formatted = `${dayPrefix} · ${timeStr}`

    // Compute ISO timestamp
    let iso: string | undefined
    try {
      // Parse time string e.g. "08:30 PM"
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = parseInt(match[2], 10)
        const meridian = match[3].toUpperCase()

        if (meridian === 'PM' && hours < 12) hours += 12
        if (meridian === 'AM' && hours === 12) hours = 0

        const combined = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          hours,
          minutes,
          0,
        )
        iso = combined.toISOString()
      }
    } catch {
      // Ignore timestamp parsing error
    }

    return { formatted, iso }
  }

  const handleSelectDay = (key: string) => {
    setSelectedDayKey(key)
    const { formatted, iso } = computeSchedule(key, selectedTime, customDate)
    onChange(formatted, iso)
  }

  const handleSelectTime = (timeSlot: string) => {
    setSelectedTime(timeSlot)
    setCustomTime('')
    const { formatted, iso } = computeSchedule(selectedDayKey, timeSlot, customDate)
    onChange(formatted, iso)
  }

  const handleCustomDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomDate(val)
    setSelectedDayKey('custom')
    if (val) {
      const { formatted, iso } = computeSchedule('custom', selectedTime, val)
      onChange(formatted, iso)
    }
  }

  const handleCustomTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomTime(val)
    if (val) {
      const [hStr, mStr] = val.split(':')
      let h = parseInt(hStr, 10)
      const m = mStr || '00'
      const meridian = h >= 12 ? 'PM' : 'AM'
      if (h > 12) h -= 12
      if (h === 0) h = 12
      const formattedTime = `${String(h).padStart(2, '0')}:${m} ${meridian}`
      setSelectedTime(formattedTime)
      const { formatted, iso } = computeSchedule(selectedDayKey, formattedTime, customDate)
      onChange(formatted, iso)
    }
  }

  const handleManualTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  // Pre-fill initial value if empty
  useEffect(() => {
    if (!value) {
      const initialTime = mode === 'pickup' ? '08:00 PM' : '07:00 AM'
      setSelectedTime(initialTime)
      const { formatted, iso } = computeSchedule('today', initialTime)
      onChange(formatted, iso)
    }
  }, [])

  const todayIsoMin = new Date().toISOString().split('T')[0]

  return (
    <div className="smart-schedule-picker-container" aria-label="Date and Time Picker">
      <div className="smart-schedule-label-row">
        <label className="smart-schedule-title">
          <SiteIcon name="calendar-check" size={17} />
          <span>{label} {required && '*'}</span>
        </label>
        <button
          type="button"
          className="smart-schedule-manual-toggle"
          onClick={() => setShowManualEdit(!showManualEdit)}
        >
          <SiteIcon name="edit" size={13} />
          <span>{showManualEdit ? 'Use Quick Chips' : 'Type Custom Text'}</span>
        </button>
      </div>

      {!showManualEdit ? (
        <div className="smart-schedule-interactive-box">
          {/* 1. Day Selection Chips */}
          <div className="schedule-step-section">
            <span className="schedule-step-badge">1. Pick Day</span>
            <div className="schedule-day-chips-grid">
              {dayOptions.map(opt => {
                const isSelected = selectedDayKey === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`schedule-day-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectDay(opt.key)}
                  >
                    <span className="chip-primary-label">{opt.label}</span>
                    <span className="chip-sub-date">{opt.displayDate}</span>
                  </button>
                )
              })}

              {/* Custom Date Input Chip */}
              <label
                htmlFor={customDateInputId}
                className={`schedule-day-chip custom-date-chip ${selectedDayKey === 'custom' ? 'is-selected' : ''}`}
              >
                <div className="custom-date-label-content">
                  <span className="chip-primary-label">
                    <SiteIcon name="calendar" size={13} />
                    <span>Other Date</span>
                  </span>
                  <span className="chip-sub-date">
                    {customDate ? customDate : 'Choose from calendar'}
                  </span>
                </div>
                <input
                  id={customDateInputId}
                  type="date"
                  min={todayIsoMin}
                  value={customDate}
                  onChange={handleCustomDateChange}
                  className="native-date-hidden-input"
                />
              </label>
            </div>
          </div>

          {/* 2. Popular Time Slots by Session */}
          <div className="schedule-step-section">
            <div className="schedule-time-header">
              <span className="schedule-step-badge">2. Select Time Slot</span>
              <div className="session-tab-buttons">
                {sessions.map((sess, idx) => (
                  <button
                    key={sess.name}
                    type="button"
                    className={`session-tab-btn ${activeSessionTab === idx ? 'is-active' : ''}`}
                    onClick={() => setActiveSessionTab(idx)}
                  >
                    <SiteIcon name={sess.icon} size={13} />
                    <span>{sess.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Chips */}
            <div className="schedule-slots-grid">
              {sessions[activeSessionTab]?.slots.map(slot => {
                const isSelected = selectedTime === slot
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`schedule-slot-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTime(slot)}
                  >
                    <span>{slot}</span>
                  </button>
                )
              })}

              {/* Exact Custom Time Chip */}
              <label
                htmlFor={customTimeInputId}
                className={`schedule-slot-chip custom-time-chip ${customTime ? 'is-selected' : ''}`}
              >
                <SiteIcon name="clock" size={13} />
                <span>{customTime ? customTime : 'Custom Time'}</span>
                <input
                  id={customTimeInputId}
                  type="time"
                  value={customTime}
                  onChange={handleCustomTimeChange}
                  className="native-time-hidden-input"
                />
              </label>
            </div>
          </div>

          {/* 3. Live Auto-Formatted Result Pill */}
          <div className="schedule-formatted-banner">
            <div className="formatted-banner-info">
              <SiteIcon name="check-circle" size={16} />
              <span>Selected Schedule:</span>
              <strong>{value || 'Today · 8:00 PM'}</strong>
            </div>
            <span className="formatted-banner-tag">Instant 2-Tap Setup</span>
          </div>
        </div>
      ) : (
        /* Manual Fallback Input */
        <div className="schedule-manual-fallback-box">
          <label htmlFor={customManualInputId} className="visually-hidden">Custom Schedule Text</label>
          <input
            id={customManualInputId}
            type="text"
            className="schedule-manual-text-input"
            placeholder="e.g. Saturday · 7:00 AM or Every Sunday · 8:00 PM"
            value={value}
            onChange={handleManualTextChange}
            required={required}
          />
          <small className="schedule-manual-hint">
            You can type custom recurring schedules or match slots directly.
          </small>
        </div>
      )}
    </div>
  )
}
