import type { MouseEvent } from 'react';
import type { SportsMatch } from '../types';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface MatchCardProps {
  match: SportsMatch;
  isPinned: boolean;
  onTogglePin: () => void;
  onOpenDetails: () => void;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

export function MatchCard({
  match,
  isPinned,
  onTogglePin,
  onOpenDetails,
  onNavigate,
}: MatchCardProps) {
  const isLive = match.status === 'LIVE';
  const isUpcoming = match.status === 'UPCOMING';

  const sportIcon = match.sport === 'Football' ? '⚽' : '🏏';

  const handleWhatsAppShare = (e: MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(
      `🏏 *${match.tournament} Live Update on KhelGrid*\n\n` +
      `🔥 *${match.teamA.name}* (${match.teamA.code}): ${match.teamA.score}\n` +
      `⚡ *${match.teamB.name}* (${match.teamB.code}): ${match.teamB.score}\n` +
      `📊 Status: ${match.statusText || match.venueOrOvers || match.status}\n\n` +
      `Track live ball-by-ball scores & book sports turfs on KhelGrid:\nhttps://khelgrid.com/live`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleGrassrootsClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate(e, match.sport === 'Football' ? '/opportunities' : '/academies');
    }
  };

  return (
    <article className={`match-score-card ${isPinned ? 'is-pinned-card' : ''}`} onClick={onOpenDetails}>
      {/* Top Header */}
      <div className="card-top-header">
        <div className="tournament-info">
          <span className="sport-symbol">{sportIcon}</span>
          <span className="tournament-name" title={match.tournament}>{match.tournament}</span>
        </div>

        <div className="card-top-actions">
          <span className={`status-pill ${isLive ? 'is-live' : isUpcoming ? 'is-upcoming' : 'is-finished'}`}>
            {isLive && <span className="live-ping-dot" />}
            {match.status}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`pin-btn ${isPinned ? 'is-pinned' : ''}`}
            aria-label={isPinned ? 'Unpin match' : 'Pin match'}
            title={isPinned ? 'Unpin match' : 'Pin match to top'}
          >
            <SiteIcon name="star" size={14} />
          </button>
        </div>
      </div>

      {/* Middle Scores */}
      <div className="card-teams-area">
        <div className="team-score-row">
          <div className="team-identity">
            <span>{match.teamA.flag || sportIcon}</span>
            <span className="team-name">{match.teamA.name}</span>
          </div>
          <div className="team-score-badge-group">
            <span className="team-code">{match.teamA.code}</span>
            <strong className="team-score">{match.teamA.score}</strong>
          </div>
        </div>

        <div className="team-score-row">
          <div className="team-identity">
            <span>{match.teamB.flag || sportIcon}</span>
            <span className="team-name">{match.teamB.name}</span>
          </div>
          <div className="team-score-badge-group">
            <span className="team-code">{match.teamB.code}</span>
            <strong className="team-score">{match.teamB.score}</strong>
          </div>
        </div>
      </div>

      {/* Timing & Highlights Banner */}
      <div className="card-highlight-box">
        <div className="highlight-meta">
          <span>{match.venueOrOvers || match.sport}</span>
          <span>{match.liveTime || 'Live'}</span>
        </div>
        <p className="highlight-text">{match.statusText || match.highlight || match.stage || 'In Play'}</p>
      </div>

      {/* Grassroots Bridge Pill */}
      <div className="card-grassroots-pill">
        <a
          href={match.sport === 'Football' ? '/opportunities' : '/academies'}
          onClick={handleGrassrootsClick}
          className="grassroots-inline-link"
        >
          <span>🎯 {match.sport === 'Football' ? 'Explore Football Trials on KhelGrid' : 'Find Cricket Academies on KhelGrid'}</span>
          <SiteIcon name="chevron-right" size={11} />
        </a>
      </div>

      {/* Card Footer Actions */}
      <div className="card-footer-actions">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="card-action-whatsapp"
          title="Share scorecard on WhatsApp"
        >
          <SiteIcon name="share" size={13} />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="card-action-details"
        >
          <span>Scorecard</span>
          <SiteIcon name="chevron-right" size={13} />
        </button>
      </div>
    </article>
  );
}
