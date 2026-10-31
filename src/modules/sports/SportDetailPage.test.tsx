import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SportDetailPage from './SportDetailPage'

describe('SportDetailPage', () => {
  it('renders cricket sport hub with BCCI governing body, Hindi name, and pathway', () => {
    const html = renderToStaticMarkup(<SportDetailPage slug="cricket" />)
    expect(html).toContain('Cricket')
    expect(html).toContain('क्रिकेट')
    expect(html).toContain('Board of Control for Cricket in India')
    expect(html).toContain('BCCI')
    expect(html).toContain('Wankhede Stadium')
    expect(html).toContain('Ranji Trophy')
    expect(html).toContain('Build Cricket Athlete CV')
    expect(html).toContain('Talent Selection Pathway in India')
    expect(html).toContain('1. District Open Trials')
    expect(html).toContain('Sachin Tendulkar')
  })

  it('renders football sport hub with AIFF and Olympic badge', () => {
    const html = renderToStaticMarkup(<SportDetailPage slug="football" />)
    expect(html).toContain('Football')
    expect(html).toContain('फ़ुटबॉल')
    expect(html).toContain('All India Football Federation')
    expect(html).toContain('AIFF')
    expect(html).toContain('Indian Super League (ISL)')
    expect(html).toContain('Sunil Chhetri')
    expect(html).toContain('Build Football Athlete CV')
  })

  it('renders kabaddi with indigenous category and AKFI details', () => {
    const html = renderToStaticMarkup(<SportDetailPage slug="kabaddi" />)
    expect(html).toContain('Kabaddi')
    expect(html).toContain('कबड्डी')
    expect(html).toContain('Amateur Kabaddi Federation of India')
    expect(html).toContain('AKFI')
    expect(html).toContain('Pro Kabaddi League')
    expect(html).toContain('Pardeep Narwal')
  })

  it('renders badminton with BAI and Olympic details', () => {
    const html = renderToStaticMarkup(<SportDetailPage slug="badminton" />)
    expect(html).toContain('Badminton')
    expect(html).toContain('बैडमिंटन')
    expect(html).toContain('Badminton Association of India')
    expect(html).toContain('BAI')
    expect(html).toContain('P.V. Sindhu')
  })

  it('gracefully handles unknown sports slug with structured fallback', () => {
    const html = renderToStaticMarkup(<SportDetailPage slug="ultimate-frisbee" />)
    expect(html).toContain('Ultimate Frisbee')
    expect(html).toContain('Build Ultimate Frisbee Athlete CV')
    expect(html).toContain('Talent Selection Pathway in India')
  })
})
