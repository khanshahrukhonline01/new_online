import type { MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { GAME_SPORT_PLAY_DIRECTORIES } from './gameSportPlayData'
import './GameSportPlayAcrossIndia.css'

interface GameSportPlayAcrossIndiaProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, path: string) => void
}

export default function GameSportPlayAcrossIndia({ onNavigate }: GameSportPlayAcrossIndiaProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (onNavigate) {
      onNavigate(event, href)
    }
  }

  return (
    <section className="footer-game-sport-play" aria-labelledby="footer-gsp-title">
      <div className="footer-gsp-header">
        <div>
          <div className="footer-gsp-title-row">
            <h3 id="footer-gsp-title" className="footer-gsp-title">
              <span className="gsp-icon" aria-hidden="true">
                <SiteIcon name="sparkles" size={17} />
              </span>
              Game, Sport &amp; Play Across India
            </h3>
            <span className="footer-gsp-badge">54+ Verified Directories</span>
          </div>
          <p className="footer-gsp-subtitle">
            Connecting India’s grassroots khiladis, maidans, turfs, akhadas, and national sports trials
          </p>
        </div>
      </div>

      <div className="footer-gsp-grid">
        {GAME_SPORT_PLAY_DIRECTORIES.map(category => (
          <div key={category.title} className="footer-gsp-column">
            <h4 className="footer-gsp-column-title">{category.title}</h4>
            <ul className="footer-gsp-links">
              {category.links.map(link => (
                <li key={link.label}>
                  <a
                    className="footer-gsp-link"
                    href={link.href}
                    onClick={event => handleClick(event, link.href)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
