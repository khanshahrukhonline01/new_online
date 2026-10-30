/**
 * Rich metadata and exact sport-specific vector pitch artwork for KhelGrid's Featured Training Institutions.
 * Exact parity with live khelgrid.com featured institutions.
 */

export interface FeaturedAcademy {
  id: string
  slug: string
  name: string
  est: string
  scoutBadge: string
  location: string
  sports: string
  category: string
  trialsLink: string
  svgBanner: string
}

export const FEATURED_ACADEMIES: FeaturedAcademy[] = [
  {
    id: 'acad-iis',
    slug: 'inspire-institute-of-sport',
    name: 'Inspire Institute of Sport (IIS)',
    est: 'Est. 2017',
    scoutBadge: 'Direct Scout Scouting',
    location: 'Vijayanagar, Karnataka',
    sports: 'Athletics, Boxing, Wrestling, Judo',
    category: 'Olympic Training Center',
    trialsLink: '/trials?sport=Wrestling',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%231e3a8a"/>
        <stop offset="100%" stop-color="%23047857"/>
      </linearGradient>
      <radialGradient id="floodlight-1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="overlay-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-1)"/>
    <path d="M-20,180 Q200,60 420,180" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,195 Q200,80 420,195" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,210 Q200,100 420,210" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,225 Q200,120 420,225" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <line x1="160" y1="90" x2="160" y2="170" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="4,4"/>
    <circle cx="200" cy="50" r="70" fill="url(%23floodlight-1)"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-1)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🏛️</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">INSPIRE INSTITUTE OF SPORT (IIS)</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Olympic Training Campus · Vijayanagar</text>
  </svg>`,
  },
  {
    id: 'acad-tfa',
    slug: 'tata-football-academy',
    name: 'Tata Football Academy (TFA)',
    est: 'Est. 1987',
    scoutBadge: 'AIFF 4-Star Certified',
    location: 'Jamshedpur, Jharkhand',
    sports: 'Football',
    category: 'Elite Youth Academy',
    trialsLink: '/trials?sport=Football',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23065f46"/>
        <stop offset="100%" stop-color="%231e293b"/>
      </linearGradient>
      <radialGradient id="floodlight-2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="overlay-grad-2" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
      <pattern id="turf-stripes-2" width="30" height="200" patternUnits="userSpaceOnUse">
        <rect width="15" height="200" fill="rgba(255,255,255,0.04)"/>
      </pattern>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-2)"/>
    <rect width="400" height="240" fill="url(%23turf-stripes-2)"/>
    <circle cx="200" cy="120" r="45" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
    <line x1="200" y1="0" x2="200" y2="240" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <rect x="0" y="60" width="60" height="120" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
    <rect x="340" y="60" width="60" height="120" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
    <circle cx="80" cy="30" r="40" fill="url(%23floodlight-2)"/>
    <circle cx="320" cy="30" r="40" fill="url(%23floodlight-2)"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-2)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">⚽</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">TATA FOOTBALL ACADEMY (TFA)</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Elite Youth Academy · Jamshedpur</text>
  </svg>`,
  },
  {
    id: 'acad-gopichand',
    slug: 'pullela-gopichand-badminton-academy',
    name: 'Pullela Gopichand Badminton Academy',
    est: 'Est. 2008',
    scoutBadge: 'SAI NCOE Partner',
    location: 'Hyderabad, Telangana',
    sports: 'Badminton',
    category: 'National Center of Excellence',
    trialsLink: '/trials?sport=Badminton',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23581c87"/>
        <stop offset="100%" stop-color="%231e1b4b"/>
      </linearGradient>
      <linearGradient id="overlay-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-3)"/>
    <rect x="50" y="30" width="300" height="180" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <line x1="200" y1="30" x2="200" y2="210" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
    <circle cx="200" cy="120" r="35" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <line x1="100" y1="30" x2="100" y2="210" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <line x1="300" y1="30" x2="300" y2="210" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-3)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🏸</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">PULLELA GOPICHAND ACADEMY</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">SAI NCOE Center · Hyderabad</text>
  </svg>`,
  },
  {
    id: 'acad-bbfs',
    slug: 'bhaichung-bhutia-football-schools',
    name: 'Bhaichung Bhutia Football Schools',
    est: 'Est. 2010',
    scoutBadge: 'Youth League Pathway',
    location: 'Pan-India (20+ Centers)',
    sports: 'Grassroots Football',
    category: 'AIFF 4-Star Certified',
    trialsLink: '/trials?sport=Football',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23047857"/>
        <stop offset="100%" stop-color="%230f172a"/>
      </linearGradient>
      <linearGradient id="overlay-grad-4" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-4)"/>
    <circle cx="200" cy="120" r="45" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
    <line x1="200" y1="0" x2="200" y2="240" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <rect x="0" y="60" width="60" height="120" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
    <rect x="340" y="60" width="60" height="120" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-4)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">⚽</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">BHAICHUNG BHUTIA FOOTBALL SCHOOLS</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Youth League Pathway · Pan-India</text>
  </svg>`,
  },
  {
    id: 'acad-ppba',
    slug: 'prakash-padukone-badminton-academy',
    name: 'Prakash Padukone Badminton Academy',
    est: 'Est. 1994',
    scoutBadge: 'Olympic Podium Track',
    location: 'Bengaluru, Karnataka',
    sports: 'Badminton',
    category: 'Elite National Training',
    trialsLink: '/trials?sport=Badminton',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%233b0764"/>
        <stop offset="100%" stop-color="%231e3a8a"/>
      </linearGradient>
      <linearGradient id="overlay-grad-5" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-5)"/>
    <rect x="50" y="30" width="300" height="180" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <line x1="200" y1="30" x2="200" y2="210" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
    <circle cx="200" cy="120" r="35" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <line x1="100" y1="30" x2="100" y2="210" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <line x1="300" y1="30" x2="300" y2="210" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-5)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🏸</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">PRAKASH PADUKONE ACADEMY (PPBA)</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Olympic Podium Track · Bengaluru</text>
  </svg>`,
  },
  {
    id: 'acad-asi',
    slug: 'army-sports-institute',
    name: 'Army Sports Institute (ASI)',
    est: 'Est. 2001',
    scoutBadge: 'Armed Forces Scheme',
    location: 'Pune, Maharashtra',
    sports: 'Archery, Athletics, Boxing, Fencing',
    category: 'Mission Olympics Wing',
    trialsLink: '/trials?sport=Athletics',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-6" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%237f1d1d"/>
        <stop offset="100%" stop-color="%2314532d"/>
      </linearGradient>
      <radialGradient id="floodlight-6" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="overlay-grad-6" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-6)"/>
    <path d="M-20,180 Q200,60 420,180" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,195 Q200,80 420,195" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,210 Q200,100 420,210" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <path d="M-20,225 Q200,120 420,225" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <line x1="160" y1="90" x2="160" y2="170" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="4,4"/>
    <circle cx="200" cy="50" r="70" fill="url(%23floodlight-6)"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-6)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🎖️</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">ARMY SPORTS INSTITUTE (ASI)</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Mission Olympics Wing · Pune</text>
  </svg>`,
  },
  {
    id: 'acad-marykom',
    slug: 'mary-kom-regional-boxing-foundation',
    name: 'Mary Kom Regional Boxing Foundation',
    est: 'Est. 2006',
    scoutBadge: 'Youth Talent Hunter',
    location: 'Imphal, Manipur',
    sports: 'Boxing',
    category: 'SAI Center of Excellence',
    trialsLink: '/trials?sport=Boxing',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-7" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23831843"/>
        <stop offset="100%" stop-color="%2318181b"/>
      </linearGradient>
      <radialGradient id="floodlight-7" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="overlay-grad-7" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-7)"/>
    <rect x="70" y="40" width="260" height="160" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
    <line x1="70" y1="70" x2="330" y2="70" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
    <line x1="70" y1="120" x2="330" y2="120" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
    <line x1="70" y1="170" x2="330" y2="170" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
    <circle cx="70" cy="40" r="6" fill="%23ef4444"/>
    <circle cx="330" cy="40" r="6" fill="%233b82f6"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-7)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🥊</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">MARY KOM REGIONAL FOUNDATION</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">SAI Center of Excellence · Imphal</text>
  </svg>`,
  },
  {
    id: 'acad-mrf',
    slug: 'mrf-pace-foundation',
    name: 'MRF Pace Foundation',
    est: 'Est. 1987',
    scoutBadge: 'BCCI Talent Radar',
    location: 'Chennai, Tamil Nadu',
    sports: 'Cricket (Fast Bowling)',
    category: 'Premier Specialist Combine',
    trialsLink: '/trials?sport=Cricket',
    svgBanner: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg-grad-8" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23991b1b"/>
        <stop offset="100%" stop-color="%231e3a8a"/>
      </linearGradient>
      <radialGradient id="floodlight-8" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="overlay-grad-8" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg-grad-8)"/>
    <rect x="120" y="20" width="160" height="200" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-dasharray="6,4"/>
    <line x1="150" y1="20" x2="150" y2="220" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
    <line x1="250" y1="20" x2="250" y2="220" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
    <rect x="180" y="60" width="40" height="120" fill="rgba(255,255,255,0.06)" rx="4"/>
    <rect width="400" height="240" fill="url(%23overlay-grad-8)"/>
    <circle cx="200" cy="100" r="42" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="200" y="112" font-size="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">🏏</text>
    <rect x="20" y="194" width="360" height="32" rx="8" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="12" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">MRF PACE FOUNDATION</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="11" font-weight="500" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Premier Fast Bowling combine · Chennai</text>
  </svg>`,
  },
]
