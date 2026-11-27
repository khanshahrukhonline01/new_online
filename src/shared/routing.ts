// ---------------------------------------------------------------------------
// Workspace shell persona types
// ---------------------------------------------------------------------------
export type WorkspacePersona =
  | 'athlete'
  | 'organization'
  | 'academy'
  | 'coach'
  | 'turf'
  | 'host'
  | 'tournament'
  | 'creator'
  | 'parent'

const WORKSPACE_PERSONAS = new Set<string>([
  'athlete', 'organization', 'academy', 'coach', 'turf', 'host', 'tournament', 'creator', 'parent',
])

// ---------------------------------------------------------------------------
// Route match union
// ---------------------------------------------------------------------------
export type RouteMatch =
  | { name: 'workspace-shell'; canonicalPath: '/workspace/:persona/:section'; persona: WorkspacePersona; section: string }
  | { name: 'home'; canonicalPath: '/' }
  | { name: 'sports-index'; canonicalPath: '/sports' }
  | { name: 'sport-detail'; canonicalPath: '/sports/:slug'; slug: string }
  | { name: 'athlete-profile'; canonicalPath: '/u/:username'; username: string }
  | { name: 'opportunities-index'; canonicalPath: '/opportunities'; alias?: string }
  | { name: 'opportunity-detail'; canonicalPath: '/opportunities/:slug'; slug: string; isApply?: boolean }
  | { name: 'academies-index'; canonicalPath: '/academies'; alias?: string }
  | { name: 'academy-detail'; canonicalPath: '/academies/:slug'; slug: string; isEnrol?: boolean }
  | { name: 'venues-index'; canonicalPath: '/venues'; alias?: string }
  | { name: 'cities-index'; canonicalPath: '/cities' }
  | { name: 'city-detail'; canonicalPath: '/cities/:slug'; slug: string; alias?: string }
  | { name: 'venue-detail'; canonicalPath: '/venues/:slug'; slug: string; isBooking?: boolean }
  | { name: 'search'; canonicalPath: '/search' }
  | { name: 'khelchronicle-index'; canonicalPath: '/khelchronicle'; alias?: string }
  | { name: 'khelchronicle-submit'; canonicalPath: '/khelchronicle/submit' }
  | { name: 'khelchronicle-category'; canonicalPath: '/khelchronicle/category/:category'; category: string }
  | { name: 'khelchronicle-author'; canonicalPath: '/khelchronicle/author/:author'; author: string }
  | { name: 'khelchronicle-paper'; canonicalPath: '/khelchronicle/:slug'; slug: string }
  | { name: 'tools-index'; canonicalPath: string; toolSlug?: string }
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
  '/play/lacrosse-sixes': 'Lacrosse Sixes Arcade Game',
  '/dashboard': 'My Dashboard', '/host': 'Host & Partner Dashboard', '/partner-dashboard': 'Host & Partner Dashboard', '/live': 'Live Scores', '/live-scores': 'Live Scores', '/play': 'Play · Find Games',
  '/coaches': 'Coaches Directory', '/coach-dashboard': 'Coach Operations Hub', '/coach/hub': 'Coach Operations Hub', '/coach/manage': 'Coach Operations Hub', '/events': 'Events & Tournaments', '/tournaments': 'Events & Tournaments',
  '/stats': 'Athlete Statistics', '/sports-cv': 'Sports CV Wizard', '/talent-scanner': 'Talent Scanner',
  '/scout-portal': 'Scout Portal', '/verification': 'Athlete Verification',
  '/learning': 'Sports & Learning Hub', '/learning-hub': 'Sports & Learning Hub', '/guides': 'Sports Guides', '/ai-guide': 'AI Sports Guide',
  '/community': 'Sports Community', '/tools': 'Sports Tools & Calculators',
  '/calendar': 'Sports Calendar', '/for-you': 'For You', '/trust': 'Trust Center',
  '/pricing': 'Pricing & Memberships', '/mobile-app': 'KhelGrid Mobile App', '/careers': 'Careers',
  '/academy-hub': 'Academy Admissions & Operations Hub', '/academies/manage': 'Academy Admissions & Operations Hub',
  '/partner/verify': 'Partner Email Verification',
  '/partner-signup': 'Partner Onboarding Wizard', '/partner-login': 'Partner Onboarding Wizard', '/partner/signup': 'Partner Onboarding Wizard', '/partner/login': 'Partner Onboarding Wizard', '/partner/onboarding': 'Partner Onboarding Wizard', '/academy/signup': 'Partner Onboarding Wizard',
  '/demo': 'Interactive Dashboard Demo Showcase', '/preview': 'Interactive Dashboard Demo Showcase', '/partner/preview': 'Interactive Dashboard Demo Showcase',
  '/workspace': 'KhelGrid Workspace',
  '/organizations': 'Organizations & Partner Workspaces', '/workspaces': 'Organizations & Partner Workspaces',
  '/parent-portal': 'Parent & Athlete Passbook', '/parent': 'Parent & Athlete Passbook', '/passbook': 'Parent & Athlete Passbook',
  '/tournament-ops': 'Tournament Operations Suite', '/tournaments/manage': 'Tournament Operations Suite', '/tournament-management': 'Tournament Operations Suite',
  '/turf-calendar': 'Turf & Facility Slot Booking Calendar', '/venues/manage': 'Turf & Facility Slot Booking Calendar', '/turf': 'Turf & Facility Slot Booking Calendar',
  '/verify-pass': 'Gate Pass & Check-In Desk', '/gate-checkin': 'Gate Pass & Check-In Desk',
  '/my-passes': 'My Passes & Booking Vault', '/passes': 'My Passes & Booking Vault',
  '/partners': 'Partner with KhelGrid', '/partner': 'Partner with KhelGrid', '/about': 'About KhelGrid', '/contact': 'Contact KhelGrid',
  '/privacy': 'Privacy Policy', '/terms': 'Terms of Use', '/cookies': 'Cookie Policy',
  '/ipr-policy': 'IPR & Copyright Policy', '/cancellation-policy': 'Cancellation Policy',
  '/posh-policy': 'POSH Policy', '/editorial-policy': 'Editorial Policy',
  '/verification-policy': 'Verification Policy', '/correction-policy': 'Corrections Policy',
  '/workplace-policy': 'Workplace & Anti-Harassment Policy',
  '/open-science-policy': 'Open Science & Research Ethics Policy',
  '/settings': 'Account Settings', '/notifications': 'Notifications', '/login': 'Login',
  '/signup': 'Create Account', '/forgot-password': 'Password Recovery', '/book': 'Venue Booking',
  '/profile': 'Athlete Profile', '/my-profile': 'My Profile', '/saved': 'Saved Items',
  '/referrals': 'Referrals', '/help': 'Help & Support', '/support': 'Help & Support', '/help-feedback': 'Help & Feedback', '/submit-listing': 'Suggest a Listing', '/submit-listing/email': 'Direct Email Listing Request', '/list/email': 'Direct Email Listing Request', '/track-submission': 'Track Submission', '/track': 'Track Submission',
  '/start-from-zero': 'Start From Zero — Sports CV',
  '/campaigns': 'Sports Creator Campaign Marketplace',
  '/campaigns/create': 'Create Creator Campaign',
  '/campaigns/manage': 'Advertiser Campaign Dashboard',
  '/creator': 'Sports Creator Hub',
  '/creator-hub': 'Sports Creator Hub',
}

const COACH_WORKSPACE_SUBROUTES = new Set([
  'profile',
  'credentials',
  'athletes',
  'programmes',
  'calendar',
  'sessions',
  'attendance',
  'assessments',
  'video-analysis',
  'academy',
  'teams',
  'venues',
  'messages',
  'opportunities',
  'documents',
  'reports',
  'reviews',
  'services',
  'notifications',
  'settings',
])

function isCoachWorkspaceSubpath(path: string): boolean {
  if (!path.startsWith('/coach-dashboard/')) return false
  const parts = path.slice('/coach-dashboard/'.length).split('/').filter(Boolean)
  if (parts.length === 0 || parts.length > 2) return false
  const [section, detail] = parts
  if (!COACH_WORKSPACE_SUBROUTES.has(section)) return false
  if (!detail) return true
  return section === 'athletes' || section === 'programmes' || section === 'sessions'
}

const ACADEMY_WORKSPACE_SUBROUTES = new Set([
  'overview',
  'profile',
  'branches',
  'athletes',
  'students',
  'coaches',
  'training',
  'batches',
  'sessions',
  'attendance',
  'admissions',
  'trials',
  'leads',
  'facilities',
  'equipment',
  'notifications',
  'reports',
  'staff',
  'fees',
  'ledger',
  'settings',
  'audit-logs',
])

function isAcademyWorkspaceSubpath(path: string): boolean {
  if (!path.startsWith('/academy-hub/')) return false
  const parts = path.slice('/academy-hub/'.length).split('/').filter(Boolean)
  if (parts.length === 0 || parts.length > 2) return false
  const [section, detail] = parts
  if (!ACADEMY_WORKSPACE_SUBROUTES.has(section)) return false
  if (!detail) return true
  return section === 'athletes' || section === 'branches' || section === 'admissions' || section === 'training'
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}
export function resolveRoute(pathname: string): RouteMatch {
  const path = normalizePath(pathname)
  if (path === '/') return { name: 'home', canonicalPath: '/' }
  if (path === '/coach-dashboard' || path === '/coach/hub' || path === '/coach/manage' || isCoachWorkspaceSubpath(path)) {
    return { name: 'feature', canonicalPath: '/coach-dashboard', slug: 'Coach Operations Hub' }
  }
  if (path === '/sports') return { name: 'sports-index', canonicalPath: '/sports' }
  if (path.startsWith('/sports/') || path.startsWith('/sport/')) {
    const prefix = path.startsWith('/sports/') ? '/sports/' : '/sport/'
    const slug = path.slice(prefix.length)
    if (slug && !slug.includes('/')) return { name: 'sport-detail', canonicalPath: '/sports/:slug', slug: decodeURIComponentSafe(slug) }
  }
  if (path.startsWith('/u/') || path.startsWith('/athlete/') || path.startsWith('/sports-cv/') || path.startsWith('/cv/')) {
    const prefix = path.startsWith('/u/')
      ? '/u/'
      : path.startsWith('/athlete/')
        ? '/athlete/'
        : path.startsWith('/sports-cv/')
          ? '/sports-cv/'
          : '/cv/'
    const handle = path.slice(prefix.length)
    if (handle && !handle.includes('/')) {
      const clean = handle.replace(/^@+/, '')
      return { name: 'athlete-profile', canonicalPath: '/u/:username', username: decodeURIComponentSafe(clean) }
    }
  }
  if (path === '/opportunities' || opportunityAliases.has(path)) return { name: 'opportunities-index', canonicalPath: '/opportunities', ...(path === '/opportunities' ? {} : { alias: path }) }
  if (
    path.startsWith('/opportunities/') ||
    path.startsWith('/opportunity/') ||
    path.startsWith('/trials/') ||
    path.startsWith('/trial/')
  ) {
    const prefix = path.startsWith('/opportunities/')
      ? '/opportunities/'
      : path.startsWith('/opportunity/')
        ? '/opportunity/'
        : path.startsWith('/trials/')
          ? '/trials/'
          : '/trial/'
    const rest = path.slice(prefix.length)
    if (rest.endsWith('/apply')) {
      const rawSlug = rest.slice(0, -('/apply'.length))
      if (rawSlug && !rawSlug.includes('/')) {
        const cleanSlug = decodeURIComponentSafe(rawSlug).replace(/^t-/, '')
        return {
          name: 'opportunity-detail',
          canonicalPath: '/opportunities/:slug',
          slug: cleanSlug,
          isApply: true,
        }
      }
    }
    if (rest && !rest.includes('/')) {
      const cleanSlug = decodeURIComponentSafe(rest).replace(/^t-/, '')
      return {
        name: 'opportunity-detail',
        canonicalPath: '/opportunities/:slug',
        slug: cleanSlug,
      }
    }
  }
  if (path === '/academy-hub' || path === '/academies/manage' || isAcademyWorkspaceSubpath(path)) {
    return { name: 'feature', canonicalPath: '/academy-hub', slug: 'Academy Admissions & Operations Hub' }
  }
  if (
    path === '/partner-signup' ||
    path === '/partner-login' ||
    path === '/partner/signup' ||
    path === '/partner/login' ||
    path === '/partner/onboarding' ||
    path === '/academy/signup'
  ) {
    return { name: 'feature', canonicalPath: '/partner-signup', slug: 'Partner Onboarding Wizard' }
  }
  if (path === '/organizations' || path === '/workspaces') {
    return { name: 'feature', canonicalPath: '/organizations', slug: 'Organizations & SaaS Workspaces' }
  }
  if (path === '/coach-dashboard' || path === '/coach/hub' || path === '/coach/manage') {
    return { name: 'feature', canonicalPath: '/coach-dashboard', slug: 'Coach Operations Hub' }
  }
  if (path === '/turf-calendar' || path === '/venues/manage' || path === '/turf') {
    return { name: 'feature', canonicalPath: '/turf-calendar', slug: 'Turf & Facility Slot Booking Calendar' }
  }
  if (path === '/tournament-ops' || path === '/tournaments/manage' || path === '/tournament-management') {
    return { name: 'feature', canonicalPath: '/tournament-ops', slug: 'Tournament Operations Suite' }
  }
  if (path === '/parent-portal' || path === '/parent' || path === '/passbook') {
    return { name: 'feature', canonicalPath: '/parent-portal', slug: 'Parent & Athlete Passbook' }
  }
  if (path === '/academies' || path === '/academy' || path === '/train') return { name: 'academies-index', canonicalPath: '/academies', ...(path === '/academies' ? {} : { alias: path }) }
  if (path.startsWith('/academies/') || path.startsWith('/academy/')) {
    const prefix = path.startsWith('/academies/') ? '/academies/' : '/academy/'
    const rest = path.slice(prefix.length)
    if (rest.endsWith('/enrol') || rest.endsWith('/enroll')) {
      const slug = rest.endsWith('/enrol') ? rest.slice(0, -('/enrol'.length)) : rest.slice(0, -('/enroll'.length))
      if (slug && !slug.includes('/')) return { name: 'academy-detail', canonicalPath: '/academies/:slug', slug: decodeURIComponentSafe(slug), isEnrol: true }
    }
    if (rest && !rest.includes('/')) return { name: 'academy-detail', canonicalPath: '/academies/:slug', slug: decodeURIComponentSafe(rest) }
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
  if (path.startsWith('/venues/') || path.startsWith('/book/')) {
    const prefix = path.startsWith('/venues/') ? '/venues/' : '/book/'
    const rest = path.slice(prefix.length)
    if (rest.endsWith('/book')) {
      const slug = rest.slice(0, -('/book'.length))
      if (slug && !slug.includes('/')) return { name: 'venue-detail', canonicalPath: '/venues/:slug', slug: decodeURIComponentSafe(slug), isBooking: true }
    }
    if (rest && !rest.includes('/')) return { name: 'venue-detail', canonicalPath: '/venues/:slug', slug: decodeURIComponentSafe(rest) }
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

  // Sports Tools & Calculators
  if (path === '/tools' || path === '/sports-tools') {
    return { name: 'feature', canonicalPath: '/tools', slug: 'Sports Tools & Calculators' }
  }
  if (path.startsWith('/tools/')) {
    const slug = path.slice('/tools/'.length)
    if (slug && !slug.includes('/')) {
      return { name: 'feature', canonicalPath: path, slug: 'Sports Tools & Calculators' }
    }
  }

  // Community pickup games, coaches and events detail/listing routing
  if (path === '/pickup-games' || path.startsWith('/pickup-games/')) {
    return { name: 'feature', canonicalPath: '/play', slug: 'Play · Find Games' }
  }
  if (path.startsWith('/coaches/')) {
    return { name: 'feature', canonicalPath: '/coaches', slug: 'Coaches Directory' }
  }
  if (path.startsWith('/events/') || path.startsWith('/tournaments/')) {
    return { name: 'feature', canonicalPath: '/events', slug: 'Events & Tournaments' }
  }

  if (featurePages[path]) return { name: 'feature', canonicalPath: path, slug: featurePages[path] }

  // /workspace/:persona and /workspace/:persona/:section — unified workspace shell
  if (path === '/workspace') return { name: 'feature', canonicalPath: '/workspace', slug: 'KhelGrid Workspace' }
  if (path.startsWith('/workspace/')) {
    const rest = path.slice('/workspace/'.length)
    const parts = rest.split('/')
    const persona = parts[0]
    if (persona && WORKSPACE_PERSONAS.has(persona)) {
      const section = parts[1] || 'overview'
      return {
        name: 'workspace-shell',
        canonicalPath: '/workspace/:persona/:section',
        persona: persona as WorkspacePersona,
        section,
      }
    }
  }

  return { name: 'not-found', canonicalPath: '/404' }
}
function decodeURIComponentSafe(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}

export function getPublishedListingUrl(listingType: string, titleOrSlug: string): string {
  const cleanSlug = (titleOrSlug || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'

  switch (listingType) {
    case 'venue':
      return `/venues/${cleanSlug}`
    case 'academy':
      return `/academies/${cleanSlug}`
    case 'opportunity':
      return `/opportunities/${cleanSlug}`
    case 'pickup_game':
      return `/pickup-games/${cleanSlug}`
    case 'coach':
      return `/coaches/${cleanSlug}`
    case 'event':
      return `/events/${cleanSlug}`
    default:
      return `/venues/${cleanSlug}`
  }
}


// ---------------------------------------------------------------------------
// Operational route helpers
// ---------------------------------------------------------------------------

/** Operational routes where marketing chrome (SportsBar, FAQ, footer sections)
 *  should be suppressed and CustomCursor disabled. */
const OPERATIONAL_PREFIXES = [
  '/workspace',
  '/dashboard',
  '/academy-hub',
  '/coach-dashboard',
  '/coach/hub',
  '/coach/manage',
  '/turf-calendar',
  '/host',
  '/tournament-ops',
  '/organizations',
  '/creator',
  '/parent-portal',
  '/gate-checkin',
  '/gate-check-in',
  '/admin',
]

export function isOperationalRoutePath(pathname: string): boolean {
  const p = normalizePath(pathname)
  return OPERATIONAL_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix + '/'))
}

/** Map legacy deep-link paths to unified WorkspaceShell targets. */
export type WorkspaceTarget = { persona: WorkspacePersona; section: string }

const LEGACY_PATH_MAP: Record<string, WorkspaceTarget> = {
  '/dashboard':       { persona: 'athlete',      section: 'overview' },
  '/academy-hub':     { persona: 'academy',      section: 'overview' },
  '/coach-dashboard': { persona: 'coach',        section: 'overview' },
  '/turf-calendar':   { persona: 'turf',         section: 'calendar' },
  '/host':            { persona: 'host',          section: 'overview' },
  '/tournament-ops':  { persona: 'tournament',   section: 'overview' },
  '/organizations':   { persona: 'organization', section: 'overview' },
  '/creator':         { persona: 'creator',      section: 'overview' },
  '/creator-hub':     { persona: 'creator',      section: 'overview' },
  '/workspaces':      { persona: 'organization', section: 'overview' },
}

/** Returns a WorkspaceTarget for a legacy path, or null if not a legacy operational path. */
export function mapLegacyPathToWorkspaceTarget(pathname: string): WorkspaceTarget | null {
  const p = normalizePath(pathname)
  return LEGACY_PATH_MAP[p] ?? null
}
