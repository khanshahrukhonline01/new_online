import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getRegisteredAcademies } from '../academies/academySaaSClient'
import { DEFAULT_TURF_COURTS } from '../venues/turfSlotManager'
import './HostDashboardPage.css'

export interface HostDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
}

export default function HostDashboardPage({ onNavigate }: HostDashboardPageProps) {
  const registeredAcademies = getRegisteredAcademies()
  const customAcademiesCount = registeredAcademies.filter(a => a.isCustom).length
  const totalTurfCourts = DEFAULT_TURF_COURTS.length

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Active Sports Academies</div>
          <strong style={{ fontSize: '1.5rem', color: '#059669' }}>{registeredAcademies.length}</strong>
          <small style={{ display: 'block', color: '#64748b', fontSize: '0.78rem' }}>{customAcademiesCount} custom registered</small>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Managed Pitches &amp; Courts</div>
          <strong style={{ fontSize: '1.5rem', color: '#2563eb' }}>{totalTurfCourts}</strong>
          <small style={{ display: 'block', color: '#64748b', fontSize: '0.78rem' }}>Hourly slot tracking live</small>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Zero-Commission Payouts</div>
          <strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>0%</strong>
          <small style={{ display: 'block', color: '#059669', fontSize: '0.78rem' }}>Direct UPI bank settlement</small>
        </div>
      </div>

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

      <div className="host-dashboard-empty-state" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)' }}>
        <SiteIcon name="shield-check" size={34} />
        <h2>Academy Admissions &amp; Batch Management SaaS</h2>
        <p>
          Managing a sports academy? Track inbound parent leads, publish morning &amp; evening batch schedules, issue verifiable trial entry passes, and automate monthly student fee collection via UPI — <strong>100% free during grassroots launch</strong> (₹3,499/mo value unlocked).
        </p>
        <a className="host-action-btn primary" href="/academy-hub" onClick={event => onNavigate?.(event, '/academy-hub')}>
          Open Free Academy Admissions Hub <SiteIcon name="arrow-up-right" size={16} />
        </a>
      </div>

      <div className="host-dashboard-empty-state" style={{ borderColor: 'rgba(59, 130, 246, 0.4)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent)' }}>
        <SiteIcon name="calendar" size={34} />
        <h2>Turf &amp; Facility Slot Booking Calendar</h2>
        <p>
          Operating a sports turf, court, or box cricket arena? Manage hourly slot inventory, lock maintenance hours, accept 0% commission UPI deposits, and dispatch instant WhatsApp booking vouchers to team captains.
        </p>
        <a className="host-action-btn primary" href="/turf-calendar" onClick={event => onNavigate?.(event, '/turf-calendar')}>
          Open Turf Slot Calendar (Free) <SiteIcon name="arrow-up-right" size={16} />
        </a>
      </div>

      <div className="host-dashboard-empty-state" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)' }}>
        <SiteIcon name="shield-check" size={34} />
        <h2>Universal Gate Check-In &amp; Pass Verifier Desk</h2>
        <p>
          On-ground verification desk for facility operators and gate marshals. Instantly scan QR codes or verify trial passes (#PASS-XXXX), turf court booking vouchers (#TRF-XXXX), tournament squads (#KG-TOUR-XXXX), and federation credentials (#KG-VERIF-XXXX) to prevent unauthorized entry.
        </p>
        <a className="host-action-btn primary" href="/gate-checkin" onClick={event => onNavigate?.(event, '/gate-checkin')}>
          Open Gate Check-In Desk <SiteIcon name="arrow-up-right" size={16} />
        </a>
      </div>
    </section>
  )
}
