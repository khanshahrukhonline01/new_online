export interface SeoMetadata {
  title: string
  description: string
  canonicalUrl?: string
  ogType?: string
  ogImage?: string
  keywords?: string[]
  robots?: string
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
}

const SITE_ORIGIN = 'https://khelgrid.com'
const DEFAULT_TITLE =
  "KhelGrid (खेलग्रिड) — India's Premier Sports Platform | Play, Book Turfs, Academies, Trials & Live Scores"
const DEFAULT_DESCRIPTION =
  "KhelGrid (खेलग्रिड) is India's grassroots sports discovery platform for verified sports academies, turf & court booking, open selection trials, pickup games, coaches, and live scores across 30+ sports."
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/kg-logo.webp`

export const DEFAULT_KEYWORDS: string[] = [
  'KhelGrid',
  'खेलग्रिड',
  'sports in India',
  'sports academy near me',
  'turf booking near me',
  'open sports trials India',
  'pickup games India',
  'live sports scores India',
  'athlete sports CV',
  'Khelo India',
]

const ROUTE_SEO_MAP: Record<string, Omit<SeoMetadata, 'canonicalUrl'>> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
  },
  '/play': {
    title: 'Play · Find Local Pickup Games & Maidans | KhelGrid',
    description:
      'Join verified local pickup matches for cricket, football, badminton, basketball, pickleball and more across Indian cities on KhelGrid.',
  },
  '/venues': {
    title: 'Sports Venues · Book Turfs, Courts & Grounds | KhelGrid',
    description:
      'Discover and book verified box cricket turfs, football grounds, badminton courts, and sports complexes across India.',
  },
  '/academies': {
    title: 'Sports Academies · Verified Coaching & Training Centres | KhelGrid',
    description:
      'Browse verified cricket, football, badminton, athletics, and multi-sport coaching academies across India.',
  },
  '/opportunities': {
    title: 'Sports Trials & Opportunities · Open Selections & Scholarships | KhelGrid',
    description:
      'Find verified open selection trials, tournaments, scholarships, and grassroots combines across India.',
  },
  '/sports': {
    title: 'All Sports · 30+ Athletic Disciplines in India | KhelGrid',
    description:
      'Explore 30+ sports disciplines across India with academies, venues, trials, rules, and pathways.',
  },
  '/live': {
    title: 'Live Sports Scores & Match Centre | KhelGrid',
    description:
      'Follow grassroots tournaments, local league scorecards, and live sports updates on KhelGrid.',
  },
  '/sports-cv': {
    title: 'Sports CV Maker · Free Athlete Digital Dossier & Khel ID | KhelGrid',
    description:
      'Build a structured athlete Sports CV with verified match history, fitness benchmarks, and shareable QR player card.',
  },
  '/talent-scanner': {
    title: 'Talent Scanner · Grassroots Fitness & Combine Benchmarks | KhelGrid',
    description:
      'Measure sprint, agility, Yo-Yo endurance, and vertical jump metrics against normative grassroots sports benchmarks.',
  },
  '/khelchronicle': {
    title: 'KhelChronicle · Open Sports Science Research & Editorial | KhelGrid',
    description:
      'Read open-access sports science preprints, coaching methodology research, and Indian athletic performance studies.',
  },
  '/coaches': {
    title: 'Verified Sports Coaches & Mentors Directory | KhelGrid',
    description:
      'Connect with NIS-certified and grassroots sports coaches across cricket, badminton, football, athletics, and more.',
  },
  '/events': {
    title: 'Sports Tournaments & Events Across India | KhelGrid',
    description:
      'Discover grassroots tournaments, leagues, marathons, and inter-academy competitions near you.',
  },
  '/cities': {
    title: 'Sports Cities Directory · 50+ Indian Sports Hubs | KhelGrid',
    description:
      'Explore local turfs, sports complexes, academies, and open trials across 50+ Indian cities.',
  },
  '/pricing': {
    title: 'KhelGrid Plans & Memberships · Free Grassroots Access & Pro Tools',
    description:
      'Explore free directory listings and optional athlete, coach, and academy operations plans on KhelGrid.',
  },
  '/search': {
    title: 'Search KhelGrid · Sports, Venues, Academies & Trials',
    description:
      'Search across KhelGrid’s public directory of sports, venues, academies, coaches, cities, and opportunities.',
  },
  '/about': {
    title: 'About KhelGrid · India’s Grassroots Sports Network',
    description:
      'Learn about KhelGrid’s mission to connect athletes, academies, venues, coaches, and sports communities across India.',
  },
}

export function getRouteSeoMetadata(path: string): SeoMetadata {
  const normalized = path.replace(/\/$/, '') || '/'
  const canonicalUrl = `${SITE_ORIGIN}${normalized === '/' ? '/' : normalized}`

  const exact = ROUTE_SEO_MAP[normalized]
  if (exact) {
    return {
      ...exact,
      canonicalUrl,
      keywords: exact.keywords ?? DEFAULT_KEYWORDS,
    }
  }

  const segment = normalized.split('/').filter(Boolean)[0] ?? ''
  const label = segment
    ? segment
        .split('-')
        .map(part => (part ? part[0].toUpperCase() + part.slice(1) : ''))
        .join(' ')
    : 'Sports Platform'

  return {
    title: `${label} · KhelGrid`,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl,
    keywords: DEFAULT_KEYWORDS,
  }
}

function upsertMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string,
): () => void {
  if (typeof document === 'undefined') return () => {}
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  const existed = Boolean(el)
  const prevContent = el?.getAttribute('content') ?? null

  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)

  return () => {
    if (!el) return
    if (existed && prevContent !== null) {
      el.setAttribute('content', prevContent)
    } else if (!existed) {
      el.remove()
    }
  }
}

function upsertCanonicalLink(href: string): () => void {
  if (typeof document === 'undefined') return () => {}
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const existed = Boolean(link)
  const prevHref = link?.getAttribute('href') ?? null

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)

  return () => {
    if (!link) return
    if (existed && prevHref !== null) {
      link.setAttribute('href', prevHref)
    } else if (!existed) {
      link.remove()
    }
  }
}

export function updatePageSeoMetadata(meta: SeoMetadata): () => void {
  if (typeof document === 'undefined') return () => {}

  const cleanups: Array<() => void> = []
  const prevTitle = document.title
  document.title = meta.title
  cleanups.push(() => {
    document.title = prevTitle
  })

  if (meta.description) {
    cleanups.push(
      upsertMetaTag('meta[name="description"]', 'name', 'description', meta.description),
      upsertMetaTag('meta[property="og:description"]', 'property', 'og:description', meta.description),
      upsertMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description),
    )
  }

  cleanups.push(
    upsertMetaTag('meta[property="og:title"]', 'property', 'og:title', meta.title),
    upsertMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title),
    upsertMetaTag('meta[property="og:type"]', 'property', 'og:type', meta.ogType || 'website'),
    upsertMetaTag('meta[property="og:image"]', 'property', 'og:image', meta.ogImage || DEFAULT_OG_IMAGE),
  )

  if (meta.canonicalUrl) {
    cleanups.push(
      upsertCanonicalLink(meta.canonicalUrl),
      upsertMetaTag('meta[property="og:url"]', 'property', 'og:url', meta.canonicalUrl),
    )
  }

  if (meta.keywords && meta.keywords.length > 0) {
    cleanups.push(
      upsertMetaTag('meta[name="keywords"]', 'name', 'keywords', meta.keywords.join(', ')),
    )
  }

  if (meta.robots) {
    cleanups.push(upsertMetaTag('meta[name="robots"]', 'name', 'robots', meta.robots))
  }

  let jsonLdScript: HTMLScriptElement | null = null
  if (meta.jsonLd) {
    document.head
      .querySelectorAll('script[data-khelgrid-seo-jsonld="true"]')
      .forEach(node => node.remove())
    jsonLdScript = document.createElement('script')
    jsonLdScript.type = 'application/ld+json'
    jsonLdScript.setAttribute('data-khelgrid-seo-jsonld', 'true')
    jsonLdScript.textContent = JSON.stringify(meta.jsonLd)
    document.head.appendChild(jsonLdScript)
  }

  return () => {
    if (jsonLdScript) {
      jsonLdScript.remove()
    }
    for (let i = cleanups.length - 1; i >= 0; i--) {
      cleanups[i]()
    }
  }
}
