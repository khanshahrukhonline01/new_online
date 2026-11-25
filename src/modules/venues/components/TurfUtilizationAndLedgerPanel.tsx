import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import type {
  RecurringSlotSubscription,
  TurfBookingRecord,
  TurfPricingConfig,
} from '../turfSlotManager'

interface TurfUtilizationAndLedgerPanelProps {
  bookings: TurfBookingRecord[]
  subscriptions: RecurringSlotSubscription[]
  pricingConfig: TurfPricingConfig
  onExportCsv: () => void
  onOpenPricingDrawer: () => void
  onOpenRecurringDrawer: () => void
  onViewVoucher: (record: TurfBookingRecord) => void
}

/**
 * Utilization, booking ledger table, dynamic pricing overview, and recurring subscription summary.
 */
export function TurfUtilizationAndLedgerPanel({
  bookings,
  subscriptions,
  pricingConfig,
  onExportCsv,
  onOpenPricingDrawer,
  onOpenRecurringDrawer,
  onViewVoucher,
}: TurfUtilizationAndLedgerPanelProps) {
  const columns: DataTableColumn<TurfBookingRecord>[] = [
    {
      key: 'bookingId',
      header: 'Booking Ref',
      render: row => (
        <div>
          <strong>#{row.bookingId}</strong>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
            {row.slotDate} · {row.slotTime}
          </div>
        </div>
      ),
    },
    {
      key: 'courtName',
      header: 'Court / Pitch',
      render: row => (
        <div>
          <span>{row.courtName}</span>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{row.sport}</div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Team / Captain',
      render: row => (
        <div>
          <span>{row.customerName}</span>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>+91 {row.customerPhone}</div>
        </div>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Direct Settlement',
      render: row => (
        <div>
          <strong>₹{row.paidAmount.toLocaleString('en-IN')}</strong>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
            of ₹{row.totalAmount.toLocaleString('en-IN')} ({row.paymentStatus.replace(/_/g, ' ')})
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Voucher',
      render: row => (
        <button
          type="button"
          className="turf-mini-btn"
          onClick={() => onViewVoucher(row)}
        >
          <SiteIcon name="file-text" size={13} />
          <span>View QR</span>
        </button>
      ),
    },
  ]

  return (
    <section aria-label="Turf Utilization and Booking Ledger" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="turf-controls-bar" style={{ marginBottom: 0 }}>
        <div className="turf-venue-selector-row" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>
              Dynamic Yield &amp; Recurring Subscriptions
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
              Peak pricing is currently{' '}
              <strong>{pricingConfig.isDynamicPricingEnabled ? `Active (${pricingConfig.peakMultiplier}x floodlight / ${pricingConfig.weekendMultiplier}x weekend)` : 'Disabled'}</strong>
              {' '}· {subscriptions.length} recurring team subscription(s).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="turf-btn turf-btn-outline" onClick={onOpenPricingDrawer}>
              <SiteIcon name="wallet" size={15} />
              <span>Edit Pricing Rules</span>
            </button>
            <button type="button" className="turf-btn turf-btn-outline" onClick={onOpenRecurringDrawer}>
              <SiteIcon name="calendar" size={15} />
              <span>Manage Subscriptions</span>
            </button>
            <button type="button" className="turf-btn turf-btn-primary" onClick={onExportCsv}>
              <SiteIcon name="download" size={15} />
              <span>Export Ledger (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="turf-controls-bar" style={{ marginBottom: 0 }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem' }}>
          Facility Booking Ledger ({bookings.length})
        </h3>
        <DataTable
          columns={columns}
          rows={bookings}
          rowKey={row => row.bookingId}
          empty={
            <EmptyState
              icon={<SiteIcon name="calendar-check" size={26} />}
              title="No confirmed bookings yet"
              description="Confirmed hourly slot bookings and phone walk-ins will appear in this audit ledger for direct UPI tracking."
            />
          }
        />
      </div>
    </section>
  )
}
