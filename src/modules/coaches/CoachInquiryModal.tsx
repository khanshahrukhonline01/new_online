import { useState, useEffect, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  type VerifiedCoach,
  type CoachInquiryData,
} from './coachesData'
import { submitCoachInquiry } from '../../integrations/supabase/public-client'

export interface CoachInquiryModalProps {
  coach: VerifiedCoach | null
  isOpen: boolean
  onClose: () => void
}

export function CoachInquiryModal({ coach, isOpen, onClose }: CoachInquiryModalProps) {
  const [athleteName, setAthleteName] = useState('')
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ageCategory, setAgeCategory] = useState('U-16')
  const [skillLevel, setSkillLevel] = useState('Intermediate')
  const [objective, setObjective] = useState('Competitive Tournament & Trial Prep')
  const [preferredBatch, setPreferredBatch] = useState('Evening (4:30 PM – 7:00 PM)')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmedInquiry, setConfirmedInquiry] = useState<CoachInquiryData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset form when coach changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmedInquiry(null)
      setErrorMsg(null)
      setSubmitting(false)
    }
  }, [isOpen, coach])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !coach) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanPhone = phone.trim().replace(/[\s-]/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number for WhatsApp coordination.')
      return
    }

    if (!athleteName.trim()) {
      setErrorMsg('Please enter the athlete or student name.')
      return
    }

    setSubmitting(true)

    try {
      const res = await submitCoachInquiry({
        coachId: coach.id,
        coachSlug: coach.slug,
        coachName: coach.name,
        athleteName: athleteName.trim(),
        parentName: parentName.trim() || undefined,
        phone: cleanPhone,
        email: email.trim() || undefined,
        sport: coach.sport,
        trainingType: 'one_on_one',
        ageCategory,
        skillLevel,
        objective,
        preferredBatch,
        notes: notes.trim() || undefined,
      })

      const record: CoachInquiryData = {
        id: `inq-${Date.now()}`,
        coachId: coach.id,
        coachName: coach.name,
        athleteName: athleteName.trim(),
        parentName: parentName.trim() || undefined,
        phone: cleanPhone,
        email: email.trim() || undefined,
        ageCategory,
        skillLevel,
        objective,
        preferredBatch,
        notes: notes.trim() || undefined,
        submittedAt: res.submittedAt,
        referenceId: res.inquiryToken || res.referenceId,
      }

      setConfirmedInquiry(record)
    } catch {
      setErrorMsg('Failed to record inquiry. Please try again or contact KhelGrid directly.')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate WhatsApp Direct Pre-filled message
  const whatsappText = confirmedInquiry
    ? encodeURIComponent(
        `Hi ${coach.name},\nI am inquiring via KhelGrid regarding coaching for ${confirmedInquiry.athleteName} (${confirmedInquiry.ageCategory}, ${confirmedInquiry.skillLevel}).\nReference ID: ${confirmedInquiry.referenceId}\nObjective: ${confirmedInquiry.objective}\nPreferred Batch: ${confirmedInquiry.preferredBatch}\nPlease let me know your available slots.`
      )
    : ''

  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappText}`

  return (
    <div className="coach-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="coach-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-inquiry-title"
      >
        <button
          type="button"
          className="coach-modal-close"
          onClick={onClose}
          aria-label="Close inquiry dialog"
        >
          <SiteIcon name="close" size={18} />
        </button>

        {!confirmedInquiry ? (
          <div>
            <div className="coach-modal-header">
              <span className="coach-modal-tag">Direct Coach Inquiry · Verified Desk</span>
              <h2 id="coach-inquiry-title" className="coach-modal-title">
                Connect with {coach.name}
              </h2>
              <p className="coach-modal-sub">
                {coach.sport} Specialist · {coach.certification}
              </p>

              <div className="coach-modal-summary-strip">
                <div className="coach-summary-item">
                  <SiteIcon name="map-pin" size={13} />
                  <span>{coach.city}, {coach.state}</span>
                </div>
                <div className="coach-summary-item">
                  <SiteIcon name="wallet" size={13} />
                  <span>{coach.monthlyFee}</span>
                </div>
                <div className="coach-summary-item">
                  <SiteIcon name="award" size={13} />
                  <span>{coach.experienceYears}+ Yrs Exp</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="coach-modal-error" role="alert">
                <SiteIcon name="alert-circle" size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="coach-modal-form">
              <div className="coach-form-row">
                <div className="coach-form-field">
                  <label htmlFor="athlete-name">
                    Athlete / Student Name <span className="req">*</span>
                  </label>
                  <input
                    id="athlete-name"
                    type="text"
                    required
                    placeholder="e.g. Aryan Malhotra"
                    value={athleteName}
                    onChange={e => setAthleteName(e.target.value)}
                  />
                </div>

                <div className="coach-form-field">
                  <label htmlFor="parent-name">Parent / Guardian Name (if under 18)</label>
                  <input
                    id="parent-name"
                    type="text"
                    placeholder="e.g. Ramesh Malhotra"
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-form-row">
                <div className="coach-form-field">
                  <label htmlFor="coach-phone">
                    WhatsApp Contact Number <span className="req">*</span>
                  </label>
                  <input
                    id="coach-phone"
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                <div className="coach-form-field">
                  <label htmlFor="coach-email">Email Address (Optional)</label>
                  <input
                    id="coach-email"
                    type="email"
                    placeholder="e.g. contact@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-form-row">
                <div className="coach-form-field">
                  <label htmlFor="coach-age">Age Category</label>
                  <select
                    id="coach-age"
                    value={ageCategory}
                    onChange={e => setAgeCategory(e.target.value)}
                  >
                    <option value="U-10">U-10 (Junior Grassroots)</option>
                    <option value="U-12">U-12 Sub-Junior</option>
                    <option value="U-14">U-14 Cadet</option>
                    <option value="U-16">U-16 Youth</option>
                    <option value="U-19">U-19 Junior State</option>
                    <option value="Open">Senior / Open (19+ Years)</option>
                  </select>
                </div>

                <div className="coach-form-field">
                  <label htmlFor="coach-skill">Current Playing Level</label>
                  <select
                    id="coach-skill"
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value)}
                  >
                    <option value="Beginner">Beginner / Fundamentals</option>
                    <option value="Intermediate">Intermediate / Club Level</option>
                    <option value="District / State">District / State Contender</option>
                    <option value="Elite / National">Elite / National Squad</option>
                  </select>
                </div>
              </div>

              <div className="coach-form-row">
                <div className="coach-form-field">
                  <label htmlFor="coach-objective">Training Objective</label>
                  <select
                    id="coach-objective"
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                  >
                    <option value="Upcoming Selection Trials Prep">Upcoming Selection Trials Prep</option>
                    <option value="Monthly Academy Coaching & Matches">Monthly Academy Coaching &amp; Matches</option>
                    <option value="1-on-1 Technique & Biomechanics Correction">1-on-1 Technique &amp; Biomechanics Correction</option>
                    <option value="Strength, Speed & Aerobic Conditioning">Strength, Speed &amp; Aerobic Conditioning</option>
                    <option value="Holiday Intensive High-Performance Camp">Holiday Intensive High-Performance Camp</option>
                  </select>
                </div>

                <div className="coach-form-field">
                  <label htmlFor="coach-batch">Preferred Batch Timing</label>
                  <select
                    id="coach-batch"
                    value={preferredBatch}
                    onChange={e => setPreferredBatch(e.target.value)}
                  >
                    <option value="Morning (6:00 AM – 8:30 AM)">Morning (6:00 AM – 8:30 AM)</option>
                    <option value="Evening (4:30 PM – 7:00 PM)">Evening (4:30 PM – 7:00 PM)</option>
                    <option value="Weekend Intensive (Sat & Sun)">Weekend Intensive (Sat &amp; Sun)</option>
                    <option value="Flexible / 1-on-1 Slots">Flexible / 1-on-1 Slots</option>
                  </select>
                </div>
              </div>

              <div className="coach-form-field">
                <label htmlFor="coach-notes">Specific Goals or Questions for the Coach</label>
                <textarea
                  id="coach-notes"
                  rows={2}
                  placeholder="e.g. Looking to improve bowling seam position and increase speed for upcoming state trials. Please let me know if batch slots are open."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="coach-modal-actions">
                <button
                  type="button"
                  className="coach-btn-cancel"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="coach-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Inquiry...' : 'Submit Inquiry & Connect'}
                </button>
              </div>

              <p className="coach-modal-privacy-note">
                <SiteIcon name="shield-check" size={13} />
                <span>
                  Your contact information is confidential under the DPDP Act and shared exclusively with {coach.name}’s training desk.
                </span>
              </p>
            </form>
          </div>
        ) : (
          <div className="coach-modal-success">
            <div className="coach-success-icon">
              <SiteIcon name="check-circle" size={44} style={{ color: '#10b981' }} />
            </div>

            <h2 className="coach-success-title">Inquiry Submitted Successfully!</h2>
            <p className="coach-success-sub">
              Your inquiry has been logged with reference number:
            </p>

            <div className="coach-ref-badge">{confirmedInquiry.referenceId}</div>

            <div className="coach-success-card">
              <div className="coach-success-row">
                <span className="coach-success-k">Coach:</span>
                <span className="coach-success-v">{confirmedInquiry.coachName}</span>
              </div>
              <div className="coach-success-row">
                <span className="coach-success-k">Athlete:</span>
                <span className="coach-success-v">
                  {confirmedInquiry.athleteName} ({confirmedInquiry.ageCategory}, {confirmedInquiry.skillLevel})
                </span>
              </div>
              <div className="coach-success-row">
                <span className="coach-success-k">Objective:</span>
                <span className="coach-success-v">{confirmedInquiry.objective}</span>
              </div>
              <div className="coach-success-row">
                <span className="coach-success-k">Batch Timing:</span>
                <span className="coach-success-v">{confirmedInquiry.preferredBatch}</span>
              </div>
            </div>

            <div className="coach-success-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="coach-btn-whatsapp"
              >
                <SiteIcon name="message-circle" size={16} />
                <span>Message on WhatsApp Now</span>
              </a>

              <button
                type="button"
                className="coach-btn-done"
                onClick={onClose}
              >
                Done / Close
              </button>
            </div>

            <p className="coach-success-note">
              {coach.name}’s coaching desk or academy coordinator will typically reach out via WhatsApp or phone within 24 business hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CoachInquiryModal
