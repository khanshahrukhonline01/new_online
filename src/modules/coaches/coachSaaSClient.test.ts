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
  getCoachSaaSSummary,
  registerCustomCoach,
  confirmAndVerifyCoach,
  revokeCoachVerification,
  generateWhatsAppParentReplyUrl,
  generateWhatsAppTraineeFeeReminderUrl,
  generateUpiPayLink,
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
})
