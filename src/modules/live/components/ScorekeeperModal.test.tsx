import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScorekeeperModal } from './ScorekeeperModal';
import { scorekeeperService } from '../services/scorekeeperService';

describe('ScorekeeperModal Component', () => {
  it('renders an empty scorekeeper state without inventing a match when no community fixtures exist', () => {
    const html = renderToStaticMarkup(
      <ScorekeeperModal
        isOpen={true}
        onClose={vi.fn()}
        onMatchUpdated={vi.fn()}
      />
    );

    expect(html).toContain('LIVE MATCH SCOREKEEPER CONSOLE');
    expect(html).toContain('Broadcast Live Match Scores');
    expect(html).toContain('Select Active Match:');
    expect(html).toContain('No community matches yet — create one to start scoring');
    expect(html).toContain('+ New Match');

    // No seeded fixture means there is no active scorecard or scoring keypad.
    expect(html).not.toContain('scorer-team-name');
    expect(html).not.toContain('VS');
    expect(html).not.toContain('WICKET!');
    expect(html).not.toContain('End Match &amp; Finalize Score');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ScorekeeperModal
        isOpen={false}
        onClose={vi.fn()}
        onMatchUpdated={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders cricket ball telemetry strip, over deliveries, and Player of the Match POTM intake when match exists', () => {
    // Seed a test community live match
    const testMatch = {
      id: 'test-cricket-match-101',
      sport: 'Cricket' as const,
      tournament: 'Kanpur Box Cricket Premier League',
      venue: 'Green Park Turf A',
      city: 'Kanpur',
      teamA: { name: 'Kanpur Strikers', code: 'KAN', score: '78/2' },
      teamB: { name: 'Ganga Warriors', code: 'GAN', score: 'Yet to Bat' },
      status: 'LIVE' as const,
      venueOrOvers: '8.4 Overs',
      hostName: 'Coach Ramesh',
      isCommunityMatch: true as const,
      source: 'Grassroots Community Scorer',
      lastUpdated: new Date().toISOString(),
      commentaryTimeline: [
        { id: 'ev-1', time: '8.4', type: 'commentary' as const, text: 'FOUR! Beautiful drive through extra cover.' },
      ],
    };
    const spy = vi.spyOn(scorekeeperService, 'getCommunityMatches').mockReturnValue([testMatch]);

    try {
      const html = renderToStaticMarkup(
        <ScorekeeperModal
          isOpen={true}
          onClose={vi.fn()}
          onMatchUpdated={vi.fn()}
        />
      );

      // Verify active match header
      expect(html).toContain('Kanpur Strikers');
      expect(html).toContain('78/2');
      expect(html).toContain('Ganga Warriors');
      expect(html).toContain('8.4 Overs');

      // Verify telemetry strip
      expect(html).toContain('On Strike:');
      expect(html).toContain('Bowler:');
      expect(html).toContain('Radar ~132 km/h');

      // Verify delivery keypad
      expect(html).toContain('This Over:');
      expect(html).toContain('Tap to Record Ball (Delivery):');
      expect(html).toContain('FOUR');
      expect(html).toContain('SIX!');
      expect(html).toContain('WICKET!');

      // Verify POTM intake
      expect(html).toContain('Award Player of the Match (POTM) Digital Badge:');
      expect(html).toContain('Player Full Name');
      expect(html).toContain('Performance Summary');
      expect(html).toContain('End Match &amp; Finalize Score');
    } finally {
      spy.mockRestore();
    }
  });
});
