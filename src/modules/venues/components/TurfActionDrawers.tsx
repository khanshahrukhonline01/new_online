import { useEffect, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { useFormState } from '../../../shared/hooks/useFormState'
import { generateQrSvgString } from '../../../shared/utils/qrCodeGenerator'
import {
  bookTurfSlot,
  createQuickWalkInBooking,
  createRecurringSubscription,
  generateTurfUpiPayLink,
  generateWhatsAppTurfConfirmationUrl,
  getRecurringSubscriptions,
  saveTurfPricingConfig,
  saveTurfVenueSettings,
  type TurfBookingRecord,
  type TurfCourt,
  type TurfPricingConfig,
  type TurfSlot,
  type TurfVenueSettings,
} from '../turfSlotManager'
import type { TurfActiveDrawer } from '../turfCalendarTypes'

interface TurfActionDrawersProps {
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

interface BookingFormFields extends Record<string, unknown> {
  customerName: string
  customerPhone: string
  paymentMethod: 'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'
}

interface SettingsFormFields extends Record<string, unknown> {
  managerName: string
  managerPhone: string
  upiVpa: string
}

interface WalkInFormFields extends Record<string, unknown> {
  name: string
  phone: string
  courtId: string
  timeSlot: string
  paymentStatus: 'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'
}

interface RecurringFormFields extends Record<string, unknown> {
  customerName: string
  customerPhone: string
  dayOfWeek: number
  timeSlot: string
  weeksCount: number
  weeklyRate: number
  deposit: number
}

/**
 * Accessible slide-over drawers replacing inline modal backdrops for turf slot reservations,
 * QR gate vouchers, UPI settings, peak pricing, walk-ins, and weekly subscriptions.
 */
export function TurfActionDrawers({
  activeDrawer,
  onCloseDrawer,
  venueSlug,
  venueName,
  activeCourt,
  courts,
  effectiveDate,
  selectedDate,
  venueSettings,
  initialPricingConfig,
  bookingSlotTarget,
  activeVoucher,
  onVoucherIssued,
  onMutationSuccess,
}: TurfActionDrawersProps) {
  const [drawerFeedback, setDrawerFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [pricingConfig, setPricingConfig] = useState<TurfPricingConfig>(initialPricingConfig)

  const bookingForm = useFormState<BookingFormFields>({
    customerName: '',
    customerPhone: '',
    paymentMethod: 'upi_advance_paid',
  })

  const settingsForm = useFormState<SettingsFormFields>({
    managerName: venueSettings.managerName,
    managerPhone: venueSettings.managerWhatsApp,
    upiVpa: venueSettings.upiVpa,
  })

  const walkInForm = useFormState<WalkInFormFields>({
    name: '',
    phone: '',
    courtId: activeCourt.id,
    timeSlot: '07:00 PM – 08:00 PM',
    paymentStatus: 'fully_paid',
  })

  const recurringForm = useFormState<RecurringFormFields>({
    customerName: '',
    customerPhone: '',
    dayOfWeek: 0,
    timeSlot: '06:00 AM – 08:00 AM',
    weeksCount: 8,
    weeklyRate: 2000,
    deposit: 4000,
  })

  useEffect(() => {
    setDrawerFeedback(null)
    if (activeDrawer === 'settings') {
      settingsForm.reset({
        managerName: venueSettings.managerName,
        managerPhone: venueSettings.managerWhatsApp,
        upiVpa: venueSettings.upiVpa,
      })
    } else if (activeDrawer === 'pricing') {
      setPricingConfig(initialPricingConfig)
    } else if (activeDrawer === 'walkin') {
      walkInForm.setField('courtId', activeCourt.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrawer, venueSettings.managerName, venueSettings.managerWhatsApp, venueSettings.upiVpa, activeCourt.id])

  function handleConfirmBooking(e: FormEvent) {
    e.preventDefault()
    if (!bookingSlotTarget) return
    setDrawerFeedback(null)

    if (bookingForm.fields.customerName.trim().length < 2) {
      setDrawerFeedback({ tone: 'error', text: 'Please enter full customer or team captain name.' })
      return
    }
    if (bookingForm.fields.customerPhone.replace(/\D/g, '').length < 10) {
      setDrawerFeedback({ tone: 'error', text: 'Please enter a valid 10-digit mobile number.' })
      return
    }

    const res = bookTurfSlot({
      venueSlug,
      venueName,
      courtId: activeCourt.id,
      courtName: activeCourt.name,
      date: effectiveDate,
      timeSlot: bookingSlotTarget.timeSlot,
      customerName: bookingForm.fields.customerName.trim(),
      customerPhone: bookingForm.fields.customerPhone.replace(/\D/g, ''),
      sport: activeCourt.sport,
      paymentMethod: bookingForm.fields.paymentMethod,
      hourlyPrice: bookingSlotTarget.hourlyPrice,
      advanceDeposit: bookingSlotTarget.advanceDeposit,
      upiVpa: venueSettings.upiVpa,
    })

    if (!res.success || !res.booking) {
      setDrawerFeedback({ tone: 'error', text: res.error || 'Failed to book slot.' })
      return
    }

    bookingForm.reset()
    onVoucherIssued(res.booking)
    onMutationSuccess()
  }

  function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    saveTurfVenueSettings({
      venueSlug,
      venueName,
      managerName: settingsForm.fields.managerName.trim(),
      managerWhatsApp: settingsForm.fields.managerPhone.replace(/\D/g, ''),
      upiVpa: settingsForm.fields.upiVpa.trim(),
      allowPayAtVenue: true,
      autoWhatsAppConfirmEnabled: true,
    })
    onMutationSuccess()
    onCloseDrawer()
  }

  function handleSavePricing(e: FormEvent) {
    e.preventDefault()
    saveTurfPricingConfig(pricingConfig)
    onMutationSuccess()
    onCloseDrawer()
  }

  function handleQuickWalkIn(e: FormEvent) {
    e.preventDefault()
    if (!walkInForm.fields.name.trim() || !walkInForm.fields.phone.trim()) {
      setDrawerFeedback({ tone: 'error', text: 'Please enter customer name and phone.' })
      return
    }
    const res = createQuickWalkInBooking({
      venueSlug,
      courtId: walkInForm.fields.courtId,
      date: selectedDate || effectiveDate,
      timeSlot: walkInForm.fields.timeSlot,
      customerName: walkInForm.fields.name.trim(),
      customerPhone: walkInForm.fields.phone.trim(),
      totalAmount: 1500,
      paidAmount: 1500,
      paymentStatus: walkInForm.fields.paymentStatus,
    })
    setDrawerFeedback({ tone: res.success ? 'success' : 'error', text: res.message })
    if (res.success) {
      walkInForm.setField('name', '')
      walkInForm.setField('phone', '')
      onMutationSuccess()
    }
  }

  function handleCreateSubscription(e: FormEvent) {
    e.preventDefault()
    if (!recurringForm.fields.customerName.trim() || !recurringForm.fields.customerPhone.trim()) {
      setDrawerFeedback({ tone: 'error', text: 'Please enter customer/club name and phone.' })
      return
    }
    const court = courts.find(c => c.id === walkInForm.fields.courtId) || courts[0]
    const res = createRecurringSubscription({
      venueSlug,
      courtId: court?.id || 'court-1',
      courtName: court?.name || 'Pitch 1',
      dayOfWeek: Number(recurringForm.fields.dayOfWeek),
      timeSlot: recurringForm.fields.timeSlot,
      startDate: selectedDate || effectiveDate,
      weeksCount: Number(recurringForm.fields.weeksCount),
      customerName: recurringForm.fields.customerName.trim(),
      customerPhone: recurringForm.fields.customerPhone.trim(),
      weeklyRate: Number(recurringForm.fields.weeklyRate),
      advanceDepositPaid: Number(recurringForm.fields.deposit),
    })
    setDrawerFeedback({ tone: res.success ? 'success' : 'error', text: res.message })
    if (res.success) {
      recurringForm.setField('customerName', '')
      recurringForm.setField('customerPhone', '')
      onMutationSuccess()
    }
  }

  return (
    <>
      <WorkspaceDetailDrawer
        open={activeDrawer === 'booking' && Boolean(bookingSlotTarget)}
        onClose={onCloseDrawer}
        title={bookingSlotTarget ? `Reserve Slot — ${bookingSlotTarget.timeSlot}` : 'Reserve Slot'}
        statusMessage={drawerFeedback?.text}
        statusTone={drawerFeedback?.tone}
      >
        {bookingSlotTarget && (
          <form onSubmit={handleConfirmBooking}>
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><strong>Venue:</strong> {venueName}</div>
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
                value={bookingForm.fields.customerName}
                onChange={e => bookingForm.setField('customerName', e.target.value)}
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
                value={bookingForm.fields.customerPhone}
                onChange={e => bookingForm.setField('customerPhone', e.target.value)}
                placeholder="10-digit mobile number"
                required
              />
            </div>

            <div className="turf-form-group">
              <label>Payment Settlement Mode</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`turf-date-chip ${bookingForm.fields.paymentMethod === 'upi_advance_paid' ? 'active' : ''}`}
                  onClick={() => bookingForm.setField('paymentMethod', 'upi_advance_paid')}
                >
                  UPI Advance (₹{bookingSlotTarget.advanceDeposit})
                </button>
                <button
                  type="button"
                  className={`turf-date-chip ${bookingForm.fields.paymentMethod === 'fully_paid' ? 'active' : ''}`}
                  onClick={() => bookingForm.setField('paymentMethod', 'fully_paid')}
                >
                  Full UPI (₹{bookingSlotTarget.hourlyPrice})
                </button>
                <button
                  type="button"
                  className={`turf-date-chip ${bookingForm.fields.paymentMethod === 'pay_at_venue' ? 'active' : ''}`}
                  onClick={() => bookingForm.setField('paymentMethod', 'pay_at_venue')}
                >
                  Pay at Venue
                </button>
              </div>
            </div>

            {bookingForm.fields.paymentMethod !== 'pay_at_venue' && (
              <div className="turf-qr-box">
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent, #059669)', marginBottom: '0.5rem' }}>
                  Instant On-Desk UPI QR (0% Commission)
                </div>
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(
                    generateQrSvgString(
                      generateTurfUpiPayLink({
                        vpa: venueSettings.upiVpa,
                        name: venueName,
                        amount:
                          bookingForm.fields.paymentMethod === 'fully_paid'
                            ? bookingSlotTarget.hourlyPrice
                            : bookingSlotTarget.advanceDeposit,
                        note: `Turf Slot ${bookingSlotTarget.timeSlot}`,
                      }),
                      { size: 160 }
                    )
                  )}`}
                  alt="UPI Payment QR Code"
                  className="turf-qr-img"
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Scan with PhonePe, GPay, or Paytm to settle{' '}
                  <strong>
                    ₹
                    {bookingForm.fields.paymentMethod === 'fully_paid'
                      ? bookingSlotTarget.hourlyPrice
                      : bookingSlotTarget.advanceDeposit}
                  </strong>{' '}
                  directly to <strong>{venueSettings.upiVpa}</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="turf-btn turf-btn-outline" onClick={onCloseDrawer}>
                Cancel
              </button>
              <button type="submit" className="turf-btn turf-btn-primary">
                Confirm Reservation →
              </button>
            </div>
          </form>
        )}
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={activeDrawer === 'voucher' && Boolean(activeVoucher)}
        onClose={onCloseDrawer}
        title="Turf Reservation Voucher"
      >
        {activeVoucher && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '0.75rem', background: 'var(--accent-soft, #ecfdf5)', borderRadius: '8px', color: 'var(--accent, #065f46)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
              ✓ Reservation Confirmed: #{activeVoucher.bookingId}
            </div>

            <div style={{ textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem' }}>
              <div><strong>Facility:</strong> {activeVoucher.venueName}</div>
              <div><strong>Court / Pitch:</strong> {activeVoucher.courtName} ({activeVoucher.sport})</div>
              <div><strong>Date &amp; Time:</strong> {activeVoucher.slotDate} · {activeVoucher.slotTime}</div>
              <div><strong>Team / Player:</strong> {activeVoucher.customerName} (+91 {activeVoucher.customerPhone})</div>
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--line)' }}>
                <strong>Tariff:</strong> ₹{activeVoucher.totalAmount} (Paid: ₹{activeVoucher.paidAmount} · Balance: ₹{activeVoucher.balanceAmount})
              </div>
            </div>

            <div className="turf-qr-box">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(
                  generateQrSvgString(activeVoucher.qrCodePayload, { size: 180 })
                )}`}
                alt="Turf Gate Entry QR Code"
                className="turf-qr-img"
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
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
        )}
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={activeDrawer === 'settings'}
        onClose={onCloseDrawer}
        title="Turf Settings & UPI Configuration"
      >
        <form onSubmit={handleSaveSettings}>
          <div className="turf-form-group">
            <label htmlFor="settings-manager-name">Operations Manager Name</label>
            <input
              id="settings-manager-name"
              type="text"
              className="turf-form-input"
              value={settingsForm.fields.managerName}
              onChange={e => settingsForm.setField('managerName', e.target.value)}
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
              value={settingsForm.fields.managerPhone}
              onChange={e => settingsForm.setField('managerPhone', e.target.value)}
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
              value={settingsForm.fields.upiVpa}
              onChange={e => settingsForm.setField('upiVpa', e.target.value)}
              placeholder="e.g. kanteeravaturf@okhdfcbank"
              required
            />
            <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--accent, #059669)', fontSize: '0.78rem' }}>
              ✓ 100% direct bank deposit. KhelGrid charges 0% platform fee during grassroots launch.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="turf-btn turf-btn-outline" onClick={onCloseDrawer}>
              Cancel
            </button>
            <button type="submit" className="turf-btn turf-btn-primary">
              Save Configuration
            </button>
          </div>
        </form>
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={activeDrawer === 'pricing'}
        onClose={onCloseDrawer}
        title="⚡ Dynamic Peak-Hour Yield & Pricing"
      >
        <form onSubmit={handleSavePricing}>
          <div className="turf-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={pricingConfig.isDynamicPricingEnabled}
                onChange={e => setPricingConfig({ ...pricingConfig, isDynamicPricingEnabled: e.target.checked })}
              />
              <span>Enable Automatic Dynamic Peak Pricing</span>
            </label>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
              Automatically adjusts rates for evening prime floodlight slots (18:00 – 23:00) and weekends.
            </small>
          </div>

          {pricingConfig.isDynamicPricingEnabled && (
            <>
              <div className="turf-form-group">
                <label htmlFor="pricing-peak-mult">Evening Floodlit Peak Multiplier</label>
                <select
                  id="pricing-peak-mult"
                  className="turf-form-input"
                  value={pricingConfig.peakMultiplier}
                  onChange={e => setPricingConfig({ ...pricingConfig, peakMultiplier: parseFloat(e.target.value) })}
                >
                  <option value="1.20">+20% (1.20x standard rate)</option>
                  <option value="1.35">+35% (1.35x prime floodlight)</option>
                  <option value="1.50">+50% (1.50x high demand peak)</option>
                  <option value="1.75">+75% (1.75x tournament weekend)</option>
                </select>
              </div>

              <div className="turf-form-group">
                <label htmlFor="pricing-weekend-mult">Weekend High-Demand Multiplier</label>
                <select
                  id="pricing-weekend-mult"
                  className="turf-form-input"
                  value={pricingConfig.weekendMultiplier}
                  onChange={e => setPricingConfig({ ...pricingConfig, weekendMultiplier: parseFloat(e.target.value) })}
                >
                  <option value="1.15">+15% Saturday &amp; Sunday boost</option>
                  <option value="1.25">+25% Standard weekend rate</option>
                  <option value="1.40">+40% Weekend tournament rate</option>
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="turf-btn turf-btn-outline" onClick={onCloseDrawer}>
              Cancel
            </button>
            <button type="submit" className="turf-btn turf-btn-primary">
              Save Pricing Rules
            </button>
          </div>
        </form>
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={activeDrawer === 'walkin'}
        onClose={onCloseDrawer}
        title="⚡ 5-Second Phone / Walk-In Reservation"
        statusMessage={drawerFeedback?.text}
        statusTone={drawerFeedback?.tone}
      >
        <form onSubmit={handleQuickWalkIn}>
          <div className="turf-form-group">
            <label htmlFor="walkin-name">Customer / Captain Name</label>
            <input
              id="walkin-name"
              type="text"
              className="turf-form-input"
              placeholder="e.g. Sameer Khan"
              value={walkInForm.fields.name}
              onChange={e => walkInForm.setField('name', e.target.value)}
              required
            />
          </div>
          <div className="turf-form-group">
            <label htmlFor="walkin-phone">Mobile Phone (for instant WhatsApp pass)</label>
            <input
              id="walkin-phone"
              type="tel"
              className="turf-form-input"
              placeholder="e.g. 9876543210"
              value={walkInForm.fields.phone}
              onChange={e => walkInForm.setField('phone', e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="turf-form-group">
              <label htmlFor="walkin-court">Court</label>
              <select
                id="walkin-court"
                className="turf-form-input"
                value={walkInForm.fields.courtId}
                onChange={e => walkInForm.setField('courtId', e.target.value)}
              >
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="turf-form-group">
              <label htmlFor="walkin-slot">Time Slot</label>
              <input
                id="walkin-slot"
                type="text"
                className="turf-form-input"
                value={walkInForm.fields.timeSlot}
                onChange={e => walkInForm.setField('timeSlot', e.target.value)}
              />
            </div>
          </div>
          <div className="turf-form-group">
            <label htmlFor="walkin-pay-status">Payment Status</label>
            <select
              id="walkin-pay-status"
              className="turf-form-input"
              value={walkInForm.fields.paymentStatus}
              onChange={e => walkInForm.setField('paymentStatus', e.target.value as WalkInFormFields['paymentStatus'])}
            >
              <option value="fully_paid">Fully Paid (Cash / UPI at Counter)</option>
              <option value="upi_advance_paid">Advance Deposit Paid</option>
              <option value="pay_at_venue">Pay Post-Match (Trusted regular)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="turf-btn turf-btn-outline" onClick={onCloseDrawer}>Cancel</button>
            <button type="submit" className="turf-btn turf-btn-primary">Confirm &amp; Generate WhatsApp Pass</button>
          </div>
        </form>
      </WorkspaceDetailDrawer>

      <WorkspaceDetailDrawer
        open={activeDrawer === 'recurring'}
        onClose={onCloseDrawer}
        title="📅 Recurring Slot Subscriptions & Weekend Leagues"
        statusMessage={drawerFeedback?.text}
        statusTone={drawerFeedback?.tone}
        width={620}
      >
        <div>
          <form onSubmit={handleCreateSubscription} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Add New Weekly Recurring Reservation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="turf-form-group">
                <label htmlFor="rec-name">Team / Corporate Name</label>
                <input
                  id="rec-name"
                  type="text"
                  className="turf-form-input"
                  placeholder="e.g. Infosys Weekend Club"
                  value={recurringForm.fields.customerName}
                  onChange={e => recurringForm.setField('customerName', e.target.value)}
                  required
                />
              </div>
              <div className="turf-form-group">
                <label htmlFor="rec-phone">Captain Mobile</label>
                <input
                  id="rec-phone"
                  type="tel"
                  className="turf-form-input"
                  placeholder="e.g. 9845012345"
                  value={recurringForm.fields.customerPhone}
                  onChange={e => recurringForm.setField('customerPhone', e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="turf-form-group">
                <label htmlFor="rec-day">Day of Week</label>
                <select
                  id="rec-day"
                  className="turf-form-input"
                  value={recurringForm.fields.dayOfWeek}
                  onChange={e => recurringForm.setField('dayOfWeek', parseInt(e.target.value, 10))}
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div className="turf-form-group">
                <label htmlFor="rec-slot">Slot Time</label>
                <input
                  id="rec-slot"
                  type="text"
                  className="turf-form-input"
                  value={recurringForm.fields.timeSlot}
                  onChange={e => recurringForm.setField('timeSlot', e.target.value)}
                />
              </div>
              <div className="turf-form-group">
                <label htmlFor="rec-weeks">Duration (Weeks)</label>
                <input
                  id="rec-weeks"
                  type="number"
                  min={2}
                  max={52}
                  className="turf-form-input"
                  value={recurringForm.fields.weeksCount}
                  onChange={e => recurringForm.setField('weeksCount', parseInt(e.target.value, 10) || 2)}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="turf-form-group">
                <label htmlFor="rec-rate">Weekly Rate (INR)</label>
                <input
                  id="rec-rate"
                  type="number"
                  className="turf-form-input"
                  value={recurringForm.fields.weeklyRate}
                  onChange={e => recurringForm.setField('weeklyRate', parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="turf-form-group">
                <label htmlFor="rec-deposit">Advance Deposit Paid</label>
                <input
                  id="rec-deposit"
                  type="number"
                  className="turf-form-input"
                  value={recurringForm.fields.deposit}
                  onChange={e => recurringForm.setField('deposit', parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="turf-btn turf-btn-primary">Create Recurring Subscription</button>
            </div>
          </form>

          <div>
            <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Active Subscriptions</h3>
            {getRecurringSubscriptions(venueSlug).length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No active recurring subscriptions for this venue.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {getRecurringSubscriptions(venueSlug).map(sub => (
                  <div
                    key={sub.subscriptionId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <strong>{sub.customerName}</strong> ({sub.customerPhone}) · {sub.timeSlot}
                      <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                        {sub.weeksCount} weeks ({sub.startDate} to {sub.endDate}) · Total: ₹{sub.totalFee} · Balance: ₹{sub.balanceDue}
                      </div>
                    </div>
                    <span className="kg-badge">{sub.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </WorkspaceDetailDrawer>
    </>
  )
}
