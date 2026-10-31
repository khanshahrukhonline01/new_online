/**
 * Real Sports Facility & Action Imagery Engine for KhelGrid Platform.
 *
 * Engineered for Google Search, Google Images ranking, and Google AdSense compliance:
 * - Real, authentic, high-definition sports photography of facilities, turfs, and courts.
 * - Semantic keyword-rich descriptive alt metadata for image indexing and SEO.
 * - Replaces low-value raw SVG emoji data-URIs with indexable, crawlable, optimized media.
 * - Fully compliant with Google AdSense Publisher Policies (no placeholder / thin template art).
 */

export interface SportCoverImage {
  url: string
  alt: string
  width: number
  height: number
  sport: string
}

export const REAL_SPORTS_IMAGES: Record<string, { url: string; defaultAlt: string }> = {
  football: {
    url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Floodlit artificial synthetic football turf arena with regulation pitch markings',
  },
  futsal: {
    url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Enclosed 5-a-side synthetic futsal turf arena with goals and boundary netting',
  },
  cricket: {
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Championship cricket stadium pitch with turf wickets and boundary perimeter',
  },
  'box cricket': {
    url: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Enclosed all-weather box cricket turf cage with overhead floodlighting',
  },
  badminton: {
    url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Indoor professional BWF-standard badminton court with green synthetic mat and net',
  },
  pickleball: {
    url: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Dedicated outdoor regulation pickleball court with non-volley kitchen zone and net',
  },
  tennis: {
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Championship hardcourt tennis arena with crisp white baselines and regulation net',
  },
  basketball: {
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Professional indoor hardwood basketball court with glass backboard and hoop',
  },
  athletics: {
    url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    defaultAlt: '8-lane red polyurethane all-weather synthetic running track at sports stadium',
  },
  swimming: {
    url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Olympic 50-meter indoor competition swimming pool with lane lines and starting blocks',
  },
  boxing: {
    url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Professional competition boxing ring with ropes, canvas mat, and corner pads',
  },
  'table tennis': {
    url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'ITTF-standard indoor blue table tennis arena with competition net and court barriers',
  },
  shooting: {
    url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=800&q=80',
    defaultAlt: '10m and 50m precision indoor sports shooting range with electronic target scoring',
  },
  archery: {
    url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Outdoor target archery range with multi-colored circular target faces and distance markers',
  },
  hockey: {
    url: 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'FIH-certified blue water-based synthetic turf hockey ground with striking circle',
  },
  rowing: {
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'National water sports regatta course for rowing, kayaking, and canoeing',
  },
  kayaking: {
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'National water sports regatta course for rowing, kayaking, and canoeing',
  },
  wrestling: {
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Olympic regulation combat wrestling mat and martial arts high-performance dojo',
  },
  kabaddi: {
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Indoor synthetic kabaddi court mat with baulk and bonus line markings',
  },
  venue: {
    url: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Modern sports arena complex with multi-discipline floodlit facilities',
  },
  academy: {
    url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=80',
    defaultAlt: 'Accredited high-performance athletic training center and sports academy campus',
  },
}

/**
 * Resolves real, high-resolution, SEO-friendly sports facility photography
 * with contextual alt text for Google Search, Google Images, and AdSense compliance.
 */
export function getSportCoverImage(options: {
  name?: string
  city?: string
  sport?: string
  category?: 'venue' | 'academy' | 'pickup' | 'trial' | 'sport'
}): SportCoverImage {
  const name = options.name || ''
  const city = options.city || 'India'
  const text = `${name} ${options.sport || ''} ${options.category || ''}`.toLowerCase()

  let detectedKey = 'venue'
  if (text.includes('pickleball')) detectedKey = 'pickleball'
  else if (text.includes('box cricket')) detectedKey = 'box cricket'
  else if (text.includes('cricket') || text.includes('bowling')) detectedKey = 'cricket'
  else if (text.includes('badminton')) detectedKey = 'badminton'
  else if (text.includes('futsal')) detectedKey = 'futsal'
  else if (text.includes('football') || text.includes('soccer')) detectedKey = 'football'
  else if (text.includes('tennis')) detectedKey = 'tennis'
  else if (text.includes('basketball')) detectedKey = 'basketball'
  else if (text.includes('athletics') || text.includes('track') || text.includes('sprint') || text.includes('running')) detectedKey = 'athletics'
  else if (text.includes('swimming') || text.includes('aquatic') || text.includes('pool')) detectedKey = 'swimming'
  else if (text.includes('boxing')) detectedKey = 'boxing'
  else if (text.includes('table tennis') || text.includes('ping pong')) detectedKey = 'table tennis'
  else if (text.includes('shooting') || text.includes('rifle')) detectedKey = 'shooting'
  else if (text.includes('archery')) detectedKey = 'archery'
  else if (text.includes('hockey')) detectedKey = 'hockey'
  else if (text.includes('rowing') || text.includes('kayak') || text.includes('canoeing')) detectedKey = 'rowing'
  else if (text.includes('wrestling') || text.includes('akhada')) detectedKey = 'wrestling'
  else if (text.includes('kabaddi')) detectedKey = 'kabaddi'
  else if (options.category === 'academy' || text.includes('academy') || text.includes('institute') || text.includes('school')) detectedKey = 'academy'

  const img = REAL_SPORTS_IMAGES[detectedKey] || REAL_SPORTS_IMAGES.venue

  const facilityType = options.category === 'academy'
    ? 'Sports Training Academy'
    : options.category === 'pickup'
      ? 'Community Pickup Sports Game'
      : options.category === 'trial'
        ? 'Selection Trials Combine'
        : 'Sports Turf and Arena'

  const alt = name
    ? `${name} — ${facilityType} in ${city}. ${img.defaultAlt}`
    : `${img.defaultAlt} in ${city}`

  return {
    url: img.url,
    alt,
    width: 800,
    height: 450,
    sport: detectedKey,
  }
}

/**
 * Backward-compatible helper that resolves an authentic, crawlable sports photo URL.
 * Replaces the previous synthetic emoji SVG data URI with real, indexable photography.
 */
export function createBannerSvg(
  title: string,
  subtitle: string,
  emoji = '🏛️',
  theme: 'navy' | 'cyan' | 'emerald' | 'amber' = 'navy',
): string {
  void theme
  const cover = getSportCoverImage({
    name: title,
    city: subtitle,
    sport: `${title} ${subtitle} ${emoji}`,
  })
  return cover.url
}
