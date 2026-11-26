import { useState, type FormEvent } from 'react'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  submitCoachVerification,
  type CoachDocumentType,
  type CoachProfileRecord,
  type CoachVerificationStatus,
  type CoachVerificationSubmissionRecord,
} from '../coachWorkspaceClient'

export interface CoachVerificationPanelProps {
  profile: CoachProfileRecord
  submissions: CoachVerificationSubmissionRecord[]
  loadingHistory: boolean
  onSubmitted: () => void
}

const STATUS_META: Record<
  CoachVerificationStatus,
  { label: string; toneClass: string; summary: string }
> = {
  unverified: {
    label: 'Unverified',
    toneClass: 'is-warning',
    summary: 'Submit supporting coaching licence, federation affiliation, or experience evidence for moderator audit.',
  },
  pending: {
    label: 'Pending Review',
    toneClass: 'is-info',
    summary: 'Your verification submission is queued for moderation review. Coaches cannot approve or alter status.',
  },
  under_review: {
    label: 'Under Review',
    toneClass: 'is-info',
    summary: 'A KhelGrid moderator is currently inspecting your accreditation documents.',
  },
  verified: {
    label: 'Verified Coach',
    toneClass: 'is-success',
    summary: 'Credentials have been verified by KhelGrid moderators.',
  },
  rejected: {
    label: 'Rejected — Resubmission Permitted',
    toneClass: 'is-error',
    summary: 'Please review the moderator feedback below and upload corrected supporting evidence.',
  },
  suspended: {
    label: 'Suspended',
    toneClass: 'is-error',
    summary: 'Verification is suspended by moderation. Contact KhelGrid support for clarification.',
  },
}

const DOC_OPTIONS: readonly { value: CoachDocumentType; label: string }[] = [
  { value: 'coaching_license', label: 'Coaching Licence / NIS Diploma / Federation Badge' },
  { value: 'affiliation_certificate', label: 'Academy / State Federation Affiliation Letter' },
  { value: 'government_id', label: 'Government Identity Proof Reference' },
  { value: 'experience_letter', label: 'Coaching Experience / Employment Letter' },
  { value: 'other', label: 'Other Supporting Evidence' },
]

export function CoachVerificationPanel({
  profile,
  submissions,
  loadingHistory,
  onSubmitted,
}: CoachVerificationPanelProps) {
  const [documentType, setDocumentType] = useState<CoachDocumentType>('coaching_license')
  const [documentTitle, setDocumentTitle] = useState('')
  const [supportingDetails, setSupportingDetails] = useState('')
  const [supportingDocumentUrl, setSupportingDocumentUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const statusMeta = STATUS_META[profile.verificationStatus] || STATUS_META.unverified
  const canSubmit = profile.verificationStatus === 'unverified' || profile.verificationStatus === 'rejected'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setSubmitting(true)
    const res = await submitCoachVerification({
      coachProfileId: profile.id,
      documentType,
      documentTitle,
      supportingDetails,
      supportingDocumentUrl,
    })
    setSubmitting(false)

    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.error })
      return
    }

    setDocumentTitle('')
    setSupportingDetails('')
    setSupportingDocumentUrl('')
    setFeedback({
      kind: 'success',
      text: 'Verification proof queued cleanly for moderator review.',
    })
    onSubmitted()
  }

  return (
    <div className="kg-coach-stack">
      <section className="kg-coach-card" aria-label="Coach verification status overview">
        <div className="kg-coach-card-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className={`kg-coach-pill ${statusMeta.toneClass}`}>{statusMeta.label}</span>
              {profile.verifiedAt && (
                <span className="kg-coach-muted-note">
                  Verified {new Date(profile.verifiedAt).toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
            <h2>Accreditation &amp; Verification Status</h2>
            <p>{statusMeta.summary}</p>
          </div>
        </div>

        {profile.verificationFeedback && (
          <div className="kg-coach-alert is-warning" role="note">
            <div>
              <strong>Moderator Feedback:</strong>
              <p>{profile.verificationFeedback}</p>
            </div>
          </div>
        )}
      </section>

      {canSubmit && (
        <form className="kg-coach-card kg-coach-stack" onSubmit={handleSubmit} aria-label="Submit coach verification request">
          <div className="kg-coach-card-head">
            <div>
              <h3>
                {profile.verificationStatus === 'rejected'
                  ? 'Resubmit Corrected Verification Evidence'
                  : 'Submit Verification Request'}
              </h3>
              <p>
                Upload reference numbers or verified credential document links. Submissions are audited exclusively by KhelGrid moderators.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`kg-coach-alert ${feedback.kind === 'error' ? 'is-error' : 'is-success'}`}
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="kg-coach-form-grid">
            <label className="kg-coach-field">
              <span>Document Category *</span>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value as CoachDocumentType)}
              >
                {DOC_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="kg-coach-field">
              <span>Document / Certificate Title *</span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={180}
                placeholder="e.g. NSNIS Patiala Senior Diploma Certificate"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
              />
            </label>

            <label className="kg-coach-field">
              <span>Supporting Document URL (Optional)</span>
              <input
                type="url"
                placeholder="https://..."
                value={supportingDocumentUrl}
                onChange={e => setSupportingDocumentUrl(e.target.value)}
              />
            </label>
          </div>

          <label className="kg-coach-field">
            <span>Licence Number, Issuing Federation &amp; Verification Notes *</span>
            <textarea
              rows={3}
              required
              minLength={5}
              maxLength={2000}
              placeholder="Provide registration ID, issuing authority, year awarded, and verifiable reference details."
              value={supportingDetails}
              onChange={e => setSupportingDetails(e.target.value)}
            />
          </label>

          <div>
            <button type="submit" className="kg-coach-btn-primary" disabled={submitting}>
              <SiteIcon name="shield-check" size={15} />
              <span>{submitting ? 'Submitting Request…' : 'Submit Verification Request'}</span>
            </button>
          </div>
        </form>
      )}

      <section className="kg-coach-card" aria-labelledby="kg-coach-verif-history-heading">
        <div className="kg-coach-card-head">
          <div>
            <h3 id="kg-coach-verif-history-heading">Verification History</h3>
            <p>Audit log of credentials submitted by your account and moderator review outcomes.</p>
          </div>
        </div>

        {loadingHistory ? (
          <p className="kg-coach-muted-note" role="status">Loading verification history…</p>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<SiteIcon name="file-text" size={22} />}
            title="No verification requests submitted yet"
            description="Submit your coaching credentials above to begin the moderation review process."
          />
        ) : (
          <ul className="kg-coach-list">
            {submissions.map(sub => {
              const tone = STATUS_META[sub.status]?.toneClass || 'is-neutral'
              return (
                <li key={sub.id} className="kg-coach-list-item">
                  <div>
                    <strong>{sub.documentTitle}</strong>
                    <span>
                      {sub.documentType.replace(/_/g, ' ')} · Submitted {new Date(sub.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>{sub.supportingDetails}</p>
                    {sub.moderatorFeedback && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: 600 }}>
                        Moderator feedback: {sub.moderatorFeedback}
                      </p>
                    )}
                  </div>
                  <span className={`kg-coach-pill ${tone}`}>{sub.status.replace(/_/g, ' ')}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
