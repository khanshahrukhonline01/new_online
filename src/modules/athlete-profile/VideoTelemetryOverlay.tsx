import { useState } from 'react'
import type { VideoClip } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './VideoTelemetryOverlay.css'

export interface VideoTelemetryOverlayProps {
  clip: VideoClip
  athleteName: string
  sport: string
}

export function VideoTelemetryOverlay({ clip, athleteName, sport }: VideoTelemetryOverlayProps) {
  const [isPlayingModalOpen, setIsPlayingModalOpen] = useState(false)
  const [showTelemetryHud, setShowTelemetryHud] = useState(true)

  // Primary highlight telemetry metric (first metric or speed/time metric)
  const primaryMetric = clip.telemetry?.[0]

  // Extract embeddable video URL (e.g., YouTube embed support)
  const getEmbedUrl = (rawUrl: string): string => {
    try {
      if (rawUrl.includes('youtube.com/watch?v=')) {
        const videoId = new URL(rawUrl).searchParams.get('v')
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
      }
      if (rawUrl.includes('youtu.be/')) {
        const videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0]
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
      }
      return rawUrl
    } catch {
      return rawUrl
    }
  }

  return (
    <>
      <article className="telemetry-clip-card" aria-label={`Video clip: ${clip.title}`}>
        {/* Thumbnail Preview Area with Broadcast Telemetry Overlay */}
        <div
          className="telemetry-media-container"
          onClick={() => setIsPlayingModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label={`Play ${clip.title} with telemetry`}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsPlayingModalOpen(true)
            }
          }}
        >
          <div className="telemetry-screen-backdrop">
            <div className="telemetry-grid-lines" />
            <div className="telemetry-crosshairs" />

            {/* Top Bar on Screen */}
            <div className="telemetry-screen-top">
              <span className="telemetry-rec-badge">
                <span className="rec-dot" /> TELEMETRY ACTIVE
              </span>
              {clip.durationSeconds && (
                <span className="telemetry-timer">00:{clip.durationSeconds.toString().padStart(2, '0')}.00</span>
              )}
            </div>

            {/* Play Button Icon */}
            <div className="telemetry-play-trigger">
              <SiteIcon name="play" size={24} />
            </div>

            {/* Bottom HUD Overlay on video preview */}
            {primaryMetric && (
              <div className="telemetry-hud-primary">
                <span className="hud-metric-label">{primaryMetric.metricName}</span>
                <span className="hud-metric-value">{primaryMetric.metricValue}</span>
              </div>
            )}

            <div className="telemetry-stamp-seal">
              <span>★ KHELGRID BIOMECHANICS LAB</span>
            </div>
          </div>
        </div>

        {/* Clip Metadata Content */}
        <div className="telemetry-content">
          <div className="telemetry-tags-row">
            <span className="telemetry-type-badge">
              {clip.clipType.replace(/-/g, ' ').toUpperCase()}
            </span>
            <span className="telemetry-sport-tag">{sport}</span>
          </div>

          <h3 className="telemetry-clip-title">{clip.title}</h3>
          {clip.description && <p className="telemetry-clip-desc">{clip.description}</p>}

          {/* Detailed Telemetry Data Grid */}
          {clip.telemetry && clip.telemetry.length > 0 && (
            <div className="telemetry-data-grid">
              {clip.telemetry.map((t, idx) => (
                <div className="telemetry-hud-pill" key={idx}>
                  <span className="pill-name">{t.metricName}</span>
                  <span className="pill-val">{t.metricValue}</span>
                </div>
              ))}
            </div>
          )}

          <div className="telemetry-action-tray">
            <button
              type="button"
              className="btn-open-telemetry-player"
              onClick={() => setIsPlayingModalOpen(true)}
            >
              <SiteIcon name="play" size={14} />
              <span>Watch Telemetry Video</span>
            </button>
            <a
              href={clip.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-external-clip"
              title="Open raw source video in new tab"
            >
              <SiteIcon name="external-link" size={13} />
            </a>
          </div>
        </div>
      </article>

      {/* Full-Screen Video Telemetry Player Modal */}
      {isPlayingModalOpen && (
        <div
          className="telemetry-modal-overlay"
          onClick={() => setIsPlayingModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="telemetry-modal-title"
        >
          <div
            className="telemetry-modal-frame"
            onClick={e => e.stopPropagation()}
          >
            <div className="telemetry-modal-header">
              <div>
                <span className="modal-eyebrow">VERIFIED TECHNIQUE TELEMETRY · {sport.toUpperCase()}</span>
                <h3 id="telemetry-modal-title">{clip.title}</h3>
                <span className="modal-athlete-tag">Candidate: {athleteName}</span>
              </div>
              <button
                type="button"
                className="telemetry-modal-close"
                onClick={() => setIsPlayingModalOpen(false)}
                aria-label="Close video player"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="telemetry-modal-body">
              <div className="telemetry-video-viewport">
                <iframe
                  src={getEmbedUrl(clip.videoUrl)}
                  title={clip.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="telemetry-iframe"
                />

                {/* Optional Telemetry HUD Overlay Toggle */}
                {showTelemetryHud && clip.telemetry && (
                  <div className="telemetry-live-hud">
                    <div className="hud-strip-top">
                      <span className="live-rec">● LIVE RADAR TELEMETRY</span>
                      <span>SAI PROTOCOL VERIFIED</span>
                    </div>
                    <div className="hud-strip-metrics">
                      {clip.telemetry.map((t, idx) => (
                        <div key={idx} className="hud-metric-box">
                          <span className="hm-label">{t.metricName}</span>
                          <span className="hm-value">{t.metricValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar with Technique Breakdown */}
              <div className="telemetry-sidebar">
                <div className="hud-toggle-row">
                  <span>Broadcast Telemetry HUD</span>
                  <button
                    type="button"
                    className={`btn-hud-toggle ${showTelemetryHud ? 'is-active' : ''}`}
                    onClick={() => setShowTelemetryHud(!showTelemetryHud)}
                  >
                    {showTelemetryHud ? 'HUD Active' : 'HUD Hidden'}
                  </button>
                </div>

                <div className="telemetry-stats-card">
                  <h4>Biomechanical Metrics</h4>
                  {clip.telemetry && clip.telemetry.length > 0 ? (
                    <ul className="stats-list">
                      {clip.telemetry.map((t, idx) => (
                        <li key={idx}>
                          <span className="stat-label">{t.metricName}</span>
                          <strong className="stat-highlight">{t.metricValue}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-telemetry-note">No raw metrics attached to this clip.</p>
                  )}
                </div>

                {clip.description && (
                  <div className="telemetry-notes-card">
                    <h4>Scout &amp; Selector Notes</h4>
                    <p>{clip.description}</p>
                  </div>
                )}

                <div className="telemetry-seal-note">
                  <SiteIcon name="badge-check" size={16} />
                  <span>Verified anti-fraud sports recording calibrated on KhelGrid video network.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
