/**
 * Comprehensive SEO & Structured Data Utility for KhelGrid.
 * Injects document titles, canonical URLs, OpenGraph/Twitter card meta tags,
 * and Schema.org JSON-LD structured data to maximize organic ranking,
 * vernacular discoverability, and eliminate search engine thin-content penalties.
 */

export interface PageSeoConfig {
  title: string
  description: string
  canonicalUrl: string
  ogType?: 'website' | 'article' | 'profile' | 'place'
  image?: string
  keywords?: string[]
  jsonLd?: Record<string, unknown>
}

export const DEFAULT_KEYWORDS = [
  'KhelGrid', 'खेलग्रिड', 'खेल', 'खेलकूद', 'खेल प्रतियोगिता',
  'स्पोर्ट्स ट्रायल', 'क्रिकेट ट्रायल', 'फुटबॉल ट्रायल', 'टर्फ बुकिंग',
  'बैडमिंटन कोर्ट', 'कबड्डी', 'कुश्ती', 'दंगल', 'अखाड़ा', 'लाइव स्कोर',
  'खेळ', 'क्रीडा स्पर्धा', 'मैदान', 'খেলাধুলা', 'விளையாட்டு', 'கால்பந்து',
  'క్రీడలు', 'ఆటలు', 'ಕ್ರೀಡೆಗಳು', 'ರમતગમત', 'ખેલ મહાકુંભ', 'ਖੇਡਾਂ', 'കായിക',
  'sports in india', 'indian sports platform', 'turf booking near me',
  'sports academy near me', 'open sports trials india', 'live sports score india'
]

export function getRouteSeoMetadata(pathname: string): PageSeoConfig {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/'

  if (cleanPath === '/') {
    return {
      title: "KhelGrid (खेलग्रिड) — India's Premier Sports Platform | Play, Book Turfs, Academies, Trials & Live Scores",
      description: "Discover verified sports academies, book turfs & courts, find open selection trials, join local pickup games, connect with coaches, and follow live scores across 30+ sports in all Indian languages (खेल, खेलकूद, टूर्नामेंट, ट्रायल, अकादमी).",
      canonicalUrl: 'https://khelgrid.com/',
      keywords: DEFAULT_KEYWORDS,
      ogType: 'website',
      image: 'https://khelgrid.com/assets/kg-logo.webp'
    }
  }

  if (cleanPath === '/play') {
    return {
      title: "Play Sports & Join Pickup Matches Near You · KhelGrid (खेलें और मैच खोजें)",
      description: "Find and join local sports pickup games, box cricket, futsal, badminton, and pickleball matches across Indian cities. Host your own game or join players nearby on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/play',
      keywords: ['play sports near me', 'pickup games india', 'box cricket match', 'badminton games near me', 'futsal pickup game', 'join football match', 'खेलें', 'मैच खोजें', 'local sports community', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/opportunities' || cleanPath === '/trials' || cleanPath === '/combines' || cleanPath === '/scholarships' || cleanPath === '/camps') {
    return {
      title: "Sports Trials, Tournaments & Scholarships in India · KhelGrid (ट्रायल और खेल प्रतियोगिता)",
      description: "Discover verified sports trials, state and national tournaments, SAI NCOE selections, and athletic scholarships across India. Filter by sport, age group, and location.",
      canonicalUrl: 'https://khelgrid.com/opportunities',
      keywords: ['sports trials 2026', 'cricket trials near me', 'football selection trials', 'badminton tournaments india', 'sports scholarships', 'sai ncoe selection trials', 'ट्रायल', 'खेल प्रतियोगिता', 'open sports trials', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/venues' || cleanPath === '/book') {
    return {
      title: "Book Sports Venues, Turfs & Courts Across India · KhelGrid (टर्फ और मैदान बुकिंग)",
      description: "Find and book verified sports venues, synthetic turfs, badminton wooden courts, swimming pools, tennis courts, and box cricket pitches with hourly slots across India.",
      canonicalUrl: 'https://khelgrid.com/venues',
      keywords: ['book turf near me', 'sports turf booking', 'badminton court booking', 'box cricket turf', 'football turf near me', 'swimming pool passes', 'टर्फ बुकिंग', 'मैदान बुकिंग', 'sports ground booking india', ...DEFAULT_KEYWORDS],
      ogType: 'place'
    }
  }

  if (cleanPath === '/academies' || cleanPath === '/academy' || cleanPath === '/train') {
    return {
      title: "Find Verified Sports Academies & Coaching in India · KhelGrid (खेल अकादमी)",
      description: "Explore verified sports academies, professional coaching centres, cricket academies, badminton institutes, and combat akhadas across India. Check fees, coaches, and admissions.",
      canonicalUrl: 'https://khelgrid.com/academies',
      keywords: ['sports academy near me', 'cricket academy india', 'badminton coaching centre', 'football training academy', 'tennis academy', 'akhada wrestling', 'खेल अकादमी', 'sports coaching classes', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/sports') {
    return {
      title: "Explore 30+ Sports & Games in India · KhelGrid (सभी खेल व प्रतियोगिताएं)",
      description: "Explore 30+ Olympic and desi sports across India including Cricket, Football, Badminton, Kabaddi, Athletics, Pickleball, Tennis, Wrestling, and Swimming on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/sports',
      keywords: ['sports in india', 'desi khel', 'olympic sports india', 'cricket', 'badminton', 'football', 'kabaddi', 'kho kho', 'athletics', 'wrestling', 'pickleball', 'सभी खेल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/live' || cleanPath === '/live-scores') {
    return {
      title: "Live Sports Scores, Match Updates & Commentary · KhelGrid (लाइव स्कोर)",
      description: "Follow real-time sports scores, match centers, and live updates across cricket, football, badminton, and multi-sport tournaments in India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/live',
      keywords: ['live sports score india', 'live cricket score', 'football live score', 'badminton match score', 'sports match center', 'लाइव स्कोर', 'sports updates', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/sports-cv' || cleanPath === '/start-from-zero') {
    return {
      title: "Create Athlete Sports CV & Verified Profile · KhelGrid (स्पोर्ट्स सीवी)",
      description: "Build a professional, shareable Sports CV and athlete portfolio. Highlight your match stats, trial history, coaching records, and achievements on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/sports-cv',
      keywords: ['sports cv maker', 'athlete resume builder', 'sports portfolio', 'athlete scout id', 'स्पोर्ट्स सीवी', 'athlete profile india', ...DEFAULT_KEYWORDS],
      ogType: 'profile'
    }
  }

  if (cleanPath === '/talent-scanner') {
    return {
      title: "Grassroots Sports Talent Scanner & Fitness Tests · KhelGrid (टैलेंट स्कैनर)",
      description: "Benchmark speed, agility, endurance, and vertical jump against national age-group percentiles with KhelGrid's Grassroots Talent Scanner.",
      canonicalUrl: 'https://khelgrid.com/talent-scanner',
      keywords: ['talent scanner sports', 'grassroots fitness test', 'athlete benchmark india', 'sports physical test', 'टैलेंट स्कैनर', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/khelchronicle') {
    return {
      title: "KhelChronicle — Sports Science & Open Research Repository · KhelGrid",
      description: "Open-access sports science, biomechanics, exercise physiology, sports nutrition, and sports medicine preprints and research advancing Indian athletics.",
      canonicalUrl: 'https://khelgrid.com/khelchronicle',
      keywords: ['sports science research', 'khelchronicle', 'sports biomechanics', 'exercise physiology', 'sports medicine india', 'sports nutrition preprints', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/cities') {
    return {
      title: "Sports Complexes & Venues Across Major Indian Cities · KhelGrid",
      description: "Discover top city sports complexes, stadiums, and multi-sport centres across Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, and 16+ metros.",
      canonicalUrl: 'https://khelgrid.com/cities',
      keywords: ['city sports complexes india', 'stadiums in india', 'bengaluru sports venues', 'delhi sports complex', 'mumbai turf', 'hyderabad badminton', ...DEFAULT_KEYWORDS],
      ogType: 'place'
    }
  }

  if (cleanPath === '/search') {
    return {
      title: "Search Sports, Academies, Venues & Trials Across India · KhelGrid (खोजें)",
      description: "Unified global search for sports academies, turf booking, open trials, pickup games, tournaments, coaches, and sports science research across India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/search',
      keywords: ['search sports india', 'find turf near me', 'find sports academy', 'sports trial search', 'khelgrid search', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  // Fallback for other standard pages
  const label = cleanPath.slice(1).replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return {
    title: `${label} · KhelGrid (खेलग्रिड)`,
    description: `Explore ${label} on KhelGrid — India's premier grassroots sports platform connecting players, venues, academies, and tournaments.`,
    canonicalUrl: `https://khelgrid.com${cleanPath}`,
    keywords: DEFAULT_KEYWORDS,
    ogType: 'website'
  }
}

export function updatePageSeoMetadata(config: PageSeoConfig): () => void {
  if (typeof document === 'undefined') return () => {}

  const previousTitle = document.title
  document.title = config.title

  function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    let element = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attrName, attrValue)
      document.head.appendChild(element)
    }
    element.content = content
  }

  function setLinkTag(rel: string, href: string) {
    let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (!element) {
      element = document.createElement('link')
      element.rel = rel
      document.head.appendChild(element)
    }
    element.href = href
  }

  setMetaTag('name', 'description', config.description)
  if (config.keywords && config.keywords.length > 0) {
    setMetaTag('name', 'keywords', config.keywords.join(', '))
  }

  setLinkTag('canonical', config.canonicalUrl)

  // Open Graph
  setMetaTag('property', 'og:title', config.title)
  setMetaTag('property', 'og:description', config.description)
  setMetaTag('property', 'og:url', config.canonicalUrl)
  setMetaTag('property', 'og:type', config.ogType || 'website')
  setMetaTag('property', 'og:site_name', 'KhelGrid (खेलग्रिड)')
  if (config.image) {
    setMetaTag('property', 'og:image', config.image)
  }

  // Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image')
  setMetaTag('name', 'twitter:title', config.title)
  setMetaTag('name', 'twitter:description', config.description)
  if (config.image) {
    setMetaTag('name', 'twitter:image', config.image)
  }

  // Schema.org JSON-LD
  let scriptElement = document.getElementById('khelgrid-jsonld') as HTMLScriptElement | null
  if (config.jsonLd) {
    if (!scriptElement) {
      scriptElement = document.createElement('script')
      scriptElement.id = 'khelgrid-jsonld'
      scriptElement.type = 'application/ld+json'
      document.head.appendChild(scriptElement)
    }
    scriptElement.textContent = JSON.stringify(config.jsonLd)
  } else if (scriptElement) {
    scriptElement.remove()
  }

  // Cleanup on unmount
  return () => {
    document.title = previousTitle
  }
}
