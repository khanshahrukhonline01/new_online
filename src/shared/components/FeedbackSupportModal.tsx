import { useState, type FormEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import './FeedbackSupportModal.css'

interface FeedbackSupportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackSupportModal({ isOpen, onClose }: FeedbackSupportModalProps) {
  const [category, setCategory] = useState<'suggestion' | 'bug' | 'feature' | 'support'>('suggestion')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setEmail('')
      setMessage('')
      onClose()
    }, 2200)
  }

  return (
    <div className="feedback-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feedback-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="feedback-modal-header">
          <div className="feedback-title-group">
            <span className="feedback-title-badge">
              <SiteIcon name="message" size={16} />
            </span>
            <div>
              <h2 id="feedback-modal-title">Feedback &amp; Support</h2>
              <p>Help us improve KhelGrid for athletes and academies across India.</p>
            </div>
          </div>
          <button
            type="button"
            className="feedback-close-btn"
            onClick={onClose}
            aria-label="Close feedback modal"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="feedback-success-state">
            <span className="feedback-success-icon">
              <SiteIcon name="check-circle" size={32} />
            </span>
            <h3>Thank you for your feedback!</h3>
            <p>Our sports operations team reviews every suggestion. Keep playing hard!</p>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-form-group">
              <label htmlFor="feedback-category">Topic</label>
              <div className="feedback-topic-chips" role="radiogroup" aria-label="Feedback Topic">
                {[
                  { id: 'suggestion', label: 'Suggestion' },
                  { id: 'bug', label: 'Bug Report' },
                  { id: 'feature', label: 'New Feature' },
                  { id: 'support', label: 'Listing Help' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={category === item.id}
                    className={`topic-chip ${category === item.id ? 'active' : ''}`}
                    onClick={() => setCategory(item.id as typeof category)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-form-group">
              <label htmlFor="feedback-email">Your Email or WhatsApp (Optional)</label>
              <input
                id="feedback-email"
                type="text"
                placeholder="athlete@khelgrid.com or 98XXXXXXXX"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="feedback-input"
              />
            </div>

            <div className="feedback-form-group">
              <label htmlFor="feedback-message">Details / Message <span className="required">*</span></label>
              <textarea
                id="feedback-message"
                required
                rows={4}
                placeholder="Tell us what worked, what's broken, or what trial you want us to verify..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="feedback-textarea"
              />
            </div>

            <div className="feedback-actions">
              <button type="button" className="feedback-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="feedback-submit-btn">
                <span>Send Message</span>
                <SiteIcon name="arrow-right" size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
