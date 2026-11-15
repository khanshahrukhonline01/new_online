/**
 * Comprehensive SEO & Structured Data Utility for KhelGrid.
 * Injects document titles, canonical URLs, OpenGraph/Twitter card meta tags,
 * and Schema.org JSON-LD structured data to maximize organic ranking,
 * vernacular discoverability, and eliminate search engine thin-content penalties.
 * Optimized for mobile SERP character constraints (<65 chars title) and high-CTR conversion.
 */

import { ALL_INDIAN_CITIES } from '../components/citiesData'

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
      title: 'Sports Trials & Opportunities in India · KhelGrid',
      description: "Explore published sports trials, combines, camps and scholarships. Review each listing's source, dates and eligibility, and confirm current details with the organiser before applying.",
      canonicalUrl: 'https://khelgrid.com/opportunities',
      keywords: ['sports trials india', 'cricket trials', 'football selection trials', 'sports combines india', 'sports camps india', 'sports scholarships india', 'ट्रायल', 'खेल प्रतियोगिता', 'open sports trials', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', '@id': 'https://khelgrid.com/opportunities#list', name: 'Published Sports Trials & Opportunities · KhelGrid', description: 'Published sports trials, combines, camps and scholarships. Confirm current details with each organiser.', url: 'https://khelgrid.com/opportunities' },
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
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/sports#list',
            name: 'Explore 34+ Sports & Olympic Games · KhelGrid (सभी खेल)',
            description: 'Explore 34+ Olympic, school, and desi sports in India including Cricket, Football, Badminton, Kabaddi, Wrestling, Athletics, and Pickleball on KhelGrid.',
            url: 'https://khelgrid.com/sports',
          },
        ],
      },
    }
  }

  if (cleanPath === '/live' || cleanPath === '/live-scores') {
    return {
      title: "Live Sports Scores & Match Centre · KhelGrid",
      description: "Follow cricket and football score updates when connected scoreboard feeds provide current data. Community scorekeeper entries are separate from external scoreboard results.",
      canonicalUrl: 'https://khelgrid.com/live',
      keywords: [
        'live cricket score',
        'live football score',
        'live sports scores india',
        'cricket match centre',
        'sports score updates',
        'लाइव क्रिकेट स्कोर',
        'लाइव स्कोर',
        ...DEFAULT_KEYWORDS,
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': 'https://khelgrid.com/live#webpage',
        url: 'https://khelgrid.com/live',
        name: 'Live Sports Scores & Match Centre · KhelGrid',
        description: 'Follow cricket and football score updates when connected scoreboard feeds provide current data.',
        isPartOf: {
          '@type': 'WebSite',
          '@id': 'https://khelgrid.com/#website',
          name: 'KhelGrid',
          url: 'https://khelgrid.com',
        },
        about: [
          { '@type': 'Thing', name: 'Cricket' },
          { '@type': 'Thing', name: 'Football' },
          { '@type': 'Thing', name: 'Live Sports Scores' },
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
      ogType: 'place',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/cities#list',
            name: 'Sports Complexes & Venues in India · KhelGrid (खेल परिसर)',
            description: 'Discover premier sports complexes, SAI stadiums, and multi-sport centres across Delhi NCR, Mumbai, Bengaluru, Hyderabad, Kolkata, Pune, and 53+ Indian cities.',
            url: 'https://khelgrid.com/cities',
          },
        ],
      },
    }
  }

  if (cleanPath === '/search') {
    return {
      title: "Search Sports, Turfs, Academies & Trials · KhelGrid (खोजें)",
      description: "Unified global search for sports academies, turf booking, open trials, pickup games, tournaments, coaches, and sports science research across India on KhelGrid.",
      canonicalUrl: 'https://khelgrid.com/search',
      keywords: ['search sports india', 'find turf near me', 'find sports academy', 'sports trial search', 'khelgrid search', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SearchResultsPage',
            '@id': 'https://khelgrid.com/search#webpage',
            name: 'Search Sports, Turfs, Academies & Trials · KhelGrid (खोजें)',
            url: 'https://khelgrid.com/search',
          },
        ],
      },
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
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/coaches#list',
            name: 'Verified Sports Coaches Directory · KhelGrid (प्रमाणित कोच)',
            description: 'Search and connect directly with verified sports coaches across India certified by SAI NIS Patiala, BCCI, AIFF, and BWF.',
            url: 'https://khelgrid.com/coaches',
          },
        ],
      },
    }
  }

  if (cleanPath === '/events' || cleanPath === '/tournaments') {
    return {
      title: "Tournaments & National Sports Events · KhelGrid (प्रतियोगिताएं)",
      description: "Explore verified Indian sports tournaments, SGFI school games, Khelo India youth competitions, senior national meets, and state ranking events with official rulebooks and prize money.",
      canonicalUrl: 'https://khelgrid.com/events',
      keywords: ['sports tournaments india', 'sgfi national school games', 'khelo india youth games 2026', 'state athletics championship', 'badminton tournament india', 'subroto cup football', 'खेल प्रतियोगिताएं', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            '@id': 'https://khelgrid.com/events#list',
            name: 'Tournaments & National Sports Events · KhelGrid (प्रतियोगिताएं)',
            description: 'Explore verified Indian sports tournaments, SGFI school games, Khelo India youth competitions, senior national meets, and state ranking events.',
            url: 'https://khelgrid.com/events',
          },
        ],
      },
    }
  }

  if (cleanPath === '/scout-portal' || cleanPath === '/scout') {
    return {
      title: "Scout Portal & Athlete Workbench · KhelGrid (स्काउट पोर्टल)",
      description: "Dedicated talent workbench for SAI selectors, NIS Patiala certified coaches, and pro league scouts. Filter verified grassroots athletes by normative biometrics, physical test percentiles, and achievements.",
      canonicalUrl: 'https://khelgrid.com/scout-portal',
      keywords: ['sports talent scouting india', 'sai talent identification', 'nis patiala scout workbench', 'grassroots athlete database', 'yo-yo test percentile', 'स्काउट पोर्टल', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': 'https://khelgrid.com/scout-portal#app',
            name: 'Scout Portal & Athlete Workbench · KhelGrid (स्काउट पोर्टल)',
            url: 'https://khelgrid.com/scout-portal',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'All',
            description: 'Dedicated talent workbench for SAI selectors, NIS Patiala certified coaches, and pro league scouts.',
          },
        ],
      },
    }
  }

  if (cleanPath === '/verification' || cleanPath === '/verify-athlete') {
    return {
      title: "Athlete Verification & Badge Desk · KhelGrid (सत्यापन डेस्क)",
      description: "Authenticate age compliance, federation UIDs (AFI, BAI, AIFF, BCCI, SGFI), and state medal certificates. Protect yourself from age-fraud and earn your verified KhelGrid badge.",
      canonicalUrl: 'https://khelgrid.com/verification',
      keywords: ['athlete verification badge', 'afi athlete uid check', 'bai registration verification', 'sports certificate verification', 'age fraud prevention in sports', 'खिलाड़ी सत्यापन', ...DEFAULT_KEYWORDS],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Service',
            '@id': 'https://khelgrid.com/verification#service',
            name: 'Athlete Verification & Badge Desk · KhelGrid (सत्यापन डेस्क)',
            serviceType: 'Sports Credential & Age Verification Service',
            description: 'Authenticate age compliance, federation UIDs, and state medal certificates to eliminate age-fraud in Indian sports.',
            url: 'https://khelgrid.com/verification',
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

  // Dynamic City Sports Hubs (/cities/:slug and /city/:slug)
  if (cleanPath.startsWith('/cities/') || cleanPath.startsWith('/city/')) {
    const slug = cleanPath.startsWith('/cities/')
      ? cleanPath.slice('/cities/'.length).trim()
      : cleanPath.slice('/city/'.length).trim()

    if (slug) {
      const city = ALL_INDIAN_CITIES.find(
        c => c.slug.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase() === slug.toLowerCase(),
      )
      const cityName = city ? city.name : slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const stateName = city ? city.state : 'India'
      const canonicalUrl = `https://khelgrid.com/cities/${slug.toLowerCase()}`
      const title = `${cityName} Sports Hub: Turfs, Academies & Trials · KhelGrid`
      const description = `Explore sports grounds, box cricket turfs, academies, and selection trials in ${cityName}, ${stateName} on KhelGrid.`

      return {
        title,
        description,
        canonicalUrl,
        keywords: [
          `cricket turf in ${cityName.toLowerCase()}`,
          `cricket academy ${cityName.toLowerCase()}`,
          `sports complex ${cityName.toLowerCase()}`,
          `badminton court ${cityName.toLowerCase()}`,
          `sports trials ${cityName.toLowerCase()}`,
          `box cricket ${cityName.toLowerCase()}`,
          `turf near me ${cityName.toLowerCase()}`,
          `khelo india ${cityName.toLowerCase()}`,
          `sports in ${cityName.toLowerCase()}`,
          `${cityName.toLowerCase()} sports hub`,
          `खेलग्रिड ${cityName}`,
          ...DEFAULT_KEYWORDS,
        ],
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsActivityLocation',
              '@id': `${canonicalUrl}#location`,
              name: `${cityName} Sports Hub · KhelGrid`,
              description,
              url: canonicalUrl,
              address: {
                '@type': 'PostalAddress',
                addressLocality: cityName,
                addressRegion: stateName,
                addressCountry: 'IN',
              },
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://khelgrid.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Cities',
                  item: 'https://khelgrid.com/cities',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: `${cityName} Sports Hub`,
                  item: canonicalUrl,
                },
              ],
            },
          ],
        },
      }
    }
  }

  // Dynamic Sport Directories (/sports/:slug)
  if (cleanPath.startsWith('/sports/') && cleanPath !== '/sports') {
    const slug = cleanPath.slice('/sports/'.length).trim()
    if (slug) {
      const sportName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const canonicalUrl = `https://khelgrid.com/sports/${slug.toLowerCase()}`
      const title = `${sportName} in India: Trials, Academies & Turfs · KhelGrid`
      const description = `Discover certified ${sportName} academies, selection trials, coaches, tournament fixtures, and venues across India on KhelGrid.`

      return {
        title,
        description,
        canonicalUrl,
        keywords: [
          `${slug.toLowerCase()} in india`,
          `${slug.toLowerCase()} trials`,
          `${slug.toLowerCase()} academy near me`,
          `${slug.toLowerCase()} coaching`,
          `${slug.toLowerCase()} tournaments india`,
          `${slug.toLowerCase()} turf booking`,
          `khelo india ${slug.toLowerCase()}`,
          `sports in india`,
          `खेलग्रिड ${sportName}`,
          ...DEFAULT_KEYWORDS,
        ],
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsEvent',
              '@id': `${canonicalUrl}#hub`,
              name: `${sportName} in India · KhelGrid`,
              description,
              url: canonicalUrl,
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://khelgrid.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Sports',
                  item: 'https://khelgrid.com/sports',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: sportName,
                  item: canonicalUrl,
                },
              ],
            },
          ],
        },
      }
    }
  }

  // Dynamic Venues & Turfs Detail Pages (/venues/:slug, /book/:slug)
  if (
    (cleanPath.startsWith('/venues/') && cleanPath !== '/venues') ||
    (cleanPath.startsWith('/book/') && cleanPath !== '/book')
  ) {
    const slug = (cleanPath.startsWith('/venues/') ? cleanPath.slice('/venues/'.length) : cleanPath.slice('/book/'.length)).replace(/\/book$/, '').trim()
    if (slug) {
      const venueName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const canonicalUrl = `https://khelgrid.com/venues/${slug.toLowerCase()}`
      const title = `${venueName} · Sports Turf Booking | KhelGrid`
      const description = `Book slots, turf surfaces, floodlights, and facilities at ${venueName} on KhelGrid.`

      return {
        title,
        description,
        canonicalUrl,
        keywords: [venueName, 'sports turf booking', 'cricket turf near me', 'box cricket court', 'turf booking', ...DEFAULT_KEYWORDS],
        ogType: 'place',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsActivityLocation',
              '@id': `${canonicalUrl}#location`,
              name: `${venueName} · KhelGrid`,
              url: canonicalUrl,
              description,
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://khelgrid.com' },
                { '@type': 'ListItem', position: 2, name: 'Turfs & Venues', item: 'https://khelgrid.com/venues' },
                { '@type': 'ListItem', position: 3, name: venueName, item: canonicalUrl },
              ],
            },
          ],
        },
      }
    }
  }

  // Dynamic Sports Academies Detail Pages (/academies/:slug, /train/:slug)
  if (
    (cleanPath.startsWith('/academies/') && cleanPath !== '/academies') ||
    (cleanPath.startsWith('/train/') && cleanPath !== '/train')
  ) {
    const slug = (cleanPath.startsWith('/academies/') ? cleanPath.slice('/academies/'.length) : cleanPath.slice('/train/'.length)).replace(/\/enrol$/, '').trim()
    if (slug) {
      const academyName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const canonicalUrl = `https://khelgrid.com/academies/${slug.toLowerCase()}`
      const title = `${academyName} · Sports Academy | KhelGrid`
      const description = `Explore certified coaching, facilities, timings, and admissions for ${academyName} on KhelGrid.`

      return {
        title,
        description,
        canonicalUrl,
        keywords: [academyName, 'sports academy near me', 'cricket academy', 'khelo india academy', 'sports coaching', ...DEFAULT_KEYWORDS],
        ogType: 'place',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsClub',
              '@id': `${canonicalUrl}#club`,
              name: `${academyName} · KhelGrid`,
              url: canonicalUrl,
              description,
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://khelgrid.com' },
                { '@type': 'ListItem', position: 2, name: 'Sports Academies', item: 'https://khelgrid.com/academies' },
                { '@type': 'ListItem', position: 3, name: academyName, item: canonicalUrl },
              ],
            },
          ],
        },
      }
    }
  }

  // Dynamic Selection Trials & Opportunities (/opportunities/:slug, /trials/:slug, /trial/:slug)
  if (
    (cleanPath.startsWith('/opportunities/') && cleanPath !== '/opportunities') ||
    (cleanPath.startsWith('/trials/') && cleanPath !== '/trials') ||
    (cleanPath.startsWith('/trial/') && cleanPath !== '/trial')
  ) {
    const slug = cleanPath
      .replace(/^\/(opportunities|trials|trial)\//, '')
      .replace(/\/apply$/, '')
      .replace(/^t-/, '')
      .trim()
    if (slug) {
      const oppTitle = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const canonicalUrl = `https://khelgrid.com/opportunities/${slug.toLowerCase()}`
      const title = `${oppTitle} · Selection Trials | KhelGrid`
      const description = `Official eligibility, documents, trial dates, and registration for ${oppTitle} on KhelGrid.`

      return {
        title,
        description,
        canonicalUrl,
        keywords: [oppTitle, 'selection trials 2026', 'sports trials india', 'open trials', ...DEFAULT_KEYWORDS],
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsEvent',
              '@id': `${canonicalUrl}#event`,
              name: oppTitle,
              url: canonicalUrl,
              description,
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://khelgrid.com' },
                { '@type': 'ListItem', position: 2, name: 'Selection Trials', item: 'https://khelgrid.com/opportunities' },
                { '@type': 'ListItem', position: 3, name: oppTitle, item: canonicalUrl },
              ],
            },
          ],
        },
      }
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

  // Open Graph Social Cards
  const socialImage = config.image || 'https://khelgrid.com/assets/kg-logo.webp'
  setMetaTag('property', 'og:title', config.title)
  setMetaTag('property', 'og:description', config.description)
  setMetaTag('property', 'og:url', config.canonicalUrl)
  setMetaTag('property', 'og:type', config.ogType || 'website')
  setMetaTag('property', 'og:site_name', 'KhelGrid (खेलग्रिड)')
  setMetaTag('property', 'og:image', socialImage)
  setMetaTag('property', 'og:image:width', '1200')
  setMetaTag('property', 'og:image:height', '630')
  setMetaTag('property', 'og:image:alt', config.title)

  // Twitter Social Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image')
  setMetaTag('name', 'twitter:site', '@KhelGrid')
  setMetaTag('name', 'twitter:creator', '@KhelGrid')
  setMetaTag('name', 'twitter:title', config.title)
  setMetaTag('name', 'twitter:description', config.description)
  setMetaTag('name', 'twitter:image', socialImage)
  setMetaTag('name', 'twitter:image:alt', config.title)

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
