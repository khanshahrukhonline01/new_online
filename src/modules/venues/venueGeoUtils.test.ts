import { describe, it, expect } from 'vitest'
import type { Venue } from '../../shared/domain'
import {
  calculateDistanceKm,
  formatDistance,
  getVenueCoordinates,
  getDirectionsUrl,
  INDIAN_CITY_COORDINATES,
} from './venueGeoUtils'

describe('venueGeoUtils', () => {
  describe('calculateDistanceKm', () => {
    it('calculates 0 km for identical coordinates', () => {
      const distance = calculateDistanceKm(28.6139, 77.2090, 28.6139, 77.2090)
      expect(distance).toBe(0)
    })

    it('calculates realistic distance between Delhi and Bengaluru (~1740 km)', () => {
      const delhi = INDIAN_CITY_COORDINATES['delhi']
      const bengaluru = INDIAN_CITY_COORDINATES['bengaluru']
      const distance = calculateDistanceKm(delhi.lat, delhi.lng, bengaluru.lat, bengaluru.lng)
      // Actual straight-line distance is ~1740 km
      expect(distance).toBeGreaterThan(1700)
      expect(distance).toBeLessThan(1800)
    })

    it('calculates short distance within a city (~5 km)', () => {
      // 0.045 degrees lat is approximately 5 km
      const distance = calculateDistanceKm(28.6139, 77.2090, 28.6589, 77.2090)
      expect(distance).toBeGreaterThan(4.5)
      expect(distance).toBeLessThan(5.5)
    })
  })

  describe('formatDistance', () => {
    it('formats distances under 1 km in meters', () => {
      expect(formatDistance(0.45)).toBe('450 m')
      expect(formatDistance(0.05)).toBe('50 m')
    })

    it('formats distances 1 km and above with one decimal place', () => {
      expect(formatDistance(3.24)).toBe('3.2 km')
      expect(formatDistance(12.78)).toBe('12.8 km')
      expect(formatDistance(100)).toBe('100.0 km')
    })
  })

  describe('getVenueCoordinates', () => {
    it('respects explicit venue latitude and longitude if provided', () => {
      const venue = {
        id: 'v1',
        name: 'Custom Ground',
        city: 'Mumbai',
        latitude: 19.1234,
        longitude: 72.8901,
      } as unknown as Venue
      const coords = getVenueCoordinates(venue)
      expect(coords).toEqual({ lat: 19.1234, lng: 72.8901 })
    })

    it('matches specific SAI NCOE landmarks by name', () => {
      const venue = {
        id: 'v2',
        name: 'SAI NCOE Bengaluru Stadium',
        city: 'Bengaluru',
      } as unknown as Venue
      const coords = getVenueCoordinates(venue)
      expect(coords.lat).toBe(12.9463)
      expect(coords.lng).toBe(77.5024)
    })

    it('falls back to city coordinates with deterministic jitter', () => {
      const venue1 = { id: 'v3', name: 'Alpha Turf', city: 'Bhopal' } as unknown as Venue
      const venue2 = { id: 'v4', name: 'Beta Turf', city: 'Bhopal' } as unknown as Venue

      const coords1 = getVenueCoordinates(venue1)
      const coords2 = getVenueCoordinates(venue2)

      // Both close to Bhopal (23.2599, 77.4126)
      expect(Math.abs(coords1.lat - 23.2599)).toBeLessThan(0.05)
      expect(Math.abs(coords2.lat - 23.2599)).toBeLessThan(0.05)
    })

    it('falls back to central India if city is unknown', () => {
      const venue = { id: 'v5', name: 'Unknown Ground', city: 'NonExistentCity' } as unknown as Venue
      const coords = getVenueCoordinates(venue)
      expect(coords).toEqual({ lat: 21.1458, lng: 79.0882 })
    })
  })

  describe('getDirectionsUrl', () => {
    it('builds a valid Google Maps directions URL', () => {
      const url = getDirectionsUrl(28.5828, 77.2344, 'JLN Stadium')
      expect(url).toContain('https://www.google.com/maps/dir/')
      expect(url).toContain('destination=JLN%20Stadium')
      expect(url).toContain('destination_place_id=28.5828,77.2344')
    })
  })
})
