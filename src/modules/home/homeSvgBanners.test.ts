import { describe, expect, it } from 'vitest'
import {
  REAL_SPORTS_IMAGES,
  SPORT_IMAGE_POOLS,
  createBannerSvg,
  getSportCoverImage,
  hashSeed,
} from './homeSvgBanners'

describe('homeSvgBanners & Real Sports Imagery Engine', () => {
  it('defines valid, high-resolution HTTPS URLs and SEO alt text for all sports', () => {
    const keys = Object.keys(REAL_SPORTS_IMAGES)
    expect(keys.length).toBeGreaterThanOrEqual(15)

    for (const key of keys) {
      const entry = REAL_SPORTS_IMAGES[key]
      expect(entry.url).toMatch(/^https:\/\//)
      expect(entry.defaultAlt.length).toBeGreaterThan(15)
    }
  })

  it('provides multi-photo pools with distinct images for key rail categories', () => {
    expect(SPORT_IMAGE_POOLS.football.length).toBeGreaterThanOrEqual(5)
    expect(SPORT_IMAGE_POOLS.cricket.length).toBeGreaterThanOrEqual(5)
    expect(SPORT_IMAGE_POOLS.venue.length).toBeGreaterThanOrEqual(5)
    expect(SPORT_IMAGE_POOLS.academy.length).toBeGreaterThanOrEqual(5)
    expect(SPORT_IMAGE_POOLS.badminton.length).toBeGreaterThanOrEqual(4)

    // Ensure all URLs in the football pool are unique
    const footballUrls = new Set(SPORT_IMAGE_POOLS.football.map(p => p.url))
    expect(footballUrls.size).toBe(SPORT_IMAGE_POOLS.football.length)

    // Ensure all URLs in the venue pool are unique
    const venueUrls = new Set(SPORT_IMAGE_POOLS.venue.map(p => p.url))
    expect(venueUrls.size).toBe(SPORT_IMAGE_POOLS.venue.length)
  })

  it('resolves authentic facility photo for football and futsal', () => {
    const footballCover = getSportCoverImage({
      name: 'South Delhi Football Turf',
      city: 'New Delhi',
      sport: 'Football',
      category: 'venue',
    })
    expect(footballCover.url).toContain('photo-1529900748604')
    expect(footballCover.alt).toContain('South Delhi Football Turf')
    expect(footballCover.alt).toContain('New Delhi')
    expect(footballCover.width).toBe(800)
    expect(footballCover.height).toBe(450)
    expect(footballCover.sport).toBe('football')
  })

  it('resolves authentic facility photo for cricket and box cricket', () => {
    const cricketCover = getSportCoverImage({
      name: 'Wanderers Cricket Academy',
      city: 'Bengaluru',
      category: 'academy',
    })
    expect(cricketCover.sport).toBe('cricket')
    expect(cricketCover.alt).toContain('Wanderers Cricket Academy')
    expect(cricketCover.alt).toContain('Sports Training Academy in Bengaluru')

    const boxCricketCover = getSportCoverImage({
      name: 'Smash Box Cricket Cage',
      city: 'Mumbai',
      category: 'venue',
    })
    expect(boxCricketCover.sport).toBe('box cricket')
  })

  it('resolves authentic facility photo for badminton, pickleball, and tennis', () => {
    const badminton = getSportCoverImage({
      name: 'Shuttle Pro Badminton Arena',
      city: 'Hyderabad',
      sport: 'Badminton',
      category: 'venue',
    })
    expect(badminton.sport).toBe('badminton')

    const pickleball = getSportCoverImage({
      name: 'Dinkers Pickleball Club',
      city: 'Pune',
      sport: 'Pickleball',
      category: 'pickup',
    })
    expect(pickleball.sport).toBe('pickleball')
    expect(pickleball.alt).toContain('Community Pickup Sports Game in Pune')

    const tennis = getSportCoverImage({
      name: 'Centre Court Tennis Club',
      city: 'Chennai',
      sport: 'Tennis',
      category: 'venue',
    })
    expect(tennis.sport).toBe('tennis')
  })

  it('provides backward-compatible createBannerSvg returning crawlable HTTPS photo URLs', () => {
    const url = createBannerSvg('Delhi Smashers Box Cricket', 'South Delhi', '🏏', 'cyan')
    expect(url).toMatch(/^https:\/\//)
    expect(url).not.toContain('data:image/svg+xml')
  })

  it('deterministically distributes unique photos across different entity IDs in the same rail', () => {
    const venueIds = ['venue-001', 'venue-002', 'venue-003', 'venue-004', 'venue-005', 'venue-006']
    const urls = venueIds.map(id =>
      createBannerSvg('Sports Complex', 'Bengaluru', '🏟️', 'emerald', id)
    )

    // Should not all be identical
    const uniqueUrls = new Set(urls)
    expect(uniqueUrls.size).toBeGreaterThan(1)

    // Calling again with the exact same ID must yield the exact same URL (deterministic stability)
    const reloadedUrl = createBannerSvg('Sports Complex', 'Bengaluru', '🏟️', 'emerald', 'venue-001')
    expect(reloadedUrl).toBe(urls[0])
  })

  it('supports direct customUrl override for verified ground photos', () => {
    const custom = 'https://example.com/verified-ground-photo.webp'
    const banner = createBannerSvg('Premier Turf', 'Mumbai', '⚽', 'cyan', 'venue-123', custom)
    expect(banner).toBe(custom)
  })

  it('computes consistent hash values using hashSeed', () => {
    const h1 = hashSeed('entity-abc')
    const h2 = hashSeed('entity-abc')
    const h3 = hashSeed('entity-xyz')

    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toBeGreaterThanOrEqual(0)
  })
})
