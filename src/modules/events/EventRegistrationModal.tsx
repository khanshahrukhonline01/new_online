import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  type SportEvent,
  type EventRegistrationInquiry,
  saveEventRegistrationInquiry,
} from './eventsData'

export interface EventRegistrationModalProps {
  event: SportEvent | null
  isOpen: boolean
  onClose: () => void
  onSuccessToast?: (msg: string) => void
}

export function EventRegistrationModal({
  event,
  isOpen,
  onClose,
  onSuccessToast,
}: EventRegistrationModalProps) {
  const [athleteName, setAthleteName] = useState('')
  const [athleteAge, setAthleteAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [federationId, setFederationId] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [notes, setNotes] = useState('')
  const [submittedInquiry, setSubmittedInquiry] = useState<EventRegistrationInquiry | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !event) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!athleteName.trim() || !phone.trim() || !athleteAge.trim()) {
      setErrorMsg('Please enter athlete name, age, and valid contact phone number.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for WhatsApp & SMS updates.')
      return
    }

    const record = saveEventRegistrationInquiry({
      eventId: event.id,
      eventTitle: event.title,
      athleteName: athleteName.trim(),
      athleteAge: athleteAge.trim(),
      gender,
      sport: event.sport,
      city: event.city,
      phone: phone.trim(),
      email: email.trim(),
      federationId: federationId.trim() || undefined,
      affiliationClubOrSchool: affiliation.trim() || undefined,
      notes: notes.trim() || undefined,
    })

    setSubmittedInquiry(record)
    onSuccessToast?.(`Inquiry submitted for ${event.title}! Tracking ID: ${record.id}`)
  }

  const handleReset = () => {
    setSubmittedInquiry(null)
    setAthleteName('')
    setAthleteAge('')
    setPhone('')
    setEmail('')
    setFederationId('')
    setAffiliation('')
    setNotes('')
    onClose()
  }

  const whatsappMessage = encodeURIComponent(
    `Namaste! I want to enquire regarding entry/participation in "${event.title}" (${event.edition}).\n\n` +
      `Athlete: ${athleteName || 'Athlete'}\n` +
      `Age: ${athleteAge || 'N/A'}\n` +
      `Federation ID: ${federationId || 'Pending'}\n` +
      `Affiliation: ${affiliation || 'School / Club'}\n` +
      `Tracking Reference: ${submittedInquiry?.id || 'New Inquiry'}\n\n` +
      `Please assist with entry criteria & submission documents.`
  )

  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappMessage}`

  return (
    <div
      className="event-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onClick={e => {
        if (e.target === e.currentTarget) handleReset()
      }}
    >
      <div className="event-modal-content">
        <header className="event-modal-header">
          <div>
            <div className="event-modal-badge-row">
              <span className="event-sanction-tag">
                <SiteIcon name="shield-check" size={13} />
                <span>{event.sanctioningBody}</span>
              </span>
              <span className="event-modal-sport-tag">{event.sport}</span>
            </div>
            <h2 id="event-modal-title" className="event-modal-title">
              {submittedInquiry ? 'Entry Registration Inquiry Lodged' : 'Register & Inquire for Championship'}
            </h2>
            <p className="event-modal-subtitle">{event.title} · {event.city}</p>
          </div>
          <button
            type="button"
            className="event-modal-close"
            onClick={handleReset}
            aria-label="Close dialog"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </header>

        {submittedInquiry ? (
          <div className="event-modal-success">
            <div className="success-icon-badge">
              <SiteIcon name="badge-check" size={32} />
            </div>
            <h3>Registration Inquiry Confirmed!</h3>
            <p className="success-reference">
              Official Reference ID: <strong>{submittedInquiry.id}</strong>
            </p>
            <p className="success-lead">
              Your inquiry has been stored securely in your KhelGrid session and routed to the tournament organizing desk.
            </p>

            <div className="success-details-card">
              <div><strong>Athlete:</strong> {submittedInquiry.athleteName} ({submittedInquiry.athleteAge} yrs)</div>
              <div><strong>Tournament:</strong> {submittedInquiry.eventTitle}</div>
              <div><strong>Venue:</strong> {event.venue}</div>
              <div><strong>Tournament Dates:</strong> {event.startDate} to {event.endDate}</div>
              {submittedInquiry.federationId && <div><strong>Federation ID:</strong> {submittedInquiry.federationId}</div>}
            </div>

            <div className="success-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                <span>Connect with Desk on WhatsApp</span>
                <SiteIcon name="arrow-up-right" size={15} />
              </a>
              <a
                href={event.officialNoticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="official-portal-btn"
              >
                <span>Visit Official Federation Portal</span>
                <SiteIcon name="external-link" size={14} />
              </a>
              <button
                type="button"
                className="event-done-btn"
                onClick={handleReset}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="event-modal-form" onSubmit={handleSubmit}>
            <div className="event-summary-box">
              <div className="summary-item">
                <span className="summary-label">Dates</span>
                <span className="summary-val">{event.startDate} to {event.endDate}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Registration Deadline</span>
                <span className="summary-val deadline-urgent">{event.registrationDeadline}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Age Groups</span>
                <span className="summary-val">{event.ageCategories.join(', ')}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Prize Purse / Benefit</span>
                <span className="summary-val prize-val">{event.prizePool}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="event-form-error" role="alert">
                <SiteIcon name="alert-triangle" size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-athlete-name">
                  Athlete Full Name <span className="req">*</span>
                </label>
                <input
                  id="evt-athlete-name"
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={athleteName}
                  onChange={e => setAthleteName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="evt-athlete-age">
                  Age (Years) <span className="req">*</span>
                </label>
                <input
                  id="evt-athlete-age"
                  type="number"
                  min="8"
                  max="35"
                  required
                  placeholder="e.g. 16"
                  value={athleteAge}
                  onChange={e => setAthleteAge(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-gender">Gender</label>
                <select
                  id="evt-gender"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                >
                  <option value="Male">Male / Boys</option>
                  <option value="Female">Female / Girls</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="evt-phone">
                  WhatsApp Contact Phone <span className="req">*</span>
                </label>
                <input
                  id="evt-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="evt-email">Email Address</label>
                <input
                  id="evt-email"
                  type="email"
                  placeholder="e.g. aryan@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="evt-federation-id">
                  Federation Athlete UID <span className="opt">(Optional)</span>
                </label>
                <input
                  id="evt-federation-id"
                  type="text"
                  placeholder="e.g. AFI-10294 / BAI-88192"
                  value={federationId}
                  onChange={e => setFederationId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="evt-affiliation">
                School / Academy / Club Affiliation
              </label>
              <input
                id="evt-affiliation"
                type="text"
                placeholder="e.g. Delhi Public School R.K. Puram / National Sports Academy"
                value={affiliation}
                onChange={e => setAffiliation(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="evt-notes">
                Participation Category / Notes <span className="opt">(Optional)</span>
              </label>
              <textarea
                id="evt-notes"
                rows={2}
                placeholder="e.g. Wish to enter Boys U-17 Singles & Doubles events; need official hostel accommodation guidance."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="dpdp-privacy-notice">
              <SiteIcon name="shield-check" size={14} />
              <span>
                <strong>DPDP Act 2023 & POCSO Safe Sports:</strong> Athlete contacts are encrypted and never disclosed to commercial brokers. Minor registrations require parent/coach approval.
              </span>
            </div>

            <div className="event-modal-buttons">
              <button type="button" className="event-btn-cancel" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="event-btn-submit">
                <span>Submit Entry Inquiry</span>
                <SiteIcon name="arrow-up-right" size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
