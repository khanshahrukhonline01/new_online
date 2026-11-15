import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import type { AthleteProfile, VideoClip } from '../../shared/domain'
import {
  publishAthleteProfile,
  normalizeUsername,
  getAthleteProfileByUsername,
} from '../../integrations/supabase/athlete-profile-client'
import {
  getStoredUser,
  getStoredAuthUser,
  onAuthChange,
  type KhelGridUser,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import { PlayerCard } from '../athlete-profile/PlayerCard'
import { generateKhelId, computeFitnessTier } from '../../shared/utils/khelId'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import './sports-cv.css'

export type Achievement = { year: string; event: string; result: string }

export type Cv = {
  username: string
  fullName: string
  sport: string
  city: string
  state: string
  dateOfBirth: string
  email: string
  phone: string
  playingPosition: string
  teamOrAcademy: string
  coach: string
  experience: string
  primaryFootOrHand: string
  heightCm: string
  weightKg: string
  bloodGroup: string
  schoolOrCollege: string
  federationUid: string
  guardianName: string
  guardianRelation: string
  guardianPhone: string
  goals: string
  achievements: Achievement[]
  videoClips: VideoClip[]
  fitnessBenchmarks: {
    yoyoIr1Meters?: number
    sprint30mSeconds?: number
    cmjHeightCm?: number
    tier?: string
    percentileAvg?: number
  }
}

const DRAFT_STORAGE_KEY = 'khelgrid_cv_draft_v2'

const initialCv: Cv = {
  username: '',
  fullName: '',
  sport: '',
  city: '',
  state: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  playingPosition: '',
  teamOrAcademy: '',
  coach: '',
  experience: '',
  primaryFootOrHand: '',
  heightCm: '',
  weightKg: '',
  bloodGroup: '',
  schoolOrCollege: '',
  federationUid: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  goals: '',
  achievements: [{ year: '', event: '', result: '' }],
  videoClips: [],
  fitnessBenchmarks: {},
}

export default function SportsCvWizard() {
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | KhelGridUser | null>(
    () => getStoredAuthUser() || getStoredUser()
  )
  const [cv, setCv] = useState<Cv>(initialCv)
  const [draftRestored, setDraftRestored] = useState(false)
  const [savedForPrint, setSavedForPrint] = useState(false)
  const [publishedProfile, setPublishedProfile] = useState<AthleteProfile | null>(null)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasExistingProfile, setHasExistingProfile] = useState(false)

  // Pillar 4: Local-First Draft Auto-Save & Recovery on Mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Cv>
        if (parsed.fullName || parsed.sport || parsed.phone) {
          setCv(prev => ({
            ...prev,
            ...parsed,
            fitnessBenchmarks: parsed.fitnessBenchmarks || prev.fitnessBenchmarks,
            achievements:
              parsed.achievements && parsed.achievements.length > 0
                ? parsed.achievements
                : prev.achievements,
            videoClips: parsed.videoClips || prev.videoClips,
          }))
          setDraftRestored(true)
        }
      }
    } catch {
      // Ignore corrupt local storage
    }
  }, [])

  // Pillar 4: Debounced auto-save to localStorage on every input
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (cv.fullName || cv.sport || cv.city || cv.phone) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(cv))
        }
      } catch {
        // Ignore quota limits
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [cv])

  useEffect(() => {
    return onAuthChange(u => {
      if (u) setCurrentUser(u)
    })
  }, [])

  // Auto-sync with authenticated athlete profile
  useEffect(() => {
    if (currentUser) {
      const rawName = currentUser.fullName || currentUser.name || ''
      const email = currentUser.email || ''
      const phone = currentUser.phone || ''
      const city = 'city' in currentUser ? (currentUser.city || '') : ''
      const preferredSports = 'preferredSports' in currentUser ? currentUser.preferredSports : undefined
      const defaultSport = Array.isArray(preferredSports) && preferredSports[0] ? preferredSports[0] : ''

      setCv(prev => ({
        ...prev,
        fullName: prev.fullName || rawName,
        email: prev.email || email,
        phone: prev.phone || phone,
        city: prev.city || city,
        sport: prev.sport || defaultSport,
        username: prev.username || (rawName ? normalizeUsername(rawName) : ''),
      }))

      if (rawName) {
        const handle = normalizeUsername(rawName)
        void getAthleteProfileByUsername(handle).then((existing: AthleteProfile | null) => {
          if (existing) {
            setPublishedProfile(existing)
            setHasExistingProfile(true)
          }
        })
      }
    }
  }, [currentUser])

  const handleLoadExistingProfile = () => {
    if (!publishedProfile) return
    setCv({
      username: publishedProfile.username,
      fullName: publishedProfile.fullName,
      sport: publishedProfile.sport,
      city: publishedProfile.city,
      state: publishedProfile.state || '',
      dateOfBirth: publishedProfile.dateOfBirth || '',
      email: publishedProfile.email || '',
      phone: publishedProfile.phone || '',
      playingPosition: publishedProfile.playingPosition || '',
      teamOrAcademy: publishedProfile.teamOrAcademy || '',
      coach: publishedProfile.coach || '',
      experience: publishedProfile.experienceYears || '',
      primaryFootOrHand: publishedProfile.primaryFootOrHand || '',
      heightCm: publishedProfile.heightCm ? String(publishedProfile.heightCm) : '',
      weightKg: publishedProfile.weightKg ? String(publishedProfile.weightKg) : '',
      bloodGroup: publishedProfile.bloodGroup || '',
      schoolOrCollege: publishedProfile.schoolOrCollege || '',
      federationUid: publishedProfile.federationUid || '',
      guardianName: publishedProfile.guardianName || '',
      guardianRelation: publishedProfile.guardianRelation || '',
      guardianPhone: publishedProfile.guardianPhone || '',
      goals: publishedProfile.summary || '',
      achievements:
        publishedProfile.achievements && publishedProfile.achievements.length > 0
          ? publishedProfile.achievements
          : [{ year: '', event: '', result: '' }],
      videoClips: publishedProfile.videoClips || [],
      fitnessBenchmarks: publishedProfile.fitnessBenchmarks || {},
    })
    setPublishMessage(`Loaded profile for @${publishedProfile.username}. You can make edits and re-publish.`)
  }

  const update = (field: keyof Omit<Cv, 'achievements' | 'videoClips' | 'fitnessBenchmarks'>, value: string) => {
    setCv(current => ({ ...current, [field]: value }))
    setSavedForPrint(false)
    setPublishMessage(null)
  }

  const updateAchievement = (index: number, field: keyof Achievement, value: string) => {
    setCv(current => ({
      ...current,
      achievements: current.achievements.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
    setSavedForPrint(false)
  }

  // Interactive combine benchmark updates (Pillar 2)
  const updateFitnessBenchmark = (field: 'yoyoIr1Meters' | 'sprint30mSeconds' | 'cmjHeightCm', rawVal: string) => {
    const num = rawVal === '' ? undefined : Number(rawVal)
    setCv(current => {
      const nextBenchmarks = {
        ...current.fitnessBenchmarks,
        [field]: num,
      }
      const { tier, percentileAvg } = computeFitnessTier(nextBenchmarks)
      return {
        ...current,
        fitnessBenchmarks: {
          ...nextBenchmarks,
          tier,
          percentileAvg,
        },
      }
    })
    setSavedForPrint(false)
  }

  // Video Clips management
  const addVideoClip = () => {
    if (cv.videoClips.length >= 4) return
    const newClip: VideoClip = {
      id: `clip-${Date.now().toString(36)}`,
      title: '',
      clipType: 'technique-drill',
      videoUrl: '',
      description: '',
      telemetry: [{ metricName: 'Key Speed / Metric', metricValue: '' }],
    }
    setCv(current => ({ ...current, videoClips: [...current.videoClips, newClip] }))
  }

  const updateClip = (index: number, field: keyof VideoClip, value: unknown) => {
    setCv(current => ({
      ...current,
      videoClips: current.videoClips.map((clip, i) => (i === index ? { ...clip, [field]: value } : clip)),
    }))
  }

  const removeClip = (index: number) => {
    setCv(current => ({
      ...current,
      videoClips: current.videoClips.filter((_, i) => i !== index),
    }))
  }

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // Ignore
    }
    setCv(initialCv)
    setDraftRestored(false)
    setSavedForPrint(false)
    setPublishedProfile(null)
    setPublishMessage('Draft cleared. Form reset to fresh state.')
  }

  const handlePublish = async () => {
    if (!cv.fullName.trim()) {
      setPublishMessage('Please provide your athlete full name before publishing.')
      return
    }
    if (!cv.sport.trim()) {
      setPublishMessage('Please enter your primary sport before publishing.')
      return
    }

    setIsPublishing(true)
    const handle = normalizeUsername(cv.username || cv.fullName)
    const activeKhelId = generateKhelId({ state: cv.state, username: handle })

    const res = await publishAthleteProfile({
      userId: currentUser?.id,
      username: handle,
      khelId: activeKhelId,
      fullName: cv.fullName,
      sport: cv.sport,
      playingPosition: cv.playingPosition || 'Athlete',
      city: cv.city || 'India',
      state: cv.state,
      dateOfBirth: cv.dateOfBirth,
      email: cv.email,
      phone: cv.phone,
      teamOrAcademy: cv.teamOrAcademy,
      coach: cv.coach,
      experienceYears: cv.experience,
      primaryFootOrHand: cv.primaryFootOrHand,
      heightCm: cv.heightCm ? Number(cv.heightCm) : undefined,
      weightKg: cv.weightKg ? Number(cv.weightKg) : undefined,
      bloodGroup: cv.bloodGroup,
      schoolOrCollege: cv.schoolOrCollege,
      federationUid: cv.federationUid,
      guardianName: cv.guardianName,
      guardianRelation: cv.guardianRelation,
      guardianPhone: cv.guardianPhone,
      summary: cv.goals,
      achievements: cv.achievements.filter(a => a.event.trim()),
      videoClips: cv.videoClips.filter(c => c.title.trim() && c.videoUrl.trim()),
      fitnessBenchmarks: cv.fitnessBenchmarks,
    })

    setIsPublishing(false)
    if (res.status === 'published') {
      setPublishedProfile(res.profile)
      setPublishMessage(`✓ Success! Official athlete profile published at ${res.publicUrl}`)
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setDraftRestored(false)
      } catch {
        // Ignore
      }
    } else {
      setPublishMessage(res.message)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavedForPrint(true)
    window.setTimeout(() => window.print(), 80)
  }

  // Active Khel ID & Public Profile URL
  const activeHandle = normalizeUsername(cv.username || cv.fullName || 'athlete')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const dossierPublicUrl = `${origin}/u/@${activeHandle}`
  const activeKhelId = generateKhelId({ state: cv.state, username: activeHandle })

  // High-contrast scannable QR Code for the official print dossier
  const printQrSvg = useMemo(() => {
    return generateQrSvgString(dossierPublicUrl, { size: 92, color: '#0B1C2D', bgColor: '#FFFFFF' })
  }, [dossierPublicUrl])

  // Calculated athlete age
  const calculatedAge = useMemo(() => {
    if (!cv.dateOfBirth) return ''
    const birthYear = new Date(cv.dateOfBirth).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    return age > 0 && age < 80 ? `${age} yrs` : ''
  }, [cv.dateOfBirth])

  return (
    <section className="content-page sports-cv-page">
      <p className="eyebrow">ATHLETE TOOLS · DIGITAL KHEL ID (खेल आईडी) &amp; SELECTION TRIAL DOSSIER</p>
      <h1>Build your sports CV, digital Khel ID &amp; Player Card.</h1>
      <p className="page-intro">
        Create your official athlete profile with standardized Digital Khel ID ({activeKhelId}), trial-ready federation registration,
        video telemetry, and empirical fitness combine benchmarks. Share your custom FIFA-style Player Card with scouts, or export a
        one-page SAI / State Directorate selection trial resume.
      </p>

      {/* Pillar 4: Local-First Draft Restored Banner */}
      {draftRestored && (
        <div className="cv-draft-banner" role="status">
          <div className="cv-draft-content">
            <SiteIcon name="sparkles" size={18} />
            <span>
              <strong>Draft Restored:</strong> We automatically restored your uncommitted profile inputs from your previous session.
            </span>
          </div>
          <button type="button" className="btn-clear-draft-pill" onClick={handleClearDraft} title="Discard saved draft">
            Clear Draft
          </button>
        </div>
      )}

      {/* Success banner if profile published */}
      {publishedProfile && (
        <div className="published-success-banner" role="status">
          <div className="success-banner-content">
            <SiteIcon name="badge-check" size={28} />
            <div>
              <h3>Your Player Card &amp; Profile are Live!</h3>
              <p>
                Official Khel ID: <strong>{publishedProfile.khelId || activeKhelId}</strong> · Public URL:{' '}
                <strong>https://khelgrid.com/u/@{publishedProfile.username}</strong>
              </p>
            </div>
          </div>
          <div className="success-banner-actions">
            <a className="primary-link" href={`/u/@${publishedProfile.username}`} target="_blank" rel="noreferrer">
              <SiteIcon name="external-link" size={16} /> View Live Profile
            </a>
            {hasExistingProfile && (
              <button
                type="button"
                className="secondary-link"
                onClick={handleLoadExistingProfile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <SiteIcon name="refresh" size={15} />
                <span>Load Existing Data into Form</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="cv-privacy-note" role="note">
        <SiteIcon name="shield-check" size={18} />
        <span>
          <strong>Scout-ready &amp; Privacy first.</strong> Digital Khel ID replaces the need to share government ID numbers or private documents.
          Enter federation UIDs (BCCI, AFI, BAI, SGFI, AIFF) to streamline eligibility checks at selection trials.
        </span>
      </div>

      <form className="sports-cv-form" onSubmit={submit}>
        {/* Section 1: Athlete Details & Federation Registration */}
        <fieldset>
          <legend>1. Athlete Identity &amp; Federation Registration</legend>
          <div className="cv-field-grid">
            <label>
              Full name *
              <input
                required
                maxLength={100}
                value={cv.fullName}
                onChange={e => update('fullName', e.target.value)}
                autoComplete="name"
                placeholder="e.g. Rohit Verma"
              />
            </label>

            <label>
              Custom Handle (@username)
              <input
                maxLength={50}
                value={cv.username}
                onChange={e => update('username', e.target.value)}
                placeholder={cv.fullName ? `@${normalizeUsername(cv.fullName)}` : '@your-handle'}
              />
            </label>

            <label>
              Primary Sport *
              <input
                required
                maxLength={80}
                value={cv.sport}
                onChange={e => update('sport', e.target.value)}
                placeholder="e.g. Cricket, Athletics, Badminton, Kabaddi"
              />
            </label>

            <label>
              Federation / Board UID (Optional)
              <input
                maxLength={80}
                value={cv.federationUid}
                onChange={e => update('federationUid', e.target.value)}
                placeholder="e.g. BCCI-UID-4819 / AFI-2026-9021 / AIFF CRS"
              />
            </label>

            <label>
              School / College / University
              <input
                maxLength={120}
                value={cv.schoolOrCollege}
                onChange={e => update('schoolOrCollege', e.target.value)}
                placeholder="e.g. Delhi Public School R.K. Puram / Hindu College"
              />
            </label>

            <label>
              Blood Group
              <select value={cv.bloodGroup} onChange={e => update('bloodGroup', e.target.value)}>
                <option value="">Select Blood Group</option>
                <option value="O+">O+ (Universal Donor)</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O-">O-</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
              </select>
            </label>

            <label>
              City / District *
              <input
                required
                maxLength={100}
                value={cv.city}
                onChange={e => update('city', e.target.value)}
                autoComplete="address-level2"
                placeholder="e.g. Delhi, Hyderabad, Rohtak, Kanpur"
              />
            </label>

            <label>
              State
              <input
                maxLength={100}
                value={cv.state}
                onChange={e => update('state', e.target.value)}
                placeholder="e.g. Delhi, Haryana, Punjab, Maharashtra"
              />
            </label>

            <label>
              Date of birth
              <input type="date" value={cv.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
            </label>

            <label>
              Athlete Email (for scout enquiries)
              <input
                type="email"
                maxLength={254}
                value={cv.email}
                onChange={e => update('email', e.target.value)}
                autoComplete="email"
                placeholder="athlete@khelgrid.com"
              />
            </label>

            <label>
              Phone / WhatsApp
              <input
                type="tel"
                maxLength={30}
                value={cv.phone}
                onChange={e => update('phone', e.target.value)}
                autoComplete="tel"
                placeholder="+91 98765 43210"
              />
            </label>
          </div>

          {/* Minor Athlete & Emergency Contact Subsection */}
          <div className="cv-guardian-box">
            <h4>Parent / Guardian Emergency Contact (Mandatory for Minors under 18)</h4>
            <div className="cv-field-grid">
              <label>
                Parent / Guardian Name
                <input
                  maxLength={100}
                  value={cv.guardianName}
                  onChange={e => update('guardianName', e.target.value)}
                  placeholder="e.g. Rajesh Verma"
                />
              </label>

              <label>
                Relationship
                <select value={cv.guardianRelation} onChange={e => update('guardianRelation', e.target.value)}>
                  <option value="">Select Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Coach / Mentor">Coach / Mentor</option>
                </select>
              </label>

              <label>
                Emergency Phone Number
                <input
                  type="tel"
                  maxLength={30}
                  value={cv.guardianPhone}
                  onChange={e => update('guardianPhone', e.target.value)}
                  placeholder="+91 98111 22334"
                />
              </label>
            </div>
          </div>
        </fieldset>

        {/* Section 2: Sporting Background & Biometrics */}
        <fieldset>
          <legend>2. Sporting Background &amp; Biometrics</legend>
          <div className="cv-field-grid">
            <label>
              Playing Position / Primary Event *
              <input
                required
                maxLength={100}
                value={cv.playingPosition}
                onChange={e => update('playingPosition', e.target.value)}
                placeholder="e.g. Right-Arm Fast Bowler / 100m Sprint"
              />
            </label>

            <label>
              Team / Current Academy
              <input
                maxLength={150}
                value={cv.teamOrAcademy}
                onChange={e => update('teamOrAcademy', e.target.value)}
                placeholder="e.g. Sonnet Cricket Club / Gopichand Academy"
              />
            </label>

            <label>
              Coach / Mentor
              <input
                maxLength={120}
                value={cv.coach}
                onChange={e => update('coach', e.target.value)}
                placeholder="e.g. Coach Zaheer Farooq / NIS Senior Coach"
              />
            </label>

            <label>
              Years of experience
              <input
                maxLength={80}
                value={cv.experience}
                onChange={e => update('experience', e.target.value)}
                placeholder="e.g. 5 years competitive"
              />
            </label>

            <label>
              Height (cm)
              <input
                type="number"
                min={100}
                max={240}
                value={cv.heightCm}
                onChange={e => update('heightCm', e.target.value)}
                placeholder="182"
              />
            </label>

            <label>
              Weight (kg)
              <input
                type="number"
                min={30}
                max={180}
                value={cv.weightKg}
                onChange={e => update('weightKg', e.target.value)}
                placeholder="74"
              />
            </label>

            <label>
              Dominant Foot / Hand
              <input
                maxLength={50}
                value={cv.primaryFootOrHand}
                onChange={e => update('primaryFootOrHand', e.target.value)}
                placeholder="e.g. Right-Arm Fast / Left-Foot"
              />
            </label>
          </div>

          <label>
            Profile summary &amp; athletic ambition
            <textarea
              rows={3}
              maxLength={1500}
              value={cv.goals}
              onChange={e => update('goals', e.target.value)}
              placeholder="Describe your primary technical strengths, key weapons, fitness work, and long-term sporting goals."
            />
          </label>
        </fieldset>

        {/* Section 3: Scientific Fitness Combine Benchmarks (Pillar 2) */}
        <fieldset>
          <legend>3. Physical Fitness &amp; Combine Benchmarks</legend>
          <p className="cv-help">
            SAI, BCCI, and national sports directorates evaluate candidates on these 3 standardized physical markers.
            Enter your combine scores below to update your dynamic athletic rating (OVR).
          </p>

          <div className="cv-field-grid">
            <label>
              Yo-Yo IR1 Test Distance (meters)
              <input
                type="number"
                min={400}
                max={3000}
                step={40}
                value={cv.fitnessBenchmarks.yoyoIr1Meters || ''}
                onChange={e => updateFitnessBenchmark('yoyoIr1Meters', e.target.value)}
                placeholder="e.g. 1960 (Level 18.2)"
              />
              <span className="field-hint">Cricket / Football norm: 1600m - 2040m</span>
            </label>

            <label>
              30m Sprint Acceleration (seconds)
              <input
                type="number"
                min={3.2}
                max={6.0}
                step={0.01}
                value={cv.fitnessBenchmarks.sprint30mSeconds || ''}
                onChange={e => updateFitnessBenchmark('sprint30mSeconds', e.target.value)}
                placeholder="e.g. 4.02"
              />
              <span className="field-hint">National pace &amp; winger benchmark: &lt; 4.10s</span>
            </label>

            <label>
              Countermovement Jump — CMJ (cm)
              <input
                type="number"
                min={20}
                max={90}
                value={cv.fitnessBenchmarks.cmjHeightCm || ''}
                onChange={e => updateFitnessBenchmark('cmjHeightCm', e.target.value)}
                placeholder="e.g. 54"
              />
              <span className="field-hint">Vertical jump explosion marker: 45cm - 65cm</span>
            </label>
          </div>

          {/* Live Combine Indicator */}
          <div className="cv-combine-indicator">
            <div className="indicator-col">
              <span className="indicator-title">Combine Readiness Tier:</span>
              <strong className="indicator-tier">{cv.fitnessBenchmarks.tier || 'Grassroots Prospect'}</strong>
            </div>
            <div className="indicator-col">
              <span className="indicator-title">National Percentile:</span>
              <strong className="indicator-percentile">{cv.fitnessBenchmarks.percentileAvg || 80}th Percentile</strong>
            </div>
          </div>
        </fieldset>

        {/* Section 4: Video Clips & Telemetry Attachments */}
        <fieldset>
          <legend>
            4. Video Clips &amp; Technique Telemetry{' '}
            <span className="legend-sub">({cv.videoClips.length}/4 Clips)</span>
          </legend>
          <p className="cv-help">
            NIS coaches and SAI scouts require technique proof. Attach short 15–30s video clips (YouTube Unlisted,
            Instagram Reels, or Google Drive links) showing bowling run-up, sprint start, jump smash, or match tape.
          </p>

          {cv.videoClips.map((clip, index) => (
            <div className="cv-clip-card-row" key={clip.id}>
              <div className="clip-row-header">
                <strong>Clip #{index + 1}</strong>
                <button type="button" className="cv-remove-button" onClick={() => removeClip(index)}>
                  Remove
                </button>
              </div>

              <div className="cv-field-grid">
                <label>
                  Clip Title *
                  <input
                    required
                    maxLength={100}
                    value={clip.title}
                    onChange={e => updateClip(index, 'title', e.target.value)}
                    placeholder="e.g. Run-up &amp; 135 km/h Outswing Release"
                  />
                </label>

                <label>
                  Clip Type
                  <select
                    value={clip.clipType}
                    onChange={e => updateClip(index, 'clipType', e.target.value)}
                  >
                    <option value="bowling-action">Bowling Action / Pitching</option>
                    <option value="sprint-mechanics">Sprint Mechanics / Acceleration</option>
                    <option value="jump-power">Jump Smash / Vertical Power</option>
                    <option value="match-highlight">Match Highlights / Game Tape</option>
                    <option value="skill-footwork">Footwork &amp; Agility Drills</option>
                    <option value="batting-stroke">Batting Stroke / Shot Execution</option>
                    <option value="technique-drill">Technique Drill</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  Video URL (YouTube / Drive / Reel) *
                  <input
                    required
                    type="url"
                    value={clip.videoUrl}
                    onChange={e => updateClip(index, 'videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </label>

                <label>
                  Telemetry / Metric Tag (Optional)
                  <input
                    maxLength={60}
                    value={clip.telemetry?.[0]?.metricValue || ''}
                    onChange={e =>
                      updateClip(index, 'telemetry', [
                        { metricName: 'Key Speed / Metric', metricValue: e.target.value },
                      ])
                    }
                    placeholder="e.g. 135.2 km/h / 3.91s split / 312 km/h smash"
                  />
                </label>
              </div>
            </div>
          ))}

          {cv.videoClips.length < 4 && (
            <button type="button" className="secondary-link cv-add-button" onClick={addVideoClip}>
              <SiteIcon name="plus" size={15} /> Add Video Clip Attachment
            </button>
          )}
        </fieldset>

        {/* Section 5: Achievements */}
        <fieldset>
          <legend>5. Competition Achievements &amp; Medals</legend>
          <p className="cv-help">List verified state, national, university, school, or district tournament results.</p>
          {cv.achievements.map((item, index) => (
            <div className="cv-achievement-row" key={index}>
              <label>
                Year
                <input
                  maxLength={12}
                  value={item.year}
                  onChange={e => updateAchievement(index, 'year', e.target.value)}
                  placeholder="2025"
                />
              </label>
              <label>
                Competition / Event
                <input
                  maxLength={150}
                  value={item.event}
                  onChange={e => updateAchievement(index, 'event', e.target.value)}
                  placeholder="Delhi State U-19 Inter-District Trophy"
                />
              </label>
              <label>
                Result / Award
                <input
                  maxLength={200}
                  value={item.result}
                  onChange={e => updateAchievement(index, 'result', e.target.value)}
                  placeholder="Gold Medal / Leading Wicket Taker"
                />
              </label>
              {cv.achievements.length > 1 && (
                <button
                  type="button"
                  className="cv-remove-button"
                  onClick={() =>
                    setCv(current => ({
                      ...current,
                      achievements: current.achievements.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="secondary-link cv-add-button"
            onClick={() =>
              setCv(current => ({
                ...current,
                achievements: [...current.achievements, { year: '', event: '', result: '' }].slice(0, 12),
              }))
            }
            disabled={cv.achievements.length >= 12}
          >
            + Add Achievement
          </button>
        </fieldset>

        {/* Primary Dual Actions: Publish Live Player Card & Save PDF */}
        <div className="cv-actions no-print">
          <button
            type="button"
            className="primary-link publish-card-btn"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            <SiteIcon name="sparkles" size={18} />{' '}
            {isPublishing ? 'Publishing Player Card…' : 'Publish & Get Shareable Player Card'}
          </button>

          <button type="submit" className="secondary-link">
            <SiteIcon name="download" size={17} /> Preview &amp; Print Selection Resume (PDF)
          </button>

          <button
            type="button"
            className="secondary-link btn-clear-form"
            onClick={handleClearDraft}
            title="Reset form and remove local draft"
          >
            Clear Form &amp; Draft
          </button>
        </div>

        {publishMessage && (
          <p className="cv-feedback-message" role="status">
            {publishMessage}
          </p>
        )}

        {savedForPrint && (
          <p className="cv-help no-print" role="status">
            Print dialog opened. Choose “Save as PDF” in your browser printer options.
          </p>
        )}
      </form>

      {/* Live FIFA Trading Card Preview */}
      <section className="live-player-card-section" aria-label="Player Card Live Preview">
        <div className="section-title-wrap">
          <p className="eyebrow">FIFA-STYLE ATHLETE TRADING CARD</p>
          <h2>Your KhelGrid Player Card</h2>
          <p className="page-intro">
            Interactive athletic badge with overall score (OVR), 6 key performance pillars, and scannable QR code.
          </p>
        </div>

        <PlayerCard
          profile={{
            id: 'preview-id',
            username: activeHandle,
            khelId: activeKhelId,
            fullName: cv.fullName.trim() || 'Rohit Verma',
            sport: cv.sport.trim() || 'Cricket',
            playingPosition: cv.playingPosition.trim() || 'Right-Arm Fast Bowler',
            city: cv.city.trim() || 'Delhi',
            state: cv.state.trim() || 'Delhi',
            teamOrAcademy: cv.teamOrAcademy.trim() || 'Sonnet Cricket Club',
            achievements: cv.achievements.filter(a => a.event.trim()),
            videoClips: cv.videoClips,
            fitnessBenchmarks: cv.fitnessBenchmarks,
            verificationStatus: 'verified',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          showShareActions={true}
        />
      </section>

      {/* Pillar 3: Professional One-Page Selection Trial Resume (Print/PDF Layout) */}
      <section className="cv-print-preview" aria-label="Athlete Selection Trial Dossier">
        {/* Dossier Header */}
        <div className="dossier-header-row">
          <div className="dossier-athlete-info">
            <p className="dossier-crest">KHELGRID · OFFICIAL SELECTION TRIAL DOSSIER</p>
            <h2 className="dossier-athlete-name">{cv.fullName.trim() || 'ATHLETE FULL NAME'}</h2>
            <p className="dossier-sport-title">
              {cv.sport.trim() || 'SPORT'} · {cv.playingPosition || 'PLAYING POSITION / EVENT'}
            </p>
            <div className="dossier-khel-id-pill">
              <span>DIGITAL KHEL ID:</span>
              <strong>{activeKhelId}</strong>
            </div>
            <p className="dossier-contact-line">
              {[cv.city, cv.state, cv.phone, cv.email].filter(Boolean).join(' · ') || 'Contact details'}
            </p>
          </div>

          <div className="dossier-qr-col">
            <div
              className="dossier-qr-frame"
              title="Scan with smartphone camera to view live telemetry and video attachments"
              dangerouslySetInnerHTML={{ __html: printQrSvg }}
            />
            <span className="dossier-qr-label">Scan for Video Proof</span>
            <small className="dossier-qr-link">khelgrid.com/u/@{activeHandle}</small>
          </div>
        </div>

        {/* Table 1: Physical & Biometric Profile */}
        <div className="dossier-section-block">
          <h3 className="dossier-section-heading">1. Physical &amp; Biometric Profile</h3>
          <table className="dossier-data-table">
            <thead>
              <tr>
                <th>Date of Birth</th>
                <th>Age</th>
                <th>Height</th>
                <th>Weight</th>
                <th>Blood Group</th>
                <th>Dominant Side</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{cv.dateOfBirth || '—'}</td>
                <td>{calculatedAge || '—'}</td>
                <td>{cv.heightCm ? `${cv.heightCm} cm` : '—'}</td>
                <td>{cv.weightKg ? `${cv.weightKg} kg` : '—'}</td>
                <td>{cv.bloodGroup || '—'}</td>
                <td>{cv.primaryFootOrHand || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Affiliations & Federation Registrations */}
        <div className="dossier-section-block">
          <h3 className="dossier-section-heading">2. Affiliations &amp; Federation Credentials</h3>
          <table className="dossier-data-table">
            <tbody>
              <tr>
                <th>Federation / Board UID</th>
                <td>{cv.federationUid || 'Pending State / District Verification'}</td>
                <th>School / College / Institution</th>
                <td>{cv.schoolOrCollege || 'Private Candidate'}</td>
              </tr>
              <tr>
                <th>Current Club / Academy</th>
                <td>{cv.teamOrAcademy || 'Grassroots Athlete'}</td>
                <th>Primary Coach / Mentor</th>
                <td>{cv.coach || 'Self-Coached'}</td>
              </tr>
              <tr>
                <th>Years of Experience</th>
                <td>{cv.experience || 'Grassroots'}</td>
                <th>Emergency / Guardian Contact</th>
                <td>
                  {[cv.guardianName, cv.guardianRelation, cv.guardianPhone].filter(Boolean).join(' · ') || 'Self'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 3: Scientific Fitness Combine Benchmarks */}
        <div className="dossier-section-block">
          <h3 className="dossier-section-heading">3. Physical Fitness Combine Benchmarks (SAI Protocol)</h3>
          <table className="dossier-data-table">
            <thead>
              <tr>
                <th>Yo-Yo IR1 Endurance</th>
                <th>30m Sprint Acceleration</th>
                <th>Countermovement Jump (CMJ)</th>
                <th>Combine Percentile</th>
                <th>Candidate Readiness Tier</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{cv.fitnessBenchmarks.yoyoIr1Meters ? `${cv.fitnessBenchmarks.yoyoIr1Meters} m` : '—'}</td>
                <td>{cv.fitnessBenchmarks.sprint30mSeconds ? `${cv.fitnessBenchmarks.sprint30mSeconds} s` : '—'}</td>
                <td>{cv.fitnessBenchmarks.cmjHeightCm ? `${cv.fitnessBenchmarks.cmjHeightCm} cm` : '—'}</td>
                <td><strong>{cv.fitnessBenchmarks.percentileAvg || 80}th Percentile</strong></td>
                <td><strong className="tier-badge-text">{cv.fitnessBenchmarks.tier || 'Grassroots Candidate'}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: Verified Competitive Records & Medal Ledger */}
        <div className="dossier-section-block">
          <h3 className="dossier-section-heading">4. Competition Achievements &amp; Medal Ledger</h3>
          {cv.achievements.some(a => a.event.trim()) ? (
            <table className="dossier-data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Year</th>
                  <th>Championship / Tournament</th>
                  <th>Official Result / Medal / Distinction</th>
                </tr>
              </thead>
              <tbody>
                {cv.achievements
                  .filter(a => a.event.trim())
                  .map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.year || '—'}</strong></td>
                      <td>{item.event}</td>
                      <td>{item.result || 'Participant'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="dossier-empty-note">No tournament achievements listed. Add competitive history above.</p>
          )}
        </div>

        {/* Section 5: Video Telemetry Proof */}
        {cv.videoClips.length > 0 && (
          <div className="dossier-section-block">
            <h3 className="dossier-section-heading">5. Technique Video Telemetry (QR Link Verifiable)</h3>
            <table className="dossier-data-table">
              <thead>
                <tr>
                  <th>Clip Drill</th>
                  <th>Discipline / Category</th>
                  <th>Recorded Telemetry Metric</th>
                  <th>Digital Link</th>
                </tr>
              </thead>
              <tbody>
                {cv.videoClips.map((clip, idx) => (
                  <tr key={idx}>
                    <td><strong>{clip.title}</strong></td>
                    <td>{clip.clipType}</td>
                    <td>{clip.telemetry?.[0]?.metricValue || 'Visual Evaluation'}</td>
                    <td className="table-url-cell">{clip.videoUrl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 6: Statutory Selection Trial Endorsement Box */}
        <div className="dossier-endorsement-container">
          <div className="candidate-declaration-box">
            <h4>Candidate Statutory Declaration</h4>
            <p>
              I hereby solemnly declare that all competitive records, federation registrations, biometrics, and telemetry
              stated in this Sports CV are true, accurate, and verifiable against official tournament scorecards.
            </p>
            <div className="signature-line-row">
              <div className="sig-block">
                <span className="sig-line" />
                <span className="sig-caption">Athlete / Guardian Signature</span>
              </div>
              <div className="sig-block">
                <span className="sig-line" />
                <span className="sig-caption">Date &amp; Trial Location</span>
              </div>
            </div>
          </div>

          <div className="selector-endorsement-box">
            <h4>Selection Trial Observer &amp; Scout Sign-Off</h4>
            <div className="endorsement-fields-grid">
              <div>
                <span className="field-label">Chief Selector / Verifier:</span>
                <span className="field-dotted-line" />
              </div>
              <div>
                <span className="field-label">Designation / Federation:</span>
                <span className="field-dotted-line" />
              </div>
              <div>
                <span className="field-label">Combine Observation Remarks:</span>
                <span className="field-dotted-line" />
              </div>
            </div>
            <div className="stamp-signature-area">
              <div className="official-stamp-box">
                <span>OFFICIAL STAMP / SEAL</span>
              </div>
              <div className="selector-sig-box">
                <span className="sig-line" />
                <span className="sig-caption">Selector / Scrutinizer Signature</span>
              </div>
            </div>
          </div>
        </div>

        <p className="cv-disclaimer">
          Digital Khel ID ({activeKhelId}) issued via KhelGrid Athlete Network. Scan the QR code to verify video telemetry and certificate attachments.
        </p>
      </section>
    </section>
  )
}
