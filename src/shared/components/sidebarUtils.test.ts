import { describe, it, expect } from 'vitest'
import { navigationModules } from '../navigation/navigationRegistry'
import {
  stripLeadingPlus,
  isSidebarItemActive,
  resolveSidebarModeForPath,
  getModulesForMode,
  getCollapsedRailGroups,
  shouldShowSportsCvPromo,
  readPersistedIdSet,
  writePersistedIdSet,
  type StorageLike,
} from './sidebarUtils'

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('sidebarUtils', () => {
  it('stripLeadingPlus removes duplicate plus prefixes across languages', () => {
    expect(stripLeadingPlus('+ List on KhelGrid')).toBe('List on KhelGrid')
    expect(stripLeadingPlus('+ खेलग्रिड पर जोड़ें')).toBe('खेलग्रिड पर जोड़ें')
    expect(stripLeadingPlus('List on KhelGrid')).toBe('List on KhelGrid')
    expect(stripLeadingPlus('  +  Add venue  ')).toBe('Add venue')
  })

  it('isSidebarItemActive handles canonical paths and route aliases', () => {
    expect(isSidebarItemActive('/', '/')).toBe(true)
    expect(isSidebarItemActive('/', '/venues')).toBe(false)
    expect(isSidebarItemActive('/workspace', '/dashboard')).toBe(true)
    expect(isSidebarItemActive('/opportunities', '/trials')).toBe(true)
    expect(isSidebarItemActive('/opportunities', '/opportunities/sai-2026')).toBe(true)
    expect(isSidebarItemActive('/venues', '/book')).toBe(true)
    expect(isSidebarItemActive('/academies', '/train')).toBe(true)
    expect(isSidebarItemActive('/live', '/live-scores')).toBe(true)
    expect(isSidebarItemActive('/khelchronicle', '/chronicle/paper-1')).toBe(true)
  })

  it('resolveSidebarModeForPath separates athlete and partner routes', () => {
    expect(resolveSidebarModeForPath('/')).toBe('athlete')
    expect(resolveSidebarModeForPath('/opportunities')).toBe('athlete')
    expect(resolveSidebarModeForPath('/venues')).toBe('athlete')
    expect(resolveSidebarModeForPath('/organizations')).toBe('partner')
    expect(resolveSidebarModeForPath('/academy-hub')).toBe('partner')
    expect(resolveSidebarModeForPath('/coach-dashboard')).toBe('partner')
    expect(resolveSidebarModeForPath('/campaigns/create')).toBe('partner')
    expect(resolveSidebarModeForPath('/gate-checkin')).toBe('partner')
  })

  it('getModulesForMode curates athlete vs partner workspace modules cleanly', () => {
    const athleteModules = getModulesForMode(navigationModules, 'athlete')
    const athleteIds = athleteModules.map(m => m.id)
    expect(athleteIds.includes('partner-saas')).toBe(false)
    expect(athleteIds.includes('your-space')).toBe(true)
    expect(athleteIds.includes('discover')).toBe(true)
    expect(athleteIds.includes('play-train')).toBe(true)

    const partnerModules = getModulesForMode(navigationModules, 'partner')
    expect(partnerModules[0]?.id).toBe('partner-saas')
    expect(partnerModules.some(m => m.id === 'your-space')).toBe(true)
  })

  it('getCollapsedRailGroups provides a curated icon rail with core destinations', () => {
    const groups = getCollapsedRailGroups(navigationModules)
    expect(groups.length).toBe(3)

    const allHrefs = groups.flatMap(g => g.items.map(i => i.href))
    // Compact rail should be curated (<= 12 items, not all 44)
    expect(allHrefs.length <= 12).toBe(true)
    // Required by App.test.tsx compact rail contract
    for (const required of ['/', '/sports', '/opportunities', '/venues', '/search', '/saved']) {
      expect(allHrefs.includes(required)).toBe(true)
    }
  })

  it('shouldShowSportsCvPromo hides on /sports-cv or when dismissed', () => {
    expect(shouldShowSportsCvPromo('/', false)).toBe(true)
    expect(shouldShowSportsCvPromo('/sports-cv', false)).toBe(false)
    expect(shouldShowSportsCvPromo('/sports-cv/preview', false)).toBe(false)
    expect(shouldShowSportsCvPromo('/', true)).toBe(false)
  })

  it('notification storage migrates legacy sessionStorage into localStorage', () => {
    const primary = createMemoryStorage()
    const legacy = createMemoryStorage({
      khelgrid_read_notifs: JSON.stringify(['n1', 'n2']),
    })

    const migrated = readPersistedIdSet('khelgrid_read_notifs', primary, legacy)
    expect(Array.from(migrated)).toEqual(['n1', 'n2'])
    expect(primary.getItem('khelgrid_read_notifs')).toBe(JSON.stringify(['n1', 'n2']))

    migrated.add('n3')
    writePersistedIdSet('khelgrid_read_notifs', migrated, primary)
    const reloaded = readPersistedIdSet('khelgrid_read_notifs', primary, null)
    expect(Array.from(reloaded)).toEqual(['n1', 'n2', 'n3'])
  })
})
