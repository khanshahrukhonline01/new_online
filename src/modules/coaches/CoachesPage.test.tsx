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
    it('renders page header, KPI ribbon, onboarding banner, sport tabs, filters, and coach cards', () => {
      const html = renderToStaticMarkup(
        <CoachesPage onNavigate={vi.fn()} onOpenCoachIntake={vi.fn()} />
      )

      // Eyebrow and Page Title
      expect(html).toContain('Verified Grassroots &amp; Elite Mentors')
      expect(html).toContain('Dedicated Certified Coaches Directory')
      expect(html).toContain('Find and connect directly with certified Indian sports coaches')

      // KPI Ribbon
      expect(html).toContain('850+ Coaches')
      expect(html).toContain('SAI · BCCI · AFC')
      expect(html).toContain('12 Disciplines')
      expect(html).toContain('⭐ 4.9 / 5.0')

      // Onboarding Banner
      expect(html).toContain('Are you a certified sports coach in India?')
      expect(html).toContain('Get Listed as a Coach')

      // Sport horizontal pills
      expect(html).toContain('All Sports')
      expect(html).toContain('Cricket')
      expect(html).toContain('Badminton')
      expect(html).toContain('Football')
      expect(html).toContain('Athletics')
      expect(html).toContain('Boxing')
      expect(html).toContain('Wrestling')

      // Controls
      expect(html).toContain('Search by coach name, academy, specialty')
      expect(html).toContain('SAI / NIS Patiala Diploma')
      expect(html).toContain('BCCI Level 1–3 (Cricket)')
      expect(html).toContain('AIFF / AFC Licences (Football)')
      expect(html).toContain('Sort: Experience (High to Low)')

      // Baseline Coach Cards
      expect(html).toContain('Coach Rajeev Sharma')
      expect(html).toContain('Pace Bowling Biomechanics')
      expect(html).toContain('Coach Manisha Ponnappa')
      expect(html).toContain('Padukone-Dravid Centre of Sports Excellence')
      expect(html).toContain('Coach Subhashish Sengupta')
      expect(html).toContain('Coach Gurpreet Singh Sandhu')
      expect(html).toContain('Coach Mary L. Komalata')
      expect(html).toContain('Coach Devendra Rathi')
      expect(html).toContain('Chhatrasal Akhada Training Program')

      // Action buttons
      expect(html).toContain('Connect with Coach')
      expect(html).toContain('Student Track Record')
    })
  })
})
