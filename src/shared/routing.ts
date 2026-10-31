export type RouteMatch =
  | { name: 'home'; canonicalPath: '/' }
  | { name: 'sports-index'; canonicalPath: '/sports' }
  | { name: 'sport-detail'; canonicalPath: '/sports/:slug'; slug: string }
  | { name: 'athlete-profile'; canonicalPath: '/u/:username'; username: string }
  | { name: 'opportunities-index'; canonicalPath: '/opportunities'; alias?: string }
  | { name: 'opportunity-detail'; canonicalPath: '/opportunities/:slug'; slug: string }
  | { name: 'venues-index'; canonicalPath: '/venues'; alias?: string }
  | { name: 'cities-index'; canonicalPath: '/cities' }
  | { name: 'city-detail'; canonicalPath: '/cities/:slug'; slug: string; alias?: string }
  | { name: 'venue-detail'; canonicalPath: '/venues/:slug'; slug: string }
  | { name: 'search'; canonicalPath: '/search' }
  | { name: 'khelchronicle-index'; canonicalPath: '/khelchronicle'; alias?: string }
  | { name: 'khelchronicle-submit'; canonicalPath: '/khelchronicle/submit' }
  | { name: 'khelchronicle-category'; canonicalPath: '/khelchronicle/category/:category'; category: string }
  | { name: 'khelchronicle-author'; canonicalPath: '/khelchronicle/author/:author'; author: string }
  | { name: 'khelchronicle-paper'; canonicalPath: '/khelchronicle/:slug'; slug: string }
  | { name: 'feature'; canonicalPath: string; slug: string }
  | { name: 'not-found'; canonicalPath: '/404' }

const opportunityAliases = new Set(['/trials', '/combines', '/scholarships', '/camps'])
const khelchronicleCategories = new Set([
  'sports-biomechanics',
  'exercise-physiology',
  'sports-nutrition',
  'sports-psychology',
  'sports-medicine',
  'sports-analytics',
  'sports-policy',
])
const featurePages: Record<string, string> = {
  '/dashboard': 'My Dashboard', '/live': 'Live Scores', '/live-scores': 'Live Scores', '/play': 'Play · Find Games',
  '/coaches': 'Coaches Directory', '/academies': 'Sports Academies', '/academy': 'Sports Academies', '/events': 'Events & Tournaments',
  '/stats': 'Athlete Statistics', '/sports-cv': 'Sports CV Wizard', '/talent-scanner': 'Talent Scanner',
  '/scout-portal': 'Scout Portal', '/verification': 'Athlete Verification',
  '/learning': 'Sports & Learning Hub', '/learning-hub': 'Sports & Learning Hub', '/guides': 'Sports Guides', '/ai-guide': 'AI Sports Guide',
  '/community': 'Sports Community', '/tools': 'Sports Tools & Calculators',
  '/calendar': 'Sports Calendar', '/for-you': 'For You', '/trust': 'Trust Center',
  '/pricing': 'Pricing & Memberships', '/mobile-app': 'KhelGrid Mobile App', '/careers': 'Careers',
  '/partners': 'Partner with KhelGrid', '/partner': 'Partner with KhelGrid', '/about': 'About KhelGrid', '/contact': 'Contact KhelGrid',
  '/privacy': 'Privacy Policy', '/terms': 'Terms of Use', '/cookies': 'Cookie Policy',
  '/ipr-policy': 'IPR & Copyright Policy', '/cancellation-policy': 'Cancellation Policy',
  '/posh-policy': 'POSH Policy', '/editorial-policy': 'Editorial Policy',
  '/verification-policy': 'Verification Policy', '/correction-policy': 'Corrections Policy',
  '/settings': 'Account Settings', '/notifications': 'Notifications', '/login': 'Login',
  '/signup': 'Create Account', '/forgot-password': 'Password Recovery', '/book': 'Venue Booking',
  '/profile': 'Athlete Profile', '/my-profile': 'My Profile', '/saved': 'Saved Items',
  '/referrals': 'Referrals', '/help': 'Help & Support', '/submit-listing': 'Suggest a Listing',
  '/start-from-zero': 'Start From Zero — Sports CV',
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}
export function resolveRoute(pathname: string): RouteMatch {
  const path = normalizePath(pathname)
  if (path === '/') return { name: 'home', canonicalPath: '/' }
  if (path === '/sports') return { name: 'sports-index', canonicalPath: '/sports' }
  if (path.startsWith('/sports/') || path.startsWith('/sport/')) {
    const prefix = path.startsWith('/sports/') ? '/sports/' : '/sport/'
    const slug = path.slice(prefix.length)
    if (slug && !slug.includes('/')) return { name: 'sport-detail', canonicalPath: '/sports/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path.startsWith('/u/') || path.startsWith('/athlete/')) {
    const prefix = path.startsWith('/u/') ? '/u/' : '/athlete/'
    const handle = path.slice(prefix.length)
    if (handle && !handle.includes('/')) {
      const clean = handle.replace(/^@+/, '')
      return { name: 'athlete-profile', canonicalPath: '/u/:username', username: decodeURIComponentSafe(clean) }
    }
  }
  if (path === '/opportunities' || opportunityAliases.has(path)) return { name: 'opportunities-index', canonicalPath: '/opportunities', ...(path === '/opportunities' ? {} : { alias: path }) }
  if (path.startsWith('/opportunities/')) {
    const slug = path.slice('/opportunities/'.length)
    if (slug && !slug.includes('/')) return { name: 'opportunity-detail', canonicalPath: '/opportunities/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/cities') return { name: 'cities-index', canonicalPath: '/cities' }
  if (path.startsWith('/cities/')) {
    const slug = path.slice('/cities/'.length)
    if (slug && !slug.includes('/')) return { name: 'city-detail', canonicalPath: '/cities/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/venues' || path === '/book') return { name: 'venues-index', canonicalPath: '/venues', ...(path === '/venues' ? {} : { alias: path }) }
  if (path.startsWith('/city/')) {
    const slug = path.slice('/city/'.length)
    if (slug && !slug.includes('/')) return { name: 'city-detail', canonicalPath: '/cities/:slug', slug: decodeURIComponentSafe(slug), alias: path }
  }
  if (path.startsWith('/venues/')) {
    const slug = path.slice('/venues/'.length)
    if (slug && !slug.includes('/')) return { name: 'venue-detail', canonicalPath: '/venues/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/search') return { name: 'search', canonicalPath: '/search' }

  // KhelChronicle Open Sports Research Repository routes
  if (path === '/khelchronicle' || path === '/chronicle') {
    return { name: 'khelchronicle-index', canonicalPath: '/khelchronicle', ...(path === '/chronicle' ? { alias: '/chronicle' } : {}) }
  }
  if (path === '/khelchronicle/submit' || path === '/chronicle/submit') {
    return { name: 'khelchronicle-submit', canonicalPath: '/khelchronicle/submit' }
  }
  if (path.startsWith('/khelchronicle/category/') || path.startsWith('/chronicle/category/')) {
    const prefix = path.startsWith('/khelchronicle/category/') ? '/khelchronicle/category/' : '/chronicle/category/'
    const cat = path.slice(prefix.length)
    if (cat && !cat.includes('/')) return { name: 'khelchronicle-category', canonicalPath: '/khelchronicle/category/:category', category: decodeURIComponentSafe(cat) }
  }
  if (path.startsWith('/khelchronicle/author/') || path.startsWith('/chronicle/author/')) {
    const prefix = path.startsWith('/khelchronicle/author/') ? '/khelchronicle/author/' : '/chronicle/author/'
    const auth = path.slice(prefix.length)
    if (auth && !auth.includes('/')) return { name: 'khelchronicle-author', canonicalPath: '/khelchronicle/author/:author', author: decodeURIComponentSafe(auth) }
  }
  if (path.startsWith('/khelchronicle/') || path.startsWith('/chronicle/')) {
    const prefix = path.startsWith('/khelchronicle/') ? '/khelchronicle/' : '/chronicle/'
    const sub = path.slice(prefix.length)
    if (sub && !sub.includes('/')) {
      const decoded = decodeURIComponentSafe(sub)
      if (khelchronicleCategories.has(decoded.toLowerCase())) {
        return { name: 'khelchronicle-category', canonicalPath: '/khelchronicle/category/:category', category: decoded }
      }
      return { name: 'khelchronicle-paper', canonicalPath: '/khelchronicle/:slug', slug: decoded }
    }
  }

  if (featurePages[path]) return { name: 'feature', canonicalPath: path, slug: featurePages[path] }
  return { name: 'not-found', canonicalPath: '/404' }
}
function decodeURIComponentSafe(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}
