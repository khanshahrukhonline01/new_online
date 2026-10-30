import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FrequentlyAskedQuestions } from './FrequentlyAskedQuestions'

describe('FrequentlyAskedQuestions component for SEO, Ranking & Thin-Content mitigation', () => {
  it('renders Home-specific FAQs and Schema.org FAQPage on root path /', () => {
    const html = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/" />)

    // Heading and Tagline
    expect(html).toContain('Frequently Asked Questions')
    expect(html).toContain('Got questions? We have answers.')
    expect(html).toContain('KhelGrid Platform &amp; Athlete FAQ')

    // Schema.org Structured Data
    expect(html).toContain('application/ld+json')
    expect(html).toContain('https://schema.org')
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('"@type":"Question"')
    expect(html).toContain('"acceptedAnswer"')

    // Substantive Home Answers & High-Intent Long-Tail Keywords
    expect(html).toContain('Is KhelGrid free for athletes, and how do selection trial applications work?')
    expect(html).toContain('How does KhelGrid protect young athletes from fraudulent trials and pay-to-play scams?')
    expect(html).toContain('What is the KhelGrid Sports CV and how does it help athletes get scouted?')
    expect(html).toContain('How does KhelGrid track government sports quota recruitment drives across India?')
    expect(html).toContain('Which age divisions and sports disciplines are currently supported on KhelGrid?')

    // Specificity & Anti-Thin-Content Badges
    expect(html).toContain('100% Free Access')
    expect(html).toContain('Zero Fake Trials')
    expect(html).toContain('Digital Sports CV')
    expect(html).toContain('Recruitment 2026')
    expect(html).toContain('Central Reserve Police Force (CRPF)')
    expect(html).toContain('Indian Railways (RSPB)')
  })

  it('renders Sports-specific FAQs and Schema.org on /sports and /sport/football', () => {
    const htmlSports = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/sports" />)
    const htmlSportDetail = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/sport/football" />)

    for (const html of [htmlSports, htmlSportDetail]) {
      expect(html).toContain('Frequently Asked Questions')
      expect(html).toContain('Got questions? We have answers.')
      expect(html).toContain('Sports &amp; Disciplines FAQ')
      expect(html).toContain('"@type":"FAQPage"')

      // Sports-specific questions & authoritative regulatory terminology
      expect(html).toContain('What is the difference between grassroots club academies and SAI National Centres of Excellence (NCOE)?')
      expect(html).toContain('Which age verification documents and cutoff standards are enforced at state trials?')
      expect(html).toContain('How do athletes advance from district school games to state and national team selections?')
      expect(html).toContain('Which official rulebooks and technical regulations govern sports listings on KhelGrid?')
      expect(html).toContain('Are indigenous Indian disciplines like Akhada Wrestling, Kabaddi, and Kho-Kho supported?')

      // Deep technical specificity
      expect(html).toContain('SAI NCOE &amp; KISCE')
      expect(html).toContain('BWF · IFAB · MCC · AKFI')
      expect(html).toContain('TW3 (Tanner-Whitehouse 3)')
      expect(html).toContain('Yo-Yo Intermittent Recovery Test')
      expect(html).toContain('Ranji Trophy')
    }
  })

  it('renders Trials & Opportunities-specific FAQs on /trials and /opportunities', () => {
    const htmlTrials = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/trials" />)
    const htmlOpps = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/opportunities" />)

    for (const html of [htmlTrials, htmlOpps]) {
      expect(html).toContain('Frequently Asked Questions')
      expect(html).toContain('Got questions? We have answers.')
      expect(html).toContain('Selection Trials &amp; Opportunities FAQ')
      expect(html).toContain('"@type":"FAQPage"')

      // Trials-specific content
      expect(html).toContain('How does KhelGrid verify that a sports selection trial is authentic and safe to attend?')
      expect(html).toContain('What mandatory gear, kits, and documents should athletes bring to a selection trial?')
      expect(html).toContain('What happens if a selection trial or sports combine is postponed or rescheduled due to rain?')
      expect(html).toContain('How do sports quota recruitment trials differ from regular academy selections?')
      expect(html).toContain('Do grassroots athletes need a federation registration ID to attend selection trials?')

      // Verification badges & specifics
      expect(html).toContain('Direct Source Audit')
      expect(html).toContain('Reporting Kit &amp; Docs')
      expect(html).toContain('AIFF Central Registration System')
    }
  })

  it('renders Venues & Turf-specific FAQs on /venues and /book', () => {
    const htmlVenues = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/venues" />)
    const htmlBook = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/book" />)

    for (const html of [htmlVenues, htmlBook]) {
      expect(html).toContain('Frequently Asked Questions')
      expect(html).toContain('Got questions? We have answers.')
      expect(html).toContain('Sports Venues &amp; Turf Bookings FAQ')
      expect(html).toContain('"@type":"FAQPage"')

      // Venues-specific content
      expect(html).toContain('How do sports venue bookings and hourly turf reservations work on KhelGrid?')
      expect(html).toContain('What turf and court surface standards should athletes look for when booking a facility?')
      expect(html).toContain('What amenities and safety features are verified for venues listed on KhelGrid?')
      expect(html).toContain('How can venue owners, complex managers, and turf operators list their facilities on KhelGrid?')

      // Technical surface specifications
      expect(html).toContain('FIFA &amp; BWF Surfaces')
      expect(html).toContain('40mm–50mm monofilament artificial grass')
      expect(html).toContain('wooden sprung flooring')
    }
  })

  it('renders Search & Pathway FAQs on /search and /start-from-zero', () => {
    const htmlSearch = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/search" />)
    const htmlStart = renderToStaticMarkup(<FrequentlyAskedQuestions activePath="/start-from-zero" />)

    for (const html of [htmlSearch, htmlStart]) {
      expect(html).toContain('Frequently Asked Questions')
      expect(html).toContain('Got questions? We have answers.')
      expect(html).toContain('Directory &amp; Athlete Pathways FAQ')
      expect(html).toContain('"@type":"FAQPage"')

      expect(html).toContain('How do I search and filter trials, academies, and venues by sport, city, and age category?')
      expect(html).toContain('Can I export and share my KhelGrid Sports CV with academy selectors and coaches via WhatsApp?')
      expect(html).toContain('What is the &quot;Start From Zero&quot; athletic roadmap for young athletes and parents?')
    }
  })
})
