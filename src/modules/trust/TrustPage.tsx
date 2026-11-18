import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './TrustPage.css'

interface TrustPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function TrustPage({ onNavigate }: TrustPageProps) {
  function handleLink(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (onNavigate) {
      onNavigate(event, target)
    }
  }

  return (
    <main className="trust-page" id="main-content">
      {/* Hero Section */}
      <header className="trust-hero">
        <p className="trust-eyebrow">TRUST, SAFETY &amp; SAFEGUARDING · विश्वास एवं सुरक्षा</p>
        <h1 className="trust-title">KhelGrid Trust &amp; Athlete Safeguarding Center</h1>
        <p className="trust-lead">
          Integrity is the bedrock of sports. At KhelGrid, we enforce uncompromising standards to protect grassroots athletes,
          combat selection trial scams, verify sports infrastructure, and safeguard minor participants across India.
        </p>
        <div className="trust-summary-banner">
          <div className="banner-icon-box">
            <SiteIcon name="shield-check" size={28} />
          </div>
          <div className="banner-text">
            <strong>The KhelGrid Trust Guarantee:</strong>
            <p>
              Zero unauthorized trial fees. Strict POCSO compliance for minor athletes. Transparent source attribution for every listing.
              Direct grievance redressal within 24 to 48 business hours at <a href="mailto:khelgrid@gmail.com">khelgrid@gmail.com</a>.
            </p>
          </div>
        </div>
      </header>

      {/* 5 Core Trust Protocols */}
      <section className="trust-section">
        <div className="trust-section-header">
          <span className="trust-badge">STANDARDS &amp; AUDITS</span>
          <h2>Our 5-Pillar Trust Framework</h2>
        </div>

        <div className="trust-cards-grid">
          {/* Card 1 */}
          <article className="trust-card">
            <div className="trust-card-header">
              <div className="trust-card-icon">
                <SiteIcon name="award" size={22} />
              </div>
              <h3>1. Anti-Fraud Selection Trial Verification</h3>
            </div>
            <div className="trust-card-body">
              <p>
                Selection trials are life-changing opportunities for young athletes. Unfortunately, fraudulent operators frequently
                exploit young hopefuls by advertising unauthorized &ldquo;state team trials&rdquo; and demanding non-refundable cash registration fees.
              </p>
              <h4>Our Anti-Fraud Protocol:</h4>
              <ul>
                <li><strong>Federation Gazette Audit:</strong> Every trial is checked against official notifications published by recognised National Sports Federations (NSFs), the Sports Authority of India (SAI), AIFF, BCCI, BAI, or State Olympic Associations.</li>
                <li><strong>Zero Unauthorized Cash Collections:</strong> We immediately flag and remove any organizer attempting to solicit off-platform registration fees under false pretenses of guaranteed selection.</li>
                <li><strong>Organizer Accountability:</strong> All listed trial coordinators must provide verifiable institutional contact details, sanctioned venue permits, and clear eligibility age-brackets.</li>
              </ul>
            </div>
          </article>

          {/* Card 2 */}
          <article className="trust-card">
            <div className="trust-card-header">
              <div className="trust-card-icon">
                <SiteIcon name="check-circle" size={22} />
              </div>
              <h3>2. Minor Athlete Safeguarding &amp; POCSO Compliance</h3>
            </div>
            <div className="trust-card-body">
              <p>
                A significant portion of India’s aspiring sporting community comprises youth and adolescent athletes under the age of 18.
                Their safety and dignity are our highest priority.
              </p>
              <h4>Safeguarding Mandates:</h4>
              <ul>
                <li><strong>POCSO Act 2012 Strict Alignment:</strong> Complete adherence to India&rsquo;s Protection of Children from Sexual Offences (POCSO) Act and National Commission for Protection of Child Rights (NCPCR) guidelines.</li>
                <li><strong>Parental Consent:</strong> Athlete profiles and Sports CV records for minors under 18 require parental or legal guardian authorization.</li>
                <li><strong>Privacy Shield:</strong> We strictly prohibit publishing minors&rsquo; private phone numbers, home addresses, or school identification numbers on public pages.</li>
                <li><strong>POSH Enforcement:</strong> Zero tolerance for sexual harassment, bullying, hazing, verbal abuse, or predatory conduct by coaches or venue operators.</li>
              </ul>
            </div>
          </article>

          {/* Card 3 */}
          <article className="trust-card">
            <div className="trust-card-header">
              <div className="trust-card-icon">
                <SiteIcon name="map-pin" size={22} />
              </div>
              <h3>3. Venue &amp; Turf Verification Standard</h3>
            </div>
            <div className="trust-card-body">
              <p>
                Playing sports on poorly maintained or substandard surfaces increases catastrophic injury risks (ACL tears, concussions, ankle sprains).
                KhelGrid applies a 4-tier verification protocol before tagging a venue as &ldquo;Verified&rdquo;:
              </p>
              <h4>Verification Protocol:</h4>
              <ul>
                <li><strong>Geotagged Field Audit:</strong> Satellite and on-ground GPS confirmation of the sports facility address and perimeter.</li>
                <li><strong>Surface Quality &amp; Lighting:</strong> Documented inspection of turf pile height, infill quality, court wooden spring-suspension, or floodlight lux levels.</li>
                <li><strong>Safety Amenities:</strong> Verification of essential emergency first-aid kits, clean drinking water, secure changing rooms, and emergency vehicle access.</li>
                <li><strong>Transparent Pricing:</strong> Elimination of hidden fees; verified venue partners must honor disclosed slot tariffs.</li>
              </ul>
            </div>
          </article>

          {/* Card 4 */}
          <article className="trust-card">
            <div className="trust-card-header">
              <div className="trust-card-icon">
                <SiteIcon name="file-text" size={22} />
              </div>
              <h3>4. Coach &amp; Academy Credential Integrity</h3>
            </div>
            <div className="trust-card-body">
              <p>
                Coaching dictates athletic longevity. KhelGrid verifies training qualifications to safeguard athletes from unqualified instruction:
              </p>
              <h4>Credential Auditing:</h4>
              <ul>
                <li><strong>Recognised Certifications:</strong> We prioritize coaches holding formal accreditation from the Netaji Subhas National Institute of Sports (NIS), AIFF (D/C/B/A Licenses), BCCI (Levels 1–3), BWF, or World Athletics.</li>
                <li><strong>Authentic Training History:</strong> Background verification of competitive playing records and coaching experience.</li>
                <li><strong>Code of Conduct Compliance:</strong> All listed coaches agree to uphold ethical sportsmanship, fair training loads, and athlete wellbeing.</li>
              </ul>
            </div>
          </article>

          {/* Card 5 */}
          <article className="trust-card">
            <div className="trust-card-header">
              <div className="trust-card-icon">
                <SiteIcon name="book-open" size={22} />
              </div>
              <h3>5. Scientific Research Ethics (KhelChronicle)</h3>
            </div>
            <div className="trust-card-body">
              <p>
                KhelChronicle operates as India’s premier open sports science repository under Diamond Open Access (zero author fees, zero reader paywalls):
              </p>
              <h4>Research Integrity Standards:</h4>
              <ul>
                <li><strong>Declaration of Helsinki &amp; ICMR Compliance:</strong> All biomechanical, physiological, or medical studies involving human athletes must document Institutional Ethics Committee (IEC/IRB) approval.</li>
                <li><strong>FAIR Data Principles:</strong> Authors must provide open de-identified primary data, force-plate measurements, and kinematic code repositories.</li>
                <li><strong>COPE Standards:</strong> Full compliance with the Committee on Publication Ethics for post-publication academic peer review and transparent corrections.</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* Grievance Redressal & Response SLA */}
      <section className="trust-section trust-grievance-section">
        <div className="trust-section-header">
          <span className="trust-badge">GRIEVANCE REDRESSAL</span>
          <h2>Reporting a Concern, Fraud or Data Inaccuracy</h2>
        </div>
        <div className="trust-prose">
          <p>
            If you encounter an inaccurate trial date, suspect fraudulent activity, or experience any safeguarding concern at a listed venue or academy,
            please notify our trust desk immediately.
          </p>

          <div className="sla-grid">
            <div className="sla-card">
              <span className="sla-time">Within 24 Hours</span>
              <h4>Initial Acknowledgment</h4>
              <p>Our safety and editorial desk logs your report and initiates a primary source review.</p>
            </div>
            <div className="sla-card">
              <span className="sla-time">Within 48 Hours</span>
              <h4>Investigation &amp; Audit</h4>
              <p>We contact the organizer, venue, or author to corroborate evidence or official documents.</p>
            </div>
            <div className="sla-card">
              <span className="sla-time">Within 72 Hours</span>
              <h4>Action &amp; Public Notice</h4>
              <p>Resolution implemented: correction published, listing updated, or fraudulent entity delisted and reported.</p>
            </div>
          </div>

          <div className="trust-contact-box">
            <h3>Contact Our Trust &amp; Safety Officers</h3>
            <p>
              Direct Email: <a href="mailto:khelgrid@gmail.com?subject=Trust%20and%20Safety%20Inquiry">khelgrid@gmail.com</a>
            </p>
            <p>
              Intellectual Property &amp; Copyright: <a href="mailto:ipr@khelgrid.com?subject=IPR%20Inquiry">ipr@khelgrid.com</a>
            </p>
            <p>
              Workplace &amp; POSH Grievances: <a href="mailto:workplace@khelgrid.com?subject=POSH%20Inquiry">workplace@khelgrid.com</a>
            </p>
            <div className="trust-quick-actions">
              <a href="/help-feedback" onClick={e => handleLink(e, '/help-feedback')} className="primary-link">
                Open Support Desk <SiteIcon name="message-circle" size={15} />
              </a>
              <a href="/privacy" onClick={e => handleLink(e, '/privacy')} className="primary-link secondary">
                Privacy Policy <SiteIcon name="arrow-up-right" size={15} />
              </a>
              <a href="/editorial-policy" onClick={e => handleLink(e, '/editorial-policy')} className="primary-link secondary">
                Editorial Policy <SiteIcon name="arrow-up-right" size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
