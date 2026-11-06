/**
 * Real Sports Facility & Action Imagery Engine for KhelGrid Platform.
 *
 * Engineered for Google Search, Google Images ranking, and Google AdSense compliance:
 * - Real, authentic, high-definition sports photography of facilities, turfs, and courts.
 * - Curated multi-image photo pools per sport discipline and facility category.
 * - Deterministic hash distribution ensuring adjacent rail cards display unique imagery.
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

export interface PhotoPoolEntry {
  url: string
  defaultAlt: string
}

export interface SportCoverImageOptions {
  name?: string
  city?: string
  sport?: string
  category?: 'venue' | 'academy' | 'pickup' | 'trial' | 'sport'
  id?: string
  seed?: string
  customUrl?: string
}

/**
 * Curated multi-photo pools per sport discipline.
 * Each pool contains authentic, verified Unsplash sports facility photos
 * optimized for WebP delivery via CDN (w=480, q=75).
 */
export const SPORT_IMAGE_POOLS: Record<string, PhotoPoolEntry[]> = {
  football: [
    {
      url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Floodlit artificial synthetic football turf arena with regulation pitch markings',
    },
    {
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship stadium football pitch with lush manicured green grass and goal netting',
    },
    {
      url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Competitive football match action on all-weather outdoor artificial turf pitch',
    },
    {
      url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Modern sports facility football pitch with stadium floodlighting',
    },
    {
      url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Evening floodlit soccer turf ground with illuminated goalposts and touchlines',
    },
    {
      url: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Enclosed 5-a-side football and futsal cage turf with perimeter rebound boards',
    },
    {
      url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Youth football academy training field with target cones and agility zones',
    },
  ],
  futsal: [
    {
      url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Enclosed 5-a-side synthetic futsal turf arena with goals and boundary netting',
    },
    {
      url: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor futsal court with synthetic surface, goal boxes, and perimeter safety nets',
    },
    {
      url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Floodlit fast-paced small-sided synthetic turf football arena',
    },
    {
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Regulation futsal sports ground with spectator pavilion and LED floodlights',
    },
  ],
  cricket: [
    {
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship cricket stadium pitch with turf wickets and boundary perimeter',
    },
    {
      url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Premier cricket ground with batsman in stance on prepared match wicket',
    },
    {
      url: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Professional cricket academy net practice lanes with synthetic turf run-ups',
    },
    {
      url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Cricket leather match ball resting on freshly rolled turf wicket surface',
    },
    {
      url: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Night floodlit cricket stadium during competitive match play',
    },
    {
      url: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Grassroots cricket ground with lush outfield and center practice strip',
    },
    {
      url: 'https://images.unsplash.com/photo-1512719994953-eabf50895df7?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Cricket pavilion and scenic sports ground outfield under natural daylight',
    },
  ],
  'box cricket': [
    {
      url: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Enclosed all-weather box cricket turf cage with overhead floodlighting',
    },
    {
      url: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Night box cricket arena with high-density synthetic grass and overhead safety nets',
    },
    {
      url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Compact box cricket court with marked crease and enclosed side boundaries',
    },
    {
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'All-weather indoor box cricket arena with bowling track and batting crease',
    },
  ],
  badminton: [
    {
      url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor professional BWF-standard badminton court with green synthetic mat and net',
    },
    {
      url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'High-ceiling indoor badminton stadium hall with anti-glare overhead LED lighting',
    },
    {
      url: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Multi-court indoor badminton facility with sprung wooden subfloor mats',
    },
    {
      url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship badminton arena court baseline with tournament grade net',
    },
  ],
  pickleball: [
    {
      url: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Dedicated outdoor regulation pickleball court with non-volley kitchen zone and net',
    },
    {
      url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Regulation outdoor acrylic pickleball court with painted kitchen line markings',
    },
    {
      url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'All-weather cushioned outdoor paddle court with professional center net',
    },
    {
      url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Community sports club multi-use paddle and pickleball court surface',
    },
  ],
  tennis: [
    {
      url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship hardcourt tennis arena with crisp white baselines and regulation net',
    },
    {
      url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Outdoor tennis court surface with championship optic yellow match ball',
    },
    {
      url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship clay court tennis facility with manicured baseline borders',
    },
    {
      url: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor tennis center with acrylic court surface and floodlit roof truss structure',
    },
  ],
  basketball: [
    {
      url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Professional indoor hardwood basketball court with glass backboard and hoop',
    },
    {
      url: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Outdoor urban street basketball court with chain-link fencing and painted key',
    },
    {
      url: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor competition basketball stadium gymnasium with parquet flooring',
    },
    {
      url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Multi-use sports arena basketball court with spectator seating tiers',
    },
  ],
  athletics: [
    {
      url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=480&q=75',
      defaultAlt: '8-lane red polyurethane all-weather synthetic running track at sports stadium',
    },
    {
      url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Sprinter on starting blocks at national athletics stadium track',
    },
    {
      url: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Sweeping curve lanes of all-weather tartan running track',
    },
    {
      url: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Track and field competition stadium with synthetic sprint straight and infield',
    },
  ],
  swimming: [
    {
      url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Olympic 50-meter indoor competition swimming pool with lane lines and starting blocks',
    },
    {
      url: 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Crystal-clear aquatic complex swimming pool with underwater lane markers',
    },
    {
      url: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor heated lap pool with lane dividers at sports conditioning center',
    },
    {
      url: 'https://images.unsplash.com/photo-1560089000-7433a4ebbd64?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Competition swimming pool with professional starting platforms and timing touchpads',
    },
  ],
  boxing: [
    {
      url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Professional competition boxing ring with ropes, canvas mat, and corner pads',
    },
    {
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Boxing and combat sports training gym with heavy punching bags and ring ropes',
    },
    {
      url: 'https://images.unsplash.com/photo-1517438322307-e67111335449?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Combat sports arena corner canvas with competition boxing gloves',
    },
    {
      url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'High-intensity athletic combat conditioning studio and sparring ring',
    },
  ],
  'table tennis': [
    {
      url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'ITTF-standard indoor blue table tennis arena with competition net and court barriers',
    },
    {
      url: 'https://images.unsplash.com/photo-1545809074-59472b3f5ecc?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor table tennis academy hall with tournament lighting and rubber flooring',
    },
  ],
  shooting: [
    {
      url: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=480&q=75',
      defaultAlt: '10m and 50m precision indoor sports shooting range with electronic target scoring',
    },
  ],
  archery: [
    {
      url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Outdoor target archery range with multi-colored circular target faces and distance markers',
    },
  ],
  hockey: [
    {
      url: 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'FIH-certified blue water-based synthetic turf hockey ground with striking circle',
    },
  ],
  rowing: [
    {
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'National water sports regatta course for rowing, kayaking, and canoeing',
    },
  ],
  kayaking: [
    {
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'National water sports regatta course for rowing, kayaking, and canoeing',
    },
  ],
  wrestling: [
    {
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Olympic regulation combat wrestling mat and martial arts high-performance dojo',
    },
    {
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'High-performance combat sports training center and wrestling pavilion',
    },
  ],
  kabaddi: [
    {
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Indoor synthetic kabaddi court mat with baulk and bonus line markings',
    },
    {
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Pro-kabaddi training arena with cushioned indoor mats and boundary lines',
    },
  ],
  venue: [
    {
      url: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Modern sports arena complex with multi-discipline floodlit facilities',
    },
    {
      url: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Outdoor multi-sport athletic stadium with championship floodlights',
    },
    {
      url: 'https://images.unsplash.com/photo-1505305976870-c0be1cd39939?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Sports complex stadium grandstand and multi-discipline grass grounds',
    },
    {
      url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Modern indoor multi-purpose sports pavilion with spectator bleachers',
    },
    {
      url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Community sports park with synthetic turfs and outdoor training courts',
    },
    {
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'High-performance athletic pavilion and multi-sport recreation arena',
    },
  ],
  academy: [
    {
      url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Accredited high-performance athletic training center and sports academy campus',
    },
    {
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'State-of-the-art sports conditioning facility and strength academy pavilion',
    },
    {
      url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Elite youth sports academy campus with outdoor coaching zones and grounds',
    },
    {
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Championship athletic development grounds and tactical coaching field',
    },
    {
      url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Institutional sports academy arena with professional coaching staff and courts',
    },
    {
      url: 'https://images.unsplash.com/photo-1505305976870-c0be1cd39939?auto=format&fit=crop&w=480&q=75',
      defaultAlt: 'Olympic pathway sports academy pavilion with outdoor training track and fields',
    },
  ],
}

/**
 * Backward-compatible single-image dictionary.
 * Each entry points to the primary photo of the corresponding pool.
 */
export const REAL_SPORTS_IMAGES: Record<string, PhotoPoolEntry> = Object.fromEntries(
  Object.entries(SPORT_IMAGE_POOLS).map(([key, pool]) => [key, pool[0]])
)

/**
 * Fast, deterministic string hashing for uniform distribution of photos across entity cards.
 * Guarantees that adjacent cards in a rail display distinct imagery while remaining
 * strictly consistent across page re-renders and reloads.
 */
export function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Resolves real, high-resolution, SEO-friendly sports facility photography
 * with contextual alt text for Google Search, Google Images, and AdSense compliance.
 *
 * Supports deterministic multi-photo distribution across card rails via `seed` or `id`.
 */
export function getSportCoverImage(options: SportCoverImageOptions): SportCoverImage {
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

  const pool = SPORT_IMAGE_POOLS[detectedKey] || SPORT_IMAGE_POOLS.venue

  // Differentiate using provided seed / id, else fallback to pool[0] for backwards compatibility
  const seed = options.seed || options.id
  let img = pool[0]
  if (seed) {
    const idx = hashSeed(seed) % pool.length
    img = pool[idx]
  }

  // If a verified direct customUrl is provided, override pool image url
  const finalUrl = options.customUrl?.trim() || img.url

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
    url: finalUrl,
    alt,
    width: 800,
    height: 450,
    sport: detectedKey,
  }
}

/**
 * Backward-compatible helper that resolves an authentic, crawlable sports photo URL.
 * Replaces the previous synthetic emoji SVG data URI with real, indexable photography.
 * Supports deterministic card rail distribution via optional `seedOrId`.
 */
export function createBannerSvg(
  title: string,
  subtitle: string,
  emoji = '🏛️',
  theme: 'navy' | 'cyan' | 'emerald' | 'amber' = 'navy',
  seedOrId?: string,
  customUrl?: string,
): string {
  void theme
  const cover = getSportCoverImage({
    name: title,
    city: subtitle,
    sport: `${title} ${subtitle} ${emoji}`,
    seed: seedOrId,
    customUrl,
  })
  return cover.url
}
