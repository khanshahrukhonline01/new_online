import { SiteIcon } from '../../../shared/components/SiteIcon'
import type {
  RecurringSlotSubscription,
  TurfBookingRecord,
  TurfPricingConfig,
} from '../turfSlotManager'

export interface TurfUtilizationAndLedgerPanelProps {
  bookings: TurfBookingRecord[]
  subscriptions: RecurringSlotSubscription[]
  pricingConfig: TurfPricingConfig
  onExportCsv: () => void
  onOpenPricingDrawer: () => void
  onOpenRecurringDrawer: () => void
  onViewVoucher: (record: TurfBookingRecord) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function TurfUtilizationAndLedgerPanel({
  bookings,
  subscriptions,
  pricingConfig,
  onExportCsv,
  onOpenPricingDrawer,
  onOpenRecurringDrawer,
  onViewVoucher,
}: TurfUtilizationAndLedgerPanelProps) {
  return (
    <section className="turf-utilization-section" aria-label="Facility Utilization and Ledger">
      <div className="turf-panel-card">
        <div className="turf-section-header">
          <div>
            <h2>Dynamic Yield &amp; Recurring Subscriptions</h2>
            <p>
              Peak multiplier: <strong>{pricingConfig.peakMultiplier}×</strong> ({pricingConfig.peakStartHour}:00–
              {pricingConfig.peakEndHour}:00) · Weekend: <strong>{pricingConfig.weekendMultiplier}×</strong> ·{' '}
              {pricingConfig.isDynamicPricingEnabled ? 'Active' : 'Standard flat pricing'}
            </p>
          </div>
          <div className="turf-header-actions">
            <button type="button" className="turf-btn turf-btn-outline" onClick={onOpenPricingDrawer}>
              Configure Peak Pricing
            </button>
            <button type="button" className="turf-btn turf-btn-primary" onClick={onOpenRecurringDrawer}>
              New Subscription
            </button>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <p className="turf-empty-copy">No recurring academy or corporate league subscriptions scheduled yet.</p>
        ) : (
          <div className="kg-data-table-scroll">
            <table className="kg-data-table">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>Court &amp; Slot</th>
                  <th>Schedule</th>
                  <th>Total Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.subscriptionId}>
                    <td>
                      <strong>{sub.customerName}</strong>
                      <div>{sub.customerPhone}</div>
                    </td>
                    <td>{sub.courtName} · {sub.timeSlot}</td>
                    <td>{DAY_LABELS[sub.dayOfWeek] || 'Weekly'} × {sub.weeksCount} wks</td>
                    <td>₹{sub.totalFee.toLocaleString('en-IN')}</td>
                    <td>{sub.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="turf-panel-card">
        <div className="turf-section-header">
          <div>
            <h2>Facility Booking Ledger</h2>
            <p>{bookings.length} recorded slot reservations for this venue</p>
          </div>
          <button type="button" className="turf-btn turf-btn-outline" onClick={onExportCsv}>
            <SiteIcon name="download" size={15} />
            <span>Export CSV</span>
          </button>
        </div>

        {bookings.length === 0 ? (
          <p className="turf-empty-copy">No bookings recorded yet. Reserve any open slot from the calendar grid.</p>
        ) : (
          <div className="kg-data-table-scroll">
            <table className="kg-data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Court &amp; Time</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(record => (
                  <tr key={record.bookingId}>
                    <td><code>{record.bookingId}</code></td>
                    <td>
                      <strong>{record.customerName}</strong>
                      <div>{record.customerPhone}</div>
                    </td>
                    <td>{record.courtName} · {record.slotDate} · {record.slotTime}</td>
                    <td>₹{record.totalAmount.toLocaleString('en-IN')}</td>
                    <td>{record.paymentStatus.replace(/_/g, ' ')}</td>
                    <td>
                      <button
                        type="button"
                        className="turf-btn turf-btn-outline"
                        onClick={() => onViewVoucher(record)}
                      >
                        View Voucher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
