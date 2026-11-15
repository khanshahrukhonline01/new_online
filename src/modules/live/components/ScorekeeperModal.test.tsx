import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScorekeeperModal } from './ScorekeeperModal';

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
});
