import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { YOUTUBE_SPORTS_VIDEOS, type YouTubeShortVideo } from './youtubeVideosData'
import './YouTubeShortsSection.css'

interface YouTubeShortsSectionProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function YouTubeShortsSection({ onNavigate }: YouTubeShortsSectionProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeShortVideo | null>(null)

  const scrollRail = (direction: 'left' | 'right') => {
    if (!railRef.current) return
    const offset = direction === 'left' ? -340 : 340
    railRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  // Close player modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeVideo) {
        setActiveVideo(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeVideo])

  const handleCompanionBookClick = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    setActiveVideo(null)
    onNavigate?.(e, `/learning?book=${slug}`)
  }

  return (
    <section className="home-section-container home-youtube-section" aria-label="Short sports video drills and tactical masterclasses">
      <div className="home-section-header">
        <div className="home-section-heading-group">
          <h2 className="home-section-title">
            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}>
              <SiteIcon name="play" size={18} />
            </span>
            <span>Tactical Drills &amp; Short Videos — YouTube Powered</span>
          </h2>
          <p className="home-section-subtitle">
            30-to-60 second high-speed biomechanics, fast bowling setups, spatial pressing, and speed mechanics · Free to watch
          </p>
        </div>
        <div className="home-section-actions">
          <div className="home-scroll-arrows">
            <button
              type="button"
              aria-label="Scroll sports videos left"
              className="home-arrow-btn"
              onClick={() => scrollRail('left')}
            >
              <SiteIcon name="arrow-left" size={15} />
            </button>
            <button
              type="button"
              aria-label="Scroll sports videos right"
              className="home-arrow-btn"
              onClick={() => scrollRail('right')}
            >
              <SiteIcon name="arrow-right" size={15} />
            </button>
          </div>
          <a
            className="home-view-all-link"
            href="https://www.youtube.com/@KhelGrid"
            target="_blank"
            rel="noopener noreferrer"
            title="Watch all sports coaching shorts on YouTube"
          >
            <span>Watch on YouTube ({YOUTUBE_SPORTS_VIDEOS.length})</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
        </div>
      </div>

      <div
        ref={railRef}
        className="home-touch-rail"
        tabIndex={0}
        aria-label="Sports coaching video shorts rail"
      >
        {YOUTUBE_SPORTS_VIDEOS.map(video => (
          <button
            key={video.id}
            type="button"
            className="home-youtube-card"
            onClick={() => setActiveVideo(video)}
            aria-label={`Watch ${video.title} on YouTube`}
          >
            {/* Thumbnail Facade with Play Overlay */}
            <div className="home-yt-thumb-wrap">
              <img
                src={`https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`}
                alt={`${video.title} video thumbnail`}
                className="home-yt-thumb-img"
                loading="lazy"
                width={400}
                height={225}
                onError={e => {
                  // Fallback placeholder if offline
                  ;(e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%230f172a"/><text x="50%" y="50%" fill="%2338bdf8" font-size="16" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent(video.title)}</text></svg>`
                }}
              />
              <div className="home-yt-play-overlay">
                <div className="home-yt-play-icon" aria-hidden="true">
                  <SiteIcon name="chevron-right" size={24} />
                </div>
              </div>
              <div className="home-yt-badge-top">
                <span className="home-yt-category-pill">
                  {video.sportEmoji} {video.sport} · {video.category}
                </span>
              </div>
              <div className="home-yt-duration-pill">
                ⏱ {video.duration}
              </div>
            </div>

            {/* Video Card Content */}
            <div className="home-yt-content">
              <h3 className="home-yt-title">{video.title}</h3>
              <p className="home-yt-subtitle">{video.subtitle}</p>

              <div className="home-yt-meta-row">
                <span className="home-yt-channel">{video.channelName}</span>
                <span className="home-yt-watch-btn">
                  <span>Watch Drill</span>
                  <SiteIcon name="arrow-up-right" size={12} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Embedded YouTube Modal Player */}
      {activeVideo && (
        <div
          className="home-yt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-yt-modal-heading"
          onClick={e => {
            if (e.target === e.currentTarget) setActiveVideo(null)
          }}
        >
          <div className="home-yt-modal">
            {/* Modal Header */}
            <div className="home-yt-modal-header">
              <h3 id="home-yt-modal-heading" className="home-yt-modal-title">
                {activeVideo.sportEmoji} {activeVideo.title}
              </h3>
              <button
                type="button"
                className="home-yt-modal-close-btn"
                onClick={() => setActiveVideo(null)}
                aria-label="Close Video Player"
              >
                <span>Close</span>
                <SiteIcon name="close" size={15} />
              </button>
            </div>

            {/* Responsive 16:9 YouTube Embed */}
            <div className="home-yt-player-container">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideo.title}
                className="home-yt-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Modal Footer with Book Companion Link */}
            <div className="home-yt-modal-footer">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Channel: {activeVideo.channelName} · {activeVideo.viewsCount}
              </span>
              {activeVideo.companionBookSlug && (
                <a
                  href={`/learning?book=${activeVideo.companionBookSlug}`}
                  onClick={e => handleCompanionBookClick(e, activeVideo.companionBookSlug!)}
                  className="home-yt-book-link"
                >
                  <SiteIcon name="book-open" size={14} />
                  <span>Read Full Textbook: {activeVideo.companionBookTitle} →</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
