import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateKhelId,
  calculateOverallRating,
  computeFitnessTier,
  formatIndianDateTime,
  generateDossierReference,
  createFreshGenerationRecord,
  saveGenerationRecord,
  getStoredGenerationRecord,
  getGenerationHistory,
  clearGenerationRecords,
} from './khelId'
import type { AthleteProfile } from '../domain'

describe('khelId Utilities & Dossier Generation Audit', () => {
  beforeEach(() => {
    clearGenerationRecords()
  })

  it('generates standardized Digital Khel ID with state code and serial', () => {
    const id1 = generateKhelId({ state: 'Delhi', username: 'rohit-v' })
    expect(id1).toMatch(/^KG-2026-DEL-\d{5}$/)

    const id2 = generateKhelId({ state: 'Maharashtra', username: 'priya-s' })
    expect(id2).toMatch(/^KG-2026-MH-\d{5}$/)

    const id3 = generateKhelId({ state: 'Unknown Region', username: 'arjun-k' })
    expect(id3).toMatch(/^KG-2026-IND-\d{5}$/)

    // Existing Khel ID preserved
    expect(generateKhelId({ username: 'test', khelId: 'KG-2026-DEL-12345' })).toBe('KG-2026-DEL-12345')
  })

  it('computes athletic combine tier and percentiles accurately', () => {
    const elite = computeFitnessTier({
      yoyoIr1Meters: 2200,
      sprint30mSeconds: 3.9,
      cmjHeightCm: 62,
    })
    expect(elite.percentileAvg).toBeGreaterThanOrEqual(85)
    expect(elite.tier).toContain('Tier 1')

    const competitive = computeFitnessTier({
      yoyoIr1Meters: 1600,
      sprint30mSeconds: 4.25,
      cmjHeightCm: 48,
    })
    expect(competitive.tier).toContain('Tier 2')

    const tier3 = computeFitnessTier({
      yoyoIr1Meters: 1400,
      sprint30mSeconds: 4.4,
      cmjHeightCm: 42,
    })
    expect(tier3.tier).toContain('Tier 3')
  })

  it('calculates overall FIFA-style rating bounded between 76 and 98', () => {
    const mockProfile: AthleteProfile = {
      id: 'test-1',
      username: 'rohit-v',
      fullName: 'Rohit Verma',
      sport: 'Cricket',
      playingPosition: 'Fast Bowler',
      city: 'Delhi',
      achievements: [{ year: '2025', event: 'State Cup', result: 'Gold' }],
      videoClips: [],
      verificationStatus: 'verified',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      fitnessBenchmarks: {
        percentileAvg: 90,
      },
    }
    const ovr = calculateOverallRating(mockProfile)
    expect(ovr).toBeGreaterThanOrEqual(76)
    expect(ovr).toBeLessThanOrEqual(98)
  })

  it('formats dates consistently in Indian Standard Time (IST)', () => {
    const date = new Date('2026-11-15T09:10:00.000Z')
    const formatted = formatIndianDateTime(date)
    expect(formatted).toContain('2026')
    expect(formatted).toContain('IST')
  })

  it('generates a distinct Dossier Reference ID adhering to KG-DOS-YYYYMMDD-XXXX', () => {
    const ref = generateDossierReference({ seed: 'test-seed' })
    expect(ref).toMatch(/^KG-DOS-\d{8}-[A-F0-9]{4}$/)
  })

  it('creates fresh generation record with incremented revision and current timestamp', () => {
    const rec1 = createFreshGenerationRecord({
      athleteName: 'Rohit Verma',
      khelId: 'KG-2026-DEL-48291',
      sport: 'Cricket',
      previousRevision: 0,
    })

    expect(rec1.revisionNumber).toBe(1)
    expect(rec1.referenceId).toMatch(/^KG-DOS-/)
    expect(rec1.athleteName).toBe('Rohit Verma')
    expect(rec1.khelId).toBe('KG-2026-DEL-48291')
    expect(rec1.season).toContain('2026')
    expect(rec1.formattedDateTime).toContain('IST')

    // Generating fresh revision increments revision number
    const rec2 = createFreshGenerationRecord({
      athleteName: 'Rohit Verma',
      khelId: 'KG-2026-DEL-48291',
      sport: 'Cricket',
      previousRevision: rec1.revisionNumber,
    })

    expect(rec2.revisionNumber).toBe(2)
    expect(rec2.referenceId).not.toBe(rec1.referenceId)
  })

  it('persists, retrieves, and maintains historical generation records in localStorage', () => {
    expect(getStoredGenerationRecord()).toBeNull()
    expect(getGenerationHistory()).toHaveLength(0)

    const rec1 = createFreshGenerationRecord({
      athleteName: 'Rohit Verma',
      khelId: 'KG-2026-DEL-48291',
      sport: 'Cricket',
      previousRevision: 0,
    })
    saveGenerationRecord(rec1)

    const stored = getStoredGenerationRecord()
    expect(stored).not.toBeNull()
    expect(stored?.referenceId).toBe(rec1.referenceId)
    expect(stored?.revisionNumber).toBe(1)

    // Second fresh generation
    const rec2 = createFreshGenerationRecord({
      athleteName: 'Rohit Verma',
      khelId: 'KG-2026-DEL-48291',
      sport: 'Cricket',
      previousRevision: 1,
    })
    saveGenerationRecord(rec2)

    const updated = getStoredGenerationRecord()
    expect(updated?.referenceId).toBe(rec2.referenceId)
    expect(updated?.revisionNumber).toBe(2)

    const history = getGenerationHistory()
    expect(history).toHaveLength(2)
    expect(history[0].referenceId).toBe(rec2.referenceId)
    expect(history[1].referenceId).toBe(rec1.referenceId)

    // Clear
    clearGenerationRecords()
    expect(getStoredGenerationRecord()).toBeNull()
    expect(getGenerationHistory()).toHaveLength(0)
  })
})
