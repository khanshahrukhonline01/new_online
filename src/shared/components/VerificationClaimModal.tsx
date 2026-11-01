import { useState, type FormEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { submitVerificationProof, type VerificationProofInput } from '../../integrations/supabase/public-client'
import './VerificationClaimModal.css'

export interface VerificationClaimModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: 'academy' | 'venue' | 'opportunity' | 'coach'
  entitySlug: string
  entityName: string
}

export default function VerificationClaimModal({
  isOpen,
  onClose,
  entityType,
  entitySlug,
  entityName,
}: VerificationClaimModalProps) {
  const [documentType, setDocumentType] = useState<VerificationProofInput['documentType']>(
    'affiliation_certificate'
  )
  const [proofDetails, setProofDetails] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!contactName.trim() || !contactPhone.trim() || !proofDetails.trim()) return

    setIsSubmitting(true)
    const result = await submitVerificationProof({
      entityType,
      entitySlug,
      entityName,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim() || undefined,
      documentType,
      proofDetails: proofDetails.trim(),
    })

    setIsSubmitting(false)
    setSubmitted(true)
    setFeedbackMessage(result.message)

    setTimeout(() => {
      setSubmitted(false)
      setProofDetails('')
      onClose()
    }, 3500)
  }

  return (
    <div className="claim-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="claim-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="claim-modal-header">
          <div className="claim-title-group">
            <span className="claim-title-badge">
              <SiteIcon name="shield-check" size={18} />
            </span>
            <div>
              <h2 id="claim-modal-title">Verify &amp; Authenticate Listing</h2>
              <p className="claim-subtitle">
                Official credential verification for: <strong>{entityName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="claim-close-btn"
            onClick={onClose}
            aria-label="Close verification modal"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="claim-success-state" role="status">
            <div className="claim-success-icon">
              <SiteIcon name="shield-check" size={44} />
            </div>
            <h3>Credentials Submitted for Verification!</h3>
            <p>{feedbackMessage}</p>
            <div className="claim-success-tip">
              <span>🏅 Once verified, your listing displays the verified partner badge and gains top SEO ranking across Indian sports queries.</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="claim-form">
            <div className="claim-info-notice">
              <SiteIcon name="info" size={16} />
              <span>
                To eliminate sports scams and protect Indian athletes, KhelGrid verifies every academy and playing facility against federation registers, ground lease deeds, or coaching certifications.
              </span>
            </div>

            <div className="claim-field-group">
              <label htmlFor="claim-doc-type" className="claim-label">
                Proof Document Category <span className="req">*</span>
              </label>
              <select
                id="claim-doc-type"
                className="claim-select"
                value={documentType}
                onChange={e => setDocumentType(e.target.value as VerificationProofInput['documentType'])}
              >
                <option value="affiliation_certificate">Federation / State Association Affiliation (AIFF, BAI, BCCI, etc.)</option>
                <option value="ground_lease">Ground Ownership / Commercial Lease / Municipal Allotment</option>
                <option value="coaching_license">Head Coach License (NIS Diploma, AFC/BWF Badge)</option>
                <option value="municipal_trade_license">Society Registration / GST / Trust Deed</option>
                <option value="geotagged_photos">Geotagged Facility Photographs / Entrance Signboard</option>
                <option value="other">Other Official Gazette or Documentation</option>
              </select>
            </div>

            <div className="claim-field-group">
              <label htmlFor="claim-proof-details" className="claim-label">
                Proof Details or Document Link (Google Drive / Cloud Link) <span className="req">*</span>
              </label>
              <textarea
                id="claim-proof-details"
                className="claim-textarea"
                rows={3}
                required
                placeholder="Provide registration number, Google Drive/Dropbox document link, or explain credentials for our sports desk to verify…"
                value={proofDetails}
                onChange={e => setProofDetails(e.target.value)}
              />
            </div>

            <div className="claim-row-2">
              <div className="claim-field-group">
                <label htmlFor="claim-name" className="claim-label">
                  Authorized Contact Name <span className="req">*</span>
                </label>
                <input
                  id="claim-name"
                  type="text"
                  className="claim-input"
                  required
                  placeholder="e.g. Coach Ramesh / Manager Priya"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                />
              </div>

              <div className="claim-field-group">
                <label htmlFor="claim-phone" className="claim-label">
                  Direct Mobile / WhatsApp <span className="req">*</span>
                </label>
                <input
                  id="claim-phone"
                  type="tel"
                  className="claim-input"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="claim-field-group">
              <label htmlFor="claim-email" className="claim-label">
                Official Organization Email (Optional)
              </label>
              <input
                id="claim-email"
                type="email"
                className="claim-input"
                placeholder="contact@academy.org"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
            </div>

            <div className="claim-actions-footer">
              <button
                type="button"
                className="claim-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="claim-btn-primary"
                disabled={isSubmitting || !contactName.trim() || !contactPhone.trim() || !proofDetails.trim()}
              >
                {isSubmitting ? 'Submitting Credentials…' : 'Submit for Verification'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
