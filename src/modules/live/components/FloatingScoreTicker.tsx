import type { MouseEvent } from 'react';
import type { SportsMatch } from '../types';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface FloatingScoreTickerProps {
  match: SportsMatch | null;
  onOpenDetails: () => void;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

export function FloatingScoreTicker({ match, onOpenDetails, onNavigate }: FloatingScoreTickerProps) {
  if (!match) return null;

  const handleBookClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      onNavigate(e, '/venues');
    }
  };

  return (
    <aside className="floating-live-ticker" aria-label="Live match ticker">
      <span className="ticker-ping-wrapper">
        <span className="ticker-ping-animate" />
        <span className="ticker-ping-dot" />
      </span>

      <span className="ticker-match-text">
        {match.teamA.code} {match.teamA.score} vs {match.teamB.code} {match.teamB.score}
      </span>

      <span className="ticker-venue-text">
        {match.venueOrOvers || 'Live'}
      </span>

      <button type="button" onClick={onOpenDetails} className="ticker-btn-details">
        Scorecard
      </button>

      <a href="/venues" onClick={handleBookClick} className="ticker-btn-book">
        <span>Book Turf</span>
        <SiteIcon name="arrow-up-right" size={12} />
      </a>
    </aside>
  );
}
