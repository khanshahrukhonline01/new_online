import { useState, type FormEvent } from 'react'
import { CANONICAL_SAAS_PLANS } from '../../../shared/saas/saasCoreEngine'
import type {
  EntitlementEvaluationResult,
  EntitlementFeatureKey,
  PlanCode,
  UsageMeterStatus,
} from '../../../shared/saas/saasTypes'

export interface OrgEntitlementsAndMeteringPanelProps {
  effectivePlanCode: PlanCode
  evalFeatureKey: EntitlementFeatureKey
  liveEntitlementResult: EntitlementEvaluationResult
  meterStatuses: UsageMeterStatus[]
  onEvalFeatureChange: (key: EntitlementFeatureKey) => void
  onPreviewPlanSwitch: (planCode: PlanCode) => void
  onGrantOverride: (input: {
    featureKey: EntitlementFeatureKey
    overrideLimit: string
    reason: string
  }) => boolean
}

const ENTITLEMENT_KEYS: EntitlementFeatureKey[] = [
  'listings.free_submission',
  'verification.independent_review',
  'org.multi_member',
  'org.advanced_roles',
  'org.branches',
  'org.advanced_analytics',
  'venues.multi_location',
  'academy.student_management',
  'events.registrations',
  'editorial.collaboration',
  'platform.data_exports',
  'platform.api_access',
]

export function OrgEntitlementsAndMeteringPanel({
  effectivePlanCode,
  evalFeatureKey,
  liveEntitlementResult,
  meterStatuses,
  onEvalFeatureChange,
  onPreviewPlanSwitch,
  onGrantOverride,
}: OrgEntitlementsAndMeteringPanelProps) {
  const [overrideLimit, setOverrideLimit] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  function handleOverrideSubmit(e: FormEvent) {
    e.preventDefault()
    if (!overrideReason.trim()) return
    const ok = onGrantOverride({
      featureKey: evalFeatureKey,
      overrideLimit,
      reason: overrideReason.trim(),
    })
    if (ok) {
      setOverrideLimit('')
      setOverrideReason('')
    }
  }

  return (
    <div className="org-saas-grid">
      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Centralized Entitlements &amp; Plan Simulator</h2>
          <span>Payments Disabled</span>
        </div>

        <div className="org-saas-pill-wrap" style={{ marginBottom: '1rem' }}>
          {(Object.keys(CANONICAL_SAAS_PLANS) as PlanCode[]).map(code => {
            const plan = CANONICAL_SAAS_PLANS[code]
            return (
              <button
                key={code}
                type="button"
                className={`kg-btn-secondary ${effectivePlanCode === code ? 'is-active' : ''}`}
                onClick={() => onPreviewPlanSwitch(code)}
              >
                {plan.name}
              </button>
            )
          })}
        </div>

        <div className="org-saas-form-field">
          <label htmlFor="org-entitlement-select">Evaluate Feature Entitlement</label>
          <select
            id="org-entitlement-select"
            value={evalFeatureKey}
            onChange={e => onEvalFeatureChange(e.target.value as EntitlementFeatureKey)}
          >
            {ENTITLEMENT_KEYS.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="org-saas-subcard">
          <strong>
            Decision: {liveEntitlementResult.allowed ? 'ALLOWED' : 'DENIED'} ({liveEntitlementResult.source})
          </strong>
          <p>{liveEntitlementResult.reason}</p>
        </div>

        <form onSubmit={handleOverrideSubmit} className="org-saas-form" style={{ marginTop: '1rem' }}>
          <div className="org-saas-form-row">
            <div className="org-saas-form-field">
              <label htmlFor="org-override-limit">Override Limit (blank = unlimited)</label>
              <input
                id="org-override-limit"
                type="text"
                value={overrideLimit}
                onChange={e => setOverrideLimit(e.target.value)}
                placeholder="e.g. 25"
              />
            </div>
            <div className="org-saas-form-field">
              <label htmlFor="org-override-reason">Audit Reason *</label>
              <input
                id="org-override-reason"
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Pilot grant reason"
                required
              />
            </div>
          </div>
          <button type="submit" className="kg-btn-secondary">
            Grant Audited Override
          </button>
        </form>
      </div>

      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Usage Metering Status</h2>
          <span>{meterStatuses.length} meters</span>
        </div>
        <div className="org-saas-list">
          {meterStatuses.map(meter => (
            <div key={meter.meterKey} className="org-saas-list-item">
              <div>
                <strong>{meter.displayName}</strong>
                <p>
                  {meter.currentValue} / {meter.limit === null ? 'Unlimited' : meter.limit} ({meter.windowType})
                </p>
              </div>
              <span className="org-saas-tag">{meter.utilizationPercent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
