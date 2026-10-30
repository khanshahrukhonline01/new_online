import type { MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import './TopSportsComplexes.css'

export interface CitySportsComplex {
  city: string
  state: string
  slug: string
  href: string
  complexes: string[]
}

const TOP_CITY_SPORTS_COMPLEXES: CitySportsComplex[] = [
  {
    city: 'Delhi',
    state: 'Delhi NCR',
    slug: 'delhi',
    href: '/city/delhi',
    complexes: [
      'Jawaharlal Nehru Stadium',
      'Thyagaraj Stadium',
      'SAI Karni Singh Shooting Range',
    ],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    slug: 'mumbai',
    href: '/city/mumbai',
    complexes: [
      'Wankhede Stadium',
      'MCA-BKC Ground',
      'Cooperage Football Ground',
    ],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    slug: 'bengaluru',
    href: '/city/bengaluru',
    complexes: [
      'Sree Kanteerava Stadium',
      'M. Chinnaswamy Stadium',
      'Kanteerava Aquatic Centre',
    ],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    slug: 'hyderabad',
    href: '/city/hyderabad',
    complexes: [
      'Gachibowli Stadium',
      'GMC Balayogi Stadium',
      'Rajiv Gandhi International Cricket Stadium',
    ],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    slug: 'pune',
    href: '/city/pune',
    complexes: [
      'Shree Shiv Chhatrapati Sports Complex',
      'MCA Stadium, Gahunje',
      'Deccan Gymkhana',
    ],
  },
  {
    city: 'Kolkata',
    state: 'West Bengal',
    slug: 'kolkata',
    href: '/city/kolkata',
    complexes: [
      'Salt Lake Stadium',
      'Eden Gardens',
      'Mohun Bagan Ground',
    ],
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    slug: 'chennai',
    href: '/city/chennai',
    complexes: [
      'Jawaharlal Nehru Stadium',
      'M. A. Chidambaram Stadium',
      'SDAT Tennis Stadium',
    ],
  },
  {
    city: 'Bhubaneswar',
    state: 'Odisha',
    slug: 'bhubaneswar',
    href: '/city/bhubaneswar',
    complexes: [
      'Kalinga Stadium',
      'Kalinga Hockey Stadium',
      'Biju Patnaik Swimming Pool',
    ],
  },
]

interface TopSportsComplexesProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
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
      <div className="footer-cities-header">
        <div>
          <h2 id="footer-cities-heading" className="footer-cities-title">
            <SiteIcon name="map-pin" size={18} style={{ color: 'var(--green-dark, #059669)' }} />
            <span>Top Sports Complexes in Cities</span>
          </h2>
          <p className="footer-cities-subtitle">
            Explore major stadiums, sports centres and training hubs across India. Check venue access, current facilities and booking or event requirements before visiting.
          </p>
        </div>
        <a
          className="footer-cities-all-link"
          href="/cities"
          onClick={e => handleClick(e, '/cities')}
        >
          <span>Explore all cities</span>
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
          <strong>National Sports Infrastructure &amp; Venue Directory:</strong> KhelGrid connects athletes across 28 sports disciplines with authentic stadiums, Sports Authority of India (SAI) National Centres of Excellence, and Khelo India state training facilities. From synthetic athletic tracks and Olympic-size aquatic arenas to multi-purpose indoor courts and box-cricket venues, explore verified grassroots facilities across 16+ metropolitan sports hubs.
        </p>
        <p className="footer-cities-disclaimer">
          Venue names are discovery starting points, not a confirmation of current availability, public entry, or booking status. Please verify details with the venue or official organiser.
        </p>
      </div>
    </section>
  )
}

export default TopSportsComplexes
