import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScorekeeperModal } from './ScorekeeperModal';

describe('ScorekeeperModal Component', () => {
  it('renders modal header, live scorer badge, and active match controls', () => {
    const html = renderToStaticMarkup(
      <ScorekeeperModal
        isOpen={true}
        onClose={vi.fn()}
        onMatchUpdated={vi.fn()}
      />
    );

    // Header and Live Badge
    expect(html).toContain('LIVE MATCH SCOREKEEPER CONSOLE');
    expect(html).toContain('Broadcast Live Match Scores');
    expect(html).toContain('Select Active Match:');
    expect(html).toContain('+ New Match');

    // Hero scorecard elements
    expect(html).toContain('VS');
    expect(html).toContain('LIVE');

    // Keypad scoring buttons for Cricket
    expect(html).toContain('FOUR');
    expect(html).toContain('SIX!');
    expect(html).toContain('WICKET!');
    expect(html).toContain('Wide (+1)');

    // Live Commentary Timeline
    expect(html).toContain('Live Commentary Timeline');

    // Action buttons
    expect(html).toContain('End Match &amp; Finalize Score');
    expect(html).toContain('Copy Spectator Link');
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
});
