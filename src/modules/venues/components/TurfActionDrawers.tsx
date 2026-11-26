import { useEffect, useState, type FormEvent } from 'react'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import {
  HOURLY_TIME_SLOTS,
  bookTurfSlot,
  createQuickWalkInBooking,
  createRecurringSubscription,
  generateWhatsAppTurfConfirmationUrl,
  saveTurfPricingConfig,
  saveTurfVenueSettings,
  type TurfBookingRecord,
  type TurfCourt,
  type TurfPricingConfig,
  type TurfSlot,
  type TurfVenueSettings,
} from '../turfSlotManager'
import type { TurfActiveDrawer } from '../turfCalendarTypes'

export interface TurfActionDrawersProps {
  activeDrawer: TurfActiveDrawer
  onCloseDrawer: () => void
  venueSlug: string
  venueName: string
  activeCourt: TurfCourt
  courts: TurfCourt[]
  effectiveDate: string
  selectedDate: string
  venueSettings: TurfVenueSettings
  initialPricingConfig: TurfPricingConfig
  bookingSlotTarget: TurfSlot | null
  activeVoucher: TurfBookingRecord | null
  onVoucherIssued: (booking: TurfBookingRecord) => void
  onMutationSuccess: () => void
}

export function TurfActionDrawers({
  activeDrawer,
  onCloseDrawer,
  venueSlug,
  venueName,
  activeCourt,
  courts,
  effectiveDate,
  venueSettings,
  initialPricingConfig,
  bookingSlotTarget,
  activeVoucher,
  onVoucherIssued,
  onMutationSuccess,
}: TurfActionDrawersProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'>('upi_advance_paid')
  const [walkInCourtId, setWalkInCourtId] = useState(activeCourt.id)
  const [walkInSlot, setWalkInSlot] = useState(HOURLY_TIME_SLOTS[12] || '06:00 PM – 07:00 PM')
  const [weeksCount, setWeeksCount] = useState(4)
  const [dayOfWeek, setDayOfWeek] = useState(6)

  const [settingsForm, setSettingsForm] = useState<TurfVenueSettings>(venueSettings)
  const [pricingForm, setPricingForm] = useState<TurfPricingConfig>(initialPricingConfig)

  useEffect(() => {
    setSettingsForm(venueSettings)
  }, [venueSettings])

  useEffect(() => {
    setPricingForm(initialPricingConfig)
  }, [initialPricingConfig])

  useEffect(() => {
    setWalkInCourtId(activeCourt.id)
  }, [activeCourt.id])

  useEffect(() => {
    setStatusMessage(null)
  }, [activeDrawer])

  if (!activeDrawer) return null

  function handleBookSlotSubmit(e: FormEvent) {
    e.preventDefault()
    if (!bookingSlotTarget || !customerName.trim()) return
    const res = bookTurfSlot({
      venueSlug,
      venueName,
      courtId: activeCourt.id,
      courtName: activeCourt.name,
      date: effectiveDate,
      timeSlot: bookingSlotTarget.timeSlot,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '9999999999',
      sport: activeCourt.sport,
      paymentMethod,
      hourlyPrice: bookingSlotTarget.hourlyPrice,
      advanceDeposit: bookingSlotTarget.advanceDeposit,
      upiVpa: venueSettings.upiVpa,
    })
    if (res.success && res.booking) {
      setCustomerName('')
      setCustomerPhone('')
      onMutationSuccess()
      onVoucherIssued(res.booking)
    } else {
      setStatusMessage(res.error || 'Could not confirm booking.')
    }
  }

  function handleWalkInSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) return
    const targetCourt = courts.find(c => c.id === walkInCourtId) || activeCourt
    const res = createQuickWalkInBooking({
      venueSlug,
      courtId: targetCourt.id,
      date: effectiveDate,
      timeSlot: walkInSlot,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '9999999999',
      totalAmount: targetCourt.defaultHourlyRate,
      paidAmount: paymentMethod === 'fully_paid' ? targetCourt.defaultHourlyRate : targetCourt.advanceDepositRate,
      paymentStatus: paymentMethod,
    })
    if (res.success && res.booking) {
      setCustomerName('')
      setCustomerPhone('')
      onMutationSuccess()
      onVoucherIssued(res.booking)
    } else {
      setStatusMessage(res.message)
    }
  }

  function handleRecurringSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) return
    const res = createRecurringSubscription({
      venueSlug,
      courtId: activeCourt.id,
      courtName: activeCourt.name,
      dayOfWeek,
      timeSlot: walkInSlot,
      startDate: new Date().toISOString().slice(0, 10),
      weeksCount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '9999999999',
      weeklyRate: activeCourt.defaultHourlyRate,
      advanceDepositPaid: activeCourt.advanceDepositRate * weeksCount,
    })
    setStatusMessage(res.message)
    onMutationSuccess()
  }

  function handleSettingsSubmit(e: FormEvent) {
    e.preventDefault()
    saveTurfVenueSettings(settingsForm)
    setStatusMessage('Venue UPI and confirmation settings saved.')
    onMutationSuccess()
  }

  function handlePricingSubmit(e: FormEvent) {
    e.preventDefault()
    saveTurfPricingConfig(pricingForm)
    setStatusMessage('Dynamic peak pricing configuration updated.')
    onMutationSuccess()
  }

  const drawerTitle =
    activeDrawer === 'booking'
      ? `Reserve ${bookingSlotTarget?.timeSlot || 'Slot'}`
      : activeDrawer === 'voucher'
        ? 'Player Booking Voucher'
        : activeDrawer === 'walkin'
          ? 'Quick Phone Walk-In Booking'
          : activeDrawer === 'recurring'
            ? 'Recurring Subscription & League Block'
            : activeDrawer === 'pricing'
              ? 'Dynamic Peak Hour Pricing'
              : 'Turf Settings & Direct UPI'

  return (
    <WorkspaceDetailDrawer
      open={true}
      onClose={onCloseDrawer}
      title={drawerTitle}
      statusMessage={statusMessage || undefined}
    >
      {activeDrawer === 'booking' && bookingSlotTarget && (
        <form onSubmit={handleBookSlotSubmit} className="turf-drawer-form">
          <p>
            <strong>{activeCourt.name}</strong> · {effectiveDate} · {bookingSlotTarget.timeSlot} · ₹
            {bookingSlotTarget.hourlyPrice.toLocaleString('en-IN')}
          </p>
          <label>
            Customer / Captain Name *
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
            />
          </label>
          <label>
            WhatsApp / Phone Number
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </label>
          <label>
            Settlement Status
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
            >
              <option value="upi_advance_paid">UPI Advance Paid (₹{bookingSlotTarget.advanceDeposit})</option>
              <option value="fully_paid">Fully Paid (₹{bookingSlotTarget.hourlyPrice})</option>
              <option value="pay_at_venue">Pay at Venue</option>
            </select>
          </label>
          <button type="submit" className="kg-btn-primary">Confirm Reservation &amp; Issue Voucher</button>
        </form>
      )}

      {activeDrawer === 'voucher' && activeVoucher && (
        <div className="turf-voucher-box">
          <h3>Ref #{activeVoucher.bookingId}</h3>
          <p><strong>{activeVoucher.venueName}</strong> — {activeVoucher.courtName}</p>
          <p>{activeVoucher.slotDate} · {activeVoucher.slotTime}</p>
          <p>Player: {activeVoucher.customerName} ({activeVoucher.customerPhone})</p>
          <p>
            Total: ₹{activeVoucher.totalAmount} · Paid: ₹{activeVoucher.paidAmount} · Balance: ₹
            {activeVoucher.balanceAmount}
          </p>
          <a
            href={generateWhatsAppTurfConfirmationUrl(activeVoucher, venueSettings.managerWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="kg-btn-primary"
          >
            Send Voucher via WhatsApp
          </a>
        </div>
      )}

      {activeDrawer === 'walkin' && (
        <form onSubmit={handleWalkInSubmit} className="turf-drawer-form">
          <label>
            Court / Pitch
            <select value={walkInCourtId} onChange={e => setWalkInCourtId(e.target.value)}>
              {courts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Time Slot
            <select value={walkInSlot} onChange={e => setWalkInSlot(e.target.value)}>
              {HOURLY_TIME_SLOTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Caller Name *
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
          </label>
          <label>
            Phone Number
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </label>
          <button type="submit" className="kg-btn-primary">Record Walk-In Booking</button>
        </form>
      )}

      {activeDrawer === 'recurring' && (
        <form onSubmit={handleRecurringSubmit} className="turf-drawer-form">
          <label>
            Team / Academy Name *
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
          </label>
          <label>
            Contact Phone
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </label>
          <label>
            Day of Week
            <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </label>
          <label>
            Weekly Time Slot
            <select value={walkInSlot} onChange={e => setWalkInSlot(e.target.value)}>
              {HOURLY_TIME_SLOTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Number of Weeks
            <input
              type="number"
              min={2}
              max={24}
              value={weeksCount}
              onChange={e => setWeeksCount(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="kg-btn-primary">Create Recurring Subscription</button>
        </form>
      )}

      {activeDrawer === 'pricing' && (
        <form onSubmit={handlePricingSubmit} className="turf-drawer-form">
          <label>
            <input
              type="checkbox"
              checked={pricingForm.isDynamicPricingEnabled}
              onChange={e => setPricingForm(p => ({ ...p, isDynamicPricingEnabled: e.target.checked }))}
            />{' '}
            Enable Dynamic Peak Pricing
          </label>
          <label>
            Peak Multiplier (e.g. 1.35)
            <input
              type="number"
              step="0.05"
              value={pricingForm.peakMultiplier}
              onChange={e => setPricingForm(p => ({ ...p, peakMultiplier: Number(e.target.value) }))}
            />
          </label>
          <label>
            Weekend Multiplier (e.g. 1.25)
            <input
              type="number"
              step="0.05"
              value={pricingForm.weekendMultiplier}
              onChange={e => setPricingForm(p => ({ ...p, weekendMultiplier: Number(e.target.value) }))}
            />
          </label>
          <button type="submit" className="kg-btn-primary">Save Pricing Rules</button>
        </form>
      )}

      {activeDrawer === 'settings' && (
        <form onSubmit={handleSettingsSubmit} className="turf-drawer-form">
          <label>
            Manager Name
            <input
              type="text"
              value={settingsForm.managerName}
              onChange={e => setSettingsForm(s => ({ ...s, managerName: e.target.value }))}
            />
          </label>
          <label>
            Direct UPI VPA (0% Commission)
            <input
              type="text"
              value={settingsForm.upiVpa}
              onChange={e => setSettingsForm(s => ({ ...s, upiVpa: e.target.value }))}
            />
          </label>
          <label>
            Manager WhatsApp Number
            <input
              type="tel"
              value={settingsForm.managerWhatsApp}
              onChange={e => setSettingsForm(s => ({ ...s, managerWhatsApp: e.target.value }))}
            />
          </label>
          <button type="submit" className="kg-btn-primary">Save Facility Settings</button>
        </form>
      )}
    </WorkspaceDetailDrawer>
  )
}
