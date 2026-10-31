import { useEffect, useState, type MouseEvent } from 'react'
import type { AthleteProfile } from '../../shared/domain'
import { getAthleteProfile, SHOWCASE_ATHLETE_PROFILES, normalizeUsername } from '../../integrations/supabase/athlete-profile-client'
import { PlayerCard } from './PlayerCard'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { SportIcon } from '../../shared/sports/sportIcons'
import './AthleteProfilePage.css'

export interface AthleteProfilePageProps {
  username: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function AthleteProfilePage({ username, onNavigate }: AthleteProfilePageProps) {
  const [profile, setProfile] = useState<AthleteProfile | null | undefined>(
    () => SHOWCASE_ATHLETE_PROFILES[normalizeUsername(username)] ?? undefined,
  )

  useEffect(() => {
    let active = true
    getAthleteProfile(username).then(res => {
      if (active) setProfile(res)
    })
    return () => {
      active = false
    }
  }, [username])

  const handleLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      onNavigate(event, path)
    }
  }

  if (profile === undefined) {
    return (
      <section className="content-page athlete-profile-loading">
        <div className="state-panel" role="status">
          <span className="state-symbol">…</span>
          <h3>Loading athlete profile…</h3>
          <p>Retrieving verified credentials, telemetry, and sporting background.</p>
        </div>
      </section>
    )
  }

  if (profile === null) {
    return (
      <section className="content-page athlete-profile-not-found">
        <div className="state-panel" role="status">
          <span className="state-symbol">○</span>
          <h3>Athlete Profile Not Found</h3>
          <p>
            No published athlete profile was found for handle <code>@{username}</code>. You can create your own
            official Sports CV and Player Card today for free.
          </p>
          <a className="primary-link" href="/sports-cv" onClick={e => handleLink(e, '/sports-cv')}>
            Build Your Athlete CV <SiteIcon name="arrow-up-right" size={16} />
          </a>
        </div>
      </section>
    )
  }

  const clips = profile.videoClips || []
  const achievements = profile.achievements || []
  const fitness = profile.fitnessBenchmarks

  return (
    <section className="content-page athlete-profile-page">
      {/* Top Breadcrumb & Actions */}
      <div className="profile-breadcrumbs">
        <a className="text-link" href="/sports-cv" onClick={e => handleLink(e, '/sports-cv')}>
          <SiteIcon name="arrow-left" size={15} /> Athlete Network
        </a>
        <span className="breadcrumb-handle">@{profile.username}</span>
      </div>

      <div className="athlete-profile-layout">
        {/* Left Column: Official Trading Card */}
        <aside className="athlete-card-column">
          <PlayerCard profile={profile} />

          <div className="scout-contact-card">
            <h3>
              <SiteIcon name="shield-check" size={18} /> Scout &amp; Academy Connect
            </h3>
            <p>
              Are you an NIS coach, SAI scout, or academy director interested in {profile.fullName}? Connect for trials
              and scouting combines.
            </p>
            <a
              className="primary-link scout-contact-btn"
              href={`mailto:khelgrid@gmail.com?subject=Scout%20Enquiry%20for%20Athlete%20@${profile.username}%20(${profile.fullName})`}
            >
              <SiteIcon name="mail" size={16} /> Contact for Trials
            </a>
          </div>
        </aside>

        {/* Right Column: In-Depth Background, Video Telemetry & Normative Benchmarks */}
        <main className="athlete-details-column">
          <header className="athlete-bio-header">
            <div className="bio-topline">
              <span className="bio-sport-pill">
                <SportIcon name={profile.sport} size={20} /> {profile.sport}
              </span>
              <span className="bio-verified-pill">
                <SiteIcon name="badge-check" size={15} /> Verified Sports CV
              </span>
            </div>

            <h1 className="athlete-headline">{profile.fullName}</h1>
            <p className="athlete-role-city">
              <strong>{profile.playingPosition}</strong> · {profile.city}
              {profile.state ? `, ${profile.state}` : ''}
            </p>

            {profile.summary && <p className="athlete-summary-text">{profile.summary}</p>}

            {/* Quick Physical / Biometric Grid */}
            <div className="athlete-biometrics-bar">
              {profile.age && (
                <div className="bio-chip">
                  <span className="lbl">Age</span>
                  <span className="val">{profile.age} yrs</span>
                </div>
              )}
              {profile.heightCm && (
                <div className="bio-chip">
                  <span className="lbl">Height</span>
                  <span className="val">{profile.heightCm} cm</span>
                </div>
              )}
              {profile.weightKg && (
                <div className="bio-chip">
                  <span className="lbl">Weight</span>
                  <span className="val">{profile.weightKg} kg</span>
                </div>
              )}
              {profile.primaryFootOrHand && (
                <div className="bio-chip">
                  <span className="lbl">Dominant</span>
                  <span className="val">{profile.primaryFootOrHand}</span>
                </div>
              )}
              {profile.experienceYears && (
                <div className="bio-chip">
                  <span className="lbl">Experience</span>
                  <span className="val">{profile.experienceYears}</span>
                </div>
              )}
            </div>
          </header>

          {/* Section 1: Video & Telemetry Clips Gallery */}
          <section className="profile-section-panel">
            <div className="section-header">
              <h2>
                <SiteIcon name="play" size={20} /> Video &amp; Technique Telemetry
              </h2>
              <span className="section-badge">{clips.length} Clips Available</span>
            </div>
            <p className="section-intro">
              Technique recordings verified by coaches showing mechanics, footwork, speed splits, and match execution.
            </p>

            {clips.length ? (
              <div className="video-clips-grid">
                {clips.map(clip => (
                  <article className="video-clip-card" key={clip.id}>
                    <div className="clip-header">
                      <span className="clip-type-tag">
                        {clip.clipType.replace(/-/g, ' ').toUpperCase()}
                      </span>
                      {clip.durationSeconds && (
                        <span className="clip-duration">{clip.durationSeconds}s</span>
                      )}
                    </div>

                    <h3>{clip.title}</h3>
                    {clip.description && <p className="clip-desc">{clip.description}</p>}

                    {/* Telemetry Chips */}
                    {clip.telemetry && clip.telemetry.length > 0 && (
                      <div className="clip-telemetry-row">
                        {clip.telemetry.map((t, idx) => (
                          <div className="telemetry-pill" key={idx}>
                            <span className="t-name">{t.metricName}:</span>
                            <span className="t-val">{t.metricValue}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <a
                      className="clip-watch-link"
                      href={clip.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SiteIcon name="play" size={15} /> Watch Technique Clip{' '}
                      <SiteIcon name="external-link" size={13} />
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-subtext">No video clips attached yet.</p>
            )}
          </section>

          {/* Section 2: Talent Scanner Normative Fitness Benchmark (KG-2026-002) */}
          {fitness && (
            <section className="profile-section-panel">
              <div className="section-header">
                <h2>
                  <SiteIcon name="activity" size={20} /> Scientific Fitness Benchmarks
                </h2>
                {fitness.tier && <span className="tier-badge">{fitness.tier}</span>}
              </div>
              <p className="section-intro">
                Empirical percentiles calibrated against KhelChronicle research paper KG-2026-002 (National Junior
                Cohort Norms).
              </p>

              <div className="fitness-metrics-grid">
                {fitness.sprint30mSeconds && (
                  <div className="fitness-metric-card">
                    <span className="f-title">30m Acceleration Sprint</span>
                    <strong className="f-score">{fitness.sprint30mSeconds}s</strong>
                    <span className="f-sub">Explosive first-step speed</span>
                  </div>
                )}

                {fitness.yoyoIr1Meters && (
                  <div className="fitness-metric-card">
                    <span className="f-title">Yo-Yo IR1 Endurance</span>
                    <strong className="f-score">{fitness.yoyoIr1Meters}m</strong>
                    <span className="f-sub">Aerobic recovery under fatigue</span>
                  </div>
                )}

                {fitness.cmjHeightCm && (
                  <div className="fitness-metric-card">
                    <span className="f-title">Vertical Jump (CMJ)</span>
                    <strong className="f-score">{fitness.cmjHeightCm} cm</strong>
                    <span className="f-sub">Lower-body power output</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 3: Verified Tournament Achievements */}
          <section className="profile-section-panel">
            <div className="section-header">
              <h2>
                <SiteIcon name="trophy" size={20} /> Competition Achievements
              </h2>
            </div>

            {achievements.length ? (
              <ul className="achievements-timeline">
                {achievements.map((ach, idx) => (
                  <li className="timeline-item" key={idx}>
                    <span className="timeline-year">{ach.year || '—'}</span>
                    <div className="timeline-content">
                      <h4>{ach.event}</h4>
                      <p>{ach.result}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-subtext">No achievements entered yet.</p>
            )}
          </section>

          {/* Section 4: Academy & Coaching Background */}
          <section className="profile-section-panel">
            <div className="section-header">
              <h2>
                <SiteIcon name="building" size={20} /> Academy &amp; Coaching Credentials
              </h2>
            </div>
            <div className="credentials-list">
              <div className="cred-item">
                <span className="cred-lbl">Current Academy / Team:</span>
                <span className="cred-val">{profile.teamOrAcademy || 'Independent Grassroots'}</span>
              </div>
              {profile.coach && (
                <div className="cred-item">
                  <span className="cred-lbl">Primary Coach:</span>
                  <span className="cred-val">{profile.coach}</span>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </section>
  )
}
