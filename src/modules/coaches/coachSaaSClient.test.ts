import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearCoachSaaSMemoryStore,
  getRegisteredCoaches,
  getCurrentCoach,
  getCoachBatches,
  saveCoachBatch,
  deleteCoachBatch,
  getCoachTrainees,
  saveCoachTrainee,
  recordTraineePayment,
  getCoachInquiries,
  updateCoachInquiryStatus,
  addCoachInquiry,
  getCoachSaaSSummary,
  registerCustomCoach,
  confirmAndVerifyCoach,
  revokeCoachVerification,
  generateWhatsAppParentReplyUrl,
  generateWhatsAppTraineeFeeReminderUrl,
  generateUpiPayLink,
  calculateCombinePercentile,
  getTraineeCombines,
  saveTraineeCombine,
  getCoachTrainingPlans,
  saveCoachTrainingPlan,
  getCoachEndorsements,
  awardCoachEndorsement,
  generateWhatsAppTrainingPlanUrl,
  generateWhatsAppEndorsementUrl,
} from './coachSaaSClient'

describe('coachSaaSClient Unit Suite', () => {
  beforeEach(() => {
    clearCoachSaaSMemoryStore()
  })

  it('retrieves seed coaches and retrieves by slug', () => {
    const coaches = getRegisteredCoaches()
    expect(coaches.length).toBeGreaterThanOrEqual(2)
    const coach = getCurrentCoach('zaheer-farooq-coach')
    expect(coach.name).toBe('Coach Zaheer Farooq')
    expect(coach.verificationStatus).toBe('verified')
  })

  it('manages batches: creates and deletes', () => {
    const batchesBefore = getCoachBatches('zaheer-farooq-coach')
    expect(batchesBefore.length).toBeGreaterThan(0)

    const newBatch = saveCoachBatch({
      coachSlug: 'zaheer-farooq-coach',
      batchName: 'Special Weekend Spin Clinic',
      sport: 'Cricket',
      days: 'Sat, Sun',
      timings: '07:00 AM – 09:00 AM',
      ageGroup: 'U-17',
      monthlyFee: 4000,
      maxCapacity: 10,
      isActive: true,
    })
    expect(newBatch.id).toBeDefined()

    const batchesAfter = getCoachBatches('zaheer-farooq-coach')
    expect(batchesAfter.length).toBe(batchesBefore.length + 1)

    deleteCoachBatch(newBatch.id)
    const batchesFinal = getCoachBatches('zaheer-farooq-coach')
    expect(batchesFinal.length).toBe(batchesBefore.length)
  })

  it('manages trainees and records payments', () => {
    const trainees = getCoachTrainees('zaheer-farooq-coach')
    expect(trainees.length).toBeGreaterThan(0)

    const newTrainee = saveCoachTrainee({
      coachSlug: 'zaheer-farooq-coach',
      traineeName: 'Aryan Roy',
      parentName: 'Sanjay Roy',
      parentPhone: '9899001122',
      sport: 'Cricket',
      ageCategory: 'U-14',
      batchId: 'cbatch-zf-1',
      batchName: 'Morning Elite Fast Bowlers Camp',
      monthlyFee: 3500,
      feeStatus: 'due_soon',
      nextDueDate: '28 Nov 2026',
    })
    expect(newTrainee.id).toBeDefined()

    recordTraineePayment(newTrainee.id)
    const updatedTrainees = getCoachTrainees('zaheer-farooq-coach')
    const updated = updatedTrainees.find(t => t.id === newTrainee.id)
    expect(updated?.feeStatus).toBe('paid')
    expect(updated?.lastPaymentDate).toBeDefined()
  })

  it('manages inquiries and updates status', () => {
    const inquiries = getCoachInquiries('zaheer-farooq-coach')
    expect(inquiries.length).toBeGreaterThan(0)
    const first = inquiries[0]

    updateCoachInquiryStatus(first.id, 'enrolled')
    const updatedList = getCoachInquiries('zaheer-farooq-coach')
    expect(updatedList.find(i => i.id === first.id)?.status).toBe('enrolled')

    // Test adding live inquiry from public profile
    const addedInq = addCoachInquiry({
      coachSlug: 'zaheer-farooq-coach',
      athleteName: 'Devika Sharma',
      parentName: 'Ramesh Sharma',
      phone: '9811223344',
      sport: 'Cricket',
      ageCategory: 'U-14',
      preferredBatch: 'Morning Camp',
      objective: 'Fast Bowling Trials',
    })
    expect(addedInq.id).toContain('inq-')
    expect(addedInq.athleteName).toBe('Devika Sharma')
    const inquiriesAfter = getCoachInquiries('zaheer-farooq-coach')
    expect(inquiriesAfter.some(i => i.athleteName === 'Devika Sharma')).toBe(true)
  })

  it('calculates coach SaaS summary accurately', () => {
    const summary = getCoachSaaSSummary('zaheer-farooq-coach')
    expect(summary.totalTrainees).toBeGreaterThan(0)
    expect(summary.totalRevenue).toBeGreaterThan(0)
    expect(summary.collectionRate).toBeGreaterThanOrEqual(0)
    expect(summary.totalBatches).toBeGreaterThan(0)
  })

  it('registers custom coach with pending_review status and enables admin confirmation', () => {
    const custom = registerCustomCoach({
      name: 'Ramesh Powar',
      sport: 'Cricket',
      city: 'Mumbai',
      phone: '9820011223',
      email: 'ramesh.powar@example.com',
      certification: 'BCCI Level 3 Senior Coach',
      monthlyFee: 5000,
      upiVpa: 'ramesh.powar@okaxis',
    })

    expect(custom.slug).toContain('ramesh-powar')
    expect(custom.isCustom).toBe(true)
    expect(custom.verificationStatus).toBe('pending_review')

    // Admin confirmation flow
    const confirmed = confirmAndVerifyCoach(custom.slug)
    expect(confirmed).toBe(true)
    expect(getCurrentCoach(custom.slug).verificationStatus).toBe('verified')

    // Revocation flow
    const revoked = revokeCoachVerification(custom.slug)
    expect(revoked).toBe(true)
    expect(getCurrentCoach(custom.slug).verificationStatus).toBe('pending_review')
  })

  it('generates WhatsApp action links and UPI pay links', () => {
    const inq = getCoachInquiries('zaheer-farooq-coach')[0]
    const waInquiry = generateWhatsAppParentReplyUrl(inq, 'Coach Zaheer Farooq')
    expect(waInquiry).toContain('https://wa.me/91')
    expect(waInquiry).toContain(encodeURIComponent('Coach Zaheer Farooq'))

    const trainee = getCoachTrainees('zaheer-farooq-coach')[0]
    const waFee = generateWhatsAppTraineeFeeReminderUrl(trainee, 'Coach Zaheer Farooq', 'zaheer@upi')
    expect(waFee).toContain('https://wa.me/91')
    expect(waFee).toContain(encodeURIComponent('Monthly Fee:'))

    const upiLink = generateUpiPayLink({
      vpa: 'coach@upi',
      name: 'Coach Zaheer',
      amount: 3500,
      note: 'Cricket Coaching Fee',
    })
    expect(upiLink).toContain('upi://pay?pa=coach%40upi')
  })

  it('calculates physical combine benchmarks and assigns national percentiles', () => {
    const elite = calculateCombinePercentile({
      ageGroup: 'U-16',
      sprint30m: 4.10,
      verticalJump: 52,
      yoYoLevel: 17.5,
    })
    expect(elite.percentile).toBeGreaterThanOrEqual(90)
    expect(elite.tier).toBe('Elite (Top 5%)')

    const developing = calculateCombinePercentile({
      ageGroup: 'U-16',
      sprint30m: 4.90,
      verticalJump: 32,
    })
    expect(developing.percentile).toBeLessThan(70)
    expect(developing.tier).toBe('Developing')
  })

  it('manages trainee combine benchmarks, training plans, and coach endorsements', () => {
    const combines = getTraineeCombines('zaheer-farooq-coach')
    expect(combines.length).toBeGreaterThanOrEqual(2)
    expect(combines[0].traineeName).toBe('Arjun Mehra')

    const savedComb = saveTraineeCombine({
      coachSlug: 'zaheer-farooq-coach',
      traineeId: 'tr-03',
      traineeName: 'Samir Khan',
      testDate: '2026-11-21',
      ageGroup: 'U-14',
      sprint30mSeconds: 4.25,
      verticalJumpCm: 48,
      compositePercentile: 88,
      tier: 'Advanced (Top 15%)',
    })
    expect(savedComb.id).toBeDefined()
    expect(getTraineeCombines('zaheer-farooq-coach').some(c => c.id === savedComb.id)).toBe(true)

    // Training Plans
    const plans = getCoachTrainingPlans('zaheer-farooq-coach')
    expect(plans.length).toBeGreaterThanOrEqual(1)
    const newPlan = saveCoachTrainingPlan({
      coachSlug: 'zaheer-farooq-coach',
      batchId: 'cbatch-zf-2',
      batchName: 'Evening Grassroots All-Rounders',
      weekTitle: 'Week 5: Power Hitting Drills',
      focusArea: 'Bat speed & weight transfer',
      drills: [{ day: 'Tue', title: 'Heavy Bat Swings', durationMinutes: 30, instructions: '5 sets of 20 swings' }],
      homeworkChallenge: '50 shadow swings in front of mirror',
    })
    expect(newPlan.id).toBeDefined()
    expect(getCoachTrainingPlans('zaheer-farooq-coach').some(p => p.id === newPlan.id)).toBe(true)

    const waPlan = generateWhatsAppTrainingPlanUrl(newPlan, 'Coach Zaheer')
    expect(waPlan).toContain('https://wa.me/?text=')
    expect(waPlan).toContain(encodeURIComponent('WEEKLY TRAINING DRILLS & FOCUS'))

    // Endorsements
    const endorsements = getCoachEndorsements('zaheer-farooq-coach')
    expect(endorsements.length).toBeGreaterThanOrEqual(1)
    const newEnd = awardCoachEndorsement({
      coachSlug: 'zaheer-farooq-coach',
      coachName: 'Coach Zaheer Farooq',
      coachCertification: 'BCCI Level 2',
      traineeName: 'Samir Khan',
      traineeId: 'tr-03',
      badgeTitle: 'Verified Wicketkeeper Batsman',
      sport: 'Cricket',
      endorsementText: 'Remarkable glovework and reflex agility up to the stumps.',
    })
    expect(newEnd.verificationHash).toMatch(/^KG-CERT-ZAH-\d{5}$/)
    expect(getCoachEndorsements('zaheer-farooq-coach').some(e => e.id === newEnd.id)).toBe(true)

    const waEnd = generateWhatsAppEndorsementUrl(newEnd)
    expect(waEnd).toContain('https://wa.me/?text=')
    expect(waEnd).toContain(encodeURIComponent('OFFICIAL COACH VERIFIED ENDORSEMENT'))
  })
})
