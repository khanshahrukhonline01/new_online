import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GameSportPlayAcrossIndia from './GameSportPlayAcrossIndia'

describe('GameSportPlayAcrossIndia component for SEO & Thin-Content mitigation', () => {
  it('renders all 6 categories and 54 directory links with rich sports indexing metadata', () => {
    const html = renderToStaticMarkup(<GameSportPlayAcrossIndia />)

    // Heading, Badge & Contextual Subtitle
    expect(html).toContain('Game, Sport &amp; Play Across India')
    expect(html).toContain('54+ Verified Directories')
    expect(html).toContain('Connecting India’s grassroots khiladis, maidans, turfs, akhadas, and national sports trials')

    // Schema.org Structured Data
    expect(html).toContain('application/ld+json')
    expect(html).toContain('https://schema.org')
    expect(html).toContain('"@type":"ItemList"')

    // Category 1: Game, Sport & Play Essentials
    expect(html).toContain('Game, Sport &amp; Play Essentials')
    expect(html).toContain('Core athlete pathways &amp; registries')
    expect(html).toContain('Game &amp; Match Finder')
    expect(html).toContain('Sport Academies &amp; Selections')
    expect(html).toContain('Play Pickup Matches &amp; Box Games')
    expect(html).toContain('Khiladi (खिलाड़ी) Talent Directory')
    expect(html).toContain('Grassroots Athlete Passport')
    expect(html).toContain('Verified Sports CV Maker')
    expect(html).toContain('Scout ID')

    // Category 2: Maidan, Turf & Net Practice
    expect(html).toContain('Maidan, Turf &amp; Net Practice')
    expect(html).toContain('Local play spaces &amp; facilities')
    expect(html).toContain('Book Turf Near Me (मैदान)')
    expect(html).toContain('Box Cricket Turf &amp; Nets')
    expect(html).toContain('Badminton Court Hourly Booking')
    expect(html).toContain('Futsal Arenas &amp; 5v5 Pitches')
    expect(html).toContain('Gully Cricket &amp; Community Games')
    expect(html).toContain('Hourly Slot')
    expect(html).toContain('5v5 FIFA')

    // Category 3: Akhada, Dangal & Combat
    expect(html).toContain('Akhada, Dangal &amp; Combat')
    expect(html).toContain('Traditional martial arts &amp; combat')
    expect(html).toContain('Akhada (अखाड़ा) &amp; Wrestling Camps')
    expect(html).toContain('Dangal (दंगल) &amp; Kusti Combines')
    expect(html).toContain('Kabaddi Panga &amp; Raid Trials')
    expect(html).toContain('Kho-Kho Junior National Trials')
    expect(html).toContain('Mitti Ka Khel Traditional Combines')
    expect(html).toContain('Desi Khel')
    expect(html).toContain('Kusti')

    // Category 4: National Trials & SAI NCOE
    expect(html).toContain('National Trials &amp; SAI NCOE')
    expect(html).toContain('Olympic &amp; SAI high-performance')
    expect(html).toContain('Sports Authority of India (SAI) Trials')
    expect(html).toContain('SAI National Centres of Excellence')
    expect(html).toContain('Khelo India State Centres (KISCE)')
    expect(html).toContain('Army Sports Institute (ASI Pune)')
    expect(html).toContain('Inspire Institute of Sport (IIS Bellary)')
    expect(html).toContain('SAI NCOE')
    expect(html).toContain('Armed Forces')

    // Category 5: Govt Sports Quota Recruitment
    expect(html).toContain('Govt Sports Quota Recruitment')
    expect(html).toContain('Public sector &amp; uniformed services')
    expect(html).toContain('Government Sports Quota Recruitment')
    expect(html).toContain('CRPF Meritorious Sportspersons 2026')
    expect(html).toContain('Indian Railways Sports Quota Trials')
    expect(html).toContain('State Police Sports Quota Entry')
    expect(html).toContain('Armed Forces Sports Quota Enrolment')
    expect(html).toContain('New 2026')
    expect(html).toContain('Govt Post')
    expect(html).toContain('Police Post')

    // Category 6: Age Categories & Leagues
    expect(html).toContain('Age Categories &amp; Leagues')
    expect(html).toContain('Competitive age brackets &amp; circuits')
    expect(html).toContain('BCCI Ranji Trophy Cricket Trials')
    expect(html).toContain('Khel Maharan 3.0 Assam Registrations')
    expect(html).toContain('Under-14 Sub-Junior Selection Camps')
    expect(html).toContain('Under-16 Junior State Cricket Trials')
    expect(html).toContain('Under-19 Youth National Championship')
    expect(html).toContain('ISL &amp; I-League Football Youth Trials')
    expect(html).toContain('Pro Kabaddi Grassroots Talent Hunt')
    expect(html).toContain('U-14')
    expect(html).toContain('PKL Talent')
  })
})
