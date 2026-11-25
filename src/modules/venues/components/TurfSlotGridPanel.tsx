import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  generateWhatsAppTurfConfirmationUrl,
  isSlotPeakHour,
  type TurfBookingRecord,
  type TurfCourt,
  type TurfSlot,
} from '../turfSlotManager'

interface TurfSlotGridPanelProps {
  venueSlug: string
  venueName: string
  activeCourt: TurfCourt
  effectiveDate: string
  slots: TurfSlot[]
  maintenanceOnly?: boolean
  onOpenBookingDrawer: (slot: TurfSlot) => void
  onToggleBlocked: (slot: TurfSlot) => void
  onViewVoucher: (record: TurfBookingRecord) => void
  onRequestCancelSlot: (slot: TurfSlot) => void
}

/**
 * Interactive hourly court/pitch slot management grid supporting slot reservations,
 * maintenance locks, gate pass QR vouchers, and WhatsApp dispatch.
 */
export function TurfSlotGridPanel({
  venueSlug,
  venueName,
  activeCourt,
  effectiveDate,
  slots,
  maintenanceOnly = false,
  onOpenBookingDrawer,
  onToggleBlocked,
  onViewVoucher,
  onRequestCancelSlot,
}: TurfSlotGridPanelProps) {
  const visibleSlots = maintenanceOnly
    ? slots.filter(s => s.status === 'blocked' || s.status === 'available')
    : slots

  return (
    <section aria-label={maintenanceOnly ? 'Turf Maintenance Lock Grid' : 'Hourly Turf Slot Grid'}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
        {maintenanceOnly
          ? `Maintenance & Pitch Lock Schedule — ${activeCourt.name}`
          : `Hourly Slot Management Grid — ${activeCourt.name}`}
      </h2>
      {maintenanceOnly && (
        <p style={{ margin: '0 0 1rem', fontSize: '0.86rem', color: 'var(--muted, #64748b)' }}>
          Block open court hours for resurfacing, floodlight inspection, or reserved institutional drills, or release existing maintenance holds.
        </p>
      )}

      <div className="turf-slots-grid">
        {visibleSlots.map(slot => (
          <article
            key={slot.id}
            className={`turf-slot-card status-${slot.status}`}
            data-slot-time={slot.timeSlot}
          >
            <div className="turf-slot-header">
              <span className="turf-slot-time">{slot.timeSlot}</span>
              <span className={`turf-slot-badge badge-${slot.status}`}>
                {slot.status === 'available'
                  ? 'Available'
                  : slot.status === 'booked'
                    ? 'Reserved'
                    : slot.status === 'held'
                      ? 'Held (Cart Lock)'
                      : 'Blocked'}
              </span>
            </div>

            <div className="turf-slot-body">
              {slot.status === 'available' && (
                <div>
                  <span className="turf-slot-price">₹{slot.hourlyPrice.toLocaleString('en-IN')}/hr</span>
                  <span className="turf-slot-deposit-note">Advance required: ₹{slot.advanceDeposit} via UPI</span>
                  {isSlotPeakHour(slot.timeSlot, effectiveDate) && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        marginTop: '0.25rem',
                      }}
                    >
                      ⚡ Prime Peak Slot
                    </span>
                  )}
                </div>
              )}

              {slot.status === 'held' && (
                <div style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⏱️ Held in customer cart
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '0.2rem' }}>
                    Auto-releases in 10 mins if unpaid
                  </div>
                </div>
              )}

              {slot.status === 'booked' && (
                <div className="turf-slot-booking-info">
                  <span className="turf-slot-player-name">👤 {slot.customerName}</span>
                  <span className="turf-slot-player-phone">📞 +91 {slot.customerPhone}</span>
                  <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: 'var(--accent, #15803d)' }}>
                    Advance: ₹{slot.advanceDeposit} · Remainder: ₹{Math.max(0, slot.hourlyPrice - slot.advanceDeposit)}
                  </div>
                </div>
              )}

              {slot.status === 'blocked' && (
                <div style={{ fontStyle: 'italic', color: 'var(--muted, #64748b)', fontSize: '0.85rem' }}>
                  🔒 {slot.blockedReason || 'Maintenance / Private Booking'}
                </div>
              )}
            </div>

            <div className="turf-slot-actions">
              {slot.status === 'available' && (
                <>
                  {!maintenanceOnly && (
                    <button
                      type="button"
                      className="turf-mini-btn primary"
                      onClick={() => onOpenBookingDrawer(slot)}
                    >
                      <SiteIcon name="check" size={13} />
                      <span>Book Slot</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`turf-mini-btn${maintenanceOnly ? ' primary' : ''}`}
                    onClick={() => onToggleBlocked(slot)}
                    title="Block for maintenance"
                  >
                    <SiteIcon name="lock" size={13} />
                    <span>{maintenanceOnly ? 'Lock for Maintenance' : 'Block'}</span>
                  </button>
                </>
              )}

              {slot.status === 'booked' && (
                <>
                  <button
                    type="button"
                    className="turf-mini-btn"
                    onClick={() =>
                      onViewVoucher({
                        bookingId: slot.bookingId || 'TRF-RECORD',
                        venueSlug,
                        venueName,
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
                        qrCodePayload: JSON.stringify({
                          ref: slot.bookingId,
                          venue: venueName,
                          slot: slot.timeSlot,
                        }),
                      })
                    }
                  >
                    <SiteIcon name="file-text" size={13} />
                    <span>Voucher</span>
                  </button>
                  <a
                    href={generateWhatsAppTurfConfirmationUrl(
                      {
                        bookingId: slot.bookingId || 'TRF-RECORD',
                        venueSlug,
                        venueName,
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
                        qrCodePayload: 'voucher-whatsapp',
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
                    onClick={() => onRequestCancelSlot(slot)}
                  >
                    Cancel
                  </button>
                </>
              )}

              {slot.status === 'blocked' && (
                <button
                  type="button"
                  className="turf-mini-btn primary"
                  onClick={() => onToggleBlocked(slot)}
                >
                  <span>Unblock &amp; Open</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
