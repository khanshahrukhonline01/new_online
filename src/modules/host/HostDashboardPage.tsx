import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './HostDashboardPage.css'

export interface HostDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
}

export default function HostDashboardPage({ onNavigate, onOpenIntake }: HostDashboardPageProps) {
  return (
    <section className="host-dashboard-root content-page">
      <header className="host-dashboard-header">
        <p className="eyebrow">KHELGRID · HOST CENTRE</p>
        <h1>Host tools are being prepared.</h1>
        <p className="page-intro">
          The host dashboard is not yet connected to verified host accounts and authoritative booking records.
          We will not display sample listings, invented booking activity, balances or transaction history.
        </p>
      </header>

      <div className="host-dashboard-empty-state">
        <SiteIcon name="shield-check" size={34} />
        <h2>Community listings require moderator review</h2>
        <p>
          Submit an academy, venue, coach, opportunity, event or pickup game through the private review queue.
          A submission is not published or verified until the moderation and editorial process is complete.
        </p>
        {onOpenIntake ? (
          <button type="button" className="host-action-btn primary" onClick={onOpenIntake}>
            Submit a listing for review <SiteIcon name="arrow-up-right" size={16} />
          </button>
        ) : (
          <a className="host-action-btn primary" href="/submit-listing" onClick={event => onNavigate?.(event, '/submit-listing')}>
            Submit a listing for review <SiteIcon name="arrow-up-right" size={16} />
          </a>
        )}
      </div>

      <div className="host-dashboard-empty-state">
        <SiteIcon name="pause" size={34} />
        <h2>Listing payments and host payouts are paused</h2>
        <p>
          Listing plans, renewals, checkout, payment history, balances and payouts are unavailable while payment
          development is paused. No payment will be requested or recorded through this dashboard.
        </p>
      </div>
    </section>
  )
}
