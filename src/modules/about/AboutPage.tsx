import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './AboutPage.css'

interface AboutPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  function handleLink(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (onNavigate) {
      onNavigate(event, target)
    }
  }

  return (
    <main className="about-page" id="main-content">
      {/* Hero Section */}
      <header className="about-hero">
        <p className="about-eyebrow">ABOUT KHELGRID · खेलग्रिड परिचय</p>
        <h1 className="about-title">Democratizing Grassroots Sports &amp; Athletic Pathways Across India</h1>
        <p className="about-lead">
          KhelGrid is India’s open sports discovery, verified facility infrastructure, and athlete enablement network.
          We connect aspiring athletes, grassroots coaches, accredited academies, and tournament organizers across 53 Indian cities
          with authentic information, sports science research, and digital athletic credentials.
        </p>
        <div className="about-metrics-strip">
          <div className="metric-card">
            <span className="metric-number">53+</span>
            <span className="metric-label">Indian Sports Cities &amp; Hubs</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">34+</span>
            <span className="metric-label">Olympic &amp; Grassroots Disciplines</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">276+</span>
            <span className="metric-label">Verified Academies &amp; Complexes</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">100%</span>
            <span className="metric-label">Free Grassroots Discovery</span>
          </div>
        </div>
      </header>

      {/* Mission & Background */}
      <section className="about-section">
        <div className="section-header">
          <span className="section-badge">OUR MISSION</span>
          <h2>Solving India’s Grassroots Sports Information Deficit</h2>
        </div>
        <div className="section-prose">
          <p>
            India is home to hundreds of millions of enthusiastic young athletes, students, and sports enthusiasts. From the boxing clubs
            of Bhiwani and wrestling akhadas of Kolhapur to the badminton nurseries of Hyderabad and football grounds of Kolkata,
            sporting passion runs deep across every district and town.
          </p>
          <p>
            Yet, despite this immense talent pool, young athletes and their families face systemic informational hurdles:
          </p>
          <ul className="about-pain-points">
            <li>
              <strong>Unverified Selection Trials:</strong> Crucial trial notifications are frequently scattered across private social media groups,
              outdated federation gazettes, or exploited by fraudulent middlemen soliciting unauthorized &ldquo;registration fees.&rdquo;
            </li>
            <li>
              <strong>Fragmented Facility Discovery:</strong> Finding safe, high-quality sporting venues—such as FIFA-standard artificial turfs,
              BWF-compliant wooden badminton courts, synthetic athletic tracks, and Olympic swimming pools—often requires unguided trial and error.
            </li>
            <li>
              <strong>Opaque Coaching Credentials:</strong> Parents seeking authentic coaching struggle to distinguish between certified NIS,
              BCCI, AFC, or BWF accredited trainers and unverified commercial operators.
            </li>
            <li>
              <strong>No Permanent Athletic Digital Identity:</strong> Grassroots players lack a standardized, verifiable Sports CV (Khel ID) to
              record match performances, biometric benchmarks, and tournament honors for scouts and state selectors.
            </li>
            <li>
              <strong>Inaccessible Sports Science:</strong> Elite training methodologies, sports biomechanics, injury prevention, and nutrition
              knowledge remain locked behind expensive paywalls or inaccessible academic journals.
            </li>
          </ul>
          <p>
            <strong>KhelGrid was engineered to eliminate these bottlenecks.</strong> We believe sports information must be transparent,
            verified, accessible in regional Indian languages, and completely free for grassroots athletes and parents.
          </p>
        </div>
      </section>

      {/* The Five Pillars */}
      <section className="about-section about-pillars-section">
        <div className="section-header">
          <span className="section-badge">CORE ARCHITECTURE</span>
          <h2>The 5 Pillars of the KhelGrid Ecosystem</h2>
        </div>
        <div className="pillars-grid">
          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="award" size={24} />
            </div>
            <h3>1. Selection Trials &amp; Opportunity Verification</h3>
            <p>
              Our editorial desk monitors and verifies district, state, university, and national selection trials. Every trial listing
              includes mandatory official federation circulars, verified eligibility criteria, fee transparency (zero unauthorized fees),
              and organizer contact information.
            </p>
            <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="pillar-link">
              Explore Trials <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>

          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="map-pin" size={24} />
            </div>
            <h3>2. Sports Infrastructure &amp; Turf Grid</h3>
            <p>
              A comprehensive directory of multi-sport venues, box cricket turfs, indoor arenas, swimming complexes, and athletic tracks
              across 53 Indian cities. Facilities are mapped with verified surface specifications, floodlight quality, parking, and booking policies.
            </p>
            <a href="/venues" onClick={e => handleLink(e, '/venues')} className="pillar-link">
              Browse Venues <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>

          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="users" size={24} />
            </div>
            <h3>3. Accredited Academies &amp; Licensed Coaches</h3>
            <p>
              Bridging trainees with verified sports academies and certified coaches. We prioritize listings with documented credentials
              from the Netaji Subhas National Institute of Sports (NIS), All India Football Federation (AIFF), BCCI, and Badminton Association of India (BAI).
            </p>
            <a href="/academies" onClick={e => handleLink(e, '/academies')} className="pillar-link">
              Find Academies <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>

          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="file-text" size={24} />
            </div>
            <h3>4. Portable Digital Athlete CV &amp; Khel ID</h3>
            <p>
              A tamper-proof digital profile allowing athletes to document their physical metrics (sprint times, vertical jump, VO2 max),
              competition history, tournament certificates, and coach endorsements in a standardized, exportable format ready for trials and scouting.
            </p>
            <a href="/sports-cv" onClick={e => handleLink(e, '/sports-cv')} className="pillar-link">
              Build Sports CV <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>

          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="book-open" size={24} />
            </div>
            <h3>5. KhelChronicle (SportRxiv India)</h3>
            <p>
              Our Diamond Open Access preprint archive and research repository. Dedicated to advancing Indian sports science, biomechanics,
              exercise physiology, and sports medicine with zero author fees and zero reader paywalls under Creative Commons CC BY 4.0.
            </p>
            <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} className="pillar-link">
              Read Research <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>

          <article className="pillar-card">
            <div className="pillar-icon-box">
              <SiteIcon name="shield-check" size={24} />
            </div>
            <h3>Community Play &amp; Safeguarding</h3>
            <p>
              Promoting healthy active lifestyles through neighborhood pickup games, amateur leagues, and strict minor athlete safeguarding.
              We adhere strictly to India&rsquo;s Protection of Children from Sexual Offences (POCSO) Act and robust privacy standards.
            </p>
            <a href="/play" onClick={e => handleLink(e, '/play')} className="pillar-link">
              Find Games <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </article>
        </div>
      </section>

      {/* Editorial Standards & Integrity */}
      <section className="about-section">
        <div className="section-header">
          <span className="section-badge">TRUST &amp; ETHICS</span>
          <h2>Editorial Integrity, Verification &amp; Anti-Fraud Commitment</h2>
        </div>
        <div className="section-prose">
          <p>
            In sports, accuracy is non-negotiable. An incorrect trial date or false eligibility guideline can derail an athlete&rsquo;s entire season.
            KhelGrid operates under strict editorial and data verification principles:
          </p>
          <div className="ethics-cards">
            <div className="ethics-card">
              <h4>Direct Source Attribution</h4>
              <p>Every trial, tournament, and official circular references the primary sanctioning body, federation release, or certified organizer website.</p>
            </div>
            <div className="ethics-card">
              <h4>Zero Pay-to-Play Toleration</h4>
              <p>We do not promote unverified commercial trials charging extortionate entry fees without official federation recognition.</p>
            </div>
            <div className="ethics-card">
              <h4>Prompt Correction SLAs</h4>
              <p>Any verified error, venue schedule update, or stale listing reported by our community is audited and updated within 24 to 48 hours.</p>
            </div>
            <div className="ethics-card">
              <h4>Non-Commercial Neutrality</h4>
              <p>Venues, academies, and trials are indexed based on merit, geographical relevance, and facility quality—never on unverified sponsored bias.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multilingual Commitment */}
      <section className="about-section">
        <div className="section-header">
          <span className="section-badge">ACCESSIBILITY</span>
          <h2>A Truly Multilingual Indian Sports Network</h2>
        </div>
        <div className="section-prose">
          <p>
            Sports in India is practiced in every language. A young kabaddi raider in Haryana, a footballer in Malappuram, or a sprinter in
            Ranchi must be able to discover opportunities in their mother tongue. KhelGrid is engineered with deep multilingual support,
            offering comprehensive localization across Hindi (हिन्दी), Marathi (मराठी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা),
            Punjabi (ਪੰਜਾਬੀ), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), and Odia (ଓଡ଼ିଆ).
          </p>
        </div>
      </section>

      {/* Team & Publisher Information */}
      <section className="about-section about-contact-callout">
        <div className="section-header">
          <span className="section-badge">GOVERNANCE &amp; CONTACT</span>
          <h2>Operating Information &amp; Publisher Identity</h2>
        </div>
        <div className="section-prose">
          <p>
            KhelGrid is operated by an independent team of sports researchers, sports engineers, and former collegiate athletes based in India.
            We are dedicated to building public digital infrastructure for Indian sports.
          </p>
          <div className="contact-details-grid">
            <div className="contact-item">
              <strong>Official Community &amp; Support Email:</strong>
              <p><a href="mailto:khelgrid@gmail.com">khelgrid@gmail.com</a></p>
            </div>
            <div className="contact-item">
              <strong>Intellectual Property &amp; Legal Desk:</strong>
              <p><a href="mailto:ipr@khelgrid.com">ipr@khelgrid.com</a></p>
            </div>
            <div className="contact-item">
              <strong>Direct Concierge Listing Intake:</strong>
              <p><a href="/submit-listing/email" onClick={e => handleLink(e, '/submit-listing/email')}>Instant Listing Generator</a></p>
            </div>
            <div className="contact-item">
              <strong>Operating Headquarters:</strong>
              <p>India (Pan-India Coverage across 53 Sports Cities)</p>
            </div>
          </div>
          <div className="about-cta-strip">
            <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="primary-link">
              Explore Trials <SiteIcon name="arrow-up-right" size={15} />
            </a>
            <a href="/venues" onClick={e => handleLink(e, '/venues')} className="primary-link secondary">
              Find Venues <SiteIcon name="arrow-up-right" size={15} />
            </a>
            <a href="/trust" onClick={e => handleLink(e, '/trust')} className="primary-link secondary">
              Trust &amp; Safety Center <SiteIcon name="shield-check" size={15} />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
