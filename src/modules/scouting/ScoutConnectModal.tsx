import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { type ScoutAthlete, STORAGE_SCOUT_INQUIRIES_KEY } from './scoutingData'

export interface ScoutConnectModalProps {
  athlete: ScoutAthlete | null
  isOpen: boolean
  onClose: () => void
  onSuccessToast?: (msg: string) => void
}

export function ScoutConnectModal({
  athlete,
  isOpen,
  onClose,
  onSuccessToast,
}: ScoutConnectModalProps) {
  const [scoutName, setScoutName] = useState('')
  const [organization, setOrganization] = useState('')
  const [scoutRole, setScoutRole] = useState('NIS Patiala / SAI Talent Scout')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [inquiryType, setInquiryType] = useState('Academy Trial Invitation')
  const [message, setMessage] = useState('')
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !athlete) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!scoutName.trim() || !organization.trim() || !phone.trim()) {
      setErrorMsg('Please enter scout name, club/federation organization, and valid phone number.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit contact mobile number.')
      return
    }

    const refId = `KG-SCOUT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`

    if (typeof window !== 'undefined') {
      try {
        const record = {
          id: refId,
          athleteId: athlete.id,
          athleteName: athlete.name,
          sport: athlete.sport,
          scoutName: scoutName.trim(),
          organization: organization.trim(),
          scoutRole,
          phone: phone.trim(),
          email: email.trim(),
          inquiryType,
          message: message.trim(),
          createdAt: new Date().toISOString(),
        }
        const stored = localStorage.getItem(STORAGE_SCOUT_INQUIRIES_KEY)
        const list = stored ? JSON.parse(stored) : []
        list.unshift(record)
        localStorage.setItem(STORAGE_SCOUT_INQUIRIES_KEY, JSON.stringify(list))
      } catch {
        // ignore
      }
    }

    setSubmittedId(refId)
    onSuccessToast?.(`Scouting inquiry lodged for ${athlete.name}! Reference: ${refId}`)
  }

  const handleReset = () => {
    setSubmittedId(null)
    setScoutName('')
    setOrganization('')
    setPhone('')
    setEmail('')
    setMessage('')
    onClose()
  }

  const whatsappMessage = encodeURIComponent(
    `Namaste! I am ${scoutName || 'a Talent Scout'} representing ${organization || 'Sports Organization'}.\n\n` +
      `We have reviewed ${athlete.name}’s verified grassroots dossier on KhelGrid Scout Portal (${athlete.sport} - ${athlete.primaryPosition}).\n` +
      `Inquiry Reference: ${submittedId || 'KG-SCOUT-NEW'}\n` +
      `Purpose: ${inquiryType}\n\n` +
      `We wish to connect with the head coach/guardian regarding upcoming trials.`
  )

  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappMessage}`

  return (
    <div
      className="scout-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scout-modal-title"
      onClick={e => {
        if (e.target === e.currentTarget) handleReset()
      }}
    >
      <div className="scout-modal-content">
        <header className="scout-modal-header">
          <div>
            <div className="scout-modal-badges">
              <span className="scout-tier-tag">
                <SiteIcon name="shield-check" size={13} />
                <span>{athlete.verifiedTier}</span>
              </span>
              <span className="scout-sport-tag">{athlete.sport}</span>
            </div>
            <h2 id="scout-modal-title" className="scout-modal-title">
              {submittedId ? 'Scouting Inquiry Lodged' : `Connect Regarding ${athlete.name}`}
            </h2>
            <p className="scout-modal-subtitle">
              {athlete.primaryPosition} · {athlete.academy} ({athlete.city})
            </p>
          </div>
          <button
            type="button"
            className="scout-modal-close"
            onClick={handleReset}
            aria-label="Close dialog"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </header>

        {submittedId ? (
          <div className="scout-modal-success">
            <div className="scout-success-icon">
              <SiteIcon name="badge-check" size={32} />
            </div>
            <h3>Official Scout Connect Inquiry Lodged!</h3>
            <p className="scout-ref-code">
              Docket Reference: <strong>{submittedId}</strong>
            </p>
            <p className="scout-success-text">
              Under KhelGrid POCSO &amp; DPDP compliance, this inquiry has been queued for delivery to {athlete.name}’s registered head coach:
              <br />
              <strong>{athlete.guardianOrCoachContact}</strong>
            </p>

            <div className="scout-success-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="scout-whatsapp-btn"
              >
                <span>Dispatch Direct WhatsApp Notification</span>
                <SiteIcon name="arrow-up-right" size={15} />
              </a>
              <button
                type="button"
                className="scout-done-btn"
                onClick={handleReset}
              >
                Close &amp; Return to Workbench
              </button>
            </div>
          </div>
        ) : (
          <form className="scout-modal-form" onSubmit={handleSubmit}>
            <div className="scout-athlete-quick-summary">
              <div><strong>Age &amp; Category:</strong> {athlete.age} yrs ({athlete.ageGroup})</div>
              <div><strong>Federation UID:</strong> {athlete.federationUid}</div>
              <div><strong>Normative Percentile:</strong> Top {100 - athlete.percentileRank}% in India</div>
              <div><strong>Affiliation:</strong> {athlete.academy}</div>
            </div>

            {errorMsg && (
              <div className="scout-form-error" role="alert">
                <SiteIcon name="alert-triangle" size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="scout-name">
                  Scout Full Name <span className="req">*</span>
                </label>
                <input
                  id="scout-name"
                  type="text"
                  required
                  placeholder="e.g. Coach Vikram Rathore"
                  value={scoutName}
                  onChange={e => setScoutName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="scout-org">
                  Club / Academy / Federation <span className="req">*</span>
                </label>
                <input
                  id="scout-org"
                  type="text"
                  required
                  placeholder="e.g. SAI NCOE / Bengaluru FC Youth / DDCA"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="scout-role">Scout Designation</label>
                <select
                  id="scout-role"
                  value={scoutRole}
                  onChange={e => setScoutRole(e.target.value)}
                >
                  <option value="NIS Patiala / SAI Talent Scout">NIS Patiala / SAI Talent Scout</option>
                  <option value="State Association Chief Selector">State Association Chief Selector</option>
                  <option value="Professional Club Head of Academy">Professional Club Head of Academy</option>
                  <option value="Sports Scholarship Director">Sports Scholarship Director</option>
                  <option value="College / University Sports Officer">College / University Sports Officer</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="scout-inquiry-type">Inquiry Purpose</label>
                <select
                  id="scout-inquiry-type"
                  value={inquiryType}
                  onChange={e => setInquiryType(e.target.value)}
                >
                  <option value="Academy Trial Invitation">Selection / Academy Trial Invitation</option>
                  <option value="National Camp Nomination">National / State Camp Nomination</option>
                  <option value="High Performance Scholarship Offer">High-Performance Scholarship Offer</option>
                  <option value="Request for Verified Video / Match Data">Request for Verified Match Video</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="scout-phone">
                  Contact Mobile Number <span className="req">*</span>
                </label>
                <input
                  id="scout-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9811002233"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="scout-email">Official Email</label>
                <input
                  id="scout-email"
                  type="email"
                  placeholder="e.g. scout@sai.gov.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="scout-message">
                Invitation / Inquiry Message <span className="opt">(Optional)</span>
              </label>
              <textarea
                id="scout-message"
                rows={3}
                placeholder="Detail upcoming trial dates, age criteria, and accommodation provisions..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <div className="scout-pocso-box">
              <SiteIcon name="shield-check" size={15} />
              <span>
                <strong>POCSO Minor Safety Standard:</strong> Inquiries for athletes under 18 years of age are routed strictly to verified coaches and guardians. Direct unsolicited messaging to minors is prohibited.
              </span>
            </div>

            <div className="scout-modal-footer">
              <button type="button" className="scout-btn-cancel" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="scout-btn-submit">
                <span>Dispatch Scouting Inquiry</span>
                <SiteIcon name="arrow-up-right" size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
