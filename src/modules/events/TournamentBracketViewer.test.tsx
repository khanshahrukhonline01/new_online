import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TournamentBracketViewer } from './TournamentBracketViewer'

describe('TournamentBracketViewer (Knockout Brackets, Points Table & POTM)', () => {
  it('renders knockout bracket tree with Quarter Finals, Semi Finals, Final and Champion banner', () => {
    const html = renderToStaticMarkup(
      <TournamentBracketViewer
        tournamentTitle="Kanpur Premier Box Cricket Championship 2026"
        city="Kanpur"
        sport="Cricket"
      />
    )

    // Header & Tabs
    expect(html).toContain('GRASSROOTS TOURNAMENT CENTRE · CRICKET')
    expect(html).toContain('Kanpur Premier Box Cricket Championship 2026')
    expect(html).toContain('Knockout Bracket Tree')
    expect(html).toContain('Group Standings Table')

    // Rounds
    expect(html).toContain('Quarter Finals')
    expect(html).toContain('Semi Finals')
    expect(html).toContain('Championship')

    // Teams & Scores
    expect(html).toContain('Kanpur Super Strikers')
    expect(html).toContain('158/5 (16.0)')
    expect(html).toContain('Ratan Lal Nagar Royals')

    // Champion
    expect(html).toContain('CHAMPIONS')
  })
})
