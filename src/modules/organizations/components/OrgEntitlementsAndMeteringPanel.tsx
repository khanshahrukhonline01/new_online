import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { useFormState } from '../../../shared/hooks/useFormState'
import { CANONICAL_SAAS_PLANS } from '../../../shared/saas/saasCoreEngine'
import type {
  EntitlementEvaluationResult,
  EntitlementFeatureKey,
  PlanCode,
  UsageMeterStatus,
} from '../../../shared/saas/saasTypes'
import { FEATURE_KEYS } from '../organizationsTypes'

interface OrgEntitlementsAndMeteringPanelProps {
  effectivePlanCode: PlanCode
  evalFeatureKey: EntitlementFeatureKey
  liveEntitlementResult: EntitlementEvaluationResult
  meterStatuses: UsageMeterStatus[]
  onEvalFeatureChange: (featureKey: EntitlementFeatureKey) => void
  onPreviewPlanSwitch: (planCode: PlanCode) => void
  onGrantOverride: (input: {
    featureKey: EntitlementFeatureKey
    overrideLimit: string
    reason: string
  }) => boolean
}

interface OverrideFormFields extends Record<string, unknown> {
  overrideFeature: EntitlementFeatureKey
  overrideLimit: string
  overrideReason: string
}

/**
 * Entitlement tier preview cards, live usage meters, policy evaluator, and audited override form.
 */
export function OrgEntitlementsAndMeteringPanel({
  effectivePlanCode,
  evalFeatureKey,
  liveEntitlementResult,
  meterStatuses,
  onEvalFeatureChange,
  onPreviewPlanSwitch,
  onGrantOverride,
}: OrgEntitlementsAndMeteringPanelProps) {
  const overrideForm = useFormState<OverrideFormFields>({
    overrideFeature: 'org.branches',
    overrideLimit: '15',
    overrideReason: '',
  })
  const [localError, setLocalError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError('')
    const trimmedLimit = overrideForm.fields.overrideLimit.trim()
    if (trimmedLimit !== '' && (Number.isNaN(Number(trimmedLimit)) || Number(trimmedLimit) < 0)) {
      setLocalError('Override limit must be blank (unlimited) or a non-negative integer.')
      return
    }
    const ok = onGrantOverride({
      featureKey: overrideForm.fields.overrideFeature,
      overrideLimit: overrideForm.fields.overrideLimit,
      reason: overrideForm.fields.overrideReason,
    })
    if (ok) overrideForm.setField('overrideReason', '')
  }

  return (
    <div>
      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="wallet" size={18} />
            <span>Canonical Entitlement Tiers (Payments Strictly Disabled)</span>
          </h2>
          <span className="org-saas-tag org-saas-tag--ok">payment_collection_enabled = false</span>
        </div>
        <p className="org-saas-panel-desc">
          Modules query the centralized entitlement engine instead of checking hardcoded plan strings. Preview how
          organization tiers adjust quotas without enabling any payment gateway or paywalling free listings.
        </p>

        <div className="org-saas-plan-grid">
          {(['org_free', 'org_growth', 'org_enterprise'] as PlanCode[]).map(code => {
            const plan = CANONICAL_SAAS_PLANS[code]
            const isCurrent = effectivePlanCode === code
            return (
              <div key={code} className={`org-saas-plan-card ${isCurrent ? 'is-current' : ''}`}>
                <div>
                  <div className="org-saas-item-top">
                    <h3 className="org-saas-item-title">{plan.name}</h3>
                    {isCurrent && <span className="org-saas-tag org-saas-tag--ok">Active</span>}
                  </div>
                  <p className="org-saas-item-meta" style={{ marginTop: 6 }}>
                    {plan.summary}
                  </p>
                  <p className="org-saas-item-meta" style={{ marginTop: 8 }}>
                    Members: <strong>{plan.entitlements['org.multi_member'].limit}</strong> · Branches:{' '}
                    <strong>{plan.entitlements['org.branches'].limit}</strong> · API:{' '}
                    <strong>{plan.entitlements['platform.api_access'].enabled ? 'Included' : 'No'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className={`org-saas-btn org-saas-btn--sm ${isCurrent ? '' : 'org-saas-btn--primary'}`}
                  disabled={isCurrent}
                  onClick={() => onPreviewPlanSwitch(code)}
                >
                  {isCurrent ? 'Current Preview Tier' : 'Preview Entitlement Tier'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="org-saas-grid-2">
        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="chart" size={18} />
              <span>Live Usage Metering &amp; Soft/Hard Quotas</span>
            </h2>
          </div>
          <p className="org-saas-panel-desc">
            Tracks active organization members, branches, managed venues, events, exports, and storage against
            canonical plan limits and audited overrides.
          </p>

          <div className="org-saas-meter-list">
            {meterStatuses.map(meter => (
              <div key={meter.meterKey}>
                <div className="org-saas-meter-head">
                  <span>
                    <strong>{meter.displayName}</strong>{' '}
                    <span className="org-saas-item-meta">({meter.windowType.replace('_', ' ')})</span>
                  </span>
                  <span>
                    <strong>{meter.currentValue}</strong> / {meter.limit === null ? 'Unlimited' : meter.limit}{' '}
                    {meter.hardLimitReached ? (
                      <span className="org-saas-tag org-saas-tag--danger">Hard Limit</span>
                    ) : meter.softLimitReached ? (
                      <span className="org-saas-tag org-saas-tag--warn">Soft Warning</span>
                    ) : null}
                  </span>
                </div>
                <div className="org-saas-meter-bar" role="progressbar" aria-valuenow={meter.utilizationPercent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`org-saas-meter-fill ${
                      meter.hardLimitReached
                        ? 'org-saas-meter-fill--danger'
                        : meter.softLimitReached
                          ? 'org-saas-meter-fill--warn'
                          : ''
                    }`}
                    style={{ width: `${meter.utilizationPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="shield-check" size={18} />
                <span>Centralized Entitlement Evaluator</span>
              </h2>
            </div>
            <div className="org-saas-field">
              <label htmlFor="entitlement-feature-select">Evaluate Feature Key</label>
              <select
                id="entitlement-feature-select"
                className="org-saas-select"
                value={evalFeatureKey}
                onChange={e => onEvalFeatureChange(e.target.value as EntitlementFeatureKey)}
              >
                {FEATURE_KEYS.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`org-saas-eval-box ${
                liveEntitlementResult.allowed ? 'org-saas-eval-box--allowed' : 'org-saas-eval-box--denied'
              }`}
            >
              <div className="org-saas-item-top">
                <strong>Verdict: {liveEntitlementResult.allowed ? 'ALLOWED' : 'DENIED'}</strong>
                <span className="org-saas-code">{liveEntitlementResult.source}</span>
              </div>
              <div className="org-saas-item-meta">{liveEntitlementResult.reason}</div>
              <div className="org-saas-item-meta">
                Effective Plan: <span className="org-saas-code">{liveEntitlementResult.planCode}</span> · Limit:{' '}
                <strong>{liveEntitlementResult.limit === null ? 'Unlimited' : liveEntitlementResult.limit}</strong>
                {liveEntitlementResult.remaining !== undefined && liveEntitlementResult.remaining !== null
                  ? ` · Remaining: ${liveEntitlementResult.remaining}`
                  : ''}
              </div>
            </div>
          </div>

          <div className="org-saas-panel">
            <div className="org-saas-panel-header">
              <h2>
                <SiteIcon name="sparkles" size={18} />
                <span>Audited Entitlement Override</span>
              </h2>
            </div>
            <p className="org-saas-panel-desc">
              Simulates a time-bound, platform-audited override (e.g., pilot grant for a grassroots school or
              federation). Every override writes an immutable audit event.
            </p>
            {localError && <p className="org-saas-field-hint" role="alert">{localError}</p>}
            <form className="org-saas-form" onSubmit={handleSubmit}>
              <div className="org-saas-form-row">
                <div className="org-saas-field">
                  <label htmlFor="override-feature-select">Feature Key</label>
                  <select
                    id="override-feature-select"
                    className="org-saas-select"
                    value={overrideForm.fields.overrideFeature}
                    onChange={e => overrideForm.setField('overrideFeature', e.target.value as EntitlementFeatureKey)}
                  >
                    {FEATURE_KEYS.filter(f => !f.key.startsWith('listings.') && !f.key.startsWith('verification.')).map(f => (
                      <option key={f.key} value={f.key}>
                        {f.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="org-saas-field">
                  <label htmlFor="override-limit-input">Override Limit (blank = unlimited)</label>
                  <input
                    id="override-limit-input"
                    className="org-saas-input"
                    type="number"
                    min={0}
                    value={overrideForm.fields.overrideLimit}
                    onChange={e => overrideForm.setField('overrideLimit', e.target.value)}
                  />
                </div>
              </div>
              <div className="org-saas-field">
                <label htmlFor="override-reason-input">Mandatory Audit Reason *</label>
                <input
                  id="override-reason-input"
                  className="org-saas-input"
                  type="text"
                  required
                  minLength={5}
                  placeholder="e.g., State federation tournament pilot extension (30 days)"
                  value={overrideForm.fields.overrideReason}
                  onChange={e => overrideForm.setField('overrideReason', e.target.value)}
                />
              </div>
              <button type="submit" className="org-saas-btn org-saas-btn--primary">
                Record Audited Override
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
