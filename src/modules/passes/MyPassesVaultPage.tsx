import { useState, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
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

    // Preseed sample pass if user has none yet so page is illustrative
    if (list.length === 0) {
      list.push({
        id: 'sample-trial-1',
        token: 'PASS-CRI-DEMO',
        category: 'trials',
        categoryLabel: 'Academy Selection Trial',
        title: 'Dhruv Jaiswal · Fast Bowling Trial',
        subtitle: 'Karnataka Institute of Cricket (KIOC)',
        holder: 'Dhruv Jaiswal (Age: 15)',
        contactPhone: '9845012345',
        sport: 'Cricket',
        date: '2026-11-22',
        time: '06:30 AM',
        venue: 'KIOC Grounds, Shivaji Nagar, Bengaluru',
        status: 'valid',
        statusLabel: 'Valid for Entry',
        qrPayload: 'https://khelgrid.com/verify-pass?id=PASS-CRI-DEMO&sport=Cricket',
        instructions: 'Wear complete white cricket kit and report 15 mins before session start.',
      })
    }

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
            <article key={item.id} className="ticket-card">
              {/* Header Gradient */}
              <div className={`ticket-header type-${item.category}`}>
                <div>
                  <span className="ticket-type-label">{item.categoryLabel}</span>
                  <h2 className="ticket-title">{item.title}</h2>
                  <div style={{ fontSize: '0.825rem', opacity: 0.9, marginTop: '0.2rem' }}>{item.subtitle}</div>
                </div>
                <span className="ticket-token-badge">#{item.token}</span>
              </div>

              {/* Body */}
              <div className="ticket-body">
                {/* QR Code and Info */}
                <div className="ticket-qr-row">
                  <div
                    className="ticket-qr-svg"
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(item.qrPayload, {
                        size: 82,
                        color: item.category === 'trials' ? '#059669' : item.category === 'turf' ? '#2563eb' : '#701a75',
                        bgColor: '#ffffff',
                      }),
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      Status
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: item.status === 'used' ? '#d97706' : '#059669' }}>
                      {item.statusLabel}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                      Show this vector QR pass at reception for instant check-in.
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="ticket-meta-grid">
                  <div className="ticket-meta-col">
                    <span className="ticket-meta-label">Candidate / Team</span>
                    <span className="ticket-meta-val">{item.holder}</span>
                  </div>
                  <div className="ticket-meta-col">
                    <span className="ticket-meta-label">Sport</span>
                    <span className="ticket-meta-val">{item.sport}</span>
                  </div>
                  <div className="ticket-meta-col">
                    <span className="ticket-meta-label">Date &amp; Time</span>
                    <span className="ticket-meta-val">{item.date} · {item.time}</span>
                  </div>
                  <div className="ticket-meta-col">
                    <span className="ticket-meta-label">Venue</span>
                    <span className="ticket-meta-val" style={{ fontSize: '0.85rem' }}>{item.venue}</span>
                  </div>
                </div>

                {item.instructions && (
                  <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', color: '#475569' }}>
                    <strong>Note:</strong> {item.instructions}
                  </div>
                )}

                {/* Actions */}
                <div className="ticket-actions-bar">
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
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#ffffff', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
          <SiteIcon name="shield-check" size={40} />
          <h3 style={{ margin: '1rem 0 0.5rem', color: '#0f172a' }}>No passes match your search</h3>
          <p style={{ color: '#64748b', margin: '0 auto 1.5rem', maxWidth: '420px', fontSize: '0.9rem' }}>
            Book a turf court, apply for an academy trial, or clear your search query to see passes here.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/academies" onClick={e => onNavigate?.(e, '/academies')} className="ticket-action-btn btn-primary">
              Explore Academies
            </a>
            <a href="/venues" onClick={e => onNavigate?.(e, '/venues')} className="ticket-action-btn btn-outline">
              Book a Turf Court
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
