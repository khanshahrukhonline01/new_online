import { useMemo, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './HelpFeedbackPage.css'

const helpTopics = [
  {
    title: 'Find sports trials and opportunities',
    category: 'Discover',
    answer: 'Open Trials & Opportunities to explore published entries. Read each listing carefully and confirm dates, eligibility, fees and application steps with the organiser before making plans.',
    href: '/opportunities',
    linkLabel: 'Explore opportunities',
  },
  {
    title: 'Find a sports venue or turf',
    category: 'Discover',
    answer: 'Use the Sports Venues directory to discover venue information across 53 Indian cities. Filter by sport, surface, amenities, and floodlighting to locate the ideal ground.',
    href: '/venues',
    linkLabel: 'Browse venues',
  },
  {
    title: 'Find coaches and sports academies',
    category: 'Discover',
    answer: 'Browse the Coaches Directory and Sports Academies sections. Verify qualifications (NIS, AIFF, BCCI, BWF), training batches, age groups, and contact details directly.',
    href: '/academies',
    linkLabel: 'Explore academies',
  },
  {
    title: 'Submit a listing to KhelGrid',
    category: 'Listings',
    answer: 'Use our online listing submission form or direct email concierge (khelgrid@gmail.com) to suggest a sports opportunity, venue, academy, or coach listing for free verification.',
    href: '/submit-listing',
    linkLabel: 'Suggest a listing',
  },
  {
    title: 'Understand listing verification & trust',
    category: 'Trust & safety',
    answer: 'Learn how KhelGrid audits trial circulars, enforces zero-tolerance for fraudulent fees, and protects minor athletes under our comprehensive Trust and POCSO framework.',
    href: '/trust',
    linkLabel: 'Visit Trust Center',
  },
  {
    title: 'Create an Athlete Sports CV (Khel ID)',
    category: 'Athlete tools',
    answer: 'The Sports CV tool helps athletes build a structured, printable athletic profile documenting physical metrics, tournament achievements, and coach endorsements.',
    href: '/sports-cv',
    linkLabel: 'Open Sports CV',
  },
  {
    title: 'KhelChronicle research preprints',
    category: 'Sports Science',
    answer: 'Access Diamond Open Access sports biomechanics, exercise physiology, and sports medicine research papers under Creative Commons CC BY 4.0.',
    href: '/khelchronicle',
    linkLabel: 'Browse KhelChronicle',
  },
]

const feedbackTypes = [
  'General inquiry',
  'Listing correction or update',
  'Suggest a new sports venue / academy',
  'Report fraudulent selection trial',
  'Report a technical problem',
  'Report a safety concern',
  'Trust, safety or POCSO concern',
  'Partnership or media inquiry',
]

const helpCards = [
  { title: 'Getting started', description: 'Learn how to explore sports opportunities and directories.', icon: 'book-open' as const, target: '#help-articles' },
  { title: 'Contact team', description: 'Direct contact info, operating hours, and response SLAs.', icon: 'mail' as const, target: '#contact-khelgrid' },
  { title: 'Report problem', description: 'Tell us about incorrect information or a technical issue.', icon: 'flag' as const, target: '#send-feedback' },
  { title: 'Trust & Safety', description: 'Review our anti-fraud policy and safeguarding standards.', icon: 'shield-check' as const, target: '/trust' },
]

export default function HelpFeedbackPage() {
  const [query, setQuery] = useState('')
  const [feedbackType, setFeedbackType] = useState(feedbackTypes[0])
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState('')
  const [email, setEmail] = useState('')

  const filteredTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return helpTopics
    return helpTopics.filter(topic =>
      [topic.title, topic.category, topic.answer].some(value =>
        value.toLowerCase().includes(normalized),
      ),
    )
  }, [query])

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = `KhelGrid Inquiry — ${feedbackType}`
    const body = [
      `Inquiry Type: ${feedbackType}`,
      email.trim() ? `Sender Email: ${email.trim()}` : '',
      reference.trim() ? `Page / Listing Reference: ${reference.trim()}` : '',
      '',
      'Message:',
      message.trim(),
    ]
      .filter(Boolean)
      .join('\n')
    window.location.href = `mailto:khelgrid@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="help-feedback-page" id="main-content">
      <section className="help-hero" aria-labelledby="help-page-title">
        <p className="help-eyebrow">KHELGRID CONTACT &amp; SUPPORT · संपर्क एवं सहायता</p>
        <h1 id="help-page-title">How can we help?</h1>
        <p>
          Find answers across our help library, submit listing corrections, or connect directly with our sports coordination team in India.
        </p>
        <label className="help-search">
          <SiteIcon name="search" size={19} />
          <span className="sr-only">Search help articles and FAQs</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search help articles and FAQs..."
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear help search">
              <SiteIcon name="close" size={16} />
            </button>
          )}
        </label>
      </section>

      <section className="help-card-grid" aria-label="Help options">
        {helpCards.map(card => (
          <a className="help-option-card" href={card.target} key={card.title}>
            <span className="help-option-icon">
              <SiteIcon name={card.icon} size={21} />
            </span>
            <span className="help-option-copy">
              <strong>{card.title}</strong>
              <small>{card.description}</small>
            </span>
            <SiteIcon name="arrow-up-right" size={16} />
          </a>
        ))}
      </section>

      {/* Direct Publisher Contact & Directory Information */}
      <section className="help-contact-strip" id="contact-khelgrid">
        <div style={{ maxWidth: '650px' }}>
          <p className="help-eyebrow">OFFICIAL PUBLISHER IDENTITY &amp; CONTACT</p>
          <h2>KhelGrid Operational Support Desk</h2>
          <p style={{ margin: '0.5rem 0 1rem', color: 'var(--color-text-muted, #475569)' }}>
            We are dedicated to maintaining an open, responsive channel for athletes, coaches, parents, and sports facility managers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)' }}>PRIMARY EMAIL</strong>
              <a href="mailto:khelgrid@gmail.com" style={{ color: 'var(--color-primary, #059669)', fontWeight: 600 }}>khelgrid@gmail.com</a>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)' }}>IPR &amp; LEGAL DESK</strong>
              <a href="mailto:ipr@khelgrid.com" style={{ color: 'var(--color-primary, #059669)', fontWeight: 600 }}>ipr@khelgrid.com</a>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)' }}>RESPONSE SLA</strong>
              <span>Within 24 to 48 Business Hours</span>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)' }}>OPERATING HEADQUARTERS</strong>
              <span>India (Serving 53+ Sports Clusters)</span>
            </div>
          </div>
        </div>
        <a href="mailto:khelgrid@gmail.com?subject=KhelGrid%20Direct%20Inquiry" className="primary-link" style={{ alignSelf: 'center' }}>
          <SiteIcon name="mail" size={17} /> Email Us Directly
        </a>
      </section>

      <section className="help-articles" id="help-articles" aria-labelledby="help-articles-title">
        <div className="help-section-heading">
          <div>
            <p className="help-eyebrow">HELP CENTRE &amp; KNOWLEDGE BASE</p>
            <h2 id="help-articles-title">Popular questions</h2>
          </div>
          <span>
            {filteredTopics.length} {filteredTopics.length === 1 ? 'article' : 'articles'}
          </span>
        </div>
        {filteredTopics.length ? (
          <div className="help-topic-list">
            {filteredTopics.map(topic => (
              <article className="help-topic" key={topic.title}>
                <div>
                  <span className="help-topic-category">{topic.category}</span>
                  <h3>{topic.title}</h3>
                  <p>{topic.answer}</p>
                  <a href={topic.href}>
                    {topic.linkLabel} <SiteIcon name="arrow-up-right" size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="help-empty-state">
            <SiteIcon name="search" size={22} />
            <strong>No matching help articles</strong>
            <p>Try another search, or send your question directly to the KhelGrid team.</p>
          </div>
        )}
      </section>

      <section className="help-feedback-panel" id="send-feedback" aria-labelledby="feedback-title">
        <div className="help-feedback-intro">
          <p className="help-eyebrow">DIRECT INQUIRY &amp; CORRECTIONS</p>
          <h2 id="feedback-title">Share feedback or report a problem</h2>
          <p>
            Choose a subject and provide details. When you click &ldquo;Continue by email&rdquo;, your default email app will open prefilled
            addressed directly to <a href="mailto:khelgrid@gmail.com">khelgrid@gmail.com</a>.
          </p>
          <ul>
            <li>Listing corrections and date adjustments</li>
            <li>Suggesting a new turf, academy, or coach</li>
            <li>Reporting fraudulent or pay-to-play trial scams</li>
            <li>Technical assistance and platform feedback</li>
          </ul>
        </div>
        <form className="help-feedback-form" onSubmit={submitFeedback}>
          <label>
            What is your inquiry about?
            <select value={feedbackType} onChange={event => setFeedbackType(event.target.value)}>
              {feedbackTypes.map(type => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Message <span aria-hidden="true">*</span>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              required
              minLength={10}
              rows={5}
              placeholder="Please describe your question, feedback, or listing correction in detail..."
            />
          </label>
          <label>
            Page or listing link (optional)
            <input
              value={reference}
              onChange={event => setReference(event.target.value)}
              placeholder="Paste the relevant KhelGrid URL (e.g., https://khelgrid.com/opportunities/...)"
            />
          </label>
          <label>
            Your email address (optional)
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Where we can send our response"
            />
          </label>
          <button type="submit" disabled={message.trim().length < 10}>
            <SiteIcon name="mail" size={16} /> Continue by email
          </button>
          <small>
            No message is submitted to a KhelGrid server. Your default email application opens so you can review and send it directly to khelgrid@gmail.com.
          </small>
        </form>
      </section>
    </div>
  )
}
