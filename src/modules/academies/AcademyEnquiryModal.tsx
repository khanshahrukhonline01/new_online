import { useState, useEffect, type MouseEvent } from 'react'
import type { Academy } from '../../shared/domain'
import type { CuratedAcademy } from '../../shared/data/curatedEntitiesData'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import {
  getAthleteProfile,
  submitAcademyEnquiry,
  type AcademyEnquiry,
} from '../../integrations/supabase/athlete-profile-client'
import type { AthleteProfile } from '../../shared/domain'
import './AcademyEnquiryModal.css'

export interface AcademyEnquiryModalProps {
  academy: Academy | CuratedAcademy
  onClose: () => void
  onSuccess?: (enquiry: AcademyEnquiry) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function AcademyEnquiryModal({
  academy,
  onClose,
  onSuccess,
  onNavigate,
}: AcademyEnquiryModalProps) {
  const authUser = getStoredAuthUser()
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [fullName, setFullName] = useState(authUser?.fullName || authUser?.name || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(authUser?.email || '')
  const [position, setPosition] = useState('')
  const [ageCategory, setAgeCategory] = useState<string>('Under-14 Sub-Junior')
  const [requestType, setRequestType] = useState<'free_trial' | 'regular_admission' | 'scholarship_assessment'>('free_trial')
  const [batchType, setBatchType] = useState<'weekend' | 'weekday' | 'evening_elite' | 'morning_grassroots'>('weekend')
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced_elite'>('intermediate')
  const [statement, setStatement] = useState(
    'Enthusiastic athlete applying for academy admission and trial evaluation with verified KhelGrid profile and physical metrics.',
  )
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmedEnquiry, setConfirmedEnquiry] = useState<AcademyEnquiry | null>(null)

  const curated = academy as Partial<CuratedAcademy>
  const sportName = curated.sport || 'Sports'

  useEffect(() => {
    let active = true
    const handle = (authUser?.fullName || authUser?.name || 'athlete').toLowerCase().replace(/[^a-z0-9]/g, '')
    void getAthleteProfile(handle).then(p => {
      if (!active) return
      if (p) {
        setProfile(p)
        if (!fullName && p.fullName) setFullName(p.fullName)
        if (p.playingPosition) setPosition(p.playingPosition)
      }
    })
    return () => {
      active = false
    }
  }, [authUser, fullName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter applicant or candidate full name.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for trial slot scheduling.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await submitAcademyEnquiry({
        academySlug: academy.slug,
        academyName: academy.name,
        sport: sportName,
        city: academy.city,
        state: academy.state || undefined,
        batchType,
        skillLevel,
        requestType,
        athleteName: fullName,
        athletePhone: phone,
        athleteEmail: email || undefined,
        ageCategory,
        playingPosition: position || profile?.playingPosition || undefined,
        fitnessBenchmarks: profile?.fitnessBenchmarks || undefined,
        statement,
      })

      setConfirmedEnquiry(res.enquiry)
      if (onSuccess) onSuccess(res.enquiry)
    } catch {
      setErrorMsg('Failed to submit admission enquiry. Please verify your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDashboardLink = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      onNavigate(e, '/dashboard')
    }
    onClose()
  }

  return (
    <div
      className="academy-enquiry-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="academy-enquiry-title"
    >
      <div className="academy-enquiry-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="academy-enquiry-header">
          <div>
            <div className="academy-enquiry-eyebrow">
              <SiteIcon name="award" size={13} />
              <span>Official Academy Admission &amp; Trial Desk</span>
            </div>
            <h3 id="academy-enquiry-title">
              {confirmedEnquiry ? 'Admission Request Transmitted!' : `Enrol at ${academy.name}`}
            </h3>
          </div>
          <button
            type="button"
            className="academy-enquiry-close"
            onClick={onClose}
            aria-label="Close enrolment dialogue"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {confirmedEnquiry ? (
          <div className="academy-enquiry-body">
            <div className="academy-enquiry-success">
              <div className="success-check-badge">
                <SiteIcon name="badge-check" size={34} />
              </div>
              <h4>Application &amp; Sports CV Transmitted</h4>
              <p>
                Your admission enquiry and trial request have been officially registered with{' '}
                <strong>{academy.name}</strong> ({academy.city}).
              </p>

              <div className="enquiry-token-badge">
                <span>Admission Inquiry Token: </span>
                <strong>{confirmedEnquiry.enquiryToken}</strong>
              </div>

              <div className="enquiry-summary-grid">
                <div className="summary-pill">
                  <span>Program:</span>
                  <strong>
                    {confirmedEnquiry.requestType === 'free_trial'
                      ? 'Free Trial Session'
                      : confirmedEnquiry.requestType === 'scholarship_assessment'
                      ? 'Scholarship Assessment'
                      : 'Regular Admission'}
                  </strong>
                </div>
                <div className="summary-pill">
                  <span>Batch:</span>
                  <strong>{confirmedEnquiry.batchLabel}</strong>
                </div>
                <div className="summary-pill">
                  <span>Candidate:</span>
                  <strong>{confirmedEnquiry.athleteName}</strong>
                </div>
                <div className="summary-pill">
                  <span>Contact:</span>
                  <strong>{confirmedEnquiry.athletePhone}</strong>
                </div>
              </div>

              <p className="enquiry-followup-text">
                The academy coaching director will contact you via WhatsApp or phone call within 24 hours to schedule
                your on-ground batch induction. Please bring appropriate sporting kit and valid age proof.
              </p>
            </div>

            <div className="academy-enquiry-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button type="button" className="enquiry-btn secondary" onClick={onClose}>
                Done
              </button>
              <a
                href="/dashboard"
                onClick={handleDashboardLink}
                className="enquiry-btn primary"
              >
                View in My Dashboard &rarr;
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="academy-enquiry-form">
            <div className="academy-enquiry-body">
              {/* Academy Context Snapshot */}
              <div className="academy-context-strip">
                <div className="context-item">
                  <SiteIcon name="sports" size={14} />
                  <span>{sportName}</span>
                </div>
                <div className="context-item">
                  <SiteIcon name="map-pin" size={14} />
                  <span>{academy.city}{academy.state ? `, ${academy.state}` : ''}</span>
                </div>
                {curated.head_coach && (
                  <div className="context-item">
                    <SiteIcon name="award" size={14} />
                    <span>Coach: {curated.head_coach}</span>
                  </div>
                )}
                <div className="context-item fee-highlight">
                  <SiteIcon name="shield-check" size={14} />
                  <span>{curated.fee_structure || 'Zero Platform Surcharge'}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="academy-enquiry-error" role="alert">
                  <SiteIcon name="alert-triangle" size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Request Program Type */}
              <div className="form-group">
                <label className="form-label">Select Program / Trial Option</label>
                <div className="choice-pills-row">
                  <button
                    type="button"
                    className={`choice-pill ${requestType === 'free_trial' ? 'is-selected' : ''}`}
                    onClick={() => setRequestType('free_trial')}
                  >
                    <span className="pill-title">⚡ Free Trial Class</span>
                    <span className="pill-sub">1 complimentary evaluation session</span>
                  </button>
                  <button
                    type="button"
                    className={`choice-pill ${requestType === 'regular_admission' ? 'is-selected' : ''}`}
                    onClick={() => setRequestType('regular_admission')}
                  >
                    <span className="pill-title">🎯 Regular Admission</span>
                    <span className="pill-sub">Monthly / Term training batch</span>
                  </button>
                  <button
                    type="button"
                    className={`choice-pill ${requestType === 'scholarship_assessment' ? 'is-selected' : ''}`}
                    onClick={() => setRequestType('scholarship_assessment')}
                  >
                    <span className="pill-title">🏅 Scholarship Test</span>
                    <span className="pill-sub">Merit fee fee concession evaluation</span>
                  </button>
                </div>
              </div>

              {/* 2. Batch Schedule */}
              <div className="form-group">
                <label className="form-label">Preferred Training Batch</label>
                <div className="choice-pills-row">
                  <button
                    type="button"
                    className={`choice-pill ${batchType === 'weekend' ? 'is-selected' : ''}`}
                    onClick={() => setBatchType('weekend')}
                  >
                    <span className="pill-title">📅 Weekend Development</span>
                    <span className="pill-sub">Sat &amp; Sun (Morning / Evening)</span>
                  </button>
                  <button
                    type="button"
                    className={`choice-pill ${batchType === 'weekday' ? 'is-selected' : ''}`}
                    onClick={() => setBatchType('weekday')}
                  >
                    <span className="pill-title">🏃 Weekday Intensive</span>
                    <span className="pill-sub">Tue to Fri (4:30 PM - 7:00 PM)</span>
                  </button>
                  <button
                    type="button"
                    className={`choice-pill ${batchType === 'evening_elite' ? 'is-selected' : ''}`}
                    onClick={() => setBatchType('evening_elite')}
                  >
                    <span className="pill-title">🏆 Elite High-Performance</span>
                    <span className="pill-sub">Mon to Fri specialized tactical drills</span>
                  </button>
                  <button
                    type="button"
                    className={`choice-pill ${batchType === 'morning_grassroots' ? 'is-selected' : ''}`}
                    onClick={() => setBatchType('morning_grassroots')}
                  >
                    <span className="pill-title">🌱 Morning Grassroots</span>
                    <span className="pill-sub">Tue-Sat 6:00 AM - 8:30 AM</span>
                  </button>
                </div>
              </div>

              {/* 3. Skill Tier & Age Group */}
              <div className="form-row-two">
                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-skill">Skill Level</label>
                  <select
                    id="enrol-skill"
                    className="form-select"
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced_elite')}
                  >
                    <option value="beginner">Beginner (Grassroots &amp; Fundamentals)</option>
                    <option value="intermediate">Intermediate (School / Club Level)</option>
                    <option value="advanced_elite">Advanced Elite (State / National Aspirant)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-age">Age Category</label>
                  <select
                    id="enrol-age"
                    className="form-select"
                    value={ageCategory}
                    onChange={e => setAgeCategory(e.target.value)}
                  >
                    <option value="Under-10 Grassroots">Under-10 Grassroots</option>
                    <option value="Under-14 Sub-Junior">Under-14 Sub-Junior</option>
                    <option value="Under-17 Junior">Under-17 Junior</option>
                    <option value="Under-19 Senior Junior">Under-19 Senior Junior</option>
                    <option value="Open Senior">Open Senior (19+)</option>
                  </select>
                </div>
              </div>

              {/* 4. Candidate Contacts */}
              <div className="form-row-two">
                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-fullname">Candidate / Trainee Full Name *</label>
                  <input
                    id="enrol-fullname"
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Vihaan Sen"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-phone">Mobile Phone (WhatsApp Active) *</label>
                  <input
                    id="enrol-phone"
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-email">Email Address</label>
                  <input
                    id="enrol-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. athlete@domain.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="enrol-pos">Playing Position / Discipline</label>
                  <input
                    id="enrol-pos"
                    type="text"
                    className="form-input"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    placeholder="e.g. Striker / Batsman / Point Guard"
                  />
                </div>
              </div>

              {/* 5. Physical Combine & Sports CV Sync */}
              <div className="sports-cv-sync-card">
                <div className="sync-header">
                  <SiteIcon name="sports-cv" size={15} />
                  <span>Verified Sports CV &amp; Combine Profile Attached</span>
                </div>
                {profile?.fitnessBenchmarks?.percentileAvg ? (
                  <div className="benchmarks-preview-row">
                    <div className="benchmark-tag">
                      <span>Tested Combine:</span>
                      <strong>{profile.fitnessBenchmarks.percentileAvg}th %ile ({profile.fitnessBenchmarks.tier})</strong>
                    </div>
                    {profile.fitnessBenchmarks.yoyoIr1Meters && (
                      <div className="benchmark-tag">
                        <span>Yo-Yo IR1:</span>
                        <strong>{profile.fitnessBenchmarks.yoyoIr1Meters}m</strong>
                      </div>
                    )}
                    {profile.fitnessBenchmarks.sprint30mSeconds && (
                      <div className="benchmark-tag">
                        <span>30m Sprint:</span>
                        <strong>{profile.fitnessBenchmarks.sprint30mSeconds}s</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="sync-note">
                    Your official KhelGrid Player Profile will be attached to this admission dossier. Coaching staff can review your background and developmental stats directly.
                  </p>
                )}
              </div>

              {/* 6. Statement to Coach */}
              <div className="form-group">
                <label className="form-label" htmlFor="enrol-statement">
                  Training Goals / Note to Coaching Staff
                </label>
                <textarea
                  id="enrol-statement"
                  className="form-textarea"
                  rows={2}
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  placeholder="Mention previous tournaments, specific training objectives, or coaching expectations…"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="academy-enquiry-footer">
              <button type="button" className="enquiry-btn secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="enquiry-btn primary" disabled={submitting}>
                {submitting ? (
                  <span>Transmitting Dossier…</span>
                ) : (
                  <>
                    <SiteIcon name="award" size={15} />
                    <span>Submit Admission &amp; Trial Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
export default AcademyEnquiryModal
