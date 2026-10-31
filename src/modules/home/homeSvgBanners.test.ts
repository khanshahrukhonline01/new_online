import { describe, expect, it } from 'vitest'
import {
  REAL_SPORTS_IMAGES,
  createBannerSvg,
  getSportCoverImage,
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
})
