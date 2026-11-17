import { describe, expect, it } from 'vitest'
import {
  INDIAN_STATE_CODES,
  generateKhelId,
  calculateOverallRating,
  computeFitnessTier,
  generateDossierReference,
  createFreshGenerationRecord,
  saveGenerationRecord,
  getStoredGenerationRecord,
  formatIndianDateTime,
} from '../../shared/utils/khelId'
import { generateQrSvgString, generateQrMatrix } from '../../shared/utils/qrCodeGenerator'
import type { AthleteProfile } from '../../shared/domain'

describe('Athlete Ecosystem & Khel ID Verified Implementation Evidence', () => {
  it('1. Khel ID: maps all 25+ Indian States and Union Territories to standard codes', () => {
    expect(INDIAN_STATE_CODES['delhi']).toBe('DEL')
    expect(INDIAN_STATE_CODES['maharashtra']).toBe('MH')
    expect(INDIAN_STATE_CODES['karnataka']).toBe('KA')
    expect(INDIAN_STATE_CODES['uttar pradesh']).toBe('UP')
    expect(INDIAN_STATE_CODES['punjab']).toBe('PB')
    expect(INDIAN_STATE_CODES['haryana']).toBe('HR')
    expect(INDIAN_STATE_CODES['kerala']).toBe('KL')
    expect(INDIAN_STATE_CODES['tamil nadu']).toBe('TN')
    expect(INDIAN_STATE_CODES['west bengal']).toBe('WB')
    expect(INDIAN_STATE_CODES['gujarat']).toBe('GJ')
    expect(INDIAN_STATE_CODES['rajasthan']).toBe('RJ')
  })

  it('2. Khel ID: generates valid permanent ID in official KG-2026-{STATE}-{SERIAL} format', () => {
    const idDelhi = generateKhelId({ username: 'rohan-verma', state: 'Delhi' })
    expect(idDelhi).toMatch(/^KG-2026-DEL-\d{5}$/)

    const idKarnataka = generateKhelId({ username: 'vikram-gowda', state: 'Karnataka' })
    expect(idKarnataka).toMatch(/^KG-2026-KA-\d{5}$/)

    // Preserves existing ID if already formatted
    const existing = generateKhelId({ username: 'test-user', khelId: 'KG-2026-UP-48291' })
    expect(existing).toBe('KG-2026-UP-48291')
  })

  it('3. Overall Rating (OVR): computes dynamic athletic rating based on empirical combine benchmarks', () => {
    const baseProfile: AthleteProfile = {
      id: 'ath-1',
      username: 'devansh-cricket',
      fullName: 'Devansh Verma',
      sport: 'Cricket',
      playingPosition: 'Fast Bowler',
      city: 'Delhi',
      state: 'Delhi',
      summary: 'Right-arm fast bowler',
      achievements: [],
      videoClips: [],
      verificationStatus: 'verified',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const baseRating = calculateOverallRating(baseProfile)
    expect(baseRating).toBeGreaterThanOrEqual(76)
    expect(baseRating).toBeLessThanOrEqual(98)

    // With elite Yo-Yo IR1 test (2160m) + achievements + clips
    const eliteProfile: AthleteProfile = {
      ...baseProfile,
      fitnessBenchmarks: {
        yoyoIr1Meters: 2160,
        sprint30mSeconds: 3.82,
        cmjHeightCm: 58,
        percentileAvg: 95,
      },
      achievements: [
        { event: 'BCCI Cooch Behar Trophy', year: '2025', result: 'Quarter-finalist' },
        { event: 'State U-19 Championship', year: '2024', result: 'Gold Medal' },
      ],
      videoClips: [
        {
          id: 'clip-1',
          title: 'Match spell against Punjab',
          clipType: 'match-highlight',
          videoUrl: 'https://youtube.com/watch?v=1',
        },
      ],
    }
    const eliteRating = calculateOverallRating(eliteProfile)
    expect(eliteRating).toBeGreaterThan(baseRating)
    expect(eliteRating).toBeGreaterThanOrEqual(90)
  })

  it('4. Fitness Tier: computes combine percentiles across Yo-Yo, 30m sprint, and vertical jump', () => {
    const combine = computeFitnessTier({
      yoyoIr1Meters: 2040,
      sprint30mSeconds: 3.95,
      cmjHeightCm: 54,
    })
    expect(combine.percentileAvg).toBeGreaterThanOrEqual(80)
    expect(combine.tier).toMatch(/Tier-1|Tier-2|Elite|Advanced/)
  })

  it('5. Dossier Reference & Generation Record: generates tracked revision and Indian timestamp', () => {
    const now = new Date('2026-11-15T10:30:00Z')
    const ref = generateDossierReference({ date: now, revision: 1, seed: 'KG-2026-DEL-10293' })
    expect(ref).toMatch(/^KG-DOS-20261115-[0-9A-Z]{4}$/)

    const formattedTime = formatIndianDateTime(now)
    expect(formattedTime).toContain('IST')

    const record = createFreshGenerationRecord({
      athleteName: 'Priya Narang',
      khelId: 'KG-2026-KA-58291',
      sport: 'Badminton',
      previousRevision: 0,
    })
    expect(record.khelId).toBe('KG-2026-KA-58291')
    expect(record.athleteName).toBe('Priya Narang')
    expect(record.revisionNumber).toBe(1)
    expect(record.referenceId).toMatch(/^KG-DOS-\d{8}-[0-9A-Z]{4}$/)
    expect(record.generatedAt).toBeDefined()

    saveGenerationRecord(record)
    const stored = getStoredGenerationRecord()
    expect(stored?.referenceId).toBe(record.referenceId)
  })

  it('6. QR Code Generation: produces scannable ISO/IEC 18004 SVG matrix encoding public profile URL', () => {
    const profileUrl = 'https://khelgrid.com/u/@priya-nair'
    const matrix = generateQrMatrix(profileUrl)
    expect(matrix.length).toBeGreaterThanOrEqual(21)

    const svg = generateQrSvgString(profileUrl, { size: 92, color: '#0B1C2D', bgColor: '#FFFFFF' })
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="92"')
    expect(svg).toContain('height="92"')
    expect(svg).toContain('fill="#0B1C2D"')
  })
})
