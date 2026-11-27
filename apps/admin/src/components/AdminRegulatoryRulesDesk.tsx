import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  enqueueTenantPostForRegulation,
  evaluateTenantPostAgainstRules,
  getPostRegulationSnapshot,
  reEvaluatePendingTenantPosts,
  TENANT_POST_CATEGORY_LABELS,
  updateRegulatoryPolicyRule,
  type RegulatoryPolicyRule,
  type RegulatoryRuleEnforcement,
  type TenantPostCategory,
} from '../../../../src/shared/governance/postRegulationBridge'
import {
  subscribeRegulatoryState,
  type TenantRegulatoryStatus,
} from '../../../../src/shared/governance/regulatoryBridge'
import './AdminRegulatoryRulesDesk.css'

export interface AdminRegulatoryRulesDeskProps {
  operatorEmail?: string
  onOpenPostGate?: () => void
}

export function AdminRegulatoryRulesDesk({
  operatorEmail = 'admin@khelgrid.com',
  onOpenPostGate,
}: AdminRegulatoryRulesDeskProps) {
  const [snapshot, setSnapshot] = useState(() => getPostRegulationSnapshot())
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)

  // Live Rule Sandbox Evaluator state
  const [sandboxTitle, setSandboxTitle] = useState(
    'District U-16 Football Trial — Official SAI & Personal UPI Registration',
  )
  const [sandboxBody, setSandboxBody] = useState(
    'Under-16 players pay ₹2,500 to personal UPI for guaranteed selection shortlist.',
  )
  const [sandboxCategory, setSandboxCategory] = useState<TenantPostCategory>('trial_opportunity')
  const [sandboxStanding, setSandboxStanding] = useState<TenantRegulatoryStatus>('active')
  const [sandboxMinors, setSandboxMinors] = useState(true)
  const [sandboxGuardianConsent, setSandboxGuardianConsent] = useState(false)
  const [sandboxSponsoredDisclosure, setSandboxSponsoredDisclosure] = useState(false)

  const reload = useCallback(() => {
    setSnapshot(getPostRegulationSnapshot())
  }, [])

  useEffect(() => {
    return subscribeRegulatoryState(reload)
  }, [reload])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToast(null), 3400)
    }
  }, [])

  const sandboxEvaluation = useMemo(
    () =>
      evaluateTenantPostAgainstRules(
        {
          title: sandboxTitle,
          body: sandboxBody,
          category: sandboxCategory,
          tenantName: 'Sandbox Test Tenant',
          tenantPersona: sandboxCategory === 'creator_campaign' ? 'creator' : 'academy',
          tenantStanding: sandboxStanding,
          tenantFederationVerified: false,
          submitterName: 'Sandbox Tester',
          submitterEmail: operatorEmail,
          sport: 'Football',
          city: 'Delhi NCR',
          involvesMinors: sandboxMinors,
          guardianConsentAttested: sandboxGuardianConsent,
          hasSponsoredDisclosure: sandboxSponsoredDisclosure,
        },
        snapshot.rules,
      ),
    [
      sandboxTitle,
      sandboxBody,
      sandboxCategory,
      sandboxStanding,
      sandboxMinors,
      sandboxGuardianConsent,
      sandboxSponsoredDisclosure,
      operatorEmail,
      snapshot.rules,
    ],
  )

  const handleToggleRule = (rule: RegulatoryPolicyRule) => {
    const updated = updateRegulatoryPolicyRule(
      rule.id,
      { enabled: !rule.enabled },
      operatorEmail,
    )
    if (updated) {
      reload()
      showToast(`${updated.code} ${updated.enabled ? 'enabled' : 'paused'} in Pre-Publication Engine.`)
    }
  }

  const handleChangeEnforcement = (
    rule: RegulatoryPolicyRule,
    enforcement: RegulatoryRuleEnforcement,
  ) => {
    const updated = updateRegulatoryPolicyRule(rule.id, { enforcement }, operatorEmail)
    if (updated) {
      reload()
      showToast(`Set ${updated.code} enforcement mode to "${enforcement}".`)
    }
  }

  const handleChangeWeight = (rule: RegulatoryPolicyRule, riskWeight: number) => {
    const updated = updateRegulatoryPolicyRule(rule.id, { riskWeight }, operatorEmail)
    if (updated) {
      reload()
    }
  }

  const handleSaveKeywords = (rule: RegulatoryPolicyRule) => {
    const raw = keywordDrafts[rule.id]
    if (raw === undefined) return
    const parsed = raw
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    const updated = updateRegulatoryPolicyRule(rule.id, { keywords: parsed }, operatorEmail)
    if (updated) {
      setKeywordDrafts(prev => {
        const next = { ...prev }
        delete next[rule.id]
        return next
      })
      reload()
      showToast(`Saved ${parsed.length} watchlist keyword(s) for ${updated.code}.`)
    }
  }

  const handleReEvaluateQueue = () => {
    const res = reEvaluatePendingTenantPosts(operatorEmail)
    reload()
    showToast(
      `Re-evaluated ${res.reEvaluatedCount} pending tenant posts (${res.hardHoldsCount} hard holds).`,
    )
  }

  const handleSendSandboxToGate = () => {
    if (!sandboxTitle.trim() || !sandboxBody.trim()) return
    const item = enqueueTenantPostForRegulation({
      title: sandboxTitle.trim(),
      body: sandboxBody.trim(),
      category: sandboxCategory,
      tenantName: 'Sandbox Partner Organisation',
      tenantPersona: sandboxCategory === 'creator_campaign' ? 'creator' : 'academy',
      tenantStanding: sandboxStanding,
      submitterName: 'Compliance Sandbox',
      submitterEmail: operatorEmail,
      sport: 'Multi-Sport',
      city: 'Delhi NCR',
      involvesMinors: sandboxMinors,
      guardianConsentAttested: sandboxGuardianConsent,
      hasSponsoredDisclosure: sandboxSponsoredDisclosure,
      sourceRoute: '/admin',
    })
    reload()
    showToast(`Queued ${item.referenceCode} into Post Evaluation Gate (Risk ${item.evaluation.riskScore}/100).`)
  }

  return (
    <div className="admin-rules-root" data-testid="admin-regulatory-rules-desk">
      <header className="admin-rules-header">
        <div>
          <p className="admin-rules-kicker">
            Regulation Policy Engine · Automated Pre-Publication Screening Rules
          </p>
          <h1 className="admin-rules-title">Regulatory Policy Rules &amp; Live Sandbox</h1>
          <p className="admin-rules-subtitle">
            Configure statutory rules, risk weights, enforcement modes, and keyword watchlists that
            screen every tenant post before it enters KhelGrid public directories.
          </p>
        </div>

        <div className="admin-rules-actions">
          {onOpenPostGate && (
            <button
              type="button"
              className="admin-rules-btn"
              onClick={onOpenPostGate}
            >
              <SiteIcon name="arrow-right" size={14} />
              <span>Post Evaluation Gate ({snapshot.metrics.awaitingEvaluation})</span>
            </button>
          )}
          <button
            type="button"
            className="admin-rules-btn is-primary"
            onClick={handleReEvaluateQueue}
            data-testid="rules-reevaluate-queue-btn"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Re-Evaluate Pending Queue</span>
          </button>
        </div>
      </header>

      {toast && (
        <div className="admin-rules-toast" role="status">
          <SiteIcon name="check-circle" size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* Policy Rules Directory */}
      <section className="admin-rules-section" aria-label="Configured Regulatory Policy Rules">
        <div className="admin-rules-section-head">
          <h2>Active Pre-Publication Policy Rules</h2>
          <span className="admin-rules-meta tabular-nums">
            {snapshot.metrics.activeRulesCount} of {snapshot.metrics.totalRulesCount} rules active
          </span>
        </div>

        <div className="admin-rules-list">
          {snapshot.rules.map(rule => {
            const kwValue =
              keywordDrafts[rule.id] !== undefined
                ? keywordDrafts[rule.id]
                : rule.keywords.join(', ')
            const kwDirty = keywordDrafts[rule.id] !== undefined

            return (
              <article
                key={rule.id}
                className={`admin-rule-card ${rule.enabled ? '' : 'is-paused'}`}
                data-testid={`policy-rule-${rule.code}`}
              >
                <div className="admin-rule-top">
                  <div>
                    <div className="admin-rules-meta">
                      {rule.code} · {rule.statutoryCitation} · Updated by {rule.updatedBy}
                    </div>
                    <h3 className="admin-rule-name">{rule.name}</h3>
                    <p className="admin-rule-desc">{rule.description}</p>
                  </div>

                  <div className="admin-rule-controls">
                    <button
                      type="button"
                      className={`admin-rules-btn ${rule.enabled ? 'is-active-toggle' : ''}`}
                      onClick={() => handleToggleRule(rule)}
                      aria-pressed={rule.enabled}
                      data-testid={`toggle-${rule.code}`}
                    >
                      {rule.enabled ? 'Active' : 'Paused'}
                    </button>

                    <select
                      className="admin-rules-select"
                      value={rule.enforcement}
                      onChange={e =>
                        handleChangeEnforcement(
                          rule,
                          e.target.value as RegulatoryRuleEnforcement,
                        )
                      }
                      aria-label={`Enforcement mode for ${rule.name}`}
                    >
                      <option value="block">Hard Block</option>
                      <option value="flag">Manual Review</option>
                      <option value="advisory">Advisory Only</option>
                    </select>

                    <label className="admin-rule-weight tabular-nums">
                      <span>Weight</span>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={rule.riskWeight}
                        onChange={e =>
                          handleChangeWeight(rule, Number(e.target.value) || rule.riskWeight)
                        }
                        aria-label={`Risk weight for ${rule.name}`}
                      />
                    </label>
                  </div>
                </div>

                {rule.domain !== 'tenant_standing' && (
                  <div className="admin-rule-keywords-row">
                    <label className="admin-rule-keywords-label">
                      <span>Watchlist Patterns (comma-separated):</span>
                      <input
                        type="text"
                        className="admin-rules-input"
                        value={kwValue}
                        onChange={e =>
                          setKeywordDrafts(prev => ({
                            ...prev,
                            [rule.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    {kwDirty && (
                      <button
                        type="button"
                        className="admin-rules-btn is-primary"
                        onClick={() => handleSaveKeywords(rule)}
                      >
                        Save Patterns
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {/* Live Rule Sandbox Evaluator */}
      <section
        className="admin-rules-sandbox"
        aria-label="Live Pre-Publication Rule Sandbox Evaluator"
        data-testid="rules-live-sandbox"
      >
        <div className="admin-rules-section-head">
          <div>
            <h2>Live Pre-Publication Sandbox Evaluator</h2>
            <p className="admin-rules-meta">
              Test any sample tenant post draft against current active rules in real time before
              updating policy enforcement.
            </p>
          </div>
          <button
            type="button"
            className="admin-rules-btn"
            onClick={handleSendSandboxToGate}
            data-testid="sandbox-enqueue-btn"
          >
            <SiteIcon name="plus" size={14} />
            <span>Send Test Post to Gate</span>
          </button>
        </div>

        <div className="admin-rules-sandbox-grid">
          <div className="admin-rules-sandbox-form">
            <label className="admin-rules-field">
              <span>Draft Post Title</span>
              <input
                type="text"
                className="admin-rules-input"
                value={sandboxTitle}
                onChange={e => setSandboxTitle(e.target.value)}
                data-testid="sandbox-title-input"
              />
            </label>
            <label className="admin-rules-field">
              <span>Draft Post Body</span>
              <textarea
                rows={3}
                className="admin-rules-input"
                value={sandboxBody}
                onChange={e => setSandboxBody(e.target.value)}
                data-testid="sandbox-body-input"
              />
            </label>
            <div className="admin-rules-sandbox-row">
              <label className="admin-rules-field">
                <span>Post Category</span>
                <select
                  className="admin-rules-select"
                  value={sandboxCategory}
                  onChange={e => setSandboxCategory(e.target.value as TenantPostCategory)}
                >
                  {Object.entries(TENANT_POST_CATEGORY_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-rules-field">
                <span>Tenant Standing</span>
                <select
                  className="admin-rules-select"
                  value={sandboxStanding}
                  onChange={e => setSandboxStanding(e.target.value as TenantRegulatoryStatus)}
                >
                  <option value="active">Active</option>
                  <option value="pending_verification">Pending KYC</option>
                  <option value="restricted">Restricted</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
            <div className="admin-rules-sandbox-checks">
              <label>
                <input
                  type="checkbox"
                  checked={sandboxMinors}
                  onChange={e => setSandboxMinors(e.target.checked)}
                />
                <span>Targets U-18 / Minors</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={sandboxGuardianConsent}
                  onChange={e => setSandboxGuardianConsent(e.target.checked)}
                />
                <span>Guardian Consent Attested</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={sandboxSponsoredDisclosure}
                  onChange={e => setSandboxSponsoredDisclosure(e.target.checked)}
                />
                <span>ASCI #Ad Disclosure Present</span>
              </label>
            </div>
          </div>

          <div className="admin-rules-sandbox-output" data-testid="sandbox-result-panel">
            <div className="admin-rules-sandbox-score tabular-nums">
              <span>Predicted Gate Decision</span>
              <strong
                className={
                  sandboxEvaluation.disposition === 'hard_hold'
                    ? 'is-danger'
                    : sandboxEvaluation.disposition === 'manual_review'
                      ? 'is-warning'
                      : 'is-success'
                }
              >
                {sandboxEvaluation.disposition === 'hard_hold'
                  ? 'Hard Regulatory Hold'
                  : sandboxEvaluation.disposition === 'manual_review'
                    ? 'Manual Compliance Review'
                    : 'Auto-Clear Eligible'}{' '}
                · Risk {sandboxEvaluation.riskScore}/100
              </strong>
            </div>
            <p className="admin-rules-meta">{sandboxEvaluation.summaryReason}</p>
            <ul className="admin-rules-sandbox-checks-list">
              {sandboxEvaluation.checks.map(chk => (
                <li key={chk.ruleId} className={`is-${chk.outcome}`}>
                  <div>
                    <strong>{chk.ruleCode}</strong> · {chk.ruleName}
                  </div>
                  <div className="admin-rules-meta">{chk.evidence}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
