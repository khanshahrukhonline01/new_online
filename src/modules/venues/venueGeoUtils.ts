/**
 * Venue Geolocation & Distance Engine for KhelGrid
 * Calculates exact distance between athlete location and sports grounds using Haversine formula.
 * Maps Indian cities and sporting complexes to accurate GPS coordinates.
 */

import type { Venue } from '../../shared/domain'

export interface Coordinates {
  lat: number
  lng: number
}

export interface UserLocation extends Coordinates {
  accuracy?: number
  timestamp?: number
}

export type RadiusKm = 5 | 10 | 25 | 50 | 100 | 'all'

/**
 * Standard coordinates for major Indian sports cities and SAI hubs
 */
export const INDIAN_CITY_COORDINATES: Record<string, Coordinates> = {
  delhi: { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  gandhinagar: { lat: 23.2156, lng: 72.6369 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  patiala: { lat: 30.3398, lng: 76.3869 },
  rohtak: { lat: 28.8955, lng: 76.6066 },
  sonepat: { lat: 28.9931, lng: 77.0151 },
  sonipat: { lat: 28.9931, lng: 77.0151 },
  alleppey: { lat: 9.4981, lng: 76.3388 },
  alappuzha: { lat: 9.4981, lng: 76.3388 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  pune: { lat: 18.5204, lng: 73.8567 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  imphal: { lat: 24.8170, lng: 93.9368 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  cuttack: { lat: 20.4625, lng: 85.8830 },
  ranchi: { lat: 23.3441, lng: 85.3096 },
  patna: { lat: 25.5941, lng: 85.1376 },
  indore: { lat: 22.7196, lng: 75.8577 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  surat: { lat: 21.1702, lng: 72.8311 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  dehradun: { lat: 30.3165, lng: 78.0322 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  jammu: { lat: 32.7266, lng: 74.8570 },
  goa: { lat: 15.4909, lng: 73.8278 },
  panaji: { lat: 15.4909, lng: 73.8278 },
  meerut: { lat: 28.9845, lng: 77.7064 },
  agra: { lat: 27.1767, lng: 78.0081 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  jabalpur: { lat: 23.1815, lng: 79.9864 },
  gwalior: { lat: 26.2183, lng: 78.1828 },
  raipur: { lat: 21.2514, lng: 81.6296 },
  dharamshala: { lat: 32.2190, lng: 76.3234 },
  itanagar: { lat: 27.0844, lng: 93.6053 },
  shillong: { lat: 25.5788, lng: 91.8933 },
  aizawl: { lat: 23.7271, lng: 92.7176 },
  kohima: { lat: 25.6751, lng: 94.1086 },
  agartala: { lat: 23.8315, lng: 91.2868 },
  gangtok: { lat: 27.3389, lng: 88.6065 },
  'port blair': { lat: 11.6234, lng: 92.7265 },
  puducherry: { lat: 11.9416, lng: 79.8083 },
}

/**
 * Specific landmarks and SAI National Centres of Excellence coordinates
 */
export const VENUE_SPECIFIC_COORDINATES: Record<string, Coordinates> = {
  'sai ncoe bengaluru': { lat: 12.9463, lng: 77.5024 },
  'sai ncoe bhopal': { lat: 23.2135, lng: 77.3912 },
  'sai ncoe gandhinagar': { lat: 23.2156, lng: 72.6369 },
  'sai ncoe patiala': { lat: 30.3168, lng: 76.3781 },
  'sai ncoe rohtak': { lat: 28.8955, lng: 76.6066 },
  'sai ncoe sonepat': { lat: 28.9931, lng: 77.0151 },
  'sai ncoe alleppey': { lat: 9.4981, lng: 76.3388 },
  'sai ncoe lucknow': { lat: 26.8467, lng: 80.9462 },
  'sai ncoe imphal': { lat: 24.8170, lng: 93.9368 },
  'sai ncoe kolkata': { lat: 22.5697, lng: 88.4069 },
  'sai ncoe thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'sai ncoe guwahati': { lat: 26.1445, lng: 91.7362 },
  'jawaharlal nehru stadium': { lat: 28.5828, lng: 77.2344 },
  'indira gandhi arena': { lat: 28.6297, lng: 77.2511 },
  'major dhyan chand national stadium': { lat: 28.6129, lng: 77.2372 },
  'kanteerava stadium': { lat: 12.9698, lng: 77.5929 },
  'wankhede stadium': { lat: 18.9389, lng: 72.8258 },
  'kalinga stadium': { lat: 20.2974, lng: 85.8197 },
}

/**
 * Haversine formula to calculate the great-circle distance between two GPS coordinates in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const rLat1 = (lat1 * Math.PI) / 180
  const rLat2 = (lat2 * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // Return formatted to 1 decimal place
  return Math.round(distance * 10) / 10
}

/**
 * Formats a distance in kilometers into a friendly human-readable label.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

/**
 * Resolves the GPS coordinates for a given Venue.
 * Priority:
 * 1. Explicit venue latitude/longitude if present.
 * 2. Exact match in VENUE_SPECIFIC_COORDINATES.
 * 3. City coordinate match in INDIAN_CITY_COORDINATES.
 * 4. Fallback to geographic centre of India (Nagpur).
 */
export function getVenueCoordinates(venue: Partial<Venue>): Coordinates {
  // Check explicit properties if populated from DB
  const rawLat = (venue as { latitude?: number | string }).latitude
  const rawLng = (venue as { longitude?: number | string }).longitude
  if (rawLat !== undefined && rawLng !== undefined) {
    const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat)
    const lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng)
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }

  // Check specific venue name match
  const nameKey = (venue.name ?? '').trim().toLowerCase()
  for (const [key, coords] of Object.entries(VENUE_SPECIFIC_COORDINATES)) {
    if (nameKey.includes(key)) {
      return coords
    }
  }

  // Check city match
  const cityKey = (venue.city ?? '').trim().toLowerCase()
  if (cityKey && INDIAN_CITY_COORDINATES[cityKey]) {
    // Apply a micro-hash jitter (up to 0.01 deg ~ 1km) based on venue name
    // so multiple venues in the same city don't completely overlap on a single point pin
    const hash = (venue.name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const jitterLat = ((hash % 17) - 8) * 0.0018
    const jitterLng = (((hash * 3) % 17) - 8) * 0.0018
    const base = INDIAN_CITY_COORDINATES[cityKey]
    return {
      lat: Math.round((base.lat + jitterLat) * 10000) / 10000,
      lng: Math.round((base.lng + jitterLng) * 10000) / 10000,
    }
  }

  // Default fallback to central India (Nagpur - 0 Mile Marker)
  return { lat: 21.1458, lng: 79.0882 }
}

/**
 * Requests the athlete's current location via browser navigator.geolocation.
 */
export function requestUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      error => {
        let message = 'Unable to retrieve your location.'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access was denied. Please allow location permissions to find nearby turfs.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is currently unavailable.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.'
            break
        }
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute cache
      },
    )
  })
}

/**
 * Generates an external Google Maps navigation deep link to the venue coordinates.
 */
export function getDirectionsUrl(lat: number, lng: number, venueName?: string): string {
  const query = venueName ? encodeURIComponent(venueName) : `${lat},${lng}`
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&destination_place_id=${lat},${lng}`
}
