import { useRef, useState, useMemo } from 'react'
import type { AthleteProfile } from '../../shared/domain'
import { SportIcon } from '../../shared/sports/sportIcons'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrMatrix, generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import { generateKhelId, calculateOverallRating } from '../../shared/utils/khelId'
import './PlayerCard.css'

export interface PlayerCardProps {
  profile: AthleteProfile
  showShareActions?: boolean
  compact?: boolean
}

export function PlayerCard({ profile, showShareActions = true, compact = false }: PlayerCardProps) {
  const [copied, setCopied] = useState(false)
  const [isDownloadingPng, setIsDownloadingPng] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
  const publicUrl = `${origin}/u/@${profile.username}`
  const khelId = generateKhelId(profile)
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

  // Pre-generate scannable QR Code
  const qrSvgMarkup = useMemo(() => {
    return generateQrSvgString(publicUrl, { size: 76, color: '#A7F36B', bgColor: 'transparent' })
  }, [publicUrl])

  const handleCopy = () => {
    navigator.clipboard?.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareText = `Check out ${profile.fullName}’s (${profile.sport} — ${profile.playingPosition}) official Athlete Card & Digital Khel ID (${khelId}) on KhelGrid:\n${publicUrl}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  /**
   * Constructs the full vector SVG representation of the FIFA Trading Card.
   */
  const buildCardSvgString = (): string => {
    const qrMatrix = generateQrMatrix(publicUrl)
    const n = qrMatrix.length
    let qrPaths = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qrMatrix[r][c]) {
          qrPaths += `M${c},${r}h1v1h-1z `
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C07B" />
      <stop offset="50%" stop-color="#A7F36B" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B1C2D" />
      <stop offset="45%" stop-color="#06121E" />
      <stop offset="100%" stop-color="#030A12" />
    </linearGradient>
  </defs>

  <!-- Card Shield Body -->
  <path d="M 25 45 Q 25 20 50 20 L 370 20 Q 395 20 395 45 L 395 480 L 210 600 L 25 480 Z" fill="url(#cardBg)" stroke="url(#goldBorder)" stroke-width="4" />

  <!-- Card Header Rating Badge -->
  <text x="55" y="70" font-family="Arial, sans-serif" font-weight="900" font-size="36" fill="#A7F36B">${ovr}</text>
  <text x="55" y="92" font-family="Arial, sans-serif" font-weight="700" font-size="13" fill="#E5C07B">${profile.playingPosition.slice(0, 5).toUpperCase()}</text>
  <text x="55" y="116" font-size="20">🇮🇳</text>

  <!-- Sport & Crest -->
  <rect x="300" y="45" width="65" height="52" rx="10" fill="#0D2338" stroke="#A7F36B" stroke-width="1.5" />
  <text x="332" y="76" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${profile.sport.slice(0, 9)}</text>

  <!-- Player Name & Details -->
  <text x="210" y="215" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${profile.fullName.toUpperCase()}</text>
  <text x="210" y="238" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#A7F36B" text-anchor="middle">${profile.playingPosition} · ${profile.city}</text>
  <text x="210" y="258" font-family="Arial, sans-serif" font-size="11" fill="#8FA5BE" text-anchor="middle">${profile.teamOrAcademy || 'Grassroots Athlete'}</text>

  <!-- Divider Line -->
  <line x1="50" y1="275" x2="370" y2="275" stroke="url(#goldBorder)" stroke-width="1.5" opacity="0.6" />

  <!-- 6 FIFA Attributes -->
  <g font-family="Arial, sans-serif" font-weight="bold">
    <text x="80" y="308" font-size="18" fill="#FFF">${pac}</text>
    <text x="115" y="308" font-size="12" fill="#8FA5BE">PAC</text>
    <text x="80" y="340" font-size="18" fill="#FFF">${sta}</text>
    <text x="115" y="340" font-size="12" fill="#8FA5BE">STA</text>
    <text x="80" y="372" font-size="18" fill="#FFF">${pwr}</text>
    <text x="115" y="372" font-size="12" fill="#8FA5BE">PWR</text>

    <text x="245" y="308" font-size="18" fill="#FFF">${exp}</text>
    <text x="280" y="308" font-size="12" fill="#8FA5BE">EXP</text>
    <text x="245" y="340" font-size="18" fill="#FFF">${tec}</text>
    <text x="280" y="340" font-size="12" fill="#8FA5BE">TEC</text>
    <text x="245" y="372" font-size="18" fill="#FFF">${ach}</text>
    <text x="280" y="372" font-size="12" fill="#8FA5BE">ACH</text>
  </g>

  <!-- Digital Khel ID Box -->
  <rect x="65" y="398" width="290" height="30" rx="8" fill="#0D2338" stroke="#E5C07B" stroke-width="1.2" />
  <text x="210" y="418" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#E5C07B" text-anchor="middle" letter-spacing="1">KHEL ID: ${khelId}</text>

  <!-- Embedded Scannable QR Code (Bottom Left) -->
  <g transform="translate(68, 442)">
    <rect width="66" height="66" rx="6" fill="#0D2338" stroke="#A7F36B" stroke-width="1" />
    <g transform="translate(5, 5) scale(${56 / n})">
      <path d="${qrPaths.trim()}" fill="#A7F36B" shape-rendering="crispEdges" />
    </g>
  </g>

  <!-- Verified Seal & Link (Bottom Right) -->
  <text x="148" y="462" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#A7F36B">✓ KHELGRID VERIFIED</text>
  <text x="148" y="480" font-family="Arial, sans-serif" font-size="10" fill="#8FA5BE">Scan QR for Scouting Dossier</text>
  <text x="148" y="498" font-family="Arial, sans-serif" font-size="10" fill="#6A8098">khelgrid.com/u/@${profile.username}</text>

  <!-- Watermark at the Tip -->
  ${
    profile.dossierReference
      ? `<text x="210" y="548" font-family="Arial, sans-serif" font-size="8" fill="#8FA5BE" opacity="0.85" text-anchor="middle">REF: ${profile.dossierReference}</text>`
      : ''
  }
  <text x="210" y="565" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#A7F36B" opacity="0.6" text-anchor="middle">DIGITAL KHEL ID (खेल आईडी)</text>
</svg>`
  }

  const handleDownloadSvg = () => {
    const svgData = buildCardSvgString()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `khelgrid-id-card-${profile.username}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const handleDownloadPng = () => {
    setIsDownloadingPng(true)
    try {
      const svgData = buildCardSvgString()
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        // High-res canvas 1260 x 1860 (3x resolution)
        const canvas = document.createElement('canvas')
        canvas.width = 1260
        canvas.height = 1860
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, 1260, 1860)

          canvas.toBlob(pngBlob => {
            if (pngBlob) {
              const link = document.createElement('a')
              link.href = URL.createObjectURL(pngBlob)
              link.download = `khelgrid-id-card-${profile.username}.png`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(link.href)
            } else {
              handleDownloadSvg()
            }
            URL.revokeObjectURL(url)
            setIsDownloadingPng(false)
          }, 'image/png')
        } else {
          URL.revokeObjectURL(url)
          handleDownloadSvg()
          setIsDownloadingPng(false)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        handleDownloadSvg()
        setIsDownloadingPng(false)
      }
      img.src = url
    } catch {
      handleDownloadSvg()
      setIsDownloadingPng(false)
    }
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

        {/* Digital Khel ID Chip */}
        <div className="card-khel-id-badge" title="Official Grassroots Sports ID">
          <span className="khel-id-label">KHEL ID (खेल आईडी)</span>
          <span className="khel-id-code">{khelId}</span>
        </div>

        {profile.dossierReference && (
          <div className="card-dossier-ref-tag" title="Official Dossier Generation Reference">
            <span>DOSSIER REF: {profile.dossierReference}</span>
            {profile.dossierGeneratedAt && <span> · {profile.dossierGeneratedAt.split(',')[0]}</span>}
          </div>
        )}

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

        {/* QR Code Scannable Verification & Footer */}
        <div className="card-qr-footer">
          <div
            className="card-qr-box"
            title="Scan with phone camera to view athlete profile & scouting dossier"
            dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
          />
          <div className="card-footer-branding">
            <span className="branding-title">KHELGRID · DIGITAL KHEL ID</span>
            <small className="card-handle">@{profile.username}</small>
            <span className="card-scan-hint">Scan for Live Dossier</span>
          </div>
        </div>
      </div>

      {/* Sharing & Download Actions */}
      {showShareActions && (
        <div className="card-action-tray">
          <button
            type="button"
            className="card-action-btn btn-download-png"
            onClick={handleDownloadPng}
            disabled={isDownloadingPng}
            title="Download high-resolution PNG image of Player Card & Digital Khel ID (1260x1860)"
          >
            <SiteIcon name="download" size={15} />{' '}
            {isDownloadingPng ? 'Generating PNG…' : 'Download Card (PNG)'}
          </button>

          <button
            type="button"
            className="card-action-btn btn-download-svg"
            onClick={handleDownloadSvg}
            title="Download crisp vector SVG Player Card & Digital Khel ID"
          >
            <SiteIcon name="download" size={15} /> Download (SVG)
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
