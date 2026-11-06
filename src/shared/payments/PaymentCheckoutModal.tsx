import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../components/SiteIcon'
import {
  generateOrderId,
  generateUpiUri,
  recordPaymentTransaction,
} from './paymentService'
import type { PaymentCustomer, PaymentItem, PaymentMethod, PaymentResult } from './paymentTypes'
import './PaymentCheckoutModal.css'

export interface PaymentCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  item: PaymentItem
  initialCustomer?: Partial<PaymentCustomer>
  onSuccess: (result: PaymentResult) => void
  allowPayAtVenue?: boolean
}

export function PaymentCheckoutModal({
  isOpen,
  onClose,
  item,
  initialCustomer,
  onSuccess,
  allowPayAtVenue = true,
}: PaymentCheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [name, setName] = useState(initialCustomer?.name || '')
  const [phone, setPhone] = useState(initialCustomer?.phone || '')
  const [email, setEmail] = useState(initialCustomer?.email || '')
  const [upiRef, setUpiRef] = useState('')
  const [copiedVpa, setCopiedVpa] = useState(false)
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const [completedResult, setCompletedResult] = useState<PaymentResult | null>(null)

  if (!isOpen) return null

  const orderId = generateOrderId()
  const upiUri = generateUpiUri({
    amount: item.amount,
    transactionNote: `KhelGrid ${item.title}`.slice(0, 40),
    orderId,
  })

  const handleCopyVpa = () => {
    navigator.clipboard?.writeText('khelgrid@icici')
    setCopiedVpa(true)
    setTimeout(() => setCopiedVpa(false), 2000)
  }

  const handleOpenUpiApp = () => {
    window.location.href = upiUri
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const cleanName = name.trim()
    const cleanPhone = phone.replace(/\D/g, '')

    if (cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).')
      return
    }

    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for confirmation.')
      return
    }

    setStep('processing')

    try {
      // Simulate bank network authorization
      await new Promise(resolve => setTimeout(resolve, 1200))

      const paymentId =
        method === 'pay_at_venue'
          ? `VENUE_${Date.now().toString().slice(-6)}`
          : upiRef.trim()
            ? `UPI_${upiRef.trim().toUpperCase()}`
            : `KG_PAY_${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      const customer: PaymentCustomer = {
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined,
      }

      const result = await recordPaymentTransaction({
        orderId,
        paymentId,
        customer,
        item,
        method,
        status: method === 'pay_at_venue' ? 'pay_at_venue' : 'completed',
      })

      setCompletedResult(result)
      setStep('success')
      onSuccess(result)
    } catch {
      setErrorMsg('Payment verification failed. Please try again.')
      setStep('input')
    }
  }

  return (
    <div className="kg-checkout-overlay" onClick={onClose}>
      <div
        className="kg-checkout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kg-checkout-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="kg-checkout-header">
          <div className="kg-checkout-header-left">
            <div className="kg-checkout-emoji-box">{item.emoji || '⚡'}</div>
            <div className="kg-checkout-title-wrap">
              <h3 id="kg-checkout-title">{item.title}</h3>
              <p className="kg-checkout-subtitle">
                <SiteIcon name="map-pin" size={13} />
                <span>
                  {[item.venueName, item.city, item.dateOrTime].filter(Boolean).join(' · ')}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="kg-checkout-close"
            onClick={onClose}
            aria-label="Close checkout"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        {/* Price Bar */}
        <div className="kg-checkout-price-bar">
          <div>
            <div className="kg-checkout-price-label">Total Payable</div>
            <small style={{ opacity: 0.85, fontSize: '11px' }}>Inclusive of sports ground reservation fee</small>
          </div>
          <div className="kg-checkout-amount">₹{item.amount}</div>
        </div>

        {/* Step 1: Input & Payment Method */}
        {step === 'input' && (
          <form onSubmit={handleSubmit}>
            {/* Method Tabs */}
            <div className="kg-checkout-methods">
              <button
                type="button"
                className={`kg-method-btn ${method === 'upi' ? 'active' : ''}`}
                onClick={() => setMethod('upi')}
              >
                <SiteIcon name="smartphone" size={15} />
                <span>UPI (GPay / PhonePe)</span>
              </button>
              <button
                type="button"
                className={`kg-method-btn ${method === 'card' ? 'active' : ''}`}
                onClick={() => setMethod('card')}
              >
                <SiteIcon name="credit-card" size={15} />
                <span>Cards / NetBanking</span>
              </button>
              {allowPayAtVenue && (
                <button
                  type="button"
                  className={`kg-method-btn ${method === 'pay_at_venue' ? 'active' : ''}`}
                  onClick={() => setMethod('pay_at_venue')}
                >
                  <SiteIcon name="wallet" size={15} />
                  <span>Pay at Ground</span>
                </button>
              )}
            </div>

            <div className="kg-checkout-body">
              {/* Customer Info */}
              <div className="kg-customer-grid">
                <div className="kg-field-group">
                  <label htmlFor="kg-name">Your Full Name *</label>
                  <input
                    id="kg-name"
                    type="text"
                    className="kg-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    required
                  />
                </div>
                <div className="kg-field-group">
                  <label htmlFor="kg-phone">Mobile (for WhatsApp Pass) *</label>
                  <input
                    id="kg-phone"
                    type="tel"
                    className="kg-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>

              <div className="kg-field-group">
                <label htmlFor="kg-email">Email Address (Optional, for tax invoice)</label>
                <input
                  id="kg-email"
                  type="email"
                  className="kg-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              {/* UPI Tab */}
              {method === 'upi' && (
                <div className="kg-upi-card">
                  <div className="kg-upi-apps-row">
                    <span className="kg-upi-badge">Google Pay</span>
                    <span className="kg-upi-badge">PhonePe</span>
                    <span className="kg-upi-badge">Paytm</span>
                    <span className="kg-upi-badge">CRED</span>
                    <span className="kg-upi-badge">BHIM</span>
                  </div>

                  {/* High contrast SVG QR visual */}
                  <div className="kg-upi-qr-wrapper" title="Scan with GPay, PhonePe, Paytm, or BHIM">
                    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                      <rect width="140" height="140" rx="8" fill="#ffffff" />
                      {/* Top Left Marker */}
                      <rect x="10" y="10" width="36" height="36" rx="4" fill="#0f172a" />
                      <rect x="16" y="16" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="22" y="22" width="12" height="12" fill="#059669" />
                      {/* Top Right Marker */}
                      <rect x="94" y="10" width="36" height="36" rx="4" fill="#0f172a" />
                      <rect x="100" y="16" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="106" y="22" width="12" height="12" fill="#059669" />
                      {/* Bottom Left Marker */}
                      <rect x="10" y="94" width="36" height="36" rx="4" fill="#0f172a" />
                      <rect x="16" y="100" width="24" height="24" rx="2" fill="#ffffff" />
                      <rect x="22" y="106" width="12" height="12" fill="#059669" />
                      {/* Simulated QR Pattern Dots */}
                      <rect x="52" y="12" width="8" height="8" fill="#0f172a" />
                      <rect x="68" y="12" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="28" width="8" height="8" fill="#0f172a" />
                      <rect x="76" y="28" width="8" height="8" fill="#0f172a" />
                      <rect x="12" y="52" width="8" height="8" fill="#0f172a" />
                      <rect x="28" y="60" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="52" width="36" height="36" rx="6" fill="#059669" />
                      <text x="70" y="76" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">₹</text>
                      <rect x="96" y="56" width="8" height="8" fill="#0f172a" />
                      <rect x="112" y="64" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="96" width="8" height="8" fill="#0f172a" />
                      <rect x="68" y="104" width="8" height="8" fill="#0f172a" />
                      <rect x="84" y="96" width="8" height="8" fill="#0f172a" />
                      <rect x="104" y="112" width="8" height="8" fill="#0f172a" />
                      <rect x="120" y="96" width="8" height="8" fill="#0f172a" />
                    </svg>
                  </div>

                  <div className="kg-upi-vpa-copy">
                    <span>UPI ID:</span>
                    <strong>khelgrid@icici</strong>
                    <button type="button" className="kg-copy-btn" onClick={handleCopyVpa}>
                      {copiedVpa ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <button type="button" className="kg-upi-intent-btn" onClick={handleOpenUpiApp}>
                    <SiteIcon name="smartphone" size={16} />
                    <span>Open in UPI App (GPay / PhonePe)</span>
                  </button>

                  <div className="kg-field-group" style={{ width: '100%', textAlign: 'left' }}>
                    <label htmlFor="kg-utr">UPI UTR / Reference No. (Optional for manual bank transfers)</label>
                    <input
                      id="kg-utr"
                      type="text"
                      className="kg-input"
                      value={upiRef}
                      onChange={e => setUpiRef(e.target.value)}
                      placeholder="e.g. 430219842109"
                    />
                  </div>
                </div>
              )}

              {/* Card / NetBanking Tab */}
              {method === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="kg-field-group">
                    <label>Card Number</label>
                    <input
                      type="text"
                      className="kg-input"
                      placeholder="4532 •••• •••• 8920 (Visa, Mastercard, RuPay)"
                      defaultValue="4532 8920 1204 7781"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="kg-field-group">
                      <label>Expiry MM/YY</label>
                      <input type="text" className="kg-input" placeholder="MM / YY" defaultValue="08/29" />
                    </div>
                    <div className="kg-field-group">
                      <label>CVV</label>
                      <input type="password" maxLength={4} className="kg-input" placeholder="•••" defaultValue="782" />
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <SiteIcon name="lock" size={12} />
                    <span>256-bit SSL encrypted. Test sandbox active in development.</span>
                  </p>
                </div>
              )}

              {/* Pay at Venue Tab */}
              {method === 'pay_at_venue' && (
                <div className="kg-venue-pay-card">
                  <div className="kg-venue-pay-header">
                    <SiteIcon name="wallet" size={20} />
                    <span>Pay in Person at the Ground</span>
                  </div>
                  <p className="kg-venue-pay-body">
                    Your spot will be instantly reserved without making an online transaction today.
                    You can pay the match host or facility reception in cash or via their personal UPI QR when you arrive.
                  </p>
                  <ul className="kg-venue-pay-guidelines">
                    <li>Arrive 15 minutes before the match start time.</li>
                    <li>Carry the exact amount (₹{item.amount}) in cash or via your UPI app.</li>
                    <li>If you cannot attend, please cancel your spot so waitlisted players can join.</li>
                  </ul>
                </div>
              )}

              {errorMsg && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="kg-checkout-footer">
              <button type="button" className="kg-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="kg-btn-pay">
                <SiteIcon name={method === 'pay_at_venue' ? 'check' : 'lock'} size={16} />
                <span>
                  {method === 'pay_at_venue' ? 'Lock Spot (Pay at Ground)' : `Pay ₹${item.amount} & Confirm`}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="kg-checkout-processing">
            <div className="kg-spinner-box">₹</div>
            <h4>Verifying Payment with NPCI &amp; Bank...</h4>
            <p>Please do not close or refresh this window.</p>
          </div>
        )}

        {/* Step 3: Success Receipt */}
        {step === 'success' && completedResult && (
          <div className="kg-checkout-success">
            <div className="kg-success-icon-badge">
              <SiteIcon name="check-circle" size={38} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800 }}>
                {completedResult.method === 'pay_at_venue' ? 'Spot Reserved Successfully!' : 'Payment Confirmed!'}
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                {completedResult.method === 'pay_at_venue'
                  ? `Please pay ₹${item.amount} directly to the match host at the venue.`
                  : `₹${item.amount} received via ${completedResult.method.toUpperCase()}. Your pass is ready.`}
              </p>
            </div>

            <div className="kg-success-receipt-card">
              <div className="kg-receipt-row">
                <span>Receipt / Pass Ref:</span>
                <strong className="kg-receipt-ref-code">{completedResult.receiptRef}</strong>
              </div>
              <div className="kg-receipt-row">
                <span>Item:</span>
                <strong>{item.title}</strong>
              </div>
              <div className="kg-receipt-row">
                <span>Player / Payer:</span>
                <strong>{name} ({phone})</strong>
              </div>
              <div className="kg-receipt-row">
                <span>Venue &amp; Time:</span>
                <strong>{[item.venueName, item.city, item.dateOrTime].filter(Boolean).join(' · ')}</strong>
              </div>
              <div className="kg-receipt-row">
                <span>Total Amount:</span>
                <strong>₹{completedResult.amount} ({completedResult.method === 'pay_at_venue' ? 'Pay at Ground' : 'Paid'})</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                className="kg-btn-cancel"
                style={{ flex: 1 }}
                onClick={() => window.print?.()}
              >
                <SiteIcon name="download" size={15} />
                <span>Print Pass</span>
              </button>
              <button
                type="button"
                className="kg-btn-pay"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
