import { describe, expect, it } from 'vitest'
import { navigationModules, primaryNavigation, headerNavigation } from './navigationRegistry'

describe('shared navigation registry', () => {
  it('defines unique navigation item IDs and includes the core destinations', () => {
    const ids = primaryNavigation.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(primaryNavigation.map(item => item.href)).toEqual(
      expect.arrayContaining(['/', '/sports', '/opportunities', '/venues', '/search', '/sports-cv']),
    )
  })

  it('groups features by the journeys users expect to complete', () => {
    expect(navigationModules.map(section => section.id)).toEqual([
      'your-space', 'discover', 'play-train', 'athlete-tools', 'learn-community', 'network',
    ])
    expect(navigationModules.find(section => section.id === 'discover')?.items.map(item => item.href))
      .toEqual(['/sports', '/opportunities', '/venues', '/search', '/for-you'])
    expect(navigationModules.find(section => section.id === 'play-train')?.items.map(item => item.href))
      .toContain('/live')
    expect(navigationModules.find(section => section.id === 'athlete-tools')?.items.map(item => item.href))
      .toContain('/sports-cv')
  })

  it('keeps header destinations separate from the full sidebar registry', () => {
    expect(headerNavigation.map(item => item.href)).toEqual(['/', '/dashboard', '/saved'])
  })

  it('does not mark unfinished personal and scouting tools as available', () => {
    for (const href of ['/dashboard', '/saved', '/for-you', '/stats', '/talent-scanner', '/scout-portal', '/verification']) {
      expect(primaryNavigation.find(item => item.href === href)?.available).not.toBe(true)
    }
  })

  it('keeps destinations unique across the complete sidebar', () => {
    const hrefs = primaryNavigation.map(item => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
