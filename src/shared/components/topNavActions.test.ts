import { describe, expect, it } from 'vitest'
import {
  TOP_NAV_SUBMIT_ACTIONS,
  formatUnreadBadge,
  resolveRoleHubLink,
} from './topNavActions'

describe('topNavActions', () => {
  it('retains all 5 core submission destinations', () => {
    expect(TOP_NAV_SUBMIT_ACTIONS.length).toBe(5)
    const hrefs = TOP_NAV_SUBMIT_ACTIONS.map(a => a.href)
    expect(hrefs).toEqual([
      '/submit-listing',
      '/submit-listing?type=venue',
      '/submit-listing?type=opportunity',
      '/submit-listing?type=coach',
      '/khelchronicle/submit',
    ])
    expect(TOP_NAV_SUBMIT_ACTIONS.some(a => a.className.includes('header-action-coach'))).toBe(true)
    expect(TOP_NAV_SUBMIT_ACTIONS.some(a => a.className.includes('header-action-chronicle'))).toBe(true)
  })

  it('resolves role hub link correctly', () => {
    const coach = resolveRoleHubLink('coach', '/coach-dashboard')
    expect(coach.href).toBe('/coach-dashboard')
    expect(coach.label).toBe('Coach Hub')
    expect(coach.isActive).toBe(true)

    const academy = resolveRoleHubLink('academy', '/academy-hub')
    expect(academy.href).toBe('/academy-hub')
    expect(academy.label).toBe('Academy Hub')
    expect(academy.isActive).toBe(true)

    const visitor = resolveRoleHubLink(null, '/play')
    expect(visitor.href).toBe('/academy-hub')
    expect(visitor.label).toBe('Academy Hub')
    expect(visitor.isActive).toBe(false)
  })

  it('formats unread badges correctly', () => {
    expect(formatUnreadBadge(0)).toBe(null)
    expect(formatUnreadBadge(-2)).toBe(null)
    expect(formatUnreadBadge(3)).toBe('3')
    expect(formatUnreadBadge(9)).toBe('9')
    expect(formatUnreadBadge(14)).toBe('9+')
  })
})
