import { useState, useEffect, type MouseEvent } from 'react'
import type { Opportunity, AthleteProfile } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import {
  getAthleteProfile,
  submitTrialApplication,
  type TrialApplication,
} from '../../integrations/supabase/athlete-profile-client'
import './TrialApplicationModal.css'

export interface TrialApplicationModalProps {
  opportunity: Opportunity
  onClose: () => void
  onSuccess?: (application: TrialApplication) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function TrialApplicationModal({
  opportunity,
  onClose,
  onSuccess,
  onNavigate,
}: TrialApplicationModalProps) {
  const authUser = getStoredAuthUser()
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [fullName, setFullName] = useState(authUser?.fullName || authUser?.name || '')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [statement, setStatement] = useState(
    'Passionate athlete registered on KhelGrid applying with verified physical combine test benchmarks and game footage highlights.',
  )
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmedApp, setConfirmedApp] = useState<TrialApplication | null>(null)

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
      setErrorMsg('Please enter candidate full name.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for trial communications.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await submitTrialApplication({
        trialSlug: opportunity.slug,
        trialTitle: opportunity.title,
        sport: typeof opportunity.sport === 'string' ? opportunity.sport : opportunity.sport?.name || 'Athletics',
        city: opportunity.city || 'India',
        venueName: opportunity.venue_name || undefined,
        startsAt: opportunity.starts_at || undefined,
        deadlineDate: opportunity.application_deadline || undefined,
        organizerName: opportunity.organizer_name || undefined,
        athleteName: fullName,
        athletePhone: phone,
        athleteEmail: authUser?.email || undefined,
        ageCategory: opportunity.age_category || undefined,
        playingPosition: position || profile?.playingPosition || undefined,
        summary: profile?.summary || undefined,
        fitnessBenchmarks: profile?.fitnessBenchmarks || undefined,
        videoClipsCount: profile?.videoClips?.length || 0,
        statement,
      })

      setConfirmedApp(res.application)
      if (onSuccess) onSuccess(res.application)
    } catch {
      setErrorMsg('Failed to transmit application. Please check your network connection.')
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
    <div className="trial-app-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="trial-app-title">
      <div className="trial-app-modal" onClick={e => e.stopPropagation()}>
        <div className="trial-app-header">
          <div>
            <div className="trial-app-eyebrow">
              <SiteIcon name="sports-cv" size={13} />
              <span>Official Selection Trial Registration</span>
            </div>
            <h3 id="trial-app-title">{confirmedApp ? 'Application Transmitted!' : opportunity.title}</h3>
          </div>
          <button type="button" className="trial-app-close" onClick={onClose} aria-label="Close application dialog">
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {confirmedApp ? (
          <div className="trial-app-body">
            <div className="trial-app-success">
              <div className="success-check-icon">
                <SiteIcon name="badge-check" size={32} />
              </div>
              <h4>Application &amp; Sports CV Transmitted</h4>
              <p>
                Your candidate profile, combine metrics, and contact dossier have been registered with{' '}
                <strong>{opportunity.organizer_name || 'the Selection Committee'}</strong>.
              </p>
              <div className="application-ref-badge">
                <span>Application Reference ID: </span>
                <strong>{confirmedApp.applicationRef}</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Please bring official age verification ID (Aadhaar / Passport / Birth Certificate) and appropriate sporting attire to the combine venue.
              </p>
            </div>
            <div className="trial-app-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <a
                href="/dashboard"
                onClick={handleDashboardLink}
                className="btn-trial-submit"
                style={{ textDecoration: 'none' }}
              >
                <SiteIcon name="chart" size={16} />
                <span>Track on My Dashboard</span>
              </a>
              <button type="button" className="btn-trial-cancel" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="trial-app-body">
              {/* Trial Snapshot */}
              <div className="trial-snapshot-card">
                <div className="trial-snapshot-meta">
                  <span>
                    <SiteIcon name="map-pin" size={14} /> {opportunity.city}
                    {opportunity.venue_name ? ` · ${opportunity.venue_name}` : ''}
                  </span>
                  {opportunity.starts_at && (
                    <span>
                      <SiteIcon name="calendar" size={14} /> Trial Date: {new Date(opportunity.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {opportunity.age_category && (
                    <span>
                      <SiteIcon name="award" size={14} /> Age: {opportunity.age_category}
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Sports CV Preview */}
              <div className="athlete-cv-preview">
                <div className="athlete-cv-preview-header">
                  <span className="cv-badge-title">
                    <SiteIcon name="badge-check" size={16} /> Verified Sports CV Dossier
                  </span>
                  {profile?.fitnessBenchmarks?.percentileAvg ? (
                    <span className="cv-percentile-pill">
                      {profile.fitnessBenchmarks.percentileAvg}th %ile · {profile.fitnessBenchmarks.tier}
                    </span>
                  ) : null}
                </div>

                {profile?.fitnessBenchmarks ? (
                  <div className="athlete-metrics-row">
                    <div className="metric-mini-box">
                      <span className="metric-mini-label">Yo-Yo IR1</span>
                      <span className="metric-mini-value">{profile.fitnessBenchmarks.yoyoIr1Meters} m</span>
                    </div>
                    <div className="metric-mini-box">
                      <span className="metric-mini-label">30m Sprint</span>
                      <span className="metric-mini-value">{profile.fitnessBenchmarks.sprint30mSeconds} s</span>
                    </div>
                    <div className="metric-mini-box">
                      <span className="metric-mini-label">CMJ Jump</span>
                      <span className="metric-mini-value">{profile.fitnessBenchmarks.cmjHeightCm} cm</span>
                    </div>
                  </div>
                ) : (
                  <div className="cv-untested-notice">
                    <SiteIcon name="info" size={14} />
                    <span>
                      Physical combine benchmarks not yet tested.{' '}
                      <a href="/talent-scanner" onClick={e => onNavigate?.(e, '/talent-scanner')}>
                        Test on Talent Scanner
                      </a>{' '}
                      to boost selector ranking.
                    </span>
                  </div>
                )}

                {profile?.videoClips && profile.videoClips.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SiteIcon name="camera" size={13} />
                    <span>{profile.videoClips.length} highlight clips attached from verified Sports CV</span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  {errorMsg}
                </div>
              )}

              {/* Form Input Fields */}
              <div className="trial-app-field">
                <label htmlFor="candidate-name">Full Candidate Name</label>
                <input
                  id="candidate-name"
                  type="text"
                  className="trial-app-input"
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="trial-app-field">
                <label htmlFor="candidate-phone">Contact Mobile Number (SMS &amp; Call Alert)</label>
                <input
                  id="candidate-phone"
                  type="tel"
                  className="trial-app-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="trial-app-field">
                <label htmlFor="candidate-position">Preferred Playing Position / Event</label>
                <input
                  id="candidate-position"
                  type="text"
                  className="trial-app-input"
                  placeholder="e.g. Center Midfielder / Fast Bowler"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                />
              </div>

              <div className="trial-app-field">
                <label htmlFor="candidate-statement">Statement to Trial Selectors</label>
                <textarea
                  id="candidate-statement"
                  className="trial-app-textarea"
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  placeholder="Highlight key achievements, previous academies, and fitness strengths..."
                />
              </div>
            </div>

            <div className="trial-app-footer">
              <button type="button" className="btn-trial-cancel" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-trial-submit" disabled={submitting}>
                <SiteIcon name="badge-check" size={16} />
                <span>{submitting ? 'Transmitting Dossier...' : 'Submit Sports CV & Register'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
