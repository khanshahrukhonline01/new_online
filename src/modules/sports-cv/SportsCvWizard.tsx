import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import type { AthleteProfile, VideoClip } from '../../shared/domain'
import { publishAthleteProfile, normalizeUsername } from '../../integrations/supabase/athlete-profile-client'
import { PlayerCard } from '../athlete-profile/PlayerCard'
import './sports-cv.css'

type Achievement = { year: string; event: string; result: string }

type Cv = {
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
  goals: string
  achievements: Achievement[]
  videoClips: VideoClip[]
  fitnessBenchmarks: {
    yoyoIr1Meters?: number
    sprint30mSeconds?: number
    cmjHeightCm?: number
    tier?: string
  }
}

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
  goals: '',
  achievements: [{ year: '', event: '', result: '' }],
  videoClips: [],
  fitnessBenchmarks: {},
}

export default function SportsCvWizard() {
  const [cv, setCv] = useState<Cv>(initialCv)
  const [savedForPrint, setSavedForPrint] = useState(false)
  const [publishedProfile, setPublishedProfile] = useState<AthleteProfile | null>(null)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

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

    const res = await publishAthleteProfile({
      username: handle,
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
      summary: cv.goals,
      achievements: cv.achievements.filter(a => a.event.trim()),
      videoClips: cv.videoClips.filter(c => c.title.trim() && c.videoUrl.trim()),
      fitnessBenchmarks: cv.fitnessBenchmarks,
    })

    setIsPublishing(false)
    if (res.status === 'published') {
      setPublishedProfile(res.profile)
      setPublishMessage(`✓ Success! Official athlete profile published at ${res.publicUrl}`)
    } else {
      setPublishMessage(res.message)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavedForPrint(true)
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <section className="content-page sports-cv-page">
      <p className="eyebrow">ATHLETE TOOLS · VERIFIED PROFILE &amp; PLAYER CARD</p>
      <h1>Build your sports CV &amp; Player Card.</h1>
      <p className="page-intro">
        Create an official athlete profile with technique video telemetry and scientific fitness benchmarks. Share your
        custom FIFA-style Player Card with scouts, coaches, and on social media, or save it as a clean PDF.
      </p>

      {/* Success banner if profile published */}
      {publishedProfile && (
        <div className="published-success-banner" role="status">
          <div className="success-banner-content">
            <SiteIcon name="badge-check" size={28} />
            <div>
              <h3>Your Player Card &amp; Profile are Live!</h3>
              <p>
                Public shareable URL: <strong>https://khelgrid.com/u/@{publishedProfile.username}</strong>
              </p>
            </div>
          </div>
          <div className="success-banner-actions">
            <a className="primary-link" href={`/u/@${publishedProfile.username}`} target="_blank" rel="noreferrer">
              <SiteIcon name="external-link" size={16} /> View Live Profile
            </a>
          </div>
        </div>
      )}

      <div className="cv-privacy-note" role="note">
        <SiteIcon name="shield-check" size={18} />
        <span>
          <strong>Scout-ready &amp; Privacy first.</strong> Do not enter government ID numbers, passwords, or private
          medical records. Video links (YouTube, Google Drive, or Instagram Reels) can be set to Unlisted or Public.
        </span>
      </div>

      <form className="sports-cv-form" onSubmit={submit}>
        {/* Section 1: Athlete Details */}
        <fieldset>
          <legend>1. Athlete Details &amp; Custom Handle</legend>
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
                placeholder="e.g. Cricket, Athletics, Badminton"
              />
            </label>

            <label>
              City / District *
              <input
                required
                maxLength={100}
                value={cv.city}
                onChange={e => update('city', e.target.value)}
                autoComplete="address-level2"
                placeholder="e.g. Delhi, Hyderabad, Rohtak"
              />
            </label>

            <label>
              State
              <input
                maxLength={100}
                value={cv.state}
                onChange={e => update('state', e.target.value)}
                placeholder="e.g. Haryana, Punjab, Maharashtra"
              />
            </label>

            <label>
              Date of birth
              <input type="date" value={cv.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
            </label>

            <label>
              Email (for scout enquiries)
              <input
                type="email"
                maxLength={254}
                value={cv.email}
                onChange={e => update('email', e.target.value)}
                autoComplete="email"
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
              />
            </label>
          </div>
        </fieldset>

        {/* Section 2: Sporting Background & Physical Metrics */}
        <fieldset>
          <legend>2. Sporting Background &amp; Biometrics</legend>
          <div className="cv-field-grid">
            <label>
              Playing Position / Event *
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
                placeholder="e.g. Coach Tarak Sinha Academy"
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
              rows={4}
              maxLength={1500}
              value={cv.goals}
              onChange={e => update('goals', e.target.value)}
              placeholder="Describe your primary technical strengths, key weapons, fitness work, and long-term sporting goals."
            />
          </label>
        </fieldset>

        {/* Section 3: Video Clips & Telemetry Attachments */}
        <fieldset>
          <legend>
            3. Video Clips &amp; Technique Telemetry{' '}
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

        {/* Section 4: Achievements */}
        <fieldset>
          <legend>4. Competition Achievements &amp; Medals</legend>
          <p className="cv-help">List verified state, national, university, or district tournament results.</p>
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
                  placeholder="Delhi State U-19 Inter-District"
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
            <SiteIcon name="download" size={17} /> Preview &amp; Save as PDF
          </button>

          <button
            type="button"
            className="secondary-link btn-clear-form"
            onClick={() => {
              setCv(initialCv)
              setSavedForPrint(false)
              setPublishedProfile(null)
              setPublishMessage(null)
            }}
          >
            Clear Form
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
            username: normalizeUsername(cv.username || cv.fullName || 'athlete'),
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

      {/* Print PDF Preview (for browser printing) */}
      <section className="cv-print-preview" aria-label="Athlete CV print preview">
        <p className="eyebrow">KHELGRID · OFFICIAL ATHLETE CV</p>
        <h2>{cv.fullName.trim() || 'Your Name'}</h2>
        <p className="cv-preview-sport">
          {cv.sport.trim() || 'Sport'}
          {cv.playingPosition ? ` · ${cv.playingPosition}` : ''}
        </p>
        <p>{[cv.city, cv.email, cv.phone].filter(Boolean).join(' · ') || 'Contact details'}</p>
        {cv.dateOfBirth && <p>Date of birth: {cv.dateOfBirth}</p>}

        <h3>Sporting Background</h3>
        <p>
          {[
            cv.teamOrAcademy && `Team / Academy: ${cv.teamOrAcademy}`,
            cv.coach && `Coach: ${cv.coach}`,
            cv.experience && `Experience: ${cv.experience}`,
          ]
            .filter(Boolean)
            .join(' · ') || 'Your team, coach and experience will appear here.'}
        </p>

        {cv.goals && (
          <>
            <h3>Profile Summary</h3>
            <p className="cv-preview-long-text">{cv.goals}</p>
          </>
        )}

        {cv.videoClips.length > 0 && (
          <>
            <h3>Video Clips &amp; Telemetry</h3>
            <ul>
              {cv.videoClips.map((clip, i) => (
                <li key={i}>
                  <strong>{clip.title}</strong> ({clip.clipType}) — Link: {clip.videoUrl}
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>Achievements</h3>
        {cv.achievements.some(item => item.year || item.event || item.result) ? (
          <ul>
            {cv.achievements
              .filter(item => item.year || item.event || item.result)
              .map((item, i) => (
                <li key={i}>{[item.year, item.event, item.result].filter(Boolean).join(' — ')}</li>
              ))}
          </ul>
        ) : (
          <p>Add achievements above to include them in the CV.</p>
        )}
        <p className="cv-disclaimer">
          Self-reported information. Verified on KhelGrid Athlete Network.
        </p>
      </section>
    </section>
  )
}
