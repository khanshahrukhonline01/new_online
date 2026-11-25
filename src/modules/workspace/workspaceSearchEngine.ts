import type { Academy, Coach, EventItem, Opportunity, Sport, Venue } from '../../shared/domain'
import type { DatabaseCity, DatabasePickupGame } from '../../integrations/supabase/public-client'
import type { ResearchPaper } from '../khelchronicle/data/khelchronicleData'
import type { Campaign } from '../campaigns/campaignClient'
import type { CanonicalWorkspaceId } from '../../shared/components/workspaceHeaderEngine'
import { CANONICAL_WORKSPACES } from '../../shared/components/workspaceHeaderEngine'

export type WorkspaceSearchSource =
  | 'trials'
  | 'academies'
  | 'venues'
  | 'coaches'
  | 'events'
  | 'games'
  | 'campaigns'
  | 'sports'
  | 'cities'
  | 'papers'
  | 'workspace'

export type WorkspaceSearchCategory =
  | 'workspace'
  | 'trial'
  | 'academy'
  | 'venue'
  | 'coach'
  | 'event'
  | 'game'
  | 'campaign'
  | 'sport'
  | 'city'
  | 'paper'

export interface WorkspaceSearchItem {
  id: string
  title: string
  subtitle: string
  category: WorkspaceSearchCategory
  categoryLabel: string
  source: WorkspaceSearchSource
  href: string
  badge?: string
  icon: string
  keywords?: string[]
}

export interface WorkspaceSearchQuickChip {
  label: string
  query?: string
  href?: string
}

export interface WorkspaceSearchProfile {
  persona: CanonicalWorkspaceId
  label: string
  scopeLabel: string
  description: string
  placeholder: string
  sources: readonly WorkspaceSearchSource[]
  allowedCategories: readonly WorkspaceSearchCategory[]
  categoryLabels: ReadonlyArray<{ id: WorkspaceSearchCategory; label: string }>
  quickChips: readonly WorkspaceSearchQuickChip[]
}

export interface WorkspaceSearchDatasets {
  trials?: Opportunity[]
  academies?: Academy[]
  venues?: Venue[]
  coaches?: Coach[]
  events?: EventItem[]
  games?: DatabasePickupGame[]
  campaigns?: Campaign[]
  sports?: Sport[]
  cities?: DatabaseCity[]
  papers?: ResearchPaper[]
}

export interface WorkspaceSearchResult {
  persona: CanonicalWorkspaceId
  scopeLabel: string
  sourcesQueried: readonly WorkspaceSearchSource[]
  unscoped: boolean
  query: string
  totalMatched: number
  items: WorkspaceSearchItem[]
}

export const ALL_SEARCH_SOURCES: readonly WorkspaceSearchSource[] = [
  'trials',
  'academies',
  'venues',
  'coaches',
  'events',
  'games',
  'campaigns',
  'sports',
  'cities',
  'papers',
  'workspace',
]

export const ALL_SEARCH_CATEGORIES: ReadonlyArray<{ id: WorkspaceSearchCategory; label: string }> = [
  { id: 'sport', label: 'Sports' },
  { id: 'trial', label: 'Trials' },
  { id: 'venue', label: 'Venues' },
  { id: 'city', label: 'Cities' },
  { id: 'academy', label: 'Academies' },
  { id: 'paper', label: 'Research' },
  { id: 'coach', label: 'Coaches' },
  { id: 'event', label: 'Events' },
  { id: 'campaign', label: 'Campaigns' },
  { id: 'game', label: 'Pickup' },
  { id: 'workspace', label: 'Tools' },
]

export const WORKSPACE_SEARCH_PROFILES: Record<CanonicalWorkspaceId, WorkspaceSearchProfile> = {
  athlete: {
    persona: 'athlete',
    label: 'Athlete',
    scopeLabel: 'Athlete Workspace Scope',
    description: 'Trials, academies, venues, coaches, pickup games, research & player tools',
    placeholder: 'Search sports, trials, turfs, cities, academies, preprints…',
    sources: ['trials', 'academies', 'venues', 'games', 'coaches', 'papers', 'sports', 'cities', 'workspace'],
    allowedCategories: ['trial', 'academy', 'venue', 'game', 'coach', 'paper', 'sport', 'city', 'workspace'],
    categoryLabels: [
      { id: 'sport', label: 'Sports' },
      { id: 'trial', label: 'Trials' },
      { id: 'venue', label: 'Venues' },
      { id: 'city', label: 'Cities' },
      { id: 'academy', label: 'Academies' },
      { id: 'paper', label: 'Research' },
      { id: 'coach', label: 'Coaches' },
      { id: 'game', label: 'Pickup' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '⚽ Football Trials', query: 'Football' },
      { label: '🏸 Badminton Turfs', query: 'Badminton' },
      { label: '🏏 Cricket Academies', query: 'Cricket' },
      { label: '📍 Delhi Hub', query: 'Delhi' },
      { label: '📍 Bengaluru Hub', query: 'Bengaluru' },
      { label: '⚡ Pickleball Games', query: 'Pickleball' },
      { label: '🥍 Lacrosse Sixes', query: 'Lacrosse' },
      { label: '📋 Sports CV Wizard', href: '/sports-cv' },
      { label: '📊 Live Match Center', href: '/live' },
    ],
  },
  academy: {
    persona: 'academy',
    label: 'Academy',
    scopeLabel: 'Academy Workspace Scope',
    description: 'Academies, coaching staff, selection trials & training grounds',
    placeholder: 'Search academies, coaches, selection trials, training venues…',
    sources: ['academies', 'coaches', 'trials', 'venues', 'workspace'],
    allowedCategories: ['academy', 'coach', 'trial', 'venue', 'workspace'],
    categoryLabels: [
      { id: 'academy', label: 'Academies' },
      { id: 'coach', label: 'Coaches' },
      { id: 'trial', label: 'Trials' },
      { id: 'venue', label: 'Venues' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '🏛️ Cricket Academies', query: 'Cricket' },
      { label: '🏅 Coaching Staff', query: 'Coach' },
      { label: '🏆 Selection Trials', query: 'Trial' },
      { label: '📍 Bengaluru Academies', query: 'Bengaluru' },
      { label: '🏢 Admissions Hub', href: '/academy-hub' },
      { label: '🗂️ Branches & Batches', href: '/workspace/academy/batches' },
    ],
  },
  venue: {
    persona: 'venue',
    label: 'Venue',
    scopeLabel: 'Venue Workspace Scope',
    description: 'Venues, turfs, pickup slot demand, partner academies & city hubs',
    placeholder: 'Search venues, turfs, courts, city hubs, pickup matches…',
    sources: ['venues', 'games', 'cities', 'academies', 'workspace'],
    allowedCategories: ['venue', 'game', 'city', 'academy', 'workspace'],
    categoryLabels: [
      { id: 'venue', label: 'Venues' },
      { id: 'game', label: 'Pickup' },
      { id: 'city', label: 'Cities' },
      { id: 'academy', label: 'Academies' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '⚽ Football Turfs', query: 'Football' },
      { label: '🏸 Badminton Courts', query: 'Badminton' },
      { label: '🏟️ Govt Facilities', query: 'Stadium' },
      { label: '📍 Delhi Venues', query: 'Delhi' },
      { label: '📅 Open Slot Calendar', href: '/workspace/turf/calendar' },
      { label: '📋 Host Dashboard', href: '/host' },
    ],
  },
  coach: {
    persona: 'coach',
    label: 'Coach',
    scopeLabel: 'Coach Workspace Scope',
    description: 'Coaches, academy openings, trials & sports science research',
    placeholder: 'Search coaches, academies, trials, KhelChronicle research…',
    sources: ['coaches', 'academies', 'trials', 'papers', 'workspace'],
    allowedCategories: ['coach', 'academy', 'trial', 'paper', 'workspace'],
    categoryLabels: [
      { id: 'coach', label: 'Coaches' },
      { id: 'academy', label: 'Academies' },
      { id: 'trial', label: 'Trials' },
      { id: 'paper', label: 'Research' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '🏅 NIS Certified Coaches', query: 'NIS' },
      { label: '🏛️ Academy Openings', query: 'Academy' },
      { label: '🔬 Biomechanics Preprints', query: 'Biomechanics' },
      { label: '🏆 Youth Trials', query: 'U-17' },
      { label: '🎓 Coach Credentials', href: '/workspace/coach/credentials' },
    ],
  },
  trial_organiser: {
    persona: 'trial_organiser',
    label: 'Trial Organiser',
    scopeLabel: 'Trial Organiser Scope',
    description: 'Selection trials, tournaments, host grounds & participating academies',
    placeholder: 'Search trials, tournaments, host grounds, academies…',
    sources: ['trials', 'events', 'venues', 'academies', 'workspace'],
    allowedCategories: ['trial', 'event', 'venue', 'academy', 'workspace'],
    categoryLabels: [
      { id: 'trial', label: 'Trials' },
      { id: 'event', label: 'Events' },
      { id: 'venue', label: 'Venues' },
      { id: 'academy', label: 'Academies' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '🏆 Selection Trials', query: 'Trial' },
      { label: '🎯 State Tournaments', query: 'Championship' },
      { label: '🏟️ Host Stadiums', query: 'Stadium' },
      { label: '📱 Gate Check-In', href: '/gate-checkin' },
      { label: '⚙️ Tournament Ops', href: '/workspace/tournament/overview' },
    ],
  },
  creator: {
    persona: 'creator',
    label: 'Creator',
    scopeLabel: 'Creator Workspace Scope',
    description: 'Creator campaigns, partner academies, venues & trials to feature',
    placeholder: 'Search campaigns, creator briefs, trials, venues, academies…',
    sources: ['campaigns', 'trials', 'venues', 'academies', 'workspace'],
    allowedCategories: ['campaign', 'trial', 'venue', 'academy', 'workspace'],
    categoryLabels: [
      { id: 'campaign', label: 'Campaigns' },
      { id: 'trial', label: 'Trials' },
      { id: 'venue', label: 'Venues' },
      { id: 'academy', label: 'Academies' },
      { id: 'workspace', label: 'Tools' },
    ],
    quickChips: [
      { label: '✨ Cricket Campaigns', query: 'Cricket' },
      { label: '📣 Active Briefs', query: 'Open' },
      { label: '🏆 Trials to Cover', query: 'Trial' },
      { label: '🏟️ Venue Spotlights', query: 'Turf' },
      { label: '🚀 Creator Hub', href: '/workspace/creator/overview' },
    ],
  },
}

const SOURCE_TO_CATEGORY: Record<WorkspaceSearchSource, WorkspaceSearchCategory> = {
  trials: 'trial',
  academies: 'academy',
  venues: 'venue',
  coaches: 'coach',
  events: 'event',
  games: 'game',
  campaigns: 'campaign',
  sports: 'sport',
  cities: 'city',
  papers: 'paper',
  workspace: 'workspace',
}

export function getWorkspaceSearchProfile(persona: CanonicalWorkspaceId): WorkspaceSearchProfile {
  return WORKSPACE_SEARCH_PROFILES[persona] ?? WORKSPACE_SEARCH_PROFILES.athlete
}

export function getWorkspaceDataSources(
  persona: CanonicalWorkspaceId,
  options?: { unscoped?: boolean },
): readonly WorkspaceSearchSource[] {
  if (options?.unscoped) return ALL_SEARCH_SOURCES
  return getWorkspaceSearchProfile(persona).sources
}

function buildSourceIndex(
  source: WorkspaceSearchSource,
  persona: CanonicalWorkspaceId,
  datasets: WorkspaceSearchDatasets,
): WorkspaceSearchItem[] {
  switch (source) {
    case 'trials':
      return (datasets.trials ?? []).map(opp => ({
        id: `trial-${opp.id}`,
        title: opp.title,
        subtitle: `${opp.opportunity_type || 'Trial'} · ${opp.city || 'Pan-India'}`,
        category: 'trial',
        categoryLabel: 'Trial',
        source: 'trials',
        href: `/opportunities/${encodeURIComponent(opp.slug)}`,
        badge: opp.is_featured ? 'Featured' : opp.verification_status === 'verified' ? 'Verified' : undefined,
        icon: 'trophy',
        keywords: [
          opp.opportunity_type,
          opp.city || '',
          opp.organizer_name || '',
          opp.venue_name || '',
          opp.age_category || '',
          opp.sport?.name || '',
        ].filter(Boolean),
      }))

    case 'academies':
      return (datasets.academies ?? []).map(acad => ({
        id: `academy-${acad.id}`,
        title: acad.name,
        subtitle: `${acad.city}${acad.state ? `, ${acad.state}` : ''}${acad.sport ? ` · ${acad.sport}` : ''}`,
        category: 'academy',
        categoryLabel: 'Academy',
        source: 'academies',
        href: `/academies?q=${encodeURIComponent(acad.name)}`,
        badge: acad.admission_open ? 'Admissions Open' : undefined,
        icon: 'building',
        keywords: [
          acad.city,
          acad.state || '',
          acad.sport || '',
          acad.head_coach || '',
          ...(acad.facilities || []),
        ].filter(Boolean),
      }))

    case 'venues':
      return (datasets.venues ?? []).map(v => ({
        id: `venue-${v.id}`,
        title: v.name,
        subtitle: `${v.city}${v.address ? ` · ${v.address}` : ''}`,
        category: 'venue',
        categoryLabel: 'Venue',
        source: 'venues',
        href: `/venues/${encodeURIComponent(v.slug)}`,
        badge: v.government_facility ? 'Govt Facility' : undefined,
        icon: 'calendar-check',
        keywords: [
          v.city,
          v.state || '',
          v.sport || '',
          v.surface_type || '',
          ...(v.facilities || []),
        ].filter(Boolean),
      }))

    case 'coaches':
      return (datasets.coaches ?? []).map(c => ({
        id: `coach-${c.id}`,
        title: c.display_name || c.name || 'Coach',
        subtitle: `${c.city}${c.sport || c.sportCategory ? ` · ${c.sport || c.sportCategory}` : ''}`,
        category: 'coach',
        categoryLabel: 'Coach',
        source: 'coaches',
        href: `/coaches?q=${encodeURIComponent(c.display_name || c.name || '')}`,
        badge: c.verification_status === 'verified' ? 'Verified' : c.certification || undefined,
        icon: 'award',
        keywords: [
          c.city,
          c.state || '',
          c.sport || '',
          c.sportCategory || '',
          c.certification || '',
          c.academy_affiliation || c.academyAffiliation || '',
          ...(c.specialties || []),
        ].filter(Boolean),
      }))

    case 'events':
      return (datasets.events ?? []).map(ev => ({
        id: `event-${ev.id}`,
        title: ev.title,
        subtitle: [ev.organizer_name, ev.city, ev.sport].filter(Boolean).join(' · ') || 'Tournament & Event',
        category: 'event',
        categoryLabel: 'Event',
        source: 'events',
        href: `/events?q=${encodeURIComponent(ev.title)}`,
        badge: ev.category || undefined,
        icon: 'target',
        keywords: [
          ev.sport || '',
          ev.city || '',
          ev.organizer_name || '',
          ev.sanctioning_body || ev.sanctioningBody || '',
          ev.category || '',
        ].filter(Boolean),
      }))

    case 'games':
      return (datasets.games ?? []).map(g => ({
        id: `pickup-${g.id}`,
        title: `${g.emoji || '⚽'} ${g.sport} in ${g.city}`,
        subtitle: `${g.venue_name} · ${g.time_label} (${g.spots_open} spots)`,
        category: 'game',
        categoryLabel: 'Pickup Match',
        source: 'games',
        href: '/play',
        icon: 'activity',
        keywords: [g.sport, g.city, g.venue_name, g.skill_level || ''].filter(Boolean),
      }))

    case 'campaigns':
      return (datasets.campaigns ?? []).map(camp => ({
        id: `campaign-${camp.id}`,
        title: camp.title,
        subtitle: `${camp.advertiserName} · ${camp.sport} · ${camp.locationCity}`,
        category: 'campaign',
        categoryLabel: 'Campaign',
        source: 'campaigns',
        href: `/campaigns/${encodeURIComponent(camp.slug)}`,
        badge: camp.status,
        icon: 'sparkles',
        keywords: [
          camp.sport,
          camp.locationCity,
          camp.category,
          camp.advertiserName,
          camp.purpose,
          camp.status,
        ].filter(Boolean),
      }))

    case 'sports':
      return (datasets.sports ?? []).map(s => ({
        id: `sport-${s.slug}`,
        title: s.name,
        subtitle: 'Olympic & Competitive Sport Directory',
        category: 'sport',
        categoryLabel: 'Sport',
        source: 'sports',
        href: `/sports/${encodeURIComponent(s.slug)}`,
        icon: 'sports',
        keywords: [s.slug, s.name],
      }))

    case 'cities':
      return (datasets.cities ?? []).map(c => ({
        id: `city-${c.slug}`,
        title: `${c.name} Sports Hub`,
        subtitle: `${c.state} · ${c.is_metro ? 'Premier Metro Hub' : 'Regional Sports City'}`,
        category: 'city',
        categoryLabel: 'City Hub',
        source: 'cities',
        href: `/cities/${encodeURIComponent(c.slug)}`,
        badge: c.is_metro ? 'Metro' : undefined,
        icon: 'map-pin',
        keywords: [c.name, c.state, c.zone, ...(c.venues || [])].filter(Boolean),
      }))

    case 'papers':
      return (datasets.papers ?? []).map(paper => ({
        id: `paper-${paper.id}`,
        title: paper.title,
        subtitle: `${paper.authors.map(a => a.name).join(', ')} · ${paper.category}`,
        category: 'paper',
        categoryLabel: 'Research',
        source: 'papers',
        href: `/khelchronicle/${encodeURIComponent(paper.slug)}`,
        icon: 'book-open',
        keywords: [
          paper.paperId,
          paper.category,
          paper.categoryName || '',
          ...(paper.keywords || []),
        ].filter(Boolean),
      }))

    case 'workspace': {
      const ws = CANONICAL_WORKSPACES.find(w => w.id === persona) ?? CANONICAL_WORKSPACES[0]
      return [
        ...ws.pillars.map(p => ({
          id: `ws-pillar-${ws.id}-${p.id}`,
          title: `${ws.label} · ${p.label}`,
          subtitle: p.description,
          category: 'workspace' as const,
          categoryLabel: 'Workspace',
          source: 'workspace' as const,
          href: p.href,
          badge: ws.label,
          icon: p.icon,
          keywords: [ws.label, p.label, p.description],
        })),
        ...ws.contextActions.map(a => ({
          id: `ws-action-${ws.id}-${a.id}`,
          title: a.label,
          subtitle: a.description,
          category: 'workspace' as const,
          categoryLabel: 'Quick Tool',
          source: 'workspace' as const,
          href: a.href,
          badge: a.badge,
          icon: a.icon,
          keywords: [ws.label, a.label, a.description],
        })),
      ]
    }
  }
}

export function buildScopedSearchIndex(
  persona: CanonicalWorkspaceId,
  datasets: WorkspaceSearchDatasets,
  options?: { unscoped?: boolean },
): WorkspaceSearchItem[] {
  const sources = getWorkspaceDataSources(persona, options)
  const items: WorkspaceSearchItem[] = []
  for (const source of sources) {
    items.push(...buildSourceIndex(source, persona, datasets))
  }
  return items
}

function scoreMatch(
  item: WorkspaceSearchItem,
  q: string,
  sourcePriority: Map<WorkspaceSearchSource, number>,
): number {
  const title = item.title.toLowerCase()
  const subtitle = item.subtitle.toLowerCase()
  const category = item.categoryLabel.toLowerCase()
  const keywords = (item.keywords || []).join(' ').toLowerCase()

  let score = 0
  if (title === q) score += 120
  else if (title.startsWith(q)) score += 90
  else if (title.includes(q)) score += 65
  else if (category.includes(q)) score += 40
  else if (subtitle.includes(q)) score += 35
  else if (keywords.includes(q)) score += 25
  else return -1

  // Respect persona priority order (earlier data sources rank higher on ties)
  const idx = sourcePriority.get(item.source)
  if (idx !== undefined) {
    score += Math.max(0, 15 - idx)
  }
  if (item.badge) {
    score += 3
  }
  return score
}

export function searchWorkspaceRecords(input: {
  persona: CanonicalWorkspaceId
  query: string
  datasets: WorkspaceSearchDatasets
  category?: WorkspaceSearchCategory | 'all' | string
  limit?: number
  unscoped?: boolean
}): WorkspaceSearchResult {
  const profile = getWorkspaceSearchProfile(input.persona)
  const sourcesQueried = getWorkspaceDataSources(input.persona, { unscoped: input.unscoped })
  const trimmedQuery = input.query.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
  const categoryFilter = input.category && input.category !== 'all' ? input.category : null
  const limit = input.limit ?? 30

  if (!normalizedQuery) {
    return {
      persona: input.persona,
      scopeLabel: input.unscoped ? 'All KhelGrid' : profile.scopeLabel,
      sourcesQueried,
      unscoped: Boolean(input.unscoped),
      query: '',
      totalMatched: 0,
      items: [],
    }
  }

  // Enforce workspace scope even on category selection when scoped
  if (!input.unscoped && categoryFilter) {
    const allowedCat = profile.allowedCategories.includes(categoryFilter as WorkspaceSearchCategory)
    const allowedBySource = sourcesQueried.some(src => SOURCE_TO_CATEGORY[src] === categoryFilter)
    if (!allowedCat && !allowedBySource) {
      return {
        persona: input.persona,
        scopeLabel: profile.scopeLabel,
        sourcesQueried,
        unscoped: false,
        query: trimmedQuery,
        totalMatched: 0,
        items: [],
      }
    }
  }

  const index = buildScopedSearchIndex(input.persona, input.datasets, { unscoped: input.unscoped })
  const sourcePriority = new Map<WorkspaceSearchSource, number>(
    sourcesQueried.map((src, i) => [src, i]),
  )

  const scored: Array<{ item: WorkspaceSearchItem; score: number }> = []
  for (const item of index) {
    if (categoryFilter && item.category !== categoryFilter) continue
    const score = scoreMatch(item, normalizedQuery, sourcePriority)
    if (score >= 0) {
      scored.push({ item, score })
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.item.title.localeCompare(b.item.title)
  })

  return {
    persona: input.persona,
    scopeLabel: input.unscoped ? 'All KhelGrid' : profile.scopeLabel,
    sourcesQueried,
    unscoped: Boolean(input.unscoped),
    query: trimmedQuery,
    totalMatched: scored.length,
    items: scored.slice(0, limit).map(entry => entry.item),
  }
}

export type WorkspaceSearchLoaders = {
  trials?: () => Promise<Opportunity[]>
  academies?: () => Promise<Academy[]>
  venues?: () => Promise<Venue[]>
  coaches?: () => Promise<Coach[]>
  events?: () => Promise<EventItem[]>
  games?: () => Promise<DatabasePickupGame[]>
  campaigns?: () => Promise<Campaign[]>
  sports?: () => Promise<Sport[]>
  cities?: () => Promise<DatabaseCity[]>
  papers?: () => Promise<ResearchPaper[]>
}

export function createWorkspaceSearchEngine(loaders: WorkspaceSearchLoaders) {
  async function loadScopeDatasets(
    persona: CanonicalWorkspaceId,
    options?: { unscoped?: boolean },
  ): Promise<{ datasets: WorkspaceSearchDatasets; sourcesQueried: readonly WorkspaceSearchSource[] }> {
    const sourcesQueried = getWorkspaceDataSources(persona, options)
    const datasets: WorkspaceSearchDatasets = {}

    const tasks = sourcesQueried.map(async source => {
      if (source === 'workspace') return
      const loader = loaders[source]
      if (!loader) return
      try {
        const rows = await loader()
        ;(datasets as Record<string, unknown>)[source] = Array.isArray(rows) ? rows : []
      } catch {
        ;(datasets as Record<string, unknown>)[source] = []
      }
    })

    await Promise.all(tasks)
    return { datasets, sourcesQueried }
  }

  async function search(input: {
    query: string
    activeHeaderPersona: CanonicalWorkspaceId
    category?: WorkspaceSearchCategory | 'all' | string
    limit?: number
    unscoped?: boolean
  }): Promise<WorkspaceSearchResult> {
    const { datasets } = await loadScopeDatasets(input.activeHeaderPersona, {
      unscoped: input.unscoped,
    })

    return searchWorkspaceRecords({
      persona: input.activeHeaderPersona,
      query: input.query,
      datasets,
      category: input.category,
      limit: input.limit,
      unscoped: input.unscoped,
    })
  }

  return {
    getProfile: getWorkspaceSearchProfile,
    getAllowedSources: getWorkspaceDataSources,
    loadScopeDatasets,
    search,
    searchSync: searchWorkspaceRecords,
  }
}
