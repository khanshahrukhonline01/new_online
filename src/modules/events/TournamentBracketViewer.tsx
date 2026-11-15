import { useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './TournamentBracketViewer.css'

export interface TournamentMatch {
  id: string
  round: 'quarter' | 'semi' | 'final'
  matchTitle: string
  teamA: {
    name: string
    score?: string
    isWinner?: boolean
    seed?: number
  }
  teamB: {
    name: string
    score?: string
    isWinner?: boolean
    seed?: number
  }
  venue: string
  time: string
  status: 'live' | 'completed' | 'scheduled'
  playerOfTheMatch?: {
    name: string
    role: string
    stats: string
  }
}

export interface GroupStanding {
  rank: number
  team: string
  played: number
  won: number
  lost: number
  tied: number
  netRunRate: string
  points: number
  form: ('W' | 'L' | 'T')[]
}

const SHOWCASE_TOURNAMENT_MATCHES: TournamentMatch[] = [
  // Quarter Finals
  {
    id: 'qf-1',
    round: 'quarter',
    matchTitle: 'Quarter Final 1',
    teamA: { name: 'Kanpur Super Strikers', score: '158/5 (16.0)', isWinner: true, seed: 1 },
    teamB: { name: 'Ganga Ghat Warriors', score: '154/8 (16.0)', isWinner: false, seed: 8 },
    venue: 'Green Park Turf 1, Kanpur',
    time: '14 Nov 2026, 04:30 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Rohit Verma', role: 'Pace Bowler', stats: '3/18 (4.0) & 24* (12)' },
  },
  {
    id: 'qf-2',
    round: 'quarter',
    matchTitle: 'Quarter Final 2',
    teamA: { name: 'Civil Lines Kings', score: '172/4 (16.0)', isWinner: true, seed: 4 },
    teamB: { name: 'Govind Nagar Blasters', score: '141/9 (16.0)', isWinner: false, seed: 5 },
    venue: 'Palika Stadium Court A',
    time: '14 Nov 2026, 06:45 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Aman Dixit', role: 'Top-Order Batter', stats: '78 (39)' },
  },
  {
    id: 'qf-3',
    round: 'quarter',
    matchTitle: 'Quarter Final 3',
    teamA: { name: 'Kalyanpur Knights', score: '162/6 (16.0)', isWinner: true, seed: 3 },
    teamB: { name: 'Chakeri Challengers', score: '159/7 (16.0)', isWinner: false, seed: 6 },
    venue: 'IIT Kanpur Sports Complex',
    time: '14 Nov 2026, 07:15 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Sameer Khan', role: 'All-Rounder', stats: '42 (20) & 2/22' },
  },
  {
    id: 'qf-4',
    round: 'quarter',
    matchTitle: 'Quarter Final 4',
    teamA: { name: 'Ratan Lal Nagar Royals', score: '185/3 (16.0)', isWinner: true, seed: 2 },
    teamB: { name: 'Shyam Nagar Smashers', score: '138/10 (15.2)', isWinner: false, seed: 7 },
    venue: 'Green Park Turf 2, Kanpur',
    time: '14 Nov 2026, 09:00 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Vikas Pandey', role: 'Opener', stats: '91* (44)' },
  },

  // Semi Finals
  {
    id: 'sf-1',
    round: 'semi',
    matchTitle: 'Semi Final 1',
    teamA: { name: 'Kanpur Super Strikers', score: '179/4 (16.0)', isWinner: true, seed: 1 },
    teamB: { name: 'Civil Lines Kings', score: '168/7 (16.0)', isWinner: false, seed: 4 },
    venue: 'Green Park International Main Ground',
    time: '15 Nov 2026, 05:00 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Rohit Verma', role: 'Fast Bowler', stats: '4/21 (4.0) · 135 km/h radar' },
  },
  {
    id: 'sf-2',
    round: 'semi',
    matchTitle: 'Semi Final 2',
    teamA: { name: 'Ratan Lal Nagar Royals', score: '194/2 (16.0)', isWinner: true, seed: 2 },
    teamB: { name: 'Kalyanpur Knights', score: '188/6 (16.0)', isWinner: false, seed: 3 },
    venue: 'Green Park International Main Ground',
    time: '15 Nov 2026, 07:30 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Vikas Pandey', role: 'Opener', stats: '84 (38)' },
  },

  // Grand Final
  {
    id: 'fn-1',
    round: 'final',
    matchTitle: 'Grand Championship Final',
    teamA: { name: 'Kanpur Super Strikers', score: '186/5 (16.0)', isWinner: true, seed: 1 },
    teamB: { name: 'Ratan Lal Nagar Royals', score: '181/8 (16.0)', isWinner: false, seed: 2 },
    venue: 'Green Park International Cricket Stadium (Floodlit)',
    time: '16 Nov 2026, 07:00 PM',
    status: 'completed',
    playerOfTheMatch: { name: 'Rohit Verma', role: 'Pace Bowler', stats: '5/18 (4.0) & Final Over Defense' },
  },
]

const SHOWCASE_GROUP_STANDINGS: GroupStanding[] = [
  { rank: 1, team: 'Kanpur Super Strikers', played: 5, won: 5, lost: 0, tied: 0, netRunRate: '+2.14', points: 10, form: ['W', 'W', 'W', 'W', 'W'] },
  { rank: 2, team: 'Ratan Lal Nagar Royals', played: 5, won: 4, lost: 1, tied: 0, netRunRate: '+1.62', points: 8, form: ['W', 'W', 'W', 'L', 'W'] },
  { rank: 3, team: 'Kalyanpur Knights', played: 5, won: 3, lost: 2, tied: 0, netRunRate: '+0.54', points: 6, form: ['W', 'L', 'W', 'W', 'L'] },
  { rank: 4, team: 'Civil Lines Kings', played: 5, won: 3, lost: 2, tied: 0, netRunRate: '+0.12', points: 6, form: ['L', 'W', 'W', 'L', 'W'] },
  { rank: 5, team: 'Govind Nagar Blasters', played: 5, won: 2, lost: 3, tied: 0, netRunRate: '-0.42', points: 4, form: ['L', 'L', 'W', 'W', 'L'] },
  { rank: 6, team: 'Chakeri Challengers', played: 5, won: 1, lost: 4, tied: 0, netRunRate: '-1.08', points: 2, form: ['L', 'W', 'L', 'L', 'L'] },
]

export interface TournamentBracketViewerProps {
  tournamentTitle?: string
  city?: string
  sport?: string
  matches?: TournamentMatch[]
  standings?: GroupStanding[]
}

export function TournamentBracketViewer({
  tournamentTitle = 'Kanpur Inter-District Junior Cricket Championship 2026',
  city = 'Kanpur',
  sport = 'Cricket',
  matches = SHOWCASE_TOURNAMENT_MATCHES,
  standings = SHOWCASE_GROUP_STANDINGS,
}: TournamentBracketViewerProps) {
  const [activeTab, setActiveTab] = useState<'bracket' | 'table'>('bracket')
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null)

  const quarterMatches = matches.filter(m => m.round === 'quarter')
  const semiMatches = matches.filter(m => m.round === 'semi')
  const finalMatch = matches.find(m => m.round === 'final')

  return (
    <section className="tournament-bracket-viewer" aria-label="Tournament Brackets & Standings">
      <div className="bracket-header">
        <div className="bracket-eyebrow">
          <SiteIcon name="trophy" size={14} />
          <span>GRASSROOTS TOURNAMENT CENTRE · {sport.toUpperCase()}</span>
        </div>
        <h3 className="bracket-title">{tournamentTitle}</h3>
        <p className="bracket-sub">Official Knockout Stages, Live Match Scores &amp; District Standings in {city}.</p>

        {/* View Switcher Tabs */}
        <div className="bracket-tab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bracket'}
            className={`bracket-tab-btn ${activeTab === 'bracket' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('bracket')}
          >
            <SiteIcon name="trophy" size={14} />
            <span>Knockout Bracket Tree</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'table'}
            className={`bracket-tab-btn ${activeTab === 'table' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <SiteIcon name="sort" size={14} />
            <span>Group Standings Table</span>
          </button>
        </div>
      </div>

      {activeTab === 'bracket' ? (
        <div className="bracket-tree-wrapper">
          {/* Quarter Finals Column */}
          <div className="bracket-round-col">
            <div className="round-col-header">
              <span className="round-badge">ROUND 1</span>
              <h4>Quarter Finals</h4>
            </div>
            <div className="round-matches-list">
              {quarterMatches.map(m => (
                <div
                  key={m.id}
                  className={`bracket-match-node ${selectedMatch?.id === m.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMatch(m)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedMatch(m)
                  }}
                >
                  <div className="match-node-meta">
                    <span className="match-node-time">{m.matchTitle}</span>
                    <span className={`match-node-status status-${m.status}`}>{m.status.toUpperCase()}</span>
                  </div>
                  <div className={`match-node-team ${m.teamA.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      {m.teamA.seed && <span className="seed-badge">#{m.teamA.seed}</span>}
                      {m.teamA.name}
                    </span>
                    <span className="node-team-score">{m.teamA.score || '—'}</span>
                  </div>
                  <div className={`match-node-team ${m.teamB.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      {m.teamB.seed && <span className="seed-badge">#{m.teamB.seed}</span>}
                      {m.teamB.name}
                    </span>
                    <span className="node-team-score">{m.teamB.score || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semi Finals Column */}
          <div className="bracket-round-col">
            <div className="round-col-header">
              <span className="round-badge">ROUND 2</span>
              <h4>Semi Finals</h4>
            </div>
            <div className="round-matches-list is-semis">
              {semiMatches.map(m => (
                <div
                  key={m.id}
                  className={`bracket-match-node ${selectedMatch?.id === m.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMatch(m)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedMatch(m)
                  }}
                >
                  <div className="match-node-meta">
                    <span className="match-node-time">{m.matchTitle}</span>
                    <span className={`match-node-status status-${m.status}`}>{m.status.toUpperCase()}</span>
                  </div>
                  <div className={`match-node-team ${m.teamA.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      {m.teamA.seed && <span className="seed-badge">#{m.teamA.seed}</span>}
                      {m.teamA.name}
                    </span>
                    <span className="node-team-score">{m.teamA.score || '—'}</span>
                  </div>
                  <div className={`match-node-team ${m.teamB.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      {m.teamB.seed && <span className="seed-badge">#{m.teamB.seed}</span>}
                      {m.teamB.name}
                    </span>
                    <span className="node-team-score">{m.teamB.score || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Final Column */}
          <div className="bracket-round-col is-final-col">
            <div className="round-col-header">
              <span className="round-badge gold">FINAL</span>
              <h4>Championship</h4>
            </div>
            {finalMatch && (
              <div className="final-match-wrap">
                <div
                  className={`bracket-match-node is-championship ${selectedMatch?.id === finalMatch.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMatch(finalMatch)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedMatch(finalMatch)
                  }}
                >
                  <div className="match-node-meta">
                    <span className="match-node-time">{finalMatch.matchTitle}</span>
                    <span className="match-node-status gold-status">CHAMPIONSHIP</span>
                  </div>
                  <div className={`match-node-team ${finalMatch.teamA.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      🏆 {finalMatch.teamA.name}
                    </span>
                    <span className="node-team-score">{finalMatch.teamA.score || '—'}</span>
                  </div>
                  <div className={`match-node-team ${finalMatch.teamB.isWinner ? 'is-winner' : ''}`}>
                    <span className="node-team-name">
                      🥈 {finalMatch.teamB.name}
                    </span>
                    <span className="node-team-score">{finalMatch.teamB.score || '—'}</span>
                  </div>
                </div>

                <div className="tournament-champion-banner">
                  <div className="champ-cup">🏆</div>
                  <div>
                    <span className="champ-lbl">CHAMPIONS</span>
                    <strong className="champ-team">{finalMatch.teamA.name}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Points Table Standings */
        <div className="bracket-standings-wrapper">
          <table className="bracket-standings-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>TEAM</th>
                <th>P</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>NRR</th>
                <th>PTS</th>
                <th>FORM</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(s => (
                <tr key={s.rank} className={s.rank <= 4 ? 'is-qualified' : ''}>
                  <td className="col-rank">
                    <span className={`rank-pill ${s.rank <= 4 ? 'top-4' : ''}`}>{s.rank}</span>
                  </td>
                  <td className="col-team">
                    <strong>{s.team}</strong>
                    {s.rank <= 4 && <span className="qualify-tag">Q</span>}
                  </td>
                  <td>{s.played}</td>
                  <td>{s.won}</td>
                  <td>{s.lost}</td>
                  <td>{s.tied}</td>
                  <td>{s.netRunRate}</td>
                  <td className="col-pts">
                    <strong>{s.points}</strong>
                  </td>
                  <td className="col-form">
                    <div className="form-dots">
                      {s.form.map((res, i) => (
                        <span key={i} className={`form-dot dot-${res.toLowerCase()}`}>
                          {res}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Match Details Drawer */}
      {selectedMatch && (
        <div className="bracket-match-details-drawer">
          <div className="drawer-topline">
            <div>
              <span className="drawer-eyebrow">{selectedMatch.matchTitle}</span>
              <h4>
                {selectedMatch.teamA.name} vs {selectedMatch.teamB.name}
              </h4>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setSelectedMatch(null)}
              aria-label="Close match details"
            >
              <SiteIcon name="close" size={16} />
            </button>
          </div>

          <div className="drawer-scores-bar">
            <div className="drawer-team-box">
              <span className="d-name">{selectedMatch.teamA.name}</span>
              <strong className="d-score">{selectedMatch.teamA.score || 'Yet to Bat'}</strong>
            </div>
            <div className="d-vs">VS</div>
            <div className="drawer-team-box">
              <span className="d-name">{selectedMatch.teamB.name}</span>
              <strong className="d-score">{selectedMatch.teamB.score || 'Yet to Bat'}</strong>
            </div>
          </div>

          <div className="drawer-info-grid">
            <div className="info-chip">
              <span className="lbl">Venue:</span>
              <span className="val">{selectedMatch.venue}</span>
            </div>
            <div className="info-chip">
              <span className="lbl">Date &amp; Time:</span>
              <span className="val">{selectedMatch.time}</span>
            </div>
          </div>

          {/* Player of the Match Digital Badge */}
          {selectedMatch.playerOfTheMatch && (
            <div className="drawer-potm-card">
              <div className="potm-badge-eyebrow">
                <SiteIcon name="award" size={16} />
                <span>OFFICIAL PLAYER OF THE MATCH (POTM)</span>
              </div>
              <div className="potm-player-row">
                <div className="potm-avatar">
                  <SiteIcon name="user-round" size={24} />
                </div>
                <div className="potm-details">
                  <h5 className="potm-name">{selectedMatch.playerOfTheMatch.name}</h5>
                  <span className="potm-role">{selectedMatch.playerOfTheMatch.role}</span>
                  <p className="potm-stats">Performance: <strong>{selectedMatch.playerOfTheMatch.stats}</strong></p>
                </div>
                <div className="potm-verified-seal">
                  <span>★ KHELGRID VERIFIED POTM</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
