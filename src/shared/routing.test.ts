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

  it.each(['/venues', '/book'])(
    '%s opens the venue directory without claiming bookings are live',
    path => expect(resolveRoute(path).name).toBe('venues-index'),
  )

  it('/cities opens the dedicated cities directory', () => {
    expect(resolveRoute('/cities')).toEqual({
      name: 'cities-index',
      canonicalPath: '/cities',
    })
  })

  it.each([
    ['/cities/delhi', 'delhi'],
    ['/cities/bengaluru', 'bengaluru'],
    ['/city/delhi', 'delhi'],
    ['/city/mumbai', 'mumbai'],
  ])('%s opens the dedicated city sports hub for %s', (path, expectedSlug) => {
    const match = resolveRoute(path)
    expect(match.name).toBe('city-detail')
    expect(match.canonicalPath).toBe('/cities/:slug')
    if (match.name === 'city-detail') {
      expect(match.slug).toBe(expectedSlug)
    }
  })

  it.each(['/academies', '/academy', '/train'])(
    '%s opens the academies catalogue',
    path => expect(resolveRoute(path).name).toBe('academies-index'),
  )

  it.each([
    ['/academies/bengaluru-fc-academy', 'bengaluru-fc-academy'],
    ['/academy/mary-kom-boxing-academy', 'mary-kom-boxing-academy'],
  ])('%s opens the academy detail page for %s', (path, expectedSlug) => {
    const match = resolveRoute(path)
    expect(match.name).toBe('academy-detail')
    expect(match.canonicalPath).toBe('/academies/:slug')
    if (match.name === 'academy-detail') {
      expect(match.slug).toBe(expectedSlug)
    }
  })

  it.each([
    ['/venues/kanteerava-stadium', 'kanteerava-stadium'],
    ['/book/cooperage-ground', 'cooperage-ground'],
  ])('%s opens the venue detail page for %s', (path, expectedSlug) => {
    const match = resolveRoute(path)
    expect(match.name).toBe('venue-detail')
    expect(match.canonicalPath).toBe('/venues/:slug')
    if (match.name === 'venue-detail') {
      expect(match.slug).toBe(expectedSlug)
    }
  })

  it.each([
    '/sports-cv', '/submit-listing', '/stats', '/talent-scanner', '/scout-portal', '/verification',
    '/live', '/play', '/coaches', '/events', '/calendar',
    '/learning', '/guides', '/ai-guide', '/community', '/tools',
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

  it('routes KhelChronicle repository pages correctly', () => {
    expect(resolveRoute('/khelchronicle').name).toBe('khelchronicle-index')
    expect(resolveRoute('/chronicle').name).toBe('khelchronicle-index')
    expect(resolveRoute('/khelchronicle/submit').name).toBe('khelchronicle-submit')
    expect(resolveRoute('/khelchronicle/sports-biomechanics')).toMatchObject({
      name: 'khelchronicle-category',
      category: 'sports-biomechanics',
    })
    expect(resolveRoute('/khelchronicle/author/dr-vikramaditya-rathore')).toMatchObject({
      name: 'khelchronicle-author',
      author: 'dr-vikramaditya-rathore',
    })
    expect(resolveRoute('/khelchronicle/kinematic-correlates-lumbar-spine-stress-fast-bowlers')).toMatchObject({
      name: 'khelchronicle-paper',
      slug: 'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
    })
  })

  it('normalizes trailing slashes and preserves unknown-route handling', () => {
    expect(resolveRoute('/sports/').name).toBe('sports-index')
    expect(resolveRoute('/privacy/').name).toBe('feature')
    expect(resolveRoute('/not-a-real-page').name).toBe('not-found')
  })

  it('routes public athlete profiles with and without @ symbol correctly', () => {
    expect(resolveRoute('/u/@rohit-verma')).toEqual({
      name: 'athlete-profile',
      canonicalPath: '/u/:username',
      username: 'rohit-verma',
    })
    expect(resolveRoute('/u/priya-nair')).toEqual({
      name: 'athlete-profile',
      canonicalPath: '/u/:username',
      username: 'priya-nair',
    })
    expect(resolveRoute('/athlete/@arjun-singh')).toEqual({
      name: 'athlete-profile',
      canonicalPath: '/u/:username',
      username: 'arjun-singh',
    })
  })
})
