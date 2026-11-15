import type { MouseEvent } from 'react';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface SpectatorGatewayBarProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
  selectedSport?: string;
}

export function SpectatorGatewayBar({ onNavigate }: SpectatorGatewayBarProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target);
    }
  };

  return (
    <div className="spectator-gateway-strip">
      <div className="gateway-header">
        <div className="gateway-title-group">
          <span className="gateway-symbol">⚡</span>
          <div>
            <h3>Spectator to Athlete · Play, Train & Get Scouted</h3>
            <p>Inspired by live action? Explore India’s verified grassroots sports infrastructure.</p>
          </div>
        </div>
        <a
          href="/guides"
          onClick={(e) => handleClick(e, '/guides')}
          className="gateway-guide-link"
        >
          <span>Grassroots Athlete Guide</span>
          <SiteIcon name="chevron-right" size={14} />
        </a>
      </div>

      <div className="gateway-cards-grid">
        {/* Card 1: Trials */}
        <a
          href="/opportunities"
          onClick={(e) => handleClick(e, '/opportunities')}
          className="gateway-card"
        >
          <div className="gateway-card-top">
            <span className="gateway-card-icon">🎯</span>
            <span className="gateway-badge badge-green">Open Combines</span>
          </div>
          <h4>Scouting Trials</h4>
          <p>State & academy selection trials</p>
          <div className="gateway-card-action">
            <span>Explore Trials</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </div>
        </a>

        {/* Card 2: Venues / Book */}
        <a
          href="/venues"
          onClick={(e) => handleClick(e, '/venues')}
          className="gateway-card"
        >
          <div className="gateway-card-top">
            <span className="gateway-card-icon">🏟️</span>
            <span className="gateway-badge badge-amber">Instant Slots</span>
          </div>
          <h4>Book Turfs & Nets</h4>
          <p>Floodlit box cricket & football grounds</p>
          <div className="gateway-card-action">
            <span>Book Now</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </div>
        </a>

        {/* Card 3: Academies */}
        <a
          href="/academies"
          onClick={(e) => handleClick(e, '/academies')}
          className="gateway-card"
        >
          <div className="gateway-card-top">
            <span className="gateway-card-icon">🛡️</span>
            <span className="gateway-badge badge-blue">Accredited</span>
          </div>
          <h4>Top Academies</h4>
          <p>Certified coaches & professional training</p>
          <div className="gateway-card-action">
            <span>Find Coaching</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </div>
        </a>

        {/* Card 4: Athlete CV */}
        <a
          href="/sports-cv"
          onClick={(e) => handleClick(e, '/sports-cv')}
          className="gateway-card"
        >
          <div className="gateway-card-top">
            <span className="gateway-card-icon">📋</span>
            <span className="gateway-badge badge-purple">100% Free</span>
          </div>
          <h4>Sports CV Wizard</h4>
          <p>Create verified profile & showcase stats</p>
          <div className="gateway-card-action">
            <span>Build My CV</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </div>
        </a>
      </div>
    </div>
  );
}
