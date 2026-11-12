import { useState, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { PaymentCheckoutModal } from '../../shared/payments/PaymentCheckoutModal'
import type { PaymentItem, PaymentResult } from '../../shared/payments/paymentTypes'
import {
  ATHLETE_PLANS,
  ACADEMY_PLANS,
  VENUE_PLANS,
  ORGANIZER_BOOST_PLANS,
  PRICING_FAQS,
  type AudienceSegment,
  type BillingCycle,
  type PricingPlan,
} from './pricingPlansData'
import './PricingPage.css'

export interface PricingPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  initialSegment?: AudienceSegment
}

export default function PricingPage({ onNavigate, initialSegment = 'athlete' }: PricingPageProps) {
  // 1. Audience & Billing Cycle State
  const [selectedAudience, setSelectedAudience] = useState<AudienceSegment>(initialSegment)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual')

  // 2. Interactive ROI Calculator State for Academies
  const [roiStudentsPerMonth, setRoiStudentsPerMonth] = useState(3)
  const [roiMonthlyFee, setRoiMonthlyFee] = useState(3000)

  // 3. Payment Checkout Modal State
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentSuccessResult, setPaymentSuccessResult] = useState<PaymentResult | null>(null)

  // 4. FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Active plans based on selected audience
  const activePlans = useMemo<PricingPlan[]>(() => {
    switch (selectedAudience) {
      case 'athlete':
        return ATHLETE_PLANS
      case 'academy':
        return ACADEMY_PLANS
      case 'venue':
        return VENUE_PLANS
      case 'organizer':
        return ORGANIZER_BOOST_PLANS
      default:
        return ATHLETE_PLANS
    }
  }, [selectedAudience])

  // ROI Calculator computation
  const roiCalculations = useMemo(() => {
    const annualRevenueFromNewStudents = roiStudentsPerMonth * roiMonthlyFee * 12
    const academyAnnualCost = 12999
    const netProfitAdded = annualRevenueFromNewStudents - academyAnnualCost
    const roiMultiplier = Math.round((annualRevenueFromNewStudents / academyAnnualCost) * 10) / 10
    return {
      annualRevenueFromNewStudents,
      academyAnnualCost,
      netProfitAdded,
      roiMultiplier,
    }
  }, [roiStudentsPerMonth, roiMonthlyFee])

  function handleOpenCheckout(plan: PricingPlan) {
    if (plan.isFree) {
      // Free plan navigation
      if (typeof window !== 'undefined') {
        window.location.href = plan.audience === 'venue' ? '/submit-listing?type=venue' : plan.audience === 'organizer' ? '/submit-listing?type=opportunity' : '/opportunities'
      }
      return
    }

    const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
    const durationLabel = billingCycle === 'annual' ? 'Annual Pass (12 Months)' : 'Monthly Pass (30 Days)'

    setCheckoutItem({
      id: `${plan.id}_${billingCycle}`,
      type: 'membership',
      title: `${plan.name} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
      subtitle: `${durationLabel} · KhelGrid Sports Network`,
      amount: price,
      currency: 'INR',
      emoji: plan.audience === 'athlete' ? '🏅' : plan.audience === 'academy' ? '🏫' : '🏟️',
      metadata: {
        planId: plan.id,
        audience: plan.audience,
        billingCycle,
      },
    })
    setIsCheckoutOpen(true)
  }

  function handlePaymentSuccess(result: PaymentResult) {
    setPaymentSuccessResult(result)
    setIsCheckoutOpen(false)
  }

  function toggleFaq(index: number) {
    setOpenFaqIndex(prev => (prev === index ? null : index))
  }

  return (
    <div className="pricing-page-container">
      {/* 1. HERO SECTION */}
      <section className="pricing-hero-section" aria-labelledby="pricing-heading">
        <div className="pricing-hero-inner">
          <nav className="pricing-breadcrumb" aria-label="Breadcrumb">
            <a href="/" onClick={e => onNavigate?.(e, '/')}>Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Pricing &amp; Memberships</span>
          </nav>

          <div className="pricing-hero-title-box">
            <div className="pricing-badge-pill">
              <SiteIcon name="sparkles" size={14} />
              <span>Venue, coach &amp; trial listings are free · Memberships are separate</span>
            </div>
            <h1 id="pricing-heading" className="pricing-hero-title">
              Simple, Transparent Sports Memberships
            </h1>
            <p className="pricing-hero-hindi">
              खिलाड़ियों, अकादमियों, टर्फ ग्राउंड्स और आयोजकों के लिए पारदर्शी सदस्यता योजनाएं
            </p>
            <p className="pricing-hero-sub">
              Explore membership information and optional services. Venue, coach and trial listings are free to submit; evidence review is independent of payment, membership or promotion.
            </p>
          </div>

          <div className="pricing-stats-ribbon" role="region" aria-label="Directory listing principles">
            <div className="stat-card">
              <strong className="stat-num">Free</strong>
              <span className="stat-lbl">Venue, coach &amp; trial submissions</span>
            </div>
            <div className="stat-card">
              <strong className="stat-num">Evidence-led</strong>
              <span className="stat-lbl">Review before publication</span>
            </div>
            <div className="stat-card">
              <strong className="stat-num">No paid verification</strong>
              <span className="stat-lbl">Listing verification is not for sale</span>
            </div>
            <div className="stat-card">
              <strong className="stat-num">Provider fees</strong>
              <span className="stat-lbl">Separate from KhelGrid listing</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AUDIENCE SWITCHER & BILLING CYCLE TOGGLE */}
      <section className="pricing-controls-section" aria-label="Plan Selectors">
        <div className="pricing-controls-inner">
          {/* Audience Segment Switcher Tabs */}
          <div className="audience-tabs-bar" role="tablist" aria-label="Choose membership category">
            <button
              type="button"
              role="tab"
              aria-selected={selectedAudience === 'athlete'}
              className={`audience-tab-btn ${selectedAudience === 'athlete' ? 'is-active' : ''}`}
              onClick={() => setSelectedAudience('athlete')}
            >
              <SiteIcon name="trophy" size={16} />
              <span>Khiladi / Athlete Pass</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedAudience === 'academy'}
              className={`audience-tab-btn ${selectedAudience === 'academy' ? 'is-active' : ''}`}
              onClick={() => setSelectedAudience('academy')}
            >
              <SiteIcon name="building" size={16} />
              <span>Academies &amp; Coaches</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedAudience === 'venue'}
              className={`audience-tab-btn ${selectedAudience === 'venue' ? 'is-active' : ''}`}
              onClick={() => setSelectedAudience('venue')}
            >
              <SiteIcon name="map-pin" size={16} />
              <span>Turfs &amp; Grounds</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedAudience === 'organizer'}
              className={`audience-tab-btn ${selectedAudience === 'organizer' ? 'is-active' : ''}`}
              onClick={() => setSelectedAudience('organizer')}
            >
              <SiteIcon name="star" size={16} />
              <span>Trials &amp; Opportunities</span>
            </button>
          </div>

          {(selectedAudience === 'venue' || selectedAudience === 'organizer' || selectedAudience === 'academy') && (
        <div className="pricing-free-listing-note" role="note">
          <SiteIcon name="shield-check" size={20} />
          <div>
            <strong>Venue, coach and trial listings are free. Verification is not for sale.</strong>
            <p>Venue, coach and sports-trial submissions and evidence review are free. Optional memberships do not buy verification or ranking. Any venue hire or athlete entry fee belongs to the provider or organiser, not KhelGrid.</p>
          </div>
        </div>
      )}

      {/* Monthly vs Annual Toggle (for non-boost tiers) */}
          {selectedAudience !== 'organizer' && selectedAudience !== 'venue' && (
            <div className="billing-cycle-toggle-wrap">
              <div className="toggle-switch-group">
                <button
                  type="button"
                  className={`toggle-option ${billingCycle === 'monthly' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  className={`toggle-option ${billingCycle === 'annual' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  Annual Billing
                  <span className="annual-discount-badge">Save up to 50%</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. SUCCESS NOTIFICATION (If payment was completed) */}
      {paymentSuccessResult && (
        <section className="payment-success-banner" aria-live="polite">
          <div className="success-banner-inner">
            <SiteIcon name={paymentSuccessResult.status === 'completed' ? 'check-circle' : 'clock'} size={24} className="success-check-icon" />
            <div>
              <h3>{paymentSuccessResult.status === 'completed' ? 'Membership Activated Successfully!' : 'Payment Reference Submitted — Verification Pending'}</h3>
              <p>
                Order reference: <strong>{paymentSuccessResult.orderId}</strong> · Amount: ₹{paymentSuccessResult.amount.toLocaleString('en-IN')}.
                {paymentSuccessResult.status === 'completed'
                  ? ' Your verified membership is active.'
                  : ' Membership privileges remain locked until the payment is independently verified.'}
              </p>
            </div>
            <button
              type="button"
              className="success-dismiss-btn"
              onClick={() => setPaymentSuccessResult(null)}
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* 4. PRICING CARDS GRID */}
      <section className="pricing-cards-section" aria-label="Available Membership Plans">
        <div className="pricing-cards-inner">
          <div className="plans-cards-grid">
            {activePlans.map(plan => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
              const originalPrice =
                billingCycle === 'annual' ? plan.originalAnnualPrice : plan.originalMonthlyPrice

              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${plan.popular ? 'is-popular' : ''} ${plan.isFree ? 'is-free' : ''}`}
                >
                  {plan.badge && <div className="card-top-badge">{plan.badge}</div>}

                  <div className="card-header">
                    <h3 className="card-plan-name">{plan.name}</h3>
                    <span className="card-hindi-name">{plan.hindiName}</span>
                    <p className="card-blurb">{plan.blurb}</p>
                  </div>

                  <div className="card-pricing-block">
                    {plan.isFree ? (
                      <div className="price-display">
                        <span className="currency-symbol">₹</span>
                        <span className="amount-number">0</span>
                        <span className="billing-period">/ Forever Free</span>
                      </div>
                    ) : (
                      <div className="price-display">
                        <span className="currency-symbol">₹</span>
                        <span className="amount-number">{price.toLocaleString('en-IN')}</span>
                        <span className="billing-period">
                          {selectedAudience === 'organizer'
                            ? '/ one-time boost'
                            : billingCycle === 'annual'
                            ? '/ year'
                            : '/ month'}
                        </span>
                      </div>
                    )}

                    {originalPrice && (
                      <div className="original-price-row">
                        <span className="strikethrough-price">₹{originalPrice.toLocaleString('en-IN')}</span>
                        {plan.annualSavingsLabel && (
                          <span className="savings-pill">{plan.annualSavingsLabel}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-highlight-feature">
                    <SiteIcon name="badge-check" size={16} />
                    <span>{plan.highlightFeature}</span>
                  </div>

                  <div className="card-features-list">
                    <span className="features-header">What's included:</span>
                    <ul>
                      {plan.features.map((feat, i) => (
                        <li key={i}>
                          <SiteIcon name="check" size={14} className="feature-check-icon" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-cta-footer">
                    <button
                      type="button"
                      className={`card-cta-btn ${plan.popular ? 'primary' : 'secondary'}`}
                      onClick={() => handleOpenCheckout(plan)}
                    >
                      <SiteIcon name={plan.isFree ? 'arrow-right' : 'wallet'} size={15} />
                      <span>{plan.ctaText}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE ACADEMY & VENUE REVENUE ROI CALCULATOR */}
      {(selectedAudience === 'academy' || selectedAudience === 'venue') && (
        <section className="pricing-roi-calculator-section" aria-labelledby="roi-calculator-heading">
          <div className="roi-calculator-inner">
            <div className="roi-calculator-header">
              <div className="roi-badge-pill">
                <SiteIcon name="chart" size={14} />
                <span>Return on Investment Simulator</span>
              </div>
              <h2 id="roi-calculator-heading" className="roi-calculator-title">
                How KhelGrid Academy Partner Pays For Itself
              </h2>
              <p className="roi-calculator-sub">
                See how acquiring even 1 or 2 new student admissions covers your entire annual membership
                and drives consistent recurring profit.
              </p>
            </div>

            <div className="roi-calculator-workbench">
              <div className="roi-inputs-column">
                <div className="roi-input-group">
                  <label htmlFor="roi-students">
                    <span>New Students Enrolled via KhelGrid / Month</span>
                    <strong className="roi-val-tag">{roiStudentsPerMonth} students / month</strong>
                  </label>
                  <input
                    id="roi-students"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={roiStudentsPerMonth}
                    onChange={e => setRoiStudentsPerMonth(Number(e.target.value))}
                  />
                  <div className="range-hints">
                    <span>1 (Conservative)</span>
                    <span>3 (Average Academy)</span>
                    <span>10 (Metro High Traffic)</span>
                  </div>
                </div>

                <div className="roi-input-group">
                  <label htmlFor="roi-fee">
                    <span>Your Average Monthly Coaching Fee (₹)</span>
                    <strong className="roi-val-tag">₹{roiMonthlyFee.toLocaleString('en-IN')} / month</strong>
                  </label>
                  <input
                    id="roi-fee"
                    type="range"
                    min={1000}
                    max={8000}
                    step={250}
                    value={roiMonthlyFee}
                    onChange={e => setRoiMonthlyFee(Number(e.target.value))}
                  />
                  <div className="range-hints">
                    <span>₹1,000 (Grassroots)</span>
                    <span>₹3,000 (State Standard)</span>
                    <span>₹8,000 (Elite / Turf Academy)</span>
                  </div>
                </div>
              </div>

              <div className="roi-results-column">
                <div className="roi-meter-box">
                  <span className="roi-meter-label">ESTIMATED ANNUAL REVENUE ADDED</span>
                  <div className="roi-meter-number">
                    ₹{roiCalculations.annualRevenueFromNewStudents.toLocaleString('en-IN')}
                    <span className="roi-meter-unit"> / year</span>
                  </div>
                  <div className="roi-multiplier-badge">
                    ⚡ {roiCalculations.roiMultiplier}× Net Return on Academy Pass
                  </div>
                </div>

                <div className="roi-breakdown-list">
                  <div className="roi-breakdown-item">
                    <span>Gross Annual Student Fees:</span>
                    <strong>₹{roiCalculations.annualRevenueFromNewStudents.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="roi-breakdown-item">
                    <span>KhelGrid Academy Pro (Annual):</span>
                    <span className="cost-tag">-₹{roiCalculations.academyAnnualCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="roi-breakdown-item total">
                    <span>Net Annual Profit Gain:</span>
                    <strong className="profit-val">+₹{roiCalculations.netProfitAdded.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. TRUST, SECURITY & DIRECT UPI CHECKOUT ASSURANCE */}
      <section className="pricing-trust-section" aria-label="Trust and Security Standards">
        <div className="pricing-trust-inner">
          <div className="trust-card">
            <SiteIcon name="shield-check" size={24} className="trust-icon" />
            <div>
              <h4>Evidence-led trial review</h4>
              <p>We review organiser identity, source details, dates and eligibility before publication. Verification is evidence-based and can be revisited if information changes.</p>
            </div>
          </div>

          <div className="trust-card">
            <SiteIcon name="wallet" size={24} className="trust-icon" />
            <div>
              <h4>No payment for directory listings</h4>
              <p>Submitting and reviewing venue, coach and trial listings is free. Any athlete entry, coaching or venue hire fee belongs to the provider.</p>
            </div>
          </div>

          <div className="trust-card">
            <SiteIcon name="refresh" size={24} className="trust-icon" />
            <div>
              <h4>Clear fee information</h4>
              <p>We do not assume an event is free when its athlete entry fee is unknown. Provider charges are shown only when disclosed by the organiser or venue.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ENTERPRISE & CSR SPONSORSHIP BANNER */}
      <section className="pricing-enterprise-section" aria-label="Corporate & CSR Grants">
        <div className="pricing-enterprise-inner">
          <div className="enterprise-content">
            <div className="enterprise-badge">State Federations &amp; CSR Foundations</div>
            <h3>Looking to Sponsor Grassroots Athletes or District Combines?</h3>
            <p>
              We partner with state sports authorities, public sector units (PSUs), and CSR foundations
              (Reliance Foundation, JSW Sports, Tata Trusts) to distribute verified Sports Passports,
              biometric verification, and subsidized combine kits to underprivileged athletes.
            </p>
            <div className="enterprise-cta-row">
              <a
                href="mailto:khelgrid@gmail.com?subject=CSR%20Sports%20Sponsorship%20Enquiry"
                className="tool-action-btn primary"
              >
                <SiteIcon name="mail" size={15} />
                <span>Contact CSR Partnerships</span>
              </a>
              <a
                href="/partners"
                onClick={e => onNavigate?.(e, '/partners')}
                className="tool-action-btn secondary"
              >
                <span>Explore Partner Ecosystem</span>
                <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PRICING FAQ ACCORDION */}
      <section className="pricing-faq-section" aria-labelledby="pricing-faq-heading">
        <div className="pricing-faq-inner">
          <h2 id="pricing-faq-heading" className="faq-title">
            Frequently Asked Questions
          </h2>
          <p className="faq-sub">Everything you need to know about directory submissions, evidence review and optional memberships.</p>

          <div className="faq-accordion-list">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div key={idx} className={`faq-item-card ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <span className="faq-question-text">{faq.question}</span>
                      <span className="faq-hindi-sub">{faq.hindiQuestion}</span>
                    </div>
                    <SiteIcon
                      name={isOpen ? 'minus' : 'plus'}
                      size={18}
                      className="faq-toggle-icon"
                    />
                  </button>
                  {isOpen && (
                    <div className="faq-answer-body">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 10. DIRECT CHECKOUT MODAL INTEGRATION */}
      {checkoutItem && (
        <PaymentCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          item={checkoutItem}
          onSuccess={handlePaymentSuccess}
          allowPayAtVenue={false}
        />
      )}
    </div>
  )
}
