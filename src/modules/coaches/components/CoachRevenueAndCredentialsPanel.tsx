import { SiteIcon } from '../../../shared/components/SiteIcon'
import { getStoredAuthUser } from '../../../integrations/supabase/auth-client'
import { generateQrSvgString } from '../../../shared/utils/qrCodeGenerator'
import { PartnerVerificationStatusTracker } from '../../partner/components/PartnerVerificationStatusTracker'
import {
  confirmAndVerifyCoach,
  generateUpiPayLink,
  generateWhatsAppEndorsementUrl,
  revokeCoachVerification,
  type CoachBatch,
  type CoachEndorsementRecord,
  type RegisteredCoach,
} from '../coachSaaSClient'
import type { CoachSummaryStats } from '../coachDashboardTypes'

export interface CoachRevenueAndCredentialsPanelProps {
  activeTab: 'earnings' | 'credentials' | 'endorsements'
  currentCoach: RegisteredCoach
  batches: CoachBatch[]
  endorsements: CoachEndorsementRecord[]
  summary: CoachSummaryStats
  onOpenAwardEndorsement: () => void
  onRefresh: () => void
}

/**
 * Renders the Coach direct-UPI earnings & QR panel, verification credentials desk,
 * and cryptographically hashed trainee scouting endorsements.
 */
export function CoachRevenueAndCredentialsPanel({
  activeTab,
  currentCoach,
  batches,
  endorsements,
  summary,
  onOpenAwardEndorsement,
  onRefresh,
}: CoachRevenueAndCredentialsPanelProps) {
  if (activeTab === 'earnings') {
    const upiQrPayload = currentCoach.upiVpa
      ? generateUpiPayLink({
          vpa: currentCoach.upiVpa,
          name: currentCoach.name,
          amount: currentCoach.monthlyFee || 3500,
          note: `Coaching Fee - ${currentCoach.name}`,
        })
      : ''
    const qrSvg = upiQrPayload ? generateQrSvgString(upiQrPayload) : ''

    return (
      <div className="coach-card-panel">
        <div className="coach-earnings-layout">
          <div className="coach-earnings-main">
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>Coaching Revenue &amp; Direct UPI Payouts</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.88rem' }}>
              100% of student fee collections flow directly to your UPI ID without platform cuts or settlement delays.
            </p>

            <div className="coach-earnings-summary-box">
              <div className="earnings-stat-item">
                <span className="stat-label">Total Monthly Collection</span>
                <strong className="stat-value" style={{ color: '#059669' }}>
                  ₹{summary.totalRevenue.toLocaleString('en-IN')}
                </strong>
                <small style={{ color: '#64748b' }}>From {summary.paidTrainees} paid trainees</small>
              </div>

              <div className="earnings-stat-item">
                <span className="stat-label">Pending / Overdue Fees</span>
                <strong className="stat-value" style={{ color: '#dc2626' }}>
                  ₹{summary.pendingRevenue.toLocaleString('en-IN')}
                </strong>
                <small style={{ color: '#64748b' }}>Awaiting payment</small>
              </div>

              <div className="earnings-stat-item">
                <span className="stat-label">Platform Commission</span>
                <strong className="stat-value" style={{ color: '#2563eb' }}>
                  0%
                </strong>
                <small style={{ color: '#059669' }}>Zero deduction guarantee</small>
              </div>
            </div>

            <div style={{ margin: '1.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Fee Collection Progress</span>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>{summary.collectionRate}%</span>
              </div>
              <div className="coach-progress-bar-bg" style={{ height: '10px' }}>
                <div className="coach-progress-bar-fill" style={{ width: `${summary.collectionRate}%`, background: '#059669' }} />
              </div>
            </div>

            <h4 style={{ margin: '1.5rem 0 0.75rem', fontSize: '0.95rem' }}>Revenue Breakdown by Batch</h4>
            <div className="coach-batch-breakdown-list">
              {batches.map(b => (
                <div key={b.id} className="coach-batch-breakdown-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SiteIcon name="calendar-check" size={16} style={{ color: '#059669' }} />
                    <div>
                      <strong>{b.batchName}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                        {b.enrolledCount} Trainees · {b.days}
                      </span>
                    </div>
                  </div>
                  <strong>₹{(b.enrolledCount * b.monthlyFee).toLocaleString('en-IN')} / mo</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="coach-earnings-qr-panel">
            <h4>Direct UPI Payment QR</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 1rem' }}>
              Trainees and parents scan this QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to settle monthly coaching fees.
            </p>

            {qrSvg ? (
              <div
                className="coach-qr-container"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="coach-qr-placeholder">
                <span>Please configure your UPI VPA ID to generate QR</span>
              </div>
            )}

            <div className="coach-upi-id-box">
              <span style={{ fontSize: '11px', color: '#64748b' }}>CONFIGURED UPI VPA</span>
              <strong>{currentCoach.upiVpa || 'Not configured'}</strong>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'credentials') {
    return (
      <div className="coach-card-panel">
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Coaching Credentials &amp; Verification Evidence</h3>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
          KhelGrid enforces strict background and certification verification for all coaches to protect grassroots athletes.
        </p>

        <div className="coach-cert-evidence-box">
          <div className="cert-evidence-row">
            <div className="cert-evidence-label">
              <SiteIcon name="award" size={16} />
              <span>Primary Certification:</span>
            </div>
            <strong>{currentCoach.certification}</strong>
          </div>

          <div className="cert-evidence-row">
            <div className="cert-evidence-label">
              <SiteIcon name="calendar" size={16} />
              <span>Coaching Experience:</span>
            </div>
            <strong>{currentCoach.experienceYears}+ Years Active Coaching</strong>
          </div>

          <div className="cert-evidence-row">
            <div className="cert-evidence-label">
              <SiteIcon name="map-pin" size={16} />
              <span>Operating City:</span>
            </div>
            <strong>{currentCoach.city}, {currentCoach.state}</strong>
          </div>

          <div className="cert-evidence-row">
            <div className="cert-evidence-label">
              <SiteIcon name="shield-check" size={16} />
              <span>Verification Tag:</span>
            </div>
            <div>
              {currentCoach.verificationStatus === 'verified' ? (
                <span className="coach-verified-pill verified">🛡️ Verified by KhelGrid Admin</span>
              ) : (
                <span className="coach-verified-pill pending">🟡 Pending Review · Unconfirmed</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <PartnerVerificationStatusTracker
            persona="coach"
            authUser={getStoredAuthUser()}
            entitySlug={currentCoach.slug}
            entityName={currentCoach.name}
            localVerificationStatus={currentCoach.verificationStatus}
          />
        </div>

        {(getStoredAuthUser()?.role === 'admin' || getStoredAuthUser()?.role === 'moderator') && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
            {currentCoach.verificationStatus !== 'verified' ? (
              <button
                type="button"
                className="coach-primary-btn"
                onClick={() => {
                  confirmAndVerifyCoach(currentCoach.slug)
                  onRefresh()
                }}
              >
                <SiteIcon name="shield-check" size={15} />
                <span>Confirm &amp; Grant Verified Tag (Admin)</span>
              </button>
            ) : (
              <button
                type="button"
                className="coach-hub-btn-outline"
                onClick={() => {
                  revokeCoachVerification(currentCoach.slug)
                  onRefresh()
                }}
              >
                Revoke Verified Tag (Admin)
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="coach-card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Official Coach Endorsements &amp; Talent Scouting CV</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            Endorse elite trainees with tamper-proof cryptographic badges permanently stamped on their National Sports CV.
          </p>
        </div>
        <button
          type="button"
          className="coach-primary-btn"
          onClick={onOpenAwardEndorsement}
        >
          <SiteIcon name="shield-check" size={15} />
          <span>Award Official Endorsement</span>
        </button>
      </div>

      <div className="coach-verification-status-banner verified" style={{ marginBottom: '1.25rem' }}>
        <div className="coach-verification-status-text">
          <SiteIcon name="award" size={20} className="status-banner-icon verified" />
          <div>
            <strong style={{ color: '#065f46' }}>Tamper-Proof Scouting Validation</strong>
            <p style={{ color: '#047857', margin: 0, fontSize: '0.84rem' }}>
              Each endorsement issued by a verified NIS Patiala / SAI coach carries a unique cryptographic verification hash (KG-CERT-...). Scouts, selectors, and state federations can verify authenticity instantly on KhelGrid.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {endorsements.map(end => (
          <div key={end.id} className="coach-endorsement-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{end.traineeName}</h4>
                  <span className="endorsement-hash-badge">{end.verificationHash}</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Passport: {end.traineeId} · Sport: {end.sport} · Awarded {end.awardedDate}
                </span>
              </div>
              <a
                href={generateWhatsAppEndorsementUrl(end)}
                target="_blank"
                rel="noopener noreferrer"
                className="coach-action-btn whatsapp"
                style={{ padding: '8px 12px', fontSize: '12.5px' }}
                title="Send official verified certificate on WhatsApp"
              >
                <SiteIcon name="share" size={14} />
                <span>Share Certificate</span>
              </a>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎖️</span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{end.badgeTitle}</strong>
              </div>
              <p style={{ margin: 0, color: '#334155', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.5 }}>
                &quot;{end.endorsementText}&quot;
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              <span>
                Endorsed by: <strong style={{ color: '#065f46' }}>{end.coachName}</strong> ({end.coachCertification})
              </span>
              <span style={{ color: '#059669', fontWeight: 600 }}>🛡️ KhelGrid Verified Coach</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
