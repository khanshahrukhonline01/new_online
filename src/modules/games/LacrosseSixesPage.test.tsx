import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LacrosseSixesPage from './LacrosseSixesPage'

describe('Lacrosse Sixes arcade game', () => {
  it('renders the playable arena, score HUD and accessible touch controls', () => {
    const html = renderToStaticMarkup(<LacrosseSixesPage />)
    expect(html).toContain('Lacrosse Sixes')
    expect(html).toContain('YOUR SCORE')
    expect(html).toContain('TIME LEFT')
    expect(html).toContain('Start match')
    expect(html).toContain('Move up')
    expect(html).toContain('Shoot')
    expect(html).toContain('W A S D')
  })
})
