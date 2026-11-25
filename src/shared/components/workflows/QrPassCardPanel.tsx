/**
 * QrPassCardPanel.tsx
 *
 * Shared digital gate pass & QR card presenter used across AcademyHubPage,
 * ParentPortalPage, MyPassesVaultPage, and GateCheckInPage.
 */
import { generateQrSvgString } from '../../utils/qrCodeGenerator'
import { SiteIcon } from '../SiteIcon'

export interface QrPassCardData {
  token: string
  title: string
  subtitle: string
  holder: string
  sport: string
  venue: string
  scheduleLabel: string
  status: 'valid' | 'used' | 'expired'
  statusLabel: string
  qrPayload: string
}

interface QrPassCardPanelProps {
  pass: QrPassCardData
  onOpenVerifier?: (token: string) => void
  onShare?: (pass: QrPassCardData) => void
  actionsSlot?: import('react').ReactNode
  note?: string
}

export function QrPassCardPanel({ pass, onOpenVerifier, onShare, actionsSlot, note }: QrPassCardPanelProps) {
  const qrSvg = generateQrSvgString(pass.qrPayload || pass.token, { size: 112 })

  return (
    <article className="kg-qr-pass-box" aria-label={`Pass ${pass.token}`}>
      <div className="kg-qr-holder" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div className="gate-header-top">
          <span
            className={`kg-badge ${
              pass.status === 'valid' ? 'is-success' : pass.status === 'used' ? 'is-info' : 'is-danger'
            }`}
          >
            {pass.statusLabel}
          </span>
          <code style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>#{pass.token}</code>
        </div>
        <h4 style={{ margin: '0.45rem 0 0.2rem', color: 'var(--text)' }}>{pass.title}</h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>{pass.subtitle}</p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-soft)' }}>
          {pass.holder} · {pass.sport} · {pass.scheduleLabel}
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>{pass.venue}</p>
        {note && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
            <strong>Note:</strong> {note}
          </p>
        )}
        {(actionsSlot || onOpenVerifier || onShare) && (
          <div className="host-action-row" style={{ marginTop: '0.7rem' }}>
            {actionsSlot}
            {onOpenVerifier && (
              <button
                type="button"
                className="kg-btn kg-btn-sm kg-btn-primary"
                onClick={() => onOpenVerifier(pass.token)}
              >
                <SiteIcon name="shield-check" size={14} />
                <span>Open Gate Pass</span>
              </button>
            )}
            {onShare && (
              <button
                type="button"
                className="kg-btn kg-btn-sm"
                onClick={() => onShare(pass)}
              >
                <SiteIcon name="share" size={14} />
                <span>Share Pass</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
