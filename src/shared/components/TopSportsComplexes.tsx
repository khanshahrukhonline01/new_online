import type { MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { TOP_CITY_SPORTS_COMPLEXES } from './cityComplexesData'
import './TopSportsComplexes.css'

interface TopSportsComplexesProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const CITY_COMPLEXES_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Top Sports Complexes & Stadiums in Indian Cities',
  description: 'National directory of premier stadiums, Sports Authority of India (SAI) high-performance training centres, and multisport arenas across 16 major Indian cities.',
  numberOfItems: TOP_CITY_SPORTS_COMPLEXES.length,
  itemListElement: TOP_CITY_SPORTS_COMPLEXES.map((item, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: `${item.city} Sports Complexes (${item.state})`,
    url: `https://www.khelgrid.com${item.href}`,
    description: `Major sports venues in ${item.city}: ${item.complexes.join(', ')}`,
  })),
}

export function TopSportsComplexes({ onNavigate }: TopSportsComplexesProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  return (
    <section
      id="top-sports-complexes"
      className="footer-cities-complexes"
      aria-labelledby="footer-cities-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(CITY_COMPLEXES_SCHEMA) }}
      />
      <div className="footer-cities-header">
        <div>
          <div className="footer-cities-title-row">
            <h2 id="footer-cities-heading" className="footer-cities-title">
              <SiteIcon name="map-pin" size={18} style={{ color: 'var(--green-dark, #059669)' }} />
              <span>Top Sports Complexes in Cities</span>
            </h2>
            <span className="footer-cities-badge">16 Metro Sports Hubs</span>
          </div>
          <p className="footer-cities-subtitle">
            Explore major stadiums, sports centres and training hubs across India. Check venue access, current facilities and booking or event requirements before visiting.
          </p>
        </div>
        <a
          className="footer-cities-all-link"
          href="/cities"
          onClick={e => handleClick(e, '/cities')}
        >
          <span>Explore all 16 cities</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="footer-cities-grid">
        {TOP_CITY_SPORTS_COMPLEXES.map(item => (
          <article key={item.slug} className="footer-city-card">
            <div>
              <div className="footer-city-card-header">
                <div>
                  <h3 className="footer-city-name">{item.city}</h3>
                  <p className="footer-city-state">{item.state}</p>
                </div>
                <span className="footer-city-trophy-badge" aria-hidden="true">
                  <SiteIcon name="trophy" size={15} />
                </span>
              </div>
              <ul className="footer-city-venues-list">
                {item.complexes.map(complex => (
                  <li key={complex}>
                    <span className="footer-city-dot" aria-hidden="true" />
                    <span>{complex}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a
              className="footer-city-link"
              href={item.href}
              onClick={e => handleClick(e, item.href)}
              aria-label={`Explore ${item.city} sports hubs and venues`}
            >
              <span>Explore {item.city} sports hubs</span>
              <span aria-hidden="true">→</span>
            </a>
          </article>
        ))}
      </div>

      <div className="footer-cities-seo-block">
        <p>
          <strong>National Sports Infrastructure &amp; Venue Directory:</strong> KhelGrid connects athletes across 28 sports disciplines with authentic stadiums, Sports Authority of India (SAI) National Centres of Excellence, and Khelo India state training facilities. From synthetic athletic tracks and Olympic-size aquatic arenas to multi-purpose indoor courts and box-cricket venues, explore verified grassroots facilities across 16 metropolitan sports hubs including Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, Kolkata, Chennai, Ahmedabad, Chandigarh, Bhubaneswar, Lucknow, Jaipur, Bhopal, Kochi, Ranchi, and Dehradun.
        </p>
        <p className="footer-cities-disclaimer">
          Venue names are discovery starting points, not a confirmation of current availability, public entry, or booking status. Please verify details with the venue or official organiser.
        </p>
      </div>
    </section>
  )
}

export default TopSportsComplexes
