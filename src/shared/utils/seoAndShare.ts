/**
 * Comprehensive SEO & Structured Data Utility for KhelGrid.
 * Injects document titles, canonical URLs, OpenGraph/Twitter card meta tags,
 * and Schema.org JSON-LD structured data to maximize organic ranking,
 * vernacular discoverability, and eliminate search engine thin-content penalties.
 * Optimized for mobile SERP character constraints (<65 chars title) and high-CTR conversion.
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
  'క్రీడలు', 'ఆటలు', 'ಕ್ರೀಡೆಗಳು', 'ರમતಗમત', 'ખેલ મહાકુંભ', 'ਖੇਡਾਂ', 'കായിക',
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
      title: "KhelGrid (खेलग्रिड) — India's Grassroots Sports Platform",
      description: "Discover verified sports academies, book turfs & courts, find open selection trials, join pickup games, and follow live cricket scores across India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/',
      keywords: DEFAULT_KEYWORDS,
      ogType: 'website',
      image: 'https://khelgrid.com/assets/kg-logo.webp',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://khelgrid.com/#website',
            url: 'https://khelgrid.com',
            name: 'KhelGrid',
            alternateName: ['खेलग्रिड', 'Khel Grid', 'Khel', 'KhelGrid Platform', 'Khelo India Sports Platform'],
            description: "India's premier sports discovery and grassroots athletic network for turfs, academies, trials, and live scores.",
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://khelgrid.com/search?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      },
    }
  }

  if (cleanPath === '/play') {
    return {
      title: "Play Sports & Join Pickup Matches · KhelGrid (खेलें)",
      description: "Find and join local sports pickup games, box cricket, futsal, badminton, and pickleball matches across Indian cities. Host your own game or join players nearby.",
      canonicalUrl: 'https://khelgrid.com/play',
      keywords: ['play sports near me', 'pickup games india', 'box cricket match', 'badminton games near me', 'futsal pickup game', 'join football match', 'खेलें', 'मैच खोजें', 'local sports community', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/opportunities' || cleanPath === '/trials' || cleanPath === '/combines' || cleanPath === '/scholarships' || cleanPath === '/camps') {
    return {
      title: "Sports Trials, Tournaments & Camps 2026 · KhelGrid (ट्रायल)",
      description: "Discover verified sports selection trials, national tournaments, SAI NCOE camps, and athletic scholarships across Indian states. Filter by sport and age group.",
      canonicalUrl: 'https://khelgrid.com/opportunities',
      keywords: ['sports trials 2026', 'cricket trials near me', 'football selection trials', 'wushu trials 2026', 'kabaddi trials 2026', 'badminton tournaments india', 'sports scholarships', 'sai ncoe selection trials', 'ट्रायल', 'खेल प्रतियोगिता', 'open sports trials', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/opportunities#list',
            name: 'Sports Trials, Tournaments & Camps 2026 · KhelGrid (ट्रायल)',
            description: 'Discover verified sports selection trials, national tournaments, SAI NCOE camps, and athletic scholarships across India.',
            url: 'https://khelgrid.com/opportunities',
          },
        ],
      },
    }
  }

  if (cleanPath === '/venues' || cleanPath === '/book') {
    return {
      title: "Book Sports Turfs & Box Cricket Courts · KhelGrid (टर्फ बुकिंग)",
      description: "Book verified sports turfs, box cricket pitches, synthetic football grounds, and badminton courts with instant hourly slot booking across India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/venues',
      keywords: ['khel turf', 'grid turf booking', 'box cricket turf', 'book turf near me', 'cricket turf near me', 'sports turf booking', 'badminton court booking', 'football turf near me', 'swimming pool passes', 'टर्फ बुकिंग', 'मैदान बुकिंग', 'box cricket ground', 'turf booking app', ...DEFAULT_KEYWORDS],
      ogType: 'place',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Service',
            '@id': 'https://khelgrid.com/venues#service',
            name: 'KhelGrid Sports Venue & Turf Booking',
            serviceType: 'Sports Venue & Box Cricket Turf Reservation',
            description: 'Hourly synthetic turf booking, badminton court reservation, and swimming pool session booking across India.',
            url: 'https://khelgrid.com/venues',
            provider: {
              '@type': 'Organization',
              name: 'KhelGrid',
              url: 'https://khelgrid.com',
            },
          },
        ],
      },
    }
  }

  if (cleanPath === '/academies' || cleanPath === '/academy' || cleanPath === '/train') {
    return {
      title: "Sports Academies & SAI Coaching in India · KhelGrid (खेल अकादमी)",
      description: "Find verified sports academies, Khelo India accredited centers, SAI NCOE training hubs, cricket academies, and wrestling akhadas with fees and admissions.",
      canonicalUrl: 'https://khelgrid.com/academies',
      keywords: ['khelo india academy near me', 'sai ncoe academy', 'sports academy near me', 'cricket academy india', 'sai wrestling academy', 'badminton coaching centre', 'cricket academy kanpur', 'sports academy registration', 'football training academy', 'tennis academy', 'akhada wrestling', 'खेल अकादमी', 'sports coaching classes', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/academies#list',
            name: 'Sports Academies & SAI Coaching Centers in India · KhelGrid (खेल अकादमी)',
            description: 'Explore verified sports academies, Khelo India accredited centers, and SAI NCOE training hubs across India.',
            url: 'https://khelgrid.com/academies',
          },
        ],
      },
    }
  }

  if (cleanPath === '/sports') {
    return {
      title: "Explore 34+ Sports & Olympic Games · KhelGrid (सभी खेल)",
      description: "Explore 34+ Olympic, school, and desi sports in India including Cricket, Football, Badminton, Kabaddi, Wrestling, Athletics, and Pickleball on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/sports',
      keywords: ['sports in india', 'desi khel', 'olympic sports india', 'cricket', 'badminton', 'football', 'kabaddi', 'kho kho', 'athletics', 'wrestling', 'pickleball', 'सभी खेल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/live' || cleanPath === '/live-scores') {
    return {
      title: "Live Cricket Scores, WPL & ICC Match Center · KhelGrid (लाइव स्कोर)",
      description: "Fastest live cricket scores, WPL Women's Premier League, ICC tournaments, T20 leagues, ball-by-ball commentary, match scorecards, and local tournament updates on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/live',
      keywords: [
        'live cricket score wpl',
        'live cricket score icc',
        'wpl live score',
        't20 live score',
        'live cricket score',
        'live cricket khel',
        'khel box live match',
        'khel live score',
        'today wc cricket match',
        'ball by ball commentary',
        'live scorecards cricket',
        'cricket match center',
        'wpl 2026 live',
        'icc live score',
        'लाइव क्रिकेट स्कोर',
        'लाइव स्कोर',
        ...DEFAULT_KEYWORDS,
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': 'https://khelgrid.com/live#webpage',
            url: 'https://khelgrid.com/live',
            name: 'Live Cricket Scores, WPL & ICC Matches · KhelGrid (लाइव स्कोर)',
            description: "Fastest live cricket scores, WPL Women's Premier League, ICC tournaments, T20 leagues, ball-by-ball commentary, match scorecards, and local tournament updates on KhelGrid.",
            isPartOf: {
              '@type': 'WebSite',
              '@id': 'https://khelgrid.com/#website',
              name: 'KhelGrid',
              url: 'https://khelgrid.com',
            },
            about: [
              { '@type': 'Thing', name: 'Cricket' },
              { '@type': 'Thing', name: "Women's Premier League (WPL)" },
              { '@type': 'Thing', name: 'ICC Cricket' },
              { '@type': 'Thing', name: 'T20 Cricket' },
              { '@type': 'Thing', name: 'Live Sports Scores' },
            ],
          },
        ],
      },
    }
  }

  if (cleanPath === '/sports-cv' || cleanPath === '/start-from-zero') {
    return {
      title: "Athlete Sports CV & Khel ID Builder · KhelGrid (खेल आईडी)",
      description: "Build your verified Athlete Sports CV, digital Khel ID card, and sports portfolio on KhelGrid. Highlight match stats, trial history, and fitness benchmarks.",
      canonicalUrl: 'https://khelgrid.com/sports-cv',
      keywords: [
        'khel id',
        'sports cv',
        'create sports cv',
        'sports id card',
        'athlete resume builder',
        'khel id registration',
        'khel id card download',
        'athlete scout id',
        'डिजिटल खेल आईडी',
        'स्पोर्ट्स सीवी',
        'खेल आईडी',
        'athlete portfolio india',
        ...DEFAULT_KEYWORDS,
      ],
      ogType: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': 'https://khelgrid.com/sports-cv#app',
            name: 'Athlete Sports CV & Khel ID Builder · KhelGrid (खेल आईडी)',
            url: 'https://khelgrid.com/sports-cv',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'All',
            description: 'Build your verified Athlete Sports CV, digital Khel ID card, and sports portfolio on KhelGrid.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
            },
          },
        ],
      },
    }
  }

  if (cleanPath === '/talent-scanner') {
    return {
      title: "Sports Talent Scanner & Fitness Tests · KhelGrid (टैलेंट स्कैनर)",
      description: "Benchmark speed, agility, endurance, and vertical jump against national age-group percentiles with KhelGrid's Grassroots Talent Scanner.",
      canonicalUrl: 'https://khelgrid.com/talent-scanner',
      keywords: ['talent scanner sports', 'grassroots fitness test', 'athlete benchmark india', 'sports physical test', 'टैलेंट स्कैनर', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/khelchronicle') {
    return {
      title: "KhelChronicle — Sports Science Research · KhelGrid (खेल विज्ञान)",
      description: "Diamond Open Access repository for Indian sports science, cricket biomechanics, Yo-Yo test normative benchmarks, and sports medicine preprints on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/khelchronicle',
      keywords: ['khel chronicle', 'sports science research india', 'cricket biomechanics', 'yo-yo test norms indian athletes', 'fast bowling lumbar stress', 'exercise physiology', 'sports medicine preprints', 'खेल विज्ञान शोध', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'DataCatalog',
            '@id': 'https://khelgrid.com/khelchronicle#catalog',
            name: 'KhelChronicle Open Sports Research Archive',
            url: 'https://khelgrid.com/khelchronicle',
            description: 'Diamond Open Access repository for sports science, biomechanics, exercise physiology, and sports medicine preprints advancing Indian athletics.',
            isAccessibleForFree: true,
            license: 'https://creativecommons.org/licenses/by/4.0/',
          },
        ],
      },
    }
  }

  if (cleanPath === '/cities') {
    return {
      title: "Sports Complexes & Venues in India · KhelGrid (खेल परिसर)",
      description: "Discover premier sports complexes, SAI stadiums, and multi-sport centres across Delhi NCR, Mumbai, Bengaluru, Hyderabad, Kolkata, Pune, and 53+ Indian cities.",
      canonicalUrl: 'https://khelgrid.com/cities',
      keywords: ['sports complexes in delhi', 'bengaluru sports venues', 'stadiums in india', 'delhi sports complex', 'mumbai sports ground', 'hyderabad badminton', 'खेल परिसर', ...DEFAULT_KEYWORDS],
      ogType: 'place'
    }
  }

  if (cleanPath === '/search') {
    return {
      title: "Search Sports, Turfs, Academies & Trials · KhelGrid (खोजें)",
      description: "Unified global search for sports academies, turf booking, open trials, pickup games, tournaments, coaches, and sports science research across India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/search',
      keywords: ['search sports india', 'find turf near me', 'find sports academy', 'sports trial search', 'khelgrid search', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/tools' || cleanPath === '/sports-tools' || cleanPath.startsWith('/tools/')) {
    return {
      title: "Athlete Sports Tools & Trial Calculators · KhelGrid (खेल टूल्स)",
      description: "Free interactive sports performance calculators, trial readiness scores, BCCI/SAI age cut-off eligibility, VO2 max tests, and turf cost splitters on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/tools',
      keywords: ['athlete calculators', 'trial readiness score', 'bcci age eligibility calculator', 'vo2 max estimator', 'turf match fee splitter', 'sports cv checklist', 'sports tools india', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': 'https://khelgrid.com/tools#app',
            name: 'Athlete Sports Tools & Trial Calculators · KhelGrid (खेल टूल्स)',
            url: 'https://khelgrid.com/tools',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'All',
            description: 'Free interactive sports performance calculators, trial readiness scores, BCCI/SAI age cut-off eligibility, VO2 max tests, and turf cost splitters.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
            },
          },
        ],
      },
    }
  }

  if (cleanPath === '/pricing' || cleanPath === '/memberships' || cleanPath === '/pro') {
    return {
      title: "Pricing & Sports Memberships · KhelGrid (खेलग्रिड सदस्यता)",
      description: "Simple, transparent sports memberships for athletes, sports academies, turf venues, and trial organizers across India. Unlock verified scout badges, admissions CRM, and 0% booking commission.",
      canonicalUrl: 'https://khelgrid.com/pricing',
      keywords: ['sports membership india', 'khelgrid pro athlete', 'academy listing pricing', 'turf booking zero commission', 'trial boost price', 'खेलग्रिड मेम्बरशिप', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/saved') {
    return {
      title: "Saved Trials, Academies & Calendar · KhelGrid (सहेजे गए)",
      description: "Manage your bookmarked selection trials, sports academies, turf venues, pickup games, and KhelChronicle research papers. Track registration deadlines and export to calendar (.ics / Google Calendar).",
      canonicalUrl: 'https://khelgrid.com/saved',
      keywords: ['saved sports trials', 'bookmarked academies', 'trial calendar export', 'sports deadline tracker', 'सहेजे गए ट्रायल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/coaches') {
    return {
      title: "Verified Sports Coaches Directory · KhelGrid (प्रमाणित कोच)",
      description: "Search and connect directly with verified sports coaches across India. Filter by SAI NIS Patiala, BCCI, AIFF, and BWF certifications, transparent monthly coaching fees, and student track records.",
      canonicalUrl: 'https://khelgrid.com/coaches',
      keywords: ['certified sports coaches india', 'cricket coach near me', 'badminton coach bengaluru', 'aiff certified football coach', 'sai nis patiala coach', 'sports coaching fees', 'प्रमाणित खेल कोच', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/events' || cleanPath === '/tournaments') {
    return {
      title: "Tournaments & National Sports Events · KhelGrid (प्रतियोगिताएं)",
      description: "Explore verified Indian sports tournaments, SGFI school games, Khelo India youth competitions, senior national meets, and state ranking events with official rulebooks and prize money.",
      canonicalUrl: 'https://khelgrid.com/events',
      keywords: ['sports tournaments india', 'sgfi national school games', 'khelo india youth games 2026', 'state athletics championship', 'badminton tournament india', 'subroto cup football', 'खेल प्रतियोगिताएं', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/scout-portal' || cleanPath === '/scout') {
    return {
      title: "Scout Portal & Athlete Workbench · KhelGrid (स्काउट पोर्टल)",
      description: "Dedicated talent workbench for SAI selectors, NIS Patiala certified coaches, and pro league scouts. Filter verified grassroots athletes by normative biometrics, physical test percentiles, and achievements.",
      canonicalUrl: 'https://khelgrid.com/scout-portal',
      keywords: ['sports talent scouting india', 'sai talent identification', 'nis patiala scout workbench', 'grassroots athlete database', 'yo-yo test percentile', 'स्काउट पोर्टल', ...DEFAULT_KEYWORDS],
      ogType: 'website'
    }
  }

  if (cleanPath === '/verification' || cleanPath === '/verify-athlete') {
    return {
      title: "Athlete Verification & Badge Desk · KhelGrid (सत्यापन डेस्क)",
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
  setMetaTag('name', 'robots', config.robots || 'index, follow')
  setMetaTag('name', 'googlebot', config.robots || 'index, follow')
  setMetaTag('name', 'bingbot', config.robots || 'index, follow')
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
