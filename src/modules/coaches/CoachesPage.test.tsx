import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CoachesPage from './CoachesPage'
import CoachInquiryModal from './CoachInquiryModal'
import {
  VERIFIED_COACHES,
  COACH_SPORTS,
  COACH_CREDENTIALS,
  COACH_CITIES,
  saveCoachInquiry,
} from './coachesData'

describe('CoachesPage & coachesData', () => {
  describe('coachesData baseline & credential coverage', () => {
    it('has verified coaches covering major sports and credential authorities', () => {
      expect(VERIFIED_COACHES.length).toBeGreaterThanOrEqual(10)

      const sports = new Set(VERIFIED_COACHES.map(c => c.sport))
      expect(sports.has('Cricket')).toBe(true)
      expect(sports.has('Badminton')).toBe(true)
      expect(sports.has('Football')).toBe(true)
      expect(sports.has('Athletics')).toBe(true)
      expect(sports.has('Boxing')).toBe(true)
      expect(sports.has('Tennis')).toBe(true)
      expect(sports.has('Swimming')).toBe(true)
      expect(sports.has('Wrestling')).toBe(true)
      expect(sports.has('Kabaddi')).toBe(true)

      const authorities = new Set(VERIFIED_COACHES.map(c => c.credentialAuthority))
      expect(authorities.has('bcci')).toBe(true)
      expect(authorities.has('bwf-bai')).toBe(true)
      expect(authorities.has('aiff-afc')).toBe(true)
      expect(authorities.has('world-athletics')).toBe(true)
      expect(authorities.has('iba-boxing')).toBe(true)
      expect(authorities.has('wfi-akfi')).toBe(true)

      for (const coach of VERIFIED_COACHES) {
        expect(coach.id).toBeTruthy()
        expect(coach.name).toBeTruthy()
        expect(coach.certification).toBeTruthy()
        expect(coach.monthlyFee).toBeTruthy()
        expect(coach.studentTrackRecord).toBeTruthy()
        expect(coach.specialties.length).toBeGreaterThan(0)
        expect(coach.languages.length).toBeGreaterThan(0)
        expect(coach.rating).toBeGreaterThanOrEqual(4.0)
      }
    })

    it('exports filter lists for sports, credentials, and cities', () => {
      expect(COACH_SPORTS).toContain('Cricket')
      expect(COACH_SPORTS).toContain('Badminton')
      expect(COACH_CREDENTIALS.length).toBeGreaterThanOrEqual(8)
      expect(COACH_CITIES).toContain('Delhi NCR')
      expect(COACH_CITIES).toContain('Bengaluru')
    })

    it('creates a well-formed coach inquiry with generated reference ID', () => {
      const record = saveCoachInquiry({
        coachId: 'coach-rajeev-sharma-cricket',
        coachName: 'Coach Rajeev Sharma',
        athleteName: 'Devansh Verma',
        phone: '9876543210',
        ageCategory: 'U-16',
        skillLevel: 'Intermediate',
        objective: 'Upcoming Selection Trials Prep',
        preferredBatch: 'Morning (6:00 AM – 8:30 AM)',
      })

      expect(record.referenceId).toMatch(/^KG-COACH-\d{6}$/)
      expect(record.athleteName).toBe('Devansh Verma')
      expect(record.coachName).toBe('Coach Rajeev Sharma')
      expect(record.submittedAt).toBeTruthy()
    })
  })

  describe('CoachInquiryModal rendering', () => {
    it('renders null when closed or no coach is selected', () => {
      const htmlClosed = renderToStaticMarkup(
        <CoachInquiryModal coach={VERIFIED_COACHES[0]} isOpen={false} onClose={vi.fn()} />
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
      expect(html).toContain('Connect with Coach Rajeev Sharma')
      expect(html).toContain('BCCI Level 3 High Performance Coach')
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
