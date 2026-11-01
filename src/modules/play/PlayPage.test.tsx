import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PlayPage from './PlayPage'

describe('PlayPage community matches and pickup games directory', () => {
  it('renders directory heading, host callout, and community pickup cards', () => {
    const html = renderToStaticMarkup(<PlayPage />)

    // Breadcrumb navigation matching live site
    expect(html).toContain('aria-label="breadcrumb"')
    expect(html).toContain('Play · Find games')

    // Heading & introduction
    expect(html).toContain('COMMUNITY MATCHES · PICKUP GAMES')
    expect(html).toContain('Join local pickup games.')
    expect(html).toContain('Connect with local athletes, fill missing court spots')

    // Host match callout
    expect(html).toContain('Hosting a match and need players? Post a Game')
    expect(html).toContain('Host a match')
    expect(html).toContain('mailto:khelgrid@gmail.com?subject=Host%20a%20pickup%20match%20on%20KhelGrid')

    // Filter controls and stats toolbar
    expect(html).toContain('Sport, venue, city or host…')
    expect(html).toContain('pickup games')

    // Baseline cards check
    expect(html).toContain('Pickleball')
    expect(html).toContain('FerroHub Sports')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('₹200/player')

    expect(html).toContain('Football')
    expect(html).toContain('Kicks on Grass Arena')

    expect(html).toContain('DDA Sports Ground')
    expect(html).toContain('Delhi')
    expect(html).toContain('₹180/player')
  })
})
