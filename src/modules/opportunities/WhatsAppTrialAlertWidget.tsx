import { useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { WhatsAppTrialAlertModal } from './WhatsAppTrialAlertModal'
import './WhatsAppTrialAlertWidget.css'

export interface WhatsAppTrialAlertWidgetProps {
  city?: string
  state?: string
  sport?: string
  variant?: 'banner' | 'card' | 'compact'
}

export function WhatsAppTrialAlertWidget({
  city,
  state = 'India',
  sport = 'All Sports',
  variant = 'banner',
}: WhatsAppTrialAlertWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const regionLabel = city ? `${city}, ${state}` : state
  const sportLabel = sport && sport !== 'All Sports' ? sport : 'All'
  const locationLabel = city ? `${city}, India` : 'India'
  const directAlertActionLabel = `Get WhatsApp Alerts for ${sport && sport !== 'All Sports' ? `${sport} ` : ''}Trials${city ? ` in ${city}` : ''}`
  const directWhatsAppMessage = `Hi KhelGrid, please send me instant WhatsApp alerts for ${sportLabel} selection trials in ${locationLabel}.`
  const directWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(directWhatsAppMessage)}`

  return (
    <>
      <div className={`trial-alert-widget widget-${variant}`}>
        <div className="widget-left">
          <div className="widget-bell-icon">
            <SiteIcon name="bell" size={20} />
          </div>
          <div className="widget-text">
            <div className="widget-eyebrow">
              <span className="live-dot" />
              <span>1-TAP WHATSAPP TRIAL ALERTS</span>
            </div>
            <h4 className="widget-headline">
              Get {sport !== 'All Sports' ? `${sport} ` : ''}Selection Trial Alerts for {regionLabel}
            </h4>
            <p className="widget-sub">
              Automated WhatsApp announcements + 48h and 12h registration deadline countdown reminders.
            </p>
          </div>
        </div>

        <div className="widget-right">
          <a
            href={directWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-open-alert-modal btn-direct-whatsapp-alert"
            title={directAlertActionLabel}
            aria-label={directAlertActionLabel}
          >
            <SiteIcon name="share" size={15} />
            <span>{directAlertActionLabel}</span>
          </a>
          <button
            type="button"
            className="btn-open-alert-modal btn-alert-modal-trigger"
            onClick={() => setIsModalOpen(true)}
            title="Configure alert frequency & preferences"
          >
            <SiteIcon name="bell" size={14} />
            <span>Subscribe in 1 Tap</span>
          </button>
        </div>
      </div>

      <WhatsAppTrialAlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSport={sport}
        defaultCity={city}
        defaultState={state}
      />
    </>
  )
}
