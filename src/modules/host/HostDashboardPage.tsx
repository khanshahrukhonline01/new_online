import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './HostDashboardPage.css'

export interface HostDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
}

export default function HostDashboardPage({ onNavigate }: HostDashboardPageProps) {
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
        <a className="host-action-btn primary" href="/submit-listing" onClick={event => onNavigate?.(event, '/submit-listing')}>
          Submit a listing for review <SiteIcon name="arrow-up-right" size={16} />
        </a>
      </div>

      <div className="host-dashboard-empty-state">
        <SiteIcon name="pause" size={34} />
        <h2>Venue, coach and trial listings are free</h2>
        <p>
          Venue, coach and sports-trial submissions do not require a paid listing plan. Academy operations memberships, venue bookings and provider services are separate from evidence verification.
        </p>
      </div>
    </section>
  )
}
