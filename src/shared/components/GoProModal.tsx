import { useState, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { PaymentCheckoutModal } from '../payments/PaymentCheckoutModal'
import type { PaymentItem, PaymentResult } from '../payments/paymentTypes'
import { PRO_TIERS, type ProBillingPeriod } from './goProTypes'
import './GoProModal.css'

export interface GoProModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  onPlanSelected?: (plan: { id: string; name: string; amount: number; period: ProBillingPeriod }) => void
}

export default function GoProModal({
  isOpen,
  onClose,
  onNavigate,
  onPlanSelected,
}: GoProModalProps) {
  const [billingCycle, setBillingCycle] = useState<ProBillingPeriod>('annual')
  const [selectedTierId, setSelectedTierId] = useState<'athlete' | 'coach' | 'academy'>('coach')
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [celebrationToast, setCelebrationToast] = useState(false)

  if (!isOpen) return null

  const selectedTier = PRO_TIERS.find(t => t.id === selectedTierId) || PRO_TIERS[1]
  const currentPrice = billingCycle === 'annual' ? selectedTier.annualPrice : selectedTier.monthlyPrice

  const handleStartCheckout = () => {
    onPlanSelected?.({
      id: selectedTier.id,
      name: selectedTier.name,
      amount: currentPrice,
      period: billingCycle,
    })

    const item: PaymentItem = {
      id: `sub_${selectedTier.id}_${billingCycle}`,
      type: 'membership',
      title: `KhelGrid Pro · ${selectedTier.name} (${billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'})`,
      amount: currentPrice,
      currency: 'INR',
    }

    setCheckoutItem(item)
    setIsCheckoutOpen(true)
  }

  const handlePaymentSuccess = (result: PaymentResult) => {
    setIsCheckoutOpen(false)
    if (typeof window !== 'undefined') {
      try {
        const payload = {
          tierId: selectedTier.id,
          tierName: selectedTier.name,
          billingCycle,
          transactionId: result.paymentId,
          active: true,
          purchasedAt: new Date().toISOString(),
        }
        localStorage.setItem('khelgrid_pro_membership', JSON.stringify(payload))
        window.dispatchEvent(new CustomEvent('khelgrid:pro-activated', { detail: payload }))
      } catch {
        // ignore quota
      }
    }
    setCelebrationToast(true)
    setTimeout(() => {
      setCelebrationToast(false)
      onClose()
    }, 2500)
  }

  const handlePricingLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClose()
    if (onNavigate) {
      onNavigate(e, '/pricing')
    }
  }

  return (
    <>
      <div className="gopro-backdrop" role="presentation" onClick={onClose}>
        <div
          className="gopro-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gopro-modal-title"
          aria-describedby="gopro-modal-desc"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gopro-header">
            <button
              type="button"
              className="gopro-close-btn"
              onClick={onClose}
              aria-label="Close Pro Upgrade Window"
              title="Close window"
            >
              <SiteIcon name="close" size={16} />
            </button>

            <span className="gopro-eyebrow">
              <SiteIcon name="star" size={13} />
              <span>KhelGrid VIP Membership</span>
            </span>

            <h2 id="gopro-modal-title" className="gopro-title">
              Unlock the Full Power of KhelGrid Pro
            </h2>
            <p id="gopro-modal-desc" className="gopro-subtitle">
              Get direct scout messaging, verified golden badges, priority trial notifications, and high-performance
              talent analytics trusted by 850+ coaches across India.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="gopro-toggle-wrap">
              <div className="gopro-toggle-btn-group" role="tablist" aria-label="Billing frequency">
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingCycle === 'monthly'}
                  className={`gopro-toggle-tab ${billingCycle === 'monthly' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingCycle === 'annual'}
                  className={`gopro-toggle-tab ${billingCycle === 'annual' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  Annual (2 Months Free)
                </button>
              </div>

              {billingCycle === 'annual' && (
                <span className="gopro-discount-badge">
                  <SiteIcon name="award" size={12} />
                  <span>Save 20%</span>
                </span>
              )}
            </div>
          </div>

          {/* 3 Pro Tiers Grid */}
          <div className="gopro-tiers-grid">
            {PRO_TIERS.map(tier => {
              const isSelected = selectedTierId === tier.id
              const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice
              const periodLabel = billingCycle === 'annual' ? '/year' : '/month'

              return (
                <div
                  key={tier.id}
                  className={`gopro-tier-card ${tier.isPopular ? 'is-popular' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedTierId(tier.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedTierId(tier.id)
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  {tier.isPopular && <span className="gopro-popular-pill">Most Popular</span>}

                  <div>
                    <div className="gopro-tier-header">
                      <h3 className="gopro-tier-name">{tier.name}</h3>
                      <div className="gopro-tier-tag">{tier.tag}</div>

                      <div className="gopro-tier-price-row">
                        <span className="gopro-tier-price">₹{price.toLocaleString('en-IN')}</span>
                        <span className="gopro-tier-period">{periodLabel}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="gopro-tier-save-text">{tier.saveText}</div>
                      )}
                    </div>

                    <ul className="gopro-tier-features">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="gopro-feature-item">
                          <SiteIcon name="check-circle" size={14} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="gopro-radio-select">
                    <SiteIcon name={isSelected ? 'check' : 'star'} size={13} />
                    <span>{isSelected ? 'Plan Selected' : 'Select Plan'}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="gopro-footer">
            <div className="gopro-actions-row">
              <a
                href="/pricing"
                className="gopro-link-pricing"
                onClick={handlePricingLinkClick}
              >
                <span>Compare Full Features on Pricing Page</span>
                <SiteIcon name="arrow-right" size={13} />
              </a>

              <button
                type="button"
                className="gopro-btn-submit"
                onClick={handleStartCheckout}
              >
                <SiteIcon name="star" size={16} />
                <span>
                  Subscribe to {selectedTier.name} · ₹{currentPrice.toLocaleString('en-IN')}
                </span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="gopro-trust-strip">
              <span className="gopro-trust-item">
                <SiteIcon name="shield-check" size={14} />
                <span>100% Secure UPI &amp; Card Payments</span>
              </span>
              <span className="gopro-trust-item">
                <SiteIcon name="check-circle" size={14} />
                <span>Cancel Anytime</span>
              </span>
              <span className="gopro-trust-item">
                <SiteIcon name="award" size={14} />
                <span>7-Day Money-Back Guarantee</span>
              </span>
              <span className="gopro-trust-item">
                <SiteIcon name="file-text" size={14} />
                <span>GST Invoices Provided</span>
              </span>
            </div>

            <div className="gopro-enterprise-help">
              State federations, tournament leagues, or custom corporate sponsorship?{' '}
              <a href="mailto:khelgrid@gmail.com?subject=KhelGrid%20Pro%20Enterprise%20Enquiry">
                Email khelgrid@gmail.com for Enterprise Quotes
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Payment Checkout Modal */}
      {checkoutItem && (
        <PaymentCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          item={checkoutItem}
          onSuccess={handlePaymentSuccess}
          allowPayAtVenue={false}
        />
      )}

      {/* Celebratory Activation Toast */}
      {celebrationToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#14532d',
            color: '#ffffff',
            padding: '14px 24px',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 700,
          }}
          role="status"
          aria-live="polite"
        >
          <SiteIcon name="check-circle" size={18} style={{ color: '#86efac' }} />
          <span>Welcome to KhelGrid Pro! Your VIP Membership is now active.</span>
        </div>
      )}
    </>
  )
}
