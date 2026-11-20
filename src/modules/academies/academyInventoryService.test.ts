import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearAcademyInventoryMemoryStore,
  getAcademyKitDistributions,
  saveAcademyKitDistribution,
  getAcademyEquipment,
  checkoutEquipment,
  returnEquipment,
  getAcademyStaffSafeguarding,
  saveStaffSafeguarding,
  getAcademySafetyIncidents,
  recordSafetyIncident,
} from './academyInventoryService'

describe('Academy Operations: Kit Locker, Equipment & Safeguarding Service', () => {
  beforeEach(() => {
    clearAcademyInventoryMemoryStore()
  })

  it('retrieves default kit distributions and saves new kit allocation', () => {
    const kits = getAcademyKitDistributions('delhi-football-academy')
    expect(kits.length).toBeGreaterThan(0)

    const saved = saveAcademyKitDistribution({
      academySlug: 'delhi-football-academy',
      studentId: 'st-99',
      studentName: 'Rohan Sharma',
      batchName: 'Morning U-15 Elite Batch',
      squadNumber: 11,
      jerseySize: 'M',
      hasShorts: true,
      hasSocks: true,
      status: 'ALLOCATED',
    })

    expect(saved.id).toBeDefined()
    expect(saved.squadNumber).toBe(11)

    const updated = getAcademyKitDistributions('delhi-football-academy')
    expect(updated.some(k => k.studentName === 'Rohan Sharma')).toBe(true)
  })

  it('manages equipment checkout and returns with accurate stock tracking', () => {
    const equipment = getAcademyEquipment('delhi-football-academy')
    expect(equipment.length).toBeGreaterThan(0)
    const footballs = equipment.find(e => e.category === 'BALLS')!
    const initialAvail = footballs.availableQuantity

    const checkoutRes = checkoutEquipment(footballs.id, 4, 'Coach Rajesh')
    expect(checkoutRes.success).toBe(true)
    expect(checkoutRes.item?.availableQuantity).toBe(initialAvail - 4)

    const returnRes = returnEquipment(footballs.id, 2)
    expect(returnRes.success).toBe(true)
    expect(returnRes.item?.availableQuantity).toBe(initialAvail - 2)
  })

  it('rejects checkout when requested quantity exceeds available stock', () => {
    const equipment = getAcademyEquipment('delhi-football-academy')
    const firstAid = equipment.find(e => e.category === 'FIRST_AID')!
    const checkoutRes = checkoutEquipment(firstAid.id, 100, 'Coach Test')
    expect(checkoutRes.success).toBe(false)
    expect(checkoutRes.message).toContain('exceeds')
  })

  it('tracks staff police verification and POCSO child safeguarding compliance', () => {
    const staff = getAcademyStaffSafeguarding('delhi-football-academy')
    expect(staff.length).toBeGreaterThan(0)
    expect(staff[0].policeVerificationStatus).toBe('VERIFIED')

    const newStaff = saveStaffSafeguarding({
      academySlug: 'delhi-football-academy',
      staffName: 'Amit Saxena',
      role: 'ASST_COACH',
      policeVerificationStatus: 'IN_PROGRESS',
      pocsoTrainingCompleted: true,
      firstAidCertified: false,
      contactPhone: '+919988776655',
    })

    expect(newStaff.id).toBeDefined()
    const updated = getAcademyStaffSafeguarding('delhi-football-academy')
    expect(updated.some(s => s.staffName === 'Amit Saxena')).toBe(true)
  })

  it('logs safety and medical incidents with RTP clearance tracking', () => {
    const incidents = getAcademySafetyIncidents('delhi-football-academy')
    expect(incidents.length).toBeGreaterThan(0)

    const newInc = recordSafetyIncident({
      academySlug: 'delhi-football-academy',
      studentName: 'Kabir Mehta',
      batchName: 'Evening Grassroots Juniors',
      incidentType: 'HEAT_EXHAUSTION',
      description: 'Dizziness during afternoon summer conditioning.',
      firstAidAdministered: 'Moved to shaded hydration tent, ORS and electrolytes administered.',
      doctorConsulted: false,
      rtpClearance: 'RESTRICTED',
      status: 'OPEN',
    })

    expect(newInc.id).toBeDefined()
    expect(newInc.rtpClearance).toBe('RESTRICTED')
    const updated = getAcademySafetyIncidents('delhi-football-academy')
    expect(updated[0].studentName).toBe('Kabir Mehta')
  })
})
