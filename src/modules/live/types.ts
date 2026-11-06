export type SportType =
  | 'All'
  | 'Cricket'
  | 'Football'
  | 'Badminton'
  | 'Hockey'
  | 'Kabaddi'
  | 'Tennis'
  | 'Basketball';

export type MatchStatus = 'LIVE' | 'UPCOMING' | 'FINISHED';

export type CricketFormat = 'All' | 'T20' | 'ODI' | 'Test' | 'WPL';

export interface SportsTeam {
  name: string;
  code: string;
  score: string;
  logo?: string;
  flag?: string;
}

export interface SportsMatch {
  id: string;
  sport: SportType;
  tournament: string;
  stage?: string;
  status: MatchStatus;
  statusText?: string;
  teamA: SportsTeam;
  teamB: SportsTeam;
  venueOrOvers?: string;
  liveTime?: string;
  highlight?: string;
  format?: CricketFormat;
  source: string;
  sourceUrl?: string;
  completedAt?: string;
  isPinned?: boolean;
}

export interface LiveScoresResponse {
  matches: SportsMatch[];
  lastUpdated: string;
  sourceSummary: string;
  isLiveFeedConnected: boolean;
}

export interface FanPollVote {
  teamACount: number;
  teamBCount: number;
  userVotedTeam?: 'A' | 'B';
}

export interface MatchEvent {
  id: string;
  time: string;
  type: 'runs' | 'wicket' | 'extra' | 'goal' | 'card' | 'commentary' | 'status_change';
  text: string;
  runs?: number;
  isWicket?: boolean;
}

export interface CommunityLiveMatch extends SportsMatch {
  isCommunityMatch: true;
  city: string;
  venue: string;
  hostName: string;
  hostPhone?: string;
  commentaryTimeline: MatchEvent[];
}
