import React, { useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'

export interface SaaSSubscriptionCardProps {
  academyName: string
  currentTier?: 'grassroots_free' | 'academy_pro_sandbox'
  onTierChange?: (tier: 'grassroots_free' | 'academy_pro_sandbox') => void
}

/**
 * SaaSSubscriptionCard
 * 
 * Implements Phase 9 SaaS Subscription & Billing Preparation.
 * 
 * Strict invariants:
 * 1. Razorpay remains strictly inactive.
 * 2. Grassroots Launch Tier is 100% Free (₹0/mo) without payment collection.
 * 3. All catalogue listings (venues, academies, coaches, trials) remain free; verification is the sole publication gate.
 * 4. Sandbox testing toggle only; zero real payment charges.
 */
export const SaaSSubscriptionCard: React.FC<SaaSSubscriptionCardProps> = ({
  academyName,
  currentTier = 'grassroots_free',
  onTierChange,
}) => {
  const [selectedTier, setSelectedTier] = useState(currentTier)
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null)

  const handleSimulateUpgrade = (tier: 'grassroots_free' | 'academy_pro_sandbox') => {
    setSelectedTier(tier)
    onTierChange?.(tier)
    if (tier === 'academy_pro_sandbox') {
      setSandboxNotice('Sandbox Simulated: Pro tier unlocked locally with 100% free Grassroots waiver. No payment processed.')
    } else {
      setSandboxNotice('Switched back to standard Grassroots Free plan.')
    }
    setTimeout(() => setSandboxNotice(null), 4000)
  }

  return (
    <div
      className="saas-subscription-card"
      data-testid="saas-subscription-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
            <span
              style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <SiteIcon name="shield-check" size={13} /> 100% Free Grassroots Launch Active
            </span>
            <span
              style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              Razorpay Inactive (0% Commission)
            </span>
          </div>
          <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem', color: '#0f172a' }}>
            {academyName} — SaaS Subscription &amp; Billing
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            KhelGrid is empowering grassroots sports across India. All academy, coach, venue, and trial listings remain completely free of charge.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>₹0 / month</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Lifetime Grassroots Launch Waiver</div>
        </div>
      </div>

      {sandboxNotice && (
        <div
          data-testid="subscription-sandbox-notice"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {sandboxNotice}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem',
        }}
      >
        {/* Tier 1: Grassroots Free */}
        <div
          style={{
            border: selectedTier === 'grassroots_free' ? '2px solid #059669' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            background: selectedTier === 'grassroots_free' ? '#f0fdf4' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Grassroots Free Plan</h4>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>Free Forever</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0' }}>
            Full multi-tenant roster, pitch-side attendance roll-call, and direct UPI collection without any platform fees.
          </p>
          <ul style={{ fontSize: '0.8rem', color: '#334155', paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
            <li>Unlimited student trainees &amp; batches</li>
            <li>Pitch-side roll-call with WhatsApp alerts</li>
            <li>Direct UPI QR generation (0% commission)</li>
            <li>Immutable audit logs &amp; financial ledger</li>
          </ul>
          <button
            type="button"
            className="academy-hub-btn-outline"
            style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem' }}
            disabled={selectedTier === 'grassroots_free'}
            onClick={() => handleSimulateUpgrade('grassroots_free')}
          >
            {selectedTier === 'grassroots_free' ? '✓ Currently Active' : 'Select Free Plan'}
          </button>
        </div>

        {/* Tier 2: Academy Pro (Sandbox Simulation) */}
        <div
          style={{
            border: selectedTier === 'academy_pro_sandbox' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            background: selectedTier === 'academy_pro_sandbox' ? '#f0f9ff' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Academy Pro (Sandbox Mode)</h4>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>Simulated Free</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0' }}>
            Advanced automated analytics and enterprise features. Prepared for future phase with live payment gates disabled.
          </p>
          <ul style={{ fontSize: '0.8rem', color: '#334155', paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
            <li>Everything in Grassroots Free</li>
            <li>Multi-branch consolidated reports</li>
            <li>Automated batch capacity forecasting</li>
            <li>No payment required (100% Free in Phase 1-10)</li>
          </ul>
          <button
            type="button"
            className="academy-hub-primary-btn"
            style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem', background: '#0284c7', borderColor: '#0369a1' }}
            onClick={() => handleSimulateUpgrade('academy_pro_sandbox')}
          >
            {selectedTier === 'academy_pro_sandbox' ? '✓ Pro Sandbox Active' : 'Simulate Pro Sandbox'}
          </button>
        </div>
      </div>
    </div>
  )
}
