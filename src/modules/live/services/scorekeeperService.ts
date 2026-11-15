/**
 * KhelGrid Live Match Scorekeeper Engine
 * Empowers local tournament organizers, turf hosts, and scorers to broadcast
 * real-time ball-by-ball cricket scores, football goals, and live commentary.
 */

import type { CommunityLiveMatch, MatchEvent, MatchStatus, SportType } from '../types';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isConfigured(): boolean {
  return Boolean(supabaseUrl && anonKey && !supabaseUrl.includes('placeholder'));
}

const STORAGE_KEY_COMMUNITY_MATCHES = 'kg_community_live_matches_v1';

export const INITIAL_SAMPLE_COMMUNITY_MATCHES: CommunityLiveMatch[] = [
  {
    id: 'comm-match-cricket-1',
    isCommunityMatch: true,
    sport: 'Cricket',
    tournament: 'Bengaluru Premier Turf League 2026',
    stage: 'Semi-Final 1 · 12 Overs',
    status: 'LIVE',
    city: 'Bengaluru',
    venue: 'FSV Arena, Koramangala',
    hostName: 'Coach Ramesh & FSV Ops',
    hostPhone: '+91 98450 11920',
    teamA: {
      name: 'Indiranagar Knights',
      code: 'INK',
      score: '84/3',
      flag: '🏏',
    },
    teamB: {
      name: 'Koramangala Titans',
      code: 'KMT',
      score: 'Yet to bat',
      flag: '🏏',
    },
    venueOrOvers: '9.4 Overs · Target: 110',
    liveTime: 'Live Now',
    highlight: '84/3 (9.4 Ov) · Aditya Verma 34*(18) at crease',
    source: 'KhelGrid Live Community Scorer',
    commentaryTimeline: [
      { id: 'ev-4', time: '9.4 Ov', type: 'runs', text: 'SIX! Aditya lofts it straight over long-on for a monster 6!', runs: 6 },
      { id: 'ev-3', time: '9.3 Ov', type: 'runs', text: '1 run, pushed into covers for a quick single.', runs: 1 },
      { id: 'ev-2', time: '9.2 Ov', type: 'wicket', text: 'WICKET! Bowled him! Clean off-stump shattered.', isWicket: true },
      { id: 'ev-1', time: '9.1 Ov', type: 'extra', text: 'Wide ball down the leg side + 1 run.', runs: 1 },
    ],
  },
  {
    id: 'comm-match-football-1',
    isCommunityMatch: true,
    sport: 'Football',
    tournament: 'Bangalore 5v5 Turf Championship',
    stage: 'Final Match',
    status: 'LIVE',
    city: 'Bengaluru',
    venue: 'Dribble Football Arena',
    hostName: 'Dribble Turf Coordinator',
    hostPhone: '+91 99112 88221',
    teamA: {
      name: 'Whitefield Strikers',
      code: 'WFS',
      score: '2',
      flag: '⚽',
    },
    teamB: {
      name: 'HSR United',
      code: 'HSR',
      score: '1',
      flag: '⚽',
    },
    venueOrOvers: '38\' 2nd Half',
    liveTime: 'Live Now',
    highlight: '2-1 · Farhan scores from counter attack in 36th min',
    source: 'KhelGrid Live Community Scorer',
    commentaryTimeline: [
      { id: 'ev-f3', time: '36\'', type: 'goal', text: 'GOAL! Farhan strikes into the bottom-right corner!' },
      { id: 'ev-f2', time: '29\'', type: 'card', text: 'Yellow Card for tackle outside the D-box.' },
      { id: 'ev-f1', time: '14\'', type: 'goal', text: 'GOAL! HSR United equalize with a header from corner!' },
    ],
  },
];

export class ScorekeeperService {
  private static instance: ScorekeeperService;

  public static getInstance(): ScorekeeperService {
    if (!ScorekeeperService.instance) {
      ScorekeeperService.instance = new ScorekeeperService();
    }
    return ScorekeeperService.instance;
  }

  public getCommunityMatches(): CommunityLiveMatch[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_COMMUNITY_MATCHES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_SAMPLE_COMMUNITY_MATCHES;
  }

  public async saveCommunityMatch(match: CommunityLiveMatch): Promise<CommunityLiveMatch> {
    const matches = this.getCommunityMatches();
    const existingIndex = matches.findIndex((m) => m.id === match.id);

    let updatedList: CommunityLiveMatch[];
    if (existingIndex >= 0) {
      updatedList = matches.map((m, idx) => (idx === existingIndex ? match : m));
    } else {
      updatedList = [match, ...matches];
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_COMMUNITY_MATCHES, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
    }

    if (isConfigured()) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/publish_community_match_score`, {
          method: 'POST',
          headers: {
            'apikey': anonKey!,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_match_id: match.id,
            p_sport: match.sport,
            p_tournament: match.tournament,
            p_stage: match.stage || '',
            p_status: match.status,
            p_venue: match.venue,
            p_city: match.city,
            p_team_a_name: match.teamA.name,
            p_team_a_score: match.teamA.score,
            p_team_b_name: match.teamB.name,
            p_team_b_score: match.teamB.score,
            p_current_over_or_time: match.venueOrOvers || '',
            p_highlight: match.highlight || '',
            p_commentary: match.commentaryTimeline || [],
            p_host_name: match.hostName,
          }),
        });
      } catch {
        // offline fallback
      }
    }

    return match;
  }

  /**
   * Helper to parse a cricket score string like "84/3"
   */
  public parseCricketScore(scoreStr: string): { runs: number; wickets: number } {
    const parts = scoreStr.split('/');
    const runs = parseInt(parts[0], 10) || 0;
    const wickets = parseInt(parts[1], 10) || 0;
    return { runs, wickets };
  }

  /**
   * Helper to parse and increment cricket overs (e.g., "9.4" + 1 ball = "9.5", "9.5" + 1 ball = "10.0")
   */
  public incrementOver(currentOversStr: string): string {
    const match = currentOversStr.match(/(\d+)\.(\d+)/);
    if (!match) return '0.1';
    let overs = parseInt(match[1], 10);
    let balls = parseInt(match[2], 10) + 1;
    if (balls >= 6) {
      overs += 1;
      balls = 0;
    }
    return `${overs}.${balls}`;
  }

  /**
   * Record cricket ball delivery
   */
  public async recordCricketBall(
    matchId: string,
    options: {
      runs: number;
      isWicket?: boolean;
      isExtra?: boolean;
      extraType?: 'wide' | 'no_ball' | 'bye';
      commentaryText?: string;
    }
  ): Promise<CommunityLiveMatch | null> {
    const matches = this.getCommunityMatches();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return null;

    const { runs, wickets } = this.parseCricketScore(match.teamA.score);
    const newRuns = runs + options.runs;
    const newWickets = options.isWicket ? wickets + 1 : wickets;
    const newScore = `${newRuns}/${newWickets}`;

    const newOverStr = options.isExtra && (options.extraType === 'wide' || options.extraType === 'no_ball')
      ? match.venueOrOvers?.split(' ')[0] || '0.0'
      : this.incrementOver(match.venueOrOvers?.split(' ')[0] || '0.0');

    const autoText = options.isWicket
      ? `WICKET! Clean dismissal! Team A is now ${newScore}.`
      : options.runs === 6
        ? `SIX! Huge maximum smashed over the ropes! (${options.runs} runs)`
        : options.runs === 4
          ? `FOUR! Cracking boundary through the field! (${options.runs} runs)`
          : options.isExtra
            ? `Extra (${options.extraType || 'wide'}) + ${options.runs} run(s).`
            : `${options.runs} run(s) taken.`;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      time: `${newOverStr} Ov`,
      type: options.isWicket ? 'wicket' : options.isExtra ? 'extra' : 'runs',
      text: options.commentaryText || autoText,
      runs: options.runs,
      isWicket: options.isWicket,
    };

    const updatedMatch: CommunityLiveMatch = {
      ...match,
      teamA: {
        ...match.teamA,
        score: newScore,
      },
      venueOrOvers: `${newOverStr} Overs`,
      highlight: `${newScore} (${newOverStr} Ov) · Last: ${newEvent.text}`,
      commentaryTimeline: [newEvent, ...match.commentaryTimeline.slice(0, 19)],
    };

    return this.saveCommunityMatch(updatedMatch);
  }

  /**
   * Record Football Goal
   */
  public async recordFootballGoal(
    matchId: string,
    team: 'A' | 'B',
    scorerName: string,
    minute = '42\''
  ): Promise<CommunityLiveMatch | null> {
    const matches = this.getCommunityMatches();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return null;

    const teamAScore = parseInt(match.teamA.score, 10) || 0;
    const teamBScore = parseInt(match.teamB.score, 10) || 0;

    const newAScore = team === 'A' ? String(teamAScore + 1) : String(teamAScore);
    const newBScore = team === 'B' ? String(teamBScore + 1) : String(teamBScore);

    const scoringTeamName = team === 'A' ? match.teamA.name : match.teamB.name;
    const newEvent: MatchEvent = {
      id: `ev-f-${Date.now()}`,
      time: minute,
      type: 'goal',
      text: `GOAL! ${scorerName} scores for ${scoringTeamName}! (${newAScore}-${newBScore})`,
    };

    const updatedMatch: CommunityLiveMatch = {
      ...match,
      teamA: { ...match.teamA, score: newAScore },
      teamB: { ...match.teamB, score: newBScore },
      highlight: `${newAScore}-${newBScore} · ${newEvent.text}`,
      commentaryTimeline: [newEvent, ...match.commentaryTimeline.slice(0, 19)],
    };

    return this.saveCommunityMatch(updatedMatch);
  }

  /**
   * Change Match Status
   */
  public async updateMatchStatus(matchId: string, status: MatchStatus): Promise<CommunityLiveMatch | null> {
    const matches = this.getCommunityMatches();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return null;

    const updatedMatch: CommunityLiveMatch = {
      ...match,
      status,
      completedAt: status === 'FINISHED' ? new Date().toISOString() : match.completedAt,
      highlight: status === 'FINISHED' ? `Match Finished · Final: ${match.teamA.score} vs ${match.teamB.score}` : match.highlight,
    };

    return this.saveCommunityMatch(updatedMatch);
  }

  /**
   * Create New Match
   */
  public async createNewMatch(data: {
    sport: SportType;
    tournament: string;
    venue: string;
    city: string;
    teamAName: string;
    teamBName: string;
    hostName: string;
  }): Promise<CommunityLiveMatch> {
    const matchId = `comm-match-${Date.now().toString(36)}`;
    const newMatch: CommunityLiveMatch = {
      id: matchId,
      isCommunityMatch: true,
      sport: data.sport,
      tournament: data.tournament,
      stage: 'Live Match',
      status: 'LIVE',
      venue: data.venue,
      city: data.city,
      hostName: data.hostName,
      teamA: {
        name: data.teamAName,
        code: data.teamAName.slice(0, 3).toUpperCase(),
        score: data.sport === 'Cricket' ? '0/0' : '0',
        flag: data.sport === 'Cricket' ? '🏏' : '⚽',
      },
      teamB: {
        name: data.teamBName,
        code: data.teamBName.slice(0, 3).toUpperCase(),
        score: data.sport === 'Cricket' ? 'Yet to bat' : '0',
        flag: data.sport === 'Cricket' ? '🏏' : '⚽',
      },
      venueOrOvers: data.sport === 'Cricket' ? '0.0 Overs' : '0\' Kickoff',
      liveTime: 'Live Now',
      highlight: `${data.teamAName} vs ${data.teamBName} · Match Started at ${data.venue}`,
      source: 'KhelGrid Live Community Scorer',
      commentaryTimeline: [
        {
          id: `ev-start-${Date.now()}`,
          time: '0.0',
          type: 'status_change',
          text: `Match officially commenced between ${data.teamAName} and ${data.teamBName}!`,
        },
      ],
    };

    return this.saveCommunityMatch(newMatch);
  }
}

export const scorekeeperService = ScorekeeperService.getInstance();
