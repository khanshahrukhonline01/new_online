import type { MouseEvent } from 'react';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface InterstitialProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

export function AthleteDiscoveryCard({ onNavigate }: InterstitialProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target);
    }
  };

  return (
    <div className="infeed-opportunity-card athlete-card">
      <div className="infeed-header">
        <span className="infeed-badge">
          <SiteIcon name="star" size={12} />
          <span>Talent Radar</span>
        </span>
        <span className="infeed-meta">Free Scout Discovery</span>
      </div>

      <div className="infeed-body">
        <h3>Are You an Aspiring Player? Build Your Verified Sports CV</h3>
        <p>
          State coaches, club scouts, and sports academies discover emerging talent on KhelGrid every day.
        </p>
      </div>

      <div className="infeed-actions">
        <a
          href="/sports-cv"
          onClick={(e) => handleClick(e, '/sports-cv')}
          className="infeed-btn-primary"
        >
          <span>Build Free Sports CV</span>
          <SiteIcon name="arrow-up-right" size={14} />
        </a>
        <a
          href="/opportunities"
          onClick={(e) => handleClick(e, '/opportunities')}
          className="infeed-btn-secondary"
        >
          <span>Explore Selection Trials →</span>
        </a>
      </div>
    </div>
  );
}

export function TurfBookingCard({ onNavigate }: InterstitialProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target);
    }
  };

  return (
    <div className="infeed-opportunity-card turf-card">
      <div className="infeed-header">
        <span className="infeed-badge badge-amber">
          <SiteIcon name="activity" size={12} />
          <span>Play Tonight</span>
        </span>
        <span className="infeed-meta">Instant Ground Booking</span>
      </div>

      <div className="infeed-body">
        <h3>Need a Ground Tonight? Book Turfs & Practice Nets</h3>
        <p>
          Discover verified floodlit box cricket arenas, football turfs, and courts in 16+ Indian cities.
        </p>
      </div>

      <div className="infeed-actions">
        <a
          href="/venues"
          onClick={(e) => handleClick(e, '/venues')}
          className="infeed-btn-primary btn-amber"
        >
          <span>Find Grounds Near Me</span>
          <SiteIcon name="arrow-up-right" size={14} />
        </a>
        <a
          href="/play"
          onClick={(e) => handleClick(e, '/play')}
          className="infeed-btn-secondary"
        >
          <span>Join Pickup Matches →</span>
        </a>
      </div>
    </div>
  );
}
