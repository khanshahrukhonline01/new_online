import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CoachesPage from './CoachesPage'
import CoachInquiryModal from './CoachInquiryModal'
import {
  type VerifiedCoach,
  COACH_SPORTS,
  COACH_CREDENTIALS,
  COACH_CITIES,
  saveCoachInquiry,
} from './coachesData'

const COACH_FIXTURE: VerifiedCoach = {
  id: 'coach-test-fixture',
  slug: 'coach-test-fixture',
  name: 'Test Coach',
  sport: 'Cricket',
  sportCategory: 'Cricket',
  certification: 'Qualification evidence supplied for test',
  credentialAuthority: 'bcci',
  authorityLabel: 'BCCI',
  city: 'Delhi',
  state: 'Delhi',
  experienceYears: 0,
  academyAffiliation: 'Affiliation not supplied',
  monthlyFee: 'Fee not supplied',
  feeRangeCategory: 'unknown',
  studentTrackRecord: '',
  specialties: [],
  languages: [],
  rating: 0,
  reviewCount: 0,
  verifiedBadge: 'Evidence reviewed',
  bio: 'Test-only fixture; not a public coach profile.',
  availableForOneOnOne: false,
  availableForBatches: false,
}

describe('CoachesPage & coachesData', () => {
  describe('coachesData directory configuration', () => {
    it('exports sport, credential and city filter options without bundling sample coach profiles', () => {
      expect(COACH_SPORTS).toContain('Cricket')
      expect(COACH_SPORTS).toContain('Badminton')
      expect(COACH_CREDENTIALS.length).toBeGreaterThanOrEqual(8)
      expect(COACH_CITIES).toContain('Delhi NCR')
      expect(COACH_CITIES).toContain('Bengaluru')
    })

    it('creates a well-formed coach inquiry with generated reference ID', () => {
      const record = saveCoachInquiry({
        coachId: 'coach-test-fixture',
        coachName: 'Test Coach',
        athleteName: 'Devansh Verma',
        phone: '9876543210',
        ageCategory: 'U-16',
        skillLevel: 'Intermediate',
        objective: 'Upcoming Selection Trials Prep',
        preferredBatch: 'Morning (6:00 AM – 8:30 AM)',
      })

      expect(record.referenceId).toMatch(/^KG-COACH-\\d{6}$/)
      expect(record.athleteName).toBe('Devansh Verma')
      expect(record.coachName).toBe('Test Coach')
      expect(record.submittedAt).toBeTruthy()
    })
  })

  describe('CoachInquiryModal rendering', () => {
    it('renders null when closed or no coach is selected', () => {
      const htmlClosed = renderToStaticMarkup(
        <CoachInquiryModal coach={COACH_FIXTURE} isOpen={false} onClose={vi.fn()} />
      )
      expect(htmlClosed).toBe('')

      const htmlNoCoach = renderToStaticMarkup(
        <CoachInquiryModal coach={null} isOpen={true} onClose={vi.fn()} />
      )
      expect(htmlNoCoach).toBe('')
    })

    it('renders accessible dialog with form fields, coach details, and privacy note when open', () => {
      const coach = VERIFIED_COACHES[0]
      const html = renderToStaticMarkup(
        <CoachInquiryModal coach={coach} isOpen={true} onClose={vi.fn()} />
      )

      expect(html).toContain('role="dialog"')
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('Connect with Test Coach')
      expect(html).toContain('Qualification evidence supplied for test')
      expect(html).toContain('Athlete / Student Name')
      expect(html).toContain('WhatsApp Contact Number')
      expect(html).toContain('Age Category')
      expect(html).toContain('Current Playing Level')
      expect(html).toContain('Training Objective')
      expect(html).toContain('Preferred Batch Timing')
      expect(html).toContain('Submit Inquiry &amp; Connect')
      expect(html).toContain('DPDP Act')
    })
  })

  describe('CoachesPage rendering', () => {
    it('renders a free coach submission path and evidence-led directory without invented headline metrics', () => {
      const html = renderToStaticMarkup(
        <CoachesPage onNavigate={vi.fn()} onOpenCoachIntake={vi.fn()} />
      )

      expect(html).toContain('Find a coach. Check the credentials.')
      expect(html).toContain('Free coach listing')
      expect(html).toContain('Submit coach listing')
      expect(html).toContain('qualification evidence')
      expect(html).toContain('All Sports')
      expect(html).toContain('Search by coach name, academy, specialty')
      expect(html).not.toContain('850+ Coaches')
      expect(html).not.toContain('⭐ 4.9 / 5.0')
      expect(html).not.toContain('53 Indian cities')
    })
  })
})
