import { useMemo, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './HelpFeedbackPage.css'

const helpTopics = [
  { title: 'Find sports trials and opportunities', category: 'Discover', answer: 'Open Trials & Opportunities to explore published entries. Read each listing carefully and confirm dates, eligibility, fees and application steps with the organiser before making plans.', href: '/opportunities', linkLabel: 'Explore opportunities' },
  { title: 'Find a sports venue', category: 'Discover', answer: 'Use the Sports Venues directory to discover venue information. KhelGrid is not currently a booking or payment service, so contact the venue directly to confirm availability, pricing and booking terms.', href: '/venues', linkLabel: 'Browse venues' },
  { title: 'Find coaches and academies', category: 'Discover', answer: 'Browse the Coaches Directory and Sports Academies sections. Verify qualifications, current programmes, fees and contact details directly with the provider before enrolling.', href: '/coaches', linkLabel: 'Explore coaches' },
  { title: 'Submit a listing to KhelGrid', category: 'Listings', answer: 'Use the listing submission route to suggest a sports opportunity, venue or other listing. Submissions may require review and are not guaranteed to be published.', href: '/submit-listing', linkLabel: 'Suggest a listing' },
  { title: 'Understand listing information', category: 'Trust & safety', answer: 'Information can change. Check the source and contact the organiser or provider directly. Do not treat a listing as independently verified unless its page clearly says so.', href: '/trust', linkLabel: 'Visit Trust Center' },
  { title: 'Create a Sports CV', category: 'Athlete tools', answer: 'The Sports CV tool helps you prepare an athlete profile document. Review the information you enter before exporting or sharing your CV.', href: '/sports-cv', linkLabel: 'Open Sports CV' },
]

const feedbackTypes = ['General feedback', 'Suggestion', 'Feature request', 'Complaint', 'Report incorrect listing', 'Report a technical problem', 'Report a safety concern']

const helpCards = [
  { title: 'Getting started', description: 'Learn how to explore sports opportunities and directories.', icon: 'book-open' as const, target: '#help-articles' },
  { title: 'Share feedback', description: 'Suggest improvements or request a feature.', icon: 'message-circle' as const, target: '#send-feedback' },
  { title: 'Report a problem', description: 'Tell us about incorrect information or a technical issue.', icon: 'flag' as const, target: '#send-feedback' },
  { title: 'Contact KhelGrid', description: 'Send a message to the KhelGrid team by email.', icon: 'mail' as const, target: '#contact-khelgrid' },
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
    return helpTopics.filter(topic => [topic.title, topic.category, topic.answer].some(value => value.toLowerCase().includes(normalized)))
  }, [query])

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = `KhelGrid — ${feedbackType}`
    const body = [
      `Feedback type: ${feedbackType}`,
      email.trim() ? `Reply email: ${email.trim()}` : '',
      reference.trim() ? `Page or listing reference: ${reference.trim()}` : '',
      '',
      message.trim(),
    ].filter(Boolean).join('\n')
    window.location.href = `mailto:khelgrid@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="help-feedback-page">
      <section className="help-hero" aria-labelledby="help-page-title">
        <p className="help-eyebrow">KHELGRID SUPPORT</p>
        <h1 id="help-page-title">How can we help?</h1>
        <p>Find answers, share feedback or contact the KhelGrid team.</p>
        <label className="help-search">
          <SiteIcon name="search" size={19} />
          <span className="sr-only">Search help articles and FAQs</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search help articles and FAQs..." />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear help search"><SiteIcon name="close" size={16} /></button>}
        </label>
      </section>

      <section className="help-card-grid" aria-label="Help options">
        {helpCards.map(card => (
          <a className="help-option-card" href={card.target} key={card.title}>
            <span className="help-option-icon"><SiteIcon name={card.icon} size={21} /></span>
            <span className="help-option-copy"><strong>{card.title}</strong><small>{card.description}</small></span>
            <SiteIcon name="arrow-up-right" size={16} />
          </a>
        ))}
      </section>

      <section className="help-articles" id="help-articles" aria-labelledby="help-articles-title">
        <div className="help-section-heading">
          <div><p className="help-eyebrow">HELP CENTRE</p><h2 id="help-articles-title">Popular questions</h2></div>
          <span>{filteredTopics.length} {filteredTopics.length === 1 ? 'article' : 'articles'}</span>
        </div>
        {filteredTopics.length ? <div className="help-topic-list">
          {filteredTopics.map(topic => (
            <article className="help-topic" key={topic.title}>
              <div><span className="help-topic-category">{topic.category}</span><h3>{topic.title}</h3><p>{topic.answer}</p><a href={topic.href}>{topic.linkLabel} <SiteIcon name="arrow-up-right" size={14} /></a></div>
            </article>
          ))}
        </div> : <div className="help-empty-state"><SiteIcon name="search" size={22} /><strong>No matching help articles</strong><p>Try another search, or send your question to the KhelGrid team.</p></div>}
      </section>

      <section className="help-feedback-panel" id="send-feedback" aria-labelledby="feedback-title">
        <div className="help-feedback-intro">
          <p className="help-eyebrow">YOUR VOICE MATTERS</p>
          <h2 id="feedback-title">Share feedback or report a problem</h2>
          <p>Choose a topic and describe what happened or what you would like us to improve. Your email application will open with a message addressed to KhelGrid.</p>
          <ul><li>Suggestions and feature requests</li><li>Incorrect or outdated listing information</li><li>Broken links and technical issues</li><li>Complaints or safety concerns</li></ul>
        </div>
        <form className="help-feedback-form" onSubmit={submitFeedback}>
          <label>What is this about?
            <select value={feedbackType} onChange={event => setFeedbackType(event.target.value)}>
              {feedbackTypes.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Message <span aria-hidden="true">*</span>
            <textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={10} rows={5} placeholder="Please describe your feedback or the problem..." />
          </label>
          <label>Page or listing link (optional)
            <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Paste the relevant KhelGrid page or listing URL" />
          </label>
          <label>Your email (optional)
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Where we can reply" />
          </label>
          <button type="submit" disabled={message.trim().length < 10}><SiteIcon name="mail" size={16} /> Continue by email</button>
          <small>No message is submitted to a KhelGrid server. Your default email application opens so you can review and send it.</small>
        </form>
      </section>

      <section className="help-contact-strip" id="contact-khelgrid">
        <div><p className="help-eyebrow">CONTACT</p><h2>Need to reach us directly?</h2><p>Email the KhelGrid team for help, feedback or general enquiries.</p></div>
        <a href="mailto:khelgrid@gmail.com?subject=KhelGrid%20help%20and%20feedback"><SiteIcon name="mail" size={17} /> khelgrid@gmail.com</a>
      </section>
    </div>
  )
}
