import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  lookupVerificationStatus,
  submitVerificationRequest,
} from './verificationData'
import { AthleteVerificationPage } from './AthleteVerificationPage'

describe('Athlete Verification Module', () => {
  it('contains pre-seeded official verification records across tiers', () => {
    const verifiedRecord = lookupVerificationStatus('KG-VERIF-78291')
    expect(verifiedRecord).toBeDefined()
    expect(verifiedRecord?.status).toBe('verified')
    expect(verifiedRecord?.athleteName).toBe('Rohan Sharma')
    expect(verifiedRecord?.federationId).toBe('AFI-DL-2024-9182')

    const inReviewRecord = lookupVerificationStatus('KG-VERIF-64103')
    expect(inReviewRecord).toBeDefined()
    expect(inReviewRecord?.status).toBe('in_review')

    const actionReqRecord = lookupVerificationStatus('KG-VERIF-51928')
    expect(actionReqRecord).toBeDefined()
    expect(actionReqRecord?.status).toBe('action_required')
  })

  it('submits a new verification request and retrieves it from lookup', () => {
    const record = submitVerificationRequest({
      athleteName: 'Vikas Kumar',
      dob: '2008-04-12',
      gender: 'Male',
      city: 'Meerut',
      state: 'Uttar Pradesh',
      phone: '9876543210',
      email: 'vikas@example.com',
      documentType: 'Aadhaar Card',
      maskedDocNumber: 'XXXX-XXXX-9901',
      sport: 'Athletics',
      federationAuthority: 'AFI (Athletics Federation of India)',
      federationId: 'AFI-UP-2026-1102',
      academyOrClub: 'Bhamashah Sports Academy',
      competitionLevel: 'National Junior Championship',
      certificateNo: 'AFI/NJAC/2026/V-88',
      yearOfAchievement: '2026',
      resultPosition: 'Gold Medal / 1st Place',
    })

    expect(record.referenceId).toMatch(/^KG-VERIF-\d+$/)
    expect(record.status).toBe('submitted')

    const lookedUp = lookupVerificationStatus(record.referenceId)
    expect(lookedUp).toBeDefined()
    expect(lookedUp?.athleteName).toBe('Vikas Kumar')
  })

  it('renders AthleteVerificationPage markup with intake steps and lookup desk', () => {
    const markup = renderToStaticMarkup(<AthleteVerificationPage />)

    expect(markup).toContain('Athlete Verification Badge Desk.')
    expect(markup).toContain('1,240+')
    expect(markup).toContain('Submit 3-Step Verification Dossier')
    expect(markup).toContain('Step 1 of 3: Identity &amp; Age Authenticity')
    expect(markup).toContain('Verify Badge / Check Status.')
    expect(markup).toContain('KG-VERIF-78291')
    expect(markup).toContain('Rohan Sharma')
    expect(markup).toContain('AFI-DL-2024-9182')
  })
})
