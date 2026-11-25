import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createWorkspaceSearchEngine,
  getWorkspaceDataSources,
  getWorkspaceSearchProfile,
  searchWorkspaceRecords,
  type WorkspaceSearchDatasets,
} from './workspaceSearchEngine.ts'
import type { CanonicalWorkspaceId } from '../../shared/components/workspaceHeaderEngine.ts'

const SAMPLE_DATASETS: WorkspaceSearchDatasets = {
  trials: [
    {
      id: 'trial-1',
      slug: 'delhi-u17-football-trial',
      title: 'Delhi U-17 Football Selection Trial',
      opportunity_type: 'trial',
      organizer_name: 'DSA',
      city: 'Delhi',
      venue_name: 'Ambedkar Stadium',
      starts_at: null,
      ends_at: null,
      application_deadline: null,
      source_url: null,
      source_name: null,
      verification_status: 'verified',
    },
  ],
  academies: [
    {
      id: 'acad-1',
      slug: 'bengaluru-football-academy',
      name: 'Bengaluru Football Academy',
      description: 'Elite youth training centre',
      city: 'Bengaluru',
      state: 'Karnataka',
      website_url: null,
      public_contact_url: null,
      verification_status: 'verified',
      sport: 'Football',
      admission_open: true,
    },
  ],
  venues: [
    {
      id: 'venue-1',
      slug: 'indiranagar-football-turf',
      name: 'Indiranagar Football Turf',
      description: 'FIFA-grade synthetic pitch',
      city: 'Bengaluru',
      address: '100 Feet Road',
      timezone: 'Asia/Kolkata',
      sport: 'Football',
    },
  ],
  coaches: [
    {
      id: 'coach-1',
      slug: 'coach-arjun-football',
      display_name: 'Arjun Mehta · Football Coach',
      bio: 'AIFF B-License coach',
      city: 'Delhi',
      state: 'Delhi',
      website_url: null,
      public_contact_url: null,
      verification_status: 'verified',
      sport: 'Football',
    },
  ],
  events: [
    {
      id: 'event-1',
      slug: 'subroto-football-cup',
      title: 'Subroto Football Championship',
      sport: 'Football',
      city: 'Delhi',
    },
  ],
  games: [
    {
      id: 'game-1',
      sport: 'Football',
      emoji: '⚽',
      city: 'Mumbai',
      venue_name: 'Andheri Turf',
      date_label: 'Today',
      time_label: '7:00 PM',
      spots_open: 4,
      total_spots: 10,
      skill_level: 'Intermediate',
      price_per_player: '₹250',
      host_name: 'Rohan',
      format: '5v5',
      created_at: '2026-11-25T00:00:00Z',
    },
  ],
  campaigns: [
    {
      id: 'camp-1',
      slug: 'football-reel-campaign',
      title: 'Grassroots Football Reel Campaign',
      purpose: 'Cover state football trials',
      category: 'trial_announcement',
      sport: 'Football',
      locationCity: 'Delhi',
      language: 'English',
      advertiserName: 'KhelGrid Studio',
      advertiserRole: 'tournament_organiser',
      advertiserVerified: true,
      advertiserContact: 'khelgrid@gmail.com',
      status: 'open',
      compensationModel: 'fixed_per_deliverable',
      perDeliverableFeePaise: 500000,
      totalBudgetPaise: 2500000,
      deliverables: [],
      keyMessages: [],
      requiredTags: [],
      maxCreators: 5,
      acceptedCreatorsCount: 1,
      minFollowersRequired: 1000,
      applicationDeadline: '2026-12-15',
      createdAt: '2026-11-01',
    },
  ],
  sports: [{ id: 'football', slug: 'football', name: 'Football' }],
  cities: [
    {
      slug: 'delhi',
      name: 'Delhi',
      state: 'Delhi',
      zone: 'North',
      is_metro: true,
      venues: ['JLN Stadium'],
    },
  ],
  papers: [
    {
      id: 'paper-1',
      paperId: 'KG-2026-999',
      slug: 'football-sprint-kinematics',
      title: 'Youth Football Sprint Kinematics Study',
      category: 'sports-biomechanics',
      categoryName: 'Sports Biomechanics',
      authors: [{ name: 'Dr. Sen', role: 'Lead', affiliation: 'NIS', profileSlug: 'dr-sen' }],
      publishedAt: '2026-11-01',
      updatedAt: '2026-11-01',
      version: 'v1.0',
      readTimeMinutes: 10,
      views: 100,
      downloads: 20,
      citations: 1,
      keywords: ['Football'],
      abstract: {
        background: 'Football speed analysis',
        methods: 'Motion capture',
        results: 'Improved acceleration',
        conclusion: 'Effective sprint training',
      },
      takeaways: [],
      metrics: [],
      platformLinks: [],
      sections: [],
      references: [],
    },
  ],
}

describe('workspaceSearch engine', () => {
  it('defines distinct allowed data sources for every canonical workspace persona', () => {
    const personas: CanonicalWorkspaceId[] = [
      'athlete',
      'academy',
      'venue',
      'coach',
      'trial_organiser',
      'creator',
    ]

    for (const persona of personas) {
      const profile = getWorkspaceSearchProfile(persona)
      const sources = getWorkspaceDataSources(persona)
      assert.equal(profile.persona, persona)
      assert.ok(sources.length >= 4, `Expected at least 4 sources for ${persona}`)
      assert.ok(sources.includes('workspace'))
    }

    assert.equal(getWorkspaceDataSources('venue').includes('trials'), false)
    assert.equal(getWorkspaceDataSources('academy').includes('campaigns'), false)
    assert.equal(getWorkspaceDataSources('creator').includes('campaigns'), true)
  })

  it('invokes only data loaders required by activeHeaderPersona', async () => {
    const called: string[] = []
    const engine = createWorkspaceSearchEngine({
      trials: async () => {
        called.push('trials')
        return SAMPLE_DATASETS.trials ?? []
      },
      academies: async () => {
        called.push('academies')
        return SAMPLE_DATASETS.academies ?? []
      },
      venues: async () => {
        called.push('venues')
        return SAMPLE_DATASETS.venues ?? []
      },
      coaches: async () => {
        called.push('coaches')
        return SAMPLE_DATASETS.coaches ?? []
      },
      events: async () => {
        called.push('events')
        return SAMPLE_DATASETS.events ?? []
      },
      games: async () => {
        called.push('games')
        return SAMPLE_DATASETS.games ?? []
      },
      campaigns: async () => {
        called.push('campaigns')
        return SAMPLE_DATASETS.campaigns ?? []
      },
      sports: async () => {
        called.push('sports')
        return SAMPLE_DATASETS.sports ?? []
      },
      cities: async () => {
        called.push('cities')
        return SAMPLE_DATASETS.cities ?? []
      },
      papers: async () => {
        called.push('papers')
        return SAMPLE_DATASETS.papers ?? []
      },
    })

    // Venue persona should query venues, games, cities, academies — NEVER trials, campaigns, papers, coaches
    const venueResult = await engine.search({
      query: 'Football',
      activeHeaderPersona: 'venue',
    })
    assert.deepEqual(
      called.sort(),
      ['academies', 'cities', 'games', 'venues'],
    )
    assert.equal(venueResult.items.some(i => i.category === 'trial'), false)
    assert.equal(venueResult.items.some(i => i.category === 'campaign'), false)
    assert.equal(venueResult.items.some(i => i.category === 'paper'), false)
    assert.equal(venueResult.items.some(i => i.category === 'venue'), true)

    // Creator persona should query campaigns, trials, venues, academies
    called.length = 0
    const creatorResult = await engine.search({
      query: 'Football',
      activeHeaderPersona: 'creator',
    })
    assert.deepEqual(
      called.sort(),
      ['academies', 'campaigns', 'trials', 'venues'],
    )
    assert.equal(creatorResult.items[0]?.category, 'campaign')
  })

  it('enforces workspace scope boundaries even when full datasets are passed synchronously', () => {
    // Academy persona excludes campaigns, pickup games, research papers
    const academyResult = searchWorkspaceRecords({
      persona: 'academy',
      query: 'Football',
      datasets: SAMPLE_DATASETS,
    })

    const academyCategories = new Set(academyResult.items.map(i => i.category))
    assert.equal(academyCategories.has('academy'), true)
    assert.equal(academyCategories.has('coach'), true)
    assert.equal(academyCategories.has('trial'), true)
    assert.equal(academyCategories.has('venue'), true)
    assert.equal(academyCategories.has('campaign'), false)
    assert.equal(academyCategories.has('paper'), false)
    assert.equal(academyCategories.has('game'), false)

    // Explicitly widening with unscoped: true searches across all categories
    const globalResult = searchWorkspaceRecords({
      persona: 'academy',
      query: 'Football',
      datasets: SAMPLE_DATASETS,
      unscoped: true,
    })
    assert.equal(globalResult.items.some(i => i.category === 'campaign'), true)
    assert.equal(globalResult.items.some(i => i.category === 'paper'), true)
  })

  it('blocks out-of-scope category filters when scoped to a persona', () => {
    const result = searchWorkspaceRecords({
      persona: 'venue',
      query: 'Football',
      datasets: SAMPLE_DATASETS,
      category: 'trial',
    })
    assert.equal(result.totalMatched, 0)
    assert.deepEqual(result.items, [])
  })

  it('ranks persona-prioritized sources ahead of secondary sources on equal text matches', () => {
    const coachResult = searchWorkspaceRecords({
      persona: 'coach',
      query: 'Football',
      datasets: SAMPLE_DATASETS,
    })
    assert.equal(coachResult.items[0]?.category, 'coach')

    const trialOrgResult = searchWorkspaceRecords({
      persona: 'trial_organiser',
      query: 'Football',
      datasets: SAMPLE_DATASETS,
    })
    assert.equal(trialOrgResult.items[0]?.category, 'trial')
  })
})
