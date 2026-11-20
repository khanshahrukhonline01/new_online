import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GateCheckInPage } from './GateCheckInPage'
import { clearGateAdmissionLog } from './passVerifierService'
import { clearAcademySaaSMemoryStore } from '../academies/academySaaSClient'
import { clearTurfSlotMemoryStore } from '../venues/turfSlotManager'
import { clearTournamentRegistrationsMemoryStore } from '../events/tournamentRegistrationManager'

describe('GateCheckInPage UI Suite', () => {
  beforeEach(() => {
    clearGateAdmissionLog()
    clearAcademySaaSMemoryStore()
    clearTurfSlotMemoryStore()
    clearTournamentRegistrationsMemoryStore()
  })

  it('renders gate check-in scanner header and demo pass buttons', () => {
    const html = renderToStaticMarkup(<GateCheckInPage />)
    expect(html).toContain('Official On-Ground Verification Desk')
    expect(html).toContain('Gate Pass &amp; Check-In Scanner')
    expect(html).toContain('Verify Credential')
    expect(html).toContain('Scan QR')
    expect(html).toContain('PASS-CRI-DEMO (Academy Trial)')
    expect(html).toContain('TRF-FTB-DEMO (Turf Booking)')
  })

  it('renders preloaded pass card when initialToken is passed', () => {
    const html = renderToStaticMarkup(<GateCheckInPage initialToken="PASS-CRI-DEMO" />)
    expect(html).toContain('#PASS-CRI-DEMO')
    expect(html).toContain('Selection Trial Pass · Cricket U-16 Squad')
    expect(html).toContain('Karnataka Institute of Cricket (KIOC)')
    expect(html).toContain('Dhruv Jaiswal (Age: 15)')
    expect(html).toContain('Admit Candidate / Check In')
    expect(html).toContain('Offline Mode')
    expect(html).toContain('Today&#x27;s Gate Admission Log')
  })
})
