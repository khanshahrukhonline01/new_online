import type { MouseEvent } from 'react';
import type { SportsMatch } from '../types';
import { SiteIcon } from '../../../shared/components/SiteIcon';

interface MatchDetailModalProps {
  match: SportsMatch | null;
  onClose: () => void;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

export function MatchDetailModal({ match, onClose, onNavigate }: MatchDetailModalProps) {
  if (!match) return null;

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target);
    }
    onClose();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🏏 *${match.tournament} Live Update on KhelGrid*\n\n` +
      `🔥 *${match.teamA.name}* (${match.teamA.code}): ${match.teamA.score}\n` +
      `⚡ *${match.teamB.name}* (${match.teamB.code}): ${match.teamB.score}\n` +
      `📊 Status: ${match.statusText || match.venueOrOvers || match.status}\n\n` +
      `Track live ball-by-ball scores & book sports turfs on KhelGrid:\nhttps://khelgrid.com/live`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="modal-tournament">{match.tournament}</span>
            <p className="modal-subtitle">{match.stage || 'Match Center'} · {match.venueOrOvers || 'Stadium'}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {/* Scoreboard Hero */}
        <div className="modal-hero">
          <div className="modal-team-score">
            <span className="modal-team-name">{match.teamA.flag || '🏏'} {match.teamA.name}</span>
            <span className="modal-score-badge">{match.teamA.score}</span>
          </div>

          <div className="modal-vs-divider">VS</div>

          <div className="modal-team-score">
            <span className="modal-team-name">{match.teamB.flag || '🏏'} {match.teamB.name}</span>
            <span className="modal-score-badge">{match.teamB.score}</span>
          </div>
        </div>

        {/* Highlight / Status */}
        <div className="modal-status-card">
          <strong>Match Timing & Status:</strong>
          <span>{match.statusText || match.highlight || match.venueOrOvers || match.status}</span>
        </div>

        {/* Details list */}
        <div className="modal-info-list">
          <div className="modal-info-row">
            <span><SiteIcon name="clock" size={14} /> Time / Stage</span>
            <strong>{match.liveTime || match.venueOrOvers || 'Scheduled'}</strong>
          </div>
          <div className="modal-info-row">
            <span><SiteIcon name="shield-check" size={14} /> Attribution</span>
            <strong>{match.source}</strong>
          </div>
        </div>

        {/* Grassroots Action Launchpad */}
        <div className="modal-grassroots-launchpad">
          <div className="grassroots-header">
            <span className="grassroots-symbol">⚡</span>
            <div>
              <h4>Inspired by this match? Step onto the field!</h4>
              <p>Find accredited trials, coaching academies, and booking turfs across India.</p>
            </div>
          </div>

          <div className="grassroots-links-grid">
            <a
              href="/opportunities"
              onClick={(e) => handleLinkClick(e, '/opportunities')}
              className="grassroots-action-btn"
            >
              <span>🎯 {match.sport} Trials</span>
              <SiteIcon name="arrow-up-right" size={12} />
            </a>
            <a
              href="/venues"
              onClick={(e) => handleLinkClick(e, '/venues')}
              className="grassroots-action-btn"
            >
              <span>🏟️ Book Turf / Nets</span>
              <SiteIcon name="arrow-up-right" size={12} />
            </a>
            <a
              href="/academies"
              onClick={(e) => handleLinkClick(e, '/academies')}
              className="grassroots-action-btn"
            >
              <span>🛡️ Top Academies</span>
              <SiteIcon name="arrow-up-right" size={12} />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <div className="modal-share-actions">
            <button type="button" onClick={handleWhatsAppShare} className="modal-btn-whatsapp">
              <SiteIcon name="share" size={14} />
              <span>WhatsApp</span>
            </button>
            <button type="button" onClick={handleCopyLink} className="modal-btn-outline">
              <SiteIcon name="copy" size={14} />
              <span>Copy Link</span>
            </button>
          </div>
          <button type="button" onClick={onClose} className="modal-btn-close">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
