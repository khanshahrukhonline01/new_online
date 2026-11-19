import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MyPassesVaultPage } from './MyPassesVaultPage'
import { clearAcademySaaSMemoryStore, createTrialPass } from '../academies/academySaaSClient'
import { clearTurfSlotMemoryStore, bookTurfSlot } from '../venues/turfSlotManager'
import { clearTournamentRegistrationsMemoryStore } from '../events/tournamentRegistrationManager'

describe('MyPassesVaultPage Unit Suite', () => {
  beforeEach(() => {
    clearAcademySaaSMemoryStore()
    clearTurfSlotMemoryStore()
    clearTournamentRegistrationsMemoryStore()
  })

  it('renders default digital pass vault when local storage is empty', () => {
    const html = renderToStaticMarkup(<MyPassesVaultPage />)
    expect(html).toContain('Digital Passes &amp; Gate Vouchers')
    expect(html).toContain('All Passes')
    expect(html).toContain('Academy Trials')
  })

  it('renders newly booked trial pass and turf booking in the vault', () => {
    createTrialPass({
      academySlug: 'delhi-fc',
      academyName: 'Delhi Football Academy',
      studentName: 'Aarav Choudhary',
      parentPhone: '9811223344',
      sport: 'Football',
      trialDate: '2026-11-28',
      reportingTime: '07:00 AM',
      venueAddress: 'Ambedkar Stadium, Delhi',
    })

    bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava',
      courtId: 'c1',
      courtName: 'Pitch 1',
      sport: 'Football',
      date: '2026-11-20',
      timeSlot: '08:00 PM – 09:00 PM',
      customerName: 'Sameer Sen',
      customerPhone: '9845012345',
      paymentMethod: 'upi_advance_paid',
      hourlyPrice: 1500,
      advanceDeposit: 300,
    })

    const html = renderToStaticMarkup(<MyPassesVaultPage />)
    expect(html).toContain('Aarav Choudhary · Trial Pass')
    expect(html).toContain('Pitch 1 (Football)')
    expect(html).toContain('Open Gate Pass')
    expect(html).toContain('Share Pass')
  })
})
