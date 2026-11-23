import test from 'node:test'
import assert from 'node:assert/strict'
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

test('stripLeadingPlus removes duplicate plus prefixes across languages', () => {
  assert.equal(stripLeadingPlus('+ List on KhelGrid'), 'List on KhelGrid')
  assert.equal(stripLeadingPlus('+ खेलग्रिड पर जोड़ें'), 'खेलग्रिड पर जोड़ें')
  assert.equal(stripLeadingPlus('List on KhelGrid'), 'List on KhelGrid')
  assert.equal(stripLeadingPlus('  +  Add venue  '), 'Add venue')
})

test('isSidebarItemActive handles canonical paths and route aliases', () => {
  assert.equal(isSidebarItemActive('/', '/'), true)
  assert.equal(isSidebarItemActive('/', '/venues'), false)
  assert.equal(isSidebarItemActive('/workspace', '/dashboard'), true)
  assert.equal(isSidebarItemActive('/opportunities', '/trials'), true)
  assert.equal(isSidebarItemActive('/opportunities', '/opportunities/sai-2026'), true)
  assert.equal(isSidebarItemActive('/venues', '/book'), true)
  assert.equal(isSidebarItemActive('/academies', '/train'), true)
  assert.equal(isSidebarItemActive('/live', '/live-scores'), true)
  assert.equal(isSidebarItemActive('/khelchronicle', '/chronicle/paper-1'), true)
})

test('resolveSidebarModeForPath separates athlete and partner routes', () => {
  assert.equal(resolveSidebarModeForPath('/'), 'athlete')
  assert.equal(resolveSidebarModeForPath('/opportunities'), 'athlete')
  assert.equal(resolveSidebarModeForPath('/venues'), 'athlete')
  assert.equal(resolveSidebarModeForPath('/organizations'), 'partner')
  assert.equal(resolveSidebarModeForPath('/academy-hub'), 'partner')
  assert.equal(resolveSidebarModeForPath('/coach-dashboard'), 'partner')
  assert.equal(resolveSidebarModeForPath('/campaigns/create'), 'partner')
  assert.equal(resolveSidebarModeForPath('/gate-checkin'), 'partner')
})

test('getModulesForMode curates athlete vs partner workspace modules cleanly', () => {
  const athleteModules = getModulesForMode(navigationModules, 'athlete')
  const athleteIds = athleteModules.map(m => m.id)
  assert.equal(athleteIds.includes('partner-saas'), false)
  assert.equal(athleteIds.includes('your-space'), true)
  assert.equal(athleteIds.includes('discover'), true)
  assert.equal(athleteIds.includes('play-train'), true)

  const partnerModules = getModulesForMode(navigationModules, 'partner')
  assert.equal(partnerModules[0]?.id, 'partner-saas')
  assert.equal(partnerModules.some(m => m.id === 'your-space'), true)
})

test('getCollapsedRailGroups provides a curated icon rail with core destinations', () => {
  const groups = getCollapsedRailGroups(navigationModules)
  assert.equal(groups.length, 3)

  const allHrefs = groups.flatMap(g => g.items.map(i => i.href))
  // Compact rail should be curated (<= 12 items, not all 44)
  assert.ok(allHrefs.length <= 12, `Expected curated rail <= 12 items, got ${allHrefs.length}`)
  // Required by App.test.tsx compact rail contract
  for (const required of ['/', '/sports', '/opportunities', '/venues', '/search', '/saved']) {
    assert.ok(allHrefs.includes(required), `Missing required rail link: ${required}`)
  }
})

test('shouldShowSportsCvPromo hides on /sports-cv or when dismissed', () => {
  assert.equal(shouldShowSportsCvPromo('/', false), true)
  assert.equal(shouldShowSportsCvPromo('/sports-cv', false), false)
  assert.equal(shouldShowSportsCvPromo('/sports-cv/preview', false), false)
  assert.equal(shouldShowSportsCvPromo('/', true), false)
})

test('notification storage migrates legacy sessionStorage into localStorage', () => {
  const primary = createMemoryStorage()
  const legacy = createMemoryStorage({
    khelgrid_read_notifs: JSON.stringify(['n1', 'n2']),
  })

  const migrated = readPersistedIdSet('khelgrid_read_notifs', primary, legacy)
  assert.deepEqual(Array.from(migrated), ['n1', 'n2'])
  assert.equal(primary.getItem('khelgrid_read_notifs'), JSON.stringify(['n1', 'n2']))

  migrated.add('n3')
  writePersistedIdSet('khelgrid_read_notifs', migrated, primary)
  const reloaded = readPersistedIdSet('khelgrid_read_notifs', primary, null)
  assert.deepEqual(Array.from(reloaded), ['n1', 'n2', 'n3'])
})
