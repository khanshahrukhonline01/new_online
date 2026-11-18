import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './MobileAppPage.css'

interface MobileAppPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function MobileAppPage({ onNavigate }: MobileAppPageProps) {
  function handleLink(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (onNavigate) {
      onNavigate(event, target)
    }
  }

  return (
    <main className="mobile-app-page" id="main-content">
      <header className="mobile-app-hero">
        <p className="mobile-eyebrow">MOBILE ACCESS · मोबाइल ऐप</p>
        <h1 className="mobile-title">KhelGrid on Your Mobile Device</h1>
        <p className="mobile-lead">
          Experience ultra-fast, zero-install sports discovery on any smartphone. KhelGrid is engineered as a modern
          Progressive Web App (PWA), providing full offline access, instant notifications, and lightning-fast load times even on 2G/3G connections.
        </p>
        <div className="pwa-benefits-strip">
          <div className="benefit-item">
            <SiteIcon name="check-circle" size={18} />
            <span>Zero Play Store / App Store download required</span>
          </div>
          <div className="benefit-item">
            <SiteIcon name="check-circle" size={18} />
            <span>Under 1 MB data footprint — saves storage</span>
          </div>
          <div className="benefit-item">
            <SiteIcon name="check-circle" size={18} />
            <span>Works offline for saved trials and Sports CV</span>
          </div>
        </div>
      </header>

      {/* Installation Instructions */}
      <section className="mobile-section">
        <div className="section-header">
          <span className="section-badge">QUICK SETUP</span>
          <h2>How to Install KhelGrid on Your Phone in 10 Seconds</h2>
        </div>

        <div className="install-grid">
          <article className="install-card">
            <div className="install-platform-badge">Android (Chrome / Brave / Edge)</div>
            <h3>Installing on Android</h3>
            <ol className="install-steps">
              <li>Open <strong>khelgrid.com</strong> in Google Chrome on your Android phone.</li>
              <li>Tap the three vertical dots <strong>(⋮)</strong> in the top-right corner of Chrome.</li>
              <li>Select <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.</li>
              <li>Confirm by tapping <strong>Add</strong>. KhelGrid will now appear as an icon on your home screen with native app performance!</li>
            </ol>
          </article>

          <article className="install-card">
            <div className="install-platform-badge">iPhone &amp; iPad (Apple Safari)</div>
            <h3>Installing on iOS (iPhone / iPad)</h3>
            <ol className="install-steps">
              <li>Open <strong>khelgrid.com</strong> in Safari on your iPhone.</li>
              <li>Tap the <strong>Share</strong> button (the square with an arrow pointing upward at the bottom of the screen).</li>
              <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner. The KhelGrid icon is now ready on your iOS home screen!</li>
            </ol>
          </article>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="mobile-section">
        <div className="section-header">
          <span className="section-badge">FEATURES</span>
          <h2>Built Specifically for Indian Athletes on the Move</h2>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <h4>Low-Bandwidth Optimization</h4>
            <p>Optimized for rural and Tier-2/3 network environments. Directory searches load instantly with minimal data consumption.</p>
          </div>
          <div className="feature-box">
            <h4>Offline Sports CV Access</h4>
            <p>Your Khel ID and athletic credentials remain accessible even when attending trials at remote stadiums with zero mobile connectivity.</p>
          </div>
          <div className="feature-box">
            <h4>Direct Concierge Submissions</h4>
            <p>Turf managers and coaches can submit ground updates or new trials directly from mobile via email or one-tap WhatsApp integration.</p>
          </div>
          <div className="feature-box">
            <h4>Instant Trial Notifications</h4>
            <p>Receive timely alerts for upcoming trial registration cutoffs, combine schedules, and newly verified sporting grounds.</p>
          </div>
        </div>
      </section>

      {/* Native App Roadmap */}
      <section className="mobile-section native-roadmap-card">
        <div className="section-header">
          <span className="section-badge">ROADMAP</span>
          <h2>Upcoming Native Android (APK) &amp; iOS Apps</h2>
        </div>
        <p>
          Our engineering team is currently developing specialized native Android APK and iOS builds featuring offline GPS turf navigation,
          accelerometer-based sprint timing tools, and biometric video analysis for scouts.
        </p>
        <p>
          Want early beta access to the Android APK release? Send an email to{' '}
          <a href="mailto:khelgrid@gmail.com?subject=KhelGrid%20Mobile%20App%20Beta%20Inquiry">khelgrid@gmail.com</a> with the subject
          &ldquo;Android Beta Testing&rdquo;.
        </p>
        <div className="mobile-cta-row">
          <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="primary-link">
            Explore Trials <SiteIcon name="arrow-up-right" size={15} />
          </a>
          <a href="/sports-cv" onClick={e => handleLink(e, '/sports-cv')} className="primary-link secondary">
            Build Sports CV <SiteIcon name="arrow-up-right" size={15} />
          </a>
        </div>
      </section>
    </main>
  )
}
