import { useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  saveTrialAlertSubscription,
  buildWhatsAppSubscriptionUrl,
  requestWebPushPermission,
  dispatchWebPushNotification,
} from '../../shared/notifications/pushNotificationService'
import './WhatsAppTrialAlertModal.css'

export interface WhatsAppTrialAlertModalProps {
  isOpen: boolean
  onClose: () => void
  defaultSport?: string
  defaultCity?: string
  defaultState?: string
}

const COMMON_SPORTS = [
  'All Sports',
  'Cricket',
  'Football',
  'Badminton',
  'Athletics',
  'Kabaddi',
  'Wrestling',
  'Swimming',
  'Basketball',
  'Tennis',
  'Hockey',
]

const AGE_CATEGORIES = ['All Age Groups', 'U-14', 'U-16', 'U-19', 'Open / Senior'] as const

export function WhatsAppTrialAlertModal({
  isOpen,
  onClose,
  defaultSport = 'All Sports',
  defaultCity = '',
  defaultState = 'India',
}: WhatsAppTrialAlertModalProps) {
  const [sport, setSport] = useState(defaultSport)
  const [city, setCity] = useState(defaultCity)
  const [state, setState] = useState(defaultState)
  const [ageCategory, setAgeCategory] = useState<string>('All Age Groups')
  const [phone, setPhone] = useState('')
  const [remind48, setRemind48] = useState(true)
  const [remind12, setRemind12] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [assignedToken, setAssignedToken] = useState('')
  const [pushStatus, setPushStatus] = useState<'idle' | 'granted' | 'denied'>('idle')

  if (!isOpen) return null

  const handleWhatsAppSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedPhone = phone.replace(/[^0-9]/g, '')
    const mappedAge = (ageCategory === 'All Age Groups' ? 'All' : ageCategory) as
      | 'U-14'
      | 'U-16'
      | 'U-19'
      | 'Open'
      | 'All'

    const saved = saveTrialAlertSubscription({
      phoneNumber: cleanedPhone || 'whatsapp-relay',
      sport,
      state: state || 'India',
      city: city || undefined,
      ageCategory: mappedAge,
      channel: 'whatsapp',
      remind48HoursBefore: remind48,
      remind12HoursBefore: remind12,
    })

    setAssignedToken(saved.token)
    setIsSubscribed(true)

    // Open WhatsApp Relay
    const waUrl = buildWhatsAppSubscriptionUrl({
      sport,
      state: state || 'India',
      city: city || undefined,
      ageCategory,
      phoneNumber: cleanedPhone,
    })

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleEnableWebPush = async () => {
    const permission = await requestWebPushPermission()
    if (permission === 'granted') {
      setPushStatus('granted')
      dispatchWebPushNotification('KhelGrid Trial Alerts Activated!', {
        body: `You will receive push reminders 48h and 12h before upcoming ${sport} selection trial deadlines in ${city || state}.`,
      })
    } else {
      setPushStatus('denied')
    }
  }

  return (
    <div
      className="trial-alert-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-alert-modal-title"
    >
      <div className="trial-alert-modal" onClick={e => e.stopPropagation()}>
        <div className="alert-modal-header">
          <div className="alert-modal-eyebrow">
            <SiteIcon name="bell" size={14} />
            <span>1-TAP SELECTION TRIAL ALERTS</span>
          </div>
          <button
            type="button"
            className="alert-modal-close"
            onClick={onClose}
            aria-label="Close trial alert modal"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        <div className="alert-modal-body">
          <h3 id="trial-alert-modal-title">Get Instant WhatsApp &amp; Push Trial Alerts</h3>
          <p className="alert-modal-desc">
            Never miss an official SAI, state federation, or academy selection trial. Receive instant WhatsApp
            announcements and automated 48h &amp; 12h deadline countdown reminders.
          </p>

          {isSubscribed ? (
            <div className="alert-success-banner">
              <div className="success-icon-wrap">
                <SiteIcon name="shield-check" size={24} />
              </div>
              <h4>Trial Alerts Active!</h4>
              <p>
                Subscription registered for <strong>{sport}</strong> trials in{' '}
                <strong>{city ? `${city}, ${state}` : state}</strong> ({ageCategory}).
              </p>
              <div className="alert-token-pill">
                <span>Alert Token: </span>
                <strong>{assignedToken}</strong>
              </div>
              <p className="token-hint">
                A confirmation message has been prepared for WhatsApp. Tap below to send or enable web push notifications.
              </p>
              <div className="modal-cta-row">
                <button
                  type="button"
                  className="btn-enable-push"
                  onClick={handleEnableWebPush}
                  disabled={pushStatus === 'granted'}
                >
                  <SiteIcon name="bell" size={14} />
                  <span>{pushStatus === 'granted' ? 'Web Push Active ✓' : 'Enable Web Push Alerts'}</span>
                </button>
                <button type="button" className="btn-modal-done" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleWhatsAppSubscribe} className="trial-alert-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="alert-sport">Sport</label>
                  <select
                    id="alert-sport"
                    value={sport}
                    onChange={e => setSport(e.target.value)}
                  >
                    {COMMON_SPORTS.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="alert-age">Age Category</label>
                  <select
                    id="alert-age"
                    value={ageCategory}
                    onChange={e => setAgeCategory(e.target.value)}
                  >
                    {AGE_CATEGORIES.map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="alert-city">City / District (Optional)</label>
                  <input
                    id="alert-city"
                    type="text"
                    placeholder="e.g. Kanpur, Kozhikode, Delhi"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="alert-state">State</label>
                  <input
                    id="alert-state"
                    type="text"
                    placeholder="e.g. Uttar Pradesh, Kerala"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="alert-phone">WhatsApp Mobile Number</label>
                <div className="phone-input-wrap">
                  <span className="phone-prefix">+91</span>
                  <input
                    id="alert-phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <span className="field-hint">Used strictly for trial alerts and official deadline countdowns.</span>
              </div>

              <div className="countdown-reminders-box">
                <span className="reminders-title">Automated Countdown Reminders:</span>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remind48}
                    onChange={e => setRemind48(e.target.checked)}
                  />
                  <span>48 Hours Before Application Deadline</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remind12}
                    onChange={e => setRemind12(e.target.checked)}
                  />
                  <span>12 Hours Final Call Reminder</span>
                </label>
              </div>

              <div className="modal-actions-tray">
                <button type="submit" className="btn-submit-whatsapp-alert">
                  <SiteIcon name="share" size={16} />
                  <span>1-Tap Subscribe via WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="btn-enable-webpush-alt"
                  onClick={handleEnableWebPush}
                >
                  <SiteIcon name="bell" size={14} />
                  <span>{pushStatus === 'granted' ? 'Web Push Active' : 'Enable Web Push'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
