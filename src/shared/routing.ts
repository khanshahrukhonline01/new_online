export type RouteMatch =
  | { name: 'home'; canonicalPath: '/' }
  | { name: 'sports-index'; canonicalPath: '/sports' }
  | { name: 'sport-detail'; canonicalPath: '/sports/:slug'; slug: string }
  | { name: 'opportunities-index'; canonicalPath: '/opportunities'; alias?: string }
  | { name: 'opportunity-detail'; canonicalPath: '/opportunities/:slug'; slug: string }
  | { name: 'venues-index'; canonicalPath: '/venues'; alias?: string }
  | { name: 'venue-detail'; canonicalPath: '/venues/:slug'; slug: string }
  | { name: 'search'; canonicalPath: '/search' }
  | { name: 'feature'; canonicalPath: string; slug: string }
  | { name: 'not-found'; canonicalPath: '/404' }

const opportunityAliases = new Set(['/trials', '/combines', '/scholarships', '/camps'])
const featurePages: Record<string, string> = {
  '/dashboard': 'My Dashboard', '/live': 'Live Scores', '/live-scores': 'Live Scores', '/play': 'Play · Find Games',
  '/coaches': 'Coaches Directory', '/academies': 'Sports Academies', '/academy': 'Sports Academies', '/events': 'Events & Tournaments',
  '/stats': 'Athlete Statistics', '/sports-cv': 'Sports CV Wizard', '/talent-scanner': 'Talent Scanner',
  '/scout-portal': 'Scout Portal', '/verification': 'Athlete Verification',
  '/learning': 'Sports & Learning Hub', '/learning-hub': 'Sports & Learning Hub', '/guides': 'Sports Guides', '/ai-guide': 'AI Sports Guide',
  '/khelchronicle': 'KhelChronicle', '/community': 'Sports Community', '/tools': 'Sports Tools & Calculators',
  '/calendar': 'Sports Calendar', '/for-you': 'For You', '/trust': 'Trust Center',
  '/pricing': 'Pricing & Memberships', '/mobile-app': 'KhelGrid Mobile App', '/careers': 'Careers',
  '/partners': 'Partner with KhelGrid', '/about': 'About KhelGrid', '/contact': 'Contact KhelGrid',
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
  if (path === '/opportunities' || opportunityAliases.has(path)) return { name: 'opportunities-index', canonicalPath: '/opportunities', ...(path === '/opportunities' ? {} : { alias: path }) }
  if (path.startsWith('/opportunities/')) {
    const slug = path.slice('/opportunities/'.length)
    if (slug && !slug.includes('/')) return { name: 'opportunity-detail', canonicalPath: '/opportunities/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/venues' || path === '/book' || path === '/cities') return { name: 'venues-index', canonicalPath: '/venues', ...(path === '/venues' ? {} : { alias: path }) }
  if (path.startsWith('/city/')) {
    const slug = path.slice('/city/'.length)
    if (slug && !slug.includes('/')) return { name: 'venues-index', canonicalPath: '/venues', alias: path }
  }
  if (path.startsWith('/venues/')) {
    const slug = path.slice('/venues/'.length)
    if (slug && !slug.includes('/')) return { name: 'venue-detail', canonicalPath: '/venues/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/search') return { name: 'search', canonicalPath: '/search' }
  if (featurePages[path]) return { name: 'feature', canonicalPath: path, slug: featurePages[path] }
  return { name: 'not-found', canonicalPath: '/404' }
}
function decodeURIComponentSafe(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}
