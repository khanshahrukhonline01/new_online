import { describe, expect, it } from 'vitest'
import { navigationModules, primaryNavigation } from './navigationRegistry'

describe('shared navigation registry', () => {
  it('defines unique navigation item IDs and hrefs for the primary destinations', () => {
    const ids = primaryNavigation.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(primaryNavigation.map(item => item.href)).toEqual(
      expect.arrayContaining(['/', '/sports', '/opportunities', '/venues', '/search', '/sports-cv']),
    )
  })

  it('keeps the header destinations in the Discover module', () => {
    const explore = navigationModules.find(section => section.id === 'discover')
    expect(explore?.items.map(item => item.href)).toEqual([
      '/', '/sports', '/opportunities', '/venues',
    ])
  })

  it('keeps Search available in Tools without adding it to header destinations', () => {
    const discovery = navigationModules.find(section => section.id === 'tools')
    expect(discovery?.items.map(item => item.href)).toEqual(['/search'])
  })

  it('does not expose future tools as Discover header destinations', () => {
    const explore = navigationModules.find(section => section.id === 'core')
    expect(explore?.items.some(item => item.href === '/sports-cv')).toBe(false)
  })
})
