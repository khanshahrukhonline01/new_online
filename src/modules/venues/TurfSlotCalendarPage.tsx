import { useState, useEffect, type MouseEvent, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import {
  getTurfCourts,
  getTurfSlots,
  bookTurfSlot,
  toggleSlotBlocked,
  cancelTurfBooking,
  getTurfVenueSettings,
  saveTurfVenueSettings,
  generateWhatsAppTurfConfirmationUrl,
  generateTurfUpiPayLink,
  getTurfDayKpis,
  type TurfCourt,
  type TurfSlot,
  type TurfBookingRecord,
} from './turfSlotManager'
import './TurfSlotCalendarPage.css'

export interface TurfSlotCalendarPageProps {
  initialVenueSlug?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const CURATED_TURF_VENUES = [
  { slug: 'sree-kanteerava-stadium', name: 'Sree Kanteerava Stadium', city: 'Bengaluru', sport: 'Football, Box Cricket & Badminton' },
  { slug: 'talkatora-indoor-stadium', name: 'Talkatora Indoor Stadium', city: 'Delhi', sport: 'Badminton & Table Tennis' },
  { slug: 'andheri-sports-complex', name: 'Andheri Sports Complex', city: 'Mumbai', sport: 'Football Turf & Cricket Nets' },
  { slug: 'decathlon-anubhava-turf', name: 'Decathlon Anubhava Turf Arena', city: 'Bengaluru', sport: '5v5 AstroTurf & Basketball' },
]

export default function TurfSlotCalendarPage({
  initialVenueSlug,
  onNavigate,
}: TurfSlotCalendarPageProps) {
  // Venue Selection State
  const [selectedVenueSlug, setSelectedVenueSlug] = useState<string>(() => {
    if (initialVenueSlug) return initialVenueSlug
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('venue')
      if (q) return q
    }
    return 'sree-kanteerava-stadium'
  })

  const currentVenue = CURATED_TURF_VENUES.find(v => v.slug === selectedVenueSlug) || {
    slug: selectedVenueSlug,
    name: 'Grassroots Sports Complex',
    city: 'India',
    sport: 'Multi-Sport Turf',
  }

  // Courts for current venue
  const courts = getTurfCourts(selectedVenueSlug)
  const [selectedCourtId, setSelectedCourtId] = useState<string>(courts[0]?.id || '')

  useEffect(() => {
    if (courts[0] && !courts.some(c => c.id === selectedCourtId)) {
      setSelectedCourtId(courts[0].id)
    }
  }, [courts, selectedCourtId])

  const activeCourt: TurfCourt = courts.find(c => c.id === selectedCourtId) || courts[0] || {
    id: 'default-court',
    venueSlug: selectedVenueSlug,
    name: 'Pitch 1 — Main Turf',
    sport: 'Multi-Sport',
    surface: 'AstroTurf',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 1200,
    advanceDepositRate: 300,
  }

  // Date selection State
  const [selectedDate, setSelectedDate] = useState<string>('Today')
  const [customDateInput, setCustomDateInput] = useState<string>('')

  // Refresh trigger for cross-event reactivity
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    const handleVenueBooked = () => triggerRefresh()
    window.addEventListener('khelgrid:venue-booked', handleVenueBooked)
    return () => window.removeEventListener('khelgrid:venue-booked', handleVenueBooked)
  }, [])

  // Derived Slots & KPIs
  const effectiveDate = customDateInput || selectedDate
  const slots: TurfSlot[] = getTurfSlots(selectedVenueSlug, effectiveDate, activeCourt.id)
  const kpis = getTurfDayKpis(selectedVenueSlug, effectiveDate, activeCourt.id)
  const venueSettings = getTurfVenueSettings(selectedVenueSlug, currentVenue.name)

  // Booking Modal State
  const [bookingSlotTarget, setBookingSlotTarget] = useState<TurfSlot | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'>('upi_advance_paid')
  const [bookingError, setBookingError] = useState('')

  // Voucher / QR View Modal State
  const [activeVoucher, setActiveVoucher] = useState<TurfBookingRecord | null>(null)

  // Venue Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [editManagerName, setEditManagerName] = useState(venueSettings.managerName)
  const [editManagerPhone, setEditManagerPhone] = useState(venueSettings.managerWhatsApp)
  const [editUpiVpa, setEditUpiVpa] = useState(venueSettings.upiVpa)

  // Handle slot reservation form submission
  function handleConfirmBooking(e: FormEvent) {
    e.preventDefault()
    if (!bookingSlotTarget) return

    if (customerName.trim().length < 2) {
      setBookingError('Please enter full customer or team captain name.')
      return
    }
    if (customerPhone.replace(/\D/g, '').length < 10) {
      setBookingError('Please enter a valid 10-digit mobile number.')
      return
    }

    const res = bookTurfSlot({
      venueSlug: selectedVenueSlug,
      venueName: currentVenue.name,
      courtId: activeCourt.id,
      courtName: activeCourt.name,
      date: effectiveDate,
      timeSlot: bookingSlotTarget.timeSlot,
      customerName: customerName.trim(),
      customerPhone: customerPhone.replace(/\D/g, ''),
      sport: activeCourt.sport,
      paymentMethod: bookingPaymentMethod,
      hourlyPrice: bookingSlotTarget.hourlyPrice,
      advanceDeposit: bookingSlotTarget.advanceDeposit,
      upiVpa: venueSettings.upiVpa,
    })

    if (!res.success || !res.booking) {
      setBookingError(res.error || 'Failed to book slot.')
      return
    }

    setBookingSlotTarget(null)
    setCustomerName('')
    setCustomerPhone('')
    setBookingError('')
    setActiveVoucher(res.booking)
    triggerRefresh()
  }

  // Handle Settings Save
  function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    saveTurfVenueSettings({
      venueSlug: selectedVenueSlug,
      venueName: currentVenue.name,
      managerName: editManagerName.trim(),
      managerWhatsApp: editManagerPhone.replace(/\D/g, ''),
      upiVpa: editUpiVpa.trim(),
      allowPayAtVenue: true,
      autoWhatsAppConfirmEnabled: true,
    })
    setIsSettingsModalOpen(false)
    triggerRefresh()
  }

  return (
    <main className="turf-calendar-root" key={refreshKey}>
      {/* Header Banner */}
      <header className="turf-header-banner">
        <div className="turf-title-group">
          <div className="turf-launch-badge">
            <SiteIcon name="sparkles" size={14} />
            <span>Turf &amp; Facility Operations · 100% Free Grassroots Launch Access</span>
          </div>
          <h1>Turf &amp; Facility Slot Booking Calendar</h1>
          <p className="turf-subtitle">
            Manage hourly court inventory, accept zero-commission UPI advance deposits, and dispatch instant WhatsApp vouchers to teams.
          </p>
        </div>

        <div className="turf-header-actions">
          <button
            type="button"
            className="turf-btn turf-btn-outline"
            onClick={() => {
              setEditManagerName(venueSettings.managerName)
              setEditManagerPhone(venueSettings.managerWhatsApp)
              setEditUpiVpa(venueSettings.upiVpa)
              setIsSettingsModalOpen(true)
            }}
          >
            <SiteIcon name="settings" size={16} />
            <span>Turf Settings &amp; UPI</span>
          </button>
          <a
            href={`/venues/${selectedVenueSlug}`}
            className="turf-btn turf-btn-primary"
            onClick={e => onNavigate?.(e, `/venues/${selectedVenueSlug}`)}
          >
            <SiteIcon name="eye" size={16} />
            <span>Public Venue Page</span>
          </a>
        </div>
      </header>

      {/* Control Bar: Venue selector & Court Tabs */}
      <section className="turf-controls-bar" aria-label="Venue and Court Selector">
        <div className="turf-venue-selector-row">
          <div>
            <label htmlFor="venue-select" className="turf-select-label">Active Sports Facility:</label>
            <select
              id="venue-select"
              className="turf-select-input"
              value={selectedVenueSlug}
              onChange={e => {
                setSelectedVenueSlug(e.target.value)
                const newCourts = getTurfCourts(e.target.value)
                if (newCourts[0]) setSelectedCourtId(newCourts[0].id)
              }}
            >
              {CURATED_TURF_VENUES.map(v => (
                <option key={v.slug} value={v.slug}>
                  {v.name} ({v.city})
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Direct UPI Settlement: <strong>{venueSettings.upiVpa}</strong> (0% commission)
          </div>
        </div>

        {/* Court / Pitch Tabs */}
        <div className="turf-court-tabs" role="tablist" aria-label="Facility Courts and Pitches">
          {courts.map(court => (
            <button
              key={court.id}
              type="button"
              role="tab"
              aria-selected={activeCourt.id === court.id}
              className={`turf-court-tab ${activeCourt.id === court.id ? 'active' : ''}`}
              onClick={() => setSelectedCourtId(court.id)}
            >
              <SiteIcon name="map-pin" size={14} />
              <span>{court.name}</span>
              <small style={{ opacity: 0.8 }}>({court.sport} · ₹{court.defaultHourlyRate}/hr)</small>
            </button>
          ))}
        </div>
      </section>

      {/* Date Bar */}
      <section className="turf-date-bar" aria-label="Date Selection">
        <div className="turf-date-chips">
          {['Today', 'Tomorrow', 'Day After'].map(d => (
            <button
              key={d}
              type="button"
              className={`turf-date-chip ${selectedDate === d && !customDateInput ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(d)
                setCustomDateInput('')
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="custom-date-picker" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Specific Date:
          </label>
          <input
            id="custom-date-picker"
            type="date"
            className="turf-select-input"
            value={customDateInput}
            onChange={e => {
              setCustomDateInput(e.target.value)
              setSelectedDate('')
            }}
          />
        </div>
      </section>

      {/* KPI Metrics Ribbon */}
      <section className="turf-kpi-grid" aria-label="Turf Daily Overview">
        <div className="turf-kpi-card">
          <span className="turf-kpi-val">{kpis.totalSlots}</span>
          <span className="turf-kpi-lbl">Total Operating Slots</span>
        </div>
        <div className="turf-kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}>
          <span className="turf-kpi-val" style={{ color: '#2563eb' }}>
            {kpis.bookedCount} <small style={{ fontSize: '0.85rem', color: '#64748b' }}>({kpis.occupancyRate}% Booked)</small>
          </span>
          <span className="turf-kpi-lbl">Reserved Slots</span>
        </div>
        <div className="turf-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <span className="turf-kpi-val" style={{ color: '#059669' }}>{kpis.availableCount}</span>
          <span className="turf-kpi-lbl">Open Available Slots</span>
        </div>
        <div className="turf-kpi-card">
          <span className="turf-kpi-val">₹{kpis.totalAdvanceRevenue.toLocaleString('en-IN')}</span>
          <span className="turf-kpi-lbl">UPI Advance Collected</span>
        </div>
        <div className="turf-kpi-card">
          <span className="turf-kpi-val">₹{kpis.totalProjectedRevenue.toLocaleString('en-IN')}</span>
          <span className="turf-kpi-lbl">Projected Day Revenue</span>
        </div>
      </section>

      {/* Interactive Hourly Slots Grid */}
      <section aria-label="Hourly Turf Slot Grid">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem' }}>
          Hourly Slot Management Grid — {activeCourt.name}
        </h2>

        <div className="turf-slots-grid">
          {slots.map(slot => (
            <article
              key={slot.id}
              className={`turf-slot-card status-${slot.status}`}
              data-slot-time={slot.timeSlot}
            >
              <div className="turf-slot-header">
                <span className="turf-slot-time">{slot.timeSlot}</span>
                <span className={`turf-slot-badge badge-${slot.status}`}>
                  {slot.status === 'available' ? 'Available' : slot.status === 'booked' ? 'Reserved' : 'Blocked'}
                </span>
              </div>

              <div className="turf-slot-body">
                {slot.status === 'available' && (
                  <div>
                    <span className="turf-slot-price">₹{slot.hourlyPrice.toLocaleString('en-IN')}/hr</span>
                    <span className="turf-slot-deposit-note">Advance required: ₹{slot.advanceDeposit} via UPI</span>
                  </div>
                )}

                {slot.status === 'booked' && (
                  <div className="turf-slot-booking-info">
                    <span className="turf-slot-player-name">👤 {slot.customerName}</span>
                    <span className="turf-slot-player-phone">📞 +91 {slot.customerPhone}</span>
                    <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: '#15803d' }}>
                      Advance: ₹{slot.advanceDeposit} · Remainder: ₹{Math.max(0, slot.hourlyPrice - slot.advanceDeposit)}
                    </div>
                  </div>
                )}

                {slot.status === 'blocked' && (
                  <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem' }}>
                    🔒 {slot.blockedReason || 'Maintenance / Private Booking'}
                  </div>
                )}
              </div>

              <div className="turf-slot-actions">
                {slot.status === 'available' && (
                  <>
                    <button
                      type="button"
                      className="turf-mini-btn primary"
                      onClick={() => {
                        setBookingSlotTarget(slot)
                        setBookingError('')
                      }}
                    >
                      <SiteIcon name="check" size={13} />
                      <span>Book Slot</span>
                    </button>
                    <button
                      type="button"
                      className="turf-mini-btn"
                      onClick={() => {
                        toggleSlotBlocked(selectedVenueSlug, effectiveDate, activeCourt.id, slot.timeSlot, 'Turf Maintenance')
                        triggerRefresh()
                      }}
                      title="Block for maintenance"
                    >
                      <SiteIcon name="lock" size={13} />
                      <span>Block</span>
                    </button>
                  </>
                )}

                {slot.status === 'booked' && (
                  <>
                    <button
                      type="button"
                      className="turf-mini-btn"
                      onClick={() => {
                        setActiveVoucher({
                          bookingId: slot.bookingId || 'TRF-RECORD',
                          venueSlug: selectedVenueSlug,
                          venueName: currentVenue.name,
                          courtId: activeCourt.id,
                          courtName: activeCourt.name,
                          sport: activeCourt.sport,
                          slotDate: effectiveDate,
                          slotTime: slot.timeSlot,
                          customerName: slot.customerName || 'Player',
                          customerPhone: slot.customerPhone || '9876543210',
                          totalAmount: slot.hourlyPrice,
                          paidAmount: slot.advanceDeposit,
                          balanceAmount: Math.max(0, slot.hourlyPrice - slot.advanceDeposit),
                          paymentStatus: slot.paymentStatus || 'upi_advance_paid',
                          bookedAt: slot.bookedAt || new Date().toISOString(),
                          qrCodePayload: JSON.stringify({ ref: slot.bookingId, venue: currentVenue.name, slot: slot.timeSlot }),
                        })
                      }}
                    >
                      <SiteIcon name="file-text" size={13} />
                      <span>Voucher</span>
                    </button>
                    <a
                      href={generateWhatsAppTurfConfirmationUrl(
                        {
                          bookingId: slot.bookingId || 'TRF-RECORD',
                          venueSlug: selectedVenueSlug,
                          venueName: currentVenue.name,
                          courtId: activeCourt.id,
                          courtName: activeCourt.name,
                          sport: activeCourt.sport,
                          slotDate: effectiveDate,
                          slotTime: slot.timeSlot,
                          customerName: slot.customerName || 'Player',
                          customerPhone: slot.customerPhone || '9876543210',
                          totalAmount: slot.hourlyPrice,
                          paidAmount: slot.advanceDeposit,
                          balanceAmount: Math.max(0, slot.hourlyPrice - slot.advanceDeposit),
                          paymentStatus: slot.paymentStatus || 'upi_advance_paid',
                          bookedAt: slot.bookedAt || new Date().toISOString(),
                          qrCodePayload: 'test',
                        },
                        slot.customerPhone
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="turf-mini-btn"
                      title="Send WhatsApp confirmation to team captain"
                    >
                      <SiteIcon name="phone" size={13} />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      className="turf-mini-btn danger"
                      onClick={() => {
                        if (window.confirm?.(`Cancel reservation for ${slot.timeSlot}? This will free the slot immediately.`)) {
                          cancelTurfBooking(selectedVenueSlug, effectiveDate, activeCourt.id, slot.timeSlot)
                          triggerRefresh()
                        }
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {slot.status === 'blocked' && (
                  <button
                    type="button"
                    className="turf-mini-btn primary"
                    onClick={() => {
                      toggleSlotBlocked(selectedVenueSlug, effectiveDate, activeCourt.id, slot.timeSlot)
                      triggerRefresh()
                    }}
                  >
                    <span>Unblock &amp; Open</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Walk-in / Manual Booking Modal */}
      {bookingSlotTarget && (
        <div className="turf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
          <div className="turf-modal-card">
            <div className="turf-modal-header">
              <h3 id="booking-modal-title">Reserve Slot — {bookingSlotTarget.timeSlot}</h3>
              <button
                type="button"
                className="turf-modal-close"
                onClick={() => setBookingSlotTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {bookingError}
              </div>
            )}

            <form onSubmit={handleConfirmBooking}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div><strong>Venue:</strong> {currentVenue.name}</div>
                <div><strong>Court:</strong> {activeCourt.name}</div>
                <div><strong>Date &amp; Time:</strong> {effectiveDate} · {bookingSlotTarget.timeSlot}</div>
                <div><strong>Hourly Fee:</strong> ₹{bookingSlotTarget.hourlyPrice.toLocaleString('en-IN')}</div>
              </div>

              <div className="turf-form-group">
                <label htmlFor="turf-player-name">Player / Team Captain Name *</label>
                <input
                  id="turf-player-name"
                  type="text"
                  className="turf-form-input"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Vikram Verma"
                  required
                />
              </div>

              <div className="turf-form-group">
                <label htmlFor="turf-player-phone">WhatsApp Mobile Number *</label>
                <input
                  id="turf-player-phone"
                  type="tel"
                  className="turf-form-input"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="turf-form-group">
                <label>Payment Settlement Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`turf-date-chip ${bookingPaymentMethod === 'upi_advance_paid' ? 'active' : ''}`}
                    onClick={() => setBookingPaymentMethod('upi_advance_paid')}
                  >
                    UPI Advance (₹{bookingSlotTarget.advanceDeposit})
                  </button>
                  <button
                    type="button"
                    className={`turf-date-chip ${bookingPaymentMethod === 'fully_paid' ? 'active' : ''}`}
                    onClick={() => setBookingPaymentMethod('fully_paid')}
                  >
                    Full UPI (₹{bookingSlotTarget.hourlyPrice})
                  </button>
                  <button
                    type="button"
                    className={`turf-date-chip ${bookingPaymentMethod === 'pay_at_venue' ? 'active' : ''}`}
                    onClick={() => setBookingPaymentMethod('pay_at_venue')}
                  >
                    Pay at Venue
                  </button>
                </div>
              </div>

              {/* Instant Desk UPI QR Preview */}
              {bookingPaymentMethod !== 'pay_at_venue' && (
                <div className="turf-qr-box">
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
                    Instant On-Desk UPI QR (0% Commission)
                  </div>
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(
                      generateQrSvgString(
                        generateTurfUpiPayLink({
                          vpa: venueSettings.upiVpa,
                          name: currentVenue.name,
                          amount: bookingPaymentMethod === 'fully_paid' ? bookingSlotTarget.hourlyPrice : bookingSlotTarget.advanceDeposit,
                          note: `Turf Slot ${bookingSlotTarget.timeSlot}`,
                        }),
                        { size: 160 }
                      )
                    )}`}
                    alt="UPI Payment QR Code"
                    className="turf-qr-img"
                  />
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Scan with PhonePe, GPay, or Paytm to settle <strong>₹{bookingPaymentMethod === 'fully_paid' ? bookingSlotTarget.hourlyPrice : bookingSlotTarget.advanceDeposit}</strong> directly to <strong>{venueSettings.upiVpa}</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="turf-btn turf-btn-outline"
                  onClick={() => setBookingSlotTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="turf-btn turf-btn-primary">
                  Confirm Reservation →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Turf Booking Voucher & QR Modal */}
      {activeVoucher && (
        <div className="turf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="voucher-modal-title">
          <div className="turf-modal-card" style={{ textAlign: 'center' }}>
            <div className="turf-modal-header">
              <h3 id="voucher-modal-title">Turf Reservation Voucher</h3>
              <button
                type="button"
                className="turf-modal-close"
                onClick={() => setActiveVoucher(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
              ✓ Reservation Confirmed: #{activeVoucher.bookingId}
            </div>

            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem' }}>
              <div><strong>Facility:</strong> {activeVoucher.venueName}</div>
              <div><strong>Court / Pitch:</strong> {activeVoucher.courtName} ({activeVoucher.sport})</div>
              <div><strong>Date &amp; Time:</strong> {activeVoucher.slotDate} · {activeVoucher.slotTime}</div>
              <div><strong>Team / Player:</strong> {activeVoucher.customerName} (+91 {activeVoucher.customerPhone})</div>
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                <strong>Tariff:</strong> ₹{activeVoucher.totalAmount} (Paid: ₹{activeVoucher.paidAmount} · Balance: ₹{activeVoucher.balanceAmount})
              </div>
            </div>

            {/* Verifiable QR Code */}
            <div className="turf-qr-box">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(
                  generateQrSvgString(activeVoucher.qrCodePayload, { size: 180 })
                )}`}
                alt="Turf Gate Entry QR Code"
                className="turf-qr-img"
              />
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Present this QR code at the turf entry reception for verification.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <a
                href={generateWhatsAppTurfConfirmationUrl(activeVoucher)}
                target="_blank"
                rel="noopener noreferrer"
                className="turf-btn turf-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <SiteIcon name="phone" size={15} />
                <span>Send via WhatsApp</span>
              </a>
              <button
                type="button"
                className="turf-btn turf-btn-outline"
                onClick={() => window.print?.()}
              >
                <SiteIcon name="download" size={15} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venue Settings Modal */}
      {isSettingsModalOpen && (
        <div className="turf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
          <div className="turf-modal-card">
            <div className="turf-modal-header">
              <h3 id="settings-modal-title">Turf Settings &amp; UPI Configuration</h3>
              <button
                type="button"
                className="turf-modal-close"
                onClick={() => setIsSettingsModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="turf-form-group">
                <label htmlFor="settings-manager-name">Operations Manager Name</label>
                <input
                  id="settings-manager-name"
                  type="text"
                  className="turf-form-input"
                  value={editManagerName}
                  onChange={e => setEditManagerName(e.target.value)}
                  placeholder="e.g. Manager Rajesh"
                  required
                />
              </div>

              <div className="turf-form-group">
                <label htmlFor="settings-manager-phone">Manager WhatsApp Mobile</label>
                <input
                  id="settings-manager-phone"
                  type="tel"
                  className="turf-form-input"
                  value={editManagerPhone}
                  onChange={e => setEditManagerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="turf-form-group">
                <label htmlFor="settings-upi-vpa">Facility UPI ID (VPA) for Direct Payouts</label>
                <input
                  id="settings-upi-vpa"
                  type="text"
                  className="turf-form-input"
                  value={editUpiVpa}
                  onChange={e => setEditUpiVpa(e.target.value)}
                  placeholder="e.g. kanteeravaturf@okhdfcbank"
                  required
                />
                <small style={{ display: 'block', marginTop: '0.35rem', color: '#059669', fontSize: '0.78rem' }}>
                  ✓ 100% direct bank deposit. KhelGrid charges 0% platform fee during grassroots launch.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="turf-btn turf-btn-outline"
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="turf-btn turf-btn-primary">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
