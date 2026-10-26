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

  it('organizes destinations into the streamlined navigation groups', () => {
    expect(navigationModules.map(section => section.id)).toEqual([
      'core', 'play', 'athlete', 'knowledge', 'network',
    ])
    expect(navigationModules.find(section => section.id === 'core')?.items.map(item => item.href))
      .toEqual(['/', '/dashboard'])
    expect(navigationModules.find(section => section.id === 'play')?.items.map(item => item.href))
      .toContain('/sports')
  })

  it('keeps header destinations separate from the full sidebar registry', () => {
    expect(headerNavigation.map(item => item.href)).toEqual(['/', '/dashboard'])
    expect(headerNavigation.some(item => item.href === '/sports-cv')).toBe(false)
  })

  it('keeps Search in Knowledge & Community and avoids duplicate Blog/KhelChronicle and Pricing/Memberships links', () => {
    const knowledge = navigationModules.find(section => section.id === 'knowledge')
    const network = navigationModules.find(section => section.id === 'network')
    expect(knowledge?.items.map(item => item.href)).toContain('/search')
    expect(knowledge?.items.filter(item => item.href === '/khelchronicle')).toHaveLength(1)
    expect(network?.items.filter(item => item.href === '/pricing')).toHaveLength(1)
  })
})
