import { useState, useEffect, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { generateQrSvgString } from '../../shared/utils/qrCodeGenerator'
import {
  verifyPassToken,
  admitPassToken,
  admitPassOffline,
  syncOfflineGateLogs,
  getOfflineAuditStats,
  getGateAdmissionLogs,
  type UnifiedPassResult,
  type GateAdmissionLogItem,
} from './passVerifierService'
import './GateCheckInPage.css'

export interface GateCheckInPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  initialToken?: string
}

function getInitialToken(initialToken?: string): string {
  if (initialToken) return initialToken
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('id') || params.get('token') || params.get('ref') || ''
  }
  return ''
}

export function GateCheckInPage({ onNavigate, initialToken }: GateCheckInPageProps) {
  const [tokenInput, setTokenInput] = useState(() => getInitialToken(initialToken))
  const [activePass, setActivePass] = useState<UnifiedPassResult | null>(() => {
    const token = getInitialToken(initialToken)
    return token ? verifyPassToken(token) : null
  })
  const [admittingOfficer, setAdmittingOfficer] = useState('Ground Gatekeeper / Coach')
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [recentLogs, setRecentLogs] = useState<GateAdmissionLogItem[]>(() => getGateAdmissionLogs())
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isOfflineMode, setIsOfflineMode] = useState(false)

  const auditStats = getOfflineAuditStats()

  // Sync token from URL changes if needed
  useEffect(() => {
    const targetToken = getInitialToken(initialToken)
    if (targetToken && (!activePass || activePass.token !== targetToken)) {
      setTokenInput(targetToken)
      const res = verifyPassToken(targetToken)
      setActivePass(res)
    }
  }, [initialToken, activePass])

  const handleSearch = (e?: FormEvent) => {
    if (e) e.preventDefault()
    setToastMessage(null)
    const clean = tokenInput.trim().toUpperCase()
    if (!clean) return

    const res = verifyPassToken(clean)
    setActivePass(res)
    if (!res) {
      setToastMessage({
        text: `No KhelGrid credential found matching token "${clean}". Please check the spelling or scan the QR code.`,
        type: 'error',
      })
    }
  }

  const handleSelectDemoToken = (demoToken: string) => {
    setTokenInput(demoToken)
    setToastMessage(null)
    const res = verifyPassToken(demoToken)
    setActivePass(res)
  }

  const handleAdmit = () => {
    if (!activePass) return
    const officer = admittingOfficer.trim() || 'Ground Reception'
    const res = isOfflineMode ? admitPassOffline(activePass.token, officer) : admitPassToken(activePass.token, officer)
    if (res.success && res.pass) {
      setActivePass(res.pass)
      setRecentLogs(getGateAdmissionLogs())
      setToastMessage({ text: res.message, type: 'success' })
    } else {
      setToastMessage({ text: res.message, type: 'error' })
    }
  }

  const handleSyncOffline = () => {
    const syncRes = syncOfflineGateLogs()
    setRecentLogs(getGateAdmissionLogs())
    setToastMessage({ text: syncRes.message, type: 'success' })
  }

  return (
    <div className="gate-desk-container">
      {/* Header Banner */}
      <header className="gate-desk-header">
        <div className="gate-header-top">
          <div className="gate-desk-badge">
            <SiteIcon name="shield-check" size={14} />
            <span>Official On-Ground Verification Desk</span>
          </div>
          {onNavigate && (
            <a
              href="/"
              onClick={e => onNavigate(e, '/')}
              className="gate-back-link"
            >
              <span>Back Home</span>
              <SiteIcon name="arrow-up-right" size={14} />
            </a>
          )}
        </div>
        <h1 className="gate-desk-title">Gate Pass &amp; Check-In Scanner</h1>
        <p className="gate-desk-subtitle">
          Verify digital selection trial passes, turf court booking vouchers, and tournament match rosters before granting on-ground access.
        </p>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="polite"
          className={`gate-toast-alert ${toastMessage.type === 'success' ? 'is-success' : 'is-error'}`}
        >
          <SiteIcon name={toastMessage.type === 'success' ? 'check' : 'alert-circle'} size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Search & Scanner Card */}
      <section className="gate-search-card" aria-label="Pass token verification">
        <form onSubmit={handleSearch} className="gate-search-form">
          <div className="gate-input-wrapper">
            <span className="gate-input-icon">
              <SiteIcon name="search" size={18} />
            </span>
            <input
              type="text"
              className="gate-search-input"
              placeholder="Enter Pass ID e.g. PASS-CRI-X7K2P or TRF-A1B2C…"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              aria-label="Pass token input"
            />
          </div>
          <button type="submit" className="gate-submit-btn">
            <SiteIcon name="check" size={18} />
            <span>Verify Credential</span>
          </button>
          <button
            type="button"
            className={`gate-submit-btn gate-camera-btn${isCameraActive ? ' is-active' : ''}`}
            onClick={() => setIsCameraActive(!isCameraActive)}
            title="Toggle Camera QR Scanner"
          >
            <SiteIcon name="camera" size={18} />
            <span>{isCameraActive ? 'Close Camera' : 'Scan QR'}</span>
          </button>
        </form>

        {/* Live Camera Scanner Simulation */}
        {isCameraActive && (
          <div className="gate-camera-preview">
            <div className="gate-camera-reticle">
              <SiteIcon name="camera" size={32} />
              <span className="gate-camera-hint">Point camera at pass QR</span>
            </div>
            <p className="gate-camera-caption">
              Position player&apos;s digital entry QR code inside the frame to scan.
            </p>
          </div>
        )}

        {/* 1-Tap Quick Test Tokens */}
        <div className="gate-quick-tokens">
          <span>Test Demo Passes:</span>
          <button type="button" className="gate-demo-pill" onClick={() => handleSelectDemoToken('PASS-CRI-DEMO')}>
            PASS-CRI-DEMO (Academy Trial)
          </button>
          <button type="button" className="gate-demo-pill" onClick={() => handleSelectDemoToken('TRF-FTB-DEMO')}>
            TRF-FTB-DEMO (Turf Booking)
          </button>
          <button type="button" className="gate-demo-pill" onClick={() => handleSelectDemoToken('KG-TOUR-DELHI-104')}>
            KG-TOUR-DELHI-104 (Tournament Team)
          </button>
          <button type="button" className="gate-demo-pill" onClick={() => handleSelectDemoToken('KG-VERIF-78291')}>
            KG-VERIF-78291 (Athlete Badge)
          </button>
        </div>
      </section>

      {/* Main Grid: Pass Card on Left, Gate Audit Log on Right */}
      <div className="gate-main-grid">
        {activePass ? (
          <article className={`gate-pass-card is-${activePass.status}`}>
            {/* Status Banner */}
            <div className={`gate-status-ribbon status-${activePass.status === 'valid' ? 'valid' : activePass.status === 'used' ? 'used' : 'invalid'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SiteIcon name={activePass.status === 'valid' ? 'check' : activePass.status === 'used' ? 'clock' : 'alert-circle'} size={18} />
                <span>{activePass.statusLabel}</span>
              </div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {activePass.typeLabel}
              </span>
            </div>

            <div className="gate-pass-body">
              <div className="gate-pass-top">
                <div>
                  <span className="gate-token-tag">#{activePass.token}</span>
                  <h2 className="gate-pass-title" style={{ marginTop: '0.4rem' }}>{activePass.title}</h2>
                  <p className="gate-pass-sub">{activePass.subtitle}</p>
                </div>
                <span className="gate-pass-type-badge">{activePass.sport}</span>
              </div>

              {/* Verified QR Code Card */}
              <div className="gate-qr-preview-box">
                <div
                  className="gate-qr-svg-holder"
                  dangerouslySetInnerHTML={{
                    __html: generateQrSvgString(activePass.qrCodePayload, {
                      size: 96,
                      color: activePass.status === 'valid' ? '#059669' : '#475569',
                      bgColor: '#ffffff',
                    }),
                  }}
                />
                <div className="gate-qr-desc">
                  <h4>Cryptographic Ground Pass</h4>
                  <p>
                    Verified against KhelGrid Registry. Check-in records are locked and cannot be re-used.
                  </p>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="gate-details-list">
                <div className="gate-detail-item">
                  <span className="gate-detail-label">Candidate / Team</span>
                  <span className="gate-detail-value">{activePass.primaryHolder}</span>
                </div>
                <div className="gate-detail-item">
                  <span className="gate-detail-label">Verified Contact</span>
                  <span className="gate-detail-value">{activePass.contactMasked}</span>
                </div>
                <div className="gate-detail-item">
                  <span className="gate-detail-label">Facility / Court</span>
                  <span className="gate-detail-value">{activePass.venueOrFacility}</span>
                </div>
                <div className="gate-detail-item">
                  <span className="gate-detail-label">Scheduled Time</span>
                  <span className="gate-detail-value">{activePass.dateTimeSummary}</span>
                </div>
              </div>

              {/* Reporting Instructions */}
              {activePass.reportingInstructions && (
                <div className="gate-instructions-box">
                  <strong>Reporting Instructions:</strong> {activePass.reportingInstructions}
                </div>
              )}

              {/* Ground Admission Action */}
              <div className="gate-admission-action-box">
                <div className="gate-admission-header">
                  <h3 className="gate-admission-heading">
                    On-Ground Admission Action
                  </h3>
                  {activePass.checkedInAt && (
                    <span className="gate-checkedin-badge">
                      ✓ Checked in at {new Date(activePass.checkedInAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="gate-admission-row">
                  <input
                    type="text"
                    className="gatekeeper-name-input"
                    placeholder="Admitting Official / Coach Name"
                    value={admittingOfficer}
                    onChange={e => setAdmittingOfficer(e.target.value)}
                    aria-label="Admitting official name"
                  />
                  <button
                    type="button"
                    className="gate-admit-btn"
                    onClick={handleAdmit}
                    disabled={activePass.status === 'used'}
                  >
                    <SiteIcon name={activePass.status === 'used' ? 'check' : 'arrow-up-right'} size={18} />
                    <span>{activePass.status === 'used' ? 'Candidate Admitted' : 'Admit Candidate / Check In'}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="gate-empty-card">
            <div className="gate-empty-icon">
              <SiteIcon name="shield-check" size={48} />
            </div>
            <h3>Scan or Enter a KhelGrid Pass Token</h3>
            <p>
              Type an Academy Trial Pass, Turf Voucher, or Tournament Team Token into the search box above, or click one of the quick test demo passes.
            </p>
          </div>
        )}

        {/* Gate Admission Audit Log */}
        <aside className="gate-audit-card">
          <div className="gate-audit-top-row">
            <div>
              <h2 className="gate-audit-title">Today&apos;s Gate Admission Log</h2>
              <p className="gate-audit-sub">Chronological audit trail of ground admissions for this facility session.</p>
            </div>
            <div className="gate-audit-controls">
              <label className={`gate-offline-toggle${isOfflineMode ? ' is-offline' : ''}`}>
                <input
                  type="checkbox"
                  checked={isOfflineMode}
                  onChange={e => setIsOfflineMode(e.target.checked)}
                />
                <span>Offline Mode</span>
              </label>
              {auditStats.pendingSyncCount > 0 && (
                <button
                  type="button"
                  onClick={handleSyncOffline}
                  className="gate-sync-btn"
                  title="Upload offline gate admissions to cloud"
                >
                  Sync ({auditStats.pendingSyncCount})
                </button>
              )}
            </div>
          </div>

          <div className="gate-audit-list">
            {recentLogs.length > 0 ? (
              recentLogs.map(log => (
                <div key={log.id} className="gate-log-item">
                  <span className="gate-log-icon">
                    <SiteIcon name="check" size={16} />
                  </span>
                  <div className="gate-log-content">
                    <div className="gate-log-top">
                      <span className="gate-log-name">{log.holderName}</span>
                      <div className="gate-audit-controls">
                        {log.isOfflineRecord && (
                          <span className="gate-offline-pill">
                            Offline Cached
                          </span>
                        )}
                        <span className="gate-log-time">{new Date(log.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="gate-log-facility">{log.sport} · {log.facility}</div>
                    <div className="gate-log-official">Admitted by {log.admittedBy}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="gate-empty-note">
                No ground admissions recorded yet today.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
