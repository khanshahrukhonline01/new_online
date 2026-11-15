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
  robots?: string
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

  if (cleanPath === '/admin/control') {
    return {
      title: 'Restricted Moderator Control Panel · KhelGrid',
      description: 'Restricted KhelGrid moderation workspace.',
      canonicalUrl: 'https://khelgrid.com/admin/control',
      robots: 'noindex, nofollow, noarchive',
    }
  }

  if (cleanPath === '/') {
    return {
      title: "KhelGrid | Sports Trials, Venues & Athlete Resources in India",
      description: "Explore published sports trials and opportunities, sports venues, coaching listings, athlete CV tools and KhelChronicle research. Confirm details with organisers and providers.",
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
      title: "Sports Trials & Opportunities in India · KhelGrid (खेल ट्रायल)",
      description: "Explore published sports trials, competitions, camps and scholarships. Check each listing's source, dates, eligibility and application details with the organiser before applying.",
      canonicalUrl: 'https://khelgrid.com/opportunities',
      keywords: ['sports trials india', 'cricket trials', 'football selection trials', 'badminton tournaments india', 'sports scholarships india', 'ट्रायल', 'खेल प्रतियोगिता', 'open sports trials', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/venues' || cleanPath === '/book') {
    return {
      title: "Sports Venues, Turfs & Grounds in India · KhelGrid",
      description: "Discover published sports venue information, including location, facilities and available contact details. Confirm access, pricing and availability directly with each venue.",
      canonicalUrl: 'https://khelgrid.com/venues',
      keywords: ['sports venues india', 'sports turf', 'box cricket ground', 'football turf', 'badminton court', 'sports ground', 'टर्फ', 'खेल मैदान', ...DEFAULT_KEYWORDS],
      ogType: 'place'
    }
  }

  if (cleanPath === '/academies' || cleanPath === '/academy' || cleanPath === '/train') {
    return {
      title: "Sports Academies & Coaching in India · KhelGrid (खेल अकादमी)",
      description: "Explore published sports academy and coaching listings. Review the sports, location and available programme information, then confirm coaches, fees and admissions directly with the academy.",
      canonicalUrl: 'https://khelgrid.com/academies',
      keywords: ['sports academy india', 'cricket academy', 'badminton coaching', 'football training academy', 'tennis academy', 'wrestling akhada', 'खेल अकादमी', 'sports coaching', ...DEFAULT_KEYWORDS],
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
      title: "Sports Match Centre · KhelGrid",
      description: "Explore the KhelGrid sports match centre. Live score coverage is shown only when a connected, current match-data source is available.",
      canonicalUrl: 'https://khelgrid.com/live',
      robots: 'noindex, follow',
      keywords: ['sports match centre', 'sports scores', 'लाइव स्कोर', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/sports-cv' || cleanPath === '/start-from-zero') {
    return {
      title: "Create an Athlete Sports CV · KhelGrid (खिलाड़ी स्पोर्ट्स CV)",
      description: "Prepare a structured athlete CV to present your sporting background, experience, achievements and goals. Athlete-entered information is not an independently verified credential.",
      canonicalUrl: 'https://khelgrid.com/sports-cv',
      keywords: ['sports cv maker', 'athlete resume builder', 'sports portfolio', 'athlete profile india', 'स्पोर्ट्स सीवी', 'खिलाड़ी प्रोफाइल', ...DEFAULT_KEYWORDS],
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

  if (cleanPath === '/tools' || cleanPath === '/sports-tools' || cleanPath.startsWith('/tools/')) {
    return {
      title: "Athlete Sports Tools, Calculators & Trial Planners · KhelGrid (खेल टूल्स व कैलकुलेटर)",
      description: "Free interactive sports performance calculators, trial readiness scores, BCCI/SAI age cut-off eligibility, VO2 max tests, and turf cost splitters for Indian athletes and coaches.",
      canonicalUrl: 'https://khelgrid.com/tools',
      keywords: ['athlete calculators', 'trial readiness score', 'bcci age eligibility calculator', 'vo2 max estimator', 'turf match fee splitter', 'sports cv checklist', 'sports tools india', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/pricing' || cleanPath === '/memberships' || cleanPath === '/pro') {
    return {
      title: "Pricing & Memberships · KhelGrid (खेलग्रिड सदस्यता व शुल्क)",
      description: "Simple, transparent sports memberships for athletes, sports academies, turf venues, and trial organizers across India. Unlock verified scout badges, admissions CRM, and 0% booking commission.",
      canonicalUrl: 'https://khelgrid.com/pricing',
      keywords: ['sports membership india', 'khelgrid pro athlete', 'academy listing pricing', 'turf booking zero commission', 'trial boost price', 'खेलग्रिड मेम्बरशिप', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/saved') {
    return {
      title: "Saved Items & Trial Deadline Planner · KhelGrid (सहेजे गए ट्रायल व अकादमियां)",
      description: "Manage your bookmarked selection trials, sports academies, turf venues, pickup games, and KhelChronicle research papers. Track registration deadlines and export to calendar (.ics / Google Calendar).",
      canonicalUrl: 'https://khelgrid.com/saved',
      keywords: ['saved sports trials', 'bookmarked academies', 'trial calendar export', 'sports deadline tracker', 'सहेजे गए ट्रायल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/coaches') {
    return {
      title: "Certified Indian Sports Coaches Directory · KhelGrid (प्रमाणित खेल कोच)",
      description: "Search and connect directly with verified sports coaches across India. Filter by SAI NIS Patiala, BCCI, AIFF, and BWF certifications, transparent monthly coaching fees, and student track records.",
      canonicalUrl: 'https://khelgrid.com/coaches',
      keywords: ['certified sports coaches india', 'cricket coach near me', 'badminton coach bengaluru', 'aiff certified football coach', 'sai nis patiala coach', 'sports coaching fees', 'प्रमाणित खेल कोच', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/events' || cleanPath === '/tournaments') {
    return {
      title: "National Events & State Tournaments Calendar · KhelGrid (राष्ट्रीय व राज्य खेल प्रतियोगिताएं)",
      description: "Explore verified Indian sports tournaments, SGFI school games, Khelo India youth competitions, senior national meets, and state ranking events with official rulebooks and prize money.",
      canonicalUrl: 'https://khelgrid.com/events',
      keywords: ['sports tournaments india', 'sgfi national school games', 'khelo india youth games 2026', 'state athletics championship', 'badminton tournament india', 'subroto cup football', 'खेल प्रतियोगिताएं', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/scout-portal' || cleanPath === '/scout') {
    return {
      title: "Scout Portal & Verified Athlete Workbench · KhelGrid (स्काउट पोर्टल)",
      description: "Dedicated talent workbench for SAI selectors, NIS Patiala certified coaches, and pro league scouts. Filter verified grassroots athletes by normative biometrics, physical test percentiles, and achievements.",
      canonicalUrl: 'https://khelgrid.com/scout-portal',
      keywords: ['sports talent scouting india', 'sai talent identification', 'nis patiala scout workbench', 'grassroots athlete database', 'yo-yo test percentile', 'स्काउट पोर्टल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/verification' || cleanPath === '/verify-athlete') {
    return {
      title: "Athlete Verification Badge Desk · KhelGrid (खिलाड़ी सत्यापन डेस्क)",
      description: "Authenticate age compliance, federation UIDs (AFI, BAI, AIFF, BCCI, SGFI), and state medal certificates. Protect yourself from age-fraud and earn your verified KhelGrid badge.",
      canonicalUrl: 'https://khelgrid.com/verification',
      keywords: ['athlete verification badge', 'afi athlete uid check', 'bai registration verification', 'sports certificate verification', 'age fraud prevention in sports', 'खिलाड़ी सत्यापन', ...DEFAULT_KEYWORDS],
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
  const robots = __KHELGRID_INDEXABLE__
    ? (config.robots || 'index, follow')
    : 'noindex, nofollow'
  setMetaTag('name', 'robots', robots)
  setMetaTag('name', 'googlebot', robots)
  setMetaTag('name', 'bingbot', robots)
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
