import { useEffect, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { useFormState } from '../../../shared/hooks/useFormState'
import type { AuthUserProfile } from '../../../integrations/supabase/auth-client'
import type { VerificationProofInput } from '../../../integrations/supabase/public-client'
import type { DbTenant } from '../../../integrations/supabase/tenant-client'
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getPartnerVerificationSnapshot,
  submitPartnerVerificationClaim,
  type PartnerModerationStatus,
  type PartnerVerificationPersona,
} from '../partnerVerificationService'
import { subscribeRegulatoryState } from '../../../shared/governance/regulatoryBridge'
import './PartnerVerificationStatusTracker.css'

export interface PartnerVerificationStatusTrackerProps {
  persona: PartnerVerificationPersona
  tenant?: DbTenant | null
  authUser?: AuthUserProfile | null
  entitySlug?: string
  entityName?: string
  localVerificationStatus?: PartnerModerationStatus
}

interface VerificationClaimFormFields extends Record<string, unknown> {
  documentType: VerificationProofInput['documentType']
  proofDetails: string
  contactName: string
  contactPhone: string
  contactEmail: string
}

const DEFAULT_DOC_BY_PERSONA: Record<PartnerVerificationPersona, VerificationProofInput['documentType']> = {
  academy: 'affiliation_certificate',
  organization: 'municipal_trade_license',
  coach: 'coaching_license',
  turf: 'ground_lease',
  host: 'ground_lease',
  tournament: 'affiliation_certificate',
}

/**
 * Displays the Partner Verification & Moderation Status pipeline across partner workspaces
 * and lets verified tenant owners submit accreditation or facility proof cleanly in a slide-over drawer.
 */
export function PartnerVerificationStatusTracker({
  persona,
  tenant,
  authUser,
  entitySlug,
  entityName,
  localVerificationStatus,
}: PartnerVerificationStatusTrackerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleUpdate = () => setRefreshTick(t => t + 1)
    window.addEventListener('khelgrid:verification-changed', handleUpdate)
    const unsubscribeReg = subscribeRegulatoryState(handleUpdate)
    return () => {
      window.removeEventListener('khelgrid:verification-changed', handleUpdate)
      unsubscribeReg()
    }
  }, [])

  void refreshTick
  const snapshot = getPartnerVerificationSnapshot({
    persona,
    tenant,
    authUser,
    entitySlug,
    entityName,
    localVerificationStatus,
  })

  const form = useFormState<VerificationClaimFormFields>({
    documentType: DEFAULT_DOC_BY_PERSONA[persona],
    proofDetails: '',
    contactName: authUser?.fullName || '',
    contactPhone: tenant?.contact_phone || authUser?.phone || '',
    contactEmail: tenant?.contact_email || authUser?.email || '',
  })

  const handleSubmitClaim = async (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    form.beginSubmit()
    try {
      const outcome = await submitPartnerVerificationClaim({
        persona,
        entitySlug: snapshot.entitySlug,
        entityName: snapshot.entityName,
        tenantId: tenant?.id,
        documentType: form.fields.documentType,
        proofDetails: form.fields.proofDetails,
        contactName: form.fields.contactName,
        contactPhone: form.fields.contactPhone,
        contactEmail: form.fields.contactEmail,
      })

      if (!outcome.success) {
        setFeedback({ kind: 'error', text: outcome.message })
        return
      }

      setFeedback({ kind: 'success', text: outcome.message })
      form.setField('proofDetails', '')
      setRefreshTick(t => t + 1)
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not submit verification proof.',
      })
    } finally {
      form.endSubmit()
    }
  }

  const toneClass = `is-${snapshot.statusTone}`
  const ctaLabel =
    snapshot.status === 'verified'
      ? 'View Verification Vault'
      : snapshot.status === 'pending_review'
        ? 'Track Moderation & Evidence'
        : snapshot.status === 'rejected' || snapshot.status === 'more_info_needed'
          ? 'Resubmit Corrected Proof'
          : 'Submit Accreditation Proof'

  return (
    <>
      <section
        className={`kg-verif-tracker ${toneClass}`}
        data-testid="partner-verification-tracker"
        aria-label="Partner Verification and Moderation Status"
      >
        <div className="kg-verif-tracker-top">
          <div className="kg-verif-heading-group">
            <div className="kg-verif-icon-badge" aria-hidden="true">
              <SiteIcon
                name={snapshot.status === 'verified' ? 'shield-check' : snapshot.statusTone === 'danger' ? 'alert-triangle' : 'award'}
                size={18}
              />
            </div>
            <div>
              <div className="kg-verif-pill-row">
                <span className="kg-verif-status-pill">{snapshot.statusLabel}</span>
                <span className="kg-verif-progress-tag">
                  Stage {snapshot.completedSteps}/{snapshot.totalSteps} Complete
                </span>
              </div>
              <h2 className="kg-verif-headline">{snapshot.headline}</h2>
              <p className="kg-verif-summary">{snapshot.summary}</p>
              {(snapshot.status === 'rejected' || snapshot.status === 'more_info_needed') &&
                (snapshot.rejectionReason || snapshot.moderatorNotes) && (
                  <p className="kg-verif-inline-feedback" role="note">
                    <strong>Moderator Note:</strong>{' '}
                    {snapshot.rejectionReason || snapshot.moderatorNotes}
                  </p>
                )}
            </div>
          </div>

          <button
            type="button"
            className="kg-btn kg-btn-primary kg-touch-target"
            onClick={() => {
              setFeedback(null)
              setDrawerOpen(true)
            }}
          >
            <SiteIcon name="shield-check" size={15} />
            <span>{ctaLabel}</span>
          </button>
        </div>

        <div className="kg-verif-steps-strip" role="list" aria-label="Verification milestones">
          {snapshot.milestones.map(m => (
            <div
              key={m.id}
              role="listitem"
              className={`kg-verif-step-chip is-${m.state}`}
            >
              <SiteIcon
                name={m.state === 'done' ? 'check-circle' : m.state === 'blocked' ? 'alert-triangle' : 'sparkles'}
                size={14}
              />
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <WorkspaceDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Verification & Moderation · ${snapshot.entityName}`}
        statusMessage={feedback?.text}
        width={560}
      >
        <div className="kg-verif-drawer-section">
          <h4>Moderation Pipeline ({snapshot.statusLabel})</h4>
          <ol className="kg-verif-timeline">
            {snapshot.milestones.map(m => (
              <li key={m.id} className={`kg-verif-timeline-item is-${m.state}`}>
                <strong style={{ fontSize: '0.84rem' }}>{m.label}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{m.detail}</span>
              </li>
            ))}
          </ol>
        </div>

        {(snapshot.rejectionReason || snapshot.moderatorNotes) && (
          <div className="kg-status-alert is-error" role="alert">
            <div>
              <strong>Moderator Feedback:</strong>{' '}
              {snapshot.rejectionReason || snapshot.moderatorNotes}
            </div>
          </div>
        )}

        <div className="kg-verif-drawer-section">
          <h4>Required Evidence for {persona.toUpperCase()} Verification</h4>
          <ul className="kg-verif-checklist">
            {snapshot.requiredEvidence.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {snapshot.claims.length > 0 && (
          <div className="kg-verif-drawer-section">
            <h4>Submitted Evidence History ({snapshot.claims.length})</h4>
            <div className="kg-verif-claims-list">
              {snapshot.claims.slice(0, 5).map(claim => (
                <div key={claim.id} className="kg-verif-claim-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <strong>{claim.documentType.replace(/_/g, ' ').toUpperCase()}</strong>
                    <span style={{ color: 'var(--muted)' }}>
                      {new Date(claim.submittedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-soft)' }}>{claim.proofDetails}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback?.kind === 'error' && (
          <div className="kg-status-alert is-error" role="alert">
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmitClaim} className="kg-verif-form">
          <div className="kg-verif-field">
            <label htmlFor="partner-verif-doc-type">Proof Document Category *</label>
            <select
              id="partner-verif-doc-type"
              value={form.fields.documentType}
              onChange={e =>
                form.setField('documentType', e.target.value as VerificationProofInput['documentType'])
              }
            >
              {DOCUMENT_CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="kg-verif-field">
            <label htmlFor="partner-verif-proof-details">
              Registration Number, Federation ID, or Document Link *
            </label>
            <textarea
              id="partner-verif-proof-details"
              required
              placeholder="Enter accreditation registration number, NIS certificate code, municipal license ID, or Google Drive/cloud link…"
              value={form.fields.proofDetails}
              onChange={e => form.setField('proofDetails', e.target.value)}
            />
          </div>

          <div className="kg-form-grid">
            <div className="kg-verif-field">
              <label htmlFor="partner-verif-contact-name">Authorized Signatory Name *</label>
              <input
                id="partner-verif-contact-name"
                type="text"
                required
                placeholder="e.g. Coach Ramesh Kumar"
                value={form.fields.contactName}
                onChange={e => form.setField('contactName', e.target.value)}
              />
            </div>

            <div className="kg-verif-field">
              <label htmlFor="partner-verif-contact-phone">WhatsApp / Phone *</label>
              <input
                id="partner-verif-contact-phone"
                type="tel"
                required
                placeholder="+91 9845012345"
                value={form.fields.contactPhone}
                onChange={e => form.setField('contactPhone', e.target.value)}
              />
            </div>
          </div>

          <div className="kg-verif-field">
            <label htmlFor="partner-verif-contact-email">Official Email (Optional)</label>
            <input
              id="partner-verif-contact-email"
              type="email"
              placeholder="admissions@organisation.com"
              value={form.fields.contactEmail}
              onChange={e => form.setField('contactEmail', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={form.submitting}
            className="kg-btn kg-btn-primary kg-touch-target"
          >
            <SiteIcon name="shield-check" size={15} />
            <span>
              {form.submitting
                ? 'Submitting Credentials to Moderation Desk…'
                : 'Submit Credentials for Review'}
            </span>
          </button>
        </form>
      </WorkspaceDetailDrawer>
    </>
  )
}
