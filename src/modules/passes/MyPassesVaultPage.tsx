import { useState, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { QrPassCardPanel } from '../../shared/components/workflows/QrPassCardPanel'
import { getAllAcademyTrialPasses, type AcademyTrialPass } from '../academies/academySaaSClient'
import { getAllTurfBookings, type TurfBookingRecord } from '../venues/turfSlotManager'
import { getTournamentRegistrations, type TournamentTeamRegistration } from '../events/tournamentRegistrationManager'
import { getUserVenueBookings } from '../../shared/payments/paymentService'
import './MyPassesVaultPage.css'

export interface MyPassesVaultPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

type PassCategoryFilter = 'all' | 'trials' | 'turf' | 'tournaments'

interface UnifiedVaultItem {
  id: string
  token: string
  category: 'trials' | 'turf' | 'tournaments'
  categoryLabel: string
  title: string
  subtitle: string
  holder: string
  contactPhone: string
  sport: string
  date: string
  time: string
  venue: string
  status: string
  statusLabel: string
  qrPayload: string
  instructions?: string
  checkedInAt?: string
}

export function MyPassesVaultPage({ onNavigate }: MyPassesVaultPageProps) {
  const [activeTab, setActiveTab] = useState<PassCategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Load passes from local stores
  const rawTrialPasses = useMemo(() => getAllAcademyTrialPasses(), [])
  const rawTurfBookings = useMemo(() => getAllTurfBookings(), [])
  const rawTournaments = useMemo(() => getTournamentRegistrations(), [])
  const rawVenueBookings = useMemo(() => getUserVenueBookings(), [])

  // Map into unified vault items
  const allVaultItems: UnifiedVaultItem[] = useMemo(() => {
    const list: UnifiedVaultItem[] = []

    // 1. Academy Trials
    rawTrialPasses.forEach((p: AcademyTrialPass) => {
      list.push({
        id: p.id,
        token: p.passNumber,
        category: 'trials',
        categoryLabel: 'Academy Selection Trial',
        title: `${p.studentName} · Trial Pass`,
        subtitle: p.academyName,
        holder: p.studentName,
        contactPhone: p.parentPhone,
        sport: p.sport,
        date: p.trialDate,
        time: p.reportingTime,
        venue: p.venueAddress,
        status: p.status,
        statusLabel: p.status === 'used' ? 'Admitted on Ground' : 'Valid Entry Pass',
        qrPayload: p.qrCodePayload,
        instructions: p.reportingInstructions,
        checkedInAt: p.checkedInAt,
      })
    })

    // 2. Turf Bookings
    rawTurfBookings.forEach((b: TurfBookingRecord) => {
      list.push({
        id: b.bookingId,
        token: b.bookingId,
        category: 'turf',
        categoryLabel: 'Turf Court Voucher',
        title: `${b.courtName} (${b.sport})`,
        subtitle: b.venueName,
        holder: b.customerName,
        contactPhone: b.customerPhone,
        sport: b.sport,
        date: b.slotDate,
        time: b.slotTime,
        venue: `${b.venueName} · ${b.courtName}`,
        status: b.checkedInAt ? 'used' : 'valid',
        statusLabel: b.checkedInAt ? 'Admitted at Pitch' : 'Confirmed Booking',
        qrPayload: b.qrCodePayload,
        instructions: `Advance paid: ₹${b.paidAmount}. Balance due at ground: ₹${b.balanceAmount}.`,
        checkedInAt: b.checkedInAt,
      })
    })

    // 2b. Venue Slot Bookings
    rawVenueBookings.forEach(vb => {
      const token = vb.bookingRef || vb.voucherToken
      if (!token || list.some(i => i.token.toUpperCase() === token.toUpperCase())) return
      const isCheckedIn = Boolean((vb as unknown as { checkedInAt?: string }).checkedInAt)
      list.push({
        id: token,
        token: token,
        category: 'turf',
        categoryLabel: 'Turf Court Voucher',
        title: `${vb.venueName || 'Sports Venue'} · Court ${vb.courtNumber || 1}`,
        subtitle: vb.venueName || 'KhelGrid Partner Venue',
        holder: vb.customerName || 'Verified Player',
        contactPhone: 'Masked',
        sport: vb.sport || 'Sports Turf',
        date: vb.slotDate || 'Confirmed Date',
        time: vb.slotTime || 'Confirmed Slot',
        venue: `${vb.venueName || 'Sports Venue'}${vb.city ? `, ${vb.city}` : ''}`,
        status: isCheckedIn ? 'used' : 'valid',
        statusLabel: isCheckedIn ? 'Admitted at Pitch' : 'Confirmed Booking',
        qrPayload: `https://khelgrid.com/verify-pass?id=${token}`,
        instructions: `Advance paid: ₹${vb.paidAmount || 0}. Show voucher at reception.`,
        checkedInAt: (vb as unknown as { checkedInAt?: string }).checkedInAt,
      })
    })

    // 3. Tournament Registrations
    rawTournaments.forEach((t: TournamentTeamRegistration) => {
      list.push({
        id: t.id,
        token: t.passNumber,
        category: 'tournaments',
        categoryLabel: 'Tournament Match Pass',
        title: `${t.teamName} (${t.roster.length} Players)`,
        subtitle: t.tournamentTitle,
        holder: `Captain: ${t.captainName}`,
        contactPhone: t.captainPhone,
        sport: t.sport,
        date: t.reportingDate,
        time: 'Match Day Check-In',
        venue: `${t.reportingVenue}, ${t.city}`,
        status: t.checkedInAt ? 'used' : 'valid',
        statusLabel: t.checkedInAt ? 'Team Admitted' : 'Roster Cleared',
        qrPayload: t.qrCodePayload,
        instructions: 'Present roster pass at table reception for referee verification.',
        checkedInAt: t.checkedInAt,
      })
    })

    return list
  }, [rawTrialPasses, rawTurfBookings, rawTournaments, rawVenueBookings])

  // Filter items
  const filteredItems = useMemo(() => {
    return allVaultItems.filter(item => {
      if (activeTab !== 'all' && item.category !== activeTab) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchesToken = item.token.toLowerCase().includes(q)
        const matchesHolder = item.holder.toLowerCase().includes(q)
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesSport = item.sport.toLowerCase().includes(q)
        const matchesPhone = item.contactPhone.includes(q)
        if (!matchesToken && !matchesHolder && !matchesTitle && !matchesSport && !matchesPhone) return false
      }
      return true
    })
  }, [allVaultItems, activeTab, searchQuery])

  const getWhatsAppShareUrl = (item: UnifiedVaultItem) => {
    const text = [
      `*KhelGrid Digital Entry Pass* 🎟️`,
      ``,
      `Pass Token: *#${item.token}*`,
      `Event: *${item.title}* (${item.sport})`,
      `Facility: ${item.subtitle}`,
      `Date & Time: ${item.date} · ${item.time}`,
      `Venue: ${item.venue}`,
      ``,
      `Verify Pass on Ground: https://khelgrid.com/verify-pass?id=${item.token}`,
      ``,
      `_Issued via KhelGrid Sports Network_`,
    ].join('\n')

    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="passes-vault-container">
      {/* Header */}
      <header className="passes-vault-header">
        <div className="passes-vault-badge">
          <SiteIcon name="shield-check" size={14} />
          <span>My Passes &amp; Booking Vault</span>
        </div>
        <h1 className="passes-vault-title">Digital Passes &amp; Gate Vouchers</h1>
        <p className="passes-vault-subtitle">
          Your active academy selection trial passes, turf court booking vouchers, and tournament match credentials with verified QR codes.
        </p>
      </header>

      {/* Filter Ribbon */}
      <section className="passes-filter-card" aria-label="Pass search and filters">
        <div className="passes-search-row">
          <input
            type="text"
            className="passes-search-input"
            placeholder="Search by Pass ID (#PASS-, #TRF-), athlete name, or sport…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Filter passes"
          />
          {searchQuery && (
            <button
              type="button"
              className="ticket-action-btn btn-outline"
              onClick={() => setSearchQuery('')}
              style={{ flex: 'none' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="passes-tabs-bar" role="tablist">
          <button
            type="button"
            className={`passes-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('all')}
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            All Passes ({allVaultItems.length})
          </button>
          <button
            type="button"
            className={`passes-tab-btn ${activeTab === 'trials' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('trials')}
            role="tab"
            aria-selected={activeTab === 'trials'}
          >
            Academy Trials ({allVaultItems.filter(i => i.category === 'trials').length})
          </button>
          <button
            type="button"
            className={`passes-tab-btn ${activeTab === 'turf' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('turf')}
            role="tab"
            aria-selected={activeTab === 'turf'}
          >
            Turf Bookings ({allVaultItems.filter(i => i.category === 'turf').length})
          </button>
          <button
            type="button"
            className={`passes-tab-btn ${activeTab === 'tournaments' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
            role="tab"
            aria-selected={activeTab === 'tournaments'}
          >
            Tournament Match Passes ({allVaultItems.filter(i => i.category === 'tournaments').length})
          </button>
        </div>
      </section>

      {/* Passes Grid */}
      {filteredItems.length > 0 ? (
        <div className="passes-grid">
          {filteredItems.map(item => (
            <QrPassCardPanel
              key={item.id}
              pass={{
                token: item.token,
                title: item.title,
                subtitle: `${item.categoryLabel} · ${item.subtitle}`,
                holder: item.holder,
                sport: item.sport,
                venue: item.venue,
                scheduleLabel: `${item.date} · ${item.time}`,
                status: item.status === 'used' ? 'used' : 'valid',
                statusLabel: item.statusLabel,
                qrPayload: item.qrPayload,
              }}
              note={item.instructions}
              actionsSlot={
                <>
                  <a
                    href={`/verify-pass?id=${encodeURIComponent(item.token)}`}
                    onClick={e => onNavigate?.(e, `/verify-pass?id=${encodeURIComponent(item.token)}`)}
                    className="ticket-action-btn btn-primary"
                  >
                    <SiteIcon name="arrow-up-right" size={15} />
                    <span>Open Gate Pass</span>
                  </a>
                  <a
                    href={getWhatsAppShareUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ticket-action-btn btn-wa"
                  >
                    <SiteIcon name="share" size={15} />
                    <span>Share Pass</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print()
                      }
                    }}
                    className="ticket-action-btn btn-outline"
                  >
                    <SiteIcon name="file-text" size={15} />
                    <span>Print PDF</span>
                  </button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SiteIcon name="shield-check" size={32} />}
          title={allVaultItems.length === 0 ? 'No digital passes in your vault yet' : 'No passes match your search'}
          description="Book a turf court or apply for an academy trial to store verifiable QR gate passes here."
          action={
            <>
              <a href="/academies" onClick={e => onNavigate?.(e, '/academies')} className="kg-btn kg-btn-primary kg-touch-target">
                Explore Academies
              </a>
              <a href="/venues" onClick={e => onNavigate?.(e, '/venues')} className="kg-btn kg-touch-target">
                Book a Turf Court
              </a>
            </>
          }
        />
      )}
    </div>
  )
}
