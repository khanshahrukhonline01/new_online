import { useState, type FormEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { submitListingReport } from '../../integrations/supabase/public-client'
import './ReportListingModal.css'

export interface ReportListingModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: 'academy' | 'venue' | 'opportunity' | 'coach'
  entitySlug: string
  entityName: string
}

export default function ReportListingModal({
  isOpen,
  onClose,
  entityType,
  entitySlug,
  entityName,
}: ReportListingModalProps) {
  const [reason, setReason] = useState<
    'fake_trial' | 'impersonation' | 'fake_venue' | 'unauthorized_fee' | 'wrong_contact' | 'other'
  >('unauthorized_fee')
  const [details, setDetails] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!details.trim()) return

    setIsSubmitting(true)
    const result = await submitListingReport({
      entityType,
      entitySlug,
      entityName,
      reason,
      details: details.trim(),
      reporterEmail: reporterEmail.trim() || undefined,
      reporterPhone: reporterPhone.trim() || undefined,
    })

    setIsSubmitting(false)
    setSubmitted(true)
    setFeedbackMessage(result.message)

    setTimeout(() => {
      setSubmitted(false)
      setDetails('')
      onClose()
    }, 3200)
  }

  return (
    <div className="report-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="report-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="report-modal-header">
          <div className="report-title-group">
            <span className="report-title-badge">
              <SiteIcon name="flag" size={18} />
            </span>
            <div>
              <h2 id="report-modal-title">Report Suspicious Listing or Potential Scam</h2>
              <p className="report-subtitle">
                Protecting athletes &amp; parents across India: <strong>{entityName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="report-close-btn"
            onClick={onClose}
            aria-label="Close report dialog"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="report-success-state" role="status">
            <div className="report-success-icon">
              <SiteIcon name="shield-check" size={44} />
            </div>
            <h3>Report Received by Trust &amp; Safety Desk</h3>
            <p>{feedbackMessage}</p>
            <div className="report-success-tip">
              <span>🛡️ Your report helps maintain an authentic, scam-free sports ecosystem for Indian youth.</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-form">
            <div className="report-field-group">
              <label className="report-label">Reason for Flagging</label>
              <div className="report-radio-list">
                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="unauthorized_fee"
                    checked={reason === 'unauthorized_fee'}
                    onChange={() => setReason('unauthorized_fee')}
                  />
                  <span>Demanding advance cash / unauthorized trial fees</span>
                </label>

                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="fake_trial"
                    checked={reason === 'fake_trial'}
                    onChange={() => setReason('fake_trial')}
                  />
                  <span>Fake selection trial or unauthorized tournament combine</span>
                </label>

                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="impersonation"
                    checked={reason === 'impersonation'}
                    onChange={() => setReason('impersonation')}
                  />
                  <span>Impersonating an official club, academy, or national coach</span>
                </label>

                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="fake_venue"
                    checked={reason === 'fake_venue'}
                    onChange={() => setReason('fake_venue')}
                  />
                  <span>Non-existent playing facility or fraudulent turf booking</span>
                </label>

                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="wrong_contact"
                    checked={reason === 'wrong_contact'}
                    onChange={() => setReason('wrong_contact')}
                  />
                  <span>Incorrect / invalid contact phone number or address</span>
                </label>

                <label className="report-radio-option">
                  <input
                    type="radio"
                    name="reason"
                    value="other"
                    checked={reason === 'other'}
                    onChange={() => setReason('other')}
                  />
                  <span>Other fraudulent activity / violation of trust</span>
                </label>
              </div>
            </div>

            <div className="report-field-group">
              <label htmlFor="report-details" className="report-label">
                Evidence &amp; Description <span className="req">*</span>
              </label>
              <textarea
                id="report-details"
                className="report-textarea"
                rows={3}
                required
                placeholder="Please describe what happened (e.g. asked for ₹2,000 UPI transfer, phone number switched off, ground does not exist)…"
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
            </div>

            <div className="report-row-2">
              <div className="report-field-group">
                <label htmlFor="report-email" className="report-label">
                  Your Email (Optional)
                </label>
                <input
                  id="report-email"
                  type="email"
                  className="report-input"
                  placeholder="name@example.com"
                  value={reporterEmail}
                  onChange={e => setReporterEmail(e.target.value)}
                />
              </div>

              <div className="report-field-group">
                <label htmlFor="report-phone" className="report-label">
                  Your Mobile (Optional)
                </label>
                <input
                  id="report-phone"
                  type="tel"
                  className="report-input"
                  placeholder="+91 98765 43210"
                  value={reporterPhone}
                  onChange={e => setReporterPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="report-actions-footer">
              <button
                type="button"
                className="report-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="report-btn-primary"
                disabled={isSubmitting || !details.trim()}
              >
                {isSubmitting ? 'Submitting Flag…' : 'Submit Safety Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
