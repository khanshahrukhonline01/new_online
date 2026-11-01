import type { MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { GAME_SPORT_PLAY_DIRECTORIES } from './gameSportPlayData'
import './GameSportPlayAcrossIndia.css'

interface GameSportPlayAcrossIndiaProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, path: string) => void
}

const GSP_SCHEMA_DATA = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Game, Sport & Play Across India Directory Network',
  description: 'National sports network linking grassroots athletes, maidans, turfs, akhadas, SAI NCOE high-performance centres, and government sports quota selections across India.',
  numberOfItems: 54,
  itemListElement: GAME_SPORT_PLAY_DIRECTORIES.flatMap((category, catIdx) =>
    category.links.map((link, linkIdx) => ({
      '@type': 'ListItem',
      position: catIdx * 9 + linkIdx + 1,
      name: link.label,
      url: `https://khelgrid.com${link.href}`,
    })),
  ),
}

export default function GameSportPlayAcrossIndia({ onNavigate }: GameSportPlayAcrossIndiaProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (onNavigate) {
      onNavigate(event, href)
    }
  }

  return (
    <section className="footer-game-sport-play" aria-labelledby="footer-gsp-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(GSP_SCHEMA_DATA) }}
      />
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
            <div className="footer-gsp-column-header">
              <span className="footer-gsp-column-icon" aria-hidden="true">
                <SiteIcon name={category.icon} size={14} />
              </span>
              <h4 className="footer-gsp-column-title">{category.title}</h4>
            </div>
            <p className="footer-gsp-column-subtitle">{category.subtitle}</p>
            <ul className="footer-gsp-links">
              {category.links.map(link => (
                <li key={link.label}>
                  <a
                    className="footer-gsp-link"
                    href={link.href}
                    onClick={event => handleClick(event, link.href)}
                  >
                    <span>{link.label}</span>
                    {link.tag && <span className="footer-gsp-tag">{link.tag}</span>}
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
