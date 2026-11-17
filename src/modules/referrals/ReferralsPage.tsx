import { useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './ReferralsPage.css'

interface ReferralsPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function ReferralsPage({ onNavigate }: ReferralsPageProps) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = 'https://khelgrid.com'
  const shareMessage = 'Discover verified sports selection trials, book turfs & courts, find NIS coaches, and create your Athlete Sports CV on KhelGrid (खेलग्रिड): https://khelgrid.com'

  function handleLink(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (onNavigate) {
      onNavigate(event, target)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer')
  }

  function handleTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent('Join India’s grassroots sports network on KhelGrid')}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="referrals-page" id="main-content">
      <header className="referrals-hero">
        <p className="referrals-eyebrow">GRASSROOTS COMMUNITY · समुदाय विस्तार</p>
        <h1 className="referrals-title">Invite Your Teammates, Academy &amp; Coaches</h1>
        <p className="referrals-lead">
          Sports grows when athletes support athletes. Share KhelGrid with your club teammates, school coach, or local turf coordinator.
          Help grassroots players discover verified selection trials without paying unauthorized middleman fees.
        </p>

        {/* Share Box */}
        <div className="invite-share-card">
          <label htmlFor="invite-link-input" className="share-label">Your Shareable KhelGrid Link:</label>
          <div className="share-input-row">
            <input
              id="invite-link-input"
              type="text"
              readOnly
              value={inviteUrl}
              className="share-input"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="copy-link-btn"
            >
              <SiteIcon name={copied ? 'check-circle' : 'copy'} size={16} />
              <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="share-buttons-row">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="social-share-btn whatsapp-btn"
            >
              <span>Share on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleTelegram}
              className="social-share-btn telegram-btn"
            >
              <span>Share on Telegram</span>
            </button>
          </div>
        </div>
      </header>

      {/* Why Share Section */}
      <section className="referrals-section">
        <div className="section-header">
          <span className="section-badge">IMPACT</span>
          <h2>Why Share KhelGrid With Your Sports Network?</h2>
        </div>

        <div className="impact-grid">
          <article className="impact-card">
            <div className="impact-icon-box">
              <SiteIcon name="award" size={22} />
            </div>
            <h3>Protect Teammates from Trial Scams</h3>
            <p>
              Thousands of young athletes lose hard-earned family savings to fake selection trial scams each year.
              Sharing KhelGrid gives your peers access to our 100% verified, source-checked opportunity circulars.
            </p>
          </article>

          <article className="impact-card">
            <div className="impact-icon-box">
              <SiteIcon name="file-text" size={22} />
            </div>
            <h3>Equip Your Squad with a Sports CV</h3>
            <p>
              Help your teammates build a standardized, printable digital athletic resume documenting their verified tournament records,
              sprint benchmarks, and coach endorsements.
            </p>
          </article>

          <article className="impact-card">
            <div className="impact-icon-box">
              <SiteIcon name="map-pin" size={22} />
            </div>
            <h3>Discover Better Sports Turfs &amp; Courts</h3>
            <p>
              Help your local sports teams find floodlit football turfs, synthetic badminton courts, and box cricket arenas
              with verified surface specifications across 53 Indian cities.
            </p>
          </article>

          <article className="impact-card">
            <div className="impact-icon-box">
              <SiteIcon name="book-open" size={22} />
            </div>
            <h3>Open Access Sports Science</h3>
            <p>
              Introduce coaches and training partners to KhelChronicle (SportRxiv India) for high-impact research in sports biomechanics,
              injury prevention, and exercise physiology.
            </p>
          </article>
        </div>
      </section>

      {/* Community Ambassador Recognition */}
      <section className="referrals-section ambassador-panel">
        <div className="section-header">
          <span className="section-badge">AMBASSADOR PROGRAM</span>
          <h2>Become a KhelGrid Campus or Academy Ambassador</h2>
        </div>
        <p>
          Are you a university sports captain, sports academy coach, or district sports coordinator?
          Join our verified Grassroots Ambassador Circle. Help onboard unverified sporting grounds, organize local pickup games,
          and receive official KhelGrid recognition badges.
        </p>
        <p>
          To apply for the Ambassador Program, send an email to{' '}
          <a href="mailto:khelgrid@gmail.com?subject=Ambassador%20Program%20Application">khelgrid@gmail.com</a> with details about your
          sporting community or institution.
        </p>
        <div className="ambassador-cta-row">
          <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="primary-link">
            Explore Trials <SiteIcon name="arrow-up-right" size={15} />
          </a>
          <a href="/submit-listing" onClick={e => handleLink(e, '/submit-listing')} className="primary-link secondary">
            Submit a Listing <SiteIcon name="arrow-up-right" size={15} />
          </a>
        </div>
      </section>
    </main>
  )
}
