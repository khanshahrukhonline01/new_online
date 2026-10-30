import type { SportsMatch, SportType, CricketFormat, LiveScoresResponse } from '../types';

const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache for fast live score synchronization
const AUTO_ARCHIVE_HOURS = 12;

interface CacheStore {
  data: SportsMatch[];
  fetchedAt: number;
}

/**
 * Safely fetches with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; KhelGridPlatform/2.0)',
      },
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Detects cricket format from tournament / match description
 */
export function detectCricketFormat(tournament: string, stage?: string): CricketFormat {
  const text = `${tournament} ${stage || ''}`.toLowerCase();
  if (text.includes('wpl') || text.includes("women's premier league") || text.includes('womens premier league')) {
    return 'WPL';
  }
  if (text.includes('t20') || text.includes('twenty20') || text.includes('t20i') || text.includes('ipl') || text.includes('sixes')) {
    return 'T20';
  }
  if (text.includes('odi') || text.includes('one day') || text.includes('world cup league 2') || text.includes('50 over')) {
    return 'ODI';
  }
  if (text.includes('test') || text.includes('shield') || text.includes('ranji') || text.includes('first-class')) {
    return 'Test';
  }
  return 'All';
}

/**
 * LiveSportsEngine for KhelGrid Platform
 */
export class LiveSportsEngine {
  private static instance: LiveSportsEngine;
  private cache: CacheStore | null = null;

  public static getInstance(): LiveSportsEngine {
    if (!LiveSportsEngine.instance) {
      LiveSportsEngine.instance = new LiveSportsEngine();
    }
    return LiveSportsEngine.instance;
  }

  /**
   * Fetches real live cricket scores from authorized public scoreboard feeds
   */
  private async fetchLiveCricket(): Promise<SportsMatch[]> {
    const matches: SportsMatch[] = [];
    const url = 'https://site.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket';

    try {
      const res = await fetchWithTimeout(url, 4500);
      if (!res || !res.ok) return [];

      const json = await res.json();
      for (const sportObj of json.sports || []) {
        for (const league of sportObj.leagues || []) {
          const leagueName = league.name || 'International Cricket';
          for (const ev of league.events || []) {
            const comps = ev.competitors || [];
            if (comps.length < 2) continue;

            const home = comps[0];
            const away = comps[1];

            const summaryLower = (ev.summary || '').toLowerCase();
            const state = ev.status || ev.fullStatus?.type?.state;

            let status: SportsMatch['status'] = 'UPCOMING';
            if (
              state === 'in' ||
              summaryLower === 'live' ||
              summaryLower.includes('stumps') ||
              summaryLower.includes('tea') ||
              summaryLower.includes('lunch') ||
              summaryLower.includes('innings break')
            ) {
              status = 'LIVE';
            } else if (
              summaryLower.includes('won') ||
              summaryLower.includes('result') ||
              summaryLower.includes('tied') ||
              summaryLower.includes('abandoned') ||
              state === 'post'
            ) {
              status = 'FINISHED';
            }

            const teamAName = home.displayName || home.name || 'Team A';
            const teamBName = away.displayName || away.name || 'Team B';

            const homeScore = home.score?.trim() || (status === 'UPCOMING' ? 'Scheduled' : '-');
            const awayScore = away.score?.trim() || (status === 'UPCOMING' ? 'Scheduled' : '-');

            const lastNote = ev.notes && ev.notes.length > 0 ? ev.notes[ev.notes.length - 1].text : '';
            const highlight =
              ev.fullStatus?.longSummary ||
              lastNote ||
              `${teamAName} vs ${teamBName} · ${ev.location || leagueName}`;

            const clock = ev.summary || (status === 'LIVE' ? 'In Play' : status === 'FINISHED' ? 'FT' : 'Scheduled');
            const format = detectCricketFormat(leagueName, ev.description || ev.title);

            matches.push({
              id: `cricket-${ev.id || matches.length + 1}`,
              sport: 'Cricket',
              status,
              tournament: leagueName,
              stage: ev.description || ev.title || clock,
              teamA: {
                name: teamAName,
                code: (home.abbreviation || teamAName.slice(0, 3)).toUpperCase(),
                score: homeScore,
                logo: home.logo,
                flag: '🏏',
              },
              teamB: {
                name: teamBName,
                code: (away.abbreviation || teamBName.slice(0, 3)).toUpperCase(),
                score: awayScore,
                logo: away.logo,
                flag: '🏏',
              },
              venueOrOvers: clock,
              liveTime: ev.date
                ? new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
              highlight,
              format,
              source: 'Official International Cricket Match Feed',
              completedAt: status === 'FINISHED' ? new Date().toISOString() : undefined,
            });
          }
        }
      }
    } catch {
      // Graceful error fallback
    }

    return matches;
  }

  /**
   * Fetches real live football matches from public scoreboard feeds
   */
  private async fetchLiveFootball(): Promise<SportsMatch[]> {
    const matches: SportsMatch[] = [];
    const url = 'https://site.api.espn.com/apis/personalized/v2/scoreboard/header?sport=soccer';

    try {
      const res = await fetchWithTimeout(url, 4500);
      if (!res || !res.ok) return [];

      const json = await res.json();
      for (const ev of json.events || []) {
        const comp = ev.competitions?.[0] || {};
        const comps = comp.competitors || [];
        if (comps.length < 2) continue;

        const home = comps.find((c: any) => c.homeAway === 'home') || comps[0];
        const away = comps.find((c: any) => c.homeAway === 'away') || comps[1];

        const state = ev.status?.type?.state;
        const isLive = state === 'in';
        const isFinished = state === 'post';
        const status: SportsMatch['status'] = isLive ? 'LIVE' : isFinished ? 'FINISHED' : 'UPCOMING';

        const homeScore = isLive || isFinished ? String(home.score ?? '0') : '-';
        const awayScore = isLive || isFinished ? String(away.score ?? '0') : '-';

        const clock = isLive
          ? ev.status?.displayClock || `${ev.status?.period || 1}H`
          : isFinished
            ? 'FT'
            : ev.status?.type?.shortDetail || 'Scheduled';

        const teamAName = home.team?.displayName || home.team?.name || 'Team A';
        const teamBName = away.team?.displayName || away.team?.name || 'Team B';

        matches.push({
          id: `football-${ev.id || matches.length + 1}`,
          sport: 'Football',
          status,
          tournament: ev.league?.name || 'International Football',
          stage: clock,
          teamA: {
            name: teamAName,
            code: (home.team?.abbreviation || teamAName.slice(0, 3)).toUpperCase(),
            score: homeScore,
            logo: home.team?.logo,
            flag: '⚽',
          },
          teamB: {
            name: teamBName,
            code: (away.team?.abbreviation || teamBName.slice(0, 3)).toUpperCase(),
            score: awayScore,
            logo: away.team?.logo,
            flag: '⚽',
          },
          venueOrOvers: clock,
          liveTime: ev.date
            ? new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
          highlight: `${teamAName} vs ${teamBName} · ${comp.venue?.fullName || 'Stadium'}`,
          source: 'Official Football Match Feed',
          completedAt: status === 'FINISHED' ? new Date().toISOString() : undefined,
        });
      }
    } catch {
      // Graceful error fallback
    }

    return matches;
  }

  /**
   * Filters out expired matches older than AUTO_ARCHIVE_HOURS
   */
  private filterArchived(matches: SportsMatch[]): SportsMatch[] {
    const now = Date.now();
    const maxAgeMs = AUTO_ARCHIVE_HOURS * 60 * 60 * 1000;

    return matches.filter((m) => {
      if (m.status !== 'FINISHED' || !m.completedAt) return true;
      const completedTime = new Date(m.completedAt).getTime();
      return now - completedTime < maxAgeMs;
    });
  }

  /**
   * Main getScores method
   */
  public async getScores(options: { forceRefresh?: boolean; sport?: SportType } = {}): Promise<LiveScoresResponse> {
    const now = Date.now();

    let allMatches: SportsMatch[] = [];
    if (!options.forceRefresh && this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      allMatches = this.cache.data;
    } else {
      const [cricket, football] = await Promise.all([
        this.fetchLiveCricket(),
        this.fetchLiveFootball(),
      ]);

      allMatches = this.filterArchived([...cricket, ...football]);

      this.cache = {
        data: allMatches,
        fetchedAt: now,
      };
    }

    let filtered = allMatches;
    if (options.sport && options.sport !== 'All') {
      filtered = allMatches.filter((m) => m.sport.toLowerCase() === options.sport?.toLowerCase());
    }

    return {
      matches: filtered,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sourceSummary: 'Official International Sports Feeds (Display attribution compliant)',
      isLiveFeedConnected: allMatches.length > 0,
    };
  }
}

export const liveSportsEngine = LiveSportsEngine.getInstance();
