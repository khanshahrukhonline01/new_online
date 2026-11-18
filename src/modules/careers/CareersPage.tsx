import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './CareersPage.css'

interface CareersPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function CareersPage({ onNavigate }: CareersPageProps) {
  function handleLink(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (onNavigate) {
      onNavigate(event, target)
    }
  }

  return (
    <main className="careers-page" id="main-content">
      <header className="careers-hero">
        <p className="careers-eyebrow">CAREERS &amp; COMMUNITY · करियर एवं योगदान</p>
        <h1 className="careers-title">Build the Future of Indian Grassroots Sports</h1>
        <p className="careers-lead">
          Join KhelGrid’s mission to democratize athletic discovery, empower young athletes with digital credentials,
          and advance open sports science across 53 Indian cities. We are looking for passionate sports researchers, engineers,
          field scouts, and community advocates.
        </p>
        <div className="careers-values-strip">
          <div className="value-tag">Athletes First</div>
          <div className="value-tag">Radical Transparency</div>
          <div className="value-tag">Open Science (CC BY 4.0)</div>
          <div className="value-tag">Pan-India Inclusion</div>
        </div>
      </header>

      {/* Open Roles Section */}
      <section className="careers-section">
        <div className="section-header">
          <span className="section-badge">OPPORTUNITIES</span>
          <h2>Current Openings &amp; Contributor Roles</h2>
        </div>

        <div className="roles-list">
          {/* Role 1 */}
          <article className="role-card">
            <div className="role-header">
              <div>
                <h3>Grassroots Sports Scout &amp; Ground Reporter</h3>
                <span className="role-meta">Multiple Locations (Pan-India 53 Cities) · Part-time / Honorarium</span>
              </div>
              <a
                href="mailto:khelgrid@gmail.com?subject=Application%3A%20Grassroots%20Sports%20Scout"
                className="role-apply-btn"
              >
                Apply via Email <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
            <p className="role-desc">
              Be our eyes and ears on the ground. Attend district selection trials, state championships, and university combines.
              Verify trial circulars, document turf infrastructure, report match results, and assist young athletes in generating their Khel ID.
            </p>
            <div className="role-requirements">
              <strong>Ideal Background:</strong> Former competitive athletes, physical education students (B.P.Ed / M.P.Ed), or local sports journalists with deep roots in local sporting communities.
            </div>
          </article>

          {/* Role 2 */}
          <article className="role-card">
            <div className="role-header">
              <div>
                <h3>Sports Science Research Fellow &amp; Editorial Reviewer</h3>
                <span className="role-meta">KhelChronicle (SportRxiv India) · Remote (India)</span>
              </div>
              <a
                href="mailto:khelgrid@gmail.com?subject=Application%3A%20KhelChronicle%20Research%20Fellow"
                className="role-apply-btn"
              >
                Apply via Email <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
            <p className="role-desc">
              Review and curate preprints in sports biomechanics, exercise physiology, sports medicine, and athletic development.
              Help translate complex laboratory findings into actionable coaching insights for grassroots academies across India.
            </p>
            <div className="role-requirements">
              <strong>Ideal Background:</strong> Post-graduate or doctoral researchers in Sports Science, Biomechanics, Physiotherapy, or Exercise Physiology with an appreciation for Diamond Open Access and FAIR data.
            </div>
          </article>

          {/* Role 3 */}
          <article className="role-card">
            <div className="role-header">
              <div>
                <h3>Frontend Platform Engineer (React &amp; TypeScript)</h3>
                <span className="role-meta">Engineering · Remote (India) · Contract / Full-Time</span>
              </div>
              <a
                href="mailto:khelgrid@gmail.com?subject=Application%3A%20Frontend%20Platform%20Engineer"
                className="role-apply-btn"
              >
                Apply via Email <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
            <p className="role-desc">
              Architect and build lightning-fast, accessible user interfaces for sports directories, real-time score keeping,
              and interactive data visualizations. Optimize performance for low-bandwidth mobile networks in rural India.
            </p>
            <div className="role-requirements">
              <strong>Ideal Background:</strong> 2+ years of production experience in React, TypeScript, Vite, CSS performance, and progressive web application (PWA) standards.
            </div>
          </article>

          {/* Role 4 */}
          <article className="role-card">
            <div className="role-header">
              <div>
                <h3>Sports Venue &amp; Academy Verification Coordinator</h3>
                <span className="role-meta">Operations · Hybrid / Regional Clusters</span>
              </div>
              <a
                href="mailto:khelgrid@gmail.com?subject=Application%3A%20Venue%20Verification%20Coordinator"
                className="role-apply-btn"
              >
                Apply via Email <SiteIcon name="arrow-up-right" size={14} />
              </a>
            </div>
            <p className="role-desc">
              Execute our 4-tier verification protocol for sports facilities, box cricket turfs, and academies.
              Audit coaching licenses, coordinate facility audits, and interface directly with venue managers.
            </p>
            <div className="role-requirements">
              <strong>Ideal Background:</strong> Sports management graduates or sports facility operations professionals passionate about standards and athlete safety.
            </div>
          </article>
        </div>
      </section>

      {/* How to Apply Banner */}
      <section className="careers-section application-info-panel">
        <div className="section-header">
          <span className="section-badge">APPLICATION PROCESS</span>
          <h2>How to Apply</h2>
        </div>
        <p>
          We value genuine passion for Indian sports and demonstrated execution over pedigree. To apply for any role or propose a custom collaboration:
        </p>
        <ol className="apply-steps">
          <li>Send an email to <a href="mailto:khelgrid@gmail.com">khelgrid@gmail.com</a>.</li>
          <li>Use the subject line format: <code>Application: [Role Name] — [Your Name]</code>.</li>
          <li>Attach your CV or sporting resume, and include a brief note explaining which Indian sports region you are connected with and what drives you.</li>
          <li>For engineering or research roles, link your GitHub profile, portfolio, or published research papers.</li>
        </ol>
        <p>
          Our team acknowledges every applicant within 48 to 72 business hours.
        </p>
        <div className="careers-footer-cta">
          <a href="/about" onClick={e => handleLink(e, '/about')} className="primary-link">
            About KhelGrid <SiteIcon name="arrow-up-right" size={15} />
          </a>
          <a href="/trust" onClick={e => handleLink(e, '/trust')} className="primary-link secondary">
            Trust &amp; Ethics Center <SiteIcon name="shield-check" size={15} />
          </a>
        </div>
      </section>
    </main>
  )
}
