import { useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { recordTrialReminder } from '../../integrations/supabase/athlete-profile-client'
import './TrialAlertActions.css'

export interface TrialAlertActionsProps {
  title: string
  slug: string
  startsAt?: string | null
  deadlineDate?: string | null
  city?: string | null
  venueName?: string | null
  compact?: boolean
}

function formatUtcCompact(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function TrialAlertActions({
  title,
  slug,
  startsAt,
  deadlineDate,
  city,
  venueName,
  compact = false,
}: TrialAlertActionsProps) {
  const [copied, setCopied] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const detailUrl = `${origin}/opportunities/${slug}`
  const eventDate = startsAt ? new Date(startsAt) : deadlineDate ? new Date(deadlineDate) : new Date()
  const validEventDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate
  const endDate = new Date(validEventDate.getTime() + 3 * 60 * 60 * 1000) // 3 hour duration

  const locationStr = [venueName, city].filter(Boolean).join(', ') || 'India'

  // 1. Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `Trial: ${title}`,
  )}&dates=${formatUtcCompact(validEventDate)}/${formatUtcCompact(endDate)}&details=${encodeURIComponent(
    `Official KhelGrid Sports Selection Trial: ${title}\nLocation: ${locationStr}\n\nView details & registration link: ${detailUrl}`,
  )}&location=${encodeURIComponent(locationStr)}`

  // 2. Download Apple / iCal (.ics) file
  const downloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KhelGrid//Sports Selection Trials//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:kg-trial-${slug}-${Date.now()}@khelgrid.com`,
      `DTSTAMP:${formatUtcCompact(new Date())}`,
      `DTSTART:${formatUtcCompact(validEventDate)}`,
      `DTEND:${formatUtcCompact(endDate)}`,
      `SUMMARY:Selection Trial: ${title}`,
      `DESCRIPTION:KhelGrid Selection Trial: ${title}\\nLocation: ${locationStr}\\nLink: ${detailUrl}`,
      `LOCATION:${locationStr}`,
      `URL:${detailUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P2D', // 48 hours before alarm!
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: 48 Hours before trial: ${title}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `khelgrid-trial-${slug}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setReminderSaved(true)
    recordTrialReminder({
      trialSlug: slug,
      trialTitle: title,
      startsAt,
      deadlineDate,
      city,
      venueName,
      notificationType: 'ical',
    })
  }

  // 3. WhatsApp Share & Self-Alert
  const deadlineFormatted = deadlineDate
    ? new Date(deadlineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : startsAt
      ? new Date(startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Upcoming'

  const whatsappMessage = `🚨 *KhelGrid Selection Trial Alert*\n\n🏆 *${title}*\n📍 *Location:* ${locationStr}\n⏳ *Date / Deadline:* ${deadlineFormatted}\n\n🔗 *Full Trial Details & Official Source:*\n${detailUrl}`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`

  const handleWhatsAppClick = () => {
    setReminderSaved(true)
    recordTrialReminder({
      trialSlug: slug,
      trialTitle: title,
      startsAt,
      deadlineDate,
      city,
      venueName,
      notificationType: 'whatsapp',
    })
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(detailUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className={`trial-alert-toolbar ${compact ? 'is-compact' : ''}`}>
      <span className="trial-alert-label">
        <SiteIcon name="bell" size={14} /> Trial Alerts:
      </span>
      <div className="trial-alert-buttons">
        <a
          className="trial-alert-btn btn-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          title="Share or send reminder on WhatsApp"
        >
          <SiteIcon name="message" size={14} /> WhatsApp Alert
        </a>

        <a
          className="trial-alert-btn btn-google-cal"
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Add to Google Calendar"
        >
          <SiteIcon name="calendar-check" size={14} /> Google Cal
        </a>

        <button
          type="button"
          className="trial-alert-btn btn-ical"
          onClick={downloadIcs}
          title="Download Apple / Outlook .ics calendar event with 48h alarm"
        >
          <SiteIcon name="download" size={14} /> iCal (.ics)
        </button>

        <button
          type="button"
          className="trial-alert-btn btn-copy"
          onClick={handleCopyLink}
          title="Copy trial link"
        >
          <SiteIcon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {reminderSaved && (
        <span className="trial-alert-feedback" role="status">
          ✓ Alert logged! Reminder ready.
        </span>
      )}
    </div>
  )
}
