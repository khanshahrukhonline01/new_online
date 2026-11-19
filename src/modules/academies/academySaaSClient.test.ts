import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearAcademySaaSMemoryStore,
  getAcademyLeads,
  updateLeadStatus,
  addAcademyLead,
  getAcademyBatches,
  saveAcademyBatch,
  deleteAcademyBatch,
  getAcademyStudents,
  recordStudentPayment,
  createTrialPass,
  getAcademyTrialPasses,
  getAcademySaaSSummary,
  generateWhatsAppLeadRoutingUrl,
  generateWhatsAppFeeReminderUrl,
  generateUpiPayLink,
  getRegisteredAcademies,
  registerCustomAcademy,
  hasCompletedOnboarding,
} from './academySaaSClient'

describe('academySaaSClient Unit Suite', () => {
  beforeEach(() => {
    clearAcademySaaSMemoryStore()
  })

  it('retrieves default seed leads and filters by academySlug', () => {
    const bfcLeads = getAcademyLeads('bengaluru-fc-academy')
    expect(bfcLeads.length).toBeGreaterThan(0)
    expect(bfcLeads[0].academySlug).toBe('bengaluru-fc-academy')
    expect(bfcLeads[0].studentName).toBe('Aarav Sundaram')
  })

  it('adds a new academy lead and updates its status', () => {
    const newLead = addAcademyLead({
      academySlug: 'test-academy',
      parentName: 'Anita Gupta',
      parentPhone: '9876543210',
      studentName: 'Kabir Gupta',
      studentAge: 11,
      sport: 'Cricket',
      batchType: 'morning_grassroots',
      batchName: 'Morning Cricket Camp',
      requestType: 'free_trial',
      status: 'new',
      notes: 'Wants fast bowling training',
    })

    expect(newLead.id).toBeDefined()
    expect(newLead.enquiryToken).toContain('ENQ-CRI')

    const leads = getAcademyLeads('test-academy')
    expect(leads.length).toBe(1)
    expect(leads[0].studentName).toBe('Kabir Gupta')

    updateLeadStatus(newLead.id, 'trial_scheduled', 'Scheduled trial for Sunday 7am')
    const updatedLeads = getAcademyLeads('test-academy')
    expect(updatedLeads[0].status).toBe('trial_scheduled')
    expect(updatedLeads[0].notes).toContain('Scheduled trial for Sunday 7am')
  })

  it('manages batches: get, save, and delete', () => {
    const initialBatches = getAcademyBatches('bengaluru-fc-academy')
    expect(initialBatches.length).toBeGreaterThan(0)

    const newBatch = saveAcademyBatch({
      academySlug: 'test-academy',
      batchName: 'Evening Striker Clinic',
      sport: 'Football',
      days: 'Mon, Wed, Fri',
      timings: '05:00 PM – 07:00 PM',
      coachName: 'Coach John',
      ageGroup: 'U-17',
      monthlyFee: 2000,
      maxCapacity: 20,
      isActive: true,
    })

    expect(newBatch.id).toBeDefined()
    const testBatches = getAcademyBatches('test-academy')
    expect(testBatches.length).toBe(1)
    expect(testBatches[0].batchName).toBe('Evening Striker Clinic')

    deleteAcademyBatch(newBatch.id)
    const afterDelete = getAcademyBatches('test-academy')
    expect(afterDelete.length).toBe(0)
  })

  it('manages students and records monthly fee payment', () => {
    const students = getAcademyStudents('bengaluru-fc-academy')
    expect(students.length).toBeGreaterThan(0)

    const overdueStudent = students.find(s => s.feeStatus === 'overdue')
    expect(overdueStudent).toBeDefined()

    if (overdueStudent) {
      const updated = recordStudentPayment(overdueStudent.id, overdueStudent.monthlyFee, 'upi')
      expect(updated).not.toBeNull()
      expect(updated?.feeStatus).toBe('paid')
      expect(updated?.lastPaymentDate).toBeDefined()
    }
  })

  it('creates digital trial pass with verifiable QR code payload', () => {
    const pass = createTrialPass({
      academySlug: 'test-academy',
      academyName: 'Test Sports Academy',
      studentName: 'Vihaan Verma',
      parentPhone: '9988776655',
      sport: 'Badminton',
      trialDate: '2026-11-25',
      reportingTime: '06:30 AM',
      venueAddress: 'Kanteerava Indoor Stadium, Court 3',
    })

    expect(pass.id).toBeDefined()
    expect(pass.passNumber).toContain('PASS-BAD')
    expect(pass.qrCodePayload).toContain('https://khelgrid.com/verify-pass?id=')

    const allPasses = getAcademyTrialPasses('test-academy')
    expect(allPasses.length).toBe(1)
    expect(allPasses[0].studentName).toBe('Vihaan Verma')
  })

  it('generates WhatsApp lead routing URL with prefilled message', () => {
    const lead = {
      id: 'l1',
      academySlug: 'test',
      enquiryToken: 'ENQ-FTB-1234',
      parentName: 'Manoj Kumar',
      parentPhone: '9845011111',
      studentName: 'Aditya Kumar',
      studentAge: 10,
      sport: 'Football',
      batchType: 'weekend',
      batchName: 'Weekend Batch',
      requestType: 'free_trial' as const,
      status: 'new' as const,
      submittedAt: new Date().toISOString(),
    }

    const url = generateWhatsAppLeadRoutingUrl(lead, '9845022222')
    expect(url).toContain('https://wa.me/919845022222?text=')
    expect(url).toContain(encodeURIComponent('Aditya Kumar'))
    expect(url).toContain(encodeURIComponent('ENQ-FTB-1234'))
  })

  it('generates WhatsApp fee reminder URL and UPI pay deep-link', () => {
    const student = {
      id: 's1',
      academySlug: 'test',
      studentName: 'Rohan',
      parentName: 'Sanjay',
      parentPhone: '9876543210',
      batchId: 'b1',
      batchName: 'U-14 Cricket',
      sport: 'Cricket',
      monthlyFee: 2500,
      feeStatus: 'due_soon' as const,
      nextDueDate: '2026-11-25',
    }

    const reminderUrl = generateWhatsAppFeeReminderUrl(student, 'Apex Cricket Academy', 'apex@okhdfcbank')
    expect(reminderUrl).toContain('https://wa.me/919876543210?text=')
    expect(reminderUrl).toContain(encodeURIComponent('₹2,500'))
    expect(reminderUrl).toContain(encodeURIComponent('apex@okhdfcbank'))

    const upiLink = generateUpiPayLink({
      vpa: 'apex@okhdfcbank',
      name: 'Apex Cricket Academy',
      amount: 2500,
      note: 'Coaching Fee',
    })
    expect(upiLink).toBe('upi://pay?pa=apex%40okhdfcbank&pn=Apex%20Cricket%20Academy&am=2500&cu=INR&tn=Coaching%20Fee')
  })

  it('computes academy SaaS summary KPIs accurately', () => {
    const summary = getAcademySaaSSummary('bengaluru-fc-academy')
    expect(summary.totalLeads).toBeGreaterThan(0)
    expect(summary.totalBatches).toBeGreaterThan(0)
    expect(summary.totalStudents).toBeGreaterThan(0)
    expect(summary.collectionRate).toBeGreaterThanOrEqual(0)
    expect(summary.collectionRate).toBeLessThanOrEqual(100)
  })

  it('registers custom academy and tracks onboarding state', () => {
    const initial = getRegisteredAcademies()
    expect(initial.length).toBeGreaterThanOrEqual(4)
    expect(hasCompletedOnboarding()).toBe(false)

    const registered = registerCustomAcademy({
      name: 'Shivaji Cricket Academy',
      sport: 'Cricket',
      city: 'Pune',
      state: 'Maharashtra',
      directorName: 'Coach Anand Patil',
      directorWhatsApp: '9823012345',
      upiVpa: 'shivajiacademy@okaxis',
    })

    expect(registered.slug).toBe('shivaji-cricket-academy')
    expect(registered.isCustom).toBe(true)
    expect(hasCompletedOnboarding()).toBe(true)

    const all = getRegisteredAcademies()
    expect(all.some(a => a.slug === 'shivaji-cricket-academy')).toBe(true)
  })
})
