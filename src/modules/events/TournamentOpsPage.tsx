import { useState, type MouseEvent, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  getTournamentBracket,
  generateTournamentBracket,
  verifySquadAgeEligibility,
  getLiveScorerState,
  updateLiveMatchScore,
  getTournamentCertificates,
  issueTournamentCertificate,
  generateWhatsAppCertificateUrl,
  SAMPLE_SQUAD_ROSTER,
  type TournamentBracketNode,
  type LiveScorerState,
  type TournamentCertificate,
} from './tournamentOpsEngine'
import './TournamentOpsPage.css'

export interface TournamentOpsPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function TournamentOpsPage({ onNavigate }: TournamentOpsPageProps) {
  const [selectedTournamentId] = useState('tour-national-u16-2026')
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const [activeTab, setActiveTab] = useState<'brackets' | 'squad-audit' | 'scorer' | 'certificates'>('brackets')

  // Data
  const matches: TournamentBracketNode[] = getTournamentBracket(selectedTournamentId)
  const squadRoster = SAMPLE_SQUAD_ROSTER
  const [ageCutoff, setAgeCutoff] = useState<number>(16)
  const squadScan = verifySquadAgeEligibility('Delhi Colts FC', squadRoster, ageCutoff)
  const scorerState: LiveScorerState = getLiveScorerState(matches[0]?.id || 'match-qf-1')
  const certificates: TournamentCertificate[] = getTournamentCertificates(selectedTournamentId)

  // Bracket Generation Modal State
  const [isGenerateBracketModalOpen, setIsGenerateBracketModalOpen] = useState(false)
  const [bracketTeamCount, setBracketTeamCount] = useState<'4' | '8'>('8')
  const [bracketFormat, setBracketFormat] = useState<'single_elimination' | 'round_robin_knockout'>('single_elimination')
  const [bracketTeamsInput, setBracketTeamsInput] = useState(
    'Bengaluru Youth FC\nHyderabad Strikers\nDelhi City Colts\nChandigarh Hawks\nMumbai Grassroots United\nKolkata Kickers\nPunjab Football Academy\nGoa Coastal Blasters'
  )

  // Scorer Console Live State
  const [scoreA, setScoreA] = useState(scorerState.teamAScore)
  const [scoreB, setScoreB] = useState(scorerState.teamBScore)
  const [period, setPeriod] = useState(scorerState.currentPeriod)
  const [eventNote, setEventNote] = useState('')
  const [eventTeam, setEventTeam] = useState<'teamA' | 'teamB'>('teamA')

  // Certificate Modal State
  const [isIssueCertModalOpen, setIsIssueCertModalOpen] = useState(false)
  const [certAthlete, setCertAthlete] = useState('Arjun Mehra')
  const [certTeam, setCertTeam] = useState('Bengaluru Youth FC')
  const [certSport, setCertSport] = useState('Football')
  const [certRole, setCertRole] = useState<'Champion Winner' | 'Runner-Up Finalist' | 'Player of the Tournament' | 'Verified Participant'>('Champion Winner')
  const [certAuthority, setCertAuthority] = useState('All India Sports Operations Board & KhelGrid')

  const handleGenerateBracketSubmit = (e: FormEvent) => {
    e.preventDefault()
    const teamNames = bracketTeamsInput
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean)

    generateTournamentBracket({
      tournamentId: selectedTournamentId,
      title: 'National Grassroots Championship',
      sport: certSport,
      format: bracketFormat,
      teamNames,
    })

    setIsGenerateBracketModalOpen(false)
    triggerRefresh()
  }

  const handleScoreEventSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!eventNote.trim()) return

    updateLiveMatchScore(
      scorerState.matchId,
      scoreA,
      scoreB,
      period,
      eventNote.trim(),
      eventTeam
    )

    setEventNote('')
    triggerRefresh()
  }

  const handleIssueCertSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!certAthlete.trim()) return

    issueTournamentCertificate({
      tournamentId: selectedTournamentId,
      tournamentTitle: 'All-India National Youth Championship 2026',
      athleteName: certAthlete.trim(),
      teamName: certTeam.trim(),
      sport: certSport,
      achievementRole: certRole,
      organizerAuthority: certAuthority,
    })

    setIsIssueCertModalOpen(false)
    triggerRefresh()
  }

  // Quick Score Adjusters
  const incrementScore = (team: 'teamA' | 'teamB', delta: number) => {
    if (team === 'teamA') {
      const current = parseInt(scoreA, 10) || 0
      const next = Math.max(0, current + delta)
      setScoreA(String(next))
      updateLiveMatchScore(scorerState.matchId, String(next), scoreB, period, `Goal / Score update (${scorerState.teamAName})`, 'teamA')
    } else {
      const current = parseInt(scoreB, 10) || 0
      const next = Math.max(0, current + delta)
      setScoreB(String(next))
      updateLiveMatchScore(scorerState.matchId, scoreA, String(next), period, `Goal / Score update (${scorerState.teamBName})`, 'teamB')
    }
    triggerRefresh()
  }

  return (
    <div className="tournament-ops-root content-page" key={refreshKey}>
      {/* Navigation Breadcrumb */}
      {onNavigate && (
        <div style={{ marginBottom: '0.75rem' }}>
          <a
            href="/events"
            onClick={e => onNavigate(e, '/events')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              color: '#059669',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <SiteIcon name="arrow-left" size={14} />
            <span>Back to Tournaments &amp; Events</span>
          </a>
        </div>
      )}

      {/* Header Row */}
      <div className="tournament-ops-header-row">
        <div className="tournament-ops-title">
          <p className="eyebrow" style={{ color: '#059669', fontWeight: 800, margin: 0 }}>
            KHELGRID · TOURNAMENT OPERATIONS SUITE
          </p>
          <h1>National Sports Operations &amp; Tournament Desk</h1>
          <p className="tournament-ops-subtitle">
            Enterprise fixtures wizard, automated knockout brackets, anti-age-fraud squad verification, pitch-side live scorer console, and tamper-proof digital certificates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="host-action-btn primary"
            onClick={() => setIsGenerateBracketModalOpen(true)}
            style={{ fontSize: '0.86rem', padding: '8px 14px' }}
          >
            <SiteIcon name="sparkles" size={15} />
            <span>Format &amp; Fixture Wizard</span>
          </button>
          <button
            type="button"
            className="host-action-btn secondary"
            onClick={() => setIsIssueCertModalOpen(true)}
            style={{ fontSize: '0.86rem', padding: '8px 14px' }}
          >
            <SiteIcon name="award" size={15} />
            <span>Issue Certificate</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="tournament-metrics-grid">
        <div className="tournament-stat-card">
          <div className="tournament-stat-header">
            <div className="tournament-stat-icon-wrap" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <SiteIcon name="calendar" size={18} />
            </div>
            <span className="tournament-stat-value">{matches.length}</span>
          </div>
          <span className="tournament-stat-title">Scheduled Matches</span>
        </div>

        <div className="tournament-stat-card">
          <div className="tournament-stat-header">
            <div className="tournament-stat-icon-wrap" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <SiteIcon name="shield-check" size={18} />
            </div>
            <span className="tournament-stat-value">
              {squadScan.eligible ? '100%' : `${squadScan.flaggedCount} Flagged`}
            </span>
          </div>
          <span className="tournament-stat-title">Squad Age Integrity</span>
        </div>

        <div className="tournament-stat-card">
          <div className="tournament-stat-header">
            <div className="tournament-stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <SiteIcon name="activity" size={18} />
            </div>
            <span className="tournament-stat-value">Live</span>
          </div>
          <span className="tournament-stat-title">Pitch-Side Scorer Active</span>
        </div>

        <div className="tournament-stat-card">
          <div className="tournament-stat-header">
            <div className="tournament-stat-icon-wrap" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <SiteIcon name="award" size={18} />
            </div>
            <span className="tournament-stat-value">{certificates.length}</span>
          </div>
          <span className="tournament-stat-title">Verifiable Certificates Issued</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tournament-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'brackets'}
          className={`tournament-tab-btn ${activeTab === 'brackets' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('brackets')}
        >
          <SiteIcon name="calendar" size={15} />
          <span>Brackets &amp; Fixtures ({matches.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'squad-audit'}
          className={`tournament-tab-btn ${activeTab === 'squad-audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('squad-audit')}
        >
          <SiteIcon name="shield-check" size={15} />
          <span>Anti-Age Fraud Squad Audit</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'scorer'}
          className={`tournament-tab-btn ${activeTab === 'scorer' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('scorer')}
        >
          <SiteIcon name="activity" size={15} />
          <span>Pitch-Side Scorer Console</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'certificates'}
          className={`tournament-tab-btn ${activeTab === 'certificates' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('certificates')}
        >
          <SiteIcon name="award" size={15} />
          <span>Verifiable Certificates ({certificates.length})</span>
        </button>
      </div>

      {/* TAB 1: BRACKETS & FIXTURES */}
      {activeTab === 'brackets' && (
        <div className="tournament-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Knockout Progression &amp; Pitch Schedules</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Automated progression tree mapping Quarterfinals to Semifinals and Grand Championship Final.
              </p>
            </div>
            <button
              type="button"
              className="host-action-btn primary"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={() => setIsGenerateBracketModalOpen(true)}
            >
              <SiteIcon name="sparkles" size={14} />
              <span>Generate New Bracket</span>
            </button>
          </div>

          <div className="tournament-bracket-columns">
            {/* Quarter Finals */}
            <div className="bracket-round-column">
              <span className="bracket-round-header">Quarter Finals (Round of 8)</span>
              {matches.filter(m => m.round === 'quarter').map(m => (
                <div key={m.id} className="bracket-match-node">
                  <div className="bracket-node-header">
                    <span>{m.matchTitle}</span>
                    <span>{m.pitchOrCourt}</span>
                  </div>
                  <div className={`bracket-team-row ${m.teamA.isWinner ? 'winner' : ''}`}>
                    <span>{m.teamA.name}</span>
                    <strong>{m.teamA.score || '—'}</strong>
                  </div>
                  <div className={`bracket-team-row ${m.teamB.isWinner ? 'winner' : ''}`}>
                    <span>{m.teamB.name}</span>
                    <strong>{m.teamB.score || '—'}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
                    {m.scheduledTime}
                  </span>
                </div>
              ))}
            </div>

            {/* Semi Finals */}
            <div className="bracket-round-column">
              <span className="bracket-round-header">Semi Finals (Final 4)</span>
              {matches.filter(m => m.round === 'semi').map(m => (
                <div key={m.id} className={`bracket-match-node ${m.status === 'live' ? 'live' : ''}`}>
                  <div className="bracket-node-header">
                    <span>{m.matchTitle}</span>
                    {m.status === 'live' ? (
                      <span style={{ color: '#d97706', fontWeight: 800 }}>● LIVE NOW</span>
                    ) : (
                      <span>{m.pitchOrCourt}</span>
                    )}
                  </div>
                  <div className={`bracket-team-row ${m.teamA.isWinner ? 'winner' : ''}`}>
                    <span>{m.teamA.name}</span>
                    <strong>{m.teamA.score || '—'}</strong>
                  </div>
                  <div className={`bracket-team-row ${m.teamB.isWinner ? 'winner' : ''}`}>
                    <span>{m.teamB.name}</span>
                    <strong>{m.teamB.score || '—'}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
                    {m.scheduledTime}
                  </span>
                </div>
              ))}
            </div>

            {/* Championship Final */}
            <div className="bracket-round-column">
              <span className="bracket-round-header" style={{ color: '#d97706', borderColor: '#fcd34d' }}>
                🏆 Championship Final
              </span>
              {matches.filter(m => m.round === 'final').map(m => (
                <div key={m.id} className="bracket-match-node" style={{ border: '2px solid #fcd34d', background: '#fefce8' }}>
                  <div className="bracket-node-header">
                    <strong style={{ color: '#92400e' }}>National Trophy Match</strong>
                    <span>{m.pitchOrCourt}</span>
                  </div>
                  <div className="bracket-team-row">
                    <span>{m.teamA.name}</span>
                    <strong>{m.teamA.score || '—'}</strong>
                  </div>
                  <div className="bracket-team-row">
                    <span>{m.teamB.name}</span>
                    <strong>{m.teamB.score || '—'}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#92400e', textAlign: 'right', fontWeight: 600 }}>
                    {m.scheduledTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQUAD VERIFICATION & ANTI-FRAUD */}
      {activeTab === 'squad-audit' && (
        <div className="tournament-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Anti-Age-Fraud Squad Verification Engine</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Automated biometric and Aadhaar/Passport cross-checks to eliminate age fraud in junior divisions.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Division Cutoff:</label>
              <select
                className="coach-filter-select"
                value={ageCutoff}
                onChange={e => setAgeCutoff(parseInt(e.target.value, 10))}
              >
                <option value={14}>Under-14 Division</option>
                <option value={16}>Under-16 Division</option>
                <option value={18}>Under-18 Division</option>
                <option value={21}>Under-21 Division</option>
              </select>
            </div>
          </div>

          {/* Fraud Scan Result Banner */}
          <div className={`anti-fraud-banner ${squadScan.fraudRiskScore.toLowerCase()}`}>
            <div>
              <strong style={{ fontSize: '1rem' }}>
                {squadScan.eligible
                  ? '✓ Squad Cleared: 0 Age Discrepancies Detected'
                  : `⚠ Age Fraud Alert: ${squadScan.flaggedCount} Ineligible Players Flagged`}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
                {squadScan.eligible
                  ? `All ${squadScan.totalPlayers} athletes conform with the official U-${ageCutoff} cutoff regulations.`
                  : `Roster contains players exceeding division age cutoff limit. Kickoff permission withheld.`}
              </p>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Risk: {squadScan.fraudRiskScore}
            </span>
          </div>

          <table className="tournament-table">
            <thead>
              <tr>
                <th>Athlete Name</th>
                <th>Age</th>
                <th>Birth Date</th>
                <th>KhelGrid Passport ID</th>
                <th>Verification Status</th>
                <th>Eligibility Action</th>
              </tr>
            </thead>
            <tbody>
              {squadRoster.map(player => {
                const isOverAge = player.age > ageCutoff
                return (
                  <tr key={player.id} style={{ background: isOverAge ? '#fff5f5' : 'transparent' }}>
                    <td>
                      <strong>{player.name}</strong>
                    </td>
                    <td>{player.age} yrs</td>
                    <td>{player.dob || '—'}</td>
                    <td>
                      <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {player.khelPassportId}
                      </code>
                    </td>
                    <td>
                      {player.isPassportVerified ? (
                        <span className="coach-verified-pill verified">🛡️ Aadhaar Verified</span>
                      ) : (
                        <span className="coach-verified-pill pending">🟡 Pending Evidence</span>
                      )}
                    </td>
                    <td>
                      {isOverAge ? (
                        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.82rem' }}>
                          ❌ INELIGIBLE (Over-age)
                        </span>
                      ) : (
                        <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.82rem' }}>
                          ✓ CLEARED FOR KICKOFF
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PITCH-SIDE SCORER CONSOLE */}
      {activeTab === 'scorer' && (
        <div className="tournament-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Tablet-Optimized Digital Scorer Console</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Pitch-side ground officials record scores, goals, and fouls in real-time, instantly broadcasting to KhelGrid /live ticker.
              </p>
            </div>
            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ● Synchronized with /live feed
            </span>
          </div>

          <div className="scorer-console-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.8 }}>
              <span>{scorerState.matchTitle}</span>
              <span style={{ background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {period}
              </span>
            </div>

            <div className="scorer-scoreboard">
              <div>
                <span className="scorer-team-name">{scorerState.teamAName}</span>
                <div className="scorer-score-digit">{scoreA}</div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button type="button" className="scorer-btn primary" onClick={() => incrementScore('teamA', 1)}>
                    +1 Goal
                  </button>
                  <button type="button" className="scorer-btn secondary" onClick={() => incrementScore('teamA', -1)}>
                    -1
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#64748b' }}>VS</div>

              <div>
                <span className="scorer-team-name">{scorerState.teamBName}</span>
                <div className="scorer-score-digit">{scoreB}</div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button type="button" className="scorer-btn primary" onClick={() => incrementScore('teamB', 1)}>
                    +1 Goal
                  </button>
                  <button type="button" className="scorer-btn secondary" onClick={() => incrementScore('teamB', -1)}>
                    -1
                  </button>
                </div>
              </div>
            </div>

            {/* Match Event Form */}
            <form onSubmit={handleScoreEventSubmit} style={{ marginTop: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Period (e.g. 2nd Half)"
                style={{ width: '130px', padding: '8px 10px', borderRadius: '6px', background: '#1e293b', color: '#ffffff', border: '1px solid #334155' }}
                value={period}
                onChange={e => setPeriod(e.target.value)}
              />

              <select
                style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', color: '#ffffff', border: '1px solid #334155' }}
                value={eventTeam}
                onChange={e => setEventTeam(e.target.value as 'teamA' | 'teamB')}
              >
                <option value="teamA">{scorerState.teamAName}</option>
                <option value="teamB">{scorerState.teamBName}</option>
              </select>

              <input
                type="text"
                placeholder="Log match event (e.g. Goal header, Yellow Card, Free-kick save)…"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: '#1e293b', color: '#ffffff', border: '1px solid #334155' }}
                value={eventNote}
                onChange={e => setEventNote(e.target.value)}
              />

              <button type="submit" className="scorer-btn primary">
                Log Event
              </button>
            </form>
          </div>

          {/* Chronological Event Feed */}
          <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem' }}>Live Match Commentary &amp; Official Timeline</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {scorerState.events.map(ev => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                }}
              >
                <strong style={{ color: '#059669', minWidth: '40px' }}>{ev.minuteOrOver}</strong>
                <span style={{ flex: 1, color: '#1e293b' }}>{ev.text}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VERIFIABLE DIGITAL CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="tournament-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Verifiable Digital Merit &amp; Winner Certificates</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Cryptographic digital certificates issued to championship winners and participants, permanently stamped on their National Sports CV.
              </p>
            </div>
            <button
              type="button"
              className="host-action-btn primary"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={() => setIsIssueCertModalOpen(true)}
            >
              <SiteIcon name="award" size={14} />
              <span>Issue New Certificate</span>
            </button>
          </div>

          <div className="tournament-cert-grid">
            {certificates.map(cert => (
              <div key={cert.certificateId} className="tournament-cert-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '1.1rem', color: '#0f172a' }}>{cert.athleteName}</h4>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {cert.teamName} · {cert.sport}
                    </span>
                  </div>
                  <span className="cert-hash-badge">{cert.certificateId}</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎖️</span>
                  <strong style={{ color: '#065f46', marginLeft: '6px', fontSize: '0.95rem' }}>{cert.achievementRole}</strong>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                    {cert.tournamentTitle}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                  Hash: {cert.verificationHash}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <a
                    href={generateWhatsAppCertificateUrl(cert)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coach-action-btn whatsapp"
                    style={{ flex: 1, padding: '8px', justifyContent: 'center', fontSize: '12px' }}
                    title="Send certificate on WhatsApp"
                  >
                    <SiteIcon name="share" size={13} />
                    <span>Send on WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    className="coach-hub-btn-outline"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print()
                    }}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: GENERATE BRACKET */}
      {isGenerateBracketModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsGenerateBracketModalOpen(false)}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Tournament Format &amp; Fixture Wizard</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsGenerateBracketModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleGenerateBracketSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Tournament Format</label>
                  <select
                    value={bracketFormat}
                    onChange={e => setBracketFormat(e.target.value as 'single_elimination' | 'round_robin_knockout')}
                  >
                    <option value="single_elimination">Single Elimination (Knockout)</option>
                    <option value="round_robin_knockout">Round Robin Groups + Knockouts</option>
                  </select>
                </div>
                <div className="coach-modal-field">
                  <label>Team Bracket Size</label>
                  <select
                    value={bracketTeamCount}
                    onChange={e => setBracketTeamCount(e.target.value as '4' | '8')}
                  >
                    <option value="4">4 Teams (2 Semis + Final)</option>
                    <option value="8">8 Teams (4 QFs + 2 Semis + Final)</option>
                  </select>
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Participating Teams (1 per line)</label>
                <textarea
                  rows={6}
                  required
                  value={bracketTeamsInput}
                  onChange={e => setBracketTeamsInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="coach-hub-btn-outline"
                  onClick={() => setIsGenerateBracketModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="coach-primary-btn">
                  Generate Fixtures Tree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE TOURNAMENT CERTIFICATE */}
      {isIssueCertModalOpen && (
        <div className="coach-modal-backdrop" onClick={() => setIsIssueCertModalOpen(false)}>
          <div className="coach-modal-card" onClick={e => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3>Issue Verifiable Tournament Certificate</h3>
              <button
                type="button"
                className="coach-modal-close-btn"
                onClick={() => setIsIssueCertModalOpen(false)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={handleIssueCertSubmit} className="coach-modal-form">
              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Athlete Name</label>
                  <input
                    type="text"
                    required
                    value={certAthlete}
                    onChange={e => setCertAthlete(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Team Name</label>
                  <input
                    type="text"
                    required
                    value={certTeam}
                    onChange={e => setCertTeam(e.target.value)}
                  />
                </div>
              </div>

              <div className="coach-modal-row">
                <div className="coach-modal-field">
                  <label>Sport</label>
                  <input
                    type="text"
                    required
                    value={certSport}
                    onChange={e => setCertSport(e.target.value)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label>Achievement / Merit Level</label>
                  <select
                    value={certRole}
                    onChange={e => setCertRole(e.target.value as TournamentCertificate['achievementRole'])}
                  >
                    <option value="Champion Winner">Champion Winner (Gold Medal)</option>
                    <option value="Runner-Up Finalist">Runner-Up Finalist (Silver Medal)</option>
                    <option value="Player of the Tournament">Player of the Tournament (MVP)</option>
                    <option value="Verified Participant">Verified Participant</option>
                  </select>
                </div>
              </div>

              <div className="coach-modal-field">
                <label>Issuing Sports Authority</label>
                <input
                  type="text"
                  required
                  value={certAuthority}
                  onChange={e => setCertAuthority(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="coach-hub-btn-outline"
                  onClick={() => setIsIssueCertModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="coach-primary-btn">
                  Publish Certificate Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
