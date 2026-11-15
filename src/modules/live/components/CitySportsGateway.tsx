import type { MouseEvent } from 'react';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface CitySportsGatewayProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

const CITIES = [
  { name: 'Delhi NCR', icon: '🏛️', query: 'Delhi' },
  { name: 'Mumbai', icon: '🌊', query: 'Mumbai' },
  { name: 'Bengaluru', icon: '🌳', query: 'Bengaluru' },
  { name: 'Hyderabad', icon: '🏰', query: 'Hyderabad' },
  { name: 'Kolkata', icon: '⚽', query: 'Kolkata' },
  { name: 'Chennai', icon: '🏏', query: 'Chennai' },
  { name: 'Pune', icon: '🏔️', query: 'Pune' },
  { name: 'Ahmedabad', icon: '🏟️', query: 'Ahmedabad' },
  { name: 'Jaipur', icon: '👑', query: 'Jaipur' },
  { name: 'Chandigarh', icon: '🎯', query: 'Chandigarh' },
] as const;

export function CitySportsGateway({ onNavigate }: CitySportsGatewayProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target);
    }
  };

  return (
    <div className="city-sports-gateway">
      <div className="city-gateway-header">
        <div className="city-gateway-title">
          <SiteIcon name="map-pin" size={16} />
          <div>
            <h3>Explore Sports in Your City</h3>
            <p>Find verified box turfs, coaching academies, and open scouting trials across India.</p>
          </div>
        </div>
        <a
          href="/venues"
          onClick={(e) => handleClick(e, '/venues')}
          className="city-view-all-link"
        >
          <span>All 16 Grid Cities</span>
          <SiteIcon name="chevron-right" size={14} />
        </a>
      </div>

      <div className="city-chips-rail">
        {CITIES.map((city) => (
          <a
            key={city.query}
            href={`/venues?city=${encodeURIComponent(city.query)}`}
            onClick={(e) => handleClick(e, `/venues?city=${encodeURIComponent(city.query)}`)}
            className="city-chip"
          >
            <span className="city-chip-icon">{city.icon}</span>
            <span className="city-chip-name">{city.name}</span>
            <SiteIcon name="chevron-right" size={12} />
          </a>
        ))}
      </div>
    </div>
  );
}
