import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  getTurfBookings,
  type TurfBookingRecord,
  type TurfCourt,
  type TurfSlot,
} from '../turfSlotManager'

export interface TurfSlotGridPanelProps {
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

export function TurfSlotGridPanel({
  venueSlug,
  activeCourt,
  effectiveDate,
  slots,
  maintenanceOnly = false,
  onOpenBookingDrawer,
  onToggleBlocked,
  onViewVoucher,
  onRequestCancelSlot,
}: TurfSlotGridPanelProps) {
  const bookings = getTurfBookings(venueSlug)

  return (
    <section
      className="turf-slot-grid-section"
      aria-label={maintenanceOnly ? 'Maintenance & Pitch Lock Schedule' : 'Hourly Court Slot Grid'}
    >
      <div className="turf-section-header">
        <div>
          <h2>
            {maintenanceOnly
              ? 'Maintenance & Pitch Lock Schedule'
              : `${activeCourt.name} · Hourly Slot Inventory (${effectiveDate})`}
          </h2>
          <p>
            {maintenanceOnly
              ? 'Lock specific hours for turf brushing, floodlight maintenance, or rain closures.'
              : `${activeCourt.sport} · ${activeCourt.surface} · Base rate ₹${activeCourt.defaultHourlyRate}/hr`}
          </p>
        </div>
      </div>

      <div className="turf-slots-grid">
        {slots.map(slot => {
          const booking = slot.bookingId
            ? bookings.find(b => b.bookingId === slot.bookingId)
            : undefined

          return (
            <article
              key={slot.id}
              className={`turf-slot-card status-${slot.status}`}
            >
              <div className="turf-slot-card-top">
                <strong className="turf-slot-time">{slot.timeSlot}</strong>
                <span className={`turf-slot-badge status-${slot.status}`}>
                  {slot.status === 'available'
                    ? 'Open'
                    : slot.status === 'booked'
                      ? 'Booked'
                      : slot.status === 'held'
                        ? 'Held'
                        : 'Locked'}
                </span>
              </div>

              <div className="turf-slot-meta">
                <span>₹{slot.hourlyPrice.toLocaleString('en-IN')}/hr</span>
                {slot.isPeakHour && <span className="turf-peak-tag">Peak</span>}
              </div>

              {slot.status === 'booked' && (
                <div className="turf-slot-customer">
                  <strong>{slot.customerName || 'Reserved Player'}</strong>
                  {slot.customerPhone && <span>{slot.customerPhone}</span>}
                </div>
              )}

              {slot.status === 'blocked' && (
                <div className="turf-slot-customer">
                  <span>{slot.blockedReason || 'Turf Maintenance'}</span>
                </div>
              )}

              <div className="turf-slot-actions">
                {maintenanceOnly ? (
                  <button
                    type="button"
                    className="turf-btn turf-btn-outline"
                    disabled={slot.status === 'booked'}
                    onClick={() => onToggleBlocked(slot)}
                  >
                    <SiteIcon name="lock" size={14} />
                    <span>{slot.status === 'blocked' ? 'Unlock Slot' : 'Lock for Maintenance'}</span>
                  </button>
                ) : slot.status === 'available' ? (
                  <>
                    <button
                      type="button"
                      className="turf-btn turf-btn-primary"
                      onClick={() => onOpenBookingDrawer(slot)}
                    >
                      Book Slot
                    </button>
                    <button
                      type="button"
                      className="turf-btn turf-btn-outline"
                      onClick={() => onToggleBlocked(slot)}
                    >
                      Block
                    </button>
                  </>
                ) : slot.status === 'booked' ? (
                  <>
                    {booking && (
                      <button
                        type="button"
                        className="turf-btn turf-btn-outline"
                        onClick={() => onViewVoucher(booking)}
                      >
                        Voucher
                      </button>
                    )}
                    <button
                      type="button"
                      className="turf-btn turf-btn-outline"
                      onClick={() => onRequestCancelSlot(slot)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="turf-btn turf-btn-outline"
                    onClick={() => onToggleBlocked(slot)}
                  >
                    Unblock
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
