import { useState, useEffect, useMemo, useCallback, useRef, type MouseEvent } from 'react';
import type { SportsMatch, SportType, MatchStatus, CricketFormat } from './types';
import { liveSportsEngine } from './services/liveSportsEngine';
import { soundService } from './utils/soundChime';
import { SiteIcon } from '../../shared/components/SiteIcon';
import { FanPollWidget } from './components/FanPollWidget';
import { SpectatorGatewayBar } from './components/SpectatorGatewayBar';
import { AthleteDiscoveryCard, TurfBookingCard } from './components/ConversionInterstitials';
import { CitySportsGateway } from './components/CitySportsGateway';
import { MatchCard } from './components/MatchCard';
import { MatchDetailModal } from './components/MatchDetailModal';
import { FloatingScoreTicker } from './components/FloatingScoreTicker';
import './live-scores.css';

const REFRESH_INTERVAL_SEC = 15;
const PINNED_STORAGE_KEY = 'kg_pinned_live_matches';
const SOUND_STORAGE_KEY = 'kg_live_scores_sound';

const CRICKET_FORMATS: { id: CricketFormat; label: string; icon: string }[] = [
  { id: 'All', label: 'All Cricket', icon: '🏏' },
  { id: 'T20', label: 'T20 Matches', icon: '⚡' },
  { id: 'ODI', label: 'ODI Matches', icon: '🏆' },
  { id: 'Test', label: 'Test Series', icon: '🛡️' },
  { id: 'WPL', label: 'WPL 2026', icon: '🌟' },
];

interface LiveScoresPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void;
}

export default function LiveScoresPage({ onNavigate }: LiveScoresPageProps) {
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('All');
  const [selectedFormat, setSelectedFormat] = useState<CricketFormat>('All');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | MatchStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLiveFeedConnected, setIsLiveFeedConnected] = useState(false);
  const [activeModalMatch, setActiveModalMatch] = useState<SportsMatch | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Sound toggle (persistent)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

  // Pinned matches (persistent)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(PINNED_STORAGE_KEY);
        if (saved) return new Set(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  const prevScoresRef = useRef<Map<string, string>>(new Map());

  // Load live matches from engine
  const loadScores = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const data = await liveSportsEngine.getScores({ forceRefresh: force, sport: selectedSport });
      setMatches(data.matches);
      setLastUpdated(data.lastUpdated);
      setIsLiveFeedConnected(data.isLiveFeedConnected);
      setCountdown(REFRESH_INTERVAL_SEC);

      // Detect score change to sound chime
      let hasScoreChange = false;
      const newScores = new Map<string, string>();
      for (const m of data.matches) {
        const scoreKey = `${m.teamA.score}-${m.teamB.score}`;
        newScores.set(m.id, scoreKey);
        if (m.status === 'LIVE' && prevScoresRef.current.has(m.id)) {
          if (prevScoresRef.current.get(m.id) !== scoreKey) {
            hasScoreChange = true;
          }
        }
      }
      prevScoresRef.current = newScores;

      if (hasScoreChange && soundEnabled) {
        soundService.playScoreChime();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSport, soundEnabled]);

  // Initial fetch
  useEffect(() => {
    void loadScores(false);
  }, [loadScores]);

  // 1-second interval for countdown & periodic refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void loadScores(true);
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadScores]);

  // Scroll listener for bottom sticky ticker
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowStickyBar(window.scrollY > 380);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic document title sync
  useEffect(() => {
    const liveMatch = matches.find((m) => m.status === 'LIVE');
    if (liveMatch) {
      document.title = `(LIVE) ${liveMatch.teamA.code} ${liveMatch.teamA.score} vs ${liveMatch.teamB.code} ${liveMatch.teamB.score} · KhelGrid`;
    } else {
      document.title = 'Live Scores & Match Center · KhelGrid';
    }
  }, [matches]);

  // Sound toggle handler
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    if (next) {
      soundService.playScoreChime();
    }
  };

  // Pin toggle handler
  const togglePin = (matchId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Format counts
  const formatCounts = useMemo(() => {
    const counts: Record<CricketFormat, number> = { All: 0, T20: 0, ODI: 0, Test: 0, WPL: 0 };
    for (const m of matches) {
      if (m.sport === 'Cricket') {
        counts.All++;
        if (m.format && m.format in counts) {
          counts[m.format]++;
        }
      }
    }
    return counts;
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Status filter
      if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;

      // Cricket format filter
      if (selectedFormat !== 'All' && m.sport === 'Cricket' && m.format !== selectedFormat) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          m.tournament.toLowerCase().includes(q) ||
          m.teamA.name.toLowerCase().includes(q) ||
          m.teamB.name.toLowerCase().includes(q) ||
          m.teamA.code.toLowerCase().includes(q) ||
          m.teamB.code.toLowerCase().includes(q) ||
          (m.venueOrOvers && m.venueOrOvers.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [matches, selectedStatus, selectedFormat, searchQuery]);

  // Segregate pinned vs regular
  const pinnedMatches = useMemo(
    () => filteredMatches.filter((m) => pinnedIds.has(m.id)),
    [filteredMatches, pinnedIds]
  );
  const regularMatches = useMemo(
    () => filteredMatches.filter((m) => !pinnedIds.has(m.id)),
    [filteredMatches, pinnedIds]
  );

  const featuredLiveMatch = useMemo(
    () => matches.find((m) => m.status === 'LIVE') || matches[0] || null,
    [matches]
  );

  return (
    <div className="live-scores-container">
      {/* 1. HERO HEADER */}
      <header className="live-hero-header">
        <p className="eyebrow">KHELGRID · LIVE SPORTS DATA</p>
        <h1>Live Scores & Match Center</h1>
        <p className="live-intro">
          Real-time international and national scores, ball-by-ball fixtures, and verified grassroots pathways. Track live matches or step onto the turf yourself.
        </p>
      </header>

      {/* 2. CONTROL CARD: SEARCH + COUNTDOWN + SOUND + REFRESH */}
      <div className="live-control-card">
        <div className="live-control-top">
          <div className="live-search-box">
            <span className="live-search-icon"><SiteIcon name="search" size={16} /></span>
            <input
              type="search"
              placeholder="Search teams, tournaments or stadiums…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search live matches"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="live-search-clear"
                aria-label="Clear search"
              >
                <SiteIcon name="close" size={14} />
              </button>
            )}
          </div>

          <div className="live-action-buttons">
            <span className="live-countdown-badge">
              <span className="live-ping-dot" />
              <span>Next in {countdown}s</span>
            </span>

            {isLiveFeedConnected && (
              <span className="live-btn is-active" title="Connected to official scoreboard feed">
                <SiteIcon name="activity" size={13} />
                <span>Live Feed {lastUpdated ? `(${lastUpdated})` : ''}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => void loadScores(true)}
              disabled={isRefreshing}
              className="live-btn"
              title="Refresh live match scores"
            >
              <SiteIcon name="refresh" size={13} />
              <span>{isRefreshing ? 'Updating…' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className={`live-btn ${soundEnabled ? 'is-active' : ''}`}
              title={soundEnabled ? 'Mute sound alerts' : 'Enable audio chime on score updates'}
            >
              <SiteIcon name={soundEnabled ? 'volume' : 'volume'} size={14} />
              <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* 15s Countdown Progress Line */}
        <div className="live-progress-track">
          <div
            className="live-progress-fill"
            style={{ width: `${(countdown / REFRESH_INTERVAL_SEC) * 100}%` }}
          />
        </div>
      </div>

      {/* 3. FORMAT RAILS (CRICKET) */}
      <div className="format-filter-rail">
        {CRICKET_FORMATS.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;
          const count = formatCounts[fmt.id] || 0;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => setSelectedFormat(fmt.id)}
              className={`format-btn ${isSelected ? 'is-selected' : ''}`}
            >
              <span>{fmt.icon}</span>
              <span>{fmt.label}</span>
              <span className="format-count-pill">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 4. FAN PREDICTION POLL WIDGET */}
      {featuredLiveMatch && (
        <FanPollWidget
          matchId={featuredLiveMatch.id}
          tournament={featuredLiveMatch.tournament}
          teamA={featuredLiveMatch.teamA}
          teamB={featuredLiveMatch.teamB}
        />
      )}

      {/* 5. "SPECTATOR TO ATHLETE" CONTEXTUAL ACTION STRIP */}
      <SpectatorGatewayBar onNavigate={onNavigate} selectedSport={selectedSport} />

      {/* 6. STATUS TABS */}
      <div className="format-filter-rail" style={{ marginBottom: '16px' }}>
        {(
          [
            { id: 'ALL', label: 'All Matches' },
            { id: 'LIVE', label: '🔴 Live Matches' },
            { id: 'UPCOMING', label: '⏳ Upcoming' },
            { id: 'FINISHED', label: '✓ Recent Results' },
          ] as const
        ).map((tab) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`format-btn ${isSelected ? 'is-selected' : ''}`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 7. PINNED MATCHES SECTION (if any) */}
      {pinnedMatches.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>
            ★ PINNED MATCHES ({pinnedMatches.length})
          </h2>
          <div className="matches-grid">
            {pinnedMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                isPinned={true}
                onTogglePin={() => togglePin(m.id)}
                onOpenDetails={() => setActiveModalMatch(m)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* 8. MAIN MATCH CARDS FEED (WITH IN-FEED INTERSTITIALS) */}
      {regularMatches.length === 0 && pinnedMatches.length === 0 ? (
        <div className="state-panel state-unavailable" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="state-symbol" style={{ margin: '0 auto 12px' }}>
            <SiteIcon name="activity" size={20} />
          </div>
          <h3>No matches found</h3>
          <p>No sports fixtures match your current filters. Try resetting search or selecting All Matches.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedSport('All');
              setSelectedFormat('All');
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
            className="live-btn"
            style={{ margin: '14px auto 0' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="matches-grid">
          {regularMatches.map((match, idx) => (
            <div key={match.id} style={{ display: 'contents' }}>
              <MatchCard
                match={match}
                isPinned={false}
                onTogglePin={() => togglePin(match.id)}
                onOpenDetails={() => setActiveModalMatch(match)}
                onNavigate={onNavigate}
              />

              {/* Native In-Feed Opportunity Card #1 (After 3rd match) */}
              {idx === 2 && <AthleteDiscoveryCard onNavigate={onNavigate} />}

              {/* Native In-Feed Opportunity Card #2 (After 6th match) */}
              {idx === 5 && <TurfBookingCard onNavigate={onNavigate} />}
            </div>
          ))}
        </div>
      )}

      {/* 9. HYPERLOCAL CITY SPORTS GATEWAY */}
      <CitySportsGateway onNavigate={onNavigate} />

      {/* 10. 3-PILLAR ECOSYSTEM DIRECTORY MATRIX */}
      <div className="ecosystem-matrix-grid">
        {/* Pillar 1: For Athletes */}
        <div className="ecosystem-pillar-card">
          <div className="pillar-header">
            <span>🎯</span>
            <h4>For Athletes &amp; Aspirants</h4>
          </div>
          <div className="pillar-links-list">
            <a href="/opportunities" onClick={(e) => onNavigate?.(e, '/opportunities')} className="pillar-link">
              <span>Scouting Trials &amp; Combines</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/sports-cv" onClick={(e) => onNavigate?.(e, '/sports-cv')} className="pillar-link">
              <span>Sports CV Wizard</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/talent-scanner" onClick={(e) => onNavigate?.(e, '/talent-scanner')} className="pillar-link">
              <span>Talent Scanner</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/guides" onClick={(e) => onNavigate?.(e, '/guides')} className="pillar-link">
              <span>Grassroots Sports Guides</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
          </div>
        </div>

        {/* Pillar 2: Play & Compete */}
        <div className="ecosystem-pillar-card">
          <div className="pillar-header">
            <span>🏟️</span>
            <h4>Play &amp; Compete</h4>
          </div>
          <div className="pillar-links-list">
            <a href="/venues" onClick={(e) => onNavigate?.(e, '/venues')} className="pillar-link">
              <span>Book Turfs &amp; Courts</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/play" onClick={(e) => onNavigate?.(e, '/play')} className="pillar-link">
              <span>Find Pickup Games</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/events" onClick={(e) => onNavigate?.(e, '/events')} className="pillar-link">
              <span>Tournaments &amp; Cups</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/sports" onClick={(e) => onNavigate?.(e, '/sports')} className="pillar-link">
              <span>Browse All Sports</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
          </div>
        </div>

        {/* Pillar 3: Academies & Hosts */}
        <div className="ecosystem-pillar-card">
          <div className="pillar-header">
            <span>🛡️</span>
            <h4>Academies &amp; Hosts</h4>
          </div>
          <div className="pillar-links-list">
            <a href="/academies" onClick={(e) => onNavigate?.(e, '/academies')} className="pillar-link">
              <span>Top Sports Academies</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/coaches" onClick={(e) => onNavigate?.(e, '/coaches')} className="pillar-link">
              <span>Coaches Directory</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue" className="pillar-link">
              <span>List Your Venue</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
            <a href="/scout-portal" onClick={(e) => onNavigate?.(e, '/scout-portal')} className="pillar-link">
              <span>Scout Portal</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* 11. MATCH DETAIL MODAL */}
      <MatchDetailModal
        match={activeModalMatch}
        onClose={() => setActiveModalMatch(null)}
        onNavigate={onNavigate}
      />

      {/* 12. FLOATING STICKY MINI-SCOREBOARD */}
      {showStickyBar && featuredLiveMatch && (
        <FloatingScoreTicker
          match={featuredLiveMatch}
          onOpenDetails={() => setActiveModalMatch(featuredLiveMatch)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
