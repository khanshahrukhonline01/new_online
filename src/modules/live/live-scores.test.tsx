import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LiveScoresPage from './LiveScoresPage';
import { liveSportsEngine, detectCricketFormat } from './services/liveSportsEngine';
import { INITIAL_SAMPLE_COMMUNITY_MATCHES, scorekeeperService } from './services/scorekeeperService';
import { buildLiveScoresJsonLd, isExternalScoreboardMatch } from './LiveScoresPage';
import { getRouteSeoMetadata } from '../../shared/utils/seoAndShare';

describe('LiveSportsEngine', () => {
  it('provides a singleton instance with getScores method', () => {
    expect(liveSportsEngine).toBeDefined();
    expect(typeof liveSportsEngine.getScores).toBe('function');
  });

  it('does not seed the public scoreboard with fabricated community fixtures', () => {
    expect(INITIAL_SAMPLE_COMMUNITY_MATCHES).toEqual([]);
    expect(scorekeeperService.getCommunityMatches()).toEqual([]);
  });

  it('distinguishes external scoreboard records from community scorekeeper entries', () => {
    const base = { sport: 'Cricket' as const, tournament: 'Test Series', status: 'LIVE' as const, teamA: { name: 'A', code: 'A', score: '1/0' }, teamB: { name: 'B', code: 'B', score: '0/0' } };
    expect(isExternalScoreboardMatch({ ...base, id: 'external-1', source: 'External ESPN scoreboard feed' })).toBe(true);
    expect(isExternalScoreboardMatch({ ...base, id: 'community-1', source: 'KhelGrid Live Community Scorer' })).toBe(false);
  });

  it('uses page-level structured data until canonical event records have complete verified details', () => {
    const jsonLd = buildLiveScoresJsonLd();
    expect(jsonLd['@type']).toBe('WebPage');
    expect(JSON.stringify(jsonLd)).not.toContain('SportsEvent');
    expect(JSON.stringify(jsonLd)).not.toContain('LiveBlogPosting');
  });

  it('accurately detects cricket formats from series names', () => {
    expect(detectCricketFormat('India Women vs England Women WPL 2026')).toBe('WPL');
    expect(detectCricketFormat('India Tour of New Zealand 4th T20I')).toBe('T20');
    expect(detectCricketFormat("ICC Men's Cricket World Cup League 2")).toBe('ODI');
    expect(detectCricketFormat('Australia Tour of South Africa 3rd Test')).toBe('Test');
    expect(detectCricketFormat('Random Bilateral Series')).toBe('All');
  });

  it('fetches real scores with legal attribution and active live feeds', async () => {
    const result = await liveSportsEngine.getScores({ forceRefresh: true });
    expect(result).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
    expect(result.sourceSummary).toContain('community entries are not independently verified');
    expect(typeof result.isLiveFeedConnected).toBe('boolean');
    expect(result.lastUpdated).toBeDefined();

    for (const match of result.matches) {
      expect(match.id).toBeDefined();
      expect(match.teamA.name).toBeDefined();
      expect(match.teamB.name).toBeDefined();
      expect(match.status).toMatch(/LIVE|UPCOMING|FINISHED/);
    }
  }, 15000);
});

describe('LiveScoresPage component', () => {
  it('renders complete live scores center with spectator-to-athlete conversion funnel', () => {
    const html = renderToStaticMarkup(<LiveScoresPage />);

    // Header & control elements
    expect(html).toContain('Live Scores &amp; Match Center');
    expect(html).toContain('KHELGRID · LIVE SPORTS DATA');
    expect(html).toContain('Search live matches');
    expect(html).toContain('Next in 15s');

    // Cricket format rails
    expect(html).toContain('All Cricket');
    expect(html).toContain('T20 Matches');
    expect(html).toContain('ODI Matches');
    expect(html).toContain('Test Series');
    expect(html).toContain('WPL');
    expect(html).not.toContain('WPL 2026');

    // "Spectator to Athlete" conversion gateway strip
    expect(html).toContain('Spectator to Athlete · Play, Train &amp; Get Scouted');
    expect(html).toContain('Scouting Trials');
    expect(html).toContain('Book Turfs &amp; Nets');
    expect(html).toContain('Top Academies');
    expect(html).toContain('Sports CV Wizard');
    expect(html).toContain('href="/opportunities"');
    expect(html).toContain('href="/venues"');
    expect(html).toContain('href="/academies"');
    expect(html).toContain('href="/sports-cv"');

    // Hyperlocal city sports gateway
    expect(html).toContain('Explore Sports in Your City');
    expect(html).toContain('Delhi NCR');
    expect(html).toContain('Mumbai');
    expect(html).toContain('Bengaluru');
    expect(html).toContain('All 16 Grid Cities');

    // 3-Pillar Ecosystem Matrix
    expect(html).toContain('For Athletes &amp; Aspirants');
    expect(html).toContain('Play &amp; Compete');
    expect(html).toContain('Academies &amp; Hosts');

    // Statutory Nominative Fair Use Legal Notice
    expect(html).toContain('Statutory Nominative Fair Use &amp; Trademark Attribution Notice');
    expect(html).toContain('Doctrine of Nominative Fair Use (Section 30 of the Indian Trade Marks Act, 1999)');
  });

  it('supplies high-CTR SEO metadata and Schema.org for live cricket, WPL and ICC', () => {
    const seo = getRouteSeoMetadata('/live');
    expect(seo.title).toBe('Live Sports Scores & Match Centre · KhelGrid');
    expect(seo.robots).toBe('noindex, follow');
    expect(seo.description).toContain('connected scoreboard feeds');
    expect(seo.description).toContain('Community scorekeeper entries');
    expect(seo.description).not.toContain('Fastest');
    expect(seo.description).not.toContain('WPL');
    expect(seo.keywords).toContain('live cricket score');
    expect(seo.keywords).toContain('live football score');
    expect(seo.keywords).not.toContain('wpl live score');
    expect(seo.jsonLd).toBeDefined();
    expect(JSON.stringify(seo.jsonLd)).not.toContain('SportsEvent');

    const scoresSeo = getRouteSeoMetadata('/live-scores');
    expect(scoresSeo.title).toBe('Live Sports Scores & Match Centre · KhelGrid');
  });
});
