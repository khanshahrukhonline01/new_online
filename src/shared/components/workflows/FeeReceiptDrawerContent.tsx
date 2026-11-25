/**
 * FeeReceiptDrawerContent.tsx
 *
 * Shared fee & payment receipt view designed for rendering inside WorkspaceDetailDrawer
 * across AcademyHubPage, CoachDashboardPage, and ParentPortalPage.
 */
import { SiteIcon } from '../SiteIcon'

export interface FeeReceiptItem {
  receiptNumber: string
  payerName: string
  recipientOrg: string
  amountInr: number
  paymentMethod: string
  paidAt: string
  billingCycle: string
  notes?: string
}

interface FeeReceiptDrawerContentProps {
  receipt: FeeReceiptItem
  onPrint?: () => void
  onShareWhatsApp?: (receipt: FeeReceiptItem) => void
}

export function FeeReceiptDrawerContent({
  receipt,
  onPrint,
  onShareWhatsApp,
}: FeeReceiptDrawerContentProps) {
  return (
    <div className="kg-receipt-box" role="region" aria-label={`Receipt ${receipt.receiptNumber}`}>
      <div className="gate-header-top">
        <span className="kg-badge is-success">Receipt #{receipt.receiptNumber}</span>
        <strong style={{ fontSize: '1.25rem', color: 'var(--kg-emerald)' }}>
          ₹{receipt.amountInr.toLocaleString('en-IN')}
        </strong>
      </div>

      <dl style={{ margin: '0.5rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.85rem' }}>
        <div>
          <dt style={{ color: 'var(--muted)' }}>Organisation</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{receipt.recipientOrg}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--muted)' }}>Student / Payer</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{receipt.payerName}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--muted)' }}>Method</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{receipt.paymentMethod}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--muted)' }}>Cycle</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{receipt.billingCycle}</dd>
        </div>
        <div>
          <dt style={{ color: 'var(--muted)' }}>Recorded At</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{receipt.paidAt}</dd>
        </div>
      </dl>

      {receipt.notes && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>{receipt.notes}</p>
      )}

      {(onPrint || onShareWhatsApp) && (
        <div className="host-action-row">
          {onPrint && (
            <button type="button" className="kg-btn kg-touch-target" onClick={onPrint}>
              <SiteIcon name="file-text" size={15} />
              <span>Print Receipt</span>
            </button>
          )}
          {onShareWhatsApp && (
            <button
              type="button"
              className="kg-btn kg-btn-primary kg-touch-target"
              onClick={() => onShareWhatsApp(receipt)}
            >
              <SiteIcon name="share" size={15} />
              <span>Send via WhatsApp</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
