import { useState } from 'react';
import type { CommunityLiveMatch, SportType } from '../types';
import { scorekeeperService } from '../services/scorekeeperService';
import { SiteIcon } from '../../../shared/components/SiteIcon';
import './ScorekeeperModal.css';

interface ScorekeeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchUpdated: (updatedMatch: CommunityLiveMatch) => void;
}

export function ScorekeeperModal({ isOpen, onClose, onMatchUpdated }: ScorekeeperModalProps) {
  const [matches, setMatches] = useState<CommunityLiveMatch[]>(() => scorekeeperService.getCommunityMatches());
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => matches[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Match State
  const [newSport, setNewSport] = useState<SportType>('Cricket');
  const [newTournament, setNewTournament] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newHostName, setNewHostName] = useState('Ground Scorer');

  // Active Scoring Input State
  const [customCommentary, setCustomCommentary] = useState('');
  const [footballScorer, setFootballScorer] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournament.trim() || !newTeamA.trim() || !newTeamB.trim()) {
      setFeedbackNotice('Please provide tournament name and both team names.');
      return;
    }

    const created = await scorekeeperService.createNewMatch({
      sport: newSport,
      tournament: newTournament,
      venue: newVenue || 'Local Turf Arena',
      city: newCity || 'Bengaluru',
      teamAName: newTeamA,
      teamBName: newTeamB,
      hostName: newHostName,
    });

    const updated = scorekeeperService.getCommunityMatches();
    setMatches(updated);
    setSelectedMatchId(created.id);
    setIsCreatingNew(false);
    onMatchUpdated(created);
    setFeedbackNotice(`✓ Live match "${created.teamA.name} vs ${created.teamB.name}" started!`);
  };

  const handleCricketBall = async (runs: number, isWicket = false, isExtra = false, extraType?: 'wide' | 'no_ball') => {
    if (!currentMatch) return;
    const updated = await scorekeeperService.recordCricketBall(currentMatch.id, {
      runs,
      isWicket,
      isExtra,
      extraType,
      commentaryText: customCommentary.trim() || undefined,
    });
    if (updated) {
      setMatches(scorekeeperService.getCommunityMatches());
      onMatchUpdated(updated);
      setCustomCommentary('');
      setFeedbackNotice(`Updated: ${updated.teamA.score} (${updated.venueOrOvers})`);
    }
  };

  const handleFootballGoal = async (team: 'A' | 'B') => {
    if (!currentMatch) return;
    const scorer = footballScorer.trim() || (team === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name);
    const updated = await scorekeeperService.recordFootballGoal(currentMatch.id, team, scorer);
    if (updated) {
      setMatches(scorekeeperService.getCommunityMatches());
      onMatchUpdated(updated);
      setFootballScorer('');
      setFeedbackNotice(`Goal recorded! ${updated.teamA.name} ${updated.teamA.score} - ${updated.teamB.score} ${updated.teamB.name}`);
    }
  };

  const handleFinishMatch = async () => {
    if (!currentMatch) return;
    const updated = await scorekeeperService.updateMatchStatus(currentMatch.id, 'FINISHED');
    if (updated) {
      setMatches(scorekeeperService.getCommunityMatches());
      onMatchUpdated(updated);
      setFeedbackNotice('Match marked as FINISHED and archived to results.');
    }
  };

  return (
    <div className="scorekeeper-overlay" role="dialog" aria-modal="true">
      <div className="scorekeeper-modal">
        {/* Modal Close Button */}
        <button type="button" className="scorekeeper-close" onClick={onClose} aria-label="Close Scorekeeper">
          ✕
        </button>

        {/* Modal Header */}
        <div className="scorekeeper-header">
          <div className="scorekeeper-live-badge">
            <span className="live-dot" />
            <span>LIVE MATCH SCOREKEEPER CONSOLE</span>
          </div>
          <h2>Broadcast Live Match Scores</h2>
          <p>Instant ball-by-ball and goal-by-goal scorekeeper for local tournaments, turf leagues, and school cups.</p>
        </div>

        {/* Feedback Alert */}
        {feedbackNotice && (
          <div className="scorekeeper-notice" role="status">
            <span>{feedbackNotice}</span>
            <button type="button" onClick={() => setFeedbackNotice(null)} className="notice-dismiss">✕</button>
          </div>
        )}

        {/* Match Selection Bar */}
        <div className="scorekeeper-match-selector">
          <label htmlFor="scorer-match-select">Select Active Match:</label>
          <div className="selector-row">
            <select
              id="scorer-match-select"
              value={selectedMatchId}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setIsCreatingNew(false);
              }}
              disabled={isCreatingNew}
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tournament}: {m.teamA.name} ({m.teamA.score}) vs {m.teamB.name} ({m.teamB.score}) — {m.status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`new-match-btn ${isCreatingNew ? 'is-active' : ''}`}
              onClick={() => setIsCreatingNew((prev) => !prev)}
            >
              {isCreatingNew ? 'Cancel' : '+ New Match'}
            </button>
          </div>
        </div>

        {/* CREATE NEW MATCH ACCORDION */}
        {isCreatingNew ? (
          <form className="scorekeeper-create-form" onSubmit={handleCreateMatch}>
            <h3>Start New Tournament Match</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="scorer-sport">Sport</label>
                <select
                  id="scorer-sport"
                  value={newSport}
                  onChange={(e) => setNewSport(e.target.value as SportType)}
                >
                  <option value="Cricket">Cricket (Box / Turf / Leather)</option>
                  <option value="Football">Football (5v5 / 7v7 / 11v11)</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Basketball">Basketball</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="scorer-tournament">Tournament / League Name</label>
                <input
                  id="scorer-tournament"
                  type="text"
                  placeholder="e.g. Bangalore Box Cricket Championship"
                  value={newTournament}
                  onChange={(e) => setNewTournament(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="scorer-team-a">Team A Name (Batting / Home)</label>
                <input
                  id="scorer-team-a"
                  type="text"
                  placeholder="e.g. Whitefield Titans"
                  value={newTeamA}
                  onChange={(e) => setNewTeamA(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="scorer-team-b">Team B Name (Bowling / Away)</label>
                <input
                  id="scorer-team-b"
                  type="text"
                  placeholder="e.g. Koramangala Knights"
                  value={newTeamB}
                  onChange={(e) => setNewTeamB(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="scorer-venue">Venue / Turf</label>
                <input
                  id="scorer-venue"
                  type="text"
                  placeholder="e.g. FSV Arena Court 1"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="scorer-city">City</label>
                <input
                  id="scorer-city"
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="scorer-host-name">Scorer / Host Name</label>
                <input
                  id="scorer-host-name"
                  type="text"
                  placeholder="e.g. Coach Ramesh"
                  value={newHostName}
                  onChange={(e) => setNewHostName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="scorer-cta-btn primary">
                🚀 Commence Live Scoring Now
              </button>
            </div>
          </form>
        ) : (
          /* ACTIVE MATCH SCORER CONTROLS */
          currentMatch && (
            <div className="scorekeeper-active-board">
              {/* Scorecard Hero Header */}
              <div className="scorer-match-hero">
                <div className="scorer-teams-line">
                  <div className="scorer-team">
                    <span className="scorer-team-name">{currentMatch.teamA.name}</span>
                    <strong className="scorer-team-score">{currentMatch.teamA.score}</strong>
                  </div>
                  <div className="scorer-vs">VS</div>
                  <div className="scorer-team">
                    <span className="scorer-team-name">{currentMatch.teamB.name}</span>
                    <strong className="scorer-team-score">{currentMatch.teamB.score}</strong>
                  </div>
                </div>
                <div className="scorer-status-line">
                  <span>{currentMatch.venueOrOvers}</span> · <span>{currentMatch.venue}</span> ·{' '}
                  <span className="badge-live">{currentMatch.status}</span>
                </div>
              </div>

              {/* CRICKET CONTROLS */}
              {currentMatch.sport === 'Cricket' && (
                <div className="scorer-action-section">
                  <h4>Tap to Record Ball (Delivery):</h4>
                  <div className="scorer-keypad">
                    <button type="button" className="keypad-btn" onClick={() => handleCricketBall(0)}>
                      0 <span>Dot</span>
                    </button>
                    <button type="button" className="keypad-btn" onClick={() => handleCricketBall(1)}>
                      1 <span>Single</span>
                    </button>
                    <button type="button" className="keypad-btn" onClick={() => handleCricketBall(2)}>
                      2 <span>Two</span>
                    </button>
                    <button type="button" className="keypad-btn" onClick={() => handleCricketBall(3)}>
                      3 <span>Three</span>
                    </button>
                    <button type="button" className="keypad-btn is-four" onClick={() => handleCricketBall(4)}>
                      4 <span>FOUR</span>
                    </button>
                    <button type="button" className="keypad-btn is-six" onClick={() => handleCricketBall(6)}>
                      6 <span>SIX!</span>
                    </button>
                    <button type="button" className="keypad-btn is-wide" onClick={() => handleCricketBall(1, false, true, 'wide')}>
                      WD <span>Wide (+1)</span>
                    </button>
                    <button type="button" className="keypad-btn is-noball" onClick={() => handleCricketBall(1, false, true, 'no_ball')}>
                      NB <span>No Ball</span>
                    </button>
                    <button type="button" className="keypad-btn is-wicket" onClick={() => handleCricketBall(0, true)}>
                      W <span>WICKET!</span>
                    </button>
                  </div>

                  <div className="commentary-input-row">
                    <input
                      type="text"
                      placeholder="Optional ball commentary (e.g. Great yorker at the toes, lofted over midwicket)"
                      value={customCommentary}
                      onChange={(e) => setCustomCommentary(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* FOOTBALL CONTROLS */}
              {currentMatch.sport === 'Football' && (
                <div className="scorer-action-section">
                  <h4>Record Match Goal:</h4>
                  <div className="football-goal-actions">
                    <button
                      type="button"
                      className="scorer-cta-btn primary"
                      onClick={() => handleFootballGoal('A')}
                    >
                      ⚽ Goal for {currentMatch.teamA.name} (+1)
                    </button>
                    <button
                      type="button"
                      className="scorer-cta-btn secondary"
                      onClick={() => handleFootballGoal('B')}
                    >
                      ⚽ Goal for {currentMatch.teamB.name} (+1)
                    </button>
                  </div>
                  <div className="commentary-input-row" style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Goal scorer name (e.g. Farhan 34')"
                      value={footballScorer}
                      onChange={(e) => setFootballScorer(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* LIVE COMMENTARY TIMELINE PREVIEW */}
              <div className="scorer-timeline-box">
                <h4>Live Commentary Timeline ({currentMatch.commentaryTimeline?.length || 0})</h4>
                <div className="scorer-timeline-list">
                  {currentMatch.commentaryTimeline?.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="timeline-item">
                      <span className="timeline-time">{ev.time}</span>
                      <span className="timeline-text">{ev.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MATCH STATUS & FINISH BAR */}
              <div className="scorer-footer-bar">
                <button
                  type="button"
                  className="scorer-btn-finish"
                  onClick={handleFinishMatch}
                  disabled={currentMatch.status === 'FINISHED'}
                >
                  {currentMatch.status === 'FINISHED' ? '✓ Match Completed' : 'End Match & Finalize Score'}
                </button>
                <button
                  type="button"
                  className="scorer-btn-share"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(`${window.location.origin}/live`);
                      setFeedbackNotice('Copied spectator live stream link to clipboard!');
                    }
                  }}
                >
                  <SiteIcon name="share" size={14} /> Copy Spectator Link
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
