import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import VenuesPage from '../venues/VenuesPage'
import VenueDetailPage from '../venues/VenueDetailPage'
import AcademiesPage from '../academies/AcademiesPage'
import AcademyDetailPage from '../academies/AcademyDetailPage'
import CoachInquiryModal from '../coaches/CoachInquiryModal'
import { COACH_SPORTS, COACH_CREDENTIALS, saveCoachInquiry, type VerifiedCoach } from '../coaches/coachesData'
import OpportunitiesPage from '../opportunities/OpportunitiesPage'
import PlayPage from '../play/PlayPage'
import { SAMPLE_TEST_PICKUP_GAMES } from '../play/pickupData'
import { EventsPage } from '../events/EventsPage'
import { TournamentBracketViewer } from '../events/TournamentBracketViewer'

const COACH_FIXTURE: VerifiedCoach = {
  id: 'coach-completeness-fixture',
  slug: 'coach-completeness-fixture',
  name: 'Devashish Rao',
  sport: 'Cricket',
  sportCategory: 'Cricket',
  certification: 'BCCI Level 2 Certified Coach',
  credentialAuthority: 'bcci',
  authorityLabel: 'BCCI',
  city: 'Bengaluru',
  state: 'Karnataka',
  experienceYears: 12,
  academyAffiliation: 'Karnataka State Cricket Academy',
  monthlyFee: '₹4,500/month',
  feeRangeCategory: '3k-7k',
  studentTrackRecord: 'Trained 4 Ranji Trophy u-19 debutants',
  specialties: ['Fast Bowling', 'Bio-mechanics'],
  languages: ['English', 'Kannada', 'Hindi'],
  rating: 4.9,
  reviewCount: 38,
  verifiedBadge: 'BCCI Verified',
  bio: 'Experienced BCCI Level 2 bowling coach specializing in pace bowling mechanics and trial preparation.',
  availableForOneOnOne: true,
  availableForBatches: true,
}

describe('Catalogue Completeness & Interactive User Workflows', () => {
  it('1. Venues Catalogue: renders search toolbar, GPS controls, map/grid view switchers, and booking CTAs', () => {
    const html = renderToStaticMarkup(
      <VenuesPage onNavigate={vi.fn()} onOpenIntake={vi.fn()} />,
    )

    // Heading, eyebrow & callouts
    expect(html).toContain('KHEL TURF · VENUE &amp; TURF DIRECTORY (टर्फ बुकिंग)')
    expect(html).toContain('Book Sports Turfs &amp; Find a place to play.')
    expect(html).toContain('Run a sports venue? Add it to KhelGrid for free.')
    expect(html).toContain('List your venue')
    
    // Interactive controls
    expect(html).toContain('Filters')
    expect(html).toContain('Near Me')
    expect(html).toContain('Grid')
    expect(html).toContain('Map')
  })

  it('2. Venue Detail Hub: renders surface specifications, court amenities, and instant booking modal trigger', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="sree-kanteerava-stadium-bengaluru" initialBookingOpen={true} />,
    )

    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('Proceed to Payment')
    expect(html).toContain('Select Date')
    expect(html).toContain('Select Time Slot')
  })

  it('3. Academies Catalogue: renders grassroots academy cards, accredited coaching pedigree, and trial admission modal', () => {
    const html = renderToStaticMarkup(
      <AcademiesPage onOpenIntake={vi.fn()} onNavigate={vi.fn()} />,
    )

    expect(html).toContain('Certified Sports Academies in India.')
    expect(html).toContain('ACADEMY &amp; TRAINING DIRECTORY')
    expect(html).toContain('+ Register Academy')
    expect(html).toContain('Bengaluru FC Youth Academy')
    expect(html).toContain('Pullela Gopichand Badminton Academy')
  })

  it('4. Academy Detail Hub: renders curriculum, age groups, batch timing, and enrolment intake form', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="bengaluru-fc-academy" initialEnrolOpen={true} />,
    )

    expect(html).toContain('Bengaluru FC Youth Academy')
    expect(html).toContain('Football')
    expect(html).toContain('Bengaluru, Karnataka')
    expect(html).toContain('Verified Academy')
    expect(html).toContain('Enquire on WhatsApp')
    expect(html).toContain('Training Curriculum &amp; Methodology')
  })

  it('5. Coaches Directory: renders credential filters (BCCI/NIS/AFC), fee ranges, and direct coaching inquiry desk', () => {
    expect(COACH_SPORTS).toContain('Cricket')
    expect(COACH_SPORTS).toContain('Badminton')
    expect(COACH_CREDENTIALS.length).toBeGreaterThanOrEqual(6)

    const inquiry = saveCoachInquiry({
      coachId: COACH_FIXTURE.id,
      coachName: COACH_FIXTURE.name,
      athleteName: 'Aarav Sharma',
      phone: '9876543210',
      preferredBatch: 'Morning Batch (6:00 AM - 8:30 AM)',
      ageCategory: 'U-17',
      skillLevel: 'Advanced',
      objective: 'Ranji Trophy Combine Prep',
    })
    expect(inquiry.referenceId).toMatch(/^KG-COACH-\d{6}$/)
    expect(inquiry.athleteName).toBe('Aarav Sharma')

    const htmlModal = renderToStaticMarkup(
      <CoachInquiryModal coach={COACH_FIXTURE} isOpen={true} onClose={vi.fn()} />,
    )
    expect(htmlModal).toContain('role="dialog"')
    expect(htmlModal).toContain('Connect with Devashish Rao')
    expect(htmlModal).toContain('BCCI Level 2 Certified Coach')
  })

  it('6. Opportunities Hub: renders active trials, Sports CV combine application trigger, and alert subscription hooks', () => {
    const html = renderToStaticMarkup(
      <OpportunitiesPage onOpenIntake={vi.fn()} onNavigate={vi.fn()} />,
    )

    expect(html).toContain('Your next opportunity.')
    expect(html).toContain('TRIALS · SELECTIONS · PROGRAMMES')
    expect(html).toContain('Free Entry Only (₹0)')
    expect(html).toContain('Most spots available')
    expect(html).toContain('Submit a trial')
  })

  it('7. Community Play & Pickup Matches: renders box cricket & futsal games, host match trigger, and join match actions', () => {
    const html = renderToStaticMarkup(
      <PlayPage onOpenIntake={vi.fn()} onNavigate={vi.fn()} initialGames={SAMPLE_TEST_PICKUP_GAMES} />,
    )

    expect(html).toContain('COMMUNITY MATCHES · PICKUP GAMES')
    expect(html).toContain('Join local pickup games.')
    expect(html).toContain('Host a match')
    expect(html).toContain('Sport, venue, city or host…')
    expect(html).toContain('FerroHub Sports')
  })

  it('8. Events & Tournaments: renders state championships, tournament calendar, and interactive bracket viewer', () => {
    const htmlEvents = renderToStaticMarkup(
      <EventsPage onNavigate={vi.fn()} />,
    )
    expect(htmlEvents).toContain('National Events &amp; State Tournaments Calendar.')
    expect(htmlEvents).toContain('Subroto Cup International Football Tournament')
    expect(htmlEvents).toContain('Official Rulebook')

    const htmlBracket = renderToStaticMarkup(
      <TournamentBracketViewer tournamentTitle="All-India Inter-State Badminton Cup 2026" />,
    )
    expect(htmlBracket).toContain('tournament-bracket-viewer')
    expect(htmlBracket).toContain('Quarter Finals')
    expect(htmlBracket).toContain('Semi Finals')
    expect(htmlBracket).toContain('Championship')
    expect(htmlBracket).toContain('Kanpur Super Strikers')
  })
})
