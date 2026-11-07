import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Map as LeafletMap, LayerGroup, Marker as LeafletMarker } from 'leaflet'
import type { Venue } from '../../shared/domain'
import {
  formatDistance,
  getDirectionsUrl,
  getVenueCoordinates,
  type UserLocation,
} from './venueGeoUtils'
import { SiteIcon } from '../../shared/components/SiteIcon'
import 'leaflet/dist/leaflet.css'
import './VenueMapView.css'

export interface VenueWithDistance extends Venue {
  distanceKm?: number
}

export interface VenueMapViewProps {
  venues: VenueWithDistance[]
  userLocation: UserLocation | null
  selectedVenueId?: string
  onSelectVenue?: (venue: Venue) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function VenueMapView({
  venues,
  userLocation,
  selectedVenueId,
  onNavigate,
}: VenueMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markersLayerRef = useRef<LayerGroup | null>(null)
  const userMarkerRef = useRef<LeafletMarker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let isMounted = true

    import('leaflet').then(L => {
      if (!isMounted || !containerRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const defaultCenter = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [22.5, 78.9]
      const defaultZoom = userLocation ? 12 : 5

      const map = L.map(containerRef.current, {
        center: defaultCenter as [number, number],
        zoom: defaultZoom,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const markersGroup = L.layerGroup().addTo(map)
      markersLayerRef.current = markersGroup
      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [userLocation])

  // Delegate in-popup navigation links
  useEffect(() => {
    const container = containerRef.current
    if (!container || !onNavigate) return

    const handleClick = (e: globalThis.MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[data-venue-slug]') as HTMLAnchorElement | null
      if (target) {
        const href = target.getAttribute('href')
        if (href) {
          onNavigate(e as unknown as MouseEvent<HTMLAnchorElement>, href)
        }
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onNavigate])

  // Sync Markers & User Location
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    import('leaflet').then(L => {
      const map = mapInstanceRef.current
      const layer = markersLayerRef.current
      if (!map || !layer) return

      layer.clearLayers()

      const bounds = L.latLngBounds([])

      // 1. Render User Location Pulsing Dot
      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'kg-user-pulse-marker',
          html: '<div class="kg-user-pulse-ring"></div><div class="kg-user-pulse-dot"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(layer)

        userMarker.bindPopup(`
          <div style="font-size:12px; font-weight:700; color:#0284c7; padding:4px 6px;">
            📍 Your Current Location
          </div>
        `)

        bounds.extend([userLocation.lat, userLocation.lng])
        userMarkerRef.current = userMarker
      }

      // 2. Render Venue Pins
      venues.forEach(venue => {
        const coords = getVenueCoordinates(venue)
        const isSelected = venue.id === selectedVenueId

        const pinIcon = L.divIcon({
          className: `kg-venue-pin-marker ${isSelected ? 'is-active' : ''}`,
          html: `
            <div class="kg-venue-pin-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m4.93 4.93 4.24 4.24"></path>
                <path d="m14.83 9.17 4.24-4.24"></path>
                <path d="m14.83 14.83 4.24 4.24"></path>
                <path d="m9.17 14.83-4.24 4.24"></path>
              </svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -32],
        })

        const marker = L.marker([coords.lat, coords.lng], { icon: pinIcon }).addTo(layer)
        bounds.extend([coords.lat, coords.lng])

        const distanceLabel =
          venue.distanceKm !== undefined
            ? `<span class="kg-map-popup-distance">📍 ${formatDistance(venue.distanceKm)} away</span>`
            : ''

        const directionsUrl = getDirectionsUrl(coords.lat, coords.lng, venue.name)
        const detailHref = `/venues/${encodeURIComponent(venue.slug)}`

        const popupHtml = `
          <div class="kg-map-popup-card">
            <div class="kg-map-popup-header">
              <span class="kg-map-popup-kicker">${venue.government_facility ? 'Government Complex' : 'Sports Venue'}</span>
              ${distanceLabel}
            </div>
            <h4 class="kg-map-popup-title">${venue.name}</h4>
            <p class="kg-map-popup-address">
              <span>📍</span>
              <span>${venue.address || venue.city || 'India'}</span>
            </p>
            <div class="kg-map-popup-tags">
              ${venue.sport ? `<span class="kg-map-popup-tag">${venue.sport}</span>` : ''}
              ${venue.surface_type ? `<span class="kg-map-popup-tag">${venue.surface_type}</span>` : ''}
              ${venue.court_count ? `<span class="kg-map-popup-tag">${venue.court_count} Courts</span>` : ''}
            </div>
            <div class="kg-map-popup-actions">
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="kg-map-popup-directions-btn">
                🧭 Directions
              </a>
              <a href="${detailHref}" class="kg-map-popup-detail-btn" data-venue-slug="${venue.slug}">
                View Details →
              </a>
            </div>
          </div>
        `

        marker.bindPopup(popupHtml, { minWidth: 260, maxWidth: 300 })

        if (isSelected) {
          marker.openPopup()
        }
      })

      if (bounds.isValid() && venues.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: userLocation ? 14 : 12 })
      }
    })
  }, [venues, userLocation, selectedVenueId, mapReady])

  // Recenter on Athlete GPS
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !userLocation) return
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13, {
      animate: true,
    })
  }

  // Fit all grounds in current filter
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return
    import('leaflet').then(L => {
      const bounds = L.latLngBounds([])
      if (userLocation) bounds.extend([userLocation.lat, userLocation.lng])
      venues.forEach(venue => {
        const coords = getVenueCoordinates(venue)
        bounds.extend([coords.lat, coords.lng])
      })
      if (bounds.isValid()) {
        mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    })
  }

  return (
    <div className="kg-venue-map-container" aria-label="Interactive sports venue map">
      <div ref={containerRef} className="kg-venue-map-target" />

      {/* Floating Map Controls */}
      <div className="kg-map-floating-controls">
        {userLocation && (
          <button
            type="button"
            className="kg-map-control-btn"
            onClick={handleRecenter}
            title="Recenter map on your location"
            aria-label="Recenter on your location"
          >
            <SiteIcon name="map-pin" size={14} />
            <span>My Location</span>
          </button>
        )}
        {venues.length > 0 && (
          <button
            type="button"
            className="kg-map-control-btn"
            onClick={handleFitAll}
            title="Fit all matching grounds on screen"
            aria-label="Fit all matching grounds"
          >
            <SiteIcon name="sliders" size={14} />
            <span>Fit Grounds ({venues.length})</span>
          </button>
        )}
      </div>
    </div>
  )
}
