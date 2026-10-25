export type RouteMatch =
  | { name: 'home'; canonicalPath: '/' }
  | { name: 'sports-index'; canonicalPath: '/sports' }
  | { name: 'sport-detail'; canonicalPath: '/sports/:slug'; slug: string }
  | { name: 'opportunities-index'; canonicalPath: '/opportunities'; alias?: string }
  | { name: 'opportunity-detail'; canonicalPath: '/opportunities/:slug'; slug: string }
  | { name: 'venues-index'; canonicalPath: '/venues'; alias?: string }
  | { name: 'venue-detail'; canonicalPath: '/venues/:slug'; slug: string }
  | { name: 'search'; canonicalPath: '/search' }
  | { name: 'not-found'; canonicalPath: '/404' }

const opportunityAliases = new Set(['/trials', '/combines', '/scholarships', '/camps'])

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function resolveRoute(pathname: string): RouteMatch {
  const path = normalizePath(pathname)
  if (path === '/') return { name: 'home', canonicalPath: '/' }
  if (path === '/sports') return { name: 'sports-index', canonicalPath: '/sports' }
  if (path.startsWith('/sports/')) {
    const slug = path.slice('/sports/'.length)
    if (slug && !slug.includes('/')) return { name: 'sport-detail', canonicalPath: '/sports/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/opportunities' || opportunityAliases.has(path)) {
    return { name: 'opportunities-index', canonicalPath: '/opportunities', ...(path === '/opportunities' ? {} : { alias: path }) }
  }
  if (path.startsWith('/opportunities/')) {
    const slug = path.slice('/opportunities/'.length)
    if (slug && !slug.includes('/')) return { name: 'opportunity-detail', canonicalPath: '/opportunities/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/venues' || path === '/book') {
    return { name: 'venues-index', canonicalPath: '/venues', ...(path === '/venues' ? {} : { alias: path }) }
  }
  if (path.startsWith('/venues/')) {
    const slug = path.slice('/venues/'.length)
    if (slug && !slug.includes('/')) return { name: 'venue-detail', canonicalPath: '/venues/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path === '/search') return { name: 'search', canonicalPath: '/search' }
  return { name: 'not-found', canonicalPath: '/404' }
}

function decodeURIComponentSafe(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}
