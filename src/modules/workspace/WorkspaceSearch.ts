import {
  getCachedAcademies,
  getCachedCities,
  getCachedCoaches,
  getCachedEvents,
  getCachedOpportunities,
  getCachedPickupGames,
  getCachedSports,
  getCachedVenues,
} from '../../shared/cache/catalogueQueryCache'
import { ALL_INDIAN_CITIES } from '../../shared/components/citiesData'
import { VERIFIED_SPORTS } from '../../shared/sitemapGenerator'
import { RESEARCH_PAPERS } from '../khelchronicle/data/khelchronicleData'
import { getCampaigns } from '../campaigns/campaignClient'
import {
  ALL_SEARCH_CATEGORIES,
  ALL_SEARCH_SOURCES,
  WORKSPACE_SEARCH_PROFILES,
  buildScopedSearchIndex,
  createWorkspaceSearchEngine,
  getWorkspaceDataSources,
  getWorkspaceSearchProfile,
  searchWorkspaceRecords,
  type WorkspaceSearchCategory,
  type WorkspaceSearchDatasets,
  type WorkspaceSearchItem,
  type WorkspaceSearchProfile,
  type WorkspaceSearchResult,
  type WorkspaceSearchSource,
} from './workspaceSearchEngine'
import type { CanonicalWorkspaceId } from '../../shared/components/workspaceHeaderEngine'

export type {
  WorkspaceSearchCategory,
  WorkspaceSearchDatasets,
  WorkspaceSearchItem,
  WorkspaceSearchProfile,
  WorkspaceSearchResult,
  WorkspaceSearchSource,
}

export {
  ALL_SEARCH_CATEGORIES,
  ALL_SEARCH_SOURCES,
  WORKSPACE_SEARCH_PROFILES,
  buildScopedSearchIndex,
  createWorkspaceSearchEngine,
  getWorkspaceDataSources,
  getWorkspaceSearchProfile,
  searchWorkspaceRecords,
}

const runtimeEngine = createWorkspaceSearchEngine({
  trials: async () => {
    const res = await getCachedOpportunities()
    return res.status === 'ready' ? res.data : []
  },
  academies: async () => {
    const res = await getCachedAcademies()
    return res.status === 'ready' ? res.data : []
  },
  venues: async () => {
    const res = await getCachedVenues()
    return res.status === 'ready' ? res.data : []
  },
  coaches: async () => {
    const res = await getCachedCoaches()
    return res.status === 'ready' ? res.data : []
  },
  events: async () => {
    const res = await getCachedEvents()
    return res.status === 'ready' ? res.data : []
  },
  games: async () => {
    const res = await getCachedPickupGames()
    return res.status === 'ready' ? res.data : []
  },
  campaigns: async () => {
    return getCampaigns()
  },
  sports: async () => {
    const res = await getCachedSports()
    if (res.status === 'ready' && res.data.length > 0) {
      return res.data
    }
    return VERIFIED_SPORTS.map(s => ({
      id: s,
      slug: s,
      name: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '),
    }))
  },
  cities: async () => {
    const res = await getCachedCities()
    if (res.status === 'ready' && res.data.length > 0) {
      return res.data
    }
    return ALL_INDIAN_CITIES.map(c => ({
      slug: c.slug,
      name: c.name,
      state: c.state,
      zone: c.zone,
      is_metro: c.isMetro,
      venues: c.venues,
    }))
  },
  papers: async () => RESEARCH_PAPERS,
})

/**
 * Centralized WorkspaceSearch utility.
 * Queries only the data sources permitted by the user's current `activeHeaderPersona`
 * (or all sources when `unscoped: true` is explicitly passed) and enforces workspace scoping.
 */
export const WorkspaceSearch = {
  getProfile(persona: CanonicalWorkspaceId): WorkspaceSearchProfile {
    return runtimeEngine.getProfile(persona)
  },

  getAllowedSources(
    persona: CanonicalWorkspaceId,
    options?: { unscoped?: boolean },
  ): readonly WorkspaceSearchSource[] {
    return runtimeEngine.getAllowedSources(persona, options)
  },

  buildScopedSearchIndex(
    persona: CanonicalWorkspaceId,
    datasets: WorkspaceSearchDatasets,
    options?: { unscoped?: boolean },
  ): WorkspaceSearchItem[] {
    return buildScopedSearchIndex(persona, datasets, options)
  },

  loadScopeDatasets(
    persona: CanonicalWorkspaceId,
    options?: { unscoped?: boolean },
  ): Promise<{ datasets: WorkspaceSearchDatasets; sourcesQueried: readonly WorkspaceSearchSource[] }> {
    return runtimeEngine.loadScopeDatasets(persona, options)
  },

  search(input: {
    query: string
    activeHeaderPersona: CanonicalWorkspaceId
    category?: WorkspaceSearchCategory | 'all' | string
    limit?: number
    unscoped?: boolean
  }): Promise<WorkspaceSearchResult> {
    return runtimeEngine.search(input)
  },

  searchSync(input: {
    persona: CanonicalWorkspaceId
    query: string
    datasets: WorkspaceSearchDatasets
    category?: WorkspaceSearchCategory | 'all' | string
    limit?: number
    unscoped?: boolean
  }): WorkspaceSearchResult {
    return runtimeEngine.searchSync(input)
  },
}
