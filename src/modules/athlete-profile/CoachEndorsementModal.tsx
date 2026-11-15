import { useState } from 'react'
import type { AthleteProfile } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { saveCoachEndorsement } from '../../integrations/supabase/athlete-profile-client'
import './CoachEndorsementModal.css'

export interface CoachEndorsementModalProps {
  profile: AthleteProfile
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updated: AthleteProfile) => void
}

const COMMON_COACH_LICENSES = [
  'NIS Patiala Senior Diploma',
  'BCCI Level 2 Coach',
  'BCCI Level 1 Coach',
  'AIFF A-Diploma',
  'AIFF B-Diploma',
  'AIFF C-Diploma',
  'BAI Certified Senior Coach',
  'AFI Senior Athletics Coach',
  'SAI High Performance Coach',
  'State Sports Directorate Coach',
  'Other Federation Certified Coach',
]

export function CoachEndorsementModal({
  profile,
  isOpen,
  onClose,
  onSuccess,
}: CoachEndorsementModalProps) {
  const [coachName, setCoachName] = useState('')
  const [coachLicense, setCoachLicense] = useState(COMMON_COACH_LICENSES[0])
  const [customLicense, setCustomLicense] = useState('')
  const [coachDesignation, setCoachDesignation] = useState('Head Coach')
  const [organizationOrAcademy, setOrganizationOrAcademy] = useState(profile.teamOrAcademy || '')
  const [endorsementStatement, setEndorsementStatement] = useState(
    `I have supervised ${profile.fullName}'s competitive training and physically observed their physical combine metrics and match performances. I officially endorse this candidate for national/state trials and academy selection.`,
  )
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const endorsementInviteUrl = `${origin}/sports-cv/${profile.username}?endorse=1`
  const whatsappInviteText = `Namaste Coach,\n\nPlease review and officially endorse my KhelGrid Sports CV & combine benchmarks for upcoming selection trials:\n${endorsementInviteUrl}`
  const whatsappInviteUrl = `https://wa.me/?text=${encodeURIComponent(whatsappInviteText)}`

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(endorsementInviteUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (coachName.trim().length < 2) {
      setErrorMsg('Please enter the endorsing coach full name.')
      return
    }

    const resolvedLicense =
      coachLicense === 'Other Federation Certified Coach' && customLicense.trim()
        ? customLicense.trim()
        : coachLicense

    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await saveCoachEndorsement({
        username: profile.username,
        coachName: coachName.trim(),
        coachLicense: resolvedLicense,
        coachDesignation: coachDesignation.trim(),
        organizationOrAcademy: organizationOrAcademy.trim(),
        endorsementStatement: endorsementStatement.trim(),
      })

      if (onSuccess) onSuccess(res.profile)
      onClose()
    } catch {
      setErrorMsg('Could not register coach endorsement. Please check connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="coach-endorsement-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="endorsement-modal-title"
    >
      <div className="coach-endorsement-modal" onClick={e => e.stopPropagation()}>
        <div className="endorsement-modal-header">
          <div>
            <div className="endorsement-eyebrow">
              <SiteIcon name="award" size={14} />
              <span>NIS &amp; FEDERATION ACCREDITATION RELAY</span>
            </div>
            <h3 id="endorsement-modal-title">Coach &amp; Selector Endorsement</h3>
            <span className="endorsement-athlete-name">Candidate: {profile.fullName} ({profile.sport})</span>
          </div>
          <button
            type="button"
            className="endorsement-modal-close"
            onClick={onClose}
            aria-label="Close endorsement dialog"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        <div className="endorsement-modal-body">
          {/* Athlete WhatsApp Invite Tray */}
          <div className="endorsement-invite-box">
            <h4>
              <SiteIcon name="share" size={14} /> Send Endorsement Request to Coach
            </h4>
            <p>
              Athletes: Share this link with your NIS, BCCI, AIFF, or Academy coach via WhatsApp. Once endorsed, your
              CV receives a verified gold badge.
            </p>
            <div className="invite-actions-row">
              <a
                href={whatsappInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-invite"
              >
                <SiteIcon name="share" size={14} /> Send via WhatsApp
              </a>
              <button
                type="button"
                className="btn-copy-invite"
                onClick={handleCopyLink}
              >
                {copiedLink ? '✓ Link Copied!' : 'Copy Coach Invite Link'}
              </button>
            </div>
          </div>

          <div className="endorsement-divider">
            <span>OR COACH CAN SIGN OFF BELOW</span>
          </div>

          {/* Coach Signature Form */}
          <form onSubmit={handleSubmit} className="endorsement-form">
            {errorMsg && <div className="endorsement-error-banner">{errorMsg}</div>}

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="coach-name">Coach Full Name *</label>
                <input
                  id="coach-name"
                  type="text"
                  placeholder="e.g. Coach Zaheer Farooq"
                  value={coachName}
                  onChange={e => setCoachName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="coach-license">License / Accreditation *</label>
                <select
                  id="coach-license"
                  value={coachLicense}
                  onChange={e => setCoachLicense(e.target.value)}
                >
                  {COMMON_COACH_LICENSES.map(lic => (
                    <option key={lic} value={lic}>
                      {lic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {coachLicense === 'Other Federation Certified Coach' && (
              <div className="form-group">
                <label htmlFor="custom-license">Specify Federation / Board Credential</label>
                <input
                  id="custom-license"
                  type="text"
                  placeholder="e.g. World Athletics Level 2 / SAI Coach"
                  value={customLicense}
                  onChange={e => setCustomLicense(e.target.value)}
                />
              </div>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="coach-designation">Designation / Role</label>
                <input
                  id="coach-designation"
                  type="text"
                  placeholder="e.g. Head Pace Bowling Coach"
                  value={coachDesignation}
                  onChange={e => setCoachDesignation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="coach-org">Academy / Club / District Board</label>
                <input
                  id="coach-org"
                  type="text"
                  placeholder="e.g. Sonnet Cricket Club / Delhi State"
                  value={organizationOrAcademy}
                  onChange={e => setOrganizationOrAcademy(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="endorsement-statement">Official Recommendation Statement</label>
              <textarea
                id="endorsement-statement"
                rows={3}
                value={endorsementStatement}
                onChange={e => setEndorsementStatement(e.target.value)}
              />
            </div>

            <div className="endorsement-footer">
              <button type="button" className="btn-endorse-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-endorse-submit" disabled={submitting}>
                <SiteIcon name="award" size={16} />
                <span>{submitting ? 'Registering Endorsement...' : 'Sign & Endorse Candidate'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
