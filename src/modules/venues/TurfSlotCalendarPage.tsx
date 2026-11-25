import { useState, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog'
import {
  getTurfCourts,
  getTurfSlots,
  toggleSlotBlocked,
  cancelTurfBooking,
  getTurfVenueSettings,
  getTurfDayKpis,
  getTurfBookings,
  getTurfPricingConfig,
  getRecurringSubscriptions,
  type TurfCourt,
  type TurfSlot,
  type TurfBookingRecord,
} from './turfSlotManager'
import { exportTurfBookingsToCsv, downloadBlobFile } from './turfExportUtils'
import { TurfActionDrawers } from './components/TurfActionDrawers'
import { TurfSlotGridPanel } from './components/TurfSlotGridPanel'
import { TurfUtilizationAndLedgerPanel } from './components/TurfUtilizationAndLedgerPanel'
import {
  CURATED_TURF_VENUES,
  resolveTurfVenueMeta,
  type TurfActiveDrawer,
  type TurfShellSection,
} from './turfCalendarTypes'
import './TurfSlotCalendarPage.css'

export interface TurfSlotCalendarPageProps {
  initialVenueSlug?: string
  workspaceSection?: TurfShellSection | string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function TurfSlotCalendarPage({
  initialVenueSlug,
  workspaceSection,
  onNavigate,
}: TurfSlotCalendarPageProps) {
  const [selectedVenueSlug, setSelectedVenueSlug] = useState<string>(() => {
    if (initialVenueSlug) return initialVenueSlug
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('venue')
      if (q) return q
    }
    return 'sree-kanteerava-stadium'
  })

  const currentVenue = resolveTurfVenueMeta(selectedVenueSlug)
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

  const [selectedDate, setSelectedDate] = useState<string>('Today')
  const [customDateInput, setCustomDateInput] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    const handleVenueBooked = () => triggerRefresh()
    window.addEventListener('khelgrid:venue-booked', handleVenueBooked)
    return () => window.removeEventListener('khelgrid:venue-booked', handleVenueBooked)
  }, [])

  const effectiveDate = customDateInput || selectedDate
  const slots: TurfSlot[] = getTurfSlots(selectedVenueSlug, effectiveDate, activeCourt.id)
  const kpis = getTurfDayKpis(selectedVenueSlug, effectiveDate, activeCourt.id)
  const venueSettings = getTurfVenueSettings(selectedVenueSlug, currentVenue.name)
  const bookings = getTurfBookings(selectedVenueSlug)
  const subscriptions = getRecurringSubscriptions(selectedVenueSlug)
  const pricingConfig = getTurfPricingConfig(selectedVenueSlug)

  const [activeDrawer, setActiveDrawer] = useState<TurfActiveDrawer>(null)
  const [bookingSlotTarget, setBookingSlotTarget] = useState<TurfSlot | null>(null)
  const [activeVoucher, setActiveVoucher] = useState<TurfBookingRecord | null>(null)
  const [pendingCancelSlot, setPendingCancelSlot] = useState<TurfSlot | null>(null)

  const resolvedSection: TurfShellSection =
    workspaceSection === 'utilization' || workspaceSection === 'maintenance'
      ? workspaceSection
      : 'calendar'

  const handleExportCsv = () => {
    const csv = exportTurfBookingsToCsv(getTurfBookings(selectedVenueSlug), currentVenue.name)
    downloadBlobFile(`${selectedVenueSlug}-turf-ledger.csv`, csv)
  }

  const handleConfirmCancel = () => {
    if (!pendingCancelSlot) return
    cancelTurfBooking(selectedVenueSlug, effectiveDate, activeCourt.id, pendingCancelSlot.timeSlot)
    setPendingCancelSlot(null)
    triggerRefresh()
  }

  return (
    <main className="turf-calendar-root" key={refreshKey}>
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
            onClick={handleExportCsv}
          >
            <SiteIcon name="download" size={16} />
            <span>Export Ledger (CSV)</span>
          </button>
          <button
            type="button"
            className="turf-btn turf-btn-outline"
            onClick={() => setActiveDrawer('settings')}
          >
            <SiteIcon name="settings" size={16} />
            <span>Turf Settings &amp; UPI</span>
          </button>
          <button
            type="button"
            className="turf-btn turf-btn-outline"
            onClick={() => setActiveDrawer('walkin')}
          >
            <SiteIcon name="phone" size={16} />
            <span>⚡ Quick Phone Walk-In</span>
          </button>
          <button
            type="button"
            className="turf-btn turf-btn-outline"
            onClick={() => setActiveDrawer('recurring')}
          >
            <SiteIcon name="calendar" size={16} />
            <span>📅 Subscriptions &amp; Leagues</span>
          </button>
          <button
            type="button"
            className="turf-btn turf-btn-outline"
            onClick={() => setActiveDrawer('pricing')}
          >
            <SiteIcon name="wallet" size={16} />
            <span>⚡ Dynamic Peak Pricing</span>
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

          <div style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
            Direct UPI Settlement: <strong>{venueSettings.upiVpa}</strong> (0% commission)
          </div>
        </div>

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
          <label htmlFor="custom-date-picker" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-soft, #475569)' }}>
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

      <section className="turf-kpi-grid" aria-label="Turf Daily Overview">
        <div className="turf-kpi-card">
          <span className="turf-kpi-val">{kpis.totalSlots}</span>
          <span className="turf-kpi-lbl">Total Operating Slots</span>
        </div>
        <div className="turf-kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}>
          <span className="turf-kpi-val" style={{ color: '#2563eb' }}>
            {kpis.bookedCount} <small style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>({kpis.occupancyRate}% Booked)</small>
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

      {resolvedSection === 'utilization' ? (
        <TurfUtilizationAndLedgerPanel
          bookings={bookings}
          subscriptions={subscriptions}
          pricingConfig={pricingConfig}
          onExportCsv={handleExportCsv}
          onOpenPricingDrawer={() => setActiveDrawer('pricing')}
          onOpenRecurringDrawer={() => setActiveDrawer('recurring')}
          onViewVoucher={record => {
            setActiveVoucher(record)
            setActiveDrawer('voucher')
          }}
        />
      ) : (
        <TurfSlotGridPanel
          venueSlug={selectedVenueSlug}
          venueName={currentVenue.name}
          activeCourt={activeCourt}
          effectiveDate={effectiveDate}
          slots={slots}
          maintenanceOnly={resolvedSection === 'maintenance'}
          onOpenBookingDrawer={slot => {
            setBookingSlotTarget(slot)
            setActiveDrawer('booking')
          }}
          onToggleBlocked={slot => {
            toggleSlotBlocked(
              selectedVenueSlug,
              effectiveDate,
              activeCourt.id,
              slot.timeSlot,
              slot.status === 'blocked' ? undefined : 'Turf Maintenance'
            )
            triggerRefresh()
          }}
          onViewVoucher={record => {
            setActiveVoucher(record)
            setActiveDrawer('voucher')
          }}
          onRequestCancelSlot={slot => setPendingCancelSlot(slot)}
        />
      )}

      <TurfActionDrawers
        activeDrawer={activeDrawer}
        onCloseDrawer={() => {
          setActiveDrawer(null)
          setBookingSlotTarget(null)
        }}
        venueSlug={selectedVenueSlug}
        venueName={currentVenue.name}
        activeCourt={activeCourt}
        courts={courts}
        effectiveDate={effectiveDate}
        selectedDate={selectedDate}
        venueSettings={venueSettings}
        initialPricingConfig={pricingConfig}
        bookingSlotTarget={bookingSlotTarget}
        activeVoucher={activeVoucher}
        onVoucherIssued={booking => {
          setBookingSlotTarget(null)
          setActiveVoucher(booking)
          setActiveDrawer('voucher')
        }}
        onMutationSuccess={triggerRefresh}
      />

      <ConfirmDialog
        open={Boolean(pendingCancelSlot)}
        title="Cancel Turf Reservation?"
        message={
          pendingCancelSlot
            ? `Cancel reservation for ${pendingCancelSlot.timeSlot} (${pendingCancelSlot.customerName || 'Player'})? This will immediately reopen the slot.`
            : ''
        }
        confirmLabel="Cancel Reservation"
        destructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancelSlot(null)}
      />
    </main>
  )
}
