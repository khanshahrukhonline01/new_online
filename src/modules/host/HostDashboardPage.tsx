import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getRegisteredAcademies } from '../academies/academySaaSClient'
import './HostDashboardPage.css'

export interface HostDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
  authUser?: { id: string; fullName?: string; role: string } | null
  workspaceSection?: string
}

export default function HostDashboardPage({ onNavigate, workspaceSection }: HostDashboardPageProps) {
  const registeredAcademies = getRegisteredAcademies()
  const customAcademiesCount = registeredAcademies.filter(a => a.isCustom).length
  const showBookingsFocus = !workspaceSection || workspaceSection === 'overview' || workspaceSection === 'bookings'
  const showFacilitiesFocus = !workspaceSection || workspaceSection === 'overview' || workspaceSection === 'facilities'

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

      {/* Live Facility Operations Quick Bar */}
      <div className="host-kpi-grid">
        <div className="host-kpi-card">
          <div className="host-kpi-label">Active Sports Academies</div>
          <strong className="host-kpi-value is-emerald">{registeredAcademies.length}</strong>
          <small className="host-kpi-sub">{customAcademiesCount} custom registered</small>
        </div>
        <div className="host-kpi-card">
          <div className="host-kpi-label">Managed Pitches &amp; Courts</div>
          <strong className="host-kpi-value is-info">—</strong>
          <small className="host-kpi-sub">Connect your venue to view</small>
        </div>
        <div className="host-kpi-card">
          <div className="host-kpi-label">Zero-Commission Payouts</div>
          <strong className="host-kpi-value">0%</strong>
          <small className="host-kpi-sub is-emerald">Direct UPI bank settlement</small>
        </div>
      </div>

      {showFacilitiesFocus && (
        <>
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

          <div className="host-dashboard-empty-state host-card-accent-emerald">
            <SiteIcon name="shield-check" size={34} />
            <h2>Academy Admissions &amp; Batch Management SaaS</h2>
            <p>
              Managing a sports academy? Track inbound parent leads, publish morning &amp; evening batch schedules, issue verifiable trial entry passes, and automate monthly student fee collection via UPI — <strong>100% free during grassroots launch</strong> (₹3,499/mo value unlocked).
            </p>
            <div className="host-action-row">
              <a className="host-action-btn primary" href="/partner-signup?role=academy" onClick={event => onNavigate?.(event, '/partner-signup?role=academy')}>
                Setup Academy (2-Min Wizard) <SiteIcon name="sparkles" size={16} />
              </a>
              <a className="host-action-btn secondary" href="/workspace/academy/overview" onClick={event => onNavigate?.(event, '/workspace/academy/overview')}>
                Open Free Academy Admissions Hub <SiteIcon name="arrow-up-right" size={16} />
              </a>
            </div>
          </div>
        </>
      )}

      {showBookingsFocus && (
        <>
          <div className="host-dashboard-empty-state host-card-accent-info">
            <SiteIcon name="calendar" size={34} />
            <h2>Turf &amp; Facility Slot Booking Calendar</h2>
            <p>
              Operating a sports turf, court, or box cricket arena? Manage hourly slot inventory, lock maintenance hours, accept 0% commission UPI deposits, and dispatch instant WhatsApp booking vouchers to team captains.
            </p>
            <a className="host-action-btn primary" href="/workspace/turf/calendar" onClick={event => onNavigate?.(event, '/workspace/turf/calendar')}>
              Open Turf Slot Calendar (Free) <SiteIcon name="arrow-up-right" size={16} />
            </a>
          </div>

          <div className="host-dashboard-empty-state host-card-accent-warning">
            <SiteIcon name="shield-check" size={34} />
            <h2>Universal Gate Check-In &amp; Pass Verifier Desk</h2>
            <p>
              On-ground verification desk for facility operators and gate marshals. Instantly scan QR codes or verify trial passes (#PASS-XXXX), turf court booking vouchers (#TRF-XXXX), tournament squads (#KG-TOUR-XXXX), and federation credentials (#KG-VERIF-XXXX) to prevent unauthorized entry.
            </p>
            <a className="host-action-btn primary" href="/gate-checkin" onClick={event => onNavigate?.(event, '/gate-checkin')}>
              Open Gate Check-In Desk <SiteIcon name="arrow-up-right" size={16} />
            </a>
          </div>
        </>
      )}

      {showFacilitiesFocus && (
        <div className="host-dashboard-empty-state host-card-accent-purple">
          <SiteIcon name="sparkles" size={34} />
          <h2>Tournament &amp; Sports Organisation Suite</h2>
          <p>
            Organizing a cup, league, or school tournament? Generate automated knockout brackets, run anti-age-fraud squad verification, manage pitch-side live scoring connected to the `/live` feed, and issue tamper-proof digital certificates.
          </p>
          <a className="host-action-btn primary" href="/workspace/tournament/overview" onClick={event => onNavigate?.(event, '/workspace/tournament/overview')}>
            Open Tournament Operations Suite <SiteIcon name="arrow-up-right" size={16} />
          </a>
        </div>
      )}
    </section>
  )
}
