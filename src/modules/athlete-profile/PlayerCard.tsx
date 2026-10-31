import { useRef, useState } from 'react'
import type { AthleteProfile } from '../../shared/domain'
import { SportIcon } from '../../shared/sports/sportIcons'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './PlayerCard.css'

export interface PlayerCardProps {
  profile: AthleteProfile
  showShareActions?: boolean
  compact?: boolean
}

/**
 * Calculates a dynamic, realistic athletic rating (OVR 75 - 98)
 * based on empirical fitness benchmarks, experience, and verified achievements.
 */
function calculateOverallRating(profile: AthleteProfile): number {
  let score = 82 // Baseline rating for verified grassroots athletes
  if (profile.fitnessBenchmarks?.percentileAvg) {
    score = Math.round(75 + (profile.fitnessBenchmarks.percentileAvg * 0.22))
  } else if (profile.fitnessBenchmarks?.yoyoIr1Meters) {
    const yoyo = profile.fitnessBenchmarks.yoyoIr1Meters
    if (yoyo >= 2000) score += 9
    else if (yoyo >= 1700) score += 6
    else if (yoyo >= 1400) score += 3
  }
  const achBonus = Math.min(6, (profile.achievements || []).length * 2)
  const clipsBonus = Math.min(3, (profile.videoClips || []).length * 1.5)
  return Math.min(98, Math.max(76, Math.round(score + achBonus + clipsBonus)))
}

export function PlayerCard({ profile, showShareActions = true, compact = false }: PlayerCardProps) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const publicUrl = `${origin}/u/@${profile.username}`
  const ovr = calculateOverallRating(profile)

  // Derived ratings for 6 FIFA-style card stats
  const pac = profile.fitnessBenchmarks?.sprint30mSeconds
    ? Math.min(99, Math.round(135 - profile.fitnessBenchmarks.sprint30mSeconds * 10))
    : 85
  const sta = profile.fitnessBenchmarks?.yoyoIr1Meters
    ? Math.min(99, Math.round((profile.fitnessBenchmarks.yoyoIr1Meters / 2200) * 100))
    : 86
  const pwr = profile.fitnessBenchmarks?.cmjHeightCm
    ? Math.min(99, Math.round((profile.fitnessBenchmarks.cmjHeightCm / 65) * 100))
    : 84
  const exp = Math.min(95, 78 + (profile.achievements?.length || 1) * 3)
  const tec = Math.min(96, 82 + (profile.videoClips?.length || 1) * 4)
  const ach = Math.min(99, 80 + (profile.achievements?.length || 0) * 4)

  const handleCopy = () => {
    navigator.clipboard?.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareText = `Check out ${profile.fullName}’s (${profile.sport} — ${profile.playingPosition}) official Athlete Card & Sports CV on KhelGrid:\n${publicUrl}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  const handleDownloadCard = () => {
    // Generate standalone high-res SVG download of the Player Card
    const cardEl = cardRef.current
    if (!cardEl) return

    const svgData = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="580" viewBox="0 0 400 580">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C07B" />
      <stop offset="50%" stop-color="#A7F36B" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#091827" />
      <stop offset="40%" stop-color="#06121E" />
      <stop offset="100%" stop-color="#030A12" />
    </linearGradient>
  </defs>

  <!-- Card Shield Body -->
  <path d="M 20 40 Q 20 20 40 20 L 360 20 Q 380 20 380 40 L 380 440 L 200 560 L 20 440 Z" fill="url(#cardBg)" stroke="url(#goldBorder)" stroke-width="4" />

  <!-- Card Header Badge -->
  <text x="50" y="70" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#A7F36B">${ovr}</text>
  <text x="50" y="92" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#E5C07B">${profile.playingPosition.slice(0, 5).toUpperCase()}</text>
  <text x="50" y="115" font-size="20">🇮🇳</text>

  <!-- Sport & Crest -->
  <rect x="290" y="45" width="60" height="60" rx="12" fill="#0D2338" stroke="#A7F36B" stroke-width="1.5" />
  <text x="320" y="82" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle">${profile.sport.slice(0, 8)}</text>

  <!-- Player Name -->
  <text x="200" y="240" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${profile.fullName.toUpperCase()}</text>
  <text x="200" y="265" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#A7F36B" text-anchor="middle">${profile.playingPosition} · ${profile.city}</text>
  <text x="200" y="285" font-family="Arial, sans-serif" font-size="11" fill="#8FA5BE" text-anchor="middle">${profile.teamOrAcademy || 'Grassroots Athlete'}</text>

  <!-- Divider Line -->
  <line x1="45" y1="305" x2="355" y2="305" stroke="url(#goldBorder)" stroke-width="1.5" opacity="0.6" />

  <!-- 6 FIFA Attributes -->
  <g font-family="Arial, sans-serif" font-weight="bold">
    <!-- Col 1 -->
    <text x="75" y="340" font-size="18" fill="#FFF">${pac}</text>
    <text x="110" y="340" font-size="13" fill="#8FA5BE">PAC</text>
    <text x="75" y="375" font-size="18" fill="#FFF">${sta}</text>
    <text x="110" y="375" font-size="13" fill="#8FA5BE">STA</text>
    <text x="75" y="410" font-size="18" fill="#FFF">${pwr}</text>
    <text x="110" y="410" font-size="13" fill="#8FA5BE">PWR</text>

    <!-- Col 2 -->
    <text x="235" y="340" font-size="18" fill="#FFF">${exp}</text>
    <text x="270" y="340" font-size="13" fill="#8FA5BE">EXP</text>
    <text x="235" y="375" font-size="18" fill="#FFF">${tec}</text>
    <text x="270" y="375" font-size="13" fill="#8FA5BE">TEC</text>
    <text x="235" y="410" font-size="18" fill="#FFF">${ach}</text>
    <text x="270" y="410" font-size="13" fill="#8FA5BE">ACH</text>
  </g>

  <!-- Verified Seal Footer -->
  <rect x="70" y="450" width="260" height="28" rx="14" fill="#0D2338" stroke="#A7F36B" stroke-width="1" />
  <text x="200" y="469" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#A7F36B" text-anchor="middle">✓ KHELGRID VERIFIED ATHLETE</text>

  <!-- Link watermark -->
  <text x="200" y="525" font-family="Arial, sans-serif" font-size="10" fill="#6A8098" text-anchor="middle">khelgrid.com/u/@${profile.username}</text>
</svg>
    `

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `khelgrid-card-${profile.username}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`player-card-container ${compact ? 'is-compact' : ''}`}>
      {/* Visual FIFA Style Shield Card */}
      <div className="player-shield-card" ref={cardRef}>
        <div className="card-glare" />

        <div className="card-topline">
          <div className="card-rating-block">
            <span className="card-ovr">{ovr}</span>
            <span className="card-pos">{profile.playingPosition.slice(0, 4).toUpperCase()}</span>
            <span className="card-flag" title="India">
              🇮🇳
            </span>
          </div>

          <div className="card-sport-badge" title={profile.sport}>
            <SportIcon name={profile.sport} size={36} />
            <span className="card-sport-name">{profile.sport}</span>
          </div>
        </div>

        <div className="card-athlete-visual">
          <div className="athlete-avatar-circle">
            <SiteIcon name="user-round" size={64} />
          </div>
          {profile.verificationStatus === 'verified' && (
            <span className="card-verified-chip" title="KhelGrid Source Verified">
              <SiteIcon name="badge-check" size={14} /> Verified
            </span>
          )}
        </div>

        <div className="card-nameplate">
          <h2 className="card-full-name">{profile.fullName}</h2>
          <p className="card-subtitle">
            {profile.playingPosition} · {profile.city}
          </p>
          {profile.teamOrAcademy && <p className="card-club">{profile.teamOrAcademy}</p>}
        </div>

        <div className="card-stats-grid">
          <div className="card-stat">
            <span className="stat-val">{pac}</span>
            <span className="stat-lbl">PAC</span>
          </div>
          <div className="card-stat">
            <span className="stat-val">{sta}</span>
            <span className="stat-lbl">STA</span>
          </div>
          <div className="card-stat">
            <span className="stat-val">{pwr}</span>
            <span className="stat-lbl">PWR</span>
          </div>
          <div className="card-stat">
            <span className="stat-val">{exp}</span>
            <span className="stat-lbl">EXP</span>
          </div>
          <div className="card-stat">
            <span className="stat-val">{tec}</span>
            <span className="stat-lbl">TEC</span>
          </div>
          <div className="card-stat">
            <span className="stat-val">{ach}</span>
            <span className="stat-lbl">ACH</span>
          </div>
        </div>

        <div className="card-footer-branding">
          <span>KHELGRID · ATHLETE IDENTITY</span>
          <small className="card-handle">@{profile.username}</small>
        </div>
      </div>

      {/* Sharing & Download Actions */}
      {showShareActions && (
        <div className="card-action-tray">
          <button
            type="button"
            className="card-action-btn btn-download-card"
            onClick={handleDownloadCard}
            title="Download high-resolution vector Player Card"
          >
            <SiteIcon name="download" size={15} /> Download Card
          </button>

          <a
            className="card-action-btn btn-whatsapp-share"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Share Athlete Card to WhatsApp"
          >
            <SiteIcon name="message" size={15} /> WhatsApp Card
          </a>

          <button
            type="button"
            className="card-action-btn btn-copy-profile"
            onClick={handleCopy}
            title="Copy public profile link"
          >
            <SiteIcon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
  )
}
