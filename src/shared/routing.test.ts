import { describe, expect, it } from 'vitest'
import { resolveRoute } from './routing'

describe('platform route coverage', () => {
  it('routes the core discover pages to their implemented screens', () => {
    expect(resolveRoute('/').name).toBe('home')
    expect(resolveRoute('/sports').name).toBe('sports-index')
    expect(resolveRoute('/search').name).toBe('search')
  })

  it.each(['/opportunities', '/trials', '/combines', '/scholarships', '/camps'])(
    '%s opens the opportunities catalogue',
    path => expect(resolveRoute(path).name).toBe('opportunities-index'),
  )

  it.each(['/venues', '/book', '/cities', '/city/delhi'])(
    '%s opens the venue directory without claiming bookings are live',
    path => expect(resolveRoute(path).name).toBe('venues-index'),
  )

  it.each([
    '/sports-cv', '/submit-listing', '/stats', '/talent-scanner', '/scout-portal', '/verification',
    '/live', '/play', '/coaches', '/academies', '/events', '/calendar',
    '/learning', '/guides', '/ai-guide', '/khelchronicle', '/community', '/tools',
    '/dashboard', '/profile', '/my-profile', '/saved', '/settings', '/notifications',
    '/login', '/signup', '/forgot-password', '/about', '/contact', '/partners', '/careers', '/trust',
    '/pricing', '/mobile-app', '/help', '/privacy', '/terms', '/cookies', '/for-you', '/referrals',
    '/ipr-policy', '/cancellation-policy', '/posh-policy', '/editorial-policy',
    '/verification-policy', '/correction-policy',
  ])('%s opens a registered feature page', path => {
    const match = resolveRoute(path)
    expect(match.name).toBe('feature')
    if (match.name === 'feature') {
      expect(match.canonicalPath).toBe(path)
      expect(match.slug.trim()).not.toBe('')
    }
  })

  it('normalizes trailing slashes and preserves unknown-route handling', () => {
    expect(resolveRoute('/sports/').name).toBe('sports-index')
    expect(resolveRoute('/privacy/').name).toBe('feature')
    expect(resolveRoute('/not-a-real-page').name).toBe('not-found')
  })
})
